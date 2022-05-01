import { TrackOpTypes, TriggerOpTypes } from './operations'
import { extend, isArray } from "../share/index"
import { createDep, newTracked, wasTracked, initDepMarkers, finalizeDepMarkers, Dep } from "./dep"
const targetMap = new Map()
let activeEffect
// 用一个栈来记录activeEffect，避免effect嵌套中深层次activeEffect把浅层的activeEffect覆盖
let effectStack = <any>[]

export const ITERATE_KEY = Symbol()


let effectTrackDepth = 0
//用来标记
export let trackOpBit = 1
//追踪的最大嵌套层数（30跟JavaScript中的位数有关最多31位）
const maxTrackOpBits = 30

let shouldTrack = false
const trackStack: boolean[] = []
// 全局变量用来记录嵌套的深度

export function pauseTracking() {
    trackStack.push(shouldTrack)
    shouldTrack = false
}
export function resetTracking() {
    const last = trackStack.pop()
    shouldTrack = last === undefined ? true : last
}


export class ReactiveEffect {
    private _fn: any
    deps: Dep[] = []
    onStop?: () => void
    active = true
    public scheduler: Function | undefined
    constructor(fn, scheduler?: Function) {
        this._fn = fn
        this.scheduler = scheduler

    }
    run() {
        // 如果处于stop状态则不执行
        if (!this.active) {
            // 返回执行结果
            return this._fn()
        }
        let lastShouldTrack = shouldTrack
        try {
            //应该收集
            shouldTrack = true
            effectStack.push(activeEffect = this)
            //用来给作为这一嵌套层次依赖数组的标记，跟嵌套层次effectTrackDepth有关，执行结束后也方便恢复标记
            trackOpBit = 1 << ++effectTrackDepth
            // 如果小于嵌套层数限制，走优化逻辑
            if (effectTrackDepth <= maxTrackOpBits) {
                initDepMarkers(this)
            } else {
                //走普通逻辑，全部清理
                cleanupEffect(this)
            }
            return this._fn()
        } finally {
            // 如果小于嵌套层数限制，走优化逻辑
            if (effectTrackDepth <= maxTrackOpBits) {
                //优化处理那些已经标记好的dep
                finalizeDepMarkers(this)
            }
            // 返回进入该嵌套前的标记
            trackOpBit = 1 << --effectTrackDepth
            effectStack.pop()
            activeEffect = effectStack[effectStack.length - 1]
            shouldTrack = lastShouldTrack
        }



    }
    stop() {
        // 防止stop重复调用
        if (this.active) {
            cleanupEffect(this)
            if (this.onStop) {
                this.onStop()
            }
            this.active = false

        }

    }
}
//清空依赖
function cleanupEffect(effect) {
    effect.deps.forEach((dep: any) => {
        dep.delete(effect)
    });
    // 清空effect.dps
    effect.deps.length = 0
}
export function isTracking() {
    return shouldTrack && activeEffect !== undefined;
}
export function track(target, key) {
    if (!isTracking()) return
    //获取当前对象target对应的缓存map'
    let depsMap = targetMap.get(target)
    if (!depsMap) {
        depsMap = new Map()
        targetMap.set(target, depsMap)
    }
    //获取对应属性key的依赖set集合
    let dep = depsMap.get(key)
    if (!dep) {
        dep = createDep()
        depsMap.set(key, dep)
    }
    trackEffects(dep)

}
export function trackEffects(dep) {
    //用来决定是否应该收集依赖
    let shouldTrack = false
    //如果嵌套层数小于30，走优化逻辑，若超过走原始逻辑
    if (effectTrackDepth <= maxTrackOpBits) {
        //如果还没有被新收集过
        if (!newTracked(dep)) {
            // 标记这次已经新收集了
            dep.n |= trackOpBit
            // 收不收集又以前是否收集过来决定
            shouldTrack = !wasTracked(dep)
        }

    } else {
        //收不收集由副作用函数是否已经在依赖数组收集过了
        shouldTrack = !dep.has(activeEffect)
    }
    if (shouldTrack) {
        // 反向收集那些会引起副作用函数的地方
        dep.add(activeEffect)
        activeEffect.deps.push(dep)
    }
}

export function trigger(target, key, type, newValue?: unknown) {
    //获取当前对象target对应的缓存map'
    let depsMap = targetMap.get(target)
    if (!depsMap) {
        // never been tracked
        return
    }

    let deps: (Dep | undefined)[] = []
    if (key === 'length' && isArray(target)) {
        depsMap.forEach((dep, key) => {
            if (key === 'length' || key >= (newValue as number)) {
                deps.push(dep)
            }
        })
    } else {
        //获取对应属性key的依赖set集合
        //此处使用void 0的原因
        // undefined可以被重写
        // 从性能方面： void 0 比 undefined 少了三个字节
        // 保证结果不变性
        if (key !== void 0) {
            deps.push(depsMap.get(key))
        }
        switch (type) {
            case TriggerOpTypes.ADD:
                if (!isArray(target)) {
                    deps.push(depsMap.get(ITERATE_KEY))
                } else {
                    deps.push(depsMap.get('length'))
                }
                break
            case TriggerOpTypes.DELETE:
                if (!isArray(target)) {
                    deps.push(depsMap.get(ITERATE_KEY))
                }
                break
        }
    }



    const effects: ReactiveEffect[] = []
    for (const dep of deps) {
        if (dep) {
            effects.push(...dep)
        }
    }
    triggerEffects(effects)
}
export function triggerEffects(dep) {
    //语言规范中对此有明确的说明：在调用forEach遍历Set集合时，如果一个值已经被访问过了，但该值被删除并重新添加到集合中，
    //如果此时foreach遍历没有结束，那么该值就会重新被访问。因此代码会无限执行，通过构造另一个set来遍历就可以避免
    dep = createDep(dep)
    //将所有依赖函数取出并且执行
    for (const effect of dep) {
        if (effect.scheduler) {
            effect.scheduler()
        } else {
            effect.run()
        }
    }
}

export function effect(fn, options: any = {}) {
    const _effect = new ReactiveEffect(fn, options.scheduler)
    // 将options属性扩展到_effect中
    extend(_effect, options)
    _effect.run()
    //需绑定执行上下文
    const runner: any = _effect.run.bind(_effect)
    // 存储当前副作用函数实例
    runner.effect = _effect
    return runner

}

export function stop(runner) {
    runner.effect.stop()
}


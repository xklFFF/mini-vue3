import { extend } from "./index"
const targetMap=new Map()
let activeEffect
let shouldTrack = false
class ReactiveEffect {
    private _fn:any
    deps = []
    onStop?:()=>void
    active = true
    public scheduler:Function|undefined
    constructor(fn,scheduler?:Function) {
        this._fn = fn
        this.scheduler=scheduler

    }
    run(){
        if(!this.active){
                    // 返回执行结果
        return this._fn()
        }
        //应该收集
        shouldTrack = true
        activeEffect=this
        const r =this._fn()
        //重置
        shouldTrack = false
        return r

    }
    stop(){
        // 防止stop重复调用
        if(this.active){
            cleanupEffect(this)
            if(this.onStop){
                this.onStop()
            }
            this.active = false

        }
        
    }
}
//清空依赖
function cleanupEffect(effect){
    effect.deps.forEach((dep:any) => {
        dep.delete(effect)
    });
    // 清空effect.dps
    effect.deps.length=0
}
function isTracking(){
    return shouldTrack && activeEffect !== undefined;
}
export function track(target,key){
    if(!isTracking()) return
    //获取当前对象target对应的缓存map'
    let depsMap=targetMap.get(target)
    if(!depsMap){
        depsMap=new Map()
        targetMap.set(target,depsMap)
    }
    //获取对应属性key的依赖set集合
    let dep=depsMap.get(key)
    if(!dep){
        dep=new Set()
        depsMap.set(key,dep)
    }
    // 查看dep之前有没有添加过，添加过了就不再添加了
    if(dep.has(activeEffect)) return
    // 反向收集那些会引起副作用函数的地方
    dep.add(activeEffect)
    activeEffect.deps.push(dep)
    
}

export function trigger(target,key){
      //获取当前对象target对应的缓存map'
      let depsMap=targetMap.get(target)
        //获取对应属性key的依赖set集合
        let dep=depsMap.get(key)
        //将所有依赖函数取出并且执行
        for(const effect of dep){
            if(effect.scheduler){
                effect.scheduler()
            }else{
                effect.run()
            }
        }
}

export function effect(fn,options:any={}){
    const _effect=new ReactiveEffect(fn,options.scheduler)
    // 将options属性扩展到_effect中
    extend(_effect,options)
    _effect.run()
    //需绑定执行上下文
    const runner:any = _effect.run.bind(_effect)
    // 存储当前副作用函数实例
    runner.effect=_effect
    return runner

}

export function stop(runner){
    runner.effect.stop()
}


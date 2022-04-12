import {  ReactiveEffect, trackOpBit } from "./effect";


export type Dep = Set<ReactiveEffect> & TrackedMarkers

//用来给每次追踪做标记
type TrackedMarkers = {
    w: number
    n: number

}

//生成dep集合
export const createDep = (effects?: ReactiveEffect[]): Dep => {
    const dep = new Set<ReactiveEffect>(effects) as Dep
    //用来记录是否已经被追踪过
    dep.w = 0
    //用来记录是否被新追踪过
    dep.n = 0

    return dep
}

//用来判断是否曾经被追踪过
export const wasTracked = (dep: Dep): boolean => (dep.w & trackOpBit) > 0
//用来判断是否新被追踪
export const newTracked = (dep: Dep): boolean => (dep.n & trackOpBit) > 0

export const initDepMarkers = ({ deps }: ReactiveEffect) => {
    if (deps.length) {
        for (let i = 0; i < deps.length; i++) {
            // 标记一下这些被追踪过的effect    
            deps[i].w |= trackOpBit
        }
    }
}

// 执行完effect函数后，对依赖进行检查
export const finalizeDepMarkers = (effect: ReactiveEffect) => {
    const {deps} = effect
    if (deps.length) {
        // 用来记录栈顶的指针
        let ptr = 0
        for (let i = 0; i < deps.length; i++) {
            const dep = deps[i]
            // 如果该依赖数组以前收集过，但是现在没有被记录到重新收集，将副作用函数从依赖数组中删除
            if (wasTracked(dep) && !newTracked(dep)) {
                //将副作用函数从其依赖数值中删除
                dep.delete(effect)
            } else {
                // 需保存起来的依赖数组
                deps[ptr++] = dep
            }
            dep.w &= ~trackOpBit
            dep.n &= ~trackOpBit
        }
        deps.length = ptr
    }
}
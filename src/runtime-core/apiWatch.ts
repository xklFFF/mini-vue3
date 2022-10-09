import { Ref } from "vue"
import { effect, ReactiveEffect, stop } from "../reactivity/effect"
import { isRef } from "../reactivity/ref"
import { EMPTY_OBJ, isFunction } from "../share"

type OnCleanup = (cleanupFn: () => void) => void

export type WatchEffect = (onCleanup: OnCleanup) => void

export interface WatchOptionsBase {
    flush?: 'pre' | 'post' | 'sync'
}

export interface WatchOptions<Immediate = boolean> extends WatchOptionsBase {
    immediate?: Immediate
    deep?: boolean
}

export type WatchStopHandle = () => void

export function watchEffect(
    _effect: WatchEffect,
    options?: WatchOptionsBase,
): WatchStopHandle {
    const runner = effect(_effect, options)
    return () => { stop(runner) }
}
export type WatchCallback<V = any, OV = any> = (
    value: V,
    oldValue: OV,
    onCleanup?: OnCleanup
) => any
export type WatchSource<T> =
    | Ref<T> // ref
    | (() => T) // getter
    | T extends object
    ? T
    : never // 响应式对象
function doWatch(source: WatchSource<any>, cb: WatchCallback, { immediate, deep, flush }: WatchOptions = EMPTY_OBJ) {
    let getter
    if (isRef(source)) {
        getter = ()=>source.value
    }else if(isFunction(source)){
        getter = source
    }else{
        getter = ()=>traverse(source)
    }
    let oldValue
    let newValue
    let cleanup 
    function onInvalidate(fn) {
        cleanup = fn
    }
    let job = () => {
        newValue = effectFn()
        if(cleanup){
            cleanup()
        }
        cb( newValue,oldValue,onInvalidate)
        oldValue = newValue
    }
    const effectFn = effect(getter, {
        scheduler: () => {
            job()
        }
    })
    oldValue = effectFn()

}

export function watch(source:WatchSource<any>, cb: WatchCallback, options = {}) {
    doWatch(source,cb,options)
}
//遍历对象形成引用
function traverse(value,seen = new Set()){
    if(typeof value!=='object'||value === null||seen.has(value))return
    seen.add(value)
    for(const key in value){
        traverse(value[key],seen)
    }
    return value
}
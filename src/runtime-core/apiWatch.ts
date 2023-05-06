import { effect, ReactiveEffect, stop } from "../reactivity/effect"
import { isRef, RefImpl } from "../reactivity/ref"
import { EMPTY_OBJ, isFunction } from "../share"
import { queueJob, queuePostFlushCb, queuePreFlushCb } from "./scheduler"

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
    return doWatch(_effect, null, options)
}
export type WatchCallback<V = any, OV = any> = (
    value: V,
    oldValue: OV,
    onCleanup?: OnCleanup
) => any
export type WatchSource<T> =
    | RefImpl // ref
    | (() => T) // getter
    | T extends object
    ? T
    : never // 响应式对象
function doWatch(source: WatchSource<any>, cb: WatchCallback | null, { immediate, deep, flush }: WatchOptions = EMPTY_OBJ): WatchStopHandle {
    let cleanup
    const onCleanup = function (fn) {
        cleanup = effect.onStop = () => {
            fn();
        };
    };
    let getter
    if (cb === null) {//watchEffect
        getter = () => {
            if (cleanup) cleanup()
            source(onCleanup)
        }
    }
    else if (isRef(source)) {
        getter = () => source.value
    } else if (isFunction(source)) {
        getter = source
    } else {
        getter = () => traverse(source)
    }
    let oldValue
    let newValue

    let job = () => {
        //watch
        if (cb) {
            newValue = effect.run()
            if (cleanup) {
                cleanup()
            }
            cb(newValue, oldValue, onCleanup)
            oldValue = newValue
        } else {//watchEffect
            effect.run()
        }
    }
    let scheduler: any
    if (flush === 'sync') {
        scheduler = job
    } else if (flush === 'post') {
        scheduler = () => queuePostFlushCb(job)
    } else {
        scheduler = () => queueJob(job)
    }
    const effect = new ReactiveEffect(getter, scheduler)
    // initial run
    if (cb) {
        if (immediate) {
            job()
        } else {
            oldValue = effect.run()
        }
    } else if (flush === 'post') {
        queuePreFlushCb(
            effect.run.bind(effect),
        )
    } else {
        effect.run()
    }
    const unWatch = () => {
        effect.stop()
    }
    return unWatch
}

export function watch(source: WatchSource<any>, cb: WatchCallback, options = {}) {
    doWatch(source, cb, options)
}
//遍历对象形成引用
function traverse(value, seen = new Set()) {
    if (typeof value !== 'object' || value === null || seen.has(value)) return
    seen.add(value)
    for (const key in value) {
        traverse(value[key], seen)
    }
    return value
}
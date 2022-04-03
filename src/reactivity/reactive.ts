import { mutableHandler, readonlyHandler, shallowReactiveHandler, shallowReadonlyHandler } from "./baseHandler"
import { track, trigger } from "./effect"

export const enum ReactiveFlags{
    IS_REACTIVE = "__v_isReactive",
    IS_READONLY = "__v_isReadonly",
    RAW = '__v_raw'

}
//将reactive和reaonly的处理函数抽取到baseHandler中
export function reactive(target){
return createReactiveObject(target,mutableHandler)
}

export function readonly(target){
    return createReactiveObject(target,readonlyHandler)
}

export function shallowReadonly(target){
    return createReactiveObject(target,shallowReadonlyHandler)
}

export function shallowReactive(target){
    return createReactiveObject(target,shallowReactiveHandler)
}
export function isReadonly(target){
    // 转换布尔值
    return !!target[ReactiveFlags.IS_READONLY];
}
export function isReactive(target){
    // 转换布尔值
    return !!target[ReactiveFlags.IS_REACTIVE];
}
export function isProxy(target){
    return isReactive(target)||isReadonly(target)
}
function createReactiveObject(target,baseHandler){
    return new Proxy(target,baseHandler)
}

export function toRaw(observed){
    // 若observed不是响应对象，raw为undefin，返回observed
    //若observed是响应对象，raw为响应对象的原始值，需对原始值进行检查是否为嵌套响应
    const raw=observed&&observed[ReactiveFlags.RAW]
    return raw?toRaw(raw):observed
}
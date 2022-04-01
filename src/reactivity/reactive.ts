import { mutableHandler, readonlyHandler, shallowReadonlyHandler } from "./baseHandler"
import { track, trigger } from "./effect"

export const enum ReactiveFlags{
    IS_REACTIVE = "__v_isReactive",
    IS_READONLY = "__v_isReadonly",
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
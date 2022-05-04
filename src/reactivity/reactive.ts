import { isObeject, toRawType } from "../share"
import { mutableHandler, readonlyHandler, shallowReactiveHandler, shallowReadonlyHandler } from "./baseHandler"
import { mutableCollectionHandlers,shallowCollectionHandlers, readonlyCollectionHandlers,shallowReadonlyCollectionHandlers} from "./collectionHandler"
import { track, trigger } from "./effect"

export const enum ReactiveFlags {
    IS_REACTIVE = "__v_isReactive",
    IS_READONLY = "__v_isReadonly",
    RAW = '__v_raw'

}

const enum TargetType {
    INVALID = 0,
    COMMON = 1,
    COLLECTION = 2
}
function targetTypeMap(rawType: string) {
    switch (rawType) {
        case 'Object':
        case 'Array':
            return TargetType.COMMON
        case 'Map':
        case 'Set':
        case 'WeakMap':
        case 'WeakSet':
            return TargetType.COLLECTION
        default:
            return TargetType.INVALID
    }
}

function getTargetType(value) {
    return targetTypeMap(toRawType(value))
}

const reactiveMap = new WeakMap()
 const shallowReactiveMap = new WeakMap()
 const readonlyMap = new WeakMap()
 const shallowReadonlyMap = new WeakMap()
//将reactive和reaonly的处理函数抽取到baseHandler中
export function reactive(target) {
    const proxy = createReactiveObject(target,false,mutableHandler,mutableCollectionHandlers,reactiveMap)
    return proxy
}

export function readonly(target) {
    return createReactiveObject(target,true,readonlyHandler,readonlyCollectionHandlers,readonlyMap)
}

export function shallowReadonly(target) {
    return createReactiveObject(target,true,shallowReadonlyHandler,shallowReadonlyCollectionHandlers,shallowReadonlyMap)
}

export function shallowReactive(target) {
    return createReactiveObject(target,false,shallowReactiveHandler,shallowCollectionHandlers,shallowReactiveMap)
}
export function isReadonly(target) {
    // 转换布尔值
    return !!target[ReactiveFlags.IS_READONLY];
}
export function isReactive(target) {
    // 转换布尔值
    return !!target[ReactiveFlags.IS_REACTIVE];
}
export function isProxy(target) {
    return isReactive(target) || isReadonly(target)
}
function createReactiveObject(target, isReadonly,baseHandlers, collectionHandlers,
    proxyMap) {
         //如果target是一个非只读响应式代理对象直接返回原对象
  if (target[ReactiveFlags.RAW] && !(isReadonly && target[ReactiveFlags.IS_REACTIVE])) {
    return target
  }

  //如果不是对象就直接返回 Reactive只拦截对象
  if (!isObeject(target)) {
    return target;
  }

    // target already has corresponding Proxy
    const existingProxy = proxyMap.get(target)
    if (existingProxy) {
        return existingProxy
    }
    // only a whitelist of value types can be observed.
    const targetType = getTargetType(target)
      //如果当前的对象是无效的对象就直接返回（例如函数、其他对象）
  if (targetType === TargetType.INVALID) {
    return target
  }
    const proxy = new Proxy(target, targetType === TargetType.COLLECTION ? collectionHandlers : baseHandlers)
    proxyMap.set(target, proxy)
    return proxy
}

export function toRaw(observed) {
    // 若observed不是响应对象，raw为undefin，返回observed
    //若observed是响应对象，raw为响应对象的原始值，需对原始值进行检查是否为嵌套响应
    const raw = observed && observed[ReactiveFlags.RAW]
    return raw ? toRaw(raw) : observed
}

export const toReactive = (val) => isObeject(val) ? reactive(val) : val
export const toReadonly = (val) => isObeject(val) ? readonly(val) : val

import { extend, hasOwn, isObeject } from "../share";
import { track, trigger } from "./effect"
import { reactive, ReactiveFlags, readonly } from "./reactive";

const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true)
const shallowReactiveGet = createGetter(false, true)

function createGetter(isReadonly = false, shallow = false) {
    return function get(target, key) {

        if (key === ReactiveFlags.IS_REACTIVE) {
            return !isReadonly
        } else if (key === ReactiveFlags.IS_READONLY) {
            return isReadonly
        } else if (key === ReactiveFlags.RAW) {
            return target
        }
        const res = Reflect.get(target, key)
        //如果shallow就返回，那么没法被追踪到
        // 嵌套对象也需要转换成响应式
        if (isObeject(res) && !shallow) {
            return isReadonly ? readonly(res) : reactive(res)
        }
        if (!isReadonly) {
            track(target, key)
        }
        return res
    }
}

function createSetter() {
    return function set(target, key, value) {
        const res = Reflect.set(target, key, value)
        trigger(target, key)
        return res
    }
}

// 用来拦截in操作符号
function has(target, key) {
    const result = Reflect.get(target, key)
    track(target, key)
    return result
}
//用来拦截删除操作
function deleteProperty(target,key){
    const hadKey = hasOwn(target,key)
    const oldValue = target[key]
    const result = Reflect.deleteProperty(target,key)
    if(result && hadKey){
        trigger(target,key)
    }
    return result
}
export const mutableHandler = {
    get,
    set,
    has,
    deleteProperty
}
export const readonlyHandler = {
    get: readonlyGet,
    set(target, key) {
        console.warn(
            `key :"${String(key)}" set 失败，因为 target 是 readonly 类型`,
            target
        );

        return true;
    }
}

export const shallowReadonlyHandler = extend({}, readonlyHandler, { get: shallowReadonlyGet })
export const shallowReactiveHandler = extend({}, mutableHandler, { get: shallowReactiveGet })
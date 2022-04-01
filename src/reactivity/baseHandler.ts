import { extend, isObeject } from "../share";
import { track, trigger } from "./effect"
import { reactive, ReactiveFlags, readonly } from "./reactive";

const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true,true)

function createGetter(isReadonly = false, shallow = false) {
    return function get(target, key) {

        if (key === ReactiveFlags.IS_REACTIVE) {
            return !isReadonly
        } else if (key === ReactiveFlags.IS_READONLY) {
            return isReadonly
        }
        const res = Reflect.get(target, key)
        if(shallow){
            return res
        }
        // 嵌套对象也需要转换成响应式
        if(isObeject(res)){
            return isReadonly?readonly(res):reactive(res)
        }
        if (!isReadonly) {
            track(target, key)
        }
        return res
    }
}

function createSetter(isReadonly = false) {
    return function set(target, key, value) {
        const res = Reflect.set(target, key, value)
        trigger(target, key)
        return res
    }
}

export const mutableHandler = {
    get,
    set
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

export const shallowReadonlyHandler =extend({},readonlyHandler,{get:shallowReadonlyGet})
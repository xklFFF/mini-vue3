import { track, trigger } from "./effect"
import { readonly } from "./reactive"

const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);

function createGetter(isReadonly = false) {
    return function get(target, key) {
        const res = Reflect.get(target, key)
        if (!readonly) {
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
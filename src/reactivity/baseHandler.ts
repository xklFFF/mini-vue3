import { extend, hasChanged, hasOwn, isArray, isObeject } from "../share";
import { track, trigger, ITERATE_KEY, pauseTracking, resetTracking } from "./effect"
import { TriggerOpTypes } from "./operations";
import { reactive, ReactiveFlags, readonly, toRaw } from "./reactive";

const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true)
const shallowReactiveGet = createGetter(false, true)

//重写数组的方法
const arrayInstrumentations = createArrayInstrumentations()
function createArrayInstrumentations() {
    const instrumentations = {}
    // instrument identity-sensitive Array methods to account for possible reactive
    ;['includes','indexOf','lastIndexOf'].forEach(method=>{
        const originMethod = Array.prototype[method]
    instrumentations[method] = function(...args){
            //this 是代理对象，先在代理对象中查找，将结果存储到res中
            let res = originMethod.apply(this,args)
            if(res === false){
                res = originMethod.apply(toRaw(this),args)
            }
            return res
        }
    })
    //这些函数被调用时会追踪跟触发length相关副作用函数导致溢出
      // instrument length-altering mutation methods to avoid length being tracked
  // which leads to infinite loops in some cases (#2137)
  ;['push', 'pop', 'shift', 'unshift', 'splice'].forEach(method => {
    const originMethod = Array.prototype[method]
    instrumentations[method] = function(...args){
        // 暂停追踪、
        pauseTracking()
        let res = originMethod.apply(this,args)
        // 继续追踪
        resetTracking()
            return res
        }
  })
    return instrumentations
  }
  


function createGetter(isReadonly = false, shallow = false) {
    return function get(target, key,receiver) {

        if (key === ReactiveFlags.IS_REACTIVE) {
            return !isReadonly
        } else if (key === ReactiveFlags.IS_READONLY) {
            return isReadonly
        } else if (key === ReactiveFlags.RAW) {
            return target
        }

        if(isArray(target)&&arrayInstrumentations.hasOwnProperty(key)){
            return Reflect.get(arrayInstrumentations,key,receiver)
        }
        const res = Reflect.get(target, key,receiver)
        //如果shallow就返回，那么没法被追踪到
        // 嵌套对象也需要转换成响应式
        if (isObeject(res) && !shallow) {
            return isReadonly ? readonly(res) : reactive(res)
        }
        if (!isReadonly&&typeof key !=='symbol') {
            track(target, key)
        }
        return res
    }
}

function createSetter() {
    return function set(target, key, value, receiver) {
        // 判断一个键原来是否存在要先区分target是对象还是数组
        const hadKey = isArray(target) ? Number(key) < target.length : hasOwn(target, key)
        // 要注意在这里必须先获取旧值
        let oldValue = target[key]
        const res = Reflect.set(target, key, value, receiver)
        // 判断设置的对象跟代理对象是否有关系，解决了原型问题
        if (target === toRaw(receiver)) {
            // 如果原型没用这个key说明是新增加的
            if (!hadKey) {
                trigger(target, key, TriggerOpTypes.ADD, value)

            } else if (hasChanged(value, oldValue)) {
                // 比较新值与旧值，只有当他们不全等，并且都不是NaN的时候才触发响应
                trigger(target, key, TriggerOpTypes.SET, value)
            }
        }


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
function deleteProperty(target, key) {
    const hadKey = hasOwn(target, key)
    const oldValue = target[key]
    const result = Reflect.deleteProperty(target, key)
    if (result && hadKey) {
        trigger(target, key, TriggerOpTypes.DELETE, undefined)
    }
    return result
}
//用来拦截for in操作
function ownKeys(target) {

    const key=isArray(target)?'length':ITERATE_KEY
    track(target, key)

    return Reflect.ownKeys(target)

}
export const mutableHandler = {
    get,
    set,
    has,
    deleteProperty,
    ownKeys
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
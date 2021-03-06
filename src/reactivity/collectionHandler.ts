import { hasChanged, hasOwn, isMap } from "../share";
import { ITERATE_KEY, MAP_KEY_ITERATE_KEY, track, trigger } from "./effect";
import { TrackOpTypes, TriggerOpTypes } from "./operations";
import { isReactive, ReactiveFlags, toRaw, toReactive, toReadonly } from "./reactive";

export type CollectionTypes = IterableCollections | WeakCollections

type IterableCollections = Map<any, any> | Set<any>
type WeakCollections = WeakMap<any, any> | WeakSet<any>
type MapTypes = Map<any, any> | WeakMap<any, any>
type SetTypes = Set<any> | WeakSet<any>

const toShallow = <T extends unknown>(value: T): T => value

const getProto = <T extends CollectionTypes>(v: T): any =>
    Reflect.getPrototypeOf(v)


// set集合的Add操作
function add(this: SetTypes, key: unknown) {

    // 此时this是指向的代理对象，所以直接访问代理对象target
    key = toRaw(key)
    const target = toRaw(this)
    const proto = getProto(target)
    const hadKey = proto.has.call(target, key)
    if (!hadKey) {
        target.add(key)
        trigger(target, key, TriggerOpTypes.ADD, key)
    }
    return this

}

// set集合的delete操作
function deleteEntry(this: any, key) {
    const target = toRaw(this)
    const { has } = getProto(target)
    let hadKey = has.call(target, key)//是否存在当前key
    let res = false
    if (!hadKey) {
        key = toRaw(key)
        hadKey = has.call(target, key)
    }
    if (hadKey) {
        res = target.delete(key)
        trigger(target, key, TriggerOpTypes.DELETE, undefined)
    }
    return res
}

// map的获取操作
function get(target: MapTypes, key, isReadonly = false,
    isShallow = false) {
    target = target[ReactiveFlags.RAW]
    const rawTarget = toRaw(target)
    const rawKey = toRaw(key)
    if (key !== rawKey) {
        !isReadonly && track(rawTarget, key)
    }
    !isReadonly && track(rawTarget, rawKey)
    const { has } = getProto(rawTarget)
    const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive
    if (has.call(rawTarget, key)) {
        return wrap(target.get(key))
    } else if (has.call(rawTarget, rawKey)) {
        return wrap(target.get(rawKey))
    } else if (target !== rawTarget) {
        target.get(key)
    }
}

//map的设置操作
function set(this: MapTypes, key, value) {
    const target = toRaw(this)
    // 避免把响应式数据设置到原始对象上,这种情况就是数据污染，所以要把响应式对象变成原始对象
    value = toRaw(value)
    const oldValue = target.get(key)
    target.set(key, value)
    if (!oldValue) {
        //新增
        trigger(target, key, TriggerOpTypes.ADD, value)
    } else if (hasChanged(value, oldValue)) {
        //更新
        trigger(target, key, TriggerOpTypes.SET, value)
    }

}

function has(this: CollectionTypes, key: unknown, isReadonly = false): Boolean {
    const target = this[ReactiveFlags.RAW]
    const rawTarget = toRaw(target)
    const rawKey = toRaw(key)
    if (key !== rawKey) {
        !isReadonly && track(rawTarget, key)
    }
    !isReadonly && track(rawTarget, rawKey)
    return key === rawKey ?
        target.has(key) :
        target.has(key) || target.has(rawKey)
}

function size(target: IterableCollections, isReadonly = false) {
    target = target[ReactiveFlags.RAW]
    !isReadonly && track(toRaw(target), ITERATE_KEY)
    return Reflect.get(target, 'size', target)
}

function clear(this: IterableCollections) {
    const target = toRaw(this)
    const hadItems = target.size !== 0
    const result = target.clear()
    if (hadItems) {
        trigger(target, undefined, TriggerOpTypes.CLEAR, undefined)
    }
    return result
}

function createForEach(isReadonly: boolean, isShallow: boolean) {
    return function forEach(
        this: IterableCollections,
        callback: Function,
        thisArg?: unknown
    ) {
        const observed = this as any
        const target = observed[ReactiveFlags.RAW]
        const rawTarget = toRaw(target)
        const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toShallow
        !isReadonly && track(rawTarget, ITERATE_KEY)
        return target.forEach((value, key) => {
            return callback.call(thisArg, wrap(value), wrap(key), observed)
        })
    }
}

function createReadonlyMethod(type) {
    return function (this: any, ...args: unknown[]) {
        const key = args[0] ? `on key "${args[0]}" ` : ``
        console.warn(
            `${type} operation ${key}failed: target is readonly.`,
            toRaw(this)
        )

        return type === TriggerOpTypes.DELETE ? false : this
    }
}

function createIterableMethod(
    method: string | symbol,
    isReadonly: boolean,
    isShallow: boolean
) {
    return function (
        this: IterableCollections,
        ...args: unknown[]
    ) {
        const target = this[ReactiveFlags.RAW]
        const rawTarget = toRaw(target)
        //用来判断是否为map类型
        const targetIsMap = isMap(rawTarget)
        //是否需要返回完整的键值对
        const isPair = method === 'entries' || (method === Symbol.iterator && targetIsMap)
        //是否只关心键
        const isKeyOnly = method === 'keys' && targetIsMap
        // 内部的遍历器
        const innerIterator = target[method](...args)
        const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive
        !isReadonly && track(
            rawTarget,
            isKeyOnly ? MAP_KEY_ITERATE_KEY : ITERATE_KEY
        )
        return {
            next() {
                const { value, done } = innerIterator.next()
                return done
                    ? { value, done }
                    : {
                        value: isPair ? [wrap(value[0]), wrap(value[1])] : wrap(value),
                        done
                    }


            },
            [Symbol.iterator]() {
                return this
            }
        }

    }
}




function createInstrumentations() {
    const mutableInstrumentations = {
        get(this: MapTypes, key: unknown) {
            return get(this, key)
        },
        get size() {
            return size(this as unknown as IterableCollections)
        },
        has,
        add,
        set,
        delete: deleteEntry,
        clear,
        forEach: createForEach(false, false)
    }

    const shallowInstrumentations = {
        get(this: MapTypes, key: unknown) {
            return get(this, key, false, true)
        },
        get size() {
            return size(this as unknown as IterableCollections)
        },
        has,
        add,
        set,
        delete: deleteEntry,
        clear,
        forEach: createForEach(false, true)
    }

    const readonlyInstrumentations: Record<string, Function> = {
        get(this: MapTypes, key: unknown) {
            return get(this, key, true)
        },
        get size() {
            return size(this as unknown as IterableCollections, true)
        },
        has(this: MapTypes, key: unknown) {
            return has.call(this, key, true)
        },
        add: createReadonlyMethod(TriggerOpTypes.ADD),
        set: createReadonlyMethod(TriggerOpTypes.SET),
        delete: createReadonlyMethod(TriggerOpTypes.DELETE),
        clear: createReadonlyMethod(TriggerOpTypes.CLEAR),
        forEach: createForEach(true, false)
    }

    const shallowReadonlyInstrumentations: Record<string, Function> = {
        get(this: MapTypes, key: unknown) {
            return get(this, key, true, true)
        },
        get size() {
            return size(this as unknown as IterableCollections, true)
        },
        has(this: MapTypes, key: unknown) {
            return has.call(this, key, true)
        },
        add: createReadonlyMethod(TriggerOpTypes.ADD),
        set: createReadonlyMethod(TriggerOpTypes.SET),
        delete: createReadonlyMethod(TriggerOpTypes.DELETE),
        clear: createReadonlyMethod(TriggerOpTypes.CLEAR),
        forEach: createForEach(true, true)
    }

    const iteratorMethods = ['keys', 'values', 'entries', Symbol.iterator]
    iteratorMethods.forEach(method => {
        mutableInstrumentations[method as string] = createIterableMethod(
            method,
            false,
            false
        )
        readonlyInstrumentations[method as string] = createIterableMethod(
            method,
            true,
            false
        )
        shallowInstrumentations[method as string] = createIterableMethod(
            method,
            false,
            true
        )
        shallowReadonlyInstrumentations[method as string] = createIterableMethod(
            method,
            true,
            true
        )
    })

    return [
        mutableInstrumentations,
        readonlyInstrumentations,
        shallowInstrumentations,
        shallowReadonlyInstrumentations
    ]
}

const [
    mutableInstrumentations,
    readonlyInstrumentations,
    shallowInstrumentations,
    shallowReadonlyInstrumentations
] = createInstrumentations()



function createInstrumentationGetter(isReadonly: boolean, shallow: boolean) {
    const instrumentations = shallow
        ? isReadonly
            ? shallowReadonlyInstrumentations
            : shallowInstrumentations
        : isReadonly
            ? readonlyInstrumentations
            : mutableInstrumentations
    return function get(target, key, receiver) {

        if (key === ReactiveFlags.IS_REACTIVE) {
            return !isReadonly
        } else if (key === ReactiveFlags.IS_READONLY) {
            return isReadonly
        } else if (key === ReactiveFlags.RAW) {
            return target
        }

        return Reflect.get(hasOwn(instrumentations, key) && key in target
            ? instrumentations
            : target, key, receiver)
        // return target[key].bind(target)
    }
}

export const mutableCollectionHandlers = {
    get: createInstrumentationGetter(false, false)
}

export const shallowCollectionHandlers = {
    get: createInstrumentationGetter(false, true)
}

export const readonlyCollectionHandlers = {
    get: createInstrumentationGetter(true, false)
}

export const shallowReadonlyCollectionHandlers =
{
    get: createInstrumentationGetter(true, true)
}


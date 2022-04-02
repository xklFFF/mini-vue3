import { hasChanged, isObeject } from "../share"
import { trackEffects, triggerEffects, isTracking } from "./effect"
import { reactive } from "./reactive"

class RefImpl {
    private _value
    public dep
    //用来存储原始值
    private _rawValue
    public __v_isRef = true
    constructor(value) {
        this._rawValue = value
        this._value = convert(value)
        this.dep = new Set()
    }
    get value() {
        trackRefValue(this)
        return this._value
    }
    set value(newValue) {
        if (hasChanged(this._rawValue, newValue)) {
            this._rawValue = newValue
            this._value = convert(newValue)

            triggerEffects(this.dep)
        }

    }
}
//抽取追踪函数
function trackRefValue(ref) {
    if (isTracking()) {
        trackEffects(ref.dep)
    }
}
// 转换值
function convert(value) {
    return isObeject(value) ? reactive(value) : value
}
export function ref(value) {
    return new RefImpl(value)
}

export function isRef(ref) {
    return !!ref.__v_isRef
}

export function unRef(ref) {
    return isRef(ref) ? ref.value : ref
}

// 这个方法我们在写模板，也就是 HTML 里面使用 ref 不需要手动加上 .vulue 的原因，自动帮我们使用了这个方法
//有ref就帮你剥离value出来，没有ref直接返回value
export function proxyRefs(objectWithRefs) {
    //TODO，如果是原始对象，返回原始对象就好，不用经过proxy代理
    return new Proxy(objectWithRefs, {
        get(target, key) {
            //获取值，如果是ref则把值剥离出来
            return unRef(Reflect.get(target, key))
        },
        set(target, key, value) {
            {
                // 如果把一个非ref的值赋给ref，需要通过ref.value=value这种形式
                if (isRef(target[key]) && !isRef(value)) {
                    return (target[key].value = value)
                } else {
                    return Reflect.set(target, key, value)
                }
            }

        }
    })
}

class ObjectRefImpl<T extends object, K extends keyof T> {
    public readonly __v_isRef = true

    constructor(
        private readonly _object: T,
        private readonly _key: K,
        private readonly _defaultValue?: T[K]
    ) { }

    get value() {
        const val = this._object[this._key]
        return val === undefined ? (this._defaultValue as T[K]) : val
    }

    set value(newVal) {
        this._object[this._key] = newVal
    }
}
export function toRef<T extends object, k extends keyof T>(
    object: T,
    key: k,
    defaultValue?: T[k]) {
    const val = object[key]
    //如果值本事是ref直接返回就好，不是则进行包装
    return isRef(val) ? val : (new ObjectRefImpl(object, key, defaultValue))

}
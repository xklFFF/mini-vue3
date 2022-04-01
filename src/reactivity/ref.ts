import { hasChanged, isObeject } from "../share"
import { trackEffects, triggerEffects, isTracking } from "./effect"
import { reactive } from "./reactive"

class RefImpl {
    private _value
    public dep
    //用来存储原始值
    private _rawValue
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
function trackRefValue(ref){
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
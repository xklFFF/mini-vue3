import { ReactiveEffect } from "./effect"

class ComputedRefImpl {
    private _effect: any
    private _dirty: boolean = true
    private _value: any
    constructor(getter) {
        this._effect = new ReactiveEffect(getter, () => {
            // 若需要重新计算则在调用getter函数后修改_dirty标记
            if (!this._dirty) {
                this._dirty = true
            }
        })
    }
    get value() {
        //_dirth变量决定是否要重新计算
        if (this._dirty) {
            this._value = this._effect.run()
            this._dirty = false
        }
        return this._value
    }
}
export function computed(getter) {
    return new ComputedRefImpl(getter)
}
import { isProxy, isReadonly, readonly } from "../reactive"

describe("readonly",()=>{
    it("should make nested values readonly",()=>{
        const original = {foo:1,bar:{baz:2}}
        const wrapped = readonly(original)
        expect(wrapped).not.toBe(original)
        expect(wrapped.foo).toBe(1)
        //判断嵌套转换
        expect(isReadonly(original.bar)).toBe(false)
        expect(isReadonly(wrapped.bar)).toBe(true)
        //判断isProxy
        expect(isProxy(wrapped)).toBe(true)
    })
    it("should call console.warn when set",()=>{
        console.warn = jest.fn()
        const user = readonly({
            age:10
        })
        user.age =11
        expect(console.warn).toHaveBeenCalled()
    })
    it("isReadonly",()=>{
        const original = {foo:1,bar:{baz:2}}
        const wrapped = readonly(original)
        expect(isReadonly(original)).toBe(false)
        expect(isReadonly(wrapped)).toBe(true)
    })
})
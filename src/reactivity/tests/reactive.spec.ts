import { isProxy, isReactive, reactive, readonly, toRaw } from "../reactive"

 describe("reactive",()=>{
     it("happy path",()=>{
         const origin = {foo:1}
         const observed = reactive (origin)
         expect(observed).not.toBe(origin)
         expect(observed.foo).toBe(1)
         //判断isProxy
        expect(isProxy(observed)).toBe(true)
     })
     it("isReactive",()=>{
        const origin = {foo:1}
        const observed = reactive (origin)
        expect(isReactive(origin)).toBe(false)
        expect(isReactive(observed)).toBe(true)
    })
    test("nested reactives",()=>{
        const original = {
            nested: {
                foo:1
            },
            array:[{bar:2}]
        }
        const observed = reactive(original)
        expect(isReactive(observed.nested)).toBe(true)
        expect(isReactive(observed.array)).toBe(true)
        expect(isReactive(observed.array[0])).toBe(true)
    })

    test('toRaw', () => {
        const original = { foo: 1 }
        const observed = reactive(original)
        expect(toRaw(observed)).toBe(original)
        expect(toRaw(original)).toBe(original)
      })

 })
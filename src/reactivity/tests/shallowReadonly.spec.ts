import { shallowReadonly } from "../reactive"

describe("shallowReadonly",()=>{
    test("should not make non-reactive propertied reactive",()=>{
        const props = shallowReadonly({n:{foo:1}})
    })
    it("should call console.warn when set",()=>{
        console.warn = jest.fn()
        const user = shallowReadonly({
            age:10
        })
        user.age=11
        expect(console.warn).toHaveBeenCalled()
    })
})
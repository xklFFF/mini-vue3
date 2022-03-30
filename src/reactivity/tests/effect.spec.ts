import format from "pretty-format"
import { reactive } from "../reactive"
import {effect} from "../effect"

describe("effect",()=>{
    //测试是否具有响应式，并且能触发依赖和依赖收集
    it("happy path",()=>{
        const user = reactive({
            age:10
        })
        let nextAge
        effect(()=>{
            nextAge=user.age+1
        })
        expect(nextAge).toBe(11)
        user.age++;
        expect(nextAge).toBe(12)
    })
})
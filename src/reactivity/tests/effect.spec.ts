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
    //测试能否返回一个函数，并且能接受该函数的结果
    it("return runner",()=>{
        let age =10 
        const runner=effect(()=>{
            
            age++
            return age
        })
        expect(age).toBe(11)
        const  res=runner()
        expect(res).toBe(12)
        expect(runner()).toBe(13)
    })
})
import format from "pretty-format"
import { reactive } from "../reactive"
import {effect, stop} from "../effect"

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
        user.age+=1;
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
    //测试scheduler调度器

    it("scheduler", () => {
        let dummy;
        let run: any;
        const scheduler = jest.fn(() => {
          run = runner;
        });
        const obj = reactive({ foo: 1 });
        const runner = effect(
          () => {
            dummy = obj.foo;
          },
          { scheduler }
        );
        expect(scheduler).not.toHaveBeenCalled();
        expect(dummy).toBe(1);
        // should be called on first trigger
        obj.foo++;
        expect(scheduler).toHaveBeenCalledTimes(1);
        // // should not run yet
        expect(dummy).toBe(1);
        // // manually run
        run();
        // // should have run
        expect(dummy).toBe(2);
      });
    //测试stop功能
    it("stop",()=>{
      let dummy;
      const obj = reactive({prop:1})
      const runner = effect(()=>{
        dummy=obj.prop
      })
      obj.prop = 2
      expect(dummy).toBe(2)
      stop(runner)
      obj.prop = 3
      expect(dummy).toBe(2)
      runner()
      expect(dummy).toBe(3)
    })
    //测试stop的回调函数
    it("onStop",()=>{
      const obj = reactive({
        foo:1
      })
      const onStop=jest.fn()
      let dummy
      const runner = effect(
        ()=>{
          dummy=obj.foo 
        },
        {
          onStop
        }

      )
      // 测试多次调用是否重复触发
      stop(runner)
      expect(onStop).toBeCalledTimes(1)
      stop(runner)
      expect(onStop).toBeCalledTimes(1)
    })
})
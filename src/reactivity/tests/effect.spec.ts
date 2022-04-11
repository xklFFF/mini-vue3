import format from "pretty-format"
import { reactive } from "../reactive"
import { effect, stop } from "../effect"

describe("effect", () => {
  //测试是否具有响应式，并且能触发依赖和依赖收集
  it("happy path", () => {
    const user = reactive({
      age: 10
    })
    let nextAge
    effect(() => {
      nextAge = user.age + 1
    })
    expect(nextAge).toBe(11)
    user.age += 1;
    expect(nextAge).toBe(12)
  })
  //测试能否返回一个函数，并且能接受该函数的结果
  it("return runner", () => {
    let age = 10
    const runner = effect(() => {

      age++
      return age
    })
    expect(age).toBe(11)
    const res = runner()
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
  it("stop", () => {
    let dummy;
    const obj = reactive({ prop: 1 })
    const runner = effect(() => {
      dummy = obj.prop
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
  it("onStop", () => {
    const obj = reactive({
      foo: 1
    })
    const onStop = jest.fn()
    let dummy
    const runner = effect(
      () => {
        dummy = obj.foo
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
  it('should observe nested properties', () => {
    let dummy
    const counter = reactive({ nested: { num: 0 } })
    effect(() => (dummy = counter.nested.num))
    expect(dummy).toBe(0)
    counter.nested.num = 8
    expect(dummy).toBe(8)
  })
  //测试嵌套响应问题，来自《vue设计与实现》书上的测试案例
  it("nested effect", () => {
    const data = { foo: true, bar: true }
    const obj = reactive(data)
    let temp1, temp2

    const effectFn1 = jest.fn()
    const effectFn2 = jest.fn()

    effect(() => {
      effectFn1()
      effect(() => {
        effectFn2()
        temp2 = obj.bar

      })
      temp1 = obj.foo
    })

    expect(effectFn1).toHaveBeenCalledTimes(1)
    expect(effectFn2).toHaveBeenCalledTimes(1)
    obj.bar = true
    expect(effectFn1).toHaveBeenCalledTimes(1)
    expect(effectFn2).toHaveBeenCalledTimes(2)
    obj.foo = true
    expect(effectFn1).toHaveBeenCalledTimes(2)
    expect(effectFn2).toHaveBeenCalledTimes(3)
  })
  // vue官方关于嵌套effect的测试
  it('should allow nested effects', () => {
    const nums = reactive({ num1: 0, num2: 1, num3: 2 })
    const dummy: any = {}

    const childSpy = jest.fn(() => (dummy.num1 = nums.num1))
    const childeffect = effect(childSpy)
    const parentSpy = jest.fn(() => {
      dummy.num2 = nums.num2
      childeffect()
      dummy.num3 = nums.num3
    })
    effect(parentSpy)

    expect(dummy).toEqual({ num1: 0, num2: 1, num3: 2 })
    expect(parentSpy).toHaveBeenCalledTimes(1)
    expect(childSpy).toHaveBeenCalledTimes(2)
    // this should only call the childeffect
    nums.num1 = 4
    expect(dummy).toEqual({ num1: 4, num2: 1, num3: 2 })
    expect(parentSpy).toHaveBeenCalledTimes(1)
    expect(childSpy).toHaveBeenCalledTimes(3)
    // this calls the parenteffect, which calls the childeffect once
    nums.num2 = 10
    expect(dummy).toEqual({ num1: 4, num2: 10, num3: 2 })
    expect(parentSpy).toHaveBeenCalledTimes(2)
    expect(childSpy).toHaveBeenCalledTimes(4)
    // this calls the parenteffect, which calls the childeffect once
    nums.num3 = 7
    expect(dummy).toEqual({ num1: 4, num2: 10, num3: 7 })
    expect(parentSpy).toHaveBeenCalledTimes(3)
    expect(childSpy).toHaveBeenCalledTimes(5)
  })

})
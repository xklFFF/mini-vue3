import { mutableHandler, readonlyHandler } from "./baseHandler"
import { track, trigger } from "./effect"

//将reactive和reaonly的处理函数抽取到baseHandler中
export function reactive(target){
return createReactiveObjec(target,mutableHandler)
}

export function readonly(target){
    return createReactiveObjec(target,readonlyHandler)
}


function createReactiveObjec(target,baseHandler){
    return new Proxy(target,baseHandler)
}
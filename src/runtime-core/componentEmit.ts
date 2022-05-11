import { camelize, toHandlerKey } from "../share"

export function emit(instance,event,...args){
    const {props} = instance
    const handleName = toHandlerKey(camelize(event))
    const handler = props[handleName]
    handler&&handler(...args)
}
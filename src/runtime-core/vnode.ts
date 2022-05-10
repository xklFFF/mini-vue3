import { isArray, isString } from "../share"
import { ShapeFlags } from "./ShapeFlags"

export function createVnode(type,props:any={},children:any=[]){
    const vnode = {
        type,
        props,
        children,
        shapeFlag:getShapeFlag(type),
        // 用来存储虚拟节点渲染出来的真实节点
        el:null
    }
    if(isString(children)){
        vnode.shapeFlag|= ShapeFlags.TEXT_CHILDREN
    }else if( isArray(children)){
        vnode.shapeFlag|=ShapeFlags.STATEFUL_COMPONENT
    }
    return vnode
}

function getShapeFlag(type)
{
    return isString(type)?ShapeFlags.ELEMENT:ShapeFlags.STATEFUL_COMPONENT
}
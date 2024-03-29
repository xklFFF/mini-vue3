import { isArray, isObeject, isString } from "../share"
import { ShapeFlags } from "../share/ShapeFlags"


export const Text = Symbol("Text")
export const Fragment = Symbol("Fragment")
export { createVNode as createElementVNode };

export function createVNode(type, props: any = {}, children: any = []) {
    const vnode = {
        type,
        props,
        children,
        //用来存储组件实例
        component: null,
        key: props && props.key,
        shapeFlag: getShapeFlag(type),
        // 用来存储虚拟节点渲染出来的真实节点
        el: null
    }
    if (isString(children)) {
        vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN
    } else if (isArray(children)) {
        vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN
    }

    //若组件的子代也是对象则标记为slot
    if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
        if (isObeject(children)) {
            vnode.shapeFlag |= ShapeFlags.SLOT_CHILDREN
        }
    }
    return vnode
}

function getShapeFlag(type) {
    return isString(type) ? ShapeFlags.ELEMENT : ShapeFlags.STATEFUL_COMPONENT
}

export function createTextVNode(text: string) {
    return createVNode(Text, {}, text)
}
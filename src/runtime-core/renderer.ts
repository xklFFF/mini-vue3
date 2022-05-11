import { isArray, isObeject, isString } from "../share"
import { createComponentInstance, setupComponent } from "./component"
import { ShapeFlags } from "../share/ShapeFlags"
import { Fragment, Text } from "./vnode"

export function render(vnode, container) {
    patch(vnode, container)
}


function patch(vnode, container) {
    const { shapeFlag, type } = vnode

    switch (type) {
        case Fragment:
            processFragment(vnode, container);
            break
        case Text:
            processText(vnode, container);
            break
        default:
            if (shapeFlag & ShapeFlags.ELEMENT) {
                // 处理element
                processElement(vnode, container)
            } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
                processComponent(vnode, container)
            }
            break
    }

}

function processFragment(vnode, container) {
    mountChildren(vnode, container)

}
function processText(vnode, container) {
    const { children } = vnode
    const textNode = document.createTextNode(children)
    container.append(textNode)
}

function processElement(vnode, container) {
    mountElement(vnode, container)
}
function mountElement(vnode, container) {
    //创建真实节点
    const el = (vnode.el = document.createElement(vnode.type))
    const { children, shapeFlag } = vnode
    // 处理儿子节点
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
        el.textContent = children
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        mountChildren(vnode, el)
    }
    // 处理props
    const { props } = vnode
    const isOn = (key: string) => /^on[A-Z]/.test(key)
    for (const key in props) {
        const val = props[key]
        //监听事件
        if (isOn(key)) {
            const event = key.slice(2).toLocaleLowerCase()
            el.addEventListener(event, val)
        } else {
            el.setAttribute(key, val);
        }
    }

    container.append(el)
}

function mountChildren(vnode, container) {
    vnode.children.forEach(v => {
        patch(v, container)
    });
}



function processComponent(vnode, container) {
    mountComponent(vnode, container)
}

function mountComponent(initialVNode, container) {
    //创建组件实例
    const instance = createComponentInstance(initialVNode)
    //初始化props，slots以及设置组件状态
    setupComponent(instance)
    // 获取vnode树，并且递归调用patch方法处理vnode树
    setupRenderEffect(instance, initialVNode, container)
}

function setupRenderEffect(instance, initialVNode, container) {
    const { proxy } = instance
    const subTree = instance.render.call(proxy)
    patch(subTree, container)
    initialVNode.el = subTree.el
}



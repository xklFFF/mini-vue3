import { isArray, isObeject, isString } from "../share"
import { createComponentInstance, setupComponent } from "./component"
import { ShapeFlags } from "../share/ShapeFlags"
import { Fragment, Text } from "./vnode"

export function render(vnode, container) {
    patch(vnode, container,null)
}


function patch(vnode, container,parentComponent) {
    const { shapeFlag, type } = vnode

    switch (type) {
        case Fragment:
            processFragment(vnode, container,parentComponent);
            break
        case Text:
            processText(vnode, container);
            break
        default:
            if (shapeFlag & ShapeFlags.ELEMENT) {
                // 处理element
                processElement(vnode, container,parentComponent)
            } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
                processComponent(vnode, container,parentComponent)
            }
            break
    }

}

function processFragment(vnode, container,parentComponent) {
    mountChildren(vnode, container,parentComponent)

}
function processText(vnode, container) {
    const { children } = vnode
    const textNode = document.createTextNode(children)
    container.append(textNode)
}

function processElement(vnode, container,parentComponent) {
    mountElement(vnode, container,parentComponent)
}
function mountElement(vnode, container,parentComponent) {
    //创建真实节点
    const el = (vnode.el = document.createElement(vnode.type))
    const { children, shapeFlag } = vnode
    // 处理儿子节点
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
        el.textContent = children
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        mountChildren(vnode, el,parentComponent)
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

function mountChildren(vnode, container,parentComponent) {
    vnode.children.forEach(v => {
        patch(v, container,parentComponent)
    });
}



function processComponent(vnode, container,parentComponent) {
    mountComponent(vnode, container,parentComponent)
}

function mountComponent(initialVNode, container,parentComponent) {
    //创建组件实例
    const instance = createComponentInstance(initialVNode,parentComponent)
    //初始化props，slots以及设置组件状态
    setupComponent(instance)
    // 获取vnode树，并且递归调用patch方法处理vnode树
    setupRenderEffect(instance, initialVNode, container)
}

function setupRenderEffect(instance, initialVNode, container) {
    const { proxy } = instance
    const subTree = instance.render.call(proxy)
    patch(subTree, container,instance)
    initialVNode.el = subTree.el
}



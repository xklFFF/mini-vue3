import { isArray, isObeject, isString } from "../share"
import { createComponentInstance, setupComponent } from "./component"

export function render(vnode,container){
    patch(vnode,container)
}


function patch(vnode,container){
    if(isString(vnode.type)){
        // 处理element
        processElement(vnode,container)
    }else if(isObeject(vnode.type)){
        processComponent(vnode,container)
    }
}

function processElement(vnode,container){
    mountElement(vnode,container)
}
function mountElement(vnode,container){
    //创建真实节点
    const el = document.createElement(vnode.type)
    const { children } = vnode
    // 处理儿子节点
    if(isString(children)){
        el.textContent = children
    }else if(isArray(children)){
        mountChildren(vnode,el)
    }
    // 处理props
    const {props} = vnode
    for(const key in props){
        const val = props[key]
        el.setAttribute(key, val);
    }
    container.append(el)
}

function mountChildren(vnode,container){
    vnode.children.forEach(v => {
        patch(v,container)
    });
}



function processComponent(vnode,container){
    mountComponent(vnode,container)
}

function mountComponent(vnode,container){
    //创建组件实例
    const instance = createComponentInstance(vnode)
    //初始化props，slots以及设置组件状态
    setupComponent(instance)
    // 获取vnode树，并且递归调用patch方法处理vnode树
    setupRenderEffect(instance,container)
}

function setupRenderEffect(instance,container){
    const subTree = instance.render.call(instance.setupState)
    console.log(instance);
    
    patch(subTree,container)
}



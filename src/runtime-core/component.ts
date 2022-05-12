import { shallowReadonly } from "../reactivity/reactive"
import { isObeject } from "../share"
import { emit } from "./componentEmit"
import { initProps } from "./componentProps"
import { PublicInstanceProxyHandlers } from "./componentPubilcInstance"
import { initSlots } from "./componentSlots"

export function createComponentInstance(vnode) {
    const component = {
        vnode,
        type: vnode.type,
        setupState: {},
        props: {},
        slots:{},
        emit: () => { }
    }
    // 预输入实例
    component.emit = emit.bind(null, component) as any
    return component
}

// 初始化props，slots，以及调用setupStatefulComponent函数用于设置组件状态
export function setupComponent(instance) {
    // ToDo
    initProps(instance, instance.vnode.props)
    initSlots(instance,instance.vnode.children)
    setupStatefulComponent(instance)
}

function setupStatefulComponent(instance) {
    const component = instance.type
    instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers)
    const { setup } = component
    if (setup) {
        setCurrentInstance(instance)
        const setupResult = setup(shallowReadonly(instance.props),{emit:instance.emit})
        setCurrentInstance(null)
        handleSetupResult(instance, setupResult)
    }
}

function handleSetupResult(instance, setupResult) {
    // function or Object 
    // TODO  function
    if (isObeject(setupResult)) {
        instance.setupState = setupResult
    }

    finishComponentSetup(instance);

}
// 将render函数挂载到instance
function finishComponentSetup(instance) {
    const component = instance.type
    instance.render = component.render
}

let currentInstance = null
export function getCurrentInstance(){
    return currentInstance
}
function setCurrentInstance(instance){
    currentInstance = instance
}
import { shallowReadonly } from "../reactivity/reactive"
import { isObeject } from "../share"
import { initProps } from "./componentProps"
import { PublicInstanceProxyHandlers } from "./componentPubilcInstance"

export function createComponentInstance(vnode) {
    const component = {
        vnode,
        type: vnode.type,
        setupState: {},
        props:{}
    }
    return component
}

// 初始化props，slots，以及调用setupStatefulComponent函数用于设置组件状态
export function setupComponent(instance) {
    // ToDo
    initProps(instance,instance.vnode.props)
    // initSlots()
    setupStatefulComponent(instance)
}

function setupStatefulComponent(instance) {
    const component = instance.type
    instance.proxy = new Proxy({_:instance},PublicInstanceProxyHandlers)
    const { setup } = component
    if (setup) {
        const setupResult = setup(shallowReadonly(instance.props))
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
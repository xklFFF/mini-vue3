import { isObeject } from "../share"

export function createComponentInstance(vnode) {
    const component = {
        vnode,
        type: vnode.type
    }
    return component
}

// 初始化props，slots，以及调用setupStatefulComponent函数用于设置组件状态
export function setupComponent(instance) {
    // ToDo
    // initProps()
    // initSlots()
    setupStatefulComponent(instance)
}

function setupStatefulComponent(instance) {
    const component = instance.type
    const { setup } = component
    if (setup) {
        const setupResult = setup()
        instance.setupState = setupResult
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
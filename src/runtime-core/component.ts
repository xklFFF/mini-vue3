import { shallowReadonly } from "../reactivity/reactive"
import { proxyRefs } from "../reactivity/ref"
import { isObeject } from "../share"
import { emit } from "./componentEmit"
import { initProps } from "./componentProps"
import { PublicInstanceProxyHandlers } from "./componentPubilcInstance"
import { initSlots } from "./componentSlots"

export function createComponentInstance(vnode, parent) {
    const component = {
        vnode,
        type: vnode.type,
        setupState: {},
        props: {},
        slots: {},
        parent,
        provides: parent ? parent.provides : {},
        isMounted: false,
        subTree: {},
        next: null,
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
    initSlots(instance, instance.vnode.children)
    setupStatefulComponent(instance)
}

function setupStatefulComponent(instance) {
    const component = instance.type
    instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers)
    const { setup } = component
    if (setup) {
        setCurrentInstance(instance)
        const setupResult = setup(shallowReadonly(instance.props), { emit: instance.emit })
        setCurrentInstance(null)
        handleSetupResult(instance, setupResult)
    }
}

function handleSetupResult(instance, setupResult) {
    // function or Object 
    // TODO  function
    if (isObeject(setupResult)) {
        instance.setupState = proxyRefs(setupResult)
    }

    finishComponentSetup(instance);

}
// 将render函数挂载到instance
function finishComponentSetup(instance) {
    const Component = instance.type
    if (compiler && !Component.render) {
        if (Component.template) {
            Component.render = compiler(Component.template);
        }
    }
    instance.render = Component.render
}

let currentInstance = null
export function getCurrentInstance() {
    return currentInstance
}
function setCurrentInstance(instance) {
    currentInstance = instance
}
let compiler;
//用来注册函数，方便compiler跟runtime解耦
export function registerRuntimeCompiler(_compiler) {
    compiler = _compiler;
}
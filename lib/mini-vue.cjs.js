'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const isObeject = (value) => {
    return value !== null && typeof value === 'object';
};
const isArray = Array.isArray;
const isString = (val) => typeof val === 'string';

const publicPropertiesMap = {
    $el: (i) => i.vnode.el,
};
const PublicInstanceProxyHandlers = {
    get({ _: instance }, key) {
        const { setupState } = instance;
        if (key in setupState) {
            return setupState[key];
        }
        const pubicGetter = publicPropertiesMap[key];
        if (pubicGetter) {
            return pubicGetter(instance);
        }
    }
};

function createComponentInstance(vnode) {
    const component = {
        vnode,
        type: vnode.type,
        setupState: {}
    };
    return component;
}
// 初始化props，slots，以及调用setupStatefulComponent函数用于设置组件状态
function setupComponent(instance) {
    // ToDo
    // initProps()
    // initSlots()
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    const component = instance.type;
    instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers);
    const { setup } = component;
    if (setup) {
        const setupResult = setup();
        handleSetupResult(instance, setupResult);
    }
}
function handleSetupResult(instance, setupResult) {
    // function or Object 
    // TODO  function
    if (isObeject(setupResult)) {
        instance.setupState = setupResult;
    }
    finishComponentSetup(instance);
}
// 将render函数挂载到instance
function finishComponentSetup(instance) {
    const component = instance.type;
    instance.render = component.render;
}

function render(vnode, container) {
    patch(vnode, container);
}
function patch(vnode, container) {
    if (isString(vnode.type)) {
        // 处理element
        processElement(vnode, container);
    }
    else if (isObeject(vnode.type)) {
        processComponent(vnode, container);
    }
}
function processElement(vnode, container) {
    mountElement(vnode, container);
}
function mountElement(vnode, container) {
    //创建真实节点
    const el = (vnode.el = document.createElement(vnode.type));
    const { children } = vnode;
    // 处理儿子节点
    if (isString(children)) {
        el.textContent = children;
    }
    else if (isArray(children)) {
        mountChildren(vnode, el);
    }
    // 处理props
    const { props } = vnode;
    for (const key in props) {
        const val = props[key];
        el.setAttribute(key, val);
    }
    container.append(el);
}
function mountChildren(vnode, container) {
    vnode.children.forEach(v => {
        patch(v, container);
    });
}
function processComponent(vnode, container) {
    mountComponent(vnode, container);
}
function mountComponent(initialVNode, container) {
    //创建组件实例
    const instance = createComponentInstance(initialVNode);
    //初始化props，slots以及设置组件状态
    setupComponent(instance);
    // 获取vnode树，并且递归调用patch方法处理vnode树
    setupRenderEffect(instance, initialVNode, container);
}
function setupRenderEffect(instance, initialVNode, container) {
    const { proxy } = instance;
    const subTree = instance.render.call(proxy);
    console.log(instance);
    patch(subTree, container);
    initialVNode.el = subTree.el;
}

function createVnode(type, props = {}, children = []) {
    return {
        type,
        props,
        children,
        // 用来存储虚拟节点渲染出来的真实节点
        el: null
    };
}

function createApp(rootComponent) {
    return {
        mount(rootContainer) {
            const vnode = createVnode(rootComponent);
            render(vnode, rootContainer);
        }
        //ToDo
    };
}

function h(type, props = {}, children = []) {
    return createVnode(type, props, children);
}

exports.createApp = createApp;
exports.h = h;

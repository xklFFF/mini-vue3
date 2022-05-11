'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const extend = Object.assign;
const isObeject = (value) => {
    return value !== null && typeof value === 'object';
};
const hasChanged = (val, newValue) => {
    return !Object.is(val, newValue);
};
const isArray = Array.isArray;
const hasOwn = (val, key) => val.hasOwnProperty(key);
const isString = (val) => typeof val === 'string';
// 检测作为数组的key，是否为整数类型的字符串
const isIntegerKey = (key) => isString(key) &&
    key !== 'NaN' &&
    key[0] !== '-' &&
    '' + parseInt(key, 10) === key;
const objectToString = Object.prototype.toString;
const toTypeString = (value) => objectToString.call(value);
const toRawType = (value) => {
    // extract "RawType" from strings like "[object RawType]"
    return toTypeString(value).slice(8, -1);
};
const isMap = (val) => toTypeString(val) === '[object Map]';

//生成dep集合
const createDep = (effects) => {
    const dep = new Set(effects);
    //用来记录是否已经被追踪过
    dep.w = 0;
    //用来记录是否被新追踪过
    dep.n = 0;
    return dep;
};
//用来判断是否曾经被追踪过
const wasTracked = (dep) => (dep.w & trackOpBit) > 0;
//用来判断是否新被追踪
const newTracked = (dep) => (dep.n & trackOpBit) > 0;

const targetMap = new Map();
let activeEffect;
const ITERATE_KEY = Symbol();
const MAP_KEY_ITERATE_KEY = Symbol();
//用来标记
let trackOpBit = 1;
let shouldTrack = false;
const trackStack = [];
// 全局变量用来记录嵌套的深度
function pauseTracking() {
    trackStack.push(shouldTrack);
    shouldTrack = false;
}
function resetTracking() {
    const last = trackStack.pop();
    shouldTrack = last === undefined ? true : last;
}
function isTracking() {
    return shouldTrack && activeEffect !== undefined;
}
function track(target, key) {
    if (!isTracking())
        return;
    //获取当前对象target对应的缓存map'
    let depsMap = targetMap.get(target);
    if (!depsMap) {
        depsMap = new Map();
        targetMap.set(target, depsMap);
    }
    //获取对应属性key的依赖set集合
    let dep = depsMap.get(key);
    if (!dep) {
        dep = createDep();
        depsMap.set(key, dep);
    }
    trackEffects(dep);
}
function trackEffects(dep) {
    //用来决定是否应该收集依赖
    let shouldTrack = false;
    //如果嵌套层数小于30，走优化逻辑，若超过走原始逻辑
    {
        //如果还没有被新收集过
        if (!newTracked(dep)) {
            // 标记这次已经新收集了
            dep.n |= trackOpBit;
            // 收不收集又以前是否收集过来决定
            shouldTrack = !wasTracked(dep);
        }
    }
    if (shouldTrack) {
        // 反向收集那些会引起副作用函数的地方
        dep.add(activeEffect);
        activeEffect.deps.push(dep);
    }
}
function trigger(target, key, type, newValue) {
    //获取当前对象target对应的缓存map'
    let depsMap = targetMap.get(target);
    if (!depsMap) {
        // never been tracked
        return;
    }
    let deps = [];
    if (type === "clear" /* CLEAR */) {
        deps = [...depsMap.values()];
    }
    else if (key === 'length' && isArray(target)) {
        depsMap.forEach((dep, key) => {
            if (key === 'length' || key >= newValue) {
                deps.push(dep);
            }
        });
    }
    else {
        //获取对应属性key的依赖set集合
        //此处使用void 0的原因
        // undefined可以被重写
        // 从性能方面： void 0 比 undefined 少了三个字节
        // 保证结果不变性
        if (key !== void 0) {
            deps.push(depsMap.get(key));
        }
        switch (type) {
            case "add" /* ADD */:
                if (!isArray(target)) {
                    deps.push(depsMap.get(ITERATE_KEY));
                    if (isMap(target)) {
                        deps.push(depsMap.get(MAP_KEY_ITERATE_KEY));
                    }
                }
                else if (isIntegerKey(key)) {
                    deps.push(depsMap.get('length'));
                }
                break;
            case "delete" /* DELETE */:
                if (!isArray(target)) {
                    deps.push(depsMap.get(ITERATE_KEY));
                    if (isMap(target)) {
                        deps.push(depsMap.get(MAP_KEY_ITERATE_KEY));
                    }
                }
                break;
            case "set" /* SET */:
                if (isMap(target)) {
                    deps.push(depsMap.get(ITERATE_KEY));
                }
                break;
        }
    }
    const effects = [];
    for (const dep of deps) {
        if (dep) {
            effects.push(...dep);
        }
    }
    triggerEffects(effects);
}
function triggerEffects(dep) {
    //语言规范中对此有明确的说明：在调用forEach遍历Set集合时，如果一个值已经被访问过了，但该值被删除并重新添加到集合中，
    //如果此时foreach遍历没有结束，那么该值就会重新被访问。因此代码会无限执行，通过构造另一个set来遍历就可以避免
    dep = createDep(dep);
    //将所有依赖函数取出并且执行
    for (const effect of dep) {
        if (effect.scheduler) {
            effect.scheduler();
        }
        else {
            effect.run();
        }
    }
}

const get$1 = createGetter();
const set$1 = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
const shallowReactiveGet = createGetter(false, true);
//重写数组的方法
const arrayInstrumentations = createArrayInstrumentations();
function createArrayInstrumentations() {
    const instrumentations = {};
    ['includes', 'indexOf', 'lastIndexOf'].forEach(method => {
        const originMethod = Array.prototype[method];
        instrumentations[method] = function (...args) {
            //this 是代理对象，先在代理对象中查找，将结果存储到res中
            let res = originMethod.apply(this, args);
            if (res === false) {
                res = originMethod.apply(toRaw(this), args);
            }
            return res;
        };
    });
    ['push', 'pop', 'shift', 'unshift', 'splice'].forEach(method => {
        const originMethod = Array.prototype[method];
        instrumentations[method] = function (...args) {
            // 暂停追踪、
            pauseTracking();
            let res = originMethod.apply(this, args);
            // 继续追踪
            resetTracking();
            return res;
        };
    });
    return instrumentations;
}
function createGetter(isReadonly = false, shallow = false) {
    return function get(target, key, receiver) {
        if (key === "__v_isReactive" /* IS_REACTIVE */) {
            return !isReadonly;
        }
        else if (key === "__v_isReadonly" /* IS_READONLY */) {
            return isReadonly;
        }
        else if (key === "__v_raw" /* RAW */) {
            return target;
        }
        if (isArray(target) && arrayInstrumentations.hasOwnProperty(key)) {
            return Reflect.get(arrayInstrumentations, key, receiver);
        }
        const res = Reflect.get(target, key, receiver);
        //如果shallow就返回，那么没法被追踪到
        // 嵌套对象也需要转换成响应式
        if (isObeject(res) && !shallow) {
            return isReadonly ? readonly(res) : reactive(res);
        }
        if (!isReadonly && typeof key !== 'symbol') {
            track(target, key);
        }
        return res;
    };
}
function createSetter() {
    return function set(target, key, value, receiver) {
        // 判断一个键原来是否存在要先区分target是对象还是数组
        const hadKey = isArray(target) ? Number(key) < target.length : hasOwn(target, key);
        // 要注意在这里必须先获取旧值
        let oldValue = target[key];
        const res = Reflect.set(target, key, value, receiver);
        // 判断设置的对象跟代理对象是否有关系，解决了原型问题
        if (target === toRaw(receiver)) {
            // 如果原型没用这个key说明是新增加的
            if (!hadKey) {
                trigger(target, key, "add" /* ADD */, value);
            }
            else if (hasChanged(value, oldValue)) {
                // 比较新值与旧值，只有当他们不全等，并且都不是NaN的时候才触发响应
                trigger(target, key, "set" /* SET */, value);
            }
        }
        return res;
    };
}
// 用来拦截in操作符号
function has$1(target, key) {
    const result = Reflect.get(target, key);
    track(target, key);
    return result;
}
//用来拦截删除操作
function deleteProperty(target, key) {
    const hadKey = hasOwn(target, key);
    target[key];
    const result = Reflect.deleteProperty(target, key);
    if (result && hadKey) {
        trigger(target, key, "delete" /* DELETE */, undefined);
    }
    return result;
}
//用来拦截for in操作
function ownKeys(target) {
    const key = isArray(target) ? 'length' : ITERATE_KEY;
    track(target, key);
    return Reflect.ownKeys(target);
}
const mutableHandler = {
    get: get$1,
    set: set$1,
    has: has$1,
    deleteProperty,
    ownKeys
};
const readonlyHandler = {
    get: readonlyGet,
    set(target, key) {
        console.warn(`key :"${String(key)}" set 失败，因为 target 是 readonly 类型`, target);
        return true;
    }
};
const shallowReadonlyHandler = extend({}, readonlyHandler, { get: shallowReadonlyGet });
extend({}, mutableHandler, { get: shallowReactiveGet });

const toShallow = (value) => value;
const getProto = (v) => Reflect.getPrototypeOf(v);
// set集合的Add操作
function add(key) {
    // 此时this是指向的代理对象，所以直接访问代理对象target
    key = toRaw(key);
    const target = toRaw(this);
    const proto = getProto(target);
    const hadKey = proto.has.call(target, key);
    if (!hadKey) {
        target.add(key);
        trigger(target, key, "add" /* ADD */, key);
    }
    return this;
}
// set集合的delete操作
function deleteEntry(key) {
    const target = toRaw(this);
    const { has } = getProto(target);
    let hadKey = has.call(target, key); //是否存在当前key
    let res = false;
    if (!hadKey) {
        key = toRaw(key);
        hadKey = has.call(target, key);
    }
    if (hadKey) {
        res = target.delete(key);
        trigger(target, key, "delete" /* DELETE */, undefined);
    }
    return res;
}
// map的获取操作
function get(target, key, isReadonly = false, isShallow = false) {
    target = target["__v_raw" /* RAW */];
    const rawTarget = toRaw(target);
    const rawKey = toRaw(key);
    if (key !== rawKey) {
        !isReadonly && track(rawTarget, key);
    }
    !isReadonly && track(rawTarget, rawKey);
    const { has } = getProto(rawTarget);
    const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive;
    if (has.call(rawTarget, key)) {
        return wrap(target.get(key));
    }
    else if (has.call(rawTarget, rawKey)) {
        return wrap(target.get(rawKey));
    }
    else if (target !== rawTarget) {
        target.get(key);
    }
}
//map的设置操作
function set(key, value) {
    const target = toRaw(this);
    // 避免把响应式数据设置到原始对象上,这种情况就是数据污染，所以要把响应式对象变成原始对象
    value = toRaw(value);
    const oldValue = target.get(key);
    target.set(key, value);
    if (!oldValue) {
        //新增
        trigger(target, key, "add" /* ADD */, value);
    }
    else if (hasChanged(value, oldValue)) {
        //更新
        trigger(target, key, "set" /* SET */, value);
    }
}
function has(key, isReadonly = false) {
    const target = this["__v_raw" /* RAW */];
    const rawTarget = toRaw(target);
    const rawKey = toRaw(key);
    if (key !== rawKey) {
        !isReadonly && track(rawTarget, key);
    }
    !isReadonly && track(rawTarget, rawKey);
    return key === rawKey ?
        target.has(key) :
        target.has(key) || target.has(rawKey);
}
function size(target, isReadonly = false) {
    target = target["__v_raw" /* RAW */];
    !isReadonly && track(toRaw(target), ITERATE_KEY);
    return Reflect.get(target, 'size', target);
}
function clear() {
    const target = toRaw(this);
    const hadItems = target.size !== 0;
    const result = target.clear();
    if (hadItems) {
        trigger(target, undefined, "clear" /* CLEAR */, undefined);
    }
    return result;
}
function createForEach(isReadonly, isShallow) {
    return function forEach(callback, thisArg) {
        const observed = this;
        const target = observed["__v_raw" /* RAW */];
        const rawTarget = toRaw(target);
        const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toShallow;
        !isReadonly && track(rawTarget, ITERATE_KEY);
        return target.forEach((value, key) => {
            return callback.call(thisArg, wrap(value), wrap(key), observed);
        });
    };
}
function createReadonlyMethod(type) {
    return function (...args) {
        const key = args[0] ? `on key "${args[0]}" ` : ``;
        console.warn(`${type} operation ${key}failed: target is readonly.`, toRaw(this));
        return type === "delete" /* DELETE */ ? false : this;
    };
}
function createIterableMethod(method, isReadonly, isShallow) {
    return function (...args) {
        const target = this["__v_raw" /* RAW */];
        const rawTarget = toRaw(target);
        //用来判断是否为map类型
        const targetIsMap = isMap(rawTarget);
        //是否需要返回完整的键值对
        const isPair = method === 'entries' || (method === Symbol.iterator && targetIsMap);
        //是否只关心键
        const isKeyOnly = method === 'keys' && targetIsMap;
        // 内部的遍历器
        const innerIterator = target[method](...args);
        const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive;
        !isReadonly && track(rawTarget, isKeyOnly ? MAP_KEY_ITERATE_KEY : ITERATE_KEY);
        return {
            next() {
                const { value, done } = innerIterator.next();
                return done
                    ? { value, done }
                    : {
                        value: isPair ? [wrap(value[0]), wrap(value[1])] : wrap(value),
                        done
                    };
            },
            [Symbol.iterator]() {
                return this;
            }
        };
    };
}
function createInstrumentations() {
    const mutableInstrumentations = {
        get(key) {
            return get(this, key);
        },
        get size() {
            return size(this);
        },
        has,
        add,
        set,
        delete: deleteEntry,
        clear,
        forEach: createForEach(false, false)
    };
    const shallowInstrumentations = {
        get(key) {
            return get(this, key, false, true);
        },
        get size() {
            return size(this);
        },
        has,
        add,
        set,
        delete: deleteEntry,
        clear,
        forEach: createForEach(false, true)
    };
    const readonlyInstrumentations = {
        get(key) {
            return get(this, key, true);
        },
        get size() {
            return size(this, true);
        },
        has(key) {
            return has.call(this, key, true);
        },
        add: createReadonlyMethod("add" /* ADD */),
        set: createReadonlyMethod("set" /* SET */),
        delete: createReadonlyMethod("delete" /* DELETE */),
        clear: createReadonlyMethod("clear" /* CLEAR */),
        forEach: createForEach(true, false)
    };
    const shallowReadonlyInstrumentations = {
        get(key) {
            return get(this, key, true, true);
        },
        get size() {
            return size(this, true);
        },
        has(key) {
            return has.call(this, key, true);
        },
        add: createReadonlyMethod("add" /* ADD */),
        set: createReadonlyMethod("set" /* SET */),
        delete: createReadonlyMethod("delete" /* DELETE */),
        clear: createReadonlyMethod("clear" /* CLEAR */),
        forEach: createForEach(true, true)
    };
    const iteratorMethods = ['keys', 'values', 'entries', Symbol.iterator];
    iteratorMethods.forEach(method => {
        mutableInstrumentations[method] = createIterableMethod(method, false, false);
        readonlyInstrumentations[method] = createIterableMethod(method, true, false);
        shallowInstrumentations[method] = createIterableMethod(method, false, true);
        shallowReadonlyInstrumentations[method] = createIterableMethod(method, true, true);
    });
    return [
        mutableInstrumentations,
        readonlyInstrumentations,
        shallowInstrumentations,
        shallowReadonlyInstrumentations
    ];
}
const [mutableInstrumentations, readonlyInstrumentations, shallowInstrumentations, shallowReadonlyInstrumentations] = createInstrumentations();
function createInstrumentationGetter(isReadonly, shallow) {
    const instrumentations = shallow
        ? isReadonly
            ? shallowReadonlyInstrumentations
            : shallowInstrumentations
        : isReadonly
            ? readonlyInstrumentations
            : mutableInstrumentations;
    return function get(target, key, receiver) {
        if (key === "__v_isReactive" /* IS_REACTIVE */) {
            return !isReadonly;
        }
        else if (key === "__v_isReadonly" /* IS_READONLY */) {
            return isReadonly;
        }
        else if (key === "__v_raw" /* RAW */) {
            return target;
        }
        return Reflect.get(hasOwn(instrumentations, key) && key in target
            ? instrumentations
            : target, key, receiver);
        // return target[key].bind(target)
    };
}
const mutableCollectionHandlers = {
    get: createInstrumentationGetter(false, false)
};
const readonlyCollectionHandlers = {
    get: createInstrumentationGetter(true, false)
};
const shallowReadonlyCollectionHandlers = {
    get: createInstrumentationGetter(true, true)
};

function targetTypeMap(rawType) {
    switch (rawType) {
        case 'Object':
        case 'Array':
            return 1 /* COMMON */;
        case 'Map':
        case 'Set':
        case 'WeakMap':
        case 'WeakSet':
            return 2 /* COLLECTION */;
        default:
            return 0 /* INVALID */;
    }
}
function getTargetType(value) {
    return targetTypeMap(toRawType(value));
}
const reactiveMap = new WeakMap();
const readonlyMap = new WeakMap();
const shallowReadonlyMap = new WeakMap();
//将reactive和reaonly的处理函数抽取到baseHandler中
function reactive(target) {
    const proxy = createReactiveObject(target, false, mutableHandler, mutableCollectionHandlers, reactiveMap);
    return proxy;
}
function readonly(target) {
    return createReactiveObject(target, true, readonlyHandler, readonlyCollectionHandlers, readonlyMap);
}
function shallowReadonly(target) {
    return createReactiveObject(target, true, shallowReadonlyHandler, shallowReadonlyCollectionHandlers, shallowReadonlyMap);
}
function createReactiveObject(target, isReadonly, baseHandlers, collectionHandlers, proxyMap) {
    //如果target是一个非只读响应式代理对象直接返回原对象
    if (target["__v_raw" /* RAW */] && !(isReadonly && target["__v_isReactive" /* IS_REACTIVE */])) {
        return target;
    }
    //如果不是对象就直接返回 Reactive只拦截对象
    if (!isObeject(target)) {
        return target;
    }
    // target already has corresponding Proxy
    const existingProxy = proxyMap.get(target);
    if (existingProxy) {
        return existingProxy;
    }
    // only a whitelist of value types can be observed.
    const targetType = getTargetType(target);
    //如果当前的对象是无效的对象就直接返回（例如函数、其他对象）
    if (targetType === 0 /* INVALID */) {
        return target;
    }
    const proxy = new Proxy(target, targetType === 2 /* COLLECTION */ ? collectionHandlers : baseHandlers);
    proxyMap.set(target, proxy);
    return proxy;
}
function toRaw(observed) {
    // 若observed不是响应对象，raw为undefin，返回observed
    //若observed是响应对象，raw为响应对象的原始值，需对原始值进行检查是否为嵌套响应
    const raw = observed && observed["__v_raw" /* RAW */];
    return raw ? toRaw(raw) : observed;
}
const toReactive = (val) => isObeject(val) ? reactive(val) : val;
const toReadonly = (val) => isObeject(val) ? readonly(val) : val;

function initProps(instance, rawProps) {
    instance.props = rawProps || {};
}

const publicPropertiesMap = {
    $el: (i) => i.vnode.el,
};
const PublicInstanceProxyHandlers = {
    get({ _: instance }, key) {
        const { setupState, props } = instance;
        if (key in setupState) {
            return setupState[key];
        }
        else if (hasOwn(props, key)) {
            return props[key];
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
        setupState: {},
        props: {}
    };
    return component;
}
// 初始化props，slots，以及调用setupStatefulComponent函数用于设置组件状态
function setupComponent(instance) {
    // ToDo
    initProps(instance, instance.vnode.props);
    // initSlots()
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    const component = instance.type;
    instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers);
    const { setup } = component;
    if (setup) {
        const setupResult = setup(shallowReadonly(instance.props));
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
    const { shapeFlag } = vnode;
    if (shapeFlag & 1 /* ELEMENT */) {
        // 处理element
        processElement(vnode, container);
    }
    else if (shapeFlag & 2 /* STATEFUL_COMPONENT */) {
        processComponent(vnode, container);
    }
}
function processElement(vnode, container) {
    mountElement(vnode, container);
}
function mountElement(vnode, container) {
    //创建真实节点
    const el = (vnode.el = document.createElement(vnode.type));
    const { children, shapeFlag } = vnode;
    // 处理儿子节点
    if (shapeFlag & 4 /* TEXT_CHILDREN */) {
        el.textContent = children;
    }
    else if (shapeFlag & 8 /* ARRAY_CHILDREN */) {
        mountChildren(vnode, el);
    }
    // 处理props
    const { props } = vnode;
    const isOn = (key) => /^on[A-Z]/.test(key);
    for (const key in props) {
        const val = props[key];
        //监听事件
        if (isOn(key)) {
            const event = key.slice(2).toLocaleLowerCase();
            el.addEventListener(event, val);
        }
        else {
            el.setAttribute(key, val);
        }
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
    patch(subTree, container);
    initialVNode.el = subTree.el;
}

function createVnode(type, props = {}, children = []) {
    const vnode = {
        type,
        props,
        children,
        shapeFlag: getShapeFlag(type),
        // 用来存储虚拟节点渲染出来的真实节点
        el: null
    };
    if (isString(children)) {
        vnode.shapeFlag |= 4 /* TEXT_CHILDREN */;
    }
    else if (isArray(children)) {
        vnode.shapeFlag |= 8 /* ARRAY_CHILDREN */;
    }
    return vnode;
}
function getShapeFlag(type) {
    return isString(type) ? 1 /* ELEMENT */ : 2 /* STATEFUL_COMPONENT */;
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

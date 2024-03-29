'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function toDisplayString(value) {
    return String(value);
}

const extend = Object.assign;
const EMPTY_OBJ = {};
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
//   转换成驼峰命名
const camelize = (str) => {
    return str.replace(/-(\w)/g, (_, c) => {
        return c ? c.toUpperCase() : "";
    });
};
//   首字母大写
const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};
//处理跟事件有关的key值
const toHandlerKey = (str) => {
    return str ? "on" + capitalize(str) : "";
};

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
const initDepMarkers = ({ deps }) => {
    if (deps.length) {
        for (let i = 0; i < deps.length; i++) {
            // 标记一下这些被追踪过的effect    
            deps[i].w |= trackOpBit;
        }
    }
};
// 执行完effect函数后，对依赖进行检查
const finalizeDepMarkers = (effect) => {
    const { deps } = effect;
    if (deps.length) {
        // 用来记录栈顶的指针
        let ptr = 0;
        for (let i = 0; i < deps.length; i++) {
            const dep = deps[i];
            // 如果该依赖数组以前收集过，但是现在没有被记录到重新收集，将副作用函数从依赖数组中删除
            if (wasTracked(dep) && !newTracked(dep)) {
                //将副作用函数从其依赖数值中删除
                dep.delete(effect);
            }
            else {
                // 需保存起来的依赖数组
                deps[ptr++] = dep;
            }
            dep.w &= ~trackOpBit;
            dep.n &= ~trackOpBit;
        }
        deps.length = ptr;
    }
};

const targetMap = new Map();
let activeEffect;
// 用一个栈来记录activeEffect，避免effect嵌套中深层次activeEffect把浅层的activeEffect覆盖
let effectStack = [];
const ITERATE_KEY = Symbol();
const MAP_KEY_ITERATE_KEY = Symbol();
let effectTrackDepth = 0;
//用来标记
let trackOpBit = 1;
//追踪的最大嵌套层数（30跟JavaScript中的位数有关最多31位）
const maxTrackOpBits = 30;
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
class ReactiveEffect {
    constructor(fn, scheduler) {
        this.deps = [];
        this.active = true;
        this._fn = fn;
        this.scheduler = scheduler;
    }
    run() {
        // 如果处于stop状态则不执行
        if (!this.active) {
            // 返回执行结果
            return this._fn();
        }
        let lastShouldTrack = shouldTrack;
        try {
            //应该收集
            shouldTrack = true;
            effectStack.push(activeEffect = this);
            //用来给作为这一嵌套层次依赖数组的标记，跟嵌套层次effectTrackDepth有关，执行结束后也方便恢复标记
            trackOpBit = 1 << ++effectTrackDepth;
            // 如果小于嵌套层数限制，走优化逻辑
            if (effectTrackDepth <= maxTrackOpBits) {
                initDepMarkers(this);
            }
            else {
                //走普通逻辑，全部清理
                cleanupEffect(this);
            }
            return this._fn();
        }
        finally {
            // 如果小于嵌套层数限制，走优化逻辑
            if (effectTrackDepth <= maxTrackOpBits) {
                //优化处理那些已经标记好的dep
                finalizeDepMarkers(this);
            }
            // 返回进入该嵌套前的标记
            trackOpBit = 1 << --effectTrackDepth;
            effectStack.pop();
            activeEffect = effectStack[effectStack.length - 1];
            shouldTrack = lastShouldTrack;
        }
    }
    stop() {
        // 防止stop重复调用
        if (this.active) {
            cleanupEffect(this);
            if (this.onStop) {
                this.onStop();
            }
            this.active = false;
        }
    }
}
//清空依赖
function cleanupEffect(effect) {
    effect.deps.forEach((dep) => {
        dep.delete(effect);
    });
    // 清空effect.dps
    effect.deps.length = 0;
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
    if (effectTrackDepth <= maxTrackOpBits) {
        //如果还没有被新收集过
        if (!newTracked(dep)) {
            // 标记这次已经新收集了
            dep.n |= trackOpBit;
            // 收不收集又以前是否收集过来决定
            shouldTrack = !wasTracked(dep);
        }
    }
    else {
        //收不收集由副作用函数是否已经在依赖数组收集过了
        shouldTrack = !dep.has(activeEffect);
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
function effect(fn, options = {}) {
    const _effect = new ReactiveEffect(fn, options.scheduler);
    // 将options属性扩展到_effect中
    extend(_effect, options);
    _effect.run();
    //需绑定执行上下文
    const runner = _effect.run.bind(_effect);
    // 存储当前副作用函数实例
    runner.effect = _effect;
    return runner;
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

class RefImpl {
    constructor(value) {
        this.__v_isRef = true;
        this._rawValue = value;
        this._value = convert(value);
        this.dep = new Set();
    }
    get value() {
        trackRefValue(this);
        return this._value;
    }
    set value(newValue) {
        if (hasChanged(this._rawValue, newValue)) {
            this._rawValue = newValue;
            this._value = convert(newValue);
            triggerEffects(this.dep);
        }
    }
}
//抽取追踪函数
function trackRefValue(ref) {
    if (isTracking()) {
        trackEffects(ref.dep);
    }
}
// 转换值
function convert(value) {
    return isObeject(value) ? reactive(value) : value;
}
function ref(value) {
    return new RefImpl(value);
}
function isRef(ref) {
    return !!ref.__v_isRef;
}
function unRef(ref) {
    return isRef(ref) ? ref.value : ref;
}
// 这个方法我们在写模板，也就是 HTML 里面使用 ref 不需要手动加上 .vulue 的原因，自动帮我们使用了这个方法
//有ref就帮你剥离value出来，没有ref直接返回value
function proxyRefs(objectWithRefs) {
    //TODO，如果是原始对象，返回原始对象就好，不用经过proxy代理
    return new Proxy(objectWithRefs, {
        get(target, key) {
            //获取值，如果是ref则把值剥离出来
            return unRef(Reflect.get(target, key));
        },
        set(target, key, value) {
            {
                // 如果把一个非ref的值赋给ref，需要通过ref.value=value这种形式
                if (isRef(target[key]) && !isRef(value)) {
                    return (target[key].value = value);
                }
                else {
                    return Reflect.set(target, key, value);
                }
            }
        }
    });
}

function emit(instance, event, ...args) {
    const { props } = instance;
    const handleName = toHandlerKey(camelize(event));
    const handler = props[handleName];
    handler && handler(...args);
}

function initProps(instance, rawProps) {
    instance.props = rawProps || {};
}

const publicPropertiesMap = {
    $el: (i) => i.vnode.el,
    $slots: (i) => i.slots,
    $props: (i) => i.props,
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

function initSlots(instance, children) {
    const { vnode } = instance;
    if (vnode.shapeFlag & 16 /* SLOT_CHILDREN */) {
        normalizeObjectSlots(children, instance.slots);
    }
}
function normalizeObjectSlots(children, slots) {
    for (const key in children) {
        const value = children[key];
        slots[key] = (props) => normalizeSlotValue(value(props));
    }
}
function normalizeSlotValue(value) {
    return Array.isArray(value) ? value : [value];
}

function createComponentInstance(vnode, parent) {
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
    };
    // 预输入实例
    component.emit = emit.bind(null, component);
    return component;
}
// 初始化props，slots，以及调用setupStatefulComponent函数用于设置组件状态
function setupComponent(instance) {
    // ToDo
    initProps(instance, instance.vnode.props);
    initSlots(instance, instance.vnode.children);
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    const component = instance.type;
    instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers);
    const { setup } = component;
    if (setup) {
        setCurrentInstance(instance);
        const setupResult = setup(shallowReadonly(instance.props), { emit: instance.emit });
        setCurrentInstance(null);
        handleSetupResult(instance, setupResult);
    }
}
function handleSetupResult(instance, setupResult) {
    // function or Object 
    // TODO  function
    if (isObeject(setupResult)) {
        instance.setupState = proxyRefs(setupResult);
    }
    finishComponentSetup(instance);
}
// 将render函数挂载到instance
function finishComponentSetup(instance) {
    const Component = instance.type;
    if (compiler && !Component.render) {
        if (Component.template) {
            Component.render = compiler(Component.template);
        }
    }
    instance.render = Component.render;
}
let currentInstance = null;
function getCurrentInstance() {
    return currentInstance;
}
function setCurrentInstance(instance) {
    currentInstance = instance;
}
let compiler;
//用来注册函数，方便compiler跟runtime解耦
function registerRuntimeCompiler(_compiler) {
    compiler = _compiler;
}

const Text = Symbol("Text");
const Fragment = Symbol("Fragment");
function createVNode(type, props = {}, children = []) {
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
    };
    if (isString(children)) {
        vnode.shapeFlag |= 4 /* TEXT_CHILDREN */;
    }
    else if (isArray(children)) {
        vnode.shapeFlag |= 8 /* ARRAY_CHILDREN */;
    }
    //若组件的子代也是对象则标记为slot
    if (vnode.shapeFlag & 2 /* STATEFUL_COMPONENT */) {
        if (isObeject(children)) {
            vnode.shapeFlag |= 16 /* SLOT_CHILDREN */;
        }
    }
    return vnode;
}
function getShapeFlag(type) {
    return isString(type) ? 1 /* ELEMENT */ : 2 /* STATEFUL_COMPONENT */;
}
function createTextVNode(text) {
    return createVNode(Text, {}, text);
}

function createAppAPI(render) {
    return function createApp(rootComponent) {
        return {
            mount(rootContainer) {
                const vnode = createVNode(rootComponent);
                render(vnode, rootContainer);
            }
            //ToDo
        };
    };
}

// 遍历新旧props，判断是否需要更新
function shouldUpdateComponent(prevVNode, nextVNode) {
    const { props: prevProps } = prevVNode;
    const { props: nextProps } = nextVNode;
    for (const key in nextProps) {
        if (nextProps[key] !== prevProps[key]) {
            return true;
        }
    }
    return false;
}

const queue = [];
let p = Promise.resolve();
function nextTick(fn) {
    return fn ? p.then(fn) : p;
}
function queueJobs(job) {
    if (!queue.includes(job)) {
        queue.push(job);
    }
    //刷新队列
    queueFlush();
}
let isPending = false;
function queueFlush() {
    //队列已经正在刷新中
    if (isPending)
        return;
    isPending = true;
    nextTick(flushJobs);
}
function flushJobs() {
    isPending = false;
    let job;
    while ((job = queue.shift())) {
        job && job();
    }
}

function createRenderer(options) {
    const { createElement: hostCreateElement, patchProp: hostPatchProp, insert: hostInsert, remove: hostRemove, setElementText: hostSetElementText } = options;
    function render(vnode, container) {
        patch(null, vnode, container, null, null);
    }
    function patch(n1, n2, container, parentComponent, anchor) {
        const { shapeFlag, type } = n2;
        switch (type) {
            case Fragment:
                processFragment(n1, n2, container, parentComponent, anchor);
                break;
            case Text:
                processText(n1, n2, container);
                break;
            default:
                if (shapeFlag & 1 /* ELEMENT */) {
                    // 处理element
                    processElement(n1, n2, container, parentComponent, anchor);
                }
                else if (shapeFlag & 2 /* STATEFUL_COMPONENT */) {
                    processComponent(n1, n2, container, parentComponent, anchor);
                }
                break;
        }
    }
    function processFragment(n1, n2, container, parentComponent, anchor) {
        mountChildren(n2.children, container, parentComponent, anchor);
    }
    function processText(n1, n2, container) {
        const { children } = n2;
        const textNode = (n2.el = document.createTextNode(children));
        container.append(textNode);
    }
    function patchElement(n1, n2, container, parentComponent, anchor) {
        console.log("patch element");
        // 更新props
        const oldProps = n1.props || EMPTY_OBJ;
        const newProps = n2.props || EMPTY_OBJ;
        const el = (n2.el = n1.el);
        patchChildren(n1, n2, el, parentComponent, anchor);
        patchProps(el, oldProps, newProps);
    }
    function patchChildren(n1, n2, container, parentComponent, anchor) {
        //text > text
        // text > Array
        // Array to Text
        // Array to Array
        const prevShapeFlag = n1.shapeFlag;
        const c1 = n1.children;
        const { shapeFlag } = n2;
        const c2 = n2.children;
        if (shapeFlag & 4 /* TEXT_CHILDREN */) {
            // Array to Text
            if (prevShapeFlag & 8 /* ARRAY_CHILDREN */) {
                unmountChildren(n1.children);
            }
            // Text to Text
            if (c1 !== c2) {
                hostSetElementText(container, c2);
            }
        }
        else {
            // Text to Array
            if (prevShapeFlag & 4 /* TEXT_CHILDREN */) {
                // 清空文本
                hostSetElementText(container, "");
                // 挂载子节点
                mountChildren(c2, container, parentComponent, anchor);
            }
            else {
                //TODO Array to Array
                console.log("array to array");
                patchKeyedChildren(c1, c2, container, parentComponent, anchor);
            }
        }
    }
    function patchKeyedChildren(c1, c2, container, parentComponent, parentAnchor) {
        function isSameVNodeType(n1, n2) {
            return n1.type === n2.type && n1.key === n2.key;
        }
        const l2 = c2.length;
        let i = 0;
        let e1 = c1.length - 1;
        let e2 = l2 - 1;
        // 左右预处理，减小中间diff算法的n
        // 处理左边
        while (i <= e1 && i <= e2) {
            const n1 = c1[i];
            const n2 = c2[i];
            if (isSameVNodeType(n1, n2)) {
                patch(n1, n2, container, parentComponent, parentAnchor);
            }
            else {
                break;
            }
            i++;
        }
        //处理右边
        while (i <= e1 && i <= e2) {
            const n1 = c1[e1];
            const n2 = c2[e2];
            if (isSameVNodeType(n1, n2)) {
                patch(n1, n2, container, parentComponent, parentAnchor);
            }
            else {
                break;
            }
            e1--;
            e2--;
        }
        if (i > e1) {
            // 新的比旧的长
            // ["a","b"]
            // ["a","b","c"]
            // 或者下面这种情况，头部插入
            // ["a","b"]
            // ["c","a","b"]
            if (i <= e2) {
                const nextPos = e2 + 1;
                const anchor = nextPos < l2 ? c2[nextPos].e1 : null;
                // 注意这里得用while循环，因为有可能不止一个
                while (i <= e2) {
                    patch(null, c2[i], container, parentComponent, anchor);
                    i++;
                }
            }
        }
        else if (i > e2) {
            // 旧的比新的长
            // ["a","b","c"]
            // ["a","b"]
            while (i <= e1) {
                hostRemove(c1[i].el);
                i++;
            }
        }
        else {
            //TODO中间对比
            // a,b,(c,e,d),f,g
            // a,b,(e,c),f,g
            //TODO
            // 实现中间对比部分中的移动结点
            // 需要判断是否需要移动
            let s1 = i;
            let s2 = i;
            //新结点数组中需要被patch的数量
            const toBePatched = e2 - s2 + 1;
            let patched = 0;
            const newIndexToOldIndexMap = new Array(toBePatched);
            newIndexToOldIndexMap.fill(0);
            // 用来标记是否需要移动中间结点，避免不需要的时候还求最长递增子序列，影响性能
            let moved = false;
            // 用来存储当前最大索引，方便判断是否需要移动结点
            let maxNewIndexSoFar = 0;
            const keyToNewIndexMap = new Map();
            // 遍历需要处理的新子节点数组，建立以key为键以索引为值的键值对
            for (let i = s2; i <= e2; i++) {
                const nextChild = c2[i];
                keyToNewIndexMap.set(nextChild.key, i);
            }
            for (let i = s1; i <= e1; i++) {
                const prevChild = c1[i];
                // 如果已经处理的结点数大于等于需要处理的结点数说明剩下的结点是多余的给删除了
                if (patched >= toBePatched) {
                    hostRemove(prevChild.el);
                    continue;
                }
                let newIndex;
                if (prevChild.key != null) {
                    newIndex = keyToNewIndexMap.get(prevChild.key);
                }
                else {
                    // 如果没有key那只好去遍历新结点数组
                    for (let j = s2; j < e2; j++) {
                        if (isSameVNodeType(prevChild, c2[j])) {
                            newIndex = j;
                            break;
                        }
                    }
                }
                //说明这个旧结点在新结点数组里面是不存在的
                if (newIndex === undefined) {
                    hostRemove(prevChild.el);
                }
                else {
                    if (newIndex >= maxNewIndexSoFar) {
                        // 符合索引递增，说明不用移动结点
                        maxNewIndexSoFar = newIndex;
                    }
                    else {
                        moved = true;
                    }
                    //通过+1避免了跟为0的情况冲突
                    newIndexToOldIndexMap[newIndex - s2] = i + 1;
                    patch(prevChild, c2[newIndex], container, parentComponent, null);
                    patched++;
                }
            }
            //旧 ["p1","p2","p3","p4","p6","p5"]
            // 新 ["p1","p3","p4","p2","p7","p5"]
            // 中间对比部分
            // ["p2","p3","p4","p6"]
            //  [“p3","p4","p2","p7"]
            // 此时的newIndexToOldIndexMap
            // [2,3,1,0]
            //increasingNewIndexSequence [0,1]
            // 根据需要来获取最小递增子序列
            const increasingNewIndexSequence = moved
                ? getSequence(newIndexToOldIndexMap)
                : [];
            let j = increasingNewIndexSequence.length - 1;
            for (let i = toBePatched - 1; i >= 0; i--) {
                const nextIndex = i + s2;
                const nextChild = c2[nextIndex];
                const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : null;
                //说明旧结点中没有这个结点需要挂载个新的
                if (newIndexToOldIndexMap[i] === 0) {
                    patch(null, nextChild, container, parentComponent, anchor);
                    console.log(anchor, nextChild);
                }
                else if (moved) { //需要移动的情况
                    if (j < 0 || i !== increasingNewIndexSequence[j]) {
                        hostInsert(nextChild.el, container, anchor);
                    }
                    else {
                        j--;
                    }
                }
            }
        }
    }
    function unmountChildren(children) {
        for (let i = 0; i < children.length; i++) {
            const el = children[i].el;
            hostRemove(el);
        }
    }
    function patchProps(el, oldProps, newProps) {
        if (oldProps !== newProps) {
            //将每个新的属性进行patch
            for (const key in newProps) {
                const prevProp = oldProps[key];
                const nextProp = newProps[key];
                if (prevProp !== nextProp) {
                    hostPatchProp(el, key, prevProp, nextProp);
                }
            }
            // 对每个新值的为空的属性进行卸载
            if (oldProps !== EMPTY_OBJ) {
                for (const key in oldProps) {
                    if (!(key in newProps)) {
                        hostPatchProp(el, key, oldProps[key], null);
                    }
                }
            }
        }
    }
    function processElement(n1, n2, container, parentComponent, anchor) {
        //如果还没挂载过
        if (!n1) {
            mountElement(n2, container, parentComponent, anchor);
        }
        else {
            patchElement(n1, n2, container, parentComponent, anchor);
        }
    }
    function mountElement(vnode, container, parentComponent, anchor) {
        //创建真实节点
        const el = (vnode.el = hostCreateElement(vnode.type));
        const { children, shapeFlag } = vnode;
        // 处理儿子节点
        if (shapeFlag & 4 /* TEXT_CHILDREN */) {
            el.textContent = children;
        }
        else if (shapeFlag & 8 /* ARRAY_CHILDREN */) {
            mountChildren(vnode.children, el, parentComponent, anchor);
        }
        // 处理props
        const { props } = vnode;
        for (const key in props) {
            const val = props[key];
            hostPatchProp(el, key, null, val);
        }
        hostInsert(el, container, anchor);
    }
    function mountChildren(children, container, parentComponent, anchor) {
        children.forEach(v => {
            patch(null, v, container, parentComponent, anchor);
        });
    }
    function processComponent(n1, n2, container, parentComponent, anchor) {
        //判断是要更新组件还是要重新挂载组件
        if (!n1) {
            mountComponent(n2, container, parentComponent, anchor);
        }
        else {
            updateComponent(n1, n2);
        }
    }
    function updateComponent(n1, n2) {
        const instance = (n2.component = n1.component);
        //判断是否需要更新
        if (shouldUpdateComponent(n1, n2)) {
            // 将新的虚拟节点挂载到实例上
            instance.next = n2;
            // 调用组件实例的更新
            instance.update();
        }
        else {
            n2.el = n1.el;
            instance.vnode = n2;
        }
    }
    function mountComponent(initialVNode, container, parentComponent, anchor) {
        //创建组件实例,并挂载到虚拟dom的component对象上
        const instance = (initialVNode.component = createComponentInstance(initialVNode, parentComponent)); //初始化props，slots以及设置组件状态
        setupComponent(instance);
        // 获取vnode树，并且递归调用patch方法处理vnode树
        setupRenderEffect(instance, initialVNode, container, anchor);
    }
    function setupRenderEffect(instance, initialVNode, container, anchor) {
        instance.update = effect(() => {
            if (!instance.isMounted) {
                console.log("init");
                const { proxy } = instance;
                const subTree = (instance.subTree = instance.render.call(proxy, proxy));
                patch(null, subTree, container, instance, anchor);
                initialVNode.el = subTree.el;
                instance.isMounted = true;
            }
            else {
                console.log("update");
                const { next, vnode } = instance;
                if (next) {
                    next.el = vnode.el;
                    updateComponentPreRender(instance, next);
                }
                const { proxy } = instance;
                const subTree = instance.render.call(proxy, proxy);
                const prevSubTree = instance.subTree;
                instance.subTree = subTree;
                patch(prevSubTree, subTree, container, instance, anchor);
            }
        }, {
            scheduler() {
                queueJobs(instance.update);
            }
        });
    }
    return {
        createApp: createAppAPI(render)
    };
}
function updateComponentPreRender(instance, nextVnode) {
    instance.vnode = nextVnode;
    instance.next = null;
    instance.props = nextVnode.props;
}
function getSequence(arr) {
    const p = arr.slice();
    const result = [0];
    let i, j, u, v, c;
    const len = arr.length;
    for (i = 0; i < len; i++) {
        const arrI = arr[i];
        if (arrI !== 0) {
            j = result[result.length - 1];
            if (arr[j] < arrI) {
                p[i] = j;
                result.push(i);
                continue;
            }
            u = 0;
            v = result.length - 1;
            while (u < v) {
                c = (u + v) >> 1;
                if (arr[result[c]] < arrI) {
                    u = c + 1;
                }
                else {
                    v = c;
                }
            }
            if (arrI < arr[result[u]]) {
                if (u > 0) {
                    p[i] = result[u - 1];
                }
                result[u] = i;
            }
        }
    }
    u = result.length;
    v = result[u - 1];
    while (u-- > 0) {
        result[u] = v;
        v = p[v];
    }
    return result;
}

function h(type, props = {}, children = []) {
    return createVNode(type, props, children);
}

function renderSlots(slots, name, props) {
    const slot = slots[name];
    if (slot) {
        if (typeof slot === "function") {
            return createVNode(Fragment, {}, slot(props));
        }
    }
}

function inject(key, defaultValue) {
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        const parentProvides = currentInstance.parent.provides;
        if (key in parentProvides) {
            return parentProvides[key];
        }
        else if (defaultValue) {
            if (typeof defaultValue === 'function') {
                return defaultValue();
            }
            return defaultValue;
        }
    }
}
function provide(key, value) {
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        let { provides } = currentInstance;
        const parentProvides = currentInstance.parent.provides;
        //第一次，初始化
        if (provides === parentProvides) {
            provides = currentInstance.provides = Object.create(parentProvides);
        }
        provides[key] = value;
    }
}

function createElement(type) {
    return document.createElement(type);
}
function patchProp(el, key, preval, nextVal) {
    const isOn = (key) => /^on[A-Z]/.test(key);
    //监听事件
    if (isOn(key)) {
        const event = key.slice(2).toLocaleLowerCase();
        el.addEventListener(event, nextVal);
    }
    else {
        //为空时移除原来属性
        if (nextVal === undefined || nextVal === null) {
            el.removeAttribute(key);
        }
        else {
            el.setAttribute(key, nextVal);
        }
    }
}
function insert(child, parent, anchor) {
    parent.insertBefore(child, anchor || null);
}
function remove(child) {
    const parent = child.parentNode;
    if (parent) {
        parent.removeChild(child);
    }
}
function setElementText(el, text) {
    el.textContent = text;
}
const renderer = createRenderer({
    createElement, patchProp, insert, remove, setElementText
});
function createApp(...args) {
    return renderer.createApp(...args);
}

var runtimeDom = /*#__PURE__*/Object.freeze({
    __proto__: null,
    createApp: createApp,
    h: h,
    renderSlots: renderSlots,
    createTextVNode: createTextVNode,
    createElementVNode: createVNode,
    getCurrentInstance: getCurrentInstance,
    registerRuntimeCompiler: registerRuntimeCompiler,
    provide: provide,
    inject: inject,
    createRenderer: createRenderer,
    nextTick: nextTick,
    toDisplayString: toDisplayString,
    ref: ref,
    proxyRefs: proxyRefs
});

const TO_DISPLAY_STRING = Symbol("toDisplayString");
const CREATE_ELEMENT_VNODE = Symbol("createElementVNode");
const helperMapName = {
    [TO_DISPLAY_STRING]: "toDisplayString",
    [CREATE_ELEMENT_VNODE]: "createElementVNode",
};

function generate(ast) {
    const context = createCodegenContext();
    const { push } = context;
    genFunctionPreamble(ast, context);
    const functionName = "render";
    const args = ["_ctx", "_cache"];
    const signature = args.join(", ");
    push(`function ${functionName}(${signature}){`);
    push("return ");
    //返回的函数主体
    genNode(ast.codegenNode, context);
    push("}");
    console.log(context.code);
    return {
        code: context.code,
    };
}
function genNode(node, context) {
    switch (node.type) {
        case 3 /* TEXT */:
            genText(node, context);
            break;
        case 0 /* INTERPOLATION */:
            genInterpolation(node, context);
            break;
        case 1 /* SIMPLE_EXPRESSION */:
            genExpression(node, context);
            break;
        case 2 /* ELEMENT */:
            genElement(node, context);
            break;
        case 5 /* COMPOUND_EXPRESSION */:
            genCompoundExpression(node, context);
            break;
    }
}
function genCompoundExpression(node, context) {
    const { push } = context;
    const children = node.children;
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (isString(child)) {
            push(child);
        }
        else {
            genNode(child, context);
        }
    }
}
function genElement(node, context) {
    const { push, helper } = context;
    const { tag, children, props } = node;
    push(`${helper(CREATE_ELEMENT_VNODE)}(`);
    genNodeList(genNullable([tag, props, children]), context);
    push(")");
}
function genNodeList(nodes, context) {
    const { push } = context;
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (isString(node)) {
            push(node);
        }
        else {
            genNode(node, context);
        }
        if (i < nodes.length - 1) {
            push(", ");
        }
    }
}
function genNullable(args) {
    return args.map((arg) => arg || "null");
}
function genExpression(node, context) {
    const { push } = context;
    push(`${node.content}`);
}
function genInterpolation(node, context) {
    const { push, helper } = context;
    push(`${helper(TO_DISPLAY_STRING)}(`);
    genNode(node.content, context);
    push(")");
}
function genText(node, context) {
    const { push } = context;
    push(`'${node.content}'`);
}
function createCodegenContext() {
    const context = {
        code: "",
        push(source) {
            context.code += source;
        },
        helper(key) {
            return `_${helperMapName[key]}`;
        }
    };
    return context;
}
function genFunctionPreamble(ast, context) {
    const { push } = context;
    const VueBinging = "Vue";
    const aliasHelper = (s) => `${helperMapName[s]}:_${helperMapName[s]}`;
    if (ast.helpers.length > 0) {
        push(`const { ${ast.helpers.map(aliasHelper).join(", ")} } = ${VueBinging}`);
    }
    push("\n");
    push("return ");
}

function baseParse(content) {
    const context = createParserContext(content);
    return createRoot(parseChildren(context, []));
}
function parseElement(context, ancestors) {
    const element = parseTag(context, 0 /* Start */);
    ancestors.push(element);
    element.children = parseChildren(context, ancestors);
    ancestors.pop();
    if (startsWithEndTagOpen(context.source, element.tag)) {
        parseTag(context, 1 /* End */);
    }
    else {
        throw new Error(`缺少结束标签:${element.tag}`);
    }
    return element;
}
function parseTag(context, type) {
    // <div></div>
    const match = /^<\/?([a-z]*)/i.exec(context.source);
    const tag = match[1];
    advanceBy(context, match[0].length);
    advanceBy(context, 1);
    if (type === 1 /* End */)
        return;
    return {
        type: 2 /* ELEMENT */,
        tag,
    };
}
function parseInterpolation(context) {
    // {{message}}
    const openDelimiter = "{{";
    const closeDelimiter = "}}";
    const closeIndex = context.source.indexOf(closeDelimiter, openDelimiter.length);
    advanceBy(context, openDelimiter.length);
    const rawContentLength = closeIndex - openDelimiter.length;
    const rawContent = parseTextData(context, rawContentLength);
    const content = rawContent.trim();
    advanceBy(context, closeDelimiter.length);
    return {
        type: 0 /* INTERPOLATION */,
        content: {
            type: 1 /* SIMPLE_EXPRESSION */,
            content: content,
        },
    };
}
function parseText(context) {
    let endIndex = context.source.length;
    let endTokens = ["<", "{{"];
    //找到离得最近的结束标签
    for (let i = 0; i < endTokens.length; i++) {
        const index = context.source.indexOf(endTokens[i]);
        if (index !== -1 && endIndex > index) {
            endIndex = index;
        }
    }
    const content = parseTextData(context, endIndex);
    return {
        type: 3 /* TEXT */,
        content
    };
}
function parseTextData(context, length) {
    const content = context.source.slice(0, length);
    // 2. 推进
    advanceBy(context, length);
    return content;
}
//消费掉已经使用过的字符
function advanceBy(context, length) {
    context.source = context.source.slice(length);
}
function createParserContext(content) {
    return {
        source: content,
    };
}
function createRoot(children) {
    return {
        children,
        type: 4 /* ROOT */
    };
}
function parseChildren(context, ancestors) {
    const nodes = [];
    while (!isEnd(context, ancestors)) {
        let node;
        const s = context.source;
        if (s.startsWith("{{")) {
            node = parseInterpolation(context);
        }
        else if (s[0] === "<") {
            if (/[a-z]/i.test(s[1])) {
                node = parseElement(context, ancestors);
            }
        }
        if (!node)
            node = parseText(context);
        nodes.push(node);
    }
    return nodes;
}
function isEnd(context, ancestors) {
    const s = context.source;
    if (s.startsWith("</")) {
        for (let i = ancestors.length - 1; i >= 0; i--) {
            const tag = ancestors[i].tag;
            if (startsWithEndTagOpen(s, tag)) {
                return true;
            }
        }
    }
    return !s;
}
function startsWithEndTagOpen(source, tag) {
    return (source.startsWith("</") &&
        source.slice(2, 2 + tag.length).toLowerCase() === tag.toLowerCase());
}

function transform(root, options = {}) {
    const context = createTransformContext(root, options);
    traverseNode(root, context);
    createRootCodegen(root);
    root.helpers = [...context.helpers.keys()];
}
function createTransformContext(root, options) {
    const context = {
        root,
        nodeTransforms: options.nodeTransforms || [],
        helpers: new Map(),
        helper(key) {
            context.helpers.set(key, 1);
        },
    };
    return context;
}
//深度遍历
function traverseNode(node, context) {
    const nodeTransforms = context.nodeTransforms;
    //从叶子节点返回再调用处理函数
    const exitFns = [];
    for (const transform of nodeTransforms) {
        transform(node);
        const onExit = transform(node, context);
        if (onExit)
            exitFns.push(onExit);
    }
    switch (node.type) {
        case 0 /* INTERPOLATION */:
            context.helper(TO_DISPLAY_STRING);
            break;
        case 4 /* ROOT */:
        case 2 /* ELEMENT */:
            traverseChildren(node, context);
            break;
    }
    let i = exitFns.length;
    while (i--) {
        exitFns[i]();
    }
}
function traverseChildren(node, context) {
    const children = node.children;
    for (const child of children) {
        traverseNode(child, context);
    }
}
function createRootCodegen(root) {
    const child = root.children[0];
    if (child.type === 2 /* ELEMENT */) {
        root.codegenNode = child.codegenNode;
    }
    else {
        root.codegenNode = root.children[0];
    }
}

function createVNodeCall(context, tag, props, children) {
    context.helper(CREATE_ELEMENT_VNODE);
    return {
        type: 2 /* ELEMENT */,
        tag,
        props,
        children,
    };
}

function transformElement(node, context) {
    if (node.type === 2 /* ELEMENT */) {
        return () => {
            // tag
            const vnodeTag = `'${node.tag}'`;
            // props
            let vnodeProps;
            // children
            const children = node.children;
            let vnodeChildren = children[0];
            node.codegenNode = createVNodeCall(context, vnodeTag, vnodeProps, vnodeChildren);
        };
    }
}

function transformExpression(node) {
    if (node.type === 0 /* INTERPOLATION */) {
        return () => {
            node.content = processExpression(node.content);
        };
    }
}
function processExpression(node) {
    console.log(node, node.content);
    node.content = `_ctx.${node.content}`;
    console.log('node---', node);
    return node;
}

function isText(node) {
    return (node.type === 3 /* TEXT */ || node.type === 0 /* INTERPOLATION */);
}

function transformText(node) {
    if (node.type === 2 /* ELEMENT */) {
        return () => {
            const { children } = node;
            let currentContainer;
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                if (isText(child)) {
                    for (let j = i + 1; j < children.length; j++) {
                        const next = children[j];
                        if (isText(next)) {
                            if (!currentContainer) {
                                currentContainer = children[i] = {
                                    type: 5 /* COMPOUND_EXPRESSION */,
                                    children: [child],
                                };
                            }
                            currentContainer.children.push(" + ");
                            currentContainer.children.push(next);
                            children.splice(j, 1);
                            j--;
                        }
                        else {
                            currentContainer = undefined;
                            break;
                        }
                    }
                }
            }
        };
    }
}

function baseCompile(template) {
    const ast = baseParse(template);
    transform(ast, {
        nodeTransforms: [transformExpression, transformElement, transformText],
    });
    return generate(ast);
}

// mini-vue 出口
function compileToFunction(template) {
    const { code } = baseCompile(template);
    const render = new Function("Vue", code)(runtimeDom);
    console.log(render);
    return render;
}
registerRuntimeCompiler(compileToFunction);

exports.createApp = createApp;
exports.createElementVNode = createVNode;
exports.createRenderer = createRenderer;
exports.createTextVNode = createTextVNode;
exports.getCurrentInstance = getCurrentInstance;
exports.h = h;
exports.inject = inject;
exports.nextTick = nextTick;
exports.provide = provide;
exports.proxyRefs = proxyRefs;
exports.ref = ref;
exports.registerRuntimeCompiler = registerRuntimeCompiler;
exports.renderSlots = renderSlots;
exports.toDisplayString = toDisplayString;

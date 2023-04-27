import { isArray, isObeject, isString } from "../share"
import { createComponentInstance, setupComponent } from "./component"
import { ShapeFlags } from "../share/ShapeFlags"
import { Fragment, Text } from "./vnode"
import { createAppAPI } from "./createApp";
import { effect } from "../reactivity/effect";
import { EMPTY_OBJ } from "../share";
import { shouldUpdateComponent } from "./componentUpdateUtils";
import { queueJobs } from "./scheduler";


export function createRenderer(options) {
    const {
        createElement: hostCreateElement,
        patchProp: hostPatchProp,
        insert: hostInsert,
        remove: hostRemove,
        setElementText: hostSetElementText
    } = options;
    function render(vnode, container) {
        patch(null, vnode, container, null, null)
    }


    function patch(n1, n2, container, parentComponent, anchor) {
        const { shapeFlag, type } = n2

        switch (type) {
            case Fragment:
                processFragment(n1, n2, container, parentComponent, anchor);
                break
            case Text:
                processText(n1, n2, container);
                break
            default:
                if (shapeFlag & ShapeFlags.ELEMENT) {
                    // 处理element
                    processElement(n1, n2, container, parentComponent, anchor)
                } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
                    processComponent(n1, n2, container, parentComponent, anchor)
                }
                break
        }

    }

    function processFragment(n1, n2, container, parentComponent, anchor) {
        mountChildren(n2.children, container, parentComponent, anchor)

    }
    function processText(n1, n2, container) {
        const { children } = n2
        const textNode = (n2.el = document.createTextNode(children))
        container.append(textNode)
    }
    function patchElement(n1, n2, container, parentComponent, anchor) {
        console.log("patch element");
        // 更新props
        const oldProps = n1.props || EMPTY_OBJ
        const newProps = n2.props || EMPTY_OBJ
        const el = (n2.el = n1.el)
        patchChildren(n1, n2, el, parentComponent, anchor)
        patchProps(el, oldProps, newProps)


    }
    function patchChildren(n1, n2, container, parentComponent, anchor) {
        //text > text
        // text > Array
        // Array to Text
        // Array to Array
        const prevShapeFlag = n1.shapeFlag
        const c1 = n1.children
        const { shapeFlag } = n2
        const c2 = n2.children
        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            // Array to Text
            if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                unmountChildren(n1.children)
            }
            // Text to Text
            if (c1 !== c2) {
                hostSetElementText(container, c2)
            }
        } else {
            // Text to Array
            if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
                // 清空文本
                hostSetElementText(container, "")
                // 挂载子节点
                mountChildren(c2, container, parentComponent, anchor)
            } else {
                //TODO Array to Array
                console.log("array to array");
                patchKeyedChildren(c1, c2, container, parentComponent, anchor)

            }
        }

    }
    function patchKeyedChildren(c1, c2, container, parentComponent, parentAnchor) {

        function isSameVNodeType(n1, n2) {
            return n1.type === n2.type && n1.key === n2.key
        }
        const l2 = c2.length
        let i = 0
        let e1 = c1.length - 1
        let e2 = l2 - 1

        // 左右预处理，减小中间diff算法的n

        // 处理左边
        while (i <= e1 && i <= e2) {
            const n1 = c1[i]
            const n2 = c2[i]
            if (isSameVNodeType(n1, n2)) {
                patch(n1, n2, container, parentComponent, parentAnchor)
            } else {
                break
            }
            i++

        }
        //处理右边
        while (i <= e1 && i <= e2) {
            const n1 = c1[e1]
            const n2 = c2[e2]
            if (isSameVNodeType(n1, n2)) {
                patch(n1, n2, container, parentComponent, parentAnchor)
            } else {
                break
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
                const nextPos = e2 + 1
                const anchor = nextPos < l2 ? c2[nextPos].e1 : null
                // 注意这里得用while循环，因为有可能不止一个
                while (i <= e2) {
                    patch(null, c2[i], container, parentComponent, anchor)
                    i++
                }
            }
        } else if (i > e2) {
            // 旧的比新的长
            // ["a","b","c"]
            // ["a","b"]
            while (i <= e1) {
                hostRemove(c1[i].el);
                i++;
            }
        } else {
            //TODO中间对比
            // a,b,(c,e,d),f,g
            // a,b,(e,c),f,g

            //TODO
            // 实现中间对比部分中的移动结点
            // 需要判断是否需要移动

            let s1 = i
            let s2 = i

            //新结点数组中需要被patch的数量
            const toBePatched = e2 - s2 + 1
            let patched = 0

            const newIndexToOldIndexMap = new Array(toBePatched);
            newIndexToOldIndexMap.fill(0)
            // 用来标记是否需要移动中间结点，避免不需要的时候还求最长递增子序列，影响性能
            let moved = false
            // 用来存储当前最大索引，方便判断是否需要移动结点
            let maxNewIndexSoFar = 0;

            const keyToNewIndexMap = new Map()
            // 遍历需要处理的新子节点数组，建立以key为键以索引为值的键值对
            for (let i = s2; i <= e2; i++) {
                const nextChild = c2[i]
                keyToNewIndexMap.set(nextChild.key, i)
            }
            for (let i = s1; i <= e1; i++) {
                const prevChild = c1[i]
                // 如果已经处理的结点数大于等于需要处理的结点数说明剩下的结点是多余的给删除了
                if (patched >= toBePatched) {
                    hostRemove(prevChild.el)
                    continue
                }

                let newIndex;
                if (prevChild.key != null) {
                    newIndex = keyToNewIndexMap.get(prevChild.key)
                } else {
                    // 如果没有key那只好去遍历新结点数组
                    for (let j = s2; j < e2; j++) {
                        if (isSameVNodeType(prevChild, c2[j])) {
                            newIndex = j
                            break
                        }
                    }
                }
                //说明这个旧结点在新结点数组里面是不存在的
                if (newIndex === undefined) {
                    hostRemove(prevChild.el)
                } else {

                    if (newIndex >= maxNewIndexSoFar) {
                        // 符合索引递增，说明不用移动结点
                        maxNewIndexSoFar = newIndex
                    } else {
                        moved = true
                    }
                    //通过+1避免了跟为0的情况冲突
                    newIndexToOldIndexMap[newIndex - s2] = i + 1
                    patch(prevChild, c2[newIndex], container, parentComponent, null)
                    patched++
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
            let j = increasingNewIndexSequence.length - 1
            for (let i = toBePatched - 1; i >= 0; i--) {
                const nextIndex = i + s2
                const nextChild = c2[nextIndex]
                const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : null
                //说明旧结点中没有这个结点需要挂载个新的
                if (newIndexToOldIndexMap[i] === 0) {
                    patch(null, nextChild, container, parentComponent, anchor)
                    console.log(anchor, nextChild);

                } else if (moved) { //需要移动的情况
                    if (j < 0 || i !== increasingNewIndexSequence[j]) {
                        hostInsert(nextChild.el, container, anchor);
                    } else {
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
                const prevProp = oldProps[key]
                const nextProp = newProps[key]
                if (prevProp !== nextProp) {
                    hostPatchProp(el, key, prevProp, nextProp)
                }
            }
            // 对每个新值的为空的属性进行卸载
            if (oldProps !== EMPTY_OBJ) {
                for (const key in oldProps) {
                    if (!(key in newProps)) {
                        hostPatchProp(el, key, oldProps[key], null)
                    }
                }
            }
        }
    }
    function processElement(n1, n2, container, parentComponent, anchor) {
        //如果还没挂载过
        if (!n1) {
            mountElement(n2, container, parentComponent, anchor)
        } else {
            patchElement(n1, n2, container, parentComponent, anchor)
        }

    }
    function mountElement(vnode, container, parentComponent, anchor) {
        //创建真实节点
        const el = (vnode.el = hostCreateElement(vnode.type))
        const { children, shapeFlag } = vnode
        // 处理儿子节点
        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            el.textContent = children
        } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            mountChildren(vnode.children, el, parentComponent, anchor)
        }
        // 处理props
        const { props } = vnode
        for (const key in props) {
            const val = props[key]
            hostPatchProp(el, key, null, val)
        }
        hostInsert(el, container, anchor)
    }

    function mountChildren(children, container, parentComponent, anchor) {
        children.forEach(v => {
            patch(null, v, container, parentComponent, anchor)
        });
    }



    function processComponent(n1, n2, container, parentComponent, anchor) {
        //判断是要更新组件还是要重新挂载组件
        if (!n1) {
            mountComponent(n2, container, parentComponent, anchor)
        } else {
            updateComponent(n1, n2)
        }
    }

    function updateComponent(n1, n2) {
        const instance = (n2.component = n1.component)
        //判断是否需要更新
        if (shouldUpdateComponent(n1, n2)) {
            // 将新的虚拟节点挂载到实例上
            instance.next = n2
            // 调用组件实例的更新
            instance.update()
        } else {
            n2.el = n1.el
            instance.vnode = n2
        }

    }
    function mountComponent(initialVNode, container, parentComponent, anchor) {
        //创建组件实例,并挂载到虚拟dom的component对象上
        const instance = (initialVNode.component = createComponentInstance(initialVNode, parentComponent))       //初始化props，slots以及设置组件状态
        setupComponent(instance)
        // 获取vnode树，并且递归调用patch方法处理vnode树
        setupRenderEffect(instance, initialVNode, container, anchor)
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
            } else {
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
                queueJobs(instance.update)
            }
        });
    }
    return {
        createApp: createAppAPI(render)
    }
}

function updateComponentPreRender(instance, nextVnode) {
    instance.vnode = nextVnode
    instance.next = null
    instance.props = nextVnode.props
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
                } else {
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

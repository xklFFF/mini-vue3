import { isArray, isObeject, isString } from "../share"
import { createComponentInstance, setupComponent } from "./component"
import { ShapeFlags } from "../share/ShapeFlags"
import { Fragment, Text } from "./vnode"
import { createAppAPI } from "./createApp";
import { effect } from "../reactivity/effect";
import { EMPTY_OBJ } from "../share";


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
        hostInsert(el, container)
    }

    function mountChildren(children, container, parentComponent, anchor) {
        children.forEach(v => {
            patch(null, v, container, parentComponent, anchor)
        });
    }



    function processComponent(n1, n2, container, parentComponent, anchor) {
        mountComponent(n2, container, parentComponent, anchor)
    }

    function mountComponent(initialVNode, container, parentComponent, anchor) {
        //创建组件实例
        const instance = createComponentInstance(initialVNode, parentComponent)
        //初始化props，slots以及设置组件状态
        setupComponent(instance)
        // 获取vnode树，并且递归调用patch方法处理vnode树
        setupRenderEffect(instance, initialVNode, container, anchor)
    }

    function setupRenderEffect(instance, initialVNode, container, anchor) {
        effect(() => {
            if (!instance.isMounted) {
                console.log("init");
                const { proxy } = instance;
                const subTree = (instance.subTree = instance.render.call(proxy));

                patch(null, subTree, container, instance, anchor);

                initialVNode.el = subTree.el;

                instance.isMounted = true;
            } else {
                console.log("update");
                const { proxy } = instance;
                const subTree = instance.render.call(proxy);
                const prevSubTree = instance.subTree;
                instance.subTree = subTree;

                patch(prevSubTree, subTree, container, instance, anchor);
            }
        });
    }
    return {
        createApp: createAppAPI(render)
    }
}




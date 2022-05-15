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
        patch(null, vnode, container, null)
    }


    function patch(n1, n2, container, parentComponent) {
        const { shapeFlag, type } = n2

        switch (type) {
            case Fragment:
                processFragment(n1, n2, container, parentComponent);
                break
            case Text:
                processText(n1, n2, container);
                break
            default:
                if (shapeFlag & ShapeFlags.ELEMENT) {
                    // 处理element
                    processElement(n1, n2, container, parentComponent)
                } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
                    processComponent(n1, n2, container, parentComponent)
                }
                break
        }

    }

    function processFragment(n1, n2, container, parentComponent) {
        mountChildren(n2.children, container, parentComponent)

    }
    function processText(n1, n2, container) {
        const { children } = n2
        const textNode = (n2.el = document.createTextNode(children))
        container.append(textNode)
    }
    function patchElement(n1, n2, container, parentComponent) {
        console.log("patch element");
        // 更新props
        const oldProps = n1.props || EMPTY_OBJ
        const newProps = n2.props || EMPTY_OBJ
        const el = (n2.el = n1.el)
        patchChildren(n1, n2, el, parentComponent)
        patchProps(el, oldProps, newProps)


    }
    function patchChildren(n1, n2, container, parentComponent) {
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
            if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN){
                // 清空文本
                hostSetElementText(container,"")
                // 挂载子节点
                mountChildren(c2,container,parentComponent)
            }else{
                //TODO Array to Array
                console.log("array to array");
                
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
    function processElement(n1, n2, container, parentComponent) {
        //如果还没挂载过
        if (!n1) {
            mountElement(n2, container, parentComponent)
        } else {
            patchElement(n1, n2, container, parentComponent)
        }

    }
    function mountElement(vnode, container, parentComponent) {
        //创建真实节点
        const el = (vnode.el = hostCreateElement(vnode.type))
        const { children, shapeFlag } = vnode
        // 处理儿子节点
        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            el.textContent = children
        } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            mountChildren(vnode.children, el, parentComponent)
        }
        // 处理props
        const { props } = vnode
        for (const key in props) {
            const val = props[key]
            hostPatchProp(el, key, null, val)
        }
        hostInsert(el, container)
    }

    function mountChildren(children, container, parentComponent) {
        children.forEach(v => {
            patch(null, v, container, parentComponent)
        });
    }



    function processComponent(n1, n2, container, parentComponent) {
        mountComponent(n2, container, parentComponent)
    }

    function mountComponent(initialVNode, container, parentComponent) {
        //创建组件实例
        const instance = createComponentInstance(initialVNode, parentComponent)
        //初始化props，slots以及设置组件状态
        setupComponent(instance)
        // 获取vnode树，并且递归调用patch方法处理vnode树
        setupRenderEffect(instance, initialVNode, container)
    }

    function setupRenderEffect(instance, initialVNode, container) {
        effect(() => {
            if (!instance.isMounted) {
                console.log("init");
                const { proxy } = instance;
                const subTree = (instance.subTree = instance.render.call(proxy));

                patch(null, subTree, container, instance);

                initialVNode.el = subTree.el;

                instance.isMounted = true;
            } else {
                console.log("update");
                const { proxy } = instance;
                const subTree = instance.render.call(proxy);
                const prevSubTree = instance.subTree;
                instance.subTree = subTree;

                patch(prevSubTree, subTree, container, instance);
            }
        });
    }
    return {
        createApp: createAppAPI(render)
    }
}




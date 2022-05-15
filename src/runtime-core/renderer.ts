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
        mountChildren(n2, container, parentComponent)

    }
    function processText(n1, n2, container) {
        const { children } = n2
        const textNode = (n2.el = document.createTextNode(children))
        container.append(textNode)
    }
    function patchElement(n1, n2, container) {
        console.log("patch element");
        // 更新props
        const oldProps = n1.props || EMPTY_OBJ
        const newProps = n2.props || EMPTY_OBJ
        const el = (n2.el = n1.el)
        patchProps(el,oldProps,newProps)

    }
    function patchProps(el, oldProps, newProps) {
        if(oldProps!==newProps){
            //将每个新的属性进行patch
            for (const key in newProps) {
               const prevProp = oldProps[key]
               const nextProp = newProps[key]
               if(prevProp !== nextProp){
                   hostPatchProp(el,key,prevProp,nextProp)
               }
            }
            // 对每个新值的为空的属性进行卸载
            if(oldProps!==EMPTY_OBJ){
                for(const key in oldProps){
                    if(!(key in newProps)){
                        hostPatchProp(el,key,oldProps[key],null)
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
            patchElement(n1, n2, container)
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
            mountChildren(vnode, el, parentComponent)
        }
        // 处理props
        const { props } = vnode
        for (const key in props) {
            const val = props[key]
            hostPatchProp(el, key,null,val)
        }
        hostInsert(el, container)
    }

    function mountChildren(vnode, container, parentComponent) {
        vnode.children.forEach(v => {
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




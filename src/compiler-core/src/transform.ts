import { NodeTypes } from "./ast";
import { TO_DISPLAY_STRING } from "./runtimeHelpers";
export function transform(root, options = {}) {
    const context = createTransformContext(root, options)
    traverseNode(root, context)
    createRootCodegen(root)
    root.helpers = [...context.helpers.keys()];
}
function createTransformContext(root: any, options: any): any {
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
function traverseNode(node: any, context) {
    const nodeTransforms = context.nodeTransforms
    //从叶子节点返回再调用处理函数
    const exitFns: any = [];
    for (const transform of nodeTransforms) {
        transform(node)
        const onExit = transform(node, context)
        if (onExit) exitFns.push(onExit)
    }
    switch (node.type) {
        case NodeTypes.INTERPOLATION:
            context.helper(TO_DISPLAY_STRING);
            break;
        case NodeTypes.ROOT:
        case NodeTypes.ELEMENT:
            traverseChildren(node, context);
            break;

        default:
            break;
    }
    let i = exitFns.length;
    while (i--) {
        exitFns[i]();
    }
}
function traverseChildren(node: any, context: any) {
    const children = node.children
    for (const node of children) {
        traverseNode(node, context)
    }
}

function createRootCodegen(root: any) {
    const child = root.children[0];
    if (child.type === NodeTypes.ELEMENT) {
        root.codegenNode = child.codegenNode;
    } else {
        root.codegenNode = root.children[0];
    }
}


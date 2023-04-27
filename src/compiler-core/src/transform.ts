export function transform(root, options = {}) {
    const context = createTransformContext(root, options)
    traverseNode(root, context)
    createRootCodegen(root)
}
function createTransformContext(root: any, options: any): any {
    const context = {
        root,
        nodeTransforms: options.nodeTransforms || [],
    };

    return context;
}
//深度遍历
function traverseNode(node: any, context) {
    const nodeTransforms = context.nodeTransforms
    for (const transform of nodeTransforms) {
        transform(node)
    }
    traverseChildren(node, context)
}
function traverseChildren(node: any, context: any) {
    const children = node.children
    if (children) {
        for (const node of children) {
            traverseNode(node, context)
        }
    }
}

function createRootCodegen(root: any) {
    root.codegenNode = root.children[0]
}


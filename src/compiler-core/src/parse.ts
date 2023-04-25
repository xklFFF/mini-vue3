import { NodeTypes } from "./ast";
export function baseParse(content) {
    const context = createParserContext(content)
    return createRoot(parseChildren(context))
}
function parseInterpolation(context) {
    // {{message}}

    const openDelimiter = "{{";
    const closeDelimiter = "}}";

    const closeIndex = context.source.indexOf(
        closeDelimiter,
        openDelimiter.length
    );

    advanceBy(context, openDelimiter.length);

    const rawContentLength = closeIndex - openDelimiter.length;

    const rawContent = context.source.slice(0, rawContentLength);
    const content = rawContent.trim()

    advanceBy(context, rawContentLength + closeDelimiter.length);

    return {
        type: NodeTypes.INTERPOLATION,
        content: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: content,
        },
    };
}
//消费掉已经使用过的字符
function advanceBy(context: any, length: number) {
    context.source = context.source.slice(length);
}

function createParserContext(content: string): any {
    return {
        source: content,
    };
}
function createRoot(children) {
    return {
        children,
    };
}
function parseChildren(context) {
    const nodes: any = [];

    let node;
    if (context.source.startsWith("{{")) {
        node = parseInterpolation(context);
    }

    nodes.push(node);

    return nodes;
}
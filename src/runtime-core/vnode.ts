export function createVnode(type,props:any={},children:any=[]){
    return {
        type,
        props,
        children,
        // 用来存储虚拟节点渲染出来的真实节点
        el:null
    }
}
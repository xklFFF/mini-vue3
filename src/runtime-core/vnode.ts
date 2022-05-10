export function createVnode(type,props:any={},children:any=[]){
    return {
        type,
        props,
        children
    }
}
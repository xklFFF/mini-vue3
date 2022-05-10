import { createVnode } from "./vnode";

export function h(type, props: any = {}, children: any = []){
    return createVnode(type,props,children)
}
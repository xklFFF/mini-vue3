import { createRenderer } from "../runtime-core/renderer";

function createElement(type) {
    return document.createElement(type)
}

function patchProp(el, key, preval,nextVal) {
    const isOn = (key: string) => /^on[A-Z]/.test(key)
    //监听事件
    if (isOn(key)) {
        const event = key.slice(2).toLocaleLowerCase()
        el.addEventListener(event, nextVal)
    } else {
        //为空时移除原来属性
        if(nextVal === undefined || nextVal ===null){
            el.removeAttribute(key)
        }else{
        el.setAttribute(key, nextVal);

        }
    }
}
function insert(el, parent) {
    parent.append(el)
}

const renderer:any = createRenderer({
    createElement, patchProp, insert
})
export function createApp(...args) {
    return renderer.createApp(...args)
}

export * from "../runtime-core"
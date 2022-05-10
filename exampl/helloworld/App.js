import { h } from "../../lib/mini-vue.esm.js";

export const App = {
    render(){
        return h(
            "div",
            {
                id:"root",
                class:["red","bold"]
            },
            // [h("p", { class:"red"}, "hi"), h("p", {class:"blue"}, "mini-vue")]
            `${this.greet},${this.msg}`
        )
    },
    setup() {
        return {
            msg : "mini-vue",
            greet:'hi nihao'
        }
    }
}
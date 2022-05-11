import { h } from "../../lib/mini-vue.esm.js";
import { Foo } from "./Foo.js";

export const App = {
    render(){
        return h(
            "div",
            {
                id: "root",
                class: ["red", "hard"],
                onClick() {
                  console.log("click");
                },
                onMousedown(){
                  console.log("mousedown")
                }
              },
            // [, h("p", {class:"blue"}, "mini-vue")]
            // `${this.greet},${this.msg}`
            [h("p", { class:"red"}, "hi"),h(Foo,{count:1})]
        )
    },
    setup() {
        return {
            msg : "mini-vue",
            greet:'hi nihao'
        }
    }
}
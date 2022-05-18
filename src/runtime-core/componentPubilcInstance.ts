import { hasOwn } from "../share";

const publicPropertiesMap = {
    $el: (i) => i.vnode.el,
    $slots: (i) => i.slots,
    $props: (i) => i.props,
  };



  export const PublicInstanceProxyHandlers = {
      get ({_:instance},key){
          const {setupState,props} = instance
          if(key in setupState){
              return setupState[key]
          }else if(hasOwn(props,key)){
              return props[key]
          }
          const pubicGetter = publicPropertiesMap[key]
          if(pubicGetter){
              return pubicGetter(instance)
          }
      }
  }
const publicPropertiesMap = {
    $el: (i) => i.vnode.el,
  };



  export const PublicInstanceProxyHandlers = {
      get ({_:instance},key){
          const {setupState} = instance
          if(key in setupState){
              return setupState[key]
          }
          const pubicGetter = publicPropertiesMap[key]
          if(pubicGetter){
              return pubicGetter(instance)
          }
      }
  }
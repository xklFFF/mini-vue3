let targetMap=new Map()
let activeEffect
class ReactiveEffect {
    private _fn:any
    constructor(fn) {
        this._fn = fn
    }
    run(){
        activeEffect=this
        this._fn()
    }
}
export function track(target,key){
    //获取当前对象target对应的缓存map'
    let depsMap=targetMap.get(target)
    if(!depsMap){
        depsMap=new Map()
        targetMap.set(target,depsMap)
    }
    //获取对应属性key的依赖set集合
    let dep=depsMap.get(key)
    if(!dep){
        dep=new Set()
        depsMap.set(key,dep)
    }
    dep.add(activeEffect)
    
}

export function trigger(target,key){
      //获取当前对象target对应的缓存map'
      let depsMap=targetMap.get(target)
        //获取对应属性key的依赖set集合
        let dep=depsMap.get(key)
        //将所有依赖函数取出并且执行
        for(const effect of dep){
            effect.run()
        }
}


export function effect(fn){
    const _effect=new ReactiveEffect(fn)
    _effect.run()

}


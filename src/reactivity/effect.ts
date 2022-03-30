let targetMap=new Map()
let activeEffect
class ReactiveEffect {
    private _fn:any
    public scheduler:Function|undefined
    constructor(fn,scheduler?:Function) {
        this._fn = fn
        this.scheduler=scheduler

    }
    run(){
        activeEffect=this
        // 返回执行结果
        return this._fn()
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
            if(effect.scheduler){
                effect.scheduler()
            }else{
                effect.run()
            }
        }
}

type effectOptions = {
    scheduler?: Function
}
export function effect(fn,options:effectOptions={}){
    const _effect=new ReactiveEffect(fn,options.scheduler)
    _effect.run()
    //需绑定执行上下文
    const runner = _effect.run.bind(_effect)
    return runner

}


const queue: any[] = []
const activePreFlushCbs: any[] = [];
const activePostFlushCbs:any[] = []
let p = Promise.resolve()

export function nextTick(fn?) {
    return fn ? p.then(fn) : p
}
export function queueJob(job) {
    if (!queue.includes(job)) {
        queue.push(job)
    }
    //刷新队列
    queueFlush()
}
let isPending = false
function queueFlush() {
    //队列已经正在刷新中
    if (isPending) return
    isPending = true
    nextTick(flushJobs);
}
export function flushJobs() {

    isPending = false
    flushPreFlushCbs()
    let job;
    while ((job = queue.shift())) {
        job && job();
    }
    flushPostFlushCbs()
}
  
export function queuePreFlushCb(job) {
    activePreFlushCbs.push(job);
  
    queueFlush();
  }
export function flushPreFlushCbs() {
    for (let i = 0; i < activePreFlushCbs.length; i++) {
        activePreFlushCbs[i]&&activePreFlushCbs[i]();
    }
    activePreFlushCbs.length = 0
  }
  export function queuePostFlushCb(job){
    activePostFlushCbs.push(job);
    queueFlush();
}
export function flushPostFlushCbs() {
    for (let i = 0; i < activePostFlushCbs.length; i++) {
        activePostFlushCbs[i]&&activePostFlushCbs[i]();
    }
    activePostFlushCbs.length = 0
  }

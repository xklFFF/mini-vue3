const queue: any[] = []
let p = Promise.resolve()

export function nextTick(fn) {
    return fn ? p.then(fn) : p
}
export function queueJobs(job) {
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
function flushJobs() {

    isPending = false
    let job;
    while ((job = queue.shift())) {
        job && job();
    }
}

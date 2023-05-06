import { watchEffect, watch } from './../apiWatch';
import { reactive } from "../../reactivity/reactive"
// import { nextTick } from 'vue';
import { ref } from '../../reactivity';
import { vi } from 'vitest';
import { nextTick } from '../scheduler';
import { queueJob } from '../scheduler';

describe('api watch', () => {
  it('effect', async () => {
    const state = reactive({ count: 0 })
    let dummy
    watchEffect(() => {
      dummy = state.count
    })
    expect(dummy).toBe(0)
    state.count++
    await nextTick();
    expect(dummy).toBe(1)
  })
  it('watching single source: getter', async () => {
    const state = reactive({ count: 0 })
    let dummy
    watch(
      () => state.count,
      (count, prevCount) => {
        dummy = [count, prevCount]
        // assert types
        count + 1
        if (prevCount) {
          prevCount + 1
        }
      }
    )
    state.count++
    await nextTick()
    expect(dummy).toMatchObject([1, 0])
  })
  it('watching reactive object', async () => {
    const state = reactive({ count: 0 })
    let dummy
    watch(
      state,
      (count, prevCount) => {
        dummy = state.count
        // assert types
        count + 1
        if (prevCount) {
          prevCount + 1
        }
      }
    )
    state.count++
    await nextTick()
    expect(dummy).toBe(1)
  })
  it("watch ref value", async () => {
    const state = ref(0)
    let dummy
    watch(
      state,
      (count, prevCount) => {
        dummy = state.value
        // assert types
        count + 1
        if (prevCount) {
          prevCount + 1
        }
      }
    )
    state.value++
    await nextTick()
    expect(dummy).toBe(1)
  })
  it("stopping the watcher (effect)", async () => {
    const state = reactive({ count: 0 });
    let dummy;
    const stop: any = watchEffect(() => {
      dummy = state.count;
    });
    expect(dummy).toBe(0);

    stop();
    state.count++;
    await nextTick();
    // should not update
    expect(dummy).toBe(0);
  });

  it("cleanup registration (effect)", async () => {
    const state = reactive({ count: 0 });
    const cleanup = vi.fn();
    let dummy;
    const stop: any = watchEffect((onCleanup) => {
      onCleanup(cleanup);
      dummy = state.count;
    });
    expect(dummy).toBe(0);

    state.count++;
    await nextTick();
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(dummy).toBe(1);

    stop();
    expect(cleanup).toHaveBeenCalledTimes(2);
  });
  it('flush timing: post', async () => {
    const calls: string[] = []
    const cb1 = () => {
      calls.push('cb1')
    }
    const cb2 = () => {
      calls.push('cb2')
    }
    const count = reactive({ val: 1 })
    watch(() => count.val, cb1, { flush: 'post' })
    count.val++
    queueJob(cb2)
    expect(calls).toEqual([])
    await nextTick()
    expect(calls).toEqual(['cb2', 'cb1'])
  })
})
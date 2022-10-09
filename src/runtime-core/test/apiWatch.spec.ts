import { watchEffect,watch } from './../apiWatch';
import { reactive } from "../../reactivity/reactive"
import { nextTick } from 'vue';
import { ref } from '../../reactivity';

describe('api watch',()=>{
    it('effect',async ()=>{
        const state = reactive({count:0})
        let dummy 
        watchEffect(()=>{
            dummy = state.count
        })
        expect(dummy).toBe(0)
        state.count++
        await nextTick()
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
      it('watching reactive object',async ()=>{
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
      it("watch ref value",async ()=>{
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
      it("clean outTime watch effect",async ()=>{
        const count = ref(0)
        const cleanup = jest.fn()
        let dummy
        const stop = watch(count, (count, prevCount, onCleanup) => {
          onCleanup!(cleanup)
          dummy = count
        })
    
        count.value++
        await nextTick()
        expect(cleanup).toHaveBeenCalledTimes(0)
        expect(dummy).toBe(1)
    
        count.value++
        await nextTick()
        expect(cleanup).toHaveBeenCalledTimes(1)
        expect(dummy).toBe(2)
      })
})
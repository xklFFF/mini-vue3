import { effect } from "../../effect"
import { isReactive, reactive } from "../../reactive"

describe('reactivity/collections', () => {

    describe('Set', () => {
        it('instanceof', () => {
            const original = new Set()
            const observed = reactive(original)
            expect(isReactive(observed)).toBe(true)
            expect(original instanceof Set).toBe(true)
            expect(observed instanceof Set).toBe(true)
        })

        it('should observe mutations', () => {
            let dummy
            const set = reactive(new Set())
            effect(() => (dummy = set.has('value')))

            expect(dummy).toBe(false)
            set.add('value')
            expect(dummy).toBe(true)
            set.delete('value')
            expect(dummy).toBe(false)
        })

        it('should observe mutations with observed value', () => {
            let dummy
            const value = reactive({})
            const set = reactive(new Set())
            effect(() => (dummy = set.has(value)))

            expect(dummy).toBe(false)
            set.add(value)
            expect(dummy).toBe(true)
            set.delete(value)
            expect(dummy).toBe(false)
        })

        it('should observe size mutations', () => {
            let dummy
            const set = reactive(new Set())
            effect(() => (dummy = set.size))
      
            expect(dummy).toBe(0)
            set.add('value')
            set.add('value2')
            expect(dummy).toBe(2)
            set.delete('value')
            expect(dummy).toBe(1)
            set.clear()
            expect(dummy).toBe(0)
          })

          
    it('should be triggered by clearing', () => {
        let dummy
        const set = reactive(new Set())
        effect(() => (dummy = set.has('key')))
  
        expect(dummy).toBe(false)
        set.add('key')
        expect(dummy).toBe(true)
        set.clear()
        expect(dummy).toBe(false)
      })
  
      //遍历操作
  
      it('should observe forEach iteration', () => {
        let dummy: any
        const set = reactive(new Set())
        effect(() => {
          dummy = 0
          set.forEach(num => (dummy += num))
        })
  
        expect(dummy).toBe(0)
        set.add(2)
        set.add(1)
        expect(dummy).toBe(3)
        set.delete(2)
        expect(dummy).toBe(1)
        set.clear()
        expect(dummy).toBe(0)
      })

      it('should observe for of iteration', () => {
        let dummy
        const set = reactive(new Set() as Set<number>)
        effect(() => {
          dummy = 0
          for (let num of set) {
            dummy += num
          }
        })
  
        expect(dummy).toBe(0)
        set.add(2)
        set.add(1)
        expect(dummy).toBe(3)
        set.delete(2)
        expect(dummy).toBe(1)
        set.clear()
        expect(dummy).toBe(0)
      })

      it('should observe values iteration', () => {
        let dummy
        const set = reactive(new Set() as Set<number>)
        effect(() => {
          dummy = 0
          for (let num of set.values()) {
            dummy += num
          }
        })
  
        expect(dummy).toBe(0)
        set.add(2)
        set.add(1)
        expect(dummy).toBe(3)
        set.delete(2)
        expect(dummy).toBe(1)
        set.clear()
        expect(dummy).toBe(0)
      })
  
      it('should observe keys iteration', () => {
        let dummy
        const set = reactive(new Set() as Set<number>)
        effect(() => {
          dummy = 0
          for (let num of set.keys()) {
            dummy += num
          }
        })
  
        expect(dummy).toBe(0)
        set.add(2)
        set.add(1)
        expect(dummy).toBe(3)
        set.delete(2)
        expect(dummy).toBe(1)
        set.clear()
        expect(dummy).toBe(0)
      })
  
      it('should observe entries iteration', () => {
        let dummy
        const set = reactive(new Set<number>())
        effect(() => {
          dummy = 0
          // eslint-disable-next-line no-unused-vars
          for (let [key, num] of set.entries()) {
            key
            dummy += num
          }
        })
  
        expect(dummy).toBe(0)
        set.add(2)
        set.add(1)
        expect(dummy).toBe(3)
        set.delete(2)
        expect(dummy).toBe(1)
        set.clear()
        expect(dummy).toBe(0)
      })




    })

})
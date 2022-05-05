import { effect } from "../../effect"
import { isReactive, reactive } from "../../reactive"

describe('reactivity/collections', () => {
    describe('Map', () => {
        test('instanceof', () => {
            const original = new Map()
            const observed = reactive(original)
            expect(isReactive(observed)).toBe(true)
            expect(original instanceof Map).toBe(true)
            expect(observed instanceof Map).toBe(true)
        })

        it('should observe mutations', () => {
            let dummy
            const map = reactive(new Map())
            effect(() => {
                dummy = map.get('key')
            })

            expect(dummy).toBe(undefined)
            map.set('key', 'value')
            expect(dummy).toBe('value')
            map.set('key', 'value2')
            expect(dummy).toBe('value2')
            map.delete('key')
            expect(dummy).toBe(undefined)
        })

        it('should observe mutations with observed value as key', () => {
            let dummy
            const key = reactive({})
            const value = reactive({})
            const map = reactive(new Map())
            effect(() => {
                dummy = map.get(key)
            })

            expect(dummy).toBe(undefined)
            map.set(key, value)
            expect(dummy).toBe(value)
            map.delete(key)
            expect(dummy).toBe(undefined)
        })

        it('should observe size mutations', () => {
            let dummy
            const map = reactive(new Map())
            effect(() => (dummy = map.size))

            expect(dummy).toBe(0)
            map.set('key1', 'value')
            map.set('key2', 'value2')
            expect(dummy).toBe(2)
            map.delete('key1')
            expect(dummy).toBe(1)
            map.clear()
            expect(dummy).toBe(0)
        })

        it('should be triggered by clearing', () => {
            let dummy
            const map = reactive(new Map())
            effect(() => (dummy = map.get('key')))
      
            expect(dummy).toBe(undefined)
            map.set('key', 3)
            expect(dummy).toBe(3)
            map.clear()
            expect(dummy).toBe(undefined)
          })

        //遍历操作
      
          it('should observe forEach iteration', () => {
            let dummy: any
            const map = reactive(new Map())
            effect(() => {
              dummy = 0
              map.forEach((num: any) => (dummy += num))
            })
      
            expect(dummy).toBe(0)
            map.set('key1', 3)
            expect(dummy).toBe(3)
            map.set('key2', 2)
            expect(dummy).toBe(5)
            // iteration should track mutation of existing entries (#709)
            map.set('key1', 4)
            expect(dummy).toBe(6)
            map.delete('key1')
            expect(dummy).toBe(2)
            map.clear()
            expect(dummy).toBe(0)
          })
      
          it('should observe for of iteration', () => {
            let dummy
            const map = reactive(new Map())
            effect(() => {
              dummy = 0
              // eslint-disable-next-line no-unused-vars
              for (let [key, num] of map) {
                key
                dummy += num
              }
            })
      
            expect(dummy).toBe(0)
            map.set('key1', 3)
            expect(dummy).toBe(3)
            map.set('key2', 2)
            expect(dummy).toBe(5)
            // iteration should track mutation of existing entries (#709)
            map.set('key1', 4)
            expect(dummy).toBe(6)
            map.delete('key1')
            expect(dummy).toBe(2)
            map.clear()
            expect(dummy).toBe(0)
          })

          it('should observe keys iteration', () => {
            let dummy
            const map = reactive(new Map())
            effect(() => {
              dummy = 0
              for (let key of map.keys()) {
                dummy += key
              }
            })
      
            expect(dummy).toBe(0)
            map.set(3, 3)
            expect(dummy).toBe(3)
            map.set(2, 2)
            expect(dummy).toBe(5)
            map.delete(3)
            expect(dummy).toBe(2)
            map.clear()
            expect(dummy).toBe(0)
          })
      
          it('should observe values iteration', () => {
            let dummy
            const map = reactive(new Map())
            effect(() => {
              dummy = 0
              for (let num of map.values()) {
                dummy += num
              }
            })
      
            expect(dummy).toBe(0)
            map.set('key1', 3)
            expect(dummy).toBe(3)
            map.set('key2', 2)
            expect(dummy).toBe(5)
            // iteration should track mutation of existing entries (#709)
            map.set('key1', 4)
            expect(dummy).toBe(6)
            map.delete('key1')
            expect(dummy).toBe(2)
            map.clear()
            expect(dummy).toBe(0)
          })
      
          it('should observe entries iteration', () => {
            let dummy
            let dummy2
            const map = reactive(new Map())
            effect(() => {
              dummy = ''
              dummy2 = 0
              // eslint-disable-next-line no-unused-vars
              for (let [key, num] of map.entries()) {
                dummy += key
                dummy2 += num
              }
            })
      
            expect(dummy).toBe('')
            expect(dummy2).toBe(0)
            map.set('key1', 3)
            expect(dummy).toBe('key1')
            expect(dummy2).toBe(3)
            map.set('key2', 2)
            expect(dummy).toBe('key1key2')
            expect(dummy2).toBe(5)
            // iteration should track mutation of existing entries (#709)
            map.set('key1', 4)
            expect(dummy).toBe('key1key2')
            expect(dummy2).toBe(6)
            map.delete('key1')
            expect(dummy).toBe('key2')
            expect(dummy2).toBe(2)
            map.clear()
            expect(dummy).toBe('')
            expect(dummy2).toBe(0)
          })

    })




})
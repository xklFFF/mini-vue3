import { effect } from "../effect"
import { isReactive, reactive } from "../reactive"

describe('reactivity/reactive/Array', () => {

    test('should make Array reactive', () => {
        const original = [{ foo: 1 }]
        const observed = reactive(original)
        expect(observed).not.toBe(original)
        expect(isReactive(observed)).toBe(true)
        expect(isReactive(original)).toBe(false)
        expect(isReactive(observed[0])).toBe(true)
        // get
        expect(observed[0].foo).toBe(1)
        // has
        expect(0 in observed).toBe(true)
        // ownKeys
        expect(Object.keys(observed)).toEqual(['0'])

    })
    test('should reactive when set a  index>array.length', () => {
        let len = 0
        const array = reactive([0])
        effect(() => {
            len=array.length
        })
        expect(len).toBe(1)
        array[1]=1
        expect(len).toBe(2)
    })

    test('add existing index on Array should not trigger length dependency', () => {
        const array = new Array(3)
        const observed = reactive(array)
        const fn = jest.fn()
        effect(() => {
          fn(observed.length)
        })
        expect(fn).toHaveBeenCalledTimes(1)
        observed[1] = 1
        expect(fn).toHaveBeenCalledTimes(1)
      })

})
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
    // 当设置新的属性大于数组的索引长度的时候要触发跟length有关的属性
    test('should reactive when set a  index>array.length', () => {
        let len = 0
        const array = reactive([0])
        effect(() => {
            len = array.length
        })
        expect(len).toBe(1)
        array[1] = 1
        expect(len).toBe(2)
    })

    //当设置的长度不大于数组的索引长度不触发
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
    test('should effect when array length change ', () => {
        const array = reactive([0, 1, 2, 3])
        let arr_0
        let arr_1
        let arr_2
        let arr_3
        effect(() => {
            arr_0 = array[0]
            arr_1 = array[1]
            arr_2 = array[2]
            arr_3 = array[3]

        })
        expect(arr_0).toBe(0)
        expect(arr_1).toBe(1)
        expect(arr_2).toBe(2)
        expect(arr_3).toBe(3)
        array.length = 2
        expect(arr_0).toBe(0)
        expect(arr_1).toBe(1)
        expect(arr_2).toBe(undefined)
        expect(arr_3).toBe(undefined)
    })

    // #2427
    test('track length on for ... in iteration', () => {
        const array = reactive([1])
        let length = ''
        effect(() => {
            length = ''
            for (const key in array) {
                length += key
            }
        })
        expect(length).toBe('0')
        array.push(1)
        expect(length).toBe('01')
    })
    test('should not track symbolValue like symbol.iteratior', () => {
        const arr = reactive([1, 2, 3])
        effect(() => {
            for (const val of arr) {
                console.log(val);

            }
        })
        arr[1]='bar'
        arr.length = 0
    })
})
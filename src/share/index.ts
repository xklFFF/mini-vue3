export const extend = Object.assign

export const EMPTY_OBJ = {};


export const isObeject = (value) => {
    return value !== null && typeof value === 'object'
}
export const hasChanged = (val, newValue) => {
    return !Object.is(val, newValue)
}
export const isArray = Array.isArray

export const hasOwn = (val: object, key) => val.hasOwnProperty(key)

export const isString = (val) => typeof val === 'string'
// 检测作为数组的key，是否为整数类型的字符串
export const isIntegerKey = (key) => isString(key) &&
    key !== 'NaN' &&
    key[0] !== '-' &&
    '' + parseInt(key, 10) === key


export const objectToString = Object.prototype.toString
export const toTypeString = (value: unknown): string =>
    objectToString.call(value)
export const toRawType = (value: unknown): string => {
    // extract "RawType" from strings like "[object RawType]"
    return toTypeString(value).slice(8, -1)
}

export const isMap = (val: unknown) =>
    toTypeString(val) === '[object Map]'

//   转换成驼峰命名
export const camelize = (str: string) => {
    return str.replace(/-(\w)/g, (_, c: string) => {
        return c ? c.toUpperCase() : "";
    });
};

//   首字母大写
const capitalize = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1)
}

//处理跟事件有关的key值
export const toHandlerKey = (str: string) => {
    return str ? "on" + capitalize(str) : ""
}
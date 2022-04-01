export const extend = Object.assign

export const isObeject = (value) => {
    return value !== null && typeof value === 'object'
}
export const hasChanged=(val,newValue)=>{
    return !Object.is(val,newValue)
} 
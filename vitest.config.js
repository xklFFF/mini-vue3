import { defineConfig } from "vitest/config";
export default defineConfig({
    test: {
        globals: true //方便在写测试文件的时候，不用导入一些api
    }
})
import { defineNuxtModule } from 'nuxt/kit'
import { syncCandleReader } from './sync'

// 每次 nuxt dev / build / generate 启动时同步阅读器静态产物，见 ./sync.ts
export default defineNuxtModule({
    meta: { name: 'candle-reader' },
    setup(_options, nuxt) {
        const result = syncCandleReader(nuxt.options.rootDir)
        if (result === 'copied') {
            console.info('[candle-reader] 已从 npm 包同步到 public/static/candle-reader/')
        }
    },
})

// https://nuxt.com/docs/api/configuration/nuxt-config
import { readFileSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { normalizeBasePath, withBasePath } from './utils/base-path'

const basePath = normalizeBasePath(process.env.TALEBOOK_BASE_PATH || '')

// Readest 运行时用根路径请求自己的资源（i18next 的 loadPath 写死
// "/locales/{{lng}}/{{ns}}.json"，字体同理），不认 assetPrefix=/readest。
// 这些文件实际在 /readest/ 下，需要把根路径代理回 /readest/。
// Nitro 的 proxy 只接受绝对 URL（相对路径会 404），所以这里拼出本机 origin；
// 端口从 NUXT_PORT/PORT 推导，避免写死。生产环境由 nginx 的 alias 处理。
const devPort = process.env.NUXT_PORT || process.env.PORT || '3000'
const devOrigin = `http://127.0.0.1:${devPort}`

export default defineNuxtConfig({
    vite: { define: { 'import.meta.env.TALEBOOK_BASE_PATH': JSON.stringify(basePath) } },
    compatibilityDate: '2024-04-03',
    devtools: { enabled: true },
    ignore: [
        '**/node_modules/**',
    ],
    modules: [
        'vuetify-nuxt-module',
        '@pinia/nuxt',
        '@nuxtjs/i18n'
    ],
    vuetify: {
        vuetifyOptions: {
            icons: {
                // A pre-create plugin replaces this with the repository-owned
                // SVG registry. `custom` prevents the module from adding a CDN
                // or icon-font stylesheet before that hook runs.
                defaultSet: 'custom',
            },
            theme: {
                defaultTheme: 'light',
                themes: {
                    light: {
                        colors: {
                            primary: '#1976D2',
                        }
                    },
                    dark: {
                        colors: {
                            primary: '#1976D2',
                        }
                    }
                }
            }
        }
    },
    runtimeConfig: {
        api_url: process.env.API_URL || 'http://127.0.0.1:8080',
        public: {
            api_url: process.env.API_URL || 'http://127.0.0.1:8080',
            site_title: process.env.TITLE || 'talebook',
        }
    },
    routeRules: {
        '/readest/legacy-worker-cleanup.js': {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'X-Content-Type-Options': 'nosniff',
            },
        },
        '/readest/talebook-launch.html': {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'X-Content-Type-Options': 'nosniff',
            },
        },
        '/readest/talebook-launch.js': {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'X-Content-Type-Options': 'nosniff',
            },
        },
        '/readest/sw.js': {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Service-Worker-Allowed': '/',
            },
        },
        '/readest/**': {
            headers: {
                'Content-Security-Policy': "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self' data:; img-src 'self' blob: data:; style-src 'self' 'unsafe-inline' blob:; font-src 'self' data:; object-src 'none'; frame-src blob:; worker-src 'self' blob:; base-uri 'none'; form-action 'none'; frame-ancestors 'self'",
                'Cross-Origin-Opener-Policy': 'same-origin',
                'Cross-Origin-Embedder-Policy': 'require-corp',
                'X-Content-Type-Options': 'nosniff',
            },
        },
        // Readest 的「关闭书籍 / 回库」执行 router.replace("/library")，
        // 因 assetPrefix=/readest 解析成 /readest/library。导出产物里只有
        // reader.html，没有 library.html，该路径会落到 Nuxt 的 catch-all，
        // 返回 Nuxt 应用壳；壳的 CSP 拦掉 Readest 的内联启动脚本，
        // 应用挂载失败 → 空白页。
        //
        // 必须让 URL 保持无扩展名的 /readest/library（用 proxy 而不是
        // redirect）：Next 的 router 从 **URL 路径**（经 removeBasePath
        // 去掉 /readest）推导 pathname，再拿它去 components[pathname]
        // 找页面组件。若 307 跳到 /readest/library.html，推导出的
        // pathname 是 "/library.html"，与 manifest 里的 "/library" 不匹配。
        // 注：Nitro 的 rewrite 对静态文件不生效（实测仍返回 Nuxt 壳）。
        '/readest/library': { proxy: devOrigin + '/readest/library.html' },
        // 根路径资源回写到 /readest/（详见文件顶部 devOrigin 的说明）。
        '/locales/**': { proxy: devOrigin + '/readest/locales/**' },
        '/fonts/**': { proxy: devOrigin + '/readest/fonts/**' },
        '/workers/**': { proxy: devOrigin + '/readest/workers/**' },
        '/vendor/**': { proxy: devOrigin + '/readest/vendor/**' },
        '/api/**': { proxy: (process.env.API_URL || 'http://127.0.0.1:8080') + '/api/**' },
        '/get/**': { proxy: (process.env.API_URL || 'http://127.0.0.1:8080') + '/get/**' },
        '/read-comic/**': { proxy: (process.env.API_URL || 'http://127.0.0.1:8080') + '/read-comic/**' },
        '/read-online-comic': { proxy: (process.env.API_URL || 'http://127.0.0.1:8080') + '/read-online-comic' },
        '/books/**': { proxy: (process.env.API_URL || 'http://127.0.0.1:8080') + '/books/**' },
        '/media/**': { proxy: (process.env.API_URL || 'http://127.0.0.1:8080') + '/media/**' },
        '/static/themes/**': { proxy: (process.env.API_URL || 'http://127.0.0.1:8080') + '/static/themes/**' },
    },
    app: {
        baseURL: basePath + "/",
        head: {
            title: 'talebook',
            titleTemplate: '%s | talebook',
            meta: [
                { charset: 'utf-8' },
                { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, minimal-ui' },
                { name: 'keywords', content: '在线阅读 电子书 下载 推送 kindle epub mobi' },
                {
                    name: 'description',
                    content: '这是个安静读书的地方。在线阅读Epub/Mobi/Pdf/Azw3等格式的电子书，也支持下载或推送到Kindle设备里',
                },
            ],
            link: [
                { rel: 'shortcut icon', type: 'image/x-icon', href: withBasePath('/logo/favicon.ico', basePath) }
            ],
            script: [
                { type: 'module', src: withBasePath('/readest/legacy-worker-cleanup.js', basePath) }
            ]
        }
    },
    devServer: {
        port: 9000,
        host: '0.0.0.0'
    },
    hooks: {
        'nitro:config'(nitroConfig) {
            nitroConfig.hooks ??= {}
            nitroConfig.hooks['prerender:done'] = async () => {
                const publicDir = resolve('.output/public')
                const cacheDir = resolve('node_modules/.cache/nuxt/.nuxt/dist/client/_nuxt')
                let hash = ''
                try {
                    const jsFiles = readdirSync(cacheDir).filter((f: string) => f.endsWith('.js'))
                    for (const file of jsFiles) {
                        const content = readFileSync(join(cacheDir, file), 'utf8')
                        const match = content.match(/_i18n\/([A-Za-z0-9_-]+)\//)
                        if (match) { hash = match[1]; break }
                    }
                } catch { }
                if (!hash) return
                const langDir = resolve('i18n/locales')
                for (const locale of ['zh-CN', 'en-US', 'ru-RU']) {
                    const outDir = join(publicDir, '_i18n', hash, locale)
                    mkdirSync(outDir, { recursive: true })
                    const messages = JSON.parse(readFileSync(join(langDir, `${locale}.json`), 'utf8'))
                    writeFileSync(join(outDir, 'messages.json'), JSON.stringify({ [locale]: messages }))
                }
            }
        }
    },
    nitro: {
        prerender: {
            crawlLinks: false,
            failOnError: false,
        }
    },
    
    i18n: {
        // 策略配置
        strategy: 'no_prefix', // 使用 cookie 管理语言，不添加路径前缀
        defaultLocale: 'zh-CN', // 默认语言
        locales: [
            {
                code: 'zh-CN',
                name: '简体中文',
                iso: 'zh-CN',
                file: 'zh-CN.json'
            },
            {
                code: 'en-US',
                name: 'English (US)',
                iso: 'en-US',
                file: 'en-US.json'
            },
            {
                code: 'ru-RU',
                name: 'Русский',
                iso: 'ru-RU',
                file: 'ru-RU.json'
            }
        ],
        
        // 语言文件目录 - 相对于i18n/locales/目录
        langDir: 'locales/',
        
        // 检测浏览器语言并重定向
        detectBrowserLanguage: {
            useCookie: true,
            cookieKey: 'i18n_redirected',
            redirectOn: 'root', // 在根路径检测并重定向
            alwaysRedirect: false
        },
        
        // Vue I18n 配置
        vueI18n: './i18n.config.ts'
    }
});

// https://nuxt.com/docs/api/configuration/nuxt-config
import { readFileSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

export default defineNuxtConfig({
    compatibilityDate: '2024-04-03',
    devtools: { enabled: true },
    modules: [
        'vuetify-nuxt-module',
        '@pinia/nuxt',
        '@nuxtjs/i18n'
    ],
    css: [
        '@mdi/font/css/materialdesignicons.css'
    ],
    vuetify: {
        vuetifyOptions: {
            icons: {
                defaultSet: 'mdi',
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
        public: {
            api_url: process.env.API_URL || 'http://127.0.0.1:8080',
            site_title: process.env.TITLE || 'talebook',
        }
    },
    routeRules: {
        '/api/**': { proxy: (process.env.API_URL || 'http://127.0.0.1:8080') + '/api/**' },
        '/get/**': { proxy: (process.env.API_URL || 'http://127.0.0.1:8080') + '/get/**' },
        '/read/**': { proxy: (process.env.API_URL || 'http://127.0.0.1:8080') + '/read/**' },
    },
    app: {
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
                { rel: 'shortcut icon', type: 'image/x-icon', href: '/logo/favicon.ico' }
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
                for (const locale of ['zh-CN', 'en-US']) {
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

// https://nuxt.com/docs/api/configuration/nuxt-config
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
                    }
                }
            }
        }
    },
    runtimeConfig: {
        public: {
            api_url: process.env.API_URL || 'http://127.0.0.1:8000',
            site_title: process.env.TITLE || 'talebook',
        }
    },
    routeRules: {
        '/api/**': { proxy: (process.env.API_URL || 'http://127.0.0.1:8000') + '/api/**' },
        '/get/**': { proxy: (process.env.API_URL || 'http://127.0.0.1:8000') + '/get/**' },
        '/read/**': { proxy: (process.env.API_URL || 'http://127.0.0.1:8000') + '/read/**' },
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
                    hid: 'description',
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
    nitro: {
        prerender: {
            crawlLinks: false,
            failOnError: false,
        }
    },
    
    i18n: {
        // 策略配置
        strategy: 'no_prefix', // 使用 cookie 管理语言，不添加路径前缀
        defaultLocale: 'zh', // 默认语言
        locales: [
            {
                code: 'zh',
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

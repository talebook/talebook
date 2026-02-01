// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },
  modules: [
    'vuetify-nuxt-module',
    '@pinia/nuxt'
  ],
  css: [
    '@mdi/font/css/materialdesignicons.css'
  ],
  vuetify: {
    vuetifyOptions: {
      icons: {
        defaultSet: 'mdi',
      },
    }
  },
  runtimeConfig: {
    public: {
      api_url: process.env.API_URL || "http://127.0.0.1:8000",
      site_title: process.env.TITLE || "talebook",
    }
  },
  routeRules: {
    '/api/**': { proxy: (process.env.API_URL || "http://127.0.0.1:8000") + '/api/**' },
    '/get/**': { proxy: (process.env.API_URL || "http://127.0.0.1:8000") + '/get/**' }
  },
  app: {
    head: {
      title: "talebook",
      titleTemplate: "%s | talebook",
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
  }
})

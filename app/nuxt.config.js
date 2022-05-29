export default {
  srcDir: 'src/',
  // Global page headers: https://go.nuxtjs.dev/config-head
  head: {
    title: "talebook",
    titleTemplate: "%s | talebook",
    htmlAttrs: {
      lang: 'en'
    },
    meta: [
      { charset: 'utf-8' },
      { name: 'format-detection', content: 'telephone=no' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black' },
      //{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
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
  },

  // Global CSS: https://go.nuxtjs.dev/config-css
  css: [
    'material-design-icons-iconfont/dist/material-design-icons.css',
    '@mdi/font/css/materialdesignicons.css',
  ],

  // Plugins to run before rendering page: https://go.nuxtjs.dev/config-plugins
  plugins: [
    "~/plugins/talebook.js",
    "~/plugins/load-plugins.js",
  ],

  // Auto import components: https://go.nuxtjs.dev/config-components
  components: true,

  // Modules for dev and build (recommended): https://go.nuxtjs.dev/config-modules
  buildModules: [
    '@nuxtjs/vuetify',
    '@nuxtjs/google-fonts',
    '@nuxtjs/google-analytics',
  ],

  // Modules: https://go.nuxtjs.dev/config-modules
  modules: [
  ],

  // Vuetify module configuration: https://go.nuxtjs.dev/config-vuetify
  vuetify: {
    // treeShake: true,
    defaultAssets: false,
    iconfont: 'mdi',
  },

  googleFonts: {
    download: true
  },

  googleAnalytics: {
    // Used as fallback if no runtime config is provided
    id: 'G-LLF01B5ZZ8',
  },

  publicRuntimeConfig: {
    head: {
        title: process.env.TITLE || "talebook",
        titleTemplate: process.env.TITLE_TEMPLATE || " %s | talebook",
    },
    api_url: process.env.API_URL || "http://127.0.0.1:8000",
    googleAnalytics: {
      id: process.env.GOOGLE_ANALYTICS_ID,
    }
  },

  server: {
    port: 9000, // default: 3000
    host: '0.0.0.0' // default: localhost
  },

  // Build Configuration: https://go.nuxtjs.dev/config-build
  build: {
  }
}

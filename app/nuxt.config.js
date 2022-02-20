import colors from 'vuetify/es5/util/colors'
import logger from "connect-logger";


export default {
  loading: '~/components/Loading.vue',
  srcDir: 'src/',
  // Global page headers: https://go.nuxtjs.dev/config-head
  head: {
    titleTemplate: '%s - talebook',
    title: 'talebook',
    htmlAttrs: {
      lang: 'en'
    },
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: '' },
      { name: 'format-detection', content: 'telephone=no' }
    ],
    link: [
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
    ]
  },

  // Global CSS: https://go.nuxtjs.dev/config-css
  css: [
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
  ],

  // Modules: https://go.nuxtjs.dev/config-modules
  modules: [
  ],

  // Vuetify module configuration: https://go.nuxtjs.dev/config-vuetify
  vuetify: {
    customVariables: ['~/assets/variables.scss'],
    iconfont: 'mdi',
    theme: {
      dark: false,
      themes: {
        dark: {
          primary: colors.blue.darken2,
          accent: colors.grey.darken3,
          secondary: colors.amber.darken3,
          info: colors.teal.lighten1,
          warning: colors.amber.base,
          error: colors.deepOrange.accent4,
          success: colors.green.accent3
        }
      }
    }
  },

  server: {
    port: 8081, // default: 3000
    host: '0.0.0.0' // default: localhost
  },


  privateRuntimeConfig: {
    baseURL: process.env.BASE_URL,
  },

  serverMiddleware: [
    logger({ format: "%date %status %method %url (%time)" })
  ],

  // Build Configuration: https://go.nuxtjs.dev/config-build
  build: {
  }
}

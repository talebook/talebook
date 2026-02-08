// i18n.config.ts
export default defineI18nConfig(() => ({
  legacy: false,
  locale: 'zh',
  messages: {
    zh: {},
    en: {},
    ja: {}
  },
  
  // 日期时间格式化
  datetimeFormats: {
    'zh': {
      short: {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      },
      long: {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
        hour: 'numeric',
        minute: 'numeric'
      }
    },
    'en': {
      short: {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      },
      long: {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      }
    },
    'ja': {
      short: {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      },
      long: {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
        hour: 'numeric',
        minute: 'numeric'
      }
    }
  },
  
  // 数字格式化
  numberFormats: {
    'zh': {
      currency: {
        style: 'currency',
        currency: 'CNY'
      }
    },
    'en': {
      currency: {
        style: 'currency',
        currency: 'USD'
      }
    },
    'ja': {
      currency: {
        style: 'currency',
        currency: 'JPY'
      }
    }
  }
}))
// i18n.config.ts
import enUSMessages from './i18n/locales/en-US.json'
import zhCNMessages from './i18n/locales/zh-CN.json'

const zhCNDateTimeFormats = {
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

const enUSDateTimeFormats = {
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
}

const zhCNNumberFormats = {
  currency: {
    style: 'currency',
    currency: 'CNY'
  }
}

const enUSNumberFormats = {
  currency: {
    style: 'currency',
    currency: 'USD'
  }
}

export default defineI18nConfig(() => ({
  legacy: false,
  locale: 'zh-CN',
  fallbackLocale: {
    zh: ['zh-CN'],
    default: ['zh-CN']
  },
  messages: {
    zh: zhCNMessages,
    'zh-CN': zhCNMessages,
    'en-US': enUSMessages
  },
  
  // 日期时间格式化
  datetimeFormats: {
    zh: zhCNDateTimeFormats,
    'zh-CN': zhCNDateTimeFormats,
    'en-US': enUSDateTimeFormats,
  },
  
  // 数字格式化
  numberFormats: {
    zh: zhCNNumberFormats,
    'zh-CN': zhCNNumberFormats,
    'en-US': enUSNumberFormats
  }
}))

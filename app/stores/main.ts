import { defineStore } from 'pinia'

export const useMainStore = defineStore('main', () => {
  // State
  const nav = ref(true)
  const loading = ref(true)
  const count = ref(0)

  // 使用 cookie 持久化主题
  const themeCookie = useCookie('theme', {
    default: () => 'light',
    maxAge: 60 * 60 * 24 * 365, // 1年
  })
  const theme = ref(themeCookie.value)

  const user = ref({
    is_admin: false,
    is_login: false,
    nickname: "",
    kindle_email: "",
    avatar: "",
  })

  const alert = ref({
    to: "",
    msg: "",
    type: "",
    show: false,
  })

  const sys = ref({
    socials: [],
    allow: {},
    footer: '',
    footer_extra_html: '',
    friends: [],
  })

  const site_title = ref("首页")
  const site_title_template = ref("%s | talebook")

  // Actions
  function setLoading(isLoading: boolean) {
    loading.value = isLoading
  }

  function setNavbar(navValue: boolean) {
    nav.value = navValue
  }

  function increment() {
    count.value++
  }

  function login(data: any) {
    if (data != undefined) {
      sys.value = data.sys
      user.value = data.user
    }
  }

  function setAlert(v: any) {
    alert.value.to = v.to
    alert.value.type = v.type
    alert.value.msg = v.msg
    alert.value.show = true
  }

  function closeAlert() {
    alert.value.show = false
  }

  function setTitle(v: string) {
    site_title_template.value = ' %s | ' + v
  }

  function setTheme(v: string) {
    theme.value = v
    themeCookie.value = v
  }

  function toggleTheme() {
    const newTheme = theme.value === 'light' ? 'dark' : 'light'
    theme.value = newTheme
    themeCookie.value = newTheme
  }

  return {
    nav,
    loading,
    count,
    theme,
    user,
    alert,
    sys,
    site_title,
    site_title_template,
    setLoading,
    setNavbar,
    increment,
    login,
    setAlert,
    closeAlert,
    setTitle,
    setTheme,
    toggleTheme,
  }
})

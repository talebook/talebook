import { defineStore } from 'pinia'
import { withBasePath } from '@/utils/base-path'

export const useMainStore = defineStore('main', () => {
  // State
  const nav = ref(true)
  const loading = ref(true)
  const count = ref(0)

  // 使用 cookie 持久化主题
  const themeCookie = useCookie('theme', {
    default: () => 'light',
    path: withBasePath('/'),
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
    show_network_library: true,
    upload: {
      chunk_enabled: true,
      chunk_threshold: 8 * 1024 * 1024,
      chunk_size: 4 * 1024 * 1024,
    },
  })
  const messages = ref<any[]>([])

  // 登录浮窗：任何页面需要登录时，在当前页面上叠加全页蒙版和登录表单，而不是跳转登录页。
  // requiredPath 是本身需要登录的页面路径：停留在该页面时内容在登录前不渲染，取消时离开该页面；
  // authEpoch 在登录成功后递增，用于让当前页面重新挂载、以登录身份重新加载内容。
  const loginPrompt = ref({
    show: false,
    requiredPath: '',
    hint: '',
  })
  const authEpoch = ref(0)

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
    // 控制类错误信封（例如首次安装时的 not_installed）不包含 sys/user。
    // 只有完整的用户信息响应才能替换初始化默认值，否则页头、页脚等计算属性
    // 会在跳转完成前读到 undefined。
    if (data?.sys && data?.user) {
      sys.value = data.sys
      user.value = data.user
    }
  }

  function openLoginPrompt(options: { requiredPath?: string, hint?: string } = {}) {
    loginPrompt.value = {
      show: true,
      requiredPath: options.requiredPath || loginPrompt.value.requiredPath,
      hint: options.hint || loginPrompt.value.hint,
    }
    // 未登录引发的页面错误提示会盖在登录浮窗上，登录浮窗出现时先收起它。
    alert.value.show = false
  }

  // 只关闭浮窗；requiredPath 保留到离开该页面的导航完成，避免导航途中先渲染出需要登录的页面。
  function closeLoginPrompt() {
    loginPrompt.value = { ...loginPrompt.value, show: false, hint: '' }
  }

  function releaseLoginRequirement(path: string) {
    if (loginPrompt.value.requiredPath && loginPrompt.value.requiredPath !== path) {
      loginPrompt.value = { ...loginPrompt.value, requiredPath: '' }
    }
  }

  function completeLogin() {
    loginPrompt.value = { show: false, requiredPath: '', hint: '' }
    authEpoch.value++
  }

  function setAlert(v: any) {
    // 登录浮窗打开期间，页面因未登录产生的错误提示没有意义，登录表单自己展示登录错误。
    if (loginPrompt.value.show) return
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

  async function loadUserInfo() {
    const { $backend } = useNuxtApp()
    const rsp = await $backend('/user/info')
    login(rsp)
    if (rsp?.sys?.title) {
      setTitle(rsp.sys.title)
    }
    return rsp
  }

  async function loadMessages() {
    const { $backend } = useNuxtApp()
    const rsp = await $backend('/user/messages')
    if (rsp.err == 'ok') {
      messages.value = rsp.messages
    }
    return rsp
  }

  async function bootstrap() {
    const [userRsp] = await Promise.all([loadUserInfo(), loadMessages()])
    return userRsp
  }

  async function hideMessage(idx: number, msgid: unknown) {
    const { $backend } = useNuxtApp()
    const rsp = await $backend('/user/messages', {
      method: 'POST',
      body: JSON.stringify({ id: msgid }),
    })
    if (rsp.err == 'ok') {
      messages.value.splice(idx, 1)
    }
    return rsp
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
    messages,
    loginPrompt,
    authEpoch,
    site_title,
    site_title_template,
    setLoading,
    setNavbar,
    increment,
    login,
    openLoginPrompt,
    closeLoginPrompt,
    releaseLoginRequirement,
    completeLogin,
    setAlert,
    closeAlert,
    setTitle,
    loadUserInfo,
    loadMessages,
    bootstrap,
    hideMessage,
    setTheme,
    toggleTheme,
  }
})

import { defineStore } from 'pinia'

export const useMainStore = defineStore('main', {
  state: () => ({
    nav: true,
    loading: true,
    count: 0,
    theme: 'light',
    user: {
      is_admin: false,
      is_login: false,
      nickname: "",
      kindle_email: "",
      avatar: "",
    },
    alert: {
      to: "",
      msg: "",
      type: "",
      show: false,
    },
    sys: {
      socials: [],
      allow: {},
      footer: '',
      footer_extra_html: '',
      friends: [],
    },
    site_title: "首页",
    site_title_template: "%s | talebook"
  }),
  actions: {
    setLoading(isLoading: boolean) {
        this.loading = isLoading;
    },
    setNavbar(nav: boolean) {
        this.nav = nav;
    },
    increment() {
        this.count++
    },
    login(data: any) {
        if (data != undefined) {
            this.sys = data.sys;
            this.user = data.user;
        }
    },
    setAlert(v: any) {
        this.alert.to = v.to;
        this.alert.type = v.type;
        this.alert.msg = v.msg;
        this.alert.show = true;
    },
    closeAlert() {
        this.alert.show = false;
    },
    setTitle(v: string) {
        this.site_title_template = ' %s | ' + v;
    },
    setTheme(v: string) {
        this.theme = v;
    },
    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
    }
  }
})

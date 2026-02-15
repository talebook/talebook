import { createApp } from "vue";
import App from "./App.vue";
//配置请求数据
import type { AxiosInstance } from "axios";
import Axios from "axios";
//全局配置Axios
declare module "@vue/runtime-core" {
  interface ComponentCustomProperties {
    $axios: AxiosInstance;
  }
}
const app = createApp(App);
app.config.globalProperties.$axios = Axios; //this.Axios
app.mount("#app");
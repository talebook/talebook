<template>
  <div class="demoform">
    <form id="form">
      <div
        class="inp"
        :class="captchaConfig.config.product === 'bind' ? 'minWidth' : ''"
      >
        <div class="user">user</div>
        <input
          type="email"
          id="email"
          autocomplete="false"
          placeholder="hello@geetest.com"
        />
      </div>
      <div class="inp">
        <div class="pass"></div>
        <input
          type="password"
          id="pass"
          autocomplete="false"
          placeholder="******"
        />
      </div>
      <div
        id="captcha"
        :class="captchaConfig.config.product === 'bind' ? 'hideHeight' : ''"
      >
        <GeetestCaptcha :captcha-config="captchaConfig" />
      </div>
      <div class="login" @click="login">
        {{ captchaConfig.config.language === "en" ? "login" : "登录" }}
      </div>
    </form>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, toRefs, getCurrentInstance } from "vue";
import GeetestCaptcha from "./components/GeetestCaptcha.vue";

declare global {
  interface Window {
    [propName: string]: never;
  }
}
export default defineComponent({
  name: "App",
  components: {
    GeetestCaptcha,
  },
  setup() {
    const instance = getCurrentInstance();
    let data = reactive({
      captchaConfig: {
        config: {
          captchaId: "54088bb07d2df3c46b79f80300b0abbe",
          language: "en",
          product: "bind",
        },
        handler: captchaHandler,
      },
    });
    function login() {
      if (data.captchaConfig.config.product === "bind") {
        if (window.captchaObj) {
          (window as Window).captchaObj?.showCaptcha();
        } else {
          alert("请等待验证初始化完成");
          return false;
        }
      } else {
        validate();
      }
    }

    function validate() {
      var result: CaptchaValidateResult | undefined | null= (window as Window).captchaObj?.getValidate();
      if (!result) {
        alert("请先完成验证！");
        return;
      }
      instance?.proxy!
        .$axios({
          method: "get",
          url: "/demo/login",
          params: result,
        })
        .then((res: HttpResponse<any>) => {
          if (res.data.code === "20000") {
            console.log(res.data);
            alert(res.data.msg);
          }
        });
    }

    function captchaHandler(captchaObj: CaptchaObject) {
      (window as Window).captchaObj = captchaObj;
      captchaObj
        .appendTo("#captcha")
        .onReady(function () {
          console.log("ready");
        })
        .onNextReady(function () {
          console.log("nextReady");
        })
        .onBoxShow(function () {
          console.log("boxShow");
        })
        .onError(function (e: ErrorResponse) {
          console.log(e);
        })
        .onSuccess(function () {
          if (data.captchaConfig.config.product === "bind") {
            validate();
          }
        });
    }

    return {
      login,
      ...toRefs(data),
    };
  },
});
</script>

<style  scope>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
.demoform {
  margin: 100px auto 0;
  width: 340px;
  height: 600px;
  position: relative;
  form {
    box-sizing: content-box;

    .inp {
      background: #ffffff;
      border: 1px solid #d1d6e0;
      box-sizing: border-box;
      border-radius: 4px;
      margin: 20px 0px;
      font-size: 0;
      position: relative;
      text-align: left;

      .user {
        margin: 15px 0 15px 13px;
        background-image: url("./assets/user.png");
        background-size: 100%;
        width: 20px;
        height: 20px;
        display: inline-block;
      }
      .pass {
        margin: 15px 13px;
        background-image: url("./assets/lock.png");
        background-size: 100%;
        width: 20px;
        height: 20px;
        display: inline-block;
      }
      > input {
        width: 213px;
        font-size: 14px;
        position: absolute;
        top: 7px;
        left: 45px;
        height: 36px;
        border: none;
        border-left: 1px solid #d1d6e0;
        background-color: #bab1bb00 !important;
        outline: transparent;
        text-indent: 5px;
      }
      input:-internal-autofill-selected {
        background-color: red !important;
        -webkit-transition: background-color 5000s ease-in-out 0s !important;
        transition: background-color 5000s ease-in-out 0s !important;
      }
    }

    #captcha {
      height: 50px;

      &.hideHeight {
        height: 0;
      }
    }

    .login {
      background: #347eff;
      border-radius: 4px;
      margin: 20px 0px;
      width: 100%;
      height: 50px;
      color: white;
      text-align: center;
      line-height: 50px;
      cursor: pointer;
    }
  }
}
</style>

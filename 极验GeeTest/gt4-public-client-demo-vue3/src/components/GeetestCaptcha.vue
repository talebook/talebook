<template>
  <div class="captcha"></div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from "vue";

// 定义验证码处理器类型
type CaptchaHandler = (captchaObj: CaptchaObject) => void;

// 定义props接口
interface CaptchaConfigProps {
  config: CaptchaConfig;
  handler: CaptchaHandler;
}

export default defineComponent({
  name: "GeetestCaptcha",
  props: {
    captchaConfig: {
      type: Object as PropType<CaptchaConfigProps>,
      required: true
    }
  },
  setup(props: { captchaConfig: CaptchaConfigProps }) {
    (window as Window).initGeetest4(
      props.captchaConfig.config,
      props.captchaConfig.handler
    );
  },
});
</script>

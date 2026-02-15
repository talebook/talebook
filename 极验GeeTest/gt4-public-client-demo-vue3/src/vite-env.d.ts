/// <reference types="vite/client" />
declare module '*.vue' {
    import type { DefineComponent } from 'vue'
    const component: DefineComponent<{}, {}, any>
    export default component
  }

// 定义验证码配置接口
interface CaptchaConfig {
  captchaId: string;
  language: string;
  product: string;
}

// 定义验证码对象接口
interface CaptchaObject {
  appendTo: (selector: string) => CaptchaObject;
  onReady: (callback: () => void) => CaptchaObject;
  onNextReady: (callback: () => void) => CaptchaObject;
  onBoxShow: (callback: () => void) => CaptchaObject;
  onError: (callback: (error: ErrorResponse) => void) => CaptchaObject;
  onSuccess: (callback: () => void) => CaptchaObject;
  getValidate: () => CaptchaValidateResult | null;
  showCaptcha: () => void;
}

// 定义验证码处理器类型
type CaptchaHandler = (captchaObj: CaptchaObject) => void;

// 定义验证码验证结果类型
interface CaptchaValidateResult {
  captcha_id: string;
  lot_number: string;
  pass_token: string;
  gen_time: string;
  captcha_output: string;
}

// 定义API响应类型
interface ErrorResponse {
  msg: string;
  code: string;
  desc: {
    detail: string;
  };
  lot_number: string;
}

// 定义HTTP响应包装类型
interface HttpResponse<T = any> {
  data: T;
}

interface Window {
  initGeetest4: (config: CaptchaConfig, handler: CaptchaHandler) => void;
  captchaObj?: CaptchaObject;
}

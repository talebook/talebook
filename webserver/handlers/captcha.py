#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""
人机验证相关接口
"""

import datetime
import logging
from gettext import gettext as _

from webserver import loader
from webserver.handlers.base import BaseHandler, js
from webserver.plugins import captcha as captcha_module
from webserver.plugins.captcha.image_captcha import ImageCaptchaProvider

CONF = loader.get_settings()

# 启动时记录验证码配置状态
if CONF.get("CAPTCHA_PROVIDER"):
    logging.info("CAPTCHA enabled with provider: %s", CONF["CAPTCHA_PROVIDER"])
    for scene in ["REGISTER", "LOGIN", "WELCOME"]:
        key = f"CAPTCHA_ENABLE_FOR_{scene}"
        if CONF.get(key):
            logging.info("CAPTCHA enabled for %s", scene.lower())
else:
    logging.info("CAPTCHA disabled")


class CaptchaBaseHandler(BaseHandler):
    """验证码基类 - 不需要邀请验证"""

    def should_be_invited(self):
        # 验证码接口不需要邀请验证
        pass


class CaptchaConfigHandler(CaptchaBaseHandler):
    """获取验证码配置（前端初始化用）"""

    @js
    def get(self):
        """获取当前启用的验证码配置"""
        config = captcha_module.get_captcha_config(CONF)
        return {"err": "ok", "config": config}


class CaptchaImageHandler(CaptchaBaseHandler):
    """图形验证码生成接口"""

    @js
    def get(self):
        """生成新的图形验证码"""
        provider = ImageCaptchaProvider(CONF)
        result = provider.generate()

        # 将正确答案存入 cookie，1分钟过期
        # 使用本地时间，因为 Tornado 的 expires 参数需要本地时间
        expires = datetime.datetime.now() + datetime.timedelta(minutes=1)
        self.set_secure_cookie("captcha_answer", result["code"], expires=expires)

        # 同时存储生成时间，用于精确判断（使用 UTC 时间戳）
        self.set_secure_cookie("captcha_generate_time", str(datetime.datetime.utcnow().timestamp()), expires=expires)

        logging.info("=== 验证码生成调试 ===")
        logging.info(f"验证码答案: {result['code']}")
        logging.info(f"过期时间: {expires}")
        logging.info(f"所有Cookies: {dict(self.request.cookies)}")

        return {
            "err": "ok",
            "captcha_id": result["captcha_id"],
            "image": result["image"]
        }


class CaptchaVerifyHandler(CaptchaBaseHandler):
    """验证码二次验证接口（供前端测试用）"""

    @js
    def post(self):
        """执行验证码验证"""
        provider_name = self.get_argument("provider", "")

        # 图形验证码验证
        if provider_name == "image":
            captcha_code = self.get_argument("captcha_code", "")
            captcha_answer = self.get_secure_cookie("captcha_answer")
            generate_time = self.get_secure_cookie("captcha_generate_time")

            # 添加调试日志
            logging.info("=== 验证码验证调试 ===")
            logging.info(f"用户输入: {captcha_code}")
            logging.info(f"Cookie中的答案: {captcha_answer}")
            logging.info(f"Cookie中的生成时间: {generate_time}")
            logging.info(f"所有Cookies: {dict(self.request.cookies)}")
            logging.info(f"请求头: {dict(self.request.headers)}")

            # 检查是否存在验证码
            if not captcha_answer or not generate_time:
                return {"err": "captcha.expired", "msg": _("验证码已过期，请刷新")}

            # 检查是否过期（双重验证）
            try:
                gen_time = datetime.datetime.fromtimestamp(float(generate_time.decode('utf-8')))
                now = datetime.datetime.utcnow()
                elapsed = (now - gen_time).total_seconds()
                remaining = 60 - elapsed
                logging.info(f"验证码过期检查 - 生成时间: {gen_time}, 当前时间: {now}, 已过去: {elapsed:.1f}秒, 剩余: {remaining:.1f}秒")
                if elapsed > 60:  # 超过60秒
                    logging.info("验证码已过期 - 超过60秒")
                    self.clear_cookie("captcha_answer")
                    self.clear_cookie("captcha_generate_time")
                    return {"err": "captcha.expired", "msg": _("验证码已过期，请刷新")}
            except Exception as e:
                logging.warning(f"验证码时间解析失败: {e}")

            # 先验证
            result = captcha_module.verify_captcha(
                CONF,
                captcha_code=captcha_code,
                captcha_answer=captcha_answer.decode('utf-8')
            )

            # 验证成功后设置验证通过标记，失败不清除（允许重试）
            if result:
                # 设置验证通过标记，5分钟内有效
                verify_expires = datetime.datetime.now() + datetime.timedelta(minutes=5)
                self.set_secure_cookie("captcha_verified", "1", expires=verify_expires)
                self.clear_cookie("captcha_answer")
                self.clear_cookie("captcha_generate_time")
                return {"err": "ok", "msg": _("验证通过")}
            else:
                return {"err": "captcha.invalid", "msg": _("验证码错误，请重试")}

        # 极验验证码验证
        lot_number = self.get_argument("lot_number", "")
        captcha_output = self.get_argument("captcha_output", "")
        pass_token = self.get_argument("pass_token", "")
        gen_time = self.get_argument("gen_time", "")

        if not provider_name:
            return {"err": "params.invalid", "msg": _("验证提供商不能为空")}

        # 执行验证
        result = captcha_module.verify_captcha(
            CONF,
            lot_number=lot_number,
            captcha_output=captcha_output,
            pass_token=pass_token,
            gen_time=gen_time,
        )

        if result:
            return {"err": "ok", "msg": _("验证通过")}
        else:
            return {"err": "captcha.invalid", "msg": _("验证失败，请重试")}


def routes():
    return [
        (r"/api/captcha/config", CaptchaConfigHandler),
        (r"/api/captcha/image", CaptchaImageHandler),
        (r"/api/captcha/verify", CaptchaVerifyHandler),
    ]

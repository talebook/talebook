#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""
人机验证相关接口
"""

import logging
from gettext import gettext as _

from webserver import loader
from webserver.handlers.base import BaseHandler, js
from webserver.plugins import captcha as captcha_module

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


class CaptchaVerifyHandler(CaptchaBaseHandler):
    """验证码二次验证接口（供前端测试用）"""

    @js
    def post(self):
        """执行验证码验证"""
        provider = self.get_argument("provider", "")
        lot_number = self.get_argument("lot_number", "")
        captcha_output = self.get_argument("captcha_output", "")
        pass_token = self.get_argument("pass_token", "")
        gen_time = self.get_argument("gen_time", "")

        if not provider:
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
        (r"/api/captcha/verify", CaptchaVerifyHandler),
    ]

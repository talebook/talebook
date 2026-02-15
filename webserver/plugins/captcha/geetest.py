#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""
极验 GeeTest v4 验证实现
"""

import hmac
import json
import logging
from typing import Dict, Any, Optional

import requests

from .base import BaseCaptchaProvider


class GeetestProvider(BaseCaptchaProvider):
    """极验 v4 验证提供商"""

    name = "geetest"
    sdk_url = "https://static.geetest.com/v4/gt4.js"
    api_server = "http://gcaptcha4.geetest.com"

    def is_configured(self) -> bool:
        """检查是否已配置"""
        captcha_id = self.settings.get("GEETEST_CAPTCHA_ID", "")
        captcha_key = self.settings.get("GEETEST_CAPTCHA_KEY", "")
        return bool(captcha_id and captcha_key)

    def get_frontend_config(self) -> Dict[str, Any]:
        """
        获取前端配置
        :return: 前端初始化需要的配置
        """
        return {
            "provider": self.name,
            "captchaId": self.settings.get("GEETEST_CAPTCHA_ID", ""),
            "sdkUrl": self.sdk_url,
        }

    def verify(self, **kwargs) -> bool:
        """
        执行极验二次验证
        :param kwargs: 必须包含以下参数:
            - lot_number: 验证流水号
            - captcha_output: 验证输出
            - pass_token: 通行令牌
            - gen_time: 生成时间
        :return: True 验证通过，False 验证失败
        """
        lot_number = kwargs.get("lot_number", "")
        captcha_output = kwargs.get("captcha_output", "")
        pass_token = kwargs.get("pass_token", "")
        gen_time = kwargs.get("gen_time", "")

        # 参数检查
        if not all([lot_number, captcha_output, pass_token, gen_time]):
            logging.warning("Geetest verification failed: missing parameters")
            return False

        captcha_id = self.settings.get("GEETEST_CAPTCHA_ID", "")
        captcha_key = self.settings.get("GEETEST_CAPTCHA_KEY", "")

        if not captcha_id or not captcha_key:
            logging.error("Geetest not configured properly")
            return False

        # 生成签名
        lotnumber_bytes = lot_number.encode()
        prikey_bytes = captcha_key.encode()
        sign_token = hmac.new(
            prikey_bytes, lotnumber_bytes, digestmod="SHA256"
        ).hexdigest()

        # 构造请求参数
        query = {
            "lot_number": lot_number,
            "captcha_output": captcha_output,
            "pass_token": pass_token,
            "gen_time": gen_time,
            "sign_token": sign_token,
        }

        # 调用极验验证接口
        url = f"{self.api_server}/validate?captcha_id={captcha_id}"

        try:
            res = requests.post(url, query, timeout=10)
            if res.status_code != 200:
                logging.warning(f"Geetest API returned status {res.status_code}")
                # 接口异常时，为保证业务不中断，默认通过
                # 生产环境建议根据业务需求调整
                return True

            gt_msg = res.json()

            if gt_msg.get("result") == "success":
                return True
            else:
                logging.info(
                    f"Geetest verification failed: {gt_msg.get('reason', 'unknown')}"
                )
                return False

        except requests.RequestException as e:
            logging.error(f"Geetest API request failed: {e}")
            # 请求异常时，为保证业务不中断，默认通过
            # 生产环境建议根据业务需求调整
            return True
        except json.JSONDecodeError as e:
            logging.error(f"Geetest API response parse failed: {e}")
            return True

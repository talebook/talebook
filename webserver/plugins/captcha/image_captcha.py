#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""
图形验证码实现
基于 PIL 生成图片验证码，无需外部 API
"""

import base64
import io
import random
import string
from typing import Dict, Any

from PIL import Image, ImageDraw, ImageFont

from .base import BaseCaptchaProvider


class ImageCaptchaProvider(BaseCaptchaProvider):
    """图形验证码提供商"""

    name = "image"
    sdk_url = ""  # 不需要外部 SDK

    # 验证码字符集（去除容易混淆的字符）
    CHAR_SET = string.ascii_uppercase + string.digits
    CHAR_SET = CHAR_SET.replace("0", "").replace("O", "").replace("I", "").replace("1", "").replace("L", "")

    def __init__(self, settings: Dict[str, Any]):
        super().__init__(settings)
        self.code_length = settings.get("IMAGE_CAPTCHA_LENGTH", 4)
        self.image_width = settings.get("IMAGE_CAPTCHA_WIDTH", 120)
        self.image_height = settings.get("IMAGE_CAPTCHA_HEIGHT", 40)

    def is_configured(self) -> bool:
        """图形验证码始终可用，不需要额外配置"""
        return True

    def get_frontend_config(self) -> Dict[str, Any]:
        """
        获取前端配置
        :return: 前端初始化需要的配置
        """
        return {
            "provider": self.name,
            "captchaId": "image-captcha",
            "sdkUrl": "",  # 不需要外部 SDK
        }

    def generate(self) -> Dict[str, str]:
        """
        生成验证码
        :return: 包含验证码图片(base64)和正确答案的字典
        """
        # 生成随机验证码
        code = "".join(random.choices(self.CHAR_SET, k=self.code_length))

        # 创建图片
        image = Image.new("RGB", (self.image_width, self.image_height), self._random_background())
        draw = ImageDraw.Draw(image)

        # 绘制干扰线
        for _ in range(5):
            draw.line(
                [
                    (random.randint(0, self.image_width), random.randint(0, self.image_height)),
                    (random.randint(0, self.image_width), random.randint(0, self.image_height)),
                ],
                fill=self._random_color(),
                width=1,
            )

        # 绘制验证码字符
        font_size = int(self.image_height * 0.7)
        try:
            # 尝试使用系统字体
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
        except:
            try:
                font = ImageFont.truetype("arial.ttf", font_size)
            except:
                font = ImageFont.load_default()

        # 计算字符间距
        char_width = self.image_width // (self.code_length + 1)

        for i, char in enumerate(code):
            # 随机颜色
            color = self._random_dark_color()
            # 随机位置偏移
            x = char_width * (i + 0.5) + random.randint(-5, 5)
            y = (self.image_height - font_size) // 2 + random.randint(-3, 3)
            # 随机旋转角度
            angle = random.randint(-15, 15)

            # 创建字符图片
            char_image = Image.new("RGBA", (font_size, font_size), (0, 0, 0, 0))
            char_draw = ImageDraw.Draw(char_image)
            char_draw.text((0, 0), char, font=font, fill=color)

            # 旋转
            if angle != 0:
                char_image = char_image.rotate(angle, expand=True)

            # 粘贴到主图片
            image.paste(char_image, (int(x), int(y)), char_image)

        # 添加噪点
        pixels = image.load()
        for _ in range(self.image_width * self.image_height // 10):
            x = random.randint(0, self.image_width - 1)
            y = random.randint(0, self.image_height - 1)
            pixels[x, y] = self._random_color()

        # 转换为 base64
        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        image_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

        return {"image": f"data:image/png;base64,{image_base64}", "code": code, "captcha_id": self._generate_id()}

    def verify(self, **kwargs) -> bool:
        """
        执行验证码验证
        :param kwargs: 必须包含以下参数:
            - captcha_code: 用户输入的验证码
            - captcha_id: 验证码 ID（用于从 session 获取正确答案）
        :return: True 验证通过，False 验证失败
        """
        user_code = kwargs.get("captcha_code", "").upper().strip()
        correct_code = kwargs.get("captcha_answer", "").upper().strip()

        if not user_code or not correct_code:
            return False

        return user_code == correct_code

    def _random_background(self) -> tuple:
        """生成随机浅色背景"""
        return (random.randint(200, 255), random.randint(200, 255), random.randint(200, 255))

    def _random_color(self) -> tuple:
        """生成随机颜色"""
        return (random.randint(0, 255), random.randint(0, 255), random.randint(0, 255))

    def _random_dark_color(self) -> tuple:
        """生成随机深色（用于文字）"""
        return (random.randint(0, 100), random.randint(0, 100), random.randint(0, 100))

    def _generate_id(self) -> str:
        """生成唯一 ID"""
        import uuid

        return str(uuid.uuid4())

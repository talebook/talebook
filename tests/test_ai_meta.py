#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import json
from unittest import TestCase, mock

from webserver.plugins.meta.ai.api import AIBookApi


class TestAIBookApi(TestCase):
    def make_api(self, use_thinking=True):
        return AIBookApi(
            api_url="https://api.deepseek.com/chat/completions",
            api_key="test-key",
            model="deepseek-chat",
            use_thinking=use_thinking,
            copy_image=False,
        )

    @mock.patch("webserver.plugins.meta.ai.api.requests.post")
    def test_uses_standard_chat_completions_payload(self, post):
        """DeepSeek 等兼容端点不应收到厂商私有 thinking 参数。"""
        response = mock.Mock(status_code=200)
        response.json.return_value = {
            "choices": [
                {
                    "message": {
                        "reasoning_content": "internal reasoning",
                        "content": json.dumps({"status": "unknown"}),
                    }
                }
            ]
        }
        post.return_value = response

        self.make_api(use_thinking=True).get_book(
            "百年孤独",
            "加西亚·马尔克斯",
            evidence=[{"source": "在线书源甲", "title": "百年孤独", "author": "加西亚·马尔克斯"}],
        )

        payload = post.call_args.kwargs["json"]
        self.assertEqual(set(payload), {"model", "messages", "temperature"})
        self.assertNotIn("thinking", payload)
        self.assertIn("在线书源甲", payload["messages"][1]["content"])

    @mock.patch("webserver.plugins.meta.ai.api.requests.post")
    def test_explicit_empty_evidence_skips_model_request(self, post):
        """没有在线证据时不得让模型凭记忆编造元数据。"""
        result = self.make_api().get_book("不存在的书", evidence=[])

        self.assertIsNone(result)
        post.assert_not_called()

    @mock.patch("webserver.plugins.meta.ai.api.requests.get")
    def test_ai_metadata_never_downloads_model_supplied_cover_urls(self, get):
        """AI 结果只补全文本字段，不能让模型控制服务端网络请求。"""
        api = AIBookApi(
            api_url="https://api.deepseek.com/chat/completions",
            api_key="test-key",
            model="deepseek-chat",
            use_thinking=False,
            copy_image=True,
        )

        self.assertIsNone(api.get_cover("https://example.com/model-cover.jpg"))
        get.assert_not_called()

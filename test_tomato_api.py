#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

"""
测试番茄小说 API 是否正常工作
"""

import os
import sys


# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.abspath("/workspace"))

import logging

from webserver.plugins.meta.tomato.api import TomatoNovelApi


# 配置日志
logging.basicConfig(level=logging.DEBUG)


def test_tomato_api():
    """测试番茄小说 API"""
    print("开始测试番茄小说 API...")

    # 创建 API 实例
    api = TomatoNovelApi()

    # 测试搜索功能
    print("\n测试 1：搜索功能")
    try:
        results = api.search_book("吞噬星空")
        if results:
            print(f"搜索成功，找到 {len(results)} 个结果")
            for i, result in enumerate(results[:3]):  # 只显示前 3 个结果
                print(f"{i + 1}. {result['title']} - {result['author']}")
        else:
            print("搜索失败，未找到结果")
    except Exception as e:
        print(f"搜索测试失败: {e}")

    # 测试获取书籍信息
    print("\n测试 2：获取书籍信息")
    try:
        book = api.get_book("吞噬星空")
        if book:
            print(f"获取书籍信息成功")
            print(f"书名: {book.title}")
            print(f"作者: {book.author}")
            print(f"来源: {book.source}")
            print(f"网站: {book.website}")
        else:
            print("获取书籍信息失败")
    except Exception as e:
        print(f"获取书籍信息测试失败: {e}")


if __name__ == "__main__":
    test_tomato_api()

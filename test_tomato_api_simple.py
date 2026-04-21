#!/usr/bin/python3
# -*- coding: UTF-8 -*-

"""
简单测试番茄小说 API 是否可用
"""

import logging
from webserver.plugins.meta.tomato.api import TomatoNovelApi

# 配置日志
logging.basicConfig(level=logging.DEBUG, format='%(levelname)s: %(message)s')

def test_tomato_api():
    """测试番茄小说 API"""
    logging.info("开始测试番茄小说 API...")
    
    # 创建 API 实例
    api = TomatoNovelApi(copy_image=False)
    
    # 测试 1: 搜索功能
    logging.info("测试搜索功能...")
    try:
        results = api.search_book("吞噬星空", "我吃西红柿")
        logging.info(f"搜索结果数量: {len(results)}")
        if results:
            logging.info(f"第一个结果: {results[0]['title']} - {results[0]['author']}")
        else:
            logging.warning("搜索无结果")
    except Exception as e:
        logging.error(f"搜索功能测试失败: {e}")
    
    # 测试 2: 根据 ID 获取书籍信息
    logging.info("测试根据 ID 获取书籍信息...")
    try:
        # 使用一个已知的书籍 ID
        book_id = "7141319866317819927"  # 吞噬星空
        page = api.get_book_by_id(book_id)
        if page:
            info = page.get_info()
            logging.info(f"书籍信息: {info['title']} - {info['author']}")
        else:
            logging.warning("获取书籍信息失败")
    except Exception as e:
        logging.error(f"根据 ID 获取书籍信息测试失败: {e}")

if __name__ == "__main__":
    test_tomato_api()

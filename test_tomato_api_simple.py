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
    results = None
    try:
        results = api.search_book("斗破苍穹", "天蚕土豆")
        logging.info(f"搜索结果数量: {len(results)}")
        for i, result in enumerate(results[:3]):
            logging.info(f"结果 {i+1}: {result['title']} - {result['author']} (ID: {result['book_id']})")
    except Exception as e:
        logging.error(f"搜索功能测试失败: {e}")
    
    # 测试 2: 根据 ID 获取书籍信息
    if results and results[0]:
        # 尝试多个书籍 ID
        for i in range(min(3, len(results))):
            book_id = results[i]['book_id']
            logging.info(f"\n测试根据 ID {book_id} 获取书籍信息...")
            try:
                page = api.get_book_by_id(book_id)
                if page:
                    info = page.get_info()
                    logging.info(f"书籍信息: {info['title']} - {info['author']}")
                    logging.info(f"书籍简介: {info['summary'][:50]}...")
                    logging.info(f"书籍标签: {info['tags']}")
                    logging.info(f"书籍状态: {info['status']}")
                    
                    # 测试获取封面
                    cover_url = page.get_image()
                    if cover_url:
                        logging.info(f"封面 URL: {cover_url}")
                    
                    # 如果这个成功了，就停止尝试
                    if info['title'] != "未知书名":
                        break
                else:
                    logging.warning("获取书籍信息失败")
            except Exception as e:
                logging.error(f"根据 ID 获取书籍信息测试失败: {e}")

if __name__ == "__main__":
    test_tomato_api()

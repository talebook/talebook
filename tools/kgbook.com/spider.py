#!/usr/bin/python
#-*- coding: UTF-8 -*-

import os
import re
import sys
import logging
import requests

books_dir = "/data/books/download/kgbook.com/"
done_path = "/data/books/download/done-kgbook.txt"

site = 'https://kgbook.com/'
headers = {
'Accept-Language': 'zh-CN,zh;q=0.8,zh-TW;q=0.6',
'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
'Referer': 'http://bbs.feng.com/thread-htm-fid-224-page-1.html',
'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.87 Safari/537.36',
}

re_book      = r'''<h3 class="list-title"><a href="(/[a-z0-9]*/[0-9]*.html)" title="([^"]*)">.*</a>'''
re_attchment = r'''<a class="button" href="(https://kgbook.com/e/DownSys/GetDown?[^"]*)">([^<]*)</a>'''
formats = ['epub', 'mobi', 'azw3', 'azw', 'pdf']
done_urls = set( line.strip() for line in open(done_path).readlines() )

menus = {
"现代文学": "https://kgbook.com/xiandaiwenxue/",
"古典文学": "https://kgbook.com/gudianwenxue/",
"武侠小说": "https://kgbook.com/wuxiaxiaoshuo/",
"网络小说": "https://kgbook.com/wangluoxiaoshuo/",
"言情小说": "https://kgbook.com/yanqingxiaoshuo/",
"职场小说": "https://kgbook.com/zhichangxiaoshuo/",
"科幻玄幻": "https://kgbook.com/kehuanxuanhuan/",
"推理惊悚": "https://kgbook.com/tuilijingsong/",
"人文社科": "https://kgbook.com/renwensheke/",
"人物传记": "https://kgbook.com/renwuchuanji/",
"外国文学": "https://kgbook.com/waiguowenxue/",
"金融投资": "https://kgbook.com/jinrongtouzi/",
"管理书籍": "https://kgbook.com/guanlishuji/",
"励志成功": "https://kgbook.com/lizhichenggong/",
"历史地理": "https://kgbook.com/lishidili/",
"战争军事": "https://kgbook.com/zhanzhengjunshi/",
"哲学宗教": "https://kgbook.com/zhexuezongjiao/",
"儿童文学": "https://kgbook.com/ertongwenxue/",
"诗歌散文": "https://kgbook.com/shigesanwen/",
"自然科学": "https://kgbook.com/zirankexue/",
"教育学习": "https://kgbook.com/jiaoyuxuexi/",
"电脑网络": "https://kgbook.com/diannaowangluo/",
"保健养生": "https://kgbook.com/baojianyangsheng/",
"生活休闲": "https://kgbook.com/shenghuoxiuxian/",
"期刊杂志": "https://kgbook.com/qikanzazhi/",
"工具书": "https://kgbook.com/gongjushu/",
"电子书制作": "https://kgbook.com/dianzishuzhizuo/",
}


s = requests.Session()
def get(url):
    if not url.startswith("http"): url = site + url
    return s.get(url, headers=headers, timeout=60)

def download(link, name):
    link = link.replace("amp;", "")
    rsp = get(link)
    if rsp.status_code != 200: return False

    suffix = rsp.url.split("?")[0].split(".")[-1]
    fname = books_dir + name + "." + suffix
    if os.path.exists(fname):
        logging.info("file %s exists, skip download" % fname)

    logging.info("### Download %s" % link)
    logging.info("### Saving %s" % fname)
    open(fname, "w").write(rsp.content)
    return True


def visit_book(path, name):
    if path in done_urls:
        logging.info(" skip %-30s %s" % (path, name))
        return
    else:
        logging.info("Visit %-30s %s" % (path, name))
        done_urls.add(path)
    rsp = get(path)
    attchments = re.findall(re_attchment, rsp.text)
    for url, title in attchments:
        for f in formats:
            if f in title:
                try: download(url, name)
                except: pass

def visit_board():
    for menu, link in menus.items():
        idx = 0
        while True:
            idx += 1
            p = "index_%d.html"%idx if idx > 1 else "index.html"
            rsp = get(link + p)
            if rsp.status_code == 404: break
            for book_url, book_name in re.findall(re_book, rsp.content.decode("UTF-8")):
                visit_book(book_url, book_name)
            open(done_path, "w").write("\n".join(done_urls))


def main():
    visit_board()


if __name__ == "__main__":
    logging.basicConfig(
            format='%(asctime)s %(levelname)s %(filename)s:%(lineno)d %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S',
            level = logging.DEBUG
            )
    sys.exit(main())


    # curl 'http://bbs.feng.com/read-htm-tid-10510681.html' 

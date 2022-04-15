#!/usr/bin/python
# -*- coding: UTF-8 -*-
# flake8: noqa

import os
import re
import sys
import logging
import requests

books_dir = "/data1/download/weiphone.com/"
done_path = "/data1/download/done.txt"

site = "https://bbs.feng.com"
headers = {
    "Accept-Language": "zh-CN,zh;q=0.8,zh-TW;q=0.6",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Referer": "https://bbs.feng.com/thread-htm-fid-224-page-1.html",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.87 Safari/537.36",
}

# re_thread    = r'''<a href="forum.php\?mod=viewthread&tid=([0-9]*).* onclick=.* class="s xst">(.*)</a>'''
re_thread = r"""<a href="read-htm-tid-([0-9]*).html" onclick=.* class="s xst">(.*)</a>"""
re_attchment = r"""get=jQuery.get\('(plugin.php.*)',{},function.*html....>(.*)</a>"""
# re_download  = r'''href="(/plugin.php[^"]*attach)"'''
re_download = r'''<a href="([^"]*download.php?aid=[^"]*)"'''
formats = ["epub", "mobi", "azw3", "azw"]

done_urls = set(line.strip() for line in open(done_path).readlines())

s = requests.Session()


def get(path):
    if not path.startswith("/"):
        path = "/" + path
    return s.get(site + path, headers=headers, timeout=60)


def download(path, name):
    rsp = get(path)
    """https://bbs.feng.com/tencentdownload.php?aid=14535549&amp;key=55d41fd0c175192fd05bbeb308cedf27"""
    for link in re.findall(re_download, rsp.text):
        aids = re.findall(r"aid=([0-9]*)", link)
        aid = aids[0] if aids else "aid"
        fname = books_dir + "%s-%s" % (aid, name)
        if os.path.exists(fname):
            logging.info("file %s exists, skip download" % fname)

        rsp = get(link)
        if rsp.status_code != 200:
            continue
        logging.info("### Saving %s" % fname)
        open(fname, "w").write(rsp.content)
        return True
    return False


def visit_thread(tid, name):
    path = "/read-htm-tid-%s.html" % tid
    if path in done_urls:
        logging.info(" skip %-30s %s" % (path, name))
        return
    else:
        logging.info("Visit %-30s %s" % (path, name))
        done_urls.add(path)
    rsp = get(path)
    attchments = re.findall(re_attchment, rsp.text)
    if not attchments:
        logging.error("No attachment in %s" % path)
        return
    for path, name in attchments:
        for f in formats:
            if name.endswith(f):
                download(path, name)


def visit_board():
    path = "/thread-htm-fid-224-page-%d.html"
    for idx in range(0, 1):
        rsp = get(path % idx)
        logging.debug(rsp)
        for tid, name in re.findall(re_thread, rsp.text):
            visit_thread(tid, name)
        open(done_path, "w").write("\n".join(done_urls))


def main():
    visit_board()


if __name__ == "__main__":
    logging.basicConfig(
        format="%(asctime)s %(levelname)s %(filename)s:%(lineno)d %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        level=logging.DEBUG,
    )
    sys.exit(main())

    # curl 'http://bbs.feng.com/read-htm-tid-10510681.html'

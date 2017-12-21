#!/usr/bin/python
#-*- coding: UTF-8 -*-

import logging
import douban
import subprocess
from base_handlers import *

from settings import settings
from calibre.ebooks.metadata import authors_to_string
from calibre.ebooks.conversion.plumber import Plumber
from calibre.customize.conversion import OptionRecommendation, DummyReporter

BOOKNAV = (
(
u"文学", (
u"小说", u"外国文学", u"文学", u"随笔", u"中国文学", u"经典", u"散文", u"日本文学", u"村上春树",
u"童话", u"诗歌", u"王小波", u"杂文", u"张爱玲", u"儿童文学", u"余华", u"古典文学", u"名著",
u"钱钟书", u"当代文学", u"鲁迅", u"外国名著", u"诗词", u"茨威格", u"杜拉斯", u"米兰·昆德拉", u"港台",
)
),

        (
u"流行", (
u"漫画", u"绘本", u"推理", u"青春", u"言情", u"科幻", u"韩寒", u"武侠", u"悬疑",
u"耽美", u"亦舒", u"东野圭吾", u"日本漫画", u"奇幻", u"安妮宝贝", u"三毛", u"郭敬明", u"网络小说",
u"穿越", u"金庸", u"几米", u"轻小说", u"推理小说", u"阿加莎·克里斯蒂", u"张小娴", u"幾米",
u"魔幻", u"青春文学", u"高木直子", u"J.K.罗琳", u"沧月", u"落落", u"张悦然", u"古龙", u"科幻小说",
u"蔡康永",
)
),

        (
u"文化", (
u"历史", u"心理学", u"哲学", u"传记", u"文化", u"社会学", u"设计", u"艺术", u"政治",
u"社会", u"建筑", u"宗教", u"电影", u"数学", u"政治学", u"回忆录", u"思想", u"国学",
u"中国历史", u"音乐", u"人文", u"戏剧", u"人物传记", u"绘画", u"艺术史", u"佛教", u"军事",
u"西方哲学", u"二战", u"自由主义", u"近代史", u"考古", u"美术",
)
),

        (
u"生活", (
u"爱情", u"旅行", u"生活", u"励志", u"成长", u"摄影", u"心理", u"女性",
u"职场", u"美食", u"游记", u"教育", u"灵修", u"情感", u"健康", u"手工",
u"养生", u"两性", u"家居", u"人际关系", u"自助游",
)
),

        (
u"经管", (
u"经济学", u"管理", u"经济", u"金融", u"商业", u"投资", u"营销", u"理财",
u"创业", u"广告", u"股票", u"企业史", u"策划",
)
),

        (
u"科技", (
u"科普", u"互联网", u"编程", u"科学", u"交互设计", u"用户体验",
u"算法", u"web", u"科技", u"UE", u"UCD", u"通信", u"交互",
u"神经网络", u"程序",
),

),
)

import Queue, threading, functools
_q = Queue.Queue()

def background(func):
    @functools.wraps(func)
    def run(*args, **kwargs):
        def worker():
            try:
                func(*args, **kwargs)
            except:
                import traceback, logging
                logging.error('Failed to run background task:')
                logging.error(traceback.format_exc())
                logging.error("cmd: %s %s %s" % (func, args, kwargs))

        t = threading.Thread(name='worker', target=worker)
        t.setDaemon(True)
        t.start()
        #_q.put( (func, args, kwargs) )
    return run


class Index(BaseHandler):
    def get(self):
        import random
        nav = "index"
        title = _('All books')
        ids = self.cache.search_for_books('')
        if not ids: raise web.HTTPError(404, reason = _('This library has no books'))
        random_ids = random.sample(ids, 8)
        random_books = self.get_books(ids=random_ids)
        ids.sort()
        new_ids = random.sample(ids[-40:], 10)
        new_books = self.get_books(ids=new_ids)
        return self.html_page('index.html', vars())

class About(BaseHandler):
    def get(self):
        nav = "about"
        return self.html_page('about.html', vars())

class BookDetail(BaseHandler):
    def get(self, id):
        book_id = int(id)
        books = self.get_books(ids=[book_id])
        if not books:
            raise web.HTTPError(404, reason = _("Sorry, book not found") )
        book = books[0]
        book_id = book['id']
        book['is_public'] = True
        if book['publisher'] in (u'中信出版社') or u'吴晓波' in book['authors']:
            uid = self.user_id()
            cid = book['collector']['id']
            if not uid or str(uid) != str(cid):
                book['is_public'] = False
                #raise web.HTTPError(403, reason = _("Sorry, this book is not available(%d != %s)") % (cid, uid) )
        if self.is_admin():
            book['is_public'] = True
        self.user_history('visit_history', book)
        try: sizes = [ (f, self.db.sizeof_format(book_id, f, index_is_id=True)) for f in book['available_formats'] ]
        except: sizes = []
        title = book['title']
        smtp_username = tweaks['smtp_username']
        if self.user_id(): self.count_increase(book_id, count_visit=1)
        else: self.count_increase(book_id, count_guest=1)
        return self.html_page('book/detail.html', vars())

class BookUpdate(BaseHandler):
    def post(self, id):
        exam_id = self.get_argument("exam_id", None)
        if exam_id != id:
            raise web.HTTPError(403, 'Book exam id error')

        book_id = self.do_book_update(id)
        return self.redirect('/book/%d'%book_id)

    def do_book_update(self, id):
        book_id = int(id)
        mi = self.db.get_metadata(book_id, index_is_id=True)
        douban_mi = douban.get_douban_metadata(mi)
        if not douban_mi:
            return book_id
        if mi.cover_data[0]:
            douban_mi.cover_data = None
        mi.smart_update(douban_mi, replace_metadata=True)
        self.db.set_metadata(book_id, mi)
        return book_id


class BookRating(BaseHandler):
    @json_response
    def post(self, id):
        rating = self.get_argument("rating", None)
        try:
            r = float(rating)
        except:
            return {'ecode': 2, 'msg': _("rating vlaue error!")}

        book_id = int(id)
        mi = self.db.get_metadata(book_id, index_is_id=True)
        mi.rating = r
        self.db.set_metadata(book_id, mi)
        if self.user_id(): self.count_increase(book_id, count_visit=1)
        else: self.count_increase(book_id, count_guest=1)
        return {'ecode': 0, 'msg': _('update rating success')}

class BookEdit(BaseHandler):
    @json_response
    def get(self, id):
        field = self.get_argument("field", None)
        content = self.get_argument("content", None)
        if not field or not content:
            return {'ecode': 1, 'msg': _("arguments error")}

        book_id = int(id)
        mi = self.db.get_metadata(book_id, index_is_id=True)
        #if not mi.has_key(field):
            #return {'ecode': 1, 'msg': _("field not support")}
        if field == 'pubdate':
            try:
                content = datetime.datetime.strptime(content, "%Y-%m-%d")
            except:
                return {'ecode': 2, 'msg': _("date format error!")}
        elif field == 'authors':
            content = [content]
        elif field == 'tags':
            content = content.replace(" ", "").split("/")
        mi.set(field, content)
        self.db.set_metadata(book_id, mi)
        return {'ecode': 0, 'msg': _("edit OK")}

class BookDelete(BaseHandler):
    def get(self, id):
        return self.post(id)

    @web.authenticated
    def post(self, id):
        if not self.is_admin():
            self.add_msg('danger', _("Delete forbiden"))
            self.redirect("/book/%s"%id)
        else:
            self.db.delete_book(int(id))
            self.redirect("/book")

class BookDownload(BaseHandler):
    @web.authenticated
    def get(self, id, fmt):
        fmt = fmt.lower()
        logging.debug("download %s.%s" % (id, fmt))
        book_id = int(id)
        books = self.get_books(ids=[book_id])
        book = books[0]
        self.user_history('download_history', book)
        self.count_increase(book_id, count_download=1)
        if 'fmt_%s'%fmt not in book:
            raise web.HTTPError(404, reason = _('%s not found'%(fmt)) )
        path = book['fmt_%s'%fmt]
        att = u'attachment; filename="%d-%s.%s"' % (book['id'], book['title'], fmt)
        self.set_header('Content-Disposition', att.encode('UTF-8'))
        self.set_header('Content-Type', 'application/octet-stream')
        f = open(path, 'rb').read()
        self.write( f )

class BookList(ListHandler):
    def get(self):
        title = _('All books')
        category_name = 'books'
        tags = self.db.all_tags_with_count()
        tagmap = dict( (v[1], v[2]) for v in tags )
        navs = []
        for h1, tags in BOOKNAV:
            tags = list( (v, tagmap.get(v, 0)) for v in tags )
            #tags.sort( lambda x,y: cmp(y[1], x[1]) )
            navs.append( (h1, tags) )

        return self.html_page('book/all.html', vars())
        ids = self.search_cache('')
        books = self.get_books(ids=ids)
        return self.render_book_list(books, vars());

class RecentBook(ListHandler):
    def get(self):
        title = _('Recent updates') % vars()
        category = "recents"
        ids = self.cache.search_for_books('')
        books = self.get_books(ids=ids)
        return self.render_book_list(books, vars());

class SearchBook(ListHandler):
    def get(self):
        name = self.get_argument("name", None)
        title = _('Search for: %(name)s') % vars()
        ids = self.cache.search_for_books(name)
        books = self.get_books(ids=ids)
        search_query = name
        return self.render_book_list(books, vars());

class HotBook(ListHandler):
    def get(self):
        title = _('Hot Books')
        db_items = self.session.query(Item).order_by(Item.count_visit.desc())
        count = db_items.count()
        start = self.get_argument("start", 0)
        try: start = int(start)
        except: start = 0
        delta = 20
        page_max = count / delta
        page_now = start / delta
        pages = []
        for p in range(page_now-4, page_now+4):
            if 0 <= p and p <= page_max:
                pages.append(p)
        items = db_items.limit(delta).offset(start).all()
        ids = [ item.book_id for item in items ]
        books = self.get_books(ids=ids)
        self.do_sort(books, 'count_visit', False)
        return self.html_page('book/list.html', vars())

class BookAdd(BaseHandler):
    @web.authenticated
    def get(self):
        title = _('Upload Book')
        return self.html_page('book/add.html', vars())


class BookUpload(BaseHandler):
    @web.authenticated
    def post(self):
        def convert(s):
            try: return s.group(0).encode('latin1').decode('utf8')
            except: return s.group(0)

        import re
        from calibre.ebooks.metadata import MetaInformation
        postfile = self.request.files['ebook_file'][0]
        name = postfile['filename']
        name = re.sub(r'[\x80-\xFF]+', convert, name)
        logging.error('upload book name = ' + repr(name))
        fmt = os.path.splitext(name)[1]
        fmt = fmt[1:] if fmt else None
        if not fmt:
            return "bad file name: %s" % name
        fmt = fmt.lower()

        # save file
        data = postfile['body']
        fpath = os.path.join(settings['upload_path'], name)
        with open(fpath, "wb") as f:
            f.write(data)

        # read ebook meta
        stream = open(fpath, 'rb')
        mi = get_metadata(stream, stream_type=fmt, use_libprs_metadata=True)
        if fmt.lower() == "txt":
            mi.title = name.replace(".txt", "")
            mi.authors = [_('Unknown')]
        logging.error('upload mi = ' + repr(mi.title))
        books = self.db.books_with_same_title(mi)
        if books:
            book_id = books.pop()
            return self.redirect('/book/%d'%book_id)

        fpaths = [fpath]
        self.generate_books(mi, fpath, fmt)
        book_id = self.db.import_book(mi, fpaths )
        self.user_history('upload_history', {'id': book_id, 'title': mi.title})
        self.add_msg('success', _("import books success"))
        item = Item()
        item.book_id = book_id
        item.collector_id = self.user_id()
        item.save()
        return self.redirect('/book/%d'%book_id)

    @background
    def generate_books(self, mi, fpath, fmt):
        # convert another format
        new_fmt = {'epub': 'mobi', 'mobi': 'epub'}.get(fmt, "epub")
        new_path = '/tmp/calibre-tmp.'+new_fmt
        log = Log()
        plumber = Plumber(fpath, new_path, log)
        plumber.run()
        self.db.add_books([new_path], [new_fmt], mi, add_duplicates=False)

class BookRead(BaseHandler):
    @web.authenticated
    def get(self, id):
        book_id = int(id)
        books = self.get_books(ids=[book_id])
        if not books:
            raise web.HTTPError(404, reason = _("Sorry, book not found") )
        book = books[0]
        self.user_history('read_history', book)
        self.count_increase(book_id, count_download=1)

        # check format
        for fmt in ['epub', 'mobi', 'azw', 'azw3', 'txt']:
            fpath = book.get("fmt_%s" % fmt, None)
            if fpath:
                epub_dir = os.path.dirname(fpath).replace(settings['with_library'], "/extract/")
                self.extract_book(book, fpath, fmt)
                return self.html_page('book/read.html', vars())
        self.add_msg('success', _("Sorry, online-reader do not support this book."))
        self.redirect('/book/%d'%book_id)

    @background
    def extract_book(self, book, fpath, fmt):
        fdir = os.path.dirname(fpath).replace(settings['with_library'], settings['extract_path'])
        subprocess.call(['mkdir', '-p', fdir])
        #fdir = os.path.dirname(fpath) + "/extract"
        if os.path.isfile(fdir+"/META-INF/container.xml"):
            subprocess.call(["chmod", "a+rx", "-R", fdir + "/META-INF"])
            return

        new_path = ""
        if fmt != "epub":
            new_fmt = "epub"
            new_path = os.path.join(settings["convert_path"], 'book-%s-%s.%s'%(book['id'], int(time.time()), new_fmt) )
            logging.error('convert book: %s => %s' % ( fpath, new_path));
            log = Log()
            plumber = Plumber(fpath, new_path, log)
            recommendations = [ ('flow_size', 15, OptionRecommendation.HIGH) ]
            plumber.merge_ui_recommendations(recommendations)
            plumber.run()
            self.db.add_format(book['id'], new_fmt, open(new_path, "rb"), index_is_id=True)
            fpath = new_path

        # extract to dir
        logging.error('extract book: %s' % fpath)
        subprocess.call(["unzip", fpath, "-d", fdir])
        subprocess.call(["chmod", "a+rx", "-R", fdir+ "/META-INF"])
        if new_path: subprocess.call(["rm", new_fpath])
        return


class BookPush(BaseHandler):
    @web.authenticated
    def post(self, id):
        mail_to = self.get_argument("mail_to", None)
        if not mail_to:
            return self.redirect("/setting")

        book_id = int(id)
        books = self.get_books(ids=[book_id])
        if not books:
            raise web.HTTPError(404, reason = _("Sorry, book not found") )
        book = books[0]
        self.user_history('push_history', book)
        self.count_increase(book_id, count_download=1)

        # check format
        for fmt in ['mobi', 'azw', 'pdf']:
            fpath = book.get("fmt_%s" % fmt, None)
            if fpath:
                self.do_send_mail(book, mail_to, fmt, fpath)
                self.add_msg( "success", _("Server is pushing book."))
                return self.redirect("/book/%d"%book['id'])

        # we do no have formats for kindle
        if 'fmt_epub' not in book and 'fmt_azw3' not in book and 'fmt_txt' not in book:
            raise web.HTTPError(404, reason = _("Sorry, there's no available format for kindle"))
        self.convert_book(book, mail_to)
        self.add_msg( "success", _("Server is pushing book."))
        self.redirect("/book/%d"%book['id'])

    @background
    def convert_book(self, book, mail_to=None):
        fmt = 'mobi'
        fpath = os.path.join(settings['convert_path'], '%s.%s' % (ascii_filename(book['title']), fmt) )
        log = Log()
        plumber = Plumber(book['fmt_epub'], fpath, log)
        plumber.run()
        self.db.add_format(book['id'], fmt, open(fpath, "rb"), index_is_id=True)
        if mail_to:
            self.do_send_mail(book, mail_to, fmt, fpath)
        return

    @background
    def do_send_mail(self, book, mail_to, fmt, fpath):
        # read meta info
        author = authors_to_string(book['authors'] if book['authors'] else [_('Unknown')])
        title = book['title'] if book['title'] else _("No Title")
        fname = u'%s - %s.%s'%(title, author, fmt)
        fdata = open(fpath).read()

        mail_from = tweaks['smtp_username']
        mail_subject = _('奇异书屋：推送给您一本书《%(title)s》') % vars()
        mail_body = _(u'为您奉上一本《%(title)s》, 欢迎常来访问奇异书屋！http://www.talebook.org' % vars())
        status = msg = ""
        try:
            logging.info('send %(title)s to %(mail_to)s' % vars())
            mail = self.create_mail(mail_from, mail_to, mail_subject,
                    mail_body, fdata, fname)
            sendmail(mail, from_=mail_from, to=[mail_to], timeout=30,
                    relay=tweaks['smtp_server'],
                    username=tweaks['smtp_username'],
                    password=tweaks['smtp_password']
                    )
            status = "success"
            msg = _('Send [%(title)s] to [%(mail_to)s] success!!') % vars()
            logging.info(msg)
        except:
            import traceback
            logging.error('Failed to send to kindle:')
            logging.error(traceback.format_exc())
            status = "danger"
            msg = traceback.format_exc()
        self.add_msg(status, msg)
        return

    def create_mail(self, sender, to, subject, body, attachment_data, attachment_name):
        from email.header import Header
        from email.utils import formatdate
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        from email.mime.application import MIMEApplication
        def get_md5(s):
            import hashlib
            md5 = hashlib.md5()
            md5.update(s)
            return md5.hexdigest()

        mail = MIMEMultipart()
        mail['From'] = sender
        mail['To'] = to
        mail['Subject'] = Header(subject, 'utf-8')
        mail['Date'] = formatdate(localtime=True)
        mail['Message-ID'] = '<tencent_%s@qq.com>' % get_md5(mail.as_string())
        mail.preamble = 'You will not see this in a MIME-aware mail reader.\n'

        if body is not None:
            msg = MIMEText(body, 'plain', 'utf-8')
            mail.attach(msg)

        if attachment_data is not None:
            name = Header(attachment_name, 'utf-8').encode()
            msg = MIMEApplication(attachment_data, 'octet-stream', charset='utf-8', name=name)
            msg.add_header('Content-Disposition', 'attachment', filename=name)
            mail.attach(msg)
        return mail.as_string()



def routes():
    return [
        ( r'/',                     Index        ),
        ( r'/about',                About        ),
        ( r'/search',               SearchBook   ),
        ( r'/recent',               RecentBook   ),
        ( r'/hot',                  HotBook      ),
        ( r'/book',                 BookList     ),
        ( r'/book/add',             BookAdd      ),
        ( r'/book/upload',          BookUpload   ),
        ( r'/book/([0-9]+)/delete', BookDelete   ),
        ( r'/book/([0-9]+)/edit',   BookEdit     ),
        ( r'/book/([0-9]+)/update', BookUpdate   ),
        ( r'/book/([0-9]+)/rating', BookRating   ),
        ( r'/book/([0-9]+)\.(.+)',  BookDownload ),
        ( r'/book/([0-9]+)/push',   BookPush     ),
        ( r'/book/([0-9]+)/read',   BookRead     ),
        ( r'/book/([0-9]+)',        BookDetail   ),
        ]

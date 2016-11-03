#!/usr/bin/python2.7
# vim:fileencoding=UTF-8:ts=4:sw=4:sta:et:sts=4:ai

__license__   = 'GPL v3'
__copyright__ = '2010, Kovid Goyal <kovid@kovidgoyal.net>'
__docformat__ = 'restructuredtext en'

import re, os, posixpath, cherrypy, cgi, tempfile, logging, sys, json, time, subprocess, datetime, urllib
from functools import wraps
from calibre.ebooks.metadata.meta import get_metadata

from urllib import urlencode
from calibre import fit_image, guess_type
from calibre.utils.config import tweaks
from calibre.utils.date import fromtimestamp
from calibre.utils.smtp import sendmail, create_mail
from calibre.utils.logging import Log
from calibre.utils.filenames import ascii_filename
from calibre.utils.magick.draw import (save_cover_data_to, Image,
        thumbnail as generate_thumbnail)
from calibre.ebooks.metadata.opf2 import metadata_to_opf
from calibre.ebooks.metadata.meta import set_metadata
from calibre.ebooks.metadata import authors_to_string
from calibre.ebooks.conversion.plumber import Plumber
from calibre.library.caches import SortKeyGenerator
from calibre.library.save_to_disk import find_plugboard
from calibre.customize.conversion import OptionRecommendation, DummyReporter
from jinja2 import Environment, FileSystemLoader
from webserver.auth import Reader

import douban
from utils import background
from collections import defaultdict

plugboard_content_server_value = 'content_server'
plugboard_content_server_formats = ['epub']

messages = defaultdict(list)

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

def day_format(value, format='%Y-%m-%d'):
    try:
        return value.strftime(format)
    except:
        return "1990-01-01"

def csrf_protect(func):
    def do(*args, **kwargs):
        rtk = kwargs.pop('csrf_token', None)
        token = cherrypy.session.get('csrf_token', None)
        if not token or token != rtk:
            raise cherrypy.HTTPError(403, _('Invalid CSRF Token. Please refresh the web page.'))
        ans = func(*args, **kwargs);
        cherrypy.response.cookie['_csrf_token'] = generate_csrf_token
    return do

def generate_csrf_token():
    import uuid
    ttl = cherrypy.session.get('csrf_ttl', 0)
    if ttl < 2 or 'csrf_token' not in cherrypy.session:
        cherrypy.session['csrf_token'] = uuid.uuid4().hex
        cherrypy.session['csrf_ttl'] = 32
    return cherrypy.session['csrf_token']

def ttl_live(func):
    @wraps(func)
    def do(*args, **kwargs):
        cherrypy.session['session_ttl'] = 12
        return func(*args, **kwargs);
    return do

def ttl_dead(func):
    @wraps(func)
    def do(*args, **kwargs):
        ttl = cherrypy.session.get('session_ttl', 0)
        cherrypy.session['session_ttl'] = ttl - 1
        if ttl < 2:
            raise cherrypy.HTTPError(403, _('Please re-visit the web page.'))
        return func(*args, **kwargs);
    return do

def should_login(func):
    @wraps(func)
    def do(*args, **kwargs):
        uid = cherrypy.request.user_id
        scheme = request.headers.get('X-Scheme', request.scheme)
        url = '/login'
        url = scheme + "://" + cherrypy.config['site_domain'] + '/login?'+urlencode({'from':cherrypy.request.wsgi_environ['REQUEST_URI']})
        cherrypy.session['next'] = cherrypy.request.wsgi_environ['REQUEST_URI']
        if not uid: raise cherrypy.HTTPRedirect(url, 302)
        return func(*args, **kwargs)
    return do

def user_history(action, book):
    if not cherrypy.request.user: return
    extra = cherrypy.request.user.extra
    history = extra.get(action, [])
    for val in history[:12]:
        if val['id'] == book['id']:
            return
    val = {
        'id': book['id'],
        'title': book['title'],
        'timestamp': int(time.time()),
    }
    history.insert(0, val)
    extra[action] = history[:200]
    cherrypy.request.user.extra.update(extra)
    cherrypy.request.user.save()


def add_msg(status, msg):
    uid = cherrypy.request.user_id
    messages[uid].append( {'status': status, 'msg': msg})

def build_jinja2_env():
    loader = FileSystemLoader(sys.template_location)
    env = Environment(loader=loader, extensions=['jinja2.ext.i18n'])
    env.install_gettext_callables(_, _, newstyle=False)
    env.filters['day'] = day_format
    env.globals['csrf_token'] = generate_csrf_token
    return env

def JsonResponse(func):
    def do(*args, **kwrags):
        rsp = func(*args, **kwargs)
        return json.dumps(rsp)
    return do

class HtmlServer(object):
    '''
    Handles actually serving content files/covers/metadata. Also has
    a few utility methods.
    '''
    def add_routes(self, connect):
        connect( '/',                       self.index)
        connect( '/about',                  self.about)
        connect( '/login',                  self.html_login)
        connect( '/logout',                 self.html_logout)
        connect( '/book',                   self.book_list)
        connect( '/book/add',               self.book_add)
        connect( '/book/upload',            self.book_upload)
        connect( '/book/{id}/delete',       self.book_delete)
        connect( '/book/{id}/edit',         self.book_edit)
        connect( '/book/{id}/update',       self.book_update)
        connect( '/book/{id}/rating',       self.book_rating)
        connect( '/book/{id}.{fmt}',        self.book_download)
        connect( '/book/{id}/push',         self.book_push)
        connect( '/book/{id}/read',         self.book_read)
        connect( '/book/{id}',              self.book_detail)
        connect( '/author',                 self.author_list)
        connect( '/author/{name}',          self.author_detail)
        connect( '/author/{name}/update',   self.author_books_update)
        connect( '/tag',                    self.tag_list)
        connect( '/tag/{name}',             self.tag_detail)
        connect( '/pub',                    self.pub_list)
        connect( '/pub/{name}',             self.pub_detail)
        connect( '/pub/{name}/update',      self.pub_books_update)
        connect( '/rating',                 self.rating_list)
        connect( '/rating/{name}',          self.rating_detail)
        connect( '/search',                 self.search_book)
        connect( '/recent',                 self.recent_book)
        connect( '/debug',                  self.html_debug)
        connect( '/setting',                self.setting_view)
        connect( '/setting/save',           self.setting_save)
        connect( '/user',                   self.user_view)
        connect( '/admin',                  self.admin_view)
        connect( '/admin/set',              self.admin_set)

        connect( '/get/{fmt}/{id}',         self.get,
                conditions=dict(method=["GET", "HEAD"]))
        connect( '/static/{name:.*?}',      self.static,
                conditions=dict(method=["GET", "HEAD"]))

    def html_debug(self, **kwargs):
        from pprint import *
        vals = {}
        for key in dir(cherrypy.request):
            if '__' in key: continue
            vals[key] = getattr(cherrypy.request, key)
        vals['social_auth'] = cherrypy.request.user.social_auth
        vals['social_auth_dir'] = dir(cherrypy.request.user.social_auth)
        return "<pre>"+pformat(vals) + "</pre>";

    def html_page(self, template, *args, **kwargs):
        global messages
        url_prfix = self.opts.url_prefix
        db = self.db
        request = cherrypy.request
        hostname = request.headers['Host']
        M = "//" + cherrypy.config['js_domain'] + "/static/m"
        IMG = "//" + cherrypy.config['img_domain']
        READ = "//" + cherrypy.config['read_domain']
        FILE = "//" + cherrypy.config['file_domain']
        vals = dict(*args, **kwargs)
        vals.update( vars() )
        uid = cherrypy.request.user_id
        if uid in messages:
            vals['messages'] = messages.pop(uid)
        cherrypy.tools.jinja2env.install_gettext_callables(_, _, newstyle=False)
        ans = cherrypy.tools.jinja2env.get_template(template).render(vals)

        cherrypy.response.headers['Content-Type'] = 'text/html; charset=utf-8'
        cherrypy.response.headers['Cache-Control'] = 'max-age=2'
        #updated = self.db.last_modified()
        #cherrypy.response.headers['Last-Modified'] = \
                #self.last_modified(max(updated, self.build_time))
        if isinstance(ans, unicode):
            ans = ans.encode('utf-8')
        return ans

    def html_login(self, **kwrags):
        cherrypy.session['next'] = cherrypy.request.headers.get('Referer', '/')
        return self.html_page('content_server/login.html', vars())

    def html_logout(self, **kwrags):
        cherrypy.session['user_id'] = None
        raise cherrypy.HTTPRedirect('/', 302)

    def setting_view(self, **kwrags):
        user = cherrypy.request.user
        return self.html_page('content_server/setting/view.html', vars())

    @should_login
    @cherrypy.expose
    @cherrypy.tools.allow(methods=['POST'])
    def setting_save(self, **kwargs):
        user = cherrypy.request.user
        modify = user.extra
        for key in ['kindle_email']:
            if key in kwargs:
                modify[key] = kwargs[key]
        if modify:
            user.extra.update(modify)
            user.update_time = datetime.datetime.now()
            user.save()
            add_msg("success", _("Settings saved."))
        else:
            add_msg("info", _("Nothing changed."))
        raise cherrypy.HTTPRedirect('/setting', 302)


    def index(self, **kwargs):
        'The / URL'
        cherrypy.session['next'] = '/';
        ua = cherrypy.request.headers.get('User-Agent', '').strip()
        want_opds = \
            cherrypy.request.headers.get('Stanza-Device-Name', 919) != 919 or \
            cherrypy.request.headers.get('Want-OPDS-Catalog', 919) != 919 or \
            ua.startswith('Stanza')

        if want_opds:
            return self.opds(version=0)
        return self.html_index()

    def do_sort(self, items, field, order):
        items.sort(cmp=lambda x,y: cmp(x[field], y[field]), reverse=not order)

    def sort_books(self, items, field):
        self.do_sort(items, 'title', True)
        fm = self.db.field_metadata
        keys = frozenset(fm.sortable_field_keys())
        if field in keys:
            ascending = fm[field]['datatype'] not in ('rating', 'datetime', 'series', 'timestamp')
            self.do_sort(items, field, ascending)
        return None

    @cherrypy.expose
    def search_book(self, name=None, start=0, sort='title'):
        title = _('Search for: %(name)s') % vars()
        ids = self.search_for_books(name)
        books = self.db.get_data_as_dict(ids=ids)
        return self.render_book_list(books, start, sort, vars());

    def about(self):
        nav = "about"
        return self.html_page('content_server/about.html', vars())

    def html_index(self):
        import random
        title = _('All books')
        ids = self.search_for_books('')
        if not ids:
            raise cherrypy.HTTPError(404, 'This library has no books')
        random_ids = random.sample(ids, 4)
        random_books = self.db.get_data_as_dict(ids=random_ids)
        ids.sort()
        new_ids = random.sample(ids[-40:], 8)
        new_books = self.db.get_data_as_dict(ids=new_ids)
        return self.html_page('content_server/index.html', vars())

    @cherrypy.expose
    def book_list(self, start=0, sort='title'):
        title = _('All books')
        category_name = 'books'
        tags = self.db.all_tags_with_count()
        tagmap = dict( (v[1], v[2]) for v in tags )
        navs = []
        for h1, tags in BOOKNAV:
            tags = list( (v, tagmap.get(v, 0)) for v in tags )
            #tags.sort( lambda x,y: cmp(y[1], x[1]) )
            navs.append( (h1, tags) )

        return self.html_page('content_server/book/all.html', vars())
        ids = self.search_cache('')
        books = self.db.get_data_as_dict(ids=ids)
        return self.render_book_list(books, start, sort, vars());

    @cherrypy.expose
    def recent_book(self, start=0, sort='timestamp', **kwargs):
        title = _('Recent updates') % vars()
        category = "recents"
        ids = self.search_for_books('')
        books = self.db.get_data_as_dict(ids=ids)
        return self.render_book_list(books, start, sort, vars());

    def render_book_list(self, all_books, start, sort, vars_):
        try: start = int(start)
        except: start = 0
        self.sort_books(all_books, sort)
        delta = 20
        page_max = len(all_books) / delta
        page_now = start / delta
        pages = []
        for p in range(page_now-4, page_now+4):
            if 0 <= p and p <= page_max:
                pages.append(p)
        books = all_books[start:start+delta]
        vars_.update(vars())
        return self.html_page('content_server/book/list.html', vars_)

    @ttl_live
    def book_detail(self, id, status="", msg=""):
        book_id = int(id)
        books = self.db.get_data_as_dict(ids=[book_id])
        if not books:
            raise cherrypy.HTTPError(404, 'book not found')
        book = books[0]
        user_history('visit_history', book)
        try: sizes = [ (f, self.db.sizeof_format(book['id'], f, index_is_id=True)) for f in book['available_formats'] ]
        except: sizes = []
        title = book['title']
        smtp_username = tweaks['smtp_username']
        return self.html_page('content_server/book/detail.html', vars())

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

    @cherrypy.expose
    @cherrypy.tools.allow(methods=['POST'])
    def book_update(self, id, exam_id):
        if exam_id != id:
            raise cherrypy.HTTPError(403, 'Book exam id error')

        book_id = self.do_book_update(id)
        raise cherrypy.HTTPRedirect('/book/%d'%book_id, 302)

    @cherrypy.expose
    @cherrypy.tools.allow(methods=['POST'])
    def book_rating(self, id, rating):
        try:
            r = int(rating)
        except:
            return json.dumps({'ecode': 2, 'msg': _("rating vlaue error!")})

        book_id = int(id)
        mi = self.db.get_metadata(book_id, index_is_id=True)
        mi.rating = r
        self.db.set_metadata(book_id, mi)
        return json.dumps({'ecode': 0, 'msg': _('update rating success')})

    @cherrypy.expose
    def book_edit(self, id, field, content):
        book_id = int(id)
        mi = self.db.get_metadata(book_id, index_is_id=True)
        #if not mi.has_key(field):
            #return json.dumps({'ecode': 1, 'msg': _("field not support")})
        if field == 'pubdate':
            try:
                content = datetime.datetime.strptime(content, "%Y-%m-%d")
            except:
                return json.dumps({'ecode': 2, 'msg': _("date format error!")})
        elif field == 'authors':
            content = [content]
        elif field == 'tags':
            content = content.replace(" ", "").split("/")
        mi.set(field, content)
        self.db.set_metadata(book_id, mi)
        return json.dumps({'ecode': 0, 'msg': _("edit OK")})

    @should_login
    #@cherrypy.tools.allow(methods=['POST'])
    def book_delete(self, id):
        if not cherrypy.request.user.is_admin():
            add_msg('danger', _("Delete forbiden"))
            raise cherrypy.HTTPRedirect("/book/%s"%id, 302)
        else:
            self.db.delete_book(int(id))
            raise cherrypy.HTTPRedirect("/book", 302)

    #@ttl_dead
    @should_login
    def book_download(self, id, fmt):
        fmt = fmt.lower()
        book_id = int(id)
        books = self.db.get_data_as_dict(ids=[book_id])
        book = books[0]
        user_history('download_history', book)
        if 'fmt_%s'%fmt not in book:
            raise cherrypy.HTTPError(404, '%s not found'%(fmt))
        path = book['fmt_%s'%fmt]
        att = u'attachment; filename="%d-%s.%s"' % (book['id'], book['title'], fmt)
        cherrypy.response.headers['Content-Disposition'] = att.encode('UTF-8')
        cherrypy.response.headers['Content-Type'] = 'application/octet-stream'
        with open(path, 'rb') as f:
            ans = f.read()
        return ans;

    def book_add(self, file_input_name="ebook_file"):
        title = _('Upload Book')
        return self.html_page('content_server/book/add.html', vars())


    @should_login
    @cherrypy.expose
    def book_upload(self, ebook_file=None, generate_fmt=False):
        from calibre.ebooks.metadata import MetaInformation
        cherrypy.response.timeout = 3600

        name = ebook_file.filename

        def convert(s):
            try:
                return s.group(0).encode('latin1').decode('utf8')
            except:
                return s.group(0)

        import re
        name = re.sub(r'[\x80-\xFF]+', convert, name)
        cherrypy.log.error('upload name = ' + repr(name))
        fmt = os.path.splitext(name)[1]
        fmt = fmt[1:] if fmt else None
        if not fmt:
            return "bad file name: %s" % name
        fmt = fmt.lower()

        # save file
        data = ''
        while True:
            d = ebook_file.file.read(8192)
            data += d
            if not d: break;

        fpath = "/tmp/" + name
        open(fpath, "wb").write(data)

        # read ebook meta
        stream = open(fpath, 'rb')
        mi = get_metadata(stream, stream_type=fmt, use_libprs_metadata=True)
        if fmt.lower() == "txt":
            mi.title = name.replace(".txt", "")
            mi.authors = [_('Unknown')]
        cherrypy.log.error('upload mi = ' + repr(mi.title))
        books = self.db.books_with_same_title(mi)
        if books:
            book_id = books.pop()
            raise cherrypy.HTTPRedirect('/book/%d'%book_id)

        fpaths = [fpath]
        self.generate_books(mi, fpath, fmt)
        book_id = self.db.import_book(mi, fpaths )
        user_history('upload_history', {'id': book_id, 'title': mi.title})
        add_msg('success', _("import books success"))
        raise cherrypy.HTTPRedirect('/book/%d'%book_id)

    @background
    def generate_books(self, mi, fpath, fmt):
        # convert another format
        new_fmt = {'epub': 'mobi', 'mobi': 'epub'}.get(fmt, "epub")
        new_path = '/tmp/calibre-tmp.'+new_fmt
        log = Log()
        plumber = Plumber(fpath, new_path, log)
        plumber.run()
        self.db.add_books([new_path], [new_fmt], mi, add_duplicates=False)

    def tag_list(self):
        title = _('All tags')
        category = "tags"
        tags = self.db.all_tags_with_count()
        hot_tags = []
        for tag in tags:
            if tag[2] < 5: continue
            hot_tags.append( tag )
        hot_tags.sort(lambda x,y: cmp(y[2], x[2]))
        tags = hot_tags
        return self.html_page('content_server/tag/list.html', vars())

    @cherrypy.expose
    def tag_detail(self, name, start=0, sort="title"):
        title = _('Books of tag: %(name)s') % vars()
        category = "tags"
        tag_id = self.db.get_tag_id(name)
        ids = books = []
        if tag_id:
            ids = self.db.get_books_for_category(category, tag_id)
            books = self.db.get_data_as_dict(ids=ids)
        return self.render_book_list(books, start, sort, vars());

    def author_list(self):
        title = _('All authors')
        category = "authors"
        authors = self.db.all_authors()
        authors.sort(cmp=lambda x,y: cmp(ascii_filename(x[1]).lower(), ascii_filename(y[1]).lower()))
        authors.sort(cmp=lambda x,y: cmp(x[1], y[1]))
        return self.html_page('content_server/author/list.html', vars())

    @cherrypy.expose
    def author_detail(self, name, start=0, sort="title"):
        title = _('Books of author: %(name)s') % vars()
        category = "authors"
        ids = books = []
        author_id = self.db.get_author_id(name)
        if author_id:
            ids = self.db.get_books_for_category(category, author_id)
            books = self.db.get_data_as_dict(ids=ids)
        return self.render_book_list(books, start, sort, vars());

    @cherrypy.expose
    @cherrypy.tools.allow(methods=['POST'])
    def author_books_update(self, name):
        cherrypy.response.timeout = 3600
        category = "authors"
        author_id = self.db.get_author_id(name)
        ids = self.db.get_books_for_category(category, author_id)
        for book_id in list(ids)[:40]:
            self.do_book_update(book_id)
        raise cherrypy.HTTPRedirect('/author/%s'%name, 302)

    def pub_list(self):
        title = _('All publishers')
        category = "publisher"
        publishers = self.db.all_publishers()
        return self.html_page('content_server/publisher/list.html', vars())

    @cherrypy.expose
    def pub_detail(self, name, start=0, sort="title"):
        title = _('Books of publisher: %(name)s') % vars()
        category = "publisher"
        publisher_id = self.db.get_publisher_id(name)
        if publisher_id:
            ids = self.db.get_books_for_category(category, publisher_id)
            books = self.db.get_data_as_dict(ids=ids)
        else:
            ids = self.search_for_books('')
            books = self.db.get_data_as_dict(ids=ids)
            books = [ b for b in books if not b['publisher'] ]
        return self.render_book_list(books, start, sort, vars());

    @cherrypy.expose
    def pub_books_update(self, name):
        cherrypy.response.timeout = 3600
        category = "publisher"
        publisher_id = self.db.get_publisher_id(name)
        if publisher_id:
            ids = self.db.get_books_for_category(category, publisher_id)
        else:
            ids = self.search_for_books('')
            books = self.db.get_data_as_dict(ids=ids)
            ids = [ b['id'] for b in books if not b['publisher'] ]
        for book_id in list(ids)[:40]:
            self.do_book_update(book_id)
        raise cherrypy.HTTPRedirect('/pub/%s'%name, 302)

    def rating_list(self):
        title = _('All ratings')
        category = "rating"
        ratings = self.db.all_ratings()
        ratings.sort(cmp=lambda x,y: cmp(x[1], y[1]))
        return self.html_page('content_server/rating/list.html', vars())

    @cherrypy.expose
    def rating_detail(self, name, start=0, sort="title"):
        title = _('Books of rating: %(name)s') % vars()
        category = "rating"
        ids = books = []
        rating_id = self.db.get_rating_id(name)
        if rating_id:
            ids = self.db.get_books_for_category(category, rating_id)
            books = self.db.get_data_as_dict(ids=ids)
        return self.render_book_list(books, start, sort, vars());

    @should_login
    @cherrypy.expose
    @cherrypy.tools.allow(methods=['POST'])
    def book_push(self, id, mail_to=None):
        if not mail_to:
            raise cherrypy.HTTPRedirect("/setting", 302)

        book_id = int(id)
        books = self.db.get_data_as_dict(ids=[book_id])
        if not books:
            raise cherrypy.HTTPError(404, _("Sorry, book not found") )
        book = books[0]
        user_history('push_history', book)

        # check format
        for fmt in ['mobi', 'azw', 'pdf']:
            fpath = book.get("fmt_%s" % fmt, None)
            if fpath:
                self.do_send_mail(book, mail_to, fmt, fpath)
                add_msg( "success", _("Server is pushing book."))
                raise cherrypy.HTTPRedirect("/book/%d"%book['id'], 302)
        # we do no have formats for kindle
        if 'fmt_epub' not in book:
            raise cherrypy.HTTPError(404, _("Sorry, there's no available format for kindle"))
        self.convert_book(book, mail_to)
        add_msg( "success", _("Server is pushing book."))
        raise cherrypy.HTTPRedirect("/book/%d"%book['id'], 302)

    @should_login
    @cherrypy.expose
    def book_read(self, id, **kwrags):
        book_id = int(id)
        books = self.db.get_data_as_dict(ids=[book_id])
        if not books:
            raise cherrypy.HTTPError(404, _("Sorry, book not found") )
        book = books[0]
        user_history('read_history', book)

        # check format
        for fmt in ['epub', 'mobi', 'azw', 'azw3', 'txt']:
            fpath = book.get("fmt_%s" % fmt, None)
            if fpath:
                epub_dir = os.path.dirname(fpath).replace("/data/books/library", "/extract")
                self.extract_book(book, fpath, fmt)
                return self.html_page('content_server/book/read.html', vars())
        add_msg('success', _("Sorry, online-reader do not support this book."))
        raise cherrypy.HTTPRedirect('/book/%d'%book_id)

    @background
    def extract_book(self, book, fpath, fmt):
        fdir = os.path.dirname(fpath).replace("/data/books/library", "/data/books/extract")
        subprocess.call(['mkdir', '-p', fdir])
        #fdir = os.path.dirname(fpath) + "/extract"
        if os.path.isfile(fdir+"/META-INF/container.xml"):
            subprocess.call(["chmod", "a+rx", "-R", fdir + "/META-INF"])
            return

        if fmt != "epub":
            new_fmt = "epub"
            new_path = '/tmp/calibre-tmp-%s-%s.%s'%(book['id'], int(time.time()), new_fmt)
            cherrypy.log.error('convert book: %s => %s' % ( fpath, new_path));
            log = Log()
            plumber = Plumber(fpath, new_path, log)
            recommendations = [ ('flow_size', 15, OptionRecommendation.HIGH) ]
            plumber.merge_ui_recommendations(recommendations)
            plumber.run()
            self.db.add_format(book['id'], new_fmt, open(new_path, "rb"), index_is_id=True)
            fpath = new_path

        # extract to dir
        cherrypy.log.error('extract book: %s' % fpath)
        subprocess.call(["unzip", fpath, "-d", fdir])
        subprocess.call(["chmod", "a+rx", "-R", fdir+ "/META-INF"])
        subprocess.call(["rm", fpath])
        return


    @background
    def convert_book(self, book, mail_to=None):
        fmt = 'mobi'
        fpath = '/tmp/%s.%s' % (ascii_filename(book['title']), fmt)
        log = Log()
        plumber = Plumber(book['fmt_epub'], fpath, log)
        plumber.run()
        self.db.add_format(book['id'], fmt, open(fpath, "rb"), index_is_id=True)
        if mail_to:
            self.do_send_mail(book, mail_to, fmt, fpath)
        return

    @background
    def do_send_mail(self, book, mail_to, fmt, fpath):
        body = open(fpath).read()

        # read meta info
        author = authors_to_string(book['authors'] if book['authors'] else [_('Unknown')])
        title = book['title'] if book['title'] else _("No Title")
        fname = u'%s - %s.%s'%(title, author, fmt)
        fname = ascii_filename(fname).replace('"', '_')

        # content type
        mt = guess_type('dummy.'+fmt)[0]
        if mt is None:
            mt = 'application/octet-stream'

        # send mail
        mail_from = tweaks['smtp_username']
        mail_subject = _('Book from Calibre: %(title)s') % vars()
        mail_body = _('We Send this book to your kindle.')
        status = msg = ""
        try:
            cherrypy.log.error('send %(title)s to %(mail_to)s' % vars())
            msg = create_mail(mail_from, mail_to, mail_subject,
                    text = mail_body, attachment_data = body,
                    attachment_type = mt, attachment_name = fname
                    )
            sendmail(msg, from_=mail_from, to=[mail_to], timeout=30,
                    relay=tweaks['smtp_server'],
                    username=tweaks['smtp_username'],
                    password=tweaks['smtp_password']
                    )
            status = "success"
            msg = _('%(title)s: Send to kindle success!! email: %(mail_to)s') % vars()
            cherrypy.log.error(msg)
        except:
            import traceback
            cherrypy.log.error('Failed to send to kindle:')
            cherrypy.log.error(traceback.format_exc())
            status = "danger"
            msg = traceback.format_exc()
        add_msg(status, msg)
        return


    # Utility methods {{{
    def last_modified(self, updated):
        '''
        Generates a locale independent, english timestamp from a datetime
        object
        '''
        lm = updated.strftime('day, %d month %Y %H:%M:%S GMT')
        day ={0:'Sun', 1:'Mon', 2:'Tue', 3:'Wed', 4:'Thu', 5:'Fri', 6:'Sat'}
        lm = lm.replace('day', day[int(updated.strftime('%w'))])
        month = {1:'Jan', 2:'Feb', 3:'Mar', 4:'Apr', 5:'May', 6:'Jun', 7:'Jul',
                 8:'Aug', 9:'Sep', 10:'Oct', 11:'Nov', 12:'Dec'}
        return lm.replace('month', month[updated.month])

    def get(self, fmt, id, **kwargs):
        'Serves files, covers, thumbnails, metadata from the calibre database'
        try:
            id = int(id)
        except ValueError:
            id = id.rpartition('_')[-1].partition('.')[0]
            match = re.search(r'\d+', id)
            if not match:
                raise cherrypy.HTTPError(404, 'id:%s not an integer'%id)
            id = int(match.group())
        if not self.db.has_id(id):
            raise cherrypy.HTTPError(404, 'id:%d does not exist in database'%id)
        if fmt == 'thumb' or fmt.startswith('thumb_'):
            try:
                width, height = map(int, fmt.split('_')[1:])
            except:
                width, height = 60, 80
            return self.get_cover(id, thumbnail=True, thumb_width=width,
                    thumb_height=height)
        if fmt == 'cover':
            return self.get_cover(id)
        if fmt == 'opf':
            return self.get_metadata_as_opf(id)
        if fmt == 'json':
            raise cherrypy.InternalRedirect('/ajax/book/%d'%id)
        return self.get_format(id, fmt)

    def static(self, name, **kwargs):
        'Serves static content'
        #name = name.lower()
        fname = posixpath.basename(name)
        try:
            cherrypy.response.headers['Content-Type'] = {
                     'js'   : 'text/javascript',
                     'json' : 'application/json',
                     'css'  : 'text/css',
                     'png'  : 'image/png',
                     'jpg'  : 'image/jpeg',
                     'ico'  : 'image/x-icon',
                     'gif'  : 'image/gif',
                     'html' : 'text/html',
                     'woff' : 'application/x-font-woff',
                     'ttf'  : 'application/octet-stream',
                     'svg'  : 'image/svg+xml',
                     }[fname.rpartition('.')[-1].lower()]
        except KeyError:
            raise cherrypy.HTTPError(404, '%r not a valid resource type'%name)
        cherrypy.response.headers['Last-Modified'] = self.last_modified(self.build_time)
        basedir = os.path.abspath(P('content_server'))
        path = os.path.join(basedir, name.replace('/', os.sep))
        path = os.path.abspath(path)
        if not path.startswith(basedir):
            raise cherrypy.HTTPError(403, 'Access to %s is forbidden'%name)
        if not os.path.exists(path) or not os.path.isfile(path):
            raise cherrypy.HTTPError(404, '%s not found'%path)
        if self.opts.develop:
            lm = fromtimestamp(os.stat(path).st_mtime)
            cherrypy.response.headers['Last-Modified'] = self.last_modified(lm)
        with open(path, 'rb') as f:
            ans = f.read()
        if path.endswith('.css'):
            ans = ans.replace('/static/', self.opts.url_prefix + '/static/')
        return ans

    # Actually get content from the database {{{
    def get_cover(self, id, thumbnail=False, thumb_width=60, thumb_height=80):
        try:
            cherrypy.response.headers['Content-Type'] = 'image/jpeg'
            cherrypy.response.timeout = 3600
            cover = self.db.cover(id, index_is_id=True)
            if cover is None:
                cover = self.default_cover
                updated = self.build_time
            else:
                updated = self.db.cover_last_modified(id, index_is_id=True)
            cherrypy.response.headers['Last-Modified'] = self.last_modified(updated)

            if thumbnail:
                return generate_thumbnail(cover,
                        width=thumb_width, height=thumb_height)[-1]

            img = Image()
            img.load(cover)
            width, height = img.size
            scaled, width, height = fit_image(width, height,
                thumb_width if thumbnail else self.max_cover_width,
                thumb_height if thumbnail else self.max_cover_height)
            if not scaled:
                return cover
            return save_cover_data_to(img, 'img.jpg', return_data=True,
                    resize_to=(width, height))
        except Exception as err:
            import traceback
            cherrypy.log.error('Failed to generate cover:')
            cherrypy.log.error(traceback.print_exc())
            raise cherrypy.HTTPError(404, 'Failed to generate cover: %r'%err)

    def get_metadata_as_opf(self, id_):
        cherrypy.response.headers['Content-Type'] = \
                'application/oebps-package+xml; charset=UTF-8'
        mi = self.db.get_metadata(id_, index_is_id=True)
        data = metadata_to_opf(mi)
        cherrypy.response.timeout = 3600
        cherrypy.response.headers['Last-Modified'] = \
                self.last_modified(mi.last_modified)

        return data

    def get_format(self, id, format):
        format = format.upper()
        fm = self.db.format_metadata(id, format, allow_cache=False)
        if not fm:
            raise cherrypy.HTTPError(404, 'book: %d does not have format: %s'%(id, format))
        mi = newmi = self.db.get_metadata(id, index_is_id=True)

        cherrypy.response.headers['Last-Modified'] = \
            self.last_modified(max(fm['mtime'], mi.last_modified))

        fmt = self.db.format(id, format, index_is_id=True, as_file=True,
                mode='rb')
        if fmt is None:
            raise cherrypy.HTTPError(404, 'book: %d does not have format: %s'%(id, format))
        mt = guess_type('dummy.'+format.lower())[0]
        if mt is None:
            mt = 'application/octet-stream'
        cherrypy.response.headers['Content-Type'] = mt

        if format == 'EPUB':
            # Get the original metadata

            # Get any EPUB plugboards for the content server
            plugboards = self.db.prefs.get('plugboards', {})
            cpb = find_plugboard(plugboard_content_server_value,
                                 'epub', plugboards)
            if cpb:
                # Transform the metadata via the plugboard
                newmi = mi.deepcopy_metadata()
                newmi.template_to_attribute(mi, cpb)

        if format in ('MOBI', 'EPUB'):
            # Write the updated file
            from calibre.ebooks.metadata.meta import set_metadata
            set_metadata(fmt, newmi, format.lower())
            fmt.seek(0)

        fmt.seek(0, 2)
        cherrypy.response.headers['Content-Length'] = fmt.tell()
        fmt.seek(0)

        au = authors_to_string(newmi.authors if newmi.authors else
                [_('Unknown')])
        title = newmi.title if newmi.title else _('Unknown')
        fname = u'%s - %s_%s.%s'%(title[:30], au[:30], id, format.lower())
        fname = ascii_filename(fname).replace('"', '_')
        cherrypy.response.headers['Content-Disposition'] = \
                b'attachment; filename="%s"'%fname
        cherrypy.response.body = fmt
        cherrypy.response.timeout = 3600
        return fmt

    @should_login
    def user_view(self):
        nav = "user"
        user = cherrypy.request.user
        return self.html_page('content_server/user/view.html', vars())

    @should_login
    def admin_view(self):
        if not cherrypy.request.admin_user:
            raise cherrypy.HTTPRedirect('/', 302)
        users = cherrypy.request.db.query(Reader).order_by(Reader.access_time.desc()).all()
        return self.html_page('content_server/admin/view.html', vars())

    @should_login
    def admin_set(self, user_id):
        if not cherrypy.request.admin_user:
            raise cherrypy.HTTPRedirect('/', 302)
        user = cherrypy.request.db.query(Reader).get(user_id)
        if user: cherrypy.session['guest_id'] = user_id
        raise cherrypy.HTTPRedirect('/', 302)



    # }}}



#!/usr/bin/env python
# vim:fileencoding=UTF-8:ts=4:sw=4:sta:et:sts=4:ai

__license__   = 'GPL v3'
__copyright__ = '2010, Kovid Goyal <kovid@kovidgoyal.net>'
__docformat__ = 'restructuredtext en'

import os
import logging
import datetime
from logging.handlers import RotatingFileHandler

import cherrypy
from cherrypy.process.plugins import SimplePlugin
from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker

from calibre.constants import __appname__, __version__
from calibre.utils.date import fromtimestamp
from calibre.utils.config import tweaks
from webserver import listen_on, log_access_file, log_error_file
from webserver.utils import expose, AuthController
from calibre.utils.mdns import publish as publish_zeroconf, \
            unpublish as unpublish_zeroconf, get_external_ip, verify_ipV4_address
from webserver.auth import AuthServer, Reader, BuildAuthSession
from webserver.html import HtmlServer, build_jinja2_env
from webserver.xml import XMLServer
from webserver.opds import OPDSServer
from webserver.cache import Cache
from calibre import prints, as_unicode
from calibre.utils.localization import get_all_translators



class DispatchController(object):  # {{{

    def __init__(self, prefix, wsgi=False, auth_controller=None):
        self.dispatcher = cherrypy.dispatch.RoutesDispatcher()
        self.funcs = []
        self.seen = set()
        self.auth_controller = auth_controller
        self.prefix = prefix if prefix else ''
        if wsgi:
            self.prefix = ''

    def __call__(self, route, func, name=None, **kwargs):
        if not name:
            name = func.__name__
            if 'im_class' in dir(func):
                name = "%s.%s" % ( func.im_class.__name__, func.__name__)
        if name in self.seen:
            raise NameError('Route name: '+ repr(name) + ' already used')
        self.seen.add(name)
        kwargs['action'] = 'f_%d'%len(self.funcs)
        aw = kwargs.pop('android_workaround', False)
        if route != '/':
            route = self.prefix + route
        if isinstance(route, unicode):
            # Apparently the routes package chokes on unicode routes, see
            # http://www.mobileread.com/forums/showthread.php?t=235366
            route = route.encode('utf-8')
        elif self.prefix:
            self.dispatcher.connect(name+'prefix_extra', self.prefix, self,
                    **kwargs)
            self.dispatcher.connect(name+'prefix_extra_trailing',
                    self.prefix+'/', self, **kwargs)
        self.dispatcher.connect(name, route, self, **kwargs)
        if self.auth_controller is not None:
            func = self.auth_controller(func, aw)
        self.funcs.append(expose(func))

    def __getattr__(self, attr):
        if not attr.startswith('f_'):
            raise AttributeError(attr + ' not found')
        num = attr.rpartition('_')[-1]
        try:
            num = int(num)
        except:
            raise AttributeError(attr + ' not found')
        if num < 0 or num >= len(self.funcs):
            raise AttributeError(attr + ' not found')
        return self.funcs[num]

# }}}

class BonJour(SimplePlugin):  # {{{

    def __init__(self, engine, port=8080, prefix=''):
        SimplePlugin.__init__(self, engine)
        self.port = port
        self.prefix = prefix
        self.ip_address = '0.0.0.0'

    @property
    def mdns_services(self):
        return [
            ('Books in calibre', '_stanza._tcp', self.port,
                {'path':self.prefix+'/stanza'}),
            ('Books in calibre', '_calibre._tcp', self.port,
                {'path':self.prefix+'/opds'}),
        ]

    def start(self):
        zeroconf_ip_address = verify_ipV4_address(self.ip_address)
        try:
            for s in self.mdns_services:
                publish_zeroconf(*s, use_ip_address=zeroconf_ip_address)
        except:
            import traceback
            cherrypy.log.error('Failed to start BonJour:')
            cherrypy.log.error(traceback.format_exc())

    start.priority = 90

    def stop(self):
        try:
            for s in self.mdns_services:
                unpublish_zeroconf(*s)
        except:
            import traceback
            cherrypy.log.error('Failed to stop BonJour:')
            cherrypy.log.error(traceback.format_exc())

    stop.priority = 10

cherrypy.engine.bonjour = BonJour(cherrypy.engine)

# }}}


class LibraryServer(AuthServer, HtmlServer, XMLServer, OPDSServer, Cache):

    server_name = __appname__ + '/' + __version__

    def __init__(self, db, opts, embedded=False, show_tracebacks=True,
            wsgi=False):
        self.is_wsgi = bool(wsgi)
        self.opts = opts
        self.embedded = embedded
        self.state_callback = None
        self.start_failure_callback = None
        try:
            self.max_cover_width, self.max_cover_height = \
                        map(int, self.opts.max_cover.split('x'))
        except:
            self.max_cover_width = 1200
            self.max_cover_height = 1600
        path = P('content_server')
        self.build_time = fromtimestamp(os.stat(path).st_mtime)
        self.default_cover = open(P('content_server/m/img/default_cover.jpg'), 'rb').read()
        if not opts.url_prefix:
            opts.url_prefix = ''


        cherrypy.engine.bonjour.ip_address = listen_on
        cherrypy.engine.bonjour.port = opts.port
        cherrypy.engine.bonjour.prefix = opts.url_prefix

        self.last_lang = "en"
        self.all_langs = dict(get_all_translators())
        cherrypy.request.hooks.attach('before_handler', self.update_lang)
        cherrypy.request.hooks.attach('before_handler', self.load_user)
        #cherrypy.request.hooks.attach('on_end_resource', self.save_session)

        #cherrypy.tools.authenticate = cherrypy.Tool('before_handler', self.load_user)
        #cherrypy.tools.session = cherrypy.Tool('on_end_resource', self.save_session)

        Cache.__init__(self)

        self.set_database(db)

        st = 1 if opts.develop else 1

        cherrypy.config.update({
            'log.screen'             : opts.develop,
            'engine.autoreload_on'   : getattr(opts,
                                        'auto_reload', False),
            'tools.log_headers.on'   : opts.develop,
            'tools.encode.encoding'  : 'UTF-8',
            'checker.on'             : opts.develop,
            'request.show_tracebacks': show_tracebacks,
            'server.socket_host'     : listen_on,
            'server.socket_port'     : opts.port,
            'server.socket_timeout'  : opts.timeout,  # seconds
            'server.thread_pool'     : opts.thread_pool,  # number of threads
            'server.shutdown_timeout': st,  # minutes
            'tools.sessions.on' : True,
            #'tools.sessions.storage_type': 'ram',
            'tools.sessions.domain': "talebook.org",
            'tools.sessions.timeout': 30*86400, # Session times out after 60 minutes
            'tools.sessions.storage_type': "file",
            'tools.sessions.storage_path': "/data/tmp/cherrypy/",
            'SOCIAL_AUTH_USER_MODEL': 'webserver.auth.Reader',
            'SOCIAL_AUTH_LOGIN_URL': '/auth/',
            'SOCIAL_AUTH_LOGIN_REDIRECT_URL': '/',
            'SOCIAL_AUTH_AUTHENTICATION_BACKENDS': (
                'social.backends.douban.DoubanOAuth',
                'social.backends.douban.DoubanOAuth2',
                'social.backends.qq.QQOAuth2',
                'social.backends.weibo.WeiboOAuth2',
            ),
        });
        cherrypy.config.update(tweaks['extra_configs'])
        cherrypy.tools.jinja2env = build_jinja2_env()
        if embedded or wsgi:
            cherrypy.config.update({'engine.SIGHUP'          : None,
                                    'engine.SIGTERM'         : None,})
        self.config = {}
        self.is_running = False
        self.exception = None
        auth_controller = None
        self.users_dict = {}

        if not wsgi:
            self.setup_loggers()
            cherrypy.engine.bonjour.subscribe()
            self.config['global'] = {
                'tools.gzip.on'        : True,
                'tools.gzip.mime_types': ['text/html', 'text/plain',
                    'text/xml', 'text/javascript', 'text/css'],
            }

            if opts.username and opts.password:
                self.users_dict[opts.username.strip()] = opts.password.strip()
                auth_controller = AuthController('Your calibre library',
                        self.users_dict)

        self.__dispatcher__ = DispatchController(self.opts.url_prefix,
                wsgi=wsgi, auth_controller=auth_controller)
        for x in self.__class__.__bases__:
            if hasattr(x, 'add_routes'):
                x.__init__(self)
                x.add_routes(self, self.__dispatcher__)
        root_conf = self.config.get('/', {})
        root_conf['request.dispatch'] = self.__dispatcher__.dispatcher
        self.config['/'] = root_conf

    def login_user(self):
        NO_LOGIN = (None, None, None)
        db = cherrypy.request.db
        user_id = cherrypy.session.get('user_id')
        if not user_id: return NO_LOGIN

        user = db.query(Reader).get(user_id)
        if not user: return NO_LOGIN

        extra = user.extra
        extra['login_ip'] = cherrypy.request.client_ip
        user.extra.update(extra)
        user.access_time = datetime.datetime.now()
        user.save()

        if not user.is_admin():
            return (user_id, user, None)

        guest_id = cherrypy.session.get('guest_id')
        if not guest_id:
            return (user_id, user, user)

        guest_user = db.query(Reader).get(guest_id)
        return (guest_id, guest_user, user)


    def load_user(self):
        cherrypy.request.client_ip = cherrypy.request.headers.get('X-Real-Ip', '')
        cherrypy.request.db = BuildAuthSession()
        user_id, user, admin_user = self.login_user()
        cherrypy.request.user = user
        cherrypy.request.user_id = user_id
        cherrypy.request.admin_user = admin_user
        if user: cherrypy.request.user_extra = user.extra
        else: cherrypy.request.user_extra = {}

    def save_session(self):
        cherrypy.session.save()

    def update_lang(self):
        user_langs = [x.value.replace('-', '_') for x in
                 cherrypy.request.headers.elements('Accept-Language')]
        sessions_on = cherrypy.request.config.get('tools.sessions.on', False)
        for lang in user_langs:
            if lang == self.last_lang:
                return
            if lang in self.all_langs:
                loc = self.all_langs[lang]
                loc.install(unicode=True, names=('ngettext',))
                cherrypy.response.i18n = loc
                self.last_lang = lang
                return


    def set_database(self, db):
        self.db = db
        virt_libs = db.prefs.get('virtual_libraries', {})
        sr = getattr(self.opts, 'restriction', None)
        if sr:
            if sr in virt_libs:
                sr = virt_libs[sr]
            elif sr not in self.db.saved_search_names():
                prints('WARNING: Content server: search restriction ',
                       sr, ' does not exist')
                sr = ''
            else:
                sr = 'search:"%s"'%sr
        else:
            sr = db.prefs.get('cs_virtual_lib_on_startup', '')
            if sr:
                if sr not in virt_libs:
                    prints('WARNING: Content server: virtual library ',
                           sr, ' does not exist')
                    sr = ''
                else:
                    sr = virt_libs[sr]
        self.search_restriction = sr
        self.reset_caches()

    def graceful(self):
        cherrypy.engine.graceful()

    def setup_loggers(self):
        access_file = log_access_file
        error_file  = log_error_file
        log = cherrypy.log

        maxBytes = getattr(log, "rot_maxBytes", 10000000)
        backupCount = getattr(log, "rot_backupCount", 1000)

        # Make a new RotatingFileHandler for the error log.
        h = RotatingFileHandler(error_file, 'a', maxBytes, backupCount)
        h.setLevel(logging.DEBUG)
        h.setFormatter(cherrypy._cplogging.logfmt)
        log.error_log.addHandler(h)

        # Make a new RotatingFileHandler for the access log.
        h = RotatingFileHandler(access_file, 'a', maxBytes, backupCount)
        h.setLevel(logging.DEBUG)
        h.setFormatter(cherrypy._cplogging.logfmt)
        log.access_log.addHandler(h)

    def start_cherrypy(self):
        try:
            cherrypy.engine.start()
        except:
            ip = get_external_ip()
            if not ip or ip.startswith('127.'):
                raise
            cherrypy.log('Trying to bind to single interface: '+ip)
            # Change the host we listen on
            cherrypy.config.update({'server.socket_host' : ip})
            # This ensures that the change is actually applied
            cherrypy.server.socket_host = ip
            cherrypy.server.httpserver = cherrypy.server.instance = None

            cherrypy.engine.start()

    def start(self):
        self.is_running = False
        self.exception = None
        cherrypy.tree.mount(root=None, config=self.config)
        try:
            self.start_cherrypy()
        except Exception as e:
            self.exception = e
            import traceback
            traceback.print_exc()
            if callable(self.start_failure_callback):
                try:
                    self.start_failure_callback(as_unicode(e))
                except:
                    pass
            return

        try:
            self.is_running = True
            self.notify_listener()
            cherrypy.engine.block()
        except Exception as e:
            import traceback
            traceback.print_exc()
            self.exception = e
        finally:
            self.is_running = False
            self.notify_listener()

    def notify_listener(self):
        try:
            if callable(self.state_callback):
                self.state_callback(self.is_running)
        except:
            pass

    def exit(self):
        try:
            cherrypy.engine.exit()
        finally:
            cherrypy.server.httpserver = None
            self.is_running = False
            self.notify_listener()

    def threaded_exit(self):
        from threading import Thread
        t = Thread(target=self.exit)
        t.daemon = True
        t.start()

    def search_for_books(self, query):
        return self.db.search_getting_ids(
            (query or '').strip(), self.search_restriction,
            sort_results=False, use_virtual_library=False)



#!/usr/bin/python
#-*- coding: UTF-8 -*-


import re, os, logging, sys, time, tempfile, zipfile, cStringIO
import models
import tornado.ioloop
import tornado.httpserver
from tornado import web
from tornado.options import define, options
from gettext import gettext as _
from gettext import GNUTranslations
from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker
from social_tornado.models import init_social
from social_routes import SOCIAL_AUTH_ROUTES
from settings import settings


define("port", default=8080, type=int,
        help=_('The port on which to listen.'))
define("path-calibre", default="/usr/lib/calibre", type=str,
        help=_('Path to calibre package.'))
define("path-resources", default="/usr/share/calibre", type=str,
        help=_('Path to calibre resources.'))
define("path-plugins", default="/usr/lib/calibre/calibre/plugins", type=str,
        help=_('Path to calibre plugins.'))
define("path-bin", default="/usr/bin", type=str,
        help=_('Path to calibre binary programs.'))
define("with-library", default=settings['with_library'], type=str,
        help=_('Path to the library folder to serve with the content server.'))

define("syncdb", default=False, type=bool, help=_('Create all tables'))
define("testmail", default=False, type=bool, help=_('run testcase'))

def load_calibre_translations():
    from tornado import locale
    tmp = tempfile.mkdtemp()
    with zipfile.ZipFile( P('localization/locales.zip') ) as zf:
        trans = {}
        for name in zf.namelist():
            if name.endswith(".mo"):
                trans[name.split("/")[0]] = name
        for code, zpath in trans.items():
            try:
                buf = cStringIO.StringIO(zf.read(zpath))
                locale._translations[code] = GNUTranslations(buf)
            except:
                pass
        locale._use_gettext = True
        locale.set_default_locale("zh_CN")


def init_calibre():
    path = options.path_calibre
    if path not in sys.path: sys.path.insert(0, path)
    sys.resources_location = options.path_resources
    sys.extensions_location = options.path_plugins
    sys.executables_location = options.path_bin
    try:
        import calibre
    except:
        raise ImportError( _("Can not import calibre. Please set the corrent options") )
    if not options.with_library:
        sys.stderr.write( _('No saved library path. Use the --with-library option'
                ' to specify the path to the library you want to use.') )
        sys.stderr.write( "\n" )
        sys.exit(2)

def make_app():
    init_calibre()

    import handlers
    from calibre.db.legacy import LibraryDatabase
    from calibre.utils.date import fromtimestamp

    auth_db_path = settings['user_database']
    logging.info("Init library with [%s]" % options.with_library)
    logging.info("Init AuthDB  with [%s]" % auth_db_path )
    logging.info("Init Static  with [%s]" % settings['static_path'] )
    logging.info("Init LANG    with [%s]" % P('localization/locales.zip') )
    book_db = LibraryDatabase(os.path.expanduser(options.with_library))
    cache = book_db.new_api


    # hook 1: 按字母作为第一级目录，解决书库子目录太多的问题
    old_construct_path_name = cache.backend.construct_path_name
    def new_construct_path_name(*args, **kwargs):
        s = old_construct_path_name(*args, **kwargs)
        ns = s[0] + "/" + s
        logging.debug("new str = %s" % ns)
        return ns
    cache.backend.construct_path_name = new_construct_path_name

    # hook 2: don't force GUI
    from calibre import gui2
    old_must_use_qt = gui2.must_use_qt
    def new_must_use_qt(headless=True):
        try:
            old_must_use_qt(headless)
        except:
            pass
    gui2.must_use_qt = new_must_use_qt

    # build sql session factory
    engine = create_engine(auth_db_path, echo=False)
    ScopedSession = scoped_session(sessionmaker(bind=engine, autoflush=True, autocommit=False))
    models.bind_session(ScopedSession)
    init_social(models.Base, ScopedSession, settings)

    if options.syncdb:
        models.user_syncdb(engine)
        sys.exit(0)

    if options.testmail:
        from test import email
        email.do_send_mail()
        sys.exit(0)

    path = settings['static_path'] + '/img/default_cover.jpg'
    settings.update({
        "legacy": book_db,
        "cache": cache,
        "ScopedSession": ScopedSession ,
        "build_time": fromtimestamp(os.stat(path).st_mtime),
        "default_cover": open(path, 'rb').read(),
        })

    load_calibre_translations()
    logging.info("Now, Running...")
    return web.Application(
            SOCIAL_AUTH_ROUTES + handlers.routes(),
            **settings)


def main():
    tornado.options.parse_command_line()
    app = make_app()
    http_server = tornado.httpserver.HTTPServer(app, xheaders=True)
    http_server.listen(options.port)
    tornado.ioloop.IOLoop.instance().start()
    from flask.ext.sqlalchemy import _EngineDebuggingSignalEvents
    _EngineDebuggingSignalEvents(engine, app.import_name).register()

if __name__ == "__main__":
    sys.path.append( os.path.dirname(__file__) )
    sys.exit(main())


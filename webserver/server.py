#!/usr/bin/python
#-*- coding: UTF-8 -*-


import re, os, logging, sys, time, tempfile, zipfile
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
import loader
CONF = loader.get_settings()


define("host", default="", type=str,
        help=_('The host address on which to listen'))
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
define("with-library", default=CONF['with_library'], type=str,
        help=_('Path to the library folder to serve with the content server.'))

define("syncdb", default=False, type=bool, help=_('Create all tables'))

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

def bind_utf8_book_names(cache):
    from calibre.constants import iswindows
    from calibre.db.backend import WINDOWS_RESERVED_NAMES

    PATH_LIMIT = cache.backend.PATH_LIMIT
    def safe_filename(filename):
        return re.sub(r"[\/\\\:\*\?\"\<\>\|]", "_", filename)  # 替换为下划线

    # the codes is from calibre source code. just change 'ascii_filename' to 'safe_filename'
    def utf8_construct_path_name(book_id, title, author):
        book_id = ' (%d)' % book_id
        l = PATH_LIMIT - (len(book_id) // 2) - 2
        author = safe_filename(author)[:l]
        title  = safe_filename(title.lstrip())[:l].rstrip()
        if not title:
            title = 'Unknown'[:l]
        try:
            while author[-1] in (' ', '.'):
                author = author[:-1]
        except IndexError:
            author = ''
        if not author:
            author = safe_filename(_('Unknown'))
        if author.upper() in WINDOWS_RESERVED_NAMES:
            author += 'w'
        return '%s/%s%s' % (author, title, book_id)

    def utf8_construct_file_name(book_id, title, author, extlen):
        extlen = max(extlen, 14)  # 14 accounts for ORIGINAL_EPUB
        l = (PATH_LIMIT - (extlen // 2) - 2) if iswindows else ((PATH_LIMIT - extlen - 2) // 2)
        if l < 5:
            raise ValueError('Extension length too long: %d' % extlen)
        author = safe_filename(author)[:l]
        title  = safe_filename(title.lstrip())[:l].rstrip()
        if not title:
            title = 'Unknown'[:l]
        name   = title + ' - ' + author
        while name.endswith('.'):
            name = name[:-1]
        if not name:
            name = safe_filename(_('Unknown'))
        return name

    cache.backend.construct_path_name = utf8_construct_path_name
    cache.backend.construct_file_name = utf8_construct_file_name
    return


def bind_topdir_book_names(cache):
    old_construct_path_name = cache.backend.construct_path_name
    def new_construct_path_name(*args, **kwargs):
        s = old_construct_path_name(*args, **kwargs)
        ns = s[0] + "/" + s
        logging.debug("new str = %s" % ns)
        return ns

    cache.backend.construct_path_name = new_construct_path_name
    return

def make_app():
    init_calibre()

    import handlers
    from calibre.db.legacy import LibraryDatabase
    from calibre.utils.date import fromtimestamp

    auth_db_path = CONF['user_database']
    logging.info("Init library with [%s]" % options.with_library)
    logging.info("Init AuthDB  with [%s]" % auth_db_path )
    logging.info("Init Static  with [%s]" % CONF['static_path'] )
    logging.info("Init HTML    with [%s]" % CONF['html_path'] )
    book_db = LibraryDatabase(os.path.expanduser(options.with_library))
    cache = book_db.new_api


    # hook 1: 按字母作为第一级目录，解决书库子目录太多的问题
    if CONF['BOOK_NAMES_FORMAT'].lower() == 'utf8':
        bind_utf8_book_names(cache)
    else:
        bind_topdir_book_names(cache)

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
    init_social(models.Base, ScopedSession, CONF)

    if options.syncdb:
        models.user_syncdb(engine)
        logging.info("Create tables into DB")
        sys.exit(0)

    path = CONF['static_path'] + '/calibre/default_cover.jpg'
    app_settings = dict(CONF)
    app_settings.update({
        "legacy": book_db,
        "cache": cache,
        "ScopedSession": ScopedSession ,
        "build_time": fromtimestamp(os.stat(path).st_mtime),
        "default_cover": open(path, 'rb').read(),
        })

    logging.info("Now, Running...")
    return web.Application(
            SOCIAL_AUTH_ROUTES + handlers.routes(),
            **app_settings)


def main():
    tornado.options.parse_command_line()
    app = make_app()
    http_server = tornado.httpserver.HTTPServer(app, xheaders=True)
    http_server.listen(options.port, options.host)
    tornado.ioloop.IOLoop.instance().start()
    from flask.ext.sqlalchemy import _EngineDebuggingSignalEvents
    _EngineDebuggingSignalEvents(engine, app.import_name).register()

if __name__ == "__main__":
    sys.path.append( os.path.dirname(__file__) )
    sys.exit(main())


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
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import scoped_session, sessionmaker
from social.apps.tornado_app.models import init_social
from social_tornado.routes import SOCIAL_AUTH_ROUTES
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
define("test", default=False, type=bool, help=_('run testcase'))

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
    try:
        import local_settings
        settings.update(local_settings.settings)
    except Exception as e:
        logging.error("read local_settings fail")
        pass

    init_calibre()

    import handlers
    from calibre.db.legacy import LibraryDatabase

    auth_db_path = settings['user_database']
    logging.info("Init library with [%s]" % options.with_library)
    logging.info("Init AuthDB  with [%s]" % auth_db_path )
    logging.info("Init Static  with [%s]" % settings['static_path'] )
    logging.info("Init LANG    with [%s]" % P('localization/locales.zip') )
    book_db = LibraryDatabase(os.path.expanduser(options.with_library))
    cache = book_db.new_api

    Base = declarative_base()
    engine = create_engine(auth_db_path, echo=False)
    session = scoped_session(sessionmaker(bind=engine, autoflush=True, autocommit=False))
    init_social(Base, session, settings)
    models.bind_session(session)

    load_calibre_translations()

    if options.syncdb:
        models.user_syncdb(engine)
        sys.exit(0)

    if options.test:
        from test import email
        email.do_send_mail()
        sys.exit(0)


    settings.update({
        "legacy": book_db,
        "cache": cache,
        "session": session,
        })

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


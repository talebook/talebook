import cherrypy
from cherrypy.process import plugins
from sqlalchemy import create_engine
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import scoped_session, sessionmaker, relationship
from sqlalchemy.ext.declarative import declarative_base
from social.utils import setting_name, module_member
from social.actions import do_auth, do_complete, do_disconnect
from social.apps.cherrypy_app.utils import psa, backends
from social.storage.sqlalchemy_orm import JSONType, SQLAlchemyMixin
from social.storage.sqlalchemy_orm import SQLAlchemyUserMixin, \
                                          SQLAlchemyAssociationMixin, \
                                          SQLAlchemyNonceMixin, \
                                          BaseSQLAlchemyStorage

import datetime
from collections import defaultdict

UID_LENGTH = cherrypy.config.get(setting_name('UID_LENGTH'), 255)
Base = declarative_base()

AUTH_DB_PATH = 'sqlite:////data/books/auth.db'

def BuildAuthSession():
    engine = create_engine(AUTH_DB_PATH, echo=False)
    session = scoped_session(sessionmaker(autoflush=True, autocommit=False))
    session.configure(bind=engine)
    return session

from sqlalchemy.ext.mutable import Mutable

class MutableDict(Mutable, dict):
    @classmethod
    def coerce(cls, key, value):
        "Convert plain dictionaries to MutableDict."
        if not isinstance(value, MutableDict):
            if isinstance(value, dict):
                return MutableDict(value)

            # this call will raise ValueError
            return Mutable.coerce(key, value)
        else:
            return value

    def __setitem__(self, key, value):
        "Detect dictionary set events and emit change events."
        dict.__setitem__(self, key, value)
        self.changed()

    def __delitem__(self, key):
        "Detect dictionary del events and emit change events."
        dict.__delitem__(self, key)
        self.changed()

    def __getitem__(self, key):
        if not dict.__contains__(self, key):
            return ""
        return dict.__getitem__(self, key)



class Reader(Base, SQLAlchemyMixin):
    __tablename__ = 'readers'
    id = Column(Integer, primary_key=True)
    username = Column(String(200))
    password = Column(String(200), default='')
    name = Column(String(100))
    email = Column(String(200))
    avatar = Column(String(200))
    admin = Column(Boolean, default=False)
    active = Column(Boolean, default=True)
    create_time = Column(DateTime)
    update_time = Column(DateTime)
    access_time = Column(DateTime)
    extra = Column(MutableDict.as_mutable(JSONType), default={})

    @classmethod
    def _session(self):
        return cherrypy.request.db

    def init(self, social_user):
        self.create_time = datetime.datetime.now()
        self.update_time = datetime.datetime.now()
        self.access_time = datetime.datetime.now()
        self.extra = {"kindle_email": ""}
        self.init_avatar(social_user)
        self.save()

    def init_avatar(self, social_user):
        if social_user.provider == 'douban-oauth2':
            self.avatar = "//img3.doubanio.com/icon/u%s.jpg" % social_user.uid
        else:
            url = social_user.extra_data.get('profile_image_url', '')
            self.avatar = url.replace("http://q.qlogo.cn", "//q.qlogo.cn")

    def is_active(self):
        return self.active

    def is_admin(self):
        return self.admin

    def save_extra(self, extra):
        if extra and extra != self.extra:
            self.extra = extra
            self.save()

class UserSocialAuth(Base, SQLAlchemyUserMixin):
    """Social Auth association model"""
    uid = Column(String(UID_LENGTH))
    user_id = Column(Integer, ForeignKey(Reader.id),
                     nullable=False, index=True)
    #user = relationship(Reader, backref='social_auth')

    @classmethod
    def username_max_length(cls):
        return Reader.__table__.columns.get('username').type.length

    @classmethod
    def user_model(cls):
        return Reader


class Nonce(Base, SQLAlchemyNonceMixin):
    """One use numbers"""
    pass


class Association(Base, SQLAlchemyAssociationMixin):
    """OpenId account association"""
    pass

class AuthServer(object):
    def add_routes(self, connect):
        connect( '/auth/done', self.done)
        connect( '/auth/logout', self.logout)
        connect( '/auth/login/{backend}', self.login)
        connect( '/auth/complete/{backend}', self.complete)
        connect( '/auth/disconnect/{backend}', self.disconnect)

    def done(self):
        u = cherrypy.request.user
        return "Hello, %s" % u.username

    def logout(self):
        u = cherrypy.request.user
        b = backends(u)
        a = None
        for v in b['backends']:
            if v not in b['not_associated']:
                a = v
        url = '/auth/disconnect/%s'%a
        return "Click: <a href='%s'>%s</a>" % (url, url)
        if a: raise cherrypy.HTTPRedirect('/auth/disconnect/%s'%a, 302)

    @cherrypy.expose
    @psa('/auth/complete/%(backend)s')
    def login(self, backend):
        #cherrypy.session['next'] = cherrypy.request.params['next']
        return do_auth(self.backend)

    @cherrypy.expose
    @psa('/auth/complete/%(backend)s')
    def complete(self, backend, *args, **kwargs):
        login = cherrypy.config.get(setting_name('LOGIN_METHOD'))
        do_login = module_member(login) if login else self.do_login
        user = getattr(cherrypy.request, 'user', None)
        return do_complete(self.backend, do_login, user=user, *args, **kwargs)

    @cherrypy.expose
    def disconnect(self, backend, association_id=None):
        user = getattr(cherrypy.request, 'user', None)
        return do_disconnect(self.backend, user, association_id)

    def do_login(self, backend, user, social_user):
        backend.strategy.session_set('user_id', user.id)
        backend.strategy.session_set('guest_id', None)
        if not user.create_time: user.init(social_user)

if __name__ == '__main__':
    cherrypy.config.update({
        'SOCIAL_AUTH_USER_MODEL': 'auth.Reader',
    })

    if False:
        engine = create_engine(AUTH_DB_PATH)
        Base.metadata.create_all(engine)
        from social.apps.cherrypy_app.models import SocialBase
        SocialBase.metadata.create_all(engine)

    db = cherrypy.request.db = BuildAuthSession()
    for user in db.query(Reader).all():
        if not user.social_auth:
            print "pass %s" % user.username
            continue
        auth = user.social_auth[0]
        user.init_avatar(auth)
        print user.username, user.avatar
        #user.save()

    if False:
        user = db.query(Reader).get(1)
        from pprint import pprint
        pprint(user)
        print user.extra['hello']
        auth = user.social_auth[0]
        #pprint(dict( (key, getattr(auth,key)) for key in dir(auth) ) )



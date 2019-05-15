#!/usr/bin/python
#-*- coding: UTF-8 -*-

import logging
import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from social_sqlalchemy.storage import JSONType, SQLAlchemyMixin, SQLAlchemyUserMixin
from sqlalchemy.ext.mutable import Mutable
from sqlalchemy.orm import relationship

Base = declarative_base()
def bind_session(session):
    def _session(self):
        return session
    Base._session = classmethod(_session)
    SQLAlchemyMixin._session = classmethod(_session)
    logging.info("Bind modles._session()")

def to_dict(self):
    return {c.name: getattr(self, c.name, None) for c in self.__table__.columns}
Base.to_dict = to_dict

class MutableDict(Mutable, dict):
    @classmethod
    def coerce(cls, key, value):
        "Convert plain dictionaries to MutableDict."
        if isinstance(value, MutableDict): return value
        if isinstance(value, dict): return MutableDict(value)
        return Mutable.coerce(key, value)

    def __setitem__(self, key, value):
        "Detect dictionary set events and emit change events."
        dict.__setitem__(self, key, value)
        self.changed()

    def __delitem__(self, key):
        "Detect dictionary del events and emit change events."
        dict.__delitem__(self, key)
        self.changed()

    def __getitem__(self, key):
        if not dict.__contains__(self, key): return ""
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

    def init_default_user(self):
        class DefaultUserInfo:
            extra_data = {'username': _(u'默认用户')}
        self.init(DefaultUserInfo())

    def init(self, social_user):
        self.username = self.get_social_username(social_user)
        self.create_time = datetime.datetime.now()
        self.update_time = datetime.datetime.now()
        self.access_time = datetime.datetime.now()
        self.extra = {"kindle_email": ""}
        self.init_avatar(social_user)

    def init_avatar(self, social_user):
        anyone = "http://tva1.sinaimg.cn/default/images/default_avatar_male_50.gif"
        url = social_user.extra_data.get('profile_image_url', anyone)
        self.avatar = url.replace("http://q.qlogo.cn", "//q.qlogo.cn")

        if social_user.provider == "github":
            self.avatar = "https://avatars.githubusercontent.com/u/%s" % social_user.extra_data['id']

    def get_social_username(self, si):
        for k in ['username', 'login']:
            if k in si.extra_data:
                return si.extra_data[k]
        return "%s_%s" % (si.provider, si.uid)

    def check_and_update(self, social_user):
        name = self.get_social_username(social_user)
        if self.username != name:
            logging.info("userid[%s] username needs update to [%s]" % (self.id, name) )
            self.username = name


    def is_active(self):
        return self.active

    def is_admin(self):
        return self.admin

class Message(Base, SQLAlchemyMixin):
    __tablename__ = 'messages'
    id = Column(Integer, primary_key=True)
    title = Column(String(200))
    status = Column(String(100))
    unread = Column(Boolean, default=True)
    create_time = Column(DateTime)
    update_time = Column(DateTime)
    data = Column(MutableDict.as_mutable(JSONType), default={})

    reader_id = Column(Integer, ForeignKey("readers.id"))
    reader = relationship(Reader, backref="messages")

    def __init__(self, user_id, status, msg):
        super(Message, self).__init__()
        self.reader_id = user_id
        self.status = status
        self.create_time = datetime.datetime.now()
        self.update_time = datetime.datetime.now()
        self.data = {'message': msg}

class Item(Base, SQLAlchemyMixin):
    __tablename__ = "items"

    book_id = Column(Integer, default=0, primary_key=True)
    count_guest = Column(Integer, default=0, nullable=False)
    count_visit = Column(Integer, default=0, nullable=False)
    count_download = Column(Integer, default=0, nullable=False)
    website = Column(String(255), default="", nullable=False)

    collector_id = Column(Integer, ForeignKey("readers.id"))
    collector = relationship(Reader, backref="items")

    def __init__(self):
        super(Item, self).__init__()
        self.count_guest = 0
        self.count_visit = 0
        self.count_download = 0
        self.collector_id = 1


def user_syncdb(engine):
    Base.metadata.create_all(engine)


#!/usr/bin/python
#-*- coding: UTF-8 -*-

import logging
import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from social.storage.sqlalchemy_orm import JSONType, SQLAlchemyMixin
from social.storage.sqlalchemy_orm import SQLAlchemyUserMixin
from sqlalchemy.ext.mutable import Mutable
from sqlalchemy.orm import relationship

Base = declarative_base()
def bind_session(session):
    def _session(self):
        return session
    Base._session = classmethod(_session)
    SQLAlchemyMixin._session = classmethod(_session)
    logging.info("Bind modles._session()")

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

    def init(self, social_user):
        self.create_time = datetime.datetime.now()
        self.update_time = datetime.datetime.now()
        self.access_time = datetime.datetime.now()
        self.extra = {"kindle_email": ""}
        self.init_avatar(social_user)

    def init_avatar(self, social_user):
        if social_user.provider == 'douban-oauth2':
            self.avatar = "//img3.doubanio.com/icon/u%s.jpg" % social_user.uid
        else:
            anyone = "http://tva1.sinaimg.cn/default/images/default_avatar_male_50.gif"
            url = social_user.extra_data.get('profile_image_url', anyone)
            self.avatar = url.replace("http://q.qlogo.cn", "//q.qlogo.cn")

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

def user_syncdb(engine):
    Base.metadata.create_all(engine)


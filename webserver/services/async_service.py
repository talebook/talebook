#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import logging
import threading
from queue import Queue

from webserver.models import Message


class SingletonType(type):
    _instances = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super(SingletonType, cls).__call__(*args, **kwargs)
        return cls._instances[cls]


class AsyncService(metaclass=SingletonType):
    db = None
    session_maker = None
    running = {}  # name -> (thread, queue)
    # session 不能跨线程共享：按线程惰性创建独立 session，任务结束时由 loop() 关闭。
    # 类属性使所有服务单例共享同一份线程本地存储（每个 OS 线程一个 session）
    _local = threading.local()

    def setup(self, calibre_db=None, session_maker=None):
        self.db = calibre_db
        self.session_maker = session_maker

    @property
    def session(self):
        session = getattr(self._local, "session", None)
        if session is None:
            session = self.session_maker()
            self._local.session = session
        return session

    def close_session(self):
        session = getattr(self._local, "session", None)
        if session is not None:
            session.close()
            self._local.session = None

    def get_queue(self, service_name) -> Queue:
        if service_name not in self.running:
            return None
        return self.running[service_name][1]

    def start_service(self, service_func) -> Queue:
        name = service_func.__name__
        if name in self.running:
            return self.running[name][1]

        logging.info("** Start Thread Service <%s> ** from %s", name, self)
        q = Queue()
        t = threading.Thread(target=self.loop, args=(service_func, q))
        t.name = self.__class__.__name__ + "." + service_func.__name__
        t.setDaemon(True)
        t.start()
        self.running[name] = (t, q)
        return q

    def loop(self, service_func, q):
        name = service_func.__name__
        while True:
            args, kwargs = q.get()
            logging.info("call: func=%s, args=%s, kwargs=%s", name, args, kwargs)
            try:
                service_func(self, *args, **kwargs)
            except Exception as err:
                logging.exception("run task error: %s", err)
            finally:
                # 每个任务结束后关闭本线程的 session，下个任务拿全新的
                self.close_session()
            logging.info("end : func=%s, args=%s, kwargs=%s", name, args, kwargs)

    # 一些常用的工具库
    def add_msg(self, user_id, status, msg):
        m = Message(user_id, status, msg)
        if m.reader_id:
            self.session.add(m)
            self.session.commit()

    # 注册服务
    def async_mode(self):
        """for unittest"""
        return True

    @staticmethod
    def register_function(service_func):
        name = service_func.__name__
        logging.debug("service register <%s>", name)

        def func_wrapper(ins: AsyncService, *args, **kwargs):
            s = AsyncService()
            ins.setup(s.db, s.session_maker)
            logging.error("[FUNC ] service call %s(%s, %s)", name, args, kwargs)
            return service_func(ins, *args, **kwargs)

        return func_wrapper

    @staticmethod
    def register_service(service_func):
        name = service_func.__name__
        logging.debug("service register <%s>", name)

        def func_wrapper(ins: AsyncService, *args, **kwargs):
            s = AsyncService()
            ins.setup(s.db, s.session_maker)

            if not s.async_mode():
                logging.error("[FUNC ] service call %s(%s, %s)", name, args, kwargs)
                return service_func(ins, *args, **kwargs)

            logging.error("[ASYNC] service call %s(%s, %s)", name, args, kwargs)
            q = ins.start_service(service_func)
            q.put((args, kwargs))
            return None

        return func_wrapper

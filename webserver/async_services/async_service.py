#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import logging
import threading
from queue import Queue
import traceback


class SingletonType(type):

    _instances = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super(SingletonType, cls).__call__(*args, **kwargs)
        return cls._instances[cls]


class AsyncService(metaclass=SingletonType):
    db = None
    session = None
    scoped_session = None
    running = {}

    def __init__(self):
        self.running = {}  # name -> queue
        self.scoped_session = lambda : 'no-session'
        self.lock = threading.Lock()

    def setup(self, calibre_db=None, scoped_session=None):
        self.db = calibre_db
        self.scoped_session = scoped_session
        self.session = scoped_session()
        # logging.info("<%s> setup: db=%s, session=%s", self, self.db, self.session)

    def start_service(self, service_func) -> Queue:
        self.lock.acquire()
        name = service_func.__name__
        if name in self.running:
            return self.running[name]

        logging.info("** Start Thread Service <%s> ** from %s", name, self)
        q = Queue()
        t = threading.Thread(target=self.loop, args=(service_func, q))
        t.name = self.__class__.__name__ + "." + service_func.__name__
        t.setDaemon(True)
        t.start()
        self.running[t] = q
        self.lock.release()
        return q

    def loop(self, service_func, q):
        # 在子进程中重新生成session
        self.session = AsyncService().scoped_session()

        while True:
            try:
                args, kwargs = q.get()
                logging.info("loop: func=%s, args=%s, kwargs=%s", service_func, args, kwargs)
                service_func(self, *args, **kwargs)
            except Exception:
                logging.error("run task error: %s", traceback.format_exc())

        # actually, it will never stop
        # self.scoped_session.remove()

    def async_mode(self):
        ''' for unittest '''
        return True

    @staticmethod
    def register_service(service_func):
        name = service_func.__name__
        logging.error("service register <%s>", name)

        def func_wrapper(ins: AsyncService, *args, **kwargs):
            logging.error("service call %s(%s, %s)", name, args, kwargs)

            s = AsyncService()
            ins.setup(s.db, s.scoped_session)

            if not s.async_mode():
                logging.error("exec in func mode")
                return service_func(ins, *args, **kwargs)

            q = ins.start_service(service_func)
            q.put((args, kwargs))
            return None
        return func_wrapper

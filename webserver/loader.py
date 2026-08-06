#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import json
import logging
import os
import stat
import sys
import tempfile
import traceback


def atomic_write_text(path, text):
    directory = os.path.dirname(path)
    filename = os.path.basename(path)
    fd, temp_path = tempfile.mkstemp(dir=directory, prefix=".%s." % filename, suffix=".tmp")
    try:
        try:
            mode = stat.S_IMODE(os.stat(path).st_mode)
        except FileNotFoundError:
            mode = 0o644
        os.fchmod(fd, mode)
        with os.fdopen(fd, "w", encoding="utf-8") as output:
            output.write(text)
            output.flush()
            os.fsync(output.fileno())
        os.replace(temp_path, path)
    except Exception:
        try:
            os.close(fd)
        except OSError:
            pass
        raise
    finally:
        try:
            os.remove(temp_path)
        except OSError:
            pass


class SettingsLoader(dict):
    def __init__(self, *args, **kwargs):
        super(SettingsLoader, self).__init__(*args, **kwargs)
        self.loadfile()

    def clear(self):
        for key in list(self.keys()):
            self.pop(key)

    def set_store_path(self):
        p = self.get("settings_path", "").strip()
        if not os.path.isdir(p):
            p = os.path.dirname(__file__)
        if sys.path[0] != p:
            sys.path.insert(0, p)
        return p

    def loadfile(self):
        try:
            import webserver.settings

            self.update(webserver.settings.settings)
        except:
            logging.error(traceback.format_exc())
            pass

        self.set_store_path()

        try:
            import auto

            self.update(auto.settings)
        except:
            pass

        try:
            import manual

            self.update(manual.settings)
        except:
            pass

    def dumpfile(self, filename="auto.py"):
        s = "\n".join("%-30s: %s," % (repr(k), repr(v)) for k, v in sorted(self.items()))
        code = (
            """#!/usr/bin/env python3
#-*- coding: UTF-8 -*-

import os
settings = {
"""
            + s
            + """
}
"""
        )

        d = self.set_store_path()
        py = os.path.join(d, filename)
        pyc = os.path.join(d, filename + "c")
        logging.error("saving settings file: %s" % py)
        atomic_write_text(py, code)
        try:
            os.remove(pyc)
        except:
            pass

    def loads(self, text):
        self.update(json.loads(text))

    def dumps(self):
        return json.dumps(self)


_settings = SettingsLoader()


def get_settings():
    return _settings

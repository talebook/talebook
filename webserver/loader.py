#!/usr/bin/python
#-*- coding: UTF-8 -*-

import os, json, sys, logging

class SettingsLoader(dict):
    def __init__(self, *args, **kwargs):
        super(SettingsLoader, self).__init__(*args, **kwargs)
        self.loadfile()

    def clear(self):
        for key in self.keys():
            self.pop(key)

    def loadfile(self):
        try:
            import settings
            self.update(settings.settings)
        except:
            pass

        self.settings_path = self.get('settings_path', None)
        if self.settings_path: sys.path.insert(0, self.settings_path)

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
        s = "\n".join( '%-30s: %s,' % ("'"+k+"'", repr(v)) for k,v in sorted(self.items()) )
        code = u'''#!/usr/bin/python
#-*- coding: UTF-8 -*-

import os
settings = {
''' + s + '''
}
'''

        d = self.settings_path
        if not d: d = os.path.dirname(__file__)
        py = os.path.join(d, filename)
        pyc = os.path.join(d, filename+"c")
        logging.error("saving settings file: %s" % py)
        open(py, "w").write(code.encode("UTF-8"))
        try: os.remove(pyc)
        except: pass

    def loads(self, text):
        self.update( json.loads(text) )

    def dumps(self):
        return json.dumps(self)

_settings = SettingsLoader()
def get_settings():
    return _settings



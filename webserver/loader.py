#!/usr/bin/python
#-*- coding: UTF-8 -*-

import os, json

class SettingsLoader(dict):
    def __init__(self, *args, **kwargs):
        super(SettingsLoader, self).__init__(*args, **kwargs)
        self.loadfile()

    def loadfile(self):
        try:
            import settings
            self.update(settings.settings)
        except:
            pass

        try:
            import settings_auto
            self.update(settings_auto.settings)
        except:
            pass

        try:
            import settings_manual
            self.update(settings_manual.settings)
        except:
            pass

    def dumpfile(self, filename="settings_auto.py"):
        s = "\n".join( '%-30s: %s,' % ("'"+k+"'", repr(v)) for k,v in sorted(self.items()) )
        code = u'''#!/usr/bin/python
#-*- coding: UTF-8 -*-

import os
settings = {
''' + s + '''
}
'''

        py = os.path.join(os.path.dirname(__file__), filename)
        open(py, "w").write(code.encode("UTF-8"))
        pyc = os.path.join(os.path.dirname(__file__), filename+"c")
        try: os.remove(pyc)
        except: pass

    def loads(self, text):
        self.update( json.loads(text) )

    def dumps(self):
        return json.dumps(self)

_settings = SettingsLoader()
def get_settings():
    return _settings



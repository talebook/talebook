#!/usr/bin/python
#-*- coding: UTF-8 -*-

import os

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
            import local_settings
            self.update(local_settings.settings)
        except:
            pass

    def dumpfile(self):
        s = "\n".join( '%-30s: %s,' % ("'"+k+"'", repr(v)) for k,v in sorted(s.items()) )
        code = u'''#!/usr/bin/python
#-*- coding: UTF-8 -*-

import os
settings = {
''' + s + '''
}
'''
        open("local_settings.py", "w").write(code.encode("UTF-8"))
        os.remove("local_settings.pyc")

    def loadjson(self, text):
        self.update( json.loads(text) )

    def dumpjson(self):
        return json.dumps(self)

_settings = SettingsLoader()
def get_settings():
    return _settings



#!/usr/bin/env python2

"""
This is the standard runscript for all of calibre's tools.
Do not modify it unless you know what you are doing.
"""

import sys, os

path = os.environ.get('CALIBRE_PYTHON_PATH', '/usr/lib/calibre')
if path not in sys.path:
    sys.path.insert(0, path)

sys.resources_location = os.environ.get('CALIBRE_RESOURCES_PATH', '/usr/share/calibre')
sys.extensions_location = os.environ.get('CALIBRE_EXTENSIONS_PATH', '/usr/lib/calibre/calibre/plugins')
sys.executables_location = os.environ.get('CALIBRE_EXECUTABLES_PATH', '/usr/bin')

import webserver
sys.template_location = os.path.dirname(webserver.__file__)
print sys.template_location

sys.exit(webserver.main())

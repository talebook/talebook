#!/usr/bin/env python2

"""
This is the standard runscript for all of calibre's tools.
Do not modify it unless you know what you are doing.
"""

import os, sys
from webserver import server

sys.path.append( os.path.dirname(server.__file__) )
sys.exit(server.main())


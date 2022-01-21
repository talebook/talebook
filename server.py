#!/usr/bin/env python3

"""
This is the standard runscript for all of calibre's tools.
Do not modify it unless you know what you are doing.
"""

import os, sys
import webserver

sys.path.append(os.path.dirname(webserver.__file__))

import webserver.server

sys.exit(webserver.server.main())

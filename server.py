#!/usr/bin/env python3

"""
This is the standard runscript for all of calibre's tools.
Do not modify it unless you know what you are doing.
"""

import os
import sys

import webserver.main

sys.exit(webserver.main.main())

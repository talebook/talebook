#!/usr/bin/python
#-*- coding: UTF-8 -*-

import json
import sys
import logging
from urllib import quote_plus as urlencode


def json_output(self, vals):
    items = [ {"name": x, "count": y} for x,y in vals['tags'] ]
    d = {"title": vals['title'], "items": items }
    return json.dumps(d)


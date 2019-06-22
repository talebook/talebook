#!/usr/bin/python
#-*- coding: UTF-8 -*-

import json
import sys
import logging
from urllib import quote_plus as urlencode


def json_output(self, vals):
    items = [ {"id": x, "name": y} for x,y in vals['publishers'] ]
    d = {"title": vals['title'], "items": items }
    return json.dumps(d)


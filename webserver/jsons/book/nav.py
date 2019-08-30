#!/usr/bin/python
#-*- coding: UTF-8 -*-

import sys
import logging

def json_output(self, vals):
    navs = []
    for h1, tags in vals['navs']:
        new_tags = [{"name": v[0], "count": v[1]} for v in tags ]
        navs.append( {"legend": h1, "tags": new_tags } )
    return {"navs": navs}


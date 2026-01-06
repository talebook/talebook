#!/usr/bin/python3
# -*- coding: UTF-8 -*-

import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.realpath(__file__))))

from tests.test_baike import *
from tests.test_douban import *
from tests.test_main import *
from tests.test_models import *
from tests.test_upload import *
from tests.test_ssl_crt import *
from tests.test_scan import *
from tests.test_admin import *
from tests.test_utils import *
from tests.test_youshu import *
import unittest

if __name__ == "__main__":
    unittest.main()

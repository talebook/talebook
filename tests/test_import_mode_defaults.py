"""Index-only defaults for the Python compatibility path."""

import unittest
from unittest import mock

from webserver.services.scan import CONF, normalize_import_mode
from webserver.settings import settings


class TestImportModeDefaults(unittest.TestCase):
    def test_fresh_site_uses_index(self):
        self.assertEqual(settings["import_mode"], "index")

    def test_missing_or_invalid_configuration_uses_index(self):
        for config in ({}, {"import_mode": "invalid"}):
            with self.subTest(config=config), mock.patch.dict(CONF, config, clear=True):
                self.assertEqual(normalize_import_mode(), "index")

    def test_explicit_and_saved_modes_remain_available(self):
        with mock.patch.dict(CONF, {"import_mode": "index"}, clear=True):
            self.assertEqual(normalize_import_mode("copy"), "copy")
            self.assertEqual(normalize_import_mode("move"), "move")
            self.assertEqual(normalize_import_mode(delete_after=True), "move")
        with mock.patch.dict(CONF, {"import_mode": "copy"}, clear=True):
            self.assertEqual(normalize_import_mode(), "copy")

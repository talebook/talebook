#!/usr/bin/python
# -*- coding: UTF-8 -*-


class PageError(Exception):
    """Raised when a page is not found"""

    def __init__(self, word):
        self.word = word
        self.msg = "词条 [%s] 不存在" % word

    def __str__(self):
        return repr(self.msg)


class DisambiguationError(Exception):
    """Raised when a page is a disambiguation page"""

    def __init__(self, word, options):
        self.word = word
        self.options = options
        self.msg = "词条 [%s] 存在歧义，可选选项：%s" % (word, ", ".join(options))

    def __str__(self):
        return repr(self.msg)


class VerifyError(Exception):
    """Raised when a page requires verification"""

    def __init__(self, word):
        self.word = word
        self.msg = "词条 [%s] 需要验证" % word

    def __str__(self):
        return repr(self.msg)

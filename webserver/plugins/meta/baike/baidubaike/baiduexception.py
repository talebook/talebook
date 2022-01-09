#-*-coding:utf-8-*-
import sys

class BaidubaikeException(Exception):
    """ Base Baidubaike exception class. """

    def __init__(self, error):
        self.error = error

    def __unicode__(self):
        return "An unknown error occured: \"{0}\". Please report it on GitHub!".format(self.error)

    if sys.version_info > (3, 0):
        def __str__(self):
            return self.__unicode__()

    else:
        def __str__(self):
            return self.__unicode__().encode('utf-8')


class PageError(BaidubaikeException):
    """ Exception raised when a page does not exist. """
    def __init__(self, page_title):
        self.title = page_title

    def __unicode__(self):
        return u"\"{0}\" does not match any pages.".format(self.title)


class DisambiguationError(BaidubaikeException):
    """ Exception raised when a page resolves to a Disambiguation page. """

    def __init__(self, title, may_refer_to):
        self.title = title
        self.options = [' -- '.join(item) for item in may_refer_to.items()]

    def __unicode__(self):
        return u"\"{0}\" may refer to: \n{1}".format(self.title, '\n'.join(self.options))


class VerifyError(BaidubaikeException):
    """ Exception raised when a verify-code appears. """

    def __init__(self, title):
        self.title = title

    def __unicode__(self):
        return u"The page \"{0}\" requires verifying. Query may be too frequent".format(self.title)

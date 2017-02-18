#!/usr/bin/python
#-*- coding: UTF-8 -*-

import logging
import douban
import subprocess
from handlers.base_handlers import *

from calibre.ebooks.metadata import authors_to_string
from calibre.ebooks.conversion.plumber import Plumber
from calibre.customize.conversion import OptionRecommendation, DummyReporter
from calibre import isbytestring, force_unicode
from email.header import Header
from email.mime.base import MIMEBase
from email.mime.text import MIMEText

def create_mail2(from_, to, subject, text=None, attachment_data=None, attachment_type=None, attachment_name=None):
    assert text or attachment_data

    from email.mime.multipart import MIMEMultipart
    from email.utils import formatdate
    from email import encoders

    mail = MIMEMultipart()
    mail['Subject'] = subject
    mail['To'] = to
    mail['From'] = from_
    mail['Date'] = formatdate(localtime=True)
    mail.preamble = 'You will not see this in a MIME-aware mail reader.\n'

    if text is not None:
        if isbytestring(text):
            msg = MIMEText(text)
        else:
            msg = MIMEText(text, 'plain', 'utf-8')
        mail.attach(msg)

    if attachment_data is not None:
        assert attachment_data and attachment_name
        name = Header(attachment_name, 'utf-8').encode()
        subtype = 'octet-stream;\n\tcharset="utf-8";\n\tname=%s' % name
        msg = MIMEBase('application', subtype)
        msg.set_payload(attachment_data)
        encoders.encode_base64(msg)
        msg.add_header('Content-Disposition', 'attachment',
                       filename=Header(attachment_name, 'utf-8').encode())
        mail.attach(msg)

    return mail.as_string()


def do_send_mail():
    mail_to = 'talebook.cn@kindle.cn'
    fpath = '/data/books/library/(/(Ying )Ken Fu Lai Te Ken Follett/Ju Ren De Yun Luo (Gong 3Ce ) (8785)/Ju Ren De Yun Luo (Gong 3Ce ) - (Ying )Ken Fu Lai Te Ken Follett.mobi'
    fname = 'juren.mobi'
    body = open(fpath).read()

    # content type
    mt = 'application/x-mobipocket-ebook'
    mt = 'application/octet-stream;\n\tcharset="utf-8";\n\t'

    # send mail: 必须是英文，否则amazon无法正确处理
    mail_from = tweaks['smtp_username']
    mail_subject = _('Enjoy the book 4!') % vars()
    mail_body = (u'We Send this book to your kindle. Just enjoy reading it. 中文 ' % vars())
    status = msg = ""
    logging.info('send to %(mail_to)s' % vars())
    mail = create_mail2(mail_from, mail_to, mail_subject,
            text = mail_body, attachment_data = body,
            attachment_type = mt, attachment_name = fname
            )
    print mail
    return
    sendmail(mail, from_=mail_from, to=[mail_to], timeout=30,
            relay=tweaks['smtp_server'],
            username=tweaks['smtp_username'],
            password=tweaks['smtp_password']
            )
    status = "success"
    msg = _('Send to [%(mail_to)s] success!!') % vars()
    logging.info(msg)
    return




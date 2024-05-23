#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import hashlib
import logging

from gettext import gettext as _

from webserver import loader
from webserver.services import AsyncService

CONF = loader.get_settings()


class MailService(AsyncService):
    def create_mail(self, sender, to, subject, body, attachment_data, attachment_name):
        from email.header import Header
        from email.mime.application import MIMEApplication
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText
        from email.utils import formatdate

        mail = MIMEMultipart()
        mail["From"] = sender
        mail["To"] = to
        mail["Subject"] = Header(subject, "utf-8")
        mail["Date"] = formatdate(localtime=True)
        mail["Message-ID"] = "<tencent_%s@qq.com>" % hashlib.md5(mail.as_string().encode("UTF-8")).hexdigest()
        mail.preamble = "You will not see this in a MIME-aware mail reader.\n"

        if body is not None:
            msg = MIMEText(body, "plain", "utf-8")
            mail.attach(msg)

        if attachment_data is not None:
            name = Header(attachment_name, "utf-8").encode()
            msg = MIMEApplication(attachment_data, "octet-stream", charset="utf-8", name=name)
            msg.add_header("Content-Disposition", "attachment", filename=name)
            mail.attach(msg)
        return mail.as_string()

    # 系统配置时需要以阻塞模式测试邮件功能
    def do_send_mail(self, sender, to, subject, body, attachment_data=None, attachment_name=None, **kwargs):
        from calibre.utils.smtp import sendmail

        smtp_port = 465
        relay = kwargs.get("relay", CONF["smtp_server"])
        if ':' in relay:
            relay, smtp_port = relay.split(":")
        username = kwargs.get("username", CONF["smtp_username"])
        password = kwargs.get("password", CONF["smtp_password"])
        enc = kwargs.get("encryption", CONF["smtp_encryption"])
        mail = self.create_mail(sender, to, subject, body, attachment_data, attachment_name)
        sendmail(
            mail,
            from_=sender,
            to=[to],
            timeout=20,
            port=int(smtp_port),
            encryption=enc,
            relay=relay,
            username=username,
            password=password,
        )

    @AsyncService.register_service
    def send_mail(self, sender, to, subject, body, attachment_data=None, attachment_name=None, **kwargs):
        return self.do_send_mail(sender, to, subject, body, attachment_data, attachment_name, **kwargs)

    @AsyncService.register_service
    def send_book(self, user_id: int, site_url: str, book: dict, mail_to: str, fmt: str, fpath: str):
        from calibre.ebooks.metadata import authors_to_string

        # read meta info
        author = authors_to_string(book["authors"] if book["authors"] else [_(u"佚名")])
        title = book["title"] if book["title"] else _(u"无名书籍")
        fname = u"%s - %s.%s" % (title, author, fmt)
        with open(fpath, "rb") as f:
            fdata = f.read()

        mail_args = {
            "title": title,
            "site_url": site_url,
            "site_title": CONF["site_title"],
        }
        mail_from = CONF["smtp_username"]
        mail_subject = _(CONF["push_title"]) % mail_args
        mail_body = _(CONF["push_content"]) % mail_args
        status = msg = ""
        try:
            logging.info("send %(title)s to %(mail_to)s" % vars())
            self.do_send_mail(mail_from, mail_to, mail_subject, mail_body, fdata, fname)
            status = "success"
            msg = _("[%(title)s] 已成功发送至Kindle邮箱 [%(mail_to)s] !!") % vars()
            logging.info(msg)
        except:
            import traceback

            logging.error("Failed to send to kindle: %s" % mail_to)
            logging.error(traceback.format_exc())
            status = "danger"
            msg = traceback.format_exc()
        self.add_msg(user_id, status, msg)
        return

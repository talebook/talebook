#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import logging
import datetime
from gettext import gettext as _

import tornado.escape
from webserver.handlers.base import BaseHandler, auth, js
from webserver.models import Review, ReviewBook, ReviewChapter

from sqlalchemy import func, or_
from webserver.utils import super_strip

# reader在获取toc后，将toc传递给server，然后构建对应的结构表；
# book_id -> [chapter_id] -> [segment_id]
# 每个toc展平，自身名称作为chapter_id，名称
# 每个p计算最近的一个chapter的距离 N 作为序号id


class ReviewSummary(BaseHandler):
    """获取「某书」+「某章节」的各个段落的评论数量"""

    def should_be_invited(self):
        pass

    @js
    def get(self):
        book_id = super_strip(self.get_argument("book_id", ""))
        chapter_name = super_strip(self.get_argument("chapter_name", ""))
        if not book_id or not chapter_name or not book_id.isdigit():
            return {"err": "params.invalid", "msg": _("参数错误")}

        # 查一下对应的章节信息是否存在
        name = ReviewChapter.clean_title(chapter_name)
        q = self.session.query(ReviewChapter)
        q = q.filter(ReviewChapter.book_id == book_id)
        q = q.filter(or_(ReviewChapter.title == name, ReviewChapter.alias == chapter_name))
        chapter = q.first()
        if chapter is None:
            return {"err": "ok", "data": {"list": []}}

        # 查询评论数量
        q = self.session.query(Review.segment_id, func.count().label("cnt"))
        q = q.filter(Review.book_id == book_id, Review.chapter_id == chapter.id)
        q = q.group_by(Review.segment_id)

        data = []
        for row in q.all():
            segment_id, cnt = row
            data.append({"segmentId": segment_id, "reviewNum": cnt})
        return {"err": "ok", "data": {"chapter_id": chapter.id, "list": data}}


class ReviewList(BaseHandler):
    """获取某个段落的所有评论"""

    def should_be_invited(self):
        pass

    @js
    def get(self):
        book_id = self.get_argument("book_id", "").strip()
        chapter_id = self.get_argument("chapter_id", "").strip()
        segment_id = self.get_argument("segment_id", "").strip()
        if not book_id or not chapter_id or not segment_id:
            return {"err": "params.invalid", "msg": _("参数错误")}

        if not book_id.isdigit() or not chapter_id.isdigit() or not segment_id.isdigit():
            return {"err": "params.invalid", "msg": _("参数错误")}

        q = self.session.query(Review).filter(
            Review.book_id == int(book_id), Review.chapter_id == int(chapter_id), Review.segment_id == int(segment_id)
        )

        data = [row.to_full_dict(self.current_user) for row in q.all()]

        demo = {
            "reviewId": "1063367226805911552",
            "cbid": "25583693309808304",
            "ccid": "69203747871449297",
            "guid": "854065516235",
            "userId": "409829755",
            "nickName": "约克君",
            "avatar": "https://qidian.gtimg.com/qd/images/ico/default_user.0.2.png",
            "segmentId": 5,
            "content": "好地方，不会饿[fn=18]",
            "status": 1,
            "createTime": "10-15 08:37:59",
            "createTimestamp": 1728952679,
            "updateTime": "2024-11-16 13:36:10",
            "quoteReviewId": "0",
            "quoteContent": "",
            "quoteGuid": "0",
            "quoteUserId": "0",
            "quoteNickName": "",
            "type": 2,
            "likeCount": 9,
            "dislikeCount": 0,
            "userLike": False,
            "userDislike": False,
            "isSelf": False,
            "essenceStatus": False,
            "riseStatus": False,
            "level": 948,
            "imagePre": "",
            "imageDetail": "",
            "rootReviewId": "1063367226805911552",
            "rootReviewReplyCount": 0,
            "ipAddress": "上海",
        }
        return {"err": "ok", "data": {"list": data}, "demo": demo}


class ReviewAdd(BaseHandler):
    """发表评论"""

    @js
    @auth
    def post(self):
        data = tornado.escape.json_decode(self.request.body)
        if not data:
            return {"err": "params.invalid", "msg": _("参数错误")}

        book_id = data['book_id']
        chapter_name = data['chapter_name']
        del data['chapter_name']

        # 查一下对应的章节信息是否存在
        name = ReviewChapter.clean_title(chapter_name)
        q = self.session.query(ReviewChapter)
        q = q.filter(ReviewChapter.book_id == book_id)
        q = q.filter(or_(ReviewChapter.title == name, ReviewChapter.alias == chapter_name))
        chapter = q.first()

        if chapter is None:
            chapter = ReviewChapter(book_id=book_id, title=name, alias=chapter_name)
            chapter.save()

        n = (
            self.session.query(Review)
            .filter(
                Review.book_id == book_id,
                Review.chapter_id == chapter.id,
                Review.segment_id == data["segment_id"],
            )
            .count()
        )

        review = Review(**data)
        review.level = n + 1
        review.chapter_id = chapter.id
        review.geo = self.request.remote_ip
        review.user_id = self.current_user.id
        review.create_time = datetime.datetime.now()
        review.update_time = review.create_time
        try:
            review.save()
            self.session.commit()
        except:
            logging.exception("save review fail")
            self.session.rollback()

        if review.quote_id:
            review.quote.update_time = datetime.datetime.now()
            review.quote.save()

        if review.root_id:
            review.root.update_time = datetime.datetime.now()
            review.root.save()

        return {"err": "ok", "data": review.to_full_dict(self.current_user)}


class ReviewMe(BaseHandler):
    """获取「与我相关」的「最新」评论"""

    @js
    @auth
    def get(self):
        is_count = self.get_argument("count", "").strip() != ""
        last_read = self.current_user.extra.get("last_read", "")
        q = self.session.query(Review).filter(Review.user_id == self.current_user.id)
        if last_read:
            q = q.filter(Review.update_time > last_read)
        else:
            q = q.filter(Review.update_time > Review.create_time)

        if is_count:
            return {"err": "ok", "data": {"count": q.count()}}

        data = [row.to_full_dict(self.current_user) for row in q.all()]
        return {"err": "ok", "data": {"list": data}}


class ReviewGetBook(BaseHandler):
    """获取本书的信息（新书自动生成ID）"""

    @js
    def get(self):
        title = self.get_argument("title", "").strip().lower()
        calibre_id = int(self.get_argument("calibre_id", "0").strip())

        if not title:
            return {"err": "params.invalid", "msg": _("参数错误")}

        row = self.session.query(ReviewBook).filter(ReviewBook.calibre_id == calibre_id).first()
        if row:
            return {"err": "ok", "data": row.to_dict()}

        row = self.session.query(ReviewBook).filter(ReviewBook.title == title).first()
        if row:
            return {"err": "ok", "data": row.to_dict()}

        row = self.session.query(ReviewBook).filter(ReviewBook.alias.like(f"%{title}%")).first()
        if row:
            return {"err": "ok", "data": row.to_dict()}

        row = ReviewBook()
        row.title = title
        row.alias = title
        row.calibre_id = calibre_id
        row.save()
        return {"err": "ok", "data": row.to_dict()}


def routes():
    return [
        (r"/api/review/book", ReviewGetBook),
        (r"/api/review/summary", ReviewSummary),
        (r"/api/review/list", ReviewList),
        (r"/api/review/add", ReviewAdd),
        (r"/api/review/me", ReviewMe),
    ]

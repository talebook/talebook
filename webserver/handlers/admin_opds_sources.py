#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""
OPDS 源配置管理 Handler
用于管理用户保存的 OPDS 服务器配置
"""

import datetime
import logging
import traceback

import tornado

from webserver import loader
from webserver.handlers.base import BaseHandler, is_admin, js
from webserver.i18n import _
from webserver.models import OpdsSource


CONF = loader.get_settings()


class AdminOpdsSources(BaseHandler):
    """OPDS 源配置管理接口"""

    @js
    @is_admin
    def get(self):
        """获取所有 OPDS 源配置列表"""
        try:
            sources = self.session.query(OpdsSource).order_by(OpdsSource.create_time.desc()).all()
            items = []
            for src in sources:
                items.append(
                    {
                        "id": src.id,
                        "name": src.name,
                        "url": src.url,
                        "description": src.description or "",
                        "active": src.active,
                        "create_time": src.create_time.strftime("%Y-%m-%d %H:%M:%S") if src.create_time else None,
                        "update_time": src.update_time.strftime("%Y-%m-%d %H:%M:%S") if src.update_time else None,
                    }
                )
            return {"err": "ok", "items": items, "count": len(items)}
        except Exception as e:
            logging.error(f"获取 OPDS 源列表失败：{e}")
            logging.error(traceback.format_exc())
            return {"err": "error", "msg": _("获取 OPDS 源列表失败：{}").format(str(e))}

    @js
    @is_admin
    def post(self):
        """创建新的 OPDS 源配置"""
        try:
            req = tornado.escape.json_decode(self.request.body)
            name = req.get("name", "").strip()
            url = req.get("url", "").strip()
            description = req.get("description", "").strip()

            if not name or not url:
                return {"err": "params.error", "msg": _("名称和 OPDS URL 为必填项")}

            # 验证 URL 格式
            if not url.startswith(("http://", "https://")):
                return {
                    "err": "params.url.invalid",
                    "msg": _("OPDS URL 必须以 http:// 或 https:// 开头"),
                }

            # 检查名称是否已存在
            existing = self.session.query(OpdsSource).filter(OpdsSource.name == name).first()
            if existing:
                return {"err": "params.name.exist", "msg": _("OPDS 源名称已存在")}

            # 创建新配置
            source = OpdsSource(name=name, url=url, description=description)
            source.save()

            return {"err": "ok", "msg": _("OPDS 源配置保存成功"), "id": source.id}
        except Exception as e:
            logging.error(f"创建 OPDS 源配置失败：{e}")
            logging.error(traceback.format_exc())
            return {"err": "error", "msg": _("创建 OPDS 源配置失败：{}").format(str(e))}

    @js
    @is_admin
    def put(self):
        """更新 OPDS 源配置"""
        try:
            req = tornado.escape.json_decode(self.request.body)
            source_id = req.get("id")

            if not source_id:
                return {"err": "params.error", "msg": _("需要提供配置 ID")}

            source = self.session.query(OpdsSource).filter(OpdsSource.id == source_id).first()
            if not source:
                return {"err": "params.not_found", "msg": _("未找到该 OPDS 源配置")}

            # 更新字段
            if "name" in req:
                name = req["name"].strip()
                if not name:
                    return {"err": "params.error", "msg": _("名称不能为空")}
                # 检查名称是否与其他配置冲突
                existing = self.session.query(OpdsSource).filter(OpdsSource.name == name, OpdsSource.id != source_id).first()
                if existing:
                    return {"err": "params.name.exist", "msg": _("OPDS 源名称已存在")}
                source.name = name

            if "url" in req:
                url = req["url"].strip()
                if not url:
                    return {"err": "params.error", "msg": _("OPDS URL 不能为空")}
                # 验证 URL 格式
                if not url.startswith(("http://", "https://")):
                    return {
                        "err": "params.url.invalid",
                        "msg": _("OPDS URL 必须以 http:// 或 https:// 开头"),
                    }
                source.url = url

            if "description" in req:
                source.description = req["description"].strip()

            if "active" in req:
                source.active = req["active"]

            source.update_time = datetime.datetime.now()
            source.save()

            return {"err": "ok", "msg": _("OPDS 源配置更新成功")}
        except Exception as e:
            logging.error(f"更新 OPDS 源配置失败：{e}")
            logging.error(traceback.format_exc())
            return {"err": "error", "msg": _("更新 OPDS 源配置失败：{}").format(str(e))}

    @js
    @is_admin
    def delete(self):
        """删除 OPDS 源配置"""
        try:
            req = tornado.escape.json_decode(self.request.body)
            source_id = req.get("id")

            if not source_id:
                return {"err": "params.error", "msg": _("需要提供配置 ID")}

            source = self.session.query(OpdsSource).filter(OpdsSource.id == source_id).first()
            if not source:
                return {"err": "params.not_found", "msg": _("未找到该 OPDS 源配置")}

            self.session.delete(source)
            self.session.commit()

            return {"err": "ok", "msg": _("OPDS 源配置删除成功")}
        except Exception as e:
            logging.error(f"删除 OPDS 源配置失败：{e}")
            logging.error(traceback.format_exc())
            return {"err": "error", "msg": _("删除 OPDS 源配置失败：{}").format(str(e))}


def routes():
    """注册路由"""
    return [
        (r"/api/admin/opds/sources", AdminOpdsSources),
    ]

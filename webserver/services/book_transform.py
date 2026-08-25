"""新书入库后的正文自动处理。

只有把连接的 ``trigger`` 显式配成 ``auto``、且插件声明了
``supports_auto_trigger`` 的处理才会在这里执行。自动改写用户刚上传的文件
不可逆，因此：默认不做；先试算，无变更则不写；每次执行都留 PluginRun。
"""

import datetime
import logging
import os
import shutil
import tempfile

from webserver import loader
from webserver.models import PluginConnection, PluginInstallation, PluginRun
from webserver.plugins.texttools import fix_bytes
from webserver.services.async_service import AsyncService
from webserver.services.booktools import get_format_path, overwrite_format, resolve_book
from webserver.services.plugin_runtime import DEFAULT_COUNTS


TXT_FIXER_PLUGIN_KEY = "talebook.tool.txt-fixer"


def _instance_connection(session, plugin_key):
    return (
        session.query(PluginConnection)
        .join(PluginInstallation, PluginInstallation.id == PluginConnection.installation_id)
        .filter(
            PluginInstallation.plugin_key == plugin_key,
            PluginInstallation.enabled.is_(True),
            PluginConnection.owner_type == "instance",
            PluginConnection.enabled.is_(True),
        )
        .first()
    )


@AsyncService.register_service
def auto_fix_encoding(service, book_id, requested_by):
    """后台入口：注册为异步服务，调用即入队。"""
    return fix_encoding_for_book(service.session, service.db, book_id, requested_by)


def fix_encoding_for_book(session, calibre_db, book_id, requested_by):
    """检测新书 TXT 编码，仅在确实需要修复时才写回。"""
    connection = _instance_connection(session, TXT_FIXER_PLUGIN_KEY)
    if connection is None:
        return None

    now = datetime.datetime.now()
    run = PluginRun(
        connection_id=connection.id,
        action="run",
        trigger="auto",
        status="running",
        requested_by=requested_by,
        counts=dict(DEFAULT_COUNTS),
        input_data={"book_id": book_id},
        create_time=now,
        started_at=now,
    )
    session.add(run)
    session.commit()

    work_dir = None
    try:
        book = resolve_book(calibre_db, book_id)
        if "TXT" not in [item.upper() for item in (book.get("available_formats") or [])]:
            raise RuntimeError("该书籍没有 TXT 格式")

        src = get_format_path(calibre_db, book_id, "TXT")
        with open(src, "rb") as handle:
            data = handle.read()

        # 先试算：编码本就正确、或无法安全修复时都不写。
        text, report = fix_bytes(data)
        if report.get("unrecoverable") or (report.get("garbage") and not report.get("mojibake")):
            raise RuntimeError("疑似多重误读或混用编码，跳过自动修复")
        if str(report.get("encoding") or "").lower().replace("-", "") in ("utf8", "ascii"):
            run.status = "succeeded"
            run.counts = {**DEFAULT_COUNTS, "fetched": 1, "skipped": 1}
            run.cursor_after = {"book_id": book_id, "reason": "编码已正确，无需修复"}
            run.finished_at = datetime.datetime.now()
            session.commit()
            return run

        work_dir = tempfile.mkdtemp(prefix="talebook-auto-transform-")
        out_path = os.path.join(work_dir, "fixed.txt")
        with open(out_path, "wb") as handle:
            handle.write(text.encode("utf-8"))

        backup_dir = os.path.join(str(loader.get_settings().get("convert_path") or tempfile.gettempdir()), "texttools-backups")
        os.makedirs(backup_dir, exist_ok=True)
        overwrite_format(calibre_db, book_id, "TXT", out_path, backup_dir=backup_dir)

        run.status = "succeeded"
        run.counts = {**DEFAULT_COUNTS, "fetched": 1, "updated": 1}
        run.cursor_after = {"book_id": book_id, "encoding": report.get("encoding"), "backup_dir": backup_dir}
        run.finished_at = datetime.datetime.now()
        session.commit()
        logging.info("[auto-transform] 已修复新书编码 book=%s enc=%s", book_id, report.get("encoding"))
        return run
    except Exception as err:
        run.status = "failed"
        run.error_code = "booktools.auto_failed"
        run.error_message = str(err)[:1000]
        run.finished_at = datetime.datetime.now()
        session.commit()
        logging.warning("[auto-transform] 新书自动修复失败 book=%s: %s", book_id, err)
        return run
    finally:
        if work_dir:
            shutil.rmtree(work_dir, ignore_errors=True)

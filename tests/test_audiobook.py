import datetime
import json
import shutil
import urllib.parse
import xml.etree.ElementTree as ET
from unittest import mock

from tests import test_main
from webserver import main, models
from webserver.handlers import audiobook as audiobook_handlers
from webserver.services.audiobook import AudiobookScheduler, AudiobookStorage, stable_json_hash, stable_site_uuid


def setUpModule():
    if test_main._app is None:
        test_main.setup_server()
        test_main.setup_mock_user()
        test_main.setup_mock_sendmail()
        test_main.setup_mock_service()


class AudiobookFixture:
    def setUp(self):
        super().setUp()
        session = test_main.get_db()
        for model in (
            models.PodcastAccessLog,
            models.PodcastSubscription,
            models.AudiobookBookmark,
            models.AudiobookPlaybackSession,
            models.AudiobookProgress,
            models.AudiobookChapter,
            models.AudiobookJob,
            models.AudiobookEdition,
        ):
            session.query(model).delete()
        session.commit()
        shutil.rmtree(main.CONF["AUDIOBOOK_PATH"], ignore_errors=True)
        AudiobookStorage().ensure()

    def seed_published_edition(self, chapter_count=2):
        session = test_main.get_db()
        now = datetime.datetime.now()
        edition = models.AudiobookEdition(
            book_id=test_main.BID_EPUB,
            status="published",
            engine="edgetts",
            config={"speed": "x1.0"},
            created_by=1,
            create_time=now,
            update_time=now,
            published_at=now,
            chapter_count=chapter_count,
            completed_count=chapter_count,
        )
        session.add(edition)
        session.flush()
        directory = AudiobookStorage().edition_dir(edition.id)
        (directory / "chapters").mkdir(parents=True)
        (directory / "timelines").mkdir(parents=True)
        chapters = []
        for number in range(1, chapter_count + 1):
            audio = directory / "chapters" / f"{number:04d}.mp3"
            payload = b"ID3" + bytes(range(64)) + bytes([number])
            audio.write_bytes(payload)
            timeline = directory / "timelines" / f"{number:04d}.json"
            timeline.write_text(
                json.dumps(
                    {
                        "chapter_number": number,
                        "segments": [
                            {
                                "id": f"c{number}-s1",
                                "start_ms": 0,
                                "end_ms": 1200,
                                "text": f"第 {number} 章测试正文",
                                "locator": {
                                    "href": "Text/section.xhtml",
                                    "css_selector": f"#p-{number}",
                                },
                            }
                        ],
                    },
                    ensure_ascii=False,
                ),
                encoding="utf-8",
            )
            chapter = models.AudiobookChapter(
                edition_id=edition.id,
                source_key=f"Text/section.xhtml#chapter-{number}",
                number=number,
                title=f"第 {number} 章",
                audio_path=AudiobookStorage().relative(audio),
                timeline_path=AudiobookStorage().relative(timeline),
                duration_ms=1200,
                size_bytes=len(payload),
                content_hash=stable_json_hash([number, payload.hex()]),
                episode_guid=stable_json_hash([edition.book_id, number]),
                first_published_at=now + datetime.timedelta(seconds=number),
            )
            session.add(chapter)
            chapters.append(chapter)
        edition.duration_ms = chapter_count * 1200
        edition.size_bytes = sum(chapter.size_bytes for chapter in chapters)
        session.commit()
        return edition.id


class TestAudiobookAPI(AudiobookFixture, test_main.TestWithAdminUser):
    def test_audio_collection_and_resource_paths_use_consistent_nouns(self):
        edition_id = self.seed_published_edition()

        home = self.json("/api/audios/home")
        self.assertEqual(home["err"], "ok")
        collection = self.json("/api/audios")
        self.assertEqual(collection["total"], 1)
        book_audios = self.json(f"/api/book/{test_main.BID_EPUB}/audios")
        self.assertEqual(book_audios["editions"][0]["id"], edition_id)
        self.assertIn("EPUB", {item["format"] for item in book_audios["book"]["files"]})
        self.assertTrue(book_audios["generation"]["can_generate"])
        self.assertTrue(book_audios["generation"]["can_manage"])
        self.assertEqual(book_audios["generation"]["quality_options"], ["standard"])
        audio = self.json(f"/api/audio/{edition_id}")
        self.assertEqual(audio["manifest"]["id"], edition_id)
        published = self.json(
            f"/api/audio/{edition_id}",
            method="PATCH",
            body=json.dumps({"action": "publish"}),
        )
        self.assertEqual(published["edition"]["status"], "published")

        self.assertEqual(self.fetch("/api/audiobooks").code, 404)
        self.assertEqual(self.fetch(f"/api/audiobooks/{edition_id}/manifest").code, 404)
        self.assertEqual(self.fetch(f"/api/audiobook-editions/{edition_id}").code, 404)

    def test_reader_page_injects_published_audiobook(self):
        edition_id = self.seed_published_edition()
        response = self.fetch(f"/read/{test_main.BID_EPUB}")
        self.assertEqual(response.code, 200)
        page = response.body.decode("utf-8")
        self.assertIn(f"book_id: {test_main.BID_EPUB}", page)
        self.assertIn(f"audiobook_edition_id: {edition_id}", page)
        self.assertIn(f'"/api/audio/{edition_id}"', page)

    def test_voice_preview_accepts_qwen_voice_id_with_spaces(self):
        preview = AudiobookStorage().root / "qwen-preview.mp3"
        preview.write_bytes(b"ID3" + bytes(range(64)))
        catalog = {
            "voices": [
                {
                    "engine": "qwen3tts",
                    "voice_id": "Eldric Sage",
                    "preview_path": str(preview),
                }
            ]
        }
        result = mock.Mock(stdout=json.dumps(catalog))
        with mock.patch("webserver.handlers.audiobook.subprocess.run", return_value=result):
            response = self.fetch("/media/audio-voice/qwen3tts/Eldric%20Sage.mp3")
        self.assertEqual(response.code, 200)
        self.assertEqual(response.headers["Content-Type"], "audio/mpeg")
        self.assertEqual(response.body, preview.read_bytes())

    def test_create_deduplicate_cancel_and_retry_job(self):
        body = json.dumps({"mode": "quick", "engine": "edgetts", "speed": "x1.0"})
        created = self.json(
            f"/api/book/{test_main.BID_EPUB}/audio-jobs",
            method="POST",
            body=body,
        )
        self.assertEqual(created["err"], "ok")
        self.assertFalse(created["deduplicated"])
        job_id = created["job"]["id"]

        duplicate = self.json(
            f"/api/book/{test_main.BID_EPUB}/audio-jobs",
            method="POST",
            body=body,
        )
        self.assertTrue(duplicate["deduplicated"])
        self.assertEqual(duplicate["job"]["id"], job_id)

        cancelled = self.json(
            f"/api/audio-job/{job_id}",
            method="PATCH",
            body=json.dumps({"action": "cancel"}),
        )
        self.assertEqual(cancelled["job"]["status"], "cancelled")
        retried = self.json(
            f"/api/audio-job/{job_id}",
            method="PATCH",
            body=json.dumps({"action": "retry"}),
        )
        self.assertEqual(retried["job"]["status"], "queued")

        invalid_quality = self.json(
            f"/api/book/{test_main.BID_EPUB}/audio-jobs",
            method="POST",
            body=json.dumps({"mode": "quick", "engine": "edgetts", "quality": "high"}),
        )
        self.assertEqual(invalid_quality["err"], "params.invalid")
        self.assertIn("标准音质", invalid_quality["msg"])

    def test_job_list_includes_real_book_and_expandable_plan(self):
        created = self.json(
            f"/api/book/{test_main.BID_EPUB}/audio-jobs",
            method="POST",
            body=json.dumps({"mode": "quick", "engine": "edgetts", "speed": "x1.0"}),
        )

        response = self.json("/api/audio-jobs")
        self.assertEqual(response["err"], "ok")
        job = next(item for item in response["jobs"] if item["id"] == created["job"]["id"])
        self.assertEqual(job["book"]["id"], test_main.BID_EPUB)
        self.assertTrue(job["book"]["title"])
        self.assertTrue(job["book"]["author"])
        self.assertIn(f"/get/thumb_60x80/{test_main.BID_EPUB}.jpg", job["book"]["thumb"])
        self.assertTrue(job["plan"]["detailed"])
        self.assertEqual(job["plan"]["overall_percent"], 0)
        self.assertEqual(
            [phase["key"] for phase in job["plan"]["phases"]],
            ["queue", "inspect", "review", "generate", "finalize", "complete"],
        )
        self.assertEqual(job["plan"]["phases"][0]["status"], "current")
        self.assertNotIn("plan", job["data"])

    def test_low_disk_capacity_blocks_generation_and_job_creation(self):
        usage = mock.Mock(free=1 * 1024**3)
        with (
            mock.patch("webserver.handlers.audiobook.shutil.disk_usage", return_value=usage),
            mock.patch.dict("webserver.handlers.audiobook.CONF", {"AUDIOBOOK_MIN_FREE_GB": 5}),
        ):
            detail = self.json(f"/api/book/{test_main.BID_EPUB}/audios")
            created = self.json(
                f"/api/book/{test_main.BID_EPUB}/audio-jobs",
                method="POST",
                body=json.dumps({"mode": "quick", "engine": "edgetts"}),
            )

        self.assertFalse(detail["generation"]["capacity"]["ok"])
        self.assertFalse(detail["generation"]["can_generate"])
        self.assertEqual(detail["generation"]["reason"], "disk.low")
        self.assertEqual(created["err"], "audiobook.disk_low")
        self.assertEqual(test_main.get_db().query(models.AudiobookJob).count(), 0)

    def test_candidate_publish_partial_confirmation_and_historical_rollback(self):
        published_id = self.seed_published_edition()
        session = test_main.get_db()
        now = datetime.datetime.now()
        candidate = models.AudiobookEdition(
            book_id=test_main.BID_EPUB,
            status="ready",
            engine="edgetts",
            config={},
            created_by=1,
            create_time=now,
            update_time=now,
            chapter_count=1,
            completed_count=1,
        )
        partial = models.AudiobookEdition(
            book_id=test_main.BID_EPUB,
            status="partial",
            engine="edgetts",
            config={},
            created_by=1,
            create_time=now,
            update_time=now,
            chapter_count=1,
            completed_count=1,
        )
        session.add_all((candidate, partial))
        session.commit()

        rejected = self.json(
            f"/api/audio/{partial.id}",
            method="PATCH",
            body=json.dumps({"action": "publish"}),
        )
        self.assertEqual(rejected["err"], "partial.confirmation_required")

        activated = self.json(
            f"/api/audio/{candidate.id}",
            method="PATCH",
            body=json.dumps({"action": "publish"}),
        )
        self.assertEqual(activated["edition"]["status"], "published")
        session.expire_all()
        self.assertEqual(session.get(models.AudiobookEdition, published_id).status, "historical")

        rolled_back = self.json(
            f"/api/audio/{published_id}",
            method="PATCH",
            body=json.dumps({"action": "rollback"}),
        )
        self.assertEqual(rolled_back["edition"]["status"], "published")
        session.expire_all()
        self.assertEqual(session.get(models.AudiobookEdition, candidate.id).status, "historical")

    def test_advanced_workspace_validation_revision_and_confirm(self):
        session = test_main.get_db()
        now = datetime.datetime.now()
        edition = models.AudiobookEdition(
            book_id=test_main.BID_EPUB,
            status="draft",
            engine="edgetts",
            config={},
            created_by=1,
            create_time=now,
            update_time=now,
        )
        session.add(edition)
        session.flush()
        script = AudiobookStorage().edition_dir(edition.id) / "book.script"
        script.parent.mkdir(parents=True)
        script.write_text(
            """---
name: 测试书
description: 高级模式测试
---

## 角色表
# 角色 | 定位 | 类型 | 性别 | 年龄段 | 地域 | 音色描述 | 语速 | 音色覆盖
旁白 | 旁白 | 人类 | 男 | 中年 | 中国 | 沉稳 | x1.0 |
小明 | 配角 | 人类 | 男 | 青年 | 中国 | 明亮 | x1.0 |

## 章节 1 | 第一章 # 第一卷

[旁白] 很久以前。
[小明] 你好。
""",
            encoding="utf-8",
        )
        edition.script_path = AudiobookStorage().relative(script)
        job = models.AudiobookJob(
            book_id=test_main.BID_EPUB,
            edition_id=edition.id,
            creator_id=1,
            mode="advanced",
            status="awaiting_review",
            phase="AWAITING_REVIEW",
            config={},
            config_hash="advanced",
            data={"inspected": True},
            create_time=now,
            update_time=now,
        )
        session.add(job)
        session.commit()

        workspace = self.json(f"/api/audio-job/{job.id}/workspace")
        revision = workspace["workspace"]["revision"]
        invalid = self.json(
            f"/api/audio-job/{job.id}/workspace",
            method="PATCH",
            body=json.dumps(
                {
                    "kind": "chapter",
                    "chapter_number": 1,
                    "revision": revision,
                    "text": "[未定义角色] 这行应被拒绝",
                }
            ),
        )
        self.assertEqual(invalid["err"], "script.invalid")
        self.assertEqual(invalid["errors"][0]["line"], 1)

        updated = self.json(
            f"/api/audio-job/{job.id}/workspace",
            method="PATCH",
            body=json.dumps(
                {
                    "kind": "chapter",
                    "chapter_number": 1,
                    "revision": revision,
                    "text": "[旁白] 修改后的正文。\n[小明] 收到。",
                }
            ),
        )
        self.assertEqual(updated["err"], "ok")
        stale = self.json(
            f"/api/audio-job/{job.id}/workspace",
            method="PATCH",
            body=json.dumps(
                {
                    "kind": "chapter",
                    "chapter_number": 1,
                    "revision": revision,
                    "text": "[旁白] 旧版本覆盖。",
                }
            ),
        )
        self.assertEqual(stale["err"], "script.invalid")
        self.assertIn("刷新", stale["msg"])

        confirmed = self.json(f"/api/audio-job/{job.id}/confirm", method="POST", body="{}")
        self.assertEqual(confirmed["job"]["status"], "queued")
        self.assertTrue(confirmed["job"]["data"]["confirmed"])

    def test_manifest_range_progress_and_reading_state_are_independent(self):
        edition_id = self.seed_published_edition()
        session = test_main.get_db()
        edition = session.get(models.AudiobookEdition, edition_id)
        chapter = (
            session.query(models.AudiobookChapter)
            .filter(models.AudiobookChapter.edition_id == edition_id)
            .order_by(models.AudiobookChapter.number)
            .first()
        )
        reading = session.get(models.ReadingState, (test_main.BID_EPUB, 1))
        if not reading:
            reading = models.ReadingState(test_main.BID_EPUB, 1)
            session.add(reading)
        reading.set_progress({"href": "before.xhtml", "fraction": 0.42})
        session.commit()

        manifest = self.json(f"/api/audio/{edition.id}")
        self.assertEqual(len(manifest["manifest"]["chapters"]), 2)
        timeline = self.json(f"/api/audio/{edition.id}/chapter/1/timeline")
        self.assertEqual(timeline["timeline"]["segments"][0]["locator"]["css_selector"], "#p-1")

        audio_url = f"/media/audio/{edition.id}/chapter/1.mp3"
        full = self.fetch(audio_url)
        self.assertEqual(full.code, 200)
        ranged = self.fetch(audio_url, headers={"Range": "bytes=3-9"})
        self.assertEqual(ranged.code, 206)
        self.assertEqual(ranged.headers["Content-Range"], f"bytes 3-9/{len(full.body)}")
        self.assertEqual(ranged.body, full.body[3:10])
        head = self.fetch(audio_url, method="HEAD")
        self.assertEqual(head.code, 200)
        self.assertEqual(head.body, b"")
        invalid = self.fetch(audio_url, headers={"Range": "bytes=99999-"})
        self.assertEqual(invalid.code, 416)

        created = self.json(
            f"/api/audio/{edition.id}/sessions",
            method="POST",
            body=json.dumps({"source": "web", "device_id": "e2e-browser"}),
        )
        session_id = created["session_id"]
        progress = self.json(
            f"/api/audio-session/{session_id}",
            method="PATCH",
            body=json.dumps(
                {
                    "chapter_id": chapter.id,
                    "position_ms": 850,
                    "segment_id": "c1-s1",
                    "listened_delta_ms": 800,
                    "version": 0,
                }
            ),
        )
        self.assertEqual(progress["version"], 1)
        conflict = self.json(
            f"/api/audio-session/{session_id}",
            method="PATCH",
            body=json.dumps(
                {
                    "chapter_id": chapter.id,
                    "position_ms": 100,
                    "listened_delta_ms": 0,
                    "version": 0,
                }
            ),
        )
        self.assertEqual(conflict["err"], "progress.conflict")

        session = test_main.get_db()
        unchanged = session.get(models.ReadingState, (test_main.BID_EPUB, 1))
        self.assertEqual(unchanged.get_progress(), {"href": "before.xhtml", "fraction": 0.42})

    def test_private_podcast_feed_range_token_reset_and_ip_audit(self):
        self.seed_published_edition()
        created = self.json("/api/me/podcast-subscription", method="POST", body="{}")
        feed_path = urllib.parse.urlsplit(created["feed_url"]).path
        feed = self.fetch(feed_path)
        self.assertEqual(feed.code, 200)
        self.assertEqual(feed.headers["Vary"], "Accept-Encoding")
        cached = self.fetch(feed_path, headers={"If-None-Match": feed.headers["ETag"]})
        self.assertEqual(cached.code, 304)
        self.assertEqual(cached.headers["Vary"], "Accept-Encoding")
        root = ET.fromstring(feed.body)
        items = root.findall("./channel/item")
        self.assertEqual(len(items), 2)
        podcast_ns = {
            "podcast": "https://podcastindex.org/namespace/1.0",
            "itunes": "http://www.itunes.com/dtds/podcast-1.0.dtd",
        }
        self.assertEqual(root.find("./channel/podcast:guid", podcast_ns).text, stable_site_uuid())
        channel_image = root.find("./channel/itunes:image", podcast_ns)
        cover_path = urllib.parse.urlsplit(channel_image.attrib["href"]).path
        self.assertEqual(self.fetch(cover_path).code, 200)
        enclosure = items[0].find("enclosure")
        audio_path = urllib.parse.urlsplit(enclosure.attrib["url"]).path

        head = self.fetch(audio_path, method="HEAD")
        self.assertEqual(head.code, 200)
        ranged = self.fetch(audio_path, headers={"Range": "bytes=0-7", "User-Agent": "AppleCoreMedia/e2e"})
        self.assertEqual(ranged.code, 206)
        self.assertEqual(len(ranged.body), 8)

        session = test_main.get_db()
        audio_log = (
            session.query(models.PodcastAccessLog)
            .filter(models.PodcastAccessLog.kind == "audio")
            .order_by(models.PodcastAccessLog.id.desc())
            .first()
        )
        self.assertTrue(audio_log.ip)
        self.assertEqual(audio_log.range_start, 0)
        self.assertEqual(audio_log.range_end, 7)
        audit = self.json("/api/admin/podcast-audits")
        self.assertTrue(any(row["ip"] == audio_log.ip for row in audit["logs"]))
        protected = self.json(
            "/api/admin/podcast-audits",
            method="PATCH",
            body=json.dumps({"ids": [audio_log.id], "protected": True}),
        )
        self.assertEqual(protected["updated"], 1)

        reset = self.json("/api/me/podcast-subscription", method="POST", body="{}")
        self.assertNotEqual(reset["token_hint"], created["token_hint"])
        revoked = self.fetch(feed_path)
        self.assertEqual(revoked.code, 404)

        hidden_feed = urllib.parse.urlsplit(reset["feed_url"]).path
        hidden = self.json(
            "/api/me/podcast-subscription",
            method="PATCH",
            body=json.dumps({"hidden_book_ids": [test_main.BID_EPUB]}),
        )
        self.assertEqual(hidden["hidden_book_ids"], [test_main.BID_EPUB])
        self.assertEqual(len(ET.fromstring(self.fetch(hidden_feed).body).findall("./channel/item")), 0)

    def test_podcast_rate_limit_freezes_and_admin_can_unfreeze(self):
        self.seed_published_edition()
        created = self.json("/api/me/podcast-subscription", method="POST", body="{}")
        feed_path = urllib.parse.urlsplit(created["feed_url"]).path
        session = test_main.get_db()
        subscription = session.query(models.PodcastSubscription).filter(models.PodcastSubscription.active.is_(True)).first()
        audiobook_handlers._PODCAST_RATE_EVENTS.clear()
        with mock.patch.dict(
            "webserver.handlers.audiobook.CONF",
            {
                "PODCAST_RATE_LIMIT_REQUESTS": 2,
                "PODCAST_RATE_LIMIT_WINDOW_SECONDS": 60,
                "PODCAST_RATE_LIMIT_FREEZE_SECONDS": 300,
            },
        ):
            self.assertEqual(self.fetch(feed_path).code, 200)
            self.assertEqual(self.fetch(feed_path).code, 200)
            self.assertEqual(self.fetch(feed_path).code, 429)
            unfrozen = self.json(
                "/api/admin/podcast-audits",
                method="PATCH",
                body=json.dumps({"action": "unfreeze", "subscription_id": subscription.id}),
            )
            self.assertFalse(unfrozen["frozen"])
        audiobook_handlers._PODCAST_RATE_EVENTS.clear()

    def test_expired_lease_is_reclaimed_once(self):
        session = test_main.get_db()
        now = datetime.datetime.now()
        edition = models.AudiobookEdition(
            book_id=test_main.BID_EPUB,
            status="draft",
            engine="edgetts",
            config={},
            created_by=1,
            create_time=now,
            update_time=now,
        )
        session.add(edition)
        session.flush()
        job = models.AudiobookJob(
            book_id=test_main.BID_EPUB,
            edition_id=edition.id,
            creator_id=1,
            mode="quick",
            status="generating",
            phase="GENERATING",
            config={},
            config_hash="lease",
            lease_owner="dead-worker",
            lease_until=now - datetime.timedelta(minutes=1),
            attempts=1,
            data={"inspected": True},
            create_time=now,
            update_time=now,
        )
        session.add(job)
        session.commit()
        scheduler = AudiobookScheduler()
        with mock.patch.object(scheduler, "_process") as process:
            self.assertTrue(scheduler.run_once())
            process.assert_called_once_with(job.id)
        session = test_main.get_db()
        reclaimed = session.get(models.AudiobookJob, job.id)
        self.assertEqual(reclaimed.status, "generating")
        self.assertEqual(reclaimed.phase, "GENERATING")
        self.assertEqual(reclaimed.lease_owner, scheduler.worker_id)
        self.assertEqual(reclaimed.attempts, 2)

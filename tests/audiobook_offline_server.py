"""Short lived HTTP integration server for Playwright; never deploy this fixture.

Real Talebook API/database/scheduler and pinned Voicebook inspect/generate/media.
Only the input book, authentication and supplier synthesizer are fixtures.
"""

import json
import math
import signal
import struct
import tempfile
import threading
import time
import wave
import zipfile
from pathlib import Path

from book2audio.machine import GenerationCancelled, ProgressEmitter, check_cancelled
from book2audio.tool_pipeline import generate_audio, inspect_book
from tornado.ioloop import IOLoop
from tornado.web import RequestHandler

from tests import test_main
from webserver import main, models
from webserver.services import audiobook


def make_book(path):
    with zipfile.ZipFile(path, "w") as book:
        book.writestr("mimetype", "application/epub+zip")
        book.writestr(
            "META-INF/container.xml",
            '<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">'
            '<rootfiles><rootfile full-path="OEBPS/book.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
        )
        book.writestr(
            "OEBPS/book.opf",
            '<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="id" version="3.0">'
            '<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">'
            '<dc:identifier id="id">tb234-offline</dc:identifier><dc:title>离线贯通测试书</dc:title>'
            "<dc:language>zh</dc:language><dc:creator>模拟引擎</dc:creator></metadata>"
            '<manifest><item id="one" href="one.xhtml" media-type="application/xhtml+xml"/>'
            '<item id="two" href="two.xhtml" media-type="application/xhtml+xml"/></manifest>'
            '<spine><itemref idref="one"/><itemref idref="two"/></spine></package>',
        )
        for name, number in (("one", 1), ("two", 2)):
            book.writestr(
                f"OEBPS/{name}.xhtml",
                '<html xmlns="http://www.w3.org/1999/xhtml"><head>'
                f"<title>第{number}章</title></head><body><h1>第{number}章</h1>"
                f"<p>这是第{number}章的第一段离线测试正文。</p><p>这是第二段正文。</p></body></html>",
            )


def serve():
    with tempfile.TemporaryDirectory(prefix="tb234-offline-") as directory:
        source = Path(directory) / "fixture.epub"
        make_book(source)
        test_main.setup_server()
        test_main.setup_mock_user()
        test_main._mock_user.start()
        main.CONF["AUDIOBOOK_MIN_FREE_GB"] = 0
        main.CONF["AUDIOBOOK_PATH"] = str(Path(directory) / "audio")
        storage = audiobook.AudiobookStorage()
        storage.ensure()
        scheduler = audiobook.AudiobookScheduler()
        scheduler.storage = storage
        scheduler._source_path = lambda _job, _directory: source
        scheduler._last_maintenance = time.monotonic()
        stop = threading.Event()
        state = {"hold": False, "events": {}, "calls": {}}

        class OfflineProcess(audiobook.VoicebookProcess):
            def run(self, job, args, on_event, on_control):
                script = Path(args[1])
                output = Path(args[args.index("-o") + 1])
                if args[0] == "inspect":
                    inspect_book(script, output)
                    return 0
                identity = job.data["voicebook_invocation"]
                cancel = storage.job_dir(job.id) / "cancel"
                records = state["events"].setdefault(job.id, [])
                calls = state["calls"].setdefault(job.id, [])
                held = state["hold"]

                class Stream:
                    def write(self, text):
                        row = json.loads(text)
                        records.append(row)
                        on_event(row)

                    def flush(self):
                        pass

                class Synthesizer:
                    def synthesize(self, text, voice, engine, target):
                        calls.append({"started_at": time.monotonic(), "engine": engine})
                        deadline = time.monotonic() + (60 if held else 0.06)
                        while time.monotonic() < deadline:
                            check_cancelled(cancel)
                            if stop.wait(0.01):
                                raise GenerationCancelled("offline fixture stopped")
                        with wave.open(str(target), "wb") as audio:
                            audio.setnchannels(1)
                            audio.setsampwidth(2)
                            audio.setframerate(24000)
                            audio.writeframes(
                                b"".join(
                                    struct.pack("<h", int(4000 * math.sin(2 * math.pi * 440 * i / 24000)))
                                    for i in range(12000)
                                )
                            )

                done = threading.Event()

                def control():
                    while not done.wait(0.2):
                        on_control()

                heartbeat = threading.Thread(target=control)
                heartbeat.start()
                try:
                    generate_audio(
                        script,
                        output,
                        engine="qwen3tts",
                        synthesizer=Synthesizer(),
                        concurrency=main.CONF.get("VOICEBOOK_QWEN_CONCURRENCY", 2),
                        cancel_file=cancel,
                        resume=True,
                        progress=ProgressEmitter(
                            Stream(), version=2, task_id=identity["task_id"], attempt_id=identity["attempt_id"]
                        ),
                    )
                    return 0
                except GenerationCancelled:
                    return 3
                finally:
                    done.set()
                    heartbeat.join(timeout=5)
                    assert not heartbeat.is_alive()

        audiobook.VoicebookProcess = OfflineProcess

        class Control(RequestHandler):
            def post(self):
                state["hold"] = bool(json.loads(self.request.body).get("hold"))
                self.write({"err": "ok"})

            def get(self):
                with scheduler.session_maker() as session:
                    result = []
                    for job in session.query(models.AudiobookJob).order_by(models.AudiobookJob.id):
                        events = state["events"].get(job.id, [])
                        edition = session.get(models.AudiobookEdition, job.edition_id)
                        result.append(
                            {
                                "job_id": job.id,
                                "mode": job.mode,
                                "status": job.status,
                                "progress": job.progress,
                                "cancel_requested": job.cancel_requested,
                                "edition_id": edition.id,
                                "edition_status": edition.status,
                                "chapters": session.query(models.AudiobookChapter).filter_by(edition_id=edition.id).count(),
                                "generation": (job.data or {}).get("generation"),
                                "peak_active_requests": max(
                                    (row.get("snapshot", {}).get("active_requests", 0) for row in events), default=0
                                ),
                                "supplier_calls": len(state["calls"].get(job.id, [])),
                            }
                        )
                self.write({"err": "ok", "jobs": result})

        app = test_main._app
        app.add_handlers(r".*", [(r"/_test/offline", Control)])
        server = app.listen(8091, address="127.0.0.1")

        def worker():
            while not stop.is_set():
                if not scheduler.run_once():
                    stop.wait(0.1)

        thread = threading.Thread(target=worker)
        thread.start()
        loop = IOLoop.current()
        for signum in (signal.SIGINT, signal.SIGTERM):
            signal.signal(signum, lambda *_: loop.add_callback(loop.stop))
        try:
            loop.start()
        finally:
            stop.set()
            thread.join(timeout=20)
            assert not thread.is_alive()
            server.stop()
            test_main._mock_user.stop()


if __name__ == "__main__":
    serve()

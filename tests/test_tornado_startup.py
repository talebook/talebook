import json
from unittest import mock

from tornado import httputil, testing, web

from webserver import main


class TestTornadoStartup(testing.AsyncHTTPTestCase):
    def get_app(self):
        class Probe(web.RequestHandler):
            def get(self):
                self.write("ready")

            def post(self):
                self.write({"filename": self.request.files["ebook"][0].filename})

        return web.Application([(r"/", Probe)])

    def setUp(self):
        # Undo any global header patch even when the startup regression fails.
        header_patch = mock.patch.object(httputil.HTTPHeaders, "add", httputil.HTTPHeaders.add)
        header_patch.start()
        self.addCleanup(header_patch.stop)
        super().setUp()
        # Exercise the production entry point without binding its configured
        # port, building a second book database, or starting a blocking loop.
        with (
            mock.patch.object(main.tornado.options, "parse_command_line"),
            mock.patch.object(main, "setup_logging"),
            mock.patch.object(main, "make_app", return_value=self._app),
            mock.patch.object(main.tornado.httpserver, "HTTPServer") as server,
            mock.patch.object(main.tornado.ioloop.IOLoop, "instance") as loop,
        ):
            main.main()
            server.assert_called_once_with(self._app, xheaders=True, max_buffer_size=main.get_upload_size())
            server.return_value.listen.assert_called_once_with(main.options.port, main.options.host)
            loop.return_value.start.assert_called_once_with()

    def test_startup_serves_normal_http_request(self):
        response = self.fetch("/", request_timeout=2)
        self.assertEqual(response.code, 200)
        self.assertEqual(response.body, b"ready")

    def test_startup_preserves_unicode_multipart_filename(self):
        filename = "百年孤独.epub"
        body = (
            '--StartupBoundary\r\nContent-Disposition: form-data; name="ebook"; '
            f'filename="{filename}"\r\nContent-Type: application/epub+zip\r\n\r\n'
            "epub-content\r\n--StartupBoundary--\r\n"
        ).encode("utf-8")
        response = self.fetch(
            "/",
            method="POST",
            headers={"Content-Type": "multipart/form-data; boundary=StartupBoundary"},
            body=body,
            request_timeout=2,
        )
        self.assertEqual(response.code, 200)
        self.assertEqual(json.loads(response.body)["filename"], filename)

    def test_startup_preserves_repeated_content_disposition_headers(self):
        headers = httputil.HTTPHeaders.parse(
            'Content-Disposition: attachment; filename="first.epub"\r\n'
            'Content-Disposition: attachment; filename="second.epub"\r\n'
        )
        self.assertEqual(
            headers.get_list("Content-Disposition"),
            ['attachment; filename="first.epub"', 'attachment; filename="second.epub"'],
        )

    def test_startup_rejects_invalid_content_disposition_values(self):
        for value in ('attachment; filename="bad\rname.epub"', 'attachment; filename="bad\nname.epub"'):
            with self.subTest(value=value):
                with self.assertRaises(httputil.HTTPInputError):
                    httputil.HTTPHeaders().add("Content-Disposition", value, _chars_are_bytes=False)

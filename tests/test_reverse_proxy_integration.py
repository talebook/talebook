"""Real Tornado responses behind a proxy that strips the public prefix."""

from unittest import mock

from tests.test_main import BID_EPUB, TestWithAdminUser
from tests.test_main import setUpModule as init


def setUpModule():
    init()


class TestReverseProxyURLs(TestWithAdminUser):
    def setUp(self):
        super().setUp()
        for module in ('webserver.base_path', 'webserver.handlers.base', 'webserver.handlers.opds'):
            patch = mock.patch(module + '.BASE_PATH', '/team/books')
            patch.start()
            self.addCleanup(patch.stop)

    def test_book_resources_have_prefix(self):
        data = self.json(f'/api/book/{BID_EPUB}')
        book = data['book']
        assert book['img'].startswith('/team/books/get/')
        assert all(file['href'].startswith('/team/books/api/') for file in book['files'])

    def test_epub_reader_assets_and_extraction_have_one_prefix(self):
        response = self.fetch(f'/read/{BID_EPUB}')
        assert response.code == 200
        html = response.body.decode()
        assert '/team/books/static/' in html
        assert f'/team/books/get/extract/{BID_EPUB}/' in html
        assert '/team/books/team/books' not in html

    def test_logout_cookie_uses_public_path(self):
        response = self.fetch('/api/user/sign_out')
        assert response.code == 200
        cookies = response.headers.get_list('Set-Cookie')
        assert cookies
        assert all('Path=/team/books/' in cookie for cookie in cookies)

    def test_opds_navigation_has_public_prefix(self):
        response = self.fetch('/opds/')
        assert response.code == 200
        assert b'/team/books/opds' in response.body

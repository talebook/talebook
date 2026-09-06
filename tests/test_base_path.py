"""Public URLs must stay inside the deployment without rewriting external URLs."""

from unittest import mock

import pytest
from tornado import web
from tornado.testing import AsyncHTTPTestCase

from docker.configure_base_path import configure
from webserver.base_path import PublicPathMixin, normalize_base_path, public_url


@pytest.mark.parametrize('value,expected', [('', ''), ('/', ''), ('/readest-test/', '/readest-test'), ('/team/books', '/team/books')])
def test_normalize_base_path(value, expected):
    assert normalize_base_path(value) == expected


@pytest.mark.parametrize('value', ['//evil', 'https://evil/path', 'books', '/a/../b', '/a%2fb', '/a?x=1', '/a#x', '/a\\b', '/a\nb', '/a//b', '/中文'])
def test_reject_ambiguous_or_unsafe_base_path(value):
    with pytest.raises(ValueError):
        normalize_base_path(value)


@pytest.mark.parametrize('url,expected', [
    ('/api/book/1?x=%2F#y', '/team/books/api/book/1?x=%2F#y'),
    ('/', '/team/books/'),
    ('/team/books/api', '/team/books/api'),
    ('/team/books?x=1', '/team/books?x=1'),
    ('/team/bookshop', '/team/books/team/bookshop'),
    ('https://cdn.example/a', 'https://cdn.example/a'),
    ('//cdn.example/a', '//cdn.example/a'),
    ('data:image/png,a', 'data:image/png,a'),
    ('blob:https://example/a', 'blob:https://example/a'),
    ('chapter.html', 'chapter.html'),
    ('#chapter', '#chapter'),
])
def test_public_url(url, expected):
    assert public_url(url, '/team/books') == expected
    assert public_url(url, '') == url


class Probe(PublicPathMixin, web.RequestHandler):
    def get(self):
        if self.get_argument('logout', ''):
            self.clear_cookie('user_id')
        else:
            self.set_secure_cookie('user_id', '1')
        self.redirect(self.get_argument('next', self.reverse_url('home')))


class TestPublicPathHTTP(AsyncHTTPTestCase):
    def get_app(self):
        return web.Application([web.url('/login', Probe), web.url('/', Probe, name='home')], cookie_secret='test-only')

    def test_cookie_and_redirect_share_prefix(self):
        with mock.patch('webserver.base_path.BASE_PATH', '/team/books'):
            response = self.fetch('/login', follow_redirects=False)
            assert response.headers['Location'] == '/team/books/'
            assert 'Path=/team/books/' in response.headers['Set-Cookie']
            logout = self.fetch('/login?logout=1', follow_redirects=False)
            assert 'Path=/team/books/' in logout.headers['Set-Cookie']
            assert 'expires=' in logout.headers['Set-Cookie'].lower()

    def test_external_redirect_and_default_deployment(self):
        with mock.patch('webserver.base_path.BASE_PATH', ''):
            response = self.fetch('/login?next=https://example.org/callback', follow_redirects=False)
            assert response.headers['Location'] == 'https://example.org/callback'
            assert 'Path=/' in response.headers['Set-Cookie']


def test_nginx_public_redirect_and_nuxt_upstream():
    original = '    server_name _;\nreturn 302 /opds/;\nreturn 302 /books/;\n        proxy_pass       http://nuxtjs;'
    result = configure(original, '/team/books')
    assert 'return 302 /team/books/opds/;' in result
    assert 'return 302 /team/books/books/;' in result
    assert 'absolute_redirect off;' in result
    assert 'rewrite ^ /team/books$uri break;' in result
    assert configure(original, '') == original

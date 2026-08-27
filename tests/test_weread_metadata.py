from unittest import mock

from webserver.plugins.combo.weread import WereadMetadataApi


SEARCH_RESULT = {
    "results": [
        {
            "title": "电子书",
            "scope": 17,
            "books": [
                {
                    "newRating": 920,
                    "bookInfo": {
                        "bookId": "3300045871",
                        "title": "活着",
                        "author": "余华",
                        "publisher": "作家出版社",
                        "intro": "关于活着本身的故事。",
                        "category": "文学/小说",
                        "cover": "https://cdn.weread.qq.com/weread/cover/1/test.jpg",
                        "deepLink": "weread://bookDetail?bookId=3300045871",
                    },
                }
            ],
        }
    ]
}


def test_search_uses_explicit_ebook_scope_and_normalizes_metadata():
    provider = mock.Mock()
    provider.query.return_value = SEARCH_RESULT

    books = WereadMetadataApi("wrk-test", provider=provider).search("活着")

    provider.query.assert_called_once_with("wrk-test", "search", {"keyword": "活着", "scope": 10})
    assert len(books) == 1
    book = books[0]
    assert book.title == "活着"
    assert book.authors == ["余华"]
    assert book.publisher == "作家出版社"
    assert book.comments == "关于活着本身的故事。"
    assert book.rating == 9.2
    assert book.tags == ["文学", "小说"]
    assert book.provider_key == "weread"
    assert book.provider_value == "3300045871"
    assert book.website == "weread://bookDetail?bookId=3300045871"


def test_selected_result_fetches_full_book_info():
    provider = mock.Mock()
    provider.query.return_value = {
        "bookId": "3300045871",
        "title": "活着",
        "author": "余华",
        "publisher": "作家出版社",
        "isbn": "9787506365437",
        "publishTime": "2012-08-01",
        "intro": "完整简介",
        "newRating": 92,
        "deepLink": "weread://bookDetail?bookId=3300045871",
    }
    api = WereadMetadataApi("wrk-test", provider=provider)

    with mock.patch.object(api, "get_cover", return_value=None):
        book = api.get_metadata_by_provider("3300045871")

    provider.query.assert_called_once_with("wrk-test", "book_info", {"bookId": "3300045871"})
    assert book.isbn == "9787506365437"
    assert book.pubdate.year == 2012
    assert book.comments == "完整简介"
    assert book.rating == 9.2

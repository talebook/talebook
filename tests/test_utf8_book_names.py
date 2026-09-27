import pytest

from webserver import main


main.init_calibre()


@pytest.mark.parametrize(
    "title",
    [
        "五四运动史：现代中国的知识革命",
        "命运攸关的抉择：1940-1941年间改变世界的十个决策",
        "A moderately long English book title",
        "中文English混合标题😀完整保留",
    ],
)
def test_preserves_titles_within_calibre_budget(title):
    clean = main.safe_filename(title)
    assert main.utf8_construct_file_name(1, title, "作者", 4) == clean + " - 作者"
    assert main.utf8_construct_path_name(1, title, "作者") == "作者/" + clean + " (1)"


@pytest.mark.parametrize("char", ["a", "中", "😀"])
@pytest.mark.parametrize("extlen", [3, 4, 14, 20])
def test_long_names_fit_filesystem_components(tmp_path, char, extlen):
    title = char * 300
    author = char * 300
    relative = main.utf8_construct_path_name(123456789, title, author)
    directory = tmp_path / relative
    directory.mkdir(parents=True)
    name = main.utf8_construct_file_name(123456789, title, author, extlen)
    filename = name + "." + "x" * extlen
    for component in [*relative.split("/"), filename]:
        assert len(component.encode("utf-8")) <= 255
        assert "\ufffd" not in component
    (directory / filename).write_bytes(b"book")
    assert (directory / filename).read_bytes() == b"book"


def test_keeps_sanitization_fallbacks_and_book_ids():
    assert main.utf8_construct_path_name(1, " \t", "CON") == "CONw/Unknown (1)"
    assert main.utf8_construct_path_name(1, "title", " .. ") == "Unknown/title (1)"
    assert main.utf8_construct_file_name(1, " ", "", 4) == "Unknown - "
    name = main.utf8_construct_file_name(1, 'a/b:c?d*e"f<g>h|i\\j', "author...", 4)
    assert name == "a_b_c_d_e_f_g_h_i_j - author"
    assert main.utf8_construct_path_name(1, "中" * 300, "作者") != main.utf8_construct_path_name(2, "中" * 300, "作者")


def test_rejects_extension_without_room_for_title():
    with pytest.raises(ValueError, match="Extension length too long"):
        main.utf8_construct_file_name(1, "title", "author", 100)

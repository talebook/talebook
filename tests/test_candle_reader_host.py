#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

"""阅读器宿主页 creader.html 的渲染与阅读辅助开关回归。

这四个开关（章评 / 划线笔记 / 阅读笔记悬浮窗 / 选中文本）由宿主页注入到阅读器自己的设置面板里，
前三个关的是标注与浮层，最后一个关的是正文的选中能力；行为验证在浏览器里做，
这里守住模板层面的关键片段，避免阅读器升版或模板重构时静默丢失。
"""

from pathlib import Path
from types import SimpleNamespace

import pytest
from jinja2 import Environment, FileSystemLoader


ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = "book/creader.html"
PREF_KEY = "talebookReaderPrefs"
PREF_NAMES = ("chapterComments", "highlights", "notePanel", "textSelection")


@pytest.fixture(scope="module")
def environment():
    return Environment(loader=FileSystemLoader(ROOT / "webserver/resources"))


def render(environment, *, logged_in=True, ready=True, audiobook=False):
    book = SimpleNamespace(id=7, title="测试书")
    context = {
        "book": book,
        "RES": "",
        "epub_dir": "/get/extract/7",
        "is_ready": ready,
        "audiobook_edition_id": 3 if audiobook else None,
        "request": SimpleNamespace(user=object()) if logged_in else SimpleNamespace(user=None),
    }
    return environment.get_template(TEMPLATE).render(**context)


def test_logged_in_reader_gets_the_four_reader_helper_switches(environment):
    html = render(environment)

    assert PREF_KEY in html
    for name in PREF_NAMES:
        assert name in html
    assert "{ key: 'textSelection', label: '选中文本' }" in html
    assert "talebook-reader-prefs" in html
    assert "阅读辅助" in html


def test_switches_default_to_on_so_nothing_changes_without_reader_action(environment):
    html = render(environment)

    assert "chapterComments: true, highlights: true, notePanel: true, textSelection: true" in html


def test_switches_default_to_on_in_the_panel_defaults(environment):
    html = render(environment)

    assert "const DEFAULTS = { chapterComments: true, highlights: true, notePanel: true, textSelection: true };" in html


def test_disabling_selection_locks_the_book_text_with_user_select(environment):
    html = render(environment)

    # 正文在 epub.js 的 iframe 里，宿主页的样式管不到它，只能通过 rendition 的
    # themes.override 把规则写进 content 文档，换章新建的文档由 epub.js 自动补上。
    assert "const SELECTION_LOCK = [" in html
    assert "['user-select', 'none']" in html
    assert "['-webkit-user-select', 'none']" in html
    assert "rendition.themes.override(pair[0], pair[1], true)" in html
    assert "rendition.themes.removeOverride(pair[0])" in html


def test_locking_selection_clears_a_passage_that_is_already_selected(environment):
    html = render(environment)

    # 锁只拦得住新的选择动作，关掉开关的那一刻已经选中的那段要手动清掉
    assert "content.window?.getSelection()?.removeAllRanges()" in html


def test_selection_lock_is_applied_on_panel_ticks_and_on_every_switch_change(environment):
    html = render(environment)

    # 阅读器实例要等 Vue 挂载后才存在，因此除了开关变化，每轮观察器补挂时也要试一次
    assert "function applyTextSelectionLock()" in html
    assert html.count("applyTextSelectionLock();") >= 2


def test_disabling_selection_closes_an_open_selection_toolbar(environment):
    html = render(environment)

    assert "if (!next.highlights || !next.textSelection) hideSelectionToolbar();" in html


def test_selection_switch_also_works_for_guests(environment):
    guest = render(environment, logged_in=False)

    # 未登录读者也能读书，而「选中文本」与账号无关，因此这个开关必须留在
    # 游客态同样输出的那段脚本里，不能跟着注解层一起被 request.user 挡掉。
    assert "function applyTextSelectionLock()" in guest
    assert "rendition.themes.override" in guest
    assert "textSelection: true" in guest


def test_annotation_layer_checks_visibility_before_rendering(environment):
    html = render(environment)

    assert "function shouldRenderAnnotation(annotation)" in html
    assert "annotation.annotation_type === 'chapter_comment'" in html


def test_disabling_highlights_removes_already_rendered_marks(environment):
    html = render(environment)

    assert "function dropRenderedAnnotation(rendition, id)" in html
    assert "rendition.annotations.remove(annotation.cfi, 'highlight')" in html
    assert "function refreshRenderedAnnotations()" in html


def test_disabling_highlights_stops_the_selection_toolbar(environment):
    html = render(environment)

    # 关掉划线笔记或关掉选中文本，划词工具栏都不该再出现
    assert "if (!readerPrefs.highlights || !readerPrefs.textSelection) return;" in html


def test_chapter_comment_switch_also_hides_the_book_comment_entry(environment):
    html = render(environment)

    assert "function applyBookCommentEntry()" in html
    assert "'评论'" in html


def test_chapter_comment_switch_takes_over_the_builtin_reader_toggle(environment):
    html = render(environment)

    assert "function applyBuiltinChapterCommentRow()" in html
    assert "proxy.settings.show_comments = prefs.chapterComments;" in html


def test_note_panel_switch_controls_a_visible_toggle_and_panel(environment):
    html = render(environment)

    assert 'id="annotation-toggle"' in html
    assert 'id="annotation-shell"' in html
    assert "toggle.hidden = !next.notePanel;" in html


def test_settings_panel_is_located_without_reader_scope_ids(environment):
    html = render(environment)

    # 宿主页拿不到阅读器源码，因此按「含亮度滑杆的那张 bottom-sheet」定位设置面板，
    # 并在面板重渲染后补挂注入节点。
    assert "'.v-bottom-sheet .v-list'" in html
    assert "'.v-slider'" in html
    assert "new MutationObserver(scheduleApply)" in html


def test_each_switch_group_carries_its_row_label_as_accessible_name(environment):
    html = render(environment)

    # 两颗按钮的可见文案只有「开启 / 关闭」，单独聚焦时读不出属于哪一项设置，
    # 因此把行标题关联为这一组的可访问名称。
    assert "'talebook-pref-label-' + row.key" in html
    assert "group.setAttribute('role', 'group')" in html
    assert "group.setAttribute('aria-labelledby', label.id)" in html
    assert "button.setAttribute('aria-pressed', 'false')" in html


def test_hidden_reader_helper_controls_are_actually_hidden(environment):
    html = render(environment)

    # `#annotation-toggle` 自带 display:inline-flex，属于作者样式，会盖掉浏览器默认的
    # `[hidden] { display: none }`。只设 `toggle.hidden = true` 而不补这条规则，
    # 开关关掉后悬浮按钮仍会挂在页面上（实测 computed display 依旧是 flex）。
    assert "#annotation-toggle[hidden]" in html
    assert "#annotation-count[hidden]" in html
    assert "display: none" in html


def test_guest_page_has_no_annotation_ui_but_still_has_the_switches(environment):
    guest = render(environment, logged_in=False)
    logged_in = render(environment)

    assert 'id="annotation-toggle"' not in guest
    assert 'id="annotation-shell"' not in guest
    assert PREF_KEY in guest
    assert 'id="annotation-toggle"' in logged_in
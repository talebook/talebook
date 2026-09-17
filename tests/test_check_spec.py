import importlib.util
import subprocess
import sys
from pathlib import Path

import pytest


SCRIPT = Path(__file__).parents[1] / "scripts" / "check_spec.py"
REPO_ROOT = Path(__file__).parents[1]


def _load_checker():
    spec = importlib.util.spec_from_file_location("check_spec", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


CHECKER = _load_checker()

SECTIONS = ("定义", "使用场景", "功能", "术语与界面用词", "行为逻辑", "关联实体", "实现对照")


def build_doc(
    name="书籍",
    sections=SECTIONS,
    glossary="| 标准用词 | 英文 | 含义 | 示例 |\n|---|---|---|---|\n| 书籍 | book | 一个条目 | 《三体》 |",
    api_rows="| GET | `/api/book/<id>` | 详情 |",
    code_rows="| 详情 | `webserver/handlers/book.py` |",
    extra_body="",
    not_what="**不是什么：** 不是元数据。",
):
    body = ["# %s" % name, ""]
    for index, section in enumerate(sections, 1):
        body.append("## %d. %s" % (index, section))
        if section == "定义":
            body += ["一句话定义。", "", not_what]
        elif section == "术语与界面用词":
            body += [
                "### 术语表",
                "",
                glossary,
                "",
                "### 操作按钮用词",
                "",
                "| 界面用词 | 位置 | 行为 |",
                "|---|---|---|",
                "| 下载 | 详情 | 下载 |",
            ]
        elif section == "实现对照":
            body += [
                "### 7.1 数据存储",
                "",
                "| 概念 | 存储 | 表与字段 |",
                "|---|---|---|",
                "| 书 | Calibre | — |",
                "### 7.2 API 接口",
                "",
                "| 方法 | 路径 | 说明 |",
                "|---|---|---|",
                api_rows,
                "### 7.3 关键定义",
                "",
                "| 符号 | 值 | 含义 |",
                "|---|---|---|",
                "| `X` | `1` | — |",
                "### 7.4 代码落点",
                "",
                "| 行为 | 文件与函数 |",
                "|---|---|",
                code_rows,
                "### 7.5 界面文案",
                "",
                "| i18n 分组 | 覆盖 |",
                "|---|---|",
                "| `book.*` | 详情 |",
            ]
        else:
            body.append("正文。")
        body.append("")
    body.append(extra_body)
    return "\n".join(body)


def write_spec(tmp_path, docs, index=None, with_plugins=False):
    """搭一个最小仓库：spec/ 是构造的，webserver/ 借用真实仓库做路径与路由校验。

    默认只链接 handlers 与 webdav，不链接 plugins——没有 register.py 时插件覆盖度
    检查会跳过，避免每个结构用例都被真实插件清单干扰。
    """
    spec = tmp_path / "spec"
    (spec / "插件").mkdir(parents=True)
    for relative, content in docs.items():
        (spec / relative).write_text(content, encoding="utf-8")
    if index is None:
        links = "\n".join("- [%s](%s)" % (Path(r).stem, r) for r in docs)
        index = "# Talebook 领域规格 · 索引\n\n%s\n" % links
    (spec / "索引.md").write_text(index, encoding="utf-8")

    webserver = tmp_path / "webserver"
    if with_plugins:
        webserver.symlink_to(REPO_ROOT / "webserver")
    else:
        webserver.mkdir()
        for folder in ("handlers", "webdav"):
            (webserver / folder).symlink_to(REPO_ROOT / "webserver" / folder)
    return spec


class Result:
    """与 subprocess.CompletedProcess 同形，便于用例统一断言。"""

    def __init__(self, returncode, stdout):
        self.returncode = returncode
        self.stdout = stdout
        self.stderr = ""


def run_check(root):
    """进程内调用校验逻辑。

    这些用例原本每条都起一个解释器子进程，20 次子进程的 CPU 与 IO 抢占会把
    同批运行的后台线程测试挤过其硬编码墙钟超时。行为等价，但快得多也安静得多；
    命令行契约由 test_command_line_entry_point 单独用子进程覆盖。
    """
    errors, count = CHECKER.check_spec(Path(root).resolve())
    if errors:
        return Result(1, "Spec check failed:\n" + "".join("- %s\n" % error for error in errors))
    return Result(0, "%d spec document(s) passed\n" % count)


def test_valid_spec_passes(tmp_path):
    write_spec(tmp_path, {"书籍.md": build_doc()})

    result = run_check(tmp_path)

    assert result.returncode == 0, result.stdout + result.stderr
    assert "2 spec document(s) passed" in result.stdout


def test_missing_spec_directory_fails(tmp_path):
    result = run_check(tmp_path)

    assert result.returncode == 1
    assert "spec directory does not exist" in result.stdout


def test_title_must_match_filename(tmp_path):
    write_spec(tmp_path, {"书籍.md": build_doc(name="圖書")})

    result = run_check(tmp_path)

    assert result.returncode == 1
    assert "与文件名不一致" in result.stdout


def test_section_order_is_enforced(tmp_path):
    reordered = ("定义", "术语与界面用词", "使用场景", "功能", "行为逻辑", "关联实体", "实现对照")
    write_spec(tmp_path, {"书籍.md": build_doc(sections=reordered)})

    result = run_check(tmp_path)

    assert result.returncode == 1
    assert "章节应为" in result.stdout


def test_definition_requires_boundary(tmp_path):
    write_spec(tmp_path, {"书籍.md": build_doc(not_what="补充说明。")})

    result = run_check(tmp_path)

    assert result.returncode == 1
    assert "缺少「不是什么」边界" in result.stdout


def test_glossary_requires_example_column(tmp_path):
    three_columns = "| 标准用词 | 英文 | 含义 |\n|---|---|---|\n| 书籍 | book | 一个条目 |"
    write_spec(tmp_path, {"书籍.md": build_doc(glossary=three_columns)})

    result = run_check(tmp_path)

    assert result.returncode == 1
    assert "术语表应为 4 列" in result.stdout


def test_glossary_rejects_empty_example(tmp_path):
    empty = "| 标准用词 | 英文 | 含义 | 示例 |\n|---|---|---|---|\n| 书籍 | book | 一个条目 |  |"
    write_spec(tmp_path, {"书籍.md": build_doc(glossary=empty)})

    result = run_check(tmp_path)

    assert result.returncode == 1
    assert "空示例" in result.stdout


def test_unknown_route_fails(tmp_path):
    write_spec(tmp_path, {"书籍.md": build_doc(api_rows="| GET | `/api/no-such-namespace/<id>` | 详情 |")})

    result = run_check(tmp_path)

    assert result.returncode == 1
    assert "未命中任何已注册路由" in result.stdout


def test_route_shape_must_match(tmp_path):
    """路由段数写错也要被抓到：/opds/category 实际接两段参数。"""
    write_spec(tmp_path, {"书籍.md": build_doc(api_rows="| GET | `/opds/category/<name>` | 分类 |")})

    result = run_check(tmp_path)

    assert result.returncode == 1
    assert "未命中任何已注册路由" in result.stdout


def test_alternation_and_query_are_normalized(tmp_path):
    """分组写法与查询串应被还原后再匹配，不应误报。"""
    rows = "| GET | `/api/(author\\|publisher\\|tag)` | 分类列表 |\n| GET | `/get/thumb_60x80/<id>.jpg?t=<ts>` | 缩略图 |"
    write_spec(tmp_path, {"书籍.md": build_doc(api_rows=rows)})

    result = run_check(tmp_path)

    assert result.returncode == 0, result.stdout + result.stderr


def test_all_full_routes_in_a_row_are_checked(tmp_path):
    """同行并列的完整路由都要校验，不只第一个。"""
    row = "| GET | `/api/recent`、`/api/no-such-namespace` | 列表 |"
    write_spec(tmp_path, {"书籍.md": build_doc(api_rows=row)})

    result = run_check(tmp_path)

    assert result.returncode == 1
    assert "/api/no-such-namespace" in result.stdout


def test_non_whitelisted_directory_path_is_checked(tmp_path):
    """路径校验不限顶级目录：document/ 下的错误路径也要抓到。"""
    write_spec(tmp_path, {"书籍.md": build_doc(code_rows="| 说明 | `document/NoSuchGuide.md` |")})

    result = run_check(tmp_path)

    assert result.returncode == 1
    assert "引用的路径不存在" in result.stdout


def test_external_url_in_code_span_is_not_treated_as_path(tmp_path):
    """代码跨度里的外部地址不是仓库路径，不应误报。"""
    rows = "| 发布页 | `github.com/talebook/moke/releases` |"
    write_spec(tmp_path, {"书籍.md": build_doc(code_rows=rows)})

    result = run_check(tmp_path)

    assert result.returncode == 0, result.stdout + result.stderr


def test_shorthand_paths_in_same_row_are_ignored(tmp_path):
    row = "| GET | `/api/book/<id>`、`/edit`、`/delete` | 详情与操作 |"
    write_spec(tmp_path, {"书籍.md": build_doc(api_rows=row)})

    result = run_check(tmp_path)

    assert result.returncode == 0, result.stdout + result.stderr


def test_missing_repository_path_fails(tmp_path):
    write_spec(tmp_path, {"书籍.md": build_doc(code_rows="| 详情 | `webserver/handlers/nope.py` |")})

    result = run_check(tmp_path)

    assert result.returncode == 1
    assert "引用的路径不存在" in result.stdout


def test_broken_internal_link_fails(tmp_path):
    write_spec(tmp_path, {"书籍.md": build_doc(extra_body="见 [元数据](元数据.md)。")})

    result = run_check(tmp_path)

    assert result.returncode == 1
    assert "断链" in result.stdout


def test_link_label_must_match_target(tmp_path):
    docs = {"书籍.md": build_doc(extra_body="见 [书籍元信息](元数据.md)。"), "元数据.md": build_doc(name="元数据")}
    write_spec(tmp_path, docs)

    result = run_check(tmp_path)

    assert result.returncode == 1
    assert "与目标文件名" in result.stdout


def test_index_must_cover_every_document(tmp_path):
    write_spec(tmp_path, {"书籍.md": build_doc()}, index="# Talebook 领域规格 · 索引\n\n空索引。\n")

    result = run_check(tmp_path)

    assert result.returncode == 1
    assert "未收录" in result.stdout


@pytest.mark.parametrize("subsection", ["### 7.1 数据存储", "### 7.3 关键定义", "### 7.5 界面文案"])
def test_implementation_subsections_may_be_omitted(tmp_path, subsection):
    """子表按需缺省：方案 5.2「不适用时整张删除」。"""
    doc = build_doc()
    start = doc.index(subsection)
    end = doc.index("### 7.", start + 1) if "### 7." in doc[start + 1 :] else len(doc)
    write_spec(tmp_path, {"书籍.md": doc[:start] + doc[end:]})

    result = run_check(tmp_path)

    assert result.returncode == 0, result.stdout + result.stderr


def test_implementation_requires_at_least_one_subsection(tmp_path):
    doc = build_doc()
    doc = doc[: doc.index("### 7.1 数据存储")]
    write_spec(tmp_path, {"书籍.md": doc})

    result = run_check(tmp_path)

    assert result.returncode == 1
    assert "至少需要一张子表" in result.stdout


def test_implementation_subsections_must_keep_order(tmp_path):
    doc = build_doc()
    a, b, c = doc.index("### 7.3 关键定义"), doc.index("### 7.4 代码落点"), doc.index("### 7.5 界面文案")
    write_spec(tmp_path, {"书籍.md": doc[:a] + doc[b:c] + doc[a:b] + doc[c:]})

    result = run_check(tmp_path)

    assert result.returncode == 1
    assert "子表顺序应为" in result.stdout


def test_unknown_implementation_subsection_fails(tmp_path):
    write_spec(tmp_path, {"书籍.md": build_doc().replace("### 7.4 代码落点", "### 7.4 随便写的", 1)})

    result = run_check(tmp_path)

    assert result.returncode == 1
    assert "未定义的子表" in result.stdout


def test_registered_plugin_must_be_documented(tmp_path):
    write_spec(tmp_path, {"书籍.md": build_doc()}, with_plugins=True)

    result = run_check(tmp_path)

    assert result.returncode == 1
    assert "已注册但在 spec/插件/ 下没有归属" in result.stdout


def test_repository_spec_passes():
    result = run_check(REPO_ROOT)

    assert result.returncode == 0, result.stdout + result.stderr
    assert "spec document(s) passed" in result.stdout


def test_command_line_entry_point():
    """唯一一条子进程用例：校验命令行入口与退出码契约。"""
    result = subprocess.run(
        [sys.executable, str(SCRIPT), "--root", str(REPO_ROOT)],
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 0, result.stdout + result.stderr
    assert "spec document(s) passed" in result.stdout

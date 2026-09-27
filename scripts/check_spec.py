#!/usr/bin/env python3
"""校验 spec/ 领域规格文档的结构、互链与实现对照的可核对性。"""

import argparse
import re
from pathlib import Path


INDEX_NAME = "索引.md"
SECTIONS = ("定义", "使用场景", "功能", "术语与界面用词", "行为逻辑", "关联实体", "实现对照")
SUBSECTIONS = ("7.1 数据存储", "7.2 API 接口", "7.3 关键定义", "7.4 代码落点", "7.5 界面文案")
GLOSSARY_HEADING = "### 术语表"
GLOSSARY_COLUMNS = 4

HEADING_RE = re.compile(r"^## (\d+)\. (.+)$", re.M)
SUBHEADING_RE = re.compile(r"^### (7\.\d .+)$", re.M)
LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
CODE_RE = re.compile(r"`([^`]+)`")
ROUTE_RE = re.compile(r"^/[A-Za-z0-9_./<>|()\\-]*$")
# 仓库相对路径：至少两段，首段不含点（排除 github.com/... 这类外部地址）。
PATH_RE = re.compile(r"^[A-Za-z0-9_-]+(?:/[A-Za-z0-9_.-]+)+/?$")


def _sections(text):
    return [name for _, name in HEADING_RE.findall(text)]


def _numbers(text):
    return [int(index) for index, _ in HEADING_RE.findall(text)]


def _block(text, heading):
    if heading not in text:
        return ""
    rest = text.split(heading, 1)[1]
    return re.split(r"^#{2,3} ", rest, maxsplit=1, flags=re.M)[0]


def check_structure(path, text, errors):
    title = re.match(r"\A# (.+)", text)
    if not title:
        errors.append(f"{path}: 缺少一级标题")
        return
    if title.group(1) != path.stem:
        errors.append(f"{path}: 一级标题 {title.group(1)!r} 与文件名不一致")

    names = _sections(text)
    if names != list(SECTIONS):
        errors.append(f"{path}: 章节应为 {' / '.join(SECTIONS)}，实际为 {' / '.join(names) or '无'}")
        return
    if _numbers(text) != list(range(1, len(SECTIONS) + 1)):
        errors.append(f"{path}: 章节编号必须是 1..{len(SECTIONS)} 且连续")

    # 子表可以按需缺省（方案 5.2：不适用时整张删除），但必须是五者的子集且保持相对顺序。
    subs = SUBHEADING_RE.findall(text)
    ordered = [name for name in SUBSECTIONS if name in subs]
    if not subs:
        errors.append(f"{path}: 实现对照至少需要一张子表")
    elif subs != ordered:
        unknown = [name for name in subs if name not in SUBSECTIONS]
        if unknown:
            errors.append(f"{path}: 实现对照出现未定义的子表：{' / '.join(unknown)}")
        else:
            errors.append(f"{path}: 实现对照子表顺序应为 {' / '.join(ordered)}，实际为 {' / '.join(subs)}")

    if "**不是什么" not in text:
        errors.append(f"{path}: 定义一节缺少「不是什么」边界")

    rows = [line for line in _block(text, GLOSSARY_HEADING).strip().splitlines() if line.startswith("|")]
    if len(rows) < 3:
        errors.append(f"{path}: 缺少术语表或术语表为空")
    elif rows[0].count("|") - 1 != GLOSSARY_COLUMNS:
        errors.append(f"{path}: 术语表应为 {GLOSSARY_COLUMNS} 列（标准用词、英文、含义、示例）")
    else:
        for row in rows[2:]:
            if not row.rstrip("|").rsplit("|", 1)[-1].strip():
                errors.append(f"{path}: 术语表存在空示例：{row.strip()[:40]}")


def check_links(path, text, spec_root, errors):
    for label, target in LINK_RE.findall(text):
        if target.startswith(("http://", "https://", "#")):
            continue
        resolved = (path.parent / target).resolve()
        if not resolved.exists():
            errors.append(f"{path}: 断链 [{label}]({target})")
        elif resolved.is_relative_to(spec_root) and resolved.suffix == ".md" and label != resolved.stem:
            errors.append(f"{path}: 链接文案 {label!r} 与目标文件名 {resolved.stem!r} 不一致")


def collect_routes(repo_root):
    """收集服务端注册的路由正则，供文档中的接口路径做真实匹配。

    排除 files.py 末尾的兜底路由——它匹配一切，留着会让校验形同虚设。
    """
    patterns = []
    for folder in ("handlers", "webdav"):
        target = repo_root / "webserver" / folder
        if not target.is_dir():
            continue
        for source in sorted(target.rglob("*.py")):
            body = source.read_text(encoding="utf-8", errors="ignore")
            for raw in re.findall(r'\(r"([^"]+)",\s*[A-Za-z_]', body):
                if raw in ("/(.*)", "/(.*)$"):
                    continue
                try:
                    patterns.append(re.compile(rf"\A{raw.rstrip('$')}\Z"))
                except re.error:
                    continue
    return patterns


def concretize(token):
    """把文档里的接口写法还原成一个具体路径，用于与路由正则比对。"""
    token = token.split("?", 1)[0]
    token = token.replace("\\|", "|")
    token = re.sub(r"\(([^)]*)\)", lambda m: m.group(1).split("|")[0], token)
    token = re.sub(r"<[^>]*>", "1", token)
    return token


def check_implementation(path, text, repo_root, routes, errors):
    """实现对照里写到的仓库路径必须存在；7.2 表格里的接口必须命中真实路由。

    只校验 7.2 的表格行，且每行只取第一个路径：7.3 与 7.4 里会出现数据目录、
    前端路由和已下线接口，它们不是本篇提供的服务端接口。
    """
    section = text.split("## 7. 实现对照", 1)[-1]
    for token in CODE_RE.findall(section):
        token = token.strip()
        if PATH_RE.match(token) and not (repo_root / token).exists():
            errors.append(f"{path}: 实现对照引用的路径不存在：{token}")

    if not routes:
        return

    for row in _block(section, "### 7.2 API 接口").splitlines():
        if not row.startswith("|"):
            continue
        tokens = [x.strip() for x in CODE_RE.findall(row) if x.strip().startswith("/")]
        if not tokens:
            continue
        # 同一行可以并列多个完整路由（/api/recent、/api/hot），也可以把后续接口
        # 省略成 /run、/status。判据：首段与本行第一个路径的首段相同才是完整路由。
        head = tokens[0].split("/")[1] if "/" in tokens[0][1:] or len(tokens[0]) > 1 else ""
        checkable = [tokens[0]] + [x for x in tokens[1:] if x.split("/")[1:2] == [head]]
        for token in checkable:
            concrete = concretize(token)
            if not any(pattern.match(concrete) for pattern in routes):
                errors.append(f"{path}: 7.2 中的接口未命中任何已注册路由：{token}")


def check_plugin_coverage(spec_root, repo_root, errors):
    """每个已注册的内置插件都必须在 spec/插件/ 下有归属。

    是否已注册以 register.py 实际 import 的模块为准；只声明 manifest 但没有被
    装配的插件不是可用插件，按「不写未实现」的规则不进入规格。
    """
    plugins_root = repo_root / "webserver" / "plugins"
    register = plugins_root / "register.py"
    if not register.is_file():
        return
    plugin_dir = spec_root / "插件"
    if not plugin_dir.is_dir():
        errors.append("缺少 spec/插件/ 目录")
        return

    imported = set(re.findall(r"^from ([\w.]+) import PROVIDER", register.read_text(encoding="utf-8"), re.M))
    corpus = "\n".join(f.read_text(encoding="utf-8") for f in plugin_dir.rglob("*.md"))

    for source in sorted(plugins_root.rglob("*.py")):
        if source.name == "register.py":
            continue
        module = source.relative_to(repo_root).with_suffix("").as_posix().replace("/", ".")
        if module not in imported:
            continue
        body = source.read_text(encoding="utf-8", errors="ignore")
        for plugin_id in sorted(set(re.findall(r'"(talebook\.[a-z]+\.[a-z0-9-]+)"', body))):
            if plugin_id not in corpus:
                errors.append(f"插件 {plugin_id} 已注册但在 spec/插件/ 下没有归属")


def check_inbound_links(spec_root, repo_root, errors):
    """仓库内其他 Markdown 指向 spec/ 的链接必须有效。

    门禁只扫 spec/ 目录时，document/ 一类文档里指向 spec/ 的链接改错或失效都不会被
    发现——CONTEXT.md 删除后 document/PluginGuide.md 留下死链，正是这样漏掉的。
    """
    for source in sorted(repo_root.rglob("*.md")):
        if spec_root in source.parents or "node_modules" in source.parts or ".git" in source.parts:
            continue
        try:
            text = source.read_text(encoding="utf-8")
        except (OSError, UnicodeError):
            continue
        for label, target in LINK_RE.findall(text):
            if target.startswith(("http://", "https://", "#")):
                continue
            resolved = (source.parent / target).resolve()
            if not resolved.is_relative_to(spec_root):
                continue
            if not resolved.exists():
                rel = source.relative_to(repo_root)
                errors.append(f"{rel}: 指向 spec/ 的链接已失效 [{label}]({target})")


def check_index(spec_root, errors):
    index = spec_root / INDEX_NAME
    if not index.is_file():
        errors.append(f"缺少 {INDEX_NAME}")
        return
    text = index.read_text(encoding="utf-8")
    for path in sorted(spec_root.rglob("*.md")):
        if path.name == INDEX_NAME:
            continue
        if f"({path.relative_to(spec_root).as_posix()})" not in text:
            errors.append(f"{INDEX_NAME} 未收录 {path.relative_to(spec_root)}")


def check_spec(repo_root):
    spec_root = (repo_root / "spec").resolve()
    if not spec_root.is_dir():
        return ["spec directory does not exist"], 0

    files = sorted(spec_root.rglob("*.md"))
    if not files:
        return ["spec directory contains no documents"], 0

    routes = collect_routes(repo_root)

    errors = []
    for path in files:
        text = path.read_text(encoding="utf-8")
        check_links(path, text, spec_root, errors)
        if path.name == INDEX_NAME:
            continue
        check_structure(path, text, errors)
        check_implementation(path, text, repo_root, routes, errors)

    check_index(spec_root, errors)
    check_inbound_links(spec_root, repo_root, errors)
    check_plugin_coverage(spec_root, repo_root, errors)
    return errors, len(files)


def main():
    parser = argparse.ArgumentParser(description="Validate domain specification documents.")
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1], help="Repository root")
    args = parser.parse_args()

    errors, count = check_spec(args.root.resolve())
    if errors:
        print("Spec check failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print(f"{count} spec document(s) passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

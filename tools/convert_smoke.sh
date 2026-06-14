#!/bin/sh
# ebook-convert 转换链冒烟测试，挂载进 talebook 镜像内运行（tools/ 不打包进镜像）：
#   docker run --rm -v "$PWD/tools/convert_smoke.sh:/smoke.sh:ro" --entrypoint sh <image> /smoke.sh
#
# 验证 txt/epub/mobi/azw3 六条互转链；TALEBOOK_PDF_CONVERT != 0 时额外验证 PDF 输出。
# 样书使用镜像内置的 docker/book/。slim 镜像通过 dpkg 强删了部分 calibre 依赖
# （见 Dockerfile 的 production-slim 注释），本脚本是防止删除清单误伤转换功能的护栏。
#
# 注意：PDF 输出走 QtWebEngine（Chromium），不允许以 root 运行，
# 因此统一以 talebook 用户执行转换。
set -e

BOOK_DIR=/var/www/talebook/docker/book
WORK_DIR=$(mktemp -d)
chmod 777 "$WORK_DIR"
cp "$BOOK_DIR/12.txt" "$WORK_DIR/sample.txt"

run_convert() {
    src="$1"; dst="$2"
    if gosu talebook ebook-convert "$src" "$WORK_DIR/$dst" >"$WORK_DIR/convert.log" 2>&1; then
        echo "OK   $(basename "$src") -> $dst"
    else
        echo "FAIL $(basename "$src") -> $dst"
        tail -20 "$WORK_DIR/convert.log"
        exit 1
    fi
}

run_convert "$WORK_DIR/sample.txt" out1.epub
run_convert "$WORK_DIR/sample.txt" out2.azw3
run_convert "$BOOK_DIR/1.epub" out3.azw3
run_convert "$BOOK_DIR/1.epub" out4.mobi
run_convert "$BOOK_DIR/11.azw3" out5.epub
run_convert "$BOOK_DIR/10.mobi" out6.epub

if [ "${TALEBOOK_PDF_CONVERT:-1}" != "0" ]; then
    run_convert "$BOOK_DIR/1.epub" out7.pdf
else
    echo "SKIP pdf output (slim image)"
fi

rm -rf "$WORK_DIR"
echo "convert smoke: all passed"

#!/bin/bash

TOOLS_DIR=`cd $(dirname $0) && pwd`
ROOT_DIR=`cd "$TOOLS_DIR/../" && pwd`

C="$(dirname `calibre-debug -c 'import calibre; print calibre.__file__'`)"
D="`calibre-debug  --paths | grep CALIBRE_RESOURCES_PATH | awk -F= '{ print $2 }'`"
T=`mktemp -d`
cd $T
find "$C/library/server/" -name '*.py' > POTFILES.python.in
find "$D/content_server/" "$ROOT_DIR" -name '*.html' > POTFILES.html.in

xgettext --from-code UTF-8 -f POTFILES.python.in -o message.pot
xgettext --from-code UTF-8 -f POTFILES.html.in -o message.pot -j -L Python

P="$TOOLS_DIR/for_use_calibre_main_zh_CN.po"
msgmerge --update --no-fuzzy-matching --backup=off $P message.pot
vi $P
mkdir zh_CN
msgfmt $P -o zh_CN/messages.mo
7za a "$D/resources/localization/locales.zip" zh_CN/messages.mo
rm -rf $T


#!/bin/bash

TOOLS_DIR=`cd $(dirname $0) && pwd`

D=/data/calibre
T=`mktemp -d`
cd $T
find $D/src/calibre/library/server/ -name '*.py' > POTFILES.python.in
find $D/resources/content_server/ -name '*.html' > POTFILES.html.in

xgettext --from-code UTF-8 -f POTFILES.python.in -o message.pot
xgettext -j --from-code UTF-8 -f POTFILES.html.in -o message.pot

P=$TOOLS_DIR/for_use_calibre_main_zh_CN.po
msgmerge --update --no-fuzzy-matching --backup=off $P message.pot
vi $P
mkdir zh_CN
msgfmt $P -o zh_CN/messages.mo
7za a $D/resources/localization/locales.zip zh_CN/messages.mo
rm -rf $T


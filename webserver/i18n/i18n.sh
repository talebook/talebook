#!/bin/bash

TOOLS_DIR=`cd $(dirname $0) && pwd`
ROOT_DIR=`cd "$TOOLS_DIR/../" && pwd`

F=`calibre-debug -c 'import calibre; print(calibre.__file__)'`
C=$(dirname "$F")
D=`calibre-debug  --paths | grep CALIBRE_RESOURCES_PATH | awk -F= '{ print $2 }'`
T=`mktemp -d`
cd $T
find "$C/library/server/" "$ROOT_DIR/" -name '*.py' > POTFILES.python.in
find "$D/content_server/" "$ROOT_DIR/" -name '*.html' > POTFILES.html.in

xgettext --from-code UTF-8 -f POTFILES.python.in -o messages.pot
xgettext --from-code UTF-8 -f POTFILES.html.in -o messages.pot -j -L Python

find "$TOOLS_DIR" -name 'messages.po' | while read po; do
    msgmerge --update --no-fuzzy-matching --backup=off "$po" messages.pot
done

vi `find "$TOOLS_DIR" -name 'messages.po'`

find "$TOOLS_DIR" -name 'messages.po' | while read po; do
    msgfmt "$po" -o "${po/messages.po/messages.mo}"
done


rm -rf $T

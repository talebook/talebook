#!/bin/bash


if [ $# != 2 ]; then
    echo "not 2"
    exit 0
fi
bid=$1
isbn=$2

echo -n "udpate book=${bid} to ISBN[${isbn}] (yes/no) ? "
read x
if [[ "$x" = "y" ]]; then
    set -x
    calibredb set_metadata --with-library /data/books/library/ -f identifiers:isbn:$isbn $bid
    curl -d "exam_id=$bid" http://www.talebook.org/book/$bid/update -sv
    calibredb show_metadata --with-library /data/books/library/ $bid
    echo
fi


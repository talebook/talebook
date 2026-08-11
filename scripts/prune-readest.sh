#!/bin/sh

set -eu

output_dir=${1:-}
max_bytes=${READEST_MAX_BYTES:-52428800}

if [ -z "$output_dir" ] || [ ! -d "$output_dir" ]; then
    echo "usage: prune-readest.sh <readest-output-directory>" >&2
    exit 2
fi

case "$max_bytes" in
    ''|*[!0-9]*)
        echo "READEST_MAX_BYTES must be a positive integer" >&2
        exit 2
        ;;
esac

if [ "$max_bytes" -eq 0 ]; then
    echo "READEST_MAX_BYTES must be a positive integer" >&2
    exit 2
fi

for required_path in \
    index.html \
    reader.html \
    _next \
    locales/en/translation.json \
    locales/zh-CN/translation.json \
    vendor/jieba/jieba_rs_wasm_bg.wasm \
    vendor/simplecc/simplecc_wasm_bg.wasm \
    LICENSE-AGPL-3.0.txt \
    SOURCE.md
do
    if [ ! -e "$output_dir/$required_path" ]; then
        echo "Readest output is missing required path: $required_path" >&2
        exit 1
    fi
done

map_count=$(find "$output_dir" -type f -name '*.map' | wc -l | tr -d ' ')
find "$output_dir" -type f -name '*.map' -delete

# Talebook only sends EPUB files to Readest. PDF continues to use Talebook's
# existing PDF reader, so these runtime-only PDF.js assets are unreachable.
if [ -d "$output_dir/vendor/pdfjs" ]; then
    find "$output_dir/vendor/pdfjs" -depth -delete
fi

size_bytes=$(
    find "$output_dir" -type f -exec stat -c '%s' {} + \
        | awk '{ total += $1 } END { print total + 0 }'
)

if [ "$size_bytes" -gt "$max_bytes" ]; then
    echo "Readest output is $size_bytes bytes; limit is $max_bytes bytes" >&2
    exit 1
fi

echo "Readest output pruned: removed $map_count sourcemaps; $size_bytes bytes remain (limit $max_bytes)"

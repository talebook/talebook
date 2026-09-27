"""Bake deployment redirects into the image; requests arrive without the prefix."""

import sys
from pathlib import Path

from webserver.base_path import BASE_PATH


def configure(text, prefix=BASE_PATH):
    from webserver.base_path import normalize_base_path

    prefix = normalize_base_path(prefix)
    if not prefix:
        return text
    text = text.replace("    server_name _;", "    server_name _;\n    absolute_redirect off;")
    for path in ("/opds/", "/books/"):
        text = text.replace("return 302 " + path + ";", "return 302 " + prefix + path + ";")
    # Nuxt's server accepts the public base URL, unlike Tornado's internal routes.
    for upstream in ("nuxtjs", "nuxtdev"):
        marker = "        proxy_pass       http://" + upstream + ";"
        text = text.replace(marker, "        rewrite ^ " + prefix + "$uri break;\n" + marker)
    return text


if __name__ == "__main__":
    path = Path(sys.argv[1])
    path.write_text(configure(path.read_text()))

import urllib.parse
from pathlib import Path
from xml.etree import ElementTree

from webserver.plugins.runtime.protocol import UpstreamError

from .base import COMMON_CONFIG_PROPERTIES, DAV_NS, SourceBase, _format_from, _manifest


class WebDAVProvider(SourceBase):
    source_name = "WebDAV"
    manifest = _manifest(
        "talebook.source.webdav",
        source_name,
        "浏览 WebDAV 目录并按扩展名增量发现待审电子书。",
        ["sources.browse", "sources.acquire"],
        {
            "type": "object",
            "properties": {
                **COMMON_CONFIG_PROPERTIES,
                "endpoint": {"type": "string", "format": "uri", "title": "WebDAV endpoint"},
                "allowed_hosts": {"type": "array", "items": {"type": "string"}, "title": "私网主机白名单"},
            },
            "required": ["endpoint"],
        },
        {
            "type": "object",
            "properties": {
                "username": {"type": "string", "writeOnly": True},
                "password": {"type": "string", "writeOnly": True},
            },
        },
    )

    def discover(self, context):
        config = context.get("config") or {}
        endpoint = str(config.get("endpoint") or "")
        if not endpoint:
            raise UpstreamError("WebDAV endpoint is required")
        headers = self._headers(context)
        headers.update({"Depth": "1", "Content-Type": "application/xml"})
        response = self.http.request(
            "PROPFIND",
            endpoint,
            allowed_hosts=config.get("allowed_hosts") or (),
            headers=headers,
            data=b'<?xml version="1.0"?><propfind xmlns="DAV:"><prop><getetag/><getlastmodified/><getcontentlength/><resourcetype/></prop></propfind>',
        )
        try:
            root = ElementTree.fromstring(response.content)
        except ElementTree.ParseError as exc:
            raise UpstreamError("WebDAV response is not valid XML") from exc
        old = (context.get("cursor") or {}).get("etags", {})
        etags = {}
        entries = []
        for item in root.findall("d:response", DAV_NS):
            href = item.findtext("d:href", default="", namespaces=DAV_NS)
            prop = item.find("d:propstat/d:prop", DAV_NS)
            if prop is None or prop.find("d:resourcetype/d:collection", DAV_NS) is not None:
                continue
            url = urllib.parse.urljoin(endpoint, href)
            fmt = _format_from(url)
            if not fmt or fmt not in self._formats(context):
                continue
            etag = prop.findtext("d:getetag", default="", namespaces=DAV_NS)
            etags[url] = etag
            if old.get(url) == etag and etag:
                continue
            entries.append(
                self._normalize(
                    context,
                    identity=url,
                    title=urllib.parse.unquote(Path(urllib.parse.urlsplit(url).path).stem),
                    format_name=fmt,
                    source_url=endpoint,
                    acquisition_url=url,
                    access="download",
                    remote_etag=etag.strip('"'),
                    updated_at=prop.findtext("d:getlastmodified", default="", namespaces=DAV_NS),
                )
            )
        return entries, {"etags": etags}


PROVIDER = WebDAVProvider()

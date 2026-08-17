import datetime
import hashlib
import os
import re
import unicodedata
import zipfile
from urllib.parse import unquote

from lxml import etree


try:
    from zhconv import convert as convert_chinese
except ImportError:  # pragma: no cover - production dependencies install zhconv
    _COMMON_TRADITIONAL = str.maketrans("著臺國書體萬與後裏為來這麼說", "着台国书体万与后里为来这么说")

    def convert_chinese(value, _locale):
        return value.translate(_COMMON_TRADITIONAL)


from webserver.models import Annotation, AnnotationSource, PluginEntityMatch


SOURCE_NAME = "weread"
STRONG_MATCH = 0.9


def normalize_text(value):
    value = convert_chinese(unicodedata.normalize("NFKC", str(value or "")), "zh-cn").casefold()
    return "".join(character for character in value if character.isalnum())


def _metadata(calibre_db, book_id):
    return calibre_db.get_metadata(int(book_id), index_is_id=True)


def all_book_ids(calibre_db):
    if calibre_db is None:
        return []
    if getattr(calibre_db, "new_api", None) is not None:
        return sorted(int(value) for value in calibre_db.new_api.all_book_ids())
    return sorted(int(value) for value in calibre_db.all_book_ids())


def _book_value(book_id, metadata):
    identifiers = dict(getattr(metadata, "identifiers", None) or {})
    authors = getattr(metadata, "authors", None) or []
    if isinstance(authors, str):
        authors = [authors]
    isbn = str(getattr(metadata, "isbn", "") or identifiers.get("isbn") or "")
    return {
        "book_id": int(book_id),
        "title": str(getattr(metadata, "title", "") or ""),
        "author": " & ".join(str(value) for value in authors),
        "isbn": isbn,
        "identifiers": identifiers,
    }


def _score(source, candidate):
    provider_id = str(source.get("provider_id") or "")
    identifiers = candidate["identifiers"]
    provider_values = {str(identifiers.get(key) or "") for key in ("weread", "wechatreading", "wechat_reading")}
    if provider_id and provider_id in provider_values:
        return "provider_id", 1.0
    source_isbn = normalize_text(source.get("isbn"))
    if source_isbn and source_isbn == normalize_text(candidate["isbn"]):
        return "isbn", 0.98
    title_equal = normalize_text(source.get("title")) == normalize_text(candidate["title"])
    author_equal = normalize_text(source.get("author")) == normalize_text(candidate["author"])
    if title_equal and author_equal and normalize_text(source.get("title")):
        return "title_author", 0.94
    if title_equal and normalize_text(source.get("title")):
        return "title", 0.65
    return "", 0.0


def book_candidates(calibre_db, source_book, allowed_book_ids=None):
    allowed = {int(value) for value in allowed_book_ids} if allowed_book_ids is not None else None
    result = []
    for book_id in all_book_ids(calibre_db):
        if allowed is not None and book_id not in allowed:
            continue
        candidate = _book_value(book_id, _metadata(calibre_db, book_id))
        method, confidence = _score(source_book, candidate)
        if confidence:
            result.append({**candidate, "method": method, "confidence": confidence})
    return sorted(result, key=lambda value: (-value["confidence"], value["book_id"]))


def confirm_match(session, connection_id, source_book_id, book_id, user_id, calibre_db, allowed_book_ids):
    book_id = int(book_id)
    if book_id not in {int(value) for value in allowed_book_ids} or book_id not in all_book_ids(calibre_db):
        raise ValueError("Selected book is missing or not accessible")
    match = (
        session.query(PluginEntityMatch)
        .filter(
            PluginEntityMatch.connection_id == connection_id,
            PluginEntityMatch.source_type == "weread_book",
            PluginEntityMatch.external_id == str(source_book_id),
        )
        .first()
    )
    now = datetime.datetime.now()
    if match is None:
        match = PluginEntityMatch(
            connection_id=connection_id,
            source_type="weread_book",
            external_id=str(source_book_id),
            create_time=now,
        )
        session.add(match)
    match.book_id = book_id
    match.method = "confirmed"
    match.confidence = 1.0
    match.status = "confirmed"
    match.confirmed_by = user_id
    match.update_time = now
    session.commit()
    return match


def resolve_book(session, connection, source_book, calibre_db, allowed_book_ids=None):
    source_book_id = str(source_book.get("provider_id") or "")
    match = (
        session.query(PluginEntityMatch)
        .filter(
            PluginEntityMatch.connection_id == connection.id,
            PluginEntityMatch.source_type == "weread_book",
            PluginEntityMatch.external_id == source_book_id,
        )
        .first()
    )
    allowed = {int(value) for value in allowed_book_ids} if allowed_book_ids is not None else None
    if match is not None and (allowed is None or match.book_id in allowed):
        try:
            candidate = _book_value(match.book_id, _metadata(calibre_db, match.book_id))
            return match.book_id, [{**candidate, "method": match.method, "confidence": match.confidence}], match.status
        except Exception:
            session.delete(match)
            session.flush()

    candidates = book_candidates(calibre_db, source_book, allowed_book_ids)
    strong = [value for value in candidates if value["confidence"] >= STRONG_MATCH]
    if len(strong) != 1:
        return None, candidates[:20], "confirmation_required" if candidates else "unmatched"

    selected = strong[0]
    now = datetime.datetime.now()
    match = PluginEntityMatch(
        connection_id=connection.id,
        source_type="weread_book",
        external_id=source_book_id,
        book_id=selected["book_id"],
        method=selected["method"],
        confidence=selected["confidence"],
        status="auto",
        create_time=now,
        update_time=now,
    )
    session.add(match)
    session.flush()
    return selected["book_id"], [selected], "auto"


def prepare_annotation_item(session, connection, data, calibre_db, allowed_book_ids=None):
    safe = dict(data or {})
    book_id, candidates, status = resolve_book(
        session,
        connection,
        dict(safe.get("book") or {}),
        calibre_db,
        allowed_book_ids,
    )
    safe["book_id"] = book_id
    safe["match_status"] = status
    safe["candidates"] = candidates
    return safe, book_id is not None


def _parse_datetime(value):
    if not value:
        return None
    try:
        parsed = datetime.datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo:
        parsed = parsed.astimezone(datetime.timezone.utc).replace(tzinfo=None)
    return parsed


def _source_identity(external_id):
    value = str(external_id)
    if len(value) <= 255:
        return value
    return "sha256:" + hashlib.sha256(value.encode("utf-8")).hexdigest()


def _client_id(external_id):
    value = "weread:" + str(external_id)
    if len(value) <= 64:
        return value
    return "weread:" + hashlib.sha256(value.encode("utf-8")).hexdigest()[:56]


def _normalized_offsets(value):
    normalized = []
    offsets = []
    for index, character in enumerate(str(value or "")):
        converted = convert_chinese(unicodedata.normalize("NFKC", character), "zh-cn").casefold()
        for output in converted:
            if output.isalnum():
                normalized.append(output)
                offsets.append(index)
    return "".join(normalized), offsets


def locate_epub_quote(calibre_db, book_id, quote):
    """Return a CFI only for a quote occurring exactly once in one EPUB text node."""

    quote = str(quote or "")
    normalized_quote, _ = _normalized_offsets(quote)
    if len(normalized_quote) < 8 or calibre_db is None:
        return None
    try:
        path = calibre_db.format_abspath(int(book_id), "EPUB", index_is_id=True)
    except Exception:
        return None
    if not path or not os.path.isfile(path):
        return None
    try:
        with zipfile.ZipFile(path) as archive:
            container = etree.fromstring(archive.read("META-INF/container.xml"))
            rootfiles = container.xpath("//*[local-name()='rootfile']/@full-path")
            if not rootfiles:
                return None
            opf_path = rootfiles[0]
            opf = etree.fromstring(archive.read(opf_path))
            manifest = {value.get("id"): value for value in opf.xpath("//*[local-name()='manifest']/*[local-name()='item']")}
            spine = opf.xpath("//*[local-name()='spine']/*[local-name()='itemref']")
            matches = []
            base_dir = os.path.dirname(opf_path)
            parser = etree.XMLParser(recover=True, resolve_entities=False, no_network=True)
            for spine_index, itemref in enumerate(spine):
                idref = itemref.get("idref")
                item = manifest.get(idref)
                if item is None:
                    continue
                entry_path = os.path.normpath(os.path.join(base_dir, unquote(item.get("href") or ""))).replace("\\", "/")
                document = etree.fromstring(archive.read(entry_path), parser)
                for text_node in document.xpath("//text()"):
                    if not getattr(text_node, "is_text", False):
                        continue
                    raw = str(text_node)
                    normalized_raw, offsets = _normalized_offsets(raw)
                    start = normalized_raw.find(normalized_quote)
                    while start >= 0:
                        raw_start = offsets[start]
                        raw_end = offsets[start + len(normalized_quote) - 1] + 1
                        matches.append((spine_index, idref, text_node.getparent(), raw_start, raw_end))
                        start = normalized_raw.find(normalized_quote, start + 1)
            if len(matches) != 1:
                return None
            spine_index, idref, parent, start, end = matches[0]
            steps = []
            node = parent
            while node is not None and node.getparent() is not None:
                siblings = [child for child in node.getparent() if isinstance(child.tag, str)]
                step = str(2 * (siblings.index(node) + 1))
                if node.get("id"):
                    step += "[%s]" % re.sub(r"[^A-Za-z0-9_.:-]", "", node.get("id"))
                steps.append(step)
                node = node.getparent()
            steps.reverse()
            parent_path = "/" + "/".join(steps)
            base = "/6/%s[%s]" % (2 * (spine_index + 1), idref)
            return "epubcfi(%s!%s,/1:%s,/1:%s)" % (base, parent_path, start, end)
    except (KeyError, OSError, ValueError, zipfile.BadZipFile, etree.XMLSyntaxError):
        return None


def materialize_annotation(session, run, connection, record, data, payload_hash, calibre_db):
    source_id = _source_identity(record.external_id)
    source = (
        session.query(AnnotationSource)
        .filter(
            AnnotationSource.source_name == SOURCE_NAME,
            AnnotationSource.source_connection_id == str(connection.id),
            AnnotationSource.source_annotation_id == source_id,
        )
        .first()
    )
    annotation = source.annotation if source is not None else None
    now = datetime.datetime.now()
    if annotation is None:
        annotation = Annotation(
            reader_id=run.requested_by,
            book_id=int(data["book_id"]),
            client_id=_client_id(record.external_id),
            annotation_type=data.get("annotation_type") or "note",
            is_private=True,
            create_time=_parse_datetime(data.get("user_modified_at")) or now,
            update_time=now,
        )
        session.add(annotation)
        session.flush()
        source = AnnotationSource(
            annotation_id=annotation.id,
            source_name=SOURCE_NAME,
            source_connection_id=str(connection.id),
            source_annotation_id=source_id,
            create_time=now,
        )
        session.add(source)
    annotation.book_id = int(data["book_id"])
    annotation.annotation_type = data.get("annotation_type") or "note"
    annotation.cfi = locate_epub_quote(calibre_db, annotation.book_id, data.get("quote_text"))
    annotation.chapter = str(data.get("chapter") or "")[:500]
    annotation.quote_text = str(data.get("quote_text") or "")
    annotation.content = str(data.get("content") or "")
    annotation.color = str(data.get("color") or "")[:32]
    annotation.user_modified_at = _parse_datetime(data.get("user_modified_at"))
    annotation.update_time = now
    source.source_run_id = str(run.id)
    source.source_position = str(data.get("source_position") or "") or None
    source.source_raw_hash = payload_hash
    source.source_updated_at = annotation.user_modified_at
    source.source_sync_status = "synced"
    source.source_synced_at = now
    source.source_sync_error = None
    source.update_time = now
    session.flush()
    record.entity_id = str(annotation.id)
    return annotation


def rollback_materialized_annotation(session, record):
    try:
        annotation_id = int(record.entity_id)
    except (TypeError, ValueError):
        return
    annotation = session.get(Annotation, annotation_id)
    if annotation is None:
        return
    target_sources = [
        source
        for source in annotation.sources
        if source.source_name == SOURCE_NAME
        and source.source_connection_id == str(record.connection_id)
        and source.source_annotation_id == _source_identity(record.external_id)
    ]
    if not target_sources:
        return
    if len(annotation.sources) == len(target_sources):
        session.delete(annotation)
    else:
        for source in target_sources:
            session.delete(source)

#!/usr/bin/env python3
# vim:fileencoding=UTF-8:ts=4:sw=4:sta:et:sts=4:ai

__license__ = "GPL v3"
__copyright__ = "2010, Kovid Goyal <kovid@kovidgoyal.net>"
__docformat__ = "restructuredtext en"

import binascii
import hashlib
import sys
from collections import defaultdict
from functools import partial
from gettext import gettext as _
from itertools import repeat

from calibre import guess_type
from calibre import prepare_string_for_xml as xml
from calibre.ebooks.metadata import fmt_sidx
from calibre.library.comments import comments_to_html
from calibre.utils.config import tweaks
from calibre.utils.date import as_utc
from calibre.utils.filenames import ascii_text
from calibre.utils.icu import sort_key
from lxml import etree, html
from lxml.builder import ElementMaker
from tornado import web
from webserver import loader
from webserver.handlers.base import BaseHandler

CONF = loader.get_settings()


def custom_fields_to_display(db):
    ckeys = set(db.field_metadata.ignorable_field_keys())
    yes_fields = set(CONF["opds_will_display"])
    no_fields = set(CONF["opds_wont_display"])
    if "*" in yes_fields:
        yes_fields = ckeys
    if "*" in no_fields:
        no_fields = ckeys
    return frozenset(ckeys & (yes_fields - no_fields))


class Offsets(object):
    "Calculate offsets for a paginated view"

    def __init__(self, offset, delta, total):
        if offset < 0:
            offset = 0
        if offset >= total:
            raise web.HTTPError(404, reason="Invalid offset: %r" % offset)
        last_allowed_index = total - 1
        last_current_index = offset + delta - 1
        self.slice_upper_bound = offset + delta
        self.offset = offset
        self.next_offset = last_current_index + 1
        if self.next_offset > last_allowed_index:
            self.next_offset = -1
        self.previous_offset = self.offset - delta
        if self.previous_offset < 0:
            self.previous_offset = 0
        self.last_offset = last_allowed_index - delta
        if self.last_offset < 0:
            self.last_offset = 0


def format_tag_string(tags, sep, ignore_max=False, no_tag_count=False, joinval=", "):
    MAX = sys.maxsize if ignore_max else CONF["opds_max_tags_shown"]
    if tags:
        tlist = [t.strip() for t in tags.split(sep)]
    else:
        tlist = []
    tlist.sort(key=sort_key)
    if len(tlist) > MAX:
        tlist = tlist[:MAX] + ["..."]
    if no_tag_count:
        return joinval.join(tlist) if tlist else ""
    else:
        return u"%s:&:%s" % (tweaks["opds_max_tags_shown"], joinval.join(tlist)) if tlist else ""


def url_for(name, **kwargs):
    base_href = "/opds"
    urls = {}
    urls["opds"] = base_href
    urls["opdst"] = base_href + "/"
    urls["opdscategory"] = base_href + "/category/%(category)s/%(which)s"
    urls["opdscategorygroup"] = base_href + "/categorygroup/%(category)s/%(which)s"
    urls["opdsnavcatalog"] = base_href + "/nav/%(which)s"
    urls["opdssearch"] = base_href + "/search/%(query)s"
    return urls[name] % kwargs


def first_char(item):
    val = getattr(item, "sort", item.name)
    if not val:
        val = "A"
    for c in ascii_text(val):
        if c.isalnum():
            return c
    return "A"


def hexlify(x):
    return binascii.hexlify(x.encode("utf-8")).decode("ascii")


def unhexlify(x):
    return binascii.unhexlify(x).decode("utf-8")


E = ElementMaker(
    namespace="http://www.w3.org/2005/Atom",
    nsmap={
        None: "http://www.w3.org/2005/Atom",
        "dc": "http://purl.org/dc/terms/",
        "opds": "http://opds-spec.org/2010/catalog",
    },
)


FEED = E.feed
TITLE = E.title
ID = E.id
ICON = E.icon
SUBTITLE = E.subtitle

LINK = partial(E.link, type="application/atom+xml")
NAVLINK = partial(E.link, type="application/atom+xml;type=feed;profile=opds-catalog")
START_LINK = partial(NAVLINK, rel="start")
UP_LINK = partial(NAVLINK, rel="up")
FIRST_LINK = partial(NAVLINK, rel="first")
LAST_LINK = partial(NAVLINK, rel="last")
NEXT_LINK = partial(NAVLINK, rel="next", title="Next")
PREVIOUS_LINK = partial(NAVLINK, rel="previous")


def UPDATED(dt, *args, **kwargs):
    return E.updated(as_utc(dt).strftime("%Y-%m-%dT%H:%M:%S+00:00"), *args, **kwargs)


def SEARCH_LINK(base_href, *args, **kwargs):
    kwargs["rel"] = "search"
    kwargs["title"] = "Search"
    kwargs["href"] = base_href + "/search/{searchTerms}"
    return LINK(*args, **kwargs)


def AUTHOR(name, uri=None):
    args = [E.name(name)]
    if uri is not None:
        args.append(E.uri(uri))
    return E.author(*args)


def NAVCATALOG_ENTRY(base_href, updated, title, description, query):
    href = base_href + "/nav/" + hexlify(query)
    id_ = "calibre-nav:" + str(hashlib.sha1(href.encode("utf-8")).hexdigest())
    return E.entry(
        TITLE(title),
        ID(id_),
        UPDATED(updated),
        E.content(description, type="text"),
        NAVLINK(href=href),
    )


def html_to_lxml(raw):
    raw = u"<div>%s</div>" % raw
    root = html.fragment_fromstring(raw)
    root.set("xmlns", "http://www.w3.org/1999/xhtml")
    raw = etree.tostring(root, pretty_print=True, encoding="utf-8", xml_declaration=True)
    try:
        return etree.fromstring(raw)
    except:
        for x in root.iterdescendants():
            remove = []
            for attr in x.attrib:
                if ":" in attr:
                    remove.append(attr)
            for a in remove:
                del x.attrib[a]
        raw = etree.tostring(root, pretty_print=True, encoding="utf-8", xml_declaration=True)
        try:
            return etree.fromstring(raw)
        except:
            from calibre.ebooks.oeb.parse_utils import _html4_parse

            return _html4_parse(raw)


def CATALOG_ENTRY(item, item_kind, base_href, updated, ignore_count=False, add_kind=False):
    id_ = "calibre:category:" + item.name
    iid = "N" + item.name
    if item.id is not None:
        iid = "I" + str(item.id)
        iid += ":" + item_kind
    link = NAVLINK(href=base_href + "/" + hexlify(iid))
    count = (_("%d books") if item.count > 1 else _("%d book")) % item.count
    if ignore_count:
        count = ""
    if item.use_sort_as_name:
        name = item.sort
    else:
        name = item.name
    return E.entry(
        TITLE(name + ("" if not add_kind else " (%s)" % item_kind)),
        ID(id_),
        UPDATED(updated),
        E.content(count, type="text"),
        link,
    )


def CATALOG_GROUP_ENTRY(item, category, base_href, updated):
    id_ = "calibre:category-group:" + category + ":" + item.text
    iid = item.text
    link = NAVLINK(href=base_href + "/" + hexlify(iid))
    return E.entry(
        TITLE(item.text),
        ID(id_),
        UPDATED(updated),
        E.content(_("%d items") % item.count, type="text"),
        link,
    )


def ACQUISITION_ENTRY(item, db, updated, CFM, CKEYS, prefix):
    FM = db.FIELD_MAP
    title = item[FM["title"]]
    if not title:
        title = _("Unknown")
    authors = item[FM["authors"]]
    if not authors:
        authors = _("Unknown")
    authors = " & ".join([i.replace("|", ",") for i in authors.split(",")])
    extra = []
    rating = item[FM["rating"]] or 0
    if rating > 0:
        rating = u"".join(repeat(u"\u2605", int(rating / 2.0)))
        extra.append(_("RATING: %s<br />") % rating)
    tags = item[FM["tags"]]
    if tags:
        extra.append(_("TAGS: %s<br />") % xml(format_tag_string(tags, ",", ignore_max=True, no_tag_count=True)))
    series = item[FM["series"]]
    if series:
        extra.append(
            _("SERIES: %(series)s [%(sidx)s]<br />")
            % dict(series=xml(series), sidx=fmt_sidx(float(item[FM["series_index"]])))
        )
    for key in CKEYS:
        mi = db.get_metadata(item[CFM["id"]["rec_index"]], index_is_id=True)
        name, val = mi.format_field(key)
        if val:
            datatype = CFM[key]["datatype"]
            if datatype == "text" and CFM[key]["is_multiple"]:
                extra.append(
                    "%s: %s<br />"
                    % (
                        xml(name),
                        xml(
                            format_tag_string(
                                val,
                                CFM[key]["is_multiple"]["ui_to_list"],
                                ignore_max=True,
                                no_tag_count=True,
                                joinval=CFM[key]["is_multiple"]["list_to_ui"],
                            )
                        ),
                    )
                )
            elif datatype == "comments" or (
                CFM[key]["datatype"] == "composite" and CFM[key]["display"].get("contains_html", False)
            ):
                extra.append("%s: %s<br />" % (xml(name), comments_to_html(val)))
            else:
                extra.append("%s: %s<br />" % (xml(name), xml(val)))
    comments = item[FM["comments"]]
    if comments:
        comments = comments_to_html(comments)
        extra.append(comments)
    if extra:
        extra = html_to_lxml("\n".join(extra))
    idm = "uuid"
    id_ = "urn:%s:%s" % (idm, item[FM["uuid"]])
    ans = E.entry(TITLE(title), E.author(E.name(authors)), ID(id_), UPDATED(updated))
    if len(extra):
        ans.append(E.content(extra, type="xhtml"))
    formats = item[FM["formats"]]
    if formats:
        for fmt in formats.split(","):
            fmt = fmt.lower()
            mt = guess_type("a." + fmt)[0]
            href = prefix + "/api/book/%s.%s?from=opds" % (item[FM["id"]], fmt)
            if mt:
                link = E.link(type=mt, href=href)
                link.set("rel", "http://opds-spec.org/acquisition")
                ans.append(link)
    ans.append(
        E.link(
            type="image/jpeg",
            href=prefix + "/get/cover/%s.jpg" % item[FM["id"]],
            rel="http://opds-spec.org/cover",
        )
    )
    ans.append(
        E.link(
            type="image/jpeg",
            href=prefix + "/get/cover/%s.jpg" % item[FM["id"]],
            rel="http://opds-spec.org/thumbnail",
        )
    )

    return ans


default_feed_title = CONF['site_title'] + " " + _("Library")


class Feed(object):
    def __init__(
        self,
        id_,
        updated,
        subtitle=None,
        title=None,
        up_link=None,
        first_link=None,
        last_link=None,
        next_link=None,
        previous_link=None,
    ):
        self.base_href = url_for("opds")

        self.root = FEED(
            TITLE(title or default_feed_title),
            AUTHOR(CONF['site_title'], uri="http://calibre-ebook.com"),
            ID(id_),
            ICON("/favicon.png"),
            UPDATED(updated),
            SEARCH_LINK(self.base_href),
            START_LINK(href=self.base_href),
        )
        if up_link:
            self.root.append(UP_LINK(href=up_link))
        if first_link:
            self.root.append(FIRST_LINK(href=first_link))
        if last_link:
            self.root.append(LAST_LINK(href=last_link))
        if next_link:
            self.root.append(NEXT_LINK(href=next_link))
        if previous_link:
            self.root.append(PREVIOUS_LINK(href=previous_link))
        if subtitle:
            self.root.insert(1, SUBTITLE(subtitle))

    def __bytes__(self):
        return etree.tostring(self.root, pretty_print=True, encoding="utf-8", xml_declaration=True)


class TopLevel(Feed):
    def __init__(
        self,
        updated,  # datetime object in UTC
        categories,
        id_="urn:calibre:main",
        subtitle=_("Books in your library"),
    ):
        Feed.__init__(self, id_, updated, subtitle=subtitle)

        subc = partial(NAVCATALOG_ENTRY, self.base_href, updated)
        subcatalogs = [
            subc(_(u"By {0}").format(title), _("Books sorted by {0}").format(desc), q) for title, desc, q in categories
        ]
        for x in subcatalogs:
            self.root.append(x)


class NavFeed(Feed):
    def __init__(self, id_, updated, offsets, page_url, up_url, title=None):
        kwargs = {"up_link": up_url}
        kwargs["first_link"] = page_url
        kwargs["last_link"] = page_url + "?offset=%d" % offsets.last_offset
        if offsets.offset > 0:
            kwargs["previous_link"] = page_url + "?offset=%d" % offsets.previous_offset
        if offsets.next_offset > -1:
            kwargs["next_link"] = page_url + "?offset=%d" % offsets.next_offset
        if title:
            kwargs["title"] = title
        Feed.__init__(self, id_, updated, **kwargs)


class AcquisitionFeed(NavFeed):
    def __init__(self, updated, id_, items, offsets, page_url, up_url, db, prefix, title=None):
        NavFeed.__init__(self, id_, updated, offsets, page_url, up_url, title=title)
        CFM = db.field_metadata
        CKEYS = [key for key in sorted(custom_fields_to_display(db), key=lambda x: sort_key(CFM[x]["name"]))]
        for item in items:
            self.root.append(ACQUISITION_ENTRY(item, db, updated, CFM, CKEYS, prefix))


class CategoryFeed(NavFeed):
    def __init__(self, items, which, id_, updated, offsets, page_url, up_url, db, title=None):
        NavFeed.__init__(self, id_, updated, offsets, page_url, up_url, title=title)
        base_href = self.base_href + "/category/" + hexlify(which)
        ignore_count = False
        if which == "search":
            ignore_count = True
        for item in items:
            self.root.append(
                CATALOG_ENTRY(
                    item,
                    item.category,
                    base_href,
                    updated,
                    ignore_count=ignore_count,
                    add_kind=which != item.category,
                )
            )


class CategoryGroupFeed(NavFeed):
    def __init__(self, items, which, id_, updated, offsets, page_url, up_url, title=None):
        NavFeed.__init__(self, id_, updated, offsets, page_url, up_url, title=title)
        base_href = self.base_href + "/categorygroup/" + hexlify(which)
        for item in items:
            self.root.append(CATALOG_GROUP_ENTRY(item, which, base_href, updated))


class OpdsHandler(BaseHandler):
    def send_error_of_not_invited(self):
        self.set_header("WWW-Authenticate", "Basic")
        self.set_status(401)
        raise web.Finish()

    def get_opds_acquisition_feed(
        self,
        ids,
        offset,
        page_url,
        up_url,
        id_,
        sort_by="title",
        ascending=True,
        feed_title=None,
    ):
        idx = self.db.FIELD_MAP["id"]
        if not ids:
            raise web.HTTPError(404, reason="No books found")
        items = [x for x in self.db.data.iterall() if x[idx] in ids]
        self.sort(items, sort_by, ascending)
        max_items = CONF["opds_max_items"]
        offsets = Offsets(offset, max_items, len(items))
        items = items[offsets.offset : offsets.offset + max_items]
        updated = self.db.last_modified()
        self.set_header("Last-Modified", self.last_modified(updated))
        self.set_header("Content-Type", "application/atom+xml; profile=opds-catalog; charset=UTF-8")
        return bytes(
            AcquisitionFeed(
                updated,
                id_,
                items,
                offsets,
                page_url,
                up_url,
                self.db,
                CONF["opds_url_prefix"],
                title=feed_title,
            )
        )

    def opds_search(self, query=None, offset=0):
        try:
            offset = int(offset)
        except:
            raise web.HTTPError(404, reason="Not found")
        if query is None:
            raise web.HTTPError(404, reason="Not found")
        try:
            ids = self.search_for_books(query)
        except:
            raise web.HTTPError(404, reason="Search: %r not understood" % query)
        page_url = url_for("opdssearch", query=query)
        return self.get_opds_acquisition_feed(ids, offset, page_url, url_for("opds"), "calibre-search:" + query)

    def get_opds_all_books(self, which, page_url, up_url, offset=0):
        try:
            offset = int(offset)
        except:
            raise web.HTTPError(404, reason="Not found")
        if which not in ("title", "newest"):
            raise web.HTTPError(404, reason="Not found")
        sort = "timestamp" if which == "newest" else "title"
        ascending = which == "title"
        feed_title = {"newest": _("Newest"), "title": _("Title")}.get(which, which)
        feed_title = default_feed_title + " :: " + _("By {0}").format(feed_title)
        ids = list(self.cache.search(""))
        return self.get_opds_acquisition_feed(
            ids,
            offset,
            page_url,
            up_url,
            id_="calibre-all:" + sort,
            sort_by=sort,
            ascending=ascending,
            feed_title=feed_title,
        )

    def opds_category_group(self, category=None, which=None, offset=0):
        try:
            offset = int(offset)
        except:
            raise web.HTTPError(404, reason="Not found")

        if not which or not category:
            raise web.HTTPError(404, reason="Not found")

        categories = self.db.get_categories()
        page_url = url_for("opdscategorygroup", category=category, which=which)

        category = unhexlify(category)
        if category not in categories:
            raise web.HTTPError(404, reason="Category %r not found" % which)
        category_meta = self.db.field_metadata
        meta = category_meta.get(category, {})
        category_name = meta.get("name", which)
        which = unhexlify(which)
        feed_title = default_feed_title + " :: " + (_("By {0} :: {1}").format(category_name, which))
        owhich = hexlify("N" + which)
        up_url = url_for("opdsnavcatalog", which=owhich)
        items = categories[category]

        def belongs(x, which):
            return first_char(x).lower() == which.lower()

        items = [x for x in items if belongs(x, which)]
        if not items:
            raise web.HTTPError(404, reason="No items in group %r:%r" % (category, which))
        updated = self.db.last_modified()

        id_ = "calibre-category-group-feed:" + category + ":" + which
        max_items = CONF["opds_max_items"]
        offsets = Offsets(offset, max_items, len(items))
        items = list(items)[offsets.offset : offsets.offset + max_items]

        self.set_header("Last-Modified", self.last_modified(updated))
        self.set_header("Content-Type", "application/atom+xml; charset=UTF-8")

        return bytes(
            CategoryFeed(
                items,
                category,
                id_,
                updated,
                offsets,
                page_url,
                up_url,
                self.db,
                title=feed_title,
            )
        )

    def opds_navcatalog(self, which=None, offset=0):
        try:
            offset = int(offset)
        except:
            raise web.HTTPError(404, reason="Not found")

        if not which:
            raise web.HTTPError(404, reason="Not found")

        page_url = url_for("opdsnavcatalog", which=which)
        up_url = url_for("opds")
        which = unhexlify(which)
        type_ = which[0]
        which = which[1:]
        if type_ == "O":
            return self.get_opds_all_books(which, page_url, up_url, offset=offset)
        elif type_ == "N":
            return self.get_opds_navcatalog(which, page_url, up_url, offset=offset)
        raise web.HTTPError(404, reason="Not found")

    def get_opds_navcatalog(self, which, page_url, up_url, offset=0):
        categories = self.db.get_categories()
        if which not in categories:
            raise web.HTTPError(404, reason="Category %r not found" % which)

        items = categories[which]
        updated = self.db.last_modified()
        category_meta = self.db.field_metadata
        meta = category_meta.get(which, {})
        category_name = meta.get("name", which)
        feed_title = default_feed_title + " :: " + _("By {0}").format(category_name)

        id_ = "calibre-category-feed:" + which

        MAX_ITEMS = CONF["opds_max_ungrouped_items"]

        if len(items) <= MAX_ITEMS:
            max_items = CONF["opds_max_items"]
            offsets = Offsets(offset, max_items, len(items))
            items = list(items)[offsets.offset : offsets.offset + max_items]
            ans = CategoryFeed(
                items,
                which,
                id_,
                updated,
                offsets,
                page_url,
                up_url,
                self.db,
                title=feed_title,
            )
        else:

            class Group:
                def __init__(self, text, count):
                    self.text, self.count = text, count

            groups = defaultdict(int)
            for x in items:
                c = first_char(x)
                groups[c.upper()] += 1

            items = []
            for c in sorted(groups.keys(), key=sort_key):
                items.append(Group(c, groups[c]))

            max_items = CONF["opds_max_items"]
            offsets = Offsets(offset, max_items, len(items))
            items = items[offsets.offset : offsets.offset + max_items]
            ans = CategoryGroupFeed(items, which, id_, updated, offsets, page_url, up_url, title=feed_title)

        self.set_header("Last-Modified", self.last_modified(updated))
        self.set_header("Content-Type", "application/atom+xml; charset=UTF-8")

        return bytes(ans)

    def opds_category(self, category=None, which=None, offset=0):
        try:
            offset = int(offset)
        except:
            raise web.HTTPError(404, reason="Not found")

        if not which or not category:
            raise web.HTTPError(404, reason="Not found")

        page_url = url_for("opdscategory", which=which, category=category)
        up_url = url_for("opdsnavcatalog", which=category)

        which, category = unhexlify(which), unhexlify(category)
        type_ = which[0]
        which = which[1:]
        if type_ == "I":
            try:
                p = which.index(":")
                category = which[p + 1 :]
                which = which[:p]
                # This line will toss an exception for composite columns
                which = int(which[:p])
            except:
                # Might be a composite column, where we have the lookup key
                if not (
                    category in self.db.field_metadata and self.db.field_metadata[category]["datatype"] == "composite"
                ):
                    raise web.HTTPError(404, reason="Tag %r not found" % which)

        categories = self.db.get_categories()
        if category not in categories:
            raise web.HTTPError(404, reason="Category %r not found" % which)

        if category == "search":
            try:
                ids = self.search_for_books('search:"%s"' % which)
            except:
                raise web.HTTPError(404, reason="Search: %r not understood" % which)
            return self.get_opds_acquisition_feed(ids, offset, page_url, up_url, "calibre-search:" + which)

        if type_ != "I":
            raise web.HTTPError(404, reason="Non id categories not supported")

        q = category
        if q == "news":
            q = "tags"
        ids = self.db.get_books_for_category(q, which)
        sort_by = "series" if category == "series" else "title"

        return self.get_opds_acquisition_feed(
            ids,
            offset,
            page_url,
            up_url,
            "calibre-category:" + category + ":" + str(which),
            sort_by=sort_by,
        )

    def opds(self):
        categories = self.db.get_categories()
        category_meta = self.db.field_metadata
        cats = [
            (_("Newest"), _("Date"), "Onewest"),
            (_("Title"), _("Title"), "Otitle"),
        ]

        def getter(x):
            try:
                return category_meta[x]["name"].lower()
            except KeyError:
                return x

        for category in sorted(categories, key=lambda x: sort_key(getter(x))):
            if len(categories[category]) == 0:
                continue
            if category in ("formats", "identifiers"):
                continue
            meta = category_meta.get(category, None)
            if meta is None:
                continue
            if category_meta.is_ignorable_field(category) and category not in custom_fields_to_display(self.db):
                continue
            name = _(meta["name"])
            cats.append((name, name, "N" + category))

        updated = self.db.last_modified()
        self.set_header("Last-Modified", self.last_modified(updated))
        self.set_header("Content-Type", "application/atom+xml; charset=UTF-8")

        feed = TopLevel(updated, cats)

        return bytes(feed)


class OpdsIndex(OpdsHandler):
    def get(self):
        self.write(self.opds())


class OpdsNav(OpdsHandler):
    def get(self, which):
        offset = self.get_argument("offset", 0)
        self.write(self.opds_navcatalog(which, offset=offset))


class OpdsCategory(OpdsHandler):
    def get(self, category, which):
        offset = self.get_argument("offset", 0)
        self.write(self.opds_category(category, which, offset=offset))


class OpdsCategoryGroup(OpdsHandler):
    def get(self, category, which):
        offset = self.get_argument("offset", 0)
        self.write(self.opds_category_group(category, which, offset=offset))


class OpdsSearch(OpdsHandler):
    def get(self, which):
        offset = self.get_argument("offset", 0)
        self.write(self.opds_search(which, offset=offset))


def routes():
    return [
        (r"/opds/?", OpdsIndex),
        (r"/opds/nav/(.*)", OpdsNav),
        (r"/opds/category/(.*)/(.*)", OpdsCategory),
        (r"/opds/categorygroup/(.*)/(.*)", OpdsCategoryGroup),
        (r"/opds/search/(.*)", OpdsSearch),
    ]

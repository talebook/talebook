"""插件能力接口共享的领域对象。

领域对象属于平台协议，不属于某个具体插件。它们同时实现 ``Mapping``，让迁移期
仍按 ``item["title"]`` 读取结果的写入器与测试无需一次性重写；协议边界内已经
不再传递无类型的裸 ``dict``。
"""

from collections.abc import Iterator, Mapping
from dataclasses import asdict, dataclass, field
from typing import Any, Generic, TypeVar


T = TypeVar("T")


@dataclass(frozen=True, eq=False)
class DomainRecord(Mapping[str, Any]):
    """兼容存量异构字段的类型化记录基类。"""

    values: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, value):
        if isinstance(value, cls):
            return value
        if not isinstance(value, Mapping):
            raise TypeError("%s requires a mapping" % cls.__name__)
        return cls(dict(value))

    def to_dict(self):
        return dict(self.values)

    def __getitem__(self, key):
        return self.values[key]

    def __iter__(self) -> Iterator[str]:
        return iter(self.values)

    def __len__(self):
        return len(self.values)

    def __eq__(self, other):
        if isinstance(other, Mapping):
            return self.to_dict() == dict(other)
        return NotImplemented


@dataclass(frozen=True, eq=False)
class BookMetadata(DomainRecord):
    """书籍元数据候选。字段集合由具体来源决定，身份由 ProviderItem 承担。"""


@dataclass(frozen=True, eq=False)
class Annotation(DomainRecord):
    """划线、笔记或章评。"""


@dataclass(frozen=True, eq=False)
class SourceState(DomainRecord):
    """一条外部批注副本的同步水位与身份。"""


@dataclass(frozen=True, eq=False)
class Review(DomainRecord):
    """外部评分或评价。"""


@dataclass(frozen=True)
class SourceBook(Mapping[str, Any]):
    """书源列表条目；``external_id`` 对平台完全不透明。"""

    external_id: str
    title: str
    authors: tuple[str, ...] = ()
    isbn: str = ""
    format: str = ""
    source: str = ""
    source_url: str = ""
    acquisition_url: str = ""
    access: str = "external_link"
    license: str = ""
    target_library: str = "main"
    review_status: str = "pending"
    content_hash: str = ""
    remote_etag: str = ""
    updated_at: str = ""
    description: str = ""
    cover_url: str = ""
    categories: tuple[str, ...] = ()
    extra: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, value):
        if isinstance(value, cls):
            return value
        data = dict(value)
        known = set(cls.__dataclass_fields__) - {"extra"}
        kwargs = {key: data.pop(key) for key in tuple(data) if key in known}
        kwargs["authors"] = tuple(kwargs.get("authors") or ())
        kwargs["categories"] = tuple(kwargs.get("categories") or ())
        kwargs["extra"] = data
        return cls(**kwargs)

    def to_dict(self):
        value = asdict(self)
        extra = value.pop("extra")
        value["authors"] = list(self.authors)
        value["categories"] = list(self.categories)
        value.update(extra)
        # 一版 /api/network/* 兼容别名仍消费 Legado 的字段名。
        value.setdefault("name", self.title)
        value.setdefault("author", self.authors[0] if self.authors else "")
        value.setdefault("book_url", self.external_id)
        return value

    def __getitem__(self, key):
        return self.to_dict()[key]

    def __iter__(self) -> Iterator[str]:
        return iter(self.to_dict())

    def __len__(self):
        return len(self.to_dict())


@dataclass(frozen=True)
class SourceBookDetail:
    external_id: str
    title: str
    authors: tuple[str, ...] = ()
    description: str = ""
    cover_url: str = ""
    categories: tuple[str, ...] = ()
    source_url: str = ""
    acquisition_url: str = ""
    format: str = ""
    downloadable: bool = False
    toc_ref: str = ""
    last_chapter: str = ""
    word_count: str = ""
    source: str = ""
    extra: dict[str, Any] = field(default_factory=dict)

    def to_dict(self):
        value = asdict(self)
        value["authors"] = list(self.authors)
        value["categories"] = list(self.categories)
        value.update(value.pop("extra"))
        value.setdefault("name", self.title)
        value.setdefault("author", self.authors[0] if self.authors else "")
        value.setdefault("intro", self.description)
        value.setdefault("book_url", self.external_id)
        value.setdefault("toc_url", self.toc_ref)
        return value


@dataclass(frozen=True)
class SourceChapter:
    external_id: str
    title: str
    is_vip: bool = False
    updated_at: str = ""
    extra: dict[str, Any] = field(default_factory=dict)

    def to_dict(self):
        value = {
            "external_id": self.external_id,
            "title": self.title,
            "is_vip": self.is_vip,
            "updated_at": self.updated_at,
            **self.extra,
        }
        value.setdefault("name", self.title)
        value.setdefault("url", self.external_id)
        return value


@dataclass(frozen=True)
class SourceContent:
    title: str = ""
    content: str = ""
    extra: dict[str, Any] = field(default_factory=dict)

    def to_dict(self):
        return {"title": self.title, "content": self.content, **self.extra}


@dataclass(frozen=True)
class Category:
    id: str
    name: str

    def to_dict(self):
        return {"id": self.id, "name": self.name}


@dataclass(frozen=True)
class BookFile:
    filename: str
    content: bytes
    format: str
    media_type: str = "application/octet-stream"
    source_url: str = ""


@dataclass(frozen=True)
class CheckReport:
    healthy: bool
    message: str = ""
    tags: tuple[str, ...] = ()


@dataclass(frozen=True)
class ItemFailure:
    external_id: str
    error_code: str
    error_message: str


@dataclass(frozen=True)
class Page(Generic[T]):
    items: list[T] = field(default_factory=list)
    failures: list[ItemFailure] = field(default_factory=list)
    has_more: bool = False
    next_cursor: dict[str, Any] = field(default_factory=dict)
    health_message: str = ""


@dataclass(frozen=True, eq=False)
class ToolInput(DomainRecord):
    """正文工具输入。"""


@dataclass(frozen=True, eq=False)
class ToolReport(DomainRecord):
    """正文工具预览结果。"""


@dataclass(frozen=True, eq=False)
class ToolOutput(DomainRecord):
    """正文工具写入结果。"""


@dataclass(frozen=True)
class PushReceipt:
    source_annotation_id: str = ""
    source_position: str = ""
    source_raw_hash: str = ""
    source_updated_at: str = ""


ENTITY_DOMAIN_TYPES = {
    "metadata": BookMetadata,
    "annotation": Annotation,
    "review": Review,
    "book_source": SourceBook,
}


def coerce_entity(entity_type, value):
    """把兼容期 provider 返回的 mapping 原地升格为领域对象。"""
    domain_type = ENTITY_DOMAIN_TYPES.get(entity_type)
    if domain_type is None or isinstance(value, domain_type):
        return value
    return domain_type.from_dict(value)

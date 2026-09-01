"""插件能力接口：运行时与插件之间的类型化边界。"""

from dataclasses import dataclass, field
from typing import Any, Literal, Protocol, runtime_checkable

from .domains import (
    Annotation,
    BookFile,
    BookMetadata,
    Category,
    CheckReport,
    MetadataQuery,
    Page,
    PushReceipt,
    Review,
    SourceBook,
    SourceBookDetail,
    SourceChapter,
    SourceContent,
    SourceState,
    ToolInput,
    ToolOutput,
    ToolReport,
)


DownloadMode = Literal["single_book", "by_chapters", "none"]


@dataclass(frozen=True)
class PluginContext:
    action: str
    attempt: int
    deadline: str
    config: dict[str, Any] = field(default_factory=dict)
    cursor: dict[str, Any] = field(default_factory=dict)
    secrets: dict[str, Any] = field(default_factory=dict)
    scopes: list[str] = field(default_factory=list)
    target_external_ids: list[str] = field(default_factory=list)
    input_data: dict[str, Any] = field(default_factory=dict)
    platform: dict[str, Any] = field(default_factory=dict)

    def as_dict(self):
        return {
            "action": self.action,
            "attempt": self.attempt,
            "config": dict(self.config),
            "cursor": dict(self.cursor),
            "secrets": dict(self.secrets),
            "scopes": list(self.scopes),
            "target_external_ids": list(self.target_external_ids),
            "input_data": dict(self.input_data),
            "deadline": self.deadline,
            "platform": dict(self.platform),
        }


@runtime_checkable
class MetadataProvider(Protocol):
    def search_books(self, query: MetadataQuery, context: dict[str, Any]) -> list[BookMetadata]: ...

    """返回按相关度降序排列的候选；无结果返回空列表而不是抛异常。"""

    def get_metadata(self, external_id: str, context: dict[str, Any]) -> BookMetadata | None: ...

    """按本源的 provider_value 取回单条；取不到返回 None。"""

    def get_cover(self, cover_url: str, context: dict[str, Any]) -> tuple[str, bytes] | None: ...

    """下载封面并返回 (扩展名, 字节)；无封面或失败返回 None。

    元数据候选只携带 cover_url，实际下载由调用方在确认选用后才触发。
    """


@runtime_checkable
class AnnotationProvider(Protocol):
    def list_annotations(self, context: dict[str, Any]) -> Page[Annotation]: ...

    def push_annotation(self, item: Annotation, state: SourceState, context: dict[str, Any]) -> PushReceipt: ...


@runtime_checkable
class ReviewProvider(Protocol):
    def get_reviews(self, query, context: dict[str, Any]) -> Page[Review]: ...


@runtime_checkable
class SourceProvider(Protocol):
    download_mode: DownloadMode

    def search(self, query: str, cursor: dict[str, Any], context: dict[str, Any]) -> Page[SourceBook]: ...

    def browse(self, category_id: str, cursor: dict[str, Any], context: dict[str, Any]) -> Page[SourceBook]: ...

    def get_categories(self, context: dict[str, Any]) -> list[Category]: ...

    def get_book(self, external_id: str, context: dict[str, Any]) -> SourceBookDetail: ...

    def download(self, book: SourceBookDetail, context: dict[str, Any]) -> BookFile: ...

    def get_toc(self, book: SourceBookDetail, context: dict[str, Any]) -> list[SourceChapter]: ...

    def get_chapter(self, chapter: SourceChapter, context: dict[str, Any]) -> SourceContent: ...

    def self_check(self, context: dict[str, Any]) -> CheckReport: ...


@runtime_checkable
class TransformProvider(Protocol):
    supported_formats: frozenset
    supports_auto_trigger: bool

    def preview(self, src: ToolInput, context: dict[str, Any]) -> ToolReport: ...

    def apply(self, src: ToolInput, out_dir: str, context: dict[str, Any]) -> ToolOutput: ...


@runtime_checkable
class ExtraFeatureProvider(Protocol):
    def execute_feature(self, action: str, params: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]: ...


@runtime_checkable
class PushProvider(Protocol):
    default_port: int

    def push(self, book_file, target, context): ...


CAPABILITY_INTERFACES = {
    "metadata.lookup": MetadataProvider,
    # 文件提取与运行时发现不是书籍检索，但仍属于第七类受控逃生舱，
    # 不再用一个全局 PluginProvider.execute() 混装所有语义。
    "metadata.extract": ExtraFeatureProvider,
    "metadata.discover": ExtraFeatureProvider,
    "annotations.import": AnnotationProvider,
    "annotations.push": AnnotationProvider,
    "annotations.chapter_reviews": ReviewProvider,
    "reviews.lookup": ReviewProvider,
    "reviews.import": ReviewProvider,
    "sources.search": SourceProvider,
    "sources.browse": SourceProvider,
    "sources.acquire": SourceProvider,
    "integrations.tool": TransformProvider,
    "integrations.push": PushProvider,
    "integrations.search": ExtraFeatureProvider,
    "integrations.books": ExtraFeatureProvider,
    "integrations.shelf": ExtraFeatureProvider,
    "integrations.statistics": ExtraFeatureProvider,
    "integrations.community": ExtraFeatureProvider,
    "integrations.recommendations": ExtraFeatureProvider,
}


def contract_violations(provider, manifest=None):
    """返回 provider 违反基础契约或 capability 接口之处。"""
    problems = []
    if not isinstance(getattr(provider, "manifest", None), dict):
        problems.append("manifest 必须是 dict")
        return problems
    if manifest is not None:
        raw = manifest.raw
        for capability in raw["capabilities"]:
            interface = CAPABILITY_INTERFACES.get(capability)
            if interface is None:
                problems.append("声明了平台未知能力 %s" % capability)
            elif not isinstance(provider, interface):
                problems.append("声明了 %s 但未实现 %s" % (capability, interface.__name__))
        if raw.get("extra_features") and not isinstance(provider, ExtraFeatureProvider):
            problems.append("声明了 extra_features 但未实现 ExtraFeatureProvider")
        if (
            "test" in raw["actions"]
            and not callable(getattr(provider, "self_check", None))
            and not callable(getattr(provider, "execute", None))
        ):
            problems.append("声明了 test 但 typed-only provider 未实现 self_check")
        if any(capability.startswith("sources.") for capability in raw["capabilities"]):
            declared_mode = raw.get("download_mode")
            actual_mode = getattr(provider, "download_mode", None)
            if declared_mode is None:
                problems.append("书源必须声明 download_mode")
            elif actual_mode != declared_mode:
                problems.append("manifest download_mode 与 SourceProvider.download_mode 不一致")
            required = {
                "single_book": ("download",),
                "by_chapters": ("get_toc", "get_chapter"),
                "none": (),
            }.get(declared_mode, ())
            missing = [name for name in required if not callable(getattr(provider, name, None))]
            if missing:
                problems.append("download_mode=%s 缺少方法：%s" % (declared_mode, ", ".join(missing)))
    return problems

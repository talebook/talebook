"""把插件连接与存量书源事实表绑定为统一 SourceProvider 目录。"""

from dataclasses import dataclass, field

from sqlalchemy.orm import sessionmaker

from webserver.models import BookSourceModel, OpdsSource, PluginConnection
from webserver.plugins.runtime.interfaces import SourceProvider
from webserver.plugins.source.legado import PLUGIN_ID as LEGADO_PLUGIN_ID
from webserver.plugins.source.opds import PLUGIN_ID as OPDS_PLUGIN_ID
from webserver.services.plugin_runtime import PluginRuntime, PluginRuntimeError, ensure_auto_installations


SOURCE_CAPABILITIES = frozenset({"book_sources.search", "book_sources.browse", "book_sources.acquire"})


@dataclass(frozen=True)
class SourceBinding:
    key: str
    name: str
    group: str
    connection: PluginConnection
    plugin_key: str
    capabilities: frozenset[str]
    download_mode: str
    context_overrides: dict = field(default_factory=dict)
    legacy_id: int | None = None

    def to_public_dict(self):
        return {
            "id": self.legacy_id if self.legacy_id is not None else self.key,
            "source_key": self.key,
            "name": self.name,
            "group": self.group,
            "plugin_key": self.plugin_key,
            "capabilities": sorted(self.capabilities),
            "download_mode": self.download_mode,
        }


class SourceCatalogService:
    def __init__(self, session, settings, user_id, runtime=None):
        self.session = session
        self.settings = settings
        self.user_id = user_id
        ensure_auto_installations(session, user_id, settings)
        self.runtime = runtime or PluginRuntime(session, settings)

    def _engine_config(self):
        return {
            "BOOKSOURCE_HTTP_TIMEOUT": self.settings.get("BOOKSOURCE_HTTP_TIMEOUT", 20),
            "BOOKSOURCE_MAX_TOC_PAGES": self.settings.get("BOOKSOURCE_MAX_TOC_PAGES", 30),
            "BOOKSOURCE_MAX_CONTENT_PAGES": self.settings.get("BOOKSOURCE_MAX_CONTENT_PAGES", 20),
            "BOOKSOURCE_AD_PATTERNS": self.settings.get("BOOKSOURCE_AD_PATTERNS", []),
            "BOOKSOURCE_CLEAN_ENABLED": self.settings.get("BOOKSOURCE_CLEAN_ENABLED", True),
            "BOOKSOURCE_ALLOWED_HOSTS": self.settings.get("BOOKSOURCE_ALLOWED_HOSTS", []),
            "BOOKSOURCE_MAX_RESPONSE_BYTES": self.settings.get("BOOKSOURCE_MAX_RESPONSE_BYTES", 8 * 1024 * 1024),
        }

    def bindings(self):
        connections = {}
        for capability in SOURCE_CAPABILITIES:
            for connection in self.runtime.connections_for(capability, self.user_id):
                connections[connection.id] = connection

        output = []
        for connection in sorted(connections.values(), key=lambda item: item.id):
            plugin_key = self.runtime.plugin_key_of(connection)
            provider = self.runtime.registry.get(plugin_key)
            if not isinstance(provider, SourceProvider):
                continue
            definition = self.runtime._definition_of(connection)
            capabilities = frozenset(definition.capabilities or []) & SOURCE_CAPABILITIES
            download_mode = str(provider.download_mode)
            if plugin_key == LEGADO_PLUGIN_ID:
                sources = (
                    self.session.query(BookSourceModel)
                    .filter(BookSourceModel.enabled.is_(True))
                    .order_by(BookSourceModel.weight.desc(), BookSourceModel.id.asc())
                    .all()
                )
                output.extend(
                    SourceBinding(
                        key="legado:%s" % source.id,
                        name=source.name,
                        group=source.group or "",
                        connection=connection,
                        plugin_key=plugin_key,
                        capabilities=capabilities,
                        download_mode=download_mode,
                        context_overrides={
                            "config": {
                                "source_raw": dict(source.raw or {}),
                                "engine_config": self._engine_config(),
                            }
                        },
                        legacy_id=source.id,
                    )
                    for source in sources
                )
            elif plugin_key == OPDS_PLUGIN_ID:
                sources = self.session.query(OpdsSource).filter(OpdsSource.active.is_(True)).order_by(OpdsSource.id).all()
                output.extend(
                    SourceBinding(
                        key="opds:%s" % source.id,
                        name=source.name,
                        group="OPDS",
                        connection=connection,
                        plugin_key=plugin_key,
                        capabilities=capabilities,
                        download_mode=download_mode,
                        context_overrides={"config": {"endpoint": source.url}},
                    )
                    for source in sources
                )
            else:
                output.append(
                    SourceBinding(
                        key="plugin:%s" % connection.id,
                        name=definition.name,
                        group="插件书源",
                        connection=connection,
                        plugin_key=plugin_key,
                        capabilities=capabilities,
                        download_mode=download_mode,
                    )
                )
        return output

    def get(self, source_key):
        value = str(source_key or "")
        # 旧 /api/network/* 的纯数字 source_id 是一版兼容别名，只在绑定层解释。
        if value.isdigit():
            value = "legado:%s" % value
        binding = next((item for item in self.bindings() if item.key == value), None)
        if binding is None:
            raise PluginRuntimeError("source.not_found", "Book source is not available")
        return binding

    def read(self, binding, method, *args, timeout=None, extra_config=None):
        override = dict(binding.context_overrides or {})
        if extra_config:
            override["config"] = {**dict(override.get("config") or {}), **dict(extra_config)}
        return self.runtime.read(
            binding.connection,
            method,
            *args,
            timeout=timeout or self.settings.get("BOOKSOURCE_HTTP_TIMEOUT", 20),
            context_overrides=override,
            required_scopes=("books.read",),
        )

    def prepare_search(self, bindings):
        """在请求线程完成 session/Secret 工作，worker 只保留网络调用。

        多个 Legado/OPDS 事实 binding 可以共用同一条插件连接。这里按
        connection 分组，一组只建一个 lease/run；每个 binding 仍有自己的
        config 与总 deadline。任务完成后由预绑定的独立 session 立即调用
        ``finish_read_batch`` 收口；status 请求与 TTL cleanup 只负责失败重试。
        """
        prepared = []
        timeout = self.settings.get("BOOKSOURCE_HTTP_TIMEOUT", 20)
        groups = {}
        for binding in bindings:
            groups.setdefault(binding.connection.id, []).append(binding)

        for grouped in groups.values():
            connection = grouped[0].connection
            batch = None
            batch_error = None
            try:
                batch = self.runtime.begin_read_batch(
                    connection,
                    timeout=timeout,
                    requested_by=self.user_id,
                    audit_data={"source_ids": [binding.key for binding in grouped]},
                )
                # SearchTask worker 不能复用 handler session。为这个 batch
                # 绑定一个独立 session finalizer，使审计收口不依赖
                # 客户端继续轮询 status。
                session_factory = sessionmaker(bind=self.session.get_bind(), autoflush=True, autocommit=False)

                def finalize(
                    runtime_batch,
                    outcomes,
                    _factory=session_factory,
                    _registry=self.runtime.registry,
                    _settings=self.settings,
                ):
                    worker_session = _factory()
                    try:
                        return PluginRuntime(
                            worker_session,
                            _settings,
                            registry=_registry,
                        ).finish_read_batch(runtime_batch, outcomes)
                    finally:
                        worker_session.close()

                batch["finalize"] = finalize
            except PluginRuntimeError as exc:
                batch_error = exc

            for binding in grouped:
                unit = None
                error = batch_error
                if error is None:
                    units, failures = self.runtime.prepare_read(
                        [connection],
                        timeout=batch["timeout"],
                        context_overrides={connection.id: binding.context_overrides},
                        required_scopes=("books.read",),
                        retry=True,
                    )
                    if failures:
                        error = failures[connection.id]
                    else:
                        unit = units[0]
                        batch["secrets"] = unit["secrets"]
                        batch["attempt_states"].append(unit["attempt_state"])

                if error is not None:

                    def failed_call(_query, _page, _error=error):
                        raise _error

                    call = failed_call
                else:

                    def search_call(query, page, _unit=unit):
                        return _unit["call"]("search", query, {"page": page})

                    call = search_call
                prepared.append(
                    {
                        "source_id": binding.key,
                        "source_name": binding.name,
                        "connection_id": connection.id,
                        "legacy_id": binding.legacy_id,
                        "call": call,
                        "runtime_batch": batch,
                    }
                )
        return prepared

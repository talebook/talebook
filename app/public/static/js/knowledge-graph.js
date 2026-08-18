(function () {
  "use strict";

  const TASKS_API = "/api/ai/knowledge_graph/tasks";
  const TYPES = {
    person: ["人物", "#b54b4b"], place: ["地点", "#2f7c64"], organization: ["组织", "#6d55a3"],
    event: ["事件", "#8a4a0f"], concept: ["概念", "#28739c"], claim: ["论点", "#a13f73"], evidence: ["证据", "#596574"]
  };
  const state = {
    bookId: null, artifact: null, pollTimer: null, previousFocus: null, inertElements: [],
    pendingRequest: null, expanded: new Set(), selectedNode: null, search: "", enabledTypes: new Set(Object.keys(TYPES)),
    coreLimit: 20, zoom: 1, openedFromNav: false, suppressNav: false
  };
  const el = {};

  function node(tag, className, text) {
    const value = document.createElement(tag);
    if (className) value.className = className;
    if (text !== undefined) value.textContent = text;
    return value;
  }

  function svgNode(tag, attrs) {
    const value = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attrs || {}).forEach(function (entry) { value.setAttribute(entry[0], String(entry[1])); });
    return value;
  }

  function button(text, action, options) {
    const value = node("button", "", text);
    value.type = "button";
    value.dataset.action = action;
    if (options && options.primary) value.dataset.primary = "true";
    if (options && options.danger) value.dataset.danger = "true";
    if (options && options.disabled) value.disabled = true;
    return value;
  }

  function request(url, options) {
    return fetch(url, Object.assign({ credentials: "same-origin" }, options || {})).then(function (response) {
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("json")) throw new Error("服务器返回格式无效");
      return response.json();
    }).then(function (payload) {
      if (payload.err !== "ok") throw Object.assign(new Error(payload.msg || "请求失败"), { code: payload.err });
      return payload;
    });
  }

  function buildShell() {
    el.launcher = button("AI 图谱", "open");
    el.launcher.className = "knowledge-graph-launcher";
    el.launcher.setAttribute("aria-haspopup", "dialog");
    el.backdrop = node("div", "knowledge-graph-backdrop");
    el.backdrop.dataset.action = "close";
    el.panel = node("section", "knowledge-graph");
    el.panel.setAttribute("role", "dialog");
    el.panel.setAttribute("aria-modal", "true");
    el.panel.setAttribute("aria-labelledby", "knowledge-graph-title");
    el.panel.tabIndex = -1;

    const header = node("header", "knowledge-graph__header");
    const title = node("div", "knowledge-graph__title");
    const eyebrow = node("span", "knowledge-graph__eyebrow", "AI 中心");
    const heading = node("h2", "", "单本书知识图谱");
    heading.id = "knowledge-graph-title";
    el.subtitle = node("small", "", document.title);
    title.append(eyebrow, heading, el.subtitle);
    header.append(title, button("关闭", "close"));
    el.body = node("div", "knowledge-graph__body");
    el.live = node("div", "knowledge-graph__sr-only");
    el.live.setAttribute("role", "status");
    el.live.setAttribute("aria-atomic", "true");
    el.panel.append(header, el.body, el.live);
    document.body.append(el.launcher, el.backdrop, el.panel);
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", function (event) {
      if (el.panel.dataset.open !== "true") return;
      if (event.key === "Escape") close();
      else if (event.key === "Tab") trapFocus(event);
    });
  }

  function focusableElements() {
    const selector = "button:not([disabled]),input:not([disabled]),select:not([disabled]),a[href],[tabindex]:not([tabindex='-1'])";
    return Array.from(el.panel.querySelectorAll(selector)).filter(function (item) {
      return !item.hidden && item.getClientRects().length > 0;
    });
  }

  function trapFocus(event) {
    const focusable = focusableElements();
    if (!focusable.length) { event.preventDefault(); el.panel.focus(); return; }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || !el.panel.contains(document.activeElement))) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !el.panel.contains(document.activeElement))) {
      event.preventDefault(); first.focus();
    }
  }

  function setBackgroundInert(inert) {
    if (inert) {
      state.inertElements = Array.from(document.body.children).filter(function (item) {
        return item !== el.panel && item !== el.backdrop && item !== el.launcher && !item.inert;
      });
      state.inertElements.forEach(function (item) { item.inert = true; });
      document.documentElement.dataset.knowledgeGraphOpen = "true";
      return;
    }
    state.inertElements.forEach(function (item) { item.inert = false; });
    state.inertElements = [];
    delete document.documentElement.dataset.knowledgeGraphOpen;
  }

  function cleanHref(value) {
    const path = String(value || "").split("#")[0].split("?")[0];
    try { return decodeURIComponent(path).replace(/^\.\//, "").replace(/^\//, ""); }
    catch (_error) { return path.replace(/^\.\//, "").replace(/^\//, ""); }
  }

  function hrefMatches(left, right) {
    left = cleanHref(left); right = cleanHref(right);
    return Boolean(left && right && (left === right || left.endsWith("/" + right) || right.endsWith("/" + left)));
  }

  function tocItemForHref(items, href) {
    for (const item of items || []) {
      if (hrefMatches(item.href, href)) return item;
      const child = tocItemForHref(item.subitems || item.children, href);
      if (child) return child;
    }
    return null;
  }

  function currentChapter() {
    const reader = readerProxy();
    const location = reader && reader.rendition && reader.rendition.currentLocation();
    const href = location && location.start && cleanHref(location.start.href);
    if (!href) return null;
    const tocItem = tocItemForHref(reader.toc_items, href);
    return {
      href: href,
      title: (tocItem && tocItem.label && tocItem.label.trim()) || reader.current_toc_title || "当前章节"
    };
  }

  function open(options) {
    const wasOpen = el.panel.dataset.open === "true";
    if (!wasOpen) state.previousFocus = document.activeElement;
    el.panel.dataset.open = "true";
    el.backdrop.dataset.open = "true";
    el.launcher.hidden = true;
    if (!wasOpen) setBackgroundInert(true);
    if (options && options.fromNav) state.openedFromNav = true;
    loadLatest();
    el.panel.querySelector("button")?.focus();
  }

  function close() {
    window.clearTimeout(state.pollTimer);
    el.panel.dataset.open = "false";
    el.backdrop.dataset.open = "false";
    el.launcher.hidden = false;
    setBackgroundInert(false);
    if (state.openedFromNav) {
      state.openedFromNav = false;
      const nav = findAiNavButton();
      if (nav) {
        state.suppressNav = true;
        nav.click();
        window.setTimeout(function () { state.suppressNav = false; }, 0);
      }
    }
    if (state.previousFocus && document.contains(state.previousFocus)) state.previousFocus.focus();
    else el.launcher.focus();
    state.previousFocus = null;
  }

  function renderStatus(message, alert, busy) {
    el.body.replaceChildren();
    el.body.setAttribute("aria-busy", busy ? "true" : "false");
    const wrap = node("div", "knowledge-graph__center");
    const status = node("div", "knowledge-graph__status");
    if (alert) status.setAttribute("role", "alert");
    if (busy) status.append(node("span", "knowledge-graph__spinner"));
    status.append(document.createTextNode(message));
    wrap.append(status);
    el.body.append(wrap);
    el.live.textContent = message;
    return wrap;
  }

  function actions(container, values) {
    const group = node("div", "knowledge-graph__actions");
    values.forEach(function (value) { group.append(button(value.text, value.action, value)); });
    container.append(group);
  }

  async function loadLatest() {
    if (!state.bookId) {
      renderStatus("缺少书籍标识，无法打开知识图谱。", true);
      return;
    }
    const wrap = renderStatus("正在恢复这本书的图谱任务…", false, true);
    try {
      const payload = await request(`${TASKS_API}?book_id=${encodeURIComponent(state.bookId)}`);
      state.artifact = payload.tasks[0] || null;
      renderArtifact();
    } catch (error) {
      wrap.replaceChildren();
      const status = node("div", "knowledge-graph__status", error.message);
      status.setAttribute("role", "alert");
      wrap.append(status);
      actions(wrap, [{ text: "重试", action: "open", primary: true }]);
    }
  }

  function renderReady() {
    el.body.replaceChildren();
    const intro = node("section", "knowledge-graph__intro");
    intro.append(node("span", "knowledge-graph__kicker", "从证据出发"));
    intro.append(node("h3", "", "看见人物、事件与论点如何连接"));
    intro.append(node("p", "", "选择处理范围后，系统会先显示预计章节数和正文量。正式节点与关系都保留可回跳的原文证据。"));
    const cards = node("div", "knowledge-graph__scope-grid");
    const chapter = currentChapter();
    const chapterCard = node("article", "knowledge-graph__scope-card");
    chapterCard.append(node("strong", "", "当前章节"), node("p", "", chapter ? chapter.title : "请先翻到正文页"));
    chapterCard.append(button("预估当前章节", "preview-chapter", { primary: true, disabled: !chapter }));
    const bookCard = node("article", "knowledge-graph__scope-card knowledge-graph__scope-card--accent");
    bookCard.append(node("strong", "", "整本书"), node("p", "", "覆盖 EPUB 目录中的全部正文章节；长书可能需要较多时间。"));
    bookCard.append(button("预估整书", "preview-book", { primary: true }));
    cards.append(chapterCard, bookCard);
    intro.append(cards);
    el.body.append(intro);
  }

  function scopeRequest(kind) {
    if (kind === "book") return { book_id: Number(state.bookId), scope: "book" };
    const chapter = currentChapter();
    if (!chapter || !chapter.href) throw new Error("暂时无法识别当前章节，请翻到正文页后重试");
    return { book_id: Number(state.bookId), scope: "chapter", chapter_href: chapter.href };
  }

  async function preview(kind) {
    let body;
    try { body = scopeRequest(kind); } catch (error) { renderStatus(error.message, true); return; }
    const wrap = renderStatus("正在读取 EPUB 目录并估算处理量…", false, true);
    try {
      const payload = await request(TASKS_API, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.assign({}, body, { preview_only: true }))
      });
      state.pendingRequest = body;
      wrap.replaceChildren();
      const confirm = node("section", "knowledge-graph__confirm");
      confirm.append(node("span", "knowledge-graph__kicker", "处理量确认"));
      confirm.append(node("h3", "", payload.scope.label));
      const metrics = node("div", "knowledge-graph__metrics");
      metrics.append(metric(String(payload.estimate.chapter_count), "章节"));
      metrics.append(metric(Number(payload.estimate.character_count).toLocaleString(), "正文字符"));
      metrics.append(metric(String(payload.estimate.runtime_calls), "结构化提取段"));
      confirm.append(metrics, node("p", "knowledge-graph__muted", "生成过程中可关闭面板或刷新页面；任务和已校验阶段会保留。"));
      actions(confirm, [{ text: "确认生成", action: "generate", primary: true }, { text: "返回", action: "ready" }]);
      wrap.append(confirm);
    } catch (error) {
      wrap.replaceChildren();
      const status = node("div", "knowledge-graph__status", error.message);
      status.setAttribute("role", "alert");
      wrap.append(status);
      actions(wrap, [{ text: "返回", action: "ready", primary: true }]);
    }
  }

  function metric(value, label) {
    const item = node("div", "knowledge-graph__metric");
    item.append(node("strong", "", value), node("span", "", label));
    return item;
  }

  async function generate(requestBody) {
    const body = requestBody || state.pendingRequest;
    if (!body) { renderReady(); return; }
    const wrap = renderStatus("正在创建知识图谱任务…", false, true);
    try {
      const payload = await request(TASKS_API, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
      });
      state.artifact = payload.task;
      state.pendingRequest = null;
      renderArtifact();
    } catch (error) {
      wrap.replaceChildren();
      const status = node("div", "knowledge-graph__status", error.message);
      status.setAttribute("role", "alert");
      wrap.append(status);
      actions(wrap, [{ text: "重试", action: "generate", primary: true }, { text: "返回", action: "ready" }]);
    }
  }

  function renderArtifact() {
    const artifact = state.artifact;
    if (!artifact) { renderReady(); return; }
    if (artifact.status === "queued" || artifact.status === "running") {
      const wrap = renderStatus(artifact.progress_message || "正在提取知识图谱…", false, true);
      const progress = node("div", "knowledge-graph__progress");
      const total = Math.max(artifact.total_segments || 1, 1);
      const completed = Math.min(artifact.completed_segments || 0, total);
      const bar = node("div", "knowledge-graph__progress-track");
      const value = node("span", "knowledge-graph__progress-value");
      value.style.width = `${Math.round(completed / total * 100)}%`;
      bar.append(value);
      progress.append(bar, node("small", "", `已校验 ${completed}/${total} 个阶段；可安全关闭或刷新`));
      wrap.append(progress);
      actions(wrap, [{ text: "取消", action: "cancel", danger: true }, { text: "关闭", action: "close" }]);
      schedulePoll();
      return;
    }
    window.clearTimeout(state.pollTimer);
    if (artifact.status === "failed" || artifact.status === "cancelled") {
      const message = artifact.error?.message || (artifact.status === "cancelled" ? "生成已取消" : "生成失败，请重试");
      const wrap = renderStatus(message, artifact.status === "failed");
      actions(wrap, [{ text: "从已校验阶段重试", action: "retry", primary: true }, { text: "删除任务", action: "delete", danger: true }]);
      return;
    }
    renderWorkspace();
  }

  function schedulePoll() {
    window.clearTimeout(state.pollTimer);
    state.pollTimer = window.setTimeout(async function () {
      try {
        const payload = await request(`${TASKS_API}/${state.artifact.id}`);
        state.artifact = payload.task;
        renderArtifact();
      } catch (error) {
        const wrap = renderStatus(error.message, true);
        actions(wrap, [{ text: "重新连接", action: "open", primary: true }]);
      }
    }, 1400);
  }

  function taskRequest(regenerate) {
    const scope = state.artifact && state.artifact.scope;
    if (!scope) return null;
    const body = { book_id: Number(state.bookId), scope: scope.kind, regenerate: Boolean(regenerate) };
    if (scope.kind === "chapter") body.chapter_href = scope.chapter_hrefs[0];
    else if (scope.kind === "chapters") body.chapter_hrefs = scope.chapter_hrefs;
    return body;
  }

  async function cancelArtifact() {
    try {
      const payload = await request(`${TASKS_API}/${state.artifact.id}/cancel`, { method: "POST" });
      state.artifact = payload.task;
      renderArtifact();
    } catch (error) { renderStatus(error.message, true); }
  }

  async function deleteArtifact() {
    if (!window.confirm("删除这份知识图谱和任务记录？此操作无法撤销。")) return;
    try {
      await request(`${TASKS_API}/${state.artifact.id}`, { method: "DELETE" });
      state.artifact = null;
      resetGraphState();
      renderReady();
    } catch (error) { renderStatus(error.message, true); }
  }

  function resetGraphState() {
    state.expanded = new Set(); state.selectedNode = null; state.search = "";
    state.enabledTypes = new Set(Object.keys(TYPES)); state.coreLimit = 20; state.zoom = 1;
  }

  function renderWorkspace() {
    el.body.replaceChildren();
    const stats = state.artifact.stats || {};
    const top = node("section", "knowledge-graph__workspace-head");
    const summary = node("div", "");
    summary.append(node("span", "knowledge-graph__kicker", state.artifact.scope.label || "已完成"));
    summary.append(node("h3", "", `${stats.formal_nodes || 0} 个正式节点 · ${stats.formal_relations || 0} 条关系`));
    summary.append(node("p", "knowledge-graph__muted", "图中优先展示核心节点；搜索、筛选或从详情展开相邻节点不会改变保存的完整成果。"));
    const headActions = node("div", "knowledge-graph__head-actions");
    headActions.append(button("导出 JSON", "export"), button("重新生成", "regenerate"), button("删除", "delete", { danger: true }));
    top.append(summary, headActions);
    el.body.append(top, buildToolbar());
    el.graphArea = node("div", "knowledge-graph__graph-area");
    el.body.append(el.graphArea);
    renderGraphArea();
    el.body.append(buildReview());
  }

  function buildToolbar() {
    const toolbar = node("div", "knowledge-graph__toolbar");
    const searchLabel = node("label", "knowledge-graph__search");
    searchLabel.append(node("span", "knowledge-graph__search-label", "搜索节点"));
    const input = node("input");
    input.type = "search"; input.placeholder = "搜索名称、别名或描述"; input.value = state.search;
    input.addEventListener("input", function () { state.search = input.value; renderGraphArea(); });
    searchLabel.append(input);
    const filters = node("div", "knowledge-graph__filters");
    filters.setAttribute("role", "group");
    filters.setAttribute("aria-label", "节点类型");
    Object.entries(TYPES).forEach(function (entry) {
      const label = node("label", "knowledge-graph__filter");
      const checkbox = node("input"); checkbox.type = "checkbox"; checkbox.value = entry[0];
      checkbox.checked = state.enabledTypes.has(entry[0]);
      checkbox.addEventListener("change", function () {
        if (checkbox.checked) state.enabledTypes.add(entry[0]); else state.enabledTypes.delete(entry[0]);
        renderGraphArea();
      });
      const dot = node("span", "knowledge-graph__dot"); dot.style.backgroundColor = entry[1][1];
      label.append(checkbox, dot, document.createTextNode(entry[1][0])); filters.append(label);
    });
    const zoom = node("div", "knowledge-graph__zoom");
    zoom.setAttribute("role", "group");
    zoom.setAttribute("aria-label", "图谱缩放");
    zoom.append(button("−", "zoom-out"), button(`${Math.round(state.zoom * 100)}%`, "zoom-reset"), button("+", "zoom-in"));
    el.zoomLabel = zoom.children[1];
    toolbar.append(searchLabel, filters, zoom);
    return toolbar;
  }

  function filteredGraph() {
    const graph = state.artifact.graph || { nodes: [], relations: [] };
    const query = state.search.trim().toLocaleLowerCase();
    const eligible = graph.nodes.filter(function (item) {
      if (!state.enabledTypes.has(item.type)) return false;
      if (!query) return true;
      return [item.name, item.description].concat(item.aliases || []).join(" ").toLocaleLowerCase().includes(query);
    });
    const allowed = new Set();
    eligible.slice(0, query ? 80 : state.coreLimit).forEach(function (item) { allowed.add(item.id); });
    if (!query) state.expanded.forEach(function (id) {
      const item = graph.nodes.find(function (candidate) { return candidate.id === id; });
      if (item && state.enabledTypes.has(item.type)) allowed.add(id);
    });
    const nodes = graph.nodes.filter(function (item) { return allowed.has(item.id); });
    const relations = graph.relations.filter(function (item) { return allowed.has(item.source) && allowed.has(item.target); });
    return { nodes: nodes, relations: relations, eligibleCount: eligible.length };
  }

  function renderGraphArea(focusNodeId) {
    if (!el.graphArea) return;
    el.graphArea.replaceChildren();
    const visible = filteredGraph();
    if (!visible.nodes.length) {
      const empty = node("div", "knowledge-graph__empty", "没有符合当前搜索和类型筛选的正式节点。");
      el.graphArea.append(empty);
      return;
    }
    if (!visible.nodes.some(function (item) { return item.id === state.selectedNode; })) state.selectedNode = visible.nodes[0].id;
    const layout = node("div", "knowledge-graph__graph-layout");
    const canvasWrap = node("div", "knowledge-graph__canvas-wrap");
    canvasWrap.append(buildSvg(visible));
    if (visible.eligibleCount > visible.nodes.length && !state.search.trim()) {
      const more = button(`再显示 ${Math.min(20, visible.eligibleCount - visible.nodes.length)} 个核心节点`, "more-nodes");
      more.className = "knowledge-graph__more";
      canvasWrap.append(more);
    }
    layout.append(canvasWrap, buildDetails(visible));
    el.graphArea.append(layout);
    if (focusNodeId) {
      const focusTarget = Array.from(el.graphArea.querySelectorAll("[data-node-id]")).find(function (item) {
        return item.dataset.nodeId === focusNodeId;
      });
      focusTarget?.focus();
    }
  }

  function buildSvg(visible) {
    const width = 900; const height = 560;
    const svg = svgNode("svg", { class: "knowledge-graph__canvas", role: "group", "aria-label": `知识图谱：${visible.nodes.length} 个节点，${visible.relations.length} 条关系` });
    const viewWidth = width / state.zoom; const viewHeight = height / state.zoom;
    svg.setAttribute("viewBox", `${(width - viewWidth) / 2} ${(height - viewHeight) / 2} ${viewWidth} ${viewHeight}`);
    const defs = svgNode("defs");
    const marker = svgNode("marker", { id: "knowledge-graph-arrow", viewBox: "0 0 10 10", refX: "9", refY: "5", markerWidth: "6", markerHeight: "6", orient: "auto-start-reverse" });
    marker.append(svgNode("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "var(--graph-line)" })); defs.append(marker); svg.append(defs);
    const positions = new Map();
    const ringCapacity = 8;
    visible.nodes.forEach(function (item, index) {
      const ring = index === 0 ? 0 : Math.floor((index - 1) / ringCapacity) + 1;
      const ringItems = Math.min(ringCapacity, Math.max(1, visible.nodes.length - 1 - (ring - 1) * ringCapacity));
      const ringIndex = ring ? (index - 1) % ringCapacity : 0;
      const angleOffset = ring > 1 ? Math.PI / ringCapacity : 0;
      const angle = ring ? (Math.PI * 2 * ringIndex / ringItems) - Math.PI / 2 + angleOffset : 0;
      const distance = ring ? Math.min(235, 100 + (ring - 1) * 80) : 0;
      positions.set(item.id, { x: width / 2 + Math.cos(angle) * distance, y: height / 2 + Math.sin(angle) * distance, angle: angle, distance: distance });
    });
    const edgeLayer = svgNode("g", { class: "knowledge-graph__edges" });
    visible.relations.forEach(function (relation) {
      const start = positions.get(relation.source); const end = positions.get(relation.target);
      const line = svgNode("line", { x1: start.x, y1: start.y, x2: end.x, y2: end.y, "data-relation": relation.id });
      line.setAttribute("marker-end", "url(#knowledge-graph-arrow)");
      if (relation.direction === "bidirectional") line.setAttribute("marker-start", "url(#knowledge-graph-arrow)");
      const title = svgNode("title"); title.textContent = `${relation.type}：${relation.description}`; line.append(title); edgeLayer.append(line);
    });
    svg.append(edgeLayer);
    const nodeLayer = svgNode("g", { class: "knowledge-graph__nodes" });
    visible.nodes.forEach(function (item) {
      const position = positions.get(item.id);
      const group = svgNode("g", { transform: `translate(${position.x} ${position.y})`, tabindex: "0", role: "button", "aria-label": `${TYPES[item.type][0]}：${item.name}` });
      group.dataset.nodeId = item.id;
      const selected = item.id === state.selectedNode;
      group.setAttribute("aria-pressed", selected ? "true" : "false");
      if (selected) group.dataset.selected = "true";
      const size = Math.max(22, Math.min(38, 20 + Number(item.importance || 0) * 0.65));
      group.append(svgNode("circle", { r: size, fill: TYPES[item.type][1] }));
      const labelOffset = size + 11;
      const label = position.distance
        ? svgNode("text", {
          x: Math.cos(position.angle) * labelOffset,
          y: Math.sin(position.angle) * labelOffset,
          "dominant-baseline": "middle",
          "text-anchor": Math.cos(position.angle) > 0.3 ? "start" : (Math.cos(position.angle) < -0.3 ? "end" : "middle")
        })
        : svgNode("text", { y: size + 18, "text-anchor": "middle" });
      label.textContent = item.name.length > 10 ? `${item.name.slice(0, 9)}…` : item.name;
      group.append(label);
      group.addEventListener("click", function () { state.selectedNode = item.id; renderGraphArea(item.id); });
      group.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); state.selectedNode = item.id; renderGraphArea(item.id); }
      });
      nodeLayer.append(group);
    });
    svg.append(nodeLayer);
    return svg;
  }

  function buildDetails(visible) {
    const graph = state.artifact.graph;
    const item = graph.nodes.find(function (candidate) { return candidate.id === state.selectedNode; }) || visible.nodes[0];
    const aside = node("aside", "knowledge-graph__details");
    if (!item) return aside;
    const type = node("span", "knowledge-graph__type", TYPES[item.type][0]); type.style.setProperty("--type-color", TYPES[item.type][1]);
    aside.append(type, node("h3", "", item.name));
    aside.append(node("p", "knowledge-graph__confidence", `置信度 ${Math.round(item.confidence * 100)}% · ${item.mentions || item.citations.length} 处证据`));
    aside.append(node("p", "", item.description));
    if (item.aliases && item.aliases.length) aside.append(detailBlock("别名", item.aliases.join("、")));
    const incident = graph.relations.filter(function (relation) { return relation.source === item.id || relation.target === item.id; });
    if (incident.length) {
      const relationBlock = node("section", "knowledge-graph__detail-block");
      relationBlock.append(node("h4", "", "关系"));
      incident.slice(0, 12).forEach(function (relation) {
        const source = graph.nodes.find(function (candidate) { return candidate.id === relation.source; });
        const target = graph.nodes.find(function (candidate) { return candidate.id === relation.target; });
        const direction = relation.direction === "bidirectional" ? "↔" : `—${relation.type}→`;
        const summaryText = relation.direction === "bidirectional"
          ? `${source ? source.name : "未知节点"} ${direction} ${target ? target.name : "未知节点"} · ${relation.type}`
          : `${source ? source.name : "未知节点"} ${direction} ${target ? target.name : "未知节点"}`;
        const relationDetails = node("details", "knowledge-graph__relation-row");
        relationDetails.append(node("summary", "", `${summaryText} · ${Math.round(relation.confidence * 100)}%`));
        relationDetails.append(node("p", "", relation.description));
        relation.citations.slice(0, 5).forEach(function (citation, citationIndex) {
          const jump = button(`关系证据 ${citationIndex + 1}：${citation.quote}`, "relation-citation");
          jump.className = "knowledge-graph__citation";
          jump.dataset.relationId = relation.id;
          jump.dataset.citation = String(citationIndex);
          relationDetails.append(jump);
        });
        relationBlock.append(relationDetails);
      });
      const hiddenNeighbors = incident.map(function (relation) { return relation.source === item.id ? relation.target : relation.source; })
        .filter(function (id) { return !visible.nodes.some(function (candidate) { return candidate.id === id; }); });
      if (hiddenNeighbors.length) {
        const expand = button(`展开 ${hiddenNeighbors.length} 个相邻节点`, "expand-neighbors", { primary: true });
        expand.dataset.nodeId = item.id;
        relationBlock.append(expand);
      }
      aside.append(relationBlock);
    }
    const citationBlock = node("section", "knowledge-graph__detail-block");
    citationBlock.append(node("h4", "", "原文证据"));
    item.citations.slice(0, 8).forEach(function (citation, index) {
      const jump = button(`${index + 1}. ${citation.quote}`, "citation");
      jump.className = "knowledge-graph__citation";
      jump.dataset.nodeId = item.id; jump.dataset.citation = String(index);
      citationBlock.append(jump);
    });
    aside.append(citationBlock);
    return aside;
  }

  function detailBlock(title, text) {
    const block = node("section", "knowledge-graph__detail-block");
    block.append(node("h4", "", title), node("p", "", text));
    return block;
  }

  function buildReview() {
    const review = state.artifact.review || { low_confidence: [], alias_conflicts: [] };
    const details = node("details", "knowledge-graph__review");
    const summary = node("summary", "", `待复核：${review.low_confidence.length} 个低置信对象，${review.alias_conflicts.length} 个别名冲突`);
    details.append(summary);
    const content = node("div", "knowledge-graph__review-content");
    if (!review.low_confidence.length && !review.alias_conflicts.length) content.append(node("p", "", "没有需要单独复核的对象。"));
    review.alias_conflicts.slice(0, 20).forEach(function (conflict) {
      content.append(node("p", "", `别名“${conflict.alias}”可能指向：${conflict.names.join("、")}。系统未自动合并。`));
    });
    review.low_confidence.slice(0, 30).forEach(function (entry) {
      const item = entry.item || {};
      content.append(node("p", "", `${entry.kind === "node" ? "节点" : "关系"} · ${item.name || item.type || "未命名"} · ${Math.round(Number(item.confidence || 0) * 100)}%`));
    });
    details.append(content); return details;
  }

  function readerProxy() {
    const root = document.querySelector("#app");
    const app = root && root.__vue_app__;
    const seen = new Set();
    function visit(instance) {
      if (!instance || seen.has(instance)) return null;
      seen.add(instance);
      if (instance.proxy && instance.proxy.rendition && instance.proxy.toc_items) return instance.proxy;
      const subtree = instance.subTree;
      if (subtree && subtree.component) {
        const direct = visit(subtree.component); if (direct) return direct;
      }
      const children = subtree && Array.isArray(subtree.children) ? subtree.children : [];
      for (const child of children) {
        const found = visit(child && child.component); if (found) return found;
      }
      return null;
    }
    return app ? visit(app._instance) : null;
  }

  function renditionViews(rendition) {
    if (!rendition || typeof rendition.views !== "function") return [];
    const views = rendition.views();
    if (Array.isArray(views)) return views;
    return views && Array.isArray(views._views) ? views._views : [];
  }

  function renderedContent(reader, href) {
    const rendition = reader && reader.rendition;
    const contents = rendition && typeof rendition.getContents === "function" ? rendition.getContents() : [];
    const view = renditionViews(rendition).find(function (candidate) {
      return candidate && candidate.section && hrefMatches(candidate.section.href, href);
    });
    if (view && view.contents) return view.contents;
    if (view) {
      return contents.find(function (content) { return content && content.sectionIndex === view.index; }) || null;
    }
    return null;
  }

  function highlightCitation(content, citation) {
    try {
      const doc = content && (content.document || content.contentDocument);
      if (!doc || !doc.body) return false;
      const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, {
        acceptNode: function (textNode) {
          const parent = textNode.parentElement;
          return parent && !/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(parent.tagName) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      });
      const values = []; let fullText = "";
      while (walker.nextNode()) { values.push({ node: walker.currentNode, start: fullText.length }); fullText += walker.currentNode.nodeValue; }
      let start = citation.start; let end = citation.end;
      if (fullText.slice(start, end).replace(/\s+/g, " ").trim() !== citation.quote.replace(/\s+/g, " ").trim()) {
        start = fullText.indexOf(citation.quote); end = start + citation.quote.length;
      }
      if (start < 0) return false;
      const startItem = values.find(function (value, index) { return start >= value.start && (!values[index + 1] || start < values[index + 1].start); });
      const endItem = values.find(function (value, index) { return end > value.start && (!values[index + 1] || end <= values[index + 1].start); });
      if (!startItem || !endItem) return false;
      const range = doc.createRange();
      range.setStart(startItem.node, start - startItem.start); range.setEnd(endItem.node, end - endItem.start);
      const selection = doc.defaultView.getSelection(); selection.removeAllRanges(); selection.addRange(range);
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      startItem.node.parentElement?.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
      return true;
    } catch (_error) { return false; }
  }

  async function jumpToCitation(nodeId, citationIndex) {
    const item = state.artifact.graph.nodes.find(function (candidate) { return candidate.id === nodeId; });
    const citation = item && item.citations[citationIndex];
    if (!citation) return;
    await jumpToRawCitation(citation);
  }

  function jumpToRelationCitation(relationId, citationIndex) {
    const relation = state.artifact.graph.relations.find(function (candidate) { return candidate.id === relationId; });
    const citation = relation && relation.citations[citationIndex];
    if (!citation) return;
    jumpToRawCitation(citation);
  }

  async function jumpToRawCitation(citation) {
    window.dispatchEvent(new CustomEvent("talebook:ai-citation", { detail: citation }));
    const reader = readerProxy();
    let content = renderedContent(reader, citation.href);
    if (!content && reader && reader.rendition) {
      try { await reader.rendition.display(citation.href); } catch (_error) { /* stable bridge event remains available */ }
      for (let attempt = 0; attempt < 12 && !content; attempt += 1) {
        await new Promise(function (resolve) { window.setTimeout(resolve, 100); });
        content = renderedContent(reader, citation.href);
      }
    }
    const highlighted = highlightCitation(content, citation);
    close();
    if (!highlighted) window.setTimeout(function () { window.alert("已跳到引用章节；若未高亮，请在当前页查找引用短句。"); }, 0);
  }

  function findAiNavButton() {
    return Array.from(document.querySelectorAll("#app button")).find(function (item) { return item.textContent.trim() === "AI"; });
  }

  function onClick(event) {
    const nav = event.target.closest && event.target.closest("#app button");
    if (nav && nav.textContent.trim() === "AI" && !state.suppressNav) {
      window.setTimeout(function () { open({ fromNav: true }); }, 0);
      return;
    }
    const target = event.target.closest && event.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;
    if (action === "open") open();
    else if (action === "close") close();
    else if (action === "ready") renderReady();
    else if (action === "preview-chapter") preview("chapter");
    else if (action === "preview-book") preview("book");
    else if (action === "generate") generate();
    else if (action === "retry") generate(taskRequest(false));
    else if (action === "cancel") cancelArtifact();
    else if (action === "delete") deleteArtifact();
    else if (action === "export") window.location.assign(`${TASKS_API}/${state.artifact.id}/export`);
    else if (action === "regenerate" && window.confirm("重新生成会保留当前成果并创建一份新图谱，继续吗？")) generate(taskRequest(true));
    else if (action === "zoom-in") { state.zoom = Math.min(2, state.zoom + 0.2); if (el.zoomLabel) el.zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`; renderGraphArea(); }
    else if (action === "zoom-out") { state.zoom = Math.max(0.6, state.zoom - 0.2); if (el.zoomLabel) el.zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`; renderGraphArea(); }
    else if (action === "zoom-reset") { state.zoom = 1; if (el.zoomLabel) el.zoomLabel.textContent = "100%"; renderGraphArea(); }
    else if (action === "more-nodes") { state.coreLimit += 20; renderGraphArea(state.selectedNode); }
    else if (action === "expand-neighbors") {
      const graph = state.artifact.graph;
      graph.relations.forEach(function (relation) {
        if (relation.source === target.dataset.nodeId) state.expanded.add(relation.target);
        if (relation.target === target.dataset.nodeId) state.expanded.add(relation.source);
      });
      renderGraphArea(target.dataset.nodeId);
    } else if (action === "citation") jumpToCitation(target.dataset.nodeId, Number(target.dataset.citation));
    else if (action === "relation-citation") jumpToRelationCitation(target.dataset.relationId, Number(target.dataset.citation));
  }

  function initialize(options) {
    state.bookId = options && options.bookId;
    if (!el.panel) buildShell();
  }

  window.TalebookKnowledgeGraphInit = initialize;
  window.TalebookKnowledgeGraph = { open: open, currentChapter: currentChapter };
})();

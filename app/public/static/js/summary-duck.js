(function () {
  "use strict";

  const TASKS_API = "/api/ai/summary_duck/tasks";
  const state = {
    bookId: null, artifact: null, chapter: null, pollTimer: null, editing: false,
    editorDraft: null, previousFocus: null, inertElements: []
  };
  const el = {};

  function node(tag, className, text) {
    const value = document.createElement(tag);
    if (className) value.className = className;
    if (text !== undefined) value.textContent = text;
    return value;
  }

  function button(text, action, options) {
    const value = node("button", "", text);
    value.type = "button";
    value.dataset.action = action;
    if (options && options.primary) value.dataset.primary = "true";
    if (options && options.danger) value.dataset.danger = "true";
    return value;
  }

  function decodeEntities(text) {
    return String(text || "")
      .replaceAll("&lt;", "<").replaceAll("&gt;", ">")
      .replaceAll("&quot;", "\"").replaceAll("&#x27;", "'").replaceAll("&amp;", "&");
  }

  function appendMarkdown(container, markdown) {
    const text = decodeEntities(markdown);
    const pattern = /(\*\*|__)(.+?)\1/gs;
    let cursor = 0;
    for (const match of text.matchAll(pattern)) {
      container.append(document.createTextNode(text.slice(cursor, match.index)));
      container.append(node("strong", "", match[2]));
      cursor = match.index + match[0].length;
    }
    container.append(document.createTextNode(text.slice(cursor)));
  }

  function buildShell() {
    el.launcher = button("🦆 总结鸭", "open");
    el.launcher.className = "summary-duck-launcher";
    el.launcher.setAttribute("aria-haspopup", "dialog");

    el.backdrop = node("div", "summary-duck-backdrop");
    el.backdrop.dataset.action = "close";
    el.panel = node("section", "summary-duck");
    el.panel.setAttribute("role", "dialog");
    el.panel.setAttribute("aria-modal", "true");
    el.panel.setAttribute("aria-labelledby", "summary-duck-title");

    const header = node("header", "summary-duck__header");
    const title = node("div", "summary-duck__title");
    const heading = node("h2", "", "总结鸭 TOP5");
    heading.id = "summary-duck-title";
    title.append(heading);
    el.subtitle = node("small", "", "当前章节");
    title.append(el.subtitle);
    header.append(title, button("关闭", "close"));
    el.body = node("div", "summary-duck__body");
    el.footer = node("footer", "summary-duck__footer");
    el.live = node("div", "summary-duck__sr-only");
    el.live.setAttribute("role", "status");
    el.live.setAttribute("aria-atomic", "true");
    el.panel.append(header, el.body, el.footer, el.live);
    document.body.append(el.launcher, el.backdrop, el.panel);
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", function (event) {
      if (el.panel.dataset.open !== "true") return;
      if (event.key === "Escape") close();
      else if (event.key === "Tab") trapFocus(event);
    });
  }

  function focusableElements() {
    const selector = [
      "button:not([disabled])", "textarea:not([disabled])", "input:not([disabled])",
      "select:not([disabled])", "a[href]", "[tabindex]:not([tabindex='-1'])"
    ].join(",");
    return Array.from(el.panel.querySelectorAll(selector)).filter(function (item) {
      return !item.hidden && item.getClientRects().length > 0;
    });
  }

  function trapFocus(event) {
    const focusable = focusableElements();
    if (!focusable.length) {
      event.preventDefault();
      el.panel.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || !el.panel.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !el.panel.contains(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  }

  function setBackgroundInert(inert) {
    if (inert) {
      state.inertElements = Array.from(document.body.children).filter(function (item) {
        return item !== el.panel && item !== el.backdrop && item !== el.launcher && !item.inert;
      });
      state.inertElements.forEach(function (item) { item.inert = true; });
      document.documentElement.dataset.summaryDuckOpen = "true";
      return;
    }
    state.inertElements.forEach(function (item) { item.inert = false; });
    state.inertElements = [];
    delete document.documentElement.dataset.summaryDuckOpen;
  }

  async function request(url, options) {
    const response = await fetch(url, Object.assign({ credentials: "same-origin" }, options || {}));
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("json")) throw new Error("服务器返回格式无效");
    const payload = await response.json();
    if (payload.err !== "ok") throw Object.assign(new Error(payload.msg || "请求失败"), { code: payload.err });
    return payload;
  }

  function currentIframe() {
    const frames = Array.from(document.querySelectorAll("#reader iframe"));
    if (!frames.length) return null;
    const center = window.innerHeight / 2;
    return frames.find(function (frame) {
      const box = frame.getBoundingClientRect();
      return box.top <= center && box.bottom >= center;
    }) || frames[0];
  }

  function chapterFromFrame(frame) {
    try {
      const doc = frame && frame.contentDocument;
      if (!doc || !doc.body) return null;
      const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, {
        acceptNode: function (textNode) {
          const parent = textNode.parentElement;
          if (!parent || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(parent.tagName)) return NodeFilter.FILTER_REJECT;
          return textNode.nodeValue ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      });
      let text = "";
      while (walker.nextNode()) text += walker.currentNode.nodeValue;
      const source = frame.getAttribute("src") || frame.dataset.href || window.location.pathname;
      return { text: text, href: source, title: document.querySelector("#status-bar-left")?.textContent?.trim() || document.title, frame: frame };
    } catch (_error) {
      return null;
    }
  }

  function collectChapter() {
    if (state.chapter && state.chapter.text) return state.chapter;
    return chapterFromFrame(currentIframe());
  }

  function open(provided) {
    const wasOpen = el.panel.dataset.open === "true";
    if (provided && provided.chapter_text) {
      state.chapter = { text: provided.chapter_text, href: provided.chapter_href, title: provided.chapter_title || "当前章节", frame: null };
    } else {
      state.chapter = null;
    }
    if (!wasOpen) state.previousFocus = document.activeElement;
    el.panel.dataset.open = "true";
    el.backdrop.dataset.open = "true";
    el.launcher.hidden = true;
    if (!wasOpen) setBackgroundInert(true);
    el.subtitle.textContent = collectChapter()?.title || "当前章节";
    loadLatest();
    el.panel.querySelector("button")?.focus();
  }

  function close() {
    window.clearTimeout(state.pollTimer);
    el.panel.dataset.open = "false";
    el.backdrop.dataset.open = "false";
    el.launcher.hidden = false;
    setBackgroundInert(false);
    if (state.previousFocus && document.contains(state.previousFocus)) state.previousFocus.focus();
    else el.launcher.focus();
    state.previousFocus = null;
  }

  function renderStatus(message, alert, busy) {
    el.body.replaceChildren();
    el.body.setAttribute("aria-busy", busy ? "true" : "false");
    const status = node("div", "summary-duck__status");
    if (alert) status.setAttribute("role", "alert");
    if (busy) {
      const spinner = node("span", "summary-duck__spinner");
      spinner.setAttribute("aria-hidden", "true");
      status.append(spinner);
    }
    status.append(document.createTextNode(message));
    el.body.append(status);
    el.live.textContent = alert ? "" : message;
  }

  function renderFooter(actions) {
    el.footer.replaceChildren();
    actions.forEach(function (item) { el.footer.append(button(item.text, item.action, item)); });
  }

  async function loadLatest() {
    if (!state.bookId) {
      renderStatus("缺少书籍标识，无法生成总结。", true);
      return;
    }
    try {
      const payload = await request(`${TASKS_API}?book_id=${encodeURIComponent(state.bookId)}`);
      state.artifact = payload.tasks[0] || null;
      if (state.artifact) renderArtifact();
      else renderReady();
    } catch (error) {
      if (error.code === "user.need_login") renderStatus("请先登录后使用总结鸭。", true);
      else renderStatus(error.message, true);
      renderFooter([{ text: "重试", action: "open", primary: true }]);
    }
  }

  function renderReady() {
    const chapter = collectChapter();
    if (!chapter || chapter.text.length < 80) {
      renderStatus("暂时无法读取当前章节正文，请翻到正文页后重试。", true);
      renderFooter([{ text: "重新读取", action: "refresh", primary: true }]);
      return;
    }
    renderStatus("将只把当前章节的必要正文发送给隔离运行时，生成五组带原文引用的问答。", false);
    renderFooter([{ text: "生成 TOP5", action: "generate", primary: true }]);
  }

  async function generate(regenerate) {
    const chapter = collectChapter();
    if (!chapter) return renderReady();
    renderStatus("正在提交当前章节…", false, true);
    renderFooter([{ text: "关闭", action: "close" }]);
    try {
      const payload = await request(TASKS_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          book_id: Number(state.bookId), chapter_text: chapter.text, chapter_href: chapter.href,
          chapter_title: chapter.title, regenerate: Boolean(regenerate)
        })
      });
      state.artifact = payload.task;
      renderArtifact();
    } catch (error) {
      renderStatus(error.message, true);
      renderFooter([{ text: "重试", action: "generate", primary: true }]);
    }
  }

  function renderArtifact() {
    const artifact = state.artifact;
    if (!artifact) return renderReady();
    if (artifact.status === "queued" || artifact.status === "running") {
      renderStatus(artifact.progress_message || "正在生成五组问答…", false, true);
      renderFooter([{ text: "取消", action: "cancel", danger: true }, { text: "关闭", action: "close" }]);
      schedulePoll();
      return;
    }
    window.clearTimeout(state.pollTimer);
    if (artifact.status === "failed" || artifact.status === "cancelled") {
      const message = artifact.error?.message || (artifact.status === "cancelled" ? "生成已取消" : "生成失败，请重试");
      renderStatus(message, artifact.status === "failed");
      renderFooter([{ text: "重试", action: "retry", primary: true }, { text: "删除", action: "delete", danger: true }]);
      return;
    }
    if (state.editing) return renderEditor();
    el.body.replaceChildren();
    el.body.setAttribute("aria-busy", "false");
    artifact.items.forEach(function (item, index) {
      const card = node("article", "summary-duck__item");
      const heading = node("h3", "summary-duck__question");
      heading.append(node("span", "summary-duck__number", String(index + 1)));
      const title = node("span");
      appendMarkdown(title, item.question);
      heading.append(title);
      const answer = node("p", "summary-duck__answer");
      appendMarkdown(answer, item.answer);
      card.append(heading, answer);
      item.citations.forEach(function (citation, citationIndex) {
        const quote = button(`原文引用 ${citationIndex + 1}：${citation.quote}`, "citation");
        quote.className = "summary-duck__citation";
        quote.dataset.item = String(index);
        quote.dataset.citation = String(citationIndex);
        card.append(quote);
      });
      el.body.append(card);
    });
    el.live.textContent = "总结生成完成，共五组问答。";
    renderFooter([
      { text: "编辑", action: "edit" }, { text: "整组重生成", action: "regenerate" },
      { text: "导出 Markdown", action: "export" }, { text: "删除", action: "delete", danger: true }
    ]);
  }

  function renderEditor() {
    el.body.replaceChildren();
    el.body.setAttribute("aria-busy", "false");
    const items = state.editorDraft || state.artifact.items.map(function (item) {
      return { question: decodeEntities(item.question), answer: decodeEntities(item.answer) };
    });
    items.forEach(function (item, index) {
      const card = node("article", "summary-duck__item");
      const qLabel = node("label", "", `问题 ${index + 1}`);
      const q = node("textarea"); q.name = `question-${index}`; q.id = `summary-duck-question-${index}`; q.value = item.question;
      qLabel.htmlFor = q.id;
      const aLabel = node("label", "", "答案");
      const a = node("textarea"); a.name = `answer-${index}`; a.id = `summary-duck-answer-${index}`; a.value = item.answer;
      aLabel.htmlFor = a.id;
      card.append(qLabel, q, aLabel, a);
      el.body.append(card);
    });
    renderFooter([{ text: "保存", action: "save", primary: true }, { text: "取消编辑", action: "cancel-edit" }]);
  }

  function schedulePoll() {
    window.clearTimeout(state.pollTimer);
    state.pollTimer = window.setTimeout(async function () {
      try {
        const payload = await request(`${TASKS_API}/${state.artifact.id}`);
        state.artifact = payload.task;
        renderArtifact();
      } catch (error) {
        renderStatus(error.message, true);
        renderFooter([{ text: "重试", action: "open", primary: true }]);
      }
    }, 1200);
  }

  async function cancelArtifact() {
    try {
      const payload = await request(`${TASKS_API}/${state.artifact.id}/cancel`, { method: "POST" });
      state.artifact = payload.task;
      renderArtifact();
    } catch (error) { renderStatus(error.message, true); }
  }

  async function saveEdits() {
    const items = state.artifact.items.map(function (item, index) {
      return {
        question: el.body.querySelector(`[name="question-${index}"]`).value,
        answer: el.body.querySelector(`[name="answer-${index}"]`).value,
        citations: item.citations
      };
    });
    state.editorDraft = items;
    try {
      const payload = await request(`${TASKS_API}/${state.artifact.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: items })
      });
      state.artifact = payload.task;
      state.editing = false;
      state.editorDraft = null;
      renderArtifact();
    } catch (error) {
      renderEditor();
      const message = node("div", "summary-duck__status", `${error.message}，请检查后重试。`);
      message.setAttribute("role", "alert");
      el.body.prepend(message);
    }
  }

  function confirmDeleteArtifact() {
    el.body.replaceChildren();
    const status = node("div", "summary-duck__status");
    status.append(node("h3", "", "删除这组总结？"));
    status.append(node("p", "", "这会删除五组问答和编辑记录，此操作无法撤销。"));
    el.body.append(status);
    renderFooter([
      { text: "删除总结", action: "delete-confirm", danger: true },
      { text: "取消", action: "render" }
    ]);
    el.footer.querySelector('[data-action="render"]')?.focus();
  }

  async function deleteArtifact() {
    try {
      await request(`${TASKS_API}/${state.artifact.id}`, { method: "DELETE" });
      state.artifact = null;
      renderReady();
    } catch (error) { renderStatus(error.message, true); }
  }

  function jumpToCitation(itemIndex, citationIndex) {
    const citation = state.artifact.items[itemIndex].citations[citationIndex];
    window.dispatchEvent(new CustomEvent("talebook:ai-citation", { detail: citation }));
    const chapter = collectChapter();
    if (!chapter || !chapter.frame) return;
    try {
      const doc = chapter.frame.contentDocument;
      const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
      let offset = 0, startNode, endNode, startOffset, endOffset;
      while (walker.nextNode()) {
        const length = walker.currentNode.nodeValue.length;
        if (!startNode && citation.start >= offset && citation.start <= offset + length) {
          startNode = walker.currentNode; startOffset = citation.start - offset;
        }
        if (citation.end >= offset && citation.end <= offset + length) {
          endNode = walker.currentNode; endOffset = citation.end - offset; break;
        }
        offset += length;
      }
      if (startNode && endNode) {
        const range = doc.createRange(); range.setStart(startNode, startOffset); range.setEnd(endNode, endOffset);
        const selection = doc.defaultView.getSelection(); selection.removeAllRanges(); selection.addRange(range);
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        startNode.parentElement?.scrollIntoView({ block: "center", behavior: reducedMotion ? "auto" : "smooth" });
        close();
      }
    } catch (_error) { /* The bridge event still lets the host reader navigate. */ }
  }

  function onClick(event) {
    const target = event.target.closest("[data-action]");
    if (!target || (target !== el.launcher && target !== el.backdrop && !el.panel.contains(target))) return;
    const action = target.dataset.action;
    if (action === "open") open();
    else if (action === "close") close();
    else if (action === "refresh") { state.chapter = null; renderReady(); }
    else if (action === "generate") generate(false);
    else if (action === "regenerate") generate(true);
    else if (action === "retry") generate(false);
    else if (action === "cancel") cancelArtifact();
    else if (action === "edit") { state.editing = true; state.editorDraft = null; renderArtifact(); }
    else if (action === "cancel-edit") { state.editing = false; state.editorDraft = null; renderArtifact(); }
    else if (action === "save") saveEdits();
    else if (action === "delete") confirmDeleteArtifact();
    else if (action === "delete-confirm") deleteArtifact();
    else if (action === "render") renderArtifact();
    else if (action === "export") window.location.assign(`${TASKS_API}/${state.artifact.id}/export`);
    else if (action === "citation") jumpToCitation(Number(target.dataset.item), Number(target.dataset.citation));
  }

  function initialize(options) {
    state.bookId = options && options.bookId;
    buildShell();
    window.TalebookSummaryDuck = { open: open, collectChapter: collectChapter };
  }

  window.TalebookSummaryDuckInit = initialize;
})();

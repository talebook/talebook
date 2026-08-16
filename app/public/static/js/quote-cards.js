(function () {
  "use strict";

  const CARDS_API = "/api/quote-cards";
  const TASKS_API = "/api/ai/quote_card/tasks";
  const state = {
    bookId: null, chapter: null, selection: null, selectionDraft: null, cards: [], task: null,
    pollTimer: null, previousFocus: null, inertElements: []
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
    if (options && options.id) value.dataset.id = options.id;
    if (options && options.index !== undefined) value.dataset.index = String(options.index);
    return value;
  }

  function field(labelText, name, value, multiline) {
    const wrapper = node("div", "quote-cards__field");
    const label = node("label", "", labelText);
    const input = node(multiline ? "textarea" : "input");
    input.id = `quote-cards-${name}`;
    input.name = name;
    input.value = value || "";
    if (!multiline) input.type = "text";
    label.htmlFor = input.id;
    wrapper.append(label, input);
    return wrapper;
  }

  function decodeEntities(text) {
    return String(text || "")
      .replaceAll("&lt;", "<").replaceAll("&gt;", ">")
      .replaceAll("&quot;", "\"").replaceAll("&#x27;", "'").replaceAll("&amp;", "&");
  }

  async function request(url, options) {
    const response = await fetch(url, Object.assign({ credentials: "same-origin" }, options || {}));
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("json")) throw new Error("服务器返回格式无效");
    const payload = await response.json();
    if (payload.err !== "ok") {
      const error = new Error(payload.msg || "请求失败");
      error.code = payload.err;
      error.payload = payload;
      throw error;
    }
    return payload;
  }

  function buildShell() {
    el.launcher = button("金句", "open");
    el.launcher.className = "quote-cards-launcher";
    el.launcher.setAttribute("aria-haspopup", "dialog");

    el.backdrop = node("div", "quote-cards-backdrop");
    el.backdrop.dataset.action = "close";
    el.backdrop.dataset.open = "false";

    el.panel = node("section", "quote-cards");
    el.panel.dataset.open = "false";
    el.panel.setAttribute("role", "dialog");
    el.panel.setAttribute("aria-modal", "true");
    el.panel.setAttribute("aria-labelledby", "quote-cards-title");
    el.panel.addEventListener("keydown", trapFocus);

    const header = node("header", "quote-cards__header");
    const title = node("div", "quote-cards__title");
    const h2 = node("h2", "", "金句卡片");
    h2.id = "quote-cards-title";
    el.subtitle = node("small", "", "当前章节");
    title.append(h2, el.subtitle);
    const closeButton = button("关闭", "close");
    closeButton.setAttribute("aria-label", "关闭金句卡片");
    header.append(title, closeButton);

    el.body = node("div", "quote-cards__body");
    el.footer = node("footer", "quote-cards__footer");
    el.live = node("div", "quote-cards__sr-only");
    el.live.setAttribute("aria-live", "polite");
    el.panel.append(header, el.body, el.footer, el.live);
    document.body.append(el.launcher, el.backdrop, el.panel);
    document.addEventListener("click", onClick);
  }

  function focusableElements() {
    return Array.from(el.panel.querySelectorAll("button:not([disabled]), input:not([disabled]), textarea:not([disabled])"))
      .filter(function (item) { return item.offsetParent !== null; });
  }

  function trapFocus(event) {
    if (event.key === "Escape") return close();
    if (event.key !== "Tab") return;
    const focusable = focusableElements();
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  function setBackgroundInert(inert) {
    if (inert) {
      state.inertElements = Array.from(document.body.children).filter(function (item) {
        return item !== el.panel && item !== el.backdrop && item !== el.launcher && !item.inert;
      });
      state.inertElements.forEach(function (item) { item.inert = true; });
      document.documentElement.dataset.quoteCardsOpen = "true";
      return;
    }
    state.inertElements.forEach(function (item) { item.inert = false; });
    state.inertElements = [];
    delete document.documentElement.dataset.quoteCardsOpen;
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
      const href = frame.dataset.href || frame.getAttribute("src") || window.location.pathname;
      return {
        text: text, href: href,
        title: document.querySelector("#status-bar-left")?.textContent?.trim() || document.title,
        frame: frame
      };
    } catch (_error) { return null; }
  }

  function textOffset(doc, targetNode, targetOffset) {
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (textNode) {
        const parent = textNode.parentElement;
        if (!parent || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(parent.tagName)) return NodeFilter.FILTER_REJECT;
        return textNode.nodeValue ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    let offset = 0;
    while (walker.nextNode()) {
      if (walker.currentNode === targetNode) return offset + targetOffset;
      offset += walker.currentNode.nodeValue.length;
    }
    return null;
  }

  function selectionFromFrame(chapter) {
    try {
      const doc = chapter && chapter.frame && chapter.frame.contentDocument;
      const selection = doc && doc.defaultView.getSelection();
      if (!selection || selection.isCollapsed || !selection.rangeCount) return null;
      const range = selection.getRangeAt(0);
      if (!doc.body.contains(range.commonAncestorContainer)) return null;
      const start = textOffset(doc, range.startContainer, range.startOffset);
      const end = textOffset(doc, range.endContainer, range.endOffset);
      if (start === null || end === null || end <= start || end > chapter.text.length) return null;
      const quote = chapter.text.slice(start, end);
      if (!quote.trim() || quote.replace(/\s+/g, " ").trim() !== range.toString().replace(/\s+/g, " ").trim()) return null;
      return { quote: quote, locator: { href: chapter.href, start: start, end: end } };
    } catch (_error) { return null; }
  }

  function collectChapter() {
    if (state.chapter && state.chapter.text) return state.chapter;
    return chapterFromFrame(currentIframe());
  }

  function open(provided) {
    const wasOpen = el.panel.dataset.open === "true";
    if (provided && provided.chapter_text) {
      state.chapter = {
        text: provided.chapter_text, href: provided.chapter_href,
        title: provided.chapter_title || "当前章节", frame: null
      };
      state.selection = provided.selection || null;
    } else {
      state.chapter = chapterFromFrame(currentIframe());
      state.selection = selectionFromFrame(state.chapter);
    }
    state.selectionDraft = null;
    if (!wasOpen) state.previousFocus = document.activeElement;
    el.panel.dataset.open = "true";
    el.backdrop.dataset.open = "true";
    el.launcher.hidden = true;
    if (!wasOpen) setBackgroundInert(true);
    el.subtitle.textContent = state.chapter?.title || "当前章节";
    if (state.selection) renderSelectionEditor();
    else renderHome();
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
    const status = node("div", "quote-cards__status");
    if (alert) status.setAttribute("role", "alert");
    if (busy) {
      const spinner = node("span", "quote-cards__spinner");
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

  function renderHome() {
    const chapter = collectChapter();
    if (!chapter || chapter.text.length < 80) {
      renderStatus("暂时无法读取当前 EPUB 章节，请翻到正文页后重试。", true);
      renderFooter([{ text: "重新读取", action: "refresh", primary: true }, { text: "查看已保存", action: "cards" }]);
      return;
    }
    renderStatus("选中原文后再点“金句”可直接制卡；也可让 AI 在本章推荐最多五条可核验候选。", false);
    renderFooter([{ text: "推荐本章金句", action: "recommend", primary: true }, { text: "查看已保存", action: "cards" }]);
  }

  function renderSelectionEditor(draft) {
    const values = draft || { quoteText: state.selection.quote, whyImportant: "", topics: [], note: "" };
    el.body.replaceChildren();
    el.body.setAttribute("aria-busy", "false");
    const heading = node("h3", "", "将选文制成金句卡");
    const hint = node("p", "quote-cards__hint", "原句默认按逐字引用保存。修改原句时会明确转为“摘录改写/笔记”。");
    el.body.append(heading, hint);
    el.body.append(
      field("原句", "quote-text", values.quoteText, true),
      field("为什么重要（可留空，手动保存不依赖 AI）", "why-important", values.whyImportant, true),
      field("主题标签（逗号分隔）", "topics", values.topics.join(", "), false),
      field("我的笔记", "note", values.note, true)
    );
    renderFooter([
      { text: "保存卡片", action: "save-selection", primary: true },
      { text: "推荐本章金句", action: "recommend" }, { text: "查看已保存", action: "cards" }
    ]);
  }

  function formValues(container) {
    return {
      quoteText: container.querySelector('[name="quote-text"]')?.value || "",
      whyImportant: container.querySelector('[name="why-important"]')?.value || "",
      topics: (container.querySelector('[name="topics"]')?.value || "").split(",").map(function (item) { return item.trim(); }).filter(Boolean),
      note: container.querySelector('[name="note"]')?.value || ""
    };
  }

  async function createCard(data) {
    const chapter = collectChapter();
    if (!chapter) throw new Error("当前章节不可用");
    const body = Object.assign({
      book_id: Number(state.bookId), chapter_text: chapter.text, chapter_href: chapter.href,
      chapter_title: chapter.title
    }, data);
    try {
      return await request(CARDS_API, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
      });
    } catch (error) {
      if (error.code !== "quote_card.duplicate") throw error;
      const merge = window.confirm("这段原文已有卡片。确定合并本次说明、主题和笔记；取消则打开已有卡片。");
      body.duplicate_action = merge ? "merge" : "open";
      return request(CARDS_API, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
      });
    }
  }

  async function saveSelection() {
    const values = formValues(el.body);
    state.selectionDraft = values;
    const changed = values.quoteText.replace(/\s+/g, " ").trim() !== state.selection.quote.replace(/\s+/g, " ").trim();
    if (changed && !window.confirm("你修改了原句。继续后会保存为“摘录改写/笔记”，不再标记为逐字引用。")) return;
    renderStatus("正在保存卡片…", false, true);
    renderFooter([{ text: "关闭", action: "close" }]);
    try {
      const payload = await createCard({
        verbatim_quote: state.selection.quote, quote_text: values.quoteText,
        quote_type: changed ? "adapted_note" : "verbatim", locator: state.selection.locator,
        why_important: values.whyImportant, topics: values.topics, note: values.note, source: "selection"
      });
      state.selection = null;
      state.selectionDraft = null;
      state.cards = [payload.card].concat(state.cards.filter(function (card) { return card.id !== payload.card.id; }));
      renderCardEditor(payload.card, true);
      el.live.textContent = "金句卡片已保存。";
    } catch (error) {
      renderSelectionEditor(state.selectionDraft);
      const message = node("p", "quote-cards__error", `${error.message}。AI 不可用不会影响手动摘录，请检查原文范围后重试。`);
      message.setAttribute("role", "alert");
      el.body.prepend(message);
    }
  }

  async function recommend(regenerate) {
    const chapter = collectChapter();
    if (!chapter || chapter.text.length < 80) return renderHome();
    renderStatus("正在提交当前章节的必要正文…", false, true);
    renderFooter([{ text: "关闭", action: "close" }]);
    try {
      const payload = await request(TASKS_API, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          book_id: Number(state.bookId), chapter_text: chapter.text, chapter_href: chapter.href,
          chapter_title: chapter.title, regenerate: Boolean(regenerate)
        })
      });
      state.task = payload.task;
      renderTask();
    } catch (error) {
      renderStatus(`${error.message}。你仍可选中原文并手动保存。`, true);
      renderFooter([{ text: "重试推荐", action: "recommend", primary: true }, { text: "查看已保存", action: "cards" }]);
    }
  }

  function renderTask() {
    if (!state.task) return renderHome();
    if (state.task.status === "queued" || state.task.status === "running") {
      renderStatus(state.task.progress_message || "正在推荐可核验原句…", false, true);
      renderFooter([{ text: "取消", action: "cancel-task", danger: true }, { text: "关闭", action: "close" }]);
      schedulePoll();
      return;
    }
    window.clearTimeout(state.pollTimer);
    if (state.task.status === "failed" || state.task.status === "cancelled") {
      const message = state.task.error?.message || (state.task.status === "cancelled" ? "推荐已取消" : "推荐失败");
      renderStatus(`${message}。仍可选中原文手动保存。`, state.task.status === "failed");
      renderFooter([{ text: "重试推荐", action: "recommend", primary: true }, { text: "查看已保存", action: "cards" }]);
      return;
    }
    renderCandidates();
  }

  function renderCandidates() {
    el.body.replaceChildren();
    el.body.setAttribute("aria-busy", "false");
    state.task.items.forEach(function (item, index) {
      const card = node("article", "quote-cards__item");
      card.dataset.candidate = String(index);
      const quote = node("blockquote", "quote-cards__quote", decodeEntities(item.quote));
      const source = node("p", "quote-cards__source", `${state.task.chapter_title || state.task.chapter_href} · ${item.locator.start}–${item.locator.end}`);
      card.append(quote, source);
      card.append(
        field("为什么重要（AI 解释，可编辑）", `why-important-${index}`, decodeEntities(item.why_important), true),
        field("主题标签", `topics-${index}`, item.topics.map(decodeEntities).join(", "), false),
        field("我的笔记", `note-${index}`, "", true)
      );
      const save = button("确认保存", "save-candidate", { primary: true, index: index });
      card.append(save);
      el.body.append(card);
    });
    el.live.textContent = `找到 ${state.task.items.length} 条可核验候选，请确认后保存。`;
    renderFooter([{ text: "重新推荐", action: "regenerate" }, { text: "查看已保存", action: "cards" }, { text: "关闭", action: "close" }]);
  }

  async function saveCandidate(index) {
    const item = state.task.items[index];
    const card = el.body.querySelector(`[data-candidate="${index}"]`);
    const saveButton = card.querySelector('[data-action="save-candidate"]');
    const values = {
      whyImportant: card.querySelector(`[name="why-important-${index}"]`).value,
      topics: card.querySelector(`[name="topics-${index}"]`).value.split(",").map(function (value) { return value.trim(); }).filter(Boolean),
      note: card.querySelector(`[name="note-${index}"]`).value
    };
    saveButton.disabled = true;
    card.setAttribute("aria-busy", "true");
    try {
      const payload = await createCard({
        verbatim_quote: decodeEntities(item.quote), quote_text: decodeEntities(item.quote), quote_type: "verbatim",
        locator: item.locator, why_important: values.whyImportant, topics: values.topics,
        note: values.note, source: "recommendation"
      });
      const saved = node("p", "quote-cards__saved", "已保存");
      card.append(saved);
      card.setAttribute("aria-busy", "false");
      el.live.textContent = "候选已保存。";
      state.cards.unshift(payload.card);
    } catch (error) {
      saveButton.disabled = false;
      card.setAttribute("aria-busy", "false");
      const message = node("p", "quote-cards__error", error.message);
      message.setAttribute("role", "alert");
      card.append(message);
    }
  }

  function schedulePoll() {
    window.clearTimeout(state.pollTimer);
    state.pollTimer = window.setTimeout(async function () {
      try {
        const payload = await request(`${TASKS_API}/${state.task.id}`);
        state.task = payload.task;
        renderTask();
      } catch (error) {
        renderStatus(error.message, true);
        renderFooter([{ text: "重试", action: "recommend", primary: true }]);
      }
    }, 1200);
  }

  async function cancelTask() {
    try {
      const payload = await request(`${TASKS_API}/${state.task.id}/cancel`, { method: "POST" });
      state.task = payload.task;
      renderTask();
    } catch (error) { renderStatus(error.message, true); }
  }

  async function loadCards() {
    renderStatus("正在读取已保存卡片…", false, true);
    renderFooter([{ text: "关闭", action: "close" }]);
    try {
      const payload = await request(`${CARDS_API}?book_id=${encodeURIComponent(state.bookId)}`);
      state.cards = payload.cards;
      renderCards();
    } catch (error) {
      renderStatus(error.message, true);
      renderFooter([{ text: "重试", action: "cards", primary: true }, { text: "返回", action: "home" }]);
    }
  }

  function renderCards() {
    el.body.replaceChildren();
    if (!state.cards.length) {
      renderStatus("这本书还没有金句卡片。选中原文或请求章节推荐即可创建。", false);
      renderFooter([{ text: "推荐本章金句", action: "recommend", primary: true }, { text: "返回", action: "home" }]);
      return;
    }
    state.cards.forEach(function (card) {
      const article = node("article", "quote-cards__item");
      const badge = node("span", "quote-cards__badge", card.quote_type === "verbatim" ? "逐字引用" : "摘录改写/笔记");
      const quote = node("blockquote", "quote-cards__quote", decodeEntities(card.quote_text));
      article.append(badge, quote);
      if (card.why_important) article.append(node("p", "quote-cards__why", decodeEntities(card.why_important)));
      if (card.topics.length) article.append(node("p", "quote-cards__topics", card.topics.map(decodeEntities).join(" · ")));
      if (!card.source_valid) article.append(node("p", "quote-cards__warning", "书籍版本已变化，来源回跳暂不可用。"));
      const actions = node("div", "quote-cards__actions");
      if (card.source_valid) actions.append(button("回到原文", "jump", { id: card.id }));
      actions.append(button("编辑", "edit-card", { id: card.id }), button("导出 PNG", "png", { id: card.id }), button("删除", "delete-card", { id: card.id, danger: true }));
      article.append(actions);
      el.body.append(article);
    });
    renderFooter([
      { text: "导出全部 Markdown", action: "markdown", primary: true },
      { text: "推荐本章金句", action: "recommend" }, { text: "返回", action: "home" }
    ]);
  }

  function cardById(id) { return state.cards.find(function (card) { return card.id === id; }); }

  function renderCardEditor(card, allowSave) {
    el.body.replaceChildren();
    const heading = node("h3", "", allowSave === false ? "卡片已保存" : "编辑金句卡片");
    const source = node("p", "quote-cards__source", `${card.book_title} · ${card.chapter_title || card.chapter_href}`);
    el.body.append(heading, source);
    el.body.append(
      field("摘录内容", "quote-text", decodeEntities(card.quote_text), true),
      field("为什么重要（AI 解释，可编辑）", "why-important", decodeEntities(card.why_important), true),
      field("主题标签（逗号分隔）", "topics", card.topics.map(decodeEntities).join(", "), false),
      field("我的笔记", "note", decodeEntities(card.note), true)
    );
    el.body.dataset.cardId = card.id;
    const actions = [];
    if (allowSave !== false) actions.push({ text: "保存修改", action: "update-card", primary: true });
    actions.push({ text: "查看已保存", action: "cards" }, { text: "关闭", action: "close" });
    renderFooter(actions);
  }

  async function updateCard() {
    const card = cardById(el.body.dataset.cardId);
    const values = formValues(el.body);
    const changed = values.quoteText.replace(/\s+/g, " ").trim() !== decodeEntities(card.verbatim_quote).replace(/\s+/g, " ").trim();
    if (changed && card.quote_type === "verbatim" && !window.confirm("修改原句后将转为“摘录改写/笔记”，不再标记为逐字引用。继续吗？")) return;
    try {
      const payload = await request(`${CARDS_API}/${card.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quote_text: values.quoteText, why_important: values.whyImportant,
          topics: values.topics, note: values.note, convert_to_note: changed
        })
      });
      state.cards = state.cards.map(function (item) { return item.id === card.id ? payload.card : item; });
      renderCardEditor(payload.card, true);
      el.live.textContent = "卡片修改已保存。";
    } catch (error) {
      const message = node("p", "quote-cards__error", error.message);
      message.setAttribute("role", "alert");
      el.body.prepend(message);
    }
  }

  async function deleteCard(id) {
    if (!window.confirm("删除这张金句卡片？此操作无法撤销。")) return;
    try {
      await request(`${CARDS_API}/${id}`, { method: "DELETE" });
      state.cards = state.cards.filter(function (card) { return card.id !== id; });
      renderCards();
    } catch (error) { renderStatus(error.message, true); }
  }

  function jumpTo(card) {
    if (!card || !card.source_valid) return;
    window.dispatchEvent(new CustomEvent("talebook:quote-card-locator", { detail: card.locator }));
    const chapter = collectChapter();
    if (!chapter || !chapter.frame || chapter.href !== card.locator.href) return close();
    try {
      const doc = chapter.frame.contentDocument;
      const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
      let offset = 0, startNode, endNode, startOffset, endOffset;
      while (walker.nextNode()) {
        const length = walker.currentNode.nodeValue.length;
        if (!startNode && card.locator.start >= offset && card.locator.start <= offset + length) {
          startNode = walker.currentNode; startOffset = card.locator.start - offset;
        }
        if (card.locator.end >= offset && card.locator.end <= offset + length) {
          endNode = walker.currentNode; endOffset = card.locator.end - offset; break;
        }
        offset += length;
      }
      if (startNode && endNode) {
        const range = doc.createRange(); range.setStart(startNode, startOffset); range.setEnd(endNode, endOffset);
        const selection = doc.defaultView.getSelection(); selection.removeAllRanges(); selection.addRange(range);
        startNode.parentElement?.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      }
    } catch (_error) { /* Host event remains the authoritative navigation bridge. */ }
    close();
  }

  function wrapCanvasText(context, text, x, y, maxWidth, lineHeight, maxLines) {
    const characters = Array.from(text);
    let line = "", lines = 0;
    for (const character of characters) {
      const next = line + character;
      if (context.measureText(next).width > maxWidth && line) {
        context.fillText(line, x, y); y += lineHeight; lines += 1; line = character;
        if (lines >= maxLines) return y;
      } else line = next;
    }
    if (line && lines < maxLines) { context.fillText(line, x, y); y += lineHeight; }
    return y;
  }

  function downloadPng(card) {
    const canvas = document.createElement("canvas");
    canvas.width = 1200; canvas.height = 1500;
    const context = canvas.getContext("2d");
    context.fillStyle = "#f4ede2"; context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#8d3d25"; context.fillRect(72, 72, 12, 1356);
    context.fillStyle = "#2b241f"; context.font = "700 42px system-ui, sans-serif";
    context.fillText(card.quote_type === "verbatim" ? "金句 · 逐字引用" : "金句 · 摘录改写/笔记", 126, 150);
    context.font = "500 54px system-ui, sans-serif";
    let y = wrapCanvasText(context, `“${decodeEntities(card.quote_text).slice(0, 600)}”`, 126, 270, 940, 82, 9);
    if (card.why_important) {
      y += 54; context.fillStyle = "#8d3d25"; context.font = "700 30px system-ui, sans-serif"; context.fillText("为什么重要（AI 解释）", 126, y);
      y += 58; context.fillStyle = "#4b4038"; context.font = "400 32px system-ui, sans-serif";
      y = wrapCanvasText(context, decodeEntities(card.why_important).slice(0, 1000), 126, y, 940, 48, 5);
    }
    context.fillStyle = "#665b52"; context.font = "400 25px system-ui, sans-serif";
    wrapCanvasText(context, `${card.book_title} · ${card.chapter_title || card.chapter_href}`, 126, Math.max(y + 60, 1320), 940, 36, 2);
    canvas.toBlob(function (blob) {
      if (!blob) return;
      const link = document.createElement("a");
      link.download = `quote-card-${card.id.slice(0, 8)}.png`;
      link.href = URL.createObjectURL(blob); link.click(); URL.revokeObjectURL(link.href);
    }, "image/png");
  }

  function onClick(event) {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;
    if (action === "open") open();
    else if (action === "close") close();
    else if (action === "home") { state.selection = null; renderHome(); }
    else if (action === "refresh") open();
    else if (action === "save-selection") saveSelection();
    else if (action === "recommend") recommend(false);
    else if (action === "regenerate") recommend(true);
    else if (action === "cancel-task") cancelTask();
    else if (action === "save-candidate") saveCandidate(Number(target.dataset.index));
    else if (action === "cards") loadCards();
    else if (action === "edit-card") renderCardEditor(cardById(target.dataset.id), true);
    else if (action === "update-card") updateCard();
    else if (action === "delete-card") deleteCard(target.dataset.id);
    else if (action === "jump") jumpTo(cardById(target.dataset.id));
    else if (action === "png") downloadPng(cardById(target.dataset.id));
    else if (action === "markdown") window.location.assign(`${CARDS_API}/export?book_id=${encodeURIComponent(state.bookId)}`);
  }

  function initialize(options) {
    state.bookId = options && options.bookId;
    buildShell();
    window.TalebookQuoteCards = { open: open, collectChapter: collectChapter, selectionFromFrame: selectionFromFrame, downloadPng: downloadPng };
  }

  window.TalebookQuoteCardsInit = initialize;
})();

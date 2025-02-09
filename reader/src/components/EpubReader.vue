<template>
  <v-app :theme="app_theme" full-height density="compact">
    <!-- 顶部菜单 -->
    <v-app-bar v-if="menu.show_navbar" density="compact">
      <template v-slot:prepend> <v-btn icon> <v-icon>mdi-arrow-left</v-icon> </v-btn> </template>
      {{ alert_msg }}
      <v-spacer></v-spacer>
      <v-btn @click="is_login = !is_login" :icon="is_login ? 'mdi-account-check' : 'mdi-account-plus'"></v-btn>
      <v-btn icon> <v-icon>mdi-dots-vertical</v-icon> </v-btn>
    </v-app-bar>

    <!-- 底部菜单 -->
    <v-bottom-navigation v-model="menu.value" :active="menu.show_navbar" z-index="2599">
      <v-btn value="toc" @click="set_menu('toc')">
        <v-icon>mdi-book-open-variant-outline</v-icon>
        <span>目录</span>
      </v-btn>

      <v-btn @click="switch_theme">
        <v-icon>{{ switch_theme_icon }}</v-icon>
        <span>{{ switch_theme_text }}</span>
      </v-btn>

      <v-btn value="settings" @click="set_menu('settings')">
        <v-icon>mdi-cog</v-icon>
        <span>设置</span>
      </v-btn>

      <v-btn @click="set_menu('more')">
        <v-badge color="error" :content="unread_count" v-if="unread_count">
          <v-icon>mdi-account-circle-outline</v-icon>
        </v-badge>
        <v-icon v-else>mdi-account-circle-outline</v-icon>
        <span>用户</span>
      </v-btn>
    </v-bottom-navigation>

    <v-bottom-sheet class="fixed mb-14" max-height="90%" v-model="menu.panels.settings" contained persistent z-index="234">
      <settings :settings="settings" @update="update_settings"></settings>
    </v-bottom-sheet>

    <v-bottom-sheet class="fixed mb-14" max-height="90%" v-model="menu.panels.toc" contained close-on-content-click
      z-index="234">
      <book-toc :meta="book_meta" :toc_items="toc_items" @click:select="on_click_toc"></book-toc>
    </v-bottom-sheet>

    <v-bottom-sheet inset class="fixed mb-14" max-height="90%" v-model="menu.panels.more" contained persistent z-index="234">
      <guest v-if="!is_login" :server="this.server"></guest>
      <user v-else :messages="comments"></user>
    </v-bottom-sheet>

    <v-bottom-sheet class="fixed" max-height="90%" v-model="menu.panels.comments" contained z-index="2600">
      <book-comments :login="is_login" :comments="comments" @close="set_menu('hide')"
        @add_review="on_add_review"></book-comments>
    </v-bottom-sheet>

    <!-- 浮动工具栏 -->
    <div id="comments-toolbar" :style="`left: ${toolbar_left}px; top: ${toolbar_top}px;`">
      <v-toolbar density="compact" border dense floating elevation="10" rounded>
        <v-btn @click="on_click_toolbar_comments">发段评</v-btn>
        <v-divider vertical></v-divider>
        <v-btn>从这里听</v-btn>
        <v-divider vertical></v-divider>
        <v-btn>复制</v-btn>
        <v-divider vertical></v-divider>
        <v-btn>反馈</v-btn>
      </v-toolbar>
    </div>

    <!-- 阅读界面 -->
    <v-main id='main' class="pa-0">
        <div id="reader"></div>
    </v-main>

  </v-app>
</template>

<script>
export default {
  name: 'EpubReader',
  components: {
  },
  computed: {
    switch_theme_icon: function () {
      return this.settings.theme_mode == "day" ? "mdi-weather-night" : "mdi-weather-sunny";
    },
    switch_theme_text: function () {
      return this.settings.theme_mode == "day" ? "夜晚" : "白天";
    },
  },
  methods: {
    switch_theme: function () {
      const current_mode = this.settings.theme_mode;
      if (current_mode == "day") {
        this.app_theme = "dark"
        this.settings.theme_mode = "night";
        this.rendition.themes.select(this.settings.theme_night);
      } else {
        this.app_theme = "light"
        this.settings.theme_mode = "day";
        this.rendition.themes.select(this.settings.theme_day);
      }
    },
    set_menu: function (target_menu_panel) {
      var target = target_menu_panel;
      if (this.menu.current_panel == target) {
        if (this.menu.panels[target] === true) {
          target = 'hide';
        }
      }

      this.menu.value = (target == 'hide') ? undefined : target;
      console.log("set menu = ", target, ", current menu.value=", this.menu.value);
      this.menu.current_panel = target;
      this.menu.show_navbar = true;
      for (var k in this.menu.panels) {
        this.menu.panels[k] = (k == target);
      }
    },
    update_settings: function (opt) {
      if (opt.flow != this.settings.flow) {
        // FIXME 切换后，翻页到下一章时css会丢失
        this.rendition.flow(opt.flow)
        this.set_menu('hide')
      }
      for (const key in opt) {
        this.settings[key] = opt[key];
      }
      // 更新主题设定
      const mode = opt["theme_mode"];
      const theme_key = "theme_" + mode;
      this.settings[theme_key] = this.settings.theme;
      this.rendition.themes.select(this.settings.theme);
      this.app_theme = (mode == "day") ? "light" : "dark";
    },
    on_click_toc: function (item) {
      console.log(item);
      this.set_menu("hide");
      this.rendition.display(item.id);
    },
    on_mousedown: function (mouse_event) {
      this.mouse_down_time = new Date();
    },
    on_mouseup: function (mouse_event) {
      const t = new Date() - this.mouse_down_time;
      if (t > 600) {
        this.check_if_selected_content = true;
      } else {
        this.check_if_selected_content = false;
      }
    },
    on_click_content: function (event) {
      if (!this.check_if_selected_content) {
        return this.smart_click(event)
      }

      // epub.js 中要等待 250ms 才检测是否为selected
      // 所以这里也要等待一下，优先执行 selected 操作
      setTimeout(() => {
        if (!this.is_handlering_selected_content) {
          this.smart_click(event);
        } else {
          this.is_handlering_selected_content = false;
        }
      }, 300);
    },
    smart_click: function (event) {
      const rect = event.view.frameElement.getBoundingClientRect();
      const viewer = document.getElementById('reader');
      const width = viewer.offsetWidth;
      const height = viewer.offsetHeight;
      const x = (event.clientX + rect.x) % viewer.offsetWidth;
      const y = (event.clientY + rect.y) % viewer.offsetHeight;
      this.debug_click(x, y, width, height)


      // 如果工具栏还在，那么这次点击视作「隐藏工具栏」
      if (this.is_toolbar_visible()) {
        this.hide_toolbar();
        return;
      }

      // 按照功能区的点击处理
      const N = width > this.wide_screen ? 5 : 3;
      if ( x < width / N || y < height / N) {
        // 点击左侧，往前翻页
        console.log("<- prev page")
        this.rendition.prev();
      } else if (x > width * (N-1) / N || y > height * (N-1) / N) {
        // 点击右侧，往后翻页
        console.log("-> next page")
        this.rendition.next().then();
      } else {
        // 点击中间，显示菜单
        console.log("-- toggle menu")
        this.menu.show_navbar = !this.menu.show_navbar;
      }
    },
    bin_search: function (subitems, cfi, contents) {
      var left = 0;
      var right = subitems.length;
      // 在sub里搜索
      while (left < right) {
        const mid = Math.floor((left + right) / 2);
        if (mid == left) {
          break;
        }
        const sub = subitems[mid];
        if (sub.cfi === undefined) {
          if (sub.href.indexOf("#") > 0) {
            const pos = sub.href.split("#")[1];
            sub.elem = contents.document.getElementById(pos);
          } else {
            sub.elem = contents.document.getElementsByTagName("p")[0];
          }
          sub.cfi = new ePub.CFI(sub.elem, contents.cfiBase);
          sub.cfi = new ePub.CFI(sub.cfi.toString()); // 强制转成标准格式
        }
        const cmp = this.book.locations.epubcfi.compare(cfi, sub.cfi);
        // console.log(left, mid, right, sub)
        // console.log("compare, cmp = ", cmp, cfi, sub.cfi)
        if (cmp == 0) {
          return sub;
        }
        if (cmp < 0) {
          right = mid;
        }
        if (cmp > 0) {
          left = mid;
        }
      }
      const found = subitems[left]
      if (found.cfi === undefined) {
        if (found.href.indexOf("#") > 0) {
          const pos = found.href.split("#")[1];
          found.elem = contents.document.getElementById(pos);
        } else {
          found.elem = contents.document.getElementsByTagName("p")[0];
        }
        found.cfi = new ePub.CFI(found.elem, contents.cfiBase);
      }
      return found;
    },
    find_same_href_in_toc_tree: function (toc_tree, target_href) {
      for (var idx in toc_tree) {
        const toc = toc_tree[idx];
        if (toc.href == target_href) {
          return toc
        }
        if (toc.subitems.length > 0) {
          const found = this.find_same_href_in_toc_tree(toc.subitems, target_href);
          if (found !== undefined) {
            return found
          }
        }
      }
      return;
    },
    find_toc: function (search_cfi, contents) {
      const cfi = new ePub.CFI(search_cfi.toString()); // 强制转成标准格式
      const section = this.book.spine.get(contents.sectionIndex);

      // 获取当前所属的章节（可能是一个包含N个小节的卷）
      const toc = this.find_same_href_in_toc_tree(this.toc_items, section.href);
      console.log("got spine href in toc:", toc)
      if (toc === undefined) {
        return;
        debugger
      }

      // 填充 cfi 定位信息
      if (toc.elem === undefined) {
        const tags = ["h1", "h2", "h3", "h4", "h5", "h6", "p"];
        for (let tag of tags) {
          const elems = contents.document.getElementsByTagName(tag)
          if (elems.length > 0) {
            toc.elem = elems[0];
            break;
          }
        }
        const toc_cfi = new ePub.CFI(toc.elem, contents.cfiBase);
        toc.cfi = new ePub.CFI(toc_cfi.toString());
      }

      // 如果没有子目录，那就是它自己了
      var found = toc;
      if (toc.subitems.length > 0) {
        // 二分查找子目录，并检查是否在第一个subitem之前
        found = this.bin_search(toc.subitems, cfi, contents);
        if (this.book.locations.epubcfi.compare(cfi, found.cfi) < 0) {
          found = toc
        }
      }
      console.log("find_toc = ", found)
      return found;
    },
    count_distinct_between: function (start_elem, end_elem) {
      // 获取父节点
      var end = end_elem;
      while (end.parentElement != start_elem.parentNode) {
        end = end.parentElement;
      }

      // 初始化计数器
      let count = 0;

      // 从 startElement 开始遍历到 endElement
      let currentNode = start_elem; // 获取 startElement 之后的第一个兄弟节点

      // 遍历节点直到 endElement
      while (currentNode && currentNode !== end) {
        if (currentNode.nodeName.toUpperCase() === "P") {
          count++; // 如果当前节点是 <p>，则计数
        }
        currentNode = currentNode.nextSibling; // 移动到下一个兄弟节点
      }

      return count;
    },
    hide_toolbar: function () {
      this.toolbar_left = -999;
    },
    show_toolbar: function (rect, iframe_rect) {
      console.log("show toolbar at rect", rect, " from iframe rect", iframe_rect)
      const toolbar = document.getElementById('comments-toolbar');
      this.toolbar_left = (rect.width - toolbar.offsetWidth) / 2;

      const top = rect.top + iframe_rect.y;
      const bottom = rect.bottom + iframe_rect.y;
      if (top >= (toolbar.offsetHeight + 64)) {
        this.toolbar_top = (top - toolbar.offsetHeight - 12);
      } else {
        this.toolbar_top = (bottom + 12);
      }
    },
    is_toolbar_visible: function () {
      return (this.toolbar_left > 0);
    },
    on_select_content: function (cfiRange, contents) {
      console.log("on selectd", cfiRange, contents)
      this.is_handlering_selected_content = true;

      // 找到选中的元素，并上溯到 P 或者 Hx 对象
      const range = this.rendition.getRange(cfiRange);
      var p = range.startContainer.nodeType === Node.TEXT_NODE
        ? range.startContainer.parentElement
        : range.startContainer;
      while (p.nodeName.toUpperCase() != "P" && p.nodeName.toUpperCase()[0] != "H") {
        p = p.parentElement;
      }
      console.log("elem =", p);

      // 遍历toc，查找最近的章节名称
      // 然后基于章节名的位置，计算选中段落是第几个，作为ID
      const cfi = new ePub.CFI(p, contents.cfiBase);
      const toc = this.find_toc(cfi, contents);
      console.log("cfi = ", cfi, "toc =", toc);

      // 基于cfi的数字快速计算
      const segment_id = cfi.path.steps[1].index - toc.cfi.path.steps[1].index;
      // const segment_id = this.count_distinct_between(toc.elem, p);
      console.log("segment_id = ", segment_id);

      this.selected_location = {
        toc: toc,
        cfi: cfi,
        contents: contents,
        segment_id: segment_id
      }

      // 把 toolbar 移动到段落附近
      const view = this.rendition.views()._views.filter( view => { return view.index == contents.sectionIndex})[0]
      this.show_toolbar(p.getBoundingClientRect(), view.iframe.getBoundingClientRect());
    },
    on_click_toolbar_comments: function () {
      console.log("点击发表评论按钮", this.selected_location)
      const s = this.selected_location;
      this.hide_toolbar();
      this.show_selected_comments(s.toc, s.segment_id, s.cfi);
    },
    on_keyup: function (e) {
      const c = e.keyCode || e.which;
      // Left & Up
      if (c == 37 || c == 38) {
        this.rendition.prev();
      }
      // Right & Down
      if (c == 39 || c == 40) {
        this.rendition.next();
      }
    },
    debug_click: function (x, y, width, height) {
      console.log("click at", x, y, width, height);
      if (!this.is_debug_click) return;

      x = x - 10;
      y = y - 10;
      const dotDiv = document.createElement('div');
      dotDiv.classList.add('dot');
      dotDiv.style.left = `${x}px`;
      dotDiv.style.top = `${y}px`;

      document.body.appendChild(dotDiv);

      // 为每个点设置3秒后缓慢消失的效果
      setTimeout(() => {
        document.body.removeChild(dotDiv);
      }, 2000);
    },
    debug_signals: function () {
      if (!this.is_debug_signal) return;
      var signals = ['click', 'selected', 'touchstart', 'touchend', 'touchmove'];
      var signals = ["added", "attach", "attached", "axis", "changed", "detach", "displayed", "displayerror", "expand", "hidden", "layout", "linkClicked", "loaderror", "locationChanged", "markClicked", "openFailed", "orientationchange", "relocated", "removed", "rendered", "resize", "resized", "scroll", "scrolled", "selected", "selectedRange", "shown", "started", "updated", "writingMode", "mouseup", "mousedown", "mousemove", "click", "touchend", "touchstart", "touchmove"]
      signals.forEach(sig => {
        this.rendition.on(sig, (e) => {
          this.alert_msg = sig;
          console.log("rendition signal:", sig, e);
        })
      });
    },
    init_listeners: function () {
      document.addEventListener('keyup', this.on_keyup);
      this.rendition.on('keyup', this.on_keyup);
      this.rendition.on('click', this.on_click_content);
      this.rendition.on('selected', this.on_select_content);
      this.rendition.on('locationChanged', this.on_location_changed);
      this.rendition.on('mousedown', this.on_mousedown);
      this.rendition.on('mouseup', this.on_mouseup);
      this.debug_signals();
    },

    init_themes: function () {
      this.rendition.themes.register("white", "themes.css");
      this.rendition.themes.register("dark", "themes.css");
      this.rendition.themes.register("grey", "themes.css");
      this.rendition.themes.register("brown", "themes.css");
      this.rendition.themes.register("eyecare", "themes.css");
      this.rendition.themes.select(this.settings.theme_day);
    },
    on_add_review: function (content) {
      const loc = this.comments_location
      const review = {
        book_id: this.book_id,
        chapter_name: loc.toc.label.trim(),
        chapter_id: loc.toc.chapter_id,
        segment_id: loc.segment_id,
        cfi: loc.cfi.toString(),
        content: content,
        type: 1,
      }
      console.log("add review = ", review)
      const url = this.server + `/api/review/add`;

      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: "cors", credentials: "include",
        body: JSON.stringify(review),
      }).then(response => {
        if (!response.ok) {
          throw new Error('网络请求失败，状态码：' + response.status);
        }
        return response.json();
      }).then(rsp => {
        if (rsp.err == 'ok') {
          this.comments.push(rsp.data);
          alert("评论成功")
        }
        console.log("add review rsp = ", rsp)
      });
    },
    on_location_changed_old: function (loc) {
      // if (this.review_bid <= 0) return;

      const contents_list = this.rendition.getContents();
      [loc.start, loc.end].forEach(cfi => {
        console.log("handle location ", cfi)
        const spine = this.book.spine.get(cfi);
        const contents = contents_list.filter(c => { return c.cfiBase == spine.cfiBase })[0];

        const target_cfi = new ePub.CFI(cfi)
        const toc = this.find_toc(target_cfi, contents, spine.href);

        this.load_comments_summary(contents, toc);
      })
    },
    on_location_changed: function (loc) {
      const start = new ePub.CFI(loc.start);
      const end = new ePub.CFI(loc.end)
      const contents_list = this.rendition.getContents();

      for (var idx = start.spinePos; idx <= end.spinePos; idx++) {
        const spine = this.book.spine.get(idx);
        const found = contents_list.filter(c => { return c.cfiBase == spine.cfiBase })
        if (found === undefined) {
          continue
          debugger
        }
        const contents = found[0];
        const elem = contents.document.getElementsByTagName("p")[0];
        const target_cfi = new ePub.CFI(elem, spine.cfiBase)
        const toc = this.find_toc(target_cfi, contents, spine.href);
        this.load_comments_summary(contents, toc);
      }
    },
    load_comments_summary: function (contents, toc) {
      console.log("load_comments_summary at ", contents, toc)
      if (toc === undefined) {
        console.log("!! 加载章评错误，章节信息为空")
        return
      }

      // TODO 应当增加一个刷新机制
      if (toc.load_time !== undefined) {
        const ms = new Date() - toc.load_time;
        if (ms < this.comments_refresh_time) {
          return;
        }
      }

      toc.load_time = new Date();

      // 查询该章节的评论总数，并保存到toc对象中，然后展示图标
      const chapter_name = toc.label.trim();
      var url = this.server + `/api/review/summary?book_id=${this.book_id}&chapter_name=${chapter_name}`;
      fetch(url, { mode: "cors", credentials: "include" }).then(response => {
        if (!response.ok) {
          throw new Error('网络请求失败，状态码：' + response.status);
        }
        toc.load_time = undefined;
        return response.json();
      }).then(rsp => {
        toc.load_time = new Date();
        toc.summary = {}
        toc.chapter_id = rsp.data.chapter_id;
        rsp.data.list.forEach(item => {
          toc.summary[item.segmentId] = item;
          toc.icons_rendered = false;
        })
      }).catch(function (error) {
        console.error('请求过程中出现错误：', error);
      }).finally(() => {
        this.add_comment_icons(contents, toc);
      });;
    },
    add_comment_icons: function (contents, toc) {
      console.log("添加评论图标和计数器：", toc.label.trim())

      // 确定 segment_id 的最大值
      var max_segment_id = 0;
      for (var idx in toc.summary) {
        if (idx > max_segment_id) {
          max_segment_id = idx
        }
      }

      // 逐个遍历
      var segment_id = 0;
      var currentNode = toc.elem;
      while (segment_id <= max_segment_id && currentNode) {
        const node_name = currentNode.nodeName.toUpperCase();
        if (node_name === "P" || node_name[0] === "H") {
          this.add_icon_into_paragraph(contents, currentNode, segment_id, toc)
          segment_id++; // 移动到下一个节点，确保只add一次
        }
        currentNode = currentNode.nextSibling; // 移动到下一个兄弟节点
      }
    },

    add_icon_into_paragraph: function (contents, elem, segment_id, toc) {
      const state = toc.summary[segment_id];
      if (state === undefined) {
        return;
      }

      // const contents = this.rendition.getContents()[0];
      const cfi = new ePub.CFI(elem, contents.cfiBase).toString();
      const count = state.reviewNum;
      const is_hot = state.is_hot ? "hot-comment" : "";

      // 创建评论计数器
      const doc = contents.document;
      const commentCount = doc.createElement("span");
      commentCount.textContent = count > 0 ? count : "";
      commentCount.className = `comment-count ${is_hot}`;

      // 创建评论图标
      const commentContainer = doc.createElement("div");
      commentContainer.className = `comment-icon ${is_hot}`;

      // 将评论组件添加到段落末尾
      commentContainer.appendChild(commentCount);
      elem.appendChild(commentContainer);

      commentContainer.addEventListener('click', (event) => {
        event.stopPropagation();
        console.log("点击评论按钮", toc.chapter_id, segment_id, cfi)
        this.show_selected_comments(toc, segment_id, cfi);
      });
    },
    show_selected_comments: function (toc, segment_id, cfi) {
      // 重置状态
      this.comments = [];
      this.comments_location = {
        toc: toc,
        cfi: cfi,
        segment_id: segment_id,
      }

      // ID 不存在的话，说明压根就没评论，不用查询了
      if (toc.chapter_id === undefined) {
        this.set_menu("comments")
        return;
      }
      const url = this.server + `/api/review/list?book_id=${this.book_id}&chapter_id=${toc.chapter_id}&segment_id=${segment_id}&cfi=${cfi}`;
      fetch(url).then(rsp => rsp.json()).then(rsp => {
        this.comments = rsp.data.list;
        this.set_menu("comments")
        // this.set_menu("comments");
      })
    },
  },
  mounted: function () {
    const url = this.server + `/api/review/me?count=true`;
    fetch(url, { mode: "cors", credentials: "include" }).then(rsp => rsp.json()).then(rsp => {
      if (rsp.err == "user.need_login") {
        this.is_login = false;
      } else if (rsp.err == "ok") {
        this.unread_count = rsp.data.count;
      }
    })

    this.book = ePub(this.book_url);
    this.rendition = this.book.renderTo("reader", {
      manager: "continuous",
      flow: this.settings.flow,
      width: "100%",
      height: "100%",
      //snap: true
    });

    this.book.loaded.metadata.then(metadata => {
      console.log(metadata);
      this.book_meta = metadata;
      this.book_title = metadata.title;
      const url = this.server + `/api/review/book?title=${this.book_title}`;
      fetch(url, { mode: "cors", credentials: "include" }).then(rsp => rsp.json()).then(rsp => {
        this.book_id = rsp.data.id;
      })
    });

    // 加载目录
    this.book.loaded.navigation.then(nav => {
      this.toc_items = nav.toc
    });

    this.init_listeners();
    this.init_themes();

    this.book.ready.then(() => {
      this.rendition.display(this.display_url)
    })

  },
  data: () => ({
    book: null,
    settings: {
      flow: "paginated",
      // flow: "scrolled",
      font_size: 18,
      brightness: 100,
      theme: "white",
      theme_mode: "day",
      theme_day: "white",
      theme_night: "grey",
    },
    server: "http://localhost:8080",

    book_url: "/guimi2/", display_url: 'Text/Chapter_0004.xhtml',
    // book_url: "/guimi/", display_url: "index_split_002.html#filepos160365",

    wide_screen: 1000, // 宽屏尺寸
    comments_refresh_time: 10 * 60 * 100, // 10min
    app_theme: "light",
    is_login: true,
    book_title: "",
    book_meta: null,
    book_id: 0,
    alert_msg: "x",
    rendition: null,
    auto_close: false,
    menu: {
      show_navbar: true,
      current_panel: "hide",
      value: "",
      panels: {
        toc: false,
        more: false,
        settings: false,
        comments: false,
      }
    },
    theme_mode: "day",
    toc_items: [],
    comments: [],
    comments_location: {}, // 评论内容的位置
    selected_location: {}, // 选中内容的位置

    toolbar_left: -999,
    toolbar_top: 0,

    is_debug_signal: true,
    is_debug_click: true,
    unread_count: 0,
    is_handlering_selected_content: false,
    check_if_selected_content: false,
  })
}
</script>

<style>
.dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: rgba(255, 0, 0, 0.6);
  position: absolute;
  transition: opacity 1s ease-out;
  z-index: 999;
}

#comments-toolbar {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 999;
}

#main, #reader {
  height: 100%;
  width: 100%;
  position: absolute;
}

.fixed {
  position: fixed !important;
}
</style>

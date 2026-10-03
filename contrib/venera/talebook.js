// Talebook source for Venera 1.6.3 with the accompanying privacy patch.
// SPDX-License-Identifier: GPL-3.0-or-later
class TalebookSource extends ComicSource {
    name = "Talebook";
    key = "talebook";
    version = "1.0.0";
    minAppVersion = "1.6.3";
    url = "https://raw.githubusercontent.com/talebook/talebook/master/contrib/venera/talebook.js";

    _session = null;
    _loginTask = null;

    settings = {
        server: {
            title: "服务器地址（例如 https://books.example.org）",
            type: "input",
            default: "",
        },
        accessCode: {
            title: "访问码（未启用时留空）",
            type: "callback",
            buttonText: "设置或清除",
            callback: async () => {
                const code = await UI.showInputDialog("Talebook 访问码（留空清除）");
                if (code !== null) {
                    this.saveData("inviteCode", code);
                    this._session = null;
                }
            },
        },
        testConnection: {
            title: "测试连接",
            type: "callback",
            buttonText: "测试",
            callback: async () => {
                // Venera's callback settings do not present rejected promises.
                try {
                    await this._ensureSession();
                    const info = await this._get("/api/user/info");
                    if (info.user?.is_login !== true) {
                        throw new Error("Talebook 未返回已登录状态，请重新登录");
                    }
                    UI.showMessage("Talebook 连接成功");
                } catch (error) {
                    UI.showMessage(error.message || "Talebook 连接失败，请检查配置并重新登录");
                }
            },
        },
    };

    account = {
        login: async (username, password) => {
            const server = this._server();
            // Explicit login is the only way to send credentials to a new server.
            await this._authenticate(server, username, password);
            this.saveData("authenticatedServer", server);
            return true;
        },
        logout: () => {
            const previous = this.loadData("authenticatedServer");
            if (previous) Network.deleteCookies(previous);
            this.deleteData("authenticatedServer");
            this.deleteData("account");
            this._session = null;
        },
    };

    explore = [
        {
            title: "Talebook 漫画",
            type: "multiPageComicList",
            loadNext: (next) => this._list("library", "", next),
        },
        {
            title: "Talebook 最新漫画",
            type: "multiPageComicList",
            loadNext: (next) => this._list("recent", "", next),
        },
    ];

    search = {
        loadNext: (keyword, options, next) => {
            const query = String(keyword || "").trim();
            return this._list(query ? "search" : "library", query, next);
        },
    };

    comic = {
        loadInfo: async (id) => {
            const book = await this._book(id);
            if (!this._readable(book)) {
                throw new Error("该书不是可读取的漫画容器（需要漫画分类及 CBZ/ZIP/CBR/RAR）");
            }
            return new ComicDetails({
                title: book.title,
                subTitle: book.author || "",
                cover: this._cover(book.id),
                description: this._description(book.comments),
                tags: {"标签": Array.isArray(book.tags) ? book.tags : []},
                chapters: {full: "完整漫画"},
                url: this._server() + "/book/" + this._id(book.id),
            });
        },
        loadEp: async (id, epId) => {
            id = this._id(id);
            if (epId != null && epId !== "full") throw new Error("Talebook 章节不存在");
            // Recheck the classification; stored favorites can outlive reclassification.
            const book = await this._book(id);
            if (!this._readable(book)) throw new Error("该书已不是可读取的漫画容器");
            const manifest = await this._get("/api/book/" + id + "/comic/pages");
            if (manifest.contract_version !== 1 || String(manifest.book_id) !== id ||
                !Array.isArray(manifest.pages) || manifest.pages_count !== manifest.pages.length) {
                throw new Error("Talebook 漫画接口版本或页面清单不兼容");
            }
            if (!manifest.pages.length) throw new Error("Talebook 漫画没有可读取的页面");
            if (manifest.pages.length > 10000) throw new Error("Talebook 漫画页面数量超出限制");
            if (!manifest.pages.every((page) => page && Number.isInteger(page.index) && typeof page.url === "string")) {
                throw new Error("Talebook 漫画页面清单不兼容");
            }
            const pages = manifest.pages.slice().sort((a, b) => a.index - b.index);
            const images = pages.map((page, index) => {
                if (page.index !== index || typeof page.url !== "string") {
                    throw new Error("Talebook 漫画页序不兼容");
                }
                const url = this._resource(page.url);
                const path = url.slice(this._server().length).split("?")[0];
                if (path !== "/api/book/" + id + "/comic/pages/" + index) {
                    throw new Error("Talebook 返回了无效的漫画页面地址");
                }
                // Venera sends its session cookie for images. Do not persist
                // page tokens in cache keys, history or Flutter error messages.
                const [resourcePath, query] = url.split("?");
                const safeQuery = (query || "").split("&").filter((part) =>
                    part && part.split("=")[0] !== "token").join("&");
                return resourcePath + (safeQuery ? "?" + safeQuery : "");
            });
            return {images};
        },
        onImageLoad: (url) => this._imageConfig(url),
        onThumbnailLoad: (url) => this._imageConfig(url),
        idMatch: "^[1-9][0-9]*$",
    };

    _requirePrivacy() {
        if (Network.sensitiveRequestsVersion !== 1) {
            throw new Error("此书源需要安装 Talebook 提供的 Venera 1.6.3 隐私补丁客户端；原版会记录会话凭据，请按安装说明配置");
        }
    }

    _server() {
        // QuickJS does not provide the browser URL class. Restrict the base URL
        // rather than accepting credentials, query strings or ambiguous paths.
        const value = String(this.loadSetting("server") || "").trim().replace(/\/+$/, "");
        const match = /^(https?):\/\/(\[[0-9a-fA-F:]+\]|[a-zA-Z0-9.-]+)(?::([0-9]+))?(\/[a-zA-Z0-9_~.-]+)*$/.exec(value);
        if (!match || (match[3] && (+match[3] < 1 || +match[3] > 65535)) ||
            value.split("/").some((part) => part === "." || part === "..")) {
            throw new Error("请填写有效的 Talebook HTTP(S) 服务器地址，支持子路径；地址不能含账号、查询参数或片段");
        }
        return value;
    }

    _id(value) {
        const id = String(value);
        if (!/^[1-9][0-9]*$/.test(id) || !Number.isSafeInteger(Number(id))) {
            throw new Error("Talebook 漫画 ID 无效");
        }
        return id;
    }

    _resource(value) {
        const server = this._server();
        if (typeof value !== "string" || /[\s\\#]/.test(value)) {
            throw new Error("Talebook 返回了无效的资源地址");
        }
        // New servers return public URLs with BASE_PATH; older ones return
        // bare API paths. Apply the configured prefix exactly once.
        const origin = /^(https?:\/\/[^/]+)/.exec(server)[1];
        const prefix = server.slice(origin.length);
        let url = value;
        if (value.startsWith("/") && !value.startsWith("//")) {
            url = prefix && value.startsWith(prefix + "/") ? origin + value : server + value;
        }
        if (!url.startsWith(server + "/") || /%(?:2f|5c|2e|00)/i.test(url.split("?")[0]) ||
            url.split("?")[0].split("/").some((part) => part === "." || part === "..")) {
            throw new Error("Talebook 返回了站外或无效的资源地址");
        }
        return url;
    }

    _cover(id) {
        // Avoid CDN URLs: session cookies are scoped to the configured server.
        return this._server() + "/get/cover/" + this._id(id) + ".jpg";
    }

    _imageConfig(url) {
        this._requirePrivacy();
        url = this._resource(url);
        const path = url.slice(this._server().length).split("?")[0];
        if (!/^\/get\/cover\/[1-9][0-9]*\.jpg$/.test(path) &&
            !/^\/api\/book\/[1-9][0-9]*\/comic\/pages\/[0-9]+$/.test(path)) {
            throw new Error("Talebook 图片地址无效");
        }
        return {
            url,
            sensitive: true,
            onLoadFailed: () => {
                throw new Error("Talebook 图片读取失败：请检查网络和阅读权限；会话或页面凭证过期时，请重新登录并重新打开漫画");
            },
        };
    }

    _description(value) {
        return typeof value === "string" ? value.replace(/<[^>]*>/g, "").trim() : "";
    }

    _readable(book) {
        return book?.media_type === "comic" && Array.isArray(book.files) &&
            book.files.some((file) => file && typeof file.format === "string" &&
                ["CBZ", "ZIP", "CBR", "RAR"].includes(file.format.toUpperCase()));
    }

    async _request(server, path, form = null) {
        this._requirePrivacy();
        let response;
        try {
            response = await Network.sendRequest(form === null ? "GET" : "POST", server + path,
                {Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded"},
                form, {sensitive: true});
        } catch (_) {
            // The original error may contain a URL, headers or credentials.
            throw new Error("无法连接 Talebook，请检查服务器地址、网络和 HTTPS 证书");
        }
        if (response.status >= 300 && response.status < 400) {
            throw new Error("Talebook 请求被重定向，请填写最终服务器地址");
        }
        if (response.status === 401) return {err: "user.need_login"};
        if (response.status === 403) throw new Error("无权访问 Talebook，请检查账号权限和访问码");
        if (response.status === 404) throw new Error("Talebook 接口不存在，请检查服务器地址和版本");
        if (response.status < 200 || response.status >= 300 || !response.status) {
            throw new Error("Talebook HTTP 请求失败，请稍后重试");
        }
        let data;
        try { data = JSON.parse(response.body); } catch (_) {
            throw new Error("Talebook 返回了不兼容的响应，请检查反向代理和服务器版本");
        }
        if (!data || Array.isArray(data) || typeof data.err !== "string") {
            throw new Error("Talebook 返回了不兼容的 JSON 响应");
        }
        return data;
    }

    _success(data, authentication = false) {
        if (data.err === "ok" || data.err === "free") return;
        const errors = {
            "not_invited": "Talebook 访问码无效或已过期",
            "user.need_login": "Talebook 登录状态已失效，请重新登录",
            "captcha.invalid": "Talebook 启用了验证码，此书源不能完成验证码登录",
            "permission": "Talebook 账号无权登录或读取漫画",
            "comic.no_permission": "无权在线阅读该漫画",
            "comic.account_inactive": "Talebook 账号尚未激活",
            "comic.book_not_found": "Talebook 漫画不存在或不可见",
            "comic.media_type": "该书在 Talebook 中未设置为漫画",
            "comic.container_missing": "Talebook 漫画缺少可读取的图片容器",
            "comic.empty": "Talebook 漫画没有可读取的页面",
            "comic.invalid_container": "Talebook 漫画容器损坏或无法读取",
            "comic.busy": "Talebook 漫画读取繁忙，请稍后重试",
            "comic.page_corrupt": "Talebook 漫画页面损坏",
            "comic.page_size": "Talebook 漫画页面超出大小限制",
            "comic.page_type": "Talebook 漫画图片格式不受支持",
            "comic.page_dimensions": "Talebook 漫画图片尺寸超出限制",
            "comic.stale_manifest": "Talebook 漫画已更新，请重新打开",
            "demo.account_only": "Talebook 演示站仅允许指定账号登录",
        };
        if (authentication && ["params.no_user", "params.invalid"].includes(data.err)) {
            throw new Error("Talebook 用户名或密码错误");
        }
        // Never echo server messages; they can include paths or sensitive data.
        throw new Error(errors[data.err] || "Talebook 请求失败，请检查权限、服务器版本或重试");
    }

    async _authenticate(server, username, password) {
        this._requirePrivacy();
        if (!String(username || "").trim() || !password) throw new Error("请填写 Talebook 用户名和密码");
        this._session = null;
        Network.deleteCookies(server);
        const welcome = await this._request(server, "/api/welcome");
        if (welcome.err === "ok") {
            const code = this.loadData("inviteCode") || "";
            if (!code) throw new Error("Talebook 服务器需要访问码，请在书源设置中填写");
            this._success(await this._request(server, "/api/welcome", "invite_code=" + encodeURIComponent(code)), true);
        } else if (welcome.err !== "free") {
            this._success(welcome, true);
        }
        this._success(await this._request(server, "/api/user/sign_in",
            "username=" + encodeURIComponent(String(username).trim()) + "&password=" + encodeURIComponent(password)), true);
        const info = await this._request(server, "/api/user/info");
        this._success(info);
        if (info.user?.is_login !== true) throw new Error("Talebook 未返回已登录状态，请重新登录");
        this._session = server;
    }

    async _ensureSession() {
        const server = this._server();
        this._requirePrivacy();
        if (this._session === server) return;
        if (this.loadData("authenticatedServer") !== server) {
            throw new Error("请先登录 Talebook；更改服务器地址后需要重新登录");
        }
        const account = this.loadData("account");
        if (!Array.isArray(account) || account.length !== 2) throw new Error("请先登录 Talebook");
        if (!this._loginTask) {
            this._loginTask = this._authenticate(server, account[0], account[1]);
        }
        try { await this._loginTask; } finally { this._loginTask = null; }
        if (this._server() !== server) throw new Error("服务器地址已更改，请重新登录");
    }

    async _get(path) {
        const server = this._server();
        await this._ensureSession();
        if (this._session !== server || this._server() !== server) {
            throw new Error("服务器地址已更改，请重新登录");
        }
        let data = await this._request(server, path);
        if (["user.need_login", "not_invited"].includes(data.err)) {
            this._session = null;
            await this._ensureSession();
            data = await this._request(server, path);
        }
        this._success(data);
        return data;
    }

    async _book(id) {
        id = this._id(id);
        const data = await this._get("/api/book/" + id);
        if (!data.book || String(data.book.id) !== id || typeof data.book.title !== "string" ||
            typeof data.book.media_type !== "string" || !Array.isArray(data.book.files)) {
            throw new Error("Talebook 书籍详情接口不兼容，请更新服务器");
        }
        return data.book;
    }

    async _list(endpoint, query, next) {
        const server = this._server();
        let start = 0;
        if (next != null) {
            let cursor;
            try { cursor = JSON.parse(next); } catch (_) { throw new Error("Talebook 分页游标无效，请刷新列表"); }
            if (!cursor || cursor.server !== server || cursor.endpoint !== endpoint || cursor.query !== query ||
                !Number.isSafeInteger(cursor.start) || cursor.start < 0) {
                throw new Error("Talebook 分页条件已更改，请刷新列表");
            }
            start = cursor.start;
        }
        const comics = [];
        const seen = new Set();
        let total = start + 1;
        // Bound work per load. A continuation cursor survives sparse/empty batches.
        for (let batch = 0; batch < 10 && start < total && comics.length < 20; batch++) {
            const data = await this._get("/api/" + endpoint + "?start=" + start + "&size=60" +
                (query ? "&name=" + encodeURIComponent(query) : ""));
            if (!Number.isSafeInteger(data.total) || data.total < 0 || !Array.isArray(data.books)) {
                throw new Error("Talebook 列表接口不兼容，请更新服务器");
            }
            total = data.total;
            if (!data.books.length && start < total) throw new Error("Talebook 返回了不完整的分页，请刷新列表");
            for (const candidate of data.books) {
                start++;
                if (!candidate || typeof candidate.media_type !== "string") {
                    throw new Error("Talebook 缺少漫画分类字段，请更新服务器或重新扫描书库");
                }
                if (candidate.media_type !== "comic") continue;
                const id = this._id(candidate.id);
                if (seen.has(id)) continue;
                seen.add(id);
                // List responses omit formats; details are required to exclude comic EPUB.
                const book = await this._book(id);
                if (!this._readable(book)) continue;
                comics.push(new Comic({
                    id,
                    title: book.title,
                    subTitle: book.author || "",
                    cover: this._cover(id),
                    tags: Array.isArray(book.tags) ? book.tags : [],
                    description: this._description(book.comments),
                }));
                if (comics.length === 20) break;
            }
        }
        return {
            comics,
            next: start < total ? JSON.stringify({server, endpoint, query, start}) : null,
        };
    }
}

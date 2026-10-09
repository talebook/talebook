// Talebook's limited Venera host API. No browser, OS, filesystem or credentials.
const APP = Object.freeze({locale: __input.locale, version: '1.6.3'});
const console = Object.freeze({log() {}, warn() {}, error() {}});
if (!Array.prototype.at) {
    Array.prototype.at = function (index) { return this[index < 0 ? this.length + index : index]; };
}
class ComicSource {
    loadSetting(key) { return __input.settings[key] ?? this.settings?.[key]?.default; }
    loadData(key) { return this.__data?.[key]; }
    saveData(key, value) { (this.__data ??= {})[key] = value; }
}
function Comic(value) { Object.assign(this, value); }
function ComicDetails(value) { Object.assign(this, value); }
let __requests = [], __waiting = {}, __requestId = 0, __result;
const Network = Object.freeze({
    sendRequest(method, url, headers, data) {
        return new Promise((resolve, reject) => {
            const id = ++__requestId;
            __waiting[id] = {resolve, reject};
            __requests.push({id, method, url, headers: headers || {}, data});
        });
    },
    get(url, headers) { return this.sendRequest('GET', url, headers); },
    post() { throw new Error('Unsupported Venera API: Network.post'); },
    getCookies() { throw new Error('Unsupported Venera API: cookies'); },
    deleteCookies() { throw new Error('Unsupported Venera API: cookies'); },
});
async function fetch(url, options = {}) {
    const response = await Network.sendRequest(options.method || 'GET', url, options.headers, options.body);
    return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        headers: response.headers,
        text: async () => response.body,
        json: async () => JSON.parse(response.body),
    };
}
function __deliver() {
    const reply = __reply;
    const waiting = __waiting[reply.id];
    delete __waiting[reply.id];
    if (reply.error) {
        const error = new Error('Venera upstream request failed');
        error.__requestId = reply.id;
        waiting.reject(error);
    } else {
        waiting.resolve(reply.response);
    }
}
function __chapters(map, group = '') {
    const entries = map instanceof Map ? [...map] : Object.entries(map || {});
    return entries.flatMap(([id, value]) => value instanceof Map || (value && typeof value === 'object')
        ? __chapters(value, group ? `${group} · ${id}` : id)
        : [{id: String(id), title: group ? `${group} · ${value}` : String(value)}]);
}
async function __run(source) {
    if (source.key !== 'manga_dex') throw new Error('Unsupported Venera source');
    if (source.init) await source.init();
    const args = __input.args;
    switch (__input.operation) {
    case 'search':
        return source.search.load(args.query, ['any', __input.rating, 'any'], args.page);
    case 'browse':
        return source.api[{popular: 'getPopular', recent: 'getRecent', updated: 'getUpdated'}[args.category]](args.page);
    case 'book': {
        const info = await source.comic.loadInfo(args.id);
        return {...info, chapters: __chapters(info.chapters), tags: undefined};
    }
    case 'pages': {
        const result = await source.comic.loadEp(args.id, args.chapter);
        return {images: result.images.map(url => {
            const config = source.comic.onImageLoad ? source.comic.onImageLoad(url, args.id, args.chapter) : {url};
            if (config.onResponse || config.method && config.method !== 'GET') {
                throw new Error('Unsupported Venera image transform');
            }
            const fallback = config.onLoadFailed?.();
            return {url: config.url || url, headers: config.headers || {}, fallback: fallback?.url};
        })};
    }
    default: throw new Error('Unsupported Venera operation');
    }
}

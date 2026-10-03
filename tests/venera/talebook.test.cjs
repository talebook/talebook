const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const http = require('node:http');
const {test} = require('node:test');

const sourceText = fs.readFileSync(path.join(__dirname, '../../contrib/venera/talebook.js'), 'utf8');
const ok = (data = {}) => ({status: 200, body: JSON.stringify({err: 'ok', ...data})});
const exampleBook = (id = 1, media = 'comic', format = 'CBZ') => ({
    id, title: `漫画 ${id}`, author: '测试作者', tags: ['漫画'], comments: '<p>简介</p>',
    media_type: media, files: [{format}],
});

function createSource(handler, {server = 'https://books.example.org', patched = true} = {}) {
    const data = new Map();
    const settings = {server};
    const requests = [];
    const deleted = [];
    const messages = [];
    const bridge = (message) => {
        switch (message.method) {
            case 'load_data': return data.get(message.data_key);
            case 'save_data': data.set(message.data_key, message.data); return;
            case 'delete_data': data.delete(message.data_key); return;
            case 'load_setting': return settings[message.setting_key];
            case 'cookie': if (message.function === 'delete') deleted.push(message.url); return;
            case 'http': {
                requests.push(message);
                return Promise.resolve(handler(message));
            }
            case 'UI': messages.push(message); return null;
            default: throw new Error(`Unexpected bridge operation: ${message.method}`);
        }
    };
    const context = vm.createContext({sendMessage: bridge});
    if (process.env.VENERA_INIT_JS) {
        vm.runInContext(fs.readFileSync(process.env.VENERA_INIT_JS, 'utf8'), context);
        vm.runInContext(`Network.sensitiveRequestsVersion = ${patched ? '1' : 'undefined'}`, context);
    } else {
        vm.runInContext(`
            class ComicSource {
                loadData(key) { return sendMessage({method: 'load_data', data_key: key}); }
                saveData(key, data) { sendMessage({method: 'save_data', data_key: key, data}); }
                deleteData(key) { sendMessage({method: 'delete_data', data_key: key}); }
                loadSetting(key) { return sendMessage({method: 'load_setting', setting_key: key}); }
            }
            function Comic(data) { Object.assign(this, data); }
            function ComicDetails(data) { Object.assign(this, data); }
            const Network = {
                sensitiveRequestsVersion: ${patched ? '1' : 'undefined'},
                async sendRequest(method, url, headers, data, extra) {
                    const result = await sendMessage({method: 'http', http_method: method, url, headers, data, extra});
                    if (result.error) throw result.error;
                    return result;
                },
                deleteCookies(url) { sendMessage({method: 'cookie', function: 'delete', url}); },
            };
            const UI = {
                showMessage(message) { sendMessage({method: 'UI', message}); },
                showInputDialog() { return Promise.resolve(null); },
            };
        `, context);
    }
    // Match Venera's actual class discovery/evaluation, not a CommonJS export.
    const firstClass = sourceText.split('\n').find((line) => line.trim().startsWith('class '));
    assert.ok(firstClass.startsWith('class ') && firstClass.includes('extends ComicSource'));
    const name = firstClass.split('class')[1].split('extends ComicSource')[0].trim();
    vm.runInContext(`(() => { ${sourceText}\nthis.source = new ${name}(); }).call()`, context);
    const source = context.source;
    return {
        source, data, settings, requests, deleted, messages,
        async login(username = 'reader', password = 'test-only-password') {
            await source.account.login(username, password);
            // Venera parser saves account only after a successful native login.
            data.set('account', [username, password]);
        },
    };
}

function standardHandler(request) {
    const url = new URL(request.url);
    if (url.pathname.endsWith('/api/welcome')) return ok({err: 'free'});
    if (url.pathname.endsWith('/api/user/sign_in')) return ok();
    if (url.pathname.endsWith('/api/user/info')) return ok({user: {is_login: true}});
    throw new Error('Unexpected request');
}

test('imports using the Venera class contract, safe version and unique key', () => {
    const {source} = createSource(standardHandler);
    assert.equal(source.name, 'Talebook');
    assert.equal(source.key, 'talebook');
    assert.equal(source.minAppVersion, '1.6.3');
    assert.equal(source.explore.length, 2);
    assert.equal(typeof source.search.loadNext, 'function');
});

test('original Venera refuses all requests before credentials can reach its logs', async () => {
    const app = createSource(standardHandler, {patched: false});
    await assert.rejects(app.login(), /隐私补丁/);
    await assert.rejects(app.source.explore[0].loadNext(null), /隐私补丁/);
    await app.source.settings.testConnection.callback();
    assert.match(app.messages.at(-1).message, /隐私补丁/);
    assert.throws(() => app.source.comic.onThumbnailLoad('https://books.example.org/get/cover/1.jpg'), /隐私补丁/);
    assert.equal(app.requests.length, 0);
    assert.equal(app.data.has('authenticatedServer'), false);
});

test('login uses is_login without requiring user.id and protects every request', async () => {
    const app = createSource(standardHandler);
    await app.login('reader +测试', 'password&=测试');
    assert.equal(app.requests[1].data, 'username=reader%20%2B%E6%B5%8B%E8%AF%95&password=password%26%3D%E6%B5%8B%E8%AF%95');
    assert.ok(app.requests.every((request) => request.extra.sensitive === true));
    assert.ok(app.requests.every((request) => !request.url.includes('password')));
    await app.source.settings.testConnection.callback();
    assert.equal(app.messages.at(-1).message, 'Talebook 连接成功');
});

test('access code is required only in invite mode and encoded in protected POST', async () => {
    const handler = (request) => {
        if (request.url.endsWith('/api/welcome')) {
            return request.http_method === 'POST' ? ok() : ok();
        }
        return standardHandler(request);
    };
    const app = createSource(handler);
    await assert.rejects(app.login(), /需要访问码/);
    app.data.set('inviteCode', 'code&测试');
    await app.login();
    assert.equal(app.requests[2].data, 'invite_code=code%26%E6%B5%8B%E8%AF%95');
});

test('wrong password, invite code and captcha errors do not expose server messages', async () => {
    for (const [err, expected] of [['params.invalid', /密码错误/], ['not_invited', /访问码无效/], ['captcha.invalid', /验证码/]]) {
        const app = createSource((request) => request.url.endsWith('/api/user/sign_in') ? ok({err, msg: 'SECRET /private/file'}) : standardHandler(request));
        await assert.rejects(app.login(), expected);
        assert.equal(app.data.has('authenticatedServer'), false);
    }
});

test('HTTP, HTML, malformed JSON and low-level errors have fixed understandable messages', async () => {
    const cases = [
        [{status: 302, body: 'SECRET'}, /重定向/],
        [{status: 403, body: 'SECRET'}, /无权/],
        [{status: 404, body: 'SECRET'}, /接口不存在/],
        [{status: 500, body: 'SECRET'}, /HTTP 请求失败/],
        [{status: 200, body: '<html>SECRET</html>'}, /不兼容的响应/],
        [{status: 200, body: '[]'}, /JSON 响应/],
        [{error: 'password=SECRET'}, /无法连接/],
    ];
    for (const [response, expected] of cases) {
        const app = createSource(() => response);
        await assert.rejects(app.login(), (error) => expected.test(error.message) && !error.message.includes('SECRET'));
    }
});

test('not explicitly logged-in info never produces a connection-success message', async () => {
    for (const info of [{user: {is_login: false}}, {user: {id: 123}}, {}]) {
        const app = createSource((request) => request.url.endsWith('/api/user/info') ? ok(info) : standardHandler(request));
        await assert.rejects(app.login(), /未返回已登录状态/);
        assert.equal(app.messages.length, 0);
    }
});

test('valid deployment prefix and IPv6 URL are accepted, ambiguous bases are rejected', () => {
    for (const server of ['https://books.example.org/prefix', 'http://[::1]:8080', 'https://books.example.org:443/']) {
        const {source} = createSource(standardHandler, {server});
        assert.equal(source._server(), server.replace(/\/$/, ''));
    }
    for (const server of ['', 'file:///tmp', 'https://reader:secret@books.example.org', 'https://books.example.org?q=1', 'https://books.example.org#part', 'https://books.example.org/../else', 'https://books.example.org:65536', 'https://books.example.org/a%2fb']) {
        const {source} = createSource(standardHandler, {server});
        assert.throws(() => source._server(), /服务器地址/);
    }
});

test('credentials are never automatically forwarded after changing the server', async () => {
    const app = createSource(standardHandler);
    await app.login();
    const before = app.requests.length;
    app.settings.server = 'https://another.example.org';
    await app.source.settings.testConnection.callback();
    assert.match(app.messages.at(-1).message, /重新登录/);
    assert.equal(app.requests.length, before);
    app.source.account.logout();
    assert.equal(app.deleted.at(-1), 'https://books.example.org');
    assert.equal(app.data.has('account'), false);
});

test('session expiry reauthenticates once, including HTTP 401; repeated expiry terminates', async () => {
    for (const httpStatus of [200, 401]) {
        let expired = true;
        const app = createSource((request) => {
            if (request.url.endsWith('/api/book/1')) {
                if (expired) { expired = false; return {status: httpStatus, body: JSON.stringify({err: 'user.need_login'})}; }
                return ok({book: exampleBook()});
            }
            return standardHandler(request);
        });
        await app.login();
        assert.equal((await app.source.comic.loadInfo('1')).title, '漫画 1');
        assert.equal(app.requests.filter((request) => request.url.endsWith('/api/user/sign_in')).length, 2);
    }
    const app = createSource((request) => request.url.endsWith('/api/book/1') ? ok({err: 'user.need_login'}) : standardHandler(request));
    await app.login();
    await assert.rejects(app.source.comic.loadInfo('1'), /登录状态已失效/);
    assert.equal(app.requests.filter((request) => request.url.endsWith('/api/book/1')).length, 2);
});

test('concurrent API requests share automatic authentication after app restart', async () => {
    const app = createSource(async (request) => request.url.endsWith('/api/book/1') ? ok({book: exampleBook()}) : standardHandler(request));
    await app.login();
    app.source._session = null;
    await Promise.all([app.source.comic.loadInfo('1'), app.source.comic.loadInfo('1')]);
    assert.equal(app.requests.filter((request) => request.url.endsWith('/api/user/sign_in')).length, 2);
});

test('browse/search/latest only show classified comic containers, not ebook CBZ or comic EPUB/PDF', async () => {
    const books = [exampleBook(1), exampleBook(2, 'ebook', 'CBZ'), exampleBook(3, 'comic', 'EPUB'), exampleBook(4, 'comic', 'PDF'), exampleBook(5, 'unknown'), exampleBook(6, 'comic', 'RAR')];
    const app = createSource((request) => {
        const url = new URL(request.url);
        if (/\/api\/(library|recent|search)$/.test(url.pathname)) return ok({total: books.length, books});
        const match = /\/api\/book\/(\d+)$/.exec(url.pathname);
        return match ? ok({book: books.find((book) => String(book.id) === match[1])}) : standardHandler(request);
    });
    await app.login();
    for (const load of [() => app.source.explore[0].loadNext(null), () => app.source.explore[1].loadNext(null), () => app.source.search.loadNext('海 贼&', [], null)]) {
        const result = await load();
        assert.deepEqual(Array.from(result.comics, (comic) => comic.id), ['1', '6']);
        assert.equal(result.next, null);
    }
    assert.ok(app.requests.some((request) => request.url.includes('name=%E6%B5%B7%20%E8%B4%BC%26')));
    const detailIds = app.requests.filter((request) => /\/api\/book\/\d+$/.test(request.url));
    assert.ok(!detailIds.some((request) => request.url.endsWith('/2') || request.url.endsWith('/5')));
});

test('pagination resumes within an API batch without skipping comics', async () => {
    const books = Array.from({length: 75}, (_, index) => exampleBook(index + 1, index < 30 ? 'ebook' : 'comic'));
    const app = createSource((request) => {
        const url = new URL(request.url);
        if (url.pathname === '/api/library') {
            const start = Number(url.searchParams.get('start'));
            return ok({total: books.length, books: books.slice(start, start + 60)});
        }
        const match = /\/api\/book\/(\d+)$/.exec(url.pathname);
        return match ? ok({book: books[Number(match[1]) - 1]}) : standardHandler(request);
    });
    await app.login();
    const first = await app.source.explore[0].loadNext(null);
    const second = await app.source.explore[0].loadNext(first.next);
    const third = await app.source.explore[0].loadNext(second.next);
    assert.deepEqual([first.comics.length, second.comics.length, third.comics.length], [20, 20, 5]);
    assert.deepEqual(Array.from([...first.comics, ...second.comics, ...third.comics], (comic) => Number(comic.id)), Array.from({length: 45}, (_, index) => index + 31));
    assert.equal(third.next, null);
    await assert.rejects(app.source.search.loadNext('other', [], first.next), /分页条件/);
});

test('sparse library retains a continuation after the work budget instead of false end-of-list', async () => {
    const books = Array.from({length: 601}, (_, index) => exampleBook(index + 1, index === 600 ? 'comic' : 'ebook'));
    const app = createSource((request) => {
        const url = new URL(request.url);
        if (url.pathname === '/api/library') {
            const start = Number(url.searchParams.get('start'));
            return ok({total: books.length, books: books.slice(start, start + 60)});
        }
        return url.pathname === '/api/book/601' ? ok({book: books[600]}) : standardHandler(request);
    });
    await app.login();
    const first = await app.source.explore[0].loadNext(null);
    assert.equal(first.comics.length, 0);
    assert.equal(JSON.parse(first.next).start, 600);
    const second = await app.source.explore[0].loadNext(first.next);
    assert.equal(second.comics[0].id, '601');
    assert.equal(second.next, null);
});

test('missing classification, invalid list shape, and prematurely empty batch are compatibility failures', async () => {
    for (const list of [{books: [], total: '0'}, {books: [{id: 1}], total: 1}, {books: [], total: 1}, {books: [null], total: 1}]) {
        const app = createSource((request) => request.url.includes('/api/library') ? ok(list) : standardHandler(request));
        await app.login();
        await assert.rejects(app.source.explore[0].loadNext(null), /不兼容|分类字段|不完整/);
    }
});

test('details map one book to one full-volume chapter and ignore a foreign CDN cover', async () => {
    const app = createSource((request) => request.url.endsWith('/api/book/1') ? ok({book: {...exampleBook(), img: 'https://cdn.example.net/cover'}}) : standardHandler(request));
    await app.login();
    const details = await app.source.comic.loadInfo('1');
    assert.deepEqual(JSON.parse(JSON.stringify(details.chapters)), {full: '完整漫画'});
    assert.equal(details.cover, 'https://books.example.org/get/cover/1.jpg');
    assert.equal(details.description, '简介');
});

test('manifest is ordered by index, keeps revision and discards page tokens from cache/error URLs', async () => {
    const pages = [2, 0, 1].map((index) => ({index, url: `/api/book/1/comic/pages/${index}?revision=rev&token=TEST%2F%2B` }));
    const app = createSource((request) => {
        if (request.url.endsWith('/comic/pages')) return ok({contract_version: 1, book_id: 1, pages_count: 3, pages});
        return request.url.endsWith('/api/book/1') ? ok({book: exampleBook()}) : standardHandler(request);
    });
    await app.login();
    const result = await app.source.comic.loadEp('1', 'full');
    assert.deepEqual(Array.from(result.images), [0, 1, 2].map((index) => `https://books.example.org/api/book/1/comic/pages/${index}?revision=rev`));
    for (const url of result.images) assert.equal(app.source.comic.onImageLoad(url).sensitive, true);
    assert.equal(app.source.comic.onThumbnailLoad('https://books.example.org/get/cover/1.jpg').sensitive, true);
});

test('invalid version, empty, duplicate, missing or foreign pages cannot reach the image loader', async () => {
    const page = (index, url = `/api/book/1/comic/pages/${index}`) => ({index, url});
    for (const [pages, version, count] of [
        [[page(0)], 2, 1], [[], 1, 0], [[null], 1, 1], [[page(0), page(0)], 1, 2],
        [[page(1)], 1, 1], [[page(0)], 1, 2],
        [[page(0, 'https://elsewhere.example.org/api/book/1/comic/pages/0')], 1, 1],
        [[page(0, '/api/book/2/comic/pages/0')], 1, 1],
        [[page(0, '/api/book/1/comic/pages/../0')], 1, 1],
    ]) {
        const app = createSource((request) => {
            if (request.url.endsWith('/comic/pages')) return ok({contract_version: version, book_id: 1, pages_count: count, pages});
            return request.url.endsWith('/api/book/1') ? ok({book: exampleBook()}) : standardHandler(request);
        });
        await app.login();
        await assert.rejects(app.source.comic.loadEp('1', 'full'), /不兼容|页面|地址/);
    }
});

test('deployment prefix is applied once to both old API paths and current public URLs', async () => {
    const server = 'https://books.example.org/books';
    for (const url of ['/api/book/1/comic/pages/0', '/books/api/book/1/comic/pages/0', server + '/api/book/1/comic/pages/0']) {
        const app = createSource((request) => {
            if (request.url.endsWith('/comic/pages')) return ok({contract_version: 1, book_id: 1, pages_count: 1, pages: [{index: 0, url: url + '?revision=rev&token=TEST'}]});
            return request.url.endsWith('/api/book/1') ? ok({book: exampleBook()}) : standardHandler(request);
        }, {server});
        await app.login();
        const details = await app.source.comic.loadInfo('1');
        assert.equal(details.cover, server + '/get/cover/1.jpg');
        const result = await app.source.comic.loadEp('1', 'full');
        assert.deepEqual(Array.from(result.images), [server + '/api/book/1/comic/pages/0?revision=rev']);
        assert.equal(app.source.comic.onImageLoad(result.images[0]).sensitive, true);
        assert.equal(app.source.comic.onThumbnailLoad('/books/get/cover/1.jpg').url, details.cover);
        assert.throws(() => app.source.comic.onImageLoad('https://books.example.org/api/book/1/comic/pages/0'), /地址/);
        assert.throws(() => app.source.comic.onImageLoad('/books-other/api/book/1/comic/pages/0'), /地址/);
    }
});

test('invalid IDs, chapters and foreign/path-traversal image resources are refused', async () => {
    const app = createSource(standardHandler);
    for (const id of ['0', '-1', '../1', '1?password=SECRET', '9007199254740992']) {
        await assert.rejects(app.source.comic.loadInfo(id), /ID 无效/);
    }
    await assert.rejects(app.source.comic.loadEp('1', 'different'), /章节不存在/);
    for (const url of ['//elsewhere.example.org/cover.jpg', '/api/user/info', '/get/cover/../1.jpg', '/get/cover/%2e%2e/1.jpg', 'https://books.example.org.evil/get/cover/1.jpg']) {
        assert.throws(() => app.source.comic.onImageLoad(url), /地址/);
    }
    assert.equal(app.requests.length, 0);
});

test('unreadable or reclassified comics are rejected even from existing favorites', async () => {
    for (const book of [exampleBook(1, 'ebook'), exampleBook(1, 'comic', 'EPUB')]) {
        const app = createSource((request) => request.url.endsWith('/api/book/1') ? ok({book}) : standardHandler(request));
        await app.login();
        await assert.rejects(app.source.comic.loadInfo('1'), /漫画容器/);
        await assert.rejects(app.source.comic.loadEp('1', 'full'), /漫画容器/);
    }
});

test('real local HTTP flow uses form auth, cookie session, browse/search/details and ordered image bytes', async (t) => {
    let sessionCounter = 0;
    let expire = false;
    const book = exampleBook();
    const image = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const fixture = http.createServer(async (request, response) => {
        const url = new URL(request.url, 'http://localhost');
        response.setHeader('Content-Type', 'application/json');
        if (url.pathname === '/api/welcome') return response.end(JSON.stringify({err: 'free'}));
        if (url.pathname === '/api/user/sign_in') {
            let form = '';
            for await (const chunk of request) form += chunk;
            const values = new URLSearchParams(form);
            if (values.get('username') !== 'reader' || values.get('password') !== 'test-only-password') {
                return response.end(JSON.stringify({err: 'params.invalid'}));
            }
            response.setHeader('Set-Cookie', `session=test-session-${++sessionCounter}; Path=/`);
            return response.end(JSON.stringify({err: 'ok'}));
        }
        if (expire || request.headers.cookie !== `session=test-session-${sessionCounter}`) {
            expire = false;
            return response.end(JSON.stringify({err: 'user.need_login'}));
        }
        if (url.pathname === '/api/user/info') return response.end(JSON.stringify({err: 'ok', user: {is_login: true}}));
        if (url.pathname === '/api/library' || url.pathname === '/api/search') return response.end(JSON.stringify({err: 'ok', total: 1, books: [book]}));
        if (url.pathname === '/api/book/1') return response.end(JSON.stringify({err: 'ok', book}));
        if (url.pathname === '/api/book/1/comic/pages') {
            return response.end(JSON.stringify({err: 'ok', contract_version: 1, book_id: 1, pages_count: 2, pages: [1, 0].map((index) => ({index, url: `/api/book/1/comic/pages/${index}`}))}));
        }
        if (/\/api\/book\/1\/comic\/pages\/[01]$/.test(url.pathname) || url.pathname === '/get/cover/1.jpg') {
            response.setHeader('Content-Type', 'image/png');
            return response.end(image);
        }
        response.statusCode = 404;
        response.end();
    });
    await new Promise((resolve) => fixture.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise((resolve) => {fixture.close(resolve); fixture.closeAllConnections();}));
    let cookie = '';
    const server = `http://127.0.0.1:${fixture.address().port}`;
    const app = createSource(async (request) => {
        assert.equal(request.extra.sensitive, true);
        const response = await fetch(request.url, {method: request.http_method, headers: {...request.headers, Cookie: cookie}, body: request.data, redirect: 'manual'});
        if (response.headers.has('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
        return {status: response.status, body: await response.text()};
    }, {server});
    await app.login();
    assert.equal((await app.source.explore[0].loadNext(null)).comics.length, 1);
    assert.equal((await app.source.search.loadNext('漫画', [], null)).comics[0].id, '1');
    expire = true;
    assert.equal((await app.source.comic.loadInfo('1')).title, book.title);
    assert.equal(sessionCounter, 2);
    const {images} = await app.source.comic.loadEp('1', 'full');
    for (const url of [...images, `${server}/get/cover/1.jpg`]) {
        const config = app.source.comic.onImageLoad(url);
        assert.equal(config.sensitive, true);
        const response = await fetch(config.url, {headers: {Cookie: cookie}, redirect: 'manual'});
        assert.equal(response.status, 200);
        assert.deepEqual(Buffer.from(await response.arrayBuffer()), image);
    }
});

if (process.env.TALEBOOK_TEST_SERVER) {
    test('source integrates with actual Talebook handlers, Calibre library, session and CBZ pages', async () => {
        const cookies = new Map();
        const bridge = async (request) => {
            const response = await fetch(request.url, {
                method: request.http_method,
                headers: {...request.headers, Cookie: Array.from(cookies, ([key, value]) => `${key}=${value}`).join('; ')},
                body: request.data,
                redirect: 'manual',
            });
            for (const cookie of response.headers.getSetCookie()) {
                const pair = cookie.split(';')[0];
                const separator = pair.indexOf('=');
                cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
            }
            return {status: response.status, body: await response.text()};
        };
        const app = createSource(bridge, {server: process.env.TALEBOOK_TEST_SERVER});
        await assert.rejects(app.login('venera-integration', 'wrong-test-password'), /密码错误/);
        await app.login('venera-integration', 'test-only-password');
        const list = await app.source.explore[0].loadNext(null);
        assert.deepEqual(Array.from(list.comics, (comic) => comic.id), ['1']);
        const details = await app.source.comic.loadInfo('1');
        const search = await app.source.search.loadNext(details.title, [], null);
        assert.deepEqual(Array.from(search.comics, (comic) => comic.id), ['1']);
        const {images} = await app.source.comic.loadEp('1', 'full');
        assert.equal(images.length, 3);
        assert.ok(images.every((url, index) => url.includes(`/comic/pages/${index}?revision=`) && !url.includes('token=')));
        for (const url of images) {
            assert.equal(app.source.comic.onImageLoad(url).sensitive, true);
            const response = await fetch(url, {
                headers: {Cookie: Array.from(cookies, ([key, value]) => `${key}=${value}`).join('; ')},
                redirect: 'manual',
            });
            assert.equal(response.status, 200);
            assert.equal(response.headers.get('content-type'), 'image/png');
            const bytes = Buffer.from(await response.arrayBuffer());
            assert.deepEqual(bytes.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
        }
        const cover = await fetch(details.cover, {headers: {Cookie: Array.from(cookies, ([key, value]) => `${key}=${value}`).join('; ')}});
        assert.equal(cover.status, 200);
        assert.ok(cover.headers.get('content-type').startsWith('image/'));
    });
}

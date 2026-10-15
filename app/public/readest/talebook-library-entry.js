// Readest 页面入口注册补丁。
//
// 背景：Readest 是 Next.js 静态导出，产物里只有 /reader 一个页面。
// 其「关闭书籍 / 回库」执行 router.replace("/library")，因
// assetPrefix=/readest 解析成 /readest/library。我们为它补了
// library.html，但 Next 的客户端路由还需要在 __NEXT_P 里注册
// "/library" 这个 entrypoint，hydrate 才能通过
// routeLoader.whenEntrypoint("/library") 拿到页面组件。
//
// 这个文件必须在 main-*.js 之前同步执行：main 里的 initialize()
// 会消费 __NEXT_P 并把它替换成 onEntrypoint 处理器，之后再注册
// 虽然也能走通，但 hydrate 的 whenEntrypoint 可能已经先建好了
// 待决 promise，导致路由永远不初始化（实测 router 恒为 undefined）。
//
// 注册的组件工厂与 /reader 共用同一个模块（library 视图本来就在
// reader 的页面模块里）。模块工厂由 gen_readest_library_chunk.py 挂到
// window.__TALEBOOK_LIBRARY_PAGE__。
//
// 时序：main-*.js 的 initialize() 会把 __NEXT_P 里的注册项用
// setTimeout(...,0) 重放，而这个 setTimeout 会先于 defer 的页面 chunk
// 执行。所以工厂被调用时 __TALEBOOK_LIBRARY_PAGE__ 往往还没挂上。
// 这里返回一个 Promise 等它就绪，而不是直接抛错。
(function () {
    // 同步设置 moke 全局变量（Readest 自己的初始化在模块 23846，
    // 要到 reader 页面组件渲染时才执行，晚于页面 effect 里对
    // __MOKE_EMBEDDED 的读取——竞态会导致 file 参数被忽略、
    // 报「无法打开书籍」甚至被导航回书架）。这里提前同步设置，
    // Readest 自己的初始化随后会覆盖成相同的值，幂等。
    try {
        var q = new URLSearchParams(window.location.search);
        if (q.get('moke') === '1') {
            window.__MOKE_EMBEDDED = true;
            window.__MOKE_EINK = q.get('mokeEink') === '1';
            window.__MOKE_BOOK_ID = q.get('mokeBookId') || null;
            window.__MOKE_SERVER_URL = q.get('mokeServerUrl') || null;
            window.__MOKE_SOURCE_SERVER_URL = q.get('mokeSourceServerUrl') || null;
            window.__MOKE_DEBUG_PANEL = q.get('mokeDebug') === '1';
        }
    } catch (e) { /* 初始化失败不阻断后续注册 */ }

    var P = (window.__NEXT_P = window.__NEXT_P || []);
    if (P.some(function (e) { return e && e[0] === '/library'; })) return;
    P.push(['/library', function () {
        var f = window.__TALEBOOK_LIBRARY_PAGE__;
        if (typeof f === 'function') return f();
        // 等页面 chunk 执行完再取组件。
        return new Promise(function (resolve, reject) {
            var tries = 0;
            var timer = setInterval(function () {
                var g = window.__TALEBOOK_LIBRARY_PAGE__;
                if (typeof g === 'function') {
                    clearInterval(timer);
                    try { resolve(g()); } catch (e) { reject(e); }
                } else if (++tries > 200) {
                    clearInterval(timer);
                    reject(new Error('Readest 书架页面模块加载超时'));
                }
            }, 10);
        });
    }]);
})();
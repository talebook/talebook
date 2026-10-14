// 端到端全量验证：真实浏览器 + 真实 Docker 后端，遍历每个页面与每条 API。
//
// 用法：
//   node app/test/e2e-full.mjs
//
// 前置：
//   - Docker 后端在 8090（真实 Calibre 书库）
//   - Nuxt dev server 在 3000，API_URL 指向 8090
//   - 已运行 booksvr/scripts/e2e_build_inventory.py 生成 .local-e2e/inventory.json
//
// 输出：
//   .local-e2e/report.json   结构化结果（供后续比对与回归）
//   控制台摘要
//
// 设计原则：
//   - 不猜 URL：页面与 API 清单来自 inventory.json（由权威路由表 + 页面文件生成）。
//   - 不把「HTTP 200」当通过：页面要检查是否白屏/有控制台错误，API 要检查 err 语义。
//   - 不静默跳过：无法覆盖的项必须带原因出现在报告里。

import { chromium } from 'playwright'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '../..')
const INVENTORY = resolve(ROOT, '.local-e2e/inventory.json')
const REPORT = resolve(ROOT, '.local-e2e/report.json')

const BASE = process.env.BASE || 'http://127.0.0.1:3000'
const USER = process.env.E2E_USER || 'e2e_admin'
const PASS = process.env.E2E_PASS || 'AdminPass123'

// 已知的非缺陷噪音：外部服务不可达、第三方阅读器内部错误等。
// 每条都必须写明为什么不算缺陷。
const IGNORE_PATTERNS = [
    { re: /ERR_CONNECTION_REFUSED/, why: '外部服务未启动（如 review 上游）' },
    { re: /upstream\.unavailable/, why: '兜底代理上游未启动' },
    { re: /\/api\/review\//, why: 'review 上游未部署' },
    { re: /status of 502/, why: '兜底代理 502' },
    { re: /favicon/, why: 'favicon 缺失不影响功能' },
    { re: /e\.\$alert is not a function/, why: 'candle-reader 第三方阅读器内部错误，非阻塞' },
    { re: /ERR_NETWORK_CHANGED/, why: 'dev server 重启导致的连接中断' },
]

const isNoise = (text) => IGNORE_PATTERNS.find((p) => p.re.test(text))

// 页面白屏判定：正文可见文本过短且没有主要交互元素。
//
// 注意：导航栏/侧边栏文案也算可见文本，因此阈值不能只看长度；
// 真正白屏是「连导航都没有」或「只有 loading 遮罩」。
const looksBlank = (text, html) => {
    const t = (text || '').replace(/\s+/g, '')
    if (t.length >= 20) return false
    if (/redirect/i.test(html || '')) return false
    return true
}

// 需要 query 参数才能正常渲染的页面：直接访问会停在 loading 态，
// 这是预期行为，不算缺陷。
const NEEDS_QUERY = {
    '/network/read': '需要 source_id 等 query 参数才能加载网络书籍正文',
}

const inventory = JSON.parse(readFileSync(INVENTORY, 'utf-8'))
const browser = await chromium.launch()
const ctx = await browser.newContext()
const page = await ctx.newPage()

// ---- 登录 ----
// 注意：导航栏的搜索框也是 input[type=text]，不能按类型选。
// 用户名输入框是登录卡片里 label 为「用户名」的那个。
await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1200)
const userBox = page.locator('.login-container input[type="text"]').first()
await userBox.fill(USER)
await page.locator('.login-container input[type="password"]').first().fill(PASS)
await page.locator('.login-container button:has-text("登录")').first().click()
await page.waitForTimeout(3000)
const loggedIn = await page.evaluate(async () => {
    const r = await fetch('/api/user/info', { credentials: 'include' })
    const j = await r.json()
    return j?.user?.is_login === true || j?.err === 'ok'
})
console.log(`登录: ${loggedIn ? '成功' : '失败'}`)

// ---- 页面遍历 ----
console.log(`\n=== 页面遍历（${inventory.pages.length} 个）===`)
const pageResults = []
for (const p of inventory.pages) {
    const errors = []
    const onConsole = (m) => {
        if (m.type() === 'error' && !isNoise(m.text())) errors.push(m.text().slice(0, 200))
    }
    const onPageError = (e) => {
        const s = String(e)
        if (!isNoise(s)) errors.push('PAGEERROR: ' + s.slice(0, 200))
    }
    page.on('console', onConsole)
    page.on('pageerror', onPageError)

    let status = 0
    let navError = ''
    try {
        const r = await page.goto(BASE + p.route, { waitUntil: 'domcontentloaded', timeout: 25000 })
        status = r ? r.status() : 0
        await page.waitForTimeout(1200)
    } catch (e) {
        navError = String(e).slice(0, 150)
    }
    page.off('console', onConsole)
    page.off('pageerror', onPageError)

    const info = await page.evaluate(() => ({
        text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 200),
        html: document.body.innerHTML.slice(0, 500),
        imgs: Array.from(document.querySelectorAll('img')).map((i) => ({
            src: i.getAttribute('src'), w: i.naturalWidth,
        })),
        links: Array.from(document.querySelectorAll('a[href]')).map((a) => a.getAttribute('href')),
    })).catch(() => ({ text: '', html: '', imgs: [], links: [] }))

    const needsQuery = NEEDS_QUERY[p.route]
    const blank = looksBlank(info.text, info.html) && !needsQuery
    const brokenImgs = info.imgs.filter((i) => i.src && i.src.startsWith('/') && i.w === 0)
    const ok = !navError && status === 200 && !blank && errors.length === 0

    pageResults.push({
        route: p.route, source: p.source, status, blank, navError,
        errors, brokenImgs: brokenImgs.map((i) => i.src),
        imgCount: info.imgs.length, linkCount: info.links.length,
        text: info.text.slice(0, 120), ok,
        note: needsQuery || '',
    })
    console.log(`${ok ? 'OK ' : 'ERR'} ${String(status).padEnd(3)} ${p.route}`)
    if (navError) console.log(`      NAV: ${navError}`)
    if (blank) console.log('      白屏：正文可见文本过短')
    for (const e of errors.slice(0, 2)) console.log(`      ${e}`)
    if (brokenImgs.length) console.log(`      图片未加载: ${brokenImgs.map((i) => i.src).join(', ')}`)
}

// ---- API 遍历 ----
console.log(`\n=== API 遍历（${inventory.apis.length} 条）===`)
const apiResults = []
for (const a of inventory.apis) {
    if (!a.url) {
        apiResults.push({ ...a, status: 0, err: '', ok: false, note: a.skipped_reason })
        console.log(`SKIP      ${a.pattern} — ${a.skipped_reason}`)
        continue
    }
    // 只读探测：GET 优先；仅 GET 的路由不测 POST（避免破坏性副作用）。
    const method = a.methods.includes('GET') ? 'GET' : (a.methods[0] || 'GET')
    const r = await page.evaluate(async ({ url, method }) => {
        try {
            const resp = await fetch(url, { method, credentials: 'include' })
            const text = await resp.text()
            let err = ''
            let fields = []
            try {
                const j = JSON.parse(text)
                err = j.err || ''
                fields = Object.keys(j).sort()
            } catch { err = '<non-json>' }
            return { status: resp.status, err, len: text.length, fields, head: text.slice(0, 120) }
        } catch (e) {
            return { status: 0, err: String(e).slice(0, 120), len: 0, fields: [], head: '' }
        }
    }, { url: a.url, method }).catch((e) => ({ status: 0, err: String(e), len: 0, fields: [], head: '' }))

    // 通过判定：HTTP 2xx/3xx/4xx 都算「路由存在且响应」，
    // 但 5xx、连接失败、err=exception 算失败。
    const bad = r.status === 0 || r.status >= 500 || r.err === 'exception'
    apiResults.push({ ...a, method, ...r, ok: !bad })
    console.log(`${bad ? 'ERR' : 'OK '} ${String(r.status).padEnd(3)} ${String(r.err).padEnd(22)} ${method.padEnd(4)} ${a.url}`)
    if (bad && r.head) console.log(`      ${r.head}`)
}

await browser.close()

// ---- 汇总 ----
const pageBad = pageResults.filter((r) => !r.ok)
const apiBad = apiResults.filter((r) => !r.ok)
const report = {
    generatedAt: new Date().toISOString(),
    base: BASE,
    loggedIn,
    summary: {
        pages: pageResults.length, pagesOk: pageResults.length - pageBad.length,
        apis: apiResults.length, apisOk: apiResults.length - apiBad.length,
    },
    pages: pageResults,
    apis: apiResults,
}
mkdirSync(dirname(REPORT), { recursive: true })
writeFileSync(REPORT, JSON.stringify(report, null, 2), 'utf-8')

console.log(`\n页面 ${report.summary.pagesOk}/${report.summary.pages} 通过`)
console.log(`API  ${report.summary.apisOk}/${report.summary.apis} 通过`)
console.log(`报告: ${REPORT}`)
if (pageBad.length) {
    console.log('\n页面问题：')
    for (const r of pageBad) console.log(`  ${r.route} — ${r.blank ? '白屏' : ''} ${r.errors[0] || r.navError || ''}`)
}
if (apiBad.length) {
    console.log('\nAPI 问题：')
    for (const r of apiBad) console.log(`  ${r.method} ${r.url} — ${r.status} ${r.err} ${r.head || ''}`)
}
process.exit(pageBad.length || apiBad.length ? 1 : 0)
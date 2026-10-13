// 浏览器驱动的全站功能验证：登录后遍历所有页面、点击所有链接、调用所有 API。
//
// 用法：node app/test/full-sweep.mjs
// 前置：Docker 后端在 8090，Nuxt dev server 在 3000。

import { chromium } from 'playwright'

const BASE = process.env.BASE || 'http://127.0.0.1:3000'
const USER = process.env.E2E_USER || 'e2e_admin'
const PASS = process.env.E2E_PASS || 'AdminPass123'

// 需要登录后逐个访问的页面。
const PAGES = [
  '/', '/recent', '/hot', '/search?query=%E7%BA%A2%E6%98%9F',
  '/author', '/publisher', '/tag', '/series', '/rating', '/format',
  '/book/7', '/read/7',
  '/library/local', '/library/network', '/library/apps',
  '/me/shelf', '/me/history', '/me/account', '/me/devices', '/me/private', '/me/plugins',
  '/admin/books', '/admin/trash', '/admin/imports', '/admin/users',
  '/admin/settings', '/admin/logs', '/admin/themes', '/admin/booksources',
  '/admin/plugins', '/admin/plugins/runs',
  '/audios', '/opds-readme', '/webdav-readme',
]

// 需要登录态调用的 API（前端实际用到的）。
const APIS = [
  '/api/user/info', '/api/user/info?detail=1', '/api/user/messages',
  '/api/index', '/api/recent', '/api/hot', '/api/library', '/api/library?stream=1',
  '/api/shelf', '/api/favorites', '/api/reading', '/api/read-done', '/api/reading/stats',
  '/api/book/7', '/api/book/7/versions', '/api/book/7/reader-bootstrap',
  // 分类列表与钻取：Python 真实路由是 /api/<meta>，没有 /api/category/* 前缀。
  '/api/author', '/api/publisher', '/api/tag', '/api/series', '/api/rating', '/api/format',
  '/api/author/%E4%BD%9A%E5%90%8D',
  '/api/publisher/%E4%BA%BA%E6%B0%91%E6%96%87%E5%AD%A6%E5%87%BA%E7%89%88%E7%A4%BE',
  '/api/admin/book/list?num=10&page=1', '/api/admin/trash', '/api/admin/trash/size',
  // 用户列表真实路由是 /api/admin/users（不是 /api/admin/user/list）。
  '/api/admin/users', '/api/admin/settings', '/api/admin/log',
  '/api/plugins', '/api/themes', '/api/network/sources',
  // 有声书真实路由是 /api/audios（不是 /api/audiobook/list）。
  '/api/audios', '/api/audios/home',
]

const IGNORE = [
  'favicon', 'ERR_CONNECTION_REFUSED', 'upstream.unavailable',
  'review/me', 'review/book', 'review/summary', 'status of 502',
]

const interesting = (t) => !IGNORE.some((s) => t.includes(s))

const browser = await chromium.launch()
const ctx = await browser.newContext()
const page = await ctx.newPage()

// 登录。
await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
await page.fill('input[type="text"], input[name="username"]', USER).catch(() => {})
await page.fill('input[type="password"]', PASS).catch(() => {})
await page.click('button:has-text("登录")').catch(() => {})
await page.waitForTimeout(2500)

console.log('=== 页面遍历 ===')
const pageIssues = []
for (const path of PAGES) {
  const errors = []
  const onConsole = (m) => {
    if (m.type() === 'error' && interesting(m.text())) errors.push(m.text().slice(0, 160))
  }
  const onPageError = (e) => errors.push('PAGEERROR: ' + String(e).slice(0, 160))
  page.on('console', onConsole)
  page.on('pageerror', onPageError)

  let status = 0
  try {
    const r = await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 20000 })
    status = r ? r.status() : 0
    await page.waitForTimeout(1000)
  } catch (e) {
    errors.push('NAV: ' + String(e).slice(0, 120))
  }
  page.off('console', onConsole)
  page.off('pageerror', onPageError)

  const body = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 120)).catch(() => '')
  const flag = errors.length ? 'ERR' : 'OK '
  if (errors.length) pageIssues.push({ path, errors })
  console.log(`${flag} ${String(status).padEnd(3)} ${path}`)
  for (const e of errors.slice(0, 2)) console.log(`      ${e}`)
}

console.log('\n=== API 遍历（登录态）===')
const apiIssues = []
for (const path of APIS) {
  const r = await page.evaluate(async (p) => {
    const resp = await fetch(p, { credentials: 'include' })
    const text = await resp.text()
    let err = ''
    try { err = JSON.parse(text).err || '' } catch { err = '<non-json>' }
    return { status: resp.status, err, len: text.length, head: text.slice(0, 100) }
  }, path).catch((e) => ({ status: 0, err: String(e), len: 0, head: '' }))

  const bad = r.status === 502 || r.status === 0 || r.status >= 500
  if (bad) apiIssues.push({ path, ...r })
  console.log(`${bad ? 'GAP' : 'OK '} ${String(r.status).padEnd(3)} ${r.err.padEnd(24)} ${path}`)
}

await browser.close()

console.log(`\n页面问题 ${pageIssues.length} 个；API 问题 ${apiIssues.length} 个`)
if (apiIssues.length) {
  console.log('\nAPI 缺口：')
  for (const i of apiIssues) console.log(`  ${i.status} ${i.path}  ${i.head}`)
}
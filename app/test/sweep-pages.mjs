// 用真实浏览器遍历全部前端页面，收集控制台错误与页面异常。
//
// 用法：node app/test/sweep-pages.mjs
// 前置：Docker 后端在 8090，Nuxt dev server 在 3000。

import { chromium } from 'playwright'

const BASE = process.env.BASE || 'http://127.0.0.1:3000'
const USER = process.env.E2E_USER || 'e2e_admin'
const PASS = process.env.E2E_PASS || 'AdminPass123'

const PAGES = [
  '/',
  '/login',
  '/recent',
  '/hot',
  '/search?query=%E7%BA%A2%E6%98%9F',
  '/category',
  '/category/author',
  '/category/publisher',
  '/category/tag',
  '/category/series',
  '/category/rating',
  '/category/format',
  '/author',
  '/publisher',
  '/tag',
  '/series',
  '/rating',
  '/format',
  '/book/7',
  '/read/7',
  '/admin/books',
  '/admin/trash',
  '/admin/imports',
  '/admin/users',
  '/admin/settings',
  '/admin/logs',
  '/admin/themes',
  '/admin/booksources',
  '/admin/plugins',
  '/admin/plugins/runs',
  '/audiobooks',
  '/comics',
  '/network',
  '/favorites',
  '/messages',
  '/profile',
  '/about',
]

const IGNORE = [
  'favicon',
  'ERR_CONNECTION_REFUSED',
  'upstream.unavailable',
  'Failed to load resource: the server responded with a status of 502',
  'review/me',
  'review/book',
  'review/summary',
]

function interesting(text) {
  return !IGNORE.some((s) => text.includes(s))
}

const browser = await chromium.launch()
const ctx = await browser.newContext()
const page = await ctx.newPage()

// 先登录，拿到会话。
await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
await page.fill('input[type="text"], input[name="username"]', USER).catch(() => {})
await page.fill('input[type="password"]', PASS).catch(() => {})
await page.click('button:has-text("登录")').catch(() => {})
await page.waitForTimeout(2500)

const results = []
for (const path of PAGES) {
  const errors = []
  const onConsole = (m) => {
    if (m.type() === 'error' && interesting(m.text())) errors.push(m.text().slice(0, 200))
  }
  const onPageError = (e) => errors.push('PAGEERROR: ' + String(e).slice(0, 200))
  page.on('console', onConsole)
  page.on('pageerror', onPageError)

  let status = 0
  try {
    const resp = await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 20000 })
    status = resp ? resp.status() : 0
    await page.waitForTimeout(1200)
  } catch (e) {
    errors.push('NAV: ' + String(e).slice(0, 150))
  }

  page.off('console', onConsole)
  page.off('pageerror', onPageError)

  const body = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 160)).catch(() => '')
  results.push({ path, status, errors, body })
}

await browser.close()

let bad = 0
for (const r of results) {
  const flag = r.errors.length ? 'ERR' : 'OK '
  if (r.errors.length) bad++
  console.log(`${flag} ${String(r.status).padEnd(3)} ${r.path}`)
  if (r.errors.length) {
    for (const e of r.errors.slice(0, 3)) console.log(`      ${e}`)
  }
}
console.log(`\n共 ${results.length} 页；有错误 ${bad} 页`)
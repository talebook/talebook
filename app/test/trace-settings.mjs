// 抓取 /admin/settings 的 forEach 报错完整堆栈。
import { chromium } from 'playwright'

const BASE = process.env.BASE || 'http://127.0.0.1:3000'
const browser = await chromium.launch()
const ctx = await browser.newContext()
const page = await ctx.newPage()

await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
await page.fill('input[type="text"], input[name="username"]', 'e2e_admin').catch(() => {})
await page.fill('input[type="password"]', 'AdminPass123').catch(() => {})
await page.click('button:has-text("登录")').catch(() => {})
await page.waitForTimeout(2500)

page.on('pageerror', (e) => {
  console.log('=== PAGEERROR ===')
  console.log(e.stack || String(e))
})

await page.goto(`${BASE}/admin/settings`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(3000)

// 逐个设置子页也试一遍。
for (const p of ['/admin/settings/general', '/admin/settings/plugins', '/admin/settings/themes']) {
  console.log(`--- ${p} ---`)
  await page.goto(BASE + p, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)
}

await browser.close()
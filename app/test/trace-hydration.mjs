// 抓取 /book/7 的水合不匹配详情。
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

page.on('console', (m) => {
  const t = m.text()
  if (/mismatch|hydrat/i.test(t)) {
    console.log('=== CONSOLE ===')
    console.log(t.slice(0, 3000))
  }
})

await page.goto(`${BASE}/book/7`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4000)

await browser.close()
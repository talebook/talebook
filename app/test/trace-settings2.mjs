// 精确定位 /admin/settings 的 forEach 报错：打印完整堆栈与接口响应。
import { chromium } from 'playwright'

const BASE = process.env.BASE || 'http://127.0.0.1:3000'
const browser = await chromium.launch()
const ctx = await browser.newContext()
const page = await ctx.newPage()

await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
await page.fill('input[name="name"], input[type="text"]', 'e2e_admin').catch(() => {})
await page.fill('input[type="password"]', 'AdminPass123').catch(() => {})
await page.click('button:has-text("登录")').catch(() => {})
await page.waitForTimeout(2500)

// 先看接口在浏览器里返回什么
const api = await page.evaluate(async () => {
    const r = await fetch('/api/admin/settings', { credentials: 'include' })
    const t = await r.text()
    let keys = []
    let snsType = 'n/a'
    try {
        const j = JSON.parse(t)
        keys = Object.keys(j).sort()
        snsType = Array.isArray(j.sns) ? `array(${j.sns.length})` : typeof j.sns
    } catch { }
    return { status: r.status, keys, snsType, head: t.slice(0, 200) }
})
console.log('浏览器内 /api/admin/settings:', JSON.stringify(api, null, 2))

page.on('pageerror', (e) => {
    console.log('=== PAGEERROR ===')
    console.log(e.stack || String(e))
})

await page.goto(`${BASE}/admin/settings`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4000)

await browser.close()
// 抓取 /logout 水合不匹配的完整组件栈。
import { chromium } from 'playwright'

const BASE = process.env.BASE || 'http://127.0.0.1:3000'
const browser = await chromium.launch()
const ctx = await browser.newContext()
const page = await ctx.newPage()

await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1200)
await page.locator('.login-container input[type="text"]').first().fill('e2e_admin')
await page.locator('.login-container input[type="password"]').first().fill('AdminPass123')
await page.locator('.login-container button:has-text("登录")').first().click()
await page.waitForTimeout(3000)

page.on('console', (m) => {
    const t = m.text()
    if (/mismatch/i.test(t)) {
        console.log('=====')
        console.log(t.slice(0, 2500))
    }
})

await page.goto(`${BASE}/logout`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(3500)

await browser.close()
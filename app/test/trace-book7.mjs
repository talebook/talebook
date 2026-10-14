// 定位 /book/7 剩余的节点结构不匹配（div vs comment）。
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
    if (/node mismatch/i.test(t)) {
        console.log('=====')
        console.log(t.slice(0, 1800))
    }
})

await page.goto(`${BASE}/book/7`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(3500)

await browser.close()
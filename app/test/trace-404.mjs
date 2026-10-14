// 定位页面里的 404 资源请求。
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

const targets = process.argv.slice(2)
for (const route of targets) {
    const bad = []
    const onResp = (r) => {
        if (r.status() >= 400) bad.push(`${r.status()} ${r.request().method()} ${r.url()}`)
    }
    page.on('response', onResp)
    await page.goto(BASE + route, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)
    page.off('response', onResp)
    console.log(`--- ${route} ---`)
    for (const b of bad) console.log('  ' + b)
    if (!bad.length) console.log('  (无 4xx/5xx)')
}

await browser.close()
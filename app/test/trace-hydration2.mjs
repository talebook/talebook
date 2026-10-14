// 抓取多个页面的水合不匹配详情，定位共同根因。
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

const routes = process.argv.slice(2)
for (const route of routes) {
    const msgs = []
    const onConsole = (m) => {
        const t = m.text()
        if (/mismatch/i.test(t)) msgs.push(t)
    }
    page.on('console', onConsole)
    await page.goto(BASE + route, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)
    page.off('console', onConsole)

    console.log(`\n===== ${route} =====`)
    if (!msgs.length) { console.log('  (无水合警告)'); continue }
    // 只打印第一条的头部（含 server/client 差异），去掉冗长的组件栈
    for (const m of msgs.slice(0, 3)) {
        const lines = m.split('\n').filter((l) => !/^\s+at </.test(l))
        console.log(lines.join('\n').slice(0, 700))
        console.log('  ---')
    }
}

await browser.close()
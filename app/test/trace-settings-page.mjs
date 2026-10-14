// 检查 /admin/settings/general 页面上每个可交互控件对应的接口是否可用。
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

await page.goto(`${BASE}/admin/settings/general`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(3000)

// 页面上的按钮清单
const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button'))
        .map((b) => b.innerText.trim())
        .filter((t) => t && t.length < 30)
})

// 逐个探测该页会用到的接口
const endpoints = [
    ['GET', '/api/admin/settings'],
    ['GET', '/api/admin/update'],
    ['GET', '/api/admin/ssl'],
    ['GET', '/api/admin/trash/size'],
    ['GET', '/api/admin/trash'],
]
const results = []
for (const [method, url] of endpoints) {
    const r = await page.evaluate(async ({ method, url }) => {
        const resp = await fetch(url, { method, credentials: 'include' })
        const t = await resp.text()
        let err = ''
        try { err = JSON.parse(t).err || '' } catch { err = '<non-json>' }
        return { status: resp.status, err, head: t.slice(0, 100) }
    }, { method, url })
    results.push({ method, url, ...r })
}

console.log('页面按钮:', JSON.stringify([...new Set(buttons)], null, 0))
console.log('\n接口探测:')
for (const r of results) {
    console.log(`  ${r.status} ${r.err.padEnd(22)} ${r.method} ${r.url}`)
    if (/未接线|not_wired/.test(r.head)) console.log(`      ⚠ ${r.head}`)
}

await browser.close()
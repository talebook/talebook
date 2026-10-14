// 检查 /nav 页面的空状态与 store.sys 数据。
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

await page.goto(`${BASE}/nav`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(3000)

const info = await page.evaluate(async () => {
    const r = await fetch('/api/user/info', { credentials: 'include' })
    const j = await r.json()
    return {
        sysBooks: j?.sys?.books,
        hasEmptyState: !!document.querySelector('.empty-state'),
        emptyVisible: (() => {
            const el = document.querySelector('.empty-state')
            return el ? el.offsetParent !== null : false
        })(),
        bodyText: document.body.innerText.replace(/\n{2,}/g, '\n').slice(0, 400),
    }
})
console.log(JSON.stringify(info, null, 2))

await browser.close()
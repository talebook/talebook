// 对比 /book/7 元数据列的服务端 HTML 与客户端渲染结果，找出结构差异。
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

// 客户端渲染后的元数据列结构
await page.goto(`${BASE}/book/7`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(3500)
const clientRows = await page.evaluate(() => {
    const col = document.querySelectorAll('.book-facts__row')
    return Array.from(col).map((r) => ({
        label: r.querySelector('dt')?.innerText?.trim() || '',
        hasChips: !!r.querySelector('.v-chip'),
        html: r.outerHTML.slice(0, 120),
    }))
})
console.log('客户端 .book-facts__row 数量:', clientRows.length)
for (const r of clientRows) console.log(`  [${r.label}] chips=${r.hasChips}`)

// 服务端 HTML 里的行数
const ssr = await page.evaluate(async () => {
    const r = await fetch(location.href, { headers: { 'x-ssr-probe': '1' } })
    const t = await r.text()
    const m = t.match(/book-facts__row/g)
    return { count: m ? m.length : 0 }
})
console.log('服务端 HTML 里 book-facts__row 出现次数:', ssr.count)

await browser.close()
// 逐行对比服务端 HTML 与客户端 DOM 的元数据列，找出第一个结构差异。
import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'

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

// 拿服务端 HTML（用 curl 之外的方式：直接请求并保存）
const ssrHtml = await page.evaluate(async () => {
    const r = await fetch('/book/7', { headers: { accept: 'text/html' } })
    return await r.text()
})
writeFileSync('../.local-e2e/ssr-book7.html', ssrHtml, 'utf-8')

await page.goto(`${BASE}/book/7`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(3500)
const clientHtml = await page.evaluate(() => {
    const col = document.querySelector('.book-metadata')
    return col ? col.outerHTML : ''
})
writeFileSync('../.local-e2e/client-book7.html', clientHtml, 'utf-8')

// 提取服务端那一列
const m = ssrHtml.match(/<div class="book-metadata"[\s\S]*?<\/dl>/)
writeFileSync('../.local-e2e/ssr-metadata.html', m ? m[0] : '(未找到)', 'utf-8')

console.log('服务端 metadata 长度:', m ? m[0].length : 0)
console.log('客户端 metadata 长度:', clientHtml.length)
console.log('已写入 .local-e2e/ssr-metadata.html 与 client-book7.html')

await browser.close()
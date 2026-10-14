// 诊断浏览器登录为何不生效。
import { chromium } from 'playwright'

const BASE = process.env.BASE || 'http://127.0.0.1:3000'
const browser = await chromium.launch()
const ctx = await browser.newContext()
const page = await ctx.newPage()

const reqs = []
page.on('request', (r) => {
    if (r.url().includes('/api/')) reqs.push(`REQ ${r.method()} ${r.url()}`)
})
page.on('response', async (r) => {
    if (r.url().includes('/api/user/sign_in')) {
        let body = ''
        try { body = (await r.text()).slice(0, 200) } catch { }
        reqs.push(`RESP ${r.status()} ${r.url()} :: ${body}`)
    }
})

await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1000)

// 打印表单结构
const form = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input')).map((i) => ({
        type: i.type, name: i.name, id: i.id, visible: i.offsetParent !== null,
    }))
    const btns = Array.from(document.querySelectorAll('button')).map((b) => b.innerText.trim()).filter(Boolean)
    return { inputs, btns }
})
console.log('表单:', JSON.stringify(form, null, 2))

await page.fill('input[name="name"]', 'e2e_admin')
await page.fill('input#password', 'AdminPass123')
await page.click('button:has-text("登录")')
await page.waitForTimeout(4000)

const after = await page.evaluate(async () => {
    const r = await fetch('/api/user/info', { credentials: 'include' })
    const j = await r.json()
    return {
        url: location.href,
        isLogin: j?.user?.is_login,
        err: j?.err,
        cookies: document.cookie,
        alertText: document.body.innerText.match(/网络错误|密码|错误|失败/)?.[0] || '',
    }
})
console.log('登录后:', JSON.stringify(after, null, 2))
console.log('请求记录:')
for (const r of reqs) console.log('  ' + r)

await browser.close()
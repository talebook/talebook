// 检查登录表单的第二个输入框与提交拦截原因。
import { chromium } from 'playwright'

const BASE = process.env.BASE || 'http://127.0.0.1:3000'
const browser = await chromium.launch()
const ctx = await browser.newContext()
const page = await ctx.newPage()

await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1500)

const info = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input')).map((i) => {
        const wrap = i.closest('.v-input, .v-field, [class*=captcha]')
        return {
            type: i.type, name: i.name, id: i.id,
            placeholder: i.placeholder,
            ariaLabel: i.getAttribute('aria-label'),
            wrapClass: wrap ? wrap.className.slice(0, 80) : '',
            parentText: i.parentElement?.parentElement?.innerText?.slice(0, 60) || '',
        }
    })
    // 找验证码相关组件
    const captcha = Array.from(document.querySelectorAll('[class*=captcha], [data-testid*=captcha]'))
        .map((e) => ({ tag: e.tagName, cls: e.className.slice(0, 80), text: e.innerText.slice(0, 80) }))
    return { inputs, captcha, bodyText: document.body.innerText.replace(/\n{2,}/g, '\n').slice(0, 600) }
})
console.log(JSON.stringify(info, null, 2))

await browser.close()
# CLAUDE.md

本文件为 Claude Code 在 `app/` 目录中工作时提供指引。

## 技术栈

Nuxt 4 + Vue 3 + Vuetify 3 + Pinia + @nuxtjs/i18n，使用 TypeScript。

## 常用命令

```bash
npm install
npm run dev          # 开发服务器，http://localhost:3000
npm run build        # SSR 生产构建
npm run generate     # SPA/静态构建，输出到 dist/
npm run lint         # eslint 检查
npm run lint:fix     # eslint 自动修复

# 单元测试（vitest + happy-dom）
npx vitest run test/components/

# E2E 测试（Playwright，需先启动 mock server）
npx playwright test
```

## 架构

### API 调用方式

所有后端请求通过 `plugins/talebook.js` 中的 `backend(url, options)` 函数发起，**不要**直接使用 `fetch` 或 `useFetch`。该函数负责：
- SSR 环境下拼接 `config.public.api_url` 作为服务端地址，浏览器端使用 `window.location.origin`
- 统一处理 413/502 等错误状态码并弹出提示
- 自动转发 cookie 和 X-Forwarded-* 请求头（SSR 场景）

URL 路由在 `nuxt.config.ts` 的 `routeRules` 中将 `/api/**`、`/get/**`、`/read/**` 代理到后端，开发环境默认代理到 `http://127.0.0.1:8000`。

### 全局状态

只有一个 Pinia store：`stores/main.ts`（`useMainStore`），包含：
- `user` — 当前登录用户信息（`is_login`、`is_admin`、`nickname` 等）
- `sys` — 站点配置（`socials`、`allow`、`footer` 等），由登录接口一并返回
- `alert` — 全局通知弹窗状态
- `theme` — 明/暗主题，通过 cookie 持久化
- `loading` / `nav` — 页面加载状态和导航栏显示状态

### 国际化

使用 `@nuxtjs/i18n` 懒加载，语言文件在 `i18n/locales/zh-CN.json` 和 `en-US.json`。默认及回退语言均为 `zh-CN`。

**注意**：执行 `npm run generate`（SPA 静态构建）时，`_i18n/` 语言文件不会自动输出到 `dist/`，需额外处理，否则 i18n key 会在页面上直接显示为原始字符串。

### 测试

- **单元测试**：`test/components/`，使用 vitest + `@nuxt/test-utils`，运行环境为 `happy-dom`
- **E2E 测试**：`test/e2e/`，使用 Playwright，依赖项目根目录下的 `mock-server.js` 模拟后端（需先启动 `node mock-server.js`）；测试数据在 `test/e2e/mocks/` 下的 JSON 文件中

## 测试要求

**每新增一个 feature，必须添加对应的测试用例。** 根据改动类型选择测试层级：

### 组件单元测试（`test/components/`）

适用于新增或修改 `components/` 下的 Vue 组件。使用 vitest + `@vue/test-utils`，需手动挂载 Vuetify：

```typescript
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import MyComponent from '@/components/MyComponent.vue';

const vuetify = createVuetify({ components, directives });

describe('MyComponent.vue', () => {
    it('renders correctly', () => {
        const wrapper = mount(MyComponent, {
            global: { plugins: [vuetify] },
            props: { ... }
        });
        expect(wrapper.text()).toContain('预期文字');
    });
});
```

运行：`npx vitest run test/components/`

### E2E 页面测试（`test/e2e/`）

适用于新增或修改 `pages/` 下的页面。使用 Playwright，测试前需启动 mock server（`node mock-server.js`），如需新的接口数据，在 `test/e2e/mocks/` 下添加对应 JSON 文件：

```typescript
import { test, expect } from '@playwright/test';

test.describe('My Page', () => {
    test.beforeEach(async ({ request }) => {
        // 重置 mock server 状态
        await request.post('http://127.0.0.1:8000/_test/reset', {
            data: { installed: true }
        });
    });

    test('displays expected content', async ({ page }) => {
        await page.goto('/my-page');
        await expect(page.getByText('预期文字')).toBeVisible();
    });
});
```

运行：`npx playwright test`

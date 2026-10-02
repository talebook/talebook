import { defineConfig } from '@playwright/test';

process.env.MOCK_API_URL = 'http://127.0.0.1:18080';

export default defineConfig({
    testDir: './e2e',
    testMatch: /admin-import-task.spec.ts/,
    workers: 1,
    timeout: 60000,
    use: {
        baseURL: 'http://127.0.0.1:13000',
        locale: 'zh-CN',
        launchOptions: process.env.SCAN_CHROMIUM ? { executablePath: process.env.SCAN_CHROMIUM } : {},
    },
    webServer: [
        { command: `${process.execPath} test/mock-server.js`, cwd: process.cwd(), port: 18080, env: { PORT: '18080' } },
        { command: `${process.execPath} node_modules/nuxt/bin/nuxt.mjs dev --port 13000 --host 127.0.0.1`,
            cwd: process.cwd(), port: 13000, timeout: 180000, env: { API_URL: 'http://127.0.0.1:18080' } },
    ],
});

import { defineConfig } from '@playwright/test';

// Isolated, short lived mock services are owned and stopped by Playwright.
export default defineConfig({
    testDir: './test/e2e',
    testMatch: 'audiobook-progress-v2.spec.ts',
    workers: 1,
    retries: 0,
    timeout: 120000,
    use: {
        baseURL: 'http://127.0.0.1:3009',
        locale: 'zh-CN',
        launchOptions: process.env.TB234_CHROMIUM_PATH ? { executablePath: process.env.TB234_CHROMIUM_PATH } : {},
    },
    webServer: [
        { command: 'PORT=8089 node test/mock-server.js', url: 'http://127.0.0.1:8089/api/welcome', timeout: 120000 },
        { command: 'API_URL=http://127.0.0.1:8089 npx nuxt dev --port 3009 --host 127.0.0.1', url: 'http://127.0.0.1:3009', timeout: 120000 },
    ],
});

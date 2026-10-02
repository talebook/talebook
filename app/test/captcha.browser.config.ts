import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    testMatch: 'book-captcha.spec.ts',
    outputDir: fileURLToPath(new URL('../../../captcha-browser-results', import.meta.url)),
    timeout: 60000,
    workers: 1,
    expect: { timeout: 30000 },
    use: {
        baseURL: 'http://127.0.0.1:13001', locale: 'zh-CN',
        launchOptions: { executablePath: process.env.CHROME_BIN, args: process.env.CHROME_ARGS ? JSON.parse(process.env.CHROME_ARGS) : [] },
    },
    webServer: [
        { cwd: fileURLToPath(new URL('..', import.meta.url)), command: 'PORT=18082 node test/mock-server.js', url: 'http://127.0.0.1:18082/api/welcome', timeout: 60000 },
        { cwd: fileURLToPath(new URL('..', import.meta.url)), command: 'API_URL=http://127.0.0.1:18082 npx nuxt dev --port 13001 --host 127.0.0.1', url: 'http://127.0.0.1:13001', timeout: 120000 },
    ],
});

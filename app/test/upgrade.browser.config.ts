import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    testMatch: 'application-upgrade.spec.ts',
    workers: 1,
    use: {
        baseURL: process.env.TALEBOOK_UPGRADE_URL,
        locale: 'zh-CN',
        launchOptions: { executablePath: process.env.CHROME_BIN || '/usr/bin/chromium', args: ['--no-sandbox'] },
    },
});

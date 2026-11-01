import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig(base, {
    testMatch: ['lan-discovery.spec.ts', 'settings.spec.ts'],
    use: { baseURL: 'http://127.0.0.1:18187' },
    webServer: [
        {
            command: 'node test/mock-server.js',
            env: { PORT: '18186' },
            url: 'http://127.0.0.1:18186/api/user/info',
            reuseExistingServer: false,
        },
        {
            command: 'node .output/server/index.mjs',
            env: { HOST: '127.0.0.1', PORT: '18187' },
            url: 'http://127.0.0.1:18187',
            reuseExistingServer: false,
        },
    ],
});

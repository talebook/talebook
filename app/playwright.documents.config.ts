import { defineConfig } from '@playwright/test';
import base from './playwright.config';
export default defineConfig({ ...base, webServer: [
    { command: 'PORT=18318 node test/mock-server.js', url: 'http://127.0.0.1:18318/api/welcome', reuseExistingServer: false },
    { command: 'API_URL=http://127.0.0.1:18318 npx nuxt dev --host 127.0.0.1 --port 18319', url: 'http://127.0.0.1:18319', timeout: 120000, reuseExistingServer: false },
], use: { ...base.use, baseURL: 'http://127.0.0.1:18319' } });

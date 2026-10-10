import { defineConfig } from '@playwright/test';
import base from './playwright.library.config';

export default defineConfig(base, {
    testMatch: ['home.spec.ts', 'history-cards.spec.ts', 'shelf.spec.ts'],
    reporter: 'list',
    use: {
        launchOptions: {
            executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
        },
    },
});

import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// Own both services so local runs and CI exercise the same production build.
export default defineConfig(base, {
    testMatch: ['library.spec.ts', 'metadata-api.spec.ts'],
    use: { baseURL: 'http://127.0.0.1:9000' },
    reporter: [['list'], ['junit', { outputFile: 'test-results/library.xml' }]],
    webServer: [
        {
            command: 'node test/mock-server.js',
            env: { PORT: '8080' },
            url: 'http://127.0.0.1:8080/api/user/info',
            reuseExistingServer: false,
            stdout: 'pipe',
            stderr: 'pipe',
        },
        {
            command: 'node .output/server/index.mjs',
            env: { HOST: '127.0.0.1', PORT: '9000' },
            url: 'http://127.0.0.1:9000',
            reuseExistingServer: false,
            stdout: 'pipe',
            stderr: 'pipe',
        },
    ],
});

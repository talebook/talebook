import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './test/e2e',
    testMatch: 'audiobook-offline.spec.ts',
    workers: 1,
    retries: 0,
    timeout: 180000,
    globalTeardown: './test/offline-teardown.ts',
    use: {
        baseURL: 'http://127.0.0.1:3010',
        locale: 'zh-CN',
        launchOptions: process.env.TB234_CHROMIUM_PATH ? { executablePath: process.env.TB234_CHROMIUM_PATH } : {},
    },
    webServer: [
        {
            command: 'docker run --rm --name tb234-offline-f06cd9a7acfe --network host -v "$PWD/..:/workspace" -w /workspace -e PYTHONPATH=. --entrypoint python3 tb234-3316-test-env tests/audiobook_offline_server.py',
            url: 'http://127.0.0.1:8091/api/welcome',
            timeout: 120000,
        },
        { command: 'API_URL=http://127.0.0.1:8091 npx nuxt dev --port 3010 --host 127.0.0.1', url: 'http://127.0.0.1:3010', timeout: 120000 },
    ],
});

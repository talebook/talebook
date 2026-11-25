import { defineVitestConfig } from '@nuxt/test-utils/config';
export default defineVitestConfig({
    test: {
        environment: 'happy-dom',
        globalSetup: './test/global-setup.ts',
        globals: true,
    }
});

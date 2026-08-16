import { defineVitestConfig } from '@nuxt/test-utils/config';
import { fileURLToPath } from 'node:url';

export default defineVitestConfig({
    test: {
        alias: {
            '#build/i18n-options.mjs': fileURLToPath(
                new URL('./test/fixtures/i18n-options.mjs', import.meta.url),
            ),
        },
        environment: 'happy-dom',
        globals: true,
    }
});

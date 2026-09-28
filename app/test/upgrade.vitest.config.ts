import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
    plugins: [vue()],
    resolve: { alias: { '@': fileURLToPath(new URL('..', import.meta.url)) } },
    test: { server: { deps: { inline: ['vuetify'] } }, environment: 'happy-dom', include: ['test/components/ApplicationUpgrade.spec.ts'] },
});

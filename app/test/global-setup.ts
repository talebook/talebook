import { copyFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

export default function setup() {
    const buildDir = resolve('node_modules/.cache/nuxt/.nuxt');
    mkdirSync(buildDir, { recursive: true });
    copyFileSync(resolve('test/fixtures/i18n-options.mjs'), resolve(buildDir, 'i18n-options.mjs'));
}

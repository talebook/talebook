import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const appRoot = process.cwd();
const repositoryRoot = resolve(appRoot, '..');
const staticRoot = resolve(appRoot, 'public/static/komga-reader');
const backendTemplatePath = resolve(repositoryRoot, 'webserver/resources/book/comic-reader.html');

describe('comic reader static distribution', () => {
    it('pins the backend host page cache key to the recorded immutable upstream commit', () => {
        const version = readFileSync(resolve(repositoryRoot, 'komga-reader-version.txt'), 'utf8').trim();
        const handler = readFileSync(resolve(repositoryRoot, 'webserver/handlers/comic.py'), 'utf8');
        const template = readFileSync(backendTemplatePath, 'utf8');

        expect(version).toMatch(/^[0-9a-f]{40}$/);
        expect(handler).toContain(`KOMGA_READER_VERSION = "${version}"`);
        expect(template).toContain('komga-reader.es.js?v=${readerVersion}');
        expect(existsSync(resolve(appRoot, 'pages/read-comic'))).toBe(false);
    });

    it('routes read-comic through Tornado in production and local Nuxt development', () => {
        for (const name of ['dev.conf', 'talebook.conf', 'server-side-render.conf']) {
            const config = readFileSync(resolve(repositoryRoot, 'conf/nginx', name), 'utf8');
            expect(config).toMatch(/location ~ \^\/\([^\n]*read-comic[^\n]*\)\//);
        }

        const nuxtConfig = readFileSync(resolve(appRoot, 'nuxt.config.ts'), 'utf8');
        expect(nuxtConfig).toContain("'/read-comic/**': { proxy:");
        expect(nuxtConfig).toContain("+ '/read-comic/**'");
    });

    it('ships a self-contained ESM facade, stylesheet, and license notices', () => {
        const moduleSource = readFileSync(resolve(staticRoot, 'komga-reader.es.js'), 'utf8');
        const stylesheet = readFileSync(resolve(staticRoot, 'style.css'), 'utf8');

        expect(moduleSource).not.toMatch(/\bfrom\s+["']vue["']/);
        expect(moduleSource).not.toContain('process.env');
        expect(moduleSource).toMatch(/\bas Reader\b/);
        expect(moduleSource).toContain('destroy');
        expect(stylesheet).toContain('.kr-reader');
        expect(readFileSync(resolve(staticRoot, 'LICENSE'), 'utf8')).toContain('MIT License');
        expect(readFileSync(resolve(staticRoot, 'THIRD_PARTY_NOTICES'), 'utf8')).toContain('Vue.js');
    });
});

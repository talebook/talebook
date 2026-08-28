import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const appRoot = process.cwd();
const repositoryRoot = resolve(appRoot, '..');
const staticRoot = resolve(appRoot, 'public/static/komga-reader');

describe('comic reader static distribution', () => {
    it('pins the page cache key to the recorded immutable upstream commit', () => {
        const version = readFileSync(resolve(repositoryRoot, 'komga-reader-version.txt'), 'utf8').trim();
        const page = readFileSync(resolve(appRoot, 'pages/read-comic/[bookId].vue'), 'utf8');

        expect(version).toMatch(/^[0-9a-f]{40}$/);
        expect(page).toContain(`const READER_VERSION = '${version}'`);
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

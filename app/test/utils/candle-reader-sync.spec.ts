import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { syncCandleReader, TARGET_DIR, VERSION_MARKER } from '../../modules/candle-reader/sync';

const appRoot = process.cwd();

function installFakePackage(root: string, version: string, script = 'export class Reader {}') {
    const packageRoot = join(root, 'node_modules/@talebook/candle-reader');
    rmSync(packageRoot, { recursive: true, force: true });
    mkdirSync(join(packageRoot, 'dist/css'), { recursive: true });
    writeFileSync(join(packageRoot, 'package.json'), JSON.stringify({ name: '@talebook/candle-reader', version }));
    writeFileSync(join(packageRoot, 'dist/candle-reader.es.js'), script);
    writeFileSync(join(packageRoot, 'dist/css/themes.css'), '.theme {}');
}

describe('candle reader npm sync', () => {
    let root: string;

    beforeEach(() => {
        root = mkdtempSync(join(tmpdir(), 'candle-sync-'));
    });

    afterEach(() => {
        rmSync(root, { recursive: true, force: true });
    });

    it('copies the locked package dist into the static directory and records its version', () => {
        installFakePackage(root, '26.10.9');

        expect(syncCandleReader(root, {})).toBe('copied');

        const target = join(root, TARGET_DIR);
        expect(readFileSync(join(target, 'candle-reader.es.js'), 'utf8')).toBe('export class Reader {}');
        expect(existsSync(join(target, 'css/themes.css'))).toBe(true);
        expect(readFileSync(join(target, VERSION_MARKER), 'utf8').trim()).toBe('26.10.9');
    });

    it('skips an identical copy and restores the package when files or the version change', () => {
        installFakePackage(root, '26.10.9');
        syncCandleReader(root, {});
        writeFileSync(join(root, TARGET_DIR, 'stale.js'), 'old');

        expect(syncCandleReader(root, {})).toBe('copied');
        expect(existsSync(join(root, TARGET_DIR, 'stale.js'))).toBe(false);
        expect(syncCandleReader(root, {})).toBe('up-to-date');

        installFakePackage(root, '26.10.10', 'export class Reader { v2 = true }');
        expect(syncCandleReader(root, {})).toBe('copied');
        expect(existsSync(join(root, TARGET_DIR, 'stale.js'))).toBe(false);
        expect(readFileSync(join(root, TARGET_DIR, 'candle-reader.es.js'), 'utf8')).toContain('v2');
    });

    it('keeps a locally installed reader when CANDLE_READER_SKIP_SYNC=1', () => {
        installFakePackage(root, '26.10.9');
        mkdirSync(join(root, TARGET_DIR), { recursive: true });
        writeFileSync(join(root, TARGET_DIR, 'candle-reader.es.js'), 'local build');

        expect(syncCandleReader(root, { CANDLE_READER_SKIP_SYNC: '1' })).toBe('skipped');
        expect(readFileSync(join(root, TARGET_DIR, 'candle-reader.es.js'), 'utf8')).toBe('local build');
    });

    it('restores the locked package over a local build that kept the version marker', () => {
        installFakePackage(root, '26.10.9');
        syncCandleReader(root, {});
        writeFileSync(join(root, TARGET_DIR, 'candle-reader.es.js'), 'local build');

        expect(syncCandleReader(root, {})).toBe('copied');
        expect(readFileSync(join(root, TARGET_DIR, 'candle-reader.es.js'), 'utf8')).toBe('export class Reader {}');
    });

    it('fails with an install hint when the package is missing', () => {
        expect(() => syncCandleReader(root, {})).toThrow(/npm ci/);
    });

    it('is wired to the locked npm package instead of committed build output', () => {
        const pkg = JSON.parse(readFileSync(resolve(appRoot, 'package.json'), 'utf8'));
        expect(pkg.dependencies['@talebook/candle-reader']).toMatch(/^\d+\.\d+\.\d+$/);
        expect(readFileSync(resolve(appRoot, '.gitignore'), 'utf8')).toContain('/public/static/candle-reader/');
    });
});

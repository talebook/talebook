import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { baseCompile } from '@intlify/message-compiler';
import { createI18n } from 'vue-i18n';

const appRoot = process.cwd();
const readLocale = (name: string) => JSON.parse(readFileSync(resolve(appRoot, `i18n/locales/${name}.json`), 'utf8'));
const en = readLocale('en-US');
const ru = readLocale('ru-RU');

function flatten(value: Record<string, unknown>, prefix = ''): Record<string, string> {
    return Object.fromEntries(Object.entries(value).flatMap(([key, item]) => {
        const path = prefix ? `${prefix}.${key}` : key;
        return typeof item === 'string' ? [[path, item]] : Object.entries(flatten(item as Record<string, unknown>, path));
    }));
}

afterEach(() => vi.unstubAllGlobals());

describe('Russian locale', () => {
    it('covers the English catalog and preserves every interpolation argument', () => {
        const source = flatten(en);
        const translated = flatten(ru);
        expect(Object.keys(translated).sort()).toEqual(Object.keys(source).sort());
        for (const [key, text] of Object.entries(translated)) {
            expect(text.trim(), key).not.toBe('');
            expect((text.match(/\{[^{}]+\}/g) || []).sort(), key)
                .toEqual((source[key].match(/\{[^{}]+\}/g) || []).sort());
        }
    });

    it('compiles every message without HTML or invalid linked-message syntax', () => {
        for (const [key, text] of Object.entries(flatten(ru))) {
            const errors: string[] = [];
            baseCompile(text, { onError: error => errors.push(error.message) });
            expect(errors, key).toEqual([]);
            expect(text, key).not.toContain('<');
            expect(text.replaceAll("{'@'}", ''), key).not.toContain('@');
        }
    });

    it('renders Russian text and both named and positional placeholders', () => {
        const { global: i18n } = createI18n({ legacy: false, locale: 'ru-RU', messages: { 'ru-RU': ru } });
        expect(i18n.t('common.home')).toBe('Главная');
        expect(i18n.t('common.read')).toBe('Читать');
        expect(i18n.t('readingState.done')).toBe('Прочитано');
        for (const count of [0, 1, 2, 5, 11, 21]) {
            expect(i18n.t('counts.books', { count })).toBe(`Книг: ${count}`);
        }
        expect(i18n.t('book.sendToDeviceSuccess', { deviceName: 'Kindle' })).toContain('Kindle');
        expect(i18n.t('admin.books.message.progressDetails', [9, 7, 1, 1]))
            .toBe('Всего: 9, обработано: 7, ошибок: 1, пропущено: 1');
        expect(i18n.t('admin.settings.label.smtpUsername')).toContain('user@gmail.com');
    });

    it('registers Russian runtime messages and Russian date and currency formats', async () => {
        vi.stubGlobal('defineI18nConfig', (factory: () => unknown) => factory);
        const { default: makeConfig } = await import('../../i18n.config');
        const config = makeConfig();
        const { global: i18n } = createI18n({ ...config, locale: 'ru-RU' });
        expect(i18n.t('common.home')).toBe('Главная');
        expect(i18n.d(new Date('2026-09-23T12:30:00Z'), 'long')).toContain('сентября');
        expect(i18n.n(1234.5, 'currency')).toContain('₽');
        expect(config.datetimeFormats['ru-RU'].long.hour12).toBe(false);
    });

    it('offers Russian and emits its messages in the static prerender hook', async () => {
        vi.stubGlobal('defineNuxtConfig', (config: unknown) => config);
        const { default: config } = await import('../../nuxt.config');
        expect(config.i18n.locales).toContainEqual({ code: 'ru-RU', name: 'Русский', iso: 'ru-RU', file: 'ru-RU.json' });
        expect(config.i18n.detectBrowserLanguage.cookieKey).toBe('i18n_redirected');
        const folder = mkdtempSync(join(tmpdir(), 'talebook-ru-'));
        try {
            const cache = join(folder, 'node_modules/.cache/nuxt/.nuxt/dist/client/_nuxt');
            mkdirSync(cache, { recursive: true });
            writeFileSync(join(cache, 'locale.js'), 'const url = "/_i18n/testhash/ru-RU/messages.json"');
            mkdirSync(join(folder, 'i18n/locales'), { recursive: true });
            for (const { code } of config.i18n.locales) {
                writeFileSync(join(folder, `i18n/locales/${code}.json`), JSON.stringify(readLocale(code)));
            }
            // Keep the real hook and filesystem writes; redirect only its working-directory resolution.
            const cwd = vi.spyOn(process, 'cwd').mockReturnValue(folder);
            try {
                const nitro = { hooks: {} as Record<string, () => Promise<void>> };
                config.hooks['nitro:config'](nitro);
                await nitro.hooks['prerender:done']();
                expect(JSON.parse(readFileSync(join(folder, '.output/public/_i18n/testhash/ru-RU/messages.json'), 'utf8')))
                    .toEqual({ 'ru-RU': ru });
            } finally {
                cwd.mockRestore();
            }
        } finally {
            rmSync(folder, { recursive: true, force: true });
        }
    });
});

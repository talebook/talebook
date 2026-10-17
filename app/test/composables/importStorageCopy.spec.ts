import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';

describe('Import storage explanation', () => {
    it('describes temporary ZIP extraction consistently in all locales', () => {
        for (const locale of ['zh-CN', 'en-US', 'ru-RU']) {
            const messages = JSON.parse(readFileSync(resolve(process.cwd(), `i18n/locales/${locale}.json`), 'utf8'));
            const text = messages.admin.imports.settings.modeIndexDescription;
            expect(text).toContain('512 MiB');
            expect(text).not.toContain('постоянный кэш');
        }
    });
});

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const readLocale = (filename: string) => JSON.parse(
    readFileSync(resolve(process.cwd(), 'i18n/locales', filename), 'utf8'),
);

const en = readLocale('en-US.json');
const zh = readLocale('zh-CN.json');

const directionCodes = ['t2s', 'tw2s', 'tw2sp', 's2t', 's2tw', 's2twp', 't2tw', 'tw2t'];

describe('Chinese converter locale labels', () => {
    it('provides every conversion direction in both locales', () => {
        expect(Object.keys(en.bookTools.zhConverter.directions)).toEqual(directionCodes);
        expect(Object.keys(zh.bookTools.zhConverter.directions)).toEqual(directionCodes);
    });

    it('keeps the English direction menu understandable without Chinese-only labels', () => {
        expect(Object.values(en.bookTools.zhConverter.directions)).toHaveLength(8);
        for (const label of Object.values(en.bookTools.zhConverter.directions)) {
            expect(label).not.toMatch(/[\u3400-\u9fff]/u);
        }
    });
});

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const page = readFileSync(resolve(process.cwd(), 'pages/book/[bid]/protagonist-agent.vue'), 'utf8');
const detail = readFileSync(resolve(process.cwd(), 'pages/book/[bid]/index.vue'), 'utf8');
const zh = JSON.parse(readFileSync(resolve(process.cwd(), 'i18n/locales/zh-CN.json'), 'utf8'));
const en = JSON.parse(readFileSync(resolve(process.cwd(), 'i18n/locales/en-US.json'), 'utf8'));

describe('protagonist agent UI contract', () => {
    it('supports a recommended or user-chosen person and focuses chat on problem solving', () => {
        expect(page).toContain("$backend_stream(`/ai/protagonist/messages/${message.id}/stream`)");
        expect(page).toContain("['succeeded', 'failed', 'cancelled']");
        expect(page).toContain('protagonist.aiDerived');
        expect(page).toContain("targetMode === 'custom'");
        expect(page).toContain('protagonist.recommendTarget');
        expect(page).toContain(':error-messages="customNameError"');
        expect(page).toContain("sendFeedback(message, 'not_useful')");
        expect(page).not.toContain('spoiler_confirmed');
        expect(page).not.toContain('too_much_quote');
        expect(page).toContain('deleteAgent');
    });

    it('is reachable from an EPUB book and keeps both locales complete', () => {
        expect(detail).toContain('data-testid="open-protagonist-agent"');
        expect(detail).toContain('hasEpubFormat');
        expect(Object.keys(en.protagonist).sort()).toEqual(Object.keys(zh.protagonist).sort());
        expect(JSON.stringify(zh.protagonist)).not.toMatch(/[@<]/);
        expect(JSON.stringify(en.protagonist)).not.toMatch(/[@<]/);
    });
});

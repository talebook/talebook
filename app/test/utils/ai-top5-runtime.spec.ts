import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const script = readFileSync(resolve(process.cwd(), 'public/static/js/ai-top5.js'), 'utf8');
const style = readFileSync(resolve(process.cwd(), 'public/static/js/ai-top5.css'), 'utf8');

function luminance(hex: string) {
    const values = [1, 3, 5].map(offset => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255)
        .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
}

function contrast(foreground: string, background: string) {
    const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
    return (values[0] + 0.05) / (values[1] + 0.05);
}

describe('Summary Duck static reader integration', () => {
    it('renders Markdown emphasis as DOM text without an HTML injection sink', () => {
        expect(script).toContain('appendMarkdown');
        expect(script).toContain('document.createTextNode');
        expect(script).toContain('node("strong"');
        expect(script).not.toContain('.innerHTML');
        expect(script).not.toContain('insertAdjacentHTML');
    });

    it('covers synthetic Markdown line shapes without remote fixtures', () => {
        const fixture = [
            '**1. 整段编号**',
            '__整段标题__',
            '1. **行首编号**',
            '- **行首项目符号**',
            '答案包含 **行内重点**。',
        ];
        for (const markdown of fixture) {
            expect(markdown).toMatch(/\*\*|__/);
        }
        expect(script).not.toContain('http://');
        expect(script).not.toContain('https://');
    });

    it('defines ordered question parts and accessible light/dark tokens', () => {
        const order = ['summary-duck__number', 'summary-duck__question', 'summary-duck__answer', 'summary-duck__citation'];
        for (const selector of order) expect(style).toContain(selector);
        expect(style).toContain('--duck-accent: #b83a12');
        expect(style).toContain('prefers-color-scheme: dark');
        expect(style).toContain('--duck-accent: #ff7953');
        expect(style).toContain(':focus-visible');
        expect(script).toContain('trapFocus');
        expect(script).toContain('item.inert = true');
        expect(script).toContain('qLabel.htmlFor = q.id');
        expect(style).toContain('min-height: 0');
        expect(contrast('#b83a12', '#fffdfb')).toBeGreaterThanOrEqual(4.5);
        expect(contrast('#ff7953', '#211e1b')).toBeGreaterThanOrEqual(4.5);
    });
});

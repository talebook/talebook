import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const script = readFileSync(resolve(process.cwd(), 'public/static/js/quote-cards.js'), 'utf8');
const style = readFileSync(resolve(process.cwd(), 'public/static/js/quote-cards.css'), 'utf8');

function luminance(hex: string) {
    const values = [1, 3, 5].map(offset => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255)
        .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
}

function contrast(foreground: string, background: string) {
    const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
    return (values[0] + 0.05) / (values[1] + 0.05);
}

describe('Quote Card static reader integration', () => {
    it('uses safe DOM construction and provider-neutral APIs', () => {
        expect(script).toContain('document.createTextNode');
        expect(script).not.toContain('.innerHTML');
        expect(script).not.toContain('insertAdjacentHTML');
        expect(script).toContain('/api/ai/quote_card/tasks');
        expect(script).toContain('/api/quote-cards');
        expect(script.toLowerCase()).not.toContain('openai');
    });

    it('implements selection grounding, explicit quote downgrade and both exports', () => {
        expect(script).toContain('selectionFromFrame');
        expect(script).toContain('adapted_note');
        expect(script).toContain('duplicate_action');
        expect(script).toContain('canvas.toBlob');
        expect(script).toContain('/export?book_id=');
        expect(script).toContain('talebook:quote-card-locator');
    });

    it('defines accessible light/dark tokens and modal behavior', () => {
        expect(style).toContain('--quote-accent: #8d3d25');
        expect(style).toContain('--quote-accent: #ff9a76');
        expect(style).toContain('--quote-on-accent: #211e1b');
        expect(style).toContain('prefers-color-scheme: dark');
        expect(style).toContain(':focus-visible');
        expect(style).toContain('min-height: 0');
        expect(script).toContain('trapFocus');
        expect(script).toContain('item.inert = true');
        expect(script).toContain('label.htmlFor = input.id');
        expect(script).toContain('el.live.textContent = "候选已保存。"');
        expect(script.match(/renderCardEditor\(payload\.card, true\)/g)).toHaveLength(2);
        expect(contrast('#8d3d25', '#fffdf9')).toBeGreaterThanOrEqual(4.5);
        expect(contrast('#ff9a76', '#211e1b')).toBeGreaterThanOrEqual(4.5);
        expect(contrast('#ffffff', '#8d3d25')).toBeGreaterThanOrEqual(4.5);
        expect(contrast('#211e1b', '#ff9a76')).toBeGreaterThanOrEqual(4.5);
        expect(style).toContain('font-size: 16px');
    });
});

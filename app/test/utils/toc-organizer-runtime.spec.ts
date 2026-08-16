import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const script = readFileSync(resolve(process.cwd(), 'public/static/js/toc-organizer.js'), 'utf8');
const style = readFileSync(resolve(process.cwd(), 'public/static/js/toc-organizer.css'), 'utf8');
const readerTemplate = readFileSync(resolve(process.cwd(), '../webserver/resources/book/creader.html'), 'utf8');

describe('TOC organizer reader integration', () => {
    it('uses the isolated feature API and explicit apply/undo confirmations', () => {
        expect(script).toContain('/api/ai/toc_organizer/tasks');
        expect(script).toContain('confirmed: true');
        expect(script).toContain('/apply');
        expect(script).toContain('/undo');
        expect(script).toContain('book_version: state.task.book_version');
        expect(script).toContain('apply-confirm');
        expect(script).toContain('undo-confirm');
        expect(script).not.toContain('window.confirm');
        expect(script).not.toContain('.innerHTML');
        expect(script).not.toContain('insertAdjacentHTML');
    });

    it('supports item selection, manual edits, focus containment, and mobile/dark layouts', () => {
        expect(script).toContain('data-field="selected"');
        expect(script).toContain('data-field="label"');
        expect(script).toContain('data-field="parent"');
        expect(script).toContain('trapFocus');
        expect(script).toContain('!el.panel.contains(target)');
        expect(script).toContain('item.inert = true');
        expect(style).toContain(':focus-visible');
        expect(style).toContain('width:24px; height:24px');
        expect(style).toContain('z-index:2799');
        expect(style).toContain('prefers-color-scheme:dark');
        expect(style).toContain('@media(max-width:640px)');
        expect(style).toContain('prefers-reduced-motion:reduce');
    });

    it('is initialized only after the EPUB reader starts', () => {
        expect(readerTemplate).toContain('{% if can_manage_ai_toc %}');
        expect(readerTemplate).toContain('/static/js/toc-organizer.css');
        expect(readerTemplate).toContain('/static/js/toc-organizer.js');
        expect(readerTemplate).toContain('TalebookTocOrganizerInit?.({ bookId: {{book.id}} })');
        expect(readerTemplate.indexOf('new Reader')).toBeLessThan(readerTemplate.indexOf('TalebookTocOrganizerInit'));
    });
});

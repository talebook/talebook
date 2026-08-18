import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const script = readFileSync(resolve(process.cwd(), 'public/static/js/knowledge-graph.js'), 'utf8');
const style = readFileSync(resolve(process.cwd(), 'public/static/js/knowledge-graph.css'), 'utf8');

describe('Knowledge graph static reader integration', () => {
    it('uses the feature-routed task API and safe DOM construction', () => {
        expect(script).toContain('/api/ai/knowledge_graph/tasks');
        expect(script).toContain('document.createTextNode');
        expect(script).toContain('createElementNS');
        expect(script).not.toContain('.innerHTML');
        expect(script).not.toContain('insertAdjacentHTML');
        expect(script.replace('http://www.w3.org/2000/svg', '')).not.toContain('http://');
        expect(script).not.toContain('https://');
    });

    it('covers range confirmation, recovery, exploration, review, and citation jumps', () => {
        for (const contract of [
            'preview_only', 'completed_segments', 'schedulePoll', 'enabledTypes', 'expand-neighbors',
            'alias_conflicts', 'low_confidence', 'talebook:ai-citation', 'reader.rendition.display',
        ]) expect(script).toContain(contract);
        expect(script).toContain('trapFocus');
        expect(script).toContain('item.inert = true');
    });

    it('provides responsive light/dark graph tokens and reduced-motion behavior', () => {
        for (const contract of [
            '--graph-accent', 'prefers-color-scheme: dark', 'prefers-reduced-motion: reduce',
            ':focus-visible', 'knowledge-graph__graph-layout', 'knowledge-graph__details', 'animation: none',
        ]) expect(style).toContain(contract);
    });
});

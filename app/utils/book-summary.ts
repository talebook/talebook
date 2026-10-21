import { decodeHTML } from 'entities';
import { DOCUMENT_NODE, ELEMENT_NODE, TEXT_NODE, parse, type Node } from 'ultrahtml';

const hiddenTags = new Set(['script', 'style', 'template', 'noscript']);
const blockTags = new Set(['p', 'div', 'br', 'hr', 'li', 'ul', 'ol', 'section', 'blockquote', 'table', 'tr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

/** Extract the same plain-text book introduction during SSR and in the browser. */
export function bookSummary(comments: unknown): string {
    if (typeof comments !== 'string' || !comments.trim()) return '';

    const parts: string[] = [];
    const pending: (Node | string)[] = [parse(comments)];
    while (pending.length) {
        const node = pending.pop()!;
        if (typeof node === 'string') {
            parts.push(node);
        } else if (node.type === TEXT_NODE) {
            parts.push(node.value);
        } else if (node.type === DOCUMENT_NODE || node.type === ELEMENT_NODE) {
            if (node.type === ELEMENT_NODE) {
                const tag = node.name.toLowerCase();
                if (hiddenTags.has(tag)) continue;
                if (blockTags.has(tag)) {
                    parts.push(' ');
                    pending.push(' ');
                }
            }
            for (let index = node.children.length - 1; index >= 0; index--) {
                pending.push(node.children[index]);
            }
        }
    }
    return decodeHTML(parts.join('')).replace(/\s+/gu, ' ').trim();
}

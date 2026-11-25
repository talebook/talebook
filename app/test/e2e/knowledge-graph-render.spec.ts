import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';

const nodeTypes = ['person', 'place', 'organization', 'event', 'concept', 'claim', 'evidence'];
const nodes = Array.from({ length: 36 }, (_, index) => ({
    id: `n-${index}`,
    name: index === 0 ? '张英才' : `${['人物', '地点', '组织', '事件', '概念', '论点', '证据'][index % 7]} ${index + 1}`,
    type: nodeTypes[index % 7],
    aliases: index === 0 ? ['英才', '张老师'] : [],
    description: index === 0 ? '在乡村学校任教、推动主要事件的人物。' : `第 ${index + 1} 个具有原文证据的节点。`,
    confidence: 0.99 - index * 0.005,
    importance: 40 - index * 0.6,
    mentions: 3,
    citations: [{ href: 'chapter2.html', start: 8, end: 24, quote: '张英才背着行李出门时' }],
}));
const relations = Array.from({ length: 35 }, (_, index) => ({
    id: `r-${index}`, source: `n-${index}`, target: `n-${index + 1}`, type: index % 2 ? '影响' : '关联',
    description: '原文明确呈现的有方向关系。', direction: 'forward', confidence: 0.9,
    citations: [{ href: 'chapter2.html', start: 8, end: 24, quote: '张英才背着行李出门时' }], mentions: 1,
}));
const artifact = {
    id: '33333333-3333-3333-3333-333333333333', feature: 'knowledge_graph', book_id: 1,
    book_version: 'fixture', scope: { kind: 'book', label: '全书', chapter_hrefs: ['chapter2.html'], chapter_count: 33, character_count: 204279 },
    status: 'succeeded', progress_message: '知识图谱生成完成', completed_segments: 33, total_segments: 33,
    graph: { nodes, relations },
    review: {
        low_confidence: [{ kind: 'node', item: { name: '同名人物', confidence: 0.48 } }],
        alias_conflicts: [{ alias: '老师', names: ['张英才', '余校长'], entity_ids: ['n-0', 'n-2'], type: 'person' }],
    },
    stats: { formal_nodes: nodes.length, formal_relations: relations.length, node_citation_coverage: 1, relation_citation_coverage: 1 },
    schema_version: 'knowledge_graph.v1', prompt_version: 'knowledge_graph.zh.v1', runtime: 'codex_app_server', usage: {}, error: null,
};

async function mount(page) {
    await page.route('**/api/ai/knowledge_graph/tasks?book_id=1', route => route.fulfill({
        contentType: 'application/json', body: JSON.stringify({ err: 'ok', tasks: [artifact] }),
    }));
    await page.setContent('<!doctype html><html><head><meta charset="utf-8"><base href="http://127.0.0.1:3000/"></head><body><div id="app"></div><main id="reader"></main></body></html>');
    await page.addStyleTag({ path: resolve(process.cwd(), 'public/static/js/knowledge-graph.css') });
    await page.addScriptTag({ path: resolve(process.cwd(), 'public/static/js/knowledge-graph.js') });
    await page.evaluate(() => {
        window.TalebookKnowledgeGraphInit({ bookId: 1 });
        window.TalebookKnowledgeGraph.open();
    });
    await expect(page.getByRole('dialog', { name: '单本书知识图谱' })).toBeVisible();
    await expect(page.getByText('36 个正式节点 · 35 条关系')).toBeVisible();
}

test('renders a core graph, filters, details, review conflicts, and safe evidence text', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
    await mount(page);
    await expect(page.locator('.knowledge-graph__nodes g')).toHaveCount(20);
    await expect(page.getByRole('heading', { name: '张英才' })).toBeVisible();
    await expect(page.getByRole('button', { name: /张英才背着行李/ })).toBeVisible();
    await expect(page.locator('.knowledge-graph__spinner')).toHaveCount(0);
    await expect(page).toHaveScreenshot('knowledge-graph-light.png', { fullPage: true });
    await page.getByText(/待复核：1 个低置信对象/).click();
    await expect(page.getByText(/系统未自动合并/)).toBeVisible();
});

test('supports search, type filtering, zoom, and on-demand expansion', async ({ page }) => {
    await mount(page);
    await page.getByRole('searchbox', { name: '搜索节点' }).fill('张英才');
    await expect(page.locator('.knowledge-graph__nodes g')).toHaveCount(1);
    await page.getByRole('searchbox', { name: '搜索节点' }).fill('');
    await page.getByRole('button', { name: '+' }).click();
    await expect(page.getByRole('button', { name: '120%' })).toBeVisible();
    await page.getByRole('button', { name: '120%' }).click();
    await expect(page.getByRole('button', { name: '100%' })).toBeVisible();
    await page.locator('label.knowledge-graph__filter').filter({ hasText: '人物' }).click();
    await expect(page.locator('.knowledge-graph__nodes g')).toHaveCount(20);
    await expect(page.getByRole('button', { name: /^人物：/ })).toHaveCount(0);
});

test('uses rendition locations and rendered contents when iframes use srcdoc', async ({ page }) => {
    await mount(page);
    await page.locator('#reader').evaluate(reader => {
        const frame = document.createElement('iframe');
        frame.srcdoc = '<!doctype html><html><body><p>前言文字张英才背着行李出门时继续前行。</p></body></html>';
        reader.append(frame);
    });
    await expect(page.frameLocator('#reader iframe').locator('p')).toBeVisible();
    const chapter = await page.evaluate(() => {
        const frame = document.querySelector<HTMLIFrameElement>('#reader iframe')!;
        const contents = { document: frame.contentDocument, sectionIndex: 2 };
        const rendition = {
            currentLocation: () => ({ start: { href: 'chapter2.html' } }),
            getContents: () => [contents],
            views: () => ({ _views: [{ index: 2, section: { href: 'chapter2.html' }, contents }] }),
            display: () => Promise.resolve(),
        };
        const proxy = {
            rendition,
            toc_items: [{ href: 'chapter2.html', label: '第二章' }],
            current_toc_title: '第二章',
        };
        const app = document.querySelector<HTMLElement>('#app')!;
        Object.defineProperty(app, '__vue_app__', { value: { _instance: { proxy } }, configurable: true });
        return window.TalebookKnowledgeGraph.currentChapter();
    });
    expect(chapter).toEqual({ href: 'chapter2.html', title: '第二章' });

    await page.getByRole('button', { name: /张英才背着行李/ }).click();
    await expect(page.getByRole('dialog', { name: '单本书知识图谱' })).toBeHidden();
    expect(await page.frames()[1].evaluate(() => getSelection()?.toString())).toBe('张英才背着行李出门时');
});

test('preserves graph focus, exposes directed endpoints, and honors interface preferences', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await mount(page);
    await expect(page).toHaveScreenshot('knowledge-graph-dark.png', { fullPage: true });
    const firstFilter = page.locator('label.knowledge-graph__filter').first();
    await firstFilter.locator('input').focus();
    await expect(firstFilter.locator('input')).toBeFocused();
    expect(await firstFilter.evaluate(element => getComputedStyle(element).outlineStyle)).toBe('solid');

    const secondNode = page.getByRole('button', { name: '地点：地点 2', exact: true });
    await secondNode.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: '地点：地点 2', exact: true })).toBeFocused();
    await expect(page.getByText(/张英才 —关联→ 地点 2/)).toBeVisible();

    expect(await page.locator('.knowledge-graph-launcher').evaluate(element => getComputedStyle(element).color)).toBe('rgb(11, 38, 34)');
});

test('traps focus and degrades to a detail-first layout on a narrow screen', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 720 });
    await mount(page);
    await expect(page.locator('main')).toHaveAttribute('inert', '');
    const canvasBox = await page.locator('.knowledge-graph__canvas-wrap').boundingBox();
    const detailsBox = await page.locator('.knowledge-graph__details').boundingBox();
    expect(canvasBox && detailsBox && detailsBox.y + detailsBox.height <= canvasBox.y + 1).toBeTruthy();
    await page.getByRole('button', { name: '删除', exact: true }).focus();
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByRole('button', { name: '重新生成' })).toBeFocused();
});

declare global {
    interface Window {
        TalebookKnowledgeGraphInit: (options: { bookId: number }) => void;
        TalebookKnowledgeGraph: { open: () => void; currentChapter: () => { href: string; title: string } | null };
    }
}

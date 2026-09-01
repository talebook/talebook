import { expect, test, type Page } from '@playwright/test';

const mockApiUrl = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';
const manifest = {
    display_name: '林舟',
    introduction: '先保护不可逆价值，再用小步试验澄清不确定性。',
    thinking_patterns: ['先观察约束', '重视长期承诺', '把风险拆成可验证假设'],
    decision_principles: ['先保护不可逆价值', '证据不足时设计小步试验'],
    problem_solving_steps: ['明确真正冲突', '列出不可逆代价', '选择最小可验证行动'],
    blind_spots: ['可能为了承诺而低估退出成本'],
    sources: [{ href: 'OPS/chapter-1.xhtml', title: '第一章' }],
    ai_derived: true,
};
const agent = {
    id: '11111111-1111-1111-1111-111111111111',
    display_name: manifest.display_name,
    manifest,
    cutoff: { href: 'OPS/chapter-1.xhtml', title: '第一章', index: 0 },
    schema_version: 'tale_agent_manifest.v2',
    prompt_version: 'tale_agent_manifest.zh.v2',
};
const conversation = {
    id: '22222222-2222-2222-2222-222222222222',
    tale_agent_id: agent.id,
    cutoff: agent.cutoff,
    messages: [],
};
const queuedMessage = {
    id: '33333333-3333-3333-3333-333333333333',
    user_content: '我在两个工作机会之间犹豫，应该怎样拆解？',
    assistant_content: '',
    status: 'queued',
    progress_message: '正在用人物思维拆解问题',
    feedback: '',
    error: null,
};
const completedMessage = {
    ...queuedMessage,
    status: 'succeeded',
    progress_message: '回答完成',
    assistant_content: '先写下两个选项中不可逆的代价，再为信息不足的部分设计一个今天能完成的小步试验。',
};

async function routeTaleAgent(page: Page, agents: Array<typeof agent> = []) {
    await page.route('**/api/book/1', async route => route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ err: 'ok', book: { id: 1, title: '雨夜抉择', files: [{ format: 'EPUB' }] } }),
    }));
    await page.route('**/api/ai/tale-agent/**', async (route) => {
        const request = route.request();
        const path = new URL(request.url()).pathname;
        let body: Record<string, unknown>;
        if (path === '/api/ai/tale-agent/agents' && request.method() === 'GET') {
            body = { err: 'ok', agents };
        } else if (path === '/api/ai/tale-agent/previews' && request.method() === 'POST') {
            body = { err: 'ok', preview: { id: 'preview-1', status: 'succeeded', manifest } };
        } else if (path === '/api/ai/tale-agent/previews/preview-1') {
            body = { err: 'ok', preview: { id: 'preview-1', status: 'succeeded', manifest } };
        } else if (path === '/api/ai/tale-agent/agents' && request.method() === 'POST') {
            body = { err: 'ok', agent };
        } else if (path.endsWith('/conversations') && request.method() === 'POST') {
            body = { err: 'ok', conversation };
        } else if (path.endsWith('/messages') && request.method() === 'POST') {
            body = { err: 'ok', message: queuedMessage };
        } else if (path.endsWith('/stream')) {
            await route.fulfill({
                contentType: 'application/x-ndjson',
                body: `${JSON.stringify({ type: 'message', message: completedMessage })}\n`,
            });
            return;
        } else {
            body = { err: 'ai.not_found', msg: `fixture route missing: ${path}` };
        }
        await route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    });
}

test.beforeEach(async ({ request }) => {
    await request.post(`${mockApiUrl}/_test/reset`, { data: { installed: true, loggedIn: true } });
});

test('creates a TaleAgent and keeps a problem-solving conversation readable', async ({ page }) => {
    await routeTaleAgent(page);
    await page.goto('/book/1/tale-agent');
    await expect(page.getByRole('heading', { name: 'TaleAgent' })).toBeVisible({ timeout: 20_000 });

    await page.getByLabel('我来指定人物').click();
    await page.getByLabel('角色或人物名称').fill('林舟');
    await page.getByRole('button', { name: '生成思维模型' }).click();
    await expect(page.getByText('先观察约束')).toBeVisible();
    await expect(page.locator('.tale-agent-page')).toHaveScreenshot('tale-agent-preview-light.png', {
        animations: 'disabled',
    });

    await page.getByRole('button', { name: '确认并创建' }).click();
    await page.getByRole('button', { name: '新建会话' }).click();
    await page.getByLabel('消息').fill(queuedMessage.user_content);
    await page.getByRole('button', { name: '发送' }).click();
    await expect(page.getByText(completedMessage.assistant_content)).toBeVisible();
    await expect(page.locator('.chat-shell')).toHaveScreenshot('tale-agent-chat-light.png', {
        animations: 'disabled',
    });
});

test('keeps the active Agent readable in dark theme at mobile width', async ({ page, context }) => {
    await context.addCookies([{ name: 'theme', value: 'dark', domain: '127.0.0.1', path: '/' }]);
    await page.setViewportSize({ width: 390, height: 844 });
    await routeTaleAgent(page, [agent]);
    await page.goto('/book/1/tale-agent');
    await expect(page.getByRole('heading', { name: '带一个问题来' })).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('.tale-agent-page')).toHaveScreenshot('tale-agent-dark-mobile.png', {
        animations: 'disabled',
    });
});

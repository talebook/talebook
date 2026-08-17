import { expect, test, type Page } from '@playwright/test';

const skillId = '11111111-1111-1111-1111-111111111111';
const mockApiUrl = process.env.SKILL_MOCK_API_URL || 'http://127.0.0.1:8080';
const version = {
    id: 11,
    version: 3,
    content_hash: '2a5e0a9c43f6e47b574dd649737ed59f20fef704c67cd2f7b0bd1b684f204aaa',
    source: { kind: 'edit', from_version: 2 },
    sensitive_acknowledged: false,
    created_at: '2026-08-16T08:30:00',
    markdown: '# 阅读摘要整理\n\n聚焦中心判断、关键机制、证据、边界与含义。',
    manifest: {
        name: '阅读摘要整理',
        package_name: 'reading-summary',
        description: '把长篇阅读内容整理为有证据边界的固定格式摘要。',
        scope: '适用于读书笔记、章节复盘和研究材料整理；不补充输入之外的事实。',
        prerequisites: ['输入包含可理解的正文'],
        trigger: '创建者在 AI 中心选择输入后手动运行。',
        input_schema: {
            type: 'object',
            properties: { content: { type: 'string', minLength: 1, maxLength: 20000 } },
            required: ['content'],
            additionalProperties: false,
        },
        steps: ['识别中心判断与关键问题。', '提取直接证据与限制。', '按输出结构组织结果并自检。'],
        terms_examples: ['证据边界：只陈述输入能够支持的结论。'],
        failure_conditions: ['输入为空或无法支持结论时停止。'],
        output_schema: {
            type: 'object',
            properties: { result: { type: 'string' } },
            required: ['result'],
            additionalProperties: false,
        },
        sources: [{ type: 'ai_task', reference: 'summary-duck-task', note: '已确认的结构摘要' }],
        self_tests: [],
    },
};

const skill = {
    id: skillId,
    name: version.manifest.name,
    description: version.manifest.description,
    status: 'enabled',
    current_version: 3,
    version,
};

const run = {
    id: '22222222-2222-2222-2222-222222222222',
    skill_id: skillId,
    version_id: 11,
    version: 3,
    mode: 'trial',
    status: 'succeeded',
    progress_message: '运行完成',
    input_summary: { fields: [{ name: 'content', type: 'str', size: 1860 }], serialized_characters: 1874 },
    authorization_context: { book_ids: [], verified_for_user: 1 },
    result: { result: '中心判断、关键证据与适用边界已按契约整理。' },
    runtime: 'codex_app_server',
    usage: { inputTokens: 820, outputTokens: 210 },
    error: null,
    created_at: '2026-08-16T08:35:00',
    updated_at: '2026-08-16T08:35:08',
    started_at: '2026-08-16T08:35:01',
    finished_at: '2026-08-16T08:35:08',
};

const packageInfo = {
    name: 'reading-summary',
    folder: 'reading-summary',
    filename: 'reading-summary-v3.zip',
    version: 3,
    content_hash: version.content_hash,
    format: 'agent-skills.v1',
    download_url: `/api/ai/skills/${skillId}/download?version=3`,
    storage_path: `skills/1/${skillId}/v3/reading-summary`,
    archive_path: `skills/1/${skillId}/v3/reading-summary-v3.zip`,
    files: [
        {
            path: 'SKILL.md',
            content_type: 'text/markdown',
            size: 286,
            content: '---\nname: reading-summary\ndescription: "把阅读内容整理为固定格式。 Use when: 手动整理阅读材料"\n---\n\n# 阅读摘要整理\n\n按证据边界完成摘要。',
        },
        {
            path: 'references/contract.json',
            content_type: 'application/json',
            size: 162,
            content: '{\n  "input_schema": { "type": "object" },\n  "output_schema": { "type": "object" }\n}',
        },
    ],
};

async function routeSkills(page: Page) {
    await page.route('**/api/ai/skills**', async (route) => {
        const request = route.request();
        const path = new URL(request.url()).pathname;
        let body;
        if (path === '/api/ai/skills') body = { err: 'ok', skills: [skill] };
        else if (path.endsWith('/package')) body = { err: 'ok', package: packageInfo };
        else if (path.endsWith('/versions')) body = { err: 'ok', versions: [version] };
        else if (path.endsWith('/runs')) body = { err: 'ok', runs: [run] };
        else if (path === `/api/ai/skills/${skillId}`) body = { err: 'ok', skill };
        else body = { err: 'skill.not_found', msg: 'fixture route missing' };
        await route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    });
}

test.beforeEach(async ({ page, request }) => {
    await request.post(`${mockApiUrl}/_test/reset`, { data: { installed: true, loggedIn: true } });
    await routeSkills(page);
});

test('renders the versioned SKILL editor and complete run contract in light theme', async ({ page }) => {
    await page.goto('/ai/skills');
    await expect(page.getByRole('heading', { name: 'SKILL 生成器' })).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: /阅读摘要整理/ }).click();
    await expect(page.getByLabel('名称')).toHaveValue('阅读摘要整理');
    await expect(page.getByRole('link', { name: '下载 ZIP' })).toHaveAttribute('href', packageInfo.download_url);

    await page.getByRole('tab', { name: '文件包' }).click();
    await expect(page.getByTestId('skill-package-browser')).toContainText('SKILL.md');
    await expect(page.getByTestId('skill-package-browser')).toContainText('name: reading-summary');
    await expect(page.locator('.skill-workbench')).toHaveScreenshot('skill-library-light.png', { animations: 'disabled' });

    await page.getByRole('tab', { name: '运行' }).click();
    const runCard = page.getByTestId('skill-run-succeeded');
    await expect(runCard).toContainText('v3');
    await expect(runCard).toContainText('content:str(1860)');
    await expect(runCard).toContainText('没有附加资源授权');
    await expect(runCard).toContainText('运行完成');
});

test('keeps the workbench readable in dark theme and at mobile width', async ({ page, context }) => {
    await context.addCookies([{ name: 'theme', value: 'dark', domain: '127.0.0.1', path: '/' }]);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/ai/skills');
    await page.getByRole('button', { name: /阅读摘要整理/ }).click();
    await expect(page.locator('.skill-workbench')).toHaveScreenshot('skill-library-dark-mobile.png', {
        animations: 'disabled',
    });
    await expect(page.getByRole('button', { name: '保存并生成新版 ZIP' })).toBeVisible();
});

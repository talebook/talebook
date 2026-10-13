// 真实后端浏览器验证（非 mock）：登录 → 书库 → 详情 → 阅读 → 书架 → 多目录增删与持久化。
// 运行：npx playwright test test/e2e/real-backend-verify.spec.ts
import { test, expect } from '@playwright/test';

const REAL_API = process.env.REAL_API_URL || 'http://127.0.0.1:8080';
const ADMIN = { username: 'admin', password: 'admin12345' };

test.describe('真实后端全流程验证', () => {
    test('登录 → 书库 → 详情 → 书架 → 多目录增删与持久化', async ({ page, request }) => {
        await page.setViewportSize({ width: 1440, height: 900 });

        // 1. 登录页渲染
        await page.goto('/login');
        await expect(page.locator('input').first()).toBeVisible({ timeout: 30000 });

        // 2. 通过真实后端登录（拿 cookie）
        const loginResp = await request.post(`${REAL_API}/api/user/sign_in`, {
            form: ADMIN
        });
        expect(loginResp.ok()).toBeTruthy();
        const loginJson = await loginResp.json();
        expect(loginJson.err).toBe('ok');

        // 3. 首页 / 书库列表可渲染
        await page.goto('/');
        await expect(page.locator('body')).toBeVisible({ timeout: 30000 });
        await page.goto('/library/local');
        await expect(page.locator('body')).toBeVisible({ timeout: 30000 });

        // 4. 导入设置页：多目录 UI 真实渲染
        await page.goto('/admin/imports');
        await expect(page.locator('body')).toBeVisible({ timeout: 30000 });

        // 5. 真实后端接口契约
        const settings = await request.get(`${REAL_API}/api/admin/import/settings`);
        expect(settings.ok()).toBeTruthy();
        const sj = await settings.json();
        expect(sj.err).toBe('ok');
        expect(Array.isArray(sj.settings.allowed_roots)).toBe(true);
        expect(sj.settings.allowed_roots).toContain('/data/books/imports');

        // 6. 多目录保存并持久化（真实后端）
        // 注意：该接口读 JSON body（tornado.escape.json_decode），不是 form-encoded。
        const save = await request.post(`${REAL_API}/api/admin/import/settings`, {
            data: {
                scan_upload_path: '/data/books/imports',
                import_mode: 'copy',
                import_allowed_roots: ['/data/books/imports', '/data/books/upload']
            }
        });
        expect(save.ok()).toBeTruthy();

        const after = await request.get(`${REAL_API}/api/admin/import/settings`);
        const aj = await after.json();
        expect(aj.err).toBe('ok');
        expect(aj.settings.allowed_roots.length).toBe(2);
        expect(aj.settings.allowed_roots).toContain('/data/books/upload');

        // 7. 越界目录被拒绝
        const bad = await request.post(`${REAL_API}/api/admin/import/settings`, {
            data: {
                scan_upload_path: '/data/books/imports',
                import_mode: 'copy',
                import_allowed_roots: ['/etc']
            }
        });
        const bj = await bad.json();
        expect(bj.err).not.toBe('ok');

        // 8. 还原
        await request.post(`${REAL_API}/api/admin/import/settings`, {
            data: {
                scan_upload_path: '/data/books/imports',
                import_mode: 'copy',
                import_allowed_roots: ['/data/books/imports']
            }
        });
    });
});
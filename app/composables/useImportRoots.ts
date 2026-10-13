/**
 * 导入目录列表的纯逻辑（实施项 11.6）。
 *
 * 抽成 composable 的原因：
 *  - `pages/admin/imports.vue` 依赖 Nuxt 自动导入（`useNuxtApp`），
 *    在 happy-dom 环境下无法挂载，导致多目录逻辑难以单测；
 *  - 归一化与校验是纯函数，与 UI 无关，独立出来更易验证。
 *
 * 后端契约：`import_allowed_roots` 是绝对路径数组，每个都必须位于
 * `/data/` 之下（与 `webserver/handlers/scan.py` 的 `SCAN_DIR_PREFIX` 一致）。
 */

/** 导入目录必须位于此前缀之下。 */
export const IMPORT_ROOT_PREFIX = '/data/';

/**
 * 归一化目录列表：去首尾空白、丢弃空项、按首次出现顺序去重。
 *
 * @param roots 原始目录列表（可能含空串、空白、重复项）
 * @returns 归一化后的目录列表
 */
export function normalizeAllowedRoots(roots: unknown): string[] {
    if (!Array.isArray(roots)) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of roots) {
        const path = String(raw ?? '').trim();
        if (!path || seen.has(path)) continue;
        seen.add(path);
        out.push(path);
    }
    return out;
}

/** 校验结果：`error` 为空表示通过。 */
export interface AllowedRootsValidation {
    roots: string[];
    error: '' | 'empty' | 'outside';
}

/**
 * 校验目录列表。
 *
 * @param roots 原始目录列表
 * @returns 归一化后的列表与错误码（`''` 表示通过）
 */
export function validateAllowedRoots(roots: unknown): AllowedRootsValidation {
    const normalized = normalizeAllowedRoots(roots);
    if (!normalized.length) {
        return { roots: [], error: 'empty' };
    }
    const outside = normalized.find((path) => !isWithinDataPrefix(path));
    if (outside) {
        return { roots: normalized, error: 'outside' };
    }
    return { roots: normalized, error: '' };
}

/**
 * 判断路径是否位于 `/data/` 之下。
 *
 * 注意：`/database` 不算——必须带分隔符，避免字符串前缀误判。
 */
export function isWithinDataPrefix(path: string): boolean {
    const value = String(path ?? '').trim();
    if (!value) return false;
    if (value === IMPORT_ROOT_PREFIX.slice(0, -1)) return true; // "/data"
    return value.startsWith(IMPORT_ROOT_PREFIX);
}

/**
 * 从后端设置响应里取出目录列表。
 *
 * 后端字段名是 `allowed_roots`；缺失或为空时回退到单个 `scan_upload_path`，
 * 保证旧后端（未返回该字段）仍可用。
 */
export function allowedRootsFromSettings(settings: Record<string, unknown> | null | undefined): string[] {
    if (!settings) return [];
    const roots = normalizeAllowedRoots(settings.allowed_roots);
    if (roots.length) return roots;
    const fallback = String(settings.scan_upload_path ?? '').trim();
    return fallback ? [fallback] : [];
}
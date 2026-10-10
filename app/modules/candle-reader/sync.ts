import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const PACKAGE_NAME = '@talebook/candle-reader'
export const TARGET_DIR = 'public/static/candle-reader'
// 记录当前目录来自哪个 npm 版本，版本一致时跳过拷贝，避免每次启动都重写静态目录
export const VERSION_MARKER = '.npm-version'

export type SyncResult = 'copied' | 'up-to-date' | 'skipped'

/**
 * 把 npm 包 @talebook/candle-reader 的 dist/ 拷到 app/public/static/candle-reader/。
 * 阅读器产物不再提交进仓库，由 package-lock 锁定的版本决定。
 * 设置 CANDLE_READER_SKIP_SYNC=1 时不覆盖，便于用 candle-reader 的 `make install` 联调本地产物。
 */
export function syncCandleReader(appRoot: string, env: Record<string, string | undefined> = process.env): SyncResult {
    const target = join(appRoot, TARGET_DIR)
    if (env.CANDLE_READER_SKIP_SYNC === '1') {
        return 'skipped'
    }

    const packageRoot = join(appRoot, 'node_modules', PACKAGE_NAME)
    const dist = join(packageRoot, 'dist')
    if (!existsSync(join(dist, 'candle-reader.es.js'))) {
        throw new Error(`${PACKAGE_NAME} 未安装或缺少 dist/，请先在 app/ 下执行 npm ci`)
    }
    const version = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')).version as string

    const marker = join(target, VERSION_MARKER)
    if (existsSync(marker) && readFileSync(marker, 'utf8').trim() === version) {
        return 'up-to-date'
    }

    rmSync(target, { recursive: true, force: true })
    cpSync(dist, target, { recursive: true })
    writeFileSync(marker, `${version}\n`)
    return 'copied'
}

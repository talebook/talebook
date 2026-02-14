# 前端升级迁移指南 (Nuxt 2 -> Nuxt 4)

## 已完成的工作

1.  **项目初始化**:
    - 在 `app/` 目录下初始化了 Nuxt 3 (兼容 Nuxt 4) 项目。
    - 备份了旧项目代码到 `app_old/`。

2.  **依赖安装**:
    - 安装了 `vuetify-nuxt-module` (Vuetify 3)。
    - 安装了 `@pinia/nuxt` 和 `pinia` (替代 Vuex)。

3.  **配置迁移**:
    - 迁移了 `nuxt.config.js` 到 `nuxt.config.ts`。
    - 启用了 Vuetify 和 Pinia 模块。

4.  **核心代码迁移**:
    - **Store**: 将 Vuex (`store/index.js`) 迁移到了 Pinia (`stores/main.ts`)。
    - **Plugin**: 迁移了 `talebook.js` 插件，适配 Nuxt 3 插件 API。
    - **Layout**: 迁移了 `layouts/default.vue`，使用 Composition API 和 `<script setup>`。
    - **Page**: 迁移了首页 `pages/index.vue`，适配了 `useAsyncData`, `useHead`, `useMainStore` 等。
    - **Component**: 迁移了 `components/BookCards.vue`。

5.  **静态资源**:
    - 将 `app_old/public` 下的资源复制到了新的 `app/public`。

## 待完成的工作

为了确保项目完全可用，您需要继续迁移剩余的页面和组件。

1.  **剩余页面迁移**:
    - 所有尚未迁移的页面已移动到 `app/pages_pending/` 目录。
    - 请参考 `app/pages/index.vue` 的写法，将 `pages_pending` 中的文件逐个迁移回 `app/pages/`。
    - 主要修改点：
        - `<script>` -> `<script setup>`
        - `asyncData` -> `useAsyncData`
        - `this.$store` -> `useMainStore()`
        - `head()` -> `useHead()`
        - Vuetify 组件属性调整 (参考 Vuetify 3 文档)。

2.  **组件迁移**:
    - `app/components/` 下除了 `BookCards.vue` 之外的组件大多仍是 Options API 写法。虽然 Nuxt 3 支持 Options API，但建议逐步改为 Composition API 以获得更好的 TypeScript 支持和性能。
    - 检查 Vuetify 组件的破坏性更新。

3.  **测试**:
    - 现有的 Jest 测试配置在 Nuxt 3 下可能无法直接工作。建议切换到 Vitest。
    - 参考 `app/test/components/BookCards.spec.js` (旧) 编写新的测试。

## 如何运行

```bash
cd app
npm install
npm run dev
```

构建生产版本：
```bash
npm run build
node .output/server/index.mjs
```

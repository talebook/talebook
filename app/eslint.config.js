import pluginVue from 'eslint-plugin-vue';
import globals from 'globals';

export default [
  // 忽略配置
  {
    ignores: [
      'node_modules/**',
      '.nuxt/**',
      '.output/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'public/**',
      'static/**',
      'test/**',
      '**/*.ts'
    ]
  },
  
  // 通用规则（适用于所有文件）
  {
    files: ['**/*.{js,vue}'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      'no-console': 'warn',
      'no-debugger': 'warn',
      'semi': ['error', 'always'],
      'quotes': ['error', 'single']
    }
  },
  
  // JS 文件规则（2格缩进）
  {
    files: ['**/*.js'],
    rules: {
      'indent': ['error', 2, { 'SwitchCase': 1 }],
      'no-console': 'off'
    }
  },
  
  // Vue 文件规则（4格缩进）
  {
    files: ['**/*.vue'],
    rules: {
      'indent': ['error', 4, { 'SwitchCase': 1 }]
    }
  },
  
  // Vue 规则
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/no-unused-vars': 'warn',
      'vue/require-default-prop': 'off',
      'vue/html-indent': ['error', 4],
      'vue/valid-v-slot': 'off',
      'no-console': 'off',
      'vue/no-v-html': 'off',
      'vue/no-template-shadow': 'off'
    }
  }
];
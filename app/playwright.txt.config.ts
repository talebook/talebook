import { defineConfig } from '@playwright/test';
import library from './playwright.library.config';

// Reuse the test-owned production frontend and isolated mock backend lifecycle.
export default defineConfig(library, {
    testMatch: 'txt-initial-polling.spec.ts',
    reporter: 'list',
});

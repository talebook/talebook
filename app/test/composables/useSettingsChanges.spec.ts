import { describe, expect, it } from 'vitest';
import { changedSettings } from '@/composables/useSettingsChanges';

describe('changedSettings', () => {
    it('does not resubmit unchanged import fields from a stale form', () => {
        const saved = { title: 'Books', import_allowed_roots: ['/old'], import_mode: 'copy' };
        expect(changedSettings({ ...saved, title: 'My Books' }, saved)).toEqual({ title: 'My Books' });
    });
    it('preserves edited booleans, numbers, lists and nested objects', () => {
        const saved = { flag: true, count: 5, roots: ['/old'], options: { enabled: false } };
        const current = { flag: false, count: 0, roots: ['/books', '/books1'], options: { enabled: true } };
        expect(changedSettings(current, saved)).toEqual(current);
    });
    it('treats cloned arrays as unchanged and reverted edits as clean', () => {
        expect(changedSettings({ roots: ['/books'] }, { roots: ['/books'] })).toEqual({});
    });
});

import { describe, expect, it } from 'vitest';
import {
    applyBuiltinThemeRuntimeDescriptor,
    buildBuiltinThemeRuntimeDescriptor,
    clearBuiltinThemeRuntime,
} from '~/utils/builtin-theme-runtime';

describe('builtin theme runtime contract', () => {
    it.each([
        ['light-gray', 'light', '#555c64', '#fff'],
        ['light-gray', 'dark', '#747b84', '#fff'],
        ['minimal', 'light', '#ff6600', '#000'],
        ['minimal', 'dark', '#d35400', '#111'],
        ['graphite', 'light', '#3f6da3', '#fff'],
        ['graphite', 'dark', '#6f9dd6', '#0d1013'],
        ['brass', 'light', '#a9773a', '#fff'],
        ['brass', 'dark', '#c99a5b', '#1f1a10'],
        ['warm-red', 'light', '#8f3a34', '#fbfaf6'],
        ['warm-red', 'dark', '#b5524a', '#201d18'],
    ] as const)('maps %s/%s to independent semantic primary tokens', (theme, mode, primary, onPrimary) => {
        const descriptor = buildBuiltinThemeRuntimeDescriptor(theme, mode);

        expect(descriptor.primary).toBe(primary);
        expect(descriptor.onPrimary).toBe(onPrimary);
    });

    it('maps the warm-red light theme to its semantic colors and body classes', () => {
        const descriptor = buildBuiltinThemeRuntimeDescriptor('warm-red', 'light');

        expect(descriptor).toMatchObject({
            themeName: 'warm-red',
            mode: 'light',
            primary: '#8f3a34',
            onPrimary: '#fbfaf6',
            bodyClasses: [
                'tb-current-builtin-theme-warm-red',
                'tb-current-builtin-theme-mode-light',
            ],
        });
        expect(descriptor.css).toContain('--v-theme-primary: 143,58,52;');
        expect(descriptor.css).toContain('--v-theme-on-primary: 251,250,246;');
    });

    it('atomically replaces and clears the active runtime DOM state', () => {
        const doc = document.implementation.createHTMLDocument();
        const graphite = buildBuiltinThemeRuntimeDescriptor('graphite', 'dark');
        const warmRed = buildBuiltinThemeRuntimeDescriptor('warm-red', 'light');

        applyBuiltinThemeRuntimeDescriptor(doc, graphite);
        applyBuiltinThemeRuntimeDescriptor(doc, warmRed);

        expect(doc.body.classList.contains('tb-current-builtin-theme-graphite')).toBe(false);
        expect(doc.body.classList.contains('tb-current-builtin-theme-warm-red')).toBe(true);
        expect(doc.body.classList.contains('tb-current-builtin-theme-mode-light')).toBe(true);
        expect(doc.querySelectorAll('style[data-talebook-theme-runtime]')).toHaveLength(1);
        expect(doc.querySelector('style[data-talebook-theme-runtime]')?.getAttribute('data-talebook-theme-runtime'))
            .toBe('warm-red');

        clearBuiltinThemeRuntime(doc);

        expect([...doc.body.classList].some(className => className.startsWith('tb-current-builtin-theme-')))
            .toBe(false);
        expect(doc.querySelector('style[data-talebook-theme-runtime]')).toBeNull();
    });
});

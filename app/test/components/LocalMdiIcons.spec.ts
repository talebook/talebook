import { readdirSync, readFileSync, statSync } from 'node:fs';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { LocalMdiIcon, localMdiPaths } from '@/utils/local-mdi-icons';

const appRoot = process.cwd();

function sourceFiles(path: string): string[] {
    if (!statSync(path).isDirectory()) return [path];

    return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
        const child = `${path}/${entry.name}`;
        if (entry.isDirectory()) return sourceFiles(child);
        return /\.(?:js|ts|vue)$/.test(entry.name) ? [child] : [];
    });
}

describe('local MDI icons', () => {
    it('renders a registered icon as inline SVG', () => {
        const wrapper = mount(LocalMdiIcon, {
            props: { tag: 'i', icon: 'mdi-home' },
        });

        expect(wrapper.find('svg').exists()).toBe(true);
        expect(wrapper.find('path').attributes('d')).toBe(localMdiPaths['mdi-home']);
    });

    it('uses a visible fallback for an unregistered icon', () => {
        const wrapper = mount(LocalMdiIcon, {
            props: { tag: 'i', icon: 'mdi-does-not-exist' },
        });

        expect(wrapper.find('path').attributes('d')).toBeTruthy();
    });

    it('registers every mdi icon name used by production source', () => {
        const roots = ['app.vue', 'components', 'layouts', 'pages'];
        const used = new Set<string>();

        for (const root of roots) {
            for (const file of sourceFiles(`${appRoot}/${root}`)) {
                for (const match of readFileSync(file, 'utf8').matchAll(/mdi-[a-z0-9-]+/g)) {
                    used.add(match[0]);
                }
            }
        }

        const missing = [...used].filter(name => !localMdiPaths[name]).sort();
        expect(missing).toEqual([]);
    });
});

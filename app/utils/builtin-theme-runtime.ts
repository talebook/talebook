import {
    buildBuiltinThemeOverlayCss,
    getBuiltinThemePalette,
    type BuiltinThemeMode,
    type BuiltinThemeName,
} from './builtin-theme-overlay';
import { builtinThemePageCss } from './builtin-theme-page-css';

export interface BuiltinThemeRuntimeDescriptor {
    themeName: BuiltinThemeName
    mode: BuiltinThemeMode
    primary: string
    onPrimary: string
    bodyClasses: [string, string]
    css: string
}

const BODY_THEME_CLASS_PREFIX = 'tb-current-builtin-theme-';
const BODY_MODE_CLASS_PREFIX = 'tb-current-builtin-theme-mode-';
const RUNTIME_STYLE_SELECTOR = 'style[data-talebook-theme-runtime]';

function hexToRgbTuple(hex: string) {
    const value = hex.replace('#', '');
    const normalized = value.length === 3
        ? value.split('').map(part => `${part}${part}`).join('')
        : value;
    return [0, 2, 4]
        .map(offset => Number.parseInt(normalized.slice(offset, offset + 2), 16))
        .join(',');
}

export function buildBuiltinThemeRuntimeDescriptor(
    themeName: BuiltinThemeName,
    mode: BuiltinThemeMode,
): BuiltinThemeRuntimeDescriptor {
    const palette = getBuiltinThemePalette(themeName, mode);
    const bodyClasses: [string, string] = [
        `tb-current-builtin-theme-${themeName}`,
        `tb-current-builtin-theme-mode-${mode}`,
    ];
    const selector = `body.${bodyClasses.join('.')}`;

    return {
        themeName,
        mode,
        primary: palette.primary,
        onPrimary: palette.primaryText,
        bodyClasses,
        css: `
            ${builtinThemePageCss[themeName]}
            ${buildBuiltinThemeOverlayCss(themeName)}
            ${selector} .v-theme--${mode} {
                --v-theme-primary: ${hexToRgbTuple(palette.primary)};
                --v-theme-on-primary: ${hexToRgbTuple(palette.primaryText)};
                --v-theme-secondary: ${hexToRgbTuple(palette.primary)};
                --v-theme-on-secondary: ${hexToRgbTuple(palette.primaryText)};
                --v-theme-background: ${hexToRgbTuple(palette.background)};
                --v-theme-on-background: ${hexToRgbTuple(palette.text)};
                --v-theme-surface: ${hexToRgbTuple(palette.background)};
                --v-theme-on-surface: ${hexToRgbTuple(palette.text)};
                --v-theme-surface-variant: ${hexToRgbTuple(palette.tonalBackground)};
                --v-theme-on-surface-variant: ${hexToRgbTuple(palette.muted)};
                --v-theme-outline: ${hexToRgbTuple(palette.outlinedBorder)};
            }
        `,
    };
}

export function clearBuiltinThemeRuntime(doc: Document = document) {
    for (const className of [...doc.body.classList]) {
        if (className.startsWith(BODY_THEME_CLASS_PREFIX) || className.startsWith(BODY_MODE_CLASS_PREFIX)) {
            doc.body.classList.remove(className);
        }
    }
    for (const style of doc.querySelectorAll(RUNTIME_STYLE_SELECTOR)) {
        style.remove();
    }
}

export function applyBuiltinThemeRuntimeDescriptor(
    doc: Document,
    descriptor: BuiltinThemeRuntimeDescriptor,
) {
    const style = doc.createElement('style');
    style.setAttribute('data-talebook-theme-runtime', descriptor.themeName);
    style.textContent = descriptor.css;

    clearBuiltinThemeRuntime(doc);
    doc.head.appendChild(style);
    doc.body.classList.add(...descriptor.bodyClasses);
}

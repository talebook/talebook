export const builtinThemeNames = ['light-gray', 'minimal', 'graphite', 'brass', 'warm-red'] as const;

export type BuiltinThemeName = typeof builtinThemeNames[number];
export type BuiltinThemeMode = 'light' | 'dark';

export interface BuiltinThemePalette {
    background: string
    text: string
    title: string
    muted: string
    border: string
    shadow: string
    radius: string
    buttonRadius: string
    primary: string
    primaryText: string
    primaryTextColor: string
    tonalBackground: string
    tonalText: string
    outlinedBorder: string
    fieldRadius: string
    fieldBackground: string
    fieldText: string
    fontFamily: string
    fontSize: string
    titleFontFamily?: string
    titleFontSize: string
    cardPadding: string
    chipRadius: string
    chipHeight: string
    chipPadding: string
}

const systemFont = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", sans-serif';
const sansFont = 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", sans-serif';
const serifFont = 'Georgia, "Songti SC", "Noto Serif SC", serif';
const minimalFont = 'Verdana, Geneva, sans-serif';

const overlayThemePalettes: Record<BuiltinThemeName, Record<BuiltinThemeMode, BuiltinThemePalette>> = {
    'light-gray': {
        dark: {
            background: '#1b1d20',
            text: '#e8eaed',
            title: '#e8eaed',
            muted: '#a1a7ae',
            border: '#34383d',
            shadow: '0 12px 30px rgba(0,0,0,.28)',
            radius: '8px',
            buttonRadius: '7px',
            primary: '#747b84',
            primaryText: '#fff',
            primaryTextColor: '#c4c8ce',
            tonalBackground: '#2f3338',
            tonalText: '#eceff1',
            outlinedBorder: '#555b63',
            fieldRadius: '7px',
            fieldBackground: '#2b2f33',
            fieldText: '#f3f4f6',
            fontFamily: `Poppins, Roboto, "Noto Sans SC", ${systemFont}`,
            fontSize: '13px',
            titleFontSize: '16px',
            cardPadding: '12px 18px 18px',
            chipRadius: '999px',
            chipHeight: '24px',
            chipPadding: '0 10px',
        },
        light: {
            background: '#ffffff',
            text: '#2b2f33',
            title: '#24282d',
            muted: '#697079',
            border: '#d7dadd',
            shadow: '0 8px 22px rgba(39,43,48,.08)',
            radius: '8px',
            buttonRadius: '7px',
            primary: '#555c64',
            primaryText: '#fff',
            primaryTextColor: '#41474e',
            tonalBackground: '#e6e8ea',
            tonalText: '#34383d',
            outlinedBorder: '#b9bec4',
            fieldRadius: '7px',
            fieldBackground: '#ffffff',
            fieldText: '#2b2f33',
            fontFamily: `Poppins, Roboto, "Noto Sans SC", ${systemFont}`,
            fontSize: '13px',
            titleFontSize: '16px',
            cardPadding: '12px 18px 18px',
            chipRadius: '999px',
            chipHeight: '24px',
            chipPadding: '0 10px',
        },
    },
    minimal: {
        dark: {
            background: '#1f2118',
            text: '#d8d2b8',
            title: '#d8d2b8',
            muted: '#9c967d',
            border: '#3b382a',
            shadow: 'none',
            radius: '0',
            buttonRadius: '0',
            primary: '#d35400',
            primaryText: '#111',
            primaryTextColor: '#ff8a2a',
            tonalBackground: '#3a2a18',
            tonalText: '#ffd0a3',
            outlinedBorder: '#ff8a2a',
            fieldRadius: '0',
            fieldBackground: '#2b2d22',
            fieldText: '#f4ecd1',
            fontFamily: minimalFont,
            fontSize: '12px',
            titleFontSize: '13px',
            cardPadding: '4px 6px',
            chipRadius: '0',
            chipHeight: '18px',
            chipPadding: '0 4px',
        },
        light: {
            background: '#f6f6ef',
            text: '#000',
            title: '#000',
            muted: '#828282',
            border: '#e6e1c8',
            shadow: 'none',
            radius: '0',
            buttonRadius: '0',
            primary: '#ff6600',
            primaryText: '#000',
            primaryTextColor: '#ff6600',
            tonalBackground: '#fff3df',
            tonalText: '#000',
            outlinedBorder: '#ff6600',
            fieldRadius: '0',
            fieldBackground: '#fff',
            fieldText: '#000',
            fontFamily: minimalFont,
            fontSize: '12px',
            titleFontSize: '13px',
            cardPadding: '4px 6px',
            chipRadius: '0',
            chipHeight: '18px',
            chipPadding: '0 4px',
        },
    },
    graphite: {
        dark: {
            background: '#1c2024',
            text: '#e7eaed',
            title: '#eef1f4',
            muted: '#97a0aa',
            border: '#2b3238',
            shadow: '0 1px 2px rgba(0,0,0,.4)',
            radius: '8px',
            buttonRadius: '7px',
            primary: '#6f9dd6',
            primaryText: '#0d1013',
            primaryTextColor: '#8fb4de',
            tonalBackground: '#23303d',
            tonalText: '#bcd4ee',
            outlinedBorder: '#3f5a75',
            fieldRadius: '7px',
            fieldBackground: '#1f242a',
            fieldText: '#e7eaed',
            fontFamily: sansFont,
            fontSize: '13px',
            titleFontSize: '16px',
            cardPadding: '12px 18px 18px',
            chipRadius: '999px',
            chipHeight: '24px',
            chipPadding: '0 10px',
        },
        light: {
            background: '#ffffff',
            text: '#1b1f24',
            title: '#14181d',
            muted: '#5f6771',
            border: '#d9dee4',
            shadow: '0 1px 2px rgba(15,23,42,.06)',
            radius: '8px',
            buttonRadius: '7px',
            primary: '#3f6da3',
            primaryText: '#fff',
            primaryTextColor: '#235489',
            tonalBackground: '#e3edf7',
            tonalText: '#235489',
            outlinedBorder: '#9dbfe0',
            fieldRadius: '7px',
            fieldBackground: '#eef1f4',
            fieldText: '#1b1f24',
            fontFamily: sansFont,
            fontSize: '13px',
            titleFontSize: '16px',
            cardPadding: '12px 18px 18px',
            chipRadius: '999px',
            chipHeight: '24px',
            chipPadding: '0 10px',
        },
    },
    brass: {
        dark: {
            background: '#232019',
            text: '#ece7dd',
            title: '#f4ead6',
            muted: '#a89f90',
            border: '#34302a',
            shadow: '0 12px 30px rgba(0,0,0,.3)',
            radius: '6px',
            buttonRadius: '6px',
            primary: '#c99a5b',
            primaryText: '#1f1a10',
            primaryTextColor: '#d8b47a',
            tonalBackground: '#3d3020',
            tonalText: '#f0c98b',
            outlinedBorder: '#6b5638',
            fieldRadius: '6px',
            fieldBackground: '#2b261d',
            fieldText: '#ece7dd',
            fontFamily: systemFont,
            fontSize: '13px',
            titleFontFamily: serifFont,
            titleFontSize: '17px',
            cardPadding: '12px 18px 18px',
            chipRadius: '999px',
            chipHeight: '24px',
            chipPadding: '0 10px',
        },
        light: {
            background: '#fbf9f4',
            text: '#2a251d',
            title: '#2a251d',
            muted: '#7a7263',
            border: '#e2dccc',
            shadow: '0 1px 2px rgba(60,50,30,.07)',
            radius: '6px',
            buttonRadius: '6px',
            primary: '#a9773a',
            primaryText: '#fff',
            primaryTextColor: '#8a5a1f',
            tonalBackground: '#efe4cf',
            tonalText: '#7a5320',
            outlinedBorder: '#cbb384',
            fieldRadius: '6px',
            fieldBackground: '#f2efe8',
            fieldText: '#2a251d',
            fontFamily: systemFont,
            fontSize: '13px',
            titleFontFamily: serifFont,
            titleFontSize: '17px',
            cardPadding: '12px 18px 18px',
            chipRadius: '999px',
            chipHeight: '24px',
            chipPadding: '0 10px',
        },
    },
    'warm-red': {
        dark: {
            background: '#2a251f',
            text: '#ece7dd',
            title: '#ece7dd',
            muted: '#a49c8b',
            border: '#3a342b',
            shadow: '0 8px 22px rgba(0,0,0,.34)',
            radius: '3px',
            buttonRadius: '3px',
            primary: '#b5524a',
            primaryText: '#201d18',
            primaryTextColor: '#e0938c',
            tonalBackground: '#3a2624',
            tonalText: '#e9b6b1',
            outlinedBorder: '#7a463f',
            fieldRadius: '3px',
            fieldBackground: '#2a251f',
            fieldText: '#ece7dd',
            fontFamily: systemFont,
            fontSize: '13px',
            titleFontFamily: serifFont,
            titleFontSize: '17px',
            cardPadding: '12px 18px 18px',
            chipRadius: '3px',
            chipHeight: '24px',
            chipPadding: '0 10px',
        },
        light: {
            background: '#fbfaf6',
            text: '#2a2622',
            title: '#2a2622',
            muted: '#857e70',
            border: '#ddd8cc',
            shadow: '0 1px 2px rgba(60,50,40,.06)',
            radius: '3px',
            buttonRadius: '3px',
            primary: '#8f3a34',
            primaryText: '#fbfaf6',
            primaryTextColor: '#8f3a34',
            tonalBackground: '#f0e2e0',
            tonalText: '#8f3a34',
            outlinedBorder: '#d3a9a4',
            fieldRadius: '3px',
            fieldBackground: '#f0eee6',
            fieldText: '#2a2622',
            fontFamily: systemFont,
            fontSize: '13px',
            titleFontFamily: serifFont,
            titleFontSize: '17px',
            cardPadding: '12px 18px 18px',
            chipRadius: '3px',
            chipHeight: '24px',
            chipPadding: '0 10px',
        },
    },
};

function overlaySelector(themeName: BuiltinThemeName, mode: BuiltinThemeMode, suffix = '') {
    return `body.tb-current-builtin-theme-${themeName}.tb-current-builtin-theme-mode-${mode} .v-overlay-container${suffix}`;
}

function buildModeOverlayCss(themeName: BuiltinThemeName, mode: BuiltinThemeMode, palette: BuiltinThemePalette) {
    const base = overlaySelector(themeName, mode);
    const titleFontFamily = palette.titleFontFamily || palette.fontFamily;
    // cardPadding 是 CSS 简写（如 "12px 18px 18px"），取水平内边距让弹窗标题/正文/操作栏左右对齐
    const cardPaddingParts = palette.cardPadding.split(/\s+/);
    const cardPaddingX = cardPaddingParts[1] || cardPaddingParts[0];

    return `
        ${base} { color: ${palette.text}; font-family: ${palette.fontFamily}; font-size: ${palette.fontSize}; }
        ${base} .v-overlay__content .v-card {
            background: ${palette.background} !important;
            border: 1px solid ${palette.border} !important;
            border-radius: ${palette.radius} !important;
            box-shadow: ${palette.shadow} !important;
            color: ${palette.text} !important;
            font-family: ${palette.fontFamily} !important;
        }
        ${base} .v-overlay__content .v-toolbar {
            background: ${palette.background} !important;
            border-bottom: 1px solid ${palette.border} !important;
            color: ${palette.title} !important;
            font-family: ${titleFontFamily} !important;
        }
        ${base} .v-overlay__content .v-toolbar.bg-primary,
        ${base} .v-overlay__content .bg-primary {
            background: ${palette.primary} !important;
            color: ${palette.primaryText} !important;
        }
        ${base} .v-overlay__content .v-card-title,
        ${base} .v-overlay__content .v-toolbar-title {
            color: ${palette.title} !important;
            font-family: ${titleFontFamily} !important;
            font-size: ${palette.titleFontSize} !important;
            font-weight: 600;
        }
        ${base} .v-overlay__content .v-toolbar.bg-primary .v-toolbar-title,
        ${base} .v-overlay__content .v-toolbar.bg-primary .v-btn {
            color: ${palette.primaryText} !important;
        }
        ${base} .v-overlay__content .v-toolbar.bg-primary .v-btn.v-btn--variant-outlined {
            border-color: ${palette.primaryText} !important;
        }
        ${base} .v-overlay__content .v-card-title {
            padding-left: ${cardPaddingX} !important;
            padding-right: ${cardPaddingX} !important;
        }
        ${base} .v-overlay__content .v-card-text {
            color: ${palette.text} !important;
            font-size: ${palette.fontSize} !important;
            padding: ${palette.cardPadding} !important;
        }
        ${base} .v-overlay__content .v-card-actions {
            padding-bottom: ${cardPaddingX} !important;
            padding-left: ${cardPaddingX} !important;
            padding-right: ${cardPaddingX} !important;
        }
        ${base} .v-overlay__content .text-medium-emphasis,
        ${base} .v-overlay__content .v-card-subtitle {
            color: ${palette.muted} !important;
        }
        ${base} .v-overlay__content .v-card-subtitle {
            padding-left: ${cardPaddingX} !important;
            padding-right: ${cardPaddingX} !important;
        }
        ${base} .v-overlay__content .v-btn {
            border-radius: ${palette.buttonRadius} !important;
            font-family: ${palette.fontFamily} !important;
            font-size: ${palette.fontSize} !important;
            text-transform: none !important;
        }
        ${base} .v-overlay__content .v-btn.bg-primary {
            background: ${palette.primary} !important;
            color: ${palette.primaryText} !important;
        }
        ${base} .v-overlay__content .v-btn.v-btn--variant-tonal {
            background: ${palette.tonalBackground} !important;
            color: ${palette.tonalText} !important;
        }
        ${base} .v-overlay__content .v-btn.v-btn--variant-outlined {
            border-color: ${palette.outlinedBorder} !important;
            color: ${palette.primaryTextColor} !important;
        }
        ${base} .v-overlay__content .v-btn.v-btn--variant-text,
        ${base} .v-overlay__content .text-primary,
        ${base} .v-overlay__content a:not(.v-btn) {
            color: ${palette.primaryTextColor} !important;
        }
        ${base} .v-overlay__content .v-avatar.bg-primary {
            background: ${palette.primary} !important;
            color: ${palette.primaryText} !important;
        }
        ${base} .v-overlay__content .v-chip {
            border-radius: ${palette.chipRadius} !important;
            font-family: ${palette.fontFamily} !important;
            font-size: ${palette.fontSize} !important;
            height: ${palette.chipHeight} !important;
            padding: ${palette.chipPadding} !important;
        }
        ${base} .v-overlay__content .v-chip.text-primary,
        ${base} .v-overlay__content .v-chip.v-chip--variant-tonal {
            background: ${palette.tonalBackground} !important;
            color: ${palette.tonalText} !important;
        }
        ${base} .v-overlay__content .v-field {
            background: ${palette.fieldBackground} !important;
            border-radius: ${palette.fieldRadius} !important;
            color: ${palette.fieldText} !important;
        }
        ${base} .v-overlay__content .v-field__input,
        ${base} .v-overlay__content .v-label,
        ${base} .v-overlay__content .v-select__selection {
            color: ${palette.fieldText} !important;
        }
        ${base} .v-overlay__content .v-list {
            background: ${palette.background} !important;
            color: ${palette.text} !important;
        }
        ${base} .v-overlay__content .v-list-item-title {
            color: ${palette.text} !important;
            font-family: ${palette.fontFamily} !important;
            font-size: ${palette.fontSize} !important;
        }
        ${base} .v-overlay__content .v-divider {
            border-color: ${palette.border} !important;
        }
        ${base} .v-overlay__content .v-progress-circular {
            color: ${palette.primaryTextColor} !important;
        }
        ${base} .v-overlay__content .v-alert {
            background: ${palette.tonalBackground} !important;
            border: 1px solid ${palette.outlinedBorder} !important;
            border-radius: ${palette.radius} !important;
            box-shadow: none !important;
            color: ${palette.tonalText} !important;
        }
        ${base} .v-overlay__content .v-alert .v-alert-title,
        ${base} .v-overlay__content .v-alert .v-alert__content {
            color: ${palette.tonalText} !important;
        }
        ${base} .v-overlay__content .v-alert .v-alert__prepend .v-icon,
        ${base} .v-overlay__content .v-alert .v-alert__close .v-icon {
            color: ${palette.tonalText} !important;
        }
    `;
}

export function buildBuiltinThemeOverlayCss(themeName: BuiltinThemeName) {
    const palettes = overlayThemePalettes[themeName];

    return `
        ${buildModeOverlayCss(themeName, 'dark', palettes.dark)}
        ${buildModeOverlayCss(themeName, 'light', palettes.light)}
    `;
}

export function getBuiltinThemePalette(themeName: BuiltinThemeName, mode: BuiltinThemeMode) {
    return overlayThemePalettes[themeName][mode];
}

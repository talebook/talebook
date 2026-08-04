export const builtinThemePageCss = {
    'light-gray': `
        .v-application { background: #111315 !important; color: #e8eaed; font-family: Poppins, Roboto, "Noto Sans SC", system-ui, sans-serif; }
        .v-main { background: #111315 !important; }
        .v-main .v-container { padding: 18px !important; }
        .v-main .v-card { background: #1b1d20 !important; color: #e8eaed !important; border: 1px solid #34383d !important; box-shadow: 0 12px 30px rgba(0,0,0,.28) !important; border-radius: 8px !important; }
        .v-main .text-medium-emphasis { color: #a1a7ae !important; }
        .v-main .v-btn { border-radius: 7px !important; text-transform: none !important; }
        .v-main .v-btn.bg-primary { background: #747b84 !important; color: #fff !important; }
        .v-main .v-avatar.bg-primary { background: #747b84 !important; }
        .v-main .v-btn.v-btn--variant-tonal { background: #2f3338 !important; color: #eceff1 !important; }
        .v-main .v-btn.v-btn--variant-outlined { border-color: #555b63 !important; color: #c4c8ce !important; }
        .v-main .v-btn.v-btn--variant-text { color: #c4c8ce !important; }
        .v-main .v-btn.v-btn--disabled { color: #737a82 !important; opacity: .7; }
        .v-main .text-primary,
        .v-main a:not(.v-btn) { color: #c4c8ce !important; }
        .v-main .v-field { border-radius: 7px !important; }
        .v-main .v-chip.text-primary,
        .v-main .v-chip.v-chip--variant-tonal { background: #2f3338 !important; color: #e5e7eb !important; }
        .upload-btn { background: #747b84 !important; color: #fff !important; box-shadow: 0 10px 24px rgba(0,0,0,.28) !important; }
        .tb-theme-light-gray .tb-theme-appbar { background: #202326 !important; color: #eceff1 !important; border-bottom: 1px solid #33383d; box-shadow: 0 1px 0 rgba(255,255,255,.03) inset !important; }
        .tb-theme-light-gray .tb-theme-drawer { background: #17191c !important; color: #d7dadd !important; border-right: 1px solid #30343a; }
        .tb-theme-light-gray .tb-theme-brand-mark { background: #747b84; color: #fff; box-shadow: none; }
        .tb-theme-light-gray .tb-theme-brand-title { color: #eceff1; }
        .tb-theme-light-gray .tb-theme-icon,
        .tb-theme-light-gray .tb-theme-nav-toggle { color: #d2d6da !important; }
        .tb-theme-light-gray .tb-theme-search-field .v-field { background: #2b2f33 !important; color: #f3f4f6 !important; border: 1px solid #444a50; box-shadow: none !important; }
        .tb-theme-light-gray .tb-theme-search-field .v-field__input { color: #f3f4f6 !important; }
        .tb-theme-light-gray .tb-theme-search-category { color: #e5e7eb !important; margin-right: 6px; }
        .tb-theme-light-gray .v-list { padding-top: 6px !important; }
        .tb-theme-light-gray .v-list-item { min-height: 34px !important; padding-inline: 10px !important; }
        .tb-theme-light-gray .v-list-item__prepend { width: 30px !important; }
        .tb-theme-light-gray .v-list-item__prepend > .v-icon { color: #aeb4bc; font-size: 20px !important; margin-inline-end: 10px !important; }
        .tb-theme-light-gray .v-list-group__items .v-list-item { padding-inline-start: 22px !important; }
        .tb-theme-light-gray .v-list-group__items .v-list-item__prepend { width: 28px !important; }
        .tb-theme-light-gray .v-list-item-title { font-size: 13px !important; font-weight: 500; }
        .tb-theme-light-gray .v-list-item--active { color: #fff; background: #2f3338; }
        .tb-theme-light-gray .v-list-subheader { color: #8f969e !important; font-size: 11px !important; font-weight: 700; letter-spacing: .06em; }
        .tb-theme-light-gray * { scrollbar-width: thin; scrollbar-color: #555b63 #17191c; }
        .tb-theme-light-gray ::-webkit-scrollbar { width: 8px; height: 8px; }
        .tb-theme-light-gray ::-webkit-scrollbar-thumb { background: #555b63; border-radius: 6px; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .v-application { background: #f2f3f3 !important; color: #2b2f33; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .v-main { background: #f2f3f3 !important; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .v-main .v-card { background: #ffffff !important; color: #2b2f33 !important; border-color: #d7dadd !important; box-shadow: 0 8px 22px rgba(39,43,48,.08) !important; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .v-main .text-medium-emphasis { color: #697079 !important; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .v-main .v-btn.bg-primary { background: #555c64 !important; color: #fff !important; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .v-main .v-avatar.bg-primary { background: #555c64 !important; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .v-main .v-btn.v-btn--variant-tonal { background: #e2e5e8 !important; color: #34383d !important; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .v-main .v-btn.v-btn--variant-outlined { border-color: #b9bec4 !important; color: #41474e !important; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .v-main .v-btn.v-btn--variant-text,
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .v-main .text-primary,
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .v-main a:not(.v-btn) { color: #41474e !important; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .v-main .v-chip.text-primary,
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .v-main .v-chip.v-chip--variant-tonal { background: #e6e8ea !important; color: #34383d !important; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .upload-btn { background: #555c64 !important; color: #fff !important; box-shadow: 0 10px 22px rgba(85,92,100,.22) !important; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .tb-theme-light-gray .tb-theme-appbar { background: #f7f8f8 !important; color: #2b2f33 !important; border-bottom-color: #d0d3d6; box-shadow: 0 1px 8px rgba(39,43,48,.06) !important; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .tb-theme-light-gray .tb-theme-drawer { background: #eceeef !important; color: #34383d !important; border-right-color: #d0d3d6; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .tb-theme-light-gray * { scrollbar-color: #b3b8bf #eceeef; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .tb-theme-light-gray ::-webkit-scrollbar-thumb { background: #b3b8bf; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .tb-theme-light-gray ::-webkit-scrollbar-track { background: #eceeef; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .tb-theme-light-gray .tb-theme-brand-mark { background: #555c64; color: #fff; box-shadow: none; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .tb-theme-light-gray .tb-theme-brand-title { color: #24282d; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .tb-theme-light-gray .tb-theme-icon,
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .tb-theme-light-gray .tb-theme-nav-toggle { color: #555c64 !important; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .tb-theme-light-gray .tb-theme-search-field .v-field { background: #ffffff !important; border: 1px solid #cfd3d7; color: #2b2f33 !important; box-shadow: 0 1px 2px rgba(39,43,48,.04) !important; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .tb-theme-light-gray .tb-theme-search-field .v-field__input { color: #2b2f33 !important; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .tb-theme-light-gray .tb-theme-search-field .v-label,
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .tb-theme-light-gray .tb-theme-search-field .v-icon { color: #697079 !important; opacity: 1; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .tb-theme-light-gray .tb-theme-search-category { color: #555c64 !important; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .tb-theme-light-gray .v-list-item-title { color: #34383d !important; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .tb-theme-light-gray .v-list-item__prepend > .v-icon { color: #6f757d; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .tb-theme-light-gray .v-list-item--active { background: #dfe2e5 !important; color: #2b2f33 !important; }
        body.tb-current-builtin-theme-light-gray.tb-current-builtin-theme-mode-light .tb-theme-light-gray .v-list-subheader { color: #737a82 !important; }
    `,
    'minimal': `
        .v-application { background: #f6f6ef !important; color: #000; font-family: Verdana, Geneva, sans-serif; font-size: 12px; }
        .v-main { background: #f6f6ef !important; }
        .v-main .v-container { padding: 4px 6px !important; }
        .v-main .v-card { background: #f6f6ef !important; color: #000 !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; }
        .v-main .v-card-title { font-size: 13px !important; line-height: 18px !important; padding: 4px 6px !important; }
        .v-main .v-card-text { font-size: 12px !important; line-height: 16px !important; padding: 4px 6px !important; }
        .v-main .v-row { margin: 0 !important; }
        .v-main .v-col { padding: 3px !important; }
        .v-main .v-btn { border-radius: 0 !important; font-family: Verdana, Geneva, sans-serif !important; font-size: 11px !important; min-height: 22px !important; padding: 0 5px !important; text-transform: none !important; }
        .v-main .v-btn.bg-primary { background: #ff6600 !important; color: #000 !important; }
        .v-main .v-avatar.bg-primary { background: #ff6600 !important; }
        .v-main .v-btn.v-btn--variant-tonal { background: #fff3df !important; color: #000 !important; }
        .v-main .v-btn.v-btn--variant-outlined { border-color: #ff6600 !important; color: #ff6600 !important; }
        .v-main .v-btn.v-btn--variant-text,
        .v-main .text-primary,
        .v-main a:not(.v-btn) { color: #ff6600 !important; }
        .v-main .v-btn.v-btn--disabled { color: #828282 !important; opacity: .75; }
        .v-main .v-chip { border-radius: 0 !important; font-size: 10px !important; height: 18px !important; padding-inline: 4px !important; }
        .v-main .v-chip.text-primary,
        .v-main .v-chip.v-chip--variant-tonal { background: #fff3df !important; color: #ff6600 !important; }
        .v-main .v-field { border-radius: 0 !important; font-size: 12px !important; min-height: 28px !important; }
        .upload-btn { background: #ff6600 !important; color: #000 !important; box-shadow: none !important; }
        .tb-theme-minimal .tb-theme-appbar { background: #ff6600 !important; color: #000 !important; min-height: 28px !important; }
        .tb-theme-minimal .tb-theme-drawer { background: #f6f6ef !important; color: #000 !important; border-right: 1px solid #e6e1c8; font-size: 11px; }
        .tb-theme-minimal .tb-theme-brand-mark { background: #fff; border: 1px solid #fff; border-radius: 0; color: #ff6600; height: 18px; width: 18px; }
        .tb-theme-minimal .tb-theme-brand-title { color: #000; font-size: 13px; font-weight: 700; }
        .tb-theme-minimal .v-list { background: #f6f6ef !important; padding: 2px 0 !important; }
        .tb-theme-minimal .v-list-item { min-height: 20px !important; padding: 0 5px !important; }
        .tb-theme-minimal .v-list-item__content { align-self: center !important; }
        .tb-theme-minimal .v-list-item-title { color: #000 !important; font-family: Verdana, Geneva, sans-serif !important; font-size: 11px !important; line-height: 16px !important; }
        .tb-theme-minimal .v-list-item__prepend { display: none !important; }
        .tb-theme-minimal .v-list-group__items .v-list-item { padding-inline-start: 14px !important; }
        .tb-theme-minimal .v-list-item__append { margin-left: 3px !important; }
        .tb-theme-minimal .v-list-item--active { background: #fff3df !important; color: #000 !important; }
        .tb-theme-minimal .v-list-subheader { color: #828282 !important; font-family: Verdana, Geneva, sans-serif !important; font-size: 10px !important; font-weight: 400 !important; min-height: 18px !important; padding: 0 5px !important; text-transform: lowercase; }
        .tb-theme-minimal .v-chip { border: 0 !important; color: #828282 !important; font-size: 10px !important; height: 14px !important; padding: 0 !important; }
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .v-application { background: #1f2118 !important; color: #d8d2b8; }
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .v-main { background: #1f2118 !important; }
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .v-main .v-card { background: #1f2118 !important; color: #d8d2b8 !important; }
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .v-main .v-card-title,
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .v-main .v-card-text { color: #d8d2b8 !important; }
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .v-main .text-medium-emphasis { color: #9c967d !important; }
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .v-main .v-btn.bg-primary { background: #d35400 !important; color: #111 !important; }
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .v-main .v-avatar.bg-primary { background: #d35400 !important; }
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .v-main .v-btn.v-btn--variant-tonal { background: #3a2a18 !important; color: #ffd0a3 !important; }
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .v-main .v-btn.v-btn--variant-outlined { border-color: #ff8a2a !important; color: #ff8a2a !important; }
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .v-main .v-btn.v-btn--variant-text,
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .v-main .text-primary,
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .v-main a:not(.v-btn) { color: #ff8a2a !important; }
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .v-main .v-chip.text-primary,
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .v-main .v-chip.v-chip--variant-tonal { background: #3a2a18 !important; color: #ffd0a3 !important; }
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .upload-btn { background: #d35400 !important; color: #111 !important; box-shadow: none !important; }
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .tb-theme-minimal .tb-theme-appbar { background: #d35400 !important; color: #111 !important; }
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .tb-theme-minimal .tb-theme-drawer { background: #181a13 !important; color: #d8d2b8 !important; border-right-color: #3b382a; }
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .tb-theme-minimal .tb-theme-brand-mark { background: #1f2118; border-color: #1f2118; color: #ff8a2a; }
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .tb-theme-minimal .tb-theme-brand-title { color: #111; }
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .tb-theme-minimal .v-list { background: #181a13 !important; }
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .tb-theme-minimal .v-list-item-title { color: #d8d2b8 !important; }
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .tb-theme-minimal .v-list-item--active { background: #3a2a18 !important; color: #ffd0a3 !important; }
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .tb-theme-minimal .v-list-subheader,
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .tb-theme-minimal .v-chip { color: #9c967d !important; }
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .tb-theme-hn-search input { background: #2b2d22; border-color: #8b7b56; color: #f4ecd1; }
        body.tb-current-builtin-theme-minimal.tb-current-builtin-theme-mode-dark .tb-theme-hn-search button { background: #181a13; border-color: #8b7b56; color: #f4ecd1; }
    `,
    'graphite': `
        .v-application { background: #14171a !important; color: #e7eaed; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", sans-serif; }
        .v-main { background: #14171a !important; }
        .v-main .v-container { padding: 18px !important; }
        .v-main .v-row { margin: -8px !important; }
        .v-main .v-col { padding: 8px !important; }
        .v-main .v-card { background: #1c2024 !important; color: #e7eaed !important; border: 1px solid #2b3238 !important; box-shadow: 0 1px 2px rgba(0,0,0,.4) !important; border-radius: 8px !important; }
        .v-main .v-card-title { color: #eef1f4; font-size: 16px !important; font-weight: 600; padding: 16px 18px 8px !important; }
        .v-main .v-card-subtitle { color: #97a0aa !important; padding-inline: 18px !important; }
        .v-main .v-card-text { color: #c6ccd3; padding: 12px 18px 18px !important; }
        .v-main .text-medium-emphasis { color: #97a0aa !important; }
        .v-main .v-btn { border-radius: 7px !important; text-transform: none !important; }
        .v-main .v-btn.bg-primary { background: #6f9dd6 !important; color: #0d1013 !important; }
        .v-main .v-avatar.bg-primary { background: #6f9dd6 !important; }
        .v-main .v-btn.v-btn--variant-tonal { background: #23303d !important; color: #bcd4ee !important; }
        .v-main .v-btn.v-btn--variant-outlined { border-color: #3f5a75 !important; color: #9fc2e6 !important; }
        .v-main .v-btn.v-btn--variant-text { color: #8fb4de !important; }
        .v-main .v-btn.v-btn--disabled { color: #6a747e !important; opacity: .7; }
        .v-main .text-primary, .v-main a:not(.v-btn) { color: #8fb4de !important; }
        .v-main .v-field { border-radius: 7px !important; }
        .v-main .v-table { border: 1px solid #2b3238 !important; border-radius: 8px !important; }
        .v-main .v-chip.text-primary, .v-main .v-chip.v-chip--variant-tonal { background: #23303d !important; color: #bcd4ee !important; }
        .upload-btn { background: #6f9dd6 !important; color: #0d1013 !important; box-shadow: 0 10px 24px rgba(111,157,214,.28) !important; }
        .tb-theme-graphite * { scrollbar-width: thin; scrollbar-color: #3f4750 #16191d; }
        .tb-theme-graphite ::-webkit-scrollbar { width: 8px; height: 8px; }
        .tb-theme-graphite ::-webkit-scrollbar-thumb { background: #3f4750; border-radius: 6px; }
        .tb-theme-graphite .tb-theme-appbar { background: #191d21 !important; color: #e7eaed !important; border-bottom: 1px solid #262b31; box-shadow: none !important; }
        .tb-theme-graphite .tb-theme-drawer { background: #16191d !important; color: #c2cad2 !important; border-right: 1px solid #242a30; }
        .tb-theme-graphite .tb-theme-brand-mark { background: #6f9dd6; color: #0d1013; }
        .tb-theme-graphite .tb-theme-brand-title { color: #e7eaed; }
        .tb-theme-graphite .tb-theme-icon, .tb-theme-graphite .tb-theme-nav-toggle { color: #aab3bd !important; }
        .tb-theme-graphite .tb-theme-search-field .v-field { background: #1f242a !important; border: 1px solid #2f353d; box-shadow: none !important; color: #e7eaed !important; }
        .tb-theme-graphite .tb-theme-search-field .v-field__input { color: #e7eaed !important; min-height: 34px !important; }
        .tb-theme-graphite .tb-theme-search-field .v-field__input::placeholder { color: #7f8993 !important; opacity: 1; }
        .tb-theme-graphite .tb-theme-search-field .v-label { color: #7f8993 !important; opacity: 1; }
        .tb-theme-graphite .tb-theme-search-field .v-icon { color: #7f8993 !important; opacity: 1; }
        .tb-theme-graphite .v-list { padding-top: 6px !important; }
        .tb-theme-graphite .v-list-item { min-height: 34px !important; padding-inline: 12px !important; }
        .tb-theme-graphite .v-list-item__prepend { width: 30px !important; }
        .tb-theme-graphite .v-list-item__prepend > .v-icon { color: #7f8993; font-size: 20px !important; margin-inline-end: 10px !important; }
        .tb-theme-graphite .v-list-group__items .v-list-item { padding-inline-start: 22px !important; }
        .tb-theme-graphite .v-list-group__items .v-list-item__prepend { width: 28px !important; }
        .tb-theme-graphite .v-list-item-title { color: #c2cad2 !important; font-size: 13px !important; font-weight: 500; }
        .tb-theme-graphite .v-list-item--active { background: rgba(111,157,214,.12) !important; box-shadow: inset 2px 0 0 #6f9dd6; }
        .tb-theme-graphite .v-list-item--active .v-list-item-title { color: #ffffff !important; font-weight: 600; }
        .tb-theme-graphite .v-list-item--active .v-list-item__prepend > .v-icon { color: #6f9dd6; }
        .tb-theme-graphite .v-list-item__append { color: #6a747e; }
        .tb-theme-graphite .v-list-subheader { color: #6a747e !important; font-size: 11px !important; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .v-application { background: #eef1f4 !important; color: #1b1f24; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .v-main { background: #eef1f4 !important; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .v-main .v-card { background: #ffffff !important; color: #1b1f24 !important; border-color: #d9dee4 !important; box-shadow: 0 1px 2px rgba(15,23,42,.06) !important; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .v-main .v-card-title { color: #14181d !important; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .v-main .v-card-text { color: #3a434d !important; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .v-main .text-medium-emphasis { color: #5f6771 !important; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .v-main .v-btn.bg-primary { background: #3f6da3 !important; color: #fff !important; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .v-main .v-avatar.bg-primary { background: #3f6da3 !important; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .v-main .v-btn.v-btn--variant-tonal { background: #e3edf7 !important; color: #235489 !important; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .v-main .v-btn.v-btn--variant-outlined { border-color: #9dbfe0 !important; color: #235489 !important; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .v-main .v-btn.v-btn--variant-text,
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .v-main .text-primary,
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .v-main a:not(.v-btn) { color: #235489 !important; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .v-main .v-chip.text-primary,
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .v-main .v-chip.v-chip--variant-tonal { background: #e3edf7 !important; color: #235489 !important; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .upload-btn { background: #3f6da3 !important; color: #fff !important; box-shadow: 0 10px 22px rgba(63,109,163,.22) !important; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .tb-theme-graphite .tb-theme-appbar { background: #ffffff !important; color: #1b1f24 !important; border-bottom-color: #dde2e8; box-shadow: 0 1px 2px rgba(15,23,42,.05) !important; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .tb-theme-graphite .tb-theme-drawer { background: #f5f7f9 !important; color: #3a434d !important; border-right-color: #e2e6eb; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .tb-theme-graphite * { scrollbar-color: #c3ccd5 #eef1f4; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .tb-theme-graphite ::-webkit-scrollbar-thumb { background: #c3ccd5; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .tb-theme-graphite ::-webkit-scrollbar-track { background: #eef1f4; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .tb-theme-graphite .tb-theme-brand-mark { background: #3f6da3; color: #fff; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .tb-theme-graphite .tb-theme-brand-title { color: #14181d; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .tb-theme-graphite .tb-theme-icon,
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .tb-theme-graphite .tb-theme-nav-toggle { color: #3f6da3 !important; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .tb-theme-graphite .tb-theme-search-field .v-field { background: #eef1f4 !important; border-color: #d4dae0; color: #1b1f24 !important; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .tb-theme-graphite .tb-theme-search-field .v-field__input { color: #1b1f24 !important; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .tb-theme-graphite .tb-theme-search-field .v-field__input::placeholder,
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .tb-theme-graphite .tb-theme-search-field .v-label,
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .tb-theme-graphite .tb-theme-search-field .v-icon { color: #5f6771 !important; opacity: 1; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .tb-theme-graphite .v-list-item-title { color: #3a434d !important; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .tb-theme-graphite .v-list-item__prepend > .v-icon { color: #6b7783; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .tb-theme-graphite .v-list-item--active { background: rgba(63,109,163,.12) !important; box-shadow: inset 2px 0 0 #3f6da3; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .tb-theme-graphite .v-list-item--active .v-list-item-title { color: #235489 !important; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .tb-theme-graphite .v-list-item--active .v-list-item__prepend > .v-icon { color: #3f6da3; }
        body.tb-current-builtin-theme-graphite.tb-current-builtin-theme-mode-light .tb-theme-graphite .v-list-subheader { color: #6b7580 !important; }
    `,
    'brass': `
        .v-application { background: #1a1815 !important; color: #ece7dd; font-family: "Noto Sans SC", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        .v-main { background: #1a1815 !important; }
        .v-main .v-container { padding: 18px !important; }
        .v-main .v-row { margin: -8px !important; }
        .v-main .v-col { padding: 8px !important; }
        .v-main .v-card { background: #232019 !important; color: #ece7dd !important; border: 1px solid #34302a !important; box-shadow: 0 12px 30px rgba(0,0,0,.3) !important; border-radius: 6px !important; }
        .v-main .v-card-title { color: #f4ead6; font-family: Georgia, "Songti SC", "Noto Serif SC", serif; font-size: 17px !important; font-weight: 600; padding: 16px 18px 8px !important; }
        .v-main .v-card-subtitle { color: #a89f90 !important; padding-inline: 18px !important; }
        .v-main .v-card-text { color: #cfc6b6; padding: 12px 18px 18px !important; }
        .v-main .text-medium-emphasis { color: #a89f90 !important; }
        .v-main .v-btn { border-radius: 6px !important; text-transform: none !important; }
        .v-main .v-btn.bg-primary { background: #c99a5b !important; color: #1f1a10 !important; }
        .v-main .v-avatar.bg-primary { background: #c99a5b !important; }
        .v-main .v-btn.v-btn--variant-tonal { background: #332b1d !important; color: #e7d3af !important; }
        .v-main .v-btn.v-btn--variant-outlined { border-color: #6a5636 !important; color: #d8b981 !important; }
        .v-main .v-btn.v-btn--variant-text { color: #d8b981 !important; }
        .v-main .v-btn.v-btn--disabled { color: #776f61 !important; opacity: .7; }
        .v-main .text-primary, .v-main a:not(.v-btn) { color: #d8b981 !important; }
        .v-main .v-field { border-radius: 6px !important; }
        .v-main .v-table { border: 1px solid #34302a !important; border-radius: 6px !important; }
        .v-main .v-chip.text-primary, .v-main .v-chip.v-chip--variant-tonal { background: #332b1d !important; color: #e7d3af !important; }
        .upload-btn { background: #c99a5b !important; color: #1f1a10 !important; box-shadow: 0 10px 24px rgba(201,154,91,.26) !important; }
        .tb-theme-brass * { scrollbar-width: thin; scrollbar-color: #4a4030 #17150f; }
        .tb-theme-brass ::-webkit-scrollbar { width: 8px; height: 8px; }
        .tb-theme-brass ::-webkit-scrollbar-thumb { background: #4a4030; border-radius: 6px; }
        .tb-theme-brass .tb-theme-appbar { background: #1f1c17 !important; color: #ece7dd !important; border-bottom: 1px solid rgba(201,154,91,.55); box-shadow: none !important; }
        .tb-theme-brass .tb-theme-drawer { background: #17150f !important; color: #cabfad !important; border-right: 1px solid #2c281f; }
        .tb-theme-brass .tb-theme-brand-mark { background: transparent; color: #c99a5b; border: 1px solid #c99a5b; font-family: Georgia, "Songti SC", serif; }
        .tb-theme-brass .tb-theme-brand-title { color: #ece7dd; font-family: Georgia, "Songti SC", "Noto Serif SC", serif; letter-spacing: .01em; }
        .tb-theme-brass .tb-theme-icon, .tb-theme-brass .tb-theme-nav-toggle { color: #bcae94 !important; }
        .tb-theme-brass .tb-theme-search-field .v-field { background: #262219 !important; border: 1px solid #3a3428; box-shadow: none !important; color: #ece7dd !important; }
        .tb-theme-brass .tb-theme-search-field .v-field__input { color: #ece7dd !important; min-height: 34px !important; }
        .tb-theme-brass .tb-theme-search-field .v-field__input::placeholder { color: #8a8069 !important; opacity: 1; }
        .tb-theme-brass .tb-theme-search-field .v-label { color: #8a8069 !important; opacity: 1; }
        .tb-theme-brass .tb-theme-search-field .v-icon { color: #8a8069 !important; opacity: 1; }
        .tb-theme-brass .v-list { padding-top: 6px !important; }
        .tb-theme-brass .v-list-item { min-height: 34px !important; padding-inline: 12px !important; }
        .tb-theme-brass .v-list-item__prepend { width: 30px !important; }
        .tb-theme-brass .v-list-item__prepend > .v-icon { color: #8a8069; font-size: 20px !important; margin-inline-end: 10px !important; }
        .tb-theme-brass .v-list-group__items .v-list-item { padding-inline-start: 22px !important; }
        .tb-theme-brass .v-list-group__items .v-list-item__prepend { width: 28px !important; }
        .tb-theme-brass .v-list-item-title { color: #cabfad !important; font-size: 13px !important; font-weight: 500; }
        .tb-theme-brass .v-list-item--active { background: rgba(201,154,91,.12) !important; }
        .tb-theme-brass .v-list-item--active .v-list-item-title { color: #f4ead6 !important; font-weight: 600; }
        .tb-theme-brass .v-list-item--active .v-list-item__prepend > .v-icon { color: #c99a5b; }
        .tb-theme-brass .v-list-item__append { color: #776f61; }
        .tb-theme-brass .v-list-subheader { color: #8a8069 !important; font-size: 11px !important; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .v-application { background: #f2efe8 !important; color: #2a251d; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .v-main { background: #f2efe8 !important; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .v-main .v-card { background: #fbf9f4 !important; color: #2a251d !important; border-color: #e2dccc !important; box-shadow: 0 1px 2px rgba(60,50,30,.07) !important; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .v-main .v-card-title { color: #2a251d !important; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .v-main .v-card-text { color: #4a4436 !important; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .v-main .text-medium-emphasis { color: #7a7263 !important; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .v-main .v-btn.bg-primary { background: #a9773a !important; color: #fff !important; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .v-main .v-avatar.bg-primary { background: #a9773a !important; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .v-main .v-btn.v-btn--variant-tonal { background: #efe4cf !important; color: #7a5320 !important; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .v-main .v-btn.v-btn--variant-outlined { border-color: #cbb384 !important; color: #7a5320 !important; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .v-main .v-btn.v-btn--variant-text,
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .v-main .text-primary,
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .v-main a:not(.v-btn) { color: #8a5a1f !important; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .v-main .v-chip.text-primary,
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .v-main .v-chip.v-chip--variant-tonal { background: #efe4cf !important; color: #7a5320 !important; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .upload-btn { background: #a9773a !important; color: #fff !important; box-shadow: 0 10px 22px rgba(169,119,58,.22) !important; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .tb-theme-brass .tb-theme-appbar { background: #fbf9f4 !important; color: #2a251d !important; border-bottom: 1px solid rgba(169,119,58,.6); box-shadow: 0 1px 2px rgba(60,50,30,.05) !important; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .tb-theme-brass .tb-theme-drawer { background: #efebe1 !important; color: #4a4436 !important; border-right-color: #e2dccc; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .tb-theme-brass * { scrollbar-color: #cdbb95 #efebe1; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .tb-theme-brass ::-webkit-scrollbar-thumb { background: #cdbb95; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .tb-theme-brass ::-webkit-scrollbar-track { background: #efebe1; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .tb-theme-brass .tb-theme-brand-mark { background: transparent; color: #a9773a; border: 1px solid #a9773a; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .tb-theme-brass .tb-theme-brand-title { color: #2a251d; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .tb-theme-brass .tb-theme-icon,
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .tb-theme-brass .tb-theme-nav-toggle { color: #a9773a !important; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .tb-theme-brass .tb-theme-search-field .v-field { background: #f2efe8 !important; border-color: #ddd5c4; color: #2a251d !important; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .tb-theme-brass .tb-theme-search-field .v-field__input { color: #2a251d !important; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .tb-theme-brass .tb-theme-search-field .v-field__input::placeholder,
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .tb-theme-brass .tb-theme-search-field .v-label,
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .tb-theme-brass .tb-theme-search-field .v-icon { color: #7a7263 !important; opacity: 1; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .tb-theme-brass .v-list-item-title { color: #4a4436 !important; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .tb-theme-brass .v-list-item__prepend > .v-icon { color: #8a8069; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .tb-theme-brass .v-list-item--active { background: rgba(169,119,58,.16) !important; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .tb-theme-brass .v-list-item--active .v-list-item-title { color: #7a5320 !important; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .tb-theme-brass .v-list-item--active .v-list-item__prepend > .v-icon { color: #a9773a; }
        body.tb-current-builtin-theme-brass.tb-current-builtin-theme-mode-light .tb-theme-brass .v-list-subheader { color: #8a8069 !important; }
    `,
    'warm-red': `
        .v-application { background: #f4f2ec !important; color: #2a2622; font-family: "Noto Sans SC", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        .v-main { background: #f4f2ec !important; }
        .v-main .v-container { padding: 18px !important; }
        .v-main .v-row { margin: -8px !important; }
        .v-main .v-col { padding: 8px !important; }
        .v-main .v-card { background: #fbfaf6 !important; color: #2a2622 !important; border: 1px solid #ddd8cc !important; box-shadow: 0 1px 2px rgba(60,50,40,.06) !important; border-radius: 3px !important; }
        .v-main .v-card-title { color: #2a2622; font-family: Georgia, "Songti SC", "Noto Serif SC", serif; font-size: 17px !important; font-weight: 600; padding: 16px 18px 8px !important; }
        .v-main .v-card-subtitle { color: #857e70 !important; padding-inline: 18px !important; }
        .v-main .v-card-text { color: #4a453c; padding: 12px 18px 18px !important; }
        .v-main .text-medium-emphasis { color: #857e70 !important; }
        .v-main .v-btn { border-radius: 3px !important; text-transform: none !important; }
        .v-main .v-btn.bg-primary { background: #8f3a34 !important; color: #fbfaf6 !important; }
        .v-main .v-avatar.bg-primary { background: #8f3a34 !important; }
        .v-main .v-btn.v-btn--variant-tonal { background: #f0e2e0 !important; color: #8f3a34 !important; }
        .v-main .v-btn.v-btn--variant-outlined { border-color: #d3a9a4 !important; color: #8f3a34 !important; }
        .v-main .v-btn.v-btn--variant-text { color: #8f3a34 !important; }
        .v-main .v-btn.v-btn--disabled { color: #a49c8b !important; opacity: .7; }
        .v-main .text-primary, .v-main a:not(.v-btn) { color: #8f3a34 !important; }
        .v-main .v-field { border-radius: 3px !important; }
        .v-main .v-table { border: 1px solid #ddd8cc !important; border-radius: 3px !important; }
        .v-main .v-chip.text-primary, .v-main .v-chip.v-chip--variant-tonal { background: #f0e2e0 !important; color: #8f3a34 !important; }
        .upload-btn { background: #8f3a34 !important; color: #fbfaf6 !important; box-shadow: 0 10px 22px rgba(143,58,52,.22) !important; }
        .tb-theme-warm-red * { scrollbar-width: thin; scrollbar-color: #c9c2b1 #efece3; }
        .tb-theme-warm-red ::-webkit-scrollbar { width: 8px; height: 8px; }
        .tb-theme-warm-red ::-webkit-scrollbar-thumb { background: #c9c2b1; border-radius: 6px; }
        .tb-theme-warm-red .tb-theme-appbar { background: #fbfaf6 !important; color: #2a2622 !important; border-bottom: 1px solid #ddd8cc; box-shadow: 0 1px 2px rgba(60,50,40,.05) !important; }
        .tb-theme-warm-red .tb-theme-drawer { background: #efece3 !important; color: #4a453c !important; border-right: 1px solid #ddd8cc; }
        .tb-theme-warm-red .tb-theme-brand-mark { background: #8f3a34; color: #fbfaf6; }
        .tb-theme-warm-red .tb-theme-brand-title { color: #2a2622; font-family: Georgia, "Songti SC", "Noto Serif SC", serif; }
        .tb-theme-warm-red .tb-theme-icon, .tb-theme-warm-red .tb-theme-nav-toggle { color: #8f3a34 !important; }
        .tb-theme-warm-red .tb-theme-search-field .v-field { background: #f0eee6 !important; border: 1px solid #d9d3c5; box-shadow: none !important; color: #2a2622 !important; }
        .tb-theme-warm-red .tb-theme-search-field .v-field__input { color: #2a2622 !important; min-height: 34px !important; }
        .tb-theme-warm-red .tb-theme-search-field .v-field__input::placeholder { color: #857e70 !important; opacity: 1; }
        .tb-theme-warm-red .tb-theme-search-field .v-label { color: #857e70 !important; opacity: 1; }
        .tb-theme-warm-red .tb-theme-search-field .v-icon { color: #857e70 !important; opacity: 1; }
        .tb-theme-warm-red .v-list { padding-top: 4px !important; }
        .tb-theme-warm-red .v-list-item { min-height: 32px !important; padding-inline: 14px !important; border-bottom: 1px dotted #d7d0bf; }
        .tb-theme-warm-red .v-list-item__prepend { width: 30px !important; }
        .tb-theme-warm-red .v-list-item__prepend > .v-icon { color: #a49c8b; font-size: 19px !important; margin-inline-end: 10px !important; }
        .tb-theme-warm-red .v-list-group__items .v-list-item { padding-inline-start: 24px !important; }
        .tb-theme-warm-red .v-list-group__items .v-list-item__prepend { width: 28px !important; }
        .tb-theme-warm-red .v-list-item-title { color: #4a453c !important; font-size: 13px !important; font-weight: 500; }
        .tb-theme-warm-red .v-list-item--active { background: transparent !important; }
        .tb-theme-warm-red .v-list-item--active .v-list-item-title { color: #8f3a34 !important; font-weight: 700; }
        .tb-theme-warm-red .v-list-item--active .v-list-item__prepend > .v-icon { color: #8f3a34; }
        .tb-theme-warm-red .v-list-item__append { color: #857e70; }
        .tb-theme-warm-red .v-list-subheader { color: #a49c8b !important; font-size: 11px !important; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; border-bottom: 0 !important; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .v-application { background: #201d18 !important; color: #ece7dd; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .v-main { background: #201d18 !important; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .v-main .v-card { background: #2a251f !important; color: #ece7dd !important; border-color: #3a342b !important; box-shadow: 0 8px 22px rgba(0,0,0,.34) !important; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .v-main .v-card-title { color: #ece7dd !important; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .v-main .v-card-text { color: #cfc6b6 !important; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .v-main .text-medium-emphasis { color: #a49c8b !important; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .v-main .v-btn.bg-primary { background: #b5524a !important; color: #201d18 !important; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .v-main .v-avatar.bg-primary { background: #b5524a !important; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .v-main .v-btn.v-btn--variant-tonal { background: #3a2624 !important; color: #e9b6b1 !important; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .v-main .v-btn.v-btn--variant-outlined { border-color: #7a463f !important; color: #e0938c !important; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .v-main .v-btn.v-btn--variant-text,
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .v-main .text-primary,
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .v-main a:not(.v-btn) { color: #e0938c !important; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .v-main .v-chip.text-primary,
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .v-main .v-chip.v-chip--variant-tonal { background: #3a2624 !important; color: #e9b6b1 !important; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .upload-btn { background: #b5524a !important; color: #201d18 !important; box-shadow: 0 10px 22px rgba(181,82,74,.28) !important; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .tb-theme-warm-red .tb-theme-appbar { background: #262019 !important; color: #ece7dd !important; border-bottom-color: #3a342b; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .tb-theme-warm-red .tb-theme-drawer { background: #1c1914 !important; color: #cabfad !important; border-right-color: #33302a; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .tb-theme-warm-red * { scrollbar-color: #574b3f #1c1914; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .tb-theme-warm-red ::-webkit-scrollbar-thumb { background: #574b3f; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .tb-theme-warm-red ::-webkit-scrollbar-track { background: #1c1914; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .tb-theme-warm-red .tb-theme-brand-mark { background: #b5524a; color: #201d18; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .tb-theme-warm-red .tb-theme-brand-title { color: #ece7dd; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .tb-theme-warm-red .tb-theme-icon,
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .tb-theme-warm-red .tb-theme-nav-toggle { color: #d06a62 !important; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .tb-theme-warm-red .tb-theme-search-field .v-field { background: #2a251f !important; border-color: #3a342b; color: #ece7dd !important; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .tb-theme-warm-red .tb-theme-search-field .v-field__input { color: #ece7dd !important; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .tb-theme-warm-red .tb-theme-search-field .v-field__input::placeholder,
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .tb-theme-warm-red .tb-theme-search-field .v-label,
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .tb-theme-warm-red .tb-theme-search-field .v-icon { color: #a49c8b !important; opacity: 1; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .tb-theme-warm-red .v-list-item { border-bottom-color: #33302a; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .tb-theme-warm-red .v-list-item-title { color: #cabfad !important; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .tb-theme-warm-red .v-list-item__prepend > .v-icon { color: #8a8069; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .tb-theme-warm-red .v-list-item--active .v-list-item-title { color: #e58a82 !important; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .tb-theme-warm-red .v-list-item--active .v-list-item__prepend > .v-icon { color: #d06a62; }
        body.tb-current-builtin-theme-warm-red.tb-current-builtin-theme-mode-dark .tb-theme-warm-red .v-list-subheader { color: #8a8069 !important; }
    `,
};

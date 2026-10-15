/** Submit only edits made on this page, preserving settings saved elsewhere. */
export function changedSettings(current: Record<string, unknown>, saved: Record<string, unknown>) {
    return Object.fromEntries(Object.entries(current).filter(([key, value]) => (
        JSON.stringify(value) !== JSON.stringify(saved[key])
    )));
}

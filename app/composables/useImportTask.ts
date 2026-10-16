export function activeImportTask(status: Record<string, unknown> = {}): 'scan' | 'import' | null {
    if (status.manual_scan_running) return 'scan';
    if (status.manual_import_running) return 'import';
    if (status.state === 'scanning') return 'scan';
    if (status.state === 'importing') return 'import';
    return null;
}

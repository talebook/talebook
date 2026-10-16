import { describe, expect, it } from 'vitest';
import { activeImportTask } from '../../composables/useImportTask';

describe('resuming import tasks after navigation', () => {
    it('resumes a manual full scan even when automatic monitoring is off', () => {
        expect(activeImportTask({ state: 'off', manual_scan_running: true })).toBe('scan');
    });
    it('switches to the queued import after the scan finishes', () => {
        expect(activeImportTask({ manual_scan_running: true, manual_import_running: true })).toBe('scan');
        expect(activeImportTask({ manual_scan_running: false, manual_import_running: true })).toBe('import');
        expect(activeImportTask({ manual_scan_running: false, manual_import_running: false })).toBeNull();
    });
    it('follows a complete library import through queue, scan and import', () => {
        expect(activeImportTask({ manual_library_import_running: true, manual_library_import_phase: 'queued', manual_scan_running: true })).toBe('import');
        expect(activeImportTask({ manual_library_import_running: true, manual_library_import_phase: 'scanning' })).toBe('scan');
        expect(activeImportTask({ manual_library_import_running: true, manual_library_import_phase: 'importing' })).toBe('import');
        expect(activeImportTask({ manual_library_import_running: false, manual_library_import_phase: 'importing', state: 'off' })).toBeNull();
    });
    it('observes automatic work and stops in idle or failed states', () => {
        expect(activeImportTask({ state: 'scanning' })).toBe('scan');
        expect(activeImportTask({ state: 'importing' })).toBe('import');
        for (const state of ['off', 'watching', 'failed']) expect(activeImportTask({ state })).toBeNull();
    });
});

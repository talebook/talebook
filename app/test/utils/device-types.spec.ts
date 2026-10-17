import { describe, expect, it } from 'vitest';
import { applyDeviceTypeDefaults } from '../../utils/deviceTypes';

const types = [
    { value: 'kindle', default_port: 0 },
    { value: 'boox', default_port: 8085 },
    { value: 'duokan', default_port: 12121 },
];

describe('device type defaults', () => {
    it('switches a new Kindle row to the BOOX port', () => {
        const device = { type: 'kindle', port: 0, schema: '' };
        applyDeviceTypeDefaults(device, types, 'boox');
        expect(device).toEqual({ type: 'boox', port: 8085, schema: 'http' });
    });

    it('replaces the previous default when switching between Wi-Fi readers', () => {
        const device = { type: 'boox', port: 8085, schema: 'https' };
        applyDeviceTypeDefaults(device, types, 'duokan');
        expect(device).toEqual({ type: 'duokan', port: 12121, schema: 'https' });
    });

    it('preserves an explicitly customized port', () => {
        const device = { type: 'boox', port: 9090, schema: 'https' };
        applyDeviceTypeDefaults(device, types, 'duokan');
        expect(device.port).toBe(9090);
    });

    it('supports global device descriptors and a string port from a form', () => {
        const device = { type: 'kindle', port: '0' };
        applyDeviceTypeDefaults(device, [{ value: 'boox', defaultPort: 8085 }], 'boox');
        expect(device.port).toBe(8085);
    });

    it('resets the unused port for Kindle', () => {
        const device = { type: 'boox', port: 9090 };
        applyDeviceTypeDefaults(device, types, 'kindle');
        expect(device.port).toBe(0);
    });

    it('ignores unavailable types', () => {
        const device = { type: 'boox', port: 8085 };
        applyDeviceTypeDefaults(device, types, 'disabled');
        expect(device).toEqual({ type: 'boox', port: 8085 });
    });
});

type Device = { type: string; port?: number | string; schema?: string };
type DeviceType = { value: string; default_port?: number; defaultPort?: number };

/** Carry default ports across type changes while retaining an explicit custom port. */
export function applyDeviceTypeDefaults(device: Device, types: DeviceType[], nextType: string) {
    const next = types.find(item => item.value === nextType);
    if (!next) return;
    const previous = types.find(item => item.value === device.type);
    const previousPort = Number(previous?.default_port ?? previous?.defaultPort ?? 0);
    const currentPort = Number(device.port ?? 0);
    device.type = nextType;
    if (!currentPort || currentPort === previousPort || nextType === 'kindle') {
        device.port = Number(next.default_port ?? next.defaultPort ?? 0);
    }
    if (!device.schema) device.schema = 'http';
}

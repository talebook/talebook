import { execFileSync } from 'node:child_process';

export default function teardown() {
    const name = 'tb234-offline-f06cd9a7acfe';
    const existing = execFileSync('docker', ['ps', '-aq', '--filter', `name=^/${name}$`], { encoding: 'utf8' }).trim();
    if (existing) execFileSync('docker', ['stop', '--time', '20', name], { stdio: 'ignore' });
}

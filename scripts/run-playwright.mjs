import { spawn } from 'node:child_process';

const rawMode = process.argv[2] || '';
const isHeaded = rawMode === 'headed';
const project = rawMode === 'chromium' || rawMode === 'chrome' ? rawMode : '';

const args = ['./node_modules/@playwright/test/cli.js', 'test'];
if (isHeaded) {
  args.push('--headed');
}

const child = spawn(process.execPath, args, {
  stdio: 'inherit',
  env: {
    ...process.env,
    ...(project ? { PLAYWRIGHT_PROJECT: project } : {}),
  },
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
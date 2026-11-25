import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const api = spawn(
  process.execPath,
  ['--env-file-if-exists=.env', '--import', 'tsx', 'server/api.server.ts'],
  { cwd: projectRoot, stdio: 'inherit' },
);
const web = spawn(process.execPath, ['node_modules/vite/bin/vite.js'], {
  cwd: projectRoot,
  stdio: 'inherit',
});

let stopping = false;
function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  api.kill();
  web.kill();
  process.exitCode = exitCode;
}

api.on('error', (error) => {
  console.error('[API] Không thể khởi chạy:', error.message);
  stop(1);
});
web.on('error', (error) => {
  console.error('[Web] Không thể khởi chạy:', error.message);
  stop(1);
});
api.on('exit', (code) => {
  if (!stopping) stop(code ?? 1);
});
web.on('exit', (code) => {
  if (!stopping) stop(code ?? 1);
});

process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());

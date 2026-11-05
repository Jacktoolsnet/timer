// VS Code prompts supply credentials through env, never shell text or CLI arguments.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const args = process.argv.slice(2);
if (args.some(arg => arg !== '--admin')) throw Error('Only --admin is supported');
const env = { ...process.env };
// Do not propagate the parent debugger into npm/tsx descendants: they otherwise
// may wait for debugger disconnect even after the account command has finished.
delete env.NODE_OPTIONS;
delete env.VSCODE_INSPECTOR_OPTIONS;
delete process.env.BOOTSTRAP_PASSWORD;
const child = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', [
  'exec', '--yes', '--package=node@24', '--package=npm@11', '--',
  'node', '--import', 'tsx', '--env-file=.env', 'backend/src/cli.ts', 'bootstrap', ...args,
], {
  cwd: fileURLToPath(new URL('../', import.meta.url)),
  env,
  stdio: ['ignore', 'inherit', 'inherit'],
  detached: process.platform !== 'win32',
});
let interrupted = false;
const stop = () => {
  interrupted = true;
  try {
    if (process.platform === 'win32') child.kill('SIGTERM');
    else if (child.pid) process.kill(-child.pid, 'SIGTERM');
  } catch { /* Child may already have exited. */ }
};
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
child.once('error', () => {
  console.error('Unable to start account setup. Check that npm is available.');
  process.exitCode = 1;
});
child.once('close', code => {
  process.removeListener('SIGINT', stop);
  process.removeListener('SIGTERM', stop);
  process.exitCode = interrupted ? 130 : code ?? 1;
});

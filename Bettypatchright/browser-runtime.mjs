import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { checkEnvironment, findPackageRoot } from './environment-check.mjs';

let installPromise;

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`Command exited with code ${code}`)));
  });
}

export async function ensureChromiumInstalled() {
  const initial = checkEnvironment({ includeBrowser: true });
  if (initial.executablePath && existsSync(initial.executablePath)) {
    return { installed: true, downloading: false, executablePath: initial.executablePath };
  }
  if (!initial.packageRoot) {
    throw new Error('Patchright is not installed. Run npm install or pnpm install in Bettypatchright.');
  }
  if (!installPromise) {
    installPromise = (async () => {
      const cli = join(initial.packageRoot, 'cli.js');
      await run(process.execPath, [cli, 'install', 'chromium'], initial.packageRoot);
    })().finally(() => {
      installPromise = undefined;
    });
  }
  await installPromise;
  const after = checkEnvironment({ includeBrowser: true });
  if (!after.executablePath || !existsSync(after.executablePath)) {
    throw new Error('Chromium download finished but the executable was not found.');
  }
  return { installed: true, downloading: false, executablePath: after.executablePath };
}

export async function loadChromium() {
  await ensureChromiumInstalled();
  const packageRoot = findPackageRoot();
  if (!packageRoot) throw new Error('Patchright package could not be resolved.');
  const require = createRequire(join(packageRoot, 'package.json'));
  return require('./index.js').chromium;
}
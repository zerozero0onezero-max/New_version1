import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)));
const workspaceRoot = resolve(root, '..');
const defaultSource = resolve(workspaceRoot, 'artifacts', 'beatrice-bot', 'dist', 'public');
const sourceArgument = process.argv.find((value) => value.startsWith('--source='));
const source = resolve(sourceArgument ? sourceArgument.slice('--source='.length) : defaultSource);
const destination = join(root, 'ui');
const sourceSnapshot = join(root, 'source');

if (!existsSync(join(source, 'index.html'))) {
  if (source === defaultSource) {
    execFileSync('pnpm', ['--filter', '@workspace/beatrice-bot', 'run', 'build'], {
      cwd: workspaceRoot,
      stdio: 'inherit',
      env: { ...process.env, PORT: process.env.PORT || '25890', BASE_PATH: process.env.BASE_PATH || '/' },
    });
  }
}

if (!existsSync(join(source, 'index.html'))) {
  throw new Error(`UI build not found at ${source}. Build the Beatrice Bot frontend first.`);
}

await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true });
await rm(sourceSnapshot, { recursive: true, force: true });
await mkdir(sourceSnapshot, { recursive: true });
for (const entry of ['src', 'public', 'index.html', 'package.json', 'tsconfig.json', 'vite.config.ts', 'vite-plugin-beatrice-api.ts']) {
  await cp(join(workspaceRoot, 'artifacts', 'beatrice-bot', entry), join(sourceSnapshot, entry), { recursive: true });
}
await writeFile(join(destination, 'build-manifest.json'), JSON.stringify({
  product: 'Beatrice Bot',
  builtFrom: 'artifacts/beatrice-bot',
  servedBy: 'Bettypatchright/server.mjs',
  note: 'The browser binary is intentionally not bundled. It is installed after the server starts.',
}, null, 2) + '\n');
await writeFile(join(sourceSnapshot, 'SOURCE-MANIFEST.json'), JSON.stringify({
  product: 'Beatrice Bot',
  sourceOfTruth: 'Bettypatchright/source',
  runtimeBuild: 'Bettypatchright/ui',
  note: 'node_modules and the Patchright browser cache are intentionally excluded.',
}, null, 2) + '\n');
console.log(`[Bettypatchright] Portable UI copied to ${destination}`);
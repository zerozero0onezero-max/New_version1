import { createRequire } from 'node:module';
import { accessSync, constants, existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const manifestPath = join(here, 'requirements.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

function candidateProjectDirs() {
  const portableDirs = [
    process.env.BETTYPATCHRIGHT_ROOT,
    here,
  ].filter(Boolean).map((value) => resolve(value));
  if (process.env.BETTYPATCHRIGHT_ALLOW_WORKSPACE_DEPS === '1') {
    portableDirs.push(process.cwd(), resolve(here, '..', 'artifacts', 'beatrice-bot'));
  }
  return [...new Set(portableDirs)];
}

export function findPackageRoot(packageName = 'patchright') {
  for (const projectDir of candidateProjectDirs()) {
    const directPackageJson = join(projectDir, 'node_modules', packageName, 'package.json');
    if (existsSync(directPackageJson)) return dirname(directPackageJson);
  }
  return null;
}

function commandVersion(command, args = ['--version']) {
  try {
    return execFileSync(command, args, { encoding: 'utf8', timeout: 5000 }).trim();
  } catch {
    return null;
  }
}

function browserPath(packageRoot) {
  if (!packageRoot) return null;
  try {
    const require = createRequire(join(packageRoot, 'package.json'));
    const patchright = require('patchright');
    const executable = patchright.chromium?.executablePath?.();
    return executable || null;
  } catch {
    return null;
  }
}

function hasExecutable(filePath) {
  if (!filePath || !existsSync(filePath)) return false;
  try {
    accessSync(filePath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function packageVersion(packageRoot) {
  if (!packageRoot) return null;
  try {
    return JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')).version || null;
  } catch {
    return null;
  }
}

function satisfiesVersion(version, requirement) {
  if (!version || !requirement) return false;
  const current = version.split('.').map(Number);
  const required = requirement.replace(/^[~^>=< ]+/, '').split('.').map(Number);
  if (current.some((part) => !Number.isFinite(part)) || required.some((part) => !Number.isFinite(part))) return false;
  if (requirement.startsWith('>=')) {
    return current[0] > required[0] || (current[0] === required[0] && (current[1] > required[1] || (current[1] === required[1] && current[2] >= required[2])));
  }
  if (requirement.startsWith('^')) return current[0] === required[0] && current[1] >= required[1];
  return current[0] === required[0] && current[1] === required[1] && current[2] === required[2];
}

function commandReport(tool) {
  const value = commandVersion(tool.command, tool.versionArgs || ['--version']);
  return {
    name: tool.name,
    required: tool.required !== false,
    command: tool.command,
    value: value || 'not found',
    ok: Boolean(value),
    critical: tool.required !== false,
  };
}

function fileReport(relativePath) {
  const filePath = resolve(here, relativePath);
  return {
    name: `project file: ${relativePath}`,
    required: 'present',
    value: existsSync(filePath) ? filePath : 'not found',
    ok: existsSync(filePath),
    critical: true,
  };
}

function packageReport(packageName, requirement, packageRoot) {
  const version = packageVersion(packageRoot);
  return {
    name: `Node.js package: ${packageName}`,
    required: requirement,
    value: version ? `${version} at ${packageRoot}` : 'not installed',
    ok: satisfiesVersion(version, requirement),
    critical: true,
  };
}

function chromiumDependencyReport(executablePath) {
  if (!executablePath || process.platform !== 'linux') return null;
  try {
    const output = execFileSync('ldd', [executablePath], { encoding: 'utf8', timeout: 10000 });
    const missing = output
      .split('\n')
      .map((line) => line.match(/^\s*(\S+)\s+=>\s+not found/))
      .filter(Boolean)
      .map((match) => match[1]);
    return {
      name: 'Chromium native libraries',
      required: 'all libraries resolved by ldd',
      value: missing.length ? `missing: ${missing.join(', ')}` : 'all resolved',
      ok: missing.length === 0,
      critical: true,
    };
  } catch (error) {
    return {
      name: 'Chromium native libraries',
      required: 'ldd available and all libraries resolved',
      value: error instanceof Error ? error.message : String(error),
      ok: false,
      critical: true,
    };
  }
}

export function checkEnvironment({ includeBrowser = true } = {}) {
  const nodeVersion = process.versions.node;
  const majorNode = Number(nodeVersion.split('.')[0]);
  const packageRoot = findPackageRoot();
  const executablePath = browserPath(packageRoot);
  const checks = [
    {
      name: 'Node.js',
      required: manifest.runtime.node,
      value: nodeVersion,
      ok: Number.isFinite(majorNode) && majorNode >= 18,
      critical: true,
    },
    ...manifest.tools.map(commandReport),
    ...Object.entries(manifest.dependencies).map(([name, requirement]) => packageReport(name, requirement, packageRoot)),
    ...manifest.requiredFiles.map(fileReport),
  ];

  if (includeBrowser) {
    checks.push({
      name: 'Patchright Chromium',
      required: 'downloaded on first run',
      value: executablePath || 'not downloaded yet',
      ok: hasExecutable(executablePath),
      critical: false,
    });
    const nativeLibraries = chromiumDependencyReport(executablePath);
    if (nativeLibraries) checks.push(nativeLibraries);
  }

  const missing = checks.filter((check) => !check.ok);
  const criticalMissing = missing.filter((check) => check.critical).map((check) => check.name);
  return {
    ok: criticalMissing.length === 0,
    criticalMissing,
    missing: missing.map((check) => check.name),
    checks,
    packageRoot,
    executablePath,
    inventory: {
      runtime: manifest.runtime,
      tools: manifest.tools,
      portableDependencies: manifest.dependencies,
      bundledUi: manifest.bundledUi,
      browser: manifest.browser,
    },
    systemLibraries: manifest.systemLibraries,
    timestamp: new Date().toISOString(),
  };
}

export function formatEnvironmentReport(report) {
  const lines = [
    '[Bettypatchright] Environment check',
    ...report.checks.map((check) =>
      `- ${check.ok ? 'OK' : check.critical ? 'MISSING' : 'PENDING'} ${check.name}: ${check.value}`),
  ];
  if (report.criticalMissing.length) {
    lines.push(`- Startup blocked: ${report.criticalMissing.join(', ')}`);
  } else if (report.missing.includes('Patchright Chromium')) {
    lines.push('- Chromium will be downloaded after the server starts.');
  }
  lines.push(`- Portable dependencies: ${Object.entries(report.inventory.portableDependencies).map(([name, version]) => `${name}@${version}`).join(', ')}`);
  return lines.join('\n');
}

function installCommand(projectRoot) {
  const npm = commandVersion('npm') ? 'npm' : commandVersion('pnpm') ? 'pnpm' : null;
  if (!npm) return null;
  if (npm === 'pnpm') return { command: 'pnpm', args: ['install', '--prod', '--ignore-scripts'], cwd: projectRoot };
  return { command: 'npm', args: ['install', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'], cwd: projectRoot };
}

export function installMissingDependencies(projectRoot = here) {
  const command = installCommand(projectRoot);
  if (!command) return { ok: false, output: 'No npm or pnpm executable is available.' };
  const result = spawnSync(command.command, command.args, {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: 'pipe',
    timeout: 180000,
  });
  return {
    ok: result.status === 0,
    output: [result.stdout, result.stderr].filter(Boolean).join('\n').trim(),
  };
}

export function printEnvironmentReport(report) {
  process.stdout.write(`${formatEnvironmentReport(report)}\n`);
  if (report.systemLibraries.length) {
    process.stdout.write(`- Linux libraries declared by the project: ${report.systemLibraries.join(', ')}\n`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  let report = checkEnvironment({ includeBrowser: true });
  if (report.criticalMissing.length && process.argv.includes('--repair')) {
    const repair = installMissingDependencies(here);
    process.stdout.write(`[Bettypatchright] Dependency repair: ${repair.ok ? 'completed' : 'failed'}\n`);
    if (repair.output) process.stdout.write(`${repair.output}\n`);
    report = checkEnvironment({ includeBrowser: true });
  }
  printEnvironmentReport(report);
  process.exitCode = report.criticalMissing.length ? 1 : 0;
}
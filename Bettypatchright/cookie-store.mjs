import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { siteKeyForUrl } from './url-utils.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const cookieFile = process.env.BETTYPATCHRIGHT_COOKIES_FILE || join(root, 'cookies.js');
let writeQueue = Promise.resolve();

function emptyCookieFile() {
  return 'export default {};\n';
}

function ensureCookieFile() {
  if (!existsSync(cookieFile)) writeFileSync(cookieFile, emptyCookieFile(), 'utf8');
}

async function readCookieMap() {
  ensureCookieFile();
  try {
    const moduleUrl = `${pathToFileURL(cookieFile).href}?cacheBust=${Date.now()}`;
    const module = await import(moduleUrl);
    return module.default && typeof module.default === 'object' ? module.default : {};
  } catch {
    return {};
  }
}

function serializableCookies(cookies) {
  return cookies
    .filter((cookie) => cookie && cookie.name && cookie.value !== undefined)
    .map((cookie) => ({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path || '/',
      expires: cookie.expires,
      httpOnly: Boolean(cookie.httpOnly),
      secure: Boolean(cookie.secure),
      sameSite: cookie.sameSite || 'Lax',
    }));
}

function queueWrite(map) {
  writeQueue = writeQueue.then(async () => {
    const temporaryFile = `${cookieFile}.tmp`;
    writeFileSync(
      temporaryFile,
      `// Persistent site cookies. Delete entries manually to clear them.\nexport default ${JSON.stringify(map, null, 2)};\n`,
      'utf8',
    );
    renameSync(temporaryFile, cookieFile);
  });
  return writeQueue;
}

export async function restoreSiteCookies(context, url) {
  const key = siteKeyForUrl(url);
  if (!key) return;
  const map = await readCookieMap();
  const cookies = Array.isArray(map[key]) ? map[key] : [];
  if (cookies.length) await context.addCookies(cookies);
}

export async function persistSiteCookies(context, url) {
  const key = siteKeyForUrl(url);
  if (!key) return;
  const cookies = serializableCookies(await context.cookies());
  const map = await readCookieMap();
  map[key] = cookies;
  await queueWrite(map);
}

export function cookieFilePath() {
  return cookieFile;
}

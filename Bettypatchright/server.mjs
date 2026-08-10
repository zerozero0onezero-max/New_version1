import http from 'node:http';
import os from 'node:os';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkEnvironment, formatEnvironmentReport, installMissingDependencies } from './environment-check.mjs';
import { loadChromium, ensureChromiumInstalled } from './browser-runtime.mjs';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)));
const port = Number(process.env.PORT || 7860);
const uiRoot = resolve(process.env.BETTYPATCHRIGHT_UI_DIR || join(root, 'ui'));
let browser;
let context;
let page;
let lastUrl = '';
let mode = 'mobile';
let browserState = 'not-started';
let browserError = '';

function send(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function stats() {
  const total = os.totalmem();
  const free = os.freemem();
  return {
    totalMem: Math.round(total / 1024 / 1024),
    freeMem: Math.round(free / 1024 / 1024),
    processMem: Math.round(process.memoryUsage().rss / 1024 / 1024),
    cpuLoad: Number((os.loadavg()[0] || 0).toFixed(2)),
    browserReady: Boolean(page),
    browserState,
    browserError,
    url: lastUrl,
    mode,
  };
}

function contextOptions(nextMode) {
  if (nextMode === 'desktop') return { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, isMobile: false, hasTouch: false };
  if (nextMode === 'tablet') return { viewport: { width: 768, height: 1024 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
  return { viewport: { width: 384, height: 832 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true };
}

async function openBrowser() {
  if (page) return true;
  browserState = 'installing-browser';
  try {
    const chromium = await loadChromium();
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-extensions', '--no-first-run'],
    });
    context = await browser.newContext(contextOptions(mode));
    page = await context.newPage();
    browserState = 'ready';
    return true;
  } catch (error) {
    browserState = 'error';
    browserError = error instanceof Error ? error.message : String(error);
    return false;
  }
}

async function screenshot() {
  if (!page) return '';
  return Buffer.from(await page.screenshot({ type: 'jpeg', quality: 58 })).toString('base64');
}

async function analyze() {
  if (!page) return { url: lastUrl, elements: [] };
  return { url: page.url(), elements: await page.evaluate(() => [...document.querySelectorAll('input:not([type="hidden"]),textarea,select,button,a[href],[role="button"]')].slice(0, 80).map((element, index) => ({
    id: index + 1,
    type: element.tagName.toLowerCase() === 'a' ? 'link' : element.tagName.toLowerCase() === 'select' ? 'select' : 'button',
    tag: element.tagName.toLowerCase(),
    text: (element.textContent || element.getAttribute('placeholder') || '').trim().slice(0, 80),
    selector: element.id ? `#${CSS.escape(element.id)}` : element.tagName.toLowerCase(),
  }))) };
}

async function jsonBody(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

async function api(req, res, pathname) {
  if (pathname === '/api/environment') return send(res, 200, { report: checkEnvironment({ includeBrowser: true }), message: formatEnvironmentReport(checkEnvironment({ includeBrowser: true })) });
  if (pathname === '/api/stats') return send(res, 200, stats());
  if (pathname === '/api/bootstrap') {
    const ready = await openBrowser();
    return send(res, ready ? 200 : 503, { success: ready, ...stats() });
  }
  if (pathname === '/api/screenshot' && page) return send(res, 200, { screenshot: await screenshot(), url: page.url() });
  if (pathname === '/api/analyze' && page) return send(res, 200, await analyze());
  if (pathname === '/api/navigate') {
    const data = await jsonBody(req);
    if (!(await openBrowser())) return send(res, 503, { error: browserError, ...stats() });
    if (!/^https?:\/\//i.test(String(data.url || ''))) return send(res, 400, { error: 'Only http and https URLs are supported' });
    await page.goto(String(data.url), { waitUntil: 'domcontentloaded', timeout: 45000 });
    lastUrl = page.url();
    return send(res, 200, { success: true, screenshot: await screenshot(), ...(await analyze()) });
  }
  if (!page) return send(res, 503, { error: 'Patchright browser is not connected', ...stats() });
  const data = await jsonBody(req);
  if (pathname === '/api/click') await page.locator(String(data.selector)).click({ timeout: 10000 });
  else if (pathname === '/api/fill') await page.locator(String(data.selector)).fill(String(data.value || ''), { timeout: 10000 });
  else if (pathname === '/api/coordinate-click') { await page.mouse.click(Number(data.x), Number(data.y)); if (data.text) await page.keyboard.type(String(data.text)); }
  else if (pathname === '/api/scroll') await page.mouse.wheel(Number(data.x || 0), Number(data.y || 0));
  else if (pathname === '/api/mode') {
    if (!['desktop', 'tablet', 'mobile'].includes(data.mode)) return send(res, 400, { error: 'Invalid mode' });
    mode = data.mode;
    await context.close();
    context = await browser.newContext(contextOptions(mode));
    page = await context.newPage();
  } else return send(res, 404, { error: 'Not found' });
  return send(res, 200, { success: true, screenshot: await screenshot(), ...(await analyze()), ...stats() });
}

function staticFile(res, pathname) {
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const file = resolve(uiRoot, relative);
  if (!file.startsWith(uiRoot) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('UI build not found. Set BETTYPATCHRIGHT_UI_DIR or build the Beatrice Bot frontend first.');
  }
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json' };
  res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
}

let initial = checkEnvironment({ includeBrowser: false });
if (initial.criticalMissing.length) {
  const repair = process.env.BETTYPATCHRIGHT_AUTO_INSTALL === '0'
    ? { ok: false, output: 'Automatic dependency repair is disabled by BETTYPATCHRIGHT_AUTO_INSTALL=0.' }
    : installMissingDependencies(root);
  initial = checkEnvironment({ includeBrowser: false });
  if (!repair.ok || initial.criticalMissing.length) {
    console.error(formatEnvironmentReport(initial));
    if (repair.output) console.error(repair.output);
    process.exit(1);
  }
}
console.log(formatEnvironmentReport(checkEnvironment({ includeBrowser: true })));
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`).pathname;
  if (pathname.startsWith('/api/')) {
    api(req, res, pathname).catch((error) => send(res, 500, { error: error instanceof Error ? error.message : String(error) }));
  } else {
    staticFile(res, pathname);
  }
});
server.listen(port, '0.0.0.0', () => {
  console.log(`[Bettypatchright] Server listening on port ${port}`);
  if (process.env.BETTYPATCHRIGHT_SKIP_BROWSER_DOWNLOAD !== '1') {
    ensureChromiumInstalled()
      .then(() => console.log('[Bettypatchright] Chromium is ready for the first browser action.'))
      .catch((error) => console.error(`[Bettypatchright] Chromium preparation failed: ${error.message}`));
  }
});
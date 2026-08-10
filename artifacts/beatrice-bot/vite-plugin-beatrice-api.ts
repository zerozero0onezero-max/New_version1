import os from 'node:os';
import type { Plugin, ViteDevServer } from 'vite';

type BrowserMode = 'desktop' | 'mobile' | 'tablet';

let browser: any = null;
let context: any = null;
let page: any = null;
let mode: BrowserMode = 'mobile';
let lastUrl = '';
let patchrightState: 'unknown' | 'ready' | 'missing' | 'error' = 'unknown';
let patchrightError = '';

function json(res: any, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

async function body(req: any) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

function launchOptions(proxy?: string) {
  const options: any = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-notifications',
      '--mute-audio',
      '--no-first-run',
    ],
  };
  if (proxy?.trim()) {
    try {
      const parsed = new URL(proxy.trim());
      options.proxy = {
        server: `${parsed.protocol}//${parsed.host}`,
        ...(parsed.username ? { username: parsed.username } : {}),
        ...(parsed.password ? { password: parsed.password } : {}),
      };
    } catch {
      options.proxy = { server: proxy.trim() };
    }
  }
  return options;
}

function contextOptions(nextMode: BrowserMode) {
  if (nextMode === 'desktop') {
    return {
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 2,
      isMobile: false,
      hasTouch: false,
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    };
  }
  if (nextMode === 'tablet') {
    return {
      viewport: { width: 768, height: 1024 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      userAgent:
        'Mozilla/5.0 (Linux; Android 14; Tablet) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
    };
  }
  return {
    viewport: { width: 384, height: 832 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
  };
}

async function ensureBrowser(proxy?: string) {
  if (page) return true;
  try {
    // Keep Patchright optional so the UI can still run on small hosts.
    const patchright = await (0, eval)('import("patchright")');
    browser = await patchright.chromium.launch(launchOptions(proxy));
    context = await browser.newContext(contextOptions(mode));
    page = await context.newPage();
    page.on('popup', async (popup: any) => {
      await popup.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => undefined);
      const popupUrl = popup.url();
      if (/^https?:\/\//i.test(popupUrl)) {
        await page.goto(popupUrl, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => undefined);
        lastUrl = page.url();
      }
      await popup.close().catch(() => undefined);
    });
    await page.route('**/*', (route: any) => {
      const resourceType = route.request().resourceType();
      if (['image', 'media', 'font'].includes(resourceType)) {
        route.abort().catch(() => undefined);
      } else {
        route.continue().catch(() => undefined);
      }
    });
    patchrightState = 'ready';
    return true;
  } catch (error) {
    patchrightState = 'missing';
    patchrightError = error instanceof Error ? error.message : String(error);
    return false;
  }
}

async function screenshot() {
  if (!page) return '';
  const image = await page.screenshot({ type: 'jpeg', quality: 58 });
  return Buffer.from(image).toString('base64');
}

async function analyze() {
  if (!page) return { url: lastUrl, elements: [] };
  const elements = await page.evaluate(() => {
    const output: Array<Record<string, string | number>> = [];
    let id = 1;
    const selectorFor = (element: Element) => {
      const el = element as HTMLElement;
      if (el.id) return `#${CSS.escape(el.id)}`;
      if (el.getAttribute('name')) return `[name="${CSS.escape(el.getAttribute('name')!)}"]`;
      if (el.getAttribute('aria-label')) {
        return `[aria-label="${CSS.escape(el.getAttribute('aria-label')!)}"]`;
      }
      return el.tagName.toLowerCase();
    };
    document
      .querySelectorAll('input:not([type="hidden"]), textarea, select, button, a[href], [role="button"]')
      .forEach((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        if (!rect.width || !rect.height || style.display === 'none' || style.visibility === 'hidden') return;
        const el = element as HTMLInputElement;
        const type =
          element.tagName === 'A'
            ? 'link'
            : element.tagName === 'BUTTON' || el.type === 'submit' || el.type === 'button'
              ? 'button'
              : element.tagName === 'SELECT'
                ? 'select'
                : 'input';
        output.push({
          id: id++,
          type,
          tag: element.tagName.toLowerCase(),
          text: (element.textContent || el.placeholder || '').trim().slice(0, 80),
          placeholder: el.placeholder || '',
          href: (element as HTMLAnchorElement).href || '',
          selector: selectorFor(element),
        });
      });
    return output.slice(0, 80);
  });
  return { url: page.url(), elements };
}

function browserStats() {
  const total = os.totalmem();
  const free = os.freemem();
  const rss = process.memoryUsage().rss;
  const load = os.loadavg()[0] ?? 0;
  return {
    totalMem: Math.round(total / 1024 / 1024),
    freeMem: Math.round(free / 1024 / 1024),
    processMem: Math.round(rss / 1024 / 1024),
    cpuLoad: Number(load.toFixed(2)),
    browserReady: Boolean(page),
    patchrightState,
    patchrightError: patchrightState === 'missing' ? patchrightError : '',
    mode,
    url: lastUrl,
  };
}

async function handle(req: any, res: any) {
  const url = new URL(req.url || '/', 'http://localhost');
  const path = url.pathname;
  if (path === '/api/status' && req.method === 'GET') return json(res, 200, browserStats());
  if (path === '/api/bootstrap' && req.method === 'POST') {
    const data = await body(req);
    const ready = await ensureBrowser(data.proxy);
    return json(res, ready ? 200 : 503, { success: ready, ...browserStats() });
  }
  if (path === '/api/stats' && req.method === 'GET') return json(res, 200, browserStats());
  if (path === '/api/analyze' && req.method === 'GET') {
    if (!page) return json(res, 503, { error: 'Patchright is not connected' });
    return json(res, 200, await analyze());
  }
  if (path === '/api/screenshot' && req.method === 'GET') {
    if (!page) return json(res, 503, { error: 'Patchright is not connected' });
    return json(res, 200, { screenshot: await screenshot(), url: page.url() });
  }
  if (path === '/api/navigate' && req.method === 'POST') {
    const data = await body(req);
    if (!page && !(await ensureBrowser(data.proxy))) return json(res, 503, { error: 'Patchright is not installed or unavailable on this host', ...browserStats() });
    const target = String(data.url || '').trim();
    if (!/^https?:\/\//i.test(target)) return json(res, 400, { error: 'Only http and https URLs are supported' });
    await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 45000 });
    lastUrl = page.url();
    return json(res, 200, { success: true, screenshot: await screenshot(), ...(await analyze()) });
  }
  if (path === '/api/click' && req.method === 'POST') {
    const data = await body(req);
    if (!page) return json(res, 503, { error: 'Patchright is not connected' });
    await page.locator(String(data.selector)).click({ timeout: 10000 });
    return json(res, 200, { success: true, screenshot: await screenshot(), ...(await analyze()) });
  }
  if (path === '/api/fill' && req.method === 'POST') {
    const data = await body(req);
    if (!page) return json(res, 503, { error: 'Patchright is not connected' });
    await page.locator(String(data.selector)).fill(String(data.value || ''), { timeout: 10000 });
    return json(res, 200, { success: true, screenshot: await screenshot() });
  }
  if (path === '/api/coordinate-click' && req.method === 'POST') {
    const data = await body(req);
    if (!page) return json(res, 503, { error: 'Patchright is not connected' });
    await page.mouse.click(Number(data.x), Number(data.y));
    if (data.text) await page.keyboard.type(String(data.text));
    return json(res, 200, { success: true, screenshot: await screenshot() });
  }
  if (path === '/api/scroll' && req.method === 'POST') {
    const data = await body(req);
    if (!page) return json(res, 503, { error: 'Patchright is not connected' });
    const x = Number(data.x || 0);
    const y = Number(data.y || 0);
    await page.mouse.wheel(x, y);
    return json(res, 200, { success: true, screenshot: await screenshot() });
  }
  if (path === '/api/mode' && req.method === 'POST') {
    const data = await body(req);
    const nextMode = data.mode as BrowserMode;
    if (!['desktop', 'mobile', 'tablet'].includes(nextMode)) return json(res, 400, { error: 'Invalid mode' });
    mode = nextMode;
    if (context && page) {
      await context.close().catch(() => undefined);
      context = await browser.newContext(contextOptions(mode));
      page = await context.newPage();
        page.on('popup', async (popup: any) => {
          await popup.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => undefined);
          const popupUrl = popup.url();
          if (/^https?:\/\//i.test(popupUrl)) {
            await page.goto(popupUrl, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => undefined);
            lastUrl = page.url();
          }
          await popup.close().catch(() => undefined);
        });
    }
      return json(res, 200, { success: true, screenshot: await screenshot(), ...browserStats() });
  }
  return json(res, 404, { error: 'Not found' });
}

export function beatriceApi(): Plugin {
  return {
    name: 'beatrice-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();
        handle(req, res).catch((error) => {
          json(res, 500, { error: error instanceof Error ? error.message : String(error) });
        });
      });
    },
  };
}
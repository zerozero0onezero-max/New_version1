export const DEFAULT_MODE = 'mobile';

export const BROWSER_PROFILES = {
  mobile: {
    label: 'Samsung Galaxy S24 Ultra',
    viewport: { width: 384, height: 832 },
    deviceScaleFactor: 3.75,
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
  },
  desktop: {
    label: 'Dell XPS 13 Touch',
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    isMobile: false,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  },
};

export function isBrowserMode(value) {
  return value === 'mobile' || value === 'desktop';
}

export function contextOptions(mode = DEFAULT_MODE) {
  return BROWSER_PROFILES[isBrowserMode(mode) ? mode : DEFAULT_MODE];
}

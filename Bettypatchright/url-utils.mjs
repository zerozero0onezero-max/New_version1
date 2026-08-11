const TRAILING_PUNCTUATION = /[.,;:!?،؛؟)\]}>"'`]+$/u;

function stripOuterNoise(value) {
  return value
    .trim()
    .replace(/^[\s"'`([{<]+/u, '')
    .replace(TRAILING_PUNCTUATION, '')
    .trim();
}

export function normalizeTargetUrl(input) {
  let value = stripOuterNoise(String(input || ''));
  if (!value) return 'https://example.com';

  value = value
    .replace(/\s*\.\s*/gu, '.')
    .replace(/\s*\/\s*/gu, '/')
    .replace(/\s+/gu, '');

  if (!/^[a-z][a-z\d+.-]*:\/\//iu.test(value)) {
    value = `https://${value}`;
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    const withoutProtocol = value.replace(/^[a-z][a-z\d+.-]*:\/\//iu, '');
    value = `https://${withoutProtocol}`;
    parsed = new URL(value);
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    parsed.protocol = 'https:';
  }

  if (
    parsed.hostname &&
    !parsed.hostname.includes('.') &&
    parsed.hostname !== 'localhost' &&
    !/^\d{1,3}(?:\.\d{1,3}){3}$/u.test(parsed.hostname)
  ) {
    parsed.hostname = `${parsed.hostname}.com`;
  }

  parsed.hash = parsed.hash.replace(TRAILING_PUNCTUATION, '');
  return parsed.toString().replace(/\/$/u, parsed.pathname === '/' ? '' : '/');
}

export function siteKeyForUrl(input) {
  try {
    return new URL(normalizeTargetUrl(input)).origin;
  } catch {
    return '';
  }
}

'use strict';

const logger = require('./logger');

function emit(type, ...args) {
  const text = args
    .map(a => (a instanceof Error ? (a.stack || a.message) : (typeof a === 'string' ? a : (() => { try { return JSON.stringify(a); } catch { return String(a); } })())))
    .join(' ');
  try { logger(text, type); } catch { /* ignore */ }
}

module.exports = {
  info:  (...a) => emit('info', ...a),
  warn:  (...a) => emit('warn', ...a),
  error: (...a) => emit('error', ...a),
  debug: (...a) => emit('info', ...a),
  log:   (...a) => emit('info', ...a),
};

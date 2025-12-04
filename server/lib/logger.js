const util = require('util');

const isProd = process.env.NODE_ENV === 'production';
const debugEnabled = process.env.LOG_DEBUG === 'true' || process.env.NODE_ENV === 'development';

function formatArgs(args) {
  return args.map(a => (typeof a === 'string' ? a : util.inspect(a, { depth: 2, colors: false }))).join(' ');
}

module.exports = {
  debug: (...args) => {
    if (!debugEnabled) return;
    try {
      console.warn('[DEBUG]', formatArgs(args));
    } catch (e) {}
  },
  info: (...args) => {
    try {
      const msg = formatArgs(args);
      process.stdout.write(msg + '\n');
    } catch (e) {}
  },
  warn: (...args) => {
    try {
      console.warn('[WARN]', formatArgs(args));
    } catch (e) {}
  },
  error: (...args) => {
    try {
      console.error('[ERROR]', formatArgs(args));
    } catch (e) {}
  },
  child: (name) => ({
    debug: (...a) => module.exports.debug(`[${name}]`, ...a),
    info: (...a) => module.exports.info(`[${name}]`, ...a),
    warn: (...a) => module.exports.warn(`[${name}]`, ...a),
    error: (...a) => module.exports.error(`[${name}]`, ...a),
  })
};

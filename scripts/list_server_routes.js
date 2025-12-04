const util = require('util');
function printRouter(name, r) {
  console.log('Router:', name);
  if (!r || !r.stack) { console.log('  (no stack)'); return; }
  r.stack.forEach((layer) => {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).join(',');
      console.log('  route:', layer.route.path, 'methods:', methods);
    } else if (layer.name === 'router') {
      console.log('  nested router:', layer.regexp && layer.regexp.toString());
    } else {
      console.log('  middleware:', layer.name, 'regexp:', layer.regexp && layer.regexp.toString());
    }
  });
}
try {
  const p = require('../server/routes/products');
  printRouter('products/index.js', p);
} catch (e) { console.error('ERR products:', e && e.stack || e); }
try {
  const imp = require('../server/routes/importRow');
  printRouter('importRow.js', imp);
} catch (e) { console.error('ERR importRow:', e && e.stack || e); }
try {
  const pr = require('../server/routes/products');
  printRouter('server/routes/products.js', pr);
} catch (e) { console.error('ERR products.js:', e && e.stack || e); }

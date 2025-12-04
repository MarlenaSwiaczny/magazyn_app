const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../src');

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', 'build', 'dist'].includes(e.name)) continue;
      files = files.concat(walk(full));
    } else if (/\.(js|jsx|ts|tsx)$/.test(e.name)) {
      files.push(full);
    }
  }
  return files;
}

function read(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch (e) { return ''; }
}

function basenameNoExt(f) {
  return path.basename(f).replace(/\.(js|jsx|ts|tsx)$/, '');
}

function isLikelyEntry(file) {
  const b = path.basename(file);
  return ['index.js','index.jsx','App.js','App.jsx','setupTests.js','reportWebVitals.js'].includes(b);
}

const files = walk(SRC);
const contents = files.map(f => ({ file: f, src: read(f) }));

const occurrences = new Map();
for (const f of files) occurrences.set(f, 0);

for (const { file, src } of contents) {
  for (const other of files) {
    if (other === file) continue;
    const rel = path.relative(path.dirname(file), other).replace(/\\/g, '/');
    // possible import forms: './foo', '../path/foo', 'components/foo'
    const name = basenameNoExt(other);
    const patterns = [
      `from ['\"]${name}['\"]`,
      `from ['\"][^'\"]*${name}['\"]`,
      `require\(['\"][^'\"]*${name}['\"]\)`,
      `\/${name}['\"]`,
    ];
    const joined = patterns.join('|');
    const re = new RegExp(joined, 'g');
    if (re.test(src)) {
      occurrences.set(other, occurrences.get(other) + 1);
    } else {
      // try relative path match
      const relNoExt = rel.replace(/\.(js|jsx|ts|tsx)$/, '');
      const relPattern = new RegExp(`from ['\"][\.\/]*${relNoExt}['\"]`,'g');
      if (relPattern.test(src)) occurrences.set(other, occurrences.get(other) + 1);
    }
  }
}

const unused = [];
for (const [f, count] of occurrences.entries()) {
  if (count === 0 && !isLikelyEntry(f)) unused.push(f);
}

console.log('Scanned files:', files.length);
console.log('Likely unused files (heuristic - review before deleting):');
for (const u of unused) console.log('-', path.relative(process.cwd(), u));

// Exit code 0
process.exit(0);

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const fromRegex = /\.from\(['"]([^'"]+)['"]\)/g;

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else {
      if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        results.push(filePath);
      }
    }
  }
  return results;
}

const files = walk(srcDir);
const usage = {};

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  let match;
  const tables = new Set();
  while ((match = fromRegex.exec(content)) !== null) {
    tables.add(match[1]);
  }
  if (tables.size > 0) {
    usage[f.replace(srcDir, '')] = Array.from(tables);
  }
});

fs.writeFileSync('query_trace.json', JSON.stringify(usage, null, 2));
console.log('Saved query_trace.json');

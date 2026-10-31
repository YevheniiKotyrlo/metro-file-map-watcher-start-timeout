// Lays out a tree shaped like a large node_modules install under ./tree: <packages> packages,
// each with a package.json, an index.js and a lib folder of three modules.
//
// Usage: node make-tree.js <packages>
const fs = require('node:fs');
const path = require('node:path');

const packages = Number(process.argv[2]);
if (!Number.isInteger(packages) || packages < 1) {
  console.error('Usage: node make-tree.js <packages>');
  process.exit(1);
}
const tree = path.join(__dirname, 'tree');
for (let index = 0; index < packages; index++) {
  const name = `package-${index}`;
  const root = path.join(tree, `group-${Math.floor(index / 100)}`, name);
  fs.mkdirSync(path.join(root, 'lib'), { recursive: true });
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name, version: '1.0.0', main: 'index.js' }));
  fs.writeFileSync(path.join(root, 'index.js'), "module.exports = require('./lib/a');\n");
  for (const module of ['a', 'b', 'c']) {
    fs.writeFileSync(path.join(root, 'lib', `${module}.js`), `module.exports = '${name}/${module}';\n`);
  }
}
console.log(`${tree} holds ${packages} packages`);

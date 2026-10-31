// Puts every package a built react/metro checkout holds (`yarn install`, then `node scripts/build.js`)
// in place of the installed one of the same name, so the steps run on that checkout's code.
//
// Usage: node use-metro-main.js <a react/metro checkout>
const fs = require('node:fs');
const path = require('node:path');

const checkoutArgument = process.argv[2];
if (checkoutArgument === undefined) {
  console.error('Usage: node use-metro-main.js <a react/metro checkout, built with node scripts/build.js>');
  process.exit(1);
}
const packages = path.resolve(checkoutArgument, 'packages');
for (const name of fs.readdirSync(packages)) {
  const built = path.join(packages, name, 'build');
  const installed = path.join(__dirname, 'node_modules', name, 'src');
  if (!fs.existsSync(built) || !fs.existsSync(installed)) continue;
  fs.rmSync(installed, { recursive: true });
  fs.cpSync(built, installed, { recursive: true });
  console.log(`${installed} now holds ${built}`);
}

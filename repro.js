// Runs the steps in order: one server with no tree as the control, then a tree of <packages> packages (30,000 unless
// given), then one server again. Exits 1 while the server over the tree fails with "Failed to start watch mode.", 0 once
// it serves the bundle, and 2 when the control fails or a step fails another way.
//
// Usage: node repro.js [packages]
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const packages = process.argv[2] ?? '30000';
const finish = (code, summary) => {
  console.log(`SUMMARY: ${summary}`);
  process.exit(code);
};
const step = (label, script, ...args) => {
  console.log(`== ${label}: node ${script} ${args.join(' ')}`);
  const output = execFileSync(process.execPath, [path.join(__dirname, script), ...args], { encoding: 'utf8' });
  process.stdout.write(output);
  return output;
};

const version = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, 'node_modules', name, 'package.json'), 'utf8')).version;
console.log(
  `System: ${os.type()} ${os.release()}, ${os.cpus().length} CPUs, node ${process.version}, metro ${version('metro')}, metro-file-map ${version('metro-file-map')}`,
);
if (fs.existsSync(path.join(__dirname, 'tree'))) {
  finish(2, 'step failed: tree/ already exists, so the first server is no control; move it away and run again');
}

try {
  const control = step('step 2', 'start-servers.js', '1');
  if (!/^server 8081: HTTP 200 /m.test(control)) {
    finish(2, 'step failed: the control server with no tree did not serve the bundle');
  }
  step('step 3', 'make-tree.js', packages);
  const withTree = step('step 4', 'start-servers.js', '1');
  if (/^server 8081: HTTP 200 /m.test(withTree)) {
    finish(0, `fixed: the server over ${packages} packages serves the bundle`);
  }
  if (/^server 8081: HTTP 500 .*Failed to start watch mode/m.test(withTree)) {
    const seconds = withTree.match(/^server 8081: HTTP 500 after ([\d.]+ s)/m)[1];
    finish(
      1,
      `defect: the server over ${packages} packages failed with "Failed to start watch mode." after ${seconds}, while its fallback watcher was still starting`,
    );
  }
  finish(2, 'step failed: the server over the tree ended another way');
} catch (error) {
  finish(2, `step failed: ${error.message.split('\n')[0]}`);
}

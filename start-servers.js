// Starts <count> Metro servers on this project at once, as <count> terminals each running
// `npm start -- --port <port>` would, requests the bundle from each, reports how each request
// ended and when, then stops them.
//
// Usage: node start-servers.js <count>
const { spawn, execSync } = require('node:child_process');
const path = require('node:path');

const count = Number(process.argv[2]);
if (!Number.isInteger(count) || count < 1) {
  console.error('Usage: node start-servers.js <count>');
  process.exit(1);
}
const started = Date.now();
const seconds = () => `${((Date.now() - started) / 1000).toFixed(1)} s`;
const servers = Array.from({ length: count }, (_, index) => {
  const port = 8081 + index;
  const child = spawn(process.execPath, [path.join(__dirname, 'node_modules', 'metro', 'src', 'cli.js'), 'serve', '--port', String(port)], {
    cwd: __dirname,
    detached: process.platform !== 'win32',
  });
  const server = { port, child, output: '' };
  const onData = chunk => {
    server.output += chunk;
  };
  child.stdout.on('data', onData);
  child.stderr.on('data', onData);
  return server;
});
const stop = ({ child }) => {
  if (process.platform === 'win32') {
    execSync(`taskkill /F /T /PID ${child.pid}`, { stdio: 'ignore' });
  } else {
    process.kill(-child.pid);
  }
};
const request = async server => {
  while (!/Welcome to Metro/.test(server.output)) {
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  try {
    const response = await fetch(`http://localhost:${server.port}/index.bundle?platform=android&dev=true`);
    const body = await response.text();
    const failure = /Failed to start watch mode/.test(server.output) ? ', and Metro printed "Failed to start watch mode."' : '';
    return `server ${server.port}: HTTP ${response.status} after ${seconds()}${failure}${response.ok ? '' : `\n  ${body.slice(0, 160)}`}`;
  } catch (error) {
    return `server ${server.port}: no response after ${seconds()}: ${error.message}`;
  }
};
Promise.all(servers.map(server => request(server).then(line => console.log(line)))).finally(() => {
  servers.forEach(stop);
  process.exit(0);
});

// Starts <count> Metro servers on this project at once, as <count> terminals each running
// `npm start -- --port <port>` would, requests the bundle from each, reports how each request
// ended and when, then stops them.
//
// With SLOW_WATCH_MS set, each server preloads slow-watch.js, and each report adds the most fs.watch calls a process of
// the server had made when its request ended and 10 s later.
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
const preload = process.env.SLOW_WATCH_MS ? ['--require', path.join(__dirname, 'slow-watch.js')] : [];
const servers = Array.from({ length: count }, (_, index) => {
  const port = 8081 + index;
  const child = spawn(process.execPath, [...preload, path.join(__dirname, 'node_modules', 'metro', 'src', 'cli.js'), 'serve', '--port', String(port)], {
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
const watchCalls = server => {
  const counts = [...server.output.matchAll(/slow-watch: (\d+) fs\.watch calls/g)];
  return counts.length === 0 ? undefined : Math.max(...counts.map(count => Number(count[1])));
};
const watchProgress = async server => {
  if (preload.length === 0) return '';
  const atEnd = watchCalls(server);
  await new Promise(resolve => setTimeout(resolve, 10_000));
  return `; fs.watch calls by then: ${atEnd}, 10 s later: ${watchCalls(server)}`;
};
const request = async server => {
  while (!/Welcome to Metro/.test(server.output)) {
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  try {
    const response = await fetch(`http://localhost:${server.port}/index.bundle?platform=android&dev=true`);
    const body = await response.text();
    const failure = /Failed to start watch mode/.test(server.output) ? ', and Metro printed "Failed to start watch mode."' : '';
    const ended = seconds();
    const progress = await watchProgress(server);
    return `server ${server.port}: HTTP ${response.status} after ${ended}${failure}${progress}${response.ok ? '' : `\n  ${body.slice(0, 160)}`}`;
  } catch (error) {
    return `server ${server.port}: no response after ${seconds()}: ${error.message}`;
  }
};
Promise.all(servers.map(server => request(server).then(line => console.log(line)))).finally(() => {
  servers.forEach(stop);
  process.exit(0);
});

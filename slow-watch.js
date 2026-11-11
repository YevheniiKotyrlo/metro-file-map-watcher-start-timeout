// Preloaded with --require: makes each fs.watch call take SLOW_WATCH_MS milliseconds, standing in for a slower disk or a
// busier machine, and prints how many calls it has made every 5 s.
const fs = require('node:fs');

const delay = Number(process.env.SLOW_WATCH_MS);
const pause = new Int32Array(new SharedArrayBuffer(4));
const watch = fs.watch;
let calls = 0;

fs.watch = function slowWatch(...args) {
  Atomics.wait(pause, 0, 0, delay);
  calls += 1;
  return watch.apply(this, args);
};

setInterval(() => process.stderr.write(`slow-watch: ${calls} fs.watch calls\n`), 5000).unref();

# metro-file-map-watcher-start-timeout

Without Watchman on Windows and Linux, `metro-file-map` starts its fallback watcher by walking every folder of every watch root and opening one `fs.watch` per folder, so the start takes longer the larger the tree and the busier the machine. `Watcher.js` gives that start a fixed 240 s (`MAX_WAIT_TIME`) and then rejects with `Failed to start watch mode.`, so Metro never becomes ready and every bundle request fails, though the watcher was still making progress and goes on starting after the rejection.

This repository is a plain Metro 0.87.2 project with:

- `make-tree.js`, which lays out a tree shaped like a large `node_modules` install under `tree/`;
- `start-servers.js`, which starts Metro servers on the project at once, as that many terminals running `npm start -- --port <port>` would, requests the bundle from each and reports how each request ended and when;
- `use-metro-main.js`, which puts every package a built react/metro checkout holds in place of the installed one.

## Steps

Without Watchman, Node 22 or later, npm. Seen on Windows 11 with the clone on a ReFS Dev Drive; Linux takes the same fallback watcher.

1. Clone and install:
   ```sh
   git clone https://github.com/YevheniiKotyrlo/metro-file-map-watcher-start-timeout
   cd metro-file-map-watcher-start-timeout
   npm install
   ```
2. Start one server and request the bundle, as a control:
   ```sh
   node start-servers.js 1
   ```
3. Lay out 30,000 packages under `tree/` (60,300 folders, 150,000 files):
   ```sh
   node make-tree.js 30000
   ```
4. Start one server and request the bundle again:
   ```sh
   node start-servers.js 1
   ```

Expected: the bundle is served at step 4, later than at step 2.

Seen: at step 2 the bundle is served (HTTP 200); at step 4 Metro prints `Failed to construct transformer:  Error: Failed to start watch mode.` 240 s after it starts, and the request ends with HTTP 500, `Metro has encountered an error: Failed to start watch mode.`

## On react/metro main

Between steps 1 and 2, build a checkout of react/metro and put its packages in place:

```sh
git clone --depth 1 https://github.com/react/metro ../metro
cd ../metro
yarn install --frozen-lockfile
node scripts/build.js
cd ../metro-file-map-watcher-start-timeout
node use-metro-main.js ../metro
```

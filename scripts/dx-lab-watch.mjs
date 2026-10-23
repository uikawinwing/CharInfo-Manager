/**
 * Rebuild the portable DX Lab HTML whenever its source changes.
 * Uses the existing production builder so there is only one artifact format.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const toolchainRoot = path.resolve(projectRoot, '../../Toolchain');
const { watch } = await import(pathToFileURL(path.join(toolchainRoot, 'node_modules', 'chokidar', 'index.js')).href);

const inputs = [
  path.join(projectRoot, 'src'),
  path.join(scriptDir, 'dx-lab-build.mjs'),
  path.join(scriptDir, 'dx-lab-format.mjs'),
  path.join(scriptDir, 'dx-lab.webpack.config.mjs'),
  path.join(projectRoot, 'tsconfig.json'),
  path.join(toolchainRoot, 'webpack.config.ts'),
];

let timer = null;
let child = null;
let pending = false;
let stopping = false;

function rebuild() {
  if (stopping) return;
  if (child) {
    pending = true;
    return;
  }

  console.info('[dx-lab:watch] Building standalone HTML...');
  child = spawn(process.execPath, [path.join(scriptDir, 'dx-lab-build.mjs')], {
    cwd: projectRoot,
    stdio: 'inherit',
  });
  child.on('error', error => console.error('[dx-lab:watch] Build process error:', error));
  child.on('close', code => {
    child = null;
    if (stopping) return;
    if (code === 0) {
      console.info('[dx-lab:watch] Ready: dist/char_info_dx_lab/charinfo-dx-lab.html');
    } else {
      console.error('[dx-lab:watch] Build failed; watching for the next source change.');
    }
    if (pending) {
      pending = false;
      rebuild();
    }
  });
}

function schedule(event, filename) {
  if (stopping) return;
  console.info('[dx-lab:watch] ' + event + ': ' + path.relative(projectRoot, filename));
  clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    rebuild();
  }, 350);
}

const watcher = watch(inputs, {
  ignoreInitial: true,
  awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
});
watcher.on('all', (event, filename) => {
  if (['add', 'change', 'unlink'].includes(event)) schedule(event, filename);
});
watcher.on('error', error => console.error('[dx-lab:watch] Watch error:', error));
watcher.on('ready', () => {
  console.info('[dx-lab:watch] Watching source files. Ctrl+C to stop.');
  rebuild();
});

function stop() {
  if (stopping) return;
  stopping = true;
  clearTimeout(timer);
  void watcher.close();
  child?.kill();
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

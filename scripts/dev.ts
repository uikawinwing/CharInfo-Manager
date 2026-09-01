import { ChildProcess, spawn } from 'node:child_process';
import path from 'node:path';

import { PREVIEW_HOST, THEME_LAB_PATH, resolvePreviewPort, startDistPreview } from './serve-dist';

const repoRoot = path.resolve(__dirname, '..');

async function main(): Promise<void> {
  const port = resolvePreviewPort();
  const server = await startDistPreview(port);
  const watcher: ChildProcess = spawn('pnpm watch', {
    cwd: repoRoot,
    env: process.env,
    shell: true,
    stdio: 'inherit',
  });
  let shuttingDown = false;

  const shutdown = (exitCode = 0) => {
    if (shuttingDown) return;
    shuttingDown = true;
    watcher.kill();
    server.close(() => {
      process.exitCode = exitCode;
    });
  };

  watcher.once('error', error => {
    console.error('[dev] failed to start watcher:', error);
    shutdown(1);
  });
  watcher.once('exit', (code, signal) => {
    if (shuttingDown) return;
    if (signal) console.error(`[dev] watcher stopped by ${signal}`);
    else if (code !== 0) console.error(`[dev] watcher exited with code ${code}`);
    shutdown(code ?? 1);
  });

  process.once('SIGINT', () => shutdown(0));
  process.once('SIGTERM', () => shutdown(0));

  console.info(`[dev] preview: http://${PREVIEW_HOST}:${port}${THEME_LAB_PATH}`);
  console.info('[dev] watcher started; edit src files and reload the preview URL.');
}

void main().catch(error => {
  console.error('[dev] failed to start:', error);
  process.exitCode = 1;
});

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

export const PREVIEW_HOST = '127.0.0.1';
export const DEFAULT_PREVIEW_PORT = 13000;
export const THEME_LAB_PATH = '/char_info_v2_theme_lab/index.html';

const distRoot = path.resolve(__dirname, '..', 'dist');

const mimeTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function sendText(response: http.ServerResponse, statusCode: number, text: string): void {
  response.writeHead(statusCode, {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Content-Type': 'text/plain; charset=utf-8',
    Expires: '0',
    Pragma: 'no-cache',
  });
  response.end(text);
}

export function resolvePreviewPort(): number {
  return Number.parseInt(process.env.CHARINFO_PREVIEW_PORT ?? String(DEFAULT_PREVIEW_PORT), 10);
}

export async function startDistPreview(port = resolvePreviewPort()): Promise<http.Server> {
  const server = http.createServer((request, response) => {
    const requestUrl = new URL(request.url ?? '/', `http://${PREVIEW_HOST}:${port}`);
    if (requestUrl.pathname === '/') {
      response.writeHead(302, {
        'Cache-Control': 'no-store',
        Location: THEME_LAB_PATH,
      });
      response.end();
      return;
    }

    let decodedPath: string;
    try {
      decodedPath = decodeURIComponent(requestUrl.pathname);
    } catch {
      sendText(response, 400, 'Bad request');
      return;
    }

    const relativePath = decodedPath.replace(/^\/+/, '');
    const candidatePath = path.resolve(distRoot, relativePath);
    const relativeToRoot = path.relative(distRoot, candidatePath);
    if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
      sendText(response, 403, 'Forbidden');
      return;
    }

    let stat: fs.Stats;
    try {
      stat = fs.statSync(candidatePath);
    } catch {
      sendText(response, 404, `Not found: ${decodedPath}`);
      return;
    }

    const filePath = stat.isDirectory() ? path.join(candidatePath, 'index.html') : candidatePath;
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      sendText(response, 404, `Not found: ${decodedPath}`);
      return;
    }

    response.writeHead(200, {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream',
      Expires: '0',
      Pragma: 'no-cache',
    });
    fs.createReadStream(filePath).pipe(response);
  });

  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => {
      server.off('listening', onListening);
      reject(error);
    };
    const onListening = () => {
      server.off('error', onError);
      resolve();
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, PREVIEW_HOST);
  });

  console.info(`[preview] serving ${distRoot}`);
  console.info(`[preview] Theme Lab: http://${PREVIEW_HOST}:${port}${THEME_LAB_PATH}`);
  return server;
}

async function main(): Promise<void> {
  const server = await startDistPreview();
  const shutdown = () => server.close(() => process.exit(0));
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

if (require.main === module) {
  void main().catch(error => {
    console.error('[preview] failed to start:', error);
    process.exitCode = 1;
  });
}

import { PREVIEW_HOST, THEME_LAB_PATH, resolvePreviewPort } from './serve-dist';

async function main(): Promise<void> {
  const port = resolvePreviewPort();
  const url = `http://${PREVIEW_HOST}:${port}${THEME_LAB_PATH}`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Preview returned HTTP ${response.status}: ${url}`);

  const cacheControl = response.headers.get('cache-control') ?? '';
  if (!cacheControl.includes('no-store')) {
    throw new Error(`Preview response is cacheable: cache-control=${cacheControl || '(missing)'}`);
  }

  const html = await response.text();
  const requiredPatterns = [
    /--illustrated-mobile-name-shadow\s*:\s*none/,
    /--illustrated-mobile-summary-background\s*:/,
    /--illustrated-profile-story-mobile-background\s*:/,
  ];
  for (const pattern of requiredPatterns) {
    if (!pattern.test(html)) throw new Error(`Preview is missing current DX theme token: ${pattern}`);
  }

  console.info(`[preview] current Theme Lab bundle verified: ${url}`);
  console.info('[preview] response is no-store and contains the current Iris theme-token refactor');
}

void main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

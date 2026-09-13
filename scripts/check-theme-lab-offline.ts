import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const fixtureSourceFile = path.resolve(process.cwd(), 'src/char_info_v2_theme_lab/fixtures.ts');
const outputDir = path.resolve(process.cwd(), 'dist/char_info_v2_theme_lab');
const outputFile = path.join(outputDir, 'char_info_v2_theme_lab_OFFLINE.html');

function readFixtureSource(): { imageUrls: string[]; firstName: string } {
  const source = fs.readFileSync(fixtureSourceFile, 'utf8');
  const imageUrls = Array.from(source.matchAll(/\bimageUrl:\s*'([^']+)'/gu), match => match[1]!).filter(Boolean);
  const firstName = source.match(/\bname:\s*'([^']+)'/u)?.[1];
  if (imageUrls.length === 0 || !firstName) {
    throw new Error('[theme-lab-offline] fixture source is missing required names or image URLs');
  }
  return { imageUrls: Array.from(new Set(imageUrls)), firstName };
}

if (!fs.existsSync(outputFile)) {
  throw new Error('[theme-lab-offline] build the offline preview before running this check');
}

const fixtureSource = readFixtureSource();
const outputFiles = fs.readdirSync(outputDir, { withFileTypes: true }).filter(entry => entry.isFile());
if (outputFiles.length !== 1 || outputFiles[0]?.name !== path.basename(outputFile)) {
  throw new Error(
    `[theme-lab-offline] expected one HTML file, found: ${outputFiles.map(file => file.name).join(', ')}`,
  );
}

const html = fs.readFileSync(outputFile, 'utf8');
const forbiddenPatterns: Array<[RegExp, string]> = [
  [/<script[^>]+type=["']module["']/iu, 'module script'],
  [/<script[^>]+src=/iu, 'external script src'],
  [/@import\s+url\(\s*['"]?https?:\/\//iu, 'remote stylesheet import'],
  [/testingcf\.jsdelivr\.net/iu, 'jsDelivr module import'],
  [/jspm\.dev/iu, 'JSPM module import'],
];

for (const [pattern, label] of forbiddenPatterns) {
  if (pattern.test(html)) throw new Error(`[theme-lab-offline] ${label} remains in offline HTML`);
}

for (const imageUrl of fixtureSource.imageUrls) {
  if (html.includes(imageUrl)) {
    throw new Error(`[theme-lab-offline] fixture portrait is still remote: ${imageUrl}`);
  }
}

const embeddedImageCount = html.match(/data:image\/[a-z0-9.+-]+;base64,/giu)?.length ?? 0;
if (embeddedImageCount < fixtureSource.imageUrls.length) {
  throw new Error(
    `[theme-lab-offline] expected at least ${fixtureSource.imageUrls.length} embedded fixture portraits, found ${embeddedImageCount}`,
  );
}

if (!html.includes('Illustrated V2 Theme Lab')) {
  throw new Error('[theme-lab-offline] Theme Lab title is missing from generated HTML');
}

function findChrome(): string {
  const candidates = [
    process.env.CHROME_PATH,
    process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : undefined,
    process.platform === 'win32' ? 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe' : undefined,
    process.env.PROGRAMFILES ? path.join(process.env.PROGRAMFILES, 'Google/Chrome/Application/chrome.exe') : undefined,
    process.env['PROGRAMFILES(X86)']
      ? path.join(process.env['PROGRAMFILES(X86)'], 'Google/Chrome/Application/chrome.exe')
      : undefined,
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe') : undefined,
    'google-chrome',
    'chromium',
    'chromium-browser',
    'chrome',
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    if (path.isAbsolute(candidate) && fs.existsSync(candidate)) return candidate;
    const probe = spawnSync(candidate, ['--version'], {
      encoding: 'utf8',
      timeout: 2_000,
      windowsHide: true,
    });
    if (!probe.error && probe.status === 0) return candidate;
  }

  throw new Error('[theme-lab-offline] Chrome/Chromium was not found; set CHROME_PATH to run the file:// smoke test');
}

const chrome = findChrome();
const smoke = (() => {
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'charinfo-theme-lab-'));
  try {
    return spawnSync(
      chrome,
      [
        '--headless=new',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-background-networking',
        '--disable-component-update',
        '--disable-extensions',
        '--no-first-run',
        '--no-default-browser-check',
        '--host-resolver-rules=MAP * ~NOTFOUND',
        '--virtual-time-budget=5000',
        `--user-data-dir=${profileDir}`,
        '--dump-dom',
        pathToFileURL(outputFile).href,
      ],
      { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 30_000, windowsHide: true },
    );
  } finally {
    try {
      fs.rmSync(profileDir, { recursive: true, force: true });
    } catch {
      // Chrome may release the temporary profile slightly after the parent process exits.
    }
  }
})();

if (smoke.error || smoke.status !== 0) {
  throw new Error(
    `[theme-lab-offline] file:// smoke test failed: ${smoke.error?.message ?? smoke.stderr.trim() ?? `exit ${smoke.status}`}`,
  );
}

if (!smoke.stdout.includes('Illustrated V2 Theme Lab') || !smoke.stdout.includes(fixtureSource.firstName)) {
  throw new Error('[theme-lab-offline] file:// smoke test loaded HTML but Theme Lab did not render');
}

console.info(
  `[theme-lab-offline] PASS: one self-contained HTML, ${embeddedImageCount} embedded images, file:// works with networking blocked`,
);

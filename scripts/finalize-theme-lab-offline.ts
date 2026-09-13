import fs from 'node:fs';
import path from 'node:path';

const fixtureSourceFile = path.resolve(process.cwd(), 'src/char_info_v2_theme_lab/fixtures.ts');
const outputDir = path.resolve(process.cwd(), 'dist/char_info_v2_theme_lab');
const outputFile = path.join(outputDir, 'char_info_v2_theme_lab_OFFLINE.html');

function readFixtureImageUrls(): string[] {
  const source = fs.readFileSync(fixtureSourceFile, 'utf8');
  const urls = Array.from(source.matchAll(/\bimageUrl:\s*'([^']+)'/gu), match => match[1]!).filter(Boolean);
  if (urls.length === 0) throw new Error('[theme-lab-offline] no fixture imageUrl values found');
  return Array.from(new Set(urls));
}

async function main(): Promise<void> {
  if (!fs.existsSync(outputFile)) {
    throw new Error(`[theme-lab-offline] missing webpack output: ${outputFile}`);
  }

  let html = fs.readFileSync(outputFile, 'utf8');
  const fixtureImageUrls = readFixtureImageUrls();

  for (const imageUrl of fixtureImageUrls) {
    if (!html.includes(imageUrl)) {
      throw new Error(`[theme-lab-offline] fixture URL was not emitted into HTML: ${imageUrl}`);
    }

    const response = await fetch(imageUrl, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) {
      throw new Error(
        `[theme-lab-offline] failed to fetch fixture portrait: ${response.status} ${response.statusText}`,
      );
    }

    const contentType = response.headers.get('content-type')?.split(';', 1)[0]?.trim() || 'image/png';
    const dataUri = `data:${contentType};base64,${Buffer.from(await response.arrayBuffer()).toString('base64')}`;
    html = html.replaceAll(imageUrl, dataUri);
  }

  html = html.replace(
    /@import\s+url\(\s*(['"]?)https:\/\/fontsapi\.zeoseven\.com\/293\/main\/result\.css\1\s*\);?/giu,
    '',
  );

  fs.writeFileSync(outputFile, html);

  const outputFiles = fs.readdirSync(outputDir, { withFileTypes: true }).filter(entry => entry.isFile());
  if (outputFiles.length !== 1 || outputFiles[0]?.name !== path.basename(outputFile)) {
    throw new Error(
      `[theme-lab-offline] expected exactly one distributable HTML file, found: ${outputFiles.map(file => file.name).join(', ')}`,
    );
  }

  console.info(`[theme-lab-offline] wrote ${outputFile} (${fs.statSync(outputFile).size} bytes)`);
}

void main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

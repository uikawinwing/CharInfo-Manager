import fs from 'node:fs';
import path from 'node:path';

const distRoot = path.resolve(process.cwd(), 'dist');
const expectedRuntime = path.join(distRoot, 'char_info_viewer_runtime', 'index.js');
const forbiddenDirectory = path.join(distRoot, 'char_info_v2_theme_lab');
const textExtensions = new Set(['.css', '.html', '.js', '.json', '.map', '.txt']);
const forbiddenSignatures = [
  '@dev-only',
  'char_info_v2_theme_lab',
  'IllustratedV2Sheet.vue',
  'DX visual migration preview',
  'Iris theme migrated',
  'Anastasia theme migrated',
  'illustrated-v2-theme-iris',
  'illustrated-v2-theme-anastasia',
];

if (!fs.existsSync(expectedRuntime)) {
  throw new Error(`Public build is missing ${path.relative(process.cwd(), expectedRuntime)}`);
}

if (fs.existsSync(forbiddenDirectory)) {
  throw new Error('Public build contains the dev-only char_info_v2_theme_lab directory');
}

function collectFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(entryPath) : [entryPath];
  });
}

const leakedSignatures: string[] = [];
for (const file of collectFiles(distRoot)) {
  if (!textExtensions.has(path.extname(file).toLowerCase())) continue;
  const content = fs.readFileSync(file, 'utf8');
  for (const signature of forbiddenSignatures) {
    if (content.includes(signature)) leakedSignatures.push(`${path.relative(distRoot, file)} -> ${signature}`);
  }
}

if (leakedSignatures.length > 0) {
  throw new Error(`Public dist contains dev-only DX signatures:\n${leakedSignatures.join('\n')}`);
}

console.info('[build] public dist contains runtime output and no dev-only DX signatures');

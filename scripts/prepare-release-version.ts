import { writeFileSync } from 'node:fs';

const tag = process.argv[2];
if (!tag || !/^v\d+\.\d+\.\d+$/.test(tag)) throw new Error('需要正式版本 Tag，例如 v0.3.8。');
writeFileSync(
  new URL('../src/char_info_viewer_runtime/releaseVersion.ts', import.meta.url),
  `export const CHAR_INFO_RELEASE_VERSION: string | null = ${JSON.stringify(tag)};\n`,
);

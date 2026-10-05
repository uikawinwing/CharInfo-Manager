/**
 * 读回外部 LLM 修改后的 DX Lab artifact，提取 editable zones 并检测 CORE 是否被改。
 *
 * 用法：node scripts/dx-lab-inspect.mjs path/to/returned.html [--markdown]
 *
 * coreModified=true 时**不拒绝读取**——仍完整提取 editable zones，只额外给出
 * warning，让正常 recovery 不被阻断。
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  EDITABLE_ZONE_NAMES,
  LAB_FORMAT,
  LAB_VERSION,
  ZONES,
  computeCoreHash,
  extractJsonBlock,
  extractZone,
} from './dx-lab-format.mjs';

const argv = process.argv.slice(2);
const asMarkdown = argv.includes('--markdown');
const target = argv.find(a => !a.startsWith('--'));

if (!target) {
  console.error('usage: node scripts/dx-lab-inspect.mjs <returned.html> [--markdown]');
  process.exit(2);
}

const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', target);
if (!fs.existsSync(file)) {
  console.error(`[dx-lab-inspect] file not found: ${file}`);
  process.exit(1);
}

const html = fs.readFileSync(file, 'utf8');
const manifest = extractJsonBlock(html, 'dx-lab-manifest');

if (!manifest) {
  console.error('[dx-lab-inspect] no dx-lab-manifest found — is this a CharInfo DX Lab artifact?');
  process.exit(1);
}

const warnings = [];
if (manifest.format !== LAB_FORMAT) {
  warnings.push(`unexpected format: ${manifest.format} (expected ${LAB_FORMAT})`);
}
if (manifest.version !== LAB_VERSION) {
  warnings.push(`unexpected version: ${manifest.version} (expected ${LAB_VERSION})`);
}

const missing = [];
const edits = {};
for (const name of EDITABLE_ZONE_NAMES) {
  const raw = extractZone(html, name);
  if (raw === null) {
    missing.push(name);
    continue;
  }
  if (name === 'notes') {
    edits[name] = extractJsonBlock(html, ZONES.notes.id) ?? stripTag(raw, 'script');
  } else if (name === 'theme' || name === 'decoration-css') {
    edits[name] = stripTag(raw, 'style');
  } else {
    // decoration-dom 是 <template>，保留原始片段（含 marker）便于人工映射。
    edits[name] = raw;
  }
}
if (missing.length) warnings.push(`missing editable zones: ${missing.join(', ')}`);

const recomputed = computeCoreHash(html);
const coreModified = recomputed !== manifest.coreHash;
if (coreModified) {
  warnings.push(
    'The external editor also modified generated CORE. Review those changes separately.',
  );
}

const report = {
  format: manifest.format,
  version: manifest.version,
  sourceRevision: manifest.sourceRevision,
  dirtyAtBuild: manifest.dirty,
  renderer: manifest.renderer,
  coreModified,
  recordedCoreHash: manifest.coreHash,
  recomputedCoreHash: recomputed,
  zones: {
    theme: { id: ZONES.theme.id, content: edits.theme ?? null },
    decorationCss: { id: ZONES['decoration-css'].id, content: edits['decoration-css'] ?? null },
    decorationDom: { id: ZONES['decoration-dom'].id, content: edits['decoration-dom'] ?? null },
    notes: { id: ZONES.notes.id, content: edits.notes ?? null },
  },
  warnings,
};

if (asMarkdown) {
  console.log(renderMarkdown(report));
} else {
  console.log(JSON.stringify(report, null, 2));
}

/**
 * 取出 zone marker 之间的内容，并剥掉外层标签，只留实际内容。
 *
 * 必须用**完整** marker（`<!-- BEGIN -->`）来定位：`ZONES[].begin` 只是 marker 文本本身，
 * 不含注释包装。用它 slice 会残留 `-->` / `<!--` 片段，导致后续 <style> 正则匹配失败。
 */
function stripTag(raw, tagName) {
  const zone = findZoneOf(raw);
  let inner = raw;
  if (zone) {
    const beginMarker = `<!-- ${zone.begin} -->`;
    const endMarker = `<!-- ${zone.end} -->`;
    const start = raw.indexOf(beginMarker);
    const end = raw.indexOf(endMarker);
    if (start !== -1 && end !== -1) {
      inner = raw.slice(start + beginMarker.length, end);
    }
  }
  const re = new RegExp(`^\\s*<${tagName}[^>]*>([\\s\\S]*)<\\/${tagName}>\\s*$`, 'i');
  const m = inner.match(re);
  return (m ? m[1] : inner).trim();
}

function findZoneOf(raw) {
  for (const [name, zone] of Object.entries(ZONES)) {
    if (raw.includes(zone.begin)) return zone;
  }
  return null;
}

function renderMarkdown(r) {
  const lines = [
    `# DX Lab inspection`,
    ``,
    `- **format**: ${r.format} v${r.version}`,
    `- **sourceRevision**: ${(r.sourceRevision ?? '').slice(0, 8)} (dirty at build: ${r.dirtyAtBuild})`,
    `- **coreModified**: ${r.coreModified ? '**YES**' : 'no'}`,
    ``,
  ];
  if (r.warnings.length) {
    lines.push(`## Warnings`, ``);
    for (const w of r.warnings) lines.push(`- ${w}`);
    lines.push('');
  }
  lines.push(`## Editable zones`, ``);
  for (const [key, zone] of Object.entries(r.zones)) {
    lines.push(`### ${key} \`${zone.id}\``, '');
    lines.push('```');
    lines.push(typeof zone.content === 'string' ? zone.content : JSON.stringify(zone.content, null, 2));
    lines.push('```', '');
  }
  return lines.join('\n');
}

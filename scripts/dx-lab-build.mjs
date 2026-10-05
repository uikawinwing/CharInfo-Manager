/**
 * Portable Offline DX Lab 构建。
 *
 * 产物：dist/char_info_dx_lab/charinfo-dx-lab.html
 * 一个真正单文件 artifact —— HTML / CSS / JS / Vue runtime / fixture 全部内联，
 * 双击 file:// 即可启动，不依赖 localhost、node_modules、CDN 或 SillyTavern。
 */
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  EDITABLE_ZONE_NAMES,
  LAB_FORMAT,
  LAB_VERSION,
  RECOMMENDED_HOOKS,
  ZONES,
  computeCoreHash,
  escapeScriptContent,
} from './dx-lab-format.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const toolchainRoot = path.resolve(projectRoot, '../../Toolchain');
const webpackCli = path.join(toolchainRoot, 'node_modules', 'webpack-cli', 'bin', 'cli.js');
const configFile = path.join(projectRoot, 'scripts', 'dx-lab.webpack.config.mjs');
const workDir = path.join(projectRoot, 'dist', 'char_info_dx_lab');
const outputHtml = path.join(workDir, 'charinfo-dx-lab.html');

if (!fs.existsSync(webpackCli)) {
  console.error(`[dx-lab] shared Toolchain dependencies are missing: ${webpackCli}`);
  process.exit(1);
}

fs.rmSync(workDir, { recursive: true, force: true });
fs.mkdirSync(workDir, { recursive: true });

// 1. 打包
const args = [webpackCli, '--config', configFile, '--mode', 'production', '--stats', 'errors-warnings'];
console.info('[dx-lab] bundling...');
execFileSync(process.execPath, args, {
  cwd: toolchainRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    TAVERN_PROJECT_ROOT: projectRoot,
    NODE_PATH: [path.join(toolchainRoot, 'node_modules'), process.env.NODE_PATH]
      .filter(Boolean)
      .join(path.delimiter),
  },
});

const bundleFile = path.join(workDir, 'dx-lab.js');
if (!fs.existsSync(bundleFile)) {
  console.error(`[dx-lab] bundle not found: ${bundleFile}`);
  process.exit(1);
}
const bundle = fs.readFileSync(bundleFile, 'utf8');

// 2. 提取 platform token catalog（从当前源码自动生成，不维护第二份清单）
const tokenCatalog = readTokenCatalog();
const tokenCount = Object.keys(tokenCatalog).length;

// 3. manifest
function gitOutput(command) {
  try {
    return execFileSync('git', command, { cwd: projectRoot, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}
const sourceRevision = gitOutput(['rev-parse', 'HEAD']);
const dirty = gitOutput(['status', '--porcelain']).length > 0;

const manifest = {
  format: LAB_FORMAT,
  version: LAB_VERSION,
  sourceRevision,
  dirty,
  renderer: 'IllustratedV2Sheet',
  platform: 'Illustrated Platform',
  baseThemes: ['default', 'iris', 'anastasia'],
  editableZones: EDITABLE_ZONE_NAMES,
  recommendedHooks: RECOMMENDED_HOOKS,
  coreHash: '',
};

// 4. 组装 HTML
const instructions = getLlmInstructions();
const html = buildHtml({ bundle, manifest, tokenCatalog, instructions });

// coreHash 需要在 manifest 写入后、对最终 HTML 计算：先写占位再回填。
const withPlaceholder = html;
const finalHtml = withPlaceholder.replace(
  /("coreHash"\s*:\s*)"[^"]*"/,
  (_m, p1) => `${p1}"${computeCoreHash(withPlaceholder)}"`,
);
fs.writeFileSync(outputHtml, finalHtml, 'utf8');
fs.rmSync(bundleFile, { force: true });

const sizeKb = (fs.statSync(outputHtml).size / 1024).toFixed(1);
console.info(`[dx-lab] exported: ${outputHtml}`);
console.info(`[dx-lab] html size: ${sizeKb} KiB (js bundle was ${(bundle.length / 1024).toFixed(1)} KiB)`);
console.info(`[dx-lab] token catalog: ${tokenCount} tokens`);
console.info(`[dx-lab] sourceRevision: ${sourceRevision.slice(0, 8)} dirty=${dirty}`);

function readTokenCatalog() {
  const sheetPath = path.join(
    projectRoot,
    'src/char_info_viewer/components/illustrated/default/IllustratedDefaultSheet.vue',
  );
  const source = fs.readFileSync(sheetPath, 'utf8');
  const catalog = {};
  // 只取 token 定义块（`.illustrated-wrapper` 内的 `--name: value;`）。
  const block = source.match(/\.illustrated-wrapper\s*\{([\s\S]*?)\n\}/);
  const scope = block ? block[1] : source;
  for (const m of scope.matchAll(/(--illustrated-[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    catalog[m[1]] = m[2].replace(/\s+/g, ' ').trim();
  }
  return catalog;
}

function getLlmInstructions() {
  return `CharInfo Illustrated DX Lab — artifact contract

You are editing a CharInfo Illustrated DX Lab artifact. This is a round-trip
design format, not a safety policy.

WHAT THIS FILE IS
  A real IllustratedV2Sheet (the actual production renderer) hosted standalone.
  The layout you see is the real renderer, not a mock.

DO
  - Add ideas ONLY inside the DX-LAB:EDITABLE zones listed below.
  - Use CSS variables (see dx-lab-token-catalog) FIRST for theme changes.
  - Use decoration CSS / decoration DOM for experimental visuals.
  - Start every custom rule with: .dx-lab-user-design
  - Return the complete HTML file, unchanged elsewhere.

DO NOT
  - Rewrite the generated core runtime (the big <script> at the end).
  - Remove or rename DX-LAB markers.
  - Reformat or rebuild the generated file.
  - Add external runtime dependencies (no CDN, no fetch of new scripts).
  - Replace the IllustratedSheet with a different mock layout.
  - Write bare rules like: .illustrated-attribute { ... }
    (always scope them under .dx-lab-user-design)

EDITABLE ZONES
  ${ZONES.theme.begin} .. ${ZONES.theme.end}        (CSS: token overrides)
  ${ZONES['decoration-css'].begin} .. ${ZONES['decoration-css'].end}  (CSS: visual experiments)
  ${ZONES['decoration-dom'].begin} .. ${ZONES['decoration-dom'].end}  (HTML: decorative markup, injected into the active .illustrated-v2-surface)
  ${ZONES.notes.begin} .. ${ZONES.notes.end}              (JSON: your design intent)

PRIORITY
  1. theme token  -> maps back to a token assignment in the DX theme block
  2. decoration CSS -> maps back to DX-private CSS
  3. decoration DOM -> maps back to the DX decoration layer
  4. If you believe the CORE layout itself must change, describe it in
     dx-lab-design-notes. Do not silently rewrite CORE.`;
}

function buildHtml({ bundle, manifest, tokenCatalog, instructions }) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CharInfo DX Lab</title>

<!-- DX-LAB:MANIFEST:BEGIN -->
<script type="application/json" id="dx-lab-manifest">
${escapeScriptContent(JSON.stringify(manifest, null, 2))}
</script>
<!-- DX-LAB:MANIFEST:END -->

<!-- DX-LAB:INSTRUCTIONS:BEGIN -->
<script type="text/plain" id="dx-lab-llm-instructions">
${escapeScriptContent(instructions)}
</script>
<!-- DX-LAB:INSTRUCTIONS:END -->

<!-- DX-LAB:TOKEN-CATALOG:BEGIN -->
<script type="application/json" id="dx-lab-token-catalog">
${escapeScriptContent(JSON.stringify(tokenCatalog, null, 2))}
</script>
<!-- DX-LAB:TOKEN-CATALOG:END -->

<!-- DX-LAB:EDITABLE:THEME:BEGIN -->
<style id="dx-lab-editable-theme">
/*
 * External LLM: add CSS variable overrides here.
 * Scope everything under .dx-lab-user-design, e.g.
 *   .dx-lab-user-design .illustrated-v2-theme-iris .illustrated-wrapper {
 *     --illustrated-bg: #fff;
 *   }
 */
</style>
<!-- DX-LAB:EDITABLE:THEME:END -->

<!-- DX-LAB:EDITABLE:DECORATION-CSS:BEGIN -->
<style id="dx-lab-editable-decoration-css">
/* External LLM: add visual CSS experiments here. Scope under .dx-lab-user-design. */
</style>
<!-- DX-LAB:EDITABLE:DECORATION-CSS:END -->

<!-- DX-LAB:EDITABLE:NOTES:BEGIN -->
<script type="application/json" id="dx-lab-design-notes">
{
  "title": "",
  "intent": "",
  "notes": []
}
</script>
<!-- DX-LAB:EDITABLE:NOTES:END -->
</head>
<body>
<div id="dx-lab-root"></div>

<!-- DX-LAB:EDITABLE:DECORATION-DOM:BEGIN -->
<template id="dx-lab-editable-decoration-dom">
  <!--
    Add decorative HTML here.
    The lab runtime injects this inside the active .illustrated-v2-surface preview.
  -->
</template>
<!-- DX-LAB:EDITABLE:DECORATION-DOM:END -->

<!-- DX LAB CORE — GENERATED — DO NOT EDIT -->
<script>${escapeScriptContent(bundle)}</script>
<!-- DX LAB CORE END -->
</body>
</html>
`;
}

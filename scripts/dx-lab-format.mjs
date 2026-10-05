/**
 * CharInfo DX Lab round-trip format。
 *
 * exporter 与 inspector 共用同一套 marker 与 hash 规则，
 * 否则「导出时算的 coreHash」和「读回时算的 coreHash」会不一致。
 */
import { createHash } from 'node:crypto';

export const LAB_FORMAT = 'charinfo-dx-lab';
export const LAB_VERSION = 1;

/** EDITABLE zone marker。BEGIN/END 文本是 contract，不随实现变化。 */
export const ZONES = {
  theme: { id: 'dx-lab-editable-theme', begin: 'DX-LAB:EDITABLE:THEME:BEGIN', end: 'DX-LAB:EDITABLE:THEME:END' },
  'decoration-css': {
    id: 'dx-lab-editable-decoration-css',
    begin: 'DX-LAB:EDITABLE:DECORATION-CSS:BEGIN',
    end: 'DX-LAB:EDITABLE:DECORATION-CSS:END',
  },
  'decoration-dom': {
    id: 'dx-lab-editable-decoration-dom',
    begin: 'DX-LAB:EDITABLE:DECORATION-DOM:BEGIN',
    end: 'DX-LAB:EDITABLE:DECORATION-DOM:END',
  },
  notes: {
    id: 'dx-lab-design-notes',
    begin: 'DX-LAB:EDITABLE:NOTES:BEGIN',
    end: 'DX-LAB:EDITABLE:NOTES:END',
  },
};

export const EDITABLE_ZONE_NAMES = Object.keys(ZONES);

/** DOM hook 参考：给外部 LLM 的少量推荐锚点。优先 token，decoration 才碰 DOM。 */
export const RECOMMENDED_HOOKS = [
  '.illustrated-v2-surface',
  '.illustrated-wrapper',
  '.illustrated-shell',
  '.illustrated-portrait-pane',
  '.illustrated-data-pane',
  '.illustrated-attribute',
  '.illustrated-tabs',
];

export function sha256(text) {
  return `sha256:${createHash('sha256').update(text, 'utf8').digest('hex')}`;
}

/**
 * 取出某个 zone 的完整片段（含 BEGIN/END marker），未找到返回 null。
 *
 * 必须跳过 HTML 注释里的 marker —— instructions 文本中会列出各 zone 名称，
 * 直接 `indexOf` 会命中那段说明文字而不是真正的 zone。
 */
export function extractZone(html, zoneName) {
  const zone = ZONES[zoneName];
  if (!zone) throw new Error(`unknown zone: ${zoneName}`);
  const start = html.indexOf(`<!-- ${zone.begin} -->`);
  if (start === -1) return null;
  const endMarker = `<!-- ${zone.end} -->`;
  const end = html.indexOf(endMarker, start);
  if (end === -1) return null;
  return html.slice(start, end + endMarker.length);
}

/**
 * 核心完整性 hash。
 *
 * 做法：把每个 EDITABLE zone 的内容替换成固定 placeholder，再把 manifest 里的
 * coreHash 自身也归一化，最后对整份 HTML 取 SHA-256。
 *
 * 这样外部 LLM 只改 editable zone 时 hash 不变；一旦顺手改了生成的 CORE
 * （runtime bundle、layout markup 等），hash 就会变。
 */
export function computeCoreHash(html) {
  let normalized = html;
  for (const name of EDITABLE_ZONE_NAMES) {
    const zone = ZONES[name];
    // 与 extractZone 相同：必须用注释形式定位，否则会命中 instructions 里的 zone 名称。
    const startMarker = `<!-- ${zone.begin} -->`;
    const endMarker = `<!-- ${zone.end} -->`;
    const start = normalized.indexOf(startMarker);
    const end = normalized.indexOf(endMarker, start);
    if (start !== -1 && end !== -1) {
      normalized =
        normalized.slice(0, start) +
        `${startMarker}__PLACEHOLDER__${endMarker}` +
        normalized.slice(end + endMarker.length);
    }
  }
  // manifest 自身含 coreHash，比较时必须抹掉。
  normalized = normalized.replace(/("coreHash"\s*:\s*)"[^"]*"/g, '$1"__HASH__"');
  return sha256(normalized);
}

/** 解析 JSON script block。 */
export function extractJsonBlock(html, id) {
  const re = new RegExp(`<script[^>]*id="${id}"[^>]*>([\\s\\S]*?)<\\/script>`);
  const m = html.match(re);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

export function escapeScriptContent(text) {
  // 避免 </script> 提前闭合。
  return text.replace(/<\/script>/gi, '<\\/script>');
}

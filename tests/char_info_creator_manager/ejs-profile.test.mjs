import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildManagedEjsBlock,
  buildStatusGalleryImages,
  countUnsupportedStatusGalleryItems,
  createEmptyProfile,
  extractManagedEjsBlock,
  inspectManagedBlock,
  MANAGED_BLOCK_END,
  MANAGED_BLOCK_START,
  normalizeProfile,
  upsertManagedEjsBlock,
  validateProfile,
} from '../../src/char_info_shared/characterVisualProfile.ts';

const profile = {
  ...createEmptyProfile('傲雪'),
  avatarUrl: 'https://files.catbox.moe/avatar.webp',
  raceColor: '#A9DBC3',
  tierColor: '#B7D9E8',
  entranceQuote: '霜雪会记住每一道剑痕。',
  gallery: [
    {
      title: '霜原剑影',
      sources: ['https://files.catbox.moe/main.webp', 'https://i.ibb.co/main-mirror.webp'],
    },
    { title: '雪林巡行', sources: ['https://files.catbox.moe/alternate.avif'] },
  ],
};

test('metadata v2 会规范化可选字段、移除空故事栏目并保持作者顺序', () => {
  const normalized = normalizeProfile({
    ...profile,
    metadata: {
      author: '  测试作者  ',
      version: ' v0.0.3 ',
      author_note: '  这是作者写给读者的角色介绍。  ',
      sex: ' 女 ',
      race: ' 人类 ',
      story_sections: [
        { title: ' 第一章 ', content: ' 第一段正文 ' },
        { title: ' ', content: '会被移除' },
        { title: '第二章', content: '第二段正文' },
      ],
    },
  });

  assert.deepEqual(normalized.metadata, {
    author: '测试作者',
    version: 'v0.0.3',
    author_note: '这是作者写给读者的角色介绍。',
    sex: '女',
    race: '人类',
    story_sections: [
      { title: '第一章', content: '第一段正文' },
      { title: '第二章', content: '第二段正文' },
    ],
  });
});

test('空 metadata 不写入，metadata 文本中的 EJS 分隔符会被拒绝', () => {
  const normalized = normalizeProfile({
    ...profile,
    metadata: {
      author: ' ',
      sex: '',
      race: '   ',
      story_sections: [{ title: '', content: '' }],
    },
  });
  assert.equal(normalized.metadata, undefined);

  assert.match(
    validateProfile({
      ...profile,
      metadata: {
        author: '危险 <% 作者',
        story_sections: [{ title: '章节', content: '危险 %> 内容' }],
      },
    }).join('\n'),
    /EJS 模板分隔符/,
  );
});

test('metadata 会经过 managed EJS round-trip 并写入 runtime profile v2', () => {
  const metadataProfile = {
    ...profile,
    metadata: {
      author: '北境工坊',
      version: 'v0.0.3',
      author_note: '这是发布给读者看的角色说明。',
      sex: '女',
      race: '霜裔',
      story_sections: [
        { title: '雪夜', content: '她在雪夜第一次拔剑。' },
        { title: '归途', content: '黎明之后，她选择回到北境。' },
      ],
    },
  };
  const block = buildManagedEjsBlock(metadataProfile);
  const inspection = inspectManagedBlock(block);

  assert.equal(inspection.state, 'valid');
  assert.deepEqual(inspection.profile, metadataProfile);
  assert.match(block, /schema_version: 2/);
  assert.match(block, /metadata: profile\.metadata/);
  assert.equal(block.indexOf('雪夜') < block.indexOf('归途'), true);
});

test('Gallery Pack URL 允许不配置本地立绘，并经过 managed EJS round-trip', () => {
  const remoteUrl = 'https://img.example.test/api/public/gallery/uika/elfa1';
  const remoteOnlyProfile = {
    ...createEmptyProfile('远程角色'),
    galleryPackUrl: remoteUrl,
  };

  assert.deepEqual(validateProfile(remoteOnlyProfile), []);
  const block = buildManagedEjsBlock(remoteOnlyProfile);
  assert.match(block, /gallery_pack_url: profile\.galleryPackUrl/);
  assert.doesNotMatch(block, /visual_remote_url|gallery_extension/);
  assert.ok(block.includes(remoteUrl));

  const inspection = inspectManagedBlock(block);
  assert.equal(inspection.state, 'valid');
  assert.equal(inspection.profile.galleryPackUrl, remoteUrl);
  assert.deepEqual(inspection.profile.gallery, [{ title: '主立绘', sources: [] }]);

  assert.match(
    validateProfile({ ...remoteOnlyProfile, galleryPackUrl: 'http://img.example.test/api/public/gallery/uika/elfa1' }).join('\n'),
    /HTTPS/,
  );
});

test('只提取经过验证的 CharInfo managed EJS，不执行条目其余内容', () => {
  const block = buildManagedEjsBlock(profile);
  const content = `条目前置正文\n${block}\n<%_ throw new Error('outside managed block'); _%>\n条目后置正文`;
  const extracted = extractManagedEjsBlock(content);

  assert.equal(extracted.code, block);
  assert.deepEqual(extracted.profile, profile);
  assert.throws(() => extractManagedEjsBlock('普通世界书正文'), /没有 CharInfo 受管理 EJS/);
});

test('v2 生成区块只保留一份可读 profile 配置', () => {
  const block = buildManagedEjsBlock(profile);
  assert.ok(block.startsWith(MANAGED_BLOCK_START));
  assert.ok(block.endsWith(MANAGED_BLOCK_END));
  assert.match(block, /<%_\n\{\n/);
  assert.match(block, /const profile = \{\n/);
  assert.match(block, /"characterName": "傲雪"/);
  assert.match(block, /"title": "霜原剑影"/);
  assert.match(block, /const npcName = profile\.characterName;/);
  assert.ok(block.includes('setLocalVar(`char_info.profiles[${JSON.stringify(npcName)}]`, {'));
  assert.match(block, /schema_version: 2/);
  assert.match(block, /profile\.coverUrl \? \{ cover_url: profile\.coverUrl \} : \{\}/);
  assert.match(block, /gallery: profile\.gallery\.map\(image =>/);
  assert.match(block, /image\.thumbnail \? \{ thumbnail: image\.thumbnail \} : \{\}/);
  assert.match(block, /image\.viewerVisible === false \? \{ viewer_visible: false \} : \{\}/);
  assert.match(block, /status\.externalAvatars\.partners/);
  assert.doesNotMatch(block, /status\.externalGalleries\.partners/);
  assert.doesNotMatch(block, /char-info-ejs-builder:data:v1:/);
  assert.doesNotMatch(block, /dryRun|merge:/);
  assert.equal(block.split(profile.characterName).length - 1, 1);
  assert.equal(block.split(profile.avatarUrl).length - 1, 1);
  assert.equal(block.split(profile.entranceQuote).length - 1, 1);
  profile.gallery.forEach(image => {
    assert.equal(block.split(image.title).length - 1, 1);
    image.sources.forEach(source => {
      assert.equal(block.split(source).length - 1, 1);
    });
  });
  const scriptBody = block.slice(block.indexOf('<%_') + 3, block.indexOf('_%>'));
  assert.doesNotThrow(() => new Function(scriptBody));

  const inspection = inspectManagedBlock(block);
  assert.equal(inspection.state, 'valid');
  assert.deepEqual(inspection.profile, profile);
});

test('状态栏相簿单向投影只使用受支持静态格式，并允许视频使用静态 fallback', () => {
  const gallery = [
    { title: '视频主立绘', sources: ['https://files.catbox.moe/main.webm'] },
    {
      title: '视频与静态 fallback',
      sources: ['https://files.catbox.moe/alt.mp4', 'https://files.catbox.moe/alt.webp?cache=1'],
    },
    { title: '静态立绘', sources: ['https://files.catbox.moe/still.avif'] },
  ];

  assert.deepEqual(buildStatusGalleryImages(gallery), [
    { title: '视频与静态 fallback', url: 'https://files.catbox.moe/alt.webp?cache=1' },
    { title: '静态立绘', url: 'https://files.catbox.moe/still.avif' },
  ]);
  assert.equal(countUnsupportedStatusGalleryItems(gallery), 1);
});

test('旧 v1 区块仍可读取，并在保存时自动迁移为 v2', () => {
  const encodedProfile = Buffer.from(JSON.stringify(profile), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
  const legacy = [
    '<%# char-info-ejs-builder:start:v1 %>',
    `<%# char-info-ejs-builder:data:v1:${encodedProfile} %>`,
    '<%_',
    '{',
    '  const oldGeneratedCode = true;',
    '}',
    '_%>',
    '<%# char-info-ejs-builder:end:v1 %>',
    '角色原始内容',
  ].join('\n');

  const inspection = inspectManagedBlock(legacy);
  assert.equal(inspection.state, 'valid');
  assert.deepEqual(inspection.profile, profile);

  const migrated = upsertManagedEjsBlock(legacy, profile);
  assert.ok(migrated.startsWith(MANAGED_BLOCK_START));
  assert.doesNotMatch(migrated, /char-info-ejs-builder:(?:start|data|end):v1/);
  assert.match(migrated, /"characterName": "傲雪"/);
  assert.match(migrated, /角色原始内容$/);
});

test('旧 v2 单 URL 图片会在读取时迁移为 sources 数组', () => {
  const legacyV2Profile = {
    ...profile,
    gallery: [{ title: '旧主立绘', url: 'https://files.catbox.moe/legacy.webp' }],
  };
  const legacyV2Block = [
    MANAGED_BLOCK_START,
    '<%_',
    '{',
    `  const profile = ${JSON.stringify(legacyV2Profile, null, 2).replace(/\n/g, '\n  ')};`,
    '}',
    '_%>',
    MANAGED_BLOCK_END,
  ].join('\n');

  const inspection = inspectManagedBlock(legacyV2Block);
  assert.equal(inspection.state, 'valid');
  assert.deepEqual(inspection.profile.gallery, [
    { title: '旧主立绘', sources: ['https://files.catbox.moe/legacy.webp'] },
  ]);
});

test('首次写入放在连续装饰器之后并保留原有 EJS', () => {
  const original = '@@generate_before\n@@private\n<%_{\nconst oldValue = 1;\n_%>\n角色原始内容';
  const updated = upsertManagedEjsBlock(original, profile);

  assert.ok(updated.startsWith(`@@generate_before\n@@private\n${MANAGED_BLOCK_START}`));
  assert.match(updated, /<%_\{\nconst oldValue = 1;\n_%>/);
  assert.match(updated, /角色原始内容$/);
});

test('再次保存只替换受管理区块', () => {
  const original = '<%_ const untouched = true; _%>\n角色原始内容';
  const first = upsertManagedEjsBlock(original, profile);
  const changed = {
    ...profile,
    entranceQuote: '剑锋所至，霜雪无声。',
    gallery: [{ title: '新的主立绘', sources: ['https://files.catbox.moe/new.webp'] }],
  };
  const second = upsertManagedEjsBlock(first, changed);

  assert.equal(second.split(MANAGED_BLOCK_START).length - 1, 1);
  assert.match(second, /剑锋所至，霜雪无声。/);
  assert.match(second, /<%_ const untouched = true; _%>\n角色原始内容$/);
});

test('未标记的旧版视觉 EJS 会阻止重复写入', () => {
  const legacy = `<%_
setLocalVar('char_info_visuals', {});
setLocalVar('status.externalGalleries.partners', {});
_%>`;

  assert.throws(() => upsertManagedEjsBlock(legacy, profile), /未标记的旧版角色视觉 EJS/);
});

test('未标记的自有 char_info.profiles 写入会阻止重复写入', () => {
  const ownProfilePathOnly = `<%_
setLocalVar('char_info.profiles["傲雪"]', { gallery: [] });
_%>`;

  assert.throws(() => upsertManagedEjsBlock(ownProfilePathOnly, profile), /未标记的旧版角色视觉 EJS/);
});

test('单独残留的旧 CharInfo 或 externalGalleries 写入也会阻止叠加新区块', () => {
  const legacyViewerOnly = `<%_
setLocalVar('char_info_visuals["傲雪"]', { gallery: [] });
_%>`;
  const legacyGalleryOnly = `<%_
setLocalVar('status.externalGalleries.partners["傲雪"].images', []);
_%>`;

  assert.throws(() => upsertManagedEjsBlock(legacyViewerOnly, profile), /未标记的旧版角色视觉 EJS/);
  assert.throws(() => upsertManagedEjsBlock(legacyGalleryOnly, profile), /未标记的旧版角色视觉 EJS/);
});

test('单独存在的状态栏头像桥接不会阻止新增 CharInfo 视觉配置', () => {
  const avatarBridgeOnly = `<%_
setLocalVar('status.externalAvatars.partners["傲雪"].url', 'https://files.catbox.moe/avatar.webp');
_%>`;

  assert.doesNotThrow(() => upsertManagedEjsBlock(avatarBridgeOnly, profile));
});

test('标记残缺时拒绝编辑', () => {
  const malformed = `${MANAGED_BLOCK_START}\n<%_ const value = 1; _%>`;
  const inspection = inspectManagedBlock(malformed);
  assert.equal(inspection.state, 'malformed');
  assert.throws(() => upsertManagedEjsBlock(malformed, profile));
});

test('不启用自定义颜色时不写入颜色变量', () => {
  const defaultThemeProfile = {
    ...createEmptyProfile('无色测试'),
    gallery: [{ title: '主立绘', sources: ['https://files.catbox.moe/default.webp'] }],
  };
  const block = buildManagedEjsBlock(defaultThemeProfile);

  assert.match(block, /"raceColor": ""/);
  assert.match(block, /"tierColor": ""/);
  assert.match(block, /profile\.raceColor \?/);
  assert.match(block, /profile\.tierColor \?/);
  assert.ok(block.includes('setLocalVar(`char_info.profiles[${JSON.stringify(npcName)}]`, {'));
  const inspection = inspectManagedBlock(block);
  assert.equal(inspection.state, 'valid');
  assert.equal(inspection.profile.raceColor, '');
  assert.equal(inspection.profile.tierColor, '');
});

test('头像为空时受管理 EJS 不会清空已有状态栏头像', () => {
  const block = buildManagedEjsBlock({
    ...profile,
    avatarUrl: '',
  });

  assert.match(block, /if \(profile\.avatarUrl\) \{\s*setLocalVar\(\s*`status\.externalAvatars\.partners/);
});

test('角色姓名允许正常标点并通过 JSON.stringify 安全写入路径', () => {
  const characterName = '维奥莱塔·马克西姆 "雪"[DX]';
  const block = buildManagedEjsBlock({ ...profile, characterName });

  assert.ok(block.includes(`"characterName": ${JSON.stringify(characterName)}`));
  assert.ok(block.includes('const npcName = profile.characterName;'));
  assert.ok(block.includes('setLocalVar(`char_info.profiles[${JSON.stringify(npcName)}]`, {'));
});

test('角色姓名拒绝控制字符、异常长度和危险保留键', () => {
  assert.match(validateProfile({ ...profile, characterName: '坏\n名字' }).join('\n'), /控制字符/);
  assert.match(validateProfile({ ...profile, characterName: '角'.repeat(81) }).join('\n'), /不能超过 80 个字符/);

  for (const characterName of ['__proto__', 'prototype', 'constructor']) {
    assert.match(validateProfile({ ...profile, characterName }).join('\n'), /系统保留名称/);
  }
});

test('会截断 EJS 的模板分隔符会被拒绝', () => {
  assert.match(validateProfile({ ...profile, entranceQuote: '危险 %> 台词' }).join('\n'), /EJS 模板分隔符/);
  assert.match(
    validateProfile({
      ...profile,
      gallery: [{ title: '危险 <% 标题', sources: ['https://files.catbox.moe/main.webp'] }],
    }).join('\n'),
    /EJS 模板分隔符/,
  );
  assert.match(
    validateProfile({
      ...profile,
      gallery: [{ title: '主立绘', sources: ['https://files.catbox.moe/danger-%>.webp'] }],
    }).join('\n'),
    /EJS 模板分隔符/,
  );
});

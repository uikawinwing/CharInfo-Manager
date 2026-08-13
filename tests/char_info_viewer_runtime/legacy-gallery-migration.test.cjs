const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { migrateLegacyExternalGalleries } = require('../../src/char_info_viewer_runtime/legacyGalleryMigration.ts');

test('migrates legacy status galleries without deleting the old data', () => {
  const variables = {
    status: {
      externalGalleries: {
        partners: {
          艾琳: {
            images: [
              { title: '主立绘', url: 'https://files.catbox.moe/erin.png' },
              { title: '日常服', url: 'https://example.com/erin-casual.webp' },
              { title: '无效来源', url: 'javascript:alert(1)' },
            ],
          },
        },
      },
    },
  };

  const result = migrateLegacyExternalGalleries(variables);

  assert.deepEqual(result.migratedNames, ['艾琳']);
  assert.deepEqual(result.variables.char_info.profiles.艾琳, {
    schema_version: 1,
    gallery: [
      { title: '主立绘', sources: ['https://files.catbox.moe/erin.png'] },
      { title: '日常服', sources: ['https://example.com/erin-casual.webp'] },
    ],
  });
  assert.deepEqual(variables.status.externalGalleries.partners.艾琳.images, [
    { title: '主立绘', url: 'https://files.catbox.moe/erin.png' },
    { title: '日常服', url: 'https://example.com/erin-casual.webp' },
    { title: '无效来源', url: 'javascript:alert(1)' },
  ]);
});

test('does not overwrite an existing CharInfo profile', () => {
  const variables = {
    char_info: {
      profiles: {
        艾琳: { schema_version: 1, gallery: [{ title: '新版主立绘', sources: ['https://example.com/new.png'] }] },
      },
    },
    status: {
      externalGalleries: {
        partners: {
          艾琳: { images: [{ title: '旧版主立绘', url: 'https://example.com/old.png' }] },
        },
      },
    },
  };

  const result = migrateLegacyExternalGalleries(variables);

  assert.deepEqual(result.migratedNames, []);
  assert.equal(result.variables, variables);
});

test('leaves an unrecognized existing profile value untouched', () => {
  const variables = {
    char_info: { profiles: { 艾琳: '不要覆盖' } },
    status: {
      externalGalleries: {
        partners: {
          艾琳: { images: [{ title: '旧版主立绘', url: 'https://example.com/old.png' }] },
        },
      },
    },
  };

  const result = migrateLegacyExternalGalleries(variables);

  assert.deepEqual(result.migratedNames, []);
  assert.equal(result.variables, variables);
});

test('adds a gallery to an existing profile without replacing its visual fields', () => {
  const variables = {
    char_info: {
      profiles: {
        艾琳: { schema_version: 1, custom_racecolor: '#78C8F0', 登场台词: '已有资料' },
      },
    },
    status: {
      externalGalleries: {
        partners: {
          艾琳: { images: [{ title: '旧版主立绘', url: 'https://example.com/old.png' }] },
        },
      },
    },
  };

  const result = migrateLegacyExternalGalleries(variables);

  assert.deepEqual(result.migratedNames, ['艾琳']);
  assert.deepEqual(result.variables.char_info.profiles.艾琳, {
    schema_version: 1,
    custom_racecolor: '#78C8F0',
    登场台词: '已有资料',
    gallery: [{ title: '旧版主立绘', sources: ['https://example.com/old.png'] }],
  });
});

test('runs the migration before the initial card scan and after a chat change', () => {
  const runtimeSource = fs.readFileSync(
    path.resolve(__dirname, '../../src/char_info_viewer_runtime/runtime.ts'),
    'utf8',
  );

  assert.match(runtimeSource, /started = true;[\s\S]*?migrateLegacyGalleries\(\);[\s\S]*?initializeLibrary\(\);/);
  assert.match(runtimeSource, /tavern_events\.CHAT_CHANGED, \(\) => \{[\s\S]*?closeCreatorEditor\(\);[\s\S]*?migrateLegacyGalleries\(\);/);
  assert.match(runtimeSource, /updateVariablesWith\([\s\S]*?\{ type: 'chat' \}/);
});

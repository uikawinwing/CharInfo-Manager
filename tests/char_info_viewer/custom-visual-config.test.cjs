const assert = require('node:assert/strict');
const test = require('node:test');

const { resolveCharacterVisualConfig, resolveTheme } = require('../../src/char_info_viewer/services/themeService.ts');

test('主题服务提供聊天变量视觉配置解析入口', () => {
  assert.equal(typeof resolveCharacterVisualConfig, 'function');
});

test('普通角色图片占位符不读取任意变量中的图片或配色', () => {
  const data = resolveCharacterVisualConfig(
    {
      姓名: '傲雪',
      角色图片: '[[char_info_visual_aoxue]]',
    },
    {
      char_info_visual_aoxue: {
        url: 'https://example.com/aoxue.png',
        custom_racecolor: '#78c8f0',
        custom_tiercolor: '#a855f7',
      },
    },
  );

  assert.equal(data.角色图片, undefined);
  assert.equal(data.custom_racecolor, undefined);
  assert.equal(data.custom_tiercolor, undefined);
});

test('没有角色图片字段时按姓名读取 CharInfo 自有资料，并读取配色和登场台词', () => {
  const data = resolveCharacterVisualConfig(
    {
      姓名: '  傲雪  ',
      种族: '龙裔',
    },
    {
      char_info: {
        profiles: {
          傲雪: {
            schema_version: 1,
            custom_racecolor: '#78c8f0',
            custom_tiercolor: '#a855f7',
            登场台词: '  霜雪会记住每一道剑痕。  ',
            gallery: [
              {
                title: '主立绘',
                sources: ['https://example.com/aoxue.png', 'https://mirror.example.com/aoxue.png'],
              },
              {
                title: '备用立绘',
                sources: ['javascript:alert(1)', 'https://example.com/aoxue-alt.webp'],
              },
            ],
          },
        },
      },
    },
  );

  assert.equal(data.角色图片, 'https://example.com/aoxue.png');
  assert.deepEqual(data.__char_info_image_urls, [
    'https://example.com/aoxue.png',
    'https://example.com/aoxue-alt.webp',
  ]);
  assert.deepEqual(data.__char_info_image_source_groups, [
    ['https://example.com/aoxue.png', 'https://mirror.example.com/aoxue.png'],
    ['https://example.com/aoxue-alt.webp'],
  ]);
  assert.equal(data.__char_info_randomize_initial_image, false);
  assert.equal(data.custom_racecolor, '#78C8F0');
  assert.equal(data.custom_tiercolor, '#A855F7');
  assert.equal(data.登场台词, '霜雪会记住每一道剑痕。');
});

test('新版资料只有图库时继承旧版同名角色的颜色与登场台词', () => {
  const data = resolveCharacterVisualConfig(
    { 姓名: '傲雪', 种族: '龙裔', 生命层级: '第四层级' },
    {
      char_info: {
        profiles: {
          傲雪: {
            schema_version: 1,
            gallery: [{ title: '新版主立绘', sources: ['https://example.com/new.png'] }],
          },
        },
      },
      char_info_visuals: {
        傲雪: {
          url: 'https://example.com/legacy.png',
          custom_racecolor: '#A9DBC3',
          custom_tiercolor: '#B7D9E8',
          登场台词: '霜雪会记住每一道剑痕。',
        },
      },
    },
  );

  assert.equal(data.角色图片, 'https://example.com/new.png');
  assert.equal(data.custom_racecolor, '#A9DBC3');
  assert.equal(data.custom_tiercolor, '#B7D9E8');
  assert.equal(data.登场台词, '霜雪会记住每一道剑痕。');
});

test('CharInfo 自有资料的第一张相册图片固定作为主立绘', () => {
  const data = resolveCharacterVisualConfig(
    { 姓名: '傲雪' },
    {
      char_info: {
        profiles: {
          傲雪: {
            schema_version: 1,
            gallery: [
              { title: '主立绘', sources: ['https://example.com/01.png'] },
              { title: '备用立绘', sources: ['https://example.com/02.png'] },
            ],
          },
        },
      },
    },
  );

  assert.equal(data.角色图片, 'https://example.com/01.png');
  assert.deepEqual(data.__char_info_image_urls, ['https://example.com/01.png', 'https://example.com/02.png']);
  assert.deepEqual(data.__char_info_image_source_groups, [
    ['https://example.com/01.png'],
    ['https://example.com/02.png'],
  ]);
  assert.equal(data.__char_info_randomize_initial_image, false);
});

test('旧版姓名视觉配置仍把主图和 gallery 整理为去重图片列表', () => {
  const data = resolveCharacterVisualConfig(
    { 姓名: '傲雪' },
    {
      char_info_visuals: {
        傲雪: {
          url: 'https://example.com/main.png',
          gallery: [
            'https://example.com/alternate-01.png',
            'https://example.com/main.png',
            'javascript:alert(1)',
            'https://example.com/alternate-02.png',
          ],
        },
      },
    },
  );

  assert.equal(data.角色图片, 'https://example.com/main.png');
  assert.deepEqual(data.__char_info_image_urls, [
    'https://example.com/main.png',
    'https://example.com/alternate-01.png',
    'https://example.com/alternate-02.png',
  ]);
  assert.equal(data.__char_info_randomize_initial_image, false);
});

test('旧版只有 gallery 时仍启用特殊版并标记初次随机图片', () => {
  const data = resolveCharacterVisualConfig(
    { 姓名: '傲雪' },
    {
      char_info_visuals: {
        傲雪: {
          gallery: ['https://example.com/01.png', 'https://example.com/02.png'],
        },
      },
    },
  );

  assert.equal(data.角色图片, 'https://example.com/01.png');
  assert.deepEqual(data.__char_info_image_urls, ['https://example.com/01.png', 'https://example.com/02.png']);
  assert.equal(data.__char_info_randomize_initial_image, true);
});

test('豪华／DX 版不会读取 Aoo 状态栏公版相册', () => {
  const data = resolveCharacterVisualConfig(
    {
      姓名: '傲雪',
      __dx_character_ref: 'dx_anastasia',
    },
    {
      status: {
        externalGalleries: {
          partners: {
            傲雪: {
              images: [{ title: 'image1', url: 'https://example.com/public.png' }],
            },
          },
        },
      },
    },
  );

  assert.equal(data.角色图片, undefined);
  assert.equal(data.__char_info_image_urls, undefined);
});

test('普通版也不再读取 Aoo externalGalleries', () => {
  const data = resolveCharacterVisualConfig(
    { 姓名: '傲雪' },
    {
      status: {
        externalGalleries: {
          partners: {
            傲雪: {
              images: [{ title: '旧相册', url: 'https://example.com/legacy.png' }],
            },
          },
        },
      },
    },
  );

  assert.equal(data.角色图片, undefined);
  assert.equal(data.__char_info_image_urls, undefined);
});

test('姓名视觉配置缺失时保持普通资料；图片无效时仍应用独立配色和台词', () => {
  const missing = resolveCharacterVisualConfig(
    {
      姓名: '傲雪',
      种族: '龙裔',
    },
    {
      char_info_visuals: {},
    },
  );
  const invalid = resolveCharacterVisualConfig(
    {
      姓名: '傲雪',
      种族: '龙裔',
    },
    {
      char_info_visuals: {
        傲雪: {
          url: 'javascript:alert(1)',
          custom_racecolor: '#78C8F0',
          custom_tiercolor: '#A855F7',
          登场台词: '不应注入',
        },
      },
    },
  );

  assert.equal(missing.角色图片, undefined);
  assert.equal(missing.登场台词, undefined);
  assert.equal(invalid.角色图片, undefined);
  assert.equal(invalid.custom_racecolor, '#78C8F0');
  assert.equal(invalid.custom_tiercolor, '#A855F7');
  assert.equal(invalid.登场台词, '不应注入');
});

test('普通字符串图片变量占位符不再作为 Viewer 图片来源', () => {
  const data = resolveCharacterVisualConfig(
    {
      姓名: '傲雪',
      角色图片: '[[char_info_image_aoxue]]',
    },
    {
      char_info_image_aoxue: 'https://example.com/aoxue.png',
    },
  );

  assert.equal(data.角色图片, undefined);
  assert.equal(data.custom_racecolor, undefined);
  assert.equal(data.custom_tiercolor, undefined);
});

test('普通图片占位符无论配置是否存在都完全忽略', () => {
  const invalid = resolveCharacterVisualConfig(
    {
      姓名: '傲雪',
      角色图片: '[[char_info_visual_aoxue]]',
    },
    {
      char_info_visual_aoxue: {
        url: 'javascript:alert(1)',
        custom_racecolor: 'red',
        custom_tiercolor: '#12',
      },
    },
  );
  const missing = resolveCharacterVisualConfig(
    {
      姓名: '傲雪',
      角色图片: '[[not_found]]',
    },
    {},
  );

  assert.equal(invalid.角色图片, undefined);
  assert.equal(invalid.custom_racecolor, undefined);
  assert.equal(invalid.custom_tiercolor, undefined);
  assert.equal(missing.角色图片, undefined);
});

test('自定义种族色和层级色覆盖自动主题色', () => {
  const theme = resolveTheme({
    种族: '龙裔',
    生命层级: '第四层级',
    custom_racecolor: '#78C8F0',
    custom_tiercolor: '#A855F7',
  });

  assert.equal(theme.raceHex, '#78C8F0');
  assert.equal(theme.tierHex, '#A855F7');
  assert.equal(theme.raceRgb, '120, 200, 240');
  assert.equal(theme.tierRgb, '168, 85, 247');
});

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const test = require('node:test');

const { buildCharacterViewModel } = require('../../src/char_info_viewer/services/characterViewModel.ts');
const { buildDivinitySections } = require('../../src/char_info_viewer/components/illustrated/divinitySections.ts');

test('keeps the complete law collection when legacy top-level data accompanies the current divinity field', () => {
  const vm = buildCharacterViewModel({
    姓名: '第七层测试角色',
    法则: [
      { 名称: '旧律', 被动效果: '旧律被动', 主动效果: '旧律主动' },
      { 名称: '新律', 被动效果: '旧版新律被动', 主动效果: '旧版新律主动' },
    ],
    登神长阶: {
      法则: [{ 名称: '新律', 被动效果: '第七层新律被动' }],
    },
  });

  assert.deepEqual(
    vm.divinityLaws.map(law => law.名称),
    ['旧律', '新律'],
  );
  assert.deepEqual(vm.divinityLaws[1], {
    名称: '新律',
    被动效果: '第七层新律被动',
    主动效果: '旧版新律主动',
  });
  assert.deepEqual(
    buildDivinitySections(vm).map(section => [
      section.kind,
      section.typeLabel,
      section.title,
      section.details?.map(detail => [detail.label, detail.body]),
    ]),
    [
      [
        '法则',
        'Divine Law',
        '旧律',
        [
          ['被动效果', '旧律被动'],
          ['主动效果', '旧律主动'],
        ],
      ],
      [
        '法则',
        'Divine Law',
        '新律',
        [
          ['被动效果', '第七层新律被动'],
          ['主动效果', '旧版新律主动'],
        ],
      ],
    ],
  );
});

test('renders each of several laws as one complete section', () => {
  const vm = buildCharacterViewModel({
    姓名: '伊丽莎白',
    登神长阶: {
      法则: [
        { 名称: '血', 被动效果: '对血族绝对支配', 主动效果: '操纵数百公里血液', 描述: '血构成了她的存在' },
        { 名称: '渴求', 被动效果: '理解潜意识渴求', 主动效果: '强制表现所有渴求', 描述: '她不喜欢他人隐藏' },
        { 名称: '凝滞', 被动效果: '形态不受改变', 主动效果: '停止范围内变化', 描述: '她害怕变化存在' },
      ],
    },
  });

  const lawSections = buildDivinitySections(vm).filter(section => section.kind === '法则');

  assert.equal(vm.divinityLaws.length, 3);
  assert.equal(lawSections.length, 3);
  assert.deepEqual(
    lawSections.map(section => [section.title, section.details?.map(detail => detail.label)]),
    [
      ['血', ['被动效果', '主动效果', '描述']],
      ['渴求', ['被动效果', '主动效果', '描述']],
      ['凝滞', ['被动效果', '主动效果', '描述']],
    ],
  );
});

test('keeps the illustrated divinity tab vertically scrollable when its content exceeds the panel', () => {
  const panelSource = readFileSync(
    require.resolve('../../src/char_info_viewer/components/illustrated/IllustratedDefaultDivinityPanel.vue'),
    'utf8',
  );
  const divinityPanelRule = panelSource.match(/\.illustrated-default-divinity\s*\{[^}]*\}/)?.[0];

  assert.ok(divinityPanelRule);
  assert.match(divinityPanelRule, /flex:\s*1 1 auto;/);
  assert.match(divinityPanelRule, /min-height:\s*0;/);
  assert.match(divinityPanelRule, /overflow-y:\s*auto;/);
});

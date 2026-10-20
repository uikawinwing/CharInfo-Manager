import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EMPTY_IDENTITY_REGISTRY,
  putIdentityBinding,
  projectKnownCharacterData,
  readIdentityRegistry,
  resolveIdentityBinding,
  resolveIdentityWorldbookTargets,
} from '../../src/char_info_shared/identityRegistry.ts';

const saber = {
  id: 'npc_e8f213a4', realName: '阿尔托莉雅', publicName: 'Saber',
  aliases: ['剑士', '骑士王'], visibility: 'masked',
  knownFields: ['在场'], publicFacts: { 身份: '自称剑士' },
  worldbookTargets: [{ book: '英灵资料', uid: 42 }],
};
const another = {
  id: 'npc_6491bb3e', realName: '另一位剑士', publicName: 'Saber',
  aliases: ['Saber'], visibility: 'masked',
  knownFields: [], publicFacts: {}, worldbookTargets: [{ book: '英灵资料', uid: 77 }],
};

test('同一职阶代号不是身份主键：含混别名不能触发别人的世界书', () => {
  const registry = putIdentityBinding(putIdentityBinding(EMPTY_IDENTITY_REGISTRY, saber), another);
  assert.equal(resolveIdentityBinding(registry, { name: 'Saber' }), null);
  assert.equal(resolveIdentityBinding(registry, { id: saber.id })?.realName, '阿尔托莉雅');
  assert.deepEqual(resolveIdentityWorldbookTargets(registry, saber.id), [{ book: '英灵资料', uid: 42 }]);
  assert.deepEqual(resolveIdentityWorldbookTargets(registry, 'npc_notfound'), []);
});

test('匿名投影只返回经过确认的公开事实，绝不把内部真名和法则复制出去', () => {
  const data = {
    姓名: '阿尔托莉雅', 种族: '英灵', 身份: ['王'], 法则: '秘密法则', 技能: ['宝具'],
    在场: true, 心里话: '王国不应毁灭', 好感度: 50,
  };
  const result = projectKnownCharacterData(data, saber);
  assert.deepEqual(result, { 姓名: 'Saber', 在场: true, 身份: '自称剑士' });
  assert.ok(!JSON.stringify(result).includes('阿尔托莉雅'));
  assert.ok(!JSON.stringify(result).includes('秘密法则'));
});

test('一个角色有多个称谓但唯一绑定，且真实身份冲突时拒绝覆盖', () => {
  const initial = putIdentityBinding(EMPTY_IDENTITY_REGISTRY, saber);
  assert.equal(resolveIdentityBinding(initial, { name: '剑士' })?.id, saber.id);
  assert.throws(() => putIdentityBinding(initial, { ...saber, id: 'npc_0000abcd' }), /already bound/);
});

test('聊天变量注册表容错读取，坏格式不触发额外世界书', () => {
  assert.deepEqual(readIdentityRegistry(null), EMPTY_IDENTITY_REGISTRY);
  assert.deepEqual(readIdentityRegistry({ char_info: { identityRegistry: { version: 2, byId: {} } } }), EMPTY_IDENTITY_REGISTRY);
  const registry = readIdentityRegistry({ char_info: { identityRegistry: { version: 1, byId: { [saber.id]: saber } } } });
  assert.equal(resolveIdentityBinding(registry, { id: saber.id })?.publicName, 'Saber');
});

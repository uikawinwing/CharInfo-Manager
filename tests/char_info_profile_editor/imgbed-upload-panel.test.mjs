import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire, Module } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const { parse, compileScript } = createRequire(require.resolve('vue'))('@vue/compiler-sfc');
const ts = require('typescript');
const { createRenderer, h, nextTick, reactive } = require('vue');
const filename = new URL(
  '../../src/char_info_profile_editor/components/ImgbedUploadPanel.vue',
  import.meta.url,
).pathname.replace(/^\/(\w:)/u, '$1');
const { descriptor } = parse(readFileSync(filename, 'utf8'), { filename });
const code = ts.transpileModule(compileScript(descriptor, { id: 'upload-test', inlineTemplate: true }).content, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
const module = new Module(filename);
module.filename = filename;
module.paths = Module._nodeModulePaths(filename.slice(0, filename.lastIndexOf('/')));
module._compile(code, filename);
const Panel = module.exports.default;
const { clearRemoteGalleryCache } = require('../../src/char_info_viewer/services/remoteGalleryService.ts');
const node = tag => ({ tag, children: [], parent: null, text: '' });
const renderer = createRenderer({
  createElement: node,
  createText: text => ({ text }),
  createComment: text => ({ text }),
  setText: (item, text) => {
    item.text = text;
  },
  setElementText: (item, text) => {
    item.text = text;
    item.children = [];
  },
  insert: (item, parent, anchor) => {
    if (item.parent) item.parent.children.splice(item.parent.children.indexOf(item), 1);
    item.parent = parent;
    const index = anchor ? parent.children.indexOf(anchor) : -1;
    if (index < 0) parent.children.push(item);
    else parent.children.splice(index, 0, item);
  },
  remove: item => {
    if (item.parent) item.parent.children.splice(item.parent.children.indexOf(item), 1);
  },
  parentNode: item => item.parent,
  nextSibling: item => item.parent?.children[item.parent.children.indexOf(item) + 1] ?? null,
  patchProp: (item, key, _old, value) => {
    item[key] = value;
  },
  setScopeId() {},
  insertStaticContent() {
    throw Error('unexpected static content');
  },
});
const id = '12345678-1234-4234-8234-123456789abc';
const url = `https://imgbed.uika.cc.cd/api/public/album-gallery/${id}`;
const item = { id: 'existing', title: '原图', url: 'https://example.com/a.png', kind: 'image' };
const result = { albumId: id, remoteGalleryUrl: url, characterName: '角色', items: [item] };
const flush = async () => {
  for (let i = 0; i < 8; i++) {
    await Promise.resolve();
    await nextTick();
  }
};
const walk = (root, predicate) =>
  predicate(root) ? root : root.children?.map(child => walk(child, predicate)).find(Boolean);
function mount(overrides = {}, initialUrl = '') {
  let callback;
  const calls = [];
  const bridge = {
    subscribe(fn) {
      callback = fn;
      fn({ status: 'connected' });
      return () => {};
    },
    status: async () => {},
    connect: async () => {},
    disconnect: async () => {},
    cancel() {},
    readGallery: async () => ({ albumId: id, characterName: '角色', items: [item] }),
    save: async input => {
      calls.push(input);
      return result;
    },
    ...overrides,
  };
  const props = reactive({ bridge, remoteGalleryUrl: initialUrl, characterName: '角色' });
  const root = node('root');
  let panel;
  const app = renderer.createApp({
    render: () =>
      h(Panel, {
        ...props,
        ref: value => {
          panel = value;
        },
        'onUpdate:remoteGalleryUrl': value => {
          props.remoteGalleryUrl = value;
        },
      }),
  });
  app.mount(root);
  return {
    props,
    root,
    calls,
    get panel() {
      return panel;
    },
    app,
    callback,
  };
}
function choose(root, files) {
  walk(root, item => item.tag === 'input' && item.type === 'file').onChange({ target: { files, value: '' } });
}
function click(root, label) {
  const button = walk(
    root,
    item => item.tag === 'button' && (item.text?.trim() === label || item['aria-label'] === label),
  );
  assert.ok(button, label);
  button.onClick();
}
function publicPack(name = '角色') {
  return {
    format: 'char-info-gallery-pack',
    version: 1,
    packId: id,
    profileId: id,
    characterName: name,
    avatarThumbnail: null,
    libraryThumbnail: null,
    gallery: [{ title: '立绘', sources: ['https://example.com/a.png'] }],
  };
}
function fetchPack(name = '角色') {
  globalThis.fetch = async () =>
    new Response(JSON.stringify(publicPack(name)), { status: 200, headers: { 'content-type': 'application/json' } });
}

test('ImgBed 图片列表只使用 160px WebP 缩略图，不请求 10MB 原图', async () => {
  const original = 'https://imgbed.uika.cc.cd/file/users/589790434960867328/example.png?v=123';
  const view = mount(
    {
      readGallery: async () => ({
        albumId: id,
        characterName: '角色',
        items: [{ id: 'png', title: 'ComfyUI 原画', kind: 'image', url: original }],
      }),
    },
    url,
  );
  await flush();
  const image = walk(view.root, element => element.tag === 'img');
  assert.ok(image, '编辑器应显示缩略图');
  assert.equal(
    image.src,
    'https://imgbed.uika.cc.cd/thumb/users/589790434960867328/example.png?variant=avatar',
  );
  assert.ok(!image.src.includes('/file/'), '不得下载原始 PNG');
  assert.equal(image.loading, 'lazy');
  assert.equal(image.alt, '');
  view.app.unmount();
});

test('优先使用公开图库给出的带版本号 160px WebP，失败才回退 720px，不加载原图', async () => {
  const original = 'https://imgbed.uika.cc.cd/file/users/owner/portrait.png?v=1';
  const published = 'https://imgbed.uika.cc.cd/thumb/users/owner/portrait.png?v=222';
  const view = mount(
    {
      readGallery: async () => ({
        albumId: id,
        characterName: '角色',
        items: [{ id: 'photo', title: 'Portrait', kind: 'image', url: original }],
      }),
    },
    url,
  );
  view.props.galleryPreview = {
    ...publicPack(),
    gallery: [{ title: 'Portrait', sources: [published], thumbnail: published }],
  };
  await flush();
  const first = walk(view.root, node => node.tag === 'img');
  assert.ok(first);
  assert.equal(first.src, published + '&variant=avatar');
  first.onError();
  await flush();
  const fallback = walk(view.root, node => node.tag === 'img');
  assert.ok(fallback, '单次图片错误应尝试备用缩略图，而非立即显示无预览');
  assert.equal(fallback.src, published);
  assert.ok(!fallback.src.includes('/file/'), '备用图仍必须是 WebP 缩略图');
  view.app.unmount();
});

test('生成的 UUID 文件名对用户隐藏，手机列表保持紧凑行布局与可访问操作', async () => {
  const uuidTitle = 'a909fbcc-e28e-41bc-ad16-f3259f243966.png';
  const view = mount(
    {
      readGallery: async () => ({
        albumId: id,
        characterName: '角色',
        items: [
          { id: 'first', kind: 'image', title: uuidTitle, url: 'https://example.com/one.png' },
          { id: 'second', kind: 'image', title: '旅行立绘', url: 'https://example.com/two.png' },
        ],
      }),
    },
    url,
  );
  await flush();
  assert.ok(
    walk(view.root, entry => entry.text === '图片 1'),
    '机器文件名应替换成友好的序号',
  );
  assert.ok(
    walk(view.root, entry => entry.text === '旅行立绘'),
    '人工命名仍应显示',
  );
  assert.ok(!walk(view.root, entry => entry.text?.includes(uuidTitle)), 'UUID 不得显示给用户');
  const firstRow = walk(view.root, entry => entry.tag === 'li' && entry.class === 'upload-media-row');
  assert.ok(firstRow, '图片列表应是独立的紧凑行');
  assert.equal(walk(view.root, entry => entry.tag === 'input' && entry.type === 'checkbox'), undefined);
  const actions = walk(firstRow, entry => entry.role === 'group');
  assert.ok(actions, '排序和移除应属于同一行操作组');
  for (const label of ['上移', '下移', '移除']) {
    assert.ok(
      walk(actions, entry => entry.tag === 'button' && entry['aria-label'] === label),
      label,
    );
  }
  const styles = descriptor.styles[0].content;
  assert.ok(styles.includes('grid-template-columns: 48px minmax(0, 1fr) auto;'));
  assert.ok(!styles.includes('.upload-panel li {'), '不得让移动端图片行变成单列');
  view.app.unmount();
});

test('未连接时必须显式点击连接，已有授权时不重复登录', async () => {
  let prepared = 0;
  const fresh = mount({
    subscribe(fn) {
      fn({ status: 'required' });
      return () => {};
    },
    connect: async container => {
      assert.ok(container);
      prepared++;
    },
  });
  await flush();
  assert.equal(prepared, 0);
  click(fresh.root, '连接 ImgBed');
  await flush();
  assert.equal(prepared, 1);
  fresh.app.unmount();
  const resumed = mount({
    connect: async () => {
      prepared++;
    },
  });
  await flush();
  assert.equal(prepared, 1);
  resumed.app.unmount();
});

test('上传完成允许 ImgBed 以 WebP 展示 URL 返回同一张 PNG，不误判保存失败', async () => {
  clearRemoteGalleryCache();
  const originalFile = 'https://imgbed.uika.cc.cd/file/users/owner/portrait.png';
  const displayWebp = 'https://imgbed.uika.cc.cd/thumb/users/owner/portrait.png?variant=portrait&v=100';
  const saved = {
    ...result,
    items: [{ id: 'saved', title: '立绘', kind: 'image', url: originalFile }],
  };
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        ...publicPack(),
        gallery: [{ title: '立绘', sources: [displayWebp] }],
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  const view = mount({ save: async () => saved });
  await flush();
  choose(view.root, [new File(['data'], 'portrait.png', { type: 'image/png' })]);
  await view.panel.save();
  await flush();
  assert.equal(view.props.remoteGalleryUrl, url);
  const displayed = walk(view.root, node => node.tag === 'img');
  assert.equal(displayed.src, 'https://imgbed.uika.cc.cd/thumb/users/owner/portrait.png?variant=avatar');
  view.app.unmount();
  clearRemoteGalleryCache();
});

test('可在图片管理页改名并点击上传，成功后自动回填远程图库 URL', async () => {
  clearRemoteGalleryCache();
  fetchPack();
  const view = mount();
  await flush();
  choose(view.root, [new File(['data'], 'a.png', { type: 'image/png' })]);
  await flush();
  const nsfw = walk(view.root, node => node.tag === 'input' && node.type === 'checkbox');
  assert.equal(nsfw.checked, false);
  click(view.root, '编辑第 1 张图片名称');
  await flush();
  const title = walk(view.root, node => node.tag === 'input' && node['aria-label'] === '第 1 张图片的图库名称');
  assert.ok(title);
  title.onInput({ target: { value: '新的主立绘' } });
  await flush();
  click(view.root, '上传并保存图库');
  await flush();
  assert.equal(view.calls.length, 1);
  assert.equal(view.calls[0].files[0].title, '新的主立绘');
  assert.equal(Object.hasOwn(view.calls[0].files[0], 'nsfw'), false);
  assert.equal(view.props.remoteGalleryUrl, url);
  view.app.unmount();
});

test('新相册可明确确认当前账号以继续待上传文件', async () => {
  clearRemoteGalleryCache();
  fetchPack();
  const view = mount();
  await flush();
  choose(view.root, [new File(['data'], 'a.png', { type: 'image/png' })]);
  view.callback({ status: 'connected', accountId: 'userA' });
  await flush();
  await assert.rejects(view.panel.save(), /账号已改变/);
  click(view.root, '确认使用当前账号（保留文件）');
  click(view.root, '上传并保存图库');
  await flush();
  assert.equal(view.calls.length, 1);
  assert.equal(view.props.remoteGalleryUrl, url);
  view.app.unmount();
});

test('上传阶段有明确进度，收到服务端反馈后进入图库保存和 URL 核验', async () => {
  clearRemoteGalleryCache();
  fetchPack();
  let advance;
  let finish;
  const view = mount({
    save: (_input, progress) => {
      advance = progress;
      return new Promise(resolve => {
        finish = resolve;
      });
    },
  });
  await flush();
  choose(view.root, [new File(['data'], 'a.png', { type: 'image/png' })]);
  const saving = view.panel.save();
  await flush();
  assert.ok(walk(view.root, entry => entry.text?.includes('正在重新确认 Discord 账号')));
  assert.ok(walk(view.root, entry => entry.text?.includes('已用时')));
  advance({ completed: 0, total: 1, phase: 'uploading' });
  await flush();
  assert.ok(walk(view.root, entry => entry.text?.includes('正在提交 1 个文件')));
  advance({ completed: 1, total: 1, phase: 'saving' });
  await flush();
  assert.ok(walk(view.root, entry => entry.text?.includes('正在保存相册成员')));
  finish(result);
  await saving;
  await flush();
  assert.ok(walk(view.root, entry => entry.text?.includes('图库已更新')));
  assert.ok(walk(view.root, entry => entry.text?.includes('图库已更新')));
  view.app.unmount();
});

test('上传失败时保留失败位置和可展开诊断记录', async () => {
  const view = mount({
    save: async () => {
      throw new Error('连接超时');
    },
  });
  await flush();
  choose(view.root, [new File(['data'], 'a.png', { type: 'image/png' })]);
  await assert.rejects(view.panel.save(), /连接超时/);
  await flush();
  assert.ok(walk(view.root, entry => entry.text?.includes('失败位置：验证 ImgBed 授权')));
  assert.ok(walk(view.root, entry => entry.tag === 'summary' && entry.text?.includes('查看操作记录')));
  view.app.unmount();
});

test('外部修改图库后重新读取文件列表，且不会覆盖未上传草稿', async () => {
  let loadedItems = [item];
  let count = 0;
  const view = mount(
    {
      readGallery: async () => {
        count += 1;
        return { albumId: id, characterName: '角色', items: loadedItems };
      },
    },
    url,
  );
  await flush();
  assert.equal(count, 1);
  loadedItems = [item, { id: 'added', title: '外部新增图片', url: 'https://example.com/b.webp', kind: 'image' }];
  await view.panel.reload();
  await flush();
  assert.equal(count, 2);
  assert.ok(walk(view.root, node => node.text?.includes('外部新增图片')));
  choose(view.root, [new File(['test'], 'pending.png', { type: 'image/png' })]);
  await flush();
  await assert.rejects(view.panel.reload(), /请先完成或取消当前上传/);
  assert.equal(count, 2);
  assert.ok(view.panel.hasPendingMedia);
  view.app.unmount();
});

test('上传失败保留文件与 NSFW 标记，并使用同一请求重试', async () => {
  clearRemoteGalleryCache();
  fetchPack();
  const calls = [];
  const view = mount({
    save: async input => {
      calls.push(input);
      if (calls.length === 1) throw Error('上传失败');
      return result;
    },
  });
  await flush();
  const file = new File(['data'], 'a.webm', { type: 'video/webm' });
  choose(view.root, [file]);
  await flush();
  const nsfw = walk(view.root, node => node.tag === 'input' && node.type === 'checkbox');
  assert.equal(nsfw.checked, false);
  nsfw.onChange({ target: { checked: true } });
  await flush();
  assert.equal(nsfw.checked, true);
  assert.equal(view.panel.hasPendingMedia, true);
  await assert.rejects(view.panel.save(), /上传失败/);
  assert.equal(view.props.remoteGalleryUrl, '');
  await flush();
  assert.equal(nsfw.disabled, true);
  assert.equal(nsfw.checked, true);
  assert.ok(walk(view.root, entry => entry.text?.includes('文件和请求已保留，请再次点击保存重试')));
  await view.panel.save();
  assert.equal(calls[0].requestId, calls[1].requestId);
  assert.equal(calls[1].files[0].file, file);
  assert.equal(calls[0].files[0].nsfw, true);
  assert.equal(calls[1].files[0].nsfw, true);
  assert.equal(view.props.remoteGalleryUrl, url);
  assert.equal(view.panel.hasPendingMedia, false);
  view.app.unmount();
});

test('服务端确认尚无副作用的文件拒绝后，允许移除错误文件并重新选择', async () => {
  const view = mount({
    save: async () => {
      throw Object.assign(new Error('文件签名无效'), { code: 'rejected' });
    },
  });
  await flush();
  choose(view.root, [new File(['data'], 'bad.png', { type: 'image/png' })]);
  await assert.rejects(view.panel.save(), /文件签名无效/);
  await flush();
  const remove = walk(view.root, item => item.tag === 'button' && item['aria-label'] === '移除');
  assert.equal(remove.disabled, false);
  remove.onClick();
  await flush();
  await assert.rejects(view.panel.save(), /至少保留/);
  view.app.unmount();
});

test('公开图库身份不符后只重新核验，不重复上传', async () => {
  clearRemoteGalleryCache();
  fetchPack('其他角色');
  const view = mount();
  await flush();
  choose(view.root, [new File(['data'], 'a.png', { type: 'image/png' })]);
  await flush();
  await assert.rejects(view.panel.save(), /身份验证失败/);
  assert.equal(view.props.remoteGalleryUrl, '');
  fetchPack();
  await view.panel.save();
  assert.equal(view.calls.length, 1);
  assert.equal(view.props.remoteGalleryUrl, url);
  view.app.unmount();
});

test('公开包缺成员或顺序未更新时保留已上传结果，重试只验证', async () => {
  clearRemoteGalleryCache();
  const view = mount();
  await flush();
  choose(view.root, [new File(['data'], 'a.png', { type: 'image/png' })]);
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({ ...publicPack(), gallery: [{ title: '旧图', sources: ['https://example.com/old.png'] }] }),
    );
  await assert.rejects(view.panel.save(), /身份验证失败/);
  fetchPack();
  await view.panel.save();
  assert.equal(view.calls.length, 1);
  view.app.unmount();
});

test('选文件后改为其他远程 URL，不能用旧队列覆盖新地址', async () => {
  const view = mount();
  await flush();
  choose(view.root, [new File(['data'], 'a.png', { type: 'image/png' })]);
  view.props.remoteGalleryUrl = 'https://gallery.example/another.json';
  await flush();
  await assert.rejects(view.panel.save(), /角色或图库已改变/);
  assert.equal(view.calls.length, 0);
  assert.equal(view.props.remoteGalleryUrl, 'https://gallery.example/another.json');
  view.app.unmount();
});

test('复用相册并提交移除及新增后的顺序', async () => {
  clearRemoteGalleryCache();
  fetchPack();
  const view = mount({}, url);
  await flush();
  click(view.root, '移除');
  choose(view.root, [new File(['data'], 'b.png', { type: 'image/png' })]);
  await flush();
  await view.panel.save();
  assert.equal(view.calls[0].albumId, id);
  assert.deepEqual(view.calls[0].order, [{ uploadId: view.calls[0].files[0].id }]);
  view.app.unmount();
});

test('切换角色或取消后迟到的上传结果不能回写', async () => {
  for (const action of ['switch', 'cancel']) {
    clearRemoteGalleryCache();
    fetchPack();
    let finish;
    const view = mount({
      save: () =>
        new Promise(resolve => {
          finish = resolve;
        }),
    });
    await flush();
    choose(view.root, [new File(['data'], 'a.png', { type: 'image/png' })]);
    await flush();
    const saving = view.panel.save();
    await flush();
    if (action === 'switch') view.props.characterName = '新角色';
    else click(view.root, '取消操作');
    finish(result);
    await assert.rejects(saving, /取消或角色已改变/);
    assert.equal(view.props.remoteGalleryUrl, '');
    view.app.unmount();
  }
});

test('切换角色后可放弃尚未上传的草稿并选择新文件', async () => {
  const view = mount();
  await flush();
  choose(view.root, [new File(['a'], 'a.png', { type: 'image/png' })]);
  await flush();
  view.props.characterName = '新角色';
  await flush();
  click(view.root, '放弃更改并重新读取');
  await flush();
  assert.ok(!walk(view.root, item => item.text?.includes('a.png')));
  choose(view.root, [new File(['b'], 'b.png', { type: 'image/png' })]);
  await flush();
  assert.ok(walk(view.root, item => item.text === 'b.png'));
  view.app.unmount();
});

test('取消读取后迟到结果不能覆盖重试结果', async () => {
  let finish;
  let reads = 0;
  const view = mount(
    {
      readGallery: () =>
        ++reads === 1
          ? new Promise(resolve => {
              finish = resolve;
            })
          : Promise.resolve({ albumId: id, characterName: '角色', items: [{ ...item, title: '新图' }] }),
    },
    url,
  );
  await flush();
  click(view.root, '取消操作');
  await flush();
  click(view.root, '重新读取图片');
  await flush();
  finish({ albumId: id, characterName: '角色', items: [item] });
  await flush();
  assert.ok(walk(view.root, entry => entry.text?.includes('新图')));
  assert.ok(!walk(view.root, entry => entry.text?.includes('原图')));
  view.app.unmount();
});

test('拒绝无效文件并显示具体原因', async () => {
  const view = mount();
  await flush();
  choose(view.root, [
    new File(['a'], 'bad.txt', { type: 'text/plain' }),
    new File([], 'empty.png', { type: 'image/png' }),
  ]);
  await flush();
  assert.ok(
    walk(
      view.root,
      entry =>
        entry.text?.includes('bad.txt：不支持的文件类型') && entry.text?.includes('empty.png：文件为空或超过 95 MiB'),
    ),
  );
  view.app.unmount();
});

test('账号切换保留待上传文件并拒绝保存', async () => {
  const view = mount();
  await flush();
  choose(view.root, [new File(['a'], 'a.png', { type: 'image/png' })]);
  await flush();
  view.callback({ status: 'connected', accountId: 'other' });
  await flush();
  await assert.rejects(view.panel.save(), /账号已改变/);
  assert.ok(walk(view.root, entry => entry.text === 'a.png'));
  view.app.unmount();
});

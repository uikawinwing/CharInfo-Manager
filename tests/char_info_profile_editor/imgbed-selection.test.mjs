import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire, Module } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const { parse, compileScript } = createRequire(require.resolve('vue'))('@vue/compiler-sfc');
const ts = require('typescript');
const { createRenderer, h, nextTick, reactive } = require('vue');
require.extensions['.vue'] = module => {
  module.exports = { render: () => null };
};
const filename = new URL(
  '../../src/char_info_profile_editor/components/GalleryStep.vue',
  import.meta.url,
).pathname.replace(/^\/(\w:)/u, '$1');
const source = readFileSync(filename, 'utf8');
const { descriptor } = parse(source, { filename });
const compiled = compileScript(descriptor, { id: 'imgbed-test', inlineTemplate: true });
const code = ts.transpileModule(compiled.content, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
const componentModule = new Module(filename);
componentModule.filename = filename;
componentModule.paths = Module._nodeModulePaths(filename.slice(0, filename.lastIndexOf('/')));
componentModule._compile(code, filename);
const GalleryStep = componentModule.exports.default;
const {
  clearRemoteGalleryCache,
  refreshRemoteGallery,
} = require('../../src/char_info_viewer/services/remoteGalleryService.ts');

globalThis.HTMLImageElement = class HTMLImageElement {};
globalThis.HTMLVideoElement = class HTMLVideoElement {};
globalThis.window = globalThis;

const node = tag => ({
  tag,
  tagName: tag.toUpperCase(),
  children: [],
  parent: null,
  text: '',
  addEventListener() {},
  removeEventListener() {},
});
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
    if (item.parent) {
      const old = item.parent.children.indexOf(item);
      if (old >= 0) item.parent.children.splice(old, 1);
    }
    item.parent = parent;
    const index = anchor ? parent.children.indexOf(anchor) : -1;
    if (index < 0) parent.children.push(item);
    else parent.children.splice(index, 0, item);
  },
  remove: item => {
    if (!item.parent) return;
    const index = item.parent.children.indexOf(item);
    if (index >= 0) item.parent.children.splice(index, 1);
    item.parent = null;
  },
  parentNode: item => item.parent,
  nextSibling: item => item.parent?.children[item.parent.children.indexOf(item) + 1] ?? null,
  patchProp: (item, key, _old, value) => {
    item[key] = value;
  },
  setScopeId: () => {},
  insertStaticContent: () => {
    throw new Error('unexpected static content');
  },
});

const id = '12345678-1234-4234-8234-123456789abc';
const url = `https://imgbed-staging.uika.cc.cd/api/public/album-gallery/${id}`;
const payload = name => ({
  format: 'char-info-gallery-pack',
  version: 1,
  packId: id,
  profileId: id,
  characterName: name,
  avatarThumbnail: null,
  libraryThumbnail: null,
  gallery: [],
});
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
const flush = async () => {
  for (let index = 0; index < 8; index += 1) {
    await Promise.resolve();
    await nextTick();
  }
};

function mount(select, initialUrl = '') {
  const events = [];
  let cancellations = 0;
  const props = reactive({
    gallery: [{ id: 1, title: '本地', sources: ['https://example.com/a.png'], previewSourceIndex: 0 }],
    avatarUrl: '',
    coverUrl: '',
    remoteGalleryUrl: initialUrl,
    characterName: '角色',
    debugEnabled: false,
    imgbedBridge: {
      select,
      cancel() {
        cancellations += 1;
      },
      destroy() {},
    },
  });
  const root = node('root');
  const app = renderer.createApp({
    render: () =>
      h(GalleryStep, {
        ...props,
        'onUpdate:remoteGalleryUrl': value => {
          events.push(['url', value]);
          props.remoteGalleryUrl = value;
        },
        'onUpdate:gallery': value => events.push(['gallery', value]),
        'onUpdate:avatarUrl': value => {
          events.push(['avatar', value]);
          props.avatarUrl = value;
        },
        'onUpdate:coverUrl': value => {
          events.push(['cover', value]);
          props.coverUrl = value;
        },
      }),
  });
  app.mount(root);
  function find(label, current = root) {
    if (current.tag === 'button' && current.text.trim() === label) return current;
    for (const child of current.children ?? []) {
      const found = find(label, child);
      if (found) return found;
    }
    return null;
  }
  function status(current = root) {
    if (current.role === 'status') return current.text;
    for (const child of current.children ?? []) {
      const message = status(child);
      if (message) return message;
    }
    return '';
  }
  function selectFor(label, current = root) {
    if (current.tag === 'select' && current['aria-label'] === label) return current;
    for (const child of current.children ?? []) {
      const found = selectFor(label, child);
      if (found) return found;
    }
    return null;
  }
  return {
    app,
    props,
    events,
    root,
    choose(label, value) {
      const select = selectFor(label);
      assert.ok(select, `missing select: ${label}`);
      select.onChange({ target: { value } });
    },
    click(label) {
      const button = find(label);
      assert.ok(button, `missing button: ${label}`);
      button.onClick();
    },
    find,
    status,
    get cancellations() {
      return cancellations;
    },
  };
}

test('ImgBed 图库可选择独立头像和封面，外部修改后刷新更新远程图片', async () => {
  clearRemoteGalleryCache();
  const originalFetch = globalThis.fetch;
  const base = 'https://imgbed-staging.uika.cc.cd/thumb/users/owner/';
  const image = (name, version) => ({
    title: name,
    sources: [`${base}${name}.png?variant=portrait&v=${version}`],
    thumbnail: `${base}${name}.png?v=${version}`,
  });
  let latest = [image('first', 1), image('second', 1)];
  let requests = 0;
  globalThis.fetch = async () => {
    requests += 1;
    return new Response(
      JSON.stringify({
        ...payload('角色'),
        avatarThumbnail: `${base}first.png?variant=avatar&v=1`,
        libraryThumbnail: `${base}first.png?variant=library&v=1`,
        gallery: latest,
      }),
      { status: 200, headers: { ETag: `"gallery-${requests}"` } },
    );
  };
  try {
    const view = mount(async () => {
      throw new Error('不应打开旧窗口');
    }, url);
    await flush();
    const imageElements = (function collectImages(node) {
      return (
        (node.tag === 'img' ? 1 : 0) + (node.children ?? []).reduce((count, child) => count + collectImages(child), 0)
      );
    })(view.root);
    assert.equal(imageElements, 0, 'ImgBed 图片用途只使用紧凑选择框，不单独请求三份预览图');
    assert.equal(view.props.avatarUrl, `${base}first.png?variant=avatar&v=1`);
    assert.equal(view.props.coverUrl, `${base}first.png?variant=library&v=1`);
    view.choose('选择状态栏头像', '1');
    view.choose('选择角色库封面', '1');
    await flush();
    assert.equal(view.props.avatarUrl, `${base}second.png?v=1&variant=avatar`);
    assert.equal(view.props.coverUrl, `${base}second.png?v=1&variant=library`);
    latest = [image('first', 1), image('second', 2), image('third', 2)];
    view.click('↻ 刷新图库');
    await flush();
    assert.ok(requests >= 2, '刷新必须重新请求远程图库');
    const allText = (function collect(node) {
      return [node.text ?? '', ...(node.children ?? []).map(collect)].join(' ');
    })(view.root);
    assert.ok(allText.includes('third'), '第三张图应在新图库选项中出现');
    assert.equal(view.props.avatarUrl, `${base}second.png?v=2&variant=avatar`);
    assert.equal(view.props.coverUrl, `${base}second.png?v=2&variant=library`);
    view.app.unmount();
  } finally {
    globalThis.fetch = originalFetch;
    clearRemoteGalleryCache();
  }
});

test('选择、确认、失败和刷新只影响远程 URL，保留本地图片', async () => {
  const originalFetch = globalThis.fetch;
  let name = '角色';
  globalThis.fetch = async () => new Response(JSON.stringify(payload(name)), { status: 200 });
  try {
    const view = mount(async () => ({ albumId: id, remoteGalleryUrl: url }));
    const fallback = JSON.stringify(view.props.gallery);
    view.click('选择已有图库');
    await flush();
    assert.deepEqual(view.events, [['url', url]]);
    assert.equal(JSON.stringify(view.props.gallery), fallback);
    view.click('↻ 刷新图库');
    await flush();
    assert.deepEqual(view.events, [['url', url]]);
    assert.equal(JSON.stringify(view.props.gallery), fallback);
    view.app.unmount();

    name = '其他角色';
    const mismatch = mount(async () => ({ albumId: id, remoteGalleryUrl: url }));
    mismatch.click('选择已有图库');
    await flush();
    assert.deepEqual(mismatch.events, []);
    mismatch.click('确认使用');
    await flush();
    assert.deepEqual(mismatch.events, [['url', url]]);
    mismatch.app.unmount();

    globalThis.fetch = async () => {
      throw new Error('offline');
    };
    const failed = mount(async () => ({ albumId: id, remoteGalleryUrl: url }), 'https://example.com/manual');
    failed.click('选择已有图库');
    await flush();
    assert.equal(failed.props.remoteGalleryUrl, 'https://example.com/manual');
    assert.deepEqual(failed.events, []);
    failed.app.unmount();
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('修改 URL 或姓名及卸载后，旧选择结果不会写入', async () => {
  for (const action of ['url', 'name', 'unmount']) {
    const pending = deferred();
    const view = mount(() => pending.promise);
    view.click('选择已有图库');
    if (action === 'url') view.props.remoteGalleryUrl = 'https://example.com/manual';
    if (action === 'name') view.props.characterName = '新角色';
    if (action === 'unmount') view.app.unmount();
    await flush();
    pending.resolve({ albumId: id, remoteGalleryUrl: url });
    await flush();
    assert.deepEqual(view.events, [], action);
    if (action !== 'unmount') view.app.unmount();
  }
});

test('验证请求尚未完成时切换姓名会丢弃旧响应', async () => {
  const originalFetch = globalThis.fetch;
  const pending = deferred();
  globalThis.fetch = () => pending.promise;
  try {
    const view = mount(async () => ({ albumId: id, remoteGalleryUrl: url }));
    view.click('选择已有图库');
    await flush();
    view.props.characterName = '新角色';
    await flush();
    pending.resolve(new Response(JSON.stringify(payload('角色')), { status: 200 }));
    await flush();
    assert.deepEqual(view.events, []);
    view.app.unmount();
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('图库身份不匹配时不更新 URL，也不覆盖已有缓存', async () => {
  const originalFetch = globalThis.fetch;
  clearRemoteGalleryCache();
  let response = () => new Response(JSON.stringify(payload('角色')), { status: 200 });
  globalThis.fetch = async () => response();
  try {
    await refreshRemoteGallery(url);
    response = () =>
      new Response(JSON.stringify({ ...payload('角色'), packId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }), {
        status: 200,
      });
    const view = mount(async () => ({ albumId: id, remoteGalleryUrl: url }));
    view.click('选择已有图库');
    await flush();
    assert.deepEqual(view.events, []);
    assert.equal(view.props.remoteGalleryUrl, '');
    response = () => new Response(null, { status: 304 });
    assert.equal((await refreshRemoteGallery(url)).packId, id);
    view.app.unmount();
  } finally {
    clearRemoteGalleryCache();
    globalThis.fetch = originalFetch;
  }
});

test('弹窗受阻、关闭、连接中断或超时均引导粘贴公开图库 API URL，并保留档案', async () => {
  for (const [code, message] of [
    ['blocked', /弹窗被浏览器拦截/],
    ['closed', /窗口已关闭或连接已中断/],
    ['unsupported', /无法建立或保持图库连接/],
    ['timeout', /连接已超过 12 分钟/],
  ]) {
    const view = mount(async () => {
      throw Object.assign(new Error(code), { code });
    }, 'https://example.com/manual');
    const fallback = JSON.stringify(view.props.gallery);
    try {
      view.click('选择已有图库');
      await flush();
      assert.match(view.status(), message);
      assert.match(view.status(), /下方粘贴 ImgBed 公开图库 API URL/);
      assert.equal(view.props.remoteGalleryUrl, 'https://example.com/manual');
      assert.equal(JSON.stringify(view.props.gallery), fallback);
      assert.deepEqual(view.events, []);
      assert.equal(view.find('取消操作'), null);
    } finally {
      view.app.unmount();
    }
  }
});

test('等待时告知十二分钟时限，主动取消调用桥接清理且旧选择不能写入', async () => {
  const pending = deferred();
  const view = mount(() => pending.promise, 'https://example.com/manual');
  const fallback = JSON.stringify(view.props.gallery);
  try {
    view.click('选择已有图库');
    await flush();
    assert.match(view.status(), /12 分钟内/);
    assert.ok(view.find('取消操作'));
    const before = view.cancellations;
    view.click('取消操作');
    await flush();
    assert.equal(view.cancellations, before + 1);
    assert.match(view.status(), /已取消图库操作/);
    pending.resolve({ albumId: id, remoteGalleryUrl: url });
    await flush();
    assert.deepEqual(view.events, []);
    assert.equal(view.props.remoteGalleryUrl, 'https://example.com/manual');
    assert.equal(JSON.stringify(view.props.gallery), fallback);
    assert.equal(view.find('取消操作'), null);
  } finally {
    view.app.unmount();
  }
});

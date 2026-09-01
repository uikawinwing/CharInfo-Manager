import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { parse } from 'yaml';

const root = new URL('../', import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), 'utf8');
}

test('repo pins one pnpm version and keeps dependency build approvals in pnpm-workspace.yaml', async () => {
  const [packageSource, workspaceSource] = await Promise.all([read('package.json'), read('pnpm-workspace.yaml')]);
  const pkg = JSON.parse(packageSource);
  const workspace = parse(workspaceSource);

  assert.equal(pkg.private, true);
  assert.match(pkg.packageManager, /^pnpm@11\./);
  assert.equal(pkg.pnpm, undefined, 'pnpm v11 settings must not live under package.json#pnpm');
  assert.deepEqual(workspace.allowBuilds, {
    '@parcel/watcher': true,
    '@tailwindcss/oxide': true,
    electron: true,
    esbuild: true,
    'javascript-obfuscator': true,
    'unrs-resolver': true,
    'vue-demi': true,
  });
});

test('all dist writers use the single-writer guard and public release has one verification entrypoint', async () => {
  const pkg = JSON.parse(await read('package.json'));

  assert.match(pkg.scripts.watch, /check:no-watch[\s\S]*clean:dist[\s\S]*webpack --mode development --watch/);
  assert.match(pkg.scripts['build:dev'], /check:no-watch[\s\S]*clean:dist[\s\S]*webpack --mode development/);
  assert.match(pkg.scripts.build, /check:no-watch[\s\S]*clean:dist[\s\S]*webpack --mode production/);
  assert.equal(pkg.scripts['release:check'], 'pnpm lint && pnpm test && pnpm build && pnpm check:public-dist');
});

test('webpack keeps dev-only entries in development but excludes them from production', async () => {
  const [webpackSource, themeLabEntry] = await Promise.all([
    read('webpack.config.ts'),
    read('src/char_info_v2_theme_lab/index.ts'),
  ]);

  assert.match(themeLabEntry, /@dev-only/);
  assert.match(webpackSource, /if \(!includeDevOnly && source\.includes\('@dev-only'\)\) return false/);
  assert.match(webpackSource, /const includeDevOnly = argv\.mode !== 'production'/);
  assert.match(webpackSource, /glob_script_files\(includeDevOnly\)/);
});

test('GitHub release, PR validation, dependency updates, and template sync all use the release gate', async () => {
  const [bundleSource, validateSource, bumpSource, syncSource] = await Promise.all([
    read('.github/workflows/bundle.yaml'),
    read('.github/workflows/validate.yaml'),
    read('.github/workflows/bump_deps.yaml'),
    read('.github/workflows/sync_template.yaml'),
  ]);

  const bundle = parse(bundleSource);
  const validate = parse(validateSource);
  const bump = parse(bumpSource);
  const sync = parse(syncSource);

  assert.ok(bundle.jobs?.bundle);
  assert.ok(validate.jobs?.verify);
  assert.ok(bump.jobs?.bump_deps);
  assert.ok(sync.jobs?.sync_template);

  assert.match(bundleSource, /pnpm install --frozen-lockfile[\s\S]*pnpm release:check/);
  assert.match(validateSource, /pull_request:[\s\S]*pnpm release:check/);
  assert.match(bumpSource, /Verify dependency update[\s\S]*pnpm lint[\s\S]*pnpm test[\s\S]*pnpm build[\s\S]*pnpm check:public-dist/);
  assert.match(syncSource, /steps: prechecks,pull[\s\S]*Verify synced template before creating PR[\s\S]*pnpm release:check[\s\S]*steps: commit,push,pr,cleanup/);
});

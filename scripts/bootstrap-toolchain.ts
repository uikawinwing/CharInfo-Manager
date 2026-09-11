import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const toolchainRoot = path.resolve(projectRoot, '../../Toolchain');
const toolchainRepo = 'https://github.com/uikawinwing/tavern_helper_toolchain.git';
const toolchainUpstreamRepo = 'https://github.com/StageDog/tavern_helper_template.git';

function run(command: string, args: string[], cwd: string): void {
  execFileSync(command, args, { cwd, stdio: 'inherit' });
}

function runNpmScript(script: string, cwd: string): void {
  if (process.platform === 'win32') {
    run(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', `npm run ${script}`], cwd);
    return;
  }
  run('npm', ['run', script], cwd);
}

function output(command: string, args: string[], cwd: string): string {
  return execFileSync(command, args, { cwd, encoding: 'utf8' }).trim();
}

function normalizeGitHubRemote(url: string): string {
  return url
    .trim()
    .replace(/^git@github\.com:/u, 'https://github.com/')
    .replace(/\.git$/u, '')
    .replace(/\/$/u, '')
    .toLowerCase();
}

function ensureToolchain(): void {
  const gitDir = path.join(toolchainRoot, '.git');
  if (!fs.existsSync(toolchainRoot)) {
    fs.mkdirSync(path.dirname(toolchainRoot), { recursive: true });
    console.info(`[charinfo] Cloning shared Toolchain into ${toolchainRoot}`);
    run('git', ['clone', '--branch', 'main', '--single-branch', toolchainRepo, toolchainRoot], projectRoot);
  } else if (!fs.existsSync(gitDir)) {
    throw new Error(`${toolchainRoot} exists but is not a Git checkout of the shared TavernHelper Toolchain.`);
  } else {
    const originUrl = output('git', ['remote', 'get-url', 'origin'], toolchainRoot);
    const normalizedOrigin = normalizeGitHubRemote(originUrl);
    const allowedOrigins = [toolchainRepo, toolchainUpstreamRepo].map(normalizeGitHubRemote);
    if (!allowedOrigins.includes(normalizedOrigin)) {
      throw new Error(
        `Shared Toolchain origin is ${originUrl}, expected ${toolchainRepo} or ${toolchainUpstreamRepo}.\n` +
          'Use the shared TavernHelper Toolchain checkout at ../../Toolchain before running bootstrap.',
      );
    }

    const branch = output('git', ['branch', '--show-current'], toolchainRoot);
    if (normalizedOrigin === normalizeGitHubRemote(toolchainRepo) && branch === 'main') {
      const dirty = output('git', ['status', '--porcelain', '--untracked-files=no'], toolchainRoot);
      if (dirty) {
        throw new Error(
          `Shared Toolchain main has tracked local changes. Refusing to update it automatically.\n${dirty}\n` +
            'Commit/stash those Toolchain changes first, then rerun npm run bootstrap.',
        );
      }

      console.info('[charinfo] Updating shared Toolchain main...');
      run('git', ['fetch', 'origin', 'main'], toolchainRoot);
      run('git', ['pull', '--ff-only', 'origin', 'main'], toolchainRoot);
    } else {
      console.info(
        `[charinfo] Using existing shared Toolchain checkout (${branch || 'detached HEAD'}) from ${originUrl}; branch left unchanged.`,
      );
    }
  }

  const projectBuild = path.join(toolchainRoot, 'project-build.mjs');
  if (!fs.existsSync(projectBuild)) {
    throw new Error(
      `Shared Toolchain at ${toolchainRoot} does not support external consumer projects (missing project-build.mjs).\n` +
        `Use ${toolchainRepo} main or a Toolchain development branch that contains shared-consumer support.`,
    );
  }

  console.info('[charinfo] Installing shared Toolchain dependencies...');
  runNpmScript('bootstrap', toolchainRoot);
  console.info('[charinfo] Bootstrap complete.');
}

ensureToolchain();

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const testsRoot = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testsRoot, '..');
const toolchainRoot = path.resolve(testsRoot, '../../../Toolchain');
const toolchainParentUrl = pathToFileURL(path.join(toolchainRoot, 'package.json')).href;
const aliasExtensions = ['', '.ts', '.tsx', '.js', '.mjs', '.cjs'];

function isBareSpecifier(specifier) {
  return (
    !specifier.startsWith('.') &&
    !specifier.startsWith('/') &&
    !specifier.startsWith('file:') &&
    !specifier.startsWith('node:') &&
    !specifier.startsWith('data:')
  );
}

function resolveAliasFile(root, relativePath) {
  const basePath = path.resolve(root, relativePath);
  const candidates = [
    ...aliasExtensions.map(extension => `${basePath}${extension}`),
    ...aliasExtensions.slice(1).map(extension => path.join(basePath, `index${extension}`)),
  ];
  const match = candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  return match ? pathToFileURL(match).href : null;
}

function resolveAlias(specifier) {
  if (specifier.startsWith('@util/')) {
    return resolveAliasFile(path.join(toolchainRoot, 'util'), specifier.slice('@util/'.length));
  }
  if (specifier.startsWith('@/')) {
    return resolveAliasFile(path.join(projectRoot, 'src'), specifier.slice('@/'.length));
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  const aliasUrl = resolveAlias(specifier);
  if (aliasUrl) {
    return { url: aliasUrl, shortCircuit: true };
  }

  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (!isBareSpecifier(specifier) || error?.code !== 'ERR_MODULE_NOT_FOUND') {
      throw error;
    }

    try {
      return await nextResolve(specifier, { ...context, parentURL: toolchainParentUrl });
    } catch {
      throw error;
    }
  }
}

const Module = require('node:module');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const toolchainRoot = path.resolve(projectRoot, '../../Toolchain');
const toolchainNodeModules = path.join(toolchainRoot, 'node_modules');
process.env.NODE_PATH = [toolchainNodeModules, process.env.NODE_PATH].filter(Boolean).join(path.delimiter);
Module._initPaths();

const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function resolveProjectAlias(request, parent, isMain, options) {
  const resolvedRequest = request.startsWith('@/')
    ? path.resolve(projectRoot, 'src', request.slice(2))
    : request.startsWith('@util/')
      ? path.resolve(toolchainRoot, 'util', request.slice('@util/'.length))
      : request;
  return resolveFilename.call(this, resolvedRequest, parent, isMain, options);
};

require('ts-node').register({
  compilerOptions: {
    module: 'CommonJS',
    moduleResolution: 'Node',
    ignoreDeprecations: '6.0',
  },
  transpileOnly: true,
});

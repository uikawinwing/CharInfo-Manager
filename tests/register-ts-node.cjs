const Module = require('node:module');
const path = require('node:path');

const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function resolveProjectAlias(request, parent, isMain, options) {
  const resolvedRequest = request.startsWith('@/') ? path.resolve(__dirname, '..', 'src', request.slice(2)) : request;
  return resolveFilename.call(this, resolvedRequest, parent, isMain, options);
};

require('ts-node').register({
  compilerOptions: {
    module: 'CommonJS',
    moduleResolution: 'Node',
  },
  transpileOnly: true,
});

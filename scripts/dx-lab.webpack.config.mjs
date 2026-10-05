import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const toolchainConfigPath = path.resolve(projectRoot, '../../Toolchain/webpack.config.ts');

process.env.TAVERN_PROJECT_ROOT = projectRoot;

const { default: configurationFactories } = await import(pathToFileURL(toolchainConfigPath).href);
const dxLabEntry = path.resolve(projectRoot, 'src/char_info_dx_lab/index.ts');

// 这些 plugin 面向 SillyTavern 宿主，离线 Lab 不能跑。
const stBackgroundPlugins = new Set(['watch_tavern_helper', 'schema_dump', 'tavern_sync']);

export default (env, argv) => {
  const configurations = configurationFactories.map(candidate =>
    typeof candidate === 'function' ? candidate(env, argv) : candidate,
  );
  const configuration = configurations.find(candidate =>
    path.resolve(String(candidate.entry)) === dxLabEntry,
  );

  if (!configuration) {
    throw new Error(`[dx-lab] webpack entry not found: ${dxLabEntry}`);
  }

  configuration.name = 'dx-lab';
  // 离线单文件产物不能引用 node_modules 或 CDN。
  configuration.externals = undefined;
  configuration.devtool = false;
  configuration.output = {
    ...configuration.output,
    asyncChunks: false,
    clean: false,
    // 全部内联回 HTML，不需要额外 chunk 文件。
    filename: 'dx-lab.js',
  };
  configuration.optimization = {
    ...configuration.optimization,
    splitChunks: false,
    runtimeChunk: false,
  };
  configuration.plugins = (configuration.plugins ?? []).filter(
    plugin => !stBackgroundPlugins.has(plugin?.apply?.name ?? ''),
  );

  return configuration;
};

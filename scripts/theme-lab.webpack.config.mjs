import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const toolchainConfigPath = path.resolve(projectRoot, '../../Toolchain/webpack.config.ts');

process.env.TAVERN_PROJECT_ROOT = projectRoot;

const { default: configurationFactories } = await import(pathToFileURL(toolchainConfigPath).href);
const themeLabEntry = path.resolve(projectRoot, 'src/char_info_v2_theme_lab/index.ts');
const stBackgroundPlugins = new Set(['watch_tavern_helper', 'schema_dump', 'tavern_sync']);

export default (env, argv) => {
  const configurations = configurationFactories.map(candidate =>
    typeof candidate === 'function' ? candidate(env, argv) : candidate,
  );
  const configuration = configurations.find(candidate => path.resolve(String(candidate.entry)) === themeLabEntry);

  if (!configuration) {
    throw new Error(`[theme-lab] webpack entry not found: ${themeLabEntry}`);
  }

  configuration.name = 'theme-lab';
  configuration.externals = undefined;
  configuration.output = {
    ...configuration.output,
    asyncChunks: false,
    clean: false,
  };
  configuration.optimization = {
    ...configuration.optimization,
    splitChunks: false,
  };
  configuration.plugins = (configuration.plugins ?? []).filter(
    plugin => !stBackgroundPlugins.has(plugin?.apply?.name ?? ''),
  );

  return configuration;
};

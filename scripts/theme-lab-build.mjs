import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const toolchainRoot = path.resolve(projectRoot, '../../Toolchain');
const webpackCli = path.join(toolchainRoot, 'node_modules', 'webpack-cli', 'bin', 'cli.js');
const configFile = path.join(projectRoot, 'scripts', 'theme-lab.webpack.config.mjs');
const sourceHtml = path.join(projectRoot, 'src', 'char_info_v2_theme_lab', 'index.html');
const outputDir = path.join(projectRoot, 'dist', 'char_info_v2_theme_lab');
const outputHtml = path.join(outputDir, 'index.html');
const action = process.argv[2] ?? 'build';

if (!['build', 'watch'].includes(action)) {
  console.error(`[theme-lab] unknown action: ${action}`);
  process.exit(2);
}
if (!fs.existsSync(webpackCli)) {
  console.error(`[theme-lab] shared Toolchain dependencies are missing: ${webpackCli}`);
  process.exit(1);
}

const args = ['--config', configFile, '--mode', 'development', '--stats', 'errors-warnings'];
if (action === 'watch') args.push('--watch');

const html = fs.readFileSync(sourceHtml, 'utf8').replace(
  '</body>',
  '  <script type="module" src="./index.js"></script>\n</body>',
);
fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputHtml, html);

console.info(`[theme-lab] ${action}: ${projectRoot}`);
console.info(`[theme-lab] preview: ${outputHtml}`);

const child = spawn(process.execPath, [webpackCli, ...args], {
  cwd: toolchainRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    TAVERN_PROJECT_ROOT: projectRoot,
    NODE_PATH: [path.join(toolchainRoot, 'node_modules'), process.env.NODE_PATH].filter(Boolean).join(path.delimiter),
  },
});

child.on('exit', code => {
  process.exitCode = code ?? 1;
});

child.on('error', error => {
  console.error(`[theme-lab] failed to start webpack: ${error.message}`);
  process.exitCode = 1;
});

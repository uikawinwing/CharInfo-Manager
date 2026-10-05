import sharedConfig from '../../Toolchain/eslint.config.mjs';

export default [
  ...sharedConfig,
  {
    files: ['src/**/*.{html,vue,js,ts}'],
    rules: {
      'better-tailwindcss/no-unknown-classes': 'off',
      'better-tailwindcss/no-concatenated-classes': 'off',
    },
  },
  {
    files: ['tests/**/*.{cjs,mjs,ts}'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'import-x/no-nodejs-modules': 'off',
    },
  },
  {
    // DX Lab 的 build / inspect 脚本是 Node-only CLI，必须读写 fs、path、child_process
    // 与 crypto。与上面的 tests override 同理：这是窄范围豁免，不改全局策略。
    files: ['scripts/dx-lab*.mjs'],
    rules: {
      'import-x/no-nodejs-modules': 'off',
    },
  },
];

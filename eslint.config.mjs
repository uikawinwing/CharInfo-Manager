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
];

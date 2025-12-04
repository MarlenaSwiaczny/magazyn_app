// Minimal ESLint flat config (v9+) entrypoint.
// This config avoids using external plugin "extends" so ESLint can run
// without installing additional plugins. You can later enhance it by
// installing plugins and expanding the config.
module.exports = [
  {
    ignores: [
      'node_modules/**',
      'client/build/**',
      'client/node_modules/**',
      'server/node_modules/**',
      'server/generated/**',
      'build/**',
      'public/**',
      '.cache/**'
    ],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } }
    }
  },
  {
    files: ['**/*.js', '**/*.jsx'],
    rules: {
      // warn on console usage except console.error / console.warn
      'no-console': ['warn', { allow: ['error', 'warn'] }]
    }
  }
];

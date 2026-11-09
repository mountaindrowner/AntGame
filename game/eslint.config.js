// Lint: catches mistakes, not style. `npm run lint` (warnings are leftovers worth clearing).
import globals from 'globals';

export default [
  { ignores: ['dist/**', 'dist-gallery/**', 'dist-phone/**', '.guard/**', 'e2e-shots/**', 'node_modules/**'] },
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: { ...globals.browser, ...globals.node } },
    rules: {
      'no-undef': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-redeclare': 'error',
      'no-unsafe-negation': 'error',
      'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }],
      'no-unreachable': 'warn',
      'no-self-assign': 'warn',
      'no-dupe-else-if': 'warn',
      'no-cond-assign': ['warn', 'except-parens'],
      'no-fallthrough': 'warn',
      'no-sparse-arrays': 'warn',
    },
  },
];

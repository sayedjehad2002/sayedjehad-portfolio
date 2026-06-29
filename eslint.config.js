import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

// Flat config (ESLint 9). tsc --noEmit stays the primary type gate; ESLint adds
// React-hooks correctness + dead-code / style checks on top.
export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'src/**/*.test.{ts,tsx}', '*.config.{js,ts}'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: { ...globals.browser },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // react-hooks v7 ships the React-Compiler "set-state-in-effect" rule, which
      // fires on legitimate, intentional effects here (typewriter intervals, a
      // transient discovery toast, one-shot touch-capability detection). This app
      // does not use the React Compiler, so the rule is noise; keep rules-of-hooks
      // and exhaustive-deps, which are the ones that catch real bugs.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
);

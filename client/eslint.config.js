import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // US48.12: use the shared `api` client (token, timeout, error envelope) instead of raw fetch.
      'no-restricted-globals': ['warn', { name: 'fetch', message: "Use the `api` client from 'lib/api' instead of fetch." }],
    },
  },
  {
    files: ['src/test/**', '**/__tests__/**', 'e2e/**', 'src/lib/api.ts'],
    rules: { 'no-restricted-globals': 'off' },
  },
])

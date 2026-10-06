import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import i18next from 'eslint-plugin-i18next'
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
    // US48.13: participant screens must use i18n keys, not hard-coded text.
    files: [
      'src/pages/JoinWorkshop.tsx',
      'src/pages/ParticipantDashboard.tsx',
      'src/pages/ParticipantMatrix.tsx',
      'src/pages/ScoringPhase.tsx',
      'src/components/UseCaseForm.tsx',
      'src/components/UseCaseCanvas.tsx',
      'src/components/ScoringCard.tsx',
      'src/components/usecases/UseCaseDetailModal.tsx',
      'src/components/prioritization/PrioritizationScale.tsx',
      'src/components/participant/**',
      'src/components/polls/PollResponder.tsx',
      'src/components/polls/ReactionBar.tsx',
      'src/components/gamification/**',
    ],
    plugins: { i18next },
    rules: {
      'i18next/no-literal-string': ['error', { mode: 'jsx-text-only', 'jsx-attributes': { include: ['label', 'title', 'placeholder', 'aria-label', 'alt', 'message', 'confirmText', 'cancelText'] } }],
    },
  },
  {
    files: ['src/test/**', '**/__tests__/**', 'e2e/**', 'src/lib/api.ts'],
    rules: { 'no-restricted-globals': 'off' },
  },
])

import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import perfectionist from 'eslint-plugin-perfectionist'
import reactHooks from 'eslint-plugin-react-hooks'
import storybook from 'eslint-plugin-storybook'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores(['**/node_modules/', '**/dist/', '**/storybook-static/', '.claude/worktrees/']),
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
  },
  {
    extends: [js.configs.recommended, tseslint.configs.recommended, perfectionist.configs['recommended-natural']],
    files: ['**/*.{js,ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
    },
    name: 'fansite/javascript-typescript',
    rules: {
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/consistent-type-imports': 'error',
      eqeqeq: 'error',
    },
  },
  {
    files: ['**/*.config.{js,ts}', '**/.storybook/main.ts'],
    languageOptions: {
      globals: globals.node,
    },
    name: 'fansite/node',
  },
  {
    extends: [reactHooks.configs.flat['recommended-latest']],
    files: ['**/*.tsx'],
    name: 'fansite/react',
  },
  storybook.configs['flat/recommended'],
  // Last, so Prettier owns formatting.
  prettier,
])

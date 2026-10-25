import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import baselineJs from 'eslint-plugin-baseline-js'
import perfectionist from 'eslint-plugin-perfectionist'
import reactHooks from 'eslint-plugin-react-hooks'
import storybook from 'eslint-plugin-storybook'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// Code that runs in a visitor's browser: the design system, and the site. Next.js server components are included on
// purpose: until the site has a way to tell client files apart, we check too much rather than too little.
const browserFiles = ['packages/design-system/**/*.{ts,tsx}', 'apps/site/src/**/*.{ts,tsx}']
// Code that only runs on the server, during the build or in a test. Add a file here when it never reaches the browser.
const notBrowserFiles = [
  '**/*.config.{js,ts}',
  '**/*.test.{ts,tsx}',
  '**/.storybook/main.ts',
  'apps/site/src/{admin,database,env,headlines,instrumentation,instrumentation-node,proxy,sources}.ts',
  'apps/site/src/app/robots.ts',
]

export default defineConfig([
  globalIgnores([
    '**/node_modules/',
    '**/dist/',
    '**/storybook-static/',
    '**/.next/',
    '**/next-env.d.ts',
    '.claude/worktrees/',
  ]),
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
    files: [
      '**/*.config.{js,ts}',
      '**/.storybook/main.ts',
      '.claude/hooks/*.js',
      'apps/design-system-mcp/scripts/*.js',
      'apps/site/scripts/*.js',
      'baseline.test.js',
      'scripts/*.js',
    ],
    languageOptions: {
      globals: globals.node,
    },
    name: 'fansite/node',
  },
  {
    // Only Baseline widely available features (see packages/design-system/README.md). The type-aware preset also
    // checks methods on objects, such as screen.orientation.lock(), and needs the project's types for that.
    files: browserFiles,
    ignores: notBrowserFiles,
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    name: 'fansite/baseline',
    plugins: { 'baseline-js': baselineJs },
    rules: {
      'baseline-js/use-baseline': [
        'error',
        {
          available: 'widely',
          includeJsBuiltins: { preset: 'type-aware' },
          includeWebApis: { preset: 'type-aware' },
        },
      ],
    },
  },
  {
    // The order of the columns is the order of the table, and it reads best grouped by what a column is for.
    files: ['packages/db/src/schema.ts'],
    name: 'fansite/database-schema',
    rules: {
      'perfectionist/sort-objects': 'off',
    },
  },
  {
    // The site's templates hold no HTML, only components from the design system (see docs/beslissingen.md). In JSX a
    // lowercase name is an HTML or SVG element, and a capitalised one a component. This covers every component in the
    // site, so a page can't move its HTML into a component of its own.
    files: ['apps/site/src/**/*.tsx'],
    ignores: ['**/*.test.tsx'],
    name: 'fansite/site-templates',
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          message: 'Use a component from @fansite/design-system instead of an HTML element.',
          selector: 'JSXOpeningElement[name.type="JSXIdentifier"][name.name=/^[a-z]/], JSXNamespacedName',
        },
      ],
    },
  },
  {
    extends: [reactHooks.configs.flat['recommended-latest']],
    files: ['**/*.tsx'],
    name: 'fansite/react',
  },
  storybook.configs['flat/recommended'],
  // Last, so Prettier owns formatting.
  prettier,
  {
    // Prettier wraps code but never comments. We write comments to 120 characters of text, which with the indentation
    // and the comment marker can reach a few more, so this stops at 125. After Prettier because eslint-config-prettier
    // turns max-len off; code lines are Prettier's, so they get a limit that only a runaway line reaches.
    files: ['**/*.{js,ts,tsx}'],
    name: 'fansite/comment-width',
    rules: {
      'max-len': ['error', { code: 1000, comments: 125, ignoreUrls: true }],
    },
  },
])

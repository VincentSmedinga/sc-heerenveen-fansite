// Runs Stylelint and ESLint with the configuration of this repository on code that uses a
// feature that is not Baseline widely available, and checks that both report it. The features
// are far from widely available (Chrome has them, and Safari doesn't or won't), so these tests
// don't start failing when the linters' data moves on.
import { ESLint } from 'eslint'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { test } from 'node:test'
import stylelint from 'stylelint'

const root = import.meta.dirname

const lintCss = async (code) => {
  const { results } = await stylelint.lint({
    code,
    codeFilename: join(root, 'packages/design-system/src/probe.css'),
    configFile: join(root, 'stylelint.config.js'),
  })
  return results[0].warnings.map(({ rule, severity }) => `${severity} ${rule}`)
}

// The probe files below don't exist, so TypeScript's project service gets them as default
// project files, with the compiler options of the design system.
const eslint = new ESLint({
  cwd: root,
  overrideConfig: {
    files: ['packages/design-system/src/probe.ts', 'apps/site/src/probe.ts'],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['packages/design-system/src/probe.ts', 'apps/site/src/probe.ts'],
          defaultProject: 'packages/design-system/tsconfig.json',
        },
      },
    },
  },
})

const lintJs = async (code, file) => {
  const [result] = await eslint.lintText(code, { filePath: join(root, file) })
  return result.messages.map(
    ({ message, ruleId, severity }) => `${severity === 2 ? 'error' : 'warning'} ${ruleId} ${message}`,
  )
}

test('Stylelint reports a CSS property that is not widely available', async () => {
  assert.deepEqual(await lintCss('a {\n  reading-flow: source-order;\n}\n'), ['error plugin/use-baseline'])
})

test('Stylelint accepts that property inside @supports', async () => {
  assert.deepEqual(
    await lintCss('@supports (reading-flow: source-order) {\n  a {\n    reading-flow: source-order;\n  }\n}\n'),
    [],
  )
})

test('Stylelint reports a temporary exception that is no longer needed', async () => {
  assert.deepEqual(
    await lintCss(
      '/* stylelint-disable plugin/use-baseline */\na {\n  color: red;\n}\n/* stylelint-enable plugin/use-baseline */\n',
    ),
    ['error --report-needless-disables'],
  )
})

// Not about Baseline, but the same way to show that a rule catches what it is for: 100vw
// includes the scrollbar.
test('Stylelint reports a width of 100vw, also inside calc(), as a maximum and as svw, lvw or dvw', async () => {
  for (const declaration of [
    'inline-size: 100vw',
    'max-inline-size: 100vw',
    'min-inline-size: 100vw',
    'inline-size: calc(100vw - 2rem)',
    'inline-size: 100svw',
    'max-inline-size: 100dvw',
  ]) {
    assert.deepEqual(
      await lintCss(`a {\n  ${declaration};\n}\n`),
      ['error declaration-property-value-disallowed-list'],
      declaration,
    )
  }
})

test('Stylelint accepts a width of 100%, and 100vw in a property that is not a width', async () => {
  assert.deepEqual(await lintCss('a {\n  inline-size: 100%;\n  min-block-size: 100vh;\n}\n'), [])
})

test('ESLint reports a method that is not widely available in the design system', async () => {
  const messages = await lintJs(
    "export const a = screen.orientation.lock('portrait')\n",
    'packages/design-system/src/probe.ts',
  )
  assert.equal(messages.length, 1)
  assert.match(
    messages[0],
    /^error baseline-js\/use-baseline 'lock' on ScreenOrientation is not Baseline Widely available/,
  )
})

test('ESLint reports an API that is not widely available in the site', async () => {
  const messages = await lintJs('export const a = navigator.bluetooth\n', 'apps/site/src/probe.ts')
  assert.equal(messages.length, 1)
  assert.match(
    messages[0],
    /^error baseline-js\/use-baseline 'bluetooth' on navigator is not Baseline Widely available/,
  )
})

test('ESLint leaves code alone that never reaches the browser', async () => {
  for (const file of ['apps/site/src/proxy.ts', 'packages/design-system/vite.config.ts']) {
    assert.deepEqual(await lintJs('export const a = navigator.bluetooth\n', file), [], file)
  }
})

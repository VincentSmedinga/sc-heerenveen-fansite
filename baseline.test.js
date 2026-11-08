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

// The container sets the vertical space (utilities/flow.css): a component sets no vertical
// margin of its own, except 0.
test('Stylelint reports a vertical margin in the CSS of a component, and accepts 0 and an inline margin', async () => {
  for (const declaration of [
    'margin-block-end: var(--hf-space-m)',
    'margin-block-start: var(--hf-space-s)',
    'margin-block: 0 var(--hf-space-l)',
    'margin: 0 0 var(--hf-space-s)',
    'margin: calc(-1 * var(--hf-space-xs))',
  ]) {
    assert.deepEqual(
      await lintCss(`a {\n  ${declaration};\n}\n`),
      ['error declaration-property-value-allowed-list'],
      declaration,
    )
  }
  assert.deepEqual(await lintCss('a {\n  margin: 0;\n  margin-block: 0;\n  margin-inline: auto;\n}\n'), [])
})

test('Stylelint accepts a vertical margin in the flow and in the space utilities, with their file names', async () => {
  for (const file of ['utilities/flow.css', 'utilities/space-end.css']) {
    const { results } = await stylelint.lint({
      code: 'a {\n  margin-block-end: var(--hf-space-m);\n}\n',
      codeFilename: join(root, 'packages/design-system/src', file),
      configFile: join(root, 'stylelint.config.js'),
    })
    assert.deepEqual(results[0].warnings, [], file)
  }
})

test('ESLint reports a method that is not widely available in the design system', async () => {
  const messages = await lintJs(
    "export const a = screen.orientation.lock('portrait')\n",
    'packages/design-system/src/probe.ts',
  )
  assert.equal(messages.length, 1)
  assert.match(messages[0], /^error baseline-js\/use-baseline .*'lock'.*ScreenOrientation.*Baseline Widely available/)
})

test('ESLint reports an API that is not widely available in the site', async () => {
  const messages = await lintJs('export const a = navigator.bluetooth\n', 'apps/site/src/probe.ts')
  assert.equal(messages.length, 1)
  assert.match(messages[0], /^error baseline-js\/use-baseline .*'navigator\.bluetooth'.*Baseline Widely available/)
})

test('ESLint leaves code alone that never reaches the browser', async () => {
  for (const file of ['apps/site/src/proxy.ts', 'packages/design-system/vite.config.ts']) {
    assert.deepEqual(await lintJs('export const a = navigator.bluetooth\n', file), [], file)
  }
})

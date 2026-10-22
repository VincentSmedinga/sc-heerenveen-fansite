// Runs ESLint with the configuration of this repository on templates of the site, and checks that it reports an HTML
// element and accepts the components of the design system (see docs/beslissingen.md).
import { ESLint } from 'eslint'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { test } from 'node:test'

const root = import.meta.dirname
const eslint = new ESLint({ cwd: root })

const lint = async (code, file) => {
  const [result] = await eslint.lintText(code, { filePath: join(root, file) })
  return result.messages.map(({ message, ruleId }) => `${ruleId} ${message}`)
}

const html = 'export default function Page() {\n  return <main><h1>Onze bronnen</h1></main>\n}\n'

test('ESLint reports every HTML element in a template of the site', async () => {
  for (const file of [
    'apps/site/src/app/layout.tsx',
    'apps/site/src/app/page.tsx',
    'apps/site/src/app/not-found.tsx',
  ]) {
    assert.deepEqual(
      await lint(html, file),
      Array(2).fill('no-restricted-syntax Use a component from @fansite/design-system instead of an HTML element.'),
      file,
    )
  }
})

test('ESLint reports an HTML element in another component of the site', async () => {
  const messages = await lint('export const Item = () => <li>Testkrant</li>\n', 'apps/site/src/SiteNavigation.tsx')
  assert.equal(messages.length, 1)
  assert.match(messages[0], /^no-restricted-syntax /)
})

test('ESLint accepts the components of the design system, with a dot and in a fragment', async () => {
  const code = [
    "import { Heading, List } from '@fansite/design-system'",
    "import { Fragment } from 'react'",
    '',
    'export default function Page() {',
    '  return (',
    '    <>',
    '      <Heading level={1}>Onze bronnen</Heading>',
    '      <Fragment>',
    '        <List>',
    '          <List.Item>Testkrant</List.Item>',
    '        </List>',
    '      </Fragment>',
    '    </>',
    '  )',
    '}',
    '',
  ].join('\n')

  assert.deepEqual(await lint(code, 'apps/site/src/app/page.tsx'), [])
})

test('ESLint leaves HTML alone outside the site', async () => {
  assert.deepEqual(await lint(html, 'packages/design-system/src/docs/ExamplePage.tsx'), [])
})

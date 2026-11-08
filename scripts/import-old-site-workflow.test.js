// Checks the workflow that reads the match data of the old fansite on acceptance
// (.github/workflows/import-old-site.yml). It is read as text, like the other workflows, to
// keep the rules that make it safe: it starts by hand without input, takes the same group,
// secrets and SSH set-up as the other imports, and pins every action.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const read = (name) => readFileSync(new URL(`../.github/workflows/${name}`, import.meta.url), 'utf8')
const workflow = read('import-old-site.yml')
const seasons = read('import-seasons.yml')

/** The text of one step, from its `- ` line to the next step or the end of the file. */
function step(text, name) {
  const start = text.search(new RegExp(`^ {6}- (?:id: \\w+\\n {8})?name: ${name}$`, 'mu'))

  assert.notEqual(start, -1, `the step ${name} is missing`)

  const rest = text.slice(start + 1)
  const end = rest.search(/^ {6}(?:# |- )/mu)

  return end === -1 ? rest : rest.slice(0, end)
}

test('the workflow is named Import old site and starts by hand, without input', () => {
  assert.match(workflow, /^name: Import old site$/mu)
  assert.match(workflow, /\non:\n {2}workflow_dispatch:\n\npermissions:/)
  assert.doesNotMatch(workflow, /inputs/)
})

test('the workflow has the least permissions, the group of the deploy and 30 minutes', () => {
  assert.match(workflow, /\npermissions:\n {2}contents: read\n/)
  assert.match(workflow, /\nconcurrency:\n {2}cancel-in-progress: false\n {2}group: acceptance\n/)
  assert.match(workflow, /\n {4}timeout-minutes: 30\n/)
  assert.match(workflow, /\n {4}environment:\n {6}name: acceptatie\n/)
})

test('the workflow checks the secrets and sets up SSH as the import of the seasons does', () => {
  assert.equal(step(workflow, 'Check the secrets'), step(seasons, 'Check the secrets'))
  assert.equal(step(workflow, 'Set up SSH'), step(seasons, 'Set up SSH'))
  // Without the secrets it skips the import with a notice and stays green.
  assert.match(step(workflow, 'Check the secrets'), /::notice title=Import skipped::/)
  assert.doesNotMatch(workflow, /exit 1/)
})

test('the workflow runs the command of the old site on the host, with the path as one word', () => {
  const run = step(workflow, 'Import the old site on the host')

  assert.match(run, /if: steps\.secrets\.outputs\.ready == 'true'/)
  assert.match(run, /\/opt\/alt\/alt-nodejs24\/root\/usr\/bin\/node --env-file=\\"\\\$HOME\/fansite-acceptatie\.env\\"/)
  assert.match(run, /\$\(printf '%q' "\$DEPLOY_PATH"\)\/apps\/importer\/import\.mjs --old-site"\n$/)
  // Nothing typed by a person reaches the command.
  assert.doesNotMatch(workflow, /\$\{\{ inputs\./)
})

test('every action of the workflow is pinned on a full commit, with its version as a comment', () => {
  for (const line of workflow.split('\n').filter((line) => line.includes('uses:'))) {
    assert.match(line, /uses: [\w./-]+@[0-9a-f]{40} # v\d/)
  }
})

// Tests the rules of `scripts/ci-changes.js` with lists of files, and that the workflow uses
// them the way the decision says: an `if` on two steps, and no `paths` on the workflow.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import { decide, forceLabel, parseNames } from './ci-changes.js'

const pullRequest = (files, forced = false) => decide({ event: 'pull_request', files, forced })

test('skips the checks of the site for a pull request that only changes documentation', () => {
  assert.deepEqual(pullRequest(['docs/beslissingen.md', 'docs/bronnen.md']), {
    reason: 'Controles van de site overgeslagen: alleen docs/ gewijzigd',
    site: false,
  })
})

test('skips them for the files in the root that are text, and says which', () => {
  assert.deepEqual(pullRequest(['AGENTS.md', 'docs/a.md', 'CONTRIBUTING.md', 'README.md']), {
    reason: 'Controles van de site overgeslagen: alleen AGENTS.md, docs/, CONTRIBUTING.md en README.md gewijzigd',
    site: false,
  })
})

test('skips them for the tooling of agents', () => {
  assert.equal(pullRequest(['.claude/skills/write-dutch/SKILL.md', '.claude/hooks/reviewer-bash.js']).site, false)
})

test('skips them for the importer, and for the importer with its documentation', () => {
  assert.equal(pullRequest(['apps/importer/src/read-feed.ts', 'apps/importer/src/read-feed.test.ts']).site, false)
  assert.equal(pullRequest(['apps/importer/src/import.ts', 'docs/bronnen.md']).site, false)
})

test('skips them for the MCP server of the design system', () => {
  assert.equal(pullRequest(['apps/design-system-mcp/src/server.ts']).site, false)
})

test('runs them when one file is not skippable, and names that file', () => {
  assert.deepEqual(pullRequest(['docs/a.md', 'packages/design-system/src/Button.tsx']), {
    reason: 'Controles van de site gedraaid: packages/design-system/src/Button.tsx kan ze raken',
    site: true,
  })
})

for (const file of [
  'apps/site/src/app/page.tsx',
  'packages/design-system/src/tokens.css',
  'packages/db/src/schema.ts',
  'packages/shared/src/env.ts',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'package.json',
  'tsconfig.json',
  'tsconfig.base.json',
  '.github/workflows/ci.yml',
  '.github/workflows/storybook.yml',
  'apps/site/playwright.config.ts',
  'CHANGELOG.md',
  'scripts/ci-changes.js',
  'something-new.txt',
  '.env.example',
]) {
  test(`runs them for ${file}`, () => {
    assert.equal(pullRequest([file]).site, true)
    assert.equal(pullRequest(['docs/a.md', file]).site, true)
  })
}

test('runs them for a package.json or a tsconfig inside a skippable folder', () => {
  for (const file of [
    'apps/importer/package.json',
    'apps/importer/tsconfig.json',
    'apps/design-system-mcp/package.json',
    'apps/design-system-mcp/tsconfig.build.json',
    'docs/package.json',
  ]) {
    assert.equal(pullRequest([file]).site, true, file)
  }
})

test('does not take a look-alike for a skippable folder', () => {
  for (const file of ['docs-extra/a.md', 'apps/importer-two/a.ts', 'README.md.bak', 'apps/site/README.md', 'docs']) {
    assert.equal(pullRequest([file]).site, true, file)
  }
})

test('runs them for a path it does not trust', () => {
  for (const file of ['/etc/passwd', 'docs/../apps/site/src/a.ts', 'docs\\a.md']) {
    assert.equal(pullRequest([file]).site, true, file)
  }
})

test('runs them when the list is empty or could not be found', () => {
  assert.equal(pullRequest([]).site, true)
  assert.equal(pullRequest(null).site, true)
  assert.equal(pullRequest(undefined).site, true)
})

test('runs them when the pull request has the label, even for documentation only', () => {
  assert.deepEqual(pullRequest(['docs/a.md'], true), {
    reason: `Controles van de site gedraaid: de pull request heeft het label "${forceLabel}"`,
    site: true,
  })
})

test('runs them for a push to main and a manual run, whatever the files are', () => {
  for (const event of ['push', 'workflow_dispatch', 'schedule', undefined]) {
    assert.equal(decide({ event, files: ['docs/a.md'] }).site, true, String(event))
    assert.equal(decide({ event, files: [] }).site, true, String(event))
  }
})

test('parseNames splits on NUL, so names with spaces and quotes stay whole', () => {
  assert.deepEqual(parseNames('docs/a b.md\0docs/"c".md\0'), ['docs/a b.md', 'docs/"c".md'])
  assert.deepEqual(parseNames(''), [])
})

test('the workflow gives only the two checks of the site an if, and has no paths filter', () => {
  const workflow = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8')
  const steps = workflow.split(/^ {6}- /m).slice(1)
  const guarded = steps.filter((step) => step.includes("steps.changes.outputs.site != 'false'"))

  assert.deepEqual(
    guarded.map((step) => /name: (.+)/.exec(step)?.[1]),
    ['Check the site the way the host runs it', 'Check accessibility'],
  )
  assert.ok(steps.some((step) => step.includes('id: changes') && step.includes('scripts/ci-changes.js')))
  // A required check that never reports blocks the merge. A skipped step doesn't.
  assert.doesNotMatch(workflow, /^ {2,4}paths(-ignore)?:/m)
})

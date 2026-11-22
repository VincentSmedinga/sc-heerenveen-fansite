// Tests the rules of `scripts/ci-changes.js` with lists of files, and that the workflow uses
// them the way the decision says: an `if` on two steps, and no `paths` on the workflow.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import {
  decide,
  decideRun,
  decideSafely,
  decideStories,
  decideTested,
  forceLabel,
  gateCheckName,
  parseNames,
} from './ci-changes.js'

const pullRequest = (files, forced = false) => decide({ event: 'pull_request', files, forced })
const storiesFor = (files, forced = false) => decideStories({ event: 'pull_request', files, forced })

test('skips the checks of the site for a pull request that only changes documentation', () => {
  assert.deepEqual(pullRequest(['docs/beslissingen/werkwijze.md', 'docs/bronnen.md']), {
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

test('runs the check of the stories when the design system changes, and says which file', () => {
  assert.deepEqual(storiesFor(['docs/a.md', 'packages/design-system/src/Button.stories.tsx']), {
    reason: 'Controle van de stories gedraaid: packages/design-system/src/Button.stories.tsx kan ze raken',
    stories: true,
  })
})

test('runs it when the versions of the tools change, or the step itself', () => {
  for (const file of ['pnpm-lock.yaml', 'pnpm-workspace.yaml', '.github/workflows/ci.yml']) {
    assert.equal(storiesFor([file]).stories, true, file)
  }
})

test('skips it for a change that cannot touch a story', () => {
  assert.deepEqual(storiesFor(['apps/site/src/app/page.tsx', 'docs/a.md', 'apps/importer/src/import.ts']), {
    reason: 'Controle van de stories overgeslagen: de bestanden raken ze niet',
    stories: false,
  })
})

test('does not take a look-alike for the design system', () => {
  for (const file of ['packages/design-system-extra/a.ts', 'packages/design-systems/a.ts', 'packages/design-system']) {
    assert.equal(storiesFor([file]).stories, false, file)
  }
})

test('runs it for a path it does not trust, an empty list, the label and any other event', () => {
  for (const file of ['/etc/passwd', 'docs/../packages/design-system/a.ts', 'docs\\a.md']) {
    assert.equal(storiesFor([file]).stories, true, file)
  }

  assert.equal(storiesFor([]).stories, true)
  assert.equal(storiesFor(null).stories, true)
  assert.equal(storiesFor(['docs/a.md'], true).stories, true)

  for (const event of ['push', 'workflow_dispatch', 'schedule', undefined]) {
    assert.equal(decideStories({ event, files: ['docs/a.md'] }).stories, true, String(event))
  }
})

/** Gives the jobs of ci.yml by their id, each as the text of the job. */
function workflowJobs() {
  const workflow = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8')
  const jobs = Object.fromEntries(
    workflow
      .slice(workflow.indexOf('\njobs:\n'))
      .split(/^ {2}([a-z0-9-]+):$/m)
      .slice(1)
      .reduce((pairs, part, index, parts) => (index % 2 === 0 ? [...pairs, [part, parts[index + 1]]] : pairs), []),
  )

  return { jobs, workflow }
}

test('the workflow switches the checks with the outputs of ci-changes.js, and has no paths filter', () => {
  const { jobs, workflow } = workflowJobs()
  const site = "needs.changes.outputs.site != 'false'"
  const switched = (output) =>
    Object.entries(jobs)
      .filter(([, job]) => new RegExp(`^ {4}if: needs\\.changes\\.outputs\\.${output} != 'false'$`, 'm').test(job))
      .map(([id]) => id)

  assert.deepEqual(switched('site'), ['site'])
  assert.deepEqual(switched('stories'), ['stories'])
  assert.match(jobs.changes, /run: node scripts\/ci-changes\.js/)
  assert.match(jobs.changes, /site: \$\{\{ steps\.changes\.outputs\.site \}\}/)
  assert.match(jobs.changes, /stories: \$\{\{ steps\.changes\.outputs\.stories \}\}/)

  // The build waits for `tested`; the two steps that hand over the folder wait for `site`.
  assert.equal(jobs.build.split(site).length - 1, 2)

  // Lint, the tests and the build are skipped only by `tested`, set only for a push to main.
  const tested = (id) => new RegExp(`^ {4}if: needs\\.changes\\.outputs\\.tested != 'true'$`, 'm').test(jobs[id])

  for (const id of ['lint', 'test', 'build']) {
    assert.ok(tested(id), id)
    assert.match(jobs[id], /^ {4}needs: (changes|\[changes\])$/m, id)
  }

  assert.match(jobs.changes, /tested: \$\{\{ steps\.changes\.outputs\.tested \}\}/)

  // The job that asks GitHub gets the least rights it needs, and no other job sets any.
  assert.match(jobs.changes, /^ {4}permissions:\n {6}checks: read\n {6}contents: read\n {6}pull-requests: read$/m)

  for (const id of Object.keys(jobs).filter((job) => job !== 'changes')) {
    assert.doesNotMatch(jobs[id], /^ {4}permissions:/m, id)
  }

  assert.match(workflow, /^permissions:\n {2}contents: read$/m)

  assert.match(jobs.stories, /run: pnpm test:stories/)
  // A required check that never reports blocks the merge. A skipped job doesn't.
  assert.doesNotMatch(workflow, /^ {2,4}paths(-ignore)?:/m)
})

test('the last job has the name the rules for main require and waits for every other job', () => {
  const { jobs } = workflowJobs()
  const others = Object.keys(jobs).filter((id) => id !== 'check')

  assert.match(jobs.check, /^ {4}name: Lint, typecheck, test and build$/m)
  assert.match(jobs.check, /^ {4}if: always\(\)$/m)
  assert.match(jobs.check, /run: node scripts\/ci-gate\.js/)

  // A job that check doesn't wait for could fail without turning the required check red.
  const needs = /^ {4}needs: \[(.+)\]$/m.exec(jobs.check)?.[1].split(', ')

  assert.deepEqual([...(needs ?? [])].sort(), [...others].sort())

  // No other job may take the name of the check, or the rules would take its result too.
  for (const id of others) {
    assert.doesNotMatch(jobs[id], /^ {4}name: Lint, typecheck, test and build$/m, id)
  }
})

test('the e2e tests run in parts that together hold every test, and each part is checked', () => {
  const { jobs } = workflowJobs()
  const parts = [...jobs.site.matchAll(/^ {10}- args: (.+)\n {12}part: (.+?)(?:\n {12}smoke: true)?$/gm)].map(
    ([, args, part]) => ({
      args,
      part,
    }),
  )
  const shards = parts.filter(({ args }) => args.includes('--shard='))
  const total = Number(/--shard=1\/(\d+)/.exec(shards[0]?.args ?? '')?.[1])

  // The parts 1/n to n/n of the project chromium, each once, and the writing project alone.
  // A project with `dependencies` can't be sharded: Playwright keeps all its tests in part 1.
  assert.deepEqual(
    shards.map(({ args }) => args),
    Array.from({ length: total }, (_, index) => `--project=chromium --shard=${index + 1}/${total}`),
  )
  assert.deepEqual(
    parts.filter(({ args }) => !args.includes('--shard=')),
    [{ args: '--project=chromium-writing --no-deps', part: 'writing and the host' }],
  )
  assert.match(jobs.site, /smoke: true/)
  assert.doesNotMatch(jobs.site, /\s--retries/)
  // A part that ran nothing is green in Playwright. The report must show tests that passed.
  assert.match(jobs.site, /node scripts\/ci-e2e-report\.js "\$PLAYWRIGHT_JSON_OUTPUT_NAME"/)
})

// --- A push to main whose code a pull request already tested ---

const sha = 'a'.repeat(40)
const headSha = 'b'.repeat(40)
const goodCheck = { app: { slug: 'github-actions' }, conclusion: 'success', name: gateCheckName, status: 'completed' }
const merged = {
  base: { ref: 'main' },
  head: { sha: headSha },
  merge_commit_sha: sha,
  merged_at: '2026-11-22T10:00:00Z',
  number: 1564,
}
const tree = 't'.repeat(40)
const pushed = (changes = {}) => ({
  checkRuns: [goodCheck],
  event: 'push',
  headTree: tree,
  mainTree: tree,
  pullRequests: [merged],
  sha,
  ...changes,
})

test('skips every check for a push whose tree equals the tree of a green pull request, and says why', () => {
  const result = decideTested(pushed())

  assert.equal(result.tested, true)
  assert.match(result.reason, /pull request 1564/)
  assert.equal(result.reason.split(tree).length - 1, 2)
})

test('runs everything when the trees differ', () => {
  const result = decideTested(pushed({ mainTree: 'c'.repeat(40) }))

  assert.equal(result.tested, false)
  assert.match(result.reason, /liep achter/)
})

test('runs everything when the pull request is missing, or there is more than one', () => {
  for (const pullRequests of [null, undefined, 'x', [], [merged, { ...merged, number: 2 }]]) {
    assert.equal(decideTested(pushed({ pullRequests })).tested, false, JSON.stringify(pullRequests))
  }
})

test('runs everything when the pull request is not the merge of this commit into main', () => {
  for (const change of [
    { merge_commit_sha: 'd'.repeat(40) },
    { merge_commit_sha: undefined },
    { base: { ref: 'other' } },
    { base: undefined },
    { merged_at: null },
    { head: {} },
    { head: undefined },
    { number: undefined },
  ]) {
    assert.equal(
      decideTested(pushed({ pullRequests: [{ ...merged, ...change }] })).tested,
      false,
      JSON.stringify(change),
    )
  }

  assert.equal(decideTested(pushed({ sha: undefined })).tested, false)
  assert.equal(decideTested(pushed({ pullRequests: [null] })).tested, false)
})

test('runs everything when a tree is unknown', () => {
  for (const change of [{ headTree: undefined }, { mainTree: undefined }, { headTree: '' }, { mainTree: null }]) {
    assert.equal(decideTested(pushed(change)).tested, false, JSON.stringify(change))
  }
})

test('runs everything when the check is red, pending, missing or not from GitHub Actions', () => {
  const bad = [
    [{ ...goodCheck, conclusion: 'failure' }],
    [{ ...goodCheck, conclusion: 'cancelled' }],
    [{ ...goodCheck, conclusion: null, status: 'in_progress' }],
    [{ ...goodCheck, conclusion: 'skipped' }],
    [{ ...goodCheck, name: 'Lint' }],
    [{ ...goodCheck, app: { slug: 'someone-else' } }],
    [{ ...goodCheck, app: undefined }],
    [goodCheck, { ...goodCheck, conclusion: 'failure' }],
    [],
    null,
    undefined,
  ]

  for (const checkRuns of bad) {
    assert.equal(decideTested(pushed({ checkRuns })).tested, false, JSON.stringify(checkRuns))
  }
})

test('runs everything for a manual run, a pull request and an unknown event, even with equal trees', () => {
  for (const event of ['workflow_dispatch', 'pull_request', 'schedule', undefined]) {
    assert.equal(decideTested(pushed({ event })).tested, false, String(event))
  }
})

test('decideRun skips the site, the stories and the rest together for a tested push', () => {
  const result = decideRun({ ...pushed(), files: [] })

  assert.deepEqual(
    { ...result, reasons: result.reasons.length },
    { reasons: 1, site: false, stories: false, tested: true },
  )
})

test('decideRun runs everything for a push that was not tested, and for a manual run with equal trees', () => {
  for (const input of [pushed({ mainTree: 'c'.repeat(40) }), pushed({ event: 'workflow_dispatch' })]) {
    const result = decideRun({ ...input, files: [] })

    assert.deepEqual(
      { site: result.site, stories: result.stories, tested: result.tested },
      { site: true, stories: true, tested: false },
    )
  }
})

test('decideRun leaves a pull request to the rules by files, and never sets tested', () => {
  const documentation = decideRun({ ...pushed(), event: 'pull_request', files: ['docs/a.md'] })

  assert.deepEqual(
    { site: documentation.site, stories: documentation.stories, tested: documentation.tested },
    { site: false, stories: false, tested: false },
  )

  const labelled = decideRun({ event: 'pull_request', files: ['docs/a.md'], forced: true })

  assert.equal(labelled.site, true)
  assert.equal(labelled.tested, false)
})

test('decideSafely runs everything when gathering fails, and says why', async () => {
  for (const event of ['push', 'pull_request']) {
    const result = await decideSafely(async () => {
      throw new Error('GitHub antwoordde 502')
    })

    assert.deepEqual(
      { site: result.site, stories: result.stories, tested: result.tested },
      { site: true, stories: true, tested: false },
      event,
    )
    assert.match(result.reasons[0], /GitHub antwoordde 502/)
  }

  // Also an error that is not thrown inside an async function.
  const sync = await decideSafely(() => {
    throw new Error('git faalde')
  })

  assert.equal(sync.tested, false)
  assert.equal(sync.site, true)
})

test('decideSafely gives the decision for what gathering returns', async () => {
  assert.equal((await decideSafely(async () => ({ ...pushed(), files: [] }))).tested, true)
  assert.equal((await decideSafely(async () => ({ event: 'pull_request', files: ['docs/a.md'] }))).site, false)
})

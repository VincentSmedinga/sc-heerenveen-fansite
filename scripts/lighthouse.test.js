// Tests the daily Lighthouse check (scripts/lighthouse.js): the arguments of the CLI, what is
// taken from a report, which run is the middle one, which checks fail the run and what the
// summary says. The workflow and the configuration file are read as text, to keep the rules
// that make them safe.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import {
  cliArguments,
  extraHeaders,
  fixedProblems,
  historyLength,
  measureWithRetries,
  medianRun,
  metricsOf,
  recentRuns,
  rowsOf,
  sizeLimit,
  summaryOf,
  timingProblems,
} from './lighthouse.js'

const config = JSON.parse(readFileSync(new URL('../.github/lighthouse.json', import.meta.url), 'utf8'))
const workflow = readFileSync(new URL('../.github/workflows/lighthouse.yml', import.meta.url), 'utf8')

const address = 'https://acc.sc.heerenveen.org'

/** A report with what metricsOf reads, and numbers that can be changed per test. */
const report = ({ cls = 0.01, lcp = 800, performance = 1, requests = [], ...sizes } = {}) => ({
  audits: {
    'cumulative-layout-shift': { numericValue: cls },
    'largest-contentful-paint': { numericValue: lcp },
    'network-requests': { details: { items: requests.map((url) => ({ url })) } },
    'resource-summary': {
      details: {
        items: [
          { resourceType: 'script', transferSize: (sizes.javascript ?? 152) * 1024 },
          { resourceType: 'font', transferSize: (sizes.fonts ?? 218) * 1024 },
        ],
      },
    },
    'server-response-time': { numericValue: 47 },
    'total-blocking-time': { numericValue: 3 },
    'total-byte-weight': { numericValue: (sizes.weight ?? 415) * 1024 },
  },
  categories: {
    accessibility: { score: sizes.accessibility ?? 1 },
    'best-practices': { score: sizes.bestPractices ?? 1 },
    performance: { score: performance },
    seo: { score: 0.66 },
  },
})

const row = (overrides = {}) => ({
  cls: 0.01,
  device: 'mobile',
  fonts: 218.5,
  javascript: 151.8,
  lcp: 820,
  name: 'Homepage',
  path: '/',
  scores: { accessibility: 100, bestPractices: 100, performance: 100, seo: 66 },
  tbt: 1,
  thirdParty: 0,
  ttfb: 47,
  weight: 415,
  ...overrides,
})

test('the CLI gets an exact version, our address, the header that keeps the visit out of the numbers, and no shell', () => {
  const args = cliArguments({
    address,
    chrome: '--headless=new',
    device: 'mobile',
    outputPath: 'uit/p1.json',
    path: '/nieuws?pagina=2',
    version: '13.6.0',
  })

  assert.deepEqual(args.slice(0, 3), ['--yes', 'lighthouse@13.6.0', `${address}/nieuws?pagina=2`])
  assert.ok(args.includes('--output-path=uit/p1.json'))
  assert.ok(args.includes('--extra-headers={"DNT":"1"}'))
  assert.equal(
    args.some((arg) => arg.startsWith('--preset')),
    false,
  )
  assert.deepEqual(extraHeaders, { DNT: '1' })
})

test('the desktop run uses the desktop preset of Lighthouse', () => {
  const args = cliArguments({
    address,
    chrome: '',
    device: 'desktop',
    outputPath: 'x.json',
    path: '/',
    version: '13.6.0',
  })

  assert.ok(args.includes('--preset=desktop'))
})

test('the metrics of a report are the scores, the timing, and the sizes in KiB', () => {
  const metrics = metricsOf(report({ cls: 0.0234, lcp: 819.6 }), address)

  assert.deepEqual(metrics.scores, { accessibility: 100, bestPractices: 100, performance: 100, seo: 66 })
  assert.equal(metrics.lcp, 820)
  assert.equal(metrics.cls, 0.023)
  assert.equal(metrics.tbt, 3)
  assert.equal(metrics.ttfb, 47)
  assert.equal(metrics.weight, 415)
  assert.equal(metrics.javascript, 152)
  assert.equal(metrics.fonts, 218)
})

test('only a request to another host counts as a request to a third party', () => {
  const requests = [
    `${address}/`,
    `${address}/_next/static/chunks/a.js`,
    'data:image/svg+xml;base64,AAAA',
    'https://fonts.googleapis.com/css',
    'https://www.google-analytics.com/collect',
    'https://acc.sc.heerenveen.org.example.com/x',
    'not a url',
  ]

  assert.equal(metricsOf(report({ requests }), address).thirdParty, 3)
  assert.equal(metricsOf(report({ requests: [`${address}/`] }), address).thirdParty, 0)
})

test('the middle run is the middle performance score, and with equal scores the middle LCP', () => {
  const runs = [
    { lcp: 900, scores: { performance: 100 } },
    { lcp: 700, scores: { performance: 100 } },
    { lcp: 800, scores: { performance: 100 } },
  ]

  assert.equal(medianRun(runs).lcp, 800)
  assert.equal(
    medianRun([
      { lcp: 500, scores: { performance: 100 } },
      { lcp: 900, scores: { performance: 97 } },
      { lcp: 700, scores: { performance: 99 } },
    ]).lcp,
    700,
  )
})

test('a page is measured by the middle of its three runs, on both devices', () => {
  const reports = {
    'p1-desktop-1.json': report({ lcp: 300 }),
    'p1-desktop-2.json': report({ lcp: 200 }),
    'p1-desktop-3.json': report({ lcp: 250 }),
    'p1-mobile-1.json': report({ lcp: 900 }),
    'p1-mobile-2.json': report({ lcp: 700 }),
    'p1-mobile-3.json': report({ lcp: 800 }),
  }
  const rows = rowsOf({ address, pages: [{ name: 'Homepage', path: '/' }], runsPerPage: 3 }, (name) => reports[name])

  assert.deepEqual(
    rows.map(({ device, lcp, name }) => [name, device, lcp]),
    [
      ['Homepage', 'mobile', 800],
      ['Homepage', 'desktop', 250],
    ],
  )
})

test('a size may be 5% over the measurement of #798, rounded up to a tenth', () => {
  assert.equal(sizeLimit(415, 5), 435.8)
  assert.equal(sizeLimit(151.8, 5), 159.4)
})

test('the measurement of #798 passes the fixed checks', () => {
  assert.deepEqual(fixedProblems(row(), config.fixed), [])
})

test('a page that gets heavier than the limit fails, and one just inside it does not', () => {
  assert.deepEqual(fixedProblems(row({ weight: 435.8 }), config.fixed), [])
  assert.match(
    fixedProblems(row({ weight: 436 }), config.fixed)[0],
    /Homepage \(mobile\): gewicht 436 KiB, maximaal 435\.8 KiB/,
  )
  assert.match(fixedProblems(row({ javascript: 170 }), config.fixed)[0], /JavaScript 170 KiB/)
  assert.match(fixedProblems(row({ fonts: 260 }), config.fixed)[0], /lettertypes 260 KiB/)
})

test('a request to a third party, or a score under 100 for accessibility or best practices, fails', () => {
  const scores = (accessibility, bestPractices) => ({ accessibility, bestPractices, performance: 100, seo: 66 })

  assert.match(fixedProblems(row({ thirdParty: 1 }), config.fixed)[0], /1 verzoeken naar derden, maximaal 0/)
  assert.match(fixedProblems(row({ scores: scores(99, 100) }), config.fixed)[0], /toegankelijkheid 99/)
  assert.match(fixedProblems(row({ scores: scores(100, 96) }), config.fixed)[0], /best practices 96/)
})

test('the SEO score and the performance score are not fixed checks', () => {
  const scores = { accessibility: 100, bestPractices: 100, performance: 60, seo: 30 }

  assert.deepEqual(fixedProblems(row({ lcp: 9000, scores }), config.fixed), [])
})

test('a page without a baseline fails, so a new page cannot slip in unchecked', () => {
  assert.match(fixedProblems(row({ path: '/nieuw' }), config.fixed)[0], /geen basiswaarde/)
})

test('the checks of time report a slow page and say which budget it passed', () => {
  assert.deepEqual(timingProblems(row(), config.timing), [])
  assert.match(timingProblems(row({ lcp: 2500 }), config.timing)[0], /LCP 2500 ms, maximaal 1100 ms/)
  assert.match(timingProblems(row({ cls: 0.2 }), config.timing)[0], /CLS 0.2, maximaal 0.1/)
  assert.match(
    timingProblems(
      row({ scores: { accessibility: 100, bestPractices: 100, performance: 80, seo: 66 } }),
      config.timing,
    )[0],
    /prestaties 80/,
  )
  // A desktop page is held to the desktop budgets.
  assert.match(timingProblems(row({ device: 'desktop', lcp: 500 }), config.timing)[0], /maximaal 400 ms/)
})

test('the summary shows each page, the earlier runs beside it, and what fails or is only reported', () => {
  const earlier = (date, performance) => ({ date, rows: [row({ lcp: 900, scores: { ...row().scores, performance } })] })
  const text = summaryOf({
    address,
    fixedFailures: ['Homepage (mobile): gewicht 500 KiB, maximaal 435.8 KiB'],
    history: [earlier('2026-11-08T05:20:00Z', 99), earlier('2026-11-10T05:20:00Z', 100)],
    metrics: { date: '2026-11-11T05:20:00Z', rows: [row()] },
    timing: config.timing,
    timingFailures: ['Homepage (mobile): LCP 2500 ms, maximaal 1100 ms'],
  })

  assert.match(
    text,
    /\| Homepage \| mobiel \| 100 \/ 100 \/ 100 \/ 66 \| 0,82 \| 0,010 \| 1 \| 47 \| 415,0 \| 151,8 \| 218,5 \| 0 \|/,
  )
  assert.match(text, /\| Pagina \| Apparaat \| 2026-11-10 \| 2026-11-08 \|/)
  assert.match(text, /\| Homepage \| mobiel \| 100 \/ 0,90 \| 99 \/ 0,90 \|/)
  assert.match(text, /gewicht 500 KiB/)
  assert.match(text, /melden alleen, tot de eigenaar de budgetten vaststelt op 2026-11-23/)
  assert.match(text, /LCP 2500 ms/)
})

test('the summary shows at most the last seven earlier runs, the newest first', () => {
  const history = Array.from({ length: 10 }, (_, index) => ({
    date: `2026-11-${String(index + 1).padStart(2, '0')}T05:00:00Z`,
    rows: [],
  }))
  const runs = recentRuns(history)

  assert.equal(historyLength, 7)
  assert.equal(runs.length, 7)
  assert.equal(runs[0].date.slice(0, 10), '2026-11-10')
  assert.equal(runs[6].date.slice(0, 10), '2026-11-04')
})

test('the summary of a first run has no table of earlier runs', () => {
  const text = summaryOf({
    address,
    fixedFailures: [],
    history: [],
    metrics: { date: '2026-11-08T05:20:00Z', rows: [row()] },
    timing: config.timing,
    timingFailures: [],
  })

  assert.doesNotMatch(text, /ernaast/)
  assert.match(text, /Geslaagd\./)
})

test('the configuration has the six pages of #798, each with a baseline, and exact settings', () => {
  assert.deepEqual(
    config.pages.map(({ path }) => path),
    ['/', '/nieuws', '/redactie/we-zijn-terug', '/spelers', '/nieuws?pagina=2', '/bronnen'],
  )

  for (const { path } of config.pages) {
    assert.ok(config.fixed.baselineKiB[path], `${path} has no baseline`)
  }

  assert.match(config.cliVersion, /^\d+\.\d+\.\d+$/)
  assert.match(config.address, /^https:\/\/[^/]+$/)
  assert.equal(config.runsPerPage, 3)
  assert.equal(config.timing.enforce, false)
  assert.match(config.timing.decideOn, /^\d{4}-\d{2}-\d{2}$/)
})

test('the workflow runs every day and by hand, with the least permissions and no secret', () => {
  assert.match(workflow, /schedule:\n\s+# .*\n\s+- cron: '\d+ \d+ \* \* \*'/)
  assert.match(workflow, /\n {2}workflow_dispatch:/)
  assert.match(workflow, /\npermissions:\n {2}actions: read\n {2}contents: read\n/)
  assert.doesNotMatch(workflow, /secrets\./)
  assert.doesNotMatch(workflow, /\bwrite\b/)
})

test('every action of the workflow is pinned on a full commit, with its version as a comment', () => {
  const uses = workflow.split('\n').filter((line) => line.includes('uses:'))

  assert.ok(uses.length >= 3)

  for (const line of uses) {
    assert.match(line, /uses: [\w-]+\/[\w-]+@[0-9a-f]{40} # v\d+\.\d+\.\d+$/)
  }
})

test('nothing from outside reaches a command of the workflow, except through an environment variable', () => {
  const commands = workflow
    .split(/\n\s+run: /)
    .slice(1)
    .map((part) => part.split(/\n\s+- /)[0])

  assert.ok(commands.length >= 3)

  for (const command of commands) {
    assert.doesNotMatch(command, /\$\{\{/)
  }

  assert.doesNotMatch(workflow, /github\.event\./)
  assert.doesNotMatch(workflow, /github\.head_ref/)
})

test('the reports and the metrics are kept for 30 days, also when a check failed', () => {
  assert.equal(workflow.match(/retention-days: 30/g)?.length, 2)
  assert.equal(workflow.match(/if: \$\{\{ !cancelled\(\) \}\}/g)?.length, 2)
})

test('the workflow measures nothing but our own address from the configuration', () => {
  assert.doesNotMatch(workflow, /https?:\/\/(?!acc\.sc\.heerenveen\.org|github\.com)/)
})

test('a measurement that fails once is tried again and passes, and the run says it retried', () => {
  const statuses = [1, 0]

  assert.deepEqual(
    measureWithRetries(() => statuses.shift()),
    { retried: 1, status: 0 },
  )
})

test('a measurement that keeps failing is tried again twice and then fails', () => {
  let calls = 0

  assert.deepEqual(
    measureWithRetries(() => {
      calls++

      return 1
    }),
    { retried: 2, status: 1 },
  )
  assert.equal(calls, 3)
})

test('a measurement that passes at once is not retried', () => {
  assert.deepEqual(
    measureWithRetries(() => 0),
    { retried: 0, status: 0 },
  )
})

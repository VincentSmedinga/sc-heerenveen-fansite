// The daily Lighthouse check of the site (.github/workflows/lighthouse.yml, #803). It measures
// the pages in .github/lighthouse.json with the Lighthouse CLI, three runs per page and device,
// keeps the middle run, writes a summary for the run with the last seven runs beside it, and
// fails the run when a fixed check fails. The method is the one of docs/prestaties.md (#798).
//
//   node scripts/lighthouse.js run       measures, writes the reports to lighthouse-reports/
//   node scripts/lighthouse.js summary   reads them and the metrics of earlier runs from
//                                        lighthouse-history/, writes the summary and the
//                                        metrics of this run, and exits 1 on a fixed failure
//
// What decides something is a function without side effects, exported for the tests. The
// address and every other setting come from the configuration file, and nothing from outside
// reaches a command: the CLI is started with an argument list and no shell.
import { spawnSync } from 'node:child_process'
import { appendFileSync, mkdirSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const configFile = '.github/lighthouse.json'
export const reportsDir = 'lighthouse-reports'
export const historyDir = 'lighthouse-history'
export const devices = ['mobile', 'desktop']

/** How many earlier runs the summary shows. */
export const historyLength = 7

/**
 * The visits of a run must not count in /beheer/bezoek. The emulated browser of the Lighthouse
 * CLI has no "Lighthouse" in its text any more, so the text alone would count them. The request
 * says it asks not to be counted instead (`DNT: 1`, which visitOf in apps/site/src/visits.ts
 * honours), and nothing else about the page changes.
 */
export const extraHeaders = { DNT: '1' }

const kib = (bytes) => Math.round((bytes / 1024) * 10) / 10

const fileName = (index, device, run) => `p${index + 1}-${device}-${run}.json`

/** The arguments of one run of the CLI, as a list, so nothing is read as a shell command. */
export function cliArguments({ address, chrome, device, outputPath, path, version }) {
  return [
    '--yes',
    `lighthouse@${version}`,
    `${address}${path}`,
    ...(device === 'desktop' ? ['--preset=desktop'] : []),
    '--output=json',
    `--output-path=${outputPath}`,
    `--chrome-flags=${chrome}`,
    `--extra-headers=${JSON.stringify(extraHeaders)}`,
    '--quiet',
  ]
}

/**
 * The fixed checks: what fails the run. The score of SEO does not count while the environment
 * sends `noindex`. A page without a baseline is a failure, so a new page cannot slip in
 * unchecked.
 */
export function fixedProblems(row, fixed) {
  const problems = []
  const where = `${row.name} (${row.device})`
  const baseline = fixed.baselineKiB[row.path]

  if (row.scores.accessibility < fixed.accessibility) {
    problems.push(`${where}: toegankelijkheid ${row.scores.accessibility}, minimaal ${fixed.accessibility}`)
  }

  if (row.scores.bestPractices < fixed.bestPractices) {
    problems.push(`${where}: best practices ${row.scores.bestPractices}, minimaal ${fixed.bestPractices}`)
  }

  if (row.thirdParty > fixed.thirdPartyRequests) {
    problems.push(`${where}: ${row.thirdParty} verzoeken naar derden, maximaal ${fixed.thirdPartyRequests}`)
  }

  if (baseline === undefined) {
    problems.push(`${where}: de pagina heeft geen basiswaarde in ${configFile}`)

    return problems
  }

  for (const [key, label] of [
    ['weight', 'gewicht'],
    ['javascript', 'JavaScript'],
    ['fonts', 'lettertypes'],
  ]) {
    const limit = sizeLimit(baseline[key], fixed.sizeMarginPercent)

    if (row[key] > limit) {
      problems.push(`${where}: ${label} ${row[key]} KiB, maximaal ${limit} KiB`)
    }
  }

  return problems
}

/** The middle run: by performance score, and with equal scores by LCP. */
export function medianRun(runs) {
  const sorted = [...runs].sort((a, b) => a.scores.performance - b.scores.performance || b.lcp - a.lcp)

  return sorted[Math.floor(sorted.length / 2)]
}

/** The numbers of one report that the summary and the budgets use. */
export function metricsOf(report, address) {
  const audits = report.audits
  const summary = Object.fromEntries(audits['resource-summary'].details.items.map((item) => [item.resourceType, item]))
  const host = new URL(address).host
  const thirdParty = audits['network-requests'].details.items.filter((request) => {
    try {
      const url = new URL(request.url)

      return ['http:', 'https:'].includes(url.protocol) && url.host !== host
    } catch {
      return false
    }
  })

  return {
    cls: Math.round(audits['cumulative-layout-shift'].numericValue * 1000) / 1000,
    fonts: kib(summary.font?.transferSize ?? 0),
    javascript: kib(summary.script?.transferSize ?? 0),
    lcp: Math.round(audits['largest-contentful-paint'].numericValue),
    scores: {
      accessibility: Math.round(report.categories.accessibility.score * 100),
      bestPractices: Math.round(report.categories['best-practices'].score * 100),
      performance: Math.round(report.categories.performance.score * 100),
      seo: Math.round(report.categories.seo.score * 100),
    },
    tbt: Math.round(audits['total-blocking-time'].numericValue),
    thirdParty: thirdParty.length,
    ttfb: Math.round(audits['server-response-time'].numericValue),
    weight: kib(audits['total-byte-weight'].numericValue),
  }
}

/** The limit of a size: the baseline of the measurement of #798 plus the margin, rounded up. */
export function sizeLimit(baseline, marginPercent) {
  return Math.ceil(baseline * (1 + marginPercent / 100) * 10) / 10
}

/** The timing checks: they report until the owner sets `enforce`, then they fail the run. */
export function timingProblems(row, timing) {
  const budget = timing.budgets[row.device]
  const where = `${row.name} (${row.device})`
  const problems = []

  if (row.scores.performance < budget.performanceMin) {
    problems.push(`${where}: prestaties ${row.scores.performance}, minimaal ${budget.performanceMin}`)
  }

  for (const [key, label, unit] of [
    ['lcp', 'LCP', 'ms'],
    ['tbt', 'TBT', 'ms'],
    ['ttfb', 'TTFB', 'ms'],
    ['cls', 'CLS', ''],
  ]) {
    const limit = budget[key === 'cls' ? 'cls' : `${key}Ms`]

    if (row[key] > limit) {
      problems.push(
        `${where}: ${label} ${row[key]}${unit ? ` ${unit}` : ''}, maximaal ${limit}${unit ? ` ${unit}` : ''}`,
      )
    }
  }

  return problems
}

const number = (value, decimals = 0) => value.toFixed(decimals).replace('.', ',')

const rowLine = (row) =>
  `| ${row.name} | ${row.device === 'mobile' ? 'mobiel' : 'bureaublad'} | ${row.scores.performance} / ${row.scores.accessibility} / ${row.scores.bestPractices} / ${row.scores.seo} | ${number(row.lcp / 1000, 2)} | ${number(row.cls, 3)} | ${row.tbt} | ${row.ttfb} | ${number(row.weight, 1)} | ${number(row.javascript, 1)} | ${number(row.fonts, 1)} | ${row.thirdParty} |`

/** The earlier runs, the newest first, at most `historyLength` of them. */
export function recentRuns(history) {
  return [...history].sort((a, b) => b.date.localeCompare(a.date)).slice(0, historyLength)
}

/** The metrics of the reports of this run, one row per page and device. */
export function rowsOf(config, readReport) {
  return config.pages.flatMap((page, index) =>
    devices.map((device) => {
      const runs = Array.from({ length: config.runsPerPage }, (_, run) =>
        metricsOf(readReport(fileName(index, device, run + 1)), config.address),
      )

      return { device, name: page.name, path: page.path, ...medianRun(runs) }
    }),
  )
}

/**
 * The summary of a run in Markdown: this run per page and device, the earlier runs beside it
 * (the performance score and the LCP of each), and what failed or is reported.
 */
export function summaryOf({ address, fixedFailures, history, metrics, timing, timingFailures }) {
  const lines = [
    '## Lighthouse',
    '',
    `${address}, ${metrics.date}. De middelste van drie runs per pagina en apparaat.`,
    'Scores: prestaties / toegankelijkheid / best practices / SEO (SEO telt niet mee zolang de omgeving `noindex` stuurt).',
    'LCP in seconden, TBT en TTFB in milliseconden, gewicht, JavaScript en lettertypes in KiB.',
    '',
    '| Pagina | Apparaat | Scores | LCP | CLS | TBT | TTFB | Gewicht | JavaScript | Lettertypes | Derden |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...metrics.rows.map(rowLine),
    '',
  ]
  const earlier = recentRuns(history)

  if (earlier.length > 0) {
    lines.push(
      `### De laatste ${earlier.length === 1 ? 'run' : `${earlier.length} runs`} ernaast`,
      '',
      'Per pagina en apparaat de prestatiescore en de LCP in seconden, de nieuwste eerst.',
      '',
      `| Pagina | Apparaat | ${earlier.map((run) => run.date.slice(0, 10)).join(' | ')} |`,
      `| --- | --- | ${earlier.map(() => '---').join(' | ')} |`,
    )

    for (const row of metrics.rows) {
      const cells = earlier.map((run) => {
        const found = run.rows.find((other) => other.path === row.path && other.device === row.device)

        return found === undefined ? '–' : `${found.scores.performance} / ${number(found.lcp / 1000, 2)}`
      })

      lines.push(`| ${row.name} | ${row.device === 'mobile' ? 'mobiel' : 'bureaublad'} | ${cells.join(' | ')} |`)
    }

    lines.push('')
  }

  lines.push(
    '### Vaste controles',
    '',
    ...(fixedFailures.length === 0 ? ['Geslaagd.'] : fixedFailures.map((problem) => `- ${problem}`)),
    '',
    `### Tijdcontroles (${timing.enforce ? 'laten de run falen' : `melden alleen, tot de eigenaar de budgetten vaststelt op ${timing.decideOn}`})`,
    '',
    ...(timingFailures.length === 0 ? ['Binnen de budgetten.'] : timingFailures.map((problem) => `- ${problem}`)),
    '',
  )

  return lines.join('\n')
}

function measure() {
  const config = readConfig()

  mkdirSync(reportsDir, { recursive: true })

  // Runs one after the other: runs next to each other make each other slower.
  for (const device of devices) {
    for (let run = 1; run <= config.runsPerPage; run++) {
      for (const [index, page] of config.pages.entries()) {
        const outputPath = join(reportsDir, fileName(index, device, run))
        const result = spawnSync(
          'npx',
          cliArguments({
            address: config.address,
            chrome: '--headless=new --no-sandbox',
            device,
            outputPath,
            path: page.path,
            version: config.cliVersion,
          }),
          { stdio: ['ignore', 'inherit', 'inherit'] },
        )

        if (result.status !== 0) {
          console.error(`::error::Lighthouse faalde op ${config.address}${page.path} (${device}, run ${run})`)
          process.exit(1)
        }
      }
    }
  }

  console.log(`${config.pages.length * devices.length * config.runsPerPage} runs gemeten`)
}

function readConfig() {
  return JSON.parse(readFileSync(configFile, 'utf8'))
}

function summarise() {
  const config = readConfig()
  const rows = rowsOf(config, (name) => JSON.parse(readFileSync(join(reportsDir, name), 'utf8')))
  const metrics = {
    address: config.address,
    cliVersion: config.cliVersion,
    date: new Date().toISOString(),
    rows,
    runId: process.env.GITHUB_RUN_ID ?? '',
  }
  const history = []

  for (const entry of readdirSync(historyDir, { recursive: true })) {
    if (String(entry).endsWith('metrics.json')) {
      try {
        history.push(JSON.parse(readFileSync(join(historyDir, String(entry)), 'utf8')))
      } catch {
        // A damaged file of an earlier run only costs that run its place in the table.
      }
    }
  }

  const fixedFailures = rows.flatMap((row) => fixedProblems(row, config.fixed))
  const timingFailures = rows.flatMap((row) => timingProblems(row, config.timing))
  const summary = summaryOf({
    address: config.address,
    fixedFailures,
    history,
    metrics,
    timing: config.timing,
    timingFailures,
  })

  writeFileSync(join(reportsDir, 'metrics.json'), `${JSON.stringify(metrics, null, 2)}\n`)

  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`)
  } else {
    console.log(summary)
  }

  for (const problem of timingFailures) {
    console.log(`::${config.timing.enforce ? 'error' : 'warning'}::${problem}`)
  }

  if (!config.timing.enforce && new Date() >= new Date(config.timing.decideOn)) {
    console.log(
      `::notice::De tijdcontroles melden nog alleen: stel de budgetten vast (${configFile}, "decideOn" ${config.timing.decideOn})`,
    )
  }

  for (const problem of fixedFailures) {
    console.error(`::error::${problem}`)
  }

  if (fixedFailures.length > 0 || (config.timing.enforce && timingFailures.length > 0)) {
    process.exit(1)
  }
}

// `import.meta.main` only exists from Node 24.2, and engines allows 24.0 and 24.1 too, so
// compare the paths ourselves.
if (process.argv[1] !== undefined && realpathSync(process.argv[1]) === import.meta.filename) {
  const mode = process.argv[2]

  if (mode === 'run') {
    measure()
  } else if (mode === 'summary') {
    summarise()
  } else {
    console.error('Gebruik: node scripts/lighthouse.js run|summary')
    process.exit(1)
  }
}

// Checks the JSON report that one part of the e2e tests in CI wrote (the reporter `json` of
// Playwright), because Playwright answers a part that has no tests with a green "0 tests" and
// exit code 0: `playwright test --shard=2/2` did that on 31 October 2026, when the project that
// depends on another one kept every test in the first part. The job "check" can only see that a
// part passed, so each part says here that it ran something and that all of it passed.
//
//   node scripts/ci-e2e-report.js <report.json>
//
// The rules: at least one test passed, and none failed, was skipped or needed a retry.
//
// What decides something is a function without side effects, exported for the tests.
import { readFileSync, realpathSync } from 'node:fs'

/** Takes the parsed report. Gives the problems found, one line each; none means all is well. */
export function check(report) {
  const stats = report?.stats
  const problems = []

  if (stats === undefined || ![stats.expected, stats.unexpected, stats.skipped, stats.flaky].every(Number.isInteger)) {
    return ['het verslag heeft geen tellingen']
  }

  if (stats.expected === 0) {
    problems.push('er is geen test gedraaid')
  }

  for (const [count, what] of [
    [stats.unexpected, 'mislukt'],
    [stats.skipped, 'overgeslagen'],
    [stats.flaky, 'pas bij een nieuwe poging geslaagd'],
  ]) {
    if (count > 0) {
      problems.push(`${count} ${count === 1 ? 'test is' : 'tests zijn'} ${what}`)
    }
  }

  return problems
}

// `import.meta.main` only exists from Node 24.2, and engines allows 24.0 and 24.1 too, so
// compare the paths ourselves.
if (process.argv[1] !== undefined && realpathSync(process.argv[1]) === import.meta.filename) {
  let report

  try {
    report = JSON.parse(readFileSync(process.argv[2] ?? '', 'utf8'))
  } catch (error) {
    console.error(`Het verslag van de e2e-tests is niet te lezen: ${error.message}`)
    process.exit(1)
  }

  const problems = check(report)

  if (problems.length > 0) {
    console.error(`Dit deel van de e2e-tests telt niet mee:\n${problems.map((problem) => `- ${problem}`).join('\n')}`)
    process.exit(1)
  }

  console.log(`${report.stats.expected} tests gedraaid en geslaagd`)
}

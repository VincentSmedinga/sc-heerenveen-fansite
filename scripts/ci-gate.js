// The last job of CI, "Lint, typecheck, test and build": the check that the rules for main
// require. It waits for every other job and says whether CI as a whole passed. GitHub counts a
// skipped job as a pass, and a job whose predecessor failed is skipped too. So the job can't
// just depend on the others: it has to know which jobs may be skipped, and which must have run.
//
//   NEEDS='<toJSON(needs)>' node scripts/ci-gate.js
//
// The rules:
// 1. Every job must have succeeded, except the two that scripts/ci-changes.js can switch off:
//    "stories" and "site" (the smoke test and the e2e tests).
// 2. Those must have succeeded when ci-changes.js said to run them (its output is not "false",
//    so a missing output runs them too), and must have been skipped when it said not to.
// 3. A result we don't know, such as "cancelled" or a job that isn't there, is a failure.
//
// What decides something is a function without side effects, exported for the tests.
import { realpathSync } from 'node:fs'

/** The jobs that always run, and the jobs that an output of the job `changes` switches. */
export const always = ['changes', 'lint', 'test', 'build']
export const decided = [
  { job: 'stories', output: 'stories' },
  { job: 'site', output: 'site' },
]

/**
 * Takes `needs` as GitHub gives it to a job (`toJSON(needs)`): per job its `result`, and for
 * `changes` its `outputs`. Gives the problems found, one line each; none means CI passed.
 */
export function check(needs) {
  const problems = []
  const outputs = needs?.changes?.outputs ?? {}

  for (const job of always) {
    const result = needs?.[job]?.result

    if (result !== 'success') {
      problems.push(`${job}: ${result ?? 'ontbreekt'}, verwacht success`)
    }
  }

  for (const { job, output } of decided) {
    const result = needs?.[job]?.result
    const expected = outputs[output] === 'false' ? 'skipped' : 'success'

    if (result !== expected) {
      problems.push(`${job}: ${result ?? 'ontbreekt'}, verwacht ${expected}`)
    }
  }

  return problems
}

// `import.meta.main` only exists from Node 24.2, and engines allows 24.0 and 24.1 too, so
// compare the paths ourselves.
if (process.argv[1] !== undefined && realpathSync(process.argv[1]) === import.meta.filename) {
  let needs

  try {
    needs = JSON.parse(process.env.NEEDS ?? '')
  } catch {
    console.error('NEEDS is geen JSON: de uitkomst van de andere jobs is niet te lezen')
    process.exit(1)
  }

  const problems = check(needs)

  if (problems.length > 0) {
    console.error(`CI is niet geslaagd:\n${problems.map((problem) => `- ${problem}`).join('\n')}`)
    process.exit(1)
  }

  console.log('Alle jobs van CI zijn geslaagd of terecht overgeslagen')
}

// Decides whether CI has to run the checks of the site: the smoke test and the accessibility
// check (the e2e tests), about 150 of the 268 seconds of a run. CI starts it as a step of the
// job "Lint, typecheck, test and build" and gives the later steps an `if` on its output,
// `site`. The decision "CI slaat de controles van de site over bij wijzigingen die ze niet
// raken" in docs/beslissingen.md says why.
//
//   node scripts/ci-changes.js
//
// The rules, from the safest:
// 1. Only a pull request can skip them. A push to main and a manual run always run
//    everything, so main never has a gap.
// 2. A pull request with the label "volledige controle" runs everything.
// 3. If the changed files can't be found, or there are none, everything runs.
// 4. The checks are skipped only if every changed file is one that they can't touch (see
//    `skippable`): documentation, the tooling for agents, the importer and the MCP server of
//    the design system. Any other file, including a file this script has never heard of,
//    runs them.
// 5. A package.json or a tsconfig, wherever it is, runs them too: a dependency or a compiler
//    option can change what the site builds, also from inside a skippable folder.
//
// Lint, typecheck, `pnpm test` and the build are not decided here. They always run, and so do
// the tests of the importer and the packages.
//
// What decides something is a function without side effects, exported for the tests. What
// touches the computer (git, the GitHub API, the files CI hands over) is below that, and only
// runs when this file is started directly.
import { execFileSync } from 'node:child_process'
import { appendFileSync, readFileSync, realpathSync } from 'node:fs'

/** The label that makes a pull request run everything, whatever it changes. */
export const forceLabel = 'volledige controle'

/**
 * What the checks of the site can't touch. A name ending in a slash is a folder, anything else
 * a file in the root.
 *
 * - `docs/`, `AGENTS.md`, `CONTRIBUTING.md` and `README.md`: text. The site reads none of them.
 * - `.claude/`: the agents, skills and hooks. Their tests run in `pnpm test`, which always
 *   runs.
 * - `apps/importer/`: only `assemble` reads it, to bundle the importer into the folder for
 *   the host. The test of that bundle is in the importer's own tests, and the workflow of
 *   acceptance runs the bundle on every merge to main.
 * - `apps/design-system-mcp/`: a separate app that the site doesn't import.
 */
export const skippable = [
  'docs/',
  '.claude/',
  'AGENTS.md',
  'CONTRIBUTING.md',
  'README.md',
  'apps/importer/',
  'apps/design-system-mcp/',
]

/** Files that run the checks even inside a skippable folder: they change what is built. */
const configuration = /(^|\/)(package\.json|tsconfig(\..+)?\.json)$/

/**
 * Decides whether the checks of the site run. `event` is the name of the event that started CI,
 * `files` the changed files of a pull request (null if they couldn't be found) and `forced`
 * whether the pull request has the label. Gives `site` and the line for the log.
 */
export function decide({ event, files, forced = false }) {
  if (event !== 'pull_request') {
    return {
      reason: `Controles van de site gedraaid: ${event ?? 'onbekende gebeurtenis'}, geen pull request`,
      site: true,
    }
  }

  if (forced) {
    return { reason: `Controles van de site gedraaid: de pull request heeft het label "${forceLabel}"`, site: true }
  }

  if (files === null || files === undefined) {
    return { reason: 'Controles van de site gedraaid: de gewijzigde bestanden zijn niet te bepalen', site: true }
  }

  if (files.length === 0) {
    return { reason: 'Controles van de site gedraaid: geen gewijzigde bestanden gevonden', site: true }
  }

  const rules = []

  for (const file of files) {
    const rule = skippableRule(file)

    if (rule === undefined) {
      return { reason: `Controles van de site gedraaid: ${file} kan ze raken`, site: true }
    }

    if (!rules.includes(rule)) {
      rules.push(rule)
    }
  }

  return { reason: `Controles van de site overgeslagen: alleen ${listRules(rules)} gewijzigd`, site: false }
}

/** Gives the names that `git diff --name-only -z` printed. */
export function parseNames(output) {
  return output.split('\0').filter((name) => name !== '')
}

/**
 * Gives the files this pull request changes. CI checks out the merge of the pull request into
 * main, a commit whose first parent is main as it is now, so the difference with that parent is
 * the pull request. `--no-renames` lists both names of a move, so a file moved out of a folder
 * the checks care about still counts as a change there.
 */
function changedFiles() {
  const parents = execFileSync('git', ['rev-list', '--parents', '-n', '1', 'HEAD'], { encoding: 'utf8' })
    .trim()
    .split(' ')

  if (parents.length !== 3) {
    throw new Error('HEAD is niet de samenvoeging van de pull request met main')
  }

  return parseNames(
    execFileSync('git', ['diff', '--name-only', '--no-renames', '-z', 'HEAD^1', 'HEAD'], { encoding: 'utf8' }),
  )
}

/** Asks GitHub for the labels now, so a label set after the run started counts on a re-run. */
async function hasForceLabel(env) {
  const event = JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, 'utf8'))
  const response = await fetch(
    `https://api.github.com/repos/${env.GITHUB_REPOSITORY}/issues/${event.pull_request.number}/labels?per_page=100`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
      signal: AbortSignal.timeout(20_000),
    },
  )

  if (!response.ok) {
    throw new Error(`GitHub antwoordde ${response.status} op de vraag naar de labels`)
  }

  return (await response.json()).some((label) => label.name === forceLabel)
}

/** Names the rules in one phrase for the log: "docs/", "docs/ en AGENTS.md", "a, b en c". */
function listRules(rules) {
  return rules.length < 2 ? rules.join('') : `${rules.slice(0, -1).join(', ')} en ${rules.at(-1)}`
}

async function main(env) {
  let decision

  try {
    const event = env.GITHUB_EVENT_NAME
    const isPullRequest = event === 'pull_request'

    decision = decide({
      event,
      files: isPullRequest ? changedFiles() : [],
      forced: isPullRequest ? await hasForceLabel(env) : false,
    })
  } catch (error) {
    // Whatever goes wrong, the answer is the one that checks the most.
    decision = { reason: `Controles van de site gedraaid: de beslissing mislukte (${error.message})`, site: true }
  }

  console.log(decision.reason)

  if (env.GITHUB_OUTPUT !== undefined) {
    appendFileSync(env.GITHUB_OUTPUT, `site=${decision.site}\n`)
  }
}

/** Gives the rule that makes a file skippable, or undefined if the checks run for it. */
function skippableRule(file) {
  // Nothing from git looks like this. If it does, we don't know what it is, so the checks run.
  if (file.startsWith('/') || file.includes('\\') || file.split('/').includes('..')) {
    return undefined
  }

  if (configuration.test(file)) {
    return undefined
  }

  return skippable.find((rule) => (rule.endsWith('/') ? file.startsWith(rule) : file === rule))
}

// `import.meta.main` only exists from Node 24.2, and engines allows 24.0 and 24.1 too, so
// compare the paths ourselves.
if (process.argv[1] !== undefined && realpathSync(process.argv[1]) === import.meta.filename) {
  await main(process.env)
}

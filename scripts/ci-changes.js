// Decides whether CI has to run the checks of the site: the smoke test and the accessibility
// check (the e2e tests), about 500 of the 840 machine seconds of a run. CI starts it as the job
// "Decide which checks to run" and gives the jobs of the site and of the stories an `if` on its
// outputs, `site` and `stories`. The job "Lint, typecheck, test and build" (scripts/ci-gate.js)
// fails when one of those jobs ran and shouldn't have, or was skipped and shouldn't have been.
// The decision "CI slaat de controles van de site over bij wijzigingen die ze niet raken" in
// docs/beslissingen/werkwijze.md says why.
//
//   node scripts/ci-changes.js
//
// The rules, from the safest:
// 1. A pull request can skip them by what it changes. A push to main skips them only when its
//    code is the code of a green pull request (`decideTested`); a manual run always runs
//    everything.
// 2. A pull request with the label "volledige controle" runs everything.
// 3. If the changed files can't be found, or there are none, everything runs.
// 4. The checks are skipped only if every changed file is one that they can't touch (see
//    `skippable`): documentation, the tooling for agents, the importer and the MCP server of
//    the design system. Any other file, including a file this script has never heard of,
//    runs them.
// 5. A package.json or a tsconfig, wherever it is, runs them too: a dependency or a compiler
//    option can change what the site builds, also from inside a skippable folder.
//
// A push to main gets one more decision, `decideTested`: if the code on main is the code that
// the pull request already tested, the checks are not repeated (see the rules there).
//
// The axe check of the stories of the design system (`pnpm test:stories`, 80 seconds in CI) is
// decided here too, by `decideStories`, as the output `stories`. It follows the same first
// three rules, then runs only if a file that can change a story changed (see `storiesRules`).
//
// Lint, typecheck, `pnpm test` and the build always run for a pull request, and so do the tests
// of the importer and the packages. Only `decideTested` can skip them, on a push to main, as
// the output `tested`.
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

/**
 * What can change a story or the way it is tested. A name ending in a slash is a folder,
 * anything else a file. The design system is where the stories are. The lockfile and the
 * workspace file change the versions of Storybook, Vitest, axe and the browser driver, and the
 * workflow holds the step itself.
 */
export const storiesRules = [
  'packages/design-system/',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  '.github/workflows/ci.yml',
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

/**
 * Decides whether the axe check of the stories runs. It takes what `decide` takes and gives
 * `stories` and the line for the log. Whatever it can't be sure about, it runs.
 */
export function decideStories({ event, files, forced = false }) {
  if (event !== 'pull_request') {
    return {
      reason: `Controle van de stories gedraaid: ${event ?? 'onbekende gebeurtenis'}, geen pull request`,
      stories: true,
    }
  }

  if (forced) {
    return {
      reason: `Controle van de stories gedraaid: de pull request heeft het label "${forceLabel}"`,
      stories: true,
    }
  }

  if (files === null || files === undefined) {
    return { reason: 'Controle van de stories gedraaid: de gewijzigde bestanden zijn niet te bepalen', stories: true }
  }

  if (files.length === 0) {
    return { reason: 'Controle van de stories gedraaid: geen gewijzigde bestanden gevonden', stories: true }
  }

  for (const file of files) {
    if (untrusted(file)) {
      return { reason: `Controle van de stories gedraaid: ${file} is een onverwacht pad`, stories: true }
    }

    if (storiesRules.some((rule) => (rule.endsWith('/') ? file.startsWith(rule) : file === rule))) {
      return { reason: `Controle van de stories gedraaid: ${file} kan ze raken`, stories: true }
    }
  }

  return { reason: 'Controle van de stories overgeslagen: de bestanden raken ze niet', stories: false }
}

/** The check of the gate job that a pull request must have passed, as the API names it. */
export const gateCheckName = 'Lint, typecheck, test and build'

/**
 * Puts the decisions together: `site`, `stories` and `tested`, and the lines for the log. A
 * push to main whose code was tested skips all of them; otherwise `tested` is false and the
 * other two
 * stay as `decide` and `decideStories` said.
 */
export function decideRun({ event, files, forced = false, ...tested }) {
  const result = decideTested({ event, ...tested })

  if (result.tested) {
    return { reasons: [result.reason], site: false, stories: false, tested: true }
  }

  const site = decide({ event, files, forced })
  const stories = decideStories({ event, files, forced })

  return {
    reasons: [...(event === 'push' ? [result.reason] : []), site.reason, stories.reason],
    site: site.site,
    stories: stories.stories,
    tested: false,
  }
}

/**
 * Decides whether the code of a push to main was already tested by its pull request, so that
 * the run on main doesn't repeat the checks. It gives `tested` and the line for the log.
 *
 * `pullRequests` are the pull requests GitHub lists for the commit, `mainTree` the tree of the
 * commit on main, `headTree` the tree of the head commit of the pull request and `checkRuns`
 * the
 * check runs of that head commit. Anything that is null, missing or odd runs everything:
 *
 * 1. Only a push. A manual run and a pull request run everything.
 * 2. The commit has exactly one pull request, merged into main, whose squash commit is this
 *    commit.
 * 3. The tree of the commit equals the tree of the head commit of that pull request. If the
 *    branch was behind main, the trees differ, and nobody tested what is now on main.
 * 4. The check "Lint, typecheck, test and build" of GitHub Actions on that head commit passed.
 */
export function decideTested({ checkRuns, event, headTree, mainTree, pullRequests, sha }) {
  const run = (why) => ({ reason: `Alle controles gedraaid: ${why}`, tested: false })

  if (event !== 'push') {
    return run(`${event ?? 'onbekende gebeurtenis'}, geen push naar main`)
  }

  if (!Array.isArray(pullRequests)) {
    return run('de pull request van de commit is niet te vinden')
  }

  if (pullRequests.length === 0) {
    return run('de commit heeft geen pull request')
  }

  if (pullRequests.length > 1) {
    return run(`de commit heeft ${pullRequests.length} pull requests`)
  }

  const pullRequest = pullRequests[0]
  const number = pullRequest?.number
  const headSha = pullRequest?.head?.sha

  if (
    !Number.isInteger(number) ||
    typeof sha !== 'string' ||
    sha === '' ||
    pullRequest.merge_commit_sha !== sha ||
    pullRequest.base?.ref !== 'main' ||
    !pullRequest.merged_at ||
    typeof headSha !== 'string' ||
    headSha === ''
  ) {
    return run('de commit is niet de samenvoeging van een pull request in main')
  }

  if (typeof mainTree !== 'string' || mainTree === '' || typeof headTree !== 'string' || headTree === '') {
    return run(`de bomen van pull request ${number} zijn niet te bepalen`)
  }

  if (mainTree !== headTree) {
    return run(
      `de boom van main (${mainTree}) verschilt van die van pull request ${number} (${headTree}), de branch liep achter`,
    )
  }

  if (!Array.isArray(checkRuns)) {
    return run(`de checks van pull request ${number} zijn niet te vinden`)
  }

  const gate = checkRuns.filter(
    (checkRun) => checkRun?.name === gateCheckName && checkRun.app?.slug === 'github-actions',
  )

  if (gate.length === 0) {
    return run(`pull request ${number} heeft geen check "${gateCheckName}"`)
  }

  if (!gate.every((checkRun) => checkRun.status === 'completed' && checkRun.conclusion === 'success')) {
    return run(`de check "${gateCheckName}" van pull request ${number} was niet groen`)
  }

  return {
    reason:
      `Controles overgeslagen: pull request ${number} is samengevoegd met een boom die gelijk is aan die van ` +
      `zijn head-commit (main ${mainTree}, pull request ${headTree}), en de check "${gateCheckName}" was groen`,
    tested: true,
  }
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

/**
 * Gathers what `decideTested` needs for a push to main. It stops asking as soon as the answer
 * is settled, so a push without a single pull request makes one call.
 */
async function gatherTested(env) {
  const sha = env.GITHUB_SHA
  const pullRequests = await github(env, `commits/${sha}/pulls?per_page=100`)
  const input = { pullRequests, sha }

  if (pullRequests.length !== 1 || pullRequests[0]?.merge_commit_sha !== sha) {
    return input
  }

  const headSha = pullRequests[0].head?.sha

  if (typeof headSha !== 'string' || !/^[0-9a-f]{40}$/.test(headSha)) {
    return input
  }

  input.mainTree = execFileSync('git', ['rev-parse', `${sha}^{tree}`], { encoding: 'utf8' }).trim()
  input.headTree = (await github(env, `git/commits/${headSha}`)).tree?.sha
  input.checkRuns = (await github(env, `commits/${headSha}/check-runs?filter=latest&per_page=100`)).check_runs

  return input
}

/** Asks the GitHub API for a path and gives the JSON, or throws if GitHub says no. */
async function github(env, path) {
  const response = await fetch(`https://api.github.com/repos/${env.GITHUB_REPOSITORY}/${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
    signal: AbortSignal.timeout(20_000),
  })

  if (!response.ok) {
    throw new Error(`GitHub antwoordde ${response.status} op ${path.split('?')[0].replace(/[0-9a-f]{40}/g, '<sha>')}`)
  }

  return response.json()
}

/** Asks GitHub for the labels now, so a label set after the run started counts on a re-run. */
async function hasForceLabel(env) {
  const event = JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, 'utf8'))
  const labels = await github(env, `issues/${event.pull_request.number}/labels?per_page=100`)

  return labels.some((label) => label.name === forceLabel)
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

    decision = decideRun({
      event,
      files: isPullRequest ? changedFiles() : [],
      forced: isPullRequest ? await hasForceLabel(env) : false,
      ...(event === 'push' ? await gatherTested(env) : {}),
    })
  } catch (error) {
    // Whatever goes wrong, the answer is the one that checks the most.
    decision = {
      reasons: [`Alle controles gedraaid: de beslissing mislukte (${error.message})`],
      site: true,
      stories: true,
      tested: false,
    }
  }

  for (const reason of decision.reasons) {
    console.log(reason)
  }

  if (env.GITHUB_OUTPUT !== undefined) {
    appendFileSync(env.GITHUB_OUTPUT, `site=${decision.site}\nstories=${decision.stories}\ntested=${decision.tested}\n`)
  }
}

/** Gives the rule that makes a file skippable, or undefined if the checks run for it. */
function skippableRule(file) {
  if (untrusted(file)) {
    return undefined
  }

  if (configuration.test(file)) {
    return undefined
  }

  return skippable.find((rule) => (rule.endsWith('/') ? file.startsWith(rule) : file === rule))
}

/** Nothing from git looks like this. If it does, we don't know what it is: the checks run. */
function untrusted(file) {
  return file.startsWith('/') || file.includes('\\') || file.split('/').includes('..')
}

// `import.meta.main` only exists from Node 24.2, and engines allows 24.0 and 24.1 too, so
// compare the paths ourselves.
if (process.argv[1] !== undefined && realpathSync(process.argv[1]) === import.meta.filename) {
  await main(process.env)
}

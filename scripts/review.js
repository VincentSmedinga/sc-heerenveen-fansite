// Puts a pull request or a branch where you can look at it, in one folder next to the repository, and starts the site and
// Storybook for it in the background: the site on port 3000 and Storybook on port 6006, both opened in your browser.
// A branch that exists on your computer is taken as it is there, with commits that aren't pushed; otherwise it comes from
// GitHub. Each server opens on the page that the branch changes: the page of the site, and the component or document of
// Storybook, found from the files that differ from main. `pnpm review:stop` stops them.
// The decision "Een branch bekijk je met pnpm review, in één vaste map" in docs/beslissingen.md says why.
//
//   pnpm review <number of a pull request, or name of a branch>
//   pnpm review:stop
//
// What decides something is a function without side effects, exported for the tests. What touches the computer (git, gh,
// docker, lsof, files and processes) is below that, and only runs when this file is started directly.
import { spawn, spawnSync } from 'node:child_process'
import { closeSync, existsSync, openSync, readFileSync, realpathSync } from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'

/** A problem we expect: it is shown as a message, without a stack. */
export class ReviewError extends Error {
  constructor(message, exitCode = 1) {
    super(message)
    this.exitCode = exitCode
  }
}

export const reviewFolderName = 'sc-heerenveen-fansite-review'
export const logName = 'review.log'

const siteAppFolder = 'apps/site/src/app'
const designSystemFolder = 'packages/design-system/'

/**
 * The two servers. `args` is what pnpm runs in the review folder, and `owner` recognises in a command line the process
 * that listens on the port when it is a dev server of the fansite.
 */
export const servers = [
  {
    args: ['--filter', 'site', 'dev', '--port', '3000'],
    label: 'Site',
    name: 'the site',
    owner: /\bnext\b/,
    port: 3000,
  },
  {
    args: ['--filter', 'design-system', 'storybook', '--port', '6006', '--no-open', '--exact-port'],
    label: 'Storybook',
    name: 'Storybook',
    owner: /\bstorybook\b/,
    port: 6006,
  },
]

const [siteServer, storybookServer] = servers

const branchPattern = /^\w[\w./-]*$/

const isBranchName = (name) => branchPattern.test(name) && !name.includes('..') && !/[./]$/.test(name)

/** The folder of the repository itself, from the git directory that all its worktrees share. */
export function mainFolderOf(commonGitDir) {
  if (path.basename(commonGitDir) !== '.git') {
    throw new ReviewError(`Expected the git directory of a normal clone, not ${commonGitDir}.`)
  }

  return path.dirname(commonGitDir)
}

/** Reads what `gh pr list --json number,url,isCrossRepository` printed, and gives the first pull request of this repository. */
export function parseOpenPullRequest(json) {
  const found = JSON.parse(json).find(({ isCrossRepository }) => isCrossRepository !== true)

  return found === undefined ? undefined : { number: found.number, url: found.url }
}

/** Reads what `gh pr view --json headRefName,isCrossRepository,url` printed. */
export function parsePullRequest(json, number) {
  const { headRefName, isCrossRepository, url } = JSON.parse(json)

  if (isCrossRepository === true) {
    throw new ReviewError(
      `Pull request #${number} comes from a fork. This command runs the code of a branch on your computer, so it only takes branches of this repository.`,
    )
  }

  if (typeof headRefName !== 'string' || !isBranchName(headRefName)) {
    throw new ReviewError(`The branch of pull request #${number} has a name this command doesn't accept.`)
  }

  return { branch: headRefName, number, url }
}

/** Tells a pull request number from a branch name. A name that is only digits is a pull request. */
export function parseTarget(argument) {
  if (argument === undefined || argument === '') {
    throw new ReviewError('Say which pull request or branch to look at: pnpm review <number or branch>', 2)
  }

  if (/^\d+$/.test(argument)) {
    return { kind: 'pull-request', number: Number(argument) }
  }

  if (!isBranchName(argument)) {
    throw new ReviewError(`"${argument}" is neither a pull request number nor a branch name this command accepts.`, 2)
  }

  return { kind: 'branch', name: argument }
}

/** The lines of what `git diff --name-only` or `git ls-tree --name-only` printed. */
export const parseFileList = (output) =>
  output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')

/**
 * Says where the commit comes from, for the summary: GitHub, or a branch on this computer and how it compares with
 * the branch on GitHub. `comparison` is undefined when there was nothing to compare with.
 */
export function describeSource({ comparison, local }) {
  if (!local) {
    return 'origin (GitHub)'
  }

  if (comparison === undefined) {
    return 'local branch (not on origin, or origin not reachable)'
  }

  const { ahead, behind } = comparison

  if (ahead === 0 && behind === 0) {
    return 'local branch (same as origin)'
  }

  const plural = (count) => `${count} commit${count === 1 ? '' : 's'}`

  return `local branch (${[ahead > 0 ? `${plural(ahead)} ahead of origin` : '', behind > 0 ? `${plural(behind)} behind origin` : ''].filter(Boolean).join(', ')})`
}

/** Reads what `git rev-list --left-right --count <local>...<remote>` printed: the commits only the local branch has, and only the remote one. */
export function parseAheadBehind(output) {
  const [ahead, behind] = output.trim().split(/\s+/).map(Number)

  return { ahead, behind }
}

const pageFile = /^page\.(?:[jt]sx?|mdx)$/

/**
 * The page of the site that shows a change best. `changed` is what differs from main and `tracked` every file in the
 * app folder at the commit. A changed file leads to the page of its own folder, or the nearest folder above it that
 * has one; the page with most changed files wins. Without a page to show, it is the home page.
 */
export function sitePathFor(changed, tracked) {
  const pages = new Set(
    tracked.filter((file) => pageFile.test(path.posix.basename(file))).map((file) => path.posix.dirname(file)),
  )
  const counts = new Map()

  for (const file of changed) {
    if (!file.startsWith(`${siteAppFolder}/`)) {
      continue
    }

    let folder = path.posix.dirname(file)

    while (!pages.has(folder) && folder !== siteAppFolder) {
      folder = path.posix.dirname(folder)
    }

    const route = pages.has(folder) ? routeOf(folder) : undefined

    if (route !== undefined) {
      counts.set(route, (counts.get(route) ?? 0) + 1)
    }
  }

  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '/'
}

/**
 * The entry of Storybook that shows a change best, from `entries` (what /index.json lists). A changed story or document
 * leads to its own entries, any other changed file in the design system to those next to it, and the file with the
 * most of them wins. Its documentation page comes before its first story, because that shows all its stories.
 */
export function storybookEntryFor(changed, entries) {
  const scores = new Map()

  for (const file of changed) {
    if (!file.startsWith(designSystemFolder)) {
      continue
    }

    const importPath = `./${file.slice(designSystemFolder.length)}`
    const own = entries.filter((entry) => entry.importPath === importPath)
    const found =
      own.length > 0
        ? own
        : entries.filter((entry) => path.posix.dirname(entry.importPath) === path.posix.dirname(importPath))

    for (const foundPath of new Set(found.map((entry) => entry.importPath))) {
      scores.set(foundPath, (scores.get(foundPath) ?? 0) + (own.length > 0 ? 2 : 1))
    }
  }

  const best = [...scores].sort((a, b) => b[1] - a[1])[0]?.[0]
  // A documentation page can sit in an .mdx file of its own and list the story file in `storiesImports`.
  const ofBest = entries.filter((entry) => entry.importPath === best || entry.storiesImports?.includes(best))

  return ofBest.find(({ type }) => type === 'docs') ?? ofBest[0]
}

/** The address on the site of a folder in `apps/site/src/app`, or nothing for one that no address leads to. */
function routeOf(folder) {
  const segments = folder.slice(siteAppFolder.length).split('/').filter(Boolean)

  // A dynamic segment needs a value we can't guess, and `@slot` and `_private` folders have no address of their own.
  if (segments.some((segment) => /^[[@_]/.test(segment))) {
    return undefined
  }

  return `/${segments.filter((segment) => !/^\(.*\)$/.test(segment)).join('/')}`
}

/** The address in Storybook of an entry, or its start page without one. */
export const storybookPathFor = (entry) =>
  entry === undefined ? '' : `/?path=/${entry.type === 'docs' ? 'docs' : 'story'}/${encodeURIComponent(entry.id)}`

/** The review folder: the same one for every branch, next to the repository. */
export const reviewFolderOf = (mainFolder) => path.join(path.dirname(mainFolder), reviewFolderName)

/**
 * Whether a process that listens on the port of `server` is a dev server of the fansite, from any checkout of this
 * repository: its command line is the one of that server, and it works in the folder of one of the worktrees.
 */
export function isFansiteServer({ command, cwd }, server, worktrees) {
  return (
    cwd !== undefined &&
    server.owner.test(command) &&
    worktrees.some((worktree) => cwd === worktree || cwd.startsWith(worktree + path.sep))
  )
}

/** The folder a process works in, from `lsof -d cwd -Fn`. */
export function parseCwd(output) {
  return output
    .split('\n')
    .find((line) => line.startsWith('n'))
    ?.slice(1)
}

/** The process numbers from `lsof -t`. */
export function parsePids(output) {
  return output
    .split('\n')
    .filter((line) => /^\d+$/.test(line.trim()))
    .map(Number)
}

/** The folders of the worktrees, from `git worktree list --porcelain`. The repository itself is the first. */
export function parseWorktrees(porcelain) {
  return porcelain
    .split('\n')
    .filter((line) => line.startsWith('worktree '))
    .map((line) => line.slice('worktree '.length))
}

const shorten = (text, length = 80) => (text.length > length ? `${text.slice(0, length - 1)}…` : text)

/** Says what holds a port, for a message. */
export const describeHolder = ({ command, cwd, pid }) =>
  `"${shorten(command)}" (pid ${pid}${cwd === undefined ? '' : `, in ${cwd}`})`

/** What it takes to start a server: the command, where, and the environment that shows the branch. */
export function buildServerCommand(server, { branch, reviewFolder }, env) {
  return {
    args: server.args,
    command: 'pnpm',
    cwd: reviewFolder,
    env: { ...cleanEnv(env), NO_COLOR: '1', REVIEW_BRANCH: branch },
  }
}

/**
 * The steps that make the review folder ready, in order. Each is a command; none runs the import, because the headlines
 * come from the last `pnpm run import`. The first step puts the folder on the commit: a new worktree without a branch,
 * or the existing one moved to the commit.
 */
export function buildSteps({ commit, hasEnv, mainFolder, reviewFolder, worktreeExists }) {
  const short = commit.slice(0, 7)

  return [
    ...(worktreeExists
      ? [
          {
            args: ['checkout', '--quiet', '--detach', commit],
            command: 'git',
            cwd: reviewFolder,
            label: `Check out ${short}`,
          },
        ]
      : [
          {
            args: ['worktree', 'prune'],
            command: 'git',
            cwd: mainFolder,
            label: 'Forget worktrees whose folder is gone',
          },
          {
            args: ['worktree', 'add', '--quiet', '--detach', reviewFolder, commit],
            command: 'git',
            cwd: mainFolder,
            label: `Make ${reviewFolder} as a worktree on ${short}`,
          },
        ]),
    ...(hasEnv
      ? []
      : [
          {
            args: [path.join(mainFolder, '.env'), path.join(reviewFolder, '.env')],
            command: 'cp',
            cwd: mainFolder,
            label: 'Copy .env from the repository',
          },
        ]),
    { args: ['install', '--frozen-lockfile'], command: 'pnpm', cwd: reviewFolder, label: 'Install the dependencies' },
    // From the repository, so every branch gets the same database, also one from before compose.yaml existed.
    { args: ['compose', 'up', '-d', '--wait'], command: 'docker', cwd: mainFolder, label: 'Start the database' },
    { args: ['db:migrate'], command: 'pnpm', cwd: reviewFolder, label: 'Run the migrations' },
    { args: ['db:seed'], command: 'pnpm', cwd: reviewFolder, label: 'Run the seed' },
  ]
}

/** The environment for the commands in the review folder, without what pnpm set for this script in the repository. */
export function cleanEnv(env) {
  const inFolder = (folder) => folder.split(path.sep).includes('node_modules')

  return Object.fromEntries(
    Object.entries(env)
      .filter(([name]) => !name.startsWith('npm_') && name !== 'INIT_CWD')
      .map(([name, value]) =>
        name === 'PATH'
          ? [
              name,
              value
                .split(path.delimiter)
                .filter((folder) => !inFolder(folder))
                .join(path.delimiter),
            ]
          : [name, value],
      ),
  )
}

/** The message that stops `pnpm review` when something other than the fansite holds a port. */
export function foreignMessage(foreign) {
  return [
    ...foreign.map(
      ({ holder, server }) => `Port ${server.port} is held by ${describeHolder(holder)}, not by the fansite.`,
    ),
    'Stop that yourself and run this again. Nothing was changed.',
  ].join('\n')
}

/** The address of a server, on this computer, with the path of a page on it. */
export const addressOf = ({ port }, pathname = '') => `http://localhost:${port}${pathname}`

/** The command that opens an address in the default browser, or nothing on a system we don't know. */
export function openCommand(platform, address) {
  if (platform === 'darwin') {
    return { args: [address], command: 'open' }
  }

  return platform === 'linux' ? { args: [address], command: 'xdg-open' } : undefined
}

/** What `pnpm review` prints once both servers answer. `addresses` are the pages it opens, as [label, address]. */
export function summarise({ addresses, branch, commit, logFile, pullRequest, source }) {
  const rows = [
    ['Branch', branch],
    ['Source', source],
    ...(pullRequest === undefined ? [] : [['Pull request', `#${pullRequest.number} ${pullRequest.url}`]]),
    ['Commit', commit],
    ...addresses,
    ['Log', logFile],
  ]

  return [...rows.map(([label, value]) => `${label.padEnd(13)}${value}`), '', 'Stop both with: pnpm review:stop'].join(
    '\n',
  )
}

// ---- What touches the computer

const sameFolder = (a, b) => existsSync(a) && existsSync(b) && realpathSync(a) === realpathSync(b)

const repositoryFolder = path.resolve(import.meta.dirname, '..')

/** Runs a command and gives what it printed. When it fails, it throws a ReviewError that says `failure` and why. */
function capture(command, args, { cwd, failure }) {
  const { error, status, stderr, stdout } = spawnSync(command, args, { cwd, encoding: 'utf8' })

  if (error !== undefined || status !== 0) {
    throw new ReviewError([failure, (error?.message ?? stderr).trim()].filter(Boolean).join('\n'))
  }

  return stdout.trim()
}

/** The numbers of the processes that listen on a port. */
function pidsOnPort(port) {
  const found = spawnSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'], { encoding: 'utf8' })

  if (found.error !== undefined) {
    throw new ReviewError(`This command needs lsof to see what holds port ${port}: ${found.error.message}`)
  }

  return parsePids(found.stdout)
}

/** Like capture, but gives nothing when the command fails. */
function tryCapture(command, args, cwd) {
  try {
    return capture(command, args, { cwd, failure: '' })
  } catch {
    return undefined
  }
}

const holderOf = (pid) => ({
  command: spawnSync('ps', ['-o', 'command=', '-p', String(pid)], { encoding: 'utf8' }).stdout.trim(),
  cwd: parseCwd(spawnSync('lsof', ['-a', '-d', 'cwd', '-p', String(pid), '-Fn'], { encoding: 'utf8' }).stdout),
  pid,
})

const worktreesOf = (mainFolder) =>
  parseWorktrees(
    capture('git', ['worktree', 'list', '--porcelain'], { cwd: mainFolder, failure: 'Could not list the worktrees.' }),
  ).map((folder) => (existsSync(folder) ? realpathSync(folder) : folder))

/** Who holds the ports: per server, the processes that are the fansite's own and those that are not. */
function inspectPorts(worktrees) {
  return servers.map((server) => {
    const holders = pidsOnPort(server.port).map(holderOf)

    return {
      foreign: holders.filter((holder) => !isFansiteServer(holder, server, worktrees)),
      own: holders.filter((holder) => isFansiteServer(holder, server, worktrees)),
      server,
    }
  })
}

const isListening = (port) =>
  new Promise((resolve) => {
    const socket = net.connect({ host: 'localhost', port })
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('error', () => resolve(false))
  })

function run(step) {
  console.log(`\n→ ${step.label}`)
  const { error, status } = spawnSync(step.command, step.args, {
    cwd: step.cwd,
    env: cleanEnv(process.env),
    stdio: 'inherit',
  })

  if (error !== undefined || status !== 0) {
    throw new ReviewError(`Failed: ${step.label}${error === undefined ? '' : ` (${error.message})`}`)
  }
}

/** Stops one of our own servers. Next.js and Storybook take their wrappers (pnpm, sh) with them when they end. */
async function stopHolder({ pid }, { port }) {
  process.kill(pid, 'SIGTERM')

  if (await waitUntilFree(port, 10_000)) {
    return
  }

  try {
    process.kill(pid, 'SIGKILL')
  } catch {
    // It ended in the meantime.
  }

  if (!(await waitUntilFree(port, 3000))) {
    throw new ReviewError(`Could not stop pid ${pid}, which holds port ${port}.`)
  }
}

async function stopOwn(inspected) {
  for (const { own, server } of inspected) {
    for (const holder of own) {
      await stopHolder(holder, server)
      console.log(`Stopped ${server.name} on port ${server.port} (it ran in ${holder.cwd}).`)
    }
  }
}

async function waitUntilFree(port, milliseconds) {
  const deadline = Date.now() + milliseconds

  while (Date.now() < deadline) {
    if (pidsOnPort(port).length === 0) {
      return true
    }

    await sleep(200)
  }

  return false
}

const findMainFolder = () =>
  mainFolderOf(
    capture('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], {
      cwd: repositoryFolder,
      failure: 'This is not a git repository.',
    }),
  )

/** Checks the review folder before anything changes. It gives whether the folder exists already. */
function checkReviewFolder(reviewFolder, worktrees) {
  if (!existsSync(reviewFolder)) {
    return false
  }

  if (!worktrees.some((worktree) => sameFolder(worktree, reviewFolder))) {
    throw new ReviewError(
      `${reviewFolder} exists, but it isn't a worktree of this repository. Remove or rename it. Nothing was changed.`,
    )
  }

  const changes = capture('git', ['status', '--porcelain'], {
    cwd: reviewFolder,
    failure: `Could not read the state of ${reviewFolder}.`,
  })

  if (changes !== '') {
    throw new ReviewError(
      [
        `${reviewFolder} has changes that aren't committed:`,
        ...changes.split('\n').slice(0, 10),
        'Commit or discard them and run this again. Nothing was changed.',
      ].join('\n'),
    )
  }

  return true
}

/** What Storybook lists, or nothing when it doesn't tell. */
async function fetchStorybookEntries() {
  try {
    const response = await fetch(addressOf(storybookServer, '/index.json'), { signal: AbortSignal.timeout(60_000) })
    const { entries } = await response.json()

    return Object.values(entries ?? {})
  } catch {
    return []
  }
}

/**
 * Looks up the branch of a pull request, then gives the commit to show: for a pull request the latest on GitHub, for a
 * branch name the one on this computer when there is one (so commits that aren't pushed show too), else the one on GitHub.
 */
function findBranch(target, mainFolder) {
  let pullRequest
  let branch

  if (target.kind === 'pull-request') {
    const json = capture('gh', ['pr', 'view', String(target.number), '--json', 'headRefName,isCrossRepository,url'], {
      cwd: mainFolder,
      failure: `Could not find pull request #${target.number} with gh.`,
    })
    pullRequest = parsePullRequest(json, target.number)
    branch = pullRequest.branch
  } else {
    branch = target.name
  }

  const localCommit =
    target.kind === 'branch'
      ? tryCapture('git', ['rev-parse', '--verify', '--quiet', `refs/heads/${branch}^{commit}`], mainFolder)
      : undefined
  let fetched = true

  try {
    // The refspec names a branch, so a tag of the same name can't win, and it fills in no local branch.
    capture('git', ['fetch', '--quiet', 'origin', `+refs/heads/${branch}:refs/remotes/origin/${branch}`], {
      cwd: mainFolder,
      failure: `Could not fetch the branch ${branch} from GitHub. Is it pushed, and not deleted after a merge?`,
    })
  } catch (error) {
    // A branch that only exists here, or no network, is fine for a local branch.
    if (localCommit === undefined) {
      throw error
    }

    fetched = false
  }

  const remoteCommit = fetched
    ? tryCapture('git', ['rev-parse', '--verify', '--quiet', `refs/remotes/origin/${branch}^{commit}`], mainFolder)
    : undefined
  const commit =
    localCommit ??
    capture('git', ['rev-parse', '--verify', `refs/remotes/origin/${branch}^{commit}`], {
      cwd: mainFolder,
      failure: `Could not read the commit of ${branch}.`,
    })
  const counts =
    localCommit !== undefined && remoteCommit !== undefined
      ? tryCapture('git', ['rev-list', '--left-right', '--count', `${localCommit}...${remoteCommit}`], mainFolder)
      : undefined
  const source = describeSource({
    comparison: counts === undefined ? undefined : parseAheadBehind(counts),
    local: localCommit !== undefined,
  })

  if (pullRequest === undefined) {
    // The pull request is a bonus here. Without gh, or without a pull request, we show the branch alone.
    try {
      const json = capture(
        'gh',
        ['pr', 'list', '--head', branch, '--state', 'open', '--json', 'number,url,isCrossRepository'],
        { cwd: mainFolder, failure: 'Could not list the pull requests.' },
      )
      pullRequest = parseOpenPullRequest(json)
    } catch {
      pullRequest = undefined
    }
  }

  return { branch, commit, pullRequest, source }
}

/** The files the commit changes compared with main, and every file of the site's app folder at the commit. */
function findChanges(commit, mainFolder) {
  // Best effort: offline, the main we have is good enough, and without any the pages just start at the top.
  tryCapture('git', ['fetch', '--quiet', 'origin', '+refs/heads/main:refs/remotes/origin/main'], mainFolder)

  for (const base of ['refs/remotes/origin/main', 'refs/heads/main']) {
    const diff = tryCapture('git', ['diff', '--name-only', `${base}...${commit}`], mainFolder)

    if (diff !== undefined) {
      const tracked = tryCapture('git', ['ls-tree', '-r', '--name-only', commit, '--', siteAppFolder], mainFolder)

      return { changed: parseFileList(diff), tracked: parseFileList(tracked ?? '') }
    }
  }

  return { changed: [], tracked: [] }
}

async function review(argument) {
  const target = parseTarget(argument)
  const mainFolder = findMainFolder()
  const reviewFolder = reviewFolderOf(mainFolder)

  if (sameFolder(repositoryFolder, reviewFolder)) {
    throw new ReviewError(`This is the review folder. Run pnpm review from the repository: ${mainFolder}`)
  }

  const { branch, commit, pullRequest, source } = findBranch(target, mainFolder)
  const { changed, tracked } = findChanges(commit, mainFolder)
  const worktrees = worktreesOf(mainFolder)
  const worktreeExists = checkReviewFolder(reviewFolder, worktrees)
  const hasEnv = existsSync(path.join(reviewFolder, '.env'))

  if (!hasEnv && !existsSync(path.join(mainFolder, '.env'))) {
    throw new ReviewError(
      'There is no .env in the repository to copy. Copy .env.example to .env first (see the README).',
    )
  }

  const inspected = inspectPorts(worktrees)
  const foreign = inspected.flatMap((found) => found.foreign.map((holder) => ({ holder, server: found.server })))

  if (foreign.length > 0) {
    throw new ReviewError(foreignMessage(foreign))
  }

  await stopOwn(inspected)

  for (const step of buildSteps({ commit, hasEnv, mainFolder, reviewFolder, worktreeExists })) {
    run(step)
  }

  const logFile = path.join(reviewFolder, logName)
  console.log('\n→ Start the site and Storybook')
  const failure = await startServers({ branch, logFile, reviewFolder })

  if (failure !== undefined) {
    // The review folder is a worktree now, so the servers that did start are found by their folder.
    await stopOwn(inspectPorts(worktreesOf(mainFolder)))
    const end = readFileSync(logFile, 'utf8').trimEnd().split('\n').slice(-15).join('\n')

    throw new ReviewError(`${failure}. The end of ${logFile}:\n${end}`)
  }

  const subject = capture('git', ['log', '-1', '--format=%h %s'], {
    cwd: reviewFolder,
    failure: 'Could not read the commit.',
  })
  const addresses = [
    [siteServer.label, addressOf(siteServer, sitePathFor(changed, tracked))],
    [
      storybookServer.label,
      addressOf(storybookServer, storybookPathFor(storybookEntryFor(changed, await fetchStorybookEntries()))),
    ],
  ]
  console.log(`\n${summarise({ addresses, branch, commit: subject, logFile, pullRequest, source })}`)

  // The browser is a convenience: when it doesn't open, the addresses above still work. The opener runs on its own, so
  // an xdg-open that stays until the browser closes doesn't hold up this command, and a missing opener isn't an error.
  for (const [, address] of addresses) {
    const opener = openCommand(process.platform, address)

    if (opener !== undefined) {
      const child = spawn(opener.command, opener.args, { detached: true, stdio: 'ignore' })

      child.once('error', () => {})
      child.unref()
    }
  }
}

/** Starts both servers in the background and waits until they answer. It gives a message when one doesn't. */
async function startServers({ branch, logFile, reviewFolder }) {
  const logFd = openSync(logFile, 'w')
  const started = servers.map((server) => {
    const { args, command, cwd, env } = buildServerCommand(server, { branch, reviewFolder }, process.env)
    const child = spawn(command, args, { cwd, detached: true, env, stdio: ['ignore', logFd, logFd] })
    const state = { failure: undefined, listening: false, server }

    child.once('error', (error) => (state.failure = error.message))
    child.once('exit', (code) => (state.failure ??= `it ended with exit code ${code}`))
    child.unref()

    return state
  })

  closeSync(logFd)

  // Next.js answers within a second or two, Storybook can take half a minute the first time.
  const deadline = Date.now() + 120_000

  while (Date.now() < deadline) {
    await sleep(500)

    for (const state of started) {
      state.listening ||= await isListening(state.server.port)
    }

    const failed = started.find(({ failure }) => failure !== undefined)

    if (failed !== undefined) {
      return `${failed.server.label} stopped: ${failed.failure}`
    }

    if (started.every(({ listening }) => listening)) {
      return undefined
    }
  }

  return `${started.find(({ listening }) => !listening).server.label} did not answer within two minutes`
}

async function stop() {
  const mainFolder = findMainFolder()
  const inspected = inspectPorts(worktreesOf(mainFolder))

  await stopOwn(inspected)

  for (const { foreign, server } of inspected) {
    for (const holder of foreign) {
      console.log(`Left alone: port ${server.port} is held by ${describeHolder(holder)}, which isn't the fansite.`)
    }
  }

  if (inspected.every(({ own }) => own.length === 0)) {
    console.log(
      `Neither the site nor Storybook of the fansite was running on ${servers.map(({ port }) => port).join(' or ')}.`,
    )
  }
}

// `import.meta.main` only exists from Node 24.2, and engines allows 24.0 and 24.1 too, so compare the paths ourselves.
if (process.argv[1] !== undefined && realpathSync(process.argv[1]) === import.meta.filename) {
  try {
    await (process.argv[2] === '--stop' ? stop() : review(process.argv[2]))
  } catch (error) {
    if (!(error instanceof ReviewError)) {
      throw error
    }

    console.error(error.message)
    process.exitCode = error.exitCode
  }
}

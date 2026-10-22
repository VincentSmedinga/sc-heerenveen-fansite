// Puts a pull request or a branch where you can look at it, in one folder next to the repository, and starts the site and
// Storybook for it in the background: the site on port 3000 and Storybook on port 6006, both opened in your browser.
// `pnpm review:stop` stops them.
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

/** The address of a server, on this computer. */
export const addressOf = ({ port }) => `http://localhost:${port}`

/** The command that opens an address in the default browser, or nothing on a system we don't know. */
export function openCommand(platform, address) {
  if (platform === 'darwin') {
    return { args: [address], command: 'open' }
  }

  return platform === 'linux' ? { args: [address], command: 'xdg-open' } : undefined
}

/** What `pnpm review` prints once both servers answer. */
export function summarise({ branch, commit, logFile, pullRequest }) {
  const rows = [
    ['Branch', branch],
    ...(pullRequest === undefined ? [] : [['Pull request', `#${pullRequest.number} ${pullRequest.url}`]]),
    ['Commit', commit],
    ...servers.map((server) => [server.label, addressOf(server)]),
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

/** Looks up the branch of a pull request, then fetches that branch and gives its latest commit on GitHub. */
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

  // The refspec names a branch, so a tag of the same name can't win, and it fills in no local branch.
  capture('git', ['fetch', '--quiet', 'origin', `+refs/heads/${branch}:refs/remotes/origin/${branch}`], {
    cwd: mainFolder,
    failure: `Could not fetch the branch ${branch} from GitHub. Is it pushed, and not deleted after a merge?`,
  })
  const commit = capture('git', ['rev-parse', '--verify', `refs/remotes/origin/${branch}^{commit}`], {
    cwd: mainFolder,
    failure: `Could not read the commit of ${branch}.`,
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

  return { branch, commit, pullRequest }
}

async function review(argument) {
  const target = parseTarget(argument)
  const mainFolder = findMainFolder()
  const reviewFolder = reviewFolderOf(mainFolder)

  if (sameFolder(repositoryFolder, reviewFolder)) {
    throw new ReviewError(`This is the review folder. Run pnpm review from the repository: ${mainFolder}`)
  }

  const { branch, commit, pullRequest } = findBranch(target, mainFolder)
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
  console.log(`\n${summarise({ branch, commit: subject, logFile, pullRequest })}`)

  // The browser is a convenience: when it doesn't open, the addresses above still work.
  for (const server of servers) {
    const opener = openCommand(process.platform, addressOf(server))

    if (opener !== undefined) {
      spawnSync(opener.command, opener.args, { stdio: 'ignore' })
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

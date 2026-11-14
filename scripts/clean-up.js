// Cleans up what sessions leave behind on this computer: worktrees, local and remote branches,
// the databases `fansite_<name>` and a stale slot of the heavy checks. The decision "Eén
// opdracht
// met vaste controles ruimt op, droog tenzij `--yes`" in docs/beslissingen/werkwijze.md
// says why.
//
//   node scripts/clean-up.js         shows what would be removed and what stays, with the
// reason
//   node scripts/clean-up.js --yes   removes it, and prints every removal
//
// Nothing is removed on a guess: when a check fails or something can't be determined (`gh`
// or the
// database can't be reached), that part stays and is listed. "Merged" comes from the pull
// request
// and its head SHA, never from `git branch --merged`, because we merge with squash.
//
// What decides something is `decide`, a function without side effects, exported for the tests.
// What touches the computer is below that, and only runs when this file is started directly.
// The skill `/clean-up` adds the one check a script can't do: that no live session has a folder
// as its working directory.
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import path from 'node:path'
import { parseEnv } from 'node:util'

import { isExpired, lockFolderOf, ownerlessMilliseconds, timeoutOf } from './heavy-lock.js'
import { slugOf } from './worktree-env.js'

/** Databases that are never touched, whatever else is true. */
export const protectedDatabases = ['fansite', 'fansite_acc', 'oldsite_fansitedb']

/** Branches never touched, locally or on `origin`; the prototype is matched by name. */
export const protectedBranches = ['main', 'pr-screenshots']
const prototypeBranch = /prototype/

/** The folder of the review command (`pnpm review`), next to the repository. */
export const reviewFolderName = 'sc-heerenveen-fansite-review'

/** The databases a test or the smoke test makes for one run: `fansite_<kind>_<name>_<hex>`. */
const scratchDatabase = /^fansite_(?:test|smoke)_(?:.+_)?[0-9a-f]{12}$/

/** A scratch database that no table has touched for this long is a leftover (milliseconds). */
export const scratchIdleMilliseconds = 2 * 60 * 60 * 1000

const prScreenshotsFolder = /^pr-screenshots-(\d+)$/

const keep = (kind, subject, reason) => ({ action: 'keep', kind, reason, subject })
const remove = (kind, subject, reason, extra = {}) => ({ action: 'remove', kind, reason, subject, ...extra })

/** Whether a pull request is over: merged or closed. */
const isFinished = (pr) => pr.state === 'MERGED' || pr.state === 'CLOSED'

const stateText = (pr) => (pr.state === 'MERGED' ? 'samengevoegd' : 'gesloten')

/**
 * Everything the script decides, from what it found. `undefined` for something that could not
 * be determined (the pull requests, the databases, the remote branches) keeps that part.
 *
 * state: { now, current, mainFolder, worktrees, diskFolders, localBranches, remoteBranches,
 *          prs, databases, heavyLock, lockTimeoutMilliseconds }
 */
export function decide(state) {
  const items = []

  const worktreeItems = state.worktrees.map((worktree) => ({ item: decideWorktree(worktree, state), worktree }))

  items.push(...worktreeItems.map(({ item }) => item))

  const removedFolders = new Set(
    worktreeItems.filter(({ item }) => item.action === 'remove').map(({ worktree }) => worktree.path),
  )
  const removedBranches = new Set(
    worktreeItems
      .filter(({ item }) => item.action === 'remove')
      .map(({ worktree }) => worktree.branch)
      .filter(Boolean),
  )
  const keptBranches = new Map(
    worktreeItems
      .filter(({ item, worktree }) => item.action === 'keep' && worktree.branch)
      .map(({ worktree }) => [worktree.branch, worktree.path]),
  )

  for (const branch of state.localBranches) {
    if (keptBranches.has(branch.name)) {
      items.push(
        keep(
          'branch',
          branch.name,
          `een worktree die blijft heeft hem uitgecheckt (${path.basename(keptBranches.get(branch.name))})`,
        ),
      )
    } else {
      const item = decideLocalBranch(branch, state)

      items.push(
        removedBranches.has(branch.name) && item.action === 'remove'
          ? { ...item, after: worktreeFolderOf(branch, state) }
          : item,
      )
    }
  }

  if (state.remoteBranches === undefined) {
    items.push(keep('remote-branch', 'origin', 'kan de remote branches niet bepalen (git fetch faalde)'))
  } else {
    items.push(...state.remoteBranches.map((branch) => decideRemoteBranch(branch, state)))
  }

  const keptSlugs = new Set()
  const removedSlugs = new Map()
  const folders = new Set([...state.worktrees.map((worktree) => worktree.path), ...state.diskFolders])

  for (const folder of folders) {
    const slug = slugOf(path.basename(folder))

    if (slug === undefined) {
      continue
    }

    if (removedFolders.has(folder)) {
      removedSlugs.set(slug, folder)
    } else {
      keptSlugs.add(slug)
    }
  }

  // A folder that stays wins over one with the same slug that goes.
  for (const slug of keptSlugs) {
    removedSlugs.delete(slug)
  }

  if (state.databases === undefined) {
    items.push(keep('database', 'fansite_*', 'kan de databases niet bepalen (de server is niet bereikbaar)'))
  } else {
    items.push(...state.databases.map((database) => decideDatabase(database, { ...state, keptSlugs, removedSlugs })))
  }

  const lock = decideHeavyLock(state.heavyLock, state)

  if (lock !== undefined) {
    items.push(lock)
  }

  return items
}

/** What to do with one database `fansite_*`, given the slugs of the folders that stay. */
export function decideDatabase(database, state) {
  const { name } = database

  if (protectedDatabases.includes(name)) {
    return keep('database', name, 'wordt nooit aangeraakt')
  }

  if (!/^fansite_[a-z0-9_]+$/.test(name)) {
    return keep('database', name, 'geen naam van een worktree-database')
  }

  if (scratchDatabase.test(name)) {
    if (database.lastActivity === null || database.lastActivity === undefined) {
      return keep('database', name, 'testdatabase zonder tabellen: leeftijd onbekend')
    }

    const idle = state.now - database.lastActivity

    return idle > scratchIdleMilliseconds
      ? remove('database', name, 'overgebleven testdatabase, al meer dan 2 uur niet gebruikt')
      : keep('database', name, 'testdatabase die kort geleden is gebruikt')
  }

  if (state.keptSlugs.has(name.slice('fansite_'.length))) {
    return keep('database', name, 'de worktree-map bestaat')
  }

  const gone = state.removedSlugs.get(name.slice('fansite_'.length))

  return remove(
    'database',
    name,
    gone === undefined ? 'geen worktree-map met deze naam' : 'hoort bij een worktree die weggaat',
    gone === undefined ? {} : { after: gone },
  )
}

/** What to do with the slot of the heavy checks: only an expired or orphaned one goes. */
export function decideHeavyLock(lock, state) {
  if (lock === undefined || !lock.exists) {
    return undefined
  }

  if (lock.owner === undefined) {
    return state.now - lock.modifiedAt > ownerlessMilliseconds
      ? remove('heavy-lock', lock.folder, 'het slot heeft geen eigenaar')
      : keep('heavy-lock', lock.folder, 'het slot is net gemaakt')
  }

  if (!lock.ownerAlive) {
    return remove('heavy-lock', lock.folder, `het proces ${lock.owner.pid} van het slot bestaat niet meer`)
  }

  return isExpired({ now: state.now, owner: lock.owner, timeoutMilliseconds: state.lockTimeoutMilliseconds })
    ? remove('heavy-lock', lock.folder, 'het slot is te lang vastgehouden')
    : keep('heavy-lock', lock.folder, `een draaiende controle (proces ${lock.owner.pid}) houdt het slot`)
}

/** What to do with one local branch that no kept worktree has checked out. */
export function decideLocalBranch(branch, state) {
  const { name, tip } = branch

  if (protectedBranches.includes(name) || prototypeBranch.test(name)) {
    return keep('branch', name, 'wordt nooit aangeraakt')
  }

  if (branch.inMain === true) {
    return remove('branch', name, 'de tip zit in main')
  }

  const verdict = pullRequestVerdict(state.prs, tip)

  if (verdict.verdict === 'finished') {
    return remove(
      'branch',
      name,
      `de tip is de kop van pull request #${verdict.pr.number}, die is ${stateText(verdict.pr)}`,
    )
  }

  if (verdict.verdict === 'open') {
    return keep('branch', name, `pull request #${verdict.pr.number} is nog open`)
  }

  if (verdict.verdict === 'unknown') {
    return keep('branch', name, 'kan de pull requests niet opvragen (gh)')
  }

  const other = state.prs.find((pr) => pr.headRefName === name)

  return keep(
    'branch',
    name,
    other === undefined
      ? 'geen pull request'
      : `commits die nergens anders staan (de tip is niet de kop van pull request #${other.number})`,
  )
}

/** What to do with one branch on `origin`. */
export function decideRemoteBranch(branch, state) {
  const { name, tip } = branch

  if (protectedBranches.includes(name) || name === 'HEAD' || prototypeBranch.test(name)) {
    return keep('remote-branch', name, 'wordt nooit aangeraakt')
  }

  const verdict = pullRequestVerdict(state.prs, tip)

  if (verdict.verdict === 'finished') {
    return remove(
      'remote-branch',
      name,
      `de tip is de kop van pull request #${verdict.pr.number}, die is ${stateText(verdict.pr)}`,
      { tip },
    )
  }

  if (verdict.verdict === 'open') {
    return keep('remote-branch', name, `pull request #${verdict.pr.number} is nog open`)
  }

  if (verdict.verdict === 'unknown') {
    return keep('remote-branch', name, 'kan de pull requests niet opvragen (gh)')
  }

  return keep('remote-branch', name, 'geen samengevoegde of gesloten pull request met deze tip')
}

/** What to do with one worktree, and the reason. */
export function decideWorktree(worktree, state) {
  const name = path.basename(worktree.path)
  const subject = worktree.path
  const { current, mainFolder, prs } = state

  if (worktree.path === mainFolder) {
    return keep('worktree', subject, 'de hoofdmap van de repository')
  }

  if (worktree.path === current) {
    return keep('worktree', subject, 'de huidige worktree')
  }

  if ((state.keepFolders ?? []).includes(worktree.path)) {
    return keep('worktree', subject, 'een levende sessie werkt in de map (--keep)')
  }

  if (name === reviewFolderName) {
    return keep('worktree', subject, 'de reviewmap van de projecteigenaar')
  }

  if (prototypeBranch.test(worktree.branch ?? '') || name.endsWith('-prototype')) {
    return keep('worktree', subject, 'het prototype')
  }

  if (worktree.locked) {
    return keep('worktree', subject, 'vergrendeld')
  }

  if (worktree.prunable) {
    return keep('worktree', subject, 'de map bestaat niet meer: git worktree prune ruimt dat op')
  }

  if (worktree.dirty === undefined) {
    return keep('worktree', subject, 'kan niet bepalen of er wijzigingen zijn')
  }

  if (worktree.dirty) {
    return keep('worktree', subject, 'wijzigingen of untracked bestanden die nergens anders staan')
  }

  if (worktree.busy === undefined) {
    return keep('worktree', subject, 'kan niet bepalen of een proces in de map werkt')
  }

  if (worktree.busy) {
    return keep('worktree', subject, 'een proces werkt in de map')
  }

  const screenshots = prScreenshotsFolder.exec(name)

  if (screenshots !== null) {
    if (prs === undefined) {
      return keep('worktree', subject, 'kan de pull request niet opvragen (gh)')
    }

    const pr = prs.find((candidate) => candidate.number === Number(screenshots[1]))

    return pr !== undefined && isFinished(pr)
      ? remove('worktree', subject, `de pull request is ${stateText(pr)}`)
      : keep('worktree', subject, 'de pull request is nog open, of onbekend')
  }

  const verdict = pullRequestVerdict(prs, worktree.head)

  if (verdict.verdict === 'finished') {
    return remove(
      'worktree',
      subject,
      `HEAD is de kop van pull request #${verdict.pr.number}, die is ${stateText(verdict.pr)}`,
    )
  }

  if (verdict.verdict === 'open') {
    return keep('worktree', subject, `pull request #${verdict.pr.number} is nog open`)
  }

  if (worktree.onOrigin === true) {
    return remove('worktree', subject, 'HEAD staat op origin')
  }

  if (worktree.onOrigin === undefined) {
    return keep('worktree', subject, 'kan niet bepalen of HEAD op origin staat')
  }

  return keep('worktree', subject, 'commits die nergens anders staan')
}

/**
 * The verdict on a commit by its pull requests: `finished` (with the pull request) when one
 * with this head is merged or closed and none with it is open, `open`, `none`, or `unknown`.
 */
export function pullRequestVerdict(prs, sha) {
  const found = pullRequestsWithHead(prs, sha)

  if (found === undefined) {
    return { verdict: 'unknown' }
  }

  const open = found.find((pr) => pr.state === 'OPEN')

  if (open !== undefined) {
    return { pr: open, verdict: 'open' }
  }

  const finished = found.find(isFinished)

  return finished === undefined ? { verdict: 'none' } : { pr: finished, verdict: 'finished' }
}

/** The pull requests whose head is `sha`, or undefined when we don't know the pull requests. */
function pullRequestsWithHead(prs, sha) {
  return prs === undefined ? undefined : prs.filter((pr) => pr.headRefOid === sha)
}

/** The folder of the worktree that has `branch` checked out, for the order of the removals. */
function worktreeFolderOf(branch, state) {
  return state.worktrees.find((worktree) => worktree.branch === branch.name)?.path
}

const kindTitles = {
  branch: 'Lokale branches',
  database: 'Databases',
  'heavy-lock': 'Slot van de zware controles',
  'remote-branch': 'Branches op origin',
  worktree: 'Worktrees',
}

/** The report of a dry run: per part what would go and what stays, with the reason. */
export function describePlan(items) {
  const lines = []

  for (const [kind, title] of Object.entries(kindTitles)) {
    const ofKind = items.filter((item) => item.kind === kind)

    if (ofKind.length === 0) {
      continue
    }

    lines.push(`${title}`)

    for (const action of ['remove', 'keep']) {
      const group = ofKind.filter((item) => item.action === action)
      const label = action === 'remove' ? 'weg' : 'blijft'
      const byReason = Map.groupBy(group, (item) => item.reason)

      for (const [reason, entries] of byReason) {
        lines.push(
          entries.length > 3
            ? `  ${label} (${entries.length}) - ${reason}: ${entries.map((entry) => entry.subject).join(', ')}`
            : entries.map((entry) => `  ${label}: ${entry.subject} - ${reason}`).join('\n'),
        )
      }
    }
  }

  const removing = items.filter((item) => item.action === 'remove').length

  lines.push(
    '',
    removing === 0
      ? 'Niets om te verwijderen.'
      : `${removing} onderdelen kunnen weg. Draai met --yes om ze te verwijderen.`,
  )

  return lines.join('\n')
}

/**
 * Carries out the removals, in an order that works: worktrees, then their branches, remote
 * branches, databases and the slot. A removal that depends on a worktree (`after`) is skipped
 * when that worktree could not be removed. A failure stays in the result and the rest goes on.
 * `actions` has one function per kind: it does the removal and throws when it fails.
 */
export async function execute(items, actions, report = () => {}) {
  const order = ['worktree', 'branch', 'remote-branch', 'database', 'heavy-lock']
  const failed = new Set()
  const results = []

  for (const kind of order) {
    for (const item of items.filter((entry) => entry.kind === kind && entry.action === 'remove')) {
      if (item.after !== undefined && failed.has(item.after)) {
        results.push({ ...item, detail: 'de worktree is niet verwijderd', outcome: 'skipped' })
        report(results.at(-1))
        continue
      }

      try {
        await actions[kind](item)
        results.push({ ...item, outcome: 'removed' })
      } catch (error) {
        failed.add(item.subject)
        results.push({ ...item, detail: error instanceof Error ? error.message : String(error), outcome: 'failed' })
      }

      report(results.at(-1))
    }
  }

  return results
}

/** Reads the arguments of the command line. */
export function parseArguments(argv) {
  const keepFolders = []
  let yes = false

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]

    if (argument === '--yes') {
      yes = true
    } else if (argument === '--keep') {
      const folder = argv[(index += 1)]

      if (folder === undefined || folder.startsWith('--')) {
        throw new Error('--keep takes the folder of a worktree.')
      }

      keepFolders.push(path.resolve(folder))
    } else {
      throw new Error(
        `Unknown argument "${argument}". Use no argument to list, --yes to remove, and --keep <folder> for a worktree that stays.`,
      )
    }
  }

  return { keepFolders, yes }
}

// Below here the computer is touched. Nothing runs when a test imports this file.

/** The output of a command, or undefined when it fails. */
function attempt(run) {
  try {
    return run()
  } catch {
    return undefined
  }
}

function databaseUrl(root) {
  if ((process.env['DATABASE_URL'] ?? '') !== '') {
    return process.env['DATABASE_URL']
  }

  const file = path.join(root, '.env')

  return (
    (existsSync(file) ? parseEnv(readFileSync(file, 'utf8'))['DATABASE_URL'] : undefined) ??
    'mysql://root@127.0.0.1:3306/fansite'
  )
}

/**
 * Everything the decisions need, read from this computer. Nothing is changed here, except what
 * `git fetch --prune` does to the remote-tracking branches.
 */
async function gather(root) {
  const now = Date.now()
  const listed = parseWorktrees(git(['worktree', 'list', '--porcelain'], { cwd: root }))
  const mainFolder = listed[0].path
  const current = git(['rev-parse', '--show-toplevel'], { cwd: root }).trim()
  const fetched = attempt(() => git(['fetch', '--prune', 'origin'], { cwd: root })) !== undefined
  const directories = workingDirectories()

  const prsText = attempt(() =>
    execFileSync(
      'gh',
      ['pr', 'list', '--state', 'all', '--limit', '5000', '--json', 'number,state,headRefName,headRefOid'],
      {
        cwd: root,
        encoding: 'utf8',
        maxBuffer: 256 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    ),
  )
  const parsedPrs = prsText === undefined ? undefined : attempt(() => JSON.parse(prsText))
  // A list that hit the limit may be missing pull requests, so it is not trusted.
  const prs = Array.isArray(parsedPrs) && parsedPrs.length < 5000 ? parsedPrs : undefined

  const worktrees = listed.map((worktree) => {
    const status = worktree.prunable
      ? undefined
      : attempt(() => git(['status', '--porcelain', '--untracked-files=all'], { cwd: worktree.path }))
    const containing = fetched
      ? attempt(() =>
          git(['for-each-ref', '--contains', worktree.head, '--format=%(refname)', 'refs/remotes/origin'], {
            cwd: root,
          }),
        )
      : undefined

    return {
      ...worktree,
      busy: directories?.some((directory) => directory === worktree.path || directory.startsWith(`${worktree.path}/`)),
      dirty: status === undefined ? undefined : status.trim() !== '',
      onOrigin: containing === undefined ? undefined : containing.trim() !== '',
    }
  })

  const merged = new Set(
    (
      attempt(() =>
        git(['for-each-ref', '--merged=origin/main', '--format=%(refname:short)', 'refs/heads'], { cwd: root }),
      ) ?? ''
    )
      .split('\n')
      .filter(Boolean),
  )
  const localBranches = git(['for-each-ref', '--format=%(refname:short)\t%(objectname)', 'refs/heads'], { cwd: root })
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [name, tip] = line.split('\t')

      return { inMain: fetched ? merged.has(name) : undefined, name, tip }
    })
  const remoteBranches = fetched
    ? git(['for-each-ref', '--format=%(refname:lstrip=3)\t%(objectname)', 'refs/remotes/origin'], { cwd: root })
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const [name, tip] = line.split('\t')

          return { name, tip }
        })
    : undefined

  const worktreesFolder = path.join(mainFolder, '.claude', 'worktrees')
  const diskFolders = existsSync(worktreesFolder)
    ? readdirSync(worktreesFolder)
        .map((name) => path.join(worktreesFolder, name))
        .filter((folder) => statSync(folder).isDirectory())
    : []

  const lockFolder = lockFolderOf(process.env)
  const lockExists = existsSync(lockFolder)
  let owner

  try {
    owner = JSON.parse(readFileSync(path.join(lockFolder, 'owner.json'), 'utf8'))
  } catch {
    owner = undefined
  }

  const heavyLock = {
    exists: lockExists,
    folder: lockFolder,
    modifiedAt: lockExists ? statSync(lockFolder).mtimeMs : now,
    owner,
    ownerAlive: owner === undefined ? false : (attempt(() => process.kill(owner.pid, 0) === true) ?? false),
  }

  return {
    current,
    databases: await readDatabases(databaseUrl(root)),
    diskFolders,
    heavyLock,
    localBranches,
    lockTimeoutMilliseconds: timeoutOf(process.env),
    mainFolder,
    now,
    prs,
    remoteBranches,
    worktrees,
  }
}

function git(args, options = {}) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  })
}

async function main(argv) {
  const { keepFolders, yes } = parseArguments(argv)
  const root = path.resolve(import.meta.dirname, '..')
  const state = { ...(await gather(root)), keepFolders }
  const items = decide(state)

  console.log(describePlan(items))

  if (!yes) {
    return 0
  }

  const { actions, server } = await removals(root, state)
  let failures = 0

  try {
    console.log('\nVerwijderd:')

    await execute(items, actions, (result) => {
      const line = `${result.kind} ${result.subject}`

      if (result.outcome === 'removed') console.log(`  verwijderd: ${line}`)
      else if (result.outcome === 'skipped') console.log(`  overgeslagen: ${line} (${result.detail})`)
      else {
        failures += 1
        console.log(`  MISLUKT: ${line} (${result.detail})`)
      }
    })
  } finally {
    await server?.end()
  }

  return failures > 0 ? 1 : 0
}

function parseWorktrees(output) {
  return output
    .split('\n\n')
    .filter((block) => block.trim() !== '')
    .map((block) => {
      const worktree = { locked: false, prunable: false }

      for (const line of block.split('\n')) {
        const [key, ...rest] = line.split(' ')
        const value = rest.join(' ')

        if (key === 'worktree') worktree.path = value
        else if (key === 'HEAD') worktree.head = value
        else if (key === 'branch') worktree.branch = value.replace(/^refs\/heads\//, '')
        else if (key === 'locked') worktree.locked = true
        else if (key === 'prunable') worktree.prunable = true
      }

      return worktree
    })
}

/**
 * The databases `fansite_*` with when a table in them last changed, or undefined when the
 * server is not there.
 */
async function readDatabases(url) {
  let server

  try {
    const { connectToServer } = await import('../packages/db/src/test-database.ts')

    server = await connectToServer(url)

    const [rows] = await server.query(
      'SELECT s.schema_name AS name, UNIX_TIMESTAMP(MAX(COALESCE(t.update_time, t.create_time))) * 1000 AS lastActivity ' +
        'FROM information_schema.schemata s LEFT JOIN information_schema.tables t ON t.table_schema = s.schema_name ' +
        "WHERE s.schema_name LIKE 'fansite\\_%' GROUP BY s.schema_name",
    )

    return rows.map((row) => ({
      lastActivity: row.lastActivity === null ? null : Number(row.lastActivity),
      name: row.name,
    }))
  } catch {
    return undefined
  } finally {
    await server?.end()
  }
}

/** The real removals. Each one checks its own name again before it removes anything. */
async function removals(root, state) {
  const url = databaseUrl(root)
  const { connectToServer } = await import('../packages/db/src/test-database.ts')
  const server = await connectToServer(url).catch(() => undefined)

  return {
    actions: {
      branch: (item) => {
        if (protectedBranches.includes(item.subject) || prototypeBranch.test(item.subject))
          throw new Error('beschermde branch')
        git(['branch', '-D', item.subject], { cwd: root })
      },
      database: (item) => {
        if (protectedDatabases.includes(item.subject) || !/^fansite_[a-z0-9_]+$/.test(item.subject))
          throw new Error('beschermde database')
        if (server === undefined) throw new Error('de server is niet bereikbaar')

        return server.query('DROP DATABASE IF EXISTS ??', [item.subject])
      },
      'heavy-lock': (item) => rmSync(item.subject, { force: true, recursive: true }),
      'remote-branch': (item) => {
        if (protectedBranches.includes(item.subject) || prototypeBranch.test(item.subject))
          throw new Error('beschermde branch')
        // Only removes the branch when it still is at the tip that was judged.
        git(['push', `--force-with-lease=${item.subject}:${item.tip}`, 'origin', `:refs/heads/${item.subject}`], {
          cwd: root,
        })
      },
      worktree: (item) => {
        if (item.subject === state.current || item.subject === state.mainFolder) throw new Error('beschermde map')
        git(['worktree', 'remove', item.subject], { cwd: root })
      },
    },
    server,
  }
}

/** The working directories of all processes, from lsof, or undefined when lsof is not there. */
function workingDirectories() {
  const output = attempt(() =>
    execFileSync('lsof', ['-a', '-d', 'cwd', '-Fn'], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    }),
  )

  return output === undefined
    ? undefined
    : output
        .split('\n')
        .filter((line) => line.startsWith('n'))
        .map((line) => line.slice(1))
}

if (import.meta.main) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (error) => {
      console.error(error instanceof Error ? error.message : error)
      process.exit(1)
    },
  )
}

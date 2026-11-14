import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  decide,
  decideDatabase,
  decideHeavyLock,
  describePlan,
  execute,
  parseArguments,
  protectedBranches,
  protectedDatabases,
  scratchIdleMilliseconds,
} from './clean-up.js'

const main = '/work/repo'
const folder = (name) => `${main}/.claude/worktrees/${name}`
const now = 1_000_000_000_000
const hour = 60 * 60 * 1000

/** A state where nothing is to be removed, to change one thing at a time. */
function state(overrides = {}) {
  return {
    current: folder('current'),
    databases: [],
    diskFolders: [],
    heavyLock: undefined,
    localBranches: [],
    lockTimeoutMilliseconds: 30 * 60_000,
    mainFolder: main,
    now,
    prs: [],
    remoteBranches: [],
    worktrees: [{ branch: 'main', head: 'aaa', path: main }],
    ...overrides,
  }
}

const worktree = (name, overrides = {}) => ({
  branch: `feat/${name}`,
  busy: false,
  dirty: false,
  head: `sha-${name}`,
  onOrigin: false,
  path: folder(name),
  ...overrides,
})

const pr = (number, state, headRefOid, headRefName = `feat/${number}`) => ({ headRefName, headRefOid, number, state })
const find = (items, kind, subject) => items.find((item) => item.kind === kind && item.subject === subject)

test('a worktree goes when nothing is unsaved, its HEAD is the head of a merged pull request and nothing works in it', () => {
  const items = decide(state({ prs: [pr(7, 'MERGED', 'sha-a')], worktrees: [worktree('a', { head: 'sha-a' })] }))

  assert.equal(find(items, 'worktree', folder('a')).action, 'remove')
  assert.match(find(items, 'worktree', folder('a')).reason, /pull request #7.*samengevoegd/)
})

test('a worktree whose pull request is closed goes too', () => {
  const items = decide(state({ prs: [pr(8, 'CLOSED', 'sha-a')], worktrees: [worktree('a', { head: 'sha-a' })] }))

  assert.match(find(items, 'worktree', folder('a')).reason, /gesloten/)
  assert.equal(find(items, 'worktree', folder('a')).action, 'remove')
})

test('a worktree goes when its HEAD is on origin, and stays when it holds commits that are nowhere else', () => {
  const items = decide(
    state({ worktrees: [worktree('pushed', { onOrigin: true }), worktree('lonely', { onOrigin: false })] }),
  )

  assert.equal(find(items, 'worktree', folder('pushed')).action, 'remove')
  assert.equal(find(items, 'worktree', folder('lonely')).action, 'keep')
  assert.match(find(items, 'worktree', folder('lonely')).reason, /nergens anders/)
})

test('a worktree stays with changes, with untracked files, or when a process works in it', () => {
  const items = decide(
    state({
      worktrees: [worktree('dirty', { dirty: true, onOrigin: true }), worktree('busy', { busy: true, onOrigin: true })],
    }),
  )

  assert.equal(find(items, 'worktree', folder('dirty')).action, 'keep')
  assert.match(find(items, 'worktree', folder('dirty')).reason, /untracked/)
  assert.match(find(items, 'worktree', folder('busy')).reason, /proces/)
})

test('a worktree with a HEAD other than the pull request, or an open pull request, stays', () => {
  const items = decide(
    state({
      prs: [pr(7, 'MERGED', 'sha-old'), pr(9, 'OPEN', 'sha-b')],
      worktrees: [worktree('moved', { head: 'sha-new' }), worktree('open', { head: 'sha-b', onOrigin: true })],
    }),
  )

  // The folder was reused: its HEAD is not the head of the merged pull request, and it is
  // not on origin.
  assert.equal(find(items, 'worktree', folder('moved')).action, 'keep')
  assert.match(find(items, 'worktree', folder('open')).reason, /nog open/)
})

test('a worktree stays when something cannot be determined', () => {
  const unknown = [
    worktree('no-status', { dirty: undefined, onOrigin: true }),
    worktree('no-lsof', { busy: undefined, onOrigin: true }),
    worktree('no-origin', { onOrigin: undefined }),
  ]
  const items = decide(state({ worktrees: unknown }))

  for (const entry of unknown) {
    assert.equal(find(items, 'worktree', entry.path).action, 'keep')
    assert.match(find(items, 'worktree', entry.path).reason, /kan niet bepalen/)
  }
})

test('the main folder, the current worktree, the review folder and the prototype are never touched', () => {
  const items = decide(
    state({
      worktrees: [
        { branch: 'main', head: 'a', path: main },
        worktree('current', { onOrigin: true }),
        { ...worktree('sc-heerenveen-fansite-review', { onOrigin: true }), path: '/work/sc-heerenveen-fansite-review' },
        {
          ...worktree('proto', { onOrigin: true }),
          branch: 'reference/prototype-import',
          path: '/work/other-prototype',
        },
        worktree('locked', { locked: true, onOrigin: true }),
      ],
    }),
  )

  assert.deepEqual(
    items.filter((item) => item.kind === 'worktree').map((item) => item.action),
    ['keep', 'keep', 'keep', 'keep', 'keep'],
  )
})

test('the folder of a pull request with screenshots goes when the pull request is over, and stays while it is open', () => {
  const items = decide(
    state({
      prs: [pr(11, 'MERGED', 'x'), pr(12, 'OPEN', 'y')],
      worktrees: [
        { ...worktree('pr-screenshots-11', { branch: undefined, onOrigin: true }) },
        { ...worktree('pr-screenshots-12', { branch: undefined, onOrigin: true }) },
      ],
    }),
  )

  assert.equal(find(items, 'worktree', folder('pr-screenshots-11')).action, 'remove')
  assert.equal(find(items, 'worktree', folder('pr-screenshots-12')).action, 'keep')
})

test('a branch goes when its tip is the head of a squash-merged pull request, although its commits are not in main', () => {
  const items = decide(
    state({
      localBranches: [{ inMain: false, name: 'feat/1-a', tip: 'sha-1' }],
      prs: [pr(1, 'MERGED', 'sha-1', 'feat/1-a')],
    }),
  )

  assert.equal(find(items, 'branch', 'feat/1-a').action, 'remove')
})

test('a branch goes when its tip is in main', () => {
  const items = decide(state({ localBranches: [{ inMain: true, name: 'claude/x', tip: 'main-sha' }] }))

  assert.equal(find(items, 'branch', 'claude/x').action, 'remove')
})

test('a branch without a pull request stays, with the reason', () => {
  const items = decide(state({ localBranches: [{ inMain: false, name: 'feat/none', tip: 'sha-n' }] }))

  assert.equal(find(items, 'branch', 'feat/none').action, 'keep')
  assert.equal(find(items, 'branch', 'feat/none').reason, 'geen pull request')
})

test('a branch with commits after its merged pull request stays', () => {
  const items = decide(
    state({
      localBranches: [{ inMain: false, name: 'feat/2-b', tip: 'sha-after' }],
      prs: [pr(2, 'MERGED', 'sha-before', 'feat/2-b')],
    }),
  )

  assert.equal(find(items, 'branch', 'feat/2-b').action, 'keep')
  assert.match(find(items, 'branch', 'feat/2-b').reason, /commits die nergens anders staan/)
})

test('a branch with an open pull request stays, also when an older one with the same head was merged', () => {
  const items = decide(
    state({
      localBranches: [{ inMain: false, name: 'feat/3-c', tip: 'sha-3' }],
      prs: [pr(3, 'MERGED', 'sha-3', 'feat/3-c'), pr(4, 'OPEN', 'sha-3', 'feat/3-c')],
    }),
  )

  assert.equal(find(items, 'branch', 'feat/3-c').action, 'keep')
})

test('a branch that a worktree that stays has checked out is kept, and one that goes can follow it', () => {
  const items = decide(
    state({
      localBranches: [
        { inMain: true, name: 'feat/live', tip: 'x' },
        { inMain: true, name: 'feat/gone', tip: 'y' },
      ],
      worktrees: [
        { branch: 'main', head: 'a', path: main },
        worktree('live', { branch: 'feat/live', dirty: true }),
        worktree('gone', { branch: 'feat/gone', onOrigin: true }),
      ],
    }),
  )

  assert.equal(find(items, 'branch', 'feat/live').action, 'keep')
  assert.equal(find(items, 'branch', 'feat/gone').action, 'remove')
  assert.equal(find(items, 'branch', 'feat/gone').after, folder('gone'))
})

test('main, pr-screenshots and the prototype branch are never removed, locally or on origin', () => {
  const names = [...protectedBranches, 'reference/prototype-import']
  const items = decide(
    state({
      localBranches: names.map((name) => ({ inMain: true, name, tip: `tip-${name}` })),
      prs: names.map((name, index) => pr(index + 1, 'MERGED', `tip-${name}`, name)),
      remoteBranches: [...names, 'HEAD'].map((name) => ({ name, tip: `tip-${name}` })),
    }),
  )

  for (const item of items.filter((entry) => entry.kind === 'branch' || entry.kind === 'remote-branch')) {
    assert.equal(item.action, 'keep', item.subject)
  }
})

test('a remote branch goes when its tip is the head of a merged or closed pull request, and keeps its tip for the check', () => {
  const items = decide(
    state({
      prs: [pr(1, 'MERGED', 'r1', 'feat/m'), pr(2, 'CLOSED', 'r2', 'feat/c'), pr(3, 'OPEN', 'r3', 'feat/o')],
      remoteBranches: [
        { name: 'feat/m', tip: 'r1' },
        { name: 'feat/c', tip: 'r2' },
        { name: 'feat/o', tip: 'r3' },
        { name: 'feat/after', tip: 'r-new' },
        { name: 'feat/none', tip: 'r-none' },
      ],
    }),
  )

  assert.equal(find(items, 'remote-branch', 'feat/m').action, 'remove')
  assert.equal(find(items, 'remote-branch', 'feat/m').tip, 'r1')
  assert.equal(find(items, 'remote-branch', 'feat/c').action, 'remove')
  for (const name of ['feat/o', 'feat/after', 'feat/none']) {
    assert.equal(find(items, 'remote-branch', name).action, 'keep', name)
  }
})

test('when gh cannot be reached, no branch or worktree goes on a pull request', () => {
  const items = decide(
    state({
      localBranches: [{ inMain: false, name: 'feat/x', tip: 's' }],
      prs: undefined,
      remoteBranches: [{ name: 'feat/x', tip: 's' }],
      worktrees: [worktree('w', { head: 's', onOrigin: false })],
    }),
  )

  assert.equal(find(items, 'branch', 'feat/x').action, 'keep')
  assert.equal(find(items, 'remote-branch', 'feat/x').action, 'keep')
  assert.equal(find(items, 'worktree', folder('w')).action, 'keep')
  assert.match(find(items, 'branch', 'feat/x').reason, /gh/)
})

test('when the remote branches cannot be determined, they stay and are listed', () => {
  const items = decide(state({ remoteBranches: undefined }))

  assert.equal(items.find((item) => item.kind === 'remote-branch').action, 'keep')
})

test('a database goes when no worktree folder has its name, and stays while the folder exists', () => {
  const items = decide(
    state({
      databases: [{ name: 'fansite_old_one' }, { name: 'fansite_current' }, { name: 'fansite_on_disk' }],
      diskFolders: [folder('on_disk')],
      worktrees: [{ branch: 'main', head: 'a', path: main }, worktree('current')],
    }),
  )

  assert.equal(find(items, 'database', 'fansite_old_one').action, 'remove')
  assert.equal(find(items, 'database', 'fansite_current').action, 'keep')
  assert.equal(find(items, 'database', 'fansite_on_disk').action, 'keep')
})

test('the database of a worktree that goes follows it, and waits for it', () => {
  const items = decide(
    state({
      databases: [{ name: 'fansite_gone' }],
      worktrees: [{ branch: 'main', head: 'a', path: main }, worktree('gone', { onOrigin: true })],
    }),
  )

  assert.equal(find(items, 'database', 'fansite_gone').action, 'remove')
  assert.equal(find(items, 'database', 'fansite_gone').after, folder('gone'))
})

test('a name with a dash or capitals in the folder gives the database the slug of worktree-env', () => {
  const items = decide(
    state({
      databases: [{ name: 'fansite_feat_1_a_b' }],
      worktrees: [{ branch: 'main', head: 'a', path: main }, worktree('Feat-1-A-B', { dirty: true })],
    }),
  )

  assert.equal(find(items, 'database', 'fansite_feat_1_a_b').action, 'keep')
})

test('fansite, fansite_acc and oldsite_fansitedb are never dropped, whatever else is true', () => {
  const items = decide(state({ databases: protectedDatabases.map((name) => ({ lastActivity: 0, name })) }))

  for (const name of protectedDatabases) {
    assert.notEqual(find(items, 'database', name)?.action, 'remove', name)
  }

  assert.equal(find(items, 'database', 'fansite_acc').action, 'keep')
})

test('a scratch database goes only when no table has changed for two hours', () => {
  const name = 'fansite_test_feat_x_0123456789ab'
  const decideAt = (lastActivity) =>
    decideDatabase({ lastActivity, name }, { keptSlugs: new Set(), now, removedSlugs: new Map() })

  assert.equal(decideAt(now - scratchIdleMilliseconds - hour).action, 'remove')
  assert.equal(decideAt(now - hour).action, 'keep')
  assert.equal(decideAt(null).action, 'keep')
})

test('when the database server cannot be reached, the databases stay and are listed', () => {
  const items = decide(state({ databases: undefined }))
  const entry = items.find((item) => item.kind === 'database')

  assert.equal(entry.action, 'keep')
  assert.match(entry.reason, /niet bereikbaar/)
})

test('the slot of the heavy checks goes only when it is orphaned or expired', () => {
  const lock = (overrides) => ({
    exists: true,
    folder: '/tmp/slot',
    modifiedAt: now - hour,
    owner: undefined,
    ownerAlive: false,
    ...overrides,
  })
  const at = (value) => decideHeavyLock(value, { lockTimeoutMilliseconds: 30 * 60_000, now })

  assert.equal(at(undefined), undefined)
  assert.equal(at(lock({ exists: false })), undefined)
  assert.equal(at(lock({})).action, 'remove')
  assert.equal(at(lock({ modifiedAt: now - 1000 })).action, 'keep')
  assert.equal(at(lock({ owner: { pid: 1, startedAt: now - 1000 }, ownerAlive: false })).action, 'remove')
  assert.equal(at(lock({ owner: { pid: 1, startedAt: now - 1000 }, ownerAlive: true })).action, 'keep')
  assert.equal(at(lock({ owner: { pid: 1, startedAt: now - hour }, ownerAlive: true })).action, 'remove')
})

test('the plan lists what goes and what stays, per part, with the reasons', () => {
  const text = describePlan(
    decide(
      state({
        localBranches: [
          { inMain: false, name: 'feat/none', tip: 's' },
          { inMain: true, name: 'claude/x', tip: 'm' },
        ],
      }),
    ),
  )

  assert.match(text, /Lokale branches/)
  assert.match(text, /weg: claude\/x - de tip zit in main/)
  assert.match(text, /blijft: feat\/none - geen pull request/)
  assert.match(text, /Draai met --yes/)
})

test('without a flag nothing is removed; --yes is the only flag', () => {
  assert.deepEqual(parseArguments([]), { keepFolders: [], yes: false })
  assert.deepEqual(parseArguments(['--yes']), { keepFolders: [], yes: true })
  assert.deepEqual(parseArguments(['--yes', '--keep', '/w/a', '--keep', '/w/b']), {
    keepFolders: ['/w/a', '/w/b'],
    yes: true,
  })
  assert.throws(() => parseArguments(['--keep']), /takes the folder/)
  assert.throws(() => parseArguments(['--force']), /Unknown argument/)
})

test('execute removes in order, skips what depends on a failed worktree and carries on after a failure', async () => {
  const items = [
    { action: 'remove', after: '/w/a', kind: 'database', subject: 'fansite_a' },
    { action: 'remove', after: '/w/a', kind: 'branch', subject: 'feat/a' },
    { action: 'remove', kind: 'worktree', subject: '/w/a' },
    { action: 'remove', kind: 'worktree', subject: '/w/b' },
    { action: 'keep', kind: 'worktree', subject: '/w/keep' },
  ]
  const done = []
  const results = await execute(items, {
    branch: (item) => done.push(item.subject),
    database: (item) => done.push(item.subject),
    'heavy-lock': () => {},
    'remote-branch': () => {},
    worktree: (item) => {
      if (item.subject === '/w/a') throw new Error('contains modified files')
      done.push(item.subject)
    },
  })

  assert.deepEqual(done, ['/w/b'])
  assert.deepEqual(
    results.map((result) => [result.subject, result.outcome]),
    [
      ['/w/a', 'failed'],
      ['/w/b', 'removed'],
      ['feat/a', 'skipped'],
      ['fansite_a', 'skipped'],
    ],
  )
})

test('a worktree named with --keep stays, although everything else says it can go', () => {
  const items = decide(state({ keepFolders: [folder('live')], worktrees: [worktree('live', { onOrigin: true })] }))

  assert.equal(find(items, 'worktree', folder('live')).action, 'keep')
  assert.match(find(items, 'worktree', folder('live')).reason, /levende sessie/)
})

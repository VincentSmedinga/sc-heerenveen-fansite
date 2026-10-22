// Tests the parts of `pnpm review` that decide something and have no side effects. What touches git, gh, docker, lsof and
// the servers is tried by hand (see the pull request).
import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  addressOf,
  buildServerCommand,
  buildSteps,
  cleanEnv,
  foreignMessage,
  isFansiteServer,
  mainFolderOf,
  openCommand,
  parseCwd,
  parseOpenPullRequest,
  parsePids,
  parsePullRequest,
  parseTarget,
  parseWorktrees,
  ReviewError,
  reviewFolderOf,
  servers,
  summarise,
} from './review.js'

const [site, storybook] = servers
const mainFolder = '/Volumes/Code/heerenveen/sc-heerenveen-fansite'
const reviewFolder = '/Volumes/Code/heerenveen/sc-heerenveen-fansite-review'
const commit = '0123456789abcdef0123456789abcdef01234567'

test('takes a number for a pull request, also with leading zeros', () => {
  assert.deepEqual(parseTarget('124'), { kind: 'pull-request', number: 124 })
  assert.deepEqual(parseTarget('0124'), { kind: 'pull-request', number: 124 })
})

test('takes a name for a branch', () => {
  for (const name of ['main', 'feat/120-bigger-type', 'release-please--branches--main', 'fix/v1.2_x']) {
    assert.deepEqual(parseTarget(name), { kind: 'branch', name })
  }
})

test('stops on a missing or empty argument with the usage', () => {
  for (const argument of [undefined, '']) {
    assert.throws(() => parseTarget(argument), { exitCode: 2, message: /pnpm review <number or branch>/ })
  }
})

test('refuses what is not a branch name, before it can reach a command', () => {
  for (const argument of [
    '--force',
    '-1',
    '/etc/passwd',
    '../x',
    'a..b',
    'feat/',
    'feat.',
    'a b',
    'a;b',
    '$(x)',
    'a:b',
    'a*',
  ]) {
    assert.throws(() => parseTarget(argument), ReviewError, argument)
  }
})

test('reads the branch of a pull request', () => {
  const json = JSON.stringify({
    headRefName: 'feat/120-bigger-type',
    isCrossRepository: false,
    url: 'https://github.com/o/r/pull/124',
  })

  assert.deepEqual(parsePullRequest(json, 124), {
    branch: 'feat/120-bigger-type',
    number: 124,
    url: 'https://github.com/o/r/pull/124',
  })
})

test('refuses a pull request from a fork, because the command runs its code', () => {
  const json = JSON.stringify({ headRefName: 'main', isCrossRepository: true, url: 'https://github.com/o/r/pull/9' })

  assert.throws(() => parsePullRequest(json, 9), { message: /comes from a fork/ })
})

test('refuses a pull request whose branch has a name that is not accepted', () => {
  const json = JSON.stringify({
    headRefName: 'feat/a b',
    isCrossRepository: false,
    url: 'https://github.com/o/r/pull/9',
  })

  assert.throws(() => parsePullRequest(json, 9), { message: /pull request #9 has a name/ })
})

test('finds the open pull request of a branch, and skips one from a fork', () => {
  const json = JSON.stringify([
    { isCrossRepository: true, number: 7, url: 'https://github.com/o/r/pull/7' },
    { isCrossRepository: false, number: 8, url: 'https://github.com/o/r/pull/8' },
  ])

  assert.deepEqual(parseOpenPullRequest(json), { number: 8, url: 'https://github.com/o/r/pull/8' })
  assert.equal(parseOpenPullRequest('[]'), undefined)
})

test('puts the review folder next to the repository, whichever worktree the command runs in', () => {
  assert.equal(mainFolderOf(`${mainFolder}/.git`), mainFolder)
  assert.equal(reviewFolderOf(mainFolder), reviewFolder)
  assert.throws(() => mainFolderOf('/somewhere/repository.git'), ReviewError)
})

test('lists the worktrees from the porcelain output', () => {
  const porcelain = [
    `worktree ${mainFolder}`,
    'HEAD 45972fe',
    'branch refs/heads/main',
    '',
    `worktree ${reviewFolder}`,
    'HEAD 45972fe',
    'detached',
    '',
  ].join('\n')

  assert.deepEqual(parseWorktrees(porcelain), [mainFolder, reviewFolder])
})

test('reads process numbers and the folder of a process', () => {
  assert.deepEqual(parsePids('2816\n2761\n'), [2816, 2761])
  assert.deepEqual(parsePids(''), [])
  assert.equal(parseCwd('p2816\nfcwd\nn/Volumes/Code/fansite/apps/site\n'), '/Volumes/Code/fansite/apps/site')
  assert.equal(parseCwd(''), undefined)
})

test('knows its own dev servers in the repository, in a worktree of Claude Code and in the review folder', () => {
  const worktrees = [mainFolder, `${mainFolder}/.claude/worktrees/125-pnpm-review-88e9b0`, reviewFolder]

  for (const cwd of [
    `${mainFolder}/apps/site`,
    `${mainFolder}/.claude/worktrees/125-pnpm-review-88e9b0/apps/site`,
    `${reviewFolder}/apps/site`,
  ]) {
    assert.equal(isFansiteServer({ command: 'next-server (v16.4.2)', cwd }, site, worktrees), true, cwd)
  }

  assert.equal(
    isFansiteServer(
      {
        command: 'node /x/storybook/dist/bin/dispatcher.js dev --port 6006',
        cwd: `${reviewFolder}/packages/design-system`,
      },
      storybook,
      worktrees,
    ),
    true,
  )
})

test('leaves alone what is not a dev server of the fansite', () => {
  const worktrees = [mainFolder, reviewFolder]

  // Another project's Next.js, a different tool in a folder of the fansite, a folder that only starts like ours, and a
  // process whose folder can't be read.
  assert.equal(
    isFansiteServer({ command: 'next-server (v16.4.2)', cwd: '/Users/me/other-project/apps/web' }, site, worktrees),
    false,
  )
  assert.equal(
    isFansiteServer({ command: 'python3 -m http.server 3000', cwd: `${mainFolder}/apps/site` }, site, worktrees),
    false,
  )
  assert.equal(
    isFansiteServer({ command: 'next-server (v16.4.2)', cwd: `${reviewFolder}-old/apps/site` }, site, worktrees),
    false,
  )
  assert.equal(isFansiteServer({ command: 'next-server (v16.4.2)', cwd: undefined }, site, worktrees), false)
  assert.equal(
    isFansiteServer({ command: 'next-server (v16.4.2)', cwd: `${mainFolder}/apps/site` }, storybook, worktrees),
    false,
  )
})

test('says what holds a port when it is not the fansite', () => {
  const holder = { command: 'python3 -m http.server 3000', cwd: '/Users/me/play', pid: 4242 }
  const message = foreignMessage([{ holder, server: site }])

  assert.match(message, /Port 3000 is held by "python3 -m http.server 3000" \(pid 4242, in \/Users\/me\/play\)/)
  assert.match(message, /Nothing was changed/)
})

test('keeps what pnpm set for this script in the repository out of the commands in the review folder', () => {
  const env = {
    HOME: '/Users/me',
    INIT_CWD: mainFolder,
    npm_config_user_agent: 'pnpm/12.14.0',
    npm_lifecycle_event: 'review',
    PATH: `${mainFolder}/node_modules/.bin:/usr/local/bin:${mainFolder}/node_modules/.pnpm/node_modules/.bin:/usr/bin`,
  }

  assert.deepEqual(cleanEnv(env), { HOME: '/Users/me', PATH: '/usr/local/bin:/usr/bin' })
})

test('makes a new review folder a worktree without a branch, copies .env, and gets the database ready', () => {
  const steps = buildSteps({ commit, hasEnv: false, mainFolder, reviewFolder, worktreeExists: false })

  assert.deepEqual(
    steps.map(({ args, command, cwd }) => [command, ...args, cwd]),
    [
      ['git', 'worktree', 'prune', mainFolder],
      ['git', 'worktree', 'add', '--quiet', '--detach', reviewFolder, commit, mainFolder],
      ['cp', `${mainFolder}/.env`, `${reviewFolder}/.env`, mainFolder],
      ['pnpm', 'install', '--frozen-lockfile', reviewFolder],
      ['docker', 'compose', 'up', '-d', '--wait', mainFolder],
      ['pnpm', 'db:migrate', reviewFolder],
      ['pnpm', 'db:seed', reviewFolder],
    ],
  )
})

test('moves an existing review folder to the commit, and keeps the .env it has', () => {
  const steps = buildSteps({ commit, hasEnv: true, mainFolder, reviewFolder, worktreeExists: true })

  assert.deepEqual(
    steps.map(({ args, command, cwd }) => [command, ...args, cwd]),
    [
      ['git', 'checkout', '--quiet', '--detach', commit, reviewFolder],
      ['pnpm', 'install', '--frozen-lockfile', reviewFolder],
      ['docker', 'compose', 'up', '-d', '--wait', mainFolder],
      ['pnpm', 'db:migrate', reviewFolder],
      ['pnpm', 'db:seed', reviewFolder],
    ],
  )
})

test('never runs the import', () => {
  for (const worktreeExists of [true, false]) {
    const steps = buildSteps({ commit, hasEnv: false, mainFolder, reviewFolder, worktreeExists })

    assert.equal(
      steps.some(({ args }) => args.includes('import')),
      false,
    )
  }
})

test('starts the site on port 3000 and Storybook on port 6006, in the review folder, with the branch in the environment', () => {
  const env = { HOME: '/Users/me', npm_lifecycle_event: 'review' }
  const [siteCommand, storybookCommand] = servers.map((server) =>
    buildServerCommand(server, { branch: 'feat/120-bigger-type', reviewFolder }, env),
  )

  assert.deepEqual(siteCommand.args, ['--filter', 'site', 'dev', '--port', '3000'])
  assert.deepEqual(storybookCommand.args, [
    '--filter',
    'design-system',
    'storybook',
    '--port',
    '6006',
    '--no-open',
    '--exact-port',
  ])

  for (const { cwd, env: serverEnv } of [siteCommand, storybookCommand]) {
    assert.equal(cwd, reviewFolder)
    assert.deepEqual(serverEnv, { HOME: '/Users/me', NO_COLOR: '1', REVIEW_BRANCH: 'feat/120-bigger-type' })
  }
})

test('summarises the branch, the pull request, the commit, both addresses, the log and how to stop', () => {
  const summary = summarise({
    branch: 'feat/120-bigger-type',
    commit: 'c9a3896 feat(design-system): make the type bigger',
    logFile: `${reviewFolder}/review.log`,
    pullRequest: { number: 124, url: 'https://github.com/o/r/pull/124' },
  })

  assert.match(summary, /^Branch +feat\/120-bigger-type$/m)
  assert.match(summary, /^Pull request +#124 https:\/\/github.com\/o\/r\/pull\/124$/m)
  assert.match(summary, /^Commit +c9a3896 feat\(design-system\): make the type bigger$/m)
  assert.match(summary, /^Site +http:\/\/localhost:3000$/m)
  assert.match(summary, /^Storybook +http:\/\/localhost:6006$/m)
  assert.match(summary, new RegExp(`^Log +${reviewFolder}/review.log$`, 'm'))
  assert.match(summary, /pnpm review:stop/)
})

test('leaves out the pull request when the branch has none', () => {
  const summary = summarise({
    branch: 'spike',
    commit: 'abc1234 wip',
    logFile: `${reviewFolder}/review.log`,
    pullRequest: undefined,
  })

  assert.doesNotMatch(summary, /Pull request/)
})

test('opens an address in the default browser on macOS and Linux, and nowhere else', () => {
  const address = addressOf(site)

  assert.equal(address, 'http://localhost:3000')
  assert.deepEqual(openCommand('darwin', address), { args: [address], command: 'open' })
  assert.deepEqual(openCommand('linux', address), { args: [address], command: 'xdg-open' })
  assert.equal(openCommand('win32', address), undefined)
})

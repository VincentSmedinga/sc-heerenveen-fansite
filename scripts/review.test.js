// Tests the parts of `pnpm review` that decide something and have no side effects. What touches git, gh, docker, lsof and
// the servers is tried by hand (see the pull request).
import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  addressOf,
  buildServerCommand,
  buildSteps,
  cleanEnv,
  describeSource,
  foreignMessage,
  isFansiteServer,
  mainFolderOf,
  openCommand,
  parseAheadBehind,
  parseCwd,
  parseFileList,
  parseOpenPullRequest,
  parsePids,
  parsePullRequest,
  parseTarget,
  parseWorktrees,
  ReviewError,
  reviewFolderOf,
  servers,
  sitePathFor,
  storybookEntryFor,
  storybookPathFor,
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

test('summarises the branch, the source, the pull request, the commit, the pages, the log and how to stop', () => {
  const summary = summarise({
    addresses: [
      ['Site', 'http://localhost:3000/bronnen'],
      ['Storybook', 'http://localhost:6006/?path=/docs/components-card--docs'],
    ],
    branch: 'feat/120-bigger-type',
    commit: 'c9a3896 feat(design-system): make the type bigger',
    logFile: `${reviewFolder}/review.log`,
    pullRequest: { number: 124, url: 'https://github.com/o/r/pull/124' },
    source: 'local branch (same as origin)',
  })

  assert.match(summary, /^Branch +feat\/120-bigger-type$/m)
  assert.match(summary, /^Source +local branch \(same as origin\)$/m)
  assert.match(summary, /^Pull request +#124 https:\/\/github.com\/o\/r\/pull\/124$/m)
  assert.match(summary, /^Commit +c9a3896 feat\(design-system\): make the type bigger$/m)
  assert.match(summary, /^Site +http:\/\/localhost:3000\/bronnen$/m)
  assert.match(summary, /^Storybook +http:\/\/localhost:6006\/\?path=\/docs\/components-card--docs$/m)
  assert.match(summary, new RegExp(`^Log +${reviewFolder}/review.log$`, 'm'))
  assert.match(summary, /pnpm review:stop/)
})

test('leaves out the pull request when the branch has none', () => {
  const summary = summarise({
    addresses: [],
    branch: 'spike',
    commit: 'abc1234 wip',
    logFile: `${reviewFolder}/review.log`,
    pullRequest: undefined,
    source: 'origin (GitHub)',
  })

  assert.doesNotMatch(summary, /Pull request/)
})

test('says where the commit comes from: GitHub, or a local branch and how it compares with origin', () => {
  assert.equal(describeSource({ comparison: undefined, local: false }), 'origin (GitHub)')
  assert.equal(
    describeSource({ comparison: undefined, local: true }),
    'local branch (not on origin, or origin not reachable)',
  )
  assert.equal(describeSource({ comparison: { ahead: 0, behind: 0 }, local: true }), 'local branch (same as origin)')
  assert.equal(
    describeSource({ comparison: { ahead: 2, behind: 0 }, local: true }),
    'local branch (2 commits ahead of origin)',
  )
  assert.equal(
    describeSource({ comparison: { ahead: 1, behind: 3 }, local: true }),
    'local branch (1 commit ahead of origin, 3 commits behind origin)',
  )
})

test('reads the commits ahead and behind, and the lines of a list of files', () => {
  assert.deepEqual(parseAheadBehind('2\t0\n'), { ahead: 2, behind: 0 })
  assert.deepEqual(parseFileList('a/b.ts\n\n  c.css \n'), ['a/b.ts', 'c.css'])
  assert.deepEqual(parseFileList(''), [])
})

const appFiles = [
  'apps/site/src/app/layout.tsx',
  'apps/site/src/app/page.tsx',
  'apps/site/src/app/bronnen/page.tsx',
  'apps/site/src/app/bronnen/page.test.tsx',
  'apps/site/src/app/over-ons/page.tsx',
  'apps/site/src/app/updates/page.tsx',
  'apps/site/src/app/updates/feed.xml/route.ts',
  'apps/site/src/app/(legal)/privacy/page.tsx',
  'apps/site/src/app/nieuws/[slug]/page.tsx',
]

test('opens the page of the site that the branch changes, and the home page when none is', () => {
  assert.equal(sitePathFor(['apps/site/src/app/bronnen/page.tsx'], appFiles), '/bronnen')
  assert.equal(sitePathFor(['apps/site/src/app/bronnen/page.test.tsx'], appFiles), '/bronnen')
  // A route has no page of its own: the page of the folder above it.
  assert.equal(sitePathFor(['apps/site/src/app/updates/feed.xml/route.ts'], appFiles), '/updates')
  // A route group is not in the address.
  assert.equal(sitePathFor(['apps/site/src/app/(legal)/privacy/page.tsx'], appFiles), '/privacy')
  assert.equal(sitePathFor(['apps/site/src/app/layout.tsx'], appFiles), '/')
  // No page changes, a page we can't open without a value, or nothing at all.
  assert.equal(sitePathFor(['packages/shared/src/x.ts', 'README.md'], appFiles), '/')
  assert.equal(sitePathFor(['apps/site/src/app/nieuws/[slug]/page.tsx'], appFiles), '/')
  assert.equal(sitePathFor([], []), '/')
})

test('takes the page with most changed files, and the first when they tie', () => {
  const changed = [
    'apps/site/src/app/over-ons/page.tsx',
    'apps/site/src/app/bronnen/page.tsx',
    'apps/site/src/app/bronnen/page.test.tsx',
  ]

  assert.equal(sitePathFor(changed, appFiles), '/bronnen')
  assert.equal(sitePathFor(changed.slice(0, 2), appFiles), '/over-ons')
})

const entries = [
  { id: 'components-card--docs', importPath: './src/components/card/Card.stories.tsx', type: 'docs' },
  { id: 'components-card--default', importPath: './src/components/card/Card.stories.tsx', type: 'story' },
  { id: 'components-link--default', importPath: './src/components/link/Link.stories.tsx', type: 'story' },
  { id: 'components-link--docs', importPath: './src/components/link/Link.stories.tsx', type: 'docs' },
  { id: 'redactie--documentatie', importPath: './src/docs/editorial.mdx', type: 'docs' },
  { id: 'merk--documentatie', importPath: './src/docs/brand.mdx', type: 'docs' },
]

test('opens the component or document in Storybook that the branch changes', () => {
  const idOf = (changed) => storybookEntryFor(changed, entries)?.id

  // A changed story, its component or its styles all lead to the documentation page of that story file.
  assert.equal(idOf(['packages/design-system/src/components/card/Card.stories.tsx']), 'components-card--docs')
  assert.equal(idOf(['packages/design-system/src/components/card/card.css']), 'components-card--docs')
  assert.equal(idOf(['packages/design-system/src/components/link/Link.tsx']), 'components-link--docs')
  assert.equal(idOf(['packages/design-system/src/docs/editorial.mdx']), 'redactie--documentatie')
  // A story file wins over a file that only sits next to a story, and the component with most files over the other.
  assert.equal(
    idOf([
      'packages/design-system/src/components/card/card.css',
      'packages/design-system/src/components/link/Link.stories.tsx',
    ]),
    'components-link--docs',
  )
})

test('falls back to the first story of a file without a documentation page, and to the start page without a match', () => {
  const onlyStories = entries.filter(({ type }) => type === 'story')

  assert.equal(
    storybookEntryFor(['packages/design-system/src/components/card/Card.tsx'], onlyStories)?.id,
    'components-card--default',
  )
  assert.equal(storybookEntryFor(['packages/design-system/src/tokens/colour.css'], entries), undefined)
  assert.equal(storybookEntryFor(['apps/site/src/app/page.tsx'], entries), undefined)
  assert.equal(storybookEntryFor([], []), undefined)
})

test('finds the documentation page that is attached to a changed story file', () => {
  const attached = [
    { id: 'tokens-kleur--primitives', importPath: './src/tokens/colour.stories.tsx', type: 'story' },
    {
      id: 'tokens-kleur--documentatie',
      importPath: './src/tokens/colour.mdx',
      storiesImports: ['./src/tokens/colour.stories.tsx'],
      type: 'docs',
    },
  ]

  assert.equal(
    storybookEntryFor(['packages/design-system/src/tokens/colour.stories.tsx'], attached)?.id,
    'tokens-kleur--documentatie',
  )
})

test('gives the address in Storybook of an entry', () => {
  assert.equal(storybookPathFor(entries[0]), '/?path=/docs/components-card--docs')
  assert.equal(storybookPathFor(entries[1]), '/?path=/story/components-card--default')
  assert.equal(storybookPathFor(undefined), '')
})

test('opens an address in the default browser on macOS and Linux, and nowhere else', () => {
  const address = addressOf(site)

  assert.equal(address, 'http://localhost:3000')
  assert.equal(addressOf(site, '/bronnen'), 'http://localhost:3000/bronnen')
  assert.deepEqual(openCommand('darwin', address), { args: [address], command: 'open' })
  assert.deepEqual(openCommand('linux', address), { args: [address], command: 'xdg-open' })
  assert.equal(openCommand('win32', address), undefined)
})

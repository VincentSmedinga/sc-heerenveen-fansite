import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  blockCount,
  blockSize,
  busyMessage,
  databaseUrlOf,
  deriveEnv,
  fillPorts,
  firstPort,
  parseArguments,
  portDefinitions,
  portsOf,
  portsToCheck,
  slugOf,
  WorktreeEnvError,
  worktreeNameOf,
} from './worktree-env.js'

const url = 'mysql://root@127.0.0.1:3306/fansite'
const folder = '/work/.claude/worktrees/514-worktree-env'
const derive = (overrides = {}) => deriveEnv({ databaseUrl: url, env: {}, folder, linked: true, ...overrides })

test('a normal checkout gets the ports and the database it always had', () => {
  const { database, derived, slug, values } = derive({ linked: false })

  assert.equal(slug, undefined)
  assert.equal(database, undefined)
  assert.deepEqual(derived, [])
  assert.deepEqual(values, {
    E2E_PORT: '3124',
    E2E_WITHOUT_DATABASE_PORT: '3125',
    FAKE_MAIL_PORT: '2525',
    SITE_PORT: '3000',
    SMOKE_PORT: '3123',
    STORYBOOK_PORT: '6006',
  })
})

test('CI gets the defaults too, also in a worktree', () => {
  assert.equal(derive({ env: { CI: 'true' } }).slug, undefined)
  assert.equal(derive({ env: { CI: 'true' } }).values['SITE_PORT'], '3000')
  assert.equal(derive({ env: { CI: 'true' } }).database, undefined)
})

test('a worktree gets its own database and ports', () => {
  const { database, databaseName, derived, slug, values, worktree } = derive()

  assert.equal(worktree, '514-worktree-env')
  assert.equal(slug, '514_worktree_env')
  assert.equal(databaseName, 'fansite_514_worktree_env')
  assert.equal(database, 'mysql://root@127.0.0.1:3306/fansite_514_worktree_env')
  assert.equal(values['DATABASE_URL'], database)
  assert.deepEqual(
    derived,
    portDefinitions.map(({ name }) => name),
  )
  assert.equal(values['SITE_PORT'], String(portsOf('514-worktree-env').site))
})

test('the same folder gets the same values, and another folder gets others', () => {
  assert.deepEqual(derive().values, derive().values)

  const other = derive({ folder: '/work/.claude/worktrees/518-reliable-backup-test' })

  assert.notEqual(other.values['DATABASE_URL'], derive().values['DATABASE_URL'])
  assert.notEqual(other.values['SITE_PORT'], derive().values['SITE_PORT'])
})

test('the ports of a block are different and stay in the range', () => {
  for (const name of ['a', '514-worktree-env', 'adoring-jemison-f89bf3', '日本語', 'x'.repeat(200), 'a b/c']) {
    const ports = Object.values(portsOf(name))

    assert.equal(new Set(ports).size, portDefinitions.length, name)

    for (const port of ports) {
      assert.ok(port >= firstPort && port < firstPort + blockCount * blockSize, `${name}: ${port}`)
    }

    assert.equal((Math.min(...ports) - firstPort) % blockSize, 0, name)
    assert.ok(Math.max(...ports) - Math.min(...ports) < blockSize, name)
  }
})

test('many folder names spread over the blocks', () => {
  const sites = new Set(Array.from({ length: 40 }, (_, index) => portsOf(`worktree-${index}`).site))

  assert.ok(sites.size >= 35, `only ${sites.size} different blocks for 40 names`)
})

test('a variable that is set wins over the derived value', () => {
  const { database, derived, values } = derive({
    env: { DATABASE_URL: 'mysql://root@127.0.0.1:3306/mine', SITE_PORT: '4000' },
  })

  assert.equal(database, undefined)
  assert.equal(values['DATABASE_URL'], undefined)
  assert.equal(values['SITE_PORT'], undefined)
  assert.ok(!derived.includes('site'))
  assert.ok(derived.includes('storybook'))
})

test('an address from the .env that is not the default database is left alone', () => {
  assert.equal(derive({ databaseUrl: 'mysql://root@db.example:3306/other' }).database, undefined)
  assert.equal(derive({ databaseUrl: 'not a url' }).database, undefined)
  assert.equal(derive({ databaseUrl: undefined }).database, undefined)
  assert.equal(derive({ databaseUrl: 'postgres://x/fansite' }).database, undefined)
})

test('WORKTREE_NAME wins over the folder, and an empty one turns it off', () => {
  assert.equal(worktreeNameOf({ env: { WORKTREE_NAME: 'mine' }, folder, linked: false }), 'mine')
  assert.equal(worktreeNameOf({ env: { WORKTREE_NAME: '' }, folder, linked: true }), undefined)
  assert.equal(worktreeNameOf({ env: { WORKTREE_NAME: '  ' }, folder, linked: true }), undefined)
  assert.equal(worktreeNameOf({ env: {}, folder, linked: true }), '514-worktree-env')
})

test('an empty DATABASE_URL in the environment is no choice', () => {
  assert.equal(derive({ env: { DATABASE_URL: '' } }).database, 'mysql://root@127.0.0.1:3306/fansite_514_worktree_env')
})

test('a name becomes lower case letters, digits and underscores', () => {
  assert.equal(slugOf('514-Worktree.Env'), '514_worktree_env')
  assert.equal(slugOf('  --a  b--  '), 'a_b')
  assert.equal(slugOf(''), undefined)
  assert.equal(slugOf('   '), undefined)
  assert.equal(slugOf(undefined), undefined)
})

test('a name without a letter or digit, or a long one, still gets a name of its own', () => {
  assert.match(slugOf('日本語') ?? '', /^w_[0-9a-f]{7}$/)
  assert.notEqual(slugOf('日本語'), slugOf('!!!'))

  const long = slugOf('a-very-long-name-'.repeat(8)) ?? ''

  assert.ok(long.length <= 32, long)
  assert.match(long, /^[a-z0-9_]+$/)
  assert.notEqual(long, slugOf('a-very-long-name-'.repeat(9)))
  // The name of a scratch database still fits in the 64 characters MariaDB allows.
  assert.ok(`fansite_smoke_${long}_`.length + 12 <= 64)
})

test('only the database called fansite is replaced', () => {
  assert.equal(databaseUrlOf(url, 'abc'), 'mysql://root@127.0.0.1:3306/fansite_abc')
  assert.equal(databaseUrlOf('mysql://u:p@h:1/fansite?x=1', 'abc'), 'mysql://u:p@h:1/fansite_abc?x=1')
  assert.equal(databaseUrlOf('mysql://root@127.0.0.1:3306/fansite_abc', 'def'), undefined)
})

test('port names in the arguments become the port', () => {
  const values = { SITE_PORT: '24001', STORYBOOK_PORT: '24002' }

  assert.deepEqual(
    fillPorts(['next', 'dev', '--port', '{SITE_PORT}', '{OTHER}', 'a{STORYBOOK_PORT}b'], { env: {}, values }),
    ['next', 'dev', '--port', '24001', '{OTHER}', 'a24002b'],
  )
  assert.deepEqual(fillPorts(['{SITE_PORT}'], { env: { SITE_PORT: '4000' }, values: {} }), ['4000'])
})

test('reads the command line', () => {
  assert.deepEqual(parseArguments([]), { command: 'show' })
  assert.deepEqual(parseArguments(['drop']), { command: 'drop' })
  assert.deepEqual(
    parseArguments(['run', '--database', '--ports', 'site,mail', '--', 'next', 'dev', '--port', '3000']),
    {
      command: 'run',
      database: true,
      ports: ['site', 'mail'],
      run: ['next', 'dev', '--port', '3000'],
      seed: false,
    },
  )
  assert.equal(parseArguments(['run', '--database', '--seed', '--', 'x']).seed, true)
  assert.deepEqual(parseArguments(['run', '--', 'vitest']), {
    command: 'run',
    database: false,
    ports: [],
    run: ['vitest'],
    seed: false,
  })
})

test('refuses a command line it does not understand', () => {
  for (const argv of [
    ['run'],
    ['run', '--database'],
    ['run', '--'],
    ['run', '--ports', 'nope', '--', 'x'],
    ['run', '--ports'],
    ['run', '--what', '--', 'x'],
    ['run', '--seed', '--', 'x'],
    ['go'],
    ['drop', 'x'],
  ]) {
    assert.throws(() => parseArguments(argv), WorktreeEnvError, argv.join(' '))
  }
})

test('checks only the derived ports that the command asked for', () => {
  const { derived, values } = derive({ env: { STORYBOOK_PORT: '4000' } })

  assert.deepEqual(
    portsToCheck({ derived, names: ['site', 'storybook'], values }).map(({ name }) => name),
    ['site'],
  )
  assert.deepEqual(portsToCheck({ ...derive({ linked: false }), names: ['site'] }), [])
})

test('the message for a busy port names the port and the worktree', () => {
  const message = busyMessage({
    busy: [{ label: 'Storybook', port: 24_002, variable: 'STORYBOOK_PORT' }],
    worktree: '514-worktree-env',
  })

  assert.match(message, /Port 24002 \(Storybook\) is busy/)
  assert.match(message, /"514-worktree-env"/)
  assert.match(message, /lsof -i :24002/)
  assert.match(message, /Nothing was started/)
})

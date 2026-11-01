// Tests the slot of the heavy checks: the parts that decide something, and the script itself
// with real processes, each with a slot folder of its own in the temp folder.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'

import {
  defaultTimeoutMinutes,
  durationText,
  HeavyLockError,
  isExpired,
  isSkipped,
  lockFolderOf,
  parseArguments,
  pollMilliseconds,
  pollOf,
  timeoutOf,
  waitingMessage,
} from './heavy-lock.js'

const script = path.join(import.meta.dirname, 'heavy-lock.js')

test('writes a duration the way a person says it', () => {
  assert.equal(durationText(0), '0 s')
  assert.equal(durationText(45_000), '45 s')
  assert.equal(durationText(200_000), '3 min 20 s')
})

test('says a slot is expired only after the timeout', () => {
  const owner = { startedAt: 1_000_000 }

  assert.equal(isExpired({ now: 1_000_000 + 59_000, owner, timeoutMilliseconds: 60_000 }), false)
  assert.equal(isExpired({ now: 1_000_000 + 61_000, owner, timeoutMilliseconds: 60_000 }), true)
})

test('puts the slot in the temp folder, outside the repository', () => {
  assert.equal(lockFolderOf({}, '/tmp/user'), path.join('/tmp/user', 'fansite-heavy-lock'))
  assert.equal(lockFolderOf({ HEAVY_LOCK_DIR: '/tmp/other' }, '/tmp/user'), '/tmp/other')
  assert.equal(lockFolderOf({ HEAVY_LOCK_DIR: '' }, '/tmp/user'), path.join('/tmp/user', 'fansite-heavy-lock'))
})

test('runs without a slot in CI and when it is turned off', () => {
  assert.equal(isSkipped({ CI: 'true' }), true)
  assert.equal(isSkipped({ HEAVY_LOCK: 'off' }), true)
  assert.equal(isSkipped({}), false)
  assert.equal(isSkipped({ CI: '' }), false)
})

test('reads the command after the separator', () => {
  assert.deepEqual(parseArguments(['--', 'pnpm', 'build']), { run: ['pnpm', 'build'] })
  assert.throws(() => parseArguments([]), HeavyLockError)
  assert.throws(() => parseArguments(['--']), HeavyLockError)
  assert.throws(() => parseArguments(['pnpm', 'build']), HeavyLockError)
})

test('takes the default for a timeout or a poll that is not a positive number', () => {
  assert.equal(timeoutOf({}), defaultTimeoutMinutes * 60_000)
  assert.equal(timeoutOf({ HEAVY_LOCK_TIMEOUT_MINUTES: 'soon' }), defaultTimeoutMinutes * 60_000)
  assert.equal(timeoutOf({ HEAVY_LOCK_TIMEOUT_MINUTES: '-1' }), defaultTimeoutMinutes * 60_000)
  assert.equal(timeoutOf({ HEAVY_LOCK_TIMEOUT_MINUTES: '2' }), 120_000)
  assert.equal(pollOf({}), pollMilliseconds)
  assert.equal(pollOf({ HEAVY_LOCK_POLL_MILLISECONDS: '50' }), 50)
})

test('names who holds the slot, where and for how long', () => {
  const owner = { command: 'pnpm test:a11y', folder: '/work/feat-1-thing', pid: 4242, startedAt: 0 }

  assert.match(
    waitingMessage({ now: 200_000, owner }),
    /`pnpm test:a11y` in feat-1-thing \(process 4242\), since 3 min 20 s/,
  )
})

/** Starts the script around a command; resolves with what it printed and how it ended. */
function runScript(folder, command, extraEnv = {}) {
  const child = spawn(process.execPath, [script, '--', ...command], {
    env: { ...process.env, CI: '', HEAVY_LOCK_DIR: folder, HEAVY_LOCK_POLL_MILLISECONDS: '50', ...extraEnv },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let stderr = ''
  let stdout = ''

  child.stderr.on('data', (chunk) => (stderr += chunk))
  child.stdout.on('data', (chunk) => (stdout += chunk))

  const done = new Promise((resolve) =>
    child.once('close', (code, signal) => resolve({ code, signal, stderr, stdout })),
  )

  return { child, done }
}

/** A folder for the slot of one test, removed afterwards. */
function slotFolder(t) {
  const parent = mkdtempSync(path.join(tmpdir(), 'heavy-lock-test-'))

  t.after(() => rmSync(parent, { force: true, recursive: true }))

  return path.join(parent, 'slot')
}

const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

/** A slot in the state a crashed or hung run leaves behind. */
function leaveSlot(folder, owner) {
  mkdirSync(folder)
  writeFileSync(
    path.join(folder, 'owner.json'),
    JSON.stringify({ command: 'pnpm build', folder: '/work/old', token: 'old', ...owner }),
  )
}

test('lets a second run wait until the first has ended, and says so', async (t) => {
  const folder = slotFolder(t)
  const log = path.join(path.dirname(folder), 'order.txt')
  const write = (word) => `require('fs').appendFileSync(${JSON.stringify(log)}, '${word}\\n')`
  const first = runScript(folder, [
    process.execPath,
    '-e',
    `${write('first start')}; setTimeout(() => { ${write('first end')} }, 800)`,
  ])

  await pause(300)

  const second = runScript(folder, [process.execPath, '-e', write('second start')])
  const [firstResult, secondResult] = await Promise.all([first.done, second.done])

  assert.equal(firstResult.code, 0)
  assert.equal(secondResult.code, 0)
  assert.deepEqual(readFileSync(log, 'utf8').trim().split('\n'), ['first start', 'first end', 'second start'])
  assert.match(secondResult.stderr, /Waiting for the slot of the heavy checks\. It is held by/)
  assert.match(secondResult.stderr, /Got the slot after/)
  assert.doesNotMatch(firstResult.stderr, /Waiting/)
  assert.equal(existsSync(folder), false)
})

test('gives the slot back when the command fails, and passes on its exit code', async (t) => {
  const folder = slotFolder(t)
  const { code } = await runScript(folder, [process.execPath, '-e', 'process.exit(3)']).done

  assert.equal(code, 3)
  assert.equal(existsSync(folder), false)
})

test('gives the slot back when the run is stopped', async (t) => {
  const folder = slotFolder(t)
  const { child, done } = runScript(folder, [process.execPath, '-e', 'setTimeout(() => {}, 30000)'])

  await pause(400)
  assert.equal(existsSync(folder), true)
  child.kill('SIGTERM')
  await done

  assert.equal(existsSync(folder), false)
})

test('takes over a slot whose run has gone', async (t) => {
  const folder = slotFolder(t)
  const deadPid = await new Promise((resolve) => {
    const child = spawn(process.execPath, ['-e', ''])

    child.once('exit', () => resolve(child.pid))
  })

  leaveSlot(folder, { pid: deadPid, startedAt: Date.now() })

  const { code, stderr, stdout } = await runScript(folder, [process.execPath, '-e', 'console.log("ran")']).done

  assert.equal(code, 0)
  assert.equal(stdout.trim(), 'ran')
  assert.match(stderr, /Taking over the slot of `pnpm build` in old: process \d+ has gone/)
  assert.equal(existsSync(folder), false)
})

test('takes over a slot that has been held longer than the timeout', async (t) => {
  const folder = slotFolder(t)

  // The run is alive (it is this test), but it took the slot an hour ago.
  leaveSlot(folder, { pid: process.pid, startedAt: Date.now() - 3_600_000 })

  const { code, stderr } = await runScript(folder, [process.execPath, '-e', ''], { HEAVY_LOCK_TIMEOUT_MINUTES: '30' })
    .done

  assert.equal(code, 0)
  assert.match(stderr, /it has held it for more than 30 min 0 s/)
})

test('waits for a slot that is held and not yet expired', async (t) => {
  const folder = slotFolder(t)

  leaveSlot(folder, { pid: process.pid, startedAt: Date.now() })

  const { child, done } = runScript(folder, [process.execPath, '-e', 'console.log("ran")'])

  await pause(500)
  assert.equal(child.exitCode, null, 'still waiting')
  child.kill('SIGTERM')

  const { stderr, stdout } = await done

  assert.equal(stdout, '')
  assert.match(stderr, /Waiting for the slot/)
  assert.equal(existsSync(folder), true, 'the slot of the other run is left alone')
})

test('runs at once in CI without touching the slot', async (t) => {
  const folder = slotFolder(t)

  leaveSlot(folder, { pid: process.pid, startedAt: Date.now() })

  const { code, stderr, stdout } = await runScript(folder, [process.execPath, '-e', 'console.log("ran")'], {
    CI: 'true',
  }).done

  assert.equal(code, 0)
  assert.equal(stdout.trim(), 'ran')
  assert.equal(stderr, '')
  assert.equal(existsSync(folder), true)
})

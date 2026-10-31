// Tests the decision of the last job of CI (scripts/ci-gate.js): which results of the other
// jobs make the check "Lint, typecheck, test and build" pass.
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { check } from './ci-gate.js'

const everythingRan = {
  build: { result: 'success' },
  changes: { outputs: { site: 'true', stories: 'true' }, result: 'success' },
  e2e: { result: 'success' },
  lint: { result: 'success' },
  smoke: { result: 'success' },
  stories: { result: 'success' },
  test: { result: 'success' },
}

const withResult = (job, result) => ({ ...everythingRan, [job]: { ...everythingRan[job], result } })

test('a full run where every job passed passes', () => {
  assert.deepEqual(check(everythingRan), [])
})

test('a job that failed, was cancelled or was skipped fails the check', () => {
  for (const job of ['build', 'changes', 'lint', 'test']) {
    for (const result of ['failure', 'cancelled', 'skipped']) {
      assert.equal(check(withResult(job, result)).length, 1, `${job} ${result}`)
    }
  }
})

test('a failed part of the e2e tests fails the check', () => {
  assert.equal(check(withResult('e2e', 'failure')).length, 1)
  assert.equal(check(withResult('e2e', 'cancelled')).length, 1)
})

test('a job that ci-changes.js switched on and that was skipped fails the check', () => {
  for (const job of ['e2e', 'smoke', 'stories']) {
    assert.equal(check(withResult(job, 'skipped')).length, 1, job)
  }
})

test('a job that ci-changes.js switched off must be skipped, and passes then', () => {
  const documentation = {
    ...everythingRan,
    changes: { outputs: { site: 'false', stories: 'false' }, result: 'success' },
    e2e: { result: 'skipped' },
    smoke: { result: 'skipped' },
    stories: { result: 'skipped' },
  }

  assert.deepEqual(check(documentation), [])
})

test('a job that ci-changes.js switched off and that ran anyway is a surprise and fails', () => {
  const surprise = { ...everythingRan, changes: { outputs: { site: 'false', stories: 'true' }, result: 'success' } }

  assert.deepEqual(check(surprise), ['smoke: success, verwacht skipped', 'e2e: success, verwacht skipped'])
})

test('missing outputs run everything, so skipped jobs fail', () => {
  const noOutputs = { ...withResult('e2e', 'skipped'), changes: { result: 'success' } }

  assert.deepEqual(check(noOutputs), ['e2e: skipped, verwacht success'])
})

test('a job that is missing fails, and so does nothing at all', () => {
  const withoutE2e = { ...everythingRan }

  delete withoutE2e.e2e

  assert.deepEqual(check(withoutE2e), ['e2e: ontbreekt, verwacht success'])
  assert.notEqual(check(undefined).length, 0)
  assert.notEqual(check({}).length, 0)
})

test('a failed changes job skips the rest, and the check fails on changes', () => {
  const failed = {
    build: { result: 'skipped' },
    changes: { outputs: {}, result: 'failure' },
    e2e: { result: 'skipped' },
    lint: { result: 'success' },
    smoke: { result: 'skipped' },
    stories: { result: 'skipped' },
    test: { result: 'success' },
  }

  assert.ok(check(failed).includes('changes: failure, verwacht success'))
})

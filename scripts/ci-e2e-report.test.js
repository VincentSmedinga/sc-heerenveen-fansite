// Tests the check of the report of one part of the e2e tests in CI (scripts/ci-e2e-report.js).
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { check } from './ci-e2e-report.js'

const stats = (fields) => ({ stats: { expected: 134, flaky: 0, skipped: 0, unexpected: 0, ...fields } })

test('a part where every test passed is fine', () => {
  assert.deepEqual(check(stats({})), [])
})

test('a part without tests is a problem, whatever Playwright says about it', () => {
  assert.deepEqual(check(stats({ expected: 0 })), ['er is geen test gedraaid'])
})

test('a failed, skipped or flaky test is a problem', () => {
  assert.deepEqual(check(stats({ unexpected: 1 })), ['1 test is mislukt'])
  assert.deepEqual(check(stats({ skipped: 2 })), ['2 tests zijn overgeslagen'])
  assert.deepEqual(check(stats({ flaky: 1 })), ['1 test is pas bij een nieuwe poging geslaagd'])
})

test('a report without counts is a problem', () => {
  for (const report of [undefined, null, {}, { stats: {} }, { stats: { expected: '134' } }]) {
    assert.deepEqual(check(report), ['het verslag heeft geen tellingen'])
  }
})

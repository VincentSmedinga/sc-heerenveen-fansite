// Tests the split of the response time (scripts/response-time.js, #1594): the parts of a
// request, the median, the estimate of the time to make a page and the table. The requests
// themselves run against a small server on this computer, on a new and on a reused connection.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { test } from 'node:test'

import {
  defaultPaths,
  defaultPauseMs,
  measure,
  measurePath,
  median,
  medianParts,
  pageMakingTime,
  partsOf,
  requestHeaders,
  smallFile,
  table,
} from './response-time.js'

test('the parts of a request add up to the first byte', () => {
  const parts = partsOf({ connect: 25, firstByte: 95, lookup: 3, secureConnect: 55 })

  assert.deepEqual(parts, { dns: 3, firstByte: 95, tcp: 22, tls: 30, wait: 40 })
  assert.equal(parts.dns + parts.tcp + parts.tls + parts.wait, parts.firstByte)
})

test('a moment that never came gives a part of 0, so a reused connection is all wait', () => {
  assert.deepEqual(partsOf({ firstByte: 40 }), { dns: 0, firstByte: 40, tcp: 0, tls: 0, wait: 40 })
  assert.deepEqual(partsOf({ connect: 10, firstByte: 30, lookup: 2 }), {
    dns: 2,
    firstByte: 30,
    tcp: 8,
    tls: 0,
    wait: 20,
  })
})

test('the median ignores a slow outlier, and takes the mean of the middle two for an even list', () => {
  assert.equal(median([40, 41, 400]), 41)
  assert.equal(median([10, 20, 30, 40]), 25)
  assert.ok(Number.isNaN(median([])))
})

test('medianParts takes the median of each part', () => {
  const runs = [10, 12, 300].map((wait) => partsOf({ firstByte: wait }))

  assert.equal(medianParts(runs).wait, 12)
})

test('the time to make a page is the wait for the page minus that for the small file, never below 0', () => {
  assert.equal(pageMakingTime(45, 28), 17)
  assert.equal(pageMakingTime(20, 28), 0)
})

test('it measures the small file and the pages of docs/prestaties.md, and the file comes first', () => {
  assert.equal(defaultPaths[0], smallFile)
  assert.deepEqual(defaultPaths.slice(1), ['/', '/nieuws', '/redactie/we-zijn-terug', '/spelers', '/bronnen'])
})

test('a measurement asks not to be counted as a visit', () => {
  assert.equal(requestHeaders.DNT, '1')
})

test('it measures a server: a status, a first byte, and no TLS or DNS time on plain HTTP to an address', async (context) => {
  const seen = []
  const server = createServer((request, response) => {
    seen.push(request.headers.dnt)
    setTimeout(() => response.end('ok'), 20)
  })

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  context.after(() => server.close())

  const address = `http://127.0.0.1:${server.address().port}`
  const once = await measure(address, '/')

  assert.equal(once.status, 200)
  assert.equal(once.tls, 0)
  assert.ok(once.wait >= 15, `waited ${once.wait} ms for a server that takes 20`)
  assert.ok(once.total >= once.firstByte)

  const result = await measurePath(address, '/', 3, { pauseMs: 0 })

  assert.equal(result.status, 200)
  assert.ok(result.warm.tcp === 0 && result.warm.dns === 0, 'the second request reuses the connection')
  assert.ok(result.highest >= result.cold.firstByte)
  assert.ok(seen.every((value) => value === '1'))
})

test('the table has a row per path and the page-making time only for the pages', () => {
  const part = (wait) => ({ dns: 3, firstByte: 53 + wait, tcp: 20, tls: 30, wait })
  const lines = table([
    { cold: part(25), highest: 90, path: smallFile, status: 200, warm: part(28) },
    { cold: part(40), highest: 110, path: '/', status: 200, warm: part(45) },
  ]).split('\n')

  assert.equal(lines.length, 4)
  assert.match(lines[2], /^\| `\/theme\.js` \| 200 \|.*\| 28 \| {2}\|$/)
  assert.match(lines[3], /\| 45 \| 17 \|$/)
})

test('the runs wait between two connections, so a measurement stays under the limit of the firewall', async (context) => {
  const server = createServer((request, response) => response.end('ok'))

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  context.after(() => server.close())

  const address = `http://127.0.0.1:${server.address().port}`
  const start = Date.now()

  await measurePath(address, '/', 3, { pauseMs: 50 })

  assert.ok(Date.now() - start >= 100, 'two pauses of 50 ms between three runs')
  assert.ok(defaultPauseMs >= 1000, 'at most one new connection per second')
})

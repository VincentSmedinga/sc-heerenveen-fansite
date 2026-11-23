// Splits the response time of a host into its parts, with plain HTTP requests from outside and
// no dependency (#1594). Per address it measures the DNS lookup, the TCP connection, the TLS
// handshake and the wait for the first byte, as a visitor's browser would see them, and it
// repeats that so the median shows through the noise. Pages are compared with a small file the
// server also hands out (`/theme.js`): that file takes the same road through the host and the
// proxy but needs no page to be made and no database, so the difference between the two is
// the time the site spends making the page.
//
//   node scripts/response-time.js <address> [runs] [path ...]
//
// Every request asks not to be counted (`DNT: 1`, see visitOf in apps/site/src/visits.ts), so
// a measurement does not show in /beheer/bezoek. It only reads: GET requests to the given
// paths, one new connection per second at most, because the firewall of a host may block an
// address that opens many (see defaultPauseMs). What decides something is a function without
// side effects, exported for the tests.
import { realpathSync } from 'node:fs'
import * as http from 'node:http'
import * as https from 'node:https'

/** The paths measured when none is given: the small file and the pages of prestaties.md. */
export const defaultPaths = ['/theme.js', '/', '/nieuws', '/redactie/we-zijn-terug', '/spelers', '/bronnen']

export const defaultRuns = 10

/**
 * The pause between two runs, which each open a new connection. The firewall of the host
 * blocked the address of a measurement that made 150 connections in 30 seconds (23 November
 * 2026), so a run waits, and the connections stay well under 5 per second.
 */
export const defaultPauseMs = 1000

/** The small file the pages are compared with. */
export const smallFile = '/theme.js'

export const requestHeaders = { DNT: '1', 'User-Agent': 'scHeerenveenFansite-response-time' }

/** One request, with the moments it passed. `agent` decides if the connection is reused. */
export function measure(address, path, agent) {
  const url = new URL(path, address)
  const request = url.protocol === 'https:' ? https.request : http.request

  return new Promise((resolve, reject) => {
    const start = process.hrtime.bigint()
    const now = () => Number(process.hrtime.bigint() - start) / 1e6
    const moments = {}
    const req = request(url, { agent, headers: requestHeaders }, (response) => {
      moments.firstByte = now()
      response.resume()
      response.on('end', () => resolve({ ...partsOf(moments), status: response.statusCode, total: now() }))
    })

    req.on('socket', (socket) => {
      if (!socket.connecting) {
        return
      }

      socket.once('lookup', () => (moments.lookup = now()))
      socket.once('connect', () => (moments.connect = now()))
      socket.once('secureConnect', () => (moments.secureConnect = now()))
    })
    req.on('error', reject)
    req.end()
  })
}

/**
 * A request on a new connection (cold: DNS, TCP and TLS count) and one on a connection that
 * was just used (warm: only the wait counts), for each run. `highest` is the slowest cold first
 * byte, because a page that is sometimes slow shows in the highest and not in the median.
 */
export async function measurePath(address, path, runs, { pauseMs = defaultPauseMs } = {}) {
  const cold = []
  const warm = []

  for (let run = 0; run < runs; run++) {
    const agent = new (new URL(address).protocol === 'https:' ? https : http).Agent({ keepAlive: true, maxSockets: 1 })

    cold.push(await measure(address, path, agent))
    warm.push(await measure(address, path, agent))
    agent.destroy()

    if (pauseMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, pauseMs))
    }
  }

  return {
    cold: medianParts(cold),
    highest: Math.max(...cold.map((run) => run.firstByte)),
    path,
    status: cold[0].status,
    warm: medianParts(warm),
  }
}

/** The middle value of a list of numbers; the mean of the two middle ones for an even list. */
export function median(values) {
  if (values.length === 0) {
    return Number.NaN
  }

  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)

  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

/** The median of each part over a list of runs. */
export function medianParts(runs) {
  return Object.fromEntries(
    ['dns', 'tcp', 'tls', 'wait', 'firstByte'].map((part) => [part, median(runs.map((run) => run[part]))]),
  )
}

/**
 * What the site spends on a page: the wait for the first byte of the page minus that of the
 * small file, both on a connection that already exists. It is an estimate, never below 0.
 */
export function pageMakingTime(pageWait, fileWait) {
  return Math.max(0, pageWait - fileWait)
}

/**
 * The parts of one request from the moments it passed (milliseconds since it started). A part
 * is the difference between two moments, and a moment that never came (no TLS on plain HTTP)
 * makes a part of 0 instead of a gap, so the parts always add up to the first byte.
 */
export function partsOf({ connect, firstByte, lookup, secureConnect }) {
  const afterLookup = lookup ?? 0
  const afterConnect = connect ?? afterLookup
  const afterTls = secureConnect ?? afterConnect

  return {
    dns: afterLookup,
    firstByte,
    tcp: afterConnect - afterLookup,
    tls: afterTls - afterConnect,
    wait: firstByte - afterTls,
  }
}

const round = (value) => Math.round(value)

/** The result as a Markdown table, for docs/prestaties.md. */
export function table(results) {
  const small = results.find((result) => result.path === smallFile)
  const rows = results.map(({ cold, highest, path, status, warm }) => {
    const making = small === undefined || path === smallFile ? '' : round(pageMakingTime(warm.wait, small.warm.wait))

    return `| \`${path}\` | ${status} | ${round(cold.dns)} | ${round(cold.tcp)} | ${round(cold.tls)} | ${round(cold.wait)} | ${round(cold.firstByte)} | ${round(highest)} | ${round(warm.wait)} | ${making} |`
  })

  return [
    '| Pad | Status | DNS | TCP | TLS | Wachten (koud) | Eerste byte (koud) | Hoogste eerste byte | Wachten (warm) | Pagina maken |',
    '| --- | ------ | --- | --- | --- | -------------- | ------------------ | ------------------- | -------------- | ------------ |',
    ...rows,
  ].join('\n')
}

async function main() {
  const [address, runsArgument, ...paths] = process.argv.slice(2)

  if (address === undefined) {
    console.error('Usage: node scripts/response-time.js <address> [runs] [path ...]')
    process.exit(2)
  }

  const runs = runsArgument === undefined ? defaultRuns : Number(runsArgument)
  const results = []

  for (const path of paths.length > 0 ? paths : defaultPaths) {
    results.push(await measurePath(address, path, runs))
  }

  console.log(`${new Date().toISOString().slice(0, 10)}, ${runs} runs per pad, milliseconden, mediaan\n`)
  console.log(table(results))
}

if (
  process.argv[1] !== undefined &&
  realpathSync(process.argv[1]) === realpathSync(new URL(import.meta.url).pathname)
) {
  await main()
}

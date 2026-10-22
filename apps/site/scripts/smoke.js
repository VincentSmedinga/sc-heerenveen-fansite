// Starts the built site the way the host does and checks what a visitor and a search engine get. CI runs it on the
// folder it is about to deploy, so a broken copy never leaves the runner.
//
//   node scripts/smoke.js <folder with apps/site/server.js>
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import path from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'

const [folder] = process.argv.slice(2)

if (folder === undefined) {
  console.error('Usage: node scripts/smoke.js <folder with apps/site/server.js>')
  process.exit(2)
}

const port = process.env['SMOKE_PORT'] ?? '3123'
const origin = `http://127.0.0.1:${port}`
const serverFile = path.resolve(folder, 'apps/site/server.js')

/**
 * Finds every address a page loads by itself: scripts, stylesheets, fonts, images, media and frames, in the HTML and in
 * the stylesheets it links. A link to another site (`<a href>`) isn't loaded until a visitor follows it, so it isn't
 * one of them.
 */
async function loadedUrls(pageUrl, html) {
  const tags = html.match(/<(?:audio|embed|iframe|img|link|object|script|source|track|video)\b[^>]*>/gi) ?? []
  const urls = tags.flatMap((tag) =>
    [...tag.matchAll(/\s(?:data|href|poster|src|srcset)="([^"]*)"/gi)].flatMap(([, value]) =>
      value.split(',').map((candidate) => new URL(candidate.trim().split(/\s+/)[0], pageUrl)),
    ),
  )
  const stylesheets = urls.filter((url) => url.origin === origin && url.pathname.endsWith('.css'))

  for (const stylesheet of stylesheets) {
    const css = await (await fetch(stylesheet)).text()

    for (const [, , value] of css.matchAll(/(?:url\(|@import\s+)\s*(['"]?)([^'")\s;]+)\1/g)) {
      urls.push(new URL(value, stylesheet))
    }
  }

  return urls
}

async function waitUntilUp(server) {
  for (let attempt = 0; attempt < 60; attempt++) {
    assert.equal(server.exitCode, null, 'the server stopped while starting')

    try {
      await fetch(origin)
      return
    } catch {
      await sleep(500)
    }
  }

  assert.fail('the server did not answer within 30 seconds')
}

/** Starts the server with the given SITE_ENV (or none), runs the checks and always stops the server again. */
async function withServer(siteEnv, checks) {
  const env = { ...process.env, HOSTNAME: '127.0.0.1', PORT: port }
  delete env['SITE_ENV']

  if (siteEnv !== undefined) {
    env['SITE_ENV'] = siteEnv
  }

  const server = spawn('node', [serverFile], { env, stdio: ['ignore', 'pipe', 'pipe'] })
  let output = ''
  server.stdout.on('data', (chunk) => (output += chunk))
  server.stderr.on('data', (chunk) => (output += chunk))

  try {
    await checks(server)
  } catch (error) {
    console.error(output)
    throw error
  } finally {
    // Wait until the port is free again, because the next run uses the same one.
    if (server.exitCode === null) {
      server.kill()
      await once(server, 'exit')
    }
  }
}

await withServer('acceptance', async (server) => {
  await waitUntilUp(server)

  const home = await fetch(origin)
  const html = await home.text()
  assert.equal(home.status, 200)
  assert.match(html, /<html lang="nl"/)
  assert.equal(home.headers.get('x-powered-by'), null)

  const asset = html.match(/\/_next\/static\/[^"'\\]+\.(?:css|js)/)?.[0]
  assert.ok(asset, 'the page links to no static file')

  const robots = await fetch(`${origin}/robots.txt`)
  assert.match(await robots.text(), /^Disallow: \/$/m)

  // The sources page reads the register, so the database driver must be in the folder too.
  const sources = await fetch(`${origin}/bronnen`)
  const sourcesHtml = await sources.text()
  assert.equal(sources.status, 200)
  assert.match(sourcesHtml, /<h1[^>]*>Onze bronnen<\/h1>/)

  // Every kind of response carries the headers: a page, a page from the database, robots.txt, a static file and a 404.
  for (const response of [home, sources, robots, await fetch(origin + asset), await fetch(`${origin}/bestaat-niet`)]) {
    assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow', response.url)
    assert.match(response.headers.get('content-security-policy') ?? '', /^default-src 'self';/, response.url)
  }

  // A page loads nothing from another domain: no script, stylesheet, font or image (editorial principle 3).
  for (const [page, pageHtml] of [
    [origin, html],
    [`${origin}/bronnen`, sourcesHtml],
  ]) {
    const urls = await loadedUrls(page, pageHtml)
    assert.ok(
      urls.some((url) => url.pathname.endsWith('.woff2')),
      `${page} loads no font of our own`,
    )

    for (const url of urls) {
      assert.equal(url.origin, origin, `${page} loads ${url.href}`)
    }
  }

  assert.equal((await fetch(origin + asset)).status, 200, 'the static file is missing from the folder')

  // The 404 page is in Dutch too, not the English page of Next.js.
  const missing = await fetch(`${origin}/bestaat-niet`)
  const missingHtml = await missing.text()
  assert.equal(missing.status, 404)
  assert.match(missingHtml, /Pagina niet gevonden/)
  assert.doesNotMatch(missingHtml, /could not be found/)
})

await withServer('production', async (server) => {
  await waitUntilUp(server)

  const home = await fetch(origin)
  assert.equal(home.headers.get('x-robots-tag'), null, 'production must be indexable')
  assert.doesNotMatch(await (await fetch(`${origin}/robots.txt`)).text(), /^Disallow: \/$/m)
})

await withServer(undefined, async (server) => {
  const [code] = await Promise.race([once(server, 'exit'), sleep(30_000).then(() => [undefined])])
  assert.ok(code !== undefined && code !== 0, 'the server must refuse to start without SITE_ENV')
})

console.log('Smoke test passed.')

// Starts the built site the way the host does and checks what a visitor and a search engine get. CI runs it on the
// folder it is about to deploy, so a broken copy never leaves the runner.
//
// The site makes its own tables when it starts, so each run that needs a database gets an empty one, made on the server
// in DATABASE_URL and dropped afterwards. That also proves that the folder holds the migrations.
//
//   node scripts/smoke.js <folder with apps/site/server.js>
import { connect } from '@fansite/db/client'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { once } from 'node:events'
import path from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'

const [folder] = process.argv.slice(2)

if (folder === undefined) {
  console.error('Usage: node scripts/smoke.js <folder with apps/site/server.js>')
  process.exit(2)
}

const databaseUrl = process.env['DATABASE_URL']

if (databaseUrl === undefined) {
  console.error('DATABASE_URL is missing: the smoke test makes a database of its own on that server.')
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

/** Makes an empty database on the server in DATABASE_URL, runs the checks with its address and always drops it again. */
async function withEmptyDatabase(checks) {
  const server = new URL(databaseUrl)
  server.pathname = ''
  const name = `fansite_smoke_${randomBytes(6).toString('hex')}`
  const { close, pool } = connect(server.href)

  try {
    await pool.query('CREATE DATABASE ??', [name])

    try {
      const url = new URL(databaseUrl)
      url.pathname = `/${name}`
      await checks(url.href)
    } finally {
      await pool.query('DROP DATABASE IF EXISTS ??', [name])
    }
  } finally {
    await close()
  }
}

/**
 * Starts the server with the given SITE_ENV (or none) and database, runs the checks and always stops the server again.
 * The checks get the server and a function that returns what the server has written to its log so far.
 */
async function withServer({ database, siteEnv }, checks) {
  const env = { ...process.env, DATABASE_URL: database, HOSTNAME: '127.0.0.1', PORT: port }
  delete env['SITE_ENV']

  if (siteEnv !== undefined) {
    env['SITE_ENV'] = siteEnv
  }

  const server = spawn('node', [serverFile], { env, stdio: ['ignore', 'pipe', 'pipe'] })
  let output = ''
  server.stdout.on('data', (chunk) => (output += chunk))
  server.stderr.on('data', (chunk) => (output += chunk))

  try {
    await checks(server, () => output)
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

// On acceptance the site makes the tables in an empty database and puts the sources from the seed in them, before it
// answers.
await withEmptyDatabase((database) =>
  withServer({ database, siteEnv: 'acceptance' }, async (server, log) => {
    await waitUntilUp(server)
    assert.match(log(), /The database is up to date, with the sources from the seed\./)

    const home = await fetch(origin)
    const html = await home.text()
    assert.equal(home.status, 200)
    assert.match(html, /<html lang="nl"/)
    assert.equal(home.headers.get('x-powered-by'), null)

    // The homepage reads the items from the database, and the seed has none. So it says there is no news this week.
    assert.match(html, /<h1[^>]*>sc Heerenveen Fansite<\/h1>/)
    assert.match(html, /<h2[^>]*>sc Heerenveen in de media<\/h2>/)
    assert.match(html, /We hebben deze week nog geen nieuws gevonden\. Kijk straks nog eens\./)
    assert.match(html, /<a href="\/bronnen">Onze bronnen<\/a>/)
    assert.doesNotMatch(html, /Binnenkort meer/)

    const asset = html.match(/\/_next\/static\/[^"'\\]+\.(?:css|js)/)?.[0]
    assert.ok(asset, 'the page links to no static file')

    const robots = await fetch(`${origin}/robots.txt`)
    assert.match(await robots.text(), /^Disallow: \/$/m)

    // The sources page reads the register, so the database driver must be in the folder too, and the test sources must
    // be in it. The source that is switched off isn't on the page.
    const sources = await fetch(`${origin}/bronnen`)
    const sourcesHtml = await sources.text()
    assert.equal(sources.status, 200)
    assert.match(sourcesHtml, /<h1[^>]*>Onze bronnen<\/h1>/)
    assert.match(sourcesHtml, /Testkrant/)
    assert.doesNotMatch(sourcesHtml, /Uitgezette testbron/)

    // Every kind of response carries the headers: a page, a page from the database, robots.txt, a static file and a 404.
    for (const response of [
      home,
      sources,
      robots,
      await fetch(origin + asset),
      await fetch(`${origin}/bestaat-niet`),
    ]) {
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
  }),
)

// On production the tables come too, but never the test sources.
await withEmptyDatabase((database) =>
  withServer({ database, siteEnv: 'production' }, async (server, log) => {
    await waitUntilUp(server)
    assert.match(log(), /The database is up to date\./)

    const home = await fetch(origin)
    assert.equal(home.headers.get('x-robots-tag'), null, 'production must be indexable')
    assert.match(await home.text(), /We hebben deze week nog geen nieuws gevonden\./)
    assert.doesNotMatch(await (await fetch(`${origin}/robots.txt`)).text(), /^Disallow: \/$/m)

    const sources = await fetch(`${origin}/bronnen`)
    const sourcesHtml = await sources.text()
    assert.equal(sources.status, 200)
    assert.match(sourcesHtml, /We hebben nog geen bronnen/)
    assert.doesNotMatch(sourcesHtml, /Testkrant/)
  }),
)

// A database that isn't there doesn't stop the site. The log says what is wrong, and the pages that read the database, the
// homepage and the sources page, are the error page. The error page is in the HTML, so it works without JavaScript. The
// status is 200: Next.js can't send a page that failed with a 5xx and the page in the HTML, so the page asks search
// engines to leave it out.
const unreachable = new URL(databaseUrl)
unreachable.hostname = '127.0.0.1'
unreachable.port = '1'

await withServer({ database: unreachable.href, siteEnv: 'acceptance' }, async (server, log) => {
  await waitUntilUp(server)
  assert.match(log(), /Could not bring the database up to date.*ECONNREFUSED/)

  const home = await fetch(origin)
  const homeHtml = await home.text()
  assert.equal(home.status, 200)
  assert.match(homeHtml, /<h1[^>]*>Er ging iets mis<\/h1>/)
  // The title template of the layout doesn't reach the page in its own segment, so the title is the error title alone.
  assert.match(homeHtml, /<title>Er ging iets mis<\/title>/)
  assert.match(homeHtml, /<meta name="robots" content="noindex"\/>/)
  assert.match(homeHtml, /<a href="\/">Probeer het opnieuw<\/a>/)
  assert.doesNotMatch(homeHtml, /sc Heerenveen in de media|Binnenkort meer/)
  assert.match(log(), /Could not read the headlines for the homepage: .*ECONNREFUSED/)

  const sources = await fetch(`${origin}/bronnen`)
  const sourcesHtml = await sources.text()
  assert.equal(sources.status, 200)
  assert.match(sourcesHtml, /<h1[^>]*>Er ging iets mis<\/h1>/)
  assert.match(sourcesHtml, /<title>Er ging iets mis – sc Heerenveen Fansite<\/title>/)
  assert.match(sourcesHtml, /<meta name="robots" content="noindex"\/>/)
  assert.match(sourcesHtml, /<a href="https:\/\/forum\.heerenveen\.org">het forum<\/a>/)
  assert.match(sourcesHtml, /<a href="\/bronnen">Probeer het opnieuw<\/a>/)
  assert.match(sourcesHtml, /<a href="\/">Naar de homepage<\/a>/)
  // In the page layout, with the header and the footer.
  assert.match(sourcesHtml, /<header[^>]*>[\s\S]*<main[^>]*>[\s\S]*Er ging iets mis[\s\S]*<\/main>[\s\S]*<footer/)
  assert.doesNotMatch(sourcesHtml, /Testkrant|Onze bronnen<\/h1>/)
  assert.match(log(), /Could not read the sources for \/bronnen: .*ECONNREFUSED/)
  assert.equal(server.exitCode, null, 'the server must keep running')
})

await withServer({ database: databaseUrl, siteEnv: undefined }, async (server) => {
  const [code] = await Promise.race([once(server, 'exit'), sleep(30_000).then(() => [undefined])])
  assert.ok(code !== undefined && code !== 0, 'the server must refuse to start without SITE_ENV')
})

console.log('Smoke test passed.')

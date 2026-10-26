// Starts the built site the way the host does and checks what a visitor and a search engine
// get. CI runs it on the folder it is about to deploy, so a broken copy never leaves the
// runner.
//
// The site makes its own tables when it starts, so each run that needs a database gets an empty
// one, made on the server in DATABASE_URL and dropped afterwards. That also proves that the
// folder holds the migrations.
//
//   node scripts/smoke.js <folder with apps/site/server.js>
import { connect } from '@fansite/db/client'
import { visitDay } from '@fansite/db/visits'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { once } from 'node:events'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'

import { pages, shareImage } from '../src/pages.ts'
import { releaseNotes } from '../src/release-notes.ts'
import { dateOf, releasesOf } from '../src/updates.ts'

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
// Made-up settings of the mail server, for the servers that need them to start. Nothing here
// sends mail.
const smtpSettings = {
  MAIL_FROM: 'Smoke <smoke@example.org>',
  SMTP_HOST: 'localhost',
  SMTP_PASSWORD: 'smoke',
  SMTP_PORT: '465',
  SMTP_USER: 'smoke@example.org',
}
const serverFile = path.resolve(folder, 'apps/site/server.js')

// The versions Updates must show: those in the CHANGELOG.md of this checkout that have Dutch
// sentences. The bundler puts the file into the build, and the page shows nothing when that
// fails, so the smoke test compares the two. Before the first release there is no file and no
// version.
const changelogFile = path.resolve(import.meta.dirname, '../../../CHANGELOG.md')
const releases = releasesOf(existsSync(changelogFile) ? readFileSync(changelogFile, 'utf8') : '', releaseNotes)

// The layers of the design system, from weak to strong, as layers.css declares them. The build
// must keep that order.
const layersFile = path.resolve(import.meta.dirname, '../../../packages/design-system/src/layers.css')
const declaredLayers = layersIn(readFileSync(layersFile, 'utf8'))
assert.ok(declaredLayers.length > 0, 'layers.css declares no layers')

/**
 * Checks what the admin sends on this environment, whichever it is: a visitor without a session
 * goes to the login page, and every response under /beheer, a redirect too, keeps search
 * engines and caches away and sends no referrer. Returns the responses of the login pages, so
 * the caller can look at more.
 */
async function checkAdmin() {
  const admin = await fetch(`${origin}/beheer`, { redirect: 'manual' })
  assert.equal(admin.status, 307)
  assert.equal(new URL(admin.headers.get('location') ?? '', origin).pathname, '/beheer/inloggen')

  const responses = [admin]

  for (const path of ['/beheer/inloggen', '/beheer/inloggen/verstuurd', '/beheer/inloggen/bevestigen?token=onbekend']) {
    const response = await fetch(origin + path)
    const html = await response.text()
    assert.equal(response.status, 200, path)
    assert.match(html, /<meta name="robots" content="noindex, nofollow"\/>/, path)
    assert.doesNotMatch(html, /<link rel="canonical"/, path)
    responses.push(response)
  }

  // The pages of the articles, the preview of a draft and the versions among them, are no page
  // for a visitor without a session either.
  for (const path of [
    '/beheer/artikelen',
    '/beheer/artikelen/nieuw',
    '/beheer/artikelen/1',
    '/beheer/artikelen/1/versies/1',
    '/beheer/artikelen/1/voorbeeld',
  ]) {
    const response = await fetch(origin + path, { redirect: 'manual' })
    assert.equal(response.status, 307, path)
    assert.equal(new URL(response.headers.get('location') ?? '', origin).pathname, '/beheer/inloggen', path)
    responses.push(response)
  }

  const login = await (await fetch(`${origin}/beheer/inloggen`)).text()
  assert.match(login, /<h1[^>]*>Inloggen voor beheer<\/h1>/)
  assert.match(login, /<input[^>]*type="email"/)
  assert.doesNotMatch(login, /type="password"/)

  for (const response of [...responses, await fetch(`${origin}/beheer/bestaat-niet`)]) {
    assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow', response.url)
    // Next.js sends a longer value of its own for a page it renders on each request (`private,
    // no-cache, no-store, ...`).
    assert.match(response.headers.get('cache-control') ?? '', /(?:^|,\s*)no-store(?:,|$)/, response.url)
    assert.equal(response.headers.get('referrer-policy'), 'same-origin', response.url)
    assert.equal(response.headers.get('set-cookie'), null, `${response.url} sets a cookie without a login`)
  }

  const robots = await (await fetch(`${origin}/robots.txt`)).text()
  assert.match(robots, /^Disallow: \/beheer$/m, 'robots.txt must refuse /beheer')

  return responses
}

/**
 * Lists the names of the cascade layers in some CSS, in the order they first appear in a
 * statement or a block.
 */
/**
 * Checks the counting of the visits on a server that runs: a few visits of two visitors and
 * the requests that must not count. The counting runs after the response, so the numbers are
 * read once they are in. Nothing in the database may hold the address or the browser text.
 */
async function checkCounting(database) {
  const browser = 'Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0'
  const visitor = (address, headers = {}) => ({
    accept: 'text/html',
    'user-agent': browser,
    'x-forwarded-for': address,
    ...headers,
  })
  const get = async (path, headers) => {
    const response = await fetch(origin + path, { headers, redirect: 'manual' })
    await response.arrayBuffer()
    assert.equal(response.headers.get('set-cookie'), null, `${path} sets a cookie`)

    return response
  }

  for (let visit = 0; visit < 3; visit++) {
    await get('/privacy?nieuws=1', visitor('203.0.113.7'))
  }

  await get('/', visitor('198.51.100.23'))

  // None of these counts: a visitor who asks not to be counted, bots, a prefetch, the admin,
  // files, the addresses for machines and pages that don't exist.
  await get('/', visitor('203.0.113.9', { dnt: '1' }))
  await get('/', visitor('203.0.113.9', { 'sec-gpc': '1' }))
  await get('/', visitor('203.0.113.9', { 'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' }))
  await get('/', visitor('203.0.113.9', { 'sec-purpose': 'prefetch' }))
  await get('/', { 'x-forwarded-for': '203.0.113.9' })
  await get('/beheer', visitor('203.0.113.9'))
  await get('/beheer/inloggen', visitor('203.0.113.9'))
  await get('/robots.txt', visitor('203.0.113.9'))
  await get('/sitemap.xml', visitor('203.0.113.9'))
  await get('/updates/feed.xml', visitor('203.0.113.9'))
  await get('/manifest.webmanifest', visitor('203.0.113.9'))
  await get('/bestaat-niet', visitor('203.0.113.9'))
  await get('/redactie/bestaat-niet', visitor('203.0.113.9'))

  const day = visitDay(new Date())
  const { close, pool } = connect(database)

  try {
    let views = []

    for (let attempt = 0; attempt < 40; attempt++) {
      ;[views] = await pool.query('SELECT CAST(day AS CHAR) AS day, path, views FROM page_views ORDER BY path')

      if (views.reduce((total, row) => total + row.views, 0) >= 4) {
        break
      }

      await sleep(250)
    }

    // Wait a little more, so a view that wrongly counts has the time to show up.
    await sleep(500)
    ;[views] = await pool.query('SELECT CAST(day AS CHAR) AS day, path, views FROM page_views ORDER BY path')
    assert.deepEqual(
      views.map(({ day, path, views }) => ({ day, path, views })),
      [
        { day, path: '/', views: 1 },
        { day, path: '/privacy', views: 3 },
      ],
    )

    const [visitors] = await pool.query('SELECT CAST(day AS CHAR) AS day, visitors FROM daily_visitors')
    assert.deepEqual(
      visitors.map(({ day, visitors }) => ({ day, visitors })),
      [{ day, visitors: 2 }],
    )

    const [[{ hashes }]] = await pool.query('SELECT COUNT(*) AS hashes FROM visitor_hashes')
    assert.equal(hashes, 2)

    // Neither the address nor the browser text is in any table.
    const [tables] = await pool.query(
      'SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE()',
    )

    for (const { name } of tables) {
      const [rows] = await pool.query('SELECT * FROM ??', [name])
      const content = JSON.stringify(rows)

      for (const secret of ['203.0.113', '198.51.100', 'Firefox', 'Mozilla']) {
        assert.ok(!content.includes(secret), `the table ${name} holds "${secret}"`)
      }
    }
  } finally {
    await close()
  }
}

/**
 * Fetches the feed of Updates and checks it: RSS, an item per version, and links to the site in
 * `siteOrigin`.
 */
async function checkFeed(siteOrigin) {
  const feed = await fetch(`${origin}/updates/feed.xml`)
  const xml = await feed.text()
  assert.equal(feed.status, 200)
  assert.equal(feed.headers.get('content-type'), 'application/rss+xml; charset=utf-8')
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<rss version="2\.0"/)
  assert.ok(xml.includes(`<link>${siteOrigin}/updates</link>`), `the feed doesn't link to ${siteOrigin}`)
  assert.equal(xml.match(/<item>/g)?.length ?? 0, releases.length)

  for (const { version } of releases) {
    assert.ok(xml.includes(`<link>${siteOrigin}/updates#versie-${version}</link>`), `no link to ${version}`)
  }

  return feed
}

/**
 * Checks that the site serves the manifest and the icons itself, with the right type, and that
 * they are what the manifest says: PNGs of the sizes in the manifest, and an icon file that
 * starts with an icon header. Returns the responses, so the caller can check their headers.
 */
async function checkIcons() {
  const manifestResponse = await fetch(`${origin}/manifest.webmanifest`)
  const manifest = await manifestResponse.json()
  assert.equal(manifestResponse.status, 200)
  assert.match(manifestResponse.headers.get('content-type') ?? '', /^application\/manifest\+json/)
  assert.equal(manifest.name, 'sc Heerenveen Fansite')
  assert.equal(manifest.short_name, 'Fansite')
  assert.equal(manifest.start_url, '/')
  assert.equal(manifest.lang, 'nl')
  assert.equal(manifest.display, 'standalone')
  assert.equal(manifest.icons.length, 3)

  const responses = [manifestResponse]

  for (const { sizes, src, type } of manifest.icons) {
    const icon = await fetch(origin + src)
    const bytes = new Uint8Array(await icon.arrayBuffer())
    const view = new DataView(bytes.buffer)
    assert.equal(icon.status, 200, src)
    assert.equal(icon.headers.get('content-type'), type, src)
    assert.deepEqual([...bytes.slice(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], src)
    assert.equal(`${view.getUint32(16)}x${view.getUint32(20)}`, sizes, src)
    responses.push(icon)
  }

  const appleIcon = await fetch(`${origin}/apple-touch-icon.png`)
  const appleBytes = new Uint8Array(await appleIcon.arrayBuffer())
  assert.equal(appleIcon.status, 200)
  assert.equal(appleIcon.headers.get('content-type'), 'image/png')
  assert.deepEqual(
    [new DataView(appleBytes.buffer).getUint32(16), new DataView(appleBytes.buffer).getUint32(20)],
    [180, 180],
  )

  const favicon = await fetch(`${origin}/favicon.ico`)
  const faviconBytes = new Uint8Array(await favicon.arrayBuffer())
  assert.equal(favicon.status, 200)
  assert.match(favicon.headers.get('content-type') ?? '', /^image\/(?:x-icon|vnd\.microsoft\.icon)$/)
  // An icon file starts with two zero bytes, the type 1 for an icon and the number of images.
  assert.deepEqual([...faviconBytes.slice(0, 4)], [0, 0, 1, 0])
  assert.ok(faviconBytes[4] > 0, '/favicon.ico holds no image')

  const svg = await fetch(`${origin}/icon.svg`)
  assert.equal(svg.status, 200)
  assert.equal(svg.headers.get('content-type'), 'image/svg+xml')
  assert.match(await svg.text(), /^<svg /)

  return [...responses, appleIcon, favicon, svg]
}

/**
 * Checks that the page links to the manifest and the icons, which come from our own server, and
 * that the browser gets the colours of the header and the short name for the home screen of an
 * iPhone.
 */
function checkIconTags(path, html) {
  assert.match(html, /<link rel="manifest" href="\/manifest\.webmanifest"/, path)
  assert.match(html, /<link rel="icon" href="\/icon\.svg" type="image\/svg\+xml"/, path)
  assert.match(html, /<link rel="icon" href="\/favicon\.ico" sizes="16x16 32x32 48x48" type="image\/x-icon"/, path)
  assert.match(
    html,
    /<link rel="apple-touch-icon" href="\/apple-touch-icon\.png" sizes="180x180" type="image\/png"/,
    path,
  )
  assert.match(html, /<meta name="apple-mobile-web-app-title" content="Fansite"/, path)
  assert.match(html, /<meta name="theme-color" content="#[0-9a-f]{6}" media="\(prefers-color-scheme: light\)"/, path)
  assert.match(html, /<meta name="theme-color" content="#[0-9a-f]{6}" media="\(prefers-color-scheme: dark\)"/, path)
}

/**
 * Checks that a page gives the layers of the design system their declared order. A browser
 * orders the layers by their first appearance, across all the stylesheets of the page in the
 * order of the links. So the statement with the order must come before the first block of any
 * layer. The bundler once put it at the end, and typography beat the components.
 */
async function checkLayerOrder(pageUrl, html) {
  const links = html.match(/<link\b[^>]*>/gi) ?? []
  let css = ''

  for (const link of links.filter((tag) => /\srel="stylesheet"/i.test(tag))) {
    const href = link.match(/\shref="([^"]*)"/i)?.[1]
    assert.ok(href, `${pageUrl} has a stylesheet without an address`)
    css += await (await fetch(new URL(href, pageUrl))).text()
  }

  assert.deepEqual(
    layersIn(css).filter((layer) => layer.startsWith('hf.')),
    declaredLayers,
    `${pageUrl} doesn't order the layers of the design system as layers.css does`,
  )
}

/**
 * Checks the tags of a page for search engines and for shared links: the description, the
 * canonical URL and the Open Graph tags with the address of `siteOrigin`, and a picture that
 * comes from that same domain and that the site serves.
 */
async function checkMetaTags(path, html, siteOrigin) {
  const url = `${siteOrigin}${path}`
  const description = pages.find((page) => page.path === path)?.description
  const content = (attribute, name) =>
    [...html.matchAll(new RegExp(`<meta ${attribute}="${name}" content="([^"]*)"`, 'g'))].map(([, value]) => value)

  assert.deepEqual(html.match(/<link rel="canonical" href="[^"]*"/g), [`<link rel="canonical" href="${url}"`], path)
  assert.deepEqual(content('name', 'description'), [description], path)
  assert.deepEqual(content('property', 'og:url'), [url], path)
  assert.deepEqual(content('property', 'og:description'), [description], path)
  assert.deepEqual(content('property', 'og:type'), ['website'], path)
  assert.deepEqual(content('property', 'og:site_name'), ['sc Heerenveen Fansite'], path)
  assert.deepEqual(content('property', 'og:locale'), ['nl_NL'], path)
  assert.equal(content('property', 'og:title').length, 1, path)
  assert.deepEqual(content('property', 'og:image'), [`${siteOrigin}${shareImage.path}`], path)
  assert.deepEqual(content('property', 'og:image:width'), [String(shareImage.width)], path)
  assert.deepEqual(content('property', 'og:image:height'), [String(shareImage.height)], path)
  assert.deepEqual(content('property', 'og:image:alt'), [shareImage.alt], path)
}

/** Checks that the site serves the picture for shared links itself, as a PNG. */
async function checkShareImage() {
  const image = await fetch(origin + shareImage.path)
  const bytes = new Uint8Array(await image.arrayBuffer())
  assert.equal(image.status, 200)
  assert.equal(image.headers.get('content-type'), 'image/png')
  // The PNG signature, then the width and height in the first chunk.
  assert.deepEqual([...bytes.slice(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const view = new DataView(bytes.buffer)
  assert.deepEqual([view.getUint32(16), view.getUint32(20)], [shareImage.width, shareImage.height])

  return image
}

/**
 * Fetches the sitemap and checks it: the pages of the site, each with the address of
 * `siteOrigin`, and nothing but the addresses (no lastmod, changefreq or priority). The feed of
 * Updates is not a page, so it is not in it.
 */
async function checkSitemap(siteOrigin) {
  const sitemap = await fetch(`${origin}/sitemap.xml`)
  const xml = await sitemap.text()
  assert.equal(sitemap.status, 200)
  assert.match(sitemap.headers.get('content-type') ?? '', /^application\/xml/)
  assert.deepEqual(
    [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map(([, location]) => location),
    pages.map(({ path }) => `${siteOrigin}${path}`),
  )
  assert.doesNotMatch(xml, /lastmod|changefreq|priority|feed\.xml/)

  return sitemap
}

function layersIn(css) {
  const layers = []

  for (const [, names] of css.replaceAll(/\/\*[\s\S]*?\*\//g, '').matchAll(/@layer\s+([^;{]*)[;{]/g)) {
    for (const name of names.split(',').map((candidate) => candidate.trim())) {
      if (name !== '' && !layers.includes(name)) {
        layers.push(name)
      }
    }
  }

  return layers
}

/**
 * Finds every address a page loads by itself: scripts, stylesheets, fonts, images, media and
 * frames, in the HTML and in the stylesheets it links. A link to another site (`<a href>`)
 * isn't loaded until a visitor follows it, so it isn't one of them.
 */
async function loadedUrls(pageUrl, html) {
  // The canonical URL names the page itself, with the address of the environment. A browser
  // doesn't load it.
  const tags = (html.match(/<(?:audio|embed|iframe|img|link|object|script|source|track|video)\b[^>]*>/gi) ?? []).filter(
    (tag) => !/\srel="canonical"/i.test(tag),
  )
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

/**
 * Makes an empty database on the server in DATABASE_URL, runs the checks with its address and
 * always drops it again.
 */
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
 * Starts the server with the given SITE_ENV (or none), database and, unless `smtp` is false,
 * made-up mail settings, runs the checks and always stops the server again. The checks get the
 * server and a function that returns what the server has written to its log so far.
 */
async function withServer({ database, siteEnv, smtp = true }, checks) {
  const env = { ...process.env, DATABASE_URL: database, HOSTNAME: '127.0.0.1', PORT: port }
  delete env['SITE_ENV']

  // Acceptance and production don't start without the settings of the mail server.
  for (const name of Object.keys(smtpSettings)) {
    delete env[name]
  }

  if (smtp) {
    Object.assign(env, smtpSettings)
  }

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

// On acceptance the site makes the tables in an empty database and puts the sources from the
// seed in them, before it answers.
await withEmptyDatabase((database) =>
  withServer({ database, siteEnv: 'acceptance' }, async (server, log) => {
    await waitUntilUp(server)
    assert.match(log(), /The database is up to date, with the sources from the seed\./)

    const home = await fetch(origin)
    const html = await home.text()
    assert.equal(home.status, 200)
    assert.match(html, /<html data-scroll-behavior="smooth" lang="nl"/)
    assert.equal(home.headers.get('x-powered-by'), null)

    // The homepage reads the items from the database, and the seed has none. So it says there
    // is no news yet.
    assert.match(html, /<h1[^>]*>sc Heerenveen Fansite<\/h1>/)
    assert.match(html, /<h2[^>]*>Laatste nieuws<\/h2>/)
    assert.match(html, /We hebben nog geen nieuws gevonden\. Kijk straks nog eens\./)
    assert.match(html, /<a href="\/bronnen">Onze bronnen<\/a>/)
    assert.doesNotMatch(html, /Binnenkort meer/)
    assert.match(html, /<footer[^>]*>.*href="\/updates">Updates<\/a>.*<\/footer>/s)

    const asset = html.match(/\/_next\/static\/[^"'\\]+\.(?:css|js)/)?.[0]
    assert.ok(asset, 'the page links to no static file')

    const robots = await fetch(`${origin}/robots.txt`)
    const robotsText = await robots.text()
    assert.match(robotsText, /^Disallow: \/$/m)
    assert.doesNotMatch(robotsText, /^Sitemap:/im, 'acceptance refuses everything, so it points to no sitemap')
    await checkAdmin()

    // Each page has its description, canonical URL and Open Graph tags with the address of
    // acceptance, and the picture for shared links is a file of the site itself.
    for (const { path } of pages) {
      const response = await fetch(origin + path)
      assert.equal(response.status, 200, path)
      await checkMetaTags(path, await response.text(), 'https://acc.sc.heerenveen.org')
    }

    const sitemap = await checkSitemap('https://acc.sc.heerenveen.org')
    const shareImageResponse = await checkShareImage()

    // Every page points to the manifest and the icons, and the site serves them itself.
    for (const { path } of pages) {
      checkIconTags(path, await (await fetch(origin + path)).text())
    }

    const iconResponses = await checkIcons()

    // The sources page reads the register, so the database driver must be in the folder too,
    // and the test sources must be in it. The source that is switched off isn't on the page.
    const sources = await fetch(`${origin}/bronnen`)
    const sourcesHtml = await sources.text()
    assert.equal(sources.status, 200)
    assert.match(sourcesHtml, /<h1[^>]*>Onze bronnen<\/h1>/)
    assert.match(sourcesHtml, /Testkrant/)
    assert.doesNotMatch(sourcesHtml, /Uitgezette testbron/)

    // The podcast page reads the episodes, and the seed has none. A podcast or a page that
    // doesn't exist is a 404.
    const podcastPage = await fetch(`${origin}/podcasts`)
    const podcastHtml = await podcastPage.text()
    assert.equal(podcastPage.status, 200)
    assert.match(podcastHtml, /<h1[^>]*>Podcasts<\/h1>/)
    assert.match(podcastHtml, /We hebben nog geen podcastafleveringen gevonden\./)
    assert.equal((await fetch(`${origin}/podcasts?podcast=bestaat-niet`)).status, 404)
    assert.equal((await fetch(`${origin}/podcasts?pagina=2`)).status, 404)
    assert.equal((await fetch(`${origin}/podcasts?pagina=0`)).status, 404)

    // The matches page shows the made-up matches and table of the seed, with the credit for
    // Wikipedia under them. The homepage has the two blocks, under the podcasts.
    const matchesPage = await fetch(`${origin}/wedstrijden`)
    const matchesHtml = await matchesPage.text()
    assert.equal(matchesPage.status, 200)
    assert.match(matchesHtml, /<h1[^>]*>Wedstrijden<\/h1>/)
    assert.match(matchesHtml, /Testdorp FC/)
    assert.match(matchesHtml, /<caption class="hf-visually-hidden">Stand op \d+ \w+ \d{4}<\/caption>/)
    assert.match(matchesHtml, /Bron: Wikipedia \(.*CC BY-SA 4\.0.*Laatst gelezen op/s)
    assert.match(html, /id="matches-heading">Wedstrijden<\/h2>/)
    assert.match(html, /<a href="\/wedstrijden#stand">De volledige /)

    // Updates shows the versions of the build, newest first, and points feed readers to its
    // feed.
    const updatesResponse = await fetch(`${origin}/updates`)
    const updatesHtml = await updatesResponse.text()
    assert.equal(updatesResponse.status, 200)
    assert.match(updatesHtml, /<h1[^>]*>Updates<\/h1>/)
    assert.match(updatesHtml, /<link rel="alternate" type="application\/rss\+xml" href="\/updates\/feed\.xml"/)
    assert.deepEqual(
      [...updatesHtml.matchAll(/<h2[^>]*>(.*?)<\/h2>/g)].map(([, heading]) => heading.replaceAll(/<[^>]*>/g, '')),
      releases.map((release) => `${dateOf(release)} versie ${release.version}`),
    )

    if (releases.length === 0) {
      assert.match(updatesHtml, /We hebben nog geen versie uitgebracht\./)
    }

    // The old addresses of Updates and its feed forward for good, so old links and feed readers
    // keep working.
    for (const [from, to] of [
      ['/wat-is-er-nieuw', '/updates'],
      ['/wat-is-er-nieuw/feed.xml', '/updates/feed.xml'],
    ]) {
      const moved = await fetch(origin + from, { redirect: 'manual' })

      assert.equal(moved.status, 308, from)
      assert.equal(new URL(moved.headers.get('location') ?? '', origin).pathname, to)
    }

    const feed = await checkFeed('https://acc.sc.heerenveen.org')

    // Every kind of response carries the headers: a page, a page from the database, robots.txt,
    // a static file, a feed, the manifest, the icons and a 404.
    for (const response of [
      home,
      sources,
      robots,
      sitemap,
      shareImageResponse,
      ...iconResponses,
      feed,
      await fetch(origin + asset),
      await fetch(`${origin}/bestaat-niet`),
    ]) {
      assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow', response.url)
      assert.match(response.headers.get('content-security-policy') ?? '', /^default-src 'self';/, response.url)
    }

    // A page loads nothing from another domain: no script, stylesheet, font or image (editorial
    // principle 3).
    for (const [page, pageHtml] of [
      [origin, html],
      [`${origin}/bronnen`, sourcesHtml],
      [`${origin}/updates`, updatesHtml],
    ]) {
      const urls = await loadedUrls(page, pageHtml)
      assert.ok(
        urls.some((url) => url.pathname.endsWith('.woff2')),
        `${page} loads no font of our own`,
      )

      for (const url of urls) {
        assert.equal(url.origin, origin, `${page} loads ${url.href}`)
      }

      await checkLayerOrder(page, pageHtml)
    }

    assert.equal((await fetch(origin + asset)).status, 200, 'the static file is missing from the folder')

    // The 404 page is in Dutch too, not the English page of Next.js.
    const missing = await fetch(`${origin}/bestaat-niet`)
    const missingHtml = await missing.text()
    assert.equal(missing.status, 404)
    assert.match(missingHtml, /Pagina niet gevonden/)
    assert.doesNotMatch(missingHtml, /could not be found/)

    await checkCounting(database)
  }),
)

// On production the tables come too, but never the test sources.
await withEmptyDatabase((database) =>
  withServer({ database, siteEnv: 'production' }, async (server, log) => {
    await waitUntilUp(server)
    assert.match(log(), /The database is up to date\./)

    const home = await fetch(origin)
    assert.equal(home.headers.get('x-robots-tag'), null, 'production must be indexable')
    assert.match(await home.text(), /We hebben nog geen nieuws gevonden\./)
    const robots = await (await fetch(`${origin}/robots.txt`)).text()
    assert.doesNotMatch(robots, /^Disallow: \/$/m)
    assert.match(robots, /^Sitemap: https:\/\/sc\.heerenveen\.org\/sitemap\.xml$/m)
    // Production is indexable, but the admin is not, there too.
    await checkAdmin()

    for (const { path } of pages) {
      const response = await fetch(origin + path)
      assert.equal(response.status, 200, path)
      await checkMetaTags(path, await response.text(), 'https://sc.heerenveen.org')
    }

    await checkSitemap('https://sc.heerenveen.org')

    const sources = await fetch(`${origin}/bronnen`)
    const sourcesHtml = await sources.text()
    assert.equal(sources.status, 200)
    assert.match(sourcesHtml, /We hebben nog geen bronnen/)
    assert.doesNotMatch(sourcesHtml, /Testkrant/)

    // The feed links to production, not to acceptance.
    await checkFeed('https://sc.heerenveen.org')
  }),
)

// A database that isn't there doesn't stop the site. The log says what is wrong, and the pages
// that read the database, the homepage and the sources page, are the error page. The error page
// is in the HTML, so it works without JavaScript. The status is 200: Next.js can't send a page
// that failed with a 5xx and the page in the HTML, so the page asks search engines to leave it
// out.
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
  // The title template of the layout doesn't reach the page in its own segment, so the title is
  // the error title alone.
  assert.match(homeHtml, /<title>Er ging iets mis<\/title>/)
  assert.match(homeHtml, /<meta name="robots" content="noindex"\/>/)
  assert.match(homeHtml, /<a href="\/">Probeer het opnieuw<\/a>/)
  assert.doesNotMatch(homeHtml, /Laatste nieuws|Binnenkort meer/)
  assert.match(log(), /Could not read the headlines, discussions and episodes for the homepage: .*ECONNREFUSED/)

  const podcasts = await fetch(`${origin}/podcasts?podcast=omroep-abe&pagina=2`)
  const podcastsHtml = await podcasts.text()
  assert.equal(podcasts.status, 200)
  assert.match(podcastsHtml, /<h1[^>]*>Er ging iets mis<\/h1>/)
  assert.match(podcastsHtml, /<meta name="robots" content="noindex"\/>/)
  assert.match(podcastsHtml, /<a href="\/podcasts\?podcast=omroep-abe&amp;pagina=2">Probeer het opnieuw<\/a>/)
  assert.match(log(), /Could not read the episodes for \/podcasts: .*ECONNREFUSED/)

  const sources = await fetch(`${origin}/bronnen`)
  const sourcesHtml = await sources.text()
  assert.equal(sources.status, 200)
  assert.match(sourcesHtml, /<h1[^>]*>Er ging iets mis<\/h1>/)
  assert.match(sourcesHtml, /<title>Er ging iets mis – sc Heerenveen Fansite<\/title>/)
  assert.match(sourcesHtml, /<meta name="robots" content="noindex"\/>/)
  // The link to another site has the icon for it, behind the last word and hidden from
  // assistive technology.
  assert.match(
    sourcesHtml,
    /<a href="https:\/\/forum\.heerenveen\.org">het <span class="hf-icon-tail">forum<svg aria-hidden="true" class="hf-icon"/,
  )
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

await withServer({ database: databaseUrl, siteEnv: 'acceptance', smtp: false }, async (server, log) => {
  const [code] = await Promise.race([once(server, 'exit'), sleep(30_000).then(() => [undefined])])
  assert.ok(code !== undefined && code !== 0, 'the server must refuse to start on acceptance without the mail settings')
  assert.match(log(), /SMTP_HOST is missing/)
})

console.log('Smoke test passed.')

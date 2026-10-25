import { readdirSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { pages } from '../pages'
import sitemap from './sitemap'

// The pages that are not in the sitemap on purpose, as paths such as '/beheer'. A new page.tsx
// that isn't in the list of pages in pages.ts must be named here, so a new page doesn't forget
// the sitemap.
const notInSitemap: string[] = [
  '/beheer',
  '/beheer/berichten',
  '/beheer/inloggen',
  '/beheer/inloggen/bevestigen',
  '/beheer/inloggen/verstuurd',
  '/contact/verstuurd',
]

/** The path of every page.tsx under src/app, such as '/bronnen'. The homepage is '/'. */
function pagePaths() {
  return readdirSync(import.meta.dirname, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name === 'page.tsx')
    .map((entry) => {
      const folder = entry.parentPath.slice(import.meta.dirname.length).replaceAll('\\', '/')

      return folder === '' ? '/' : folder
    })
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('sitemap', () => {
  it.each([
    ['local', 'http://localhost:3000'],
    ['acceptance', 'https://acc.sc.heerenveen.org'],
    ['production', 'https://sc.heerenveen.org'],
  ])('lists the pages with the address of %s, and nothing else', (siteEnv, origin) => {
    vi.stubEnv('SITE_ENV', siteEnv)

    expect(sitemap()).toEqual(pages.map(({ path }) => ({ url: `${origin}${path}` })))
  })

  it('has no address with a query, such as the homepage with ?nieuws=10', () => {
    vi.stubEnv('SITE_ENV', 'local')

    expect(sitemap().filter(({ url }) => url.includes('?'))).toEqual([])
  })

  it('has every page.tsx of the app, or names it as an exception', () => {
    const listed = pages.map(({ path }) => String(path))
    const missing = pagePaths().filter((path) => !listed.includes(path) && !notInSitemap.includes(path))

    expect(missing, 'add the page to pages.ts, or to notInSitemap in this test').toEqual([])
  })

  it('lists only pages that exist, and no exception that is in the list too', () => {
    const existing = pagePaths()

    expect(pages.map(({ path }) => String(path)).filter((path) => !existing.includes(path))).toEqual([])
    expect(notInSitemap.filter((path) => !existing.includes(path))).toEqual([])
    expect(notInSitemap.filter((path) => pages.some((page) => page.path === path))).toEqual([])
  })
})

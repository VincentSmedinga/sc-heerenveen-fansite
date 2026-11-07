import { readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { cacheHeaders, iconCache, publicFileCaches, themeScriptCache } from './cache-headers'

const maxAge = (value: string) => Number(/max-age=(\d+)/.exec(value)?.[1])

describe('the cache of the files in public/', () => {
  it('has a rule for every file in public/, so a new file has to be given a cache on purpose', () => {
    const files = readdirSync(new URL('../public', import.meta.url)).map((name) => `/${name}`)

    expect(publicFileCaches.map(({ path }) => path).sort()).toEqual(files.sort())
  })

  it('has one rule per file, each with its own address and no pattern', async () => {
    const rules = await cacheHeaders()

    expect(rules).toHaveLength(publicFileCaches.length)

    for (const { headers, source } of rules) {
      expect(source).toMatch(/^\/[\w.-]+$/)
      expect(headers).toHaveLength(1)
      expect(headers[0]?.key).toBe('Cache-Control')
    }
  })

  it('keeps a file without a hash for a day or an hour, and never for a year or as immutable', () => {
    expect(maxAge(iconCache)).toBe(86400)
    expect(maxAge(themeScriptCache)).toBe(3600)

    for (const { cacheControl } of publicFileCaches) {
      expect(cacheControl).toMatch(/^public, max-age=\d+$/)
      expect(maxAge(cacheControl)).toBeLessThanOrEqual(86400)
      expect(cacheControl).not.toContain('immutable')
    }
  })

  it('keeps the script that blocks the first paint for less time than the icons', () => {
    expect(maxAge(themeScriptCache)).toBeLessThan(maxAge(iconCache))
  })

  it('sends nothing for a station between the server and the visitor', () => {
    for (const { cacheControl } of publicFileCaches) {
      expect(cacheControl).not.toMatch(/s-maxage|stale-while-revalidate|stale-if-error/)
    }
  })

  it('does not touch the pages, the admin or /_next/static, which keep what Next.js and the proxy send', async () => {
    for (const { source } of await cacheHeaders()) {
      expect(source).not.toMatch(/beheer|_next|:path|\*/)
    }
  })
})

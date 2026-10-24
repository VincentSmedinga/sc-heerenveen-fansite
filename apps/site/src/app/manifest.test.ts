import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { headerColourOf } from '../header-colour'
import { readPng } from '../read-png'
import manifest from './manifest'

const colours = headerColourOf(
  readFileSync(new URL('../../../../packages/design-system/src/tokens/colour.css', import.meta.url), 'utf8'),
)

describe('manifest', () => {
  it('names the site and starts it at the front page, in Dutch', () => {
    expect(manifest()).toMatchObject({
      description: 'Alle koppen en links over sc Heerenveen op één plek.',
      display: 'standalone',
      lang: 'nl',
      name: 'sc Heerenveen Fansite',
      scope: '/',
      short_name: 'Fansite',
      start_url: '/',
    })
  })

  it('has a start URL without parameters that keep track of anything', () => {
    expect(manifest().start_url).toBe('/')
  })

  it('takes the theme and the background from the colour of the header in the design system', () => {
    expect(manifest().theme_color).toBe(colours.light)
    expect(manifest().background_color).toBe(colours.light)
  })

  it('has the icons of 192 and 512 pixels for any use and the icon of 512 pixels that can be cut to a shape', () => {
    expect(manifest().icons?.map(({ purpose, sizes }) => [purpose, sizes])).toEqual([
      ['any', '192x192'],
      ['any', '512x512'],
      ['maskable', '512x512'],
    ])
  })

  it.each(manifest().icons ?? [])('has the file for $src in public, of the size it says', ({ sizes, src, type }) => {
    const png = readPng(readFileSync(new URL(`../../public${src}`, import.meta.url)))

    expect(type).toBe('image/png')
    expect(`${png.width}x${png.height}`).toBe(sizes)
  })

  it('loads nothing from another domain', () => {
    for (const { src } of manifest().icons ?? []) {
      expect(src).toMatch(/^\/[^/]/)
    }
  })
})

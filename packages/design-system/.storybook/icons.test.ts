import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { addIconsTo, iconTags } from './icons'
import main from './main'

describe('addIconsTo', () => {
  it('adds the icons to the head', () => {
    expect(addIconsTo('<title>x</title>')).toBe(`<title>x</title>${iconTags}`)
  })

  it('declares an SVG, an ICO and an apple-touch icon, which Safari looks for', () => {
    expect(iconTags).toMatch(/rel="icon"[^>]*type="image\/svg\+xml"[^>]*href="\.\/icon\.svg"/)
    expect(iconTags).toMatch(/rel="icon"[^>]*href="\.\/favicon\.ico"/)
    expect(iconTags).toMatch(/rel="apple-touch-icon"[^>]*sizes="180x180"[^>]*href="\.\/apple-touch-icon\.png"/)
  })

  it('points at files that are in the folder that main.ts serves from the root', () => {
    for (const [, file] of iconTags.matchAll(/href="\.\/([^"]+)"/g)) {
      expect(existsSync(path.join(import.meta.dirname, '../src/assets/icons/storybook', file!)), file).toBe(true)
    }
  })

  it('serves the logo of the design system as the SVG, as the fansite does', () => {
    const icon = readFileSync(path.join(import.meta.dirname, '../src/assets/icons/storybook/icon.svg'), 'utf8')
    expect(icon).toBe(readFileSync(path.join(import.meta.dirname, '../src/assets/logo.svg'), 'utf8'))
  })
})

// main.ts sets both heads as functions; the type also allows a string, and the options hold more than configType.
type HeadFunction = (head: string, options: { configType: string }) => Promise<string | undefined> | string | undefined

describe('the heads in main.ts', () => {
  it.each(['managerHead', 'previewHead'] as const)('%s has the icons once', async (name) => {
    const head = await (main[name] as HeadFunction)('<title>x</title>', { configType: 'PRODUCTION' })
    expect(head?.split(iconTags)).toHaveLength(2)
  })

  it('serves the folder of the icons from the root', () => {
    expect(main.staticDirs).toContainEqual({ from: '../src/assets/icons/storybook', to: '/' })
  })
})

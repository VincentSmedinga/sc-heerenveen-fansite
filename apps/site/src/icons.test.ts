import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { headerColourOf } from './header-colour'
import { hexOf, readPng } from './read-png'

// The files that scripts/make-icons.js makes. The tests read them from public, where the site serves them.
const publicFile = (name: string) => readFileSync(new URL(`../public/${name}`, import.meta.url))
const tokens = (name: string) =>
  readFileSync(new URL(`../../../packages/design-system/src/${name}`, import.meta.url), 'utf8')

const tile = headerColourOf(tokens('tokens/colour.css')).light
const transparent = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
]
const tiles = [
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-maskable-512.png', size: 512 },
]

describe('the transparent icons', () => {
  it.each(transparent)(
    '$name is $size by $size pixels, with transparent corners and the shield in the middle',
    ({ name, size }) => {
      const png = readPng(publicFile(name))
      const last = size - 1

      expect([png.width, png.height]).toEqual([size, size])

      for (const [x, y] of [
        [0, 0],
        [last, 0],
        [0, last],
        [last, last],
      ] as const) {
        expect(png.pixel(x, y).alpha, `the pixel at ${x}, ${y}`).toBe(0)
      }

      expect(png.pixel(size >> 1, size >> 1).alpha).toBe(255)
    },
  )
})

describe('the icons on a tile', () => {
  it.each(tiles)(
    '$name is $size by $size pixels, without transparency, in the colour of the header',
    ({ name, size }) => {
      const png = readPng(publicFile(name))
      const last = size - 1

      expect([png.width, png.height]).toEqual([size, size])

      for (const [x, y] of [
        [0, 0],
        [last, 0],
        [0, last],
        [last, last],
      ] as const) {
        expect(png.pixel(x, y).alpha, `the pixel at ${x}, ${y}`).toBe(255)
        expect(hexOf(png.pixel(x, y)), `the pixel at ${x}, ${y}`).toBe(tile)
      }
    },
  )

  it.each(tiles)('$name keeps the shield inside the middle 80% of the tile', ({ name, size }) => {
    const png = readPng(publicFile(name))
    const margin = Math.floor(size * 0.1)
    const stray: string[] = []

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const outside = x < margin || x >= size - margin || y < margin || y >= size - margin

        if (outside && hexOf(png.pixel(x, y)) !== tile) {
          stray.push(`${x},${y}`)
        }
      }
    }

    expect(stray.slice(0, 5)).toEqual([])
  })

  it.each(tiles)('$name has the shield on it, with its red leaf', ({ name, size }) => {
    const png = readPng(publicFile(name))

    expect(hexOf(png.pixel(size >> 1, Math.round(size * 0.46)))).toBe('#c22826')
  })
})

describe('favicon.ico', () => {
  const ico = publicFile('favicon.ico')

  it('is an icon file with PNGs of 16, 32 and 48 pixels, which keep their transparency', () => {
    expect([ico.readUInt16LE(0), ico.readUInt16LE(2), ico.readUInt16LE(4)]).toEqual([0, 1, 3])

    const sizes = [0, 1, 2].map((index) => {
      const entry = 6 + 16 * index
      const png = readPng(
        ico.subarray(ico.readUInt32LE(entry + 12), ico.readUInt32LE(entry + 12) + ico.readUInt32LE(entry + 8)),
      )

      expect([ico.readUInt8(entry), ico.readUInt8(entry + 1)]).toEqual([png.width, png.height])
      expect(png.pixel(0, 0).alpha).toBe(0)

      return png.width
    })

    expect(sizes).toEqual([16, 32, 48])
  })
})

describe('icon.svg', () => {
  it('is the vector of the design system, which scripts/make-icons.js copies', () => {
    expect(publicFile('icon.svg').toString('utf8')).toBe(tokens('assets/icon.svg'))
  })

  it('has no background: outside the shield the picture is transparent', () => {
    expect(tokens('assets/icon.svg')).not.toMatch(/<rect[^>]*fill="(?!#fff")/)
    expect(tokens('assets/icon.svg')).toContain('<clipPath id="hf-icon-field">')
  })
})

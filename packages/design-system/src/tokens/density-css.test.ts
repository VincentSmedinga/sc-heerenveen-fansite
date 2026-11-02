import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const src = join(import.meta.dirname, '..')

// Without the comments, which mention the class and the sizes in words.
const strip = (text: string) => text.replace(/\/\*.*?\*\//gs, '')

const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? files(join(dir, entry.name)) : [relative(src, join(dir, entry.name))],
  )

const all = files(src)
const cssFiles = all.filter((file) => file.endsWith('.css'))
const read = (file: string) => readFileSync(join(src, file), 'utf8')
const css = (file: string) => strip(read(file))

const density = css('tokens/density.css')
const declarations = [...density.matchAll(/([\w-]+)\s*:\s*([^;{}]+);/g)].map(([, name, value]) => ({
  name: name ?? '',
  value: (value ?? '').trim(),
}))
const value = (name: string) => declarations.find((declaration) => declaration.name === name)?.value ?? ''
const rem = (name: string) => Number(value(name).match(/^(\d*\.?\d+)rem$/)?.[1])
// The smallest size of a clamp(), which is the size at a narrow screen.
const smallest = (name: string) => Number(value(name).match(/^clamp\((\d*\.?\d+)rem,/)?.[1])

// The default values: every token the density changes is declared in the tokens, with one value
// for the default and one for the density.
const defaults = ['tokens/space.css', 'tokens/size.css', 'tokens/typography.css'].map(css).join('\n')

describe('the density in tokens/density.css', () => {
  it('is one class in the layer hf.tokens, loaded with the other tokens', () => {
    expect(density).toMatch(/^\s*@layer hf\.tokens \{\s*\.hf-density-compact \{[^{}]+\}\s*\}\s*$/)
    expect(read('index.css')).toContain("@import url('./tokens/density.css');")
  })

  it('sets nothing but custom properties of the design system', () => {
    expect(declarations.length).toBeGreaterThan(10)

    for (const { name } of declarations) {
      expect(name, name).toMatch(/^--hf-[a-z0-9-]+$/)
    }
  })

  it('gives new values to tokens that exist, and adds none', () => {
    for (const { name } of declarations) {
      expect(defaults, name).toMatch(new RegExp(`${name}: `))
    }
  })

  it('changes the space, the letters and the height of buttons and fields, and nothing else', () => {
    const names = declarations.map(({ name }) => name)

    expect(names.filter((name) => name.startsWith('--hf-space-'))).toHaveLength(5)
    expect(names).toContain('--hf-size-control')
    expect(names).toContain('--hf-size-control-small')

    for (const name of names) {
      expect(name, name).toMatch(/^--hf-(?:space-|size-control|[a-z0-9-]+-font-size$)/)
    }
  })

  it('keeps the steps of the space in the same order, each smaller than the default', () => {
    const steps = ['xs', 's', 'm', 'l', 'xl'].map((step) => rem(`--hf-space-${step}`))

    expect(steps).toEqual([...steps].sort((a, b) => a - b))
    expect(new Set(steps).size).toBe(5)
    expect(steps.every((step) => step < 2)).toBe(true)
    expect(rem('--hf-space-xl')).toBeLessThan(2)
    expect(rem('--hf-space-m')).toBeLessThan(1)
  })

  it('keeps the text readable: the smallest text at 0.75rem and running text at 0.875rem', () => {
    const fontSizes = declarations.filter(({ name }) => name.endsWith('-font-size'))

    expect(fontSizes.length).toBeGreaterThan(8)

    for (const { name } of fontSizes) {
      expect(rem(name) || smallest(name), name).toBeGreaterThanOrEqual(0.75)
    }

    for (const name of ['--hf-body-font-size', '--hf-intro-font-size', '--hf-headline-font-size']) {
      expect(rem(name), name).toBeGreaterThanOrEqual(0.875)
    }
  })

  it('keeps a button or field well above the 24 by 24 pixels of WCAG 2.5.8', () => {
    expect(rem('--hf-size-control-small')).toBeGreaterThanOrEqual(1.75)
    expect(rem('--hf-size-control')).toBeGreaterThan(rem('--hf-size-control-small'))
    expect(rem('--hf-size-control')).toBeLessThan(2.75)
  })

  it('keeps the headings in order, from 1 down to 4', () => {
    const sizes = [1, 2, 3].map((level) => smallest(`--hf-heading-${level}-font-size`))

    expect(sizes).toEqual([...sizes].sort((a, b) => b - a))
    expect(sizes[2]).toBeGreaterThan(rem('--hf-heading-4-font-size'))
  })
})

describe('the components and the density', () => {
  it('finds the files to check', () => {
    expect(all).toContain('components/button/button.css')
    expect(all).toContain('components/button/Button.tsx')
    expect(all).toContain('base/forms.css')
    expect(all.length).toBeGreaterThan(200)
  })

  it('has no component, CSS, test or story that knows the class, outside the density itself', () => {
    const others = all.filter((file) => /\.(css|tsx?|mdx)$/.test(file) && !file.startsWith('tokens/density'))

    for (const file of others) {
      expect(read(file), file).not.toMatch(/hf-density|density-compact/)
    }
  })

  it('does not know where the density is used', () => {
    for (const file of all.filter((file) => /\.(css|tsx?|mdx)$/.test(file) && !file.startsWith('tokens/density'))) {
      expect(read(file), file).not.toContain('/beheer')
    }
  })

  it('writes no size of letters of its own, only a token, inherit or a size relative to the text around it', () => {
    let seen = 0

    for (const file of cssFiles.filter((file) => file !== 'tokens/typography.css')) {
      for (const [, size = ''] of css(file).matchAll(/(?<![\w-])font-size\s*:\s*([^;}]+)/g)) {
        seen += 1
        expect(
          /^(?:var\(--hf-[a-z0-9-]+-font-size\)|inherit|\d*\.?\d+em)$/.test(size.trim()),
          `${file}: font-size: ${size.trim()}`,
        ).toBe(true)
      }
    }

    expect(seen).toBeGreaterThan(20)
  })

  it('takes the height of buttons and fields from the tokens', () => {
    for (const file of [
      'components/button/button.css',
      'base/forms.css',
      'components/select/select.css',
      'components/segmented-control/segmented-control.css',
      'components/pagination/pagination.css',
    ]) {
      expect(css(file), file).not.toContain('2.75rem')
      expect(css(file), file).toContain('var(--hf-size-control')
    }
  })

  it('has a value for every token of the size of letters that a component uses', () => {
    const tokens = css('tokens/typography.css')

    for (const file of cssFiles) {
      for (const [, name] of css(file).matchAll(/var\((--hf-[a-z0-9-]+-font-size)\)/g)) {
        expect(tokens, `${file}: ${name}`).toMatch(new RegExp(`${name}: `))
      }
    }
  })
})

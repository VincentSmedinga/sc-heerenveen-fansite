import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const src = join(import.meta.dirname, '..')

// Without the comments, which mention the rules in words.
const strip = (text: string) => text.replace(/\/\*.*?\*\//gs, '')

const cssFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? cssFiles(join(dir, entry.name))
      : entry.name.endsWith('.css')
        ? [relative(src, join(dir, entry.name))]
        : [],
  )

const read = (file: string) => strip(readFileSync(join(src, file), 'utf8'))

const motion = read('tokens/motion.css')
const others = cssFiles(src).filter((file) => file !== 'tokens/motion.css')

// A duration, written out: 0.2s, .5s, 200ms.
const time = /(?<![\w.-])\d*\.?\d+m?s(?![\w-])/

// What may set the duration of a transition or an animation: a motion token, or a value that is
// one (the test below checks that). Nothing else is an exception.
const durationSources = ['var(--hf-motion-duration-', 'var(--hf-theme-button-morph)']

const motionDeclarations = (css: string) =>
  [...css.matchAll(/(?<![\w-])(transition|animation)\s*:\s*([^;]+);/g)].map(([, property, value]) => ({
    property,
    value: (value ?? '').replace(/\s+/g, ' ').trim(),
  }))

describe('the motion tokens in tokens/motion.css', () => {
  const durations = [...motion.matchAll(/(--hf-motion-duration-[a-z]+):/g)].map(([, name]) => name)

  it('has a few durations and curves, named for what they are for, in the layer hf.tokens', () => {
    expect(durations).toEqual([
      '--hf-motion-duration-quick',
      '--hf-motion-duration-short',
      '--hf-motion-duration-medium',
      '--hf-motion-duration-quick',
      '--hf-motion-duration-short',
      '--hf-motion-duration-medium',
    ])
    expect([...motion.matchAll(/--hf-motion-ease-[a-z]+:/g)].map(([name]) => name)).toEqual([
      '--hf-motion-ease-change:',
      '--hf-motion-ease-morph:',
      '--hf-motion-ease-enter:',
      '--hf-motion-ease-exit:',
    ])
    expect(motion).toMatch(/^\s*@layer hf\.tokens \{/)
    expect([...motion.matchAll(/--[a-z-]+(?=:)/g)].every(([name]) => name.startsWith('--hf-motion-'))).toBe(true)
  })

  it('sets every duration to 0s with reduced motion, and only the durations', () => {
    const reduced = motion.slice(motion.indexOf('@media (prefers-reduced-motion: reduce)'))

    expect(reduced).toContain('@media (prefers-reduced-motion: reduce)')
    expect([...reduced.matchAll(/(--hf-[a-z-]+): ([^;]+);/g)].map(([, name, value]) => [name, value])).toEqual([
      ['--hf-motion-duration-quick', '0s'],
      ['--hf-motion-duration-short', '0s'],
      ['--hf-motion-duration-medium', '0s'],
    ])
  })
})

describe('the motion in the rest of the CSS', () => {
  it('finds the CSS files to check', () => {
    expect(others).toContain('components/theme-button/theme-button.css')
    expect(others).toContain('docs/docs.css')
    expect(others.length).toBeGreaterThan(40)
  })

  it('writes no time anywhere, so no duration escapes the 0s of reduced motion', () => {
    for (const file of others) {
      expect(read(file), file).not.toMatch(time)
    }
  })

  it('takes the duration of every transition and animation from a motion token', () => {
    let seen = 0

    for (const file of others) {
      for (const { property, value } of motionDeclarations(read(file))) {
        seen += 1
        expect(
          value === 'none' || durationSources.some((source) => value.includes(source)),
          `${file}: ${property}: ${value}`,
        ).toBe(true)
      }
    }

    expect(seen).toBeGreaterThan(0)
  })

  it('has no delay, and no duration of its own: a duration property takes a motion token', () => {
    for (const file of others) {
      const css = read(file)

      expect(css, file).not.toMatch(/animation-delay|transition-delay/)
      for (const [, value] of css.matchAll(/(?<![\w-])(?:animation|transition)-duration\s*:\s*([^;]+);/g)) {
        expect(value, file).toContain('var(--hf-motion-duration-')
      }
    }
  })

  it('lets the theme button use its own name for the medium duration, and nothing else', () => {
    const files = others.filter((file) => read(file).includes('var(--hf-theme-button-morph)'))

    expect(files).toEqual(['components/theme-button/theme-button.css'])
    expect(read(files[0] ?? '')).toContain('--hf-theme-button-morph: var(--hf-motion-duration-medium);')
  })

  it('smooth scrolling is the one other motion, and keeps its own condition for reduced motion', () => {
    const smooth = (css: string) => css.match(/scroll-behavior\s*:\s*smooth/g)?.length ?? 0
    const guarded = (css: string) =>
      css.match(/@media \(prefers-reduced-motion: no-preference\)\s*\{[^{}]*\{[^{}]*scroll-behavior\s*:\s*smooth/g)
        ?.length ?? 0

    for (const file of others) {
      const css = read(file)
      expect(smooth(css), file).toBe(guarded(css))
    }
    expect(smooth(read('components/root/root.css'))).toBe(1)
  })
})

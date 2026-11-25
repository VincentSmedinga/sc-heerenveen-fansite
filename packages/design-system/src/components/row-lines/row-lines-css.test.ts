import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const src = join(import.meta.dirname, '..', '..')
const shared = 'components/row-lines/row-lines.css'

const cssFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? cssFiles(join(dir, entry.name))
      : entry.name.endsWith('.css')
        ? [relative(src, join(dir, entry.name))]
        : [],
  )

// A selector list, split at the commas that are not inside brackets.
const split = (list: string) => list.split(/,(?![^(]*\))/).map((selector) => selector.trim())

type Declaration = { property: string; selector: string; value: string }

// Every declaration with its full selector: nested rules joined, at-rules left out.
const declarations = (file: string): Declaration[] => {
  const css = readFileSync(join(src, file), 'utf8').replace(/\/\*.*?\*\//gs, '')
  const found: Declaration[] = []
  const path: string[][] = []

  for (const [, text = '', delimiter] of css.matchAll(/([^{};]*)([{};])/g)) {
    if (delimiter === '{') {
      path.push(text.trim().startsWith('@') ? [] : split(text.trim().replace(/\s+/g, ' ')))
      continue
    }

    const [, property, value] = /^\s*([a-z-]+)\s*:\s*(.+?)\s*$/s.exec(text) ?? []

    if (property !== undefined && value !== undefined) {
      const selectors = path
        .filter((level) => level.length > 0)
        .reduce((outer, level) => outer.flatMap((parent) => level.map((part) => `${parent} ${part}`.trim())), [''])

      found.push(...selectors.map((selector) => ({ property, selector, value })))
    }

    if (delimiter === '}') {
      path.pop()
    }
  }

  return found
}

// The element a selector styles is a row of one of the lists with lines.
const row = new RegExp(
  [
    String.raw`\.hf-(match|news-item|discussion-item|short-line|short-fact|short-staff|match-event)`,
    String.raw`\.hf-(winner-list-item|prediction-list-item|figure-list-item|on-this-day-match)`,
  ]
    .map((classes) => `${classes}(?![\\w-])[^ >+~]*$`)
    .concat([
      String.raw`\.hf-description-list-stacked > div[^ >+~]*$`,
      String.raw`\.hf-match-pitch-roster-list > li[^ >+~]*$`,
    ])
    .join('|'),
)

const lineOrSpace =
  /^(border(-(top|block(-start)?))?(-(width|style|color))?|padding(-(top|bottom|block(-(start|end))?))?)$/

// Inside a prediction or a description a match is part of a row, and has no space of its own.
const inside = ['.hf-prediction-list-text .hf-match', '.hf-description-list dd > .hf-match']

const roomy = ['.hf-match', '.hf-news-item', '.hf-discussion-item']
const dense = [
  '.hf-short-line',
  '.hf-winner-list-item',
  '.hf-prediction-list-item',
  '.hf-figure-list-item',
  '.hf-description-list-stacked > div',
  '.hf-match-event',
  '.hf-on-this-day-match',
  '.hf-match-pitch-roster-list > li',
]

describe('the lines between the rows of a list', () => {
  const rules = declarations(shared)
  const of = (property: string) => rules.filter((rule) => rule.property === property)

  it('are the only rules for the line and the space of a row', () => {
    const others = cssFiles(src)
      .filter((file) => file !== shared)
      .flatMap((file) => declarations(file).map((rule) => ({ ...rule, file })))
      .filter(
        ({ property, selector }) => lineOrSpace.test(property) && row.test(selector) && !inside.includes(selector),
      )

    expect(others).toEqual([])
  })

  it('recognises the rows it guards, also in a nested rule', () => {
    for (const selector of [...roomy, ...dense, 'li:first-child > .hf-match', '.hf-match-event:last-child']) {
      expect(selector, selector).toMatch(row)
    }

    expect('.hf-match-event-minute').not.toMatch(row)
    expect('.hf-match + .hf-game-links').not.toMatch(row)
    expect(declarations('components/match-pitch/match-pitch.css').map(({ selector }) => selector)).toContain(
      '.hf-match-pitch-roster-list',
    )
  })

  it('give matches, news and discussions the medium space and every other row the small one', () => {
    const space = new Map(of('padding-block').map(({ selector, value }) => [selector, value]))

    expect(Object.fromEntries(space)).toEqual(
      Object.fromEntries([
        ...roomy.map((selector) => [selector, 'var(--hf-space-m)']),
        ...dense.map((selector) => [selector, 'var(--hf-space-s)']),
      ]),
    )
  })

  it('draw a line above every row, also the first, in the colour of the lines of a card', () => {
    const lines = of('border-block-start')

    expect(new Set(lines.map(({ value }) => value))).toEqual(
      new Set(['1px solid var(--hf-card-line, var(--hf-colour-border-default))']),
    )
    expect(lines.map(({ selector }) => selector)).toEqual([
      'li > :is(.hf-match, .hf-news-item, .hf-discussion-item, .hf-short-line)',
      ...dense.slice(1),
    ])
    expect(rules.filter(({ selector }) => selector.includes('first-child'))).toEqual([])
  })

  it('leave no space under the last row', () => {
    expect(of('padding-block-end').map(({ selector, value }) => [selector, value])).toEqual(
      [
        'li:last-child > :is(.hf-match, .hf-news-item, .hf-discussion-item, .hf-short-line)',
        ...dense.slice(1).map((selector) => `${selector}:last-child`),
      ].map((selector) => [selector, '0']),
    )
  })
})

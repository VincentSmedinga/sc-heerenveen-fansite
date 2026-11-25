import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const src = join(import.meta.dirname, '..')

// Without the comments, which mention selectors and tokens in words.
const read = (file: string) => readFileSync(join(src, file), 'utf8').replaceAll(/\/\*.*?\*\//gsu, '')

/**
 * The declarations of every rule whose list of selectors has this one, in order. The lookahead
 * keeps the selector of a nested rule out of the match of its parent.
 */
function declarationsOf(file: string, selector: string) {
  return [...read(file).matchAll(/([^{};]+)\{(?=([^{}]*))/gu)]
    .filter(([, selectors = '']) => selectors.split(',').some((part) => part.trim() === selector))
    .map(([, , declarations]) => declarations)
    .join('\n')
}

/** The value that wins: the last one set for the property. */
function valueOf(file: string, selector: string, property: string) {
  const values = [...declarationsOf(file, selector).matchAll(new RegExp(`(?<![\\w-])${property}: ([^;]+);`, 'gu'))]

  return values.at(-1)?.[1]
}

const token = (name: string) => `var(--hf-${name})`

describe('the large figures', () => {
  it.each([
    ['key-figures/key-figures.css', '.hf-key-figure-number', 'key-figure'],
    ['question-card/question-card.css', '.hf-question-figure', 'figure-large'],
    ['donut-chart/donut-chart.css', '.hf-donut-chart-total', 'figure-large'],
    ['prediction-list/prediction-list.css', '.hf-prediction-list-number', 'figure-large'],
    ['score-grid/score-grid.css', '.hf-score-grid-field.hf-score-grid-field', 'figure-large'],
    ['score-grid/score-grid.css', '.hf-score-grid-value', 'figure-large'],
    ['code-input/code-input.css', '> input', 'figure-large'],
    ['match-penalty-series/match-penalty-series.css', '.hf-match-penalty-total', 'figure-large'],
    ['mark-row/mark-row.css', '.hf-mark-row-mark', 'figure'],
    ['winner-list/winner-list.css', '.hf-winner-list-average', 'figure'],
    ['winner/winner.css', '.hf-winner-seal', 'figure'],
  ])('gives %s %s the size of its step and the weight of a figure', (file, selector, step) => {
    expect(valueOf(`components/${file}`, selector, 'font-size')).toBe(token(`${step}-font-size`))
    expect(valueOf(`components/${file}`, selector, 'font-weight')).toBe(token('figure-font-weight'))
  })

  it('gives the large prediction the large size, and its score the weight of a figure', () => {
    const file = 'components/prediction-list/prediction-list.css'

    expect(valueOf(file, '.hf-prediction-list-guess-large', 'font-size')).toBe(token('figure-large-font-size'))
    expect(valueOf(file, '.hf-prediction-list-guess-large .hf-prediction-list-part:first-child', 'font-weight')).toBe(
      token('figure-font-weight'),
    )
  })
})

describe('the small titles of charts and forms', () => {
  it.each([
    ['donut-chart/donut-chart.css', '.hf-donut-chart-title'],
    ['mark-row/mark-row.css', '.hf-mark-row-title'],
  ])('sets %s %s in the weight of a name and the colour of headings', (file, selector) => {
    expect(valueOf(`components/${file}`, selector, 'font-weight')).toBe(token('name-font-weight'))
    expect(valueOf(`components/${file}`, selector, 'color')).toBe(token('colour-text-heading'))
  })

  it.each([
    ['score-grid/score-grid.css', '.hf-score-grid-legend'],
    ['pick-list/pick-list.css', '> legend'],
    ['rating-scale/rating-scale.css', '> legend'],
  ])('leaves the weight and the colour of the legend in %s to the base style', (file, selector) => {
    expect(declarationsOf(`components/${file}`, selector)).toMatch(/padding: 0;/u)
    expect(declarationsOf(`components/${file}`, selector)).not.toMatch(/(?<![\w-])(?:color|font-weight):/u)
  })

  it('has a base style for a legend with the weight of a name and the colour of headings', () => {
    expect(valueOf('base/forms.css', 'legend', 'font-weight')).toBe(token('name-font-weight'))
    expect(valueOf('base/forms.css', 'legend', 'color')).toBe(token('colour-text-heading'))
  })

  it('sets the names of the clubs above the fields of a score in the weight of a name', () => {
    expect(valueOf('components/score-grid/score-grid.css', '.hf-score-grid-club', 'font-weight')).toBe(
      token('name-font-weight'),
    )
  })
})

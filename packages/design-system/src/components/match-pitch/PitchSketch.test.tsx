import { render, screen, within } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { PitchSketch, type PitchSketchPlayer, pitchSketchSentence, pitchSketchSpots } from './PitchSketch'

const defender: PitchSketchPlayer = {
  line: 'verdediger',
  name: 'Thijs van Testma',
  shirtNumber: 4,
  shortName: 'Van Testma',
}

const places = [
  { ...defender, line: 'keeper' as const, name: 'Rick Demo', shirtNumber: null, shortName: 'Demo' },
  defender,
  { ...defender, name: 'Gerrit Nepper', note: 'telt niet mee', shirtNumber: 21, shortName: 'Nepper' },
  null,
]

const discs = (container: HTMLElement) => [
  ...container.querySelectorAll<HTMLElement>('.hf-pitch-sketch-field > .hf-pitch-sketch-disc'),
]

describe('pitchSketchSpots', () => {
  it('puts each line at its distance from our goal line, and one player on it in the middle', () => {
    const lines = ['keeper', 'verdediger', 'middenvelder', 'aanvaller'] as const

    expect(pitchSketchSpots(lines.map((line) => ({ line })))).toEqual([
      { x: 10, y: 50 },
      { x: 36, y: 50 },
      { x: 62, y: 50 },
      { x: 86, y: 50 },
    ])
  })

  it('puts two players on a line at 30% and 70%, in the order of the places, and none for an empty one', () => {
    expect(pitchSketchSpots([{ line: 'aanvaller' }, { line: 'verdediger' }, null, { line: 'aanvaller' }])).toEqual([
      { x: 86, y: 30 },
      { x: 36, y: 50 },
      null,
      { x: 86, y: 70 },
    ])
  })
})

describe('pitchSketchSentence', () => {
  it('has the whole name, the line and the shirt number', () => {
    expect(pitchSketchSentence(defender, 1)).toBe('Thijs van Testma, verdediger, rugnummer 4')
  })

  it('leaves out the number of a player without one, and ends with the note', () => {
    expect(pitchSketchSentence({ ...defender, shirtNumber: null }, 1)).toBe('Thijs van Testma, verdediger')
    expect(pitchSketchSentence({ ...defender, note: 'telt niet mee' }, 1)).toBe(
      'Thijs van Testma, verdediger, rugnummer 4, telt niet mee',
    )
  })

  it('names an empty place by its number', () => {
    expect(pitchSketchSentence(null, 4)).toBe('Plek 4, nog te kiezen')
  })
})

describe('PitchSketch', () => {
  it('is a numbered list with the name given, with one sentence for each place', () => {
    render(<PitchSketch label="Jouw vier" places={places} />)
    const list = screen.getByRole('list', { name: 'Jouw vier' })

    expect(list.tagName).toBe('OL')
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((item) => item.querySelector('.hf-visually-hidden')?.textContent),
    ).toEqual([
      'Rick Demo, keeper',
      'Thijs van Testma, verdediger, rugnummer 4',
      'Gerrit Nepper, verdediger, rugnummer 21, telt niet mee',
      'Plek 4, nog te kiezen',
    ])
  })

  it('hides the pitch and what is drawn in the list from a screen reader, and has no controls', () => {
    const { container } = render(<PitchSketch label="Jouw vier" places={places} />)

    expect(container.querySelector('.hf-pitch-sketch-field')?.getAttribute('aria-hidden')).toBe('true')
    expect(container.querySelectorAll('li > :not(.hf-visually-hidden):not([aria-hidden="true"])')).toHaveLength(0)
    expect(container.querySelectorAll('a, button, input, [tabindex]')).toHaveLength(0)
  })

  it('draws a disc on the pitch for each player, on his spot, with his number or empty, and no names', () => {
    const { container } = render(<PitchSketch label="Jouw vier" places={places} />)

    expect(
      discs(container).map((disc) => [disc.textContent, disc.style.insetInlineStart, disc.style.insetBlockStart]),
    ).toEqual([
      ['', '10%', '50%'],
      ['4', '36%', '30%'],
      ['21', '36%', '70%'],
    ])
    expect(container.querySelector('.hf-pitch-sketch-field')?.textContent).toBe('421')
  })

  it('draws a player who does not count with a dashed disc, a struck name and the note for his line', () => {
    const { container } = render(<PitchSketch label="Jouw vier" places={places} />)
    const item = screen.getAllByRole('listitem')[2] as HTMLElement

    expect(discs(container)[2]?.classList.contains('hf-pitch-sketch-disc-struck')).toBe(true)
    expect(item.querySelector('.hf-pitch-sketch-disc-struck')?.textContent).toBe('21')
    expect(item.querySelector('[data-struck]')?.textContent).toBe('Nepper')
    expect(item.querySelector('.hf-pitch-sketch-line')?.textContent).toBe('telt niet mee')
  })

  it('shows an empty place in the list only, with a dashed empty disc and "nog te kiezen"', () => {
    const { container } = render(<PitchSketch label="Jouw vier" places={[null, null, null, null]} />)

    expect(discs(container)).toHaveLength(0)
    expect(container.querySelectorAll('li .hf-pitch-sketch-disc-empty')).toHaveLength(4)
    expect(container.querySelector('.hf-pitch-sketch-line')?.textContent).toBe('nog te kiezen')
  })
})

describe('pitch-sketch.css', () => {
  const css = readFileSync(join(import.meta.dirname, 'pitch-sketch.css'), 'utf8').replaceAll(/\/\*.*?\*\//gsu, '')

  it('is a half of 11 to 10 lying down, at most 18 rem, and 15 rem beside the list in a wide card', () => {
    expect(css).toMatch(/\.hf-pitch-sketch-field \{\s*aspect-ratio: 11 \/ 10;/u)
    expect(css).toMatch(/border-radius: 0\.5rem 0 0 0\.5rem;\s*box-sizing: border-box;/u)
    expect(css).toMatch(/max-inline-size: 18rem/u)
    expect(css).toMatch(/@container hf-pitch-sketch \(min-width: 31rem\)[^}]*\{[^}]*grid-template-columns: 15rem/u)
  })

  it('has two columns of names at every width', () => {
    expect(css.match(/grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/gu)).toHaveLength(1)
  })

  it('keeps a rim in the colour of text round every disc in forced colours', () => {
    expect(css).toMatch(/forced-colors: active[\s\S]*\.hf-pitch-sketch-disc \{[^}]*border-color: CanvasText;/u)
  })
})

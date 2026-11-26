import { fireEvent, render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

import { ScoreGrid, type ScoreGridProps } from './ScoreGrid'

const props = { awayName: 'FC Twente', homeName: 'sc Heerenveen', legend: 'Jouw voorspelling' }

const renderGrid = (extra: Partial<ScoreGridProps> = {}) =>
  render(
    <form aria-label="Voorspelling">
      <ScoreGrid {...props} {...extra} />
    </form>,
  )

const field = (row: string, club: string) => screen.getByRole('textbox', { name: `${row} ${club}` }) as HTMLInputElement

describe('ScoreGrid', () => {
  it('is one fieldset with the legend the page gives', () => {
    renderGrid()

    expect(screen.getByRole('group', { name: 'Jouw voorspelling' })).toBeTruthy()
  })

  it('has four fields that are named from the visible labels of their row and column', () => {
    renderGrid()

    expect(screen.getAllByRole('textbox')).toHaveLength(4)
    for (const row of ['Ruststand', 'Eindstand']) {
      for (const club of ['sc Heerenveen', 'FC Twente']) {
        expect(field(row, club)).toBeTruthy()
      }
    }
  })

  it('visits the fields row by row, home before away', () => {
    renderGrid()

    expect(screen.getAllByRole('textbox').map((input) => (input as HTMLInputElement).name)).toEqual([
      'halftimeHome',
      'halftimeAway',
      'fullTimeHome',
      'fullTimeAway',
    ])
  })

  it('takes one digit, and leaves an empty field empty, never 0', () => {
    renderGrid()
    const input = field('Ruststand', 'sc Heerenveen')

    expect(input.value).toBe('')
    expect(input.maxLength).toBe(1)
    expect(input.getAttribute('pattern')).toBe('[0-9]')
    expect(input.getAttribute('inputmode')).toBe('numeric')
  })

  it('starts with the default values, and sends them with the form', () => {
    renderGrid({ defaultValues: { fullTimeAway: '1', fullTimeHome: '2', halftimeAway: '0', halftimeHome: '1' } })
    const data = new FormData(screen.getByRole('form') as HTMLFormElement)

    expect([...data.entries()]).toEqual([
      ['halftimeHome', '1'],
      ['halftimeAway', '0'],
      ['fullTimeHome', '2'],
      ['fullTimeAway', '1'],
    ])
  })

  it('uses the names of the form that the page gives', () => {
    renderGrid({ names: { halftimeHome: 'rust-thuis' } })

    expect(field('Ruststand', 'sc Heerenveen').name).toBe('rust-thuis')
  })

  it('gives a field the id that the page gives, so a link can focus it', () => {
    renderGrid({ ids: { fullTimeAway: 'eind-uit' } })

    expect(field('Eindstand', 'FC Twente').id).toBe('eind-uit')
    expect(field('Ruststand', 'FC Twente').id).toBe('')
  })

  it('reports a change of a field when the page keeps the values', () => {
    const onValueChange = vi.fn()

    renderGrid({ onValueChange, values: { halftimeHome: '1' } })
    fireEvent.change(field('Eindstand', 'FC Twente'), { target: { value: '3' } })

    expect(field('Ruststand', 'sc Heerenveen').value).toBe('1')
    expect(onValueChange).toHaveBeenCalledWith('fullTimeAway', '3')
  })

  it('marks a field with an error as invalid, and says the error in text above the grid', () => {
    renderGrid({ errors: { fullTimeAway: 'Vul de goals van FC Twente bij de eindstand in.' } })
    const input = field('Eindstand', 'FC Twente')

    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByText('Vul de goals van FC Twente bij de eindstand in.')).toBeTruthy()
    expect(screen.getByText('Fout:')).toBeTruthy()
    expect(document.getElementById(input.getAttribute('aria-describedby') ?? '')?.textContent).toContain('Vul de goals')
    expect(field('Ruststand', 'FC Twente').hasAttribute('aria-invalid')).toBe(false)
  })

  it('ties an error of the whole grid to the fieldset', () => {
    renderGrid({ error: 'Er ontbreekt nog iets.' })
    const group = screen.getByRole('group', { name: 'Jouw voorspelling' })

    expect(document.getElementById(group.getAttribute('aria-describedby') ?? '')?.textContent).toContain(
      'Er ontbreekt nog iets.',
    )
  })

  it('shows the four numbers without fields when it is read only, with the same labels', () => {
    renderGrid({
      readOnly: true,
      values: { fullTimeAway: '1', fullTimeHome: '2', halftimeAway: '0', halftimeHome: '1' },
    })

    expect(screen.queryAllByRole('textbox')).toHaveLength(0)
    expect(screen.getByText('Ruststand')).toBeTruthy()
    expect(screen.getByText('Eindstand')).toBeTruthy()
    expect(screen.getByText('Ruststand, sc Heerenveen:', { exact: false }).parentElement?.textContent).toContain('1')
  })

  it('shows a dash for a number that is missing when it is read only, never 0', () => {
    renderGrid({ readOnly: true })

    expect(screen.queryByText('0')).toBeNull()
  })
})

describe('the look of the grid', () => {
  const css = readFileSync(join(import.meta.dirname, 'score-grid.css'), 'utf8').replace(/\/\*.*?\*\//gs, '')

  it('keeps four columns that can shrink, so a long club name breaks instead of pushing the fields out', () => {
    expect(css).toContain('grid-template-columns: max-content minmax(0, 1fr) 1rem minmax(0, 1fr);')
    expect(css).toContain('overflow-wrap: anywhere;')
  })

  it('puts the label of a row above its fields when the grid itself has little room', () => {
    const narrow = css.slice(css.indexOf('@container hf-score-grid (inline-size < 13rem)'))

    expect(css).toContain('container: hf-score-grid / inline-size;')
    expect(narrow).toContain('grid-template-columns: minmax(0, 1fr) max-content minmax(0, 1fr);')
    expect(narrow).toMatch(/\.hf-score-grid-corner \{\s*display: none;/)
    expect(narrow).toMatch(/\.hf-score-grid-label \{\s*grid-column: 1 \/ -1;/)
    expect(narrow).toContain('inline-size: min(3.5rem, 100%);')
  })

  it('makes a field a square of at least 44 pixels', () => {
    expect(css).toContain('block-size: 3.5rem;')
    expect(css).toContain('inline-size: 3.5rem;')
  })
})

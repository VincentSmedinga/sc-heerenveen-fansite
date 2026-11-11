import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { KeyFigures } from './KeyFigures'

const figures = [
  { figure: '52', label: 'doelpunten', note: 'in alle competities' },
  { figure: '1,26', label: 'doelpunten per wedstrijd', note: 'in de 2 seizoenen met opstellingen' },
  { figure: '315', label: 'wedstrijden', note: 'voor sc Heerenveen' },
]

describe('KeyFigures', () => {
  it('is a list with one item for each figure, so a screen reader says how many there are', () => {
    render(<KeyFigures aria-label="Kerngetallen" figures={figures} />)

    const list = screen.getByRole('list', { name: 'Kerngetallen' })

    expect(within(list).getAllByRole('listitem')).toHaveLength(3)
  })

  it('reads each figure as one sentence of the number, the word and the line', () => {
    render(<KeyFigures figures={figures} />)

    const [first, second] = screen.getAllByRole('listitem')

    expect(first?.textContent).toBe('52 doelpunten, in alle competities')
    expect(second?.textContent).toBe('1,26 doelpunten per wedstrijd, in de 2 seizoenen met opstellingen')
  })

  it('writes the number as plain text and not as a heading', () => {
    render(<KeyFigures figures={figures} />)

    expect(screen.queryByRole('heading')).toBeNull()
  })

  it('puts each figure in a card of its own', () => {
    render(<KeyFigures figures={figures} />)

    for (const item of screen.getAllByRole('listitem')) {
      expect(item.classList.contains('hf-card')).toBe(true)
    }
  })

  it('passes other props on', () => {
    const { container } = render(<KeyFigures figures={figures} id="kerngetallen" />)

    expect(container.querySelector('ul#kerngetallen')).not.toBeNull()
  })

  it('puts four figures in two columns, whatever the width, and two or three in the row that wraps', () => {
    const four = [...figures, { figure: '3', label: 'seizoenen', note: 'tussen 2002 en 2005' }]
    const { container, rerender } = render(<KeyFigures figures={four} />)

    expect(container.querySelector('ul.hf-key-figures-four')).not.toBeNull()

    rerender(<KeyFigures figures={figures} />)

    expect(container.querySelector('ul.hf-key-figures-four')).toBeNull()
  })
})

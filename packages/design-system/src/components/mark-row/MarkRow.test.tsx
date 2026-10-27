import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MarkRow, type MarkRowMark } from './MarkRow'

const marks: MarkRowMark[] = [
  { label: 'winst', mark: 'W', tone: 'positive' },
  { label: 'verlies', mark: 'V', tone: 'negative' },
  { label: 'gelijk', mark: 'G', tone: 'neutral' },
]

describe('MarkRow', () => {
  it('shows the title and the marks in order, each in the class of its tone', () => {
    const { container } = render(<MarkRow marks={marks} title="Vorm" />)

    expect(container.querySelector('.hf-mark-row-title')?.textContent).toBe('Vorm')
    expect(
      [...container.querySelectorAll('.hf-mark-row-mark')].map((mark) => [mark.textContent, mark.className]),
    ).toEqual([
      ['W', 'hf-mark-row-mark hf-chart-tone-positive'],
      ['V', 'hf-mark-row-mark hf-chart-tone-negative'],
      ['G', 'hf-mark-row-mark hf-chart-tone-neutral'],
    ])
  })

  it('hides the title and the marks from a screen reader, which gets a sentence in words', () => {
    const { container } = render(<MarkRow marks={marks} title="Vorm" />)

    expect(container.querySelector('.hf-mark-row-title')?.getAttribute('aria-hidden')).toBe('true')
    expect(container.querySelector('.hf-mark-row-marks')?.getAttribute('aria-hidden')).toBe('true')
    expect(container.querySelector('.hf-visually-hidden')?.textContent).toBe('Vorm: winst, verlies, gelijk')
  })

  it('shows the text for no marks, which a screen reader reads with the title', () => {
    const { container } = render(<MarkRow empty="Nog geen wedstrijden gespeeld." marks={[]} title="Vorm" />)

    expect(container.querySelector('.hf-mark-row-empty')?.textContent).toBe('Nog geen wedstrijden gespeeld.')
    expect(container.querySelector('.hf-mark-row-title')?.getAttribute('aria-hidden')).toBeNull()
    expect(container.querySelector('.hf-mark-row-mark')).toBeNull()
    expect(container.querySelector('.hf-visually-hidden')).toBeNull()
  })

  it('shows nothing for no marks and no text', () => {
    const { container } = render(<MarkRow marks={[]} title="Vorm" />)

    expect(container.firstElementChild).toBeNull()
  })

  it('passes other props to the paragraph', () => {
    const { container } = render(<MarkRow className="extra" id="vorm" marks={marks} title="Vorm" />)

    expect(container.querySelector('p#vorm')?.classList.contains('extra')).toBe(true)
  })
})

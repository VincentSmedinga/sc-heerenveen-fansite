import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { tableColumns, tableLegend } from './table-columns'

describe('tableLegend', () => {
  it('shows the icon and the word of each column in order, without commas, and a note in brackets', () => {
    const { drawn, goals, lost, played, points, won } = tableColumns
    const { container } = render(
      <p>{tableLegend([played, won, drawn, lost, { ...goals, note: 'voor–tegen' }, points])}</p>,
    )
    const items = [...container.querySelectorAll('.hf-table-legend-item')]

    expect(items.map((item) => item.textContent?.trim())).toEqual([
      'gespeeld',
      'winst',
      'gelijk',
      'verlies',
      'doelpunten (voor–tegen)',
      'punten',
    ])
    expect(container.textContent).not.toContain(',')
    for (const item of items) {
      expect(item.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(1)
    }
  })
})

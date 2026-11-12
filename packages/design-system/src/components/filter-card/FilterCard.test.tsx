import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { FilterCard } from './FilterCard'

describe('FilterCard', () => {
  it('is open with the filters and a summary', () => {
    const { container } = render(<FilterCard summary="Filters">De filters</FilterCard>)

    expect(container.querySelector('details')?.hasAttribute('open')).toBe(true)
    expect(container.querySelector('details')?.className).toContain('hf-filter-card')
    expect(screen.getByText('Filters')).toBeTruthy()
  })

  it('is closed when it is collapsed, and the filters are still in the page for a browser without scripts', () => {
    const { container } = render(
      <FilterCard collapsed summary="Filters · 2 gekozen">
        De filters
      </FilterCard>,
    )

    expect(container.querySelector('details')?.hasAttribute('open')).toBe(false)
    expect(screen.getByText('De filters')).toBeTruthy()
  })
})

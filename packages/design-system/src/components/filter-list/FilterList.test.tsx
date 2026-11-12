import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Disclosure } from '../disclosure/Disclosure'
import { FilterList } from './FilterList'

describe('FilterList', () => {
  it('holds the rows next to each other, with a class of its own', () => {
    const { container } = render(
      <FilterList>
        <Disclosure summary="Tegenstander" value="Ajax">
          Een keuzelijst
        </Disclosure>
        <Disclosure summary="Uitslag">Vakjes</Disclosure>
      </FilterList>,
    )

    expect(container.firstElementChild?.className).toBe('hf-filter-list')
    expect(container.querySelectorAll('.hf-filter-list > details')).toHaveLength(2)
    expect(screen.getByText('Ajax')).toBeTruthy()
  })
})

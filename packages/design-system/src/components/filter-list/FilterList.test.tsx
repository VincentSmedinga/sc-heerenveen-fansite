import { render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
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

  it('gives each row the warm surface, with the lines of the warm surface', () => {
    const css = readFileSync(join(import.meta.dirname, 'filter-list.css'), 'utf8').replace(/\/\*.*?\*\//gs, '')
    const row = css.match(/> \.hf-disclosure \{([^{}]*)\}/)?.[1] ?? ''

    expect(row).toContain('background-color: var(--hf-colour-background-surface-warm)')
    expect(row).toContain('--hf-card-line: var(--hf-colour-border-surface-warm)')
    expect(row).toContain('--hf-card-line-strong: var(--hf-colour-line-darker-surface-warm)')
    expect(row).toContain('--hf-card-line-graphic: var(--hf-colour-line-graphic-surface-warm)')
  })
})

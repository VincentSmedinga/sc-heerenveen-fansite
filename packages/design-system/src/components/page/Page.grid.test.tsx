import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Page } from './Page'

const areas = {
  narrow: ['head', 'toolbar', 'filter', 'main'],
  wide: ['head head', 'toolbar toolbar', 'main filter', 'main stack'],
}

const renderGrid = () =>
  render(
    <Page.Main areas={areas} columns="narrow-side">
      <Page.Cell area="head">
        <h1>Nieuws</h1>
      </Page.Cell>
      <Page.Toolbar>
        <span>Seizoen</span>
      </Page.Toolbar>
      <Page.Section area="filter" aria-labelledby="filter-title">
        <h2 id="filter-title">Filter</h2>
      </Page.Section>
      <Page.Cell area="main">Berichten</Page.Cell>
    </Page.Main>,
  )

describe('Page.Main with areas', () => {
  it('sets the areas, the columns and the rows as custom properties in its style', () => {
    renderGrid()
    const main = screen.getByRole('main')

    expect(main.style.getPropertyValue('--hf-page-areas-narrow')).toBe('"head" "toolbar" "filter" "main"')
    expect(main.style.getPropertyValue('--hf-page-areas-wide')).toBe(
      '"head head" "toolbar toolbar" "main filter" "main stack"',
    )
    expect(main.style.getPropertyValue('--hf-page-columns')).toBe('var(--hf-page-columns-narrow-side)')
    expect(main.style.getPropertyValue('--hf-page-rows-wide')).toBe('auto auto auto 1fr')
    expect(main.className).toContain('hf-page-main-grid')
  })

  it('has the same number of names in each wide row, so the grid is valid', () => {
    expect(new Set(areas.wide.map((row) => row.split(/\s+/).length))).toEqual(new Set([2]))
    expect(new Set(areas.narrow.map((row) => row.split(/\s+/).length))).toEqual(new Set([1]))
  })

  it('names the area of a cell in its style, and the toolbar sits in the area toolbar', () => {
    renderGrid()

    expect(screen.getByText('Berichten').style.gridArea).toBe('main')
    expect(screen.getByText('Seizoen').parentElement?.style.gridArea).toBe('toolbar')
  })

  it('keeps the order of the source: a cell that is first on a phone is first in the markup, with no order', () => {
    const { container } = renderGrid()
    const main = screen.getByRole('main')

    expect(Array.from(main.children).map((child) => child.textContent)).toEqual([
      'Nieuws',
      'Seizoen',
      'Filter',
      'Berichten',
    ])
    expect(container.innerHTML).not.toMatch(/order/)
    expect(main.querySelector('h1')).not.toBeNull()
  })

  it('makes a section with a name a landmark region inside the main, and the toolbar none', () => {
    renderGrid()

    expect(screen.getByRole('region', { name: 'Filter' }).closest('main')).toBe(screen.getByRole('main'))
    expect(screen.queryByRole('toolbar')).toBeNull()
    expect(screen.queryByRole('complementary')).toBeNull()
  })

  it('lets the style of the page win over the custom properties', () => {
    render(<Page.Main areas={areas} style={{ color: 'red' }} />)

    expect(screen.getByRole('main').style.color).toBe('red')
  })

  it('leaves a Page.Main without areas as it was', () => {
    render(<Page.Main>Inhoud</Page.Main>)

    expect(screen.getByRole('main').className).toBe('hf-page-main')
  })
})

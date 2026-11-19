import { act, fireEvent, render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { tableColumns, tableLegend } from '../table-columns'
import { DataTable } from './DataTable'

const figures = [tableColumns.played, { ...tableColumns.won, more: true }, tableColumns.points]
const columns = [{ name: 'Club' }, ...figures]
const rows = [
  { cells: [4, 2, 6], header: 'Alkmaar' },
  { cells: [10, 6, 18], header: 'Breda' },
]

const table = (
  <DataTable.More>
    <DataTable caption="De tegenstanders" columns={columns} rows={rows} />
    {tableLegend(figures)}
  </DataTable.More>
)

describe('DataTable.More', () => {
  it('marks the header, the cells and the legend item of a column with more, and no other', () => {
    const { container } = render(table)

    expect(container.querySelectorAll('th.hf-more-column')).toHaveLength(1)
    expect(container.querySelectorAll('td.hf-more-column')).toHaveLength(2)
    expect(container.querySelectorAll('.hf-table-legend-item.hf-more-column')).toHaveLength(1)
    expect(container.querySelector('th.hf-more-column')?.textContent).toContain('winst')
  })

  it('sends the whole table without JavaScript: no data-ready, so the CSS hides nothing', () => {
    const html = renderToStaticMarkup(table)

    expect(html).not.toContain('<button')
    expect(html).not.toContain('data-ready')
    expect(html).not.toContain('data-open')
    expect(html).toContain('hf-more-column')
  })

  it('has a button that says Toon meer, closed, and turns it into Toon minder, open', () => {
    render(table)

    const button = screen.getByRole('button', { name: 'Toon meer' })

    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(document.querySelector('.hf-data-table-more')?.hasAttribute('data-ready')).toBe(true)
    expect(document.querySelector('.hf-data-table-more')?.hasAttribute('data-open')).toBe(false)

    act(() => {
      fireEvent.click(button)
    })

    expect(screen.getByRole('button', { name: 'Toon minder' }).getAttribute('aria-expanded')).toBe('true')
    expect(document.querySelector('.hf-data-table-more')?.hasAttribute('data-open')).toBe(true)

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Toon minder' }))
    })

    expect(screen.getByRole('button', { name: 'Toon meer' }).getAttribute('aria-expanded')).toBe('false')
  })

  it('takes other texts for the button', () => {
    render(
      <DataTable.More less="Minder" more="Meer">
        <DataTable caption="De tegenstanders" columns={columns} rows={rows} />
      </DataTable.More>,
    )

    expect(screen.getByRole('button', { name: 'Meer' })).toBeTruthy()
  })

  it('leaves a table without a more column as it was', () => {
    const { container } = render(
      <DataTable caption="Dagen" columns={['Dag', 'Weergaven']} rows={[{ cells: [1], header: 'ma' }]} />,
    )

    expect(container.querySelector('.hf-more-column')).toBeNull()
  })

  it('puts the class on a column of a table that cannot sort as well', () => {
    const { container } = render(
      <DataTable caption="De tegenstanders" columns={columns} rows={rows} sortable={false} />,
    )

    expect(container.querySelectorAll('th.hf-more-column')).toHaveLength(1)
    expect(container.querySelectorAll('td.hf-more-column')).toHaveLength(2)
  })
})

import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { FigureList } from './FigureList'

describe('FigureList', () => {
  it('is a list with a row for each name, the name first and then its number', () => {
    const { container } = render(
      <FigureList>
        <FigureList.Item figure={12}>Eredivisie</FigureList.Item>
        <FigureList.Item figure={3}>KNVB Beker</FigureList.Item>
      </FigureList>,
    )

    expect(container.querySelector('ul.hf-figure-list')?.getAttribute('role')).toBe('list')
    expect([...container.querySelectorAll('li')].map((row) => row.textContent)).toEqual(['Eredivisie12', 'KNVB Beker3'])
  })

  it('puts a note above the name', () => {
    const { container } = render(
      <FigureList>
        <FigureList.Item figure="5′" note="8 mei 1997">
          Roda JC – sc Heerenveen
        </FigureList.Item>
      </FigureList>,
    )

    expect(container.querySelector('.hf-figure-list-note')?.textContent).toBe('8 mei 1997')
  })

  it('is an ol when the order is the point', () => {
    const { container } = render(
      <FigureList as="ol">
        <FigureList.Item figure={2}>FC Utrecht</FigureList.Item>
      </FigureList>,
    )

    expect(container.querySelector('ol.hf-figure-list')).not.toBeNull()
  })
})

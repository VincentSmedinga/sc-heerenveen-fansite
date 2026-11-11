import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DescriptionList } from './DescriptionList'

describe('DescriptionList', () => {
  it('is a dl with a dt and a dd for each pair, in the order given', () => {
    const { container } = render(
      <DescriptionList>
        <DescriptionList.Item term="Competitie">Eredivisie</DescriptionList.Item>
        <DescriptionList.Item term="Stadion">Stadion Proeflaan</DescriptionList.Item>
      </DescriptionList>,
    )
    const list = container.querySelector('dl.hf-description-list')

    expect(list).not.toBeNull()
    expect([...container.querySelectorAll('dt')].map((term) => term.textContent)).toEqual(['Competitie', 'Stadion'])
    expect([...container.querySelectorAll('dd')].map((value) => value.textContent)).toEqual([
      'Eredivisie',
      'Stadion Proeflaan',
    ])
  })

  it('keeps each pair in a div that is a child of the dl, with the term first', () => {
    const { container } = render(
      <DescriptionList>
        <DescriptionList.Item term="Hoogste">plek 2</DescriptionList.Item>
      </DescriptionList>,
    )
    const pair = container.querySelector('dl > div')

    expect(pair?.children).toHaveLength(2)
    expect(pair?.firstElementChild?.tagName).toBe('DT')
    expect(pair?.lastElementChild?.tagName).toBe('DD')
  })

  it('passes other props and a class on, to the list and to a pair', () => {
    const { container } = render(
      <DescriptionList className="extra" id="feiten">
        <DescriptionList.Item id="paar" term="Ronde">
          Speelronde 1
        </DescriptionList.Item>
      </DescriptionList>,
    )

    expect(container.querySelector('#feiten')?.className).toBe('hf-description-list extra')
    expect(container.querySelector('#paar > dt')?.textContent).toBe('Ronde')
  })

  it('has the pairs under each other when it is stacked', () => {
    const { container } = render(
      <DescriptionList stacked>
        <DescriptionList.Item term="Eerste doelpunt">4 februari 2003</DescriptionList.Item>
      </DescriptionList>,
    )

    expect(container.querySelector('dl.hf-description-list-stacked')).not.toBeNull()
  })
})

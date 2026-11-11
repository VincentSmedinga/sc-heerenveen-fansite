import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PlaceCell, sharedPlaces } from './PlaceCell'

const cell = (props: Parameters<typeof PlaceCell>[0]) => {
  const { container } = render(
    <table>
      <tbody>
        <tr>
          <PlaceCell {...props} />
        </tr>
      </tbody>
    </table>,
  )

  return container.querySelector('td')!
}

describe('sharedPlaces', () => {
  it('marks the rows after the first of a place, and never the first row', () => {
    expect(sharedPlaces([4, 4, 4, 4, 8])).toEqual([false, true, true, true, false])
    expect(sharedPlaces([1, 2, 2, 4])).toEqual([false, false, true, false])
    expect(sharedPlaces([3, 3])).toEqual([false, true])
    expect(sharedPlaces([])).toEqual([])
  })
})

describe('PlaceCell', () => {
  it('shows the number in a cell that is aligned and coloured as the places are', () => {
    const td = cell({ position: 4 })

    expect(td.textContent).toBe('4')
    expect(td.className).toBe('hf-numeric hf-rank')
    expect(td.querySelector('[aria-hidden]')).toBeNull()
  })

  it('shows a vertical ellipsis for a shared place, and a screen reader hears the place and not the sign', () => {
    const td = cell({ position: 4, shared: true })

    expect(td.className).toBe('hf-numeric hf-rank hf-rank-shared')
    expect(td.querySelector('[aria-hidden="true"]')?.textContent).toBe('⋮')
    expect(td.querySelector('.hf-visually-hidden')?.textContent).toBe('gedeeld 4')
  })

  it('keeps the other attributes and its class', () => {
    expect(cell({ className: 'extra', position: 1, title: 'x' }).className).toBe('hf-numeric hf-rank extra')
  })
})

import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { shareMarker } from '../card/shareMarker'
import { LastModified } from './LastModified'

describe('LastModified', () => {
  it('says "Laatst gewijzigd:" with the moment in a time element', () => {
    const { container } = render(<LastModified dateTime="2026-10-21T12:05:00.000Z">wo 14:05</LastModified>)

    expect(container.querySelector('p')?.textContent).toBe('Laatst gewijzigd: wo 14:05')
    expect(container.querySelector('time')?.getAttribute('datetime')).toBe('2026-10-21T12:05:00.000Z')
    expect(container.querySelector('time')?.textContent).toBe('wo 14:05')
  })

  it('is quiet text', () => {
    const { container } = render(<LastModified dateTime="2026-10-21T12:05:00.000Z">wo 14:05</LastModified>)

    expect(container.querySelector('p.hf-meta')).not.toBeNull()
  })

  it('is marked so the image of a card leaves it out', () => {
    const { container } = render(<LastModified dateTime="2026-10-21T12:05:00.000Z">wo 14:05</LastModified>)

    expect(container.querySelector(`p[${shareMarker}]`)).not.toBeNull()
  })

  it('passes other props on', () => {
    const { container } = render(
      <LastModified dateTime="2026-10-21T12:05:00.000Z" id="gewijzigd">
        wo 14:05
      </LastModified>,
    )

    expect(container.querySelector('#gewijzigd')).not.toBeNull()
  })
})

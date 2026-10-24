import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Time } from './Time'

describe('Time', () => {
  it('is a time element with the date for machines and the text for people', () => {
    const { container } = render(<Time dateTime="2026-10-24">24 oktober 2026</Time>)
    const time = container.firstElementChild

    expect(time?.tagName).toBe('TIME')
    expect(time?.getAttribute('datetime')).toBe('2026-10-24')
    expect(time?.textContent).toBe('24 oktober 2026')
  })

  it('has no class of its own, so it takes the style of its surroundings', () => {
    const { container } = render(<Time dateTime="2026-10-24">24 oktober 2026</Time>)

    expect(container.firstElementChild?.hasAttribute('class')).toBe(false)
  })

  it('keeps the other attributes', () => {
    const { container } = render(
      <Time className="extra" dateTime="2026-10-24">
        24 oktober 2026
      </Time>,
    )

    expect(container.firstElementChild?.className).toBe('extra')
  })

  it('needs a dateTime', () => {
    // @ts-expect-error A time without a date or a time for machines is plain text.
    const element = <Time>24 oktober 2026</Time>

    expect(element).toBeTruthy()
  })
})

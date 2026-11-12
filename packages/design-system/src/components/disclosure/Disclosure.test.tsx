import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Disclosure } from './Disclosure'

describe('Disclosure', () => {
  it('is a details element with the summary as its first child and the content after it', () => {
    const { container } = render(<Disclosure summary="Invoer weghalen">Reden</Disclosure>)
    const details = container.querySelector('details')

    expect(details?.firstElementChild?.tagName).toBe('SUMMARY')
    expect(details?.firstElementChild?.textContent).toBe('Invoer weghalen')
    expect(details?.querySelector('.hf-disclosure-content')?.textContent).toBe('Reden')
  })

  it('is closed unless it is open', () => {
    const { container, rerender } = render(<Disclosure summary="Invoer weghalen">Reden</Disclosure>)

    expect(container.querySelector('details')?.open).toBe(false)

    rerender(
      <Disclosure open summary="Invoer weghalen">
        Reden
      </Disclosure>,
    )

    expect(container.querySelector('details')?.open).toBe(true)
  })

  it('hides the arrow from assistive technology, so the summary is named by its text alone', () => {
    render(<Disclosure summary="Invoer weghalen">Reden</Disclosure>)

    expect(
      screen.getByText('Invoer weghalen').closest('summary')?.querySelector('svg')?.getAttribute('aria-hidden'),
    ).toBe('true')
  })

  it('opens and closes when the summary is pressed, without any script of its own', () => {
    const { container } = render(<Disclosure summary="Invoer weghalen">Reden</Disclosure>)
    const details = container.querySelector('details')

    fireEvent.click(screen.getByText('Invoer weghalen'))
    expect(details?.open).toBe(true)

    fireEvent.click(screen.getByText('Invoer weghalen'))
    expect(details?.open).toBe(false)
  })

  it('has a class of its own next to the class passed in, and keeps the other attributes', () => {
    const { container } = render(
      <Disclosure className="extra" id="weghalen" summary="Invoer weghalen">
        Reden
      </Disclosure>,
    )
    const details = container.querySelector('details')

    expect(details?.className).toBe('hf-disclosure extra')
    expect(details?.id).toBe('weghalen')
  })

  it('shows the value after the summary, with a comma for a screen reader', () => {
    const { container } = render(
      <Disclosure summary="Tegenstander" value="Ajax">
        Een lijst
      </Disclosure>,
    )

    expect(container.querySelector('summary')?.textContent).toBe('Tegenstander, Ajax')
    expect(container.querySelector('.hf-disclosure-value')?.textContent).toBe(', Ajax')
  })

  it('shows no value when there is none', () => {
    const { container } = render(
      <Disclosure summary="Tegenstander" value="">
        Een lijst
      </Disclosure>,
    )

    expect(container.querySelector('.hf-disclosure-value')).toBeNull()
  })
})

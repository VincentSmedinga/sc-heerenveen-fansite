import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CountryName } from './CountryName'

describe('CountryName', () => {
  it('shows the flag as decoration and the name in Dutch, so the country is read once', () => {
    const { container } = render(<CountryName country="NL" />)
    const flag = container.querySelector('img')

    expect(container.textContent).toBe('Nederland')
    expect(flag?.getAttribute('alt')).toBe('')
    expect(flag?.getAttribute('src')).toMatch(/^data:image\/svg\+xml,/u)
  })

  it('shows the frame with the code, hidden from a screen reader, for a country without a drawing', () => {
    const { container } = render(<CountryName country="VE" />)
    const frame = container.querySelector('.hf-player-name-code')

    expect(frame?.getAttribute('aria-hidden')).toBe('true')
    expect(container.querySelector('img')).toBeNull()
    expect(container.textContent).toBe('VEVenezuela')
  })

  it('shows a code that is no country as it is, without a flag', () => {
    const { container } = render(<CountryName country="XX" />)

    expect(container.textContent).toBe('XX')
    expect(container.querySelector('.hf-player-name-flag')).toBeNull()
  })
})

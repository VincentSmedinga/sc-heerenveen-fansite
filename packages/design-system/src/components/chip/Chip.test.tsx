import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Chip } from './Chip'

describe('Chip', () => {
  it('is a link to the address without the choice, named by the choice and "weghalen"', () => {
    render(<Chip href="/wedstrijden/zoeken">Ajax</Chip>)
    const link = screen.getByRole('link', { name: 'Ajax weghalen' })

    expect(link.getAttribute('href')).toBe('/wedstrijden/zoeken')
    expect(link.className).toBe('hf-chip')
  })

  it('hides the cross from a screen reader and takes another word for removing', () => {
    render(
      <Chip href="#" removeLabel="wissen">
        Uit
      </Chip>,
    )

    expect(screen.getByRole('link', { name: 'Uit wissen' }).querySelector('svg')?.getAttribute('aria-hidden')).toBe(
      'true',
    )
  })
})

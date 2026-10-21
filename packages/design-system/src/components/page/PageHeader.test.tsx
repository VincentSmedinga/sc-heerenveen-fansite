import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PageHeader } from './PageHeader'

describe('PageHeader', () => {
  it('is the banner of the page', () => {
    render(<PageHeader>Kop van de pagina</PageHeader>)
    const banner = screen.getByRole('banner')

    expect(banner.tagName).toBe('HEADER')
    expect(banner.className).toBe('hf-page-header')
    expect(banner.textContent).toBe('Kop van de pagina')
  })

  it('keeps the other attributes and adds a class to its own', () => {
    render(<PageHeader className="extra" id="kop" />)

    expect(screen.getByRole('banner').className).toBe('hf-page-header extra')
    expect(screen.getByRole('banner').id).toBe('kop')
  })
})

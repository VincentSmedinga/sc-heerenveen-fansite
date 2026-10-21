import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PageFooter } from './PageFooter'

describe('PageFooter', () => {
  it('is the contentinfo of the page', () => {
    render(<PageFooter>Voet van de pagina</PageFooter>)
    const footer = screen.getByRole('contentinfo')

    expect(footer.tagName).toBe('FOOTER')
    expect(footer.className).toBe('hf-page-footer')
    expect(footer.textContent).toBe('Voet van de pagina')
  })

  it('keeps the other attributes and adds a class to its own', () => {
    render(<PageFooter className="extra" id="voet" />)

    expect(screen.getByRole('contentinfo').className).toBe('hf-page-footer extra')
    expect(screen.getByRole('contentinfo').id).toBe('voet')
  })
})

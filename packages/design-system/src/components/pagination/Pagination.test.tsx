import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Pagination } from './Pagination'

describe('Pagination', () => {
  it('is a nav with a name for screen readers', () => {
    render(<Pagination current={2} label="Pagina's" total={9} />)

    expect(screen.getByRole('navigation', { name: "Pagina's" }).tagName).toBe('NAV')
  })

  it('says which page it is and how many there are', () => {
    render(<Pagination current={2} label="Pagina's" total={9} />)

    expect(screen.getByRole('navigation').textContent).toContain('Pagina 2 van 9')
  })

  it('links to the previous and the next page with words, and marks them for browsers', () => {
    render(<Pagination current={2} label="Pagina's" nextHref="/podcasts?pagina=3" previousHref="/podcasts" total={9} />)
    const previous = screen.getByRole('link', { name: 'Vorige' })
    const next = screen.getByRole('link', { name: 'Volgende' })

    expect(previous.getAttribute('href')).toBe('/podcasts')
    expect(previous.getAttribute('rel')).toBe('prev')
    expect(next.getAttribute('href')).toBe('/podcasts?pagina=3')
    expect(next.getAttribute('rel')).toBe('next')
  })

  it('has no link to a previous page on the first page', () => {
    render(<Pagination current={1} label="Pagina's" nextHref="/podcasts?pagina=2" total={9} />)

    expect(screen.queryByRole('link', { name: 'Vorige' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Volgende' })).toBeTruthy()
  })

  it('has no link to a next page on the last page', () => {
    render(<Pagination current={9} label="Pagina's" previousHref="/podcasts?pagina=8" total={9} />)

    expect(screen.queryByRole('link', { name: 'Volgende' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Vorige' })).toBeTruthy()
  })

  it('has no links at all when there is one page', () => {
    render(<Pagination current={1} label="Pagina's" total={1} />)

    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(screen.getByRole('navigation').textContent).toBe('Pagina 1 van 1')
  })

  it('keeps the other attributes and adds a class to its own', () => {
    render(<Pagination className="extra" current={1} id="paginering" label="Pagina's" total={2} />)
    const nav = screen.getByRole('navigation')

    expect(nav.className).toBe('hf-pagination extra')
    expect(nav.id).toBe('paginering')
  })

  it('needs a label, and keeps it when another name is passed in from JavaScript', () => {
    const props = { 'aria-label': 'Iets anders' }
    const elements = [
      // @ts-expect-error A pagination without a name is not allowed.
      <Pagination current={1} total={2} />,
    ]
    render(<Pagination {...props} current={1} label="Pagina's" total={2} />)

    expect(elements).toHaveLength(1)
    expect(screen.getByRole('navigation', { name: "Pagina's" })).toBeTruthy()
  })
})

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ArticleCard } from './ArticleCard'

const props = {
  date: '25 oktober 2026',
  dateTime: '2026-10-25',
  href: '/redactie/dit-zijn-wij',
  intro: 'Een verzonnen inleiding.',
  title: 'Dit zijn wij',
}

describe('ArticleCard', () => {
  it('is a section named by its h2, "Van de redactie"', () => {
    render(<ArticleCard {...props} />)

    const region = screen.getByRole('region', { name: 'Van de redactie' })

    expect(region.tagName).toBe('SECTION')
    expect(region.className).toBe('hf-card hf-card-soft hf-article-card')
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Van de redactie')
  })

  it('has the title as an h3 with a link to the article', () => {
    render(<ArticleCard {...props} />)
    const heading = screen.getByRole('heading', { level: 3 })
    const link = heading.querySelector('a')

    expect(heading.textContent).toBe('Dit zijn wij')
    expect(link?.getAttribute('href')).toBe('/redactie/dit-zijn-wij')
  })

  it('shows the date in a time element and the intro as text', () => {
    const { container } = render(<ArticleCard {...props} />)
    const time = container.querySelector('time')

    expect(time?.getAttribute('datetime')).toBe('2026-10-25')
    expect(time?.textContent).toBe('25 oktober 2026')
    expect(container.textContent).toContain('Een verzonnen inleiding.')
  })

  it('ends with the link "Lees verder" to the same page, named after the article', () => {
    render(<ArticleCard {...props} />)
    const link = screen.getByRole('link', { name: 'Lees verder over Dit zijn wij' })

    expect(link.getAttribute('href')).toBe('/redactie/dit-zijn-wij')
    expect(link.textContent).toBe('Lees verder')
    expect(link.querySelector('svg')).not.toBeNull()
    expect(screen.getAllByRole('link')).toHaveLength(2)
  })

  it('shows the title and the intro as text and not as HTML', () => {
    // Strings in braces: JSX would turn the &amp; in an attribute into a & itself.
    const { container } = render(<ArticleCard {...props} intro={'<i>y</i> &amp;'} title={'<script>z</script>'} />)

    expect(container.querySelector('script, i')).toBeNull()
    expect(screen.getByRole('heading', { level: 3 }).textContent).toBe('<script>z</script>')
    expect(container.textContent).toContain('<i>y</i> &amp;')
  })

  it('gives two cards on one page headings of their own', () => {
    render(
      <>
        <ArticleCard {...props} />
        <ArticleCard {...props} />
      </>,
    )

    expect(screen.getAllByRole('region', { name: 'Van de redactie' })).toHaveLength(2)
  })
})

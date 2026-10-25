import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Article } from './Article'

const props = {
  author: 'de redactie',
  date: '25 oktober 2026',
  dateTime: '2026-10-25',
  intro: 'Een verzonnen inleiding.',
  title: 'Dit zijn wij',
}

describe('Article', () => {
  it('is an article with the title as its h1, and no other heading of its own', () => {
    const { container } = render(<Article {...props} />)

    expect(container.firstElementChild?.tagName).toBe('ARTICLE')
    expect(container.firstElementChild?.className).toBe('hf-article')
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Dit zijn wij')
    expect(screen.getAllByRole('heading')).toHaveLength(1)
  })

  it('writes "Door" and the author, then the date in a time element with the day for machines', () => {
    const { container } = render(<Article {...props} />)
    const meta = container.querySelector('p.hf-meta')
    const time = meta?.querySelector('time')

    expect(meta?.textContent).toBe('Door de redactie · 25 oktober 2026')
    expect(time?.getAttribute('datetime')).toBe('2026-10-25')
    expect(time?.textContent).toBe('25 oktober 2026')
  })

  it('shows the intro as the intro paragraph, under the date', () => {
    const { container } = render(<Article {...props} />)
    const paragraphs = [...container.querySelectorAll('p')]

    expect(paragraphs.map((paragraph) => paragraph.className)).toEqual(['hf-meta hf-article-meta', 'hf-intro'])
    expect(paragraphs[1]?.textContent).toBe('Een verzonnen inleiding.')
  })

  it('puts the children after the intro', () => {
    const { container } = render(
      <Article {...props}>
        <p>De tekst.</p>
      </Article>,
    )

    expect(container.querySelector('article')?.lastElementChild?.textContent).toBe('De tekst.')
  })

  it('shows the title, author and intro as text and not as HTML', () => {
    // Strings in braces: JSX would turn the &amp; in an attribute into a & itself.
    const { container } = render(
      <Article {...props} author={'<b>x</b>'} intro={'<i>y</i> &amp;'} title={'<script>z</script>'} />,
    )

    expect(container.querySelector('script, i')).toBeNull()
    expect(container.querySelector('h1')?.textContent).toBe('<script>z</script>')
    expect(container.textContent).toContain('<i>y</i> &amp;')
  })

  it('keeps the other attributes and adds its class to a class of the page', () => {
    const { container } = render(<Article {...props} className="extra" id="artikel" />)

    expect(container.firstElementChild?.className).toBe('hf-article extra')
    expect(container.firstElementChild?.id).toBe('artikel')
  })
})

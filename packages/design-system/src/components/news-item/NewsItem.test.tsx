import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { NewsItem } from './NewsItem'

const props = {
  dateTime: '2026-10-21T12:05:00Z',
  headline: 'Heerenveen wint in blessuretijd van Testclub',
  href: 'https://testkrant.test/heerenveen-wint',
  source: 'Testkrant',
  time: '14:05',
}

describe('NewsItem', () => {
  it('shows the headline as a link to the item at the source, in the same tab', () => {
    render(<NewsItem {...props} />)
    const link = screen.getByRole('link', { name: props.headline })

    expect(link.getAttribute('href')).toBe(props.href)
    expect(link.hasAttribute('target')).toBe(false)
    expect(link.className).toBe('hf-headline hf-news-item-headline')
  })

  it('names the link by the headline alone', () => {
    render(<NewsItem {...props} paywalled />)

    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.getByRole('link').textContent).toBe(props.headline)
  })

  it('shows the headline as the source published it', () => {
    // A string in braces: JSX would turn the &amp; in an attribute into a & itself.
    render(<NewsItem {...props} headline={'SC Heerenveen &amp; <b>Testclub</b>: 3-1!'} />)

    expect(screen.getByRole('link').textContent).toBe('SC Heerenveen &amp; <b>Testclub</b>: 3-1!')
    expect(document.querySelector('b')).toBeNull()
  })

  it('shows the name of the source and the time, with the full time in a time element', () => {
    render(<NewsItem {...props} />)
    const time = screen.getByText('14:05')

    expect(screen.getByText('Testkrant').tagName).toBe('SPAN')
    expect(time.tagName).toBe('TIME')
    expect(time.getAttribute('datetime')).toBe('2026-10-21T12:05:00Z')
  })

  it('says nothing about a paywall when the item has none', () => {
    render(<NewsItem {...props} />)

    expect(screen.queryByText('voor abonnees')).toBeNull()
  })

  it('says nothing about a paywall when paywalled is false', () => {
    render(<NewsItem {...props} paywalled={false} />)

    expect(screen.queryByText('voor abonnees')).toBeNull()
  })

  it('says "voor abonnees" in text when the item is behind a paywall', () => {
    render(<NewsItem {...props} paywalled />)

    expect(screen.getByText('voor abonnees').tagName).toBe('SPAN')
    expect(screen.getByText('voor abonnees').closest('p')?.textContent).toBe('Testkrant · 14:05 · voor abonnees')
  })

  it('puts the source, the time and the paywall in one paragraph under the headline', () => {
    const { container } = render(<NewsItem {...props} paywalled />)
    const item = container.firstElementChild

    expect([...(item?.children ?? [])].map((child) => child.tagName)).toEqual(['A', 'P'])
    expect(item?.querySelector('p')?.className).toBe('hf-meta hf-news-item-meta')
  })

  it('hides the separators from assistive technology', () => {
    const { container } = render(<NewsItem {...props} paywalled />)
    const separators = container.querySelectorAll('[aria-hidden="true"]')

    expect(separators).toHaveLength(2)
    expect([...separators].map((separator) => separator.textContent)).toEqual([' · ', ' · '])
  })

  it('holds only a link, a paragraph and their text: no image, no icon and no other element', () => {
    const { container } = render(<NewsItem {...props} paywalled />)
    const names = [...container.querySelectorAll('*')].map((element) => element.tagName)

    expect(names).toEqual(['DIV', 'A', 'P', 'SPAN', 'SPAN', 'TIME', 'SPAN', 'SPAN'])
    expect(container.querySelector('img, svg, picture, iframe')).toBeNull()
  })

  it('is a div, so it fits in a List.Item and in other places', () => {
    const { container } = render(
      <ul>
        <li>
          <NewsItem {...props} />
        </li>
      </ul>,
    )

    expect(within(screen.getByRole('listitem')).getByRole('link')).toBeTruthy()
    expect(container.querySelector('li > div.hf-news-item')).toBeTruthy()
  })

  it('keeps the other attributes and adds a class to its own', () => {
    const { container } = render(<NewsItem {...props} className="extra" id="bericht" />)

    expect(container.firstElementChild?.className).toBe('hf-news-item extra')
    expect(container.firstElementChild?.id).toBe('bericht')
  })

  it('has no props for an intro or an image, and no children', () => {
    const elements = [
      // @ts-expect-error An intro is only shown with the permission of the source.
      <NewsItem {...props} intro="De eerste zinnen van het bericht." />,
      // @ts-expect-error An image is only shown with the permission of the source.
      <NewsItem {...props} image="https://testkrant.test/foto.jpg" />,
      // @ts-expect-error The content comes from the props, not from children.
      <NewsItem {...props}>Een intro</NewsItem>,
    ]

    expect(elements).toHaveLength(3)
  })

  it('needs a headline, a link, a source, a time and the full time', () => {
    /** The props without one of them. The type is wider than NewsItem allows, so every use below is an error. */
    const without = (name: keyof typeof props): Partial<typeof props> => ({ ...props, [name]: undefined })
    const elements = [
      // @ts-expect-error A news line without a headline says nothing.
      <NewsItem {...without('headline')} />,
      // @ts-expect-error A headline without a link is not a news line.
      <NewsItem {...without('href')} />,
      // @ts-expect-error The source must always be credited (editorial principle 4).
      <NewsItem {...without('source')} />,
      // @ts-expect-error The time is part of the line.
      <NewsItem {...without('time')} />,
      // @ts-expect-error The time element needs the full time.
      <NewsItem {...without('dateTime')} />,
    ]

    expect(elements).toHaveLength(5)
  })
})

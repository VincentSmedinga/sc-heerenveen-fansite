import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { NewsItem } from './NewsItem'

const props = {
  dateTime: '2026-10-21T12:05:00Z',
  headline: 'Heerenveen wint in blessuretijd van Testclub',
  href: 'https://testkrant.test/heerenveen-wint',
  source: 'Testkrant',
  time: 'wo 14:05',
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

  it('shows the name of the source under the headline', () => {
    render(<NewsItem {...props} />)

    expect(screen.getByText('Testkrant').tagName).toBe('SPAN')
    expect(screen.getByText('Testkrant').closest('p')?.className).toBe('hf-meta hf-news-item-meta')
  })

  it('shows the short day and the time as they are given, with the full time in a time element', () => {
    render(<NewsItem {...props} />)
    const time = screen.getByText('wo 14:05')

    expect(time.tagName).toBe('TIME')
    expect(time.getAttribute('datetime')).toBe('2026-10-21T12:05:00Z')
    expect(time.className).toBe('hf-meta hf-news-item-time')
  })

  it('puts the time before the headline, as it is on the screen', () => {
    const { container } = render(<NewsItem {...props} />)
    const layout = container.querySelector('.hf-news-item-layout')

    // The container query only changes the layout, so the order stays the same when the time is
    // above the headline.
    expect([...(layout?.children ?? [])].map((child) => child.className)).toEqual([
      'hf-meta hf-news-item-time',
      'hf-news-item-body',
    ])
    expect(layout?.querySelector('.hf-news-item-body')?.firstElementChild?.tagName).toBe('A')
  })

  it('has the layout inside the container, so the query can look at the width of the line', () => {
    const { container } = render(<NewsItem {...props} />)

    expect(container.firstElementChild?.className).toBe('hf-news-item')
    expect(container.firstElementChild?.children).toHaveLength(1)
    expect(container.firstElementChild?.firstElementChild?.className).toBe('hf-news-item-layout')
  })

  it('keeps the time out of the name of the link', () => {
    render(<NewsItem {...props} />)

    expect(screen.getByRole('link').textContent).not.toContain('14:05')
    expect(screen.getByRole('link').closest('time')).toBeNull()
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
    expect(screen.getByText('voor abonnees').closest('p')?.textContent).toBe('Testkrant · voor abonnees')
  })

  it('says nothing more than the source when there are no details, or an empty list of them', () => {
    const { rerender } = render(<NewsItem {...props} />)

    expect(screen.getByText('Testkrant').closest('p')?.textContent).toBe('Testkrant')

    rerender(<NewsItem {...props} details={[]} />)

    expect(screen.getByText('Testkrant').closest('p')?.textContent).toBe('Testkrant')
  })

  it('puts each detail after the source, each after a dot that a screen reader skips', () => {
    const { container } = render(<NewsItem {...props} details={['aflevering 120', '49 min']} />)
    const meta = container.querySelector('p')

    expect(meta?.textContent).toBe('Testkrant · aflevering 120 · 49 min')
    expect(meta?.querySelectorAll('[aria-hidden="true"]')).toHaveLength(3)
    expect(screen.getByText('49 min').tagName).toBe('SPAN')
  })

  it('puts the details after "voor abonnees"', () => {
    render(<NewsItem {...props} details={['49 min']} paywalled />)

    expect(screen.getByText('49 min').closest('p')?.textContent).toBe('Testkrant · voor abonnees · 49 min')
  })

  it('puts the source and the paywall in one paragraph under the headline', () => {
    const { container } = render(<NewsItem {...props} paywalled />)
    const body = container.querySelector('.hf-news-item-body')

    expect([...(body?.children ?? [])].map((child) => child.tagName)).toEqual(['A', 'P'])
    expect(body?.querySelector('p')?.className).toBe('hf-meta hf-news-item-meta')
  })

  it('keeps the spaces around the separators outside the hidden part, so the words stay apart for a screen reader', () => {
    const { container } = render(<NewsItem {...props} paywalled />)
    const meta = container.querySelector('p')
    const visibleToAssistiveTechnology = [...(meta?.childNodes ?? [])]
      .filter((node) => !(node instanceof Element && node.getAttribute('aria-hidden') === 'true'))
      .map((node) => node.textContent)
      .join('')

    // The browser collapses a run of spaces into one.
    expect(visibleToAssistiveTechnology.replace(/\s+/g, ' ')).toBe('Testkrant voor abonnees')
  })

  it('hides the separator and the icon from assistive technology', () => {
    const { container } = render(<NewsItem {...props} paywalled />)
    const hidden = container.querySelectorAll('[aria-hidden="true"]')

    expect([...hidden].map((element) => element.tagName)).toEqual(['svg', 'SPAN'])
    expect(hidden[1]?.textContent).toBe('·')
  })

  it('draws an icon for a link to another site next to the source, in the colour of the text', () => {
    const { container } = render(<NewsItem {...props} />)
    const icon = container.querySelector('p svg')

    expect(container.querySelectorAll('svg')).toHaveLength(1)
    expect(icon?.getAttribute('aria-hidden')).toBe('true')
    expect(icon?.getAttribute('focusable')).toBe('false')
    expect(icon?.getAttribute('stroke')).toBe('currentColor')
    expect(icon?.previousElementSibling?.textContent).toBe('Testkrant')
    // The icon says nothing a screen reader needs, and the link is not in the icon.
    expect(icon?.closest('a')).toBeNull()
    expect(icon?.textContent).toBe('')
  })

  it('draws the icon itself: nothing in it points to another file or address', () => {
    const { container } = render(<NewsItem {...props} />)
    const icon = container.querySelector('svg')
    const elements = [...(icon?.querySelectorAll('*') ?? [])].map((element) => element.tagName)

    expect(elements.length).toBeGreaterThan(0)
    expect(new Set(elements)).toEqual(new Set(['path']))
    expect(icon?.outerHTML).not.toMatch(/(href|src)=|https?:|url\(/)
  })

  it('has the icon with or without a paywall, once', () => {
    const { container } = render(<NewsItem {...props} paywalled />)

    expect(container.querySelectorAll('svg')).toHaveLength(1)
  })

  it('holds a time, a link, a paragraph, an icon and their text: no image and no other element', () => {
    const { container } = render(<NewsItem {...props} paywalled />)
    const names = [...container.querySelectorAll('*')].map((element) => element.tagName)

    expect(names).toEqual([
      'DIV',
      'DIV',
      'TIME',
      'DIV',
      'A',
      'P',
      'SPAN',
      'svg',
      'path',
      'path',
      'path',
      'SPAN',
      'SPAN',
    ])
    expect(container.querySelector('img, picture, iframe, video, audio, image, use')).toBeNull()
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
    /**
     * The props without one of them. The type is wider than NewsItem allows, so every use below
     * is an error.
     */
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

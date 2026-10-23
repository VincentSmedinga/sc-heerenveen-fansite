import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DiscussionItem } from './DiscussionItem'

const props = {
  dateTime: '2026-10-23T11:28:21Z',
  href: 'https://forum.test/d/41-wie-wint-zondag',
  lastPostedBy: 'Buffon1',
  replies: 83,
  time: '13:28',
  title: 'Wie wint er zondag?',
}

describe('DiscussionItem', () => {
  it('shows the title as a link to the discussion on the forum, in the same tab', () => {
    render(<DiscussionItem {...props} />)
    const link = screen.getByRole('link', { name: props.title })

    expect(link.getAttribute('href')).toBe(props.href)
    expect(link.hasAttribute('target')).toBe(false)
    expect(link.className).toBe('hf-headline hf-discussion-item-title')
  })

  it('has one link only, named by the title alone', () => {
    render(<DiscussionItem {...props} />)

    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.getByRole('link').textContent).toBe(props.title)
  })

  it('shows the title as the forum has it, as text', () => {
    // A string in braces: JSX would turn the &amp; in an attribute into a & itself.
    render(<DiscussionItem {...props} title={'Spelers &amp; <b>staf</b>'} />)

    expect(screen.getByRole('link').textContent).toBe('Spelers &amp; <b>staf</b>')
    expect(document.querySelector('b')).toBeNull()
  })

  it('writes the replies, the last poster and the time under the title', () => {
    const { container } = render(<DiscussionItem {...props} />)
    const meta = container.querySelector('p')

    expect(meta?.className).toBe('hf-meta hf-discussion-item-meta')
    expect(meta?.textContent).toBe('83 reacties · laatst Buffon1 · 13:28')
  })

  it('writes "1 reactie" for one reply and "0 reacties" for none', () => {
    const { container, rerender } = render(<DiscussionItem {...props} replies={1} />)

    expect(container.querySelector('p')?.textContent).toBe('1 reactie · laatst Buffon1 · 13:28')

    rerender(<DiscussionItem {...props} replies={0} />)

    expect(container.querySelector('p')?.textContent).toBe('0 reacties · laatst Buffon1 · 13:28')
  })

  it('writes the thousands of replies the Dutch way', () => {
    const { container } = render(<DiscussionItem {...props} replies={1234} />)

    expect(container.querySelector('p')?.textContent).toBe('1.234 reacties · laatst Buffon1 · 13:28')
  })

  it.each([undefined, null, ''])('gives only the time when the last poster is %j', (lastPostedBy) => {
    const { container } = render(<DiscussionItem {...props} lastPostedBy={lastPostedBy} />)

    expect(container.querySelector('p')?.textContent).toBe('83 reacties · laatst 13:28')
  })

  it('shows the screen name as plain text: no link, no image', () => {
    const { container } = render(<DiscussionItem {...props} lastPostedBy="<b>Buffon1</b>" />)

    expect(container.querySelector('p')?.textContent).toContain('laatst <b>Buffon1</b> ·')
    expect(container.querySelector('b')).toBeNull()
    expect(container.querySelector('img, svg, picture')).toBeNull()
    expect(screen.getAllByRole('link')).toHaveLength(1)
  })

  it('puts the time in a time element with the full time', () => {
    render(<DiscussionItem {...props} />)
    const time = screen.getByText('13:28')

    expect(time.tagName).toBe('TIME')
    expect(time.getAttribute('datetime')).toBe('2026-10-23T11:28:21Z')
  })

  it('hides the dot between the replies and the last post from a screen reader, and keeps the spaces around it', () => {
    const { container } = render(<DiscussionItem {...props} />)
    const dot = container.querySelector('[aria-hidden="true"]')

    expect(dot?.textContent).toBe('·')
    expect(container.querySelector('p')?.innerHTML).toContain('</span> <span aria-hidden="true">·</span> <span>')
  })

  it('is a div, passes other props on and adds its own class to a given one', () => {
    const { container } = render(<DiscussionItem {...props} className="extra" id="een" />)

    expect(container.firstElementChild?.tagName).toBe('DIV')
    expect(container.firstElementChild?.className).toBe('hf-discussion-item extra')
    expect(container.firstElementChild?.id).toBe('een')
  })
})

import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import * as follow from './followPage'
import { ShortcutsRow } from './ShortcutsRow'

// jsdom has no layout, so the test gives the row and the link the boxes and sizes they have.
const box = (left: number, right: number) => ({ left, right }) as DOMRect

const renderRow = ({
  keyboard = true,
  link,
  scrolls = true,
}: {
  keyboard?: boolean
  link: DOMRect
  scrolls?: boolean
}) => {
  const { container } = render(
    <ShortcutsRow>
      <a href="#stand">Stand</a>
    </ShortcutsRow>,
  )
  const row = container.firstElementChild as HTMLElement
  const anchor = screen.getByRole('link')
  const scrollIntoView = vi.fn()

  Object.defineProperty(row, 'scrollWidth', { value: scrolls ? 600 : 260 })
  Object.defineProperty(row, 'clientWidth', { value: 260 })
  vi.spyOn(row, 'getBoundingClientRect').mockReturnValue(box(100, 360))
  vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue(link)
  vi.spyOn(window, 'getComputedStyle').mockReturnValue({ scrollPaddingLeft: '29px' } as CSSStyleDeclaration)
  vi.spyOn(anchor, 'matches').mockImplementation((selector) => keyboard && selector === ':focus-visible')
  anchor.scrollIntoView = scrollIntoView

  return { anchor, row, scrollIntoView }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ShortcutsRow', () => {
  it('makes the bar follow the page while it is on the page, and stops when it goes', () => {
    const stop = vi.fn()
    const followPage = vi.spyOn(follow, 'followPage').mockReturnValue(stop)
    const { container, unmount } = render(
      <ShortcutsRow>
        <a href="#stand">Stand</a>
      </ShortcutsRow>,
    )

    expect(followPage).toHaveBeenCalledWith(container.firstElementChild)
    expect(stop).not.toHaveBeenCalled()

    unmount()

    expect(stop).toHaveBeenCalledTimes(1)
  })

  it('has no current link in its markup, as the server sends it, until the page is scrolled', () => {
    const { container } = render(
      <ShortcutsRow>
        <a href="#stand">Stand</a>
      </ShortcutsRow>,
    )

    expect(container.querySelector('[aria-current]')).toBeNull()
  })

  it('is the row of the bar, around its list', () => {
    const { row } = renderRow({ link: box(150, 250) })

    expect(row.className).toBe('hf-page-shortcuts-row')
    expect(row.querySelector('a')).not.toBeNull()
  })

  it('leaves the row alone when the link that gets the focus is clear of the fade', () => {
    const { anchor, scrollIntoView } = renderRow({ link: box(150, 250) })

    fireEvent.focus(anchor)

    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  it('scrolls the start of the link to the start of the row when it is under the fade at the end', () => {
    const { anchor, scrollIntoView } = renderRow({ link: box(300, 361) })

    fireEvent.focus(anchor)

    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', inline: 'start' })
  })

  it('does the same when the link is under the fade at the start, or half out of the row', () => {
    const { anchor, scrollIntoView } = renderRow({ link: box(110, 190) })

    fireEvent.focus(anchor)

    expect(scrollIntoView).toHaveBeenCalledTimes(1)
  })

  it('does nothing when the link is pressed with a finger or a mouse, which would move it from under the finger', () => {
    const { anchor, scrollIntoView } = renderRow({ keyboard: false, link: box(300, 361) })

    fireEvent.focus(anchor)

    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  it('does nothing in a row that does not scroll, as at the narrowest width, where it wraps', () => {
    const { anchor, scrollIntoView } = renderRow({ link: box(300, 361), scrolls: false })

    fireEvent.focus(anchor)

    expect(scrollIntoView).not.toHaveBeenCalled()
  })
})

describe('ShortcutsRow in a submenu', () => {
  const renderSubmenuRow = ({ current = true, scrolls = true }: { current?: boolean; scrolls?: boolean } = {}) => {
    const followPage = vi.spyOn(follow, 'followPage')
    const { container } = render(
      <ShortcutsRow follow={false}>
        <a href="/programma">Programma</a>
        <a aria-current={current ? 'page' : undefined} href="/stand">
          Stand
        </a>
      </ShortcutsRow>,
    )
    const row = container.firstElementChild as HTMLElement

    return { followPage, row, scrolls }
  }

  // The row is laid out before the effect, so the boxes have to be there when it renders.
  const layout = (scrolls: boolean) => {
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(scrolls ? 600 : 260)
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(260)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return this.getAttribute('aria-current') === 'page' ? box(400, 460) : box(100, 360)
    })
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({ scrollPaddingLeft: '29px' } as CSSStyleDeclaration)
  }

  it('does not follow the page: the current page comes from the server', () => {
    layout(true)
    const { followPage } = renderSubmenuRow()

    expect(followPage).not.toHaveBeenCalled()
  })

  it('starts scrolled so that the link to the current page is where the row snaps to', () => {
    layout(true)
    const { row } = renderSubmenuRow()

    // The link starts 300px into the row, and the row keeps 29px of room at its start.
    expect(row.scrollLeft).toBe(300 - 29)
  })

  it('stays at the start when no link is current', () => {
    layout(true)
    const { row } = renderSubmenuRow({ current: false })

    expect(row.scrollLeft).toBe(0)
  })

  it('stays at the start in a row that does not scroll, as at the narrowest width, where it wraps', () => {
    layout(false)
    const { row } = renderSubmenuRow()

    expect(row.scrollLeft).toBe(0)
  })
})

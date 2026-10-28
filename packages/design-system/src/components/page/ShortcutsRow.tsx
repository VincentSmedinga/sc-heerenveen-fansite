'use client'

import { type FocusEvent, type ReactNode, useEffect, useRef } from 'react'

import { followPage } from './followPage'

/**
 * The row of links in a Page.Shortcuts, which scrolls sideways. The links work without it; it
 * only makes the keyboard reach them. A browser scrolls a link that gets the focus into view
 * only if it is hardly visible: a link that is half in view, or under the fade at the edge of
 * the row, stays where it is, with a focus ring that is cut off or faded. So when the link
 * with the focus is not clear of the fade, the row scrolls to put its start at the start of
 * the row, after the fade. That is where the row snaps to as well (see shortcuts.css), so the
 * snapping does not scroll it back. It only does so for the keyboard: a link that is pressed
 * with a finger or a mouse gets the focus too, and a row that scrolls then would move the link
 * from under the finger before the press ends, so the click is lost.
 *
 * It also makes the bar follow the page: the link to the heading that came past last is marked
 * as the current place and scrolled to the start of the row (see followPage.ts). The links come
 * from the server as they are, so the mark is an attribute that the row sets on them.
 */
export const ShortcutsRow = ({ children }: { children: ReactNode }) => {
  const rowRef = useRef<HTMLDivElement>(null)

  useEffect(() => (rowRef.current === null ? undefined : followPage(rowRef.current)), [])

  const reveal = (event: FocusEvent<HTMLDivElement>) => {
    const row = event.currentTarget
    const link = event.target as HTMLElement

    // A wrapped row does not scroll, and a press does not need the row to move.
    if (row.scrollWidth <= row.clientWidth || !link.matches(':focus-visible')) {
      return
    }

    // The room the row keeps at both ends, for the fade and the focus ring (see shortcuts.css).
    const room = parseFloat(getComputedStyle(row).scrollPaddingLeft) || 0
    const rowBox = row.getBoundingClientRect()
    const linkBox = link.getBoundingClientRect()

    if (linkBox.left < rowBox.left + room || linkBox.right > rowBox.right - room) {
      link.scrollIntoView({ block: 'nearest', inline: 'start' })
    }
  }

  return (
    <div className="hf-page-shortcuts-row" onFocus={reveal} ref={rowRef}>
      {children}
    </div>
  )
}

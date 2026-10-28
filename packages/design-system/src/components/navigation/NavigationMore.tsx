'use client'

import {
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'

import { Icon } from '../icon/Icon'

// There is nothing to subscribe to: the value only tells the server render from the browser.
const subscribe = () => () => undefined

/**
 * The button "Meer" of a long main menu, with the list of the items that did not fit the row.
 * It is a `details` with a `summary`, so it opens and closes without JavaScript. With it, the
 * list also closes with Escape, which puts the focus back on the button, and with a click on a
 * link in the list or anywhere outside it.
 *
 * `aria-expanded` is on the button once the page has loaded and follows the list. Before that
 * the browser tells the state of the `details` itself, and an attribute that the browser can't
 * keep up to date would go stale the first time the list opens.
 *
 * The parent gives this component a `key` that changes with the current page, so a new page
 * starts with the list closed.
 */
export const NavigationMore = ({ children, label }: { children: ReactNode; label: string }) => {
  const id = useId()
  const details = useRef<HTMLDetailsElement>(null)
  const summary = useRef<HTMLElement>(null)
  const [open, setOpen] = useState(false)
  const loaded = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )

  useEffect(() => {
    if (!open) {
      return
    }

    // On `click` and not on `pointerdown`: closing the list moves the page up, and a press that
    // has moved the link from under the finger before it ends is lost.
    const closeOutside = (event: Event) => {
      if (details.current && !details.current.contains(event.target as Node)) {
        details.current.open = false
      }
    }

    document.addEventListener('click', closeOutside)

    return () => document.removeEventListener('click', closeOutside)
  }, [open])

  const closeOnEscape = (event: KeyboardEvent<HTMLDetailsElement>) => {
    if (event.key === 'Escape' && event.currentTarget.open) {
      event.currentTarget.open = false
      summary.current?.focus()
    }
  }

  const closeOnLink = (event: MouseEvent<HTMLUListElement>) => {
    if ((event.target as Element).closest('a') && details.current) {
      details.current.open = false
    }
  }

  return (
    <details
      className="hf-navigation-more-details"
      onKeyDown={closeOnEscape}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      ref={details}
    >
      <summary
        aria-controls={id}
        aria-expanded={loaded ? open : undefined}
        className="hf-navigation-link hf-navigation-more-button"
        ref={summary}
      >
        {label}
        <Icon name="arrow-up" />
      </summary>
      <ul className="hf-navigation-more-list" id={id} onClick={closeOnLink} role="list">
        {children}
      </ul>
    </details>
  )
}

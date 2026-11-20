'use client'

import { useEffect } from 'react'

/**
 * Gives the focus to the element with this `id` when the page has loaded, and shows nothing.
 * It is for the answer to a search that reloads a long page, where the editor lands on the list
 * of what was found instead of at the top, and for the summary of an error on a page that
 * loaded again, such as after a wrong code on "Kijk in je mail". The `autofocus` attribute does
 * not do it, because the page arrives in parts. Without JavaScript the focus stays at the top.
 */
export function FocusOnLoad({ id }: { id: string }) {
  useEffect(() => {
    document.getElementById(id)?.focus()
  }, [id])

  return null
}

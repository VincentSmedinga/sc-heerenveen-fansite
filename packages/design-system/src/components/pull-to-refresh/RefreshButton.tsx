import type { MouseEventHandler } from 'react'

import { Button } from '../button/Button'

export type RefreshButtonProps = {
  /** Called when the button is pressed. */
  onClick: MouseEventHandler<HTMLButtonElement>
}

/**
 * The button that reloads the page, for a visitor who can't pull the page down: with a keyboard, a screen reader or
 * another way of using the screen than a finger. It is hidden from the eye until it has focus, as a skip link is, and
 * stays in the accessibility tree, so a screen reader finds it. Its text says what it does.
 */
export const RefreshButton = ({ onClick }: RefreshButtonProps) => (
  <Button className="hf-refresh-button" onClick={onClick} type="button">
    Pagina verversen
  </Button>
)

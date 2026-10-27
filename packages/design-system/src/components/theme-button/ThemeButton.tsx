import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'
import { Icon } from '../icon/Icon'

export type ThemeButtonProps = Omit<
  ComponentPropsWithoutRef<'button'>,
  'aria-label' | 'aria-pressed' | 'children' | 'type'
> & {
  /** Whether the page is dark now: the button is pressed then, and draws a moon, not a sun. */
  dark: boolean
  /**
   * The name of the button for a screen reader, such as "Donker". There is no visible text, so
   * the name is what a visitor hears, together with whether the button is pressed.
   */
  label: string
}

/**
 * The button that switches between the light and the dark theme, for the header: a toggle
 * button with a filled sun while the page is light and a filled moon while it is dark, so the
 * shape shows the theme that is on. It is named `label` and is pressed (`aria-pressed`) in the
 * dark theme. It holds no state: the page gives it `dark` and handles the click.
 * theme-button.css gives it its look, which is made for the dark blue of the header.
 */
export const ThemeButton = ({ className, dark, label, ...props }: ThemeButtonProps) => (
  <button
    {...props}
    aria-label={label}
    aria-pressed={dark}
    className={classNames('hf-theme-button', className)}
    type="button"
  >
    <Icon appearance="filled" name={dark ? 'moon' : 'sun'} />
  </button>
)

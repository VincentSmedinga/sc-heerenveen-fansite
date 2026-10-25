import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'
import { attachIcon } from '../icon/attachIcon'
import { Icon } from '../icon/Icon'

/** The looks a Button can have: the filled one, and the soft one for an action next to the main one. */
export const buttonAppearances = ['default', 'soft'] as const

/** The icons a Button can have, in front of its text. */
export const buttonIcons = ['envelope', 'plus'] as const

/** What a Button does in a form: send it, reset it, or nothing by itself. */
export const buttonTypes = ['submit', 'button', 'reset'] as const

export type ButtonAppearance = (typeof buttonAppearances)[number]

export type ButtonIcon = (typeof buttonIcons)[number]

export type ButtonProps = Omit<ComponentPropsWithoutRef<'button'>, 'type'> & {
  /** `default` is the filled button, for the main action. `soft` is quieter, for an action next to the main one. */
  appearance?: ButtonAppearance
  /**
   * An icon in front of the text, because it says what the button does: `envelope` to send, `plus` to add or load more.
   * The button is named by its text alone: the icon is hidden from assistive technology.
   */
  icon?: ButtonIcon
  /** What the button does. It is required: a button in a form sends the form unless it says otherwise. */
  type: ButtonType
}

export type ButtonType = (typeof buttonTypes)[number]

/**
 * A button. Its text says what it does ("Versturen"), also on its own. button.css gives it its look; the filled button
 * has no class of its own, the soft one has `hf-button-soft`.
 */
export const Button = ({ appearance = 'default', children, className, icon, type, ...props }: ButtonProps) => (
  <button
    className={classNames(appearance !== 'default' && `hf-button-${appearance}`, className)}
    type={type}
    {...props}
  >
    {icon === undefined ? children : attachIcon(children, <Icon name={icon} />, 'before')}
  </button>
)

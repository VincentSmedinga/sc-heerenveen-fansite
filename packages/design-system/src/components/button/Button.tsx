import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'

/** The looks a Button can have: the filled one, and the soft one for an action next to the main one. */
export const buttonAppearances = ['default', 'soft'] as const

/** What a Button does in a form: send it, reset it, or nothing by itself. */
export const buttonTypes = ['submit', 'button', 'reset'] as const

export type ButtonAppearance = (typeof buttonAppearances)[number]

export type ButtonProps = Omit<ComponentPropsWithoutRef<'button'>, 'type'> & {
  /** `default` is the filled button, for the main action. `soft` is quieter, for an action next to the main one. */
  appearance?: ButtonAppearance
  /** What the button does. It is required: a button in a form sends the form unless it says otherwise. */
  type: ButtonType
}

export type ButtonType = (typeof buttonTypes)[number]

/**
 * A button. Its text says what it does ("Versturen"), also on its own. button.css gives it its look; the filled button
 * has no class of its own, the soft one has `hf-button-soft`.
 */
export const Button = ({ appearance = 'default', className, type, ...props }: ButtonProps) => (
  <button
    className={classNames(appearance !== 'default' && `hf-button-${appearance}`, className)}
    type={type}
    {...props}
  />
)

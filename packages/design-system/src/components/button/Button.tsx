import type { ComponentPropsWithoutRef } from 'react'

/** What a Button does in a form: send it, reset it, or nothing by itself. */
export const buttonTypes = ['submit', 'button', 'reset'] as const

export type ButtonProps = Omit<ComponentPropsWithoutRef<'button'>, 'type'> & {
  /** What the button does. It is required: a button in a form sends the form unless it says otherwise. */
  type: ButtonType
}

export type ButtonType = (typeof buttonTypes)[number]

/** A button. Its text says what it does ("Versturen"), also on its own. button.css gives it its look. */
export const Button = ({ type, ...props }: ButtonProps) => <button type={type} {...props} />

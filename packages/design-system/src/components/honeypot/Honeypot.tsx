import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'

export type HoneypotProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  /** The text of the label, for a tool that does show the field. */
  label?: string
  /** The name of the field in the form. The site rejects a form in which this field is not empty. */
  name: string
}

/**
 * A trap for spam robots: a text field that nobody can see, reach with the keyboard or hear from a screen reader. A robot
 * that fills in every field fills in this one too, and the site then knows the form did not come from a person.
 *
 * It is hidden from the eye with `hf-visually-hidden` and not with `display: none`, which robots recognise. It is
 * hidden from the keyboard and the screen reader with `inert`, and with `aria-hidden` and `tabIndex={-1}` for a browser
 * that does not know `inert`. `autoComplete="off"` keeps a browser or a password manager from filling it in for a
 * person.
 */
export const Honeypot = ({ className, label = 'Laat dit veld leeg', name, ...props }: HoneypotProps) => (
  <div aria-hidden="true" className={classNames('hf-visually-hidden', className)} inert {...props}>
    <label>
      {label}
      <input autoComplete="off" name={name} tabIndex={-1} type="text" />
    </label>
  </div>
)

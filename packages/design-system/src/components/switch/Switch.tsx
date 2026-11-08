import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'

export type SwitchProps = Omit<ComponentPropsWithoutRef<'input'>, 'children' | 'role' | 'type'> & {
  /** What the switch controls, said as a state that is on: "Ververs automatisch". */
  label: string
}

/**
 * A switch that turns one thing on or off at once, such as "Ververs automatisch": a checkbox
 * with the role `switch`, and a label next to it that is part of the click target. A screen
 * reader says "aan" or "uit". Use it for a choice that takes effect when it is made; use a
 * checkbox in a form for a choice that is sent. It has no state of its own: the page keeps
 * `checked`.
 */
export const Switch = ({ className, label, ...props }: SwitchProps) => (
  <label className={classNames('hf-switch', className)}>
    <input {...props} role="switch" type="checkbox" />
    <span>{label}</span>
  </label>
)

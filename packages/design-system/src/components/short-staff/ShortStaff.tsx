import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import { classNames } from '../classNames'

export type ShortStaffProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  /** A short staff line has no children: everything it shows comes from the props below. */
  children?: never
  /** Whether the person stood in. The line then says "(interim)" behind the name. */
  interim?: boolean
  /** The name of the person, as text or as a link. */
  name: ReactNode
  /**
   * What part of the season the person had the job, as a visitor reads it, such as `hele
   * seizoen`, `tot 14 mrt 2026` or `vanaf 1 sep 2025`. The component writes it as given.
   */
  period: string
}

/**
 * A person of the staff as a short line in a list: when they had the job, and their name, as in
 * "tot 14 mrt 2026 Robin Veldman". It is the short line of ShortMatch for a person, and it has
 * the look of it: short-match.css draws the lines, the wrapping and the colours, and
 * short-staff.css only makes room for the longer text before the name.
 */
export const ShortStaff = ({ className, interim = false, name, period, ...props }: ShortStaffProps) => (
  <div {...props} className={classNames('hf-short-match', 'hf-short-staff', className)}>
    <span className="hf-short-match-when">{period}</span>
    <span className="hf-short-match-opponent">
      {name}
      {interim ? ' (interim)' : ''}
    </span>
  </div>
)

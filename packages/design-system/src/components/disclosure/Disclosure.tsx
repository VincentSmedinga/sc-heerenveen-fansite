import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import { classNames } from '../classNames'
import { Icon } from '../icon/Icon'

export type DisclosureProps = Omit<ComponentPropsWithoutRef<'details'>, 'children'> & {
  /** What is behind the summary. */
  children: ReactNode
  /**
   * The line that opens and closes the block. It says what is behind it, such as "Invoer
   * weghalen".
   */
  summary: ReactNode
  /**
   * What is chosen or set inside, shown on the right of the summary, such as `Ajax`. A screen
   * reader hears it after the summary: "Tegenstander, Ajax". Leave it out when nothing is.
   */
  value?: ReactNode
}

/**
 * A block that opens and closes: a `details` with a summary. It works without JavaScript, and
 * the browser makes it reachable with the keyboard (Enter and Space) and announces whether it
 * is open. disclosure.css gives it its look: the summary is a target of at least 44 pixels
 * high, with the arrow of the other folds that points down while it is closed and up when it
 * is open. Put a heading in the block only when the block holds a section of its own.
 */
export const Disclosure = ({ children, className, summary, value, ...props }: DisclosureProps) => (
  <details className={classNames('hf-disclosure', className)} {...props}>
    <summary>
      {summary}
      {value !== undefined && value !== '' && (
        <span className="hf-disclosure-value">
          <span className="hf-visually-hidden">, </span>
          {value}
        </span>
      )}
      <Icon name="arrow-down" />
    </summary>
    <div className="hf-disclosure-content">{children}</div>
  </details>
)

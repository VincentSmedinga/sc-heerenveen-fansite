import type { ComponentPropsWithoutRef } from 'react'

export type TimeProps = ComponentPropsWithoutRef<'time'> & {
  /**
   * The date or time in a form a machine reads, such as `2026-10-24`. The text shows it the
   * Dutch way.
   */
  dateTime: string
}

/** A date or a time. It has no style of its own: it takes the style of the text around it. */
export const Time = (props: TimeProps) => <time {...props} />

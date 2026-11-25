import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'

export type WinnerProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  /**
   * The average grade, written the Dutch way, such as `7,8`. It is text, and a screen reader
   * reads "gemiddeld cijfer" before it.
   */
  average: string
  /**
   * A seal that stands out among the others: larger and with red points, for the one player who
   * is best of all, such as the "Uitblinker van de uitblinkers". The label has to say it too.
   */
  highlight?: boolean | undefined
  /** The red label above the name, such as "Uitblinker vorige wedstrijd", shown in capitals. */
  label: string
  /** One small line under the name, such as "Thuis tegen Testclub, 3–1". Without it, none. */
  line?: string | undefined
  /** The name, shown large. */
  name: string
}

/**
 * The seal for the player whom the supporters graded highest: a seal in two colours, blue
 * points round a disc with the average, and next to it a red label, the name and one small
 * line. With `highlight` the seal is larger and its points are red. Where the width is tight,
 * the text goes under the seal. The seal itself is decoration, drawn with CSS: the average is
 * text, and a screen reader reads it with "gemiddeld cijfer". winner.css gives it its look.
 */
export const Winner = ({ average, className, highlight, label, line, name, ...props }: WinnerProps) => (
  <div {...props} className={classNames('hf-winner', highlight && 'hf-winner-highlight', className)}>
    <div className="hf-winner-body">
      <span className="hf-winner-seal">
        <span className="hf-visually-hidden">Gemiddeld cijfer </span>
        <span className="hf-winner-average">{average}</span>
      </span>
      <span className="hf-winner-text">
        <span className="hf-winner-label">{label}</span>
        <span className="hf-winner-name">{name}</span>
        {line ? <span className="hf-meta hf-winner-line">{line}</span> : null}
      </span>
    </div>
  </div>
)

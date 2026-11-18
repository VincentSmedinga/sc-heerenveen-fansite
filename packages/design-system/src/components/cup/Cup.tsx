import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'

export type CupProps = Omit<ComponentPropsWithoutRef<'svg'>, 'aria-hidden' | 'children' | 'focusable' | 'viewBox'>

/**
 * A line drawing of a cup, upright, for a card that celebrates a won cup. It is decoration: it
 * is hidden from a screen reader, so the text next to it says what it stands for. The lines
 * take the colour of the text around them.
 */
export const Cup = ({ className, ...props }: CupProps) => (
  <svg
    {...props}
    aria-hidden="true"
    className={classNames('hf-cup', className)}
    fill="none"
    focusable="false"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={3}
    viewBox="0 0 96 192"
  >
    <circle cx={48} cy={13} r={5} />
    <path d="M28 38C28 26 38 21 48 21C58 21 68 26 68 38Z" />
    <path d="M24 38H72" />
    <path d="M28 44C28 88 36 104 48 110C60 104 68 88 68 44" />
    <path d="M28 56C10 56 10 86 33 90" />
    <path d="M68 56C86 56 86 86 63 90" />
    <path d="M44 110V150M52 110V150" />
    <path d="M38 128H58" />
    <path d="M32 150H64L70 160H26Z" />
    <path d="M20 160H76V172H20Z" />
    <path d="M14 172H82V184H14Z" />
  </svg>
)

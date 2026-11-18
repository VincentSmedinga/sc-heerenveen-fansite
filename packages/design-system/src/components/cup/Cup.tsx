import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'

export type CupProps = Omit<ComponentPropsWithoutRef<'svg'>, 'aria-hidden' | 'children' | 'focusable' | 'viewBox'>

/**
 * A line drawing of the Denneappel, the cup of the KNVB Beker, upright: a round urn with a lid
 * that ends in a pine cone, a belt with a plate for the names, and a foot on a stepped base. It
 * is for a card that celebrates a won cup. It is decoration: it is hidden from a screen reader,
 * so the text next to it says what it stands for. The lines take the colour of the text around
 * it.
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
    <ellipse cx={48} cy={18} rx={7} ry={11} />
    <path d="M42 14L54 22M42 22L54 14M44 29H52" />
    <path d="M30 56C30 40 38 32 48 32C58 32 66 40 66 56" />
    <path d="M26 56H70M28 60H68" />
    <path d="M22 62C20 70 20 74 22 80H74C76 74 76 70 74 62Z" />
    <rect height={10} rx={2} width={28} x={34} y={66} />
    <path d="M22 66C10 66 10 80 20 84M74 66C86 66 86 80 76 84" />
    <path d="M22 80C16 108 28 134 42 144H54C68 134 80 108 74 80" />
    <path d="M36 84C32 108 38 128 44 142M48 84V142M60 84C64 108 58 128 52 142" />
    <path d="M42 144L40 152H56L54 144" />
    <path d="M34 152H62V158H34Z" />
    <path d="M26 158H70V170H26Z" />
    <path d="M20 170H76V182H20Z" />
  </svg>
)

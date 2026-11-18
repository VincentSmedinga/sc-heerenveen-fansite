import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'

export type CupProps = Omit<ComponentPropsWithoutRef<'svg'>, 'aria-hidden' | 'children' | 'focusable' | 'viewBox'>

/**
 * A line drawing of the Denneappel, the cup of the KNVB Beker, upright: a round urn with a lid
 * that ends in a pine cone, a broad belt with a plate for the names, ribs on the belly, and a
 * narrow foot on a disc. It
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
    <g transform="translate(0 22)">
      <ellipse cx={48} cy={16} rx={8} ry={12} />
      <path d="M41 11L55 25M41 19L52 28M55 11L41 25M55 19L44 28" />
      <path d="M42 28H54L56 33H40Z" />
      <path d="M36 33C28 38 26 46 26 54M60 33C68 38 70 46 70 54" />
      <path d="M30 45C40 42 56 42 66 45" />
      <path d="M22 54H74V58H22Z" />
      <path d="M24 58C10 72 10 100 26 118M72 58C86 72 86 100 70 118" />
      <path d="M17 77C40 83 56 83 79 77M15 93C40 99 56 99 81 93" />
      <rect height={10} rx={2} width={30} x={33} y={81} />
      <path d="M26 100C28 108 34 114 40 118M38 98C38 106 42 114 44 121M48 99V122M58 98C58 106 54 114 52 121M70 100C68 108 62 114 56 118" />
      <path d="M26 118C36 124 60 124 70 118" />
      <path d="M42 122L44 130H52L54 122" />
      <path d="M44 130L38 142H58L52 130" />
      <path d="M24 142H72L76 150H20Z" />
    </g>
  </svg>
)

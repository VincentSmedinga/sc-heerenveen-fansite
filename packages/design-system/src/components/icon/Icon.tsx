import type { ReactNode } from 'react'

/** The icons of the design system, by name. */
export const iconNames = ['arrow-left', 'arrow-right', 'envelope', 'external-link', 'moon', 'plus', 'sun'] as const

/** The icons that have two drawings, a line and a filled one. */
export const filledIconNames = ['moon', 'sun'] as const

/** The two drawings of an icon: only the line, or filled. */
export const iconAppearances = ['line', 'filled'] as const

export type FilledIconName = (typeof filledIconNames)[number]

export type IconAppearance = (typeof iconAppearances)[number]

export type IconName = (typeof iconNames)[number]

export type IconProps =
  | {
      /**
       * `line` (default) is only the line, `filled` fills the shape. The filled one has the
       * colour of the text as well.
       */
      appearance?: IconAppearance
      /** The icon that has a filled drawing as well: `appearance` chooses between them. */
      name: FilledIconName
    }
  | {
      appearance?: 'line'
      name: Exclude<IconName, FilledIconName>
    }

// The drawings share one style: a line of the same width with round ends and round corners, no
// fill, and nothing that reaches the edge of the square they are drawn in. The filled drawing
// of the sun and the moon is the same paths with a fill. The rays of the sun are lines without
// an area, so the fill only shows in the disc and the crescent.
const drawings: Record<IconName, ReactNode> = {
  'arrow-left': (
    <>
      <path d="M13.5 8h-11" />
      <path d="M7 3.5 2.5 8 7 12.5" />
    </>
  ),
  'arrow-right': (
    <>
      <path d="M2.5 8h11" />
      <path d="M9 3.5 13.5 8 9 12.5" />
    </>
  ),
  envelope: (
    <>
      <path d="M3.5 3.5h9a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 11V5a1.5 1.5 0 0 1 1.5-1.5Z" />
      <path d="m2.5 5 5.5 4 5.5-4" />
    </>
  ),
  'external-link': (
    <>
      <path d="M9.5 2.5h4v4" />
      <path d="M13.5 2.5 7.5 8.5" />
      <path d="M11.5 9.5v3a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3" />
    </>
  ),
  moon: <path d="M13.5 9.5a5.5 5.5 0 0 1-7-7 5.5 5.5 0 1 0 7 7Z" />,
  plus: (
    <>
      <path d="M8 2.5v11" />
      <path d="M2.5 8h11" />
    </>
  ),
  sun: (
    <>
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1.5v1" />
      <path d="M8 13.5v1" />
      <path d="M1.5 8h1" />
      <path d="M13.5 8h1" />
      <path d="m3.4 3.4.7.7" />
      <path d="m11.9 11.9.7.7" />
      <path d="m12.6 3.4-.7.7" />
      <path d="m4.1 11.9-.7.7" />
    </>
  ),
}

/**
 * A small icon, drawn here as an SVG: nothing loads from elsewhere, and it takes the colour of
 * the text around it, also under the mouse, with the focus and in forced colours. A link or a
 * button is named by its own text alone, so the icon is hidden from assistive technology and is
 * never the only sign of something. The size, the space beside it and its place in the line are
 * in icon.css. It is not exported from the package: Link, Button, SegmentedControl, NewsItem
 * and Navigation draw it for the visitor.
 */
export const Icon = ({ appearance = 'line', name }: IconProps) => (
  <svg
    aria-hidden="true"
    className="hf-icon"
    fill={appearance === 'filled' ? 'currentColor' : 'none'}
    focusable="false"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="1.5"
    viewBox="0 0 16 16"
  >
    {drawings[name]}
  </svg>
)

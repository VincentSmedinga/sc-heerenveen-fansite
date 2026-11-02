import type { ReactNode } from 'react'

/** The icons of the design system, by name. */
export const iconNames = [
  'arrow-down',
  'arrow-left',
  'arrow-right',
  'arrow-up',
  'ball',
  'camera',
  'chart',
  'document',
  'envelope',
  'external-link',
  'link',
  'moon',
  'plus',
  'save',
  'speech',
  'sun',
  'trash',
] as const

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
  'arrow-down': (
    <>
      <path d="M8 2.5v11" />
      <path d="M3.5 9 8 13.5 12.5 9" />
    </>
  ),
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
  'arrow-up': (
    <>
      <path d="M8 13.5v-11" />
      <path d="M3.5 7 8 2.5 12.5 7" />
    </>
  ),
  // A football from the front: the ball, the pentagon in the middle and a line from each corner
  // of it to the edge.
  ball: (
    <>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 6l1.9 1.38-.73 2.24H6.83L6.1 7.38Z" />
      <path d="M8 6V2.5" />
      <path d="M9.9 7.38l3.33-1.08" />
      <path d="M9.17 9.62l2.06 2.83" />
      <path d="M6.83 9.62l-2.06 2.83" />
      <path d="M6.1 7.38 2.77 6.3" />
    </>
  ),
  // A camera from the front: the body with the bump of the viewfinder on top, and the lens.
  camera: (
    <>
      <path d="M3.5 4.5h2l1-2h3l1 2h2A1.5 1.5 0 0 1 14 6v6a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 12V6a1.5 1.5 0 0 1 1.5-1.5Z" />
      <circle cx="8" cy="9" r="2.25" />
    </>
  ),
  // Three bars on the corner of two axes: a chart of numbers, such as the visit.
  chart: (
    <>
      <path d="M2.5 2.5v11h11" />
      <path d="M6 11V8" />
      <path d="M8.75 11V5.5" />
      <path d="M11.5 11V7" />
    </>
  ),
  // A page with a folded corner and two lines of text: an article.
  document: (
    <>
      <path d="M4 2.5h5.5l3 3V13a.5.5 0 0 1-.5.5H4a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5Z" />
      <path d="M9.5 2.5v3h3" />
      <path d="M5.5 8.5h5" />
      <path d="M5.5 11h5" />
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
  // Two links of a chain on the diagonal, from the bottom left to the top right, joined by a
  // short bar through the middle.
  link: (
    <>
      <path d="M6.5 9.5 9.5 6.5" />
      <path d="M7.4 5.1 8.2 4.3a2.75 2.75 0 0 1 3.9 3.9l-1.6 1.6" />
      <path d="M8.6 10.9 7.8 11.7a2.75 2.75 0 0 1-3.9-3.9l1.6-1.6" />
    </>
  ),
  moon: <path d="M13.5 9.5a5.5 5.5 0 0 1-7-7 5.5 5.5 0 1 0 7 7Z" />,
  plus: (
    <>
      <path d="M8 2.5v11" />
      <path d="M2.5 8h11" />
    </>
  ),
  // A floppy disk, as everyone knows it: the body with a cut corner, the label slot on top and
  // the label at the bottom.
  save: (
    <>
      <path d="M3.5 2.5h7l3 3v7a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z" />
      <path d="M5.5 2.5v3h4.5v-3" />
      <path d="M5 13.5v-4h6v4" />
    </>
  ),
  // A speech bubble with a tail at the bottom left and two lines in it: a message.
  speech: (
    <>
      <path d="M3.5 2.5h9A1.5 1.5 0 0 1 14 4v5.5a1.5 1.5 0 0 1-1.5 1.5H8l-3 2.5V11H3.5A1.5 1.5 0 0 1 2 9.5V4a1.5 1.5 0 0 1 1.5-1.5Z" />
      <path d="M5 5.5h6" />
      <path d="M5 8h3.5" />
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
  // A bin: the lid with its handle, the bin that narrows at the bottom, and two lines in it.
  trash: (
    <>
      <path d="M2.5 4.5h11" />
      <path d="M6 4.5V3a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5v1.5" />
      <path d="m4 4.5.6 8.2a1 1 0 0 0 1 .8h4.8a1 1 0 0 0 1-.8l.6-8.2" />
      <path d="M6.75 7v4" />
      <path d="M9.25 7v4" />
    </>
  ),
}

/**
 * A small icon, drawn here as an SVG: nothing loads from elsewhere, and it takes the colour of
 * the text around it, also under the mouse, with the focus and in forced colours. A link or a
 * button is named by its own text alone, so the icon is hidden from assistive technology and is
 * never the only sign of something. The size, the space beside it and its place in the line are
 * in icon.css. It is not exported from the package: Link, Button, IconButton, SegmentedControl,
 * NewsItem, Navigation, a Heading with an anchor, the button for an image of a Card,
 * Page.TopLink, Tile and WikipediaCredit draw it for the visitor. ThemeButton draws
 * its own sun and moon, because they turn into each other.
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

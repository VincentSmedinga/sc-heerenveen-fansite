import { type ReactNode, useId } from 'react'

import { classNames } from '../classNames'
import { pompebledPath, pompebledRotation } from '../logo/Pompebled'

/**
 * The icons of the columns of the tables, one for each column of `tableColumns`. The key of a
 * column in `tableColumns` is also the name of its icon.
 */
export const tableColumnIconNames = [
  'assists',
  'cleanSheets',
  'conceded',
  'drawn',
  'goalDifference',
  'goals',
  'goalsPerMatch',
  'hattricks',
  'lost',
  'minutes',
  'penalties',
  'played',
  'points',
  'pointsPerMatch',
  'red',
  'seasons',
  'started',
  'substituted',
  'substitutedOff',
  'won',
  'yellow',
] as const

export type TableColumnIconName = (typeof tableColumnIconNames)[number]

export type TableColumnIconProps = {
  /** Which icon. */
  name: TableColumnIconName
}

const p = 'hf-table-icon'

// The pentagons and the seams of the ball, worked out once: a large pentagon a little off the
// centre, and a line from each corner to a pentagon at the rim. A clip keeps them in the ball.
const ballPatches =
  'M8.50 5.30L12.11 7.93L10.73 12.17L6.27 12.17L4.89 7.93ZM8.50 3.70L4.89 1.07L6.27 -3.17L10.73 -3.17L12.11 1.07ZM13.64 7.43L15.02 3.18L19.48 3.18L20.86 7.43L17.25 10.06ZM11.67 13.47L16.14 13.47L17.52 17.72L13.91 20.34L10.29 17.72ZM5.33 13.47L6.71 17.72L3.09 20.34L-0.52 17.72L0.86 13.47ZM3.36 7.43L-0.25 10.06L-3.86 7.43L-2.48 3.18L1.98 3.18Z'
const ballSeams =
  'M8.50 5.30L8.50 3.70M12.11 7.93L13.64 7.43M10.73 12.17L11.67 13.47M6.27 12.17L5.33 13.47M4.89 7.93L3.36 7.43M12.11 1.07L15.02 3.18M17.25 10.06L16.14 13.47M10.29 17.72L6.71 17.72M0.86 13.47L-0.25 10.06M1.98 3.18L4.89 1.07'

/**
 * A ball, with a clip of its own: two balls in one table would otherwise share an id, and a
 * hidden one would break the clip of the other. A small one (the hat-trick) is drawn from the
 * same ball, scaled, without the seams, and with a thicker rim so it keeps its weight.
 */
const Ball = ({
  cx = 8,
  cy = 8,
  detail = true,
  r = 7.4,
}: {
  cx?: number
  cy?: number
  detail?: boolean
  r?: number
}) => {
  const clip = useId()
  const scale = r / 7.4
  const body = (
    <>
      <clipPath id={clip}>
        <circle cx="8" cy="8" r="7.4" />
      </clipPath>
      <circle className={`${p}-surface`} cx="8" cy="8" r="7.4" />
      <g clipPath={`url(#${clip})`}>
        <path className={`${p}-fill`} d={ballPatches} />
        {detail && <path className={`${p}-seam`} d={ballSeams} />}
      </g>
      <circle className={`${p}-ball-rim`} cx="8" cy="8" r="7.4" style={{ strokeWidth: 1.2 / scale }} />
    </>
  )

  return scale === 1 ? (
    body
  ) : (
    <g
      transform={`translate(${(cx - 8 * scale).toFixed(2)} ${(cy - 8 * scale).toFixed(2)}) scale(${scale.toFixed(3)})`}
    >
      {body}
    </g>
  )
}

// The upright pitch of the played matches: thin lines, a box at each end, no centre circle.
const Pitch = () => (
  <>
    <rect className={`${p}-line`} height="13.6" rx="1.5" width="10.8" x="2.6" y="1.2" />
    <path className={`${p}-line`} d="M2.6 8h10.8M5.6 1.2v2.4h4.8V1.2M5.6 14.8v-2.4h4.8v2.4" />
  </>
)

const signs = {
  check: 'M9 11.4l1.8 1.8 3.4-3.7',
  cross: 'M9.7 9.7l3.3 3.3m0-3.3l-3.3 3.3',
  equals: 'M9.1 10.2h4.6M9.1 12.6h4.6',
  minus: 'M9 11.4h4.8',
  plusMinus: 'M11.4 8.5v3.3M9.8 10.15h3.2M9.8 13.7h3.2',
} as const

// Under an overlay (a badge, the small pitch of "per match") the drawing is cut away with a
// mask, so the overlay has a border that is transparent and the icon stands on any background.
const Cut = ({ children, hole }: { children: ReactNode; hole: ReactNode }) => {
  const mask = useId()

  return (
    <>
      <mask height="20" id={mask} maskUnits="userSpaceOnUse" width="20" x="-2" y="-2">
        <rect fill="#fff" height="20" width="20" x="-2" y="-2" />
        {hole}
      </mask>
      <g mask={`url(#${mask})`}>{children}</g>
    </>
  )
}

// A large badge with a sign: the result or the sign of the figure, over a drawing that is cut
// away round it. The sign repeats the colour.
const Badged = ({
  children,
  colour,
  sign,
}: {
  children: ReactNode
  colour: 'draw' | 'loss' | 'win'
  sign: keyof typeof signs
}) => (
  <>
    <Cut hole={<circle cx="11.4" cy="11.4" fill="#000" r="6.2" />}>{children}</Cut>
    <circle className={`${p}-${colour} ${p}-badge`} cx="11.4" cy="11.4" r="4.8" />
    <path className={`${p}-sign`} d={signs[sign]} />
  </>
)

// A small pitch at the bottom right: "per match". It has a box at each end like the big pitch,
// in thinner lines, and the drawing under it is cut away round it.
const PerMatchOver = ({ children }: { children: ReactNode }) => (
  <>
    <Cut hole={<rect fill="#000" height="8.2" rx="1.1" stroke="#000" strokeWidth="3.6" width="6" x="9.2" y="7.4" />}>
      {children}
    </Cut>
    <rect className={`${p}-line ${p}-small-line`} height="8.2" rx="1.1" width="6" x="9.2" y="7.4" />
    <path className={`${p}-line ${p}-small-line`} d="M9.2 11.5h6M11 7.4v1.3h2.4V7.4M11 15.6v-1.3h2.4v1.3" />
  </>
)

const Tally = () => (
  <path className={`${p}-line`} d="M3.4 2.6v10.8M6.5 2.6v10.8M9.6 2.6v10.8M12.7 2.6v10.8M1.6 11.6l13-7" />
)

// A goal with a net, in thin lines at half the opacity; the figure under it says what it is.
const Goal = () => (
  <>
    <path className={`${p}-net`} d="M5.5 2.5V9M8 2.5V9M10.5 2.5V9M2.5 5.5h11" />
    <path className={`${p}-line`} d="M2.5 9V2.5h11V9" />
  </>
)

const shirtPath =
  'M5.2 1.6L.9 3.9l1.8 3.6 1.5-.7V14.4h7.6V6.8l1.5.7 1.8-3.6-4.3-2.3C10.4 2.9 9.4 3.7 8 3.7S5.6 2.9 5.2 1.6z'

// The shirt of the starting line-up: three white and two blue stripes across the whole shirt,
// clipped to its shape, and two pompeblêden of the logo, one above the other in the middle
// stripe. The rim in the colour of the text gives the shape its 3:1.
const Shirt = () => {
  const clip = useId()
  const width = 14.2 / 5

  return (
    <>
      <clipPath id={clip}>
        <path d={shirtPath} />
      </clipPath>
      <g clipPath={`url(#${clip})`}>
        {[0, 1, 2, 3, 4].map((i) => (
          <rect
            className={`${p}-stripe-${i % 2 === 0 ? 'white' : 'blue'}`}
            height="14"
            key={i}
            width={width + 0.02}
            x={(0.9 + i * width).toFixed(2)}
            y="1"
          />
        ))}
      </g>
      {[7.6, 11.7].map((y) => (
        <path
          className={`${p}-pompebled`}
          d={pompebledPath}
          key={y}
          transform={`translate(7.8 ${y}) scale(0.09) rotate(${pompebledRotation})`}
        />
      ))}
      <path className={`${p}-rim ${p}-shirt-rim`} d={shirtPath} />
    </>
  )
}

const arrow = (colour: 'loss' | 'win', d: string) => <path className={`${p}-arrow ${p}-${colour}-line`} d={d} />

const drawings: Record<TableColumnIconName, () => ReactNode> = {
  assists: () => (
    <>
      <path className={`${p}-boot ${p}-rim`} d="M2.4 4.6h4.4v2.4c2.4.3 4.9 1.2 6.4 2.3 1 .7 1.4 1.7 1.4 2.9H2.4z" />
      <path className={`${p}-line`} d="M4 12.9v1.1M7.2 12.9v1.1M10.4 12.9v1.1M13.3 12.9v1" />
    </>
  ),
  cleanSheets: () => (
    <>
      <Goal />
      <ellipse className={`${p}-line`} cx="8" cy="12.9" rx="1.5" ry="2.1" />
    </>
  ),
  conceded: () => (
    <Badged colour="loss" sign="minus">
      <Ball />
    </Badged>
  ),
  drawn: () => (
    <Badged colour="draw" sign="equals">
      <Pitch />
    </Badged>
  ),
  goalDifference: () => (
    <Badged colour="draw" sign="plusMinus">
      <Ball />
    </Badged>
  ),
  goals: () => <Ball />,
  goalsPerMatch: () => (
    <PerMatchOver>
      <Ball />
    </PerMatchOver>
  ),
  hattricks: () => (
    <>
      <Ball cx={4.6} cy={4.9} detail={false} r={3.4} />
      <Ball cx={11.4} cy={4.9} detail={false} r={3.4} />
      <Ball cx={8} cy={11.2} detail={false} r={3.4} />
    </>
  ),
  lost: () => (
    <Badged colour="loss" sign="cross">
      <Pitch />
    </Badged>
  ),
  minutes: () => (
    <>
      <circle className={`${p}-line`} cx="8" cy="9" r="5.8" />
      <path className={`${p}-line`} d="M8 5.6V9l2.3 1.4M6.4 1.2h3.2M8 1.4v1.8" />
    </>
  ),
  penalties: () => (
    <>
      <Goal />
      <circle className={`${p}-fill`} cx="8" cy="13.2" r="1.6" />
    </>
  ),
  played: () => <Pitch />,
  points: () => <Tally />,
  pointsPerMatch: () => (
    <PerMatchOver>
      <Tally />
    </PerMatchOver>
  ),
  red: () => <rect className={`${p}-card ${p}-red`} height="13" rx="1.5" width="9" x="3.5" y="1.5" />,
  seasons: () => (
    <>
      <rect className={`${p}-line`} height="11.2" rx="1.6" width="12.4" x="1.8" y="3" />
      <path className={`${p}-line`} d="M1.8 6.6h12.4M5.2 1.4v3M10.8 1.4v3" />
      <path className={`${p}-fill`} d="M4.3 9h1.8v1.8H4.3zM7.1 9h1.8v1.8H7.1zM9.9 9h1.8v1.8H9.9z" />
    </>
  ),
  started: () => <Shirt />,
  substituted: () => arrow('win', 'M8 13V3.5M4 7.5l4-4 4 4'),
  substitutedOff: () => arrow('loss', 'M8 3v9.5M4 8.5l4 4 4-4'),
  won: () => (
    <Badged colour="win" sign="check">
      <Pitch />
    </Badged>
  ),
  yellow: () => <rect className={`${p}-card ${p}-yellow`} height="13" rx="1.5" width="9" x="3.5" y="1.5" />,
}

/**
 * The icon of a column of a table, such as a plain ball for the goals. It is a
 * drawing in a square of 16 by 16, as large as the text beside it (in `em`) and turned 8
 * degrees like `MatchEventIcon`. The colours come from tokens and follow the theme, and colour
 * always repeats a shape (a check, a cross, a minus), so it is never alone. The icon
 * has no word: it is hidden from assistive technology, and the header or the legend that holds
 * it writes the whole word.
 */
export const TableColumnIcon = ({ name }: TableColumnIconProps) => (
  <svg aria-hidden="true" className={classNames(p)} focusable="false" viewBox="0 0 16 16">
    {drawings[name]()}
  </svg>
)

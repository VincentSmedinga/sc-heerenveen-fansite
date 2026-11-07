import type { ReactNode } from 'react'

import { classNames } from '../classNames'

/**
 * The kinds of event in a match that have an icon. `penalty-missed` is for a penalty that was
 * missed and for one that was saved: the icon shows only that the kick did not score.
 */
export const matchEventIconKinds = [
  'goal',
  'own-goal',
  'yellow-card',
  'red-card',
  'yellow-red-card',
  'substitution',
  'in',
  'out',
  'penalty-missed',
] as const

/** The two sizes: next to regular text, and larger for the kicks of a penalty shoot-out. */
export const matchEventIconSizes = ['text', 'large'] as const

export type MatchEventIconKind = (typeof matchEventIconKinds)[number]

export type MatchEventIconProps = {
  /** The kind of event. */
  kind: MatchEventIconKind
  /**
   * A name for the icon, such as "Gele kaart". Leave it out where the page puts the word beside
   * the icon: the icon is then hidden from assistive technology. Give it where no text stands
   * beside the icon, so it is named instead of silent.
   */
  label?: string | undefined
  /** `text` (default) is the size next to regular text, `large` is larger. */
  size?: MatchEventIconSize | undefined
}

export type MatchEventIconSize = (typeof matchEventIconSizes)[number]

// A football: the ball, the pentagon in the middle and a line from each corner to the edge.
const ball = (own: boolean) => (
  <>
    <circle
      className={classNames('hf-match-event-icon-ball', own && 'hf-match-event-icon-own')}
      cx="8"
      cy="8"
      r="7.4"
    />
    <path className="hf-match-event-icon-patch" d="M8 5.2l2.6 1.9-1 3.1H6.4l-1-3.1z" />
    <path
      className="hf-match-event-icon-seams"
      d="M8 5.2V1.8M10.6 7.1l3.2-1M9.6 10.2l1.9 2.7M6.4 10.2l-1.9 2.7M5.4 7.1l-3.2-1"
    />
  </>
)

const card = (colour: 'red' | 'yellow') => (
  <rect
    className={`hf-match-event-icon-card hf-match-event-icon-${colour}`}
    height="13"
    rx="1.5"
    width="9"
    x="3.5"
    y="1.5"
  />
)

// All the drawings sit in a square of 16 by 16, upright: match-event-icon.css turns them.
// The colours come from classes, so the tokens and the theme decide them, not the code.
const drawings: Record<MatchEventIconKind, ReactNode> = {
  goal: ball(false),
  in: <path className="hf-match-event-icon-arrow-in" d="M8 13V3.5M4 7.5l4-4 4 4" />,
  out: <path className="hf-match-event-icon-arrow-out" d="M8 3v9.5M4 8.5l4 4 4-4" />,
  // The same ball in the colour of a loss: a goal against your own team.
  'own-goal': ball(true),
  // A ring with a cross through it: a kick that did not score.
  'penalty-missed': (
    <>
      <circle className="hf-match-event-icon-ring" cx="8" cy="8" r="6" />
      <path className="hf-match-event-icon-cross" d="M5.6 5.6l4.8 4.8m0-4.8l-4.8 4.8" />
    </>
  ),
  'red-card': card('red'),
  // Two arrows in one icon: the player who comes on goes up, the one who goes off goes down.
  substitution: (
    <>
      <path className="hf-match-event-icon-arrow-in" d="M5 14V3.5M2.2 6.3L5 3.5l2.8 2.8" />
      <path className="hf-match-event-icon-arrow-out" d="M11 2v10.5m-2.8-2.8L11 12.5l2.8-2.8" />
    </>
  ),
  'yellow-card': card('yellow'),
  // A yellow and a red card, half over each other: the red lies on the yellow.
  'yellow-red-card': (
    <>
      <rect
        className="hf-match-event-icon-card hf-match-event-icon-yellow"
        height="11"
        rx="1.5"
        width="8"
        x="2"
        y="1.5"
      />
      <rect
        className="hf-match-event-icon-card hf-match-event-icon-red"
        height="11"
        rx="1.5"
        width="8"
        x="6.5"
        y="3.5"
      />
    </>
  ),
}

/**
 * The icon of an event in a match: a goal, an own goal, a yellow, red or yellow-red card, a
 * substitution (or only the player who comes on or goes off), and a penalty that was missed or
 * saved. Every kind has a shape of its own, so colour is never the only difference; the
 * colours come from tokens and keep their contrast in light and dark. The icon does not carry
 * the word of the event: the page writes "Gele kaart" beside it, so the icon is hidden from
 * assistive technology. Give it a `label` where no text stands beside it, and it becomes an
 * image with that name. All the icons are turned 12 degrees clockwise, as the design has them.
 */
export const MatchEventIcon = ({ kind, label, size = 'text' }: MatchEventIconProps) => (
  <svg
    aria-hidden={label === undefined ? 'true' : undefined}
    aria-label={label}
    className={classNames('hf-match-event-icon', size === 'large' && 'hf-match-event-icon-large')}
    focusable="false"
    role={label === undefined ? undefined : 'img'}
    viewBox="0 0 16 16"
  >
    {drawings[kind]}
  </svg>
)

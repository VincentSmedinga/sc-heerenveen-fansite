import type { CSSProperties, ReactNode } from 'react'

import { classNames } from '../classNames'

export type PlayerDiscProps = {
  /** The arc of the ring in degrees: where it starts and how far it runs (`pitchRingArc`). */
  arc: { length: number; start: number }
  /** What sits on the corners of the disc, such as the marks of a player on the pitch. */
  children?: ReactNode
  /** Whether he plays for sc Heerenveen: the disc is filled for them, open for the others. */
  ours: boolean
  shirtNumber: number
}

/**
 * The disc of a player: a round face with the shirt number and a ring round it for the
 * minutes he played, with a gap between the two. The pitch (`PitchPlayer`) and the list of
 * substitutes (`MatchSubstitutes`) both draw it, so the ring means the same in both. It is
 * drawing only, and the component that uses it hides it from a screen reader.
 * pitch-player.css gives it its look.
 */
export const PlayerDisc = ({ arc, children, ours, shirtNumber }: PlayerDiscProps) => (
  <span
    className={classNames('hf-pitch-player-disc', ours ? 'hf-pitch-player-disc-ours' : 'hf-pitch-player-disc-theirs')}
  >
    <span
      className="hf-pitch-player-ring"
      style={{ '--hf-ring-length': `${arc.length}deg`, '--hf-ring-start': `${arc.start}deg` } as CSSProperties}
    />
    <span className="hf-pitch-player-number">{shirtNumber}</span>
    {children}
  </span>
)

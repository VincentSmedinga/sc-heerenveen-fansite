import type { CSSProperties, ReactNode } from 'react'

import { classNames } from '../classNames'
import { checkedClubColour, figureColourOn } from './club-colour'

export type PlayerDiscProps = {
  /** The arc of the ring in degrees: where it starts and how far it runs (`pitchRingArc`). */
  arc: { length: number; start: number }
  /** What sits on the corners of the disc, such as the marks of a player on the pitch. */
  children?: ReactNode
  /**
   * The colour of his club as `#rrggbb`, for a player who is not ours: the disc is then filled
   * with it, and the number is black or white. Anything else leaves the disc open.
   */
  colour?: string | undefined
  /** Whether he plays for sc Heerenveen: the disc is filled in our blue for them. */
  ours: boolean
  /** His shirt number, or empty for a player without one: the disc then has no figure. */
  shirtNumber: null | number
}

/**
 * The disc of a player: a round face with the shirt number and a ring round it for the
 * minutes he played, with a gap between the two. A player without a shirt number gets the same
 * disc with no figure in it. The pitch (`PitchPlayer`) and the list of
 * substitutes (`MatchSubstitutes`) both draw it, so the ring means the same in both. It is
 * drawing only, and the component that uses it hides it from a screen reader.
 * pitch-player.css gives it its look.
 */
export const PlayerDisc = ({ arc, children, colour, ours, shirtNumber }: PlayerDiscProps) => {
  const club = ours ? undefined : checkedClubColour(colour)

  return (
    <span
      className={classNames(
        'hf-pitch-player-disc',
        ours ? 'hf-pitch-player-disc-ours' : 'hf-pitch-player-disc-theirs',
        club !== undefined && 'hf-pitch-player-disc-club',
      )}
      style={
        club === undefined
          ? undefined
          : ({ '--hf-club-colour': club, '--hf-club-figure': figureColourOn(club) } as CSSProperties)
      }
    >
      <span
        className="hf-pitch-player-ring"
        style={{ '--hf-ring-length': `${arc.length}deg`, '--hf-ring-start': `${arc.start}deg` } as CSSProperties}
      />
      <span className="hf-pitch-player-number">{shirtNumber}</span>
      {children}
    </span>
  )
}

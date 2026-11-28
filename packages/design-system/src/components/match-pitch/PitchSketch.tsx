import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'
import { PitchLines } from './PitchLines'

export type PitchSketchLine = 'aanvaller' | 'keeper' | 'middenvelder' | 'verdediger'

/** A player in one of the places. */
export type PitchSketchPlayer = {
  /** The line he plays on. It puts his disc on the pitch and stands under his name. */
  line: PitchSketchLine
  /** The whole name, which a screen reader hears. */
  name: string
  /**
   * Text that says he does not count, such as "telt niet mee". His disc is then open with a
   * dashed rim, his name is struck through and this text stands in place of the line, so the
   * strike-through is not the only sign.
   */
  note?: string | undefined
  /** His shirt number, or `null` for a player without one: the disc then has no figure. */
  shirtNumber: null | number
  /** The name shown in the list, such as the surname. */
  shortName: string
}

export type PitchSketchProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  /** The name of the list of players, such as "Jouw vier". */
  label: string
  /** The places, in order. A place without a player is `null`. */
  places: readonly (null | PitchSketchPlayer)[]
}

/** How far along the half a line stands, in percent from our goal line. */
const alongHalf: Record<PitchSketchLine, number> = { aanvaller: 86, keeper: 10, middenvelder: 62, verdediger: 36 }

/** Where the players of one line stand across the pitch, in percent, in the order given. */
const across = (index: number, count: number) => {
  if (count === 2) {
    return index === 0 ? 30 : 70
  }

  return ((index * 2 + 1) * 50) / count
}

/**
 * The sentence a screen reader hears for a place, such as "Bram Visser, verdediger,
 * rugnummer 4" or "Plek 4, nog te kiezen". A player without a shirt number has no word about
 * the number, and the note of a player who does not count comes last.
 */
export function pitchSketchSentence(place: null | PitchSketchPlayer, number: number): string {
  if (place === null) {
    return `Plek ${number}, nog te kiezen`
  }

  return [place.name, place.line, place.shirtNumber === null ? undefined : `rugnummer ${place.shirtNumber}`, place.note]
    .filter((part) => part !== undefined && part !== '')
    .join(', ')
}

/**
 * The spot of each place on the half pitch, in percent: `x` from our goal line to the halfway
 * line and `y` across. One player on a line stands in the middle and two at 30% and 70%, in
 * the order of the places. A place without a player has no spot.
 */
export function pitchSketchSpots(places: readonly (null | Pick<PitchSketchPlayer, 'line'>)[]) {
  return places.map((place, index) => {
    if (place === null) {
      return null
    }

    const before = places.slice(0, index).filter((other) => other?.line === place.line).length
    const count = places.filter((other) => other?.line === place.line).length

    return { x: alongHalf[place.line], y: across(before, count) }
  })
}

/**
 * A few players on a small half pitch that lies down, with our goal on the left, and beside it
 * (or under it when the room is narrow) the same players as a numbered list in two columns. The
 * pitch has the grass and the lines of `MatchPitch`, at the same scale, and on it a disc with
 * the shirt number for each player, on his line. No names stand on the grass. The pitch is a
 * drawing, hidden from a screen reader; the list is the content, with one sentence for each
 * place (`pitchSketchSentence`). The component knows nothing of the rules of a game: it shows
 * the places it is given. pitch-sketch.css gives it its look.
 */
export const PitchSketch = ({ className, label, places, ...props }: PitchSketchProps) => {
  const spots = pitchSketchSpots(places)

  return (
    <div {...props} className={classNames('hf-pitch-sketch', className)}>
      <div className="hf-pitch-sketch-layout">
        <div aria-hidden="true" className="hf-match-pitch-field hf-pitch-sketch-field">
          <PitchLines ends={['first']} />
          {places.map((place, index) => {
            const spot = spots[index]

            return place === null || spot === null || spot === undefined ? null : (
              <span
                className={classNames('hf-pitch-sketch-disc', place.note ? 'hf-pitch-sketch-disc-struck' : undefined)}
                key={index}
                style={{ insetBlockStart: `${spot.y}%`, insetInlineStart: `${spot.x}%` }}
              >
                {place.shirtNumber}
              </span>
            )
          })}
        </div>
        <ol aria-label={label} className="hf-pitch-sketch-names" role="list">
          {places.map((place, index) => (
            <li key={index}>
              <span className="hf-visually-hidden">{pitchSketchSentence(place, index + 1)}</span>
              <span
                aria-hidden="true"
                className={classNames(
                  'hf-pitch-sketch-disc',
                  place === null && 'hf-pitch-sketch-disc-empty',
                  place?.note ? 'hf-pitch-sketch-disc-struck' : undefined,
                )}
              >
                {place?.shirtNumber}
              </span>
              <span aria-hidden="true" className="hf-pitch-sketch-text">
                {place === null ? (
                  <span className="hf-meta hf-pitch-sketch-line">nog te kiezen</span>
                ) : (
                  <>
                    <span className="hf-pitch-sketch-name" data-struck={place.note ? '' : undefined}>
                      {place.shortName}
                    </span>
                    <span className="hf-meta hf-pitch-sketch-line">{place.note || place.line}</span>
                  </>
                )}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

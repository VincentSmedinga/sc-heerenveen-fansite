/**
 * Where the players of a team stand on the pitch, worked out from the formation. The goalkeeper
 * comes first, then the rows of the formation, from the defence to the attack, and the players
 * of a row stand evenly spread. A spot is a place in percent of the pitch, for the upright
 * pitch (a phone) and for the pitch that lies down (from 40 rem). No position of a player is
 * stored: the formation and the order of the players are all there is.
 */

/** The most numbers a formation has, such as `4-1-2-1-2`, and the players it needs. */
const maxRows = 5
const fieldPlayers = 10
export const lineUpSize = fieldPlayers + 1

/** A place on the pitch in percent: `x` from the left and `y` from the top. */
export type PitchPoint = { x: number; y: number }

export type PitchSpot = {
  /** The place on the pitch that lies down, with sc Heerenveen on the left. */
  landscape: PitchPoint
  /**
   * The share of the width of the pitch that lies down which the name may use: the room
   * between two rows, because the rows stand side by side there.
   */
  landscapeShare: number
  /** The place on the upright pitch, with sc Heerenveen at the bottom. */
  portrait: PitchPoint
  /**
   * The share of the width of the upright pitch that the name may use: a little less than the
   * room of the player, so two names in a row never touch.
   */
  share: number
}

/**
 * The rows of a formation, such as `[4, 2, 3, 1]` for `4-2-3-1`, or `null` when the text is
 * not a formation we can draw: two to five numbers of 1 to 9 that add up to ten.
 */
export function parseFormation(formation: null | string | undefined): null | number[] {
  if (formation === null || formation === undefined) {
    return null
  }

  const parts = formation.trim().split('-')

  if (parts.length < 2 || parts.length > maxRows || parts.some((part) => !/^[1-9]$/u.test(part))) {
    return null
  }

  const rows = parts.map(Number)

  return rows.reduce((sum, row) => sum + row, 0) === fieldPlayers ? rows : null
}

/**
 * The distance of a row from the goal line of its team, as a share of the pitch's length. The
 * goalkeeper (row 0) and the rows of the formation are evenly spread over the half of the team,
 * so no row has less room for the names than another.
 */
const rowDepth = (index: number, rows: number) => 0.075 + (index * 0.365) / rows

/** The place of a player along the row, as a share of its width. */
const rowOffset = (position: number, size: number) =>
  size === 1 ? 0.5 : size >= 5 ? 0.06 + (0.88 * (position + 0.5)) / size : 0.1 + (0.8 * (position + 0.5)) / size

const percent = (share: number) => Math.round(share * 1000) / 10

/** Whether names no longer fit on a narrow pitch: five players in a row, or five rows. */
export const isCrowdedFormation = (rows: readonly number[]) => rows.length >= maxRows || Math.max(...rows) >= 5

/**
 * The spots of the eleven players of a team, in the order of the line-up: the goalkeeper, then
 * the rows of the formation. `null` when the formation can't be drawn or the team has not
 * eleven players in the line-up; the pitch then leaves the team out.
 *
 * With `half` the spots are those on a pitch of only the half of the team: the same players at
 * the same distance from each other, but in percent of the half, so the length (upright) or the
 * width (lying down) of the spots, and the room for a name between two rows, doubles.
 */
export function pitchSpots(
  formation: null | string | undefined,
  playerCount: number,
  ours: boolean,
  half = false,
): null | PitchSpot[] {
  const rows = parseFormation(formation)

  if (rows === null || playerCount !== lineUpSize) {
    return null
  }

  const lines = [1, ...rows]
  // The room between two rows, as a share of the length of the pitch.
  const rowGap = 0.365 / rows.length
  const spots: PitchSpot[] = []

  lines.forEach((size, index) => {
    const depth = rowDepth(index, rows.length)

    for (let position = 0; position < size; position++) {
      const offset = rowOffset(position, size)
      const length = half ? 2 : 1
      // On a half the rows run from the halfway line to the goal line, so twice as far.
      const toward = depth * length

      spots.push({
        landscape: ours
          ? { x: percent(toward), y: percent(1 - offset) }
          : { x: percent(1 - toward), y: percent(offset) },
        landscapeShare: percent(rowGap * 0.95 * length),
        portrait: ours
          ? { x: percent(offset), y: percent(1 - toward) }
          : { x: percent(1 - offset), y: percent(toward) },
        share: percent(((size >= 5 ? 0.88 : 0.8) / size) * 0.95),
      })
    }
  })

  return spots
}

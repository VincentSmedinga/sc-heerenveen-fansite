/** A goal as the score bar needs it. */
export type ScoreBarGoal = {
  /** The minute on the clock: 45 for "45+2". */
  minute: number
  /** Whether sc Heerenveen gains from the goal. An own goal gains for the other team. */
  ours: boolean
  /** The minutes of added time after `minute`: 2 for "45+2". Leave it out in regular time. */
  stoppageMinutes?: null | number | undefined
}

export type ScoreBarLayout = {
  /** Where extra time begins on the bar, from 0 to 100. `null` when there was none. */
  extraTimeStart: null | number
  segments: ScoreBarSegment[]
  ticks: ScoreBarTick[]
}

/** One piece of the bar: the score as it stood from one goal to the next. */
export type ScoreBarSegment = {
  /** Where the piece ends on the bar, from 0 to 100. */
  end: number
  /** The goals of the opponent. */
  goalsAgainst: number
  /** The goals of sc Heerenveen. */
  goalsFor: number
  /** The minute the piece ends, written as "45+2" where the goal fell in added time. */
  minuteEnd: string
  /** The minute the piece starts, written as "45+2" where the goal fell in added time. */
  minuteStart: string
  /** Where the piece starts on the bar, from 0 to 100. */
  start: number
}

export type ScoreBarTick = {
  minute: number
  /** Where the mark sits on the bar, from 0 to 100. */
  position: number
}

/** The minutes on the clock between two marks. */
export const tickInterval = 15

/**
 * The room that added time gets on the bar, in minutes of bar. The clock stops at 45 and at 90
 * (and at 120 in extra time), and a goal in the added time must not land on the minute before
 * it. A goal with more added time than the room sits at the end of the room, one minute short
 * of its end.
 */
const stoppageRoom = { extraTime: 3, firstHalf: 3, regular: 5 } as const

// One minute of every room stays free after the last goal, so the last score has a piece.
const reserve = 1

const halfTime = 45
const fullTime = 90
const endOfExtraTime = 120

/** The position of a moment on the bar, in minutes of bar, so before it is scaled to 100. */
function barMinutes(minute: number, stoppageMinutes: number, extraTime: boolean) {
  const { firstHalf, regular } = stoppageRoom
  const clamped = Math.max(0, minute)

  if (clamped < halfTime) {
    return clamped
  }

  if (clamped === halfTime) {
    return halfTime + Math.min(stoppageMinutes, firstHalf - reserve)
  }

  if (clamped < fullTime) {
    return clamped + firstHalf
  }

  if (clamped === fullTime) {
    return fullTime + firstHalf + Math.min(stoppageMinutes, regular - reserve)
  }

  // Past 90 only extra time has minutes. Without it, whatever is left over sits at the end.
  if (!extraTime) {
    return fullTime + firstHalf + regular - reserve
  }

  if (clamped < endOfExtraTime) {
    return clamped + firstHalf + regular
  }

  return endOfExtraTime + firstHalf + regular + Math.min(stoppageMinutes, stoppageRoom.extraTime - reserve)
}

const lengthOf = (extraTime: boolean) =>
  extraTime
    ? endOfExtraTime + stoppageRoom.firstHalf + stoppageRoom.regular + stoppageRoom.extraTime
    : fullTime + stoppageRoom.firstHalf + stoppageRoom.regular

const clock = (minute: number, stoppageMinutes: number) =>
  stoppageMinutes > 0 ? `${minute}+${stoppageMinutes}` : String(minute)

/**
 * The pieces of the bar and the marks under it. A piece starts at a goal and ends at the next
 * one, so every goal makes a new piece with the score after it. Goals in the same moment (the
 * same minute and added time) leave no piece between them: the bar jumps to the last score of
 * that moment, and the text for a screen reader skips the score that stood for no time.
 * The goals may come in any order; the order of the clock decides, and goals from the same
 * moment keep the order they were given in.
 */
export function scoreBarLayout(goals: readonly ScoreBarGoal[], extraTime: boolean): ScoreBarLayout {
  const total = lengthOf(extraTime)
  const place = (minuteOnBar: number) => Math.min(100, (minuteOnBar / total) * 100)
  const lastMinute = extraTime ? endOfExtraTime : fullTime

  const moments = goals
    .map((goal) => {
      const added = Math.max(0, goal.stoppageMinutes ?? 0)

      return { added, at: barMinutes(goal.minute, added, extraTime), goal }
    })
    .toSorted((first, second) => first.at - second.at)

  const segments: ScoreBarSegment[] = []
  let goalsFor = 0
  let goalsAgainst = 0
  let start = 0
  let minuteStart = '0'

  const close = (end: number, minuteEnd: string) => {
    if (end > start) {
      segments.push({ end: place(end), goalsAgainst, goalsFor, minuteEnd, minuteStart, start: place(start) })
    }
  }

  for (const { added, at, goal } of moments) {
    close(at, clock(goal.minute, added))

    if (at > start) {
      start = at
      minuteStart = clock(goal.minute, added)
    }

    if (goal.ours) {
      goalsFor += 1
    } else {
      goalsAgainst += 1
    }
  }

  close(total, String(lastMinute))

  const ticks: ScoreBarTick[] = []

  for (let minute = 0; minute <= lastMinute; minute += tickInterval) {
    ticks.push({ minute, position: place(barMinutes(minute, 0, extraTime)) })
  }

  return {
    extraTimeStart: extraTime ? place(fullTime + stoppageRoom.firstHalf + stoppageRoom.regular) : null,
    segments,
    ticks,
  }
}

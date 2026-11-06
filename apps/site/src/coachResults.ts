import type { PublicStaff } from '@fansite/db/queries'

import { seasonOf } from '@fansite/db/season'
import { rangeOf } from '@fansite/db/staff'

import type { CompetitionChoice } from './competition'

import { formatStaffDate } from './match-format'

/** A head coach with the matches in his period, for one row of the card. */
export type CoachResult = {
  drawn: number
  interim: boolean
  lost: number
  name: string
  /** The period as the card writes it, such as `jan 2019 – nu`. */
  period: string
  /** The matches played, with a result. */
  played: number
  /** The points per match as the Dutch write it, with two decimals and a comma: `1,85`. */
  pointsPerMatch: string
  won: number
}

/** What the count needs of a match: the day, the competition and the score, ours first. */
export type DatedMatch = {
  competition: string
  goalsAgainst: null | number
  goalsFor: null | number
  matchDate: string
  status: string
}

const pointsFormat = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 2, minimumFractionDigits: 2 })

/**
 * The first day of a date of the staff, the way `staff` reads a date it knows to the month or
 * the year only. The days of a period run from the first day of its start to the first day of
 * its end, both included; a period that has not ended runs on without an end.
 */
const firstDay = (date: string, precision: PublicStaff['startPrecision']) => rangeOf(date, precision).from

/** A date of a period without the day: `jan 2019`, or `2019` when only the year is known. */
const monthOf = (date: string, precision: PublicStaff['startPrecision']) =>
  formatStaffDate({ date, precision: precision === 'year' ? 'year' : 'month' })

/**
 * The results of each head coach with at least one played match in our data, the newest coach
 * first. A match counts for the coach whose period holds its day (see `firstDay`), when it was
 * played and has a score, in the Eredivisie alone for the choice `league` and in every
 * competition for `all`. A day that two periods hold, because a date known to the month or
 * year only reaches into the next period, counts for the coach who began first: the vague date
 * is the one that is less sure. A coach without a match is not in the list, so the coaches of
 * before our matches (2010/11) are not either. `coaches` are in the order they began.
 */
export function coachResultsOf(
  coaches: readonly PublicStaff[],
  matches: readonly DatedMatch[],
  choice: CompetitionChoice,
): CoachResult[] {
  const periods = coaches.map((coach) => ({
    coach,
    from: firstDay(coach.startDate, coach.startPrecision),
    until:
      coach.endDate === null || coach.endPrecision === null ? undefined : firstDay(coach.endDate, coach.endPrecision),
  }))
  const counts = periods.map(() => ({ drawn: 0, lost: 0, won: 0 }))

  for (const match of matches) {
    if (
      match.status !== 'played' ||
      match.goalsFor === null ||
      match.goalsAgainst === null ||
      (choice === 'league' && match.competition !== 'Eredivisie')
    ) {
      continue
    }

    const index = periods.findIndex(
      ({ from, until }) => from <= match.matchDate && (until === undefined || match.matchDate <= until),
    )
    const count = counts[index]

    if (count === undefined) {
      continue
    }

    if (match.goalsFor > match.goalsAgainst) {
      count.won++
    } else if (match.goalsFor === match.goalsAgainst) {
      count.drawn++
    } else {
      count.lost++
    }
  }

  return periods
    .flatMap(({ coach }, index) => {
      const { drawn, lost, won } = counts[index] ?? { drawn: 0, lost: 0, won: 0 }
      const played = won + drawn + lost

      return played === 0
        ? []
        : [
            {
              drawn,
              interim: coach.interim,
              lost,
              name: coach.name,
              period: periodOf(coach),
              played,
              pointsPerMatch: pointsFormat.format((3 * won + drawn) / played),
              won,
            },
          ]
    })
    .toReversed()
}

/**
 * The season of the first played match with a score: where the card says it starts counting.
 * Undefined when there is none.
 */
export function firstSeasonOf(matches: readonly DatedMatch[]) {
  const first = matches
    .filter((match) => match.status === 'played' && match.goalsFor !== null)
    .map((match) => match.matchDate)
    .toSorted()
    .at(0)

  return first === undefined ? undefined : seasonOf(new Date(`${first}T12:00:00Z`))
}

/** The period as the card writes it: `jan 2019 – nu`, `okt 2015 – jun 2016`, `2014 – 2015`. */
export function periodOf(coach: PublicStaff) {
  const end = coach.endDate === null || coach.endPrecision === null ? 'nu' : monthOf(coach.endDate, coach.endPrecision)

  return `${monthOf(coach.startDate, coach.startPrecision)} – ${end}`
}

import type { PublicMatch, PublicStaff } from '@fansite/db/queries'

import { type CompetitionChoice } from './competition'
import { formatTableDay } from './match-format'
import { type LeagueMatch, playedMatchesOf } from './matches'

/**
 * The weetjes of the card on the statistics page: one fact about one match, player or coach, in
 * a sentence, and never a total or an average (the other cards do that). A kind of weetje is a
 * small function in `kinds` that reads the matches of the season and gives the weetjes it
 * finds; a new kind is one more function in that list and a test. There is no query for it:
 * the cards of the page already hold the matches, with their goals, and the head coaches of
 * the season.
 */

/**
 * A weetje: the sentence, and an `id` that stays the same for the same fact, so the order of
 * the day (see `orderWeetjes`) does not change when another weetje comes or goes.
 */
export type Weetje = { id: string; text: string }

type Kind = (input: WeetjeInput) => Weetje[]

type MatchGoal = PublicMatch['goals'][number]

/**
 * What a kind of weetje reads. `matches` are all the matches of the season, in the order they
 * were played; `played` are the ones of them that the choice of the visitor counts, with a
 * score.
 */
type WeetjeInput = { coaches: PublicStaff[]; matches: PublicMatch[]; played: LeagueMatch[] }

/** How many wins at home or away in a row make a weetje. */
const longRun = 5

/** How many goals in one match make a weetje. */
const manyGoals = 7

/** How many goals a player needs in one match for a weetje. */
const hattrick = 3

/** How many goals behind we must have been, and still won, for a weetje. */
const bigDeficit = 2

const numberWords = [
  'nul',
  'een',
  'twee',
  'drie',
  'vier',
  'vijf',
  'zes',
  'zeven',
  'acht',
  'negen',
  'tien',
  'elf',
  'twaalf',
]

const numberWord = (count: number) => numberWords[count] ?? String(count)

const capital = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`

/** "thuis tegen FC Twente" or "uit bij FC Twente". */
const venue = (match: PublicMatch) => `${match.home ? 'thuis tegen' : 'uit bij'} ${match.opponent}`

/** The score as the home club comes first, with the en dash the site writes: "3–2". */
const score = (match: LeagueMatch) =>
  match.home ? `${match.goalsFor}–${match.goalsAgainst}` : `${match.goalsAgainst}–${match.goalsFor}`

/** "thuis tegen FC Twente (3–2, 14 maart 2026)": the match, its score and the day. */
const describe = (match: LeagueMatch) => `${venue(match)} (${score(match)}, ${formatTableDay(match.matchDate)})`

/** The id of a match within its season: no two matches share the competition and the round. */
const matchKey = (match: PublicMatch) => `${match.competition}:${match.round}`

/** Whether two goals fell in minutes that follow each other: 23 and 24, but not 45+1 and 46. */
const follows = (earlier: MatchGoal, later: MatchGoal) =>
  earlier.stoppageMinutes === null && later.stoppageMinutes === null && later.minute - earlier.minute === 1

/**
 * A win after we were behind by two goals or more, read from the order of the goals. It needs
 * every goal of the match, so a match whose scorers are not all known says nothing.
 */
function comeback({ played }: WeetjeInput): Weetje[] {
  return played.flatMap((match) => {
    if (match.goalsFor <= match.goalsAgainst || match.goals.length !== match.goalsFor + match.goalsAgainst) {
      return []
    }

    let lead = 0
    let deficit = 0

    for (const goal of match.goals) {
      lead += goal.ours ? 1 : -1
      deficit = Math.max(deficit, -lead)
    }

    return deficit < bigDeficit
      ? []
      : [
          {
            id: `ruime-achterstand:${matchKey(match)}`,
            text: `${capital(describe(match))} kwamen we ${numberWord(deficit)} doelpunten achter en wonnen we toch.`,
          },
        ]
  })
}

/** Two goals in minutes that follow each other, of ours or against us: one weetje per match. */
function consecutiveMinutes({ played }: WeetjeInput): Weetje[] {
  return played.flatMap((match) => {
    const goals = match.goals.filter((goal) => goal.minute >= 1)
    const first = goals.find((goal, index) => {
      const next = goals[index + 1]

      return next !== undefined && follows(goal, next)
    })

    if (first === undefined) {
      return []
    }

    const second = goals[goals.indexOf(first) + 1] as MatchGoal

    return [
      {
        id: `opeenvolgende-minuten:${matchKey(match)}`,
        text: `${capital(describe(match))} vielen in de ${first.minute}e en de ${second.minute}e minuut twee doelpunten achter elkaar.`,
      },
    ]
  })
}

/**
 * Three or more goals of one player in one match, of ours or of the opponent. A penalty is a
 * goal of the player, an own goal is a goal of nobody. A player is known by the id, then the
 * Wikipedia page and then the name, as in the list of goal scorers.
 */
function hattricks({ played }: WeetjeInput): Weetje[] {
  return played.flatMap((match) => {
    const scored = new Map<string, { count: number; name: string; ours: boolean }>()

    for (const goal of match.goals.filter((item) => !item.ownGoal)) {
      const key = `${goal.ours}:${goal.playerId ?? goal.playerPage ?? goal.player}`
      const known = scored.get(key)

      scored.set(key, { count: (known?.count ?? 0) + 1, name: goal.playerName ?? goal.player, ours: goal.ours })
    }

    return [...scored.entries()]
      .filter(([, { count }]) => count >= hattrick)
      .map(([key, { count, name, ours }]) => ({
        id: `hattrick:${matchKey(match)}:${key}`,
        text: `${capital(describe(match))} maakte ${ours ? name : `${name} van ${match.opponent}`} ${
          count === hattrick ? 'een hattrick' : `${numberWord(count)} doelpunten`
        }.`,
      }))
  })
}

/** A match with seven goals or more, of both clubs together. */
function manyGoalsInAMatch({ played }: WeetjeInput): Weetje[] {
  return played
    .filter((match) => match.goalsFor + match.goalsAgainst >= manyGoals)
    .map((match) => ({
      id: `veel-doelpunten:${matchKey(match)}`,
      text: `${capital(describe(match))} vielen ${numberWord(match.goalsFor + match.goalsAgainst)} doelpunten.`,
    }))
}

/**
 * The first match under a head coach who came during the season, interim coaches too. It
 * needs the day he began, so a coach known to the month or the year says nothing, and it needs
 * a match before it: the opener of the season is the first match under everybody. The match is
 * the first of the season that is played on that day or later, in any competition; when the
 * choice of the visitor leaves it out, or it has no score yet, there is no weetje.
 */
function newCoach({ coaches, matches, played }: WeetjeInput): Weetje[] {
  return coaches.flatMap((coach, index) => {
    const first = matches.find((match) => match.matchDate >= coach.startDate)
    const match = played.find((item) => item === first)

    if (
      index === 0 ||
      coach.startPrecision !== 'day' ||
      match === undefined ||
      !matches.some((item) => item.matchDate < coach.startDate)
    ) {
      return []
    }

    return [
      {
        id: `nieuwe-trainer:${coach.name}:${coach.startDate}`,
        text: `De eerste wedstrijd onder ${coach.interim ? 'interimtrainer' : 'trainer'} ${coach.name}: ${describe(match)}.`,
      },
    ]
  })
}

/** Two or more goals in the stoppage time of one half, of both clubs together. */
function stoppageTime({ played }: WeetjeInput): Weetje[] {
  return played.flatMap((match) =>
    [
      { half: 'eerste', minute: 45 },
      { half: 'tweede', minute: 90 },
    ].flatMap(({ half, minute }) => {
      const count = match.goals.filter((goal) => goal.minute === minute && goal.stoppageMinutes !== null).length

      return count < 2
        ? []
        : [
            {
              id: `blessuretijd:${matchKey(match)}:${minute}`,
              text: `${capital(describe(match))} vielen in de blessuretijd van de ${half} helft ${numberWord(count)} doelpunten.`,
            },
          ]
    }),
  )
}

/**
 * Five wins or more in a row at home, or in a row away: only the matches at that place count,
 * so the other place in between does not break the run. A draw or a loss does. One weetje for
 * each run, with its length, from the last win of it.
 */
function wins({ played }: WeetjeInput): Weetje[] {
  return [true, false].flatMap((home) => {
    const result: Weetje[] = []
    let run: LeagueMatch[] = []

    const close = () => {
      const last = run.at(-1)

      if (last !== undefined && run.length >= longRun) {
        result.push({
          id: `reeks-${home ? 'thuis' : 'uit'}:${matchKey(last)}`,
          text: `${capital(numberWord(run.length))} ${home ? 'thuiswedstrijden' : 'uitwedstrijden'} op rij gewonnen, de laatste ${
            home ? 'tegen' : 'bij'
          } ${last.opponent} (${score(last)}, ${formatTableDay(last.matchDate)}).`,
        })
      }

      run = []
    }

    for (const match of played.filter((item) => item.home === home)) {
      if (match.goalsFor > match.goalsAgainst) {
        run.push(match)
      } else {
        close()
      }
    }

    close()

    return result
  })
}

/**
 * The kinds of weetje, each a small function. A kind that finds nothing gives an empty list.
 * The order here only matters for the order before the day shuffles them.
 */
const kinds: Kind[] = [consecutiveMinutes, stoppageTime, hattricks, manyGoalsInAMatch, comeback, wins, newCoach]

/**
 * Every weetje of the season for the choice of the visitor: the matches the choice counts, the
 * played ones with a score, and the head coaches of the season.
 */
export function weetjesOf(matches: PublicMatch[], coaches: PublicStaff[], choice: CompetitionChoice): Weetje[] {
  const input = { coaches, matches, played: playedMatchesOf(matches, choice) }

  return kinds.flatMap((kind) => kind(input))
}

const dutchDayFormat = new Intl.DateTimeFormat('en-CA', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'Europe/Amsterdam',
  year: 'numeric',
})

/** The day in Dutch time as `2026-11-01`: a visit just after midnight there is a new day. */
export const dutchDay = (now: Date) => dutchDayFormat.format(now)

/**
 * The weetjes in the order of a day: shuffled, and the same for the whole day, so the page is
 * the same all day and the cache works. Each weetje has a place of its own, from its id and the
 * day, so a weetje that comes or goes in the middle of the day does not move the others.
 */
export function orderWeetjes(weetjes: Weetje[], day: string): Weetje[] {
  return weetjes
    .map((weetje) => ({ hash: hashOf(`${day}|${weetje.id}`), weetje }))
    .toSorted((a, b) => a.hash - b.hash || a.weetje.id.localeCompare(b.weetje.id))
    .map(({ weetje }) => weetje)
}

/**
 * The number that `?weetje=` asks for: a whole number from 1, up to three digits. Anything
 * else, such as no number, a number twice, `0`, `-1`, `1.5`, `02` or `abc`, gives the first
 * weetje.
 */
export function parseWeetjeNumber(value: string | string[] | undefined) {
  return typeof value === 'string' && /^[1-9]\d{0,2}$/u.test(value) ? Number(value) : 1
}

/**
 * The weetje that number `n` of the day is, counting from 1 and going round after the last, and
 * the number of the one after it. It gives nothing when there are no weetjes, and no next one
 * when there is only one.
 */
export function pickWeetje(ordered: Weetje[], n: number) {
  const weetje = ordered[(n - 1) % ordered.length]

  if (weetje === undefined) {
    return undefined
  }

  const number = ((n - 1) % ordered.length) + 1

  return { next: ordered.length > 1 ? (number % ordered.length) + 1 : undefined, number, weetje }
}

/** A number from a text, the same for the same text (FNV-1a, 32 bits). */
function hashOf(text: string) {
  let hash = 0x81_1c_9d_c5

  for (let index = 0; index < text.length; index += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 0x01_00_01_93)
  }

  return hash >>> 0
}

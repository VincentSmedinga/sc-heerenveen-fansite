import type { DataTableRow } from '@fansite/design-system'

import { seasonOf } from '@fansite/db/season'

import { getDatabase } from '#src/database'
import { reasonOf } from '#src/errors'
import { fantestPath } from '#src/fans/fantest'
import { currentMonth, findEntry, loadMonthQuiz } from '#src/fans/fantest-entry'
import { rankingOf as fantestRankingOf, monthScores } from '#src/fans/fantest-ranking'
import { fjouwerPath, fjouwerSquad, fjouwerState, fjouwerSurnames } from '#src/fans/fjouwer'
import { cachedStanding, supporterFours } from '#src/fans/fjouwer-points'
import { seasonRanking as fjouwerSeasonRanking, rankedSeasons as rankedFjouwerSeasons } from '#src/fans/fjouwer-ranking'
import { countFours, countParticipants } from '#src/fans/game-counts'
import { quizClosesAt, readOpenGame } from '#src/fans/open-games'
import { findPrediction, predictionPath, standsText } from '#src/fans/prediction'
import { countedPredictions } from '#src/fans/prediction-crowd'
import { rankedSeasons, seasonRanking } from '#src/fans/prediction-ranking'
import { matchMoment } from '#src/match-format'

import { placeFigure } from './fjouwer/PointsCards'
import { visibleRows as fjouwerRows } from './fjouwer/StandCards'
import {
  type CardSupporter,
  closedTag,
  countLines,
  type GameCardData,
  openTag,
  playerOf,
  shortRows,
  todoTag,
} from './game-card-data'
import { visibleRows as predictionRows } from './prognose/StandCards'

// The cards of the Prognose, Fjouwer and the Fantest on the page Fans (issue 1646). Each reads
// what everybody sees, and for a supporter who may take part what is theirs. A game that can't
// be read is logged and leaves its card out, so the page goes on. The card of the Uitblinker is
// in uitblinker-card.ts.

const monthFormat = new Intl.DateTimeFormat('nl-NL', { month: 'long', timeZone: 'UTC' })

async function orNothing(game: string, read: () => Promise<GameCardData>): Promise<GameCardData | undefined> {
  try {
    return await read()
  } catch (error) {
    console.error(`Could not read the game ${game} for the page Fans: ${reasonOf(error)}`)

    return undefined
  }
}

/** The match of a game that is still to be played, as the design system shows it. */
const upcoming = (
  match: Parameters<typeof matchMoment>[0] & { competition: string; home: boolean; opponent: string; round: string },
  now: Date,
) => ({
  competition: match.competition,
  ...matchMoment({ ...match, status: 'scheduled' }, now),
  home: match.home,
  opponent: match.opponent,
  round: match.round,
  status: 'scheduled' as const,
})

export function readPrognoseCard(supporter: CardSupporter | undefined, now = new Date()) {
  return orNothing('Prognose', async () => {
    const { db } = getDatabase()
    const open = await readOpenGame('prognose', now)
    const match = open === undefined || open.game === 'fantest' ? undefined : open.match
    const player = playerOf(supporter)
    const [count, saved, seasons] = await Promise.all([
      match === undefined ? 0 : countedPredictions(db, match.id).then((rows) => rows.length),
      match === undefined || player === undefined ? undefined : findPrediction(db, player.id, match.id),
      rankedSeasons(),
    ])
    const season = seasonOf(now)
    const rows = seasons.includes(season) ? shortRanking(await seasonRanking(season), player?.id, predictionRows) : []
    const todo = match !== undefined && player !== undefined && saved === undefined
    const lines =
      match === undefined
        ? ['Er is nu geen wedstrijd die je kunt voorspellen.']
        : countLines(count, 'voorspelde al', 'voorspelden al')

    return {
      action: todo
        ? { href: predictionPath, label: 'Voorspellen', type: 'button' }
        : {
            href: predictionPath,
            label: saved === undefined ? 'Naar de Prognose' : 'Wijzig je voorspelling',
            type: 'link',
          },
      game: 'prognose',
      lines,
      ...(match === undefined ? {} : { match: upcoming(match, now) }),
      ...(saved === undefined ? {} : { mine: { lines: [`Jouw voorspelling: ${lowerFirst(standsText(saved))}`] } }),
      ...(rows.length === 0 ? {} : { ranking: { caption: `Stand ${season}`, rows } }),
      heading: 'Prognose',
      tag: open === undefined ? closedTag : todo ? todoTag : openTag(open.closesAt, now),
    }
  })
}

/**
 * The rows of a short ranking. The row of the supporter is marked when it is one of them: the
 * rules of the ranking decide the places and the names, and nobody is added below.
 */
function shortRanking<Ranking extends { rows: readonly { supporterId: null | number }[] }>(
  ranking: Ranking,
  supporterId: number | undefined,
  rowsOf: (ranking: Ranking, supporterId: number | undefined, limit: number, withFigures: boolean) => DataTableRow[],
) {
  const shown = ranking.rows.slice(0, shortRows)
  const own = shown.some((row) => row.supporterId === supporterId) ? supporterId : undefined

  return rowsOf(ranking, own, shortRows, false).slice(0, shortRows)
}

const lowerFirst = (text: string) => `${text.charAt(0).toLowerCase()}${text.slice(1)}`

export function readFantestCard(supporter: CardSupporter | undefined, now = new Date()) {
  return orNothing('Fantest', async () => {
    const { db } = getDatabase()
    const quiz = await loadMonthQuiz(db, now)
    const player = playerOf(supporter)
    const { month, year } = currentMonth(now)
    const [count, entry, scores] = await Promise.all([
      quiz === undefined ? 0 : countParticipants(db, quiz.id),
      quiz === undefined || player === undefined ? undefined : findEntry(db, player.id, quiz.id),
      monthScores(),
    ])
    const ranked = fantestRankingOf(scores.filter((score) => score.year === year)).slice(0, shortRows)
    const rows = ranked.map((row) => ({
      cells: [row.total],
      header: row.screenName,
      position: row.place,
      ...(row.supporterId === player?.id ? { aside: 'Jij', highlight: true } : {}),
    }))
    const name = monthFormat.format(new Date(Date.UTC(2000, month - 1, 1)))
    const todo = quiz !== undefined && player !== undefined && entry === undefined

    return {
      action: todo
        ? { href: fantestPath, label: 'Doe de Fantest', type: 'button' }
        : { href: fantestPath, label: 'Naar de Fantest', type: 'link' },
      game: 'fantest',
      lines:
        quiz === undefined
          ? ['Er is nu geen Fantest. De quizzen van toen kun je naspelen.']
          : [`De Fantest van ${name}.`, ...countLines(count, 'deed mee', 'deden mee')],
      ...(entry === undefined || quiz === undefined
        ? {}
        : { mine: { lines: [`Je score deze maand: ${entry.score} van ${quiz.questions.length}.`] } }),
      ...(rows.length === 0 ? {} : { ranking: { caption: `Stand ${year}`, rows } }),
      heading: 'Fantest',
      // The quiz closes at midnight, which reads best as the last minute of the month.
      tag:
        quiz === undefined
          ? closedTag
          : todo
            ? todoTag
            : openTag(new Date(quizClosesAt(year, month).getTime() - 60 * 1000), now),
    }
  })
}

export function readFjouwerCard(supporter: CardSupporter | undefined, now = new Date()) {
  return orNothing('Fjouwer', async () => {
    const { db } = getDatabase()
    const open = await readOpenGame('fjouwer', now)
    const match = open === undefined || open.game === 'fantest' ? undefined : open.match
    const player = playerOf(supporter)
    const [count, state, squad, fours, seasons] = await Promise.all([
      match === undefined ? 0 : countFours(db, match.id),
      match === undefined || player === undefined ? undefined : fjouwerState(db, player.id, match),
      match === undefined || player === undefined ? [] : fjouwerSquad(db, match),
      player === undefined ? [] : supporterFours(db, player.id, now),
      rankedFjouwerSeasons(),
    ])
    const season = seasonOf(now)
    const rows = seasons.includes(season)
      ? shortRanking(await fjouwerSeasonRanking(season), player?.id, fjouwerRows)
      : []
    const surnames = await fjouwerSurnames(db, state?.four ?? [])
    const named = (ids: readonly number[]) => ids.flatMap((id) => surnames.get(id) ?? [])
    const inSquad = new Set(squad.map((member) => member.id))
    // A player who left the squad counts no more than one who was chosen ten times. While the
    // squad of the season is not known, there is nothing to hold the four against.
    const lost =
      state === undefined || squad.length === 0
        ? []
        : state.four.filter((id) => state.notCounting.includes(id) || !inSquad.has(id))
    const four = named(state?.four ?? [])
    const notCounting = named(lost)
    // A four that is inherited counts, as long as all four of them do.
    const done = state !== undefined && squad.length > 0 && state.four.length === 4 && lost.length === 0
    // Without a squad the page of the game has no form, so there is nothing to do yet.
    const todo = state !== undefined && squad.length > 0 && !done
    const last = fours.find((item) => item.ready)
    const standing = last === undefined ? undefined : await cachedStanding(last.match.id)
    const found = player === undefined ? undefined : placeFigure(standing, player.id)
    // The card shows the match to come, so the place says which match it is of.
    const place =
      found === undefined ? undefined : { ...found, note: `van ${standing?.counted} in je laatste wedstrijd` }
    const figures =
      last?.total === undefined
        ? undefined
        : [
            {
              figure: String(last.total),
              label: last.total === 1 ? 'punt' : 'punten',
              note: 'in je laatste wedstrijd',
            },
            ...(place === undefined ? [] : [place]),
          ]
    const mineLines = [
      ...(four.length === 0 ? [] : [`Jouw vier: ${four.join(', ')}.`]),
      ...notCounting.map((name) => `${name} telt niet mee.`),
    ]

    return {
      action: todo
        ? { href: fjouwerPath, label: 'Kies je vier', type: 'button' }
        : {
            href: fjouwerPath,
            label: done ? 'Wijzig je vier' : 'Naar Fjouwer',
            type: 'link',
          },
      game: 'fjouwer',
      lines:
        match === undefined
          ? ['Er is nu geen wedstrijd om je vier voor te kiezen.']
          : countLines(count, 'koos zijn vier', 'kozen hun vier'),
      ...(match === undefined ? {} : { match: upcoming(match, now) }),
      ...(mineLines.length === 0 && figures === undefined
        ? {}
        : { mine: { lines: mineLines, ...(figures === undefined ? {} : { figures }) } }),
      ...(rows.length === 0 ? {} : { ranking: { caption: `Stand ${season}`, rows } }),
      heading: 'Fjouwer',
      tag: open === undefined ? closedTag : todo ? todoTag : openTag(open.closesAt, now),
    }
  })
}

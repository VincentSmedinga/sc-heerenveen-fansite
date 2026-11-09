import { findSquadCompleteness, listSeasonPlayers, listSquadPages, type PublicSeasonPlayer } from '@fansite/db/queries'

import { cacheForKey } from './cache'
import { getDatabase } from './database'
import { type NameParts, personNameParts } from './player-name'

/**
 * The squad of a season for the card Selectie on the page Spelers: every player of the season,
 * the chance that the list is the whole squad, and the Wikipedia pages the list was read
 * from. `completeness` is undefined for a season without players, which the card reads as
 * `onbekend`.
 */
export type SeasonSquad = {
  completeness: Awaited<ReturnType<typeof findSquadCompleteness>>
  pages: { readAt: Date; title: string }[]
  players: PublicSeasonPlayer[]
}

/** A part of the card and its players, in the order of the list. */
export type SquadPart = {
  /** The heading of the part. Null for the one list of a season without positions. */
  label: null | string
  players: SquadPlayer[]
}

/** A player as a line of the card: the shirt number, the country and the name in two parts. */
export type SquadPlayer = NameParts & {
  /**
   * The code of two letters of the country (`NL`). Null: none, where others have one.
   * Undefined: nobody in the part has one.
   */
  country: null | string | undefined
  /** Tells the lines apart: the name as the importer kept it, which is unique in a season. */
  key: string
  /** Null: no number, where others have one. Undefined: nobody in the part has a number. */
  shirtNumber: null | number | undefined
}

const labels = {
  aanvaller: 'Aanvallers',
  doelman: 'Doelmannen',
  middenvelder: 'Middenvelders',
  unknown: 'Positie onbekend',
  verdediger: 'Verdedigers',
} as const

/** The parts from the goal to the front, then the players without a position. */
const partOrder = ['doelman', 'verdediger', 'middenvelder', 'aanvaller', 'unknown'] as const

/** How long the squad of a season is kept: the import reads it at most once an hour. */
const keptFor = 5 * 60 * 1000

async function loadSquad(season: string): Promise<SeasonSquad> {
  const { db } = getDatabase()
  const [completeness, pages, players] = await Promise.all([
    findSquadCompleteness(db, season),
    listSquadPages(db, season),
    listSeasonPlayers(db, season),
  ])

  return { completeness, pages, players }
}

const seasonSquads = cacheForKey(keptFor, loadSquad)

/**
 * The players on the card: those of the season, except the players from our reports when a
 * better source has the season (#935). The reports are the last source, so their players are
 * on the card only when nothing better is there; the page lists them under "Alle spelers" in
 * every case.
 */
export function cardPlayers(squad: SeasonSquad): PublicSeasonPlayer[] {
  return squad.completeness?.bestSource === 'verslag'
    ? squad.players
    : squad.players.filter((player) => player.source !== 'verslag')
}

/**
 * The sentence under the heading of the card: what we know of the season and how sure we are
 * that the list is the whole squad, without a percentage. A season without a row is a season
 * without players.
 */
export function completenessSentence(completeness: SeasonSquad['completeness'], playerCount?: number): string {
  if (completeness === undefined || completeness.level === 'onbekend') {
    return 'Van dit seizoen kennen we de selectie niet.'
  }

  const known = `We kennen ${playerCount ?? completeness.playerCount} spelers van dit seizoen`

  // The list of the reports is our own and the weakest: say where it comes from.
  if (completeness.bestSource === 'verslag') {
    return `${known}, uit de verslagen. Wie niet speelde, ontbreekt waarschijnlijk.`
  }

  switch (completeness.level) {
    case 'bijna':
      return `${known}. Er ontbreken waarschijnlijk een paar.`
    case 'compleet':
      return `${known}. Waarschijnlijk staat iedereen uit de selectie erbij.`
    case 'deels':
      return completeness.bestSource === 'statistieken'
        ? `${known}: wie speelde. Wie op de bank bleef, ontbreekt waarschijnlijk.`
        : `${known}. Dat zijn waarschijnlijk niet alle spelers.`
    case 'weinig':
      return `${known}, vooral wie scoorde of overkwam. De selectie is verre van compleet.`
  }
}

/**
 * The squad of one season. The cache keeps an entry for every season it is asked for, so the
 * caller asks for a season of `getMatchSeasons` only: a visitor can make up any address.
 */
export function getSeasonSquad(season: string): Promise<SeasonSquad> {
  return seasonSquads(season)
}

/** Whether the title is one of the English Wikipedia: `2018–19 SC Heerenveen season`. */
export function isEnglishPage(title: string) {
  return title.endsWith(' SC Heerenveen season')
}

/** Whether the card has a list: a season whose squad we don't know shows the sentence alone. */
export function showsPlayers(squad: SeasonSquad) {
  return cardPlayers(squad).length > 0 && squad.completeness !== undefined && squad.completeness.level !== 'onbekend'
}

/**
 * The name of a Wikipedia page of the squad as the credit shows it: the page of the English
 * Wikipedia says so. When a season has more than one page of the Dutch Wikipedia, each shows
 * its title, so the links can be told apart.
 */
export function squadPageName(title: string, season: string, dutchPages: number) {
  if (isEnglishPage(title)) {
    return `Selectie ${season} (Engelse Wikipedia)`
  }

  return dutchPages > 1 ? title : `Selectie ${season}`
}

/**
 * The players in the parts of the card. A part without players is left out, and so are the
 * headings when nobody in the season has a position (the tables of 1990/91 to 2005/06): the
 * card then has one list. Players without a position, among others who have one, are the last
 * part. The query already put the players in order, which each part keeps.
 */
export function squadParts(players: PublicSeasonPlayer[]): SquadPart[] {
  if (players.every((player) => player.position === null)) {
    return players.length === 0 ? [] : [{ label: null, players: linesOf(players) }]
  }

  return partOrder.flatMap((part) => {
    const inPart = players.filter((player) => (player.position ?? 'unknown') === part)

    return inPart.length === 0 ? [] : [{ label: labels[part], players: linesOf(inPart) }]
  })
}

function linesOf(players: PublicSeasonPlayer[]): SquadPlayer[] {
  const numbered = players.some((player) => player.shirtNumber !== null)
  const flagged = players.some((player) => player.country !== null)

  return players.map((player) => ({
    country: flagged ? player.country : undefined,
    key: player.name,
    shirtNumber: numbered ? player.shirtNumber : undefined,
    ...(personNameParts(player) ?? { givenName: player.name, surname: '' }),
  }))
}

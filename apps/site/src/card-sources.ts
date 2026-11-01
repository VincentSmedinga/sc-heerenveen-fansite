/*
 * Which sources each card with data from an import rests on, in one place. The line "Laatst
 * gewijzigd" under a card takes the newest moment of these sources (see `lastModifiedOf`). A
 * new card with data from an import is added here, and a test names every card in the list.
 */

import { matchPageKinds, type WikipediaPageKind } from '@fansite/db/schema'

import { lastModifiedOf, momentOf } from './last-modified'

/** A source an import read, with the moment it last changed, as it is saved. */
export type SourceVersion = {
  kind: WikipediaPageKind
  version: null | string
}

/**
 * The cards that rest on the three pages of Wikipedia with the matches (the competition, the
 * matches and the cup): the programme, the results and every card with figures.
 */
const matchPages = matchPageKinds

/** The cards that rest on the table of the competition alone. */
const tablePage = ['standings'] as const

/**
 * The cards that name players, which rest on the page of the squad as well as on the matches:
 * the goals come from the pages of the matches and the names of the players from the squad.
 */
const matchPagesAndSquad = [...matchPageKinds, 'squad'] as const

/**
 * The kinds of source each card rests on, by the name of the card. The names are the anchors of
 * the cards where they have one. A card that rests on the matches of a season is also the card
 * of a club's page or of the homepage, in the short form, and has its own name there.
 */
export const cardSources = {
  'alle-tegenstanders': matchPages,
  'bijzondere-doelpunten': matchPagesAndSquad,
  'de-nul-gehouden': matchPages,
  'doelpunten-per-kwartier': matchPages,
  doelpuntenmakers: matchPagesAndSquad,
  'hoe-de-wedstrijden-verlopen': matchPages,
  'home-stand': tablePage,
  'home-wedstrijden': matchPages,
  hoofdtrainers: ['squad'],
  'onze-plek-in-de-competitie': tablePage,
  'onze-uitslagen': matchPages,
  programma: matchPages,
  reeksen: matchPages,
  spelers: ['squad'],
  stand: tablePage,
  'thuis-en-uit': matchPages,
  uitersten: matchPages,
  uitslagen: matchPages,
  'verloop-van-het-seizoen': matchPages,
  wedstrijden: matchPages,
} as const satisfies Record<string, readonly WikipediaPageKind[]>

/** The name of a card with data from an import. */
export type SourcedCard = keyof typeof cardSources

/**
 * The line "Laatst gewijzigd" for a card: the newest moment of the sources it rests on, out of
 * the sources that were read. Without a source that has a moment it gives undefined.
 */
export function lastModifiedOfCard(card: SourcedCard, sources: readonly SourceVersion[], now: Date) {
  const kinds: readonly WikipediaPageKind[] = cardSources[card]

  return lastModifiedOf(
    sources.filter((source) => kinds.includes(source.kind)).map((source) => momentOf(source.version)),
    now,
  )
}

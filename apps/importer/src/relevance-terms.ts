/*
 * The names and words that `judgeRelevance` looks for in a headline (see `relevance.ts`).
 *
 * Who keeps it up to date: the project owner, with the Coordinator. Check the people against
 * the club's own site at the start of each season (July) and after the winter and summer
 * transfer windows (February and September), and add a word when a missed headline shows one
 * is missing (see the README of the importer, _Een naam toevoegen_).
 *
 * Last checked: 25 October 2026, against the page of the season 2026/27 on nl.wikipedia.org
 * (updated 17 October 2026) and the squad on vi.nl. Only names: no other data about a person.
 *
 * Every term is written in the form `normaliseTitle` gives: lower case, without accents, with
 * words split at anything that isn't a letter or a digit. A test checks it. A term of more than
 * one word matches only those words next to each other, in that order.
 *
 * The filter is not strict on purpose: a headline that slips through is hidden by a moderator
 * in a moment, and one that is held back is not seen by anyone. So:
 * - A person is on the lists with the full name and with the surname, also a common one such
 *   as Kersten or Veldman. A full name makes a headline `relevant` on its own. A surname alone
 *   only makes it `relevant` together with "Heerenveen", and on its own it only makes it
 *   `doubtful`, so the damage of a common surname is small. Left out are surnames that are an
 *   ordinary word (Proper, Machine, Schaken, De Haan, Zaal, Bakker, Brugge). Those only count
 *   as a full name.
 * - Players and staff who left in 2026 are on the list too: news about them is nice to read.
 *   Older former players are not; add one when a headline shows that we miss him.
 * - No other clubs, and no players of other clubs.
 */

/**
 * Someone so much part of the club that a headline about them belongs on the site without the
 * name of the club: Abe Lenstra, our greatest player of all time (the project owner decided
 * this on 25 October 2026). It matches "Abe Lenstra Stadion" too. A headline about the Abe
 * Lenstra Boulevard gets in as well; a moderator can hide it.
 */
export const clubLegends = ['abe lenstra'] as const

/**
 * The first team of sc Heerenveen and the staff around it, and those who left in 2026: their
 * full names. A headline with a full name belongs on the site, with the club named or not (the
 * project owner decided this on 25 October 2026).
 */
export const clubPeople = [
  // Goalkeepers
  'bernt klaverboer',
  'timo schreuder',
  'andries noppert',
  'sten kremers',
  // Defenders
  'mees hilgers',
  'maas willemsen',
  'sam kersten',
  'mats egbring',
  'vasilios zagaritis',
  'darling bladi',
  'hristiyan petrov',
  'jimte scholten',
  'oliver braude',
  // Midfielders
  'dirk proper',
  'ringo meerveld',
  'levi smans',
  'marcus linday',
  'nolhan courtens',
  'anass bouziane',
  'maxence rivera',
  // Forwards
  'dylan vente',
  'luca oyen',
  'roberts uldrikis',
  'jacob trenskow',
  'marko farji',
  'marko hussein farji',
  'lanroy machine',
  'kirayno schaken',
  // Head coach, assistants and directors
  'robin veldman',
  'jeroen schepens',
  'erwin koenis',
  'johan hansma',
  'ferry de haan',
  // Left in 2026
  'amourricho van axel dongen',
  'eser gurbuz',
  'henk brugge',
  'isaiah ahmed',
  'jan bekkema',
  'joris van overeem',
  'lasse nordas',
  'luuk brouwers',
  'nikolai hopland',
  'nordin bakker',
  'timo zaal',
] as const

/**
 * The surnames of the people above, the ones that are not ordinary words. A surname alone only
 * makes a headline `doubtful`, and `relevant` together with "Heerenveen".
 */
export const clubSurnames = [
  // Goalkeepers
  'klaverboer',
  'schreuder',
  'noppert',
  'kremers',
  // Defenders
  'hilgers',
  'willemsen',
  'kersten',
  'egbring',
  'zagaritis',
  'bladi',
  'petrov',
  'scholten',
  'braude',
  // Midfielders
  'meerveld',
  'smans',
  'linday',
  'courtens',
  'bouziane',
  'rivera',
  // Forwards
  'vente',
  'oyen',
  'uldrikis',
  'trenskow',
  'farji',
  // Head coach, assistants and directors
  'veldman',
  'schepens',
  'koenis',
  'hansma',
  // Left in 2026
  'van axel dongen',
  'gurbuz',
  'bekkema',
  'van overeem',
  'nordas',
  'brouwers',
  'hopland',
] as const

/**
 * Words from football. Alone they say nothing about sc Heerenveen: a headline needs
 * "Heerenveen" as well. Whole words only, so "wandelwedstrijd" does not count and "wedstrijd"
 * does, and the plurals and the compounds a headline uses often are listed one by one.
 *
 * Left out on purpose: words that are as common outside football (kaart, rood, finale,
 * contract), and the names of other clubs. Words that are common but come with "Heerenveen"
 * mostly in football headlines are on the list (coach, competitie, kampioen, stadion).
 */
export const footballWords = [
  'aanvaller',
  'aanwinst',
  'basiself',
  'bekerwedstrijd',
  'blessure',
  'coach',
  'competitie',
  'conference league',
  'degradatie',
  'doelman',
  'doelpunt',
  'doelpunten',
  'doelpuntenmaker',
  'duel',
  'duels',
  'eerste divisie',
  'eredivisie',
  'europa league',
  'geblesseerd',
  'gelijkspel',
  'goal',
  'goals',
  'kampioen',
  'keeper',
  'knvb',
  'middenvelder',
  'nederlaag',
  'oefenwedstrijd',
  'opstelling',
  'overwinning',
  'penalty',
  'persconferentie',
  'play offs',
  'samenvatting',
  'scoort',
  'scoorde',
  'scoren',
  'selectie',
  'speelronde',
  'spits',
  'stadion',
  'supporter',
  'supporters',
  'thuiswedstrijd',
  'thuiszege',
  'topper',
  'trainer',
  'transfer',
  'transfervrij',
  'treffer',
  'treffers',
  'tribune',
  'uitwedstrijd',
  'uitzege',
  'verdediger',
  'verliest',
  'voetbal',
  'voetballer',
  'voetballers',
  'wedstrijd',
  'wedstrijden',
  'wint',
  'zege',
] as const

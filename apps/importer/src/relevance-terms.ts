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
 * - A person is on the list with the full name and with the surname, also a common one such as
 *   Kersten or Veldman. A surname alone only makes a headline `relevant` together with
 *   "Heerenveen", and on its own it only makes it `doubtful`, so the damage of a common surname
 *   is small. Left out are surnames that are an ordinary word (Proper, Machine, Schaken, De
 *   Haan, Zaal, Bakker, Brugge). Those need the full name.
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
 * The first team of sc Heerenveen and the staff around it, and those who left in 2026: the full
 * names, and the surnames that are not ordinary words.
 */
export const clubPeople = [
  // Goalkeepers
  'bernt klaverboer',
  'klaverboer',
  'timo schreuder',
  'schreuder',
  'andries noppert',
  'noppert',
  'sten kremers',
  'kremers',
  // Defenders
  'mees hilgers',
  'hilgers',
  'maas willemsen',
  'willemsen',
  'sam kersten',
  'kersten',
  'mats egbring',
  'egbring',
  'vasilios zagaritis',
  'zagaritis',
  'darling bladi',
  'bladi',
  'hristiyan petrov',
  'petrov',
  'jimte scholten',
  'scholten',
  'oliver braude',
  'braude',
  // Midfielders
  'dirk proper',
  'ringo meerveld',
  'meerveld',
  'levi smans',
  'smans',
  'marcus linday',
  'linday',
  'nolhan courtens',
  'courtens',
  'anass bouziane',
  'bouziane',
  'maxence rivera',
  'rivera',
  // Forwards
  'dylan vente',
  'vente',
  'luca oyen',
  'oyen',
  'roberts uldrikis',
  'uldrikis',
  'jacob trenskow',
  'trenskow',
  'marko farji',
  'marko hussein farji',
  'farji',
  'lanroy machine',
  'kirayno schaken',
  // Head coach, assistants and directors
  'robin veldman',
  'veldman',
  'jeroen schepens',
  'schepens',
  'erwin koenis',
  'koenis',
  'johan hansma',
  'hansma',
  'ferry de haan',
  // Left in 2026
  'amourricho van axel dongen',
  'van axel dongen',
  'eser gurbuz',
  'gurbuz',
  'henk brugge',
  'isaiah ahmed',
  'jan bekkema',
  'bekkema',
  'joris van overeem',
  'van overeem',
  'lasse nordas',
  'nordas',
  'luuk brouwers',
  'brouwers',
  'nikolai hopland',
  'hopland',
  'nordin bakker',
  'timo zaal',
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
  'voetbal',
  'voetballer',
  'voetballers',
  'wedstrijd',
  'wedstrijden',
  'zege',
] as const

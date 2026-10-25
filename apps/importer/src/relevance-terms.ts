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
 * What is on the list and what is not:
 * - A name is on the list as the full name. The surname alone is added only when it is not an
 *   ordinary word or a common surname, such as "Klaverboer": a surname like Kersten, Scholten
 *   or Veldman would make headlines about other people look like the club's.
 * - Both spellings of a name are on the list when the sources differ (Hristiyan and Christijan
 *   Petrov).
 * - Only the current squad and staff are on it. Former players, and players who just left, are
 *   not: a headline about them nearly always names the club too, and a name that stays on the
 *   list for years turns into noise.
 * - No other clubs, and no players of other clubs.
 */

/**
 * The first team of sc Heerenveen and the staff around it: the full names, and the surnames
 * that are not ordinary words.
 */
export const clubPeople = [
  // Goalkeepers
  'bernt klaverboer',
  'klaverboer',
  'timo schreuder',
  'andries noppert',
  'noppert',
  'sten kremers',
  // Defenders
  'mees hilgers',
  'hilgers',
  'maas willemsen',
  'sam kersten',
  'mats egbring',
  'egbring',
  'vasilios zagaritis',
  'zagaritis',
  'darling bladi',
  'bladi',
  'hristiyan petrov',
  'christijan petrov',
  'jimte scholten',
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
  // Forwards
  'dylan vente',
  'luca oyen',
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
  'jeroen schepens',
  'erwin koenis',
  'koenis',
  'johan hansma',
  'ferry de haan',
] as const

/**
 * Words from football. Alone they say nothing about sc Heerenveen: a headline needs
 * "Heerenveen" as well. Whole words only, so "wandelwedstrijd" does not count and "wedstrijd"
 * does, and the plurals and the compounds a headline uses often are listed one by one.
 *
 * Left out on purpose: words that are as common outside football (coach, competitie, play-offs,
 * kampioen, finale, rood, tegenstander, kaart), and the names of other clubs.
 */
export const footballWords = [
  'aanvaller',
  'abe lenstra stadion',
  'bekerwedstrijd',
  'conference league',
  'degradatie',
  'doelman',
  'doelpunt',
  'doelpunten',
  'doelpuntenmaker',
  'eerste divisie',
  'eredivisie',
  'europa league',
  'goal',
  'keeper',
  'knvb',
  'middenvelder',
  'oefenwedstrijd',
  'opstelling',
  'penalty',
  'scoort',
  'scoorde',
  'scoren',
  'selectie',
  'spits',
  'supporter',
  'supporters',
  'thuiswedstrijd',
  'trainer',
  'transfer',
  'uitwedstrijd',
  'verdediger',
  'voetbal',
  'voetballer',
  'voetballers',
  'wedstrijd',
  'wedstrijden',
] as const

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
 * - The Frisian football words are in a list of their own, `frisianFootballWords`, after the
 *   Dutch ones. Same rules: whole words, and none that is as common outside football.
 * - The professional clubs of the Eredivisie and the Eerste Divisie are on the list
 *   `otherClubs`: "Heerenveen" next to one of them is a match. No players of other clubs.
 */

/**
 * The names of the club and the town, as a headline writes them: "Heerenveen" in Dutch and
 * "Hearrenfean" in Frisian (the spelling of Omrop Fryslân and of the Frisian Wikipedia). They
 * count the same, alone and after "sc", and a headline may use both. The adjective "Feanster"
 * is not on the list on purpose: it says "of Heerenveen", it is no name, and so it never
 * makes a headline `relevant` (the same as "Heerenveense"). "It Hearrenfean" is the same name
 * with the Frisian article, which the rules ignore.
 */
export const clubNames = ['heerenveen', 'hearrenfean'] as const

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
 * The other professional clubs of the Eredivisie and the Eerste Divisie in the season 2026/27,
 * as headlines write them. "Heerenveen" next to one of them is a match: "Ajax - Heerenveen: de
 * opstellingen" is `relevant`, with no football word. On their own they say nothing.
 *
 * Checked on 25 October 2026, against the page "2026-27 Eredivisie" on en.wikipedia.org (18
 * clubs, as of 24 October 2026) and the page "Eerste divisie 2026/27" on nl.wikipedia.org (20
 * clubs, last edited 24 October 2026). Update it after the promotion and relegation of each
 * season (May to July).
 *
 * A club whose short name is also a place is on the list with its full name only: "Groningen",
 * "Utrecht", "Twente", "Zwolle", "Emmen" and the like are in headlines about the A7 and the
 * trains as much as about football, and those would all become `relevant`. A headline that
 * writes only "Utrecht" for the club can still get in with a word from football. A club whose
 * short name is the club in nearly every headline (Ajax, PSV, Cambuur, Volendam) is on the
 * list with it.
 *
 * The names of one club are in one group. That is how the rule of the opponent finds a club
 * from the name in `matches` ("N.E.C.", "ADO Den Haag", "Almere City FC", "Excelsior
 * Rotterdam"): the name of the match, or the name without a prefix or suffix from
 * `clubPrefixes`, is one of the names of a group, and a headline with any name of the group
 * names the opponent. So "ADO beleeft frustrerende avond" names ADO Den Haag.
 */
export const otherClubGroups = [
  // Eredivisie
  ['ado den haag', 'ado'],
  ['ajax', 'afc ajax'],
  ['az alkmaar', 'az'],
  ['cambuur', 'sc cambuur'],
  ['excelsior', 'excelsior rotterdam'],
  ['feyenoord'],
  ['fortuna sittard'],
  ['go ahead eagles'],
  ['fc groningen'],
  ['nec nijmegen', 'nec', 'n e c'],
  ['pec zwolle', 'pec'],
  ['psv', 'psv eindhoven'],
  ['sparta rotterdam', 'sparta'],
  ['telstar', 'sc telstar'],
  ['fc twente'],
  ['fc utrecht'],
  ['willem ii'],
  // Eerste Divisie
  ['almere city'],
  ['fc den bosch'],
  ['fc dordrecht'],
  ['fc eindhoven'],
  ['fc emmen'],
  ['de graafschap', 'graafschap'],
  ['helmond sport'],
  ['heracles almelo', 'heracles'],
  ['jong ajax'],
  ['jong az'],
  ['jong fc utrecht'],
  ['jong psv'],
  ['mvv maastricht', 'mvv'],
  ['nac breda', 'nac'],
  ['rkc waalwijk', 'rkc'],
  ['roda jc kerkrade', 'roda jc', 'roda'],
  ['top oss'],
  ['vitesse'],
  ['fc volendam', 'volendam'],
  ['vvv venlo'],
] as const

/** The names of `otherClubGroups` in one list, for the rule of "Heerenveen" next to a club. */
export const otherClubs: readonly string[] = otherClubGroups.flat()

/**
 * The words that start or end the name of a club without being part of the name: FC, SC, VV,
 * SV and AFC. The rule of the opponent leaves them out of the name of a match when the name is
 * not on the list of clubs: "FC Lisse" is looked for as "Lisse". A name that is only one of
 * them ("AFC", an amateur club in the cup) is not looked for, because it would be every club
 * with that prefix.
 */
export const clubPrefixes = ['afc', 'fc', 'sc', 'sv', 'vv'] as const

/**
 * Names of amateur clubs of one word that are also an ordinary word, so a headline with the
 * word is not about the club. The rule of the opponent looks for the other one-word names of
 * clubs that are not on the list of clubs (IJsselmeervogels, ASWH), and for none of these.
 * Add a word when a headline shows that we need it.
 */
export const ordinaryClubWords = ['concordia', 'hercules', 'olympia', 'quick', 'rapid', 'union', 'victoria'] as const

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

/**
 * Frisian words from football, for headlines of Omrop Fryslân and others that write in Frisian
 * (see #270). They count like the Dutch ones above, with "Heerenveen" or "Hearrenfean" in the
 * headline, and are not in `footballWords` because those are Dutch. A word that Dutch and
 * Frisian write the same (wint, doelpunt, supporters, stadion, trainer, kampioen) is only in
 * `footballWords`. Accents do not count, so "thúswedstriden" is written "thuswedstriden".
 *
 * Every word was found on the Frisian Wikipedia (fy.wikipedia.org) on 25 October 2026, on the
 * pages "SC Hearrenfean", "Fuotbal", "Earedifyzje" and "KNVB-beker"; the page is after each
 * word. The feed of Omrop Fryslân had no Frisian football headline that day, so no word comes
 * from there. Only the form found is on the list, and the plural or the singular next to it
 * when the form is regular; "skoarden" is the only form of "skoarje" (to score) that is on
 * the list.
 *
 * Left out on purpose, because the word is as common outside football (the same lesson as
 * "wint"): "ploech" (a team, but also any crew or group), "spiler" (a player of anything),
 * "útslach" (a result, but also a rash), "kampioenskip" (fierljeppen and skûtsjesilen have
 * one too), "ferlies" (a loss in money too), "promoasje", "beker" (a mug) and "oanhing" (any
 * followers). A headline with one of them and "Hearrenfean" is `doubtful`, which a moderator
 * can look at. Add one when a missed headline shows that we need it.
 *
 * The words of winning and losing are on the list, like "wint" and "verliest" for Dutch: "wûn"
 * (won) and "ferlear" (lost). A headline such as "Frou wûn lotterij yn Hearrenfean" becomes
 * `relevant`, which a moderator hides. A club headline we miss is worse (see
 * `docs/beslissingen.md`, _Een volledige naam is genoeg, en "wint" en "verliest" zijn
 * voetbalwoorden_).
 */
export const frisianFootballWords = [
  'alvetal', // SC Hearrenfean
  'earedifyzje', // SC Hearrenfean, Earedifyzje, KNVB-beker
  'ferdigener', // SC Hearrenfean, Fuotbal (singular, made from the plural found there)
  'ferdigeners', // SC Hearrenfean, Fuotbal
  'ferlear', // SC Hearrenfean
  'fuotbal', // all four pages
  'fuotballer', // SC Hearrenfean
  'fuotballers', // SC Hearrenfean
  'haadtrainer', // SC Hearrenfean
  'kompetysje', // SC Hearrenfean, Fuotbal
  'middenfjilder', // SC Hearrenfean (singular, made from the plural found there)
  'middenfjilders', // SC Hearrenfean
  'oerwinning', // SC Hearrenfean, KNVB-beker
  'seleksje', // SC Hearrenfean
  'skoarden', // SC Hearrenfean
  'thusoerwinning', // SC Hearrenfean
  'thuswedstriden', // SC Hearrenfean
  'trener', // SC Hearrenfean
  'utoerwinning', // SC Hearrenfean
  'utwedstriid', // SC Hearrenfean
  'wedstriden', // SC Hearrenfean
  'wedstriid', // SC Hearrenfean
  'wun', // SC Hearrenfean, KNVB-beker ("wûn")
] as const

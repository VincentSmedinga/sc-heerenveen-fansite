import type { ItemRelevance } from '@fansite/db/schema'

import { describe, expect, it } from 'vitest'

import { clubPeople, clubSurnames, footballWords, otherClubs } from './relevance-terms.ts'
import { judgeRelevance, normaliseTitle } from './relevance.ts'

type Case = [title: string, expected: ItemRelevance]

/*
 * The cases are made-up headlines in the style of a regional newspaper, one list per rule. The
 * project owner's headlines from the old logs (with whether they belonged) go in
 * `fromTheLogs`: add `[title, 'relevant' | 'doubtful' | 'irrelevant']` and the test picks it
 * up.
 * Use headlines as the source wrote them, and the value the owner says they should get.
 */

/** The headlines of the owner's logs. Still to come (#74). */
const fromTheLogs: Case[] = []

/** Rule 1: the headline names sc Heerenveen, in any spelling. */
const namesTheClub: Case[] = [
  ['sc Heerenveen wint met 3-1 van Utrecht', 'relevant'],
  ['SC Heerenveen verlengt contract van doelman', 'relevant'],
  ['S.C. Heerenveen presenteert nieuwe aanwinst', 'relevant'],
  ['s. c. Heerenveen stelt nieuwe directeur aan', 'relevant'],
  ['sc. Heerenveen speelt gelijk', 'relevant'],
  ['sc-Heerenveen kijkt vooruit', 'relevant'],
  ['sc Heerenveen-fan wint reis naar uitwedstrijd', 'relevant'],
  ['SC HEERENVEEN SLUIT AF MET OVERWINNING', 'relevant'],
  ['Sc Heerenveen: nieuwe sponsor voor het shirt', 'relevant'],
  ['Zorgen bij sc Heerenveen na blessure', 'relevant'],
  ['Jong sc Heerenveen verliest', 'relevant'],
  ['sc Heerenveen Vrouwen pakken punt', 'relevant'],
  ['Ajax - sc Heerenveen: de opstellingen', 'relevant'],
  ['“sc Heerenveen” in de ban van het stadion', 'relevant'],
  ['sc Heerenveen opent kaartverkoop (video)', 'relevant'],
  // Accents and the other order of the letters do not matter.
  ['sc Héérenveen wint', 'relevant'],
]

/** Abe Lenstra is our greatest player of all time: a headline about him belongs on the site. */
const legends: Case[] = [
  ['Abe Lenstra, onze grootste speler aller tijden', 'relevant'],
  ['Nieuw boek over Abe Lenstra verschijnt in december', 'relevant'],
  ['ABE LENSTRA-stadion krijgt nieuwe tribune', 'relevant'],
  // A known false positive: the boulevard has his name. A moderator hides such an item.
  ['Wegwerkzaamheden op de Abe Lenstra Boulevard', 'relevant'],
  ['Lenstra opent nieuwe garage in Drachten', 'irrelevant'],
]

/** Players and staff who left in 2026 are on the list, so news about them gets in. */
const leftTheClub: Case[] = [
  ['Luuk Brouwers tekent bij Omonia Nicosia', 'relevant'],
  ['Brouwers kijkt terug op zijn tijd bij Heerenveen', 'relevant'],
  ['Brouwers tekent bij Omonia Nicosia', 'doubtful'],
  ['Henk Brugge nieuwe trainer van Telstar', 'relevant'],
  ['Brugge krijgt nieuw dorpshuis', 'irrelevant'],
]

/**
 * Headlines of the recordings of the feeds of the Leeuwarder Courant and Voetbal International
 * (`fixtures`), which only write about the club, so every one of them belongs on the site. The
 * rules still miss some, which are marked: they are `doubtful`, or even `irrelevant`, because
 * the headline names neither the club nor a word or a name from the lists.
 */
const recordings: Case[] = [
  ["Vente is los bij Heerenveen: 'Er lag druk op zijn schouders'", 'relevant'],
  ['Vente van de nul af bij ruime thuiszege Heerenveen op Excelsior', 'relevant'],
  ['PSV overtuigt niet, maar wint wel van Heerenveen en legt extra druk op topper', 'relevant'],
  ['Samenvatting: PSV boekt zakelijke zege op kansen missend Heerenveen', 'relevant'],
  ['Hele persconferentie: Flamingo en Bosz over moeizame zege PSV op Heerenveen', 'relevant'],
  ['SC Heerenveen verslaat Excelsior met ruime cijfers na mooie treffers in het Abe Lenstra-stadion', 'relevant'],
  [
    'Of Robin Veldman het nu wil of niet: de spitspositie van SC Heerenveen staat met Dylan Vente ter discussie',
    'relevant',
  ],
  // A full name is enough.
  ['De comeback van Levi Smans: positief denken, positieve uitkomst', 'relevant'],
  ['Timo Zaal verkast naar Zweedse club & nieuwe aflevering van Omroep Abe', 'relevant'],
  // Missed: only a surname, no club.
  ["Veldman kritisch op kansen missende Rivera: 'Moet streng voor zichzelf zijn'", 'doubtful'],
  // Missed: the club is only "Heerenveen" and the headline has no word from football.
  ["Bosz onder de indruk van Heerenveen: 'Dit is al jaren'", 'doubtful'],
  // Heerenveen without "sc" is the club in many headlines, and a verb of winning is enough.
  ['Lees terug: Heerenveen overleeft kwartiertje onder druk en wint met 3-2 van Utrecht', 'relevant'],
  // Missed: not a word of the club in it.
  ['Elftal van de Week: geen spelers van topdrie, Friesland goed vertegenwoordigd', 'irrelevant'],
]

/** Rule 2: "Heerenveen" with a word from football or a surname from the club. */
const heerenveenWithFootball: Case[] = [
  ['Heerenveen wint belangrijke wedstrijd', 'relevant'],
  ['Heerenveen stelt nieuwe trainer voor', 'relevant'],
  ['Eredivisie: Heerenveen thuis tegen Twente', 'relevant'],
  ['Heerenveen-supporters maken zich zorgen', 'relevant'],
  ['Doelpunt in de blessuretijd bezorgt Heerenveen de zege', 'relevant'],
  ['Heerenveen verkoopt kaarten voor Abe Lenstra Stadion', 'relevant'],
  ['Heerenveen en Volendam spelen een oefenwedstrijd', 'relevant'],
  // Rule 2 does not ask whose match it is: a match of another club in the town counts too.
  ['Spits van Ajax verhuist naar Heerenveen', 'relevant'],
  ['Wedstrijd van Oranje in Heerenveen uitverkocht', 'relevant'],
  ['Robin Veldman: “Heerenveen moet scherper zijn”', 'relevant'],
  ['Dylan Vente schiet Heerenveen naar de zege', 'relevant'],
  ['Heerenveen-keeper Andries Noppert blijft', 'relevant'],
  ['Noppert blijft bij Heerenveen', 'relevant'],
  ['HEERENVEEN WINT DE WEDSTRIJD', 'relevant'],
  // A verb of winning or losing is a football word: these are headlines about a match.
  ['Heerenveen wint', 'relevant'],
  ['Heerenveen verliest in Zwolle', 'relevant'],
  // A known false positive: the word is not about football. A moderator hides such an item.
  ['Vrachtwagen verliest lading op de A7 bij Heerenveen', 'relevant'],
  ['Man wint loterij in Heerenveen', 'relevant'],
]

/** "Heerenveen" next to another professional club is a match, without a word from football. */
const otherClubCases: Case[] = [
  ['Ajax - Heerenveen: de opstellingen', 'relevant'],
  ['Heerenveen - Go Ahead Eagles', 'relevant'],
  ['Telstar en Heerenveen: de opstelling', 'relevant'],
  ['PSV tegen Heerenveen: dit zijn de kaarten', 'relevant'],
  ['Heerenveen bij N.E.C. en NEC Nijmegen', 'relevant'],
  ['Heerenveen kijkt naar Jong Ajax', 'relevant'],
  ['Heerenveen - Almere City: de uitslag', 'relevant'],
  // A club without Heerenveen says nothing.
  ['Ajax - Feyenoord: de opstellingen', 'irrelevant'],
  // A club whose short name is also a place counts only with its full name.
  ['Ongeluk op de A7 tussen Heerenveen en Groningen', 'doubtful'],
  ['Treinen tussen Heerenveen en Zwolle rijden niet', 'doubtful'],
  ['Heerenveen en Emmen kijken naar Utrecht', 'doubtful'],
  ['Groningen - Heerenveen: de opstellingen', 'doubtful'],
  ['FC Groningen - Heerenveen: de opstellingen', 'relevant'],
]

/** The full name of someone from the club is enough, with or without the club. */
const fullNames: Case[] = [
  ['Ringo Meerveld baalt van zijn reserverol', 'relevant'],
  ['Robin Veldman verlengt', 'relevant'],
  ['Mees Hilgers: “Ik wil nog beter worden”', 'relevant'],
  ['Het verhaal van Dylan Vente', 'relevant'],
  // The surname alone is not.
  ['Veldman verlengt', 'doubtful'],
  ['Hilgers: “Ik wil nog beter worden”', 'doubtful'],
  // The first name alone is not.
  ['Dylan wil naar het buitenland', 'irrelevant'],
]

/** Rule 3: only "Heerenveen", or only a surname from the club. Someone looks at it. */
const doubtful: Case[] = [
  ['Gemeente Heerenveen zoekt nieuwe wethouder', 'doubtful'],
  ['Brand in woning in Heerenveen', 'doubtful'],
  ['Vrachtwagen laat lading vallen op de A7 bij Heerenveen', 'doubtful'],
  ['Heerenveen krijgt nieuw zwembad', 'doubtful'],
  ['Heerenveen-Oost: bewoners boos over verkeersplan', 'doubtful'],
  ['Politie zoekt getuigen van inbraak in Heerenveen', 'doubtful'],
  ['Heerenveen en Opsterland werken samen aan woningbouw', 'doubtful'],
  ['Klaverboer maakt indruk', 'doubtful'],
  // Someone from another club, next to the town, without a word from football.
  ['Oud-Ajacied koopt boerderij in Heerenveen', 'doubtful'],
]

/** Rule 4: nothing to do with the club. */
const irrelevant: Case[] = [
  ['Leeuwarden krijgt nieuw museum', 'irrelevant'],
  ['sc Cambuur verliest in Leeuwarden', 'irrelevant'],
  ['Eredivisie: Ajax wint van Feyenoord', 'irrelevant'],
  ['Weer: zonnig en droog in Friesland', 'irrelevant'],
  ['Wedstrijd in Drachten afgelast', 'irrelevant'],
  ['Trainer van FC Emmen ontslagen', 'irrelevant'],
  ['', 'irrelevant'],
  ['   ', 'irrelevant'],
]

/** Words that contain a term or look like one do not count: only whole words. */
const wholeWordsOnly: Case[] = [
  // "sc" inside another word: the club is not named.
  ['Asc Heerenveen opent filiaal', 'doubtful'],
  ['Heerenveense burgemeester opent fietsroute', 'irrelevant'],
  ['Heerenveenseweg dicht door wegwerkzaamheden', 'irrelevant'],
  ['Scheerenveen is geen plaats', 'irrelevant'],
  // "Heerenveen" in a company or a street: only the town, so doubtful.
  ['Bakkerij Heerenveen BV failliet', 'doubtful'],
  ['Nieuwe rotonde op de Heerenveenweg', 'irrelevant'],
  // A football word inside a longer word: the compound is not the word.
  ['Wandelwedstrijd in Heerenveen trekt honderden deelnemers', 'doubtful'],
  ['Voetbaltoernooi voor kinderen in Heerenveen', 'doubtful'],
]

/** A name that is also a word or a common surname counts only with the full name. */
const namesLikeWords: Case[] = [
  ['De proper en nette straten van Friesland', 'irrelevant'],
  ['Dirk Proper maakt indruk', 'relevant'],
  ['Machine kapot op de markt in Heerenveen', 'doubtful'],
  ['Lanroy Machine scoort', 'relevant'],
  ['De Veldman is weer open', 'doubtful'],
  ['Smit wint ritje door Friesland', 'irrelevant'],
  // A common surname counts with "Heerenveen", and is `doubtful` on its own.
  ['Kersten bezoekt Heerenveen', 'relevant'],
  ['Kersten bezoekt de markt', 'doubtful'],
  ['Sam Kersten bezoekt Heerenveen', 'relevant'],
  // These need the full name, also with "Heerenveen".
  ['Machine kapot bij Heerenveen', 'doubtful'],
  ['Proper verslag van Heerenveen', 'doubtful'],
]

describe('judgeRelevance', () => {
  describe.each([
    ['names the club', namesTheClub],
    ['names Heerenveen with football', heerenveenWithFootball],
    ['is doubtful', doubtful],
    ['is irrelevant', irrelevant],
    ['looks at whole words only', wholeWordsOnly],
    ['treats names like words with care', namesLikeWords],
    ['names another professional club', otherClubCases],
    ['names a full name', fullNames],
    ['names a legend', legends],
    ['names someone who left the club', leftTheClub],
    ['the recordings of the club feeds', recordings],
  ] as [string, Case[]][])('%s', (_name, cases) => {
    it.each(cases)('%j is %s', (title, expected) => {
      expect(judgeRelevance(title)).toBe(expected)
    })
  })

  it('gives the headlines from the logs the value the project owner gave them', () => {
    for (const [title, expected] of fromTheLogs) {
      expect(judgeRelevance(title), title).toBe(expected)
    }
  })

  it('does not depend on the case or on accents', () => {
    expect(judgeRelevance('SC HEERENVEEN')).toBe('relevant')
    expect(judgeRelevance('sc heerenveen')).toBe('relevant')
    expect(judgeRelevance('Sc Heerénvéén')).toBe('relevant')
    expect(judgeRelevance('Roberts Uldriķis kiest voor Heerenveen')).toBe('relevant')
    expect(judgeRelevance('Uldrikis')).toBe('doubtful')
    expect(judgeRelevance('Roberts Uldrikis')).toBe('relevant')
  })

  it('gives the same answer for the same headline', () => {
    const title = 'Heerenveen wint belangrijke wedstrijd'

    expect(judgeRelevance(title)).toBe(judgeRelevance(title))
  })
})

describe('normaliseTitle', () => {
  it.each([
    ['sc Heerenveen', ['sc', 'heerenveen']],
    ['S.C. Heerenveen', ['sc', 'heerenveen']],
    ['s.c.Heerenveen', ['sc', 'heerenveen']],
    ['sc Heerenveen-fan', ['sc', 'heerenveen', 'fan']],
    ['“Héérenveen!”', ['heerenveen']],
    ['Uldriķis', ['uldrikis']],
    ["Abe Lenstra's stadion", ['abe', 'lenstra', 's', 'stadion']],
    ['', []],
  ])('%j gives %j', (title, tokens) => {
    expect(normaliseTitle(title)).toEqual(tokens)
  })
})

describe('the lists of names and words', () => {
  const normalised = (term: string) => normaliseTitle(term).join(' ')

  it('hold terms that are already normalised, so they match what a headline gives', () => {
    for (const term of [...clubPeople, ...clubSurnames, ...footballWords, ...otherClubs]) {
      expect(term, `"${term}" is not normalised`).toBe(normalised(term))
    }
  })

  it('hold no term twice', () => {
    const all = [...clubPeople, ...clubSurnames, ...footballWords, ...otherClubs]

    expect(new Set(all).size).toBe(all.length)
  })

  it('hold a full name of more than one word, and a surname that ends one of the full names', () => {
    for (const name of clubPeople) {
      expect(name.split(' ').length, `"${name}" is not a full name`).toBeGreaterThan(1)
    }
    for (const surname of clubSurnames) {
      expect(
        clubPeople.some((name) => name.endsWith(` ${surname}`)),
        `"${surname}" is the surname of nobody on the list`,
      ).toBe(true)
    }
  })

  it('keep the club and the town out of the football words', () => {
    expect(footballWords).not.toContain('heerenveen')
    expect(footballWords).not.toContain('sc')
    expect(otherClubs).not.toContain('heerenveen')
    expect(otherClubs).not.toContain('sc heerenveen')
    expect(otherClubs).not.toContain('jong sc heerenveen')
  })
})

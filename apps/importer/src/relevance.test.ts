import type { ItemRelevance } from '@fansite/db/schema'

import { describe, expect, it } from 'vitest'

import type { MatchDay } from './relevance.ts'

import {
  clubNames,
  clubPeople,
  clubPrefixes,
  clubSurnames,
  footballWords,
  frisianFootballWords,
  lookalikeClubs,
  ordinaryClubWords,
  otherClubFullNames,
  otherClubGroups,
  otherClubs,
} from './relevance-terms.ts'
import { clubsNamed, judgeRelevance, normaliseTitle, opponentsAround } from './relevance.ts'

type Case = [title: string, expected: ItemRelevance]

/*
 * The cases are made-up headlines in the style of a regional newspaper, one list per rule. The
 * headlines the project owner judged are in `fromTheLogs`: add `[title, 'relevant' |
 * 'doubtful' | 'irrelevant']` and the test picks it up.
 * Use headlines as the source wrote them, and the value the filter should give them.
 */

/**
 * The headlines of a quiz the project owner judged on 25 October 2026 (#267): 21 real ones
 * from the feeds of Omrop Fryslân, NOS and Voetbal International, and 5 made-up ones
 * (verzonnen). The value is what `judgeRelevance` should give, not always what the owner said,
 * and the comments say where the two differ. The 26th headline, "Man wint loterij in
 * Heerenveen", is in `knownFalsePositives`.
 */
const fromTheLogs: Case[] = [
  // Omrop Fryslân
  ['Marte Hieke van der Kamp sluit NK af met titel | Vrouwen sc Heerenveen winnen van AZ', 'relevant'],
  ['Sc Heerenveen sleept overwinning eruit bij ADO, maar het was zwaar: "Maken het onszelf moeilijk"', 'relevant'],
  ['Lees terug: Heerenveen overleeft Haags kwartiertje en wint met 3-2 van ADO Den Haag', 'relevant'],
  // NOS
  ['Heerenveen zet ADO terug op aarde in regenachtig Den Haag', 'relevant'],
  // Omrop Fryslân
  ['Ringo Meerveld baalt van zijn reserverol: "Dit moet niet te lang duren"', 'relevant'],
  /*
   * The owner said "not relevant" to these three, and the filter says `doubtful`. A visitor
   * sees no difference, because both are hidden. "Heerenveen" alone, or only a surname, is
   * `doubtful` on purpose (#74). "Schreuder" is also the surname of the goalkeeper of the club.
   */
  ['Man in Heerenveen bewusteloos geslagen na aanspreken groep', 'doubtful'],
  ['Hele weekend geen treinen tussen Heerenveen en Leeuwarden', 'doubtful'],
  // Voetbal International
  ['Schreuder heeft simpele verklaring voor tegengoals NEC', 'doubtful'],
  // About other clubs, players or places: not the club.
  // Omrop Fryslân
  ['Nicolas Binder belangrijk voor Cambuur bij 1-6 tegen Willem II: "Alles lukt op dit moment"', 'irrelevant'],
  ['Lees terug: Cambuur boekt grootste overwinning ooit in eredivisie: 6-1 winst op Willem II', 'irrelevant'],
  // NOS
  ["Gedoodverfde degradant Cambuur staat opeens tiende, dankzij 'monster' in de spits", 'irrelevant'],
  // Omrop Fryslân
  ['OG Capitals wint na spannend duel Friese ijshockeyderby: "Het is niet zomaar een wedstrijd"', 'irrelevant'],
  // NOS
  ['Fortuna Sittard houdt aan kleurloos duel met Excelsior op valreep drie punten over', 'irrelevant'],
  // Voetbal International
  ['Míchel vertelt wanneer hij Berghuis, Henrique en Gaaei terugverwacht', 'irrelevant'],
  ["Míchel ook kritisch op Tolu: 'Ik houd van hem, maar...'", 'irrelevant'],
  ["Shiloh 't Zand neemt Danny Buijs niets kwalijk: 'Heb af en toe een schop onder de kont nodig'", 'irrelevant'],
  ['Buijs en Fortuna in gesprek over nieuw contract', 'irrelevant'],
  ['Ouazane dankt tip Berghuis voor zijn treffer', 'irrelevant'],
  ["Zechiël tevreden na punt tegen PSV: 'Had bij rust 2-0 of 3-0 kunnen staan'", 'irrelevant'],
  ["Toornstra trots, maar ook zelfkritisch: 'Alsof het mijn vijfde duel was'", 'irrelevant'],
  ["'Petrovic aan de slag in Saoedi-Arabië'", 'irrelevant'],
  /*
   * Made up (verzonnen). The quiz table expected `irrelevant` for the first, second and last,
   * but the filter gives `doubtful`: each names "Heerenveen" alone ("VVV" is not on the list
   * of clubs, only VVV-Venlo is, and neither is "Groningen" or "Zwolle" without a full club
   * name). The owner said "not relevant", and both values are hidden.
   */
  ['Nieuw VVV-kantoor in Heerenveen', 'doubtful'],
  ['Ongeluk op de A7 tussen Heerenveen en Groningen', 'doubtful'],
  ['Ajax - Heerenveen: de opstellingen', 'relevant'],
  ['Heerenveen en Zwolle: wat de nieuwe treinverbinding betekent voor forenzen', 'doubtful'],
]

/**
 * Headlines the owner does not want shown, which the filter shows anyway. They stay visible
 * here, so nobody repairs them by accident with a rule that misses headlines about the club.
 * The value is what the filter gives now: if the rule changes, this test changes with it.
 */
const knownFalsePositives: Case[] = [
  /*
   * Made up (verzonnen). The owner said "not relevant", but "wint" is a football word on
   * purpose: a club headline we miss is worse than a headline a moderator hides (see the
   * decision "Een volledige naam is genoeg, en "wint" en "verliest" zijn voetbalwoorden" in
   * `docs/beslissingen/importer.md`).
   */
  ['Man wint loterij in Heerenveen', 'relevant'],
]

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
  // Was missed: two surnames, no club (#1006).
  ["Veldman kritisch op kansen missende Rivera: 'Moet streng voor zichzelf zijn'", 'relevant'],
  // Missed: the club is only "Heerenveen" and the headline has no word from football.
  ["Bosz onder de indruk van Heerenveen: 'Dit is al jaren'", 'doubtful'],
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
  // Heerenveen without "sc" is the club in many headlines, and a verb of winning is enough.
  ['Lees terug: Heerenveen overleeft kwartiertje onder druk en wint met 3-2 van Utrecht', 'relevant'],
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
  ['Heerenveen - VVV-Venlo: de opstellingen', 'relevant'],
  // The tourist office is a VVV too: a club counts with its place only.
  ['Nieuw VVV-kantoor in Heerenveen', 'doubtful'],
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

/** Rule 3b: surnames from the club without "Heerenveen" (#1006). Made-up headlines. */
const surnamesAlone: Case[] = [
  // Two different surnames.
  ['Veldman in plaats van Hilgers?', 'relevant'],
  ['Kersten of Willemsen: wie start er vrijdag?', 'relevant'],
  // One surname with a word from football, also "basis".
  ['Hilgers keert terug in de basis', 'relevant'],
  ['Veldman scoort twee keer', 'relevant'],
  // One surname alone, or the same one twice, stays doubtful.
  ['Veldman verlengt, Veldman blij', 'doubtful'],
  ['Hilgers bezoekt de markt', 'doubtful'],
  // A surname that is an ordinary word is not on the list.
  ['Bakker en Zaal bezoeken de markt', 'irrelevant'],
  // A player of another club does not count.
  ['Mbappé in plaats van Haaland?', 'irrelevant'],
  ['Haaland scoort twee keer', 'irrelevant'],
  // "basis" is a football word.
  ['Nieuwe basis voor Heerenveen', 'relevant'],
]

/** Rule 4: nothing to do with the club. */
const irrelevant: Case[] = [
  ['Leeuwarden krijgt nieuw museum', 'irrelevant'],
  ['sc Cambuur verliest in Leeuwarden', 'irrelevant'],
  ['Eredivisie: Ajax wint van Feyenoord', 'irrelevant'],
  ['Weer: zonnig en droog in Friesland', 'irrelevant'],
  ['Wedstrijd in Drachten afgelast', 'irrelevant'],
  ['Trainer van FC Emmen ontslagen', 'irrelevant'],
  // Other sport from the same region: the ice rink Thialf, and the ice hockey club of Nijmegen.
  ['Schaatsers strijden in Thialf om de laatste WK-tickets', 'irrelevant'],
  ['Nijmegen Devils laat in de ijshal een punt liggen', 'irrelevant'],
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

/**
 * Rule 1 to 3 in Frisian: the club is "Hearrenfean", the Frisian name of the town and the
 * club. All made up (verzonnen) except three real headlines, which are marked: two from the
 * feed of Omrop Fryslân, which is nearly all Dutch and had no Frisian headline about the club
 * on 25 October 2026 (see `docs/bronnen.md`), and the title of Sportcast #360 from the lookup
 * of Apple Podcasts.
 */
const frisianClub: Case[] = [
  // "sc Hearrenfean", in every spelling of "sc".
  ['sc Hearrenfean wint fan Ajax', 'relevant'],
  ['SC Hearrenfean ferlear thús mei 0-2', 'relevant'],
  ['S.C. Hearrenfean presintearret nije oanwinst', 'relevant'],
  ['sc-Hearrenfean sjocht foarút', 'relevant'],
  ['sc Hearrenfean-fan wint reis', 'relevant'],
  ['SC HEARRENFEAN SLUT AF MEI OERWINNING', 'relevant'],
  ['Jong sc Hearrenfean wûn', 'relevant'],
  ['Nij seizoen foar sc Hearrenfean Froulju', 'relevant'],
  // Accents do not matter.
  ['sc Hearrenfeân wint', 'relevant'],
  // The club in Dutch and Frisian in one headline.
  ['Hearrenfean (Heerenveen) wint fan Ajax', 'relevant'],
  ['sc Heerenveen en sc Hearrenfean yn ien kop', 'relevant'],
  // "Hearrenfean" with a word from football, Dutch or Frisian.
  ['Hearrenfean wint belangrike wedstriid', 'relevant'],
  ['Hearrenfean wint belangrijke wedstrijd', 'relevant'],
  ['Hearrenfean wûn mei 3-2 fan Utrecht', 'relevant'],
  ['Hearrenfean-supporters meitsje har soargen', 'relevant'],
  ['Nije trener foar Hearrenfean', 'relevant'],
  ['Nije haadtrainer foar Hearrenfean', 'relevant'],
  ['Thúswedstriden fan Hearrenfean útferkocht', 'relevant'],
  ['Hearrenfean slút kompetysje ôf mei in oerwinning', 'relevant'],
  ['Seleksje fan Hearrenfean bekend', 'relevant'],
  ['Ferdigener sjocht nei Hearrenfean', 'relevant'],
  ['Middenfjilder tekenet by Hearrenfean', 'relevant'],
  ['Earedifyzje: Hearrenfean thús tsjin Twente', 'relevant'],
  ['Hearrenfean en Volendam spylje in oefenwedstrijd', 'relevant'],
  ['Hearrenfean wûn mei 2-0 fan Cambuur', 'relevant'],
  // "Hearrenfean" with a surname from the club or with another professional club.
  ['Vente skoarde twa kear foar Hearrenfean', 'relevant'],
  ['Robin Veldman: "Hearrenfean moat skerper wêze"', 'relevant'],
  ['Ajax - Hearrenfean: de opstellingen', 'relevant'],
  ['Hearrenfean tsjin Go Ahead Eagles', 'relevant'],
  ['Hearrenfean - FC Groningen', 'relevant'],
  // Only "Hearrenfean", only a surname: someone looks at it.
  ['Gemeente Hearrenfean sykjt nije wethâlder', 'doubtful'],
  ['Brân yn wenning yn Hearrenfean', 'doubtful'],
  ['Treinen tusken Hearrenfean en Ljouwert reitsje net', 'doubtful'],
  ['Hearrenfean en Ljouwert wurkje gear oan nij swimbad', 'doubtful'],
  ['De plak It Hearrenfean krijt in nij swimbad', 'doubtful'],
  ['Hearrenfean-Eaost: bewenners lilk oer ferkearsplan', 'doubtful'],
  ['Veldman is der klear foar', 'doubtful'],
  ['Hearrenfean en Heerenveen wurkje gear', 'doubtful'],
  // Whole words only.
  ['Asc Hearrenfean iepenet filiaal', 'doubtful'],
  ['Hearrenfeanwei dicht troch wurkseamheden', 'irrelevant'],
  ['Scheerenfean is gjin plak', 'irrelevant'],
  // The Frisian football words are not enough without the name.
  ['Wedstriid yn Dokkum ôfset', 'irrelevant'],
  ['Trener fan FC Emmen ûntslein', 'irrelevant'],
  ['Cambuur ferlear thús fan Willem II', 'irrelevant'],
  ['Ajax wûn fan Feyenoord', 'irrelevant'],
  ['sc Cambuur wûn yn Ljouwert', 'irrelevant'],
  ['Cambuur - Willem II: de opstellingen', 'irrelevant'],
  // A real Frisian headline: the title of Sportcast #360 of 19 October 2026, from the lookup of
  // Apple Podcasts. The full name of someone from the club is enough.
  ['#360: Foeke Booy bijna naar WK 1990, Cambuur lilk op skiedsrjochter en is Dylan Vente no echt los?', 'relevant'],
  // Real headlines of the feed of Omrop Fryslân, with Frisian words but not about the club:
  // the filter leaves them alone.
  ['Eropuit dit weekend? Dit is er te doen in Fryslân', 'irrelevant'],
  ['Liwwadder Gerard Roorda vond in Marokko de tweede grote liefde van zijn leven', 'irrelevant'],
  // Words that are an ordinary word as much as football are not on the list, so these stay
  // `doubtful`: "ploech" (a crew), "spiler" (a player of anything), "útslach" (a result or a
  // rash), "kampioenskip" (fierljeppen and skûtsjesilen have one too) and "ferlies" (a loss).
  ['Ploech frijwilligers helpt yn Hearrenfean', 'doubtful'],
  ['Spiler fan kaartklup yn Hearrenfean ûnderskieden', 'doubtful'],
  ['Útslach fan de ferkiezings yn Hearrenfean', 'doubtful'],
  ['Kampioenskip fierljeppen yn Hearrenfean', 'doubtful'],
  ['Ferlies foar bedriuw yn Hearrenfean', 'doubtful'],
  // Known false positives, like "Man wint loterij in Heerenveen": the verbs of winning and
  // losing are football words on purpose. A moderator hides such an item.
  ['Frou wûn lotterij yn Hearrenfean', 'relevant'],
  ['Frou ferlear har tas yn Hearrenfean', 'relevant'],
]

/** "Feanster" is the adjective ("of Heerenveen"): it is not the name of the club. */
const frisianAdjective: Case[] = [
  ['Feanster boer wint priis', 'irrelevant'],
  ['Feanster wedstriid útsteld', 'irrelevant'],
  ['Feanster supporter helle yn Ljouwert', 'irrelevant'],
  ['Feanster trener fan it jier', 'irrelevant'],
  ['Feanster winkelsintrum iepen', 'irrelevant'],
  // With the name of the club the name decides, and the adjective adds nothing.
  ['Feanster boer hat nije skuorre yn Hearrenfean', 'doubtful'],
  ['Feanster boer yn Heerenveen', 'doubtful'],
  ['Feanster trener by Hearrenfean', 'relevant'],
  ['Feanster supporter fan sc Hearrenfean', 'relevant'],
]

describe('judgeRelevance', () => {
  describe.each([
    ['names the club', namesTheClub],
    ['names Heerenveen with football', heerenveenWithFootball],
    ['is doubtful', doubtful],
    ['names surnames from the club', surnamesAlone],
    ['is irrelevant', irrelevant],
    ['looks at whole words only', wholeWordsOnly],
    ['treats names like words with care', namesLikeWords],
    ['names another professional club', otherClubCases],
    ['names a full name', fullNames],
    ['names a legend', legends],
    ['names someone who left the club', leftTheClub],
    ['the recordings of the club feeds', recordings],
    ['names the club in Frisian', frisianClub],
    ['does not take the Frisian adjective for the club', frisianAdjective],
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

  it('gives the known false positives the value the filter gives them now', () => {
    for (const [title, expected] of knownFalsePositives) {
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

const match = (opponent: string, matchDate: string, status: MatchDay['status'] = 'scheduled'): MatchDay => ({
  matchDate,
  opponent,
  status,
})

/** The value of a headline published at `publishedAt`, with the matches of the season. */
const judgeAt = (title: string, publishedAt: string, matches: MatchDay[]) =>
  judgeRelevance(title, opponentsAround(new Date(publishedAt), matches))

describe('the opponent of a match', () => {
  const ado = [match('ADO Den Haag', '2026-10-24', 'played')]

  it('makes a headline about the opponent relevant, without the name of the club', () => {
    expect(judgeRelevance('ADO beleeft frustrerende avond', [])).toBe('irrelevant')
    expect(judgeRelevance('ADO beleeft frustrerende avond', ['ADO Den Haag'])).toBe('relevant')
    expect(
      judgeRelevance("ADO beleeft frustrerende avond: 'Ongelofelijk dat je geen punt pakt'", ['ADO Den Haag']),
    ).toBe('relevant')
  })

  it('makes a headline relevant that is doubtful on its own when it also names the opponent', () => {
    expect(judgeRelevance('Veldman kijkt uit naar ADO', [])).toBe('doubtful')
    expect(judgeRelevance('Veldman kijkt uit naar ADO', ['ADO Den Haag'])).toBe('relevant')
    expect(judgeRelevance('Supporters in Heerenveen kijken uit naar ADO', ['ADO Den Haag'])).toBe('relevant')
  })

  it('changes nothing for a headline without the opponent, and nothing without opponents', () => {
    for (const [title, expected] of [...namesTheClub, ...doubtful, ...irrelevant]) {
      expect(judgeRelevance(title, []), title).toBe(judgeRelevance(title))
      // An opponent that the headline doesn't name changes nothing.
      expect(judgeRelevance(title, ['Telstar']), title).toBe(expected)
    }
  })

  it('does not make a headline about another club relevant', () => {
    expect(judgeRelevance('Feyenoord wint na rommelige wedstrijd', ['ADO Den Haag'])).toBe('irrelevant')
  })

  it('does not take the ice hockey club of Nijmegen, or the ice rink Thialf, for the opponent', () => {
    for (const opponent of ['N.E.C.', 'Go Ahead Eagles']) {
      expect(judgeRelevance('Nijmegen Devils laat in de ijshal een punt liggen', [opponent])).toBe('irrelevant')
      expect(judgeRelevance('Schaatsers strijden in Thialf om de laatste WK-tickets', [opponent])).toBe('irrelevant')
    }
  })

  describe('a headline that names another professional club as well', () => {
    it.each([
      // The opponent only: it counts.
      ['ADO Den Haag', 'ADO beleeft frustrerende avond', 'relevant'],
      ['N.E.C.', 'Weer geen overwinning voor N.E.C.: "Wordt nu weleens tijd"', 'relevant'],
      // The opponent and another club of the list: another match, so it does not count.
      [
        'N.E.C.',
        'NEC kan historische uitzege geen vervolg geven: ploeg speelt gelijk tegen FC Groningen',
        'irrelevant',
      ],
      ['ADO Den Haag', 'LIVE KNVB-beker | ADO trapt bekerweek af met uitwedstrijd bij Excelsior’31', 'irrelevant'],
      ['ADO Den Haag', 'Ajax en ADO strijden om een plek', 'irrelevant'],
      ['ADO Den Haag', 'ADO Den Haag wint van Vitesse', 'irrelevant'],
      // A club named after a place counts as another club only with its full name.
      ['N.E.C.', 'N.E.C. komt terug van achterstand tegen counterend Groningen', 'relevant'],
      ['N.E.C.', 'N.E.C. komt terug van achterstand tegen FC Groningen', 'irrelevant'],
      // Two names of the same club are one club.
      ['ADO Den Haag', 'ADO Den Haag: ADO beleeft frustrerende avond', 'relevant'],
      ['N.E.C.', 'NEC Nijmegen verrast: N.E.C. wint', 'relevant'],
      // An opponent not on the list is not "Excelsior" of Rotterdam, another club.
      ['Excelsior Maassluis', 'Excelsior Maassluis verrast', 'relevant'],
      ['Excelsior Maassluis', 'Excelsior Maassluis verrast Ajax', 'irrelevant'],
      ['Excelsior Maassluis', 'Excelsior Maassluis tegen Excelsior', 'irrelevant'],
      ['Quick Boys', 'Quick Boys verrast', 'relevant'],
    ] as [string, string, ItemRelevance][])('%s: %j is %s', (opponent, title, expected) => {
      expect(judgeRelevance(title, [opponent])).toBe(expected)
    })

    it.each([
      // The Rotterdam opponents, by the short name a headline uses.
      ['Feyenoord', 'Feyenoord-trainer waarschuwt voor de eigen fouten', 'relevant'],
      ['Sparta Rotterdam', 'Sparta zoekt na de pauze een nieuwe doelman', 'relevant'],
      ['Sparta Rotterdam', 'Sparta Rotterdam zoekt een nieuwe doelman', 'relevant'],
      ['Excelsior Rotterdam', 'Excelsior verlengt met de keeper', 'relevant'],
      // Two of them in one headline are about their own match.
      ['Feyenoord', 'Feyenoord en Sparta strijden om de derby van de stad', 'irrelevant'],
      ['Sparta Rotterdam', 'Feyenoord en Sparta strijden om de derby van de stad', 'irrelevant'],
      // A Rotterdam club that is not the opponent of this match.
      ['Sparta Rotterdam', 'Feyenoord verlengt het contract van de trainer', 'irrelevant'],
      ['Feyenoord', 'Excelsior verlengt met de keeper', 'irrelevant'],
      // "Sparta" is also the club in Prague, and the adjective is a word of its own.
      ['Sparta Rotterdam', 'Sparta Praag verrast in de Conference League', 'irrelevant'],
      ['Sparta Rotterdam', 'Sparta Prague verrast in de Conference League', 'irrelevant'],
      ['Sparta Rotterdam', 'Spartaanse training in de regen', 'irrelevant'],
      ['Feyenoord', 'Sparta Praag verrast in de Conference League', 'irrelevant'],
      // A match against the club in Prague is no match against the club in Rotterdam, and the
      // other way round.
      ['Feyenoord', 'Feyenoord wint bij Sparta Praag', 'relevant'],
      ['Sparta Rotterdam', 'Sparta Rotterdam verrast, Sparta Praag ook', 'relevant'],
    ] as [string, string, ItemRelevance][])('%s: %j is %s', (opponent, title, expected) => {
      expect(judgeRelevance(title, [opponent])).toBe(expected)
    })

    it.each([
      // "De treffers" is the club in Groesbeek and also the plural of the word for a goal.
      ['De Treffers', 'De Treffers verrast in de beker', 'relevant'],
      ['De Treffers', 'De Treffers-trainer Janssen kijkt vooruit', 'relevant'],
      // Another professional club in the headline makes it about another match.
      ['De Treffers', 'De Treffers verrast Heracles', 'irrelevant'],
      ['De Treffers', 'Trainer van De Treffers kijkt vooruit', 'relevant'],
      ['De Treffers', 'De treffers van Napoli, Koopmeiners en Lang', 'irrelevant'],
      ['De Treffers', 'DE TREFFERS VAN NAPOLI, KOOPMEINERS EN LANG', 'irrelevant'],
      // The phrase is left out, so the rest of the headline counts as it did.
      ['De Treffers', 'De treffers van Napoli, en De Treffers verrast', 'relevant'],
      ['De Treffers', 'De treffers van Napoli in de topper tegen Ajax', 'irrelevant'],
      // It touches no other opponent: the headline names the club by its own name.
      ['N.E.C.', 'De treffers van N.E.C. in de laatste minuten', 'relevant'],
      ['Sparta Rotterdam', 'Sparta verrast met de treffers van de spits', 'relevant'],
      // Another opponent's window: a headline that uses the phrase is not about De Treffers.
      ['Ajax', 'De treffers van Napoli, Koopmeiners en Lang', 'irrelevant'],
    ] as [string, string, ItemRelevance][])('%s: %j is %s', (opponent, title, expected) => {
      expect(judgeRelevance(title, [opponent])).toBe(expected)
    })

    it('does not count a headline that names two opponents of the window of one item', () => {
      expect(judgeRelevance('ADO en N.E.C. bereiden zich voor', ['ADO Den Haag', 'N.E.C.'])).toBe('irrelevant')
      expect(judgeRelevance('ADO bereidt zich voor', ['ADO Den Haag', 'N.E.C.'])).toBe('relevant')
    })

    it('changes nothing for a headline that names Heerenveen, whatever other clubs it names', () => {
      expect(judgeRelevance('Ajax - Heerenveen: de opstellingen', ['ADO Den Haag'])).toBe('relevant')
      expect(judgeRelevance('Ajax - Heerenveen: de opstellingen', [])).toBe('relevant')
    })
  })

  describe('the window of 3 days before and 3 days after, in Dutch time', () => {
    const day = (publishedAt: string) => judgeAt('ADO beleeft frustrerende avond', publishedAt, ado)

    it.each([
      ['on the day of the match', '2026-10-24T20:00:00+02:00', 'relevant'],
      ['3 days before', '2026-10-21T12:00:00+02:00', 'relevant'],
      ['3 days after', '2026-10-27T23:59:00+01:00', 'relevant'],
      ['4 days before', '2026-10-20T23:59:00+02:00', 'irrelevant'],
      ['7 days before', '2026-10-17T12:00:00+02:00', 'irrelevant'],
      ['4 days after', '2026-10-28T00:00:00+01:00', 'irrelevant'],
      ['7 days after', '2026-10-31T23:59:00+01:00', 'irrelevant'],
    ])('is %s: %s is %s', (_name, publishedAt, expected) => {
      expect(day(publishedAt)).toBe(expected)
    })

    // The clocks went back on 25 October 2026, at 3:00 to 2:00.
    it('counts the day as a reader in the Netherlands saw it, at midnight of the change to winter time', () => {
      const match1 = [match('ADO Den Haag', '2026-10-28')]

      // 00:30 on 25 October (22:30 UTC on the 24th): 3 days before, although UTC says the 24th.
      expect(judgeAt('ADO in vorm', '2026-10-24T22:30:00Z', match1)).toBe('relevant')
      // 23:30 on 24 October (21:30 UTC): 4 days before.
      expect(judgeAt('ADO in vorm', '2026-10-24T21:30:00Z', match1)).toBe('irrelevant')

      const match2 = [match('ADO Den Haag', '2026-10-22')]

      // 23:30 on 25 October, after the change (22:30 UTC): 3 days after.
      expect(judgeAt('ADO in vorm', '2026-10-25T22:30:00Z', match2)).toBe('relevant')
      // 00:30 on 26 October (23:30 UTC on the 25th): 4 days after, although UTC says the 25th.
      expect(judgeAt('ADO in vorm', '2026-10-25T23:30:00Z', match2)).toBe('irrelevant')
    })

    it('counts the matches of a played, a scheduled and a cup round the same', () => {
      for (const status of ['played', 'scheduled'] as const) {
        expect(judgeAt('ADO in vorm', '2026-10-24T12:00:00Z', [match('ADO Den Haag', '2026-10-24', status)])).toBe(
          'relevant',
        )
      }
    })

    it('does not count a postponed match without a new date', () => {
      expect(judgeAt('ADO in vorm', '2026-10-24T12:00:00Z', [match('ADO Den Haag', '2026-10-24', 'postponed')])).toBe(
        'irrelevant',
      )
    })

    it('does not count a cancelled match, which has no new date either', () => {
      expect(judgeAt('ADO in vorm', '2026-10-24T12:00:00Z', [match('ADO Den Haag', '2026-10-24', 'cancelled')])).toBe(
        'irrelevant',
      )
    })

    it('gives every match of a club its own window', () => {
      const twice = [match('ADO Den Haag', '2026-10-24', 'played'), match('ADO Den Haag', '2027-02-14')]

      expect(judgeAt('ADO in vorm', '2026-10-27T12:00:00Z', twice)).toBe('relevant')
      expect(judgeAt('ADO in vorm', '2026-12-01T12:00:00Z', twice)).toBe('irrelevant')
      expect(judgeAt('ADO in vorm', '2027-02-11T12:00:00Z', twice)).toBe('relevant')
      expect(
        opponentsAround(new Date('2026-10-24T12:00:00Z'), [...twice, match('ADO Den Haag', '2026-10-27')]),
      ).toEqual(['ADO Den Haag', 'ADO Den Haag'])
    })

    it('counts only the opponent of the match in the window', () => {
      const matches = [match('ADO Den Haag', '2026-10-24', 'played'), match('Ajax', '2026-11-24')]

      expect(judgeAt('Ajax maakt zich op', '2026-10-24T12:00:00Z', matches)).toBe('irrelevant')
      expect(judgeAt('Ajax maakt zich op', '2026-11-21T12:00:00Z', matches)).toBe('relevant')
    })

    it('works as before without matches', () => {
      expect(judgeAt('ADO in vorm', '2026-10-24T12:00:00Z', [])).toBe('irrelevant')
      expect(opponentsAround(new Date('2026-10-24T12:00:00Z'), [])).toEqual([])
    })
  })

  describe('the window that opens after both previous matches (#1008)', () => {
    // We play FC Groningen on Saturday 21 November 2026, after a break for the national teams.
    const day = '2026-11-21'
    const groningen = (opponentPreviousDay: null | string | undefined) => ({
      ...match('FC Groningen', day),
      ...(opponentPreviousDay === undefined ? {} : { opponentPreviousDay }),
    })
    const ours = (matchDate: string, status: MatchDay['status'] = 'played') => match('Ajax', matchDate, status)
    /** The headline of the day, at noon in Dutch time. */
    const about = (publishedDay: string, matches: MatchDay[]) =>
      judgeAt('FC Groningen maakt zich op', `${publishedDay}T12:00:00+01:00`, matches)

    it('is the same as before in a normal week: the previous matches are less than 3 days ahead', () => {
      // We played on Wednesday the 18th, they on Sunday the 15th: the window would open on the
      // 19th, but it never opens later than 3 days before the match.
      const matches = [ours('2026-11-18'), groningen('2026-11-15')]

      expect(about('2026-11-18', matches)).toBe('relevant')
      expect(about('2026-11-17', matches)).toBe('irrelevant')
    })

    it('opens the day after the later of the two previous matches, when that is within 5 days', () => {
      // We played on the 12th, they on the 16th: it opens on the 17th, 4 days before.
      const matches = [ours('2026-11-12'), groningen('2026-11-16')]

      expect(about('2026-11-17', matches)).toBe('relevant')
      expect(about('2026-11-16', matches)).toBe('irrelevant')
      expect(about('2026-11-21', matches)).toBe('relevant')
    })

    it('opens the day after our match when ours is the later one', () => {
      const matches = [ours('2026-11-16'), groningen('2026-11-10')]

      expect(about('2026-11-17', matches)).toBe('relevant')
      expect(about('2026-11-16', matches)).toBe('irrelevant')
    })

    it('opens at the earliest 5 days before the match, after a break of more than 5 days', () => {
      // Both played on 1 November: the day after is 20 days before, but it opens on the 16th.
      const matches = [ours('2026-11-01'), groningen('2026-11-01')]

      expect(about('2026-11-16', matches)).toBe('relevant')
      expect(about('2026-11-15', matches)).toBe('irrelevant')
    })

    it('opens 5 days before, not 6, after the day after the previous matches is 6 days before', () => {
      // We played on the 14th, they on the 13th: the day after is the 15th, 6 days before.
      const matches = [ours('2026-11-14'), groningen('2026-11-13')]

      expect(about('2026-11-16', matches)).toBe('relevant')
      expect(about('2026-11-15', matches)).toBe('irrelevant')
    })

    it('leaves no gap from Friday to Sunday: it opens 3 days before a Sunday match', () => {
      // They play on Friday 20 November, we play on Sunday the 22nd: it opens on the 19th.
      const matches = [
        ours('2026-11-15'),
        { ...match('FC Groningen', '2026-11-22'), opponentPreviousDay: '2026-11-20' },
      ]

      expect(about('2026-11-19', matches)).toBe('relevant')
      expect(about('2026-11-18', matches)).toBe('irrelevant')
      expect(about('2026-11-22', matches)).toBe('relevant')
    })

    it('closes 3 days after the match, as before', () => {
      const matches = [ours('2026-11-10'), groningen('2026-11-10')]

      expect(about('2026-11-24', matches)).toBe('relevant')
      expect(about('2026-11-25', matches)).toBe('irrelevant')
    })

    it('counts the day in Dutch time at the edge of the window', () => {
      const matches = [ours('2026-11-12'), groningen('2026-11-16')]

      // 00:30 on the 17th in the Netherlands is 23:30 UTC on the 16th.
      expect(judgeAt('FC Groningen maakt zich op', '2026-11-16T23:30:00Z', matches)).toBe('relevant')
      // 23:30 on the 16th in the Netherlands is 22:30 UTC.
      expect(judgeAt('FC Groningen maakt zich op', '2026-11-16T22:30:00Z', matches)).toBe('irrelevant')
    })

    it('opens 3 days before when the previous match of the opponent is not known', () => {
      for (const known of [null, undefined]) {
        const matches = [ours('2026-11-10'), groningen(known)]

        expect(about('2026-11-18', matches)).toBe('relevant')
        expect(about('2026-11-17', matches)).toBe('irrelevant')
      }
    })

    it('opens 3 days before when we have no previous match, at the start of the season', () => {
      const matches = [groningen('2026-11-10')]

      expect(about('2026-11-18', matches)).toBe('relevant')
      expect(about('2026-11-17', matches)).toBe('irrelevant')
    })

    it('counts a planned match of ours as the previous match, and not one that was postponed or cancelled', () => {
      // The match of the 10th was played and the one of the 17th is planned: the 17th is the
      // previous one, so the window opens on the 18th. The postponed and the cancelled match
      // count for nothing.
      const matches = [
        ours('2026-11-10'),
        ours('2026-11-19', 'postponed'),
        ours('2026-11-20', 'cancelled'),
        ours('2026-11-17', 'scheduled'),
        groningen('2026-11-08'),
      ]
      const withoutPlanned = matches.filter(
        (candidate) => candidate.opponent !== 'Ajax' || candidate.status !== 'scheduled',
      )

      expect(about('2026-11-17', matches)).toBe('irrelevant')
      expect(about('2026-11-18', matches)).toBe('relevant')
      // Without the planned match the previous one is the 10th, and it opens on the 16th.
      expect(about('2026-11-16', withoutPlanned)).toBe('relevant')
      expect(about('2026-11-15', withoutPlanned)).toBe('irrelevant')
    })

    it('does not open the window before a match of ours in between, as at the time of the import', () => {
      // We played on 7 November and play on 14 and 21 November, against Groningen on the 21st.
      // On the 12th the match of the 14th is not played yet, and the news of those days is
      // about that match.
      const matches = [ours('2026-11-07'), ours('2026-11-14', 'scheduled'), groningen('2026-11-08')]

      expect(about('2026-11-12', matches)).toBe('irrelevant')
      expect(about('2026-11-15', matches)).toBe('irrelevant')
      expect(about('2026-11-16', matches)).toBe('relevant')
    })

    it('opens 5 days before after a week from Saturday to Saturday', () => {
      // We played on Saturday the 14th, they on Sunday the 15th: the window opens on the 16th.
      const matches = [ours('2026-11-14'), groningen('2026-11-15')]

      expect(about('2026-11-16', matches)).toBe('relevant')
      expect(about('2026-11-15', matches)).toBe('irrelevant')
    })

    it('counts a cup match of ours as the previous match', () => {
      const matches = [{ ...ours('2026-11-17'), opponent: 'De Treffers' }, groningen('2026-11-08')]

      expect(about('2026-11-18', matches)).toBe('relevant')
      expect(about('2026-11-17', matches)).toBe('irrelevant')
    })

    it('does not count a headline about the previous match of the opponent, before the window opens', () => {
      // They played on the 15th: the news of that day and before is about that match.
      const matches = [ours('2026-11-08'), groningen('2026-11-15')]

      expect(about('2026-11-14', matches)).toBe('irrelevant')
      expect(about('2026-11-15', matches)).toBe('irrelevant')
      expect(about('2026-11-16', matches)).toBe('relevant')
    })

    it('lets two windows overlap for a match in midweek, and counts an item in either one', () => {
      // Saturday the 21st against Groningen, Wednesday the 25th against Twente (a cup match).
      const matches = [
        ours('2026-11-14'),
        groningen('2026-11-15'),
        { ...match('FC Twente', '2026-11-25'), opponentPreviousDay: '2026-11-22' },
      ]

      expect(opponentsAround(new Date('2026-11-23T12:00:00+01:00'), matches)).toEqual(['FC Groningen', 'FC Twente'])
      expect(about('2026-11-23', matches)).toBe('relevant')
      expect(judgeAt('FC Twente maakt zich op', '2026-11-23T12:00:00+01:00', matches)).toBe('relevant')
    })
  })

  describe('finds the opponent from the name in matches', () => {
    it.each([
      ['N.E.C.', 'N.E.C. verrast in Nijmegen', 'relevant'],
      ['N.E.C.', 'NEC verrast in Nijmegen', 'relevant'],
      ['N.E.C.', 'NEC Nijmegen verrast', 'relevant'],
      ['ADO Den Haag', 'ADO verrast', 'relevant'],
      ['ADO Den Haag', 'ADO Den Haag verrast', 'relevant'],
      ['Almere City FC', 'Almere City verrast', 'relevant'],
      ['Excelsior Rotterdam', 'Excelsior verrast', 'relevant'],
      ['Go Ahead Eagles', 'Go Ahead Eagles verrast', 'relevant'],
      ['VVV-Venlo', 'VVV Venlo verrast', 'relevant'],
      ['SC Cambuur', 'Cambuur verrast', 'relevant'],
      ['PSV', 'PSV verrast', 'relevant'],
      ['AZ', 'AZ verrast', 'relevant'],
      // A club that is named after a place needs the full name, as in the list.
      ['FC Twente', 'FC Twente verrast', 'relevant'],
      ['FC Twente', 'Twente verrast', 'irrelevant'],
      ['FC Twente', 'Twentse boeren verrast', 'irrelevant'],
      ['FC Utrecht', 'Utrecht verrast', 'irrelevant'],
      ['FC Groningen', 'Groningen verrast', 'irrelevant'],
      ['PEC Zwolle', 'Zwolle verrast', 'irrelevant'],
      ['PEC Zwolle', 'PEC Zwolle verrast', 'relevant'],
      // A club that is not on the list: its name from the match, without FC, SC and the like.
      ['Excelsior Maassluis', 'Excelsior Maassluis verrast', 'relevant'],
      ['Excelsior Maassluis', 'Excelsior verrast', 'irrelevant'],
      ['Quick Boys', 'Quick Boys verrast', 'relevant'],
      ['HSV Hoek', 'HSV Hoek verrast', 'relevant'],
      ['De Treffers', 'De Treffers verrast', 'relevant'],
      ['FC Dordrecht', 'Dordrecht verrast', 'irrelevant'],
      ['IJsselmeervogels', 'IJsselmeervogels verrast', 'relevant'],
      ['ASWH', 'ASWH verrast', 'relevant'],
      ['VV Katwijk', 'Katwijk verrast', 'relevant'],
      ['SV Spakenburg', 'Spakenburg verrast', 'relevant'],
      ['Hercules', 'Hercules verrast', 'irrelevant'],
      ['Hercules', 'Hercules Utrecht verrast', 'irrelevant'],
      ['AFC', 'AFC Bournemouth verrast', 'irrelevant'],
      ['Quick', 'Quick verrast', 'irrelevant'],
    ] as [string, string, ItemRelevance][])('%s: %j is %s', (opponent, title, expected) => {
      expect(judgeRelevance(title, [opponent])).toBe(expected)
    })
  })

  it('finds the opponents of the matches in the database as they are in matches', () => {
    // Every opponent that the matches of 2021/22 to 2026/27 have, as the import stored it.
    const opponents = [
      'ADO Den Haag',
      'AFC',
      'Ajax',
      'Almere City FC',
      'ASWH',
      'AZ',
      'De Treffers',
      'Excelsior',
      'Excelsior Maassluis',
      'Excelsior Rotterdam',
      'FC Emmen',
      'FC Groningen',
      'FC Twente',
      'FC Utrecht',
      'FC Volendam',
      'Feyenoord',
      'Fortuna Sittard',
      'Go Ahead Eagles',
      'Heracles Almelo',
      'HSV Hoek',
      'IJsselmeervogels',
      'N.E.C.',
      'NAC Breda',
      'PEC Zwolle',
      'PSV',
      'Quick Boys',
      'RKC Waalwijk',
      'SC Cambuur',
      'Sparta Rotterdam',
      'Telstar',
      'Vitesse',
      'VVV-Venlo',
      'Willem II',
    ]
    const notLooked = new Set(['AFC'])

    for (const opponent of opponents) {
      const title = `${opponent.replaceAll('.', '').replaceAll('-', ' ')} verrast`

      expect(judgeRelevance(title, [opponent]), opponent).toBe(notLooked.has(opponent) ? 'irrelevant' : 'relevant')
    }
  })

  it('gives the same answer for the same headline and opponents', () => {
    expect(judgeRelevance('ADO verrast', ['ADO Den Haag'])).toBe(judgeRelevance('ADO verrast', ['ADO Den Haag']))
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
    ['sc Hearrenfeân', ['sc', 'hearrenfean']],
    ['Thúswedstriden fan Hearrenfean-fans', ['thuswedstriden', 'fan', 'hearrenfean', 'fans']],
    ['Hy wûn yn Fryslân', ['hy', 'wun', 'yn', 'fryslan']],
    ["Abe Lenstra's stadion", ['abe', 'lenstra', 's', 'stadion']],
    ['', []],
  ])('%j gives %j', (title, tokens) => {
    expect(normaliseTitle(title)).toEqual(tokens)
  })
})

describe('the lists of names and words', () => {
  const normalised = (term: string) => normaliseTitle(term).join(' ')

  it('hold terms that are already normalised, so they match what a headline gives', () => {
    for (const term of [
      ...clubNames,
      ...clubPeople,
      ...clubSurnames,
      ...footballWords,
      ...frisianFootballWords,
      ...otherClubs,
    ]) {
      expect(term, `"${term}" is not normalised`).toBe(normalised(term))
    }
  })

  it('hold no term twice', () => {
    const all = [...clubNames, ...clubPeople, ...clubSurnames, ...footballWords, ...frisianFootballWords, ...otherClubs]

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

  it('keep the names of one club in one group, and every group in the list of clubs', () => {
    expect(otherClubs).toEqual(otherClubGroups.flat())
    for (const group of otherClubGroups) {
      expect(group.length).toBeGreaterThan(0)
    }
  })

  it('hold prefixes and ordinary words that are normalised and not names of a club on the list', () => {
    for (const word of [...clubPrefixes, ...ordinaryClubWords]) {
      expect(word, `"${word}" is not normalised`).toBe(normalised(word))
      expect(otherClubs).not.toContain(word)
    }
  })

  it('keep the club and the town out of the football words', () => {
    expect(footballWords).not.toContain('heerenveen')
    expect(footballWords).not.toContain('sc')
    expect(footballWords).not.toContain('hearrenfean')
    expect(frisianFootballWords).not.toContain('heerenveen')
    expect(frisianFootballWords).not.toContain('hearrenfean')
    expect(frisianFootballWords).not.toContain('sc')
    expect(otherClubs).not.toContain('heerenveen')
    expect(otherClubs).not.toContain('sc heerenveen')
    expect(otherClubs).not.toContain('jong sc heerenveen')
  })
})

describe('clubsNamed', () => {
  it('gives the club a headline names, as matches.opponent has it', () => {
    expect(clubsNamed('Feyenoord wint de topper')).toEqual(['Feyenoord'])
    expect(clubsNamed('Trainer van N.E.C. kijkt vooruit')).toEqual(['N.E.C.'])
    expect(clubsNamed('Telstar-fans zingen door')).toEqual(['Telstar'])
  })

  it('gives every club a headline names, in the order of the list', () => {
    expect(clubsNamed('PSV en Ajax delen de punten')).toEqual(['Ajax', 'PSV'])
    expect(clubsNamed('Heerenveen verslaat Ajax, Vitesse en PSV niet')).toEqual(['Ajax', 'PSV', 'Vitesse'])
  })

  it('gives a club once, however often or under which of its names the headline says it', () => {
    expect(clubsNamed('Ajax, AFC Ajax en nog eens Ajax')).toEqual(['Ajax'])
    expect(clubsNamed('Sparta verslaat Sparta Rotterdam niet')).toEqual(['Sparta Rotterdam'])
  })

  it('gives nothing for sc Heerenveen alone', () => {
    expect(clubsNamed('sc Heerenveen wint na een zinderende middag')).toEqual([])
    expect(clubsNamed('S.C. Heerenveen-fan wint prijs')).toEqual([])
  })

  it('gives sc Heerenveen no row when another club is named as well', () => {
    expect(clubsNamed('sc Heerenveen ontvangt Willem II')).toEqual(['Willem II'])
  })

  it('gives nothing for a headline without a club', () => {
    expect(clubsNamed('Het weer in Friesland is wisselvallig')).toEqual([])
    expect(clubsNamed('')).toEqual([])
  })

  it('ignores capitals, accents and full stops', () => {
    expect(clubsNamed('FEYENOORD wint')).toEqual(['Feyenoord'])
    expect(clubsNamed('s.c. Cambuur en Excélsior')).toEqual(['SC Cambuur', 'Excelsior Rotterdam'])
    expect(clubsNamed('n.e.c. wint van ado')).toEqual(['ADO Den Haag', 'N.E.C.'])
  })

  it('looks at whole words only', () => {
    expect(clubsNamed('Azerbeidzjan en Psvchologie')).toEqual([])
    expect(clubsNamed('Nacht van de Vitesses')).toEqual([])
  })

  it('lets a long name go before a short one', () => {
    expect(clubsNamed('Jong Ajax wint')).toEqual(['Jong Ajax'])
    expect(clubsNamed('Jong FC Utrecht tegen FC Utrecht')).toEqual(['FC Utrecht', 'Jong FC Utrecht'])
    expect(clubsNamed('SC Cambuur wint')).toEqual(['SC Cambuur'])
  })

  it('does not take a name that sits in another name for the club', () => {
    expect(clubsNamed('Excelsior Maassluis verrast in de beker')).toEqual([])
    expect(clubsNamed('Excelsior Maassluis en Excelsior spelen')).toEqual(['Excelsior Rotterdam'])
    expect(clubsNamed('Sparta Praag wint in Praag')).toEqual([])
  })

  it('does not depend on the opponents or the feed: a headline well away from a match gets its club', () => {
    expect(clubsNamed('Transfernieuws bij Feyenoord')).toEqual(['Feyenoord'])
  })

  it('has a name for every group, and a name for nobody else', () => {
    expect(Object.keys(otherClubFullNames).sort()).toEqual(otherClubGroups.map((group) => group[0]).sort())
    expect(Object.values(otherClubFullNames).every((name) => name.length > 0 && name.length <= 100)).toBe(true)
    expect(lookalikeClubs.map(normalised)).toEqual([...lookalikeClubs])
  })
})

function normalised(term: string) {
  return normaliseTitle(term).join(' ')
}

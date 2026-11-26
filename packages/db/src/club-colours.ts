// The colour of each club (#1677), by the part of its address (`clubs.slug`): the main colour
// of the club now, as `#rrggbb`, or null for a club without one. White is never in the list:
// a club in white has the other colour we know it by. A club we are not sure of has none. The
// editors can replace a colour in the admin (`clubs.colour_choice`). Nothing reads this from
// elsewhere: the list is the source.

const black = '#111111'
const blue = '#005baa'
const green = '#00a651'
const orange = '#f07d00'
const red = '#e30613'
const yellow = '#ffd500'

/** The clubs of the Netherlands: every one that was an opponent. */
const dutch: Record<string, null | string> = {
  'ado-den-haag': green,
  afc: null,
  ajax: red,
  'almere-city-fc': red,
  aswh: null,
  az: red,
  'bv-veendam': yellow,
  'de-graafschap': blue,
  'de-treffers': null,
  'dordrecht-90': null,
  'dos-kampen': null,
  'drachtster-boys': null,
  'excelsior-maassluis': null,
  'excelsior-rotterdam': red,
  'fc-den-bosch': blue,
  'fc-dordrecht': null,
  'fc-eindhoven': blue,
  'fc-emmen': red,
  'fc-groningen': green,
  'fc-twente': red,
  'fc-utrecht': red,
  'fc-volendam': orange,
  feyenoord: red,
  'fortuna-sittard': yellow,
  'go-ahead-eagles': red,
  gvvv: null,
  'haaglandia-sir-winston': null,
  haarlem: red,
  'helmond-sport': red,
  'heracles-almelo': black,
  hollandia: null,
  'hsv-hoek': null,
  hzvv: null,
  ijsselmeervogels: red,
  'kozakken-boys': null,
  mvv: red,
  'nac-breda': yellow,
  nec: red,
  'odin-59': null,
  'pec-zwolle': blue,
  psv: red,
  'quick-boys': blue,
  'rbc-roosendaal': orange,
  'rkc-waalwijk': yellow,
  'rksv-groene-ster': green,
  'roda-jc-kerkrade': yellow,
  'sc-cambuur': yellow,
  'sdc-putten': null,
  'sdv-barneveld': null,
  sneek: null,
  'sparta-rotterdam': red,
  'sv-urk': null,
  svv: null,
  telstar: null,
  'top-oss': red,
  vitesse: yellow,
  'vv-geldrop': null,
  'vv-katwijk': orange,
  'vv-rozenburg': null,
  vvog: null,
  'vvv-venlo': yellow,
  'willem-ii': red,
}

/** Clubs of other countries: only the ones whose colour we are sure of. */
const foreign: Record<string, null | string> = {
  'aalborg-bk': red,
  'ac-milan': red,
  'ca-osasuna': red,
  'cska-moskva': red,
  'fbk-kaunas': null,
  'fc-banik-ostrava': blue,
  'fc-basel': red,
  'fc-dinamo-bucuresti': red,
  'fc-girondins-de-bordeaux': '#0b1f4d',
  'fc-koper': yellow,
  'fc-nantes-atlantique': yellow,
  'hammarby-if': green,
  'helsingborgs-if': red,
  'hertha-bsc': blue,
  'ksk-beveren': yellow,
  'levski-sofia': blue,
  'lierse-sk': yellow,
  'lillestrom-sk': yellow,
  'molde-fk': blue,
  'msv-duisburg': blue,
  'newcastle-united-fc': black,
  'nk-dinamo-zagreb': blue,
  'odense-bk': blue,
  'olympiakos-piraeus': red,
  'olympique-de-marseille': '#2faee0',
  'paok-saloniki': black,
  'portsmouth-fc': blue,
  'rc-lens': red,
  'sc-braga': red,
  'sl-benfica': red,
  'sligo-rovers': red,
  'sporting-lissabon': green,
  'steaua-bucuresti': red,
  'vfb-stuttgart': red,
  'vfl-wolfsburg': green,
  'villarreal-cf': yellow,
  'west-ham-united': '#7a263a',
}

export const clubColours: Readonly<Record<string, null | string>> = { ...dutch, ...foreign }

/** What the editors chose for a club: nothing (`null`, the list), no colour, or their own. */
export type ClubColourChoice = null | string

/** The choice of an editor that gives a club no colour. */
export const noClubColour = 'none'

const colourForm = /^#[0-9a-f]{6}$/u

/** Whether a text is a colour as we keep it: `#` and six hexadecimal digits in lowercase. */
export const isClubColour = (value: string) => colourForm.test(value)

/**
 * The colour a club has now, or null for none: the choice of the editors where there is one,
 * and the list where there is not. Only a checked colour comes out.
 */
export function clubColourOf(slug: string, choice: ClubColourChoice): null | string {
  const colour = choice ?? (Object.hasOwn(clubColours, slug) ? clubColours[slug] : null)

  return typeof colour === 'string' && isClubColour(colour) ? colour : null
}

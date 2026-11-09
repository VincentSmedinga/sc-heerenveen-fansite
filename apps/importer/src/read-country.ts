// Reads the country of a player from the flag the squad tables of Wikipedia show. The Dutch
// pages write it as a template, `{{NL-VLAG}}` or `{{NL}}`, and the English pages as the
// `nat` parameter of `{{Fs player}}` with a code of the football associations (`NED`). The
// result is the code of two letters of `players.country`. A flag we cannot read as a country
// of two letters is a warning and an empty value, never a guess.

/**
 * The codes of three letters the English pages use, and the code of two letters of the
 * country. Only countries with a code of two letters of their own are here: `ENG`, `SCO` and
 * `WAL` are parts of the United Kingdom and are left out with a warning.
 */
const associationCodes: Record<string, string> = {
  ALB: 'AL',
  ALG: 'DZ',
  ANG: 'AO',
  ARG: 'AR',
  ARM: 'AM',
  AUS: 'AU',
  AUT: 'AT',
  AZE: 'AZ',
  BEL: 'BE',
  BFA: 'BF',
  BIH: 'BA',
  BRA: 'BR',
  BUL: 'BG',
  CAN: 'CA',
  CGO: 'CG',
  CHI: 'CL',
  CIV: 'CI',
  CMR: 'CM',
  COD: 'CD',
  COL: 'CO',
  CRC: 'CR',
  CRO: 'HR',
  CUW: 'CW',
  CYP: 'CY',
  CZE: 'CZ',
  DEN: 'DK',
  ECU: 'EC',
  EGY: 'EG',
  ESP: 'ES',
  EST: 'EE',
  FIN: 'FI',
  FRA: 'FR',
  GAB: 'GA',
  GAM: 'GM',
  GEO: 'GE',
  GER: 'DE',
  GHA: 'GH',
  GRE: 'GR',
  GUI: 'GN',
  HUN: 'HU',
  IRL: 'IE',
  IRN: 'IR',
  IRQ: 'IQ',
  ISL: 'IS',
  ISR: 'IL',
  ITA: 'IT',
  JAM: 'JM',
  JAP: 'JP',
  JPN: 'JP',
  KOR: 'KR',
  KOS: 'XK',
  LAT: 'LV',
  LTU: 'LT',
  LUX: 'LU',
  MAR: 'MA',
  MEX: 'MX',
  MKD: 'MK',
  MLI: 'ML',
  MNE: 'ME',
  NED: 'NL',
  NGA: 'NG',
  NOR: 'NO',
  NZL: 'NZ',
  PAR: 'PY',
  PER: 'PE',
  POL: 'PL',
  POR: 'PT',
  ROU: 'RO',
  RSA: 'ZA',
  RUS: 'RU',
  SEN: 'SN',
  SLO: 'SI',
  SRB: 'RS',
  SUI: 'CH',
  SUR: 'SR',
  SVK: 'SK',
  SWE: 'SE',
  TOG: 'TG',
  TUN: 'TN',
  TUR: 'TR',
  UKR: 'UA',
  URU: 'UY',
  USA: 'US',
  VEN: 'VE',
}

/** What a reader finds in the country cell: the code, or why it is empty. */
export type CountryRead = {
  /** The code of two letters in capitals, such as `NL`, or null. */
  country: null | string
  /** A sentence-ready description of what we did not understand, or null. */
  problem: null | string
}

/** The country of the `nat` parameter of an English `{{Fs player}}`, such as `NED`. */
export function countryOfAssociation(value: string): CountryRead {
  const code = value.trim().toUpperCase()

  if (code === '') {
    return { country: null, problem: null }
  }

  const country = Object.hasOwn(associationCodes, code) ? associationCodes[code] : undefined

  return country === undefined ? { country: null, problem: code.slice(0, 40) } : { country, problem: null }
}

/**
 * The country of a cell with a flag template of the Dutch Wikipedia: `{{NL-VLAG}}` or `{{NL}}`.
 * With more than one flag the first counts, as Wikipedia shows it first. A cell with nothing
 * in it, or with a dash, has no country and no problem. A template that is not a code of two
 * letters, and a cell with text but no template, is a problem.
 */
export function countryOfCell(cell: string): CountryRead {
  const text = cell
    .replace(/<br\s*\/?>/giu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()

  if (text === '' || /^[-–—]$/u.test(text)) {
    return { country: null, problem: null }
  }

  const template = /\{\{\s*([^{}|]*?)\s*\}\}/u.exec(text)

  if (template === null) {
    return { country: null, problem: text.slice(0, 40) }
  }

  const code = (template[1] ?? '').replace(/-VLAG$/iu, '')

  return /^[A-Za-z]{2}$/u.test(code)
    ? { country: code.toUpperCase(), problem: null }
    : { country: null, problem: (template[0] ?? '').slice(0, 40) }
}

/** The sentence for the warning about a country we did not understand. */
export function countryWarning(name: string, problem: string): string {
  return `${name}: the country '${problem}' is not one we know, so it is left empty`
}

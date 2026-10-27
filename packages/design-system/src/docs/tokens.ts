/*
 * Metadata for the token docs: Dutch names, intended use and the pairs whose contrast we check.
 * The values themselves are read from the CSS at runtime, so the docs can't drift from the
 * tokens.
 */

export const scaleSteps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const

export type ScaleName = 'blue' | 'green' | 'grey' | 'red' | 'sand' | 'steel'

/**
 * The scales: a colour in one strength (vivid, muted or neutral), numbered from light to dark.
 * A scale without steps has all eleven; a partial scale lists the steps it has.
 */
export const scales: { description: string; label: string; name: ScaleName; steps?: readonly number[] }[] = [
  { description: 'Helder blauw, tint 255°: van sterk vlak tot nachtblauw.', label: 'Blauw', name: 'blue' },
  { description: 'Helder rood, tint 27°, spaarzaam: datums en accenten.', label: 'Rood', name: 'red' },
  {
    description:
      'Helder groen, tint 150°, even licht als rood met hetzelfde nummer: voor de uitkomst van een wedstrijd.',
    label: 'Groen',
    name: 'green',
  },
  {
    description:
      'Gedempt blauw, tint 255° met 0,030 tot 0,075 chroma, even licht als grijs met hetzelfde nummer. Voor markeringen en de randen van blauwe vlakken.',
    label: 'Staal',
    name: 'steel',
    steps: [200, 300, 400, 500, 600],
  },
  {
    description:
      'Gedempt zand, tint 85° met 0,030 en 0,042 chroma. Voor het warme vlak en zijn rand in licht, en voor de links in de footer.',
    label: 'Zand',
    name: 'sand',
    steps: [100, 300, 700],
  },
  {
    description: 'Neutraal zand, tint 85° met hooguit 0,017 chroma: warm en nooit helemaal neutraal.',
    label: 'Grijs',
    name: 'grey',
  },
]

export const scaleLabels: Record<ScaleName, string> = {
  blue: 'blauw',
  green: 'groen',
  grey: 'grijs',
  red: 'rood',
  sand: 'zand',
  steel: 'staal',
}

export type SemanticToken = {
  name: string
  /** Values that weren't part of the agreed palette and still need a decision. */
  provisional?: Theme[]
  use: string
}

export type Theme = 'dark' | 'light'

export const semanticTokenGroups: { label: string; tokens: SemanticToken[] }[] = [
  {
    label: 'Achtergronden',
    tokens: [
      { name: '--hf-colour-background-page', use: 'Pagina' },
      { name: '--hf-colour-background-surface', use: 'Vlak: kaarten en invoervelden' },
      { name: '--hf-colour-background-surface-strong', use: 'Sterk vlak, ook code' },
      { name: '--hf-colour-background-surface-soft', use: 'Zacht vlak; in donker gelijk aan het vlak' },
      { name: '--hf-colour-background-surface-warm', use: 'Warm vlak; in donker gelijk aan het sterke vlak' },
      { name: '--hf-colour-background-header', use: 'Header' },
      { name: '--hf-colour-background-footer', use: 'Footer' },
      { name: '--hf-colour-background-band', use: 'Wedstrijdband' },
      { name: '--hf-colour-background-button', provisional: ['dark'], use: 'Knoppen, vinkjes en keuzerondjes' },
      { name: '--hf-colour-background-button-hover', provisional: ['light', 'dark'], use: 'Knop onder de muis' },
      { name: '--hf-colour-background-button-soft', use: 'Zachte knop' },
      { name: '--hf-colour-background-button-soft-hover', use: 'Zachte knop onder de muis' },
      { name: '--hf-colour-background-hover', provisional: ['dark'], use: 'Rij onder de muis' },
      { name: '--hf-colour-background-zebra', provisional: ['dark'], use: 'Zebrarijen in tabellen' },
      { name: '--hf-colour-background-highlight', use: 'Gemarkeerde rij, zoals sc Heerenveen in de stand' },
      { name: '--hf-colour-background-stripe', use: 'Strepen van de Friese vlag boven de footer' },
      { name: '--hf-colour-background-stripe-footer', use: 'Strepen van de Friese vlag over de footer' },
    ],
  },
  {
    label: 'Tekst',
    tokens: [
      { name: '--hf-colour-text-default', use: 'Lopende tekst' },
      { name: '--hf-colour-text-heading', use: 'Koppen' },
      { name: '--hf-colour-text-secondary', use: 'Secundaire tekst: bron, tijd, bijschrift' },
      { name: '--hf-colour-text-link', use: 'Links' },
      { name: '--hf-colour-text-link-hover', provisional: ['dark'], use: 'Link onder de muis' },
      {
        name: '--hf-colour-text-link-visited',
        provisional: ['light', 'dark'],
        use: 'De kop van een nieuwsbericht en de titel van een discussie, als je ze hebt geopend',
      },
      { name: '--hf-colour-text-accent', use: 'Accent en datums' },
      { name: '--hf-colour-text-highlight', use: 'Tekst in een gemarkeerde rij' },
      { name: '--hf-colour-text-on-header', use: 'Tekst in de header' },
      { name: '--hf-colour-text-on-header-secondary', use: 'Menu en bijtekst in de header' },
      { name: '--hf-colour-text-on-band', use: 'Tekst op de wedstrijdband' },
      { name: '--hf-colour-text-on-button', provisional: ['dark'], use: 'Tekst op knoppen' },
      { name: '--hf-colour-text-on-button-soft', use: 'Tekst op de zachte knop' },
    ],
  },
  {
    label: 'Uitkomst van een wedstrijd',
    tokens: [
      { name: '--hf-colour-outcome-win', use: 'Uitslag van een gewonnen wedstrijd van sc Heerenveen' },
      { name: '--hf-colour-outcome-loss', use: 'Uitslag van een verloren wedstrijd van sc Heerenveen' },
      { name: '--hf-colour-outcome-draw', use: 'Uitslag van een gelijkspel, ook in de beker zonder strafschoppen' },
    ],
  },
  {
    label: 'Markeringen',
    tokens: [
      {
        name: '--hf-colour-marker-text',
        use: 'Nummers van lijsten en de positie in een stand; later ook stap- en paginanummers',
      },
      {
        name: '--hf-colour-marker-graphic',
        use: 'Opsommingstekens, de lijn bij een citaat en de stippellijn onder een afkorting; later ook scheidingstekens, kleine pictogrammen en balkjes in grafiekjes',
      },
    ],
  },
  {
    label: 'Randen en lijnen',
    tokens: [
      { name: '--hf-colour-border-surface', use: 'Rand van een vlak, zoals een kaart' },
      { name: '--hf-colour-border-surface-strong', use: 'Sterke rand, ook van codeblokken' },
      { name: '--hf-colour-border-surface-soft', use: 'Zachte rand' },
      { name: '--hf-colour-border-surface-warm', use: 'Warme rand' },
      { name: '--hf-colour-border-default', use: 'Lijn: tussen rijen en als scheidingslijn' },
      { name: '--hf-colour-border-input', provisional: ['light', 'dark'], use: 'Rand van invoervelden' },
      { name: '--hf-colour-border-button-soft', use: 'Rand van de zachte knop' },
      { name: '--hf-colour-focus', use: 'Focusrand' },
      { name: '--hf-colour-focus-on-header', use: 'Focusrand in de header' },
      { name: '--hf-colour-focus-on-band', use: 'Focusrand op de wedstrijdband' },
      { name: '--hf-colour-accent-on-header', use: 'Streep onder de huidige pagina in het menu van de header' },
      { name: '--hf-colour-border-on-header', use: 'Lijn boven het menu in de header' },
      {
        name: '--hf-colour-border-on-header-strong',
        use: 'Rand van de themaknop in de header, onder de muis en bij focus',
      },
      {
        name: '--hf-colour-background-on-header-hover',
        use: 'Vulling van de themaknop in de header, onder de muis en bij focus',
      },
      { name: '--hf-colour-icon-on-header-quiet', use: 'Pictogram van de themaknop in de header, in rust' },
    ],
  },
]

/** What a pair must reach: AAA for body text, AA for other text, 3:1 for controls and focus. */
export type Requirement = 'AA' | 'AAA' | 'decoratief' | 'grafisch'

export const requirementMinimum: Record<Requirement, number> = { AA: 4.5, AAA: 7, decoratief: 0, grafisch: 3 }

export const requirementLabel: Record<Requirement, string> = {
  AA: 'AA, 4,5:1',
  AAA: 'AAA, 7:1',
  decoratief: 'geen eis',
  grafisch: 'AA, 3:1',
}

/**
 * A background that isn't opaque, such as a stripe, is measured on `under`, the surface below.
 */
export type Pair = { background: string; foreground: string; label: string; requirement: Requirement; under?: string }

const pair = (
  foreground: string,
  background: string,
  label: string,
  requirement: Requirement,
  under?: string,
): Pair => ({
  background: `--hf-colour-background-${background}`,
  foreground: `--hf-colour-${foreground}`,
  label,
  requirement,
  ...(under && { under: `--hf-colour-background-${under}` }),
})

export const pairGroups: { description: string; label: string; pairs: Pair[]; text: boolean }[] = [
  {
    description: 'Lopende tekst moet AAA halen.',
    label: 'Lopende tekst',
    pairs: [
      pair('text-default', 'page', 'Tekst op de pagina', 'AAA'),
      pair('text-default', 'surface', 'Tekst op een vlak', 'AAA'),
      pair('text-default', 'surface-strong', 'Tekst op een sterk vlak', 'AAA'),
      pair('text-default', 'surface-soft', 'Tekst op een zacht vlak', 'AAA'),
      pair('text-default', 'surface-warm', 'Tekst op een warm vlak', 'AAA'),
      pair('text-default', 'zebra', 'Tekst in een zebrarij', 'AAA'),
      pair('text-default', 'hover', 'Tekst in een rij onder de muis', 'AAA'),
      pair('text-highlight', 'highlight', 'Tekst in een gemarkeerde rij', 'AAA'),
      pair('text-default', 'stripe', 'Tekst op de strepen boven de footer', 'AAA', 'page'),
    ],
    text: true,
  },
  {
    description: 'Alle andere tekst moet AA halen.',
    label: 'Overige tekst',
    pairs: [
      pair('text-heading', 'page', 'Kop op de pagina', 'AA'),
      pair('text-heading', 'surface', 'Kop op een vlak', 'AA'),
      pair('text-heading', 'surface-strong', 'Kop op een sterk vlak', 'AA'),
      pair('text-heading', 'surface-soft', 'Kop op een zacht vlak', 'AA'),
      pair('text-heading', 'surface-warm', 'Kop op een warm vlak', 'AA'),
      pair('text-heading', 'stripe', 'Kop op de strepen boven de footer', 'AA', 'page'),
      pair('text-secondary', 'page', 'Secundaire tekst op de pagina', 'AA'),
      pair('text-secondary', 'surface', 'Secundaire tekst op een vlak', 'AA'),
      pair('text-secondary', 'surface-strong', 'Secundaire tekst op een sterk vlak', 'AA'),
      pair('text-secondary', 'surface-soft', 'Secundaire tekst op een zacht vlak', 'AA'),
      pair('text-secondary', 'surface-warm', 'Secundaire tekst op een warm vlak', 'AA'),
      pair('text-secondary', 'zebra', 'Secundaire tekst in een zebrarij', 'AA'),
      pair('text-secondary', 'stripe', 'Secundaire tekst op de strepen boven de footer', 'AA', 'page'),
      pair('text-link', 'page', 'Link op de pagina', 'AA'),
      pair('text-link', 'surface', 'Link op een vlak', 'AA'),
      pair('text-link', 'surface-strong', 'Link op een sterk vlak', 'AA'),
      pair('text-link', 'surface-soft', 'Link op een zacht vlak', 'AA'),
      pair('text-link', 'surface-warm', 'Link op een warm vlak', 'AA'),
      pair('text-link', 'stripe', 'Link op de strepen boven de footer', 'AA', 'page'),
      pair('text-link-hover', 'surface', 'Link onder de muis op een vlak', 'AA'),
      pair('text-link-hover', 'surface-strong', 'Link onder de muis op een sterk vlak', 'AA'),
      pair('text-link-hover', 'surface-soft', 'Link onder de muis op een zacht vlak', 'AA'),
      pair('text-link-hover', 'surface-warm', 'Link onder de muis op een warm vlak', 'AA'),
      pair('text-link-hover', 'stripe', 'Link onder de muis op de strepen boven de footer', 'AA', 'page'),
      pair('text-link-visited', 'surface', 'Bezochte kop of titel op een vlak', 'AA'),
      pair('text-link-visited', 'surface-strong', 'Bezochte kop of titel op een sterk vlak', 'AA'),
      pair('text-link-visited', 'surface-soft', 'Bezochte kop of titel op een zacht vlak', 'AA'),
      pair('text-link-visited', 'surface-warm', 'Bezochte kop of titel op een warm vlak', 'AA'),
      pair('text-link-visited', 'stripe', 'Bezochte kop of titel op de strepen boven de footer', 'AA', 'page'),
      pair('text-accent', 'page', 'Accent of datum op de pagina', 'AA'),
      pair('text-accent', 'surface', 'Accent of datum op een vlak', 'AA'),
      pair('text-accent', 'surface-strong', 'Accent of datum op een sterk vlak', 'AA'),
      pair('text-accent', 'surface-soft', 'Accent of datum op een zacht vlak', 'AA'),
      pair('text-accent', 'surface-warm', 'Accent of datum op een warm vlak', 'AA'),
      pair('text-accent', 'stripe', 'Accent of datum op de strepen boven de footer', 'AA', 'page'),
      pair('outcome-win', 'surface', 'Gewonnen uitslag op een vlak', 'AA'),
      pair('outcome-win', 'page', 'Gewonnen uitslag op de pagina', 'AA'),
      pair('outcome-win', 'surface-strong', 'Gewonnen uitslag op een sterk vlak', 'AA'),
      pair('outcome-win', 'surface-soft', 'Gewonnen uitslag op een zacht vlak', 'AA'),
      pair('outcome-win', 'surface-warm', 'Gewonnen uitslag op een warm vlak', 'AA'),
      pair('outcome-loss', 'surface', 'Verloren uitslag op een vlak', 'AA'),
      pair('outcome-loss', 'page', 'Verloren uitslag op de pagina', 'AA'),
      pair('outcome-loss', 'surface-strong', 'Verloren uitslag op een sterk vlak', 'AA'),
      pair('outcome-loss', 'surface-soft', 'Verloren uitslag op een zacht vlak', 'AA'),
      pair('outcome-loss', 'surface-warm', 'Verloren uitslag op een warm vlak', 'AA'),
      pair('outcome-draw', 'surface', 'Uitslag van een gelijkspel op een vlak', 'AA'),
      pair('outcome-draw', 'page', 'Uitslag van een gelijkspel op de pagina', 'AA'),
      pair('outcome-draw', 'surface-strong', 'Uitslag van een gelijkspel op een sterk vlak', 'AA'),
      pair('outcome-draw', 'surface-soft', 'Uitslag van een gelijkspel op een zacht vlak', 'AA'),
      pair('outcome-draw', 'surface-warm', 'Uitslag van een gelijkspel op een warm vlak', 'AA'),
      pair('marker-text', 'page', 'Nummer of positie op de pagina', 'AA'),
      pair('marker-text', 'surface', 'Nummer of positie op een vlak', 'AA'),
      pair('marker-text', 'surface-strong', 'Nummer of positie op een sterk vlak', 'AA'),
      pair('marker-text', 'surface-soft', 'Nummer of positie op een zacht vlak', 'AA'),
      pair('marker-text', 'surface-warm', 'Nummer of positie op een warm vlak', 'AA'),
      pair('marker-text', 'zebra', 'Positie in een zebrarij', 'AA'),
      pair('marker-text', 'stripe', 'Nummer of positie op de strepen boven de footer', 'AA', 'page'),
      pair('text-on-header', 'header', 'Tekst in de header', 'AA'),
      pair('text-on-header-secondary', 'header', 'Menu in de header', 'AA'),
      pair('text-secondary', 'footer', 'Tekst in de footer', 'AA'),
      pair('text-link', 'footer', 'Link in de footer', 'AA'),
      pair('text-link-hover', 'footer', 'Link onder de muis in de footer', 'AA'),
      pair('text-secondary', 'stripe-footer', 'Tekst in de footer, op de strepen', 'AA', 'footer'),
      pair('text-link', 'stripe-footer', 'Link in de footer, op de strepen', 'AA', 'footer'),
      pair('text-link-hover', 'stripe-footer', 'Link onder de muis in de footer, op de strepen', 'AA', 'footer'),
      pair('text-on-band', 'band', 'Tekst op de wedstrijdband', 'AA'),
      pair('text-on-button', 'button', 'Tekst op een knop', 'AA'),
      pair('text-on-button', 'button-hover', 'Tekst op een knop onder de muis', 'AA'),
      pair('text-on-button-soft', 'button-soft', 'Tekst op een zachte knop', 'AA'),
      pair('text-on-button-soft', 'button-soft-hover', 'Tekst op een zachte knop onder de muis', 'AA'),
    ],
    text: true,
  },
  {
    description:
      'Wat nodig is om een bedieningselement, de focus of een markering te zien, moet 3:1 halen tegen wat eromheen ligt.',
    label: 'Focus, invoervelden en markeringen',
    pairs: [
      pair('focus', 'page', 'Focusrand op de pagina', 'grafisch'),
      pair('focus', 'surface', 'Focusrand op een vlak', 'grafisch'),
      pair('focus', 'surface-strong', 'Focusrand op een sterk vlak', 'grafisch'),
      pair('focus', 'surface-soft', 'Focusrand op een zacht vlak', 'grafisch'),
      pair('focus', 'surface-warm', 'Focusrand op een warm vlak', 'grafisch'),
      pair('focus', 'stripe', 'Focusrand op de strepen boven de footer', 'grafisch', 'page'),
      pair('focus-on-header', 'header', 'Focusrand in de header', 'grafisch'),
      pair('focus', 'footer', 'Focusrand in de footer', 'grafisch'),
      pair('focus', 'stripe-footer', 'Focusrand in de footer, op de strepen', 'grafisch', 'footer'),
      pair('focus-on-band', 'band', 'Focusrand op de wedstrijdband', 'grafisch'),
      pair('accent-on-header', 'header', 'Streep onder de huidige pagina in de header', 'grafisch'),
      pair('icon-on-header-quiet', 'header', 'Pictogram van de themaknop in de header, in rust', 'grafisch'),
      pair('border-input', 'surface', 'Rand van een invoerveld op een vlak', 'grafisch'),
      pair('border-button-soft', 'surface', 'Rand van een zachte knop op een vlak', 'grafisch'),
      pair('border-button-soft', 'surface-strong', 'Rand van een zachte knop op een sterk vlak', 'grafisch'),
      pair('border-button-soft', 'surface-soft', 'Rand van een zachte knop op een zacht vlak', 'grafisch'),
      pair('border-button-soft', 'surface-warm', 'Rand van een zachte knop op een warm vlak', 'grafisch'),
      pair('border-input', 'page', 'Rand van een invoerveld op de pagina', 'grafisch'),
      pair('marker-graphic', 'page', 'Opsommingsteken of lijn op de pagina', 'grafisch'),
      pair('marker-graphic', 'surface', 'Opsommingsteken of lijn op een vlak', 'grafisch'),
      pair('marker-graphic', 'surface-strong', 'Opsommingsteken of lijn op een sterk vlak', 'grafisch'),
      pair('marker-graphic', 'surface-soft', 'Opsommingsteken of lijn op een zacht vlak', 'grafisch'),
      pair('marker-graphic', 'surface-warm', 'Opsommingsteken of lijn op een warm vlak', 'grafisch'),
    ],
    text: false,
  },
  {
    description: 'Randen van vlakken en lijnen tussen rijen zijn versiering; daarvoor geldt geen eis.',
    label: 'Randen',
    pairs: [
      pair('border-surface', 'surface', 'Rand op een vlak', 'decoratief'),
      pair('border-surface', 'page', 'Rand van een vlak op de pagina', 'decoratief'),
      pair('border-surface-strong', 'surface-strong', 'Sterke rand op een sterk vlak', 'decoratief'),
      pair('border-surface-soft', 'surface-soft', 'Zachte rand op een zacht vlak', 'decoratief'),
      pair('border-surface-warm', 'surface-warm', 'Warme rand op een warm vlak', 'decoratief'),
      pair('border-default', 'surface', 'Lijn op een vlak', 'decoratief'),
      pair('border-default', 'page', 'Lijn op de pagina', 'decoratief'),
    ],
    text: false,
  },
]

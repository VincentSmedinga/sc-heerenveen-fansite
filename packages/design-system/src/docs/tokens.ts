/*
 * Metadata for the token docs: Dutch names, intended use and the pairs whose contrast we check.
 * The values themselves are read from the CSS at runtime, so the docs can't drift from the tokens.
 */

export const scaleSteps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const

export type ScaleName = 'blue' | 'grey' | 'red' | 'sand' | 'steel'

/**
 * The scales: a colour in one strength (vivid, muted or neutral), numbered from light to dark.
 * A scale without steps has all eleven; a partial scale lists the steps it has.
 */
export const scales: { description: string; label: string; name: ScaleName; steps?: readonly number[] }[] = [
  { description: 'Helder blauw, tint 255°: van tonaal vlak tot nachtblauw.', label: 'Blauw', name: 'blue' },
  { description: 'Helder rood, tint 27°, spaarzaam: datums en accenten.', label: 'Rood', name: 'red' },
  {
    description:
      'Gedempt blauw, tint 255° met 0,030 tot 0,075 chroma, even licht als grijs met hetzelfde nummer. Voor markeringen en de randen van blauwe vlakken.',
    label: 'Staal',
    name: 'steel',
    steps: [200, 300, 400, 500, 600],
  },
  {
    description:
      'Gedempt zand, tint 85° met 0,030 en 0,042 chroma. Voor het warme tonale vlak en zijn rand, alleen in licht.',
    label: 'Zand',
    name: 'sand',
    steps: [100, 300],
  },
  {
    description: 'Neutraal zand, tint 85° met hooguit 0,017 chroma: warm en nooit helemaal neutraal.',
    label: 'Grijs',
    name: 'grey',
  },
]

export const scaleLabels: Record<ScaleName, string> = {
  blue: 'blauw',
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
      { name: '--hf-colour-background-surface-tonal', use: 'Tonaal vlak, ook code' },
      { name: '--hf-colour-background-surface-soft', use: 'Zacht vlak; in donker gelijk aan het vlak' },
      { name: '--hf-colour-background-surface-warm', use: 'Warm vlak; in donker gelijk aan het tonale vlak' },
      { name: '--hf-colour-background-header', use: 'Header' },
      { name: '--hf-colour-background-band', use: 'Wedstrijdband' },
      { name: '--hf-colour-background-button', provisional: ['dark'], use: 'Knoppen, vinkjes en keuzerondjes' },
      { name: '--hf-colour-background-button-hover', provisional: ['light', 'dark'], use: 'Knop onder de muis' },
      { name: '--hf-colour-background-hover', provisional: ['dark'], use: 'Rij onder de muis' },
      { name: '--hf-colour-background-zebra', provisional: ['dark'], use: 'Zebrarijen in tabellen' },
      { name: '--hf-colour-background-highlight', use: 'Gemarkeerde rij, zoals sc Heerenveen in de stand' },
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
      { name: '--hf-colour-text-link-visited', provisional: ['light', 'dark'], use: 'Bezochte link' },
      { name: '--hf-colour-text-accent', use: 'Accent en datums' },
      { name: '--hf-colour-text-highlight', use: 'Tekst in een gemarkeerde rij' },
      { name: '--hf-colour-text-on-header', use: 'Tekst in de header' },
      { name: '--hf-colour-text-on-header-secondary', use: 'Menu en bijtekst in de header' },
      { name: '--hf-colour-text-on-band', use: 'Tekst op de wedstrijdband' },
      { name: '--hf-colour-text-on-button', provisional: ['dark'], use: 'Tekst op knoppen' },
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
      { name: '--hf-colour-border-surface-tonal', use: 'Tonale rand, ook van codeblokken' },
      { name: '--hf-colour-border-surface-soft', use: 'Zachte rand' },
      { name: '--hf-colour-border-surface-warm', use: 'Warme rand' },
      { name: '--hf-colour-border-default', use: 'Lijn: tussen rijen en als scheidingslijn' },
      { name: '--hf-colour-border-input', provisional: ['light', 'dark'], use: 'Rand van invoervelden' },
      { name: '--hf-colour-focus', use: 'Focusrand' },
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

export type Pair = { background: string; foreground: string; label: string; requirement: Requirement }

const pair = (foreground: string, background: string, label: string, requirement: Requirement): Pair => ({
  background: `--hf-colour-background-${background}`,
  foreground: `--hf-colour-${foreground}`,
  label,
  requirement,
})

export const pairGroups: { description: string; label: string; pairs: Pair[]; text: boolean }[] = [
  {
    description: 'Lopende tekst moet AAA halen.',
    label: 'Lopende tekst',
    pairs: [
      pair('text-default', 'page', 'Tekst op de pagina', 'AAA'),
      pair('text-default', 'surface', 'Tekst op een vlak', 'AAA'),
      pair('text-default', 'surface-tonal', 'Tekst op een tonaal vlak', 'AAA'),
      pair('text-default', 'surface-soft', 'Tekst op een zacht vlak', 'AAA'),
      pair('text-default', 'surface-warm', 'Tekst op een warm vlak', 'AAA'),
      pair('text-default', 'zebra', 'Tekst in een zebrarij', 'AAA'),
      pair('text-default', 'hover', 'Tekst in een rij onder de muis', 'AAA'),
      pair('text-highlight', 'highlight', 'Tekst in een gemarkeerde rij', 'AAA'),
    ],
    text: true,
  },
  {
    description: 'Alle andere tekst moet AA halen.',
    label: 'Overige tekst',
    pairs: [
      pair('text-heading', 'page', 'Kop op de pagina', 'AA'),
      pair('text-heading', 'surface', 'Kop op een vlak', 'AA'),
      pair('text-heading', 'surface-tonal', 'Kop op een tonaal vlak', 'AA'),
      pair('text-heading', 'surface-soft', 'Kop op een zacht vlak', 'AA'),
      pair('text-heading', 'surface-warm', 'Kop op een warm vlak', 'AA'),
      pair('text-secondary', 'page', 'Secundaire tekst op de pagina', 'AA'),
      pair('text-secondary', 'surface', 'Secundaire tekst op een vlak', 'AA'),
      pair('text-secondary', 'surface-tonal', 'Secundaire tekst op een tonaal vlak', 'AA'),
      pair('text-secondary', 'surface-soft', 'Secundaire tekst op een zacht vlak', 'AA'),
      pair('text-secondary', 'surface-warm', 'Secundaire tekst op een warm vlak', 'AA'),
      pair('text-secondary', 'zebra', 'Secundaire tekst in een zebrarij', 'AA'),
      pair('text-link', 'page', 'Link op de pagina', 'AA'),
      pair('text-link', 'surface', 'Link op een vlak', 'AA'),
      pair('text-link', 'surface-tonal', 'Link op een tonaal vlak', 'AA'),
      pair('text-link', 'surface-soft', 'Link op een zacht vlak', 'AA'),
      pair('text-link', 'surface-warm', 'Link op een warm vlak', 'AA'),
      pair('text-link-hover', 'surface', 'Link onder de muis', 'AA'),
      pair('text-link-visited', 'surface', 'Bezochte link', 'AA'),
      pair('text-accent', 'page', 'Accent of datum op de pagina', 'AA'),
      pair('text-accent', 'surface', 'Accent of datum op een vlak', 'AA'),
      pair('text-accent', 'surface-tonal', 'Accent of datum op een tonaal vlak', 'AA'),
      pair('text-accent', 'surface-soft', 'Accent of datum op een zacht vlak', 'AA'),
      pair('text-accent', 'surface-warm', 'Accent of datum op een warm vlak', 'AA'),
      pair('marker-text', 'page', 'Nummer of positie op de pagina', 'AA'),
      pair('marker-text', 'surface', 'Nummer of positie op een vlak', 'AA'),
      pair('marker-text', 'surface-tonal', 'Nummer of positie op een tonaal vlak', 'AA'),
      pair('marker-text', 'surface-soft', 'Nummer of positie op een zacht vlak', 'AA'),
      pair('marker-text', 'surface-warm', 'Nummer of positie op een warm vlak', 'AA'),
      pair('marker-text', 'zebra', 'Positie in een zebrarij', 'AA'),
      pair('text-on-header', 'header', 'Tekst in de header', 'AA'),
      pair('text-on-header-secondary', 'header', 'Menu in de header', 'AA'),
      pair('text-on-band', 'band', 'Tekst op de wedstrijdband', 'AA'),
      pair('text-on-button', 'button', 'Tekst op een knop', 'AA'),
      pair('text-on-button', 'button-hover', 'Tekst op een knop onder de muis', 'AA'),
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
      pair('focus', 'surface-tonal', 'Focusrand op een tonaal vlak', 'grafisch'),
      pair('focus', 'surface-soft', 'Focusrand op een zacht vlak', 'grafisch'),
      pair('focus', 'surface-warm', 'Focusrand op een warm vlak', 'grafisch'),
      pair('focus', 'header', 'Focusrand in de header', 'grafisch'),
      pair('focus', 'band', 'Focusrand op de wedstrijdband', 'grafisch'),
      pair('border-input', 'surface', 'Rand van een invoerveld op een vlak', 'grafisch'),
      pair('border-input', 'page', 'Rand van een invoerveld op de pagina', 'grafisch'),
      pair('marker-graphic', 'page', 'Opsommingsteken of lijn op de pagina', 'grafisch'),
      pair('marker-graphic', 'surface', 'Opsommingsteken of lijn op een vlak', 'grafisch'),
      pair('marker-graphic', 'surface-tonal', 'Opsommingsteken of lijn op een tonaal vlak', 'grafisch'),
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
      pair('border-surface-tonal', 'surface-tonal', 'Tonale rand op een tonaal vlak', 'decoratief'),
      pair('border-surface-soft', 'surface-soft', 'Zachte rand op een zacht vlak', 'decoratief'),
      pair('border-surface-warm', 'surface-warm', 'Warme rand op een warm vlak', 'decoratief'),
      pair('border-default', 'surface', 'Lijn op een vlak', 'decoratief'),
      pair('border-default', 'page', 'Lijn op de pagina', 'decoratief'),
    ],
    text: false,
  },
]

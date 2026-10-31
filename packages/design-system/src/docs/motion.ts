/*
 * Metadata for the chapter Beweging: the groups of changes of state, the tokens, and the
 * list of every change in the design system. The durations and curves themselves are read
 * from the CSS at runtime, as the colour docs do.
 */

export type MotionGroup = {
  /** What belongs here. */
  contains: string
  id: MotionGroupId
  label: string
  /** What the motion does. */
  moves: string
  /** The tokens that go with it; empty for a group without motion. */
  tokens: string[]
  /** Why. */
  why: string
}

export type MotionGroupId = 'aanwijzen' | 'direct' | 'pagina' | 'selecteren' | 'verschijnen'

export const motionGroups: MotionGroup[] = [
  {
    contains:
      'Een link, knop of ander ding dat reageert op de muis of op het toetsenbord, zonder dat er iets bij blijft.',
    id: 'aanwijzen',
    label: 'Aanwijzen',
    moves:
      'Kleur, vulling en rand schuiven naar de nieuwe waarde. Een streep die verschijnt springt: een lijn kan niet vervagen.',
    tokens: ['--hf-motion-duration-short', '--hf-motion-ease-change'],
    why: 'De bezoeker ziet dat het ding reageert, en het voelt zacht in plaats van als een schakelaar. Het is kort, zodat een snelle muis niet achterloopt.',
  },
  {
    contains: 'Ingedrukt (alleen even), en geselecteerd of open (het blijft zo): `:active`, `aria-pressed` en `:open`.',
    id: 'selecteren',
    label: 'Ingedrukt en geselecteerd',
    moves:
      'Vulling, rand en kleur, en de draaiing van het pijltje van een open lijst. Ingedrukt volgt de vinger meteen; geselecteerd en open nemen de tijd van aanwijzen.',
    tokens: ['--hf-motion-duration-quick', '--hf-motion-duration-short', '--hf-motion-ease-change'],
    why: "Wie drukt, wil dat het ding direct antwoordt. Wat blijft staan, mag rustig overgaan. Een pijltje dat draait als een lijst opent, is zo'n staat die blijft, en het wisselt niet van vorm: het draait een halve slag. Daarom volstaat de tijd van aanwijzen, en is het geen beweging van de hele pagina.",
  },
  {
    contains:
      'Iets dat er al kan zijn en nu zichtbaar of weg is: een pictogram dat bij de muis hoort, een paneel dat opent of sluit.',
    id: 'verschijnen',
    label: 'Verschijnen en verdwijnen',
    moves:
      'Alleen de doorzichtigheid. Komt iets binnen, dan versnelt het eerst en zakt het uit; gaat het weg, dan is het eerst langzaam.',
    tokens: ['--hf-motion-duration-short', '--hf-motion-ease-enter', '--hf-motion-ease-exit'],
    why: 'Het is de enige beweging die niets onder de ogen van de lezer verschuift. Openen en sluiten is hier ook onder gerekend: de ruimte staat er al, of springt.',
  },
  {
    contains:
      'Wat met de hele pagina gebeurt: het thema, het teken van het thema, vloeiend scrollen en het naar beneden trekken.',
    id: 'pagina',
    label: 'De hele pagina',
    moves:
      'Het teken van het thema verandert van vorm (schalen en verschuiven), de kleuren van de pagina gaan over. Scrollen en trekken hebben hun eigen regel.',
    tokens: [
      '--hf-motion-duration-medium',
      '--hf-motion-ease-morph',
      '--hf-motion-duration-short',
      '--hf-motion-ease-change',
    ],
    why: 'Dit zijn de grootste veranderingen, dus de enige die de langste duur krijgen. De bezoeker kiest ze zelf, en ze zijn dan het enige dat op het scherm gebeurt.',
  },
  {
    contains:
      'Een toestand die de bezoeker nodig heeft om te weten waar hij is of wat er fout is: de focusrand, de huidige pagina, het doel van een anker en een fout.',
    id: 'direct',
    label: 'Zonder overgang',
    moves: 'Niets. De toestand staat er op het moment dat hij geldt.',
    tokens: [],
    why: 'Een overgang maakt de toestand later zichtbaar. Wie met het toetsenbord loopt of een fout moet herstellen, mag daar niet op wachten.',
  },
]

export type MotionChange = {
  /** The component, or where the change is. */
  component: string
  group: MotionGroupId
  /** What happens now. */
  now: string
  /** What changes: colour, border, fill, size, visibility, place. */
  what: string
  /** What starts it: the mouse, focus, a press, a click, the state of the page, loading. */
  why: string
}

const jumps = 'Springt.'

export const motionChanges: MotionChange[] = [
  { component: 'Link', group: 'aanwijzen', now: jumps, what: 'Kleur en dikte van de streep', why: 'Muis' },
  { component: 'Button', group: 'aanwijzen', now: jumps, what: 'Vulling en rand', why: 'Muis' },
  { component: 'Button, zacht', group: 'aanwijzen', now: jumps, what: 'Vulling en rand', why: 'Muis' },
  {
    component: 'SegmentedControl',
    group: 'aanwijzen',
    now: 'Kleur van de tekst in 0,2 seconde (#500).',
    what: 'Kleur van de tekst',
    why: 'Muis',
  },
  { component: 'RichTextEditor, werkbalk', group: 'aanwijzen', now: jumps, what: 'Kleur van de tekst', why: 'Muis' },
  {
    component: 'Navigation, footer',
    group: 'aanwijzen',
    now: jumps,
    what: 'Kleur en dikte van de streep',
    why: 'Muis',
  },
  { component: 'Navigation, header', group: 'aanwijzen', now: jumps, what: 'Streep verschijnt', why: 'Muis' },
  {
    component: 'NewsItem, kop',
    group: 'aanwijzen',
    now: jumps,
    what: 'Streep verschijnt, bezocht heeft een andere kleur',
    why: 'Muis, focus, bezocht',
  },
  {
    component: 'DiscussionItem, titel',
    group: 'aanwijzen',
    now: jumps,
    what: 'Streep verschijnt, bezocht heeft een andere kleur',
    why: 'Muis, focus, bezocht',
  },
  {
    component: 'ThemeButton, kleur',
    group: 'aanwijzen',
    now: 'Kleur, rand en vulling in 0,2 seconde (#366).',
    what: 'Kleur, rand en vulling',
    why: 'Muis, focus',
  },
  {
    component: 'Page.Shortcuts, link',
    group: 'aanwijzen',
    now: 'Kleur in 0,2 seconde, de streep verschijnt (#286).',
    what: 'Kleur en streep',
    why: 'Muis',
  },
  {
    component: 'Page.Shortcuts, link',
    group: 'selecteren',
    now: 'Vulling in 0,1 seconde (#286).',
    what: 'Vulling',
    why: 'Ingedrukt (`:active`)',
  },
  {
    component: 'SegmentedControl, knop',
    group: 'selecteren',
    now: 'Schuift in 0,2 seconde naar de gekozen keuze, de kleur van de tekst gaat over (#500). Tussen twee pagina’s schuift hij met een overgang tussen pagina’s, waar de browser die kent.',
    what: 'Plaats van de knop en kleur van de tekst',
    why: 'Geselecteerd (`aria-pressed`, `aria-current`)',
  },
  {
    component: 'RichTextEditor, werkbalk',
    group: 'selecteren',
    now: jumps,
    what: 'Vulling, rand en kleur',
    why: 'Geselecteerd (`aria-pressed`)',
  },
  {
    component: 'ThemeButton, ingedrukt',
    group: 'selecteren',
    now: 'Kleur, rand en vulling in 0,2 seconde (#366).',
    what: 'Kleur, rand en vulling',
    why: 'Druk (`:active`)',
  },
  {
    component: 'Select, pijltje van de opgemaakte lijst',
    group: 'selecteren',
    now: 'Draait in 0,2 seconde (#440).',
    what: 'Draaiing van het pijltje',
    why: 'Open lijst (`:open`)',
  },
  {
    component: 'Heading, ankerlink',
    group: 'verschijnen',
    now: jumps,
    what: 'Zichtbaarheid en kleur van het pictogram',
    why: 'Muis, focus (alleen met een muis)',
  },
  {
    component: 'RichTextEditor, formulier voor een link',
    group: 'verschijnen',
    now: jumps,
    what: 'Zichtbaarheid van het formulier',
    why: 'Klik op de knop Link',
  },
  {
    component: 'ThemeButton, pictogram',
    group: 'pagina',
    now: 'De zon wordt de maan in 0,4 seconde (#366).',
    what: 'Vorm van het pictogram',
    why: 'Muis, focus, klik',
  },
  {
    component: 'Het thema van de pagina',
    group: 'pagina',
    now: jumps,
    what: 'Alle kleuren',
    why: 'Themaknop, systeeminstelling',
  },
  {
    component: 'Root, scrollen',
    group: 'pagina',
    now: 'Vloeiend, behalve met minder beweging.',
    what: 'Plaats op de pagina',
    why: 'Klik op een anker',
  },
  {
    component: 'PullToRefresh, label',
    group: 'pagina',
    now: 'Volgt de vinger, zonder duur. Met minder beweging blijft het staan en verschijnt het als loslaten ververst.',
    what: 'Plaats en doorzichtigheid',
    why: 'Trekken',
  },
  {
    component: 'Focusrand (`base/focus.css`)',
    group: 'direct',
    now: jumps,
    what: 'De rand verschijnt',
    why: 'Focus met het toetsenbord',
  },
  {
    component: 'Navigation, huidige pagina',
    group: 'direct',
    now: jumps,
    what: 'Vetter en een dikkere streep',
    why: 'Pagina (`aria-current`)',
  },
  {
    component: 'Heading, doel van een anker',
    group: 'direct',
    now: jumps,
    what: 'De pijl in de marge verschijnt',
    why: 'Een link of adres met een anker (`:target`)',
  },
  {
    component: 'Input, Textarea, Select',
    group: 'direct',
    now: jumps,
    what: 'Kleur en dikte van de rand',
    why: 'Een fout (`aria-invalid`)',
  },
  {
    component: 'RichTextEditor, tekstvak',
    group: 'direct',
    now: jumps,
    what: 'Kleur en dikte van de rand',
    why: 'Een fout (`aria-invalid`)',
  },
  {
    component: 'Field, melding',
    group: 'direct',
    now: jumps,
    what: 'De melding verschijnt',
    why: 'Een fout na het versturen',
  },
  {
    component: 'ErrorSummary',
    group: 'direct',
    now: jumps,
    what: 'Het blok verschijnt en krijgt de focus',
    why: 'Een fout na het versturen',
  },
  { component: 'PullToRefresh, knop', group: 'direct', now: jumps, what: 'De knop verschijnt', why: 'Focus' },
  {
    component: 'Page, strook boven de header',
    group: 'direct',
    now: jumps,
    what: 'De strook verdwijnt (attribuut `hidden`)',
    why: 'De header is uit beeld',
  },
]

export const motionTokens = [
  { name: '--hf-motion-duration-quick', use: 'Ingedrukt: het antwoord op een vinger of een toets.' },
  { name: '--hf-motion-duration-short', use: 'Kleur, vulling en rand, en iets dat in of uit beeld gaat.' },
  { name: '--hf-motion-duration-medium', use: 'Een vorm die in een andere overgaat. De langste duur die er is.' },
  { name: '--hf-motion-ease-change', use: 'Een toestand gaat over in een andere: kleur en vulling.' },
  { name: '--hf-motion-ease-morph', use: 'Een vorm gaat over in een andere: beide uiteinden zijn langzaam.' },
  { name: '--hf-motion-ease-enter', use: 'Iets komt binnen: eerst snel, dan rustig.' },
  { name: '--hf-motion-ease-exit', use: 'Iets gaat weg: eerst langzaam, dan weg.' },
] as const

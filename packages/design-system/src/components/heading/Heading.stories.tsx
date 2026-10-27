import preview from '#.storybook/preview'

import { Card } from '../card/Card'
import { Text } from '../text/Text'
import { Heading } from './Heading'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'Een kop.',
          'Het niveau (`level`, van 1 tot en met 4) volgt de structuur van de pagina, en de stijl (`appearance`, ook van 1 tot en met 4) volgt het ontwerp.',
          'Zonder `appearance` heeft de kop de stijl van zijn niveau.',
          '',
          'Een pagina heeft één `h1`, en je slaat geen niveau over: na een `h2` komt een `h2` of een `h3`.',
          '',
          '**Een kop met een anker.**',
          'Met `anchor` is de kop een link naar zichzelf, zodat een bezoeker direct naar dit deel van de pagina kan linken.',
          'Alleen een `h2`, `h3` of `h4` kan dat; de `h1` is de titel van de pagina.',
          'De tekst van de kop is de link, in de kleur van de kop en zonder streep eronder, met een ketting erachter.',
          'De naam van de link is dus de tekst van de kop, en het pictogram is verborgen voor een schermlezer.',
          'Met een muis verschijnt de ketting bij hover en bij focus van het toetsenbord; op een aanraakscherm staat hij altijd, rustig in de kleur van secundaire tekst.',
          'De kop waar een link naartoe wijst krijgt een pijl aan de beginkant, in de kleur van de focus, zonder beweging.',
          '',
          '**Het anker is een `id` dat jij kiest.**',
          'Het wordt niet uit de tekst van de kop gemaakt, zodat de link gelijk blijft als de kop wordt aangepast.',
          'Het is Nederlands, kort en betekenisvol, in kleine letters, cijfers en streepjes, tot veertig tekens.',
          'Goed: `cookies`, `wie-we-zijn`, `toegankelijkheidsverklaring`, `versie-0-2-0`.',
          'Fout, en het onderdeel weigert het: `Cookies` (hoofdletter), `wie we zijn` (spaties), `privé` (accent), `wie_we_zijn` (laag streepje), `versie-0.2.0` (punt) en `-cookies` (streepje aan het begin).',
          'Het `id` moet uniek zijn op de pagina; de rooktest van de site controleert dat.',
          '',
          '**Een anker is een belofte.**',
          'Een link die ergens op staat mag niet stuk gaan.',
          'Verandert het anker van een kop toch, zet het oude dan in `aliases`: elk oud anker wordt een leeg, onzichtbaar element in de kop, en werkt zonder JavaScript.',
          'Verhuist de kop naar een andere pagina, neem het anker dan mee en laat de oude pagina permanent doorverwijzen.',
          'Een oud anker mag de regels voor een nieuw anker overtreden (`versie-0.2.0`), want het bestond al.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Tekst/Heading',
})

const render = () => (
  <>
    <Heading level={1}>Nieuws over sc Heerenveen</Heading>
    <Heading level={2}>Wedstrijden</Heading>
    <Heading level={3}>Volgende wedstrijd</Heading>
    <Heading level={4}>Hoe we bronnen kiezen</Heading>
  </>
)

export const Light = meta.story({ globals: { theme: 'light' }, name: 'Licht', render })

export const Dark = meta.story({ globals: { theme: 'dark' }, name: 'Donker', render })

export const StyleApartFromLevel = meta.story({
  name: 'Stijl los van niveau',
  parameters: {
    docs: {
      description: {
        story:
          'De titel van een blok in de zijbalk is een `h2`, want het blok hangt direct onder de paginatitel. Met `appearance={3}` ziet die kop eruit als Kop 3.',
      },
    },
  },
  render: () => (
    <section aria-labelledby="discussies" className="_hf-docs-card" style={{ maxInlineSize: '24rem' }}>
      <Heading appearance={3} id="discussies" level={2}>
        Nieuwste discussies
      </Heading>
      <Heading appearance={4} level={3}>
        Een kop onder de titel
      </Heading>
    </section>
  ),
})

const renderSmallPrint = () => (
  <Heading level={2}>
    21 oktober 2026{' '}
    <Text appearance="meta" as="span">
      versie 0.1.0
    </Text>
  </Heading>
)

const smallPrint = {
  parameters: {
    docs: {
      description: {
        story: [
          'Een kop kan klein iets bij zich hebben, zoals het nummer van een versie achter de datum, net als "sinds 1997" achter de naam in het logo.',
          'Zet het in een `Text` met `appearance="meta"` en `as="span"`: dan is het klein, zonder kapitalen en in de kleur van secundaire tekst.',
          'Het hoort bij de kop, dus een schermlezer leest het mee.',
        ].join('\n'),
      },
    },
  },
  render: renderSmallPrint,
}

export const SmallPrintLight = meta.story({
  ...smallPrint,
  globals: { theme: 'light' },
  name: 'Met kleine tekst, licht',
})

export const SmallPrintDark = meta.story({
  ...smallPrint,
  globals: { theme: 'dark' },
  name: 'Met kleine tekst, donker',
})

const anchorsExample = () => (
  <section aria-labelledby="voorbeeld-privacy" className="_hf-docs-card" style={{ maxInlineSize: '32rem' }}>
    <Heading anchor id="voorbeeld-privacy" level={2}>
      Privacy
    </Heading>
    <Text>We tellen bezoekers zonder cookies.</Text>
    <Heading anchor id="voorbeeld-cookies" level={3}>
      Wat je browser bewaart
    </Heading>
    <Text>Niets, behalve je keuze voor licht of donker.</Text>
    <Heading anchor id="voorbeeld-contact" level={4}>
      Een vraag aan ons
    </Heading>
    <Heading level={4}>Een kop zonder anker</Heading>
  </section>
)

const anchorsParameters = {
  docs: {
    description: {
      story:
        'Een `h2`, een `h3` en een `h4` met een anker, en daaronder een kop zonder. Met een muis staat de ketting er pas bij hover of focus; op een aanraakscherm altijd.',
    },
  },
}

export const AnchorLight = meta.story({
  globals: { theme: 'light' },
  name: 'Met een anker, licht',
  parameters: anchorsParameters,
  render: anchorsExample,
})

export const AnchorDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Met een anker, donker',
  parameters: anchorsParameters,
  render: anchorsExample,
})

const hoverAndFocus = () => (
  <section className="_hf-docs-card" style={{ maxInlineSize: '32rem' }}>
    <Heading anchor id="onder-de-muis" level={2}>
      Onder de muis
    </Heading>
    <Heading anchor id="met-het-toetsenbord" level={2}>
      Met het toetsenbord
    </Heading>
  </section>
)

const hoverAndFocusParameters = {
  docs: {
    description: {
      story:
        'De eerste kop met de muis erop: de ketting heeft de kleur van links. De tweede met de focus van het toetsenbord: de ketting verschijnt en de link heeft een focusring.',
    },
  },
  pseudo: {
    focusVisible: ['#met-het-toetsenbord > a'],
    hover: ['#onder-de-muis > a'],
  },
}

export const HoverAndFocusLight = meta.story({
  globals: { theme: 'light' },
  name: 'Hover en focus, licht',
  parameters: hoverAndFocusParameters,
  render: hoverAndFocus,
})

export const HoverAndFocusDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Hover en focus, donker',
  parameters: hoverAndFocusParameters,
  render: hoverAndFocus,
})

// Zet het deel na het hekje, zodat de kop het doel van de pagina is, zoals na een klik op een
// link. Storybook leest dat deel niet.
const aimAt = (id: string) => () => {
  window.location.hash = ''
  window.location.hash = id
}

const target = () => (
  <Card as="section" style={{ maxInlineSize: '32rem' }}>
    <Heading anchor id="de-stand" level={2}>
      De stand
    </Heading>
    <Text>Deze kop is het doel van de link: er staat een pijl aan de beginkant.</Text>
    <Heading anchor id="de-uitslagen" level={2}>
      De uitslagen
    </Heading>
  </Card>
)

const targetParameters = {
  docs: {
    description: {
      story:
        'Wie via een link met `#de-stand` komt, ziet welk deel is bedoeld: een pijl aan de beginkant in de kleur van de focus, zonder beweging. In geforceerde kleuren heeft de pijl de kleur van het systeem. Op deze pagina met alle voorbeelden is de markering alleen te zien in de losse story.',
    },
  },
}

export const TargetLight = meta.story({
  globals: { theme: 'light' },
  name: 'Het doel van een link, licht',
  parameters: targetParameters,
  play: aimAt('de-stand'),
  render: target,
})

export const TargetDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Het doel van een link, donker',
  parameters: targetParameters,
  play: aimAt('de-stand'),
  render: target,
})

// A browser with a mouse hides the icon until it is pointed at. Storybook can't switch to a
// touch screen, so this story shows what a touch screen shows: the icon always there.
const touch = () => (
  <section className="touch-example _hf-docs-card" style={{ maxInlineSize: '32rem' }}>
    <style>{'.touch-example .hf-icon { opacity: 1 }'}</style>
    <Heading anchor id="op-aanraak" level={2}>
      Op een aanraakscherm
    </Heading>
    <Text>Zonder muis is er geen hover, dus de ketting staat er altijd, rustig in de kleur van secundaire tekst.</Text>
  </section>
)

const touchParameters = {
  docs: {
    description: {
      story:
        'Zo ziet een kop met een anker eruit op een aanraakscherm. Storybook kan niet naar een aanraakscherm wisselen, dus hier staat het pictogram met een vaste regel. Zet de browser op een telefoon om het echt te zien.',
    },
  },
}

export const TouchLight = meta.story({
  globals: { theme: 'light' },
  name: 'Op een aanraakscherm, licht',
  parameters: touchParameters,
  render: touch,
})

export const TouchDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Op een aanraakscherm, donker',
  parameters: touchParameters,
  render: touch,
})

const longWord = () => (
  <section className="touch-example _hf-docs-card" style={{ maxInlineSize: '16rem' }}>
    <style>{'.touch-example .hf-icon { opacity: 1 }'}</style>
    <Heading anchor id="lang-woord" level={2}>
      Toegankelijkheidsverklaring
    </Heading>
    <Heading anchor id="langer-woord" level={3}>
      Wedstrijdverslagenarchiefoverzichtspagina
    </Heading>
    <Heading anchor id="meer-woorden" level={3}>
      Een kop met meerdere woorden die over meer regels gaat
    </Heading>
  </section>
)

const longWordParameters = {
  docs: {
    description: {
      story:
        'In een smalle kolom breekt een lang woord, zodat de pagina niet opzij scrolt. De ketting blijft bij het laatste woord en staat nooit alleen op een regel.',
    },
  },
}

export const LongWordLight = meta.story({
  globals: { theme: 'light' },
  name: 'Met een lang woord, licht',
  parameters: longWordParameters,
  render: longWord,
})

export const LongWordDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Met een lang woord, donker',
  parameters: longWordParameters,
  render: longWord,
})

const withAliases = () => (
  <Card as="section" style={{ maxInlineSize: '32rem' }}>
    <Heading aliases={['wat-we-doen', 'werkwijze']} anchor id="hoe-we-werken" level={2}>
      Hoe we werken
    </Heading>
    <Text>
      Deze kop heette eerst "Wat we doen". Een link naar <a href="#wat-we-doen">#wat-we-doen</a> of naar{' '}
      <a href="#werkwijze">#werkwijze</a> brengt je hier nog steeds.
    </Text>
  </Card>
)

const withAliasesParameters = {
  docs: {
    description: {
      story:
        'Een kop met twee oude ankers. Ze staan als lege, onzichtbare elementen in de kop, dus een oude link werkt zonder JavaScript. De kop is ook het doel als de link naar een oud anker wijst.',
    },
  },
}

export const AliasesLight = meta.story({
  globals: { theme: 'light' },
  name: 'Met oude ankers, licht',
  parameters: withAliasesParameters,
  play: aimAt('wat-we-doen'),
  render: withAliases,
})

export const AliasesDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Met oude ankers, donker',
  parameters: withAliasesParameters,
  play: aimAt('wat-we-doen'),
  render: withAliases,
})

const anchorSmallPrint = () => (
  <section className="touch-example _hf-docs-card" style={{ maxInlineSize: '20rem' }}>
    <style>{'.touch-example .hf-icon { opacity: 1 }'}</style>
    <Heading anchor id="versie-0-2-0" level={2}>
      25 oktober 2026{' '}
      <Text appearance="meta" as="span">
        versie 0.2.0
      </Text>
    </Heading>
  </section>
)

export const AnchorSmallPrintLight = meta.story({
  globals: { theme: 'light' },
  name: 'Met een anker en kleine tekst, licht',
  parameters: {
    docs: {
      description: {
        story:
          'De kleine tekst hoort bij de kop en dus bij de link. De ketting blijft bij het laatste woord, ook als de kop op twee regels staat.',
      },
    },
  },
  render: anchorSmallPrint,
})

export const AnchorSmallPrintDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Met een anker en kleine tekst, donker',
  render: anchorSmallPrint,
})

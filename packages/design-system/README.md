# Designsysteem

Huisstijl, tokens en bouwstenen van de sc Heerenveen Fansite, in puur CSS en React.
Storybook is het handboek.

## Starten

Vanuit de hoofdmap van de repository:

```sh
pnpm install
pnpm --filter design-system storybook
```

Storybook draait dan op <http://localhost:6006>.
Het heeft ook een MCP-server voor agents, op <http://localhost:6006/mcp>.
De gepubliceerde Storybook heeft er ook een, openbaar en alleen-lezen, op <https://ds.heerenveen.org/mcp>.
Een agent in een andere repository voegt hem toe met `claude mcp add --transport http ds https://ds.heerenveen.org/mcp`; agents in deze repository houden de lokale server, die ook de gereedschappen om te ontwikkelen heeft.
Met `pnpm --filter design-system build-storybook` bouw je een statische versie in `storybook-static/`.

De tests van de componenten draai je met `pnpm --filter design-system test`.

## Gebruiken

Importeer één bestand voor de stijlen.
Daarin zitten de lettertypes, de tokens, de stijlen voor HTML-elementen, de typestijlen, de stijlen van de componenten en de hulpklassen.

```css
@import url('@fansite/design-system/index.css');
```

De componenten importeer je uit het package zelf.
Het package geeft ze als TypeScript-bronbestanden, zonder eigen bouwstap, zoals `@fansite/shared`.
Een app compileert ze mee; in Next.js zet je `@fansite/design-system` bij `transpilePackages`.

```tsx
import { Body, Page, Root } from '@fansite/design-system'
```

`Root` maakt het `html`-element met `lang="nl"`.
Zonder `data-theme` volgt de site de systeeminstelling; `data-theme="light"` of `data-theme="dark"` op `Root` kiest een thema.
Wat elk component doet, staat in de hoofdstukken Componenten en Patronen van Storybook.

## Afspraken

- **Puur CSS:** custom properties, cascade layers en geneste regels.
  Geen Sass, CSS-in-JS of Tailwind.
- **Voorvoegsel `hf-`** (Heerenveen Fansite) voor klassen en custom properties: `.hf-heading-3`, `--hf-colour-text-default`.
- **Lagen:** `hf.tokens`, `hf.base`, `hf.typography`, `hf.components`, `hf.utilities`.
  Een hulpklasse zit in `hf.utilities`, de sterkste laag, zodat een component of typestijl haar niet ongedaan maakt.
  CSS buiten een laag wint altijd.
  Het CSS-bestand van een component mag regels in meer dan één laag hebben: `heading/heading.css` heeft een basislaag en een typografielaag.
  De volgorde van de lagen staat in `src/layers.css`, dat `src/index.css` als eerste importeert.
  De volgorde van de overige imports in `src/index.css` is de volgorde van de regels binnen een laag.
- **Box-model:** een regel die padding of een rand zet op een element met een maat, zet ook `box-sizing: border-box`.
  Er is geen globale regel op `*`.
- **Logische eigenschappen:** `margin-inline-start` in plaats van `margin-left`.
  Stylelint controleert dit.
- **Kleur:** gebruik semantische tokens, zoals `--hf-colour-text-secondary`, nooit de primitieven (`--hf-colour-grey-600`) in componenten.
  Alleen het schild van het logo houdt vaste kleuren: een beeldmerk verandert niet met het thema.
- **Typografie:** een typestijl is een klasse en staat los van het HTML-niveau.
  Kapitalen komen uit CSS.
- **Componenten:** een React-component per HTML-element of onderdeel, met getypeerde props en de klassen met `hf-`.
  Kan een component meer dan één element zijn, dan kiest een `as`-prop uit een vaste lijst die de typen afdwingen.
  Een onderdeel dat bij één oudercomponent hoort, is een eigenschap van die ouder, ook als het element buiten die ouder wel geldig is: `List.Item` voor het `li` in een `List`, `Page.Header`, `Page.Body`, `Page.Main`, `Page.Sidebar`, `Page.Cell` en `Page.Footer` voor de delen van een `Page`.
  Een component zonder hooks of toestand blijft een servercomponent.
  Elk component heeft in zijn map een eigen CSS-bestand (`heading/heading.css`), stories, een pagina in Storybook en tests met Vitest en Testing Library.
- **Taal:** code en commentaar in Brits Engels (`colour`, `initialise`); alles wat bezoekers en lezers van Storybook zien in het Nederlands.

De keuzes en hun redenen staan in [`docs/beslissingen.md`](../../docs/beslissingen.md).

## Een pagina in Storybook

De pagina van een component is kort: een titel, een alinea, het voorbeeld met controls en de stories die nodig zijn.
Wat de code en [`docs/beslissingen.md`](../../docs/beslissingen.md) al zeggen, staat er niet nog eens.

- **Tekst:** één alinea over waarom het component er is en wanneer je het kiest.
  Geen regels over marges, maten of afstanden, en geen waarden in rem, pixels of breakpoints: die horen in de code.
  Een regel voor het gebruik die een bezoeker of schrijver nodig heeft, mag er staan als één zin.
- **Stories:** het voorbeeld met controls, en een story per variant die er anders uitziet, niet per prop.
  Licht en donker komt van de themaknop, niet van een tweede story per component.
  Alleen een component dat zelf van thema verandert, zoals op een donker vlak, krijgt een eigen donkere story.
- **Hover, focus en bezocht:** die zitten niet in de stories van elk component.
  De stories voor links en formulieren tonen ze één keer; de reviewer controleert de rest op de pagina's van de site.
  Een smal en een breed scherm tonen we met de werkbalk van Storybook, niet met aparte stories.
- **Controls:** een component krijgt controls zodra meer dan één prop de uitkomst verandert.
  De typen met `(typeof lijst)[number]` laten we staan; de weergave lossen we op in `ControlsDocsPage`, zodat de MCP-server de typen blijft lezen uit de code.
- **Pagina:** `ControlsDocsPage` is de standaard voor een component.
  De gedeelde `DocsPage` is voor hoofdstukken zonder voorbeeld, zoals Huisstijl en Redactie.
- **Tokens:** de tabellen met kleuren en contrast blijven, want de contrasttabel is het bewijs voor [`docs/toegankelijkheid.md`](../../docs/toegankelijkheid.md).
  De waarden in rem en pixels staan niet in de tekst eromheen.
- **Reviewer:** elk visueel component heeft een story, en de reviewer kijkt naar de pagina's van de site in licht en donker.
- **Indeling:** een component is één element of een algemeen onderdeel dat op elke site past, en een patroon zet componenten samen voor één soort inhoud van deze site.
  De titel van een story is `Componenten/<Subgroep>/<Naam>` of `Patronen/<Naam>`, met de subgroep Pagina, Tekst, Formulier, Navigatie of Weergave.
  `storySort` in `.storybook/preview.tsx` zet de groepen vast en sorteert binnen een groep op alfabet, zodat een nieuw component geen instelling aanraakt.

## Alleen Baseline 'widely available'

We gebruiken alleen functies die [Baseline](https://web.dev/baseline) 'widely available' zijn: ze werken al minstens dertig maanden in alle grote browsers.
Stylelint bewaakt dat in alle CSS.
ESLint bewaakt het in de TypeScript voor de browser: het designsysteem en de site, behalve de bestanden die alleen op de server of tijdens de bouw draaien (die staan in `eslint.config.js`).
`pnpm lint` faalt op een functie die nog niet zover is.

Een verbetering die nog niet zover is, zet je binnen `@supports`.
Een browser zonder de functie krijgt dan de standaardopmaak:

```css
@supports (accent-color: auto) {
  input:is([type='checkbox'], [type='radio']) {
    accent-color: var(--hf-colour-background-button);
  }
}
```

Voor een selector schrijf je `@supports selector(::marker)`.
Wordt de functie 'widely available', dan meldt Stylelint het `@supports`-blok als overbodig, en haal je het weg.
Dat gebeurt na een nieuwe versie van de regel, want die brengt de gegevens mee.
In JavaScript is er geen `@supports`: een functie die nog niet zover is, gebruiken we niet.

Een tijdelijke uitzondering is een `stylelint-disable` om een functie die bijna 'widely available' is en niet in `@supports` past.
Zo staat `light-dark()` in `src/tokens/colour.css` er nu omheen.
In JavaScript is dat een `eslint-disable-next-line`, zoals bij `willReadFrequently` in `src/docs/contrast.ts`.
Zet de reden erbij, en de datum waarop de functie 'widely available' wordt.
Een uitzondering die niet meer nodig is, meldt Stylelint als fout (`reportNeedlessDisables`), en ESLint doet dat voor een `eslint-disable`.
Zo blijft een uitzondering niet hangen.

`baseline.test.js` in de hoofdmap laat beide linters draaien op een functie die nog niet zover is, en kijkt of ze die vangen.

## Mappen

| Map              | Inhoud                                                                           |
| ---------------- | -------------------------------------------------------------------------------- |
| `src/tokens`     | Kleur- en typografietokens, met hun verhalen en documentatie                     |
| `src/base`       | Stijlen voor elementen zonder component, en alle verhalen van HTML-elementen     |
| `src/components` | De componenten, elk met stories, tests en CSS                                    |
| `src/utilities`  | Hulpklassen die één ding doen, zoals `hf-visually-hidden`, met stories en tests  |
| `src/assets`     | Logo's als SVG                                                                   |
| `src/docs`       | Huisstijl, Redactie en hulpcomponenten voor de documentatie                      |
| `.storybook`     | Instellingen van Storybook: themaknop, documentatie en toegankelijkheidscontrole |

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
Met `pnpm --filter design-system build-storybook` bouw je een statische versie in `storybook-static/`.

De tests van de componenten draai je met `pnpm --filter design-system test`.

## Gebruiken

Importeer één bestand voor de stijlen.
Daarin zitten de lettertypes, de tokens, de stijlen voor HTML-elementen, de typestijlen en de stijlen van de componenten.

```css
@import url('@fansite/design-system/index.css');
```

De componenten importeer je uit het package zelf.
Het package geeft ze als TypeScript-bronbestanden, zonder eigen bouwstap, zoals `@fansite/shared`.
Een app compileert ze mee; in Next.js zet je `@fansite/design-system` bij `transpilePackages`.

```tsx
import { Body, Page, PageBody, PageFooter, PageHeader, Root } from '@fansite/design-system'
```

`Root` maakt het `html`-element met `lang="nl"`.
Zonder `data-theme` volgt de site de systeeminstelling; `data-theme="light"` of `data-theme="dark"` op `Root` kiest een thema.
Wat elk component doet, staat in het hoofdstuk Componenten van Storybook.

## Afspraken

- **Puur CSS:** custom properties, cascade layers en geneste regels.
  Geen Sass, CSS-in-JS of Tailwind.
- **Voorvoegsel `hf-`** (Heerenveen Fansite) voor klassen en custom properties: `.hf-heading-3`, `--hf-colour-text-default`.
- **Lagen:** `hf.tokens`, `hf.base`, `hf.typography`, `hf.components`.
  CSS buiten een laag wint altijd.
  Het CSS-bestand van een component mag regels in meer dan één laag hebben: `heading/heading.css` heeft een basislaag en een typografielaag.
  De volgorde van de imports in `src/index.css` is de volgorde van de regels binnen een laag.
- **Logische eigenschappen:** `margin-inline-start` in plaats van `margin-left`.
  Stylelint controleert dit.
- **Kleur:** gebruik semantische tokens, zoals `--hf-colour-text-secondary`, nooit de primitieven (`--hf-colour-grey-600`) in componenten.
  Alleen het schild van het logo houdt vaste kleuren: een beeldmerk verandert niet met het thema.
- **Typografie:** een typestijl is een klasse en staat los van het HTML-niveau.
  Kapitalen komen uit CSS.
- **Componenten:** een React-component per HTML-element of onderdeel, met getypeerde props en de klassen met `hf-`.
  Kan een component meer dan één element zijn, dan kiest een `as`-prop uit een vaste lijst die de typen afdwingen.
  Een onderdeel dat alleen binnen zijn ouder werkt, is een eigenschap van die ouder: `List.Item` voor het `li` in een `List`.
  Een component zonder hooks of toestand blijft een servercomponent.
  Elk component heeft in zijn map een eigen CSS-bestand (`heading/heading.css`), stories in licht en donker, documentatie in Storybook en tests met Vitest en Testing Library.
- **Taal:** code en commentaar in Brits Engels (`colour`, `initialise`); alles wat bezoekers en lezers van Storybook zien in het Nederlands.

De keuzes en hun redenen staan in [`docs/beslissingen.md`](../../docs/beslissingen.md).

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
| `src/assets`     | Logo's als SVG                                                                   |
| `src/docs`       | Huisstijl, lege hoofdstukken en hulpcomponenten voor de documentatie             |
| `.storybook`     | Instellingen van Storybook: themaknop, documentatie en toegankelijkheidscontrole |

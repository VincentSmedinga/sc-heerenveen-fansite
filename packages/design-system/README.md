# Designsysteem

Huisstijl, tokens en bouwstenen van de sc Heerenveen Fansite, in puur CSS en (straks) React.
Storybook is het handboek.

## Starten

Vanuit de hoofdmap van de repository:

```sh
pnpm install
pnpm --filter design-system storybook
```

Storybook draait dan op <http://localhost:6006>.
Met `pnpm --filter design-system build-storybook` bouw je een statische versie in `storybook-static/`.

## Gebruiken

Importeer één bestand.
Daarin zitten de lettertypes, de tokens, de stijlen voor HTML-elementen en de typestijlen.

```css
@import url('@fansite/design-system/index.css');
```

Zet `lang="nl"` op het `html`-element.
Zonder `data-theme` volgt de site de systeeminstelling; `data-theme="light"` of `data-theme="dark"` kiest een thema.

## Afspraken

- **Puur CSS:** custom properties, cascade layers en geneste regels.
  Geen Sass, CSS-in-JS of Tailwind.
- **Voorvoegsel `hf-`** (Heerenveen Fansite) voor klassen en custom properties: `.hf-heading-3`, `--hf-colour-text-default`.
- **Lagen:** `hf.tokens`, `hf.base`, `hf.typography`, `hf.components`.
  CSS buiten een laag wint altijd.
- **Logische eigenschappen:** `margin-inline-start` in plaats van `margin-left`.
  Stylelint controleert dit.
- **Kleur:** gebruik semantische tokens, zoals `--hf-colour-text-secondary`, nooit de primitieven (`--hf-colour-grey-600`) in componenten.
- **Typografie:** een typestijl is een klasse en staat los van het HTML-niveau.
  Kapitalen komen uit CSS.
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
| `src/base`       | Stijlen voor HTML-elementen, met een verhaal per soort element                   |
| `src/typography` | Typestijlen als klassen                                                          |
| `src/assets`     | Logo's als SVG                                                                   |
| `src/docs`       | Huisstijl, lege hoofdstukken en hulpcomponenten voor de documentatie             |
| `.storybook`     | Instellingen van Storybook: themaknop, documentatie en toegankelijkheidscontrole |

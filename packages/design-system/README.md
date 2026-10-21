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

## Mappen

| Map              | Inhoud                                                                           |
| ---------------- | -------------------------------------------------------------------------------- |
| `src/tokens`     | Kleur- en typografietokens, met hun verhalen en documentatie                     |
| `src/base`       | Stijlen voor HTML-elementen, met een verhaal per soort element                   |
| `src/typography` | Typestijlen als klassen                                                          |
| `src/assets`     | Logo's als SVG                                                                   |
| `src/docs`       | Huisstijl, lege hoofdstukken en hulpcomponenten voor de documentatie             |
| `.storybook`     | Instellingen van Storybook: themaknop, documentatie en toegankelijkheidscontrole |

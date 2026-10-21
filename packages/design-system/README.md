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
- **Logische eigenschappen:** `margin-inline-start` in plaats van `margin-left`.
  Stylelint controleert dit.
- **Kleur:** gebruik semantische tokens, zoals `--hf-colour-text-secondary`, nooit de primitieven (`--hf-colour-grey-600`) in componenten.
- **Typografie:** een typestijl is een klasse en staat los van het HTML-niveau.
  Kapitalen komen uit CSS.
- **Componenten:** een React-component per HTML-element of onderdeel, met getypeerde props en de klassen met `hf-`.
  Kan een component meer dan één element zijn, dan kiest een `as`-prop uit een vaste lijst die de typen afdwingen.
  Een component zonder hooks of toestand blijft een servercomponent.
  Elk component heeft stories in licht en donker, documentatie in Storybook en tests met Vitest en Testing Library.
- **Taal:** code en commentaar in Brits Engels (`colour`, `initialise`); alles wat bezoekers en lezers van Storybook zien in het Nederlands.

De keuzes en hun redenen staan in [`docs/beslissingen.md`](../../docs/beslissingen.md).

## Mappen

| Map              | Inhoud                                                                           |
| ---------------- | -------------------------------------------------------------------------------- |
| `src/tokens`     | Kleur- en typografietokens, met hun verhalen en documentatie                     |
| `src/base`       | Stijlen voor HTML-elementen, met een verhaal per soort element                   |
| `src/components` | De componenten, elk met stories, tests en waar nodig CSS                         |
| `src/typography` | Typestijlen als klassen                                                          |
| `src/assets`     | Logo's als SVG                                                                   |
| `src/docs`       | Huisstijl, lege hoofdstukken en hulpcomponenten voor de documentatie             |
| `.storybook`     | Instellingen van Storybook: themaknop, documentatie en toegankelijkheidscontrole |

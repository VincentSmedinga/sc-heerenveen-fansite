# @fansite/site

De site van de sc Heerenveen Fansite.
Nu is het nog één pagina met "Binnenkort meer"; de pagina's komen met de volgende issues.

## Draaien

Zet in de root eerst `.env` klaar (zie de [README](../../README.md)), en start dan de site:

```sh
pnpm --filter site dev
```

De site luistert op <http://localhost:3000>.
Next.js leest alleen een `.env` in deze map, dus `next.config.ts` laadt de `.env` uit de root zelf.

| Opdracht                                   | Wat het doet                                                                           |
| ------------------------------------------ | -------------------------------------------------------------------------------------- |
| `pnpm --filter site dev`                   | De site met live herladen                                                              |
| `pnpm --filter site build`                 | De build, als standalone map in `.next/standalone`                                     |
| `pnpm --filter site assemble <nieuwe map>` | Zet de standalone build en de statische bestanden in één map, zonder symbolische links |
| `pnpm --filter site smoke <map>`           | Start die map en controleert wat een bezoeker en een zoekmachine krijgen               |
| `pnpm test:a11y`                           | Toetst de pagina's van de gebouwde site met axe (zie _Toegankelijkheid controleren_)   |

## Toegankelijkheid controleren

`pnpm test:a11y` start de gebouwde site en toetst elke pagina uit de lijst in [`e2e/pages.spec.ts`](e2e/pages.spec.ts) met axe, in Chromium, in licht en donker.
axe toetst op WCAG 2.0, 2.1 en 2.2, niveau A en AA, en op de best practices van axe.
Elke schending laat de controle falen; er staan geen regels uit.
Per pagina controleert de test ook precies één `h1`, `lang="nl"` op het `html`-element en geen horizontale scrollbalk in een venster van 320 pixels breed.
Een nieuwe pagina is één regel in de lijst, met het antwoord dat de pagina moet geven: 200, of 404 voor de pagina 'niet gevonden'.
Kloppen die niet, dan faalt de test, zodat een tikfout in het adres niet stil de pagina 'niet gevonden' toetst.

Dit moet eerst draaien, vanuit de root:

1. De database met de seed: `docker compose up -d --wait`, `pnpm db:migrate` en `pnpm db:seed`.
2. `pnpm build`.
3. Eenmalig Chromium: `pnpm --filter site exec playwright install chromium`.

De opdracht zet de build zelf klaar in `.next/a11y`, zoals `assemble` dat doet, en start die.
CI geeft de map van de rooktest mee in `SITE_FOLDER`, zodat dezelfde map wordt getoetst.
Faalt een pagina, dan noemt de log de pagina en het thema (in de naam van de test), de regel van axe en het element.

`e2e/check-page.spec.ts` laat zien dat de controle een fout vangt: een link zonder naam, een tweede `h1`, een verkeerde `lang` en een pagina die op 320 pixels opzij scrolt.
De test serveert die pagina's zelf; ze staan niet op de site.
De stories in Storybook toetst axe niet in CI; dat doet het paneel Toegankelijkheid.

## Zoekmachines

De omgevingsvariabele `SITE_ENV` bepaalt of zoekmachines de site mogen indexeren.
Alleen `production` mag.
Bij `local` en `acceptance` krijgt elk antwoord de header `X-Robots-Tag: noindex, nofollow`, en `/robots.txt` weigert alles.
De site leest `SITE_ENV` als de server draait, dus dezelfde build kan naar elke omgeving.
Zonder geldige `SITE_ENV` start de server niet.

Hoe de acceptatieomgeving op de hosting staat, staat in [`docs/acceptatieomgeving.md`](../../docs/acceptatieomgeving.md).

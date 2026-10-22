# @fansite/site

De site van de sc Heerenveen Fansite.
Er zijn nu twee pagina's: de homepage met "Binnenkort meer", en `/bronnen` met de bronnen uit het register.
De andere pagina's komen met de volgende issues.

## Draaien

Zet in de root eerst `.env` klaar (zie de [README](../../README.md)).
Start de database en zet er de testbronnen in, zoals de [README van `@fansite/db`](../../packages/db/README.md) zegt.
Start dan de site:

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

De rooktest heeft de database nodig, met de migraties gedraaid.
Hij leest `DATABASE_URL` uit de `.env` in de root, als die er is.

## Sjablonen

De layout, de pagina's en de pagina voor een onbekend adres bevatten geen HTML, alleen componenten uit `@fansite/design-system`.
Dat geldt voor elk `.tsx`-bestand in `src`, behalve tests.
`pnpm lint` faalt op een HTML-element, zoals `<p>` of `<li>`.
De header, met het logo en het hoofdmenu, en de footer staan in `src/app/layout.tsx`, dus elke pagina heeft ze.

## De bronnen

`/bronnen` toont de bronnen die aanstaan, per soort, elk met een link naar de website en de beschrijving uit het register.
De koppen van de soorten staan in `src/register.ts`.
De server bewaart de lijst een uur (`src/sources.ts`), dus een wijziging in het register staat binnen een uur op de pagina.

## Content Security Policy

Elk antwoord krijgt de header `Content-Security-Policy` (zie `src/proxy.ts`).
Een pagina laadt alleen iets van onze eigen server: geen scripts, stijlen, lettertypes, afbeeldingen of frames van een ander domein.
Inline scripts en stijlen mogen wel, omdat Next.js ze nodig heeft.

## Zoekmachines

De omgevingsvariabele `SITE_ENV` bepaalt of zoekmachines de site mogen indexeren.
Alleen `production` mag.
Bij `local` en `acceptance` krijgt elk antwoord de header `X-Robots-Tag: noindex, nofollow`, en `/robots.txt` weigert alles.
De site leest `SITE_ENV` als de server draait, dus dezelfde build kan naar elke omgeving.
Zonder geldige `SITE_ENV` start de server niet.

Hoe de acceptatieomgeving op de hosting staat, staat in [`docs/acceptatieomgeving.md`](../../docs/acceptatieomgeving.md).

# @fansite/site

De site van de sc Heerenveen Fansite.
Er zijn nu zes pagina's: de homepage met de koppen van de afgelopen twee weken, `/podcasts` met de afleveringen van de podcasts, `/bronnen` met de bronnen uit het register, `/over-ons` over de site, `/privacy` met de privacyverklaring, en `/updates` met wat er per versie veranderd is, met een RSS-feed.
De andere pagina's komen met de volgende issues.

## Draaien

Zet in de root eerst `.env` klaar (zie de [README](../../README.md)).
Start de database en zet er de bronnen uit de seed in, zoals de [README van `@fansite/db`](../../packages/db/README.md) zegt.
De site draait de migraties zelf als hij start (zie _De database bij het starten_), maar de bronnen uit de seed zet hij er alleen op acceptatie in.
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
| `pnpm --filter site share-image`           | Maakt `public/share-image.png` opnieuw, de afbeelding bij het delen van links          |
| `pnpm --filter site icons`                 | Maakt de iconen in `public` opnieuw uit de vector van het designsysteem                |
| `pnpm test:a11y`                           | Toetst de pagina's van de gebouwde site met axe (zie _Toegankelijkheid controleren_)   |

De rooktest heeft een MariaDB nodig, zoals de tests van `@fansite/db`: `docker compose up -d --wait`.
Hij leest `DATABASE_URL` uit de `.env` in de root, als die er is.
De gebruiker daarin moet databases mogen maken.
Voor elke run die een database nodig heeft, maakt hij een lege database op die server, laat de site er zelf de tabellen in maken, en haalt de database daarna weg.
Zo bewijst hij ook dat de migraties in de map zitten.
Hij start de map ook met een database die niet bereikbaar is, en controleert dat de homepage en `/bronnen` de foutpagina tonen.
Op `/updates` controleert hij dat de pagina de versies uit `CHANGELOG.md` toont die zinnen hebben, en dat de links in de feed naar het adres van acceptatie of productie gaan.
Hij controleert ook dat de oude adressen `/wat-is-er-nieuw` en `/wat-is-er-nieuw/feed.xml` blijvend doorverwijzen naar `/updates` en de feed.

## Toegankelijkheid controleren

`pnpm test:a11y` start de gebouwde site en toetst elke pagina uit de lijst in [`e2e/pages.spec.ts`](e2e/pages.spec.ts) met axe, in Chromium, in licht en donker.
axe toetst op WCAG 2.0, 2.1 en 2.2, niveau A en AA, en op de best practices van axe.
Elke schending laat de controle falen; er staan geen regels uit.
Per pagina controleert de test ook precies één `h1`, `lang="nl"` op het `html`-element, dat de browser niets van een ander domein laadt, en geen horizontale scrollbalk in een venster van 320 pixels breed.
Wat er op een pagina staat, controleren de unit-tests; maten en uitlijning kijk je na in Storybook en in de review (zie _Checklist voor code en beveiliging_ in [`CONTRIBUTING.md`](../../CONTRIBUTING.md)).
Een nieuwe pagina is één regel in de lijst, met het antwoord dat de pagina moet geven: 200, of 404 voor de pagina 'niet gevonden'.
Kloppen die niet, dan faalt de test, zodat een tikfout in het adres niet stil de pagina 'niet gevonden' toetst.

De homepage toont koppen uit de database, en de seed heeft er geen.
Daarom zet `e2e/global-setup.ts` vóór de eerste test verzonnen koppen op de testbronnen in de database, en haalt ze er na de laatste test weer uit (`e2e/headlines.ts`).
Of de homepage een bericht van veertien dagen oud of ouder en een van een uitgezette bron weglaat, toetst `queries.test.ts` van `@fansite/db` op een echte MariaDB.
Hier gaat het om axe op de pagina met nieuws.
Draait de database van de controle ook echte berichten, door `pnpm run import`, dan staan die er gewoon tussen.
Playwright wacht tot `/robots.txt` antwoordt en niet tot de homepage, want die bewaart haar koppen vijf minuten in het geheugen.

Dit moet eerst draaien, vanuit de root:

1. De database: `docker compose up -d --wait`.
   De gebouwde site draait de migraties en zet de bronnen uit de seed er zelf in, want de controle start hem met `SITE_ENV=acceptance`.
2. `pnpm build`.
3. Eenmalig Chromium: `pnpm --filter site exec playwright install chromium`.
   CI installeert niets: die gebruikt de Google Chrome die op de runner staat.

De opdracht zet de build zelf klaar in `.next/a11y`, zoals `assemble` dat doet, en start die.
Hij start de site een tweede keer, zonder bereikbare database, voor de foutpagina (`e2e/error-page.spec.ts`): in licht en donker, en zonder JavaScript.
CI geeft de map van de rooktest mee in `SITE_FOLDER`, zodat dezelfde map wordt getoetst.
Faalt een pagina, dan noemt de log de pagina en het thema (in de naam van de test), de regel van axe en het element.

`e2e/check-page.spec.ts` laat zien dat de controle een fout vangt: een link zonder naam, een tweede `h1`, een verkeerde `lang`, een verzoek naar een ander domein en een pagina die op 320 pixels opzij scrolt.
De test serveert die pagina's zelf; ze staan niet op de site.
De stories in Storybook toetst axe niet in CI; dat doet het paneel Toegankelijkheid.

## Sjablonen

De layout, de pagina's en de pagina voor een onbekend adres bevatten geen HTML, alleen componenten uit `@fansite/design-system`.
Dat geldt voor elk `.tsx`-bestand in `src`, behalve tests.
`pnpm lint` faalt op een HTML-element, zoals `<p>` of `<li>`.
De header, met het logo en het hoofdmenu, en de footer staan in `src/app/layout.tsx`, dus elke pagina heeft ze.

## De homepage

De `h1` van de homepage is "sc Heerenveen Fansite", maar die zie je niet: het logo erboven zegt het al.
Hij heeft de klasse `hf-visually-hidden` uit het designsysteem, dus een schermlezer leest hem wel voor.
Daaronder staat het blok "Laatste nieuws": de berichten van de bronnen die aanstaan, van vandaag en de zes dagen ervoor, het nieuwste eerst, in één lijst zonder kop per dag.
Een bericht is een `NewsItem` uit het designsysteem: links de korte dag en de tijd, zoals "wo 14:05" (op een smalle regel boven de kop), dan de kop als link naar de bron, en daaronder de bronnaam en, achter een betaalmuur, "voor abonnees".
Zijn er geen berichten, dan staat er een tekst voor bezoekers.
Onder het blok staat de link naar Onze bronnen.

In de zijbalk naast het nieuws staat het blok "Nieuwste discussies": de vier discussies van het forum waar het laatst op is gereageerd.
Een discussie is een `DiscussionItem` uit het designsysteem: de titel als link naar het laatste bericht van de discussie op het forum, en daaronder het aantal reacties, de schermnaam van de laatste reageerder als gewone tekst en de tijd, zoals "83 reacties · laatst Buffon1 · 13:28".
Van vandaag staat alleen de tijd, van de zes dagen ervoor de korte dag en de tijd, en daarvoor de datum.
Onder de discussies staat de link "Naar het forum"; zijn er geen discussies, dan staat er een tekst voor bezoekers boven die link.
De pagina laadt niets van het forum: alleen de links gaan erheen.
De importer bewaart de discussies (zie de [README van de importer](../importer/README.md)), en `listNewestDiscussions` in `@fansite/db/queries` haalt ze op, met alleen de velden die de pagina toont, van forums die aanstaan.
De server bewaart ze vijf minuten (`src/discussions.ts`).

`listRecentItems` in `@fansite/db/queries` haalt de berichten op, met alleen die velden.
`src/news.ts` rekent de twee weken uit in Nederlandse tijd (`Europe/Amsterdam`), en schrijft de dag of de datum en de tijd.
De server bewaart de koppen vijf minuten (`src/headlines.ts`), dus een nieuw bericht staat binnen vijf minuten op de pagina.
De pagina wordt bij elk bezoek gemaakt, dus de build leest de database niet.
Lukt het lezen niet, dan toont de pagina de foutpagina, zoals `/bronnen`.
Onder de discussies staat het blok "Nieuwste podcasts": de vier nieuwste afleveringen van alle podcasts, als `NewsItem`, met de link "Alle podcasts" naar `/podcasts` eronder.
De server bewaart ze vijf minuten (`src/podcasts.ts`).
De afleveringen hebben dezelfde feiten als op `/podcasts`.

Lokaal staan er berichten en discussies na `pnpm run import` (zie de [README van de importer](../importer/README.md)).

## De podcasts

`/podcasts` toont de afleveringen van de podcasts die aanstaan, nieuwste eerst, 25 per pagina, elk als `NewsItem`: de titel als link naar de pagina van de aflevering bij de maker, de naam van de podcast en de tijd.
Achter de naam staan de feiten die de feed geeft, als `details` van de `NewsItem`: het seizoen en het nummer, zoals "seizoen 9, aflevering 16" of "aflevering 120", en de duur, zoals "37 min" of "1 uur 12 min" (`episodeDetails` in `src/news.ts`).
Een aflevering van deze week heeft de korte dag en de tijd, zoals "wo 14:05"; een oudere heeft de datum, met het jaar als dat niet dit jaar is, want de lijst gaat jaren terug.
Boven de lijst staat het filter (`Filter` uit het designsysteem): "Alle podcasts" en een link per podcast met afleveringen, als `/podcasts?podcast=omroep-abe`.
De slug komt uit de kolom `slug` van `sources`, dus een andere naam verandert het adres niet.
Bij een gekozen podcast staat in de zijbalk een kaart op een tonaal vlak (`Card` met `surface="soft"`) met de kop "Over Omroep Abe", de beschrijving van de podcast uit het register (`sources.description`, de tekst van de maker uit zijn feed, dezelfde als op Onze bronnen), en daarna "Luister ook op" met een lijst met een tekstlink per adres dat de podcast heeft.
Heeft de podcast geen adressen, dan staat de beschrijving er alleen.
Bij "Alle podcasts" staat er geen kaart.
Op een smal scherm staat de zijbalk onder de lijst, zoals bij de andere pagina's.
Onder de lijst staat de paginering (`Pagination`), als er meer dan één pagina is: `/podcasts?pagina=2`, en met een filter `/podcasts?podcast=omroep-abe&pagina=2`.
Een podcast die niet in het filter staat, en een `pagina` die geen positief geheel getal is of na de laatste komt, geven de pagina "niet gevonden" met status 404.
Een parameter die de pagina niet kent, telt niet mee.
De server bewaart elke combinatie van podcast en pagina vijf minuten, maar alleen na de controle van het adres, zodat een bezoeker de cache niet kan vullen met adressen van zichzelf (`src/podcasts.ts`).
Lukt het lezen niet, dan toont de pagina de foutpagina, zoals `/bronnen`.
De pagina laadt niets van een podcastplatform: alleen de links gaan erheen.

`pnpm test:a11y` zet verzonnen afleveringen op de testpodcasts van de seed, genoeg voor een tweede pagina (`e2e/episodes.ts`).

## De bronnen

`/bronnen` toont de bronnen die aanstaan, per soort, elk met een link naar de website en de beschrijving uit het register.
De koppen van de soorten staan in `src/register.ts`.
De server bewaart de lijst een uur (`src/sources.ts`), dus een wijziging in het register staat binnen een uur op de pagina.
De pagina's delen één verbinding met de database (`src/database.ts`).

## De database bij het starten

Als de server start, zet hij de database klaar, en pas daarna beantwoordt hij verzoeken (`src/instrumentation.ts`).
Hij draait de migraties die de database nog niet had, uit `packages/db/drizzle`, en alleen met `SITE_ENV=acceptance` zet hij de bronnen uit de seed in het register.
`assemble` zet de migraties in de map, op dezelfde plek ten opzichte van `apps/site` als in de repository.
Een slot in de database (`GET_LOCK`) laat twee processen die tegelijk starten, om de beurt migreren.
Lukt het niet, bijvoorbeeld omdat de database niet bereikbaar is, dan staat de reden in het logboek en blijft de server draaien.
`docs/acceptatieomgeving.md` zegt wat je in het logboek ziet.

## Mail versturen

`sendMail` in `src/mail.ts` verstuurt een mail in platte tekst via de mailserver van de hosting, met TLS.
De pagina's die het nodig hebben (het contactformulier en het inloggen voor het beheer) roepen het aan:

```ts
import { MailError, sendMail } from './mail'

await sendMail({ replyTo: 'bezoeker@example.org', subject: 'Vraag', text: 'Hallo', to: 'fansite@example.org' })
```

`from` mag je weglaten; dan is het `MAIL_FROM`.
De functie weigert een nieuwe regel in de adressen en het onderwerp, en elk adres moet precies één adres zijn.
Gaat het mis, dan geeft ze een `MailError` met alleen een code, zonder het wachtwoord, het adres of de tekst.
Zet die fout in het logboek en toon de bezoeker een eigen melding.
De instellingen staan in `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` en `MAIL_FROM` (zie `.env.example`).
Op acceptatie en productie zijn ze verplicht.
Zonder ze, alleen lokaal, schrijft `sendMail` de mail in het logboek van `pnpm dev`, met de tekst dat er niets is verstuurd.
`docs/acceptatieomgeving.md` zegt hoe de eigenaar de instellingen zet en met `send-test-mail.mjs` een proefmail verstuurt.

## De foutpagina

Een pagina die door een fout op de server niet lukt, toont `Er ging iets mis` in de paginaopbouw (`src/ServerError.tsx`).
Next.js 16 kan niet allebei: een pagina die gooit, geeft een 500 met een lege `body`, en de tekst van `app/error.tsx` komt pas nadat de browser JavaScript heeft uitgevoerd.
Daarom vangt een pagina die een fout verwacht, hem zelf op en toont `ServerError` in de HTML, zoals `/bronnen` doet.
Dat antwoord is een 200, met `noindex` in de HTML, zodat zoekmachines de pagina niet bewaren.
Een fout die niemand opvangt, valt terug op `app/error.tsx`, met dezelfde tekst en een 500, maar alleen met JavaScript.
Een nieuwe pagina die de database leest, doet wat `src/app/bronnen/page.tsx` doet: de query vangen, de reden loggen met `reasonOf`, en `ServerError` tonen, met `robots: { index: false }` in de metadata.
De beslissing en de alternatieven staan in `docs/beslissingen.md`.

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

Op `production` verwijst `/robots.txt` naar `/sitemap.xml`.
De sitemap, de canonieke URL's en de Open Graph-tags beginnen met het adres van de omgeving (`originOf()` in `src/env.ts`).
Elke pagina staat met zijn beschrijving in `src/pages.ts`, en haalt zijn metadata uit `pageMetadata()` in `src/metadata.ts`.
Zo'n pagina rendert bij elk verzoek (`dynamic = 'force-dynamic'`), omdat een statische pagina het adres van de build zou bewaren.
Een nieuwe pagina komt in de lijst, of in de uitzonderingen van `src/app/sitemap.test.ts`: die test faalt anders.
De afbeelding bij het delen van links is `public/share-image.png`, het schild van de site.
`pnpm --filter site share-image` maakt hem opnieuw met Playwright; we doen dat alleen als het logo verandert.

Hoe de acceptatieomgeving op de hosting staat, staat in [`docs/acceptatieomgeving.md`](../../docs/acceptatieomgeving.md).

## Icoon en manifest

De site is installeerbaar: een bezoeker kan hem als app op een computer zetten of op het beginscherm van een telefoon.
Er is geen service worker, dus de site werkt niet offline (zie `docs/beslissingen.md`).
Het manifest is `src/app/manifest.ts`, dat Next.js op `/manifest.webmanifest` zet.
De iconen en de `theme-color` staan in `src/app/layout.tsx`.

Het icoon is het logo zelf, `packages/design-system/src/assets/logo.svg`, zonder aanpassing.
`pnpm --filter site icons` maakt er de bestanden in `public` van, met het Chromium van Playwright en zonder dependency van zichzelf:

- `icon.svg`, een kopie voor het tabblad;
- `favicon.ico`, met PNG's van 16, 32 en 48 pixels, voor browsers en zoekmachines die er zelf om vragen;
- `icon-192.png` en `icon-512.png`, transparant, voor het manifest;
- `apple-touch-icon.png` (180 bij 180 pixels) en `icon-maskable-512.png`, het schild op een vlak van het donkerblauw van de kop.

Het donkerblauw komt uit het token `--hf-colour-background-header` in `colour.css` van het designsysteem.
`next.config.ts` leest het bij de bouw (zie `src/header-colour.ts`), en het script voor de iconen leest hetzelfde bestand.
Draai het script alleen opnieuw als de vector of dat token verandert, en zet de nieuwe bestanden in de repository.
`src/icons.test.ts` controleert de afmetingen en de transparantie, en dat het vlak de kleur van het token heeft.

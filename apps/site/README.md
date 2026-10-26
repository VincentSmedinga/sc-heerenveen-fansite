# @fansite/site

De site van de sc Heerenveen Fansite.
Er zijn nu acht pagina's: de homepage met de nieuwste koppen, `/wedstrijden` met het programma, de uitslagen en de stand, `/podcasts` met de afleveringen van de podcasts, `/bronnen` met de bronnen uit het register, `/over-ons` over de site, `/privacy` met de privacyverklaring, `/contact` met het contactformulier, en `/updates` met wat er per versie veranderd is, met een RSS-feed.
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

| Opdracht                                   | Wat het doet                                                                                    |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `pnpm --filter site dev`                   | De site met live herladen                                                                       |
| `pnpm --filter site build`                 | De build, als standalone map in `.next/standalone`                                              |
| `pnpm --filter site assemble <nieuwe map>` | Zet de standalone build en de statische bestanden in één map, zonder symbolische links          |
| `pnpm --filter site smoke <map>`           | Start die map en controleert wat een bezoeker en een zoekmachine krijgen                        |
| `pnpm --filter site share-image`           | Maakt `public/share-image.png` opnieuw, de afbeelding bij het delen van links                   |
| `pnpm --filter site icons`                 | Maakt de iconen van de site, Storybook en het Forum opnieuw uit de vector van het designsysteem |
| `pnpm test:a11y`                           | Toetst de pagina's van de gebouwde site met axe (zie _Toegankelijkheid controleren_)            |
| `pnpm screenshots <adres> <pad>...`        | Maakt plaatjes van een draaiende build (zie _Screenshots maken_)                                |
| `pnpm --filter site test-data`             | Zet de verzonnen gegevens van de controle in de database, voor die plaatjes                     |

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
Hetzelfde doet het met een verzonnen artikel van de redactie, een concept en een artikel voor later, met een eigen account (`e2e/articles.ts`).
Zo toetst axe de homepage met de kaart "Van de redactie" en de pagina `/redactie/e2e-artikel`, en toetst `e2e/articles.spec.ts` dat een concept en een artikel voor later nergens staan.
Of de homepage een bericht van een uitgezette bron weglaat en het getal in de vraag aan de database klopt, toetst `queries.test.ts` van `@fansite/db` op een echte MariaDB.
De controle toetst de homepage ook met `?nieuws=15`, zodat de oudere koppen die de knop laadt ook langs axe komen.
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
Eerst start hij `scripts/fake-smtp.js`, een nepmailserver voor `e2e/contact.spec.ts`.
Die zet elke mail in `.next/fake-smtp`, en maakt zijn certificaat met `openssl`, dat dus op je computer moet staan (op macOS en op de runner van CI staat het er al).
CI geeft de map van de rooktest mee in `SITE_FOLDER`, zodat dezelfde map wordt getoetst.
Faalt een pagina, dan noemt de log de pagina en het thema (in de naam van de test), de regel van axe en het element.

`e2e/check-page.spec.ts` laat zien dat de controle een fout vangt: een link zonder naam, een tweede `h1`, een verkeerde `lang`, een verzoek naar een ander domein en een pagina die op 320 pixels opzij scrolt.
De test serveert die pagina's zelf; ze staan niet op de site.
De stories in Storybook toetst axe niet in CI; dat doet het paneel Toegankelijkheid.

## Screenshots maken

`pnpm screenshots` maakt van een draaiende build de plaatjes voor de beschrijving van een pull request (zie _Screenshots_ in [`AGENTS.md`](../../AGENTS.md)).
Het start zelf geen server en neemt alleen een build op deze computer aan.
Per pagina of story schrijft het een PNG voor een telefoon (390 pixels breed) en een bureaublad (900 pixels breed), licht tenzij je `--dark` meegeeft, met één schermpixel per CSS-pixel.
Chromium schrijft een PNG zonder overbodige gegevens, dus er is geen verkleiner nodig.
De bestanden heten naar het pad of de story en de breedte, zoals `podcasts-390.png` en `home-900-dark.png`, en komen in `screenshots/` in de map waar je het draait.
Kies een andere map met `--out <map>`.
`--full-page` neemt de hele pagina in plaats van het eerste scherm.

De homepage (met de kaart van het artikel), `/redactie/e2e-artikel` en `/podcasts` hebben de verzonnen gegevens van de toegankelijkheidscontrole nodig (zie _Toegankelijkheid controleren_), en `pnpm test:a11y` haalt ze er na afloop weer uit.
`pnpm --filter site test-data` zet ze in de database van je `.env`, en `pnpm --filter site test-data --remove` haalt ze er weer uit.
Gebruik daarvoor de database waarmee je ontwikkelt, niet die van de controle of van de hosting.
Vanuit de root:

```sh
docker compose up -d --wait
pnpm build
pnpm db:migrate
pnpm db:seed
pnpm --filter site test-data
pnpm --filter site assemble .next/screenshots
HOSTNAME=127.0.0.1 pnpm --filter site exec node --env-file-if-exists=../../.env .next/screenshots/apps/site/server.js
```

Zet de gegevens erin vóór je de site start: de homepage bewaart haar koppen vijf minuten.
`HOSTNAME` staat erbij omdat het in veel shells de naam van je computer is, en de site daar dan op luistert.
De site luistert op <http://127.0.0.1:3000>.
Maak de plaatjes in een tweede terminal:

```sh
pnpm screenshots http://127.0.0.1:3000 / /podcasts
pnpm screenshots http://127.0.0.1:3000 /over-ons --dark
```

Voor een component bouw je Storybook, serveer je de map met de build, en geef je het id van een story:

```sh
pnpm --filter design-system build-storybook
python3 -m http.server 6006 --bind 127.0.0.1 --directory packages/design-system/storybook-static
pnpm screenshots http://127.0.0.1:6006 componenten-page-footer--light
```

De tweede opdracht blijft draaien, dus geef de derde in een tweede terminal.

Een pad begint met een schuine streep, al het andere is het id van een story.
Het script volgt de kleurkeuze van de browser (`prefers-color-scheme`), dus het werkt voor de site en voor Storybook.
Een pagina die niet met 200 antwoordt, laat het commando falen, zodat een tikfout in het adres geen plaatje van een foutpagina geeft.

## Sjablonen

De layout, de pagina's en de pagina voor een onbekend adres bevatten geen HTML, alleen componenten uit `@fansite/design-system`.
Dat geldt voor elk `.tsx`-bestand in `src`, behalve tests.
`pnpm lint` faalt op een HTML-element, zoals `<p>` of `<li>`.
De header, met het logo en het hoofdmenu, en de footer staan in `src/app/layout.tsx`, dus elke pagina heeft ze.

## De homepage

De `h1` van de homepage is "sc Heerenveen Fansite", maar die zie je niet: het logo erboven zegt het al.
Hij heeft de klasse `hf-visually-hidden` uit het designsysteem, dus een schermlezer leest hem wel voor.
Daaronder staat het blok "Laatste nieuws": de tien nieuwste berichten van de bronnen die aanstaan, het nieuwste eerst, in één lijst zonder kop per dag, hoe oud ze ook zijn.
Een bericht is een `NewsItem` uit het designsysteem: links de korte dag en de tijd, zoals "wo 14:05" (op een smalle regel boven de kop), dan de kop als link naar de bron, en daaronder de bronnaam en, achter een betaalmuur, "voor abonnees".
Zijn er geen berichten, dan staat er een tekst voor bezoekers.
Zijn er oudere berichten, dan staat onder de lijst de knop "Laad 5 meer".
De knop zit in een formulier met `method="get"` dat de homepage opnieuw laadt met het aantal in het adres, zoals `/?nieuws=15#nieuws-11`.
Elke kop in de lijst heeft een `id` met zijn nummer (`nieuws-11`), en het formulier gaat naar de eerste nieuwe kop, dus de bezoeker blijft op dezelfde plek.
Dat werkt zonder JavaScript en zonder API.
`parseHeadlineCount` in `src/headlines.ts` controleert het getal: een geheel getal vanaf 10, in stappen van 5, en niet meer dan 100.
Elk ander getal geeft de eerste tien.
De getallen staan op één plek, in `src/items-per-card.ts`: `firstHeadlines` (10) en `moreHeadlines` (5).
Bij tien koppen of minder is er geen knop, en bij 100 koppen verdwijnt hij; ouder nieuws is voor het archief (#26).
Een pagina met `?nieuws=` heeft de homepage zelf als canoniek adres, en staat niet in de sitemap.
Onder het blok staat de link naar Onze bronnen.

De kaarten met discussies en podcasts tonen vijf items: het aantal staat op één plek, `itemsPerCard` in `src/items-per-card.ts`.

In de zijbalk naast het nieuws staat het blok "Nieuwste discussies": de vijf discussies van het forum waar het laatst op is gereageerd.
Een discussie is een `DiscussionItem` uit het designsysteem: de titel als link naar het laatste bericht van de discussie op het forum, en daaronder het aantal reacties, de schermnaam van de laatste reageerder als gewone tekst en de tijd, zoals "83 reacties · laatst Buffon1 · 13:28".
Van vandaag staat alleen de tijd, van de zes dagen ervoor de korte dag en de tijd, en daarvoor de datum.
Onder de discussies staat de link "Naar het forum"; zijn er geen discussies, dan staat er een tekst voor bezoekers boven die link.
De pagina laadt niets van het forum: alleen de links gaan erheen.
De importer bewaart de discussies (zie de [README van de importer](../importer/README.md)), en `listNewestDiscussions` in `@fansite/db/queries` haalt ze op, met alleen de velden die de pagina toont, van forums die aanstaan.
De server bewaart ze vijf minuten (`src/discussions.ts`).

`listRecentItems` in `@fansite/db/queries` haalt de berichten op, met alleen die velden.
Het haalt alleen berichten op die `relevant` zijn en niet verborgen (`isShown`); berichten die de importer een twijfelgeval vond of niet over de club, staan op geen enkele pagina (zie _Het relevantiefilter_ in de [README van de importer](../importer/README.md)).
`src/news.ts` schrijft de dag of de datum en de tijd, in Nederlandse tijd (`Europe/Amsterdam`).
De server bewaart de koppen vijf minuten (`src/headlines.ts`), dus een nieuw bericht staat binnen vijf minuten op de pagina.
De pagina wordt bij elk bezoek gemaakt, dus de build leest de database niet.
Lukt het lezen niet, dan toont de pagina de foutpagina, zoals `/bronnen`.
Onder de discussies staat het blok "Nieuwste podcasts": de vijf nieuwste afleveringen van alle podcasts, als `NewsItem`, met de link "Alle podcasts" naar `/podcasts` eronder.
De server bewaart ze vijf minuten (`src/podcasts.ts`).
De afleveringen hebben dezelfde feiten als op `/podcasts`.

Onder de podcasts staan twee blokken met wedstrijden: "Wedstrijden" en "Stand" (zie _De wedstrijden_).
Op een telefoon staat de zijbalk onder het nieuws, dus de blokken staan onderaan de pagina.
Zonder gegevens van de wedstrijden staat er een zin voor bezoekers.
Lukt het lezen van de wedstrijden niet, dan verdwijnen de twee blokken en schrijft de site de reden in het logboek, zoals bij het artikel; de rest van de pagina blijft werken.

Lokaal staan er berichten en discussies na `pnpm run import` (zie de [README van de importer](../importer/README.md)).

## De wedstrijden

`/wedstrijden` toont onder drie kopjes het programma, de uitslagen en de volledige stand van sc Heerenveen 1 (mannen) in het lopende seizoen.
Dezelfde gegevens staan in twee blokken in de zijbalk van de homepage.
De gegevens komen van de importer (zie _De wedstrijden en de stand_ in de [README van de importer](../importer/README.md)) en `@fansite/db/queries` haalt ze op: `listSeasonMatches`, `listSeasonStandings` en `listWikipediaPages`, steeds voor één seizoen.
`src/matches.ts` vraagt alleen het lopende seizoen (`seasonOf`) en bewaart het antwoord vijf minuten; eerdere seizoenen staan in de database en komen op geen enkele pagina.
Lukt het lezen niet, dan toont `/wedstrijden` de foutpagina, zoals `/bronnen`.

- **Programma:** alle wedstrijden die nog niet zijn gespeeld, op volgorde van de dag, ook een uitgestelde wedstrijd (die zegt "Uitgesteld").
  Een wedstrijd blijft erin staan tot Wikipedia de uitslag heeft.
- **Uitslagen:** alle gespeelde wedstrijden, de nieuwste bovenaan.
- **Stand:** de volledige tabel, met een bijschrift met de dag waarvoor de stand geldt.
- **Homepage:** het blok "Wedstrijden" toont in één lijst de vorige wedstrijd (de nieuwste uitslag) en de volgende (de eerste in het programma die een datum heeft, dus niet een uitgestelde).
  Het blok "Stand" toont drie clubs met sc Heerenveen in het midden, als dat kan, zonder de kolommen voor gewonnen, gelijk, verloren en de doelpunten.
  De blokken linken naar "Alle wedstrijden" en "De volledige stand" (`/wedstrijden#stand`).

Een wedstrijd is een `Match` uit het designsysteem, de stand een `StandingsTable`.
De aftrap staat in Nederlandse tijd (`src/match-format.ts`), zoals "zo 1 nov 14:30", met het jaar als dat niet dit jaar is.
Is de aftrap nog niet bekend, dan staat er het weekend, zoals "weekend 12–14 februari", uit `date_text`; een uitslag heeft alleen de dag.
Onder de pagina staat de bronvermelding (`WikipediaCredit`): de licentie, een link naar elke pagina van Wikipedia die de import las en naar de geschiedenis ervan, de tijd van de laatste keer lezen, en een zin dat onze wedstrijdgegevens ook CC BY-SA 4.0 zijn.
Onder de twee blokken op de homepage staat alleen "Bron: Wikipedia".
De pagina's komen uit `wikipedia_pages`; zonder gegevens van de wedstrijden staat er ook geen bronvermelding.
De pagina's laden niets van een ander domein en hebben geen JavaScript nodig, en er staan geen clubwapens, alleen de namen.

`pnpm test:a11y` gebruikt de verzonnen wedstrijden en stand van de seed (`madeUpMatches` en `madeUpTable`), met de pagina's die ze bronnen (`madeUpWikipediaPages`).

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

## Het beheer

Wie het beheer in mag, logt in met een link die de site per e-mail stuurt, zonder wachtwoord (zie `src/beheer` en `src/app/beheer`).
Een account maak je met een opdracht, want er is geen aanmeldpagina:

```sh
pnpm admin:create <e-mailadres> <rol>
pnpm admin:revoke <e-mailadres>
```

De rol is `beheerder` of `moderator`.
`admin:revoke` zet het account uit en beëindigt zijn sessies meteen.
Beide lezen `DATABASE_URL` uit de `.env` in de root.
Op de host is er geen pnpm: daar draait `apps/site/admin.mjs`, dat `assemble` maakt (zie `docs/acceptatieomgeving.md`, stap 12).

Lokaal log je zo in:

1. Maak een account, zoals hierboven.
2. Ga naar <http://localhost:3000/beheer/inloggen> en vul het adres in.
3. Zonder instellingen voor de mail schrijft `sendMail` de mail, met de link, in de uitvoer van de site.
   Draait de site met `pnpm --filter site dev`, dan staat de link in die terminal.
   Draait hij met `pnpm review`, dan staat de uitvoer niet in een terminal maar in `review.log` in de reviewmap, en toont dit de link:

   ```sh
   tail -n 20 ../sc-heerenveen-fansite-review/review.log
   ```

   Open de link, en kies Inloggen.

Het cookie van het beheer is `Secure`, ook lokaal.
Chrome en Firefox nemen dat aan op `localhost`; Safari niet, dus log lokaal in met Chrome of Firefox.

- `requireRole` in `src/beheer/require-role.ts` is de ene controle van het beheer.
  Elke pagina, route en serveractie onder `/beheer` roept hem als eerste aan, behalve de pagina's en acties om in te loggen.
  `src/beheer/routes.test.ts` zoekt ze zelf op in de mappen (en elk bestand met `'use server'`, waar ook), en laat zien dat een aanroep zonder sessie naar de inlogpagina gaat.
  Een nieuwe pagina of actie die `requireRole` niet aanroept, laat die test falen.
  Staat een nieuwe pagina bedoeld open, dan noem je haar in `open` in die test.
- `/beheer/berichten` is de eerste beheerpagina: de 50 nieuwste berichten van alle bronnen, met bron, kop als link, tijd en of ze verborgen zijn (zie _Berichten verbergen_).
- `/beheer/artikelen` is voor beheerders alleen: de artikelen van de redactie schrijven, bekijken, publiceren en intrekken (zie _Artikelen schrijven_).
- De proxy (`src/proxy.ts`) geeft elk antwoord onder `/beheer` de headers `X-Robots-Tag: noindex, nofollow`, `Cache-Control: no-store` en `Referrer-Policy: same-origin`, op elke omgeving.
  De proxy is geen toegangscontrole.
- Een inloglink, een sessie en een teller van pogingen staan in de database (`admin_login_links`, `admin_sessions`, `admin_login_attempts`).
  Van een link en een sessie bewaart de tabel alleen de SHA-256 van de token.
  De teller bewaart de SHA-256 van het adres en de tijd, en geen IP-adres.

### Berichten verbergen

`/beheer/berichten` (`src/app/beheer/berichten`) is voor beheerders en moderators.
Boven de lijst staat een zoekveld: een formulier met `method="get"` dat `?q=` vult en op een deel van de kop of van de link zoekt, zonder letters- of hoofdlettergevoeligheid en zonder dat `%` of `_` een patroon zijn (`listItems` in `src/beheer/items.ts`).
Bij elk bericht dat te zien is staat een veld voor de reden en de knop "Verberg"; bij een verborgen bericht staat de reden en de knop "Toon weer".
Alle formulieren zijn gewone posts van een serveractie (`actions.ts`), dus ze werken zonder JavaScript.

- De reden is verplicht en hoogstens 300 tekens.
  Een reden zonder tekst of te lang laat het bericht staan en brengt je terug op de lijst, met de fout in een `ErrorSummary` bovenaan en bij het veld (`?fout=reden-leeg&bericht=<nummer>`, zoals het inloggen met `?fout=` doet).
- Na het verbergen of tonen staat bovenaan wat er gebeurde: "Staat binnen vijf minuten niet meer op de site" of "weer op de site".
  Dat is waar, want de homepage en `/podcasts` bewaren hun lijsten vijf minuten in het geheugen van de server; `src/headlines-hidden.test.ts` bewijst het tegen een echte database.
  De melding komt uit de database van dat moment, niet uit het adres: `?verborgen=<nummer>` zegt alleen iets over een bericht dat echt verborgen is.
- Verbergen en tonen schrijven allebei één regel in het logboek `audit_log`, in dezelfde transactie, via `recordAction` (`src/beheer/audit-log.ts`).
  Daar staat het nummer van het account, de tijd, de actie, het nummer van het bericht en de reden: geen e-mailadres en niets anders van het verzoek.
- De pagina gebruikt `NewsItem`, `Form`, `Field` en de andere componenten van het designsysteem, en heeft geen eigen component.

Lokaal zie je de pagina na `pnpm run import` (of met `pnpm --filter site test-data`) en een login, zoals hierboven.

### Artikelen schrijven

`/beheer/artikelen` (`src/app/beheer/artikelen`) is alleen voor beheerders: een moderator krijgt "niet gevonden".
De lijst toont alle artikelen, het laatst geschreven bovenaan, met "Nieuw artikel" als formulier met `method="get"`.
Het formulier (`ArticleForm.tsx`) is een client-component met `useActionState`: een gewone post die zonder JavaScript werkt, en die een fout met de ingevulde waarden terugstuurt.
Dat kan niet via het adres zoals bij de berichten, want een tekst van 20.000 tekens past er niet in.
De fouten staan in een `ErrorSummary` en bij het veld, en met JavaScript krijgt het blok de focus.
"Opslaan" is de eerste knop, dus Enter bewaart; "Publiceren" slaat op wat op het scherm staat en publiceert het in dezelfde transactie.

- `src/beheer/article-form.ts` leest en controleert wat het formulier stuurt, altijd opnieuw op de server.
  `src/beheer/articles.ts` maakt, bewaart, publiceert en trekt in, elk in één transactie met de regel in het logboek (`article.create`, `article.update`, `article.publish`, `article.unpublish`).
  Een wijziging zonder verschil en een tweede klik schrijven niets.
- Het voorbeeld (`/beheer/artikelen/<nummer>/voorbeeld`) gebruikt `Article` en `ArticleText`, net als de pagina voor bezoekers.
  Het valt onder `/beheer`, dus het krijgt `noindex` en `no-store` van de proxy.
- Een wijziging van de tekst voegt in dezelfde transactie een versie toe (`src/beheer/article-versions.ts`), en elke wijziging zet `updated_by`.
  Onder het formulier staat de lijst "Eerdere versies", en `/beheer/artikelen/<nummer>/versies/<versienummer>` toont een versie met dezelfde onderdelen als het voorbeeld.
  Er is geen knop om terug te zetten of te verwijderen.
- De opmaak en de werkwijze voor wie schrijft, staan in [`docs/artikelen.md`](../../docs/artikelen.md).

### De beheertests in de browser

De inloglink is een mail, en een browsertest heeft geen mailbox.
`e2e/admin.ts` zet daarom vóór de eerste test een moderator en een beheerder met elk een sessie in de database van de controle, zoals `startSession` dat doet, en geeft de browser het cookie (`adminCookie(host, rol)`); `e2e/pages.spec.ts`, `e2e/admin.spec.ts` en `e2e/writing.spec.ts` loggen zo in.
De tokens zijn voor elke run nieuw, staan alleen in het geheugen van de controle en in de omgeving van haar processen, en de accounts, de sessies, de logregels, de artikelen die een test schreef en de verzonnen berichten gaan er na afloop weer uit.
De opzet weigert elke database die niet op deze computer staat (`127.0.0.1`, `::1` of `localhost`), dus ze kan nooit schrijven in de database van acceptatie of productie.
De site zelf kent geen route, omgevingsvariabele of token om zo in te loggen, en `e2e/` zit niet in de build.
`admin.spec.ts` verbergt en toont een verzonnen bericht van de uitgezette testbron, met en zonder JavaScript, en toetst de staten met axe.
`writing.spec.ts` schrijft, bekijkt, publiceert, wijzigt en trekt een verzonnen artikel in, met en zonder JavaScript.
Omdat het een artikel publiceert dat de kaart op de homepage kan worden, draait het als eigen project (`chromium-writing`) nadat alle andere controles klaar zijn.

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
Het beheer (`/beheer`) krijgt die header op elke omgeving, ook op `production`, en `/robots.txt` weigert `/beheer` overal.
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

Het script maakt dezelfde bestanden ook voor Storybook en voor het Forum, in `packages/design-system/src/assets/icons/storybook` en `.../forum`, met een ander vlak (de sets staan in `src/icon-sets.ts`).
Storybook serveert de zijne vanaf de root en verwijst ernaar in zijn kop (`packages/design-system/.storybook/icons.ts`); die van het Forum zijn voor later en hangen nergens aan.

Het donkerblauw komt uit het token `--hf-colour-background-header` in `colour.css` van het designsysteem.
`next.config.ts` leest het bij de bouw (zie `src/header-colour.ts`), en het script voor de iconen leest hetzelfde bestand.
Draai het script alleen opnieuw als de vector of dat token verandert, en zet de nieuwe bestanden in de repository.
`src/icons.test.ts` controleert de afmetingen en de transparantie, en dat het vlak de kleur van het token heeft.

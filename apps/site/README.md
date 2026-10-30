# @fansite/site

De site van de sc Heerenveen Fansite.
Er zijn nu tien pagina's: de homepage met de nieuwste koppen, `/nieuws` met het nieuwsarchief, `/wedstrijden` met het programma, de uitslagen en de stand, `/podcasts` met de afleveringen van de podcasts, `/zoeken` om te zoeken in onze koppen, `/bronnen` met de bronnen uit het register, `/over-ons` over de site, `/privacy` met de privacyverklaring, `/contact` met het contactformulier, en `/updates` met wat er per versie veranderd is, met een RSS-feed.
De andere pagina's komen met de volgende issues.

## Draaien

Zet in de root eerst `.env` klaar (zie de [README](../../README.md)).
Start de database en zet er de bronnen uit de seed in, zoals de [README van `@fansite/db`](../../packages/db/README.md) zegt.
De site draait de migraties zelf als hij start (zie _De database bij het starten_), maar de testbronnen zet hij er nooit in: die zet alleen `pnpm db:seed` lokaal in het register.
Op acceptatie en productie zet hij de echte bronnen erin.
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
Daarom zet `e2e/global-setup.ts` eerst de testbronnen in het register (`e2e/test-sources.ts`, met `seedSources` van de seed), want de site heeft ze op acceptatie niet en haalt ze bij het opstarten weg.
Daarna zet hij vóór de eerste test verzonnen koppen op die testbronnen in de database, en haalt ze er na de laatste test weer uit (`e2e/headlines.ts`).
Hetzelfde doet het met een verzonnen artikel van de redactie, een concept en een artikel voor later, met een eigen account (`e2e/articles.ts`).
Zo toetst axe de homepage met de kaart "Van de redactie" en de pagina `/redactie/e2e-artikel`, en toetst `e2e/articles.spec.ts` dat een concept en een artikel voor later nergens staan.
Voor `/wedstrijden` zet hij een verzonnen stand in de database (`e2e/standings.ts`), want de seed heeft geen wedstrijden en zonder stand heeft de kaart Stand geen knop voor een afbeelding.
Heeft de database al een stand voor dit seizoen, dan laat hij die staan en haalt hij niets weg.
Voor de pagina van een eerder seizoen, `/wedstrijden/<seizoen>`, zet hij verzonnen wedstrijden, doelpunten, een stand en de bronpagina's in het seizoen vóór het lopende (`e2e/earlier-season.ts`, met `seedMatches`), en haalt ze na de laatste test weer weg.
Heeft de database al echte wedstrijden voor dat seizoen, van een import, dan laat hij die staan.
Verzonnen wedstrijden van een eerdere run haalt hij na de laatste test wel weg.
`pnpm --filter site test-data --remove` haalt dat seizoen weg als al zijn wedstrijden verzonnen zijn, ook als een eerdere run ze erin zette, en laat het staan zodra er een echte wedstrijd van een import in staat.
`e2e/season-picker.spec.ts` toetst de kiezer met en zonder JavaScript, het toetsenbord en de plek naast of onder de kop bij 320, 390 en 900 pixels.
Een test die de opmaak meet of naar een kaart scrolt, wacht eerst op `hydrated(page)` uit `e2e/hydrated.ts`: tot React de pagina heeft opgebouwd, toont de kiezer nog zijn label en zijn knop, en is de pagina langer.
`e2e/card-image.spec.ts` klikt op die knop en toetst in de browser dat er een PNG komt, dat er niets naar een ander domein gaat en dat de CSP de afbeelding toestaat.
Of de homepage een bericht van een uitgezette bron weglaat en het getal in de vraag aan de database klopt, toetst `queries.test.ts` van `@fansite/db` op een echte MariaDB.
De controle toetst ook `/nieuws` met een tweede pagina, zodat de oudere koppen van het archief langs axe komen.
Hier gaat het om axe op de pagina's met nieuws.
Draait de database van de controle ook echte berichten, door `pnpm run import`, dan staan die er gewoon tussen.
Playwright wacht tot `/robots.txt` antwoordt en niet tot de homepage, want die bewaart haar koppen vijf minuten in het geheugen.

Dit moet eerst draaien, vanuit de root:

1. De database: `docker compose up -d --wait`.
   De gebouwde site draait de migraties en zet de echte bronnen uit de seed er zelf in, want de controle start hem met `SITE_ENV=acceptance`.
   De testbronnen zet de controle er zelf bij (`e2e/test-sources.ts`), alleen in een database op deze computer.
2. `pnpm build`.
3. Eenmalig Chromium: `pnpm --filter site exec playwright install chromium`.
   CI installeert niets: die gebruikt de Google Chrome die op de runner staat.

De opdracht zet de build zelf klaar in `.next/a11y`, zoals `assemble` dat doet, en start die.
Hij start de site een tweede keer, zonder bereikbare database, voor de foutpagina (`e2e/error-page.spec.ts`): in licht en donker, en zonder JavaScript.
Eerst start hij `scripts/fake-smtp.js`, een nepmailserver voor `e2e/contact.spec.ts`.
Die zet elke mail in `.next/fake-smtp`, en maakt zijn certificaat met `openssl`, dat dus op je computer moet staan (op macOS en op de runner van CI staat het er al).
CI geeft de map van de rooktest mee in `SITE_FOLDER`, zodat dezelfde map wordt getoetst.
Faalt een pagina, dan noemt de log de pagina en het thema (in de naam van de test), de regel van axe en het element.

`e2e/check-page.spec.ts` laat zien dat de controle een fout vangt: een link zonder naam, een tweede `h1`, een verkeerde `lang`, een pagina zonder titel, een verzoek naar een ander domein en een pagina die op 320 pixels opzij scrolt.
De test serveert die pagina's zelf; ze staan niet op de site.
Na een formulier dat doorstuurt komt de titel soms een paar milliseconden na de rest van de pagina.
`checkPage` wacht daarom hoogstens twee seconden op een titel, en een pagina zonder titel faalt nog steeds.
De stories in Storybook toetst axe niet in CI; dat doet het paneel Toegankelijkheid.

## Screenshots maken

`pnpm screenshots` maakt van een draaiende build de plaatjes voor de beschrijving van een pull request (zie _Screenshots_ in [`AGENTS.md`](../../AGENTS.md)).
Het start zelf geen server en neemt alleen een build op deze computer aan.
Per pagina of story schrijft het een PNG voor een telefoon (390 pixels breed) en een bureaublad (900 pixels breed), licht tenzij je `--dark` meegeeft, met één schermpixel per CSS-pixel.
Chromium schrijft een PNG zonder overbodige gegevens, dus er is geen verkleiner nodig.
De bestanden heten naar het pad of de story en de breedte, zoals `podcasts-390.png` en `home-900-dark.png`, en komen in `screenshots/` in de map waar je het draait.
Kies een andere map met `--out <map>`.
`--full-page` neemt de hele pagina in plaats van het eerste scherm.

De homepage (met de kaart van het artikel), `/redactie/e2e-artikel`, `/nieuws`, `/podcasts` en de pagina van een eerder seizoen, `/wedstrijden/<seizoen>`, hebben de verzonnen gegevens van de toegankelijkheidscontrole nodig (zie _Toegankelijkheid controleren_), en `pnpm test:a11y` haalt ze er na afloop weer uit.
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
pnpm screenshots http://127.0.0.1:6006 componenten-pagina-page-footer--light
```

De tweede opdracht blijft draaien, dus geef de derde in een tweede terminal.

Een pad begint met een schuine streep, al het andere is het id van een story.
Het script volgt de kleurkeuze van de browser (`prefers-color-scheme`), dus het werkt voor de site en voor Storybook.
Een pagina die niet met 200 antwoordt, laat het commando falen, zodat een tikfout in het adres geen plaatje van een foutpagina geeft.

## Sjablonen

De layout, de pagina's en de pagina voor een onbekend adres bevatten geen HTML, alleen componenten uit `@fansite/design-system`.
Dat geldt voor elk `.tsx`-bestand in `src`, behalve tests.
`pnpm lint` faalt op een HTML-element, zoals `<p>` of `<li>`.
De header, met het logo, de themaknop en het hoofdmenu, en de footer staan in `src/app/layout.tsx`, dus elke pagina heeft ze.

## De homepage

De `h1` van de homepage is "sc Heerenveen Fansite", maar die zie je niet: het logo erboven zegt het al.
Hij heeft de klasse `hf-visually-hidden` uit het designsysteem, dus een schermlezer leest hem wel voor.
Daaronder staat het blok "Laatste nieuws": de tien nieuwste berichten van de bronnen die aanstaan, het nieuwste eerst, in één lijst zonder kop per dag, hoe oud ze ook zijn.
Een bericht is een `NewsItem` uit het designsysteem: links de korte dag en de tijd, zoals "wo 14:05" (op een smalle regel boven de kop), dan de kop als link naar de bron, en daaronder de bronnaam en, achter een betaalmuur, "voor abonnees".
Zijn er geen berichten, dan staat er een tekst voor bezoekers.
Onder de lijst staat de link "Alle koppen" naar het archief op `/nieuws` (zie _Het nieuwsarchief_): ouder nieuws is daarvoor.
Het aantal staat op één plek, `firstHeadlines` (10) in `src/items-per-card.ts`, en de lijst staat vijf minuten in het geheugen van de server (`src/headlines.ts`).
De homepage kent geen parameters: een adres als `/?nieuws=15`, dat de knop "Laad 5 meer" vroeger maakte, laat gewoon de homepage zien.

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

`/wedstrijden` toont onder twaalf kopjes het programma, de uitslagen, de stand, onze plek in de competitie, het verloop van het seizoen, de reeksen, thuis en uit, de doelpuntenmakers, de wedstrijden waarin we de nul hielden, de doelpunten per kwartier, hoe de wedstrijden verlopen en de uitersten van sc Heerenveen 1 (mannen) in het lopende seizoen.
Het programma met daaronder de uitslagen staat in de hoofdkolom en de stand met daaronder onze plek in de competitie, het verloop van het seizoen, de reeksen, thuis en uit, de doelpuntenmakers, de nul gehouden, de doelpunten per kwartier, hoe de wedstrijden verlopen en de uitersten in een brede zijbalk (`wide` op `Page.Sidebar`); op een telefoon staan ze onder elkaar in die volgorde.
Op een telefoon staat onder de kop een balk "Op deze pagina:" met een link naar elke kaart (`Page.Shortcuts`, via het slot `@shortcuts` van de layout, in `app/@shortcuts/wedstrijden`); op een breed scherm is hij er niet.
De balk volgt de pagina: de link naar de kaart waar je bent, heeft een rode streep en staat vooraan in de rij.
De stand, de reeksen, de doelpuntenmakers, de nul gehouden, hoe de wedstrijden verlopen en de uitersten hebben een zacht vlak (`surface="soft"`), het verloop van het seizoen, thuis en uit en de doelpunten per kwartier een warm vlak (`surface="warm"`), en het programma, de uitslagen en onze plek in de competitie zijn wit.
Dezelfde gegevens staan in twee blokken in de zijbalk van de homepage.
De gegevens komen van de importer (zie _De wedstrijden en de stand_ in de [README van de importer](../importer/README.md)) en `@fansite/db/queries` haalt ze op: `listSeasonMatches`, `listSeasonStandings` en `listWikipediaPages`, steeds voor één seizoen.
`getMatchData(season)` in `src/matches.ts` vraagt één seizoen en bewaart het antwoord vijf minuten voor het lopende seizoen en een uur voor een eerder seizoen; zonder seizoen geeft het het lopende (`seasonOf`), en dat doet de homepage altijd.
Elk seizoen heeft één adres: `/wedstrijden` is het lopende seizoen en `/wedstrijden/2025-26` een eerder seizoen (`app/wedstrijden/[seizoen]`).
Het lopende seizoen op zijn eigen adres (`/wedstrijden/2026-27`) verwijst door naar `/wedstrijden`, en een seizoen dat niet in de database staat, een seizoen in de toekomst en een adres dat geen seizoen is, geven "niet gevonden".
Rechts naast de kop staat de seizoenskiezer (`SeasonPicker` met `Page.Title`), zolang er meer dan één seizoen is: een formulier dat zonder JavaScript met de knop "Toon" werkt, via `app/wedstrijden/kies`, die doorverwijst (303).
Met JavaScript verdwijnen de knop en het zichtbare label en wisselt de pagina bij een keuze, en met het toetsenbord bevestig je een keuze met Enter; een verborgen regel legt dat aan een schermlezer uit.
Een eerder seizoen heeft geen kaart Programma, toont zijn uitslagen van de eerste naar de laatste wedstrijd (`resultsOfSeason`), noemt zijn tabel Eindstand (`standingsCardOf`, met het anker `eindstand`), zet het seizoen op de afbeelding van een kaart en staat niet in de sitemap.
Een pagina met een ander basisadres (zoals `/statistieken`) gebruikt dezelfde onderdelen: `seasonFromSlug`, `seasonAddress`, `seasonChoices` en `pickedAddress` in `src/seasons.ts`, `getMatchSeasons` en `getMatchData` in `src/matches.ts`, `SeasonPicker` en `Page.Title` uit het designsysteem, en een route naast de pagina die `pickedAddress` aanroept, zoals `app/wedstrijden/kies/route.ts`.
Lukt het lezen niet, dan toont `/wedstrijden` de foutpagina, zoals `/bronnen`.

- **Programma:** alle wedstrijden die nog niet zijn begonnen, op volgorde van de dag, ook een uitgestelde wedstrijd (die zegt "Uitgesteld").
  Een wedstrijd is begonnen als zijn aanvangstijd voorbij is, of, zonder aanvangstijd, als zijn dag in Nederlandse tijd voorbij is (`overviewOf` in `src/matches.ts`, met het moment van het verzoek).
  Een weekend telt tot het einde van zijn laatste dag.
- **De doelpuntenmakers in een wedstrijdregel:** de achternaam zoals Wikipedia hem schrijft.
  Hebben twee verschillende spelers in dezelfde regel dezelfde naam, dan krijgen ze de beginletter van hun voornaam erbij, zoals `J. Trenskow`, en de hele voornaam als die beginletter ook gelijk is (`goalsWithInitials` in `src/matches.ts`).
- **Hoe de wedstrijden verlopen:** een kaart in de zijbalk, direct na de doelpunten per kwartier en boven de uitersten, in het zachte vlak.
  De link in de balk onder de kop heet "Hoe wedstrijden verlopen": de hele kop past op een telefoon niet tussen de vervaagde randen van de rij.
  `matchFlowOf` in `src/matches.ts` werkt de gespeelde wedstrijden van de Eredivisie uit waarvan de doelpunten bekend zijn (dezelfde regel als de doelpunten per kwartier; de beker telt niet mee).
  De doelpunten staan in de gegevens in de volgorde van de Wikipedia-pagina en niet van het spel, dus de functie sorteert ze op minuut en toegevoegde tijd (45 komt voor 45+1).
  De kaart heeft twee tabellen (`DataTable`) met per rij de wedstrijden, winst, gelijk, verlies en punten, in kolommen met een afkorting (G, W, GL, V en P, uitgelegd in een regel onder de tabellen en de twee zinnen; vijf hele woorden passen niet op een telefoon): na het eerste doelpunt ("Wij scoren eerst", "De tegenstander scoort eerst") en na de stand bij de rust ("Voor", "Gelijk", "Achter").
  Een doelpunt in minuut 45 of in de toegevoegde tijd van de eerste helft telt voor de rust, een doelpunt vanaf minuut 46 niet.
  Scoren beide clubs in dezelfde minuut als het eerste doelpunt, dan is niet te zien wie het eerst scoorde: de wedstrijd telt dan niet bij het eerste doelpunt, wel bij de rust, en onder de kaart staat hoeveel wedstrijden dat zijn.
  Een 0–0 heeft geen eerste doelpunt en staat bij de rust op "Gelijk".
  Onder de tabellen staan twee zinnen: in hoeveel wedstrijden sc Heerenveen won na een achterstand, en in hoeveel het geen winst haalde na een voorsprong.
  Een achterstand of voorsprong telt alleen als die klopt bij elke volgorde binnen een minuut.
  Zonder één wedstrijd met doelpunten staat er een zin in plaats van de tabellen, en onderaan staat "Gebaseerd op 2 van de 3 gespeelde wedstrijden" (`BasedOn` in `src/MatchViews.tsx`).
- **Doelpunten per kwartier:** een kaart in de zijbalk, onder de nul gehouden en boven hoe de wedstrijden verlopen, met twee donutdiagrammen (`DonutChart` uit het designsysteem): de doelpunten van sc Heerenveen en de tegendoelpunten per kwartier van de wedstrijd.
  `goalsPerQuarter` in `src/matches.ts` telt ze uit de doelpuntenmakers die bij de wedstrijden horen (`match_goals`), in de competitie en de beker.
  De kwartieren zijn 1–15, 16–30, 31–45, 46–60, 61–75 en 76–90.
  Een doelpunt in blessuretijd telt bij het kwartier ervoor: 45+1 bij 31–45 en 90+3 bij 76–90.
  Een doelpunt na minuut 90, in de verlenging, telt niet mee.
  Een eigen doelpunt telt voor de club die ervan profiteert, zoals `ours` al regelt.
  Een gespeelde wedstrijd telt mee als hij minstens één doelpunt heeft of eindigde in 0–0; een wedstrijd met een uitslag maar zonder doelpunten in `match_goals` heeft geen minuten en blijft erbuiten.
  Onder het diagram staat dezelfde informatie als tabel (`DataTable`), die de schermlezer krijgt, want de diagrammen zijn voor hulpsoftware verborgen.
  Daaronder staat "Gebaseerd op 8 van de 10 gespeelde wedstrijden".
  Ging een wedstrijd in de telling naar de verlenging (`extra_time`), dan staat daaronder ook "Doelpunten in de verlenging tellen niet mee."; anders staat die zin er niet.
  Zonder één doelpunt met een minuut staat er een zin in plaats van de diagrammen.
- **Hoofdtrainer of Hoofdtrainers:** een kaart met het sterke blauwe vlak (`surface="strong"`) in de zijbalk, direct onder de stand, met de hoofdtrainers van het seizoen uit de tabel `staff` (zie de README van `packages/db`), op volgorde van begin.
  De kop is "Hoofdtrainer" bij één trainer en "Hoofdtrainers" bij meer, met altijd het anker `#hoofdtrainer`.
  Elke trainer is een regel (`ShortStaff`) met zijn naam, zoals de naam van een speler: de voornaam in het normale gewicht en de achternaam in het sterkere (`splitStaffName` in `src/player-name.ts`), met "(interim)" erachter in het normale gewicht.
  Een seizoen met één trainer toont alleen de naam.
  Bij meer trainers staat voor elke trainer behalve de laatste "tot 14 mrt 2026", de dag waarop hij stopte, en voor de laatste "vanaf 1 sep 2025", de dag waarop hij begon (`coachPeriods` in `src/match-format.ts`).
  Een datum die alleen als maand of jaar bekend is, staat zo ("tot mrt 2026").
  De namen zijn geen links en de kaart heeft geen bronvermelding van zichzelf: de bron staat onderaan de pagina.
  Een seizoen zonder trainer in de tabel heeft de kaart niet, en dan ook geen link in de balk "Op deze pagina:".
- **Onze plek in de competitie:** een kaart in de zijbalk, direct onder de stand, met een `DataTable` die de plaats van sc Heerenveen in de hele Eredivisie geeft op vijf onderdelen: punten per wedstrijd, gewonnen wedstrijden, de beste aanval (doelpunten voor), de beste verdediging (doelpunten tegen, minder is beter) en het doelsaldo.
  `leaguePlaceOf` in `src/matches.ts` rekent ze uit de stand, dus de import verandert niet.
  Punten per wedstrijd is de eerlijke vergelijking, want de clubs hebben niet evenveel gespeeld; twee clubs zijn gelijk als hun punten en wedstrijden in dezelfde verhouding staan.
  Clubs met dezelfde waarde delen de plaats ("gedeeld 2e") en een club die nog niets speelde telt niet mee.
  Onder de tabel staan twee zinnen: hoeveel punten sc Heerenveen achter de koploper staat (of dat het bovenaan staat) en hoeveel het voor staat op de laatste (of dat het onderaan staat).
  Daaronder staat "Gebaseerd op de stand na n wedstrijden van sc Heerenveen".
  Staat sc Heerenveen niet in de stand, of heeft het nog niets gespeeld, dan staat er een zin in plaats van de tabel.
  Er zijn geen lijnen voor Europa of degradatie en geen verwachte eindstand: de kaart zegt wat er is.
- **Uitersten:** een kaart in de zijbalk, als laatste kaart, met vijf regels in een lijst: de grootste overwinning, de grootste nederlaag, de wedstrijd met de meeste doelpunten, ons vroegste doelpunt en ons laatste doelpunt van de Eredivisie.
  `extremesOf` in `src/matches.ts` kiest ze uit de gespeelde wedstrijden van de Eredivisie; de beker telt niet.
  Bij een gelijke stand wint de laatst gespeelde wedstrijd.
  Een regel zonder wedstrijd ontbreekt, bijvoorbeeld de nederlaag in een seizoen zonder verlies.
  De eerste drie regels komen uit de uitslag en tellen elke gespeelde wedstrijd.
  De laatste twee komen uit de doelpunten en tellen alleen de wedstrijden met bekende doelpunten, zonder verlenging en zonder minuut 0; blessuretijd telt erbij, dus 90+3 is later dan 90.
  Een eigen doelpunt van de tegenstander is een doelpunt van ons en krijgt "(eigen doelpunt)" erachter.
  Elke regel is een naam boven een `ShortMatch`, en bij een doelpunt staan de minuut en de speler in de naam, gescheiden door een middenpunt.
  Onder de lijst staat "Gebaseerd op alle 7 gespeelde wedstrijden", en als niet elke wedstrijd zijn doelpunten heeft, een regel met "Vroegste en laatste doelpunt: gebaseerd op 6 van de 7 gespeelde wedstrijden".
  Zonder gespeelde wedstrijd staat er een zin in plaats van de lijst.
- **Verloop van het seizoen:** een kaart in de zijbalk, direct onder de kaart met onze plek in de competitie, met `FormChart` uit het designsysteem: de vorm, een staafje per gespeelde wedstrijd van de Eredivisie en de lijn erdoorheen.
  `leagueResultsOf` in `src/matches.ts` maakt de lijst `W`, `G` en `V` uit de gespeelde wedstrijden van de Eredivisie met een uitslag, op volgorde van speeldatum; een bekerwedstrijd telt niet mee.
  Een uitgestelde wedstrijd heeft pas een staafje als hij gespeeld is, en staat dan op de plek waar hij gespeeld is.
  Onder de grafiek staat dezelfde informatie als tabel (`DataTable`: winst, gelijk, verlies en totaal, met de wedstrijden en de punten), die de schermlezer krijgt, want de grafiek is voor hulpsoftware verborgen.
  Zonder een uitslag staat er een zin in plaats van de grafiek.
- **Reeksen:** een kaart in de zijbalk, direct na Verloop van het seizoen, in het zachte vlak.
  `streaksOf` in `src/matches.ts` geeft zes reeksen uit de score van de gespeelde wedstrijden van de Eredivisie: ongeslagen, gewonnen, zonder winst, verloren, gescoord en zonder tegendoelpunt.
  Elke reeks heeft de lengte van nu en de langste van het seizoen, en komt uit alle gespeelde wedstrijden, ook die zonder bekende doelpunten.
  Een bekerwedstrijd, een wedstrijd zonder score en een wedstrijd die niet is gespeeld tellen niet mee.
  De kaart toont de reeksen in een tabel (`DataTable`), daaronder de laatste vijf wedstrijden met de oudste eerst, als letters (`MarkRow`) en als korte regels (`ShortMatch`), en onderaan "Gebaseerd op alle 6 gespeelde wedstrijden" (`BasedOn` in `src/MatchViews.tsx`).
  Een eerder seizoen heeft alleen de kolommen Reeks en Langste en geen laatste vijf wedstrijden, en noemt het seizoen in het bijschrift.
  Zonder een gespeelde wedstrijd staat er een zin in plaats van de tabel.
- **Thuis en uit:** een kaart in de zijbalk, direct na de reeksen, met een tabel (`DataTable`) met de kolommen Thuis, Uit en Totaal.
  `homeAwayOf` in `src/matches.ts` telt de gespeelde wedstrijden van de Eredivisie met een score, gesplitst op `home`: gespeeld, gewonnen, gelijk, verloren, de punten (3 voor een winst, 1 voor een gelijkspel), de doelpunten voor en tegen en de wedstrijden zonder tegendoelpunt.
  Alles komt uit de score en niet uit de doelpuntenmakers, dus elke gespeelde wedstrijd telt mee, en de bekerwedstrijden niet.
  De kolom Totaal stemt overeen met de tabel van het verloop van het seizoen.
  De punten en de doelpunten per wedstrijd hebben een komma en twee cijfers, zoals "1,83".
  Een kant zonder gespeelde wedstrijd heeft een streepje waar gedeeld wordt en 0 bij de tellingen.
  Onder de tabel staat "Gebaseerd op alle 11 gespeelde wedstrijden".
  Zonder een uitslag staat er een zin in plaats van de tabel.
- **Stand:** de volledige tabel met een balk naast de punten, en een bijschrift met de dag waarvoor de stand geldt; alleen een schermlezer krijgt dat bijschrift.
  Een eerder seizoen noemt de kaart en het bijschrift "Eindstand", met het anker `eindstand`.
  De balk verdwijnt op een smalle plek.
- **Doelpuntenmakers:** alle spelers van sc Heerenveen die dit seizoen scoorden, van veel naar weinig doelpunten.
  `topScorersOf` in `src/matches.ts` telt de doelpunten uit de doelpuntenmakers die bij de wedstrijden horen (`match_goals`), dus er is geen eigen vraag voor.
  Een penalty telt mee; een eigen doelpunt niet, ook niet dat van een tegenstander dat voor ons telt, en een doelpunt van de tegenstander ook niet.
  Een doelpunt dat de importer aan een speler koppelde (`player_id`) telt voor die speler en toont zijn volledige naam uit `players` (de voornaam gewoon en de achternaam vet, met `PlayerName`), ook als hij de selectie verliet; twee spelers met dezelfde achternaam zijn dus twee rijen.
  Een doelpunt zonder speler maar met een Wikipedia-pagina (`playerPage`) telt voor die pagina en toont de titel zonder de toevoeging tussen haakjes als volledige naam, gesplitst met de korte naam van de wedstrijdpagina; heeft een gekoppeld doelpunt dezelfde pagina, dan tellen ze samen.
  Een doelpunt zonder speler en zonder pagina telt per naam zoals de pagina hem toont, als een rij van zichzelf, zodat er geen doelpunt verloren gaat.
  Spelers met evenveel doelpunten hebben dezelfde plaats en staan op alfabet van de achternaam.
  Naast het getal staat dezelfde balk als in de stand (`bar.css` in het designsysteem): de lengte is het aandeel van de doelpunten van de topscorer, die de balk vult.
  Direct onder de kop, boven de tabel, staat hoeveel spelers er scoorden, zoals "11 spelers hebben gescoord": dezelfde plek en stijl als bij de nul gehouden.
  Het oude anker `#topscorers` blijft werken: het is een oud anker (`aliases`) op de kop.
  Mist van een gespeelde wedstrijd met een doelpunt van ons de doelpuntenmakers, dan staat onder de tabel "Gebaseerd op de doelpuntenmakers van 9 van de 11 gespeelde wedstrijden".
  De kop van de doelpunten is de afkorting D, met het volle woord onder de tabel.
  Zonder doelpunten staat er een zin in plaats van een tabel.
- **De nul gehouden:** een kaart in de zijbalk, onder de doelpuntenmakers en boven de doelpunten per kwartier, met de gespeelde wedstrijden van dit seizoen waarin `goals_against` 0 is, in de competitie en de beker, de nieuwste bovenaan.
  Elke wedstrijd is een korte regel (`ShortMatch`): de dag, de tegenstander met "thuis" of "uit" en de uitslag vanuit onze kant.
  Boven de lijst staat "5 keer de nul gehouden in 11 wedstrijden".
  Er staan tien regels en daaronder de knop "Laad 5 meer", die zonder JavaScript werkt: het formulier laadt de pagina opnieuw met `?nul=15`, in stappen van vijf.
  De selectie (`cleanSheetsOf` in `src/matches.ts`) gebruikt de gegevens die de pagina al voor de uitslagen haalt, dus er komt geen vraag bij.
- **Uitslagen:** alle wedstrijden die zijn begonnen, de nieuwste bovenaan.
  Een eerder seizoen begint bij de eerste wedstrijd (`resultsOfSeason` in `src/matches.ts`).
  Een wedstrijd zonder uitslag staat er ook in, en zegt twee uur na de aanvang "Gegevens nog niet beschikbaar" (zonder aanvangstijd vanaf de dag erna).
  De zin komt van `lacksResult` in `src/matches.ts` en de eigenschap `resultMissing` van `Match`, en verdwijnt zodra de wedstrijd een score heeft.
- **Homepage:** het blok "Wedstrijden" toont in één lijst de vorige wedstrijd (de eerste van Uitslagen, ook zonder uitslag) en de volgende (de eerste in het programma die een datum heeft, dus niet een uitgestelde).
  Het blok "Stand" toont drie clubs met sc Heerenveen in het midden, als dat kan, zonder balk naast de punten.
  De blokken linken naar "Alle wedstrijden" en "De volledige stand" (`/wedstrijden#stand`).

Een wedstrijd is een `Match` uit het designsysteem, de stand een `StandingsTable`.
De aftrap staat in Nederlandse tijd (`src/match-format.ts`), zoals "zo 1 nov 14:30", met het jaar als dat niet dit jaar is.
Is de aftrap nog niet bekend, dan staat er het weekend, zoals "weekend 12–14 februari", uit `date_text`; een uitslag heeft alleen de dag.
Onderaan de zijbalk staat de bronvermelding (`WikipediaCredit`) in een doorzichtige kaart (`Card` met `surface="transparent"`), zodat de tekst op één lijn staat met de tekst in de kaarten erboven.
Ze noemt de licentie, linkt naar elke pagina van Wikipedia die de import las, noemt de tijd van de laatste keer lezen en zegt dat onze wedstrijdgegevens ook CC BY-SA 4.0 zijn.
Ze linkt niet naar de geschiedenis van die pagina's: Wikipedia ziet een link naar het artikel als een goede bronvermelding, en de auteurs staan in de geschiedenis van het artikel.
Onder de twee blokken op de homepage staat alleen "Bron: Wikipedia".
De pagina's komen uit `wikipedia_pages` (alleen die van de wedstrijden, niet de pagina van de selectie); zonder gegevens van de wedstrijden staat er ook geen bronvermelding.
De pagina's laden niets van een ander domein en hebben geen JavaScript nodig, en er staan geen clubwapens, alleen de namen.

`pnpm test:a11y` gebruikt de verzonnen wedstrijden en stand van de seed (`madeUpMatches` en `madeUpTable`), met de pagina's die ze bronnen (`madeUpWikipediaPages`).

## Het nieuwsarchief

`/nieuws` toont alle koppen die we hebben opgehaald, nieuwste eerst, 50 per pagina, elk als `NewsItem`, zonder indeling per dag: elke regel heeft zijn eigen dag en tijd (`formatNewsTime`).
Het zijn dezelfde koppen als op de homepage, ook met "voor abonnees" bij een kop achter een betaalmuur, maar zonder grens in leeftijd.
Een intro of foto staat er niet, net als op de homepage.
De query is `listArchivePage` in `packages/db/src/queries.ts`, met `countArchiveItems` voor het aantal en `listArchiveSources` voor het filter.
Ze delen met `listRecentItems` de voorwaarden (`newsFilter`): relevant, niet verborgen, van een bron die aanstaat, geen podcast en niet na nu.
Het filter (`Filter`) staat in een lichtblauwe kaart (`surface="soft"`) met de kop "Bronnen" in de zijbalk: "Alle bronnen" en een link per bron met minstens één kop in het archief, op alfabet, als `/nieuws?bron=leeuwarder-courant`.
Op een smal scherm staat de zijbalk onder de lijst en de paginering, want de zijbalk komt na de hoofdkolom in de bron en het designsysteem laat de volgorde van de bron en van het scherm gelijk.
Zonder koppen is er geen filter en geen zijbalk.
De pagina heeft een hoofdkolom van 46 rem, 2 rem ruimte en een zijbalk van 16 rem (`narrow` op `Page.Sidebar`), samen de 64 rem van de pagina.
Zonder zijbalk heeft de hoofdkolom de gewone breedte van 38 rem.
De slug komt uit de kolom `slug` van `sources`, die de seed voor elke bron met koppen vastlegt (`packages/db/src/seed.ts`), dus een andere naam verandert het adres niet.
Een bron zonder slug staat niet in het filter, maar haar koppen staan wel bij "Alle bronnen".
Onder de lijst staat de paginering (`Pagination`), als er meer dan één pagina is: `/nieuws?pagina=2`, en met een bron `/nieuws?bron=leeuwarder-courant&pagina=2`.
Een nieuwe kop schuift de inhoud van de pagina's op; de bron en het filter blijven vast.
Een bron die niet in het filter staat, en een `pagina` die geen positief geheel getal is of na de laatste komt, geven de pagina "niet gevonden" met status 404.
De titel noemt de bron en de pagina, zoals "Nieuwsarchief van NOS, pagina 3", en elke pagina is zijn eigen canonieke adres.
De server bewaart elke combinatie van bron en pagina vijf minuten, maar alleen na de controle van het adres (`src/archive.ts`).
Lukt het lezen niet, dan toont de pagina de foutpagina, zoals `/podcasts`.
De pagina staat niet in het hoofdmenu; dat volgt uit de opbouw van de site (#431).

`pnpm test:a11y` zet verzonnen koppen op de testbronnen, genoeg voor een tweede pagina (`e2e/headlines.ts`).

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

## Zoeken

`/zoeken` zoekt in wat we zelf bewaren: de titels van de berichten en de podcastafleveringen die de site toont (`relevance` is `relevant`, niet verborgen, van een bron die aanstaat) en de titel en de inleiding van de gepubliceerde artikelen van de redactie.
Forumonderwerpen zitten er niet in, want we bewaren er maar de nieuwste.
De zoekopdracht is `searchPublic` in `packages/db/src/queries.ts`: `LIKE`, dus zonder index, en geen FULLTEXT.
Alle woorden moeten voorkomen, in elke volgorde, en een deel van een woord telt mee.
Hoofdletters en accenten tellen niet: dat doet de collatie van de tabellen (`utf8mb4_unicode_ci`), en de test `packages/db/src/search.test.ts` controleert het.
De tekens `%`, `_` en `\` zoeken zichzelf: `hasWords` zet er een escape-teken voor, en `escape '|'` maakt van `\` een gewoon teken.
De pagina zoekt met de woorden als parameters van de vraag, nooit als stuk van de tekst van de vraag.

Een vraag heeft hoogstens 60 tekens en bestaat uit hoogstens 5 woorden van minstens 2 tekens (`parseSearch` in `src/search.ts`).
Is ze leeg, te lang of heeft ze te veel of te korte woorden, dan staat er bij het veld een korte uitleg en doet de pagina niets in de database.
Zo beschermen de grenzen de gedeelde hosting.
Een zoekopdracht kost op een database met 10.000 berichten ongeveer 7 tot 14 milliseconden.

Het formulier staat in dezelfde kaart als de resultaten (`SearchCard`), blauw zolang er nog niet gezocht is en daarna wit.
Het is een gewoon `GET`-formulier naar `/zoeken?q=…`, dus de pagina werkt zonder JavaScript en het adres is te delen.
De resultaten staan met de nieuwste bovenaan, tien eerst, en de knop "Laad 5 meer" laadt de pagina opnieuw met `?aantal=15`, in stappen van vijf en tot 100.
Daarna staat er een zin dat dit de nieuwste zijn.
De site bewaart een zoekvraag zelf nergens: er staat geen cookie, geen lijst van gezochte woorden en geen adres van de bezoeker bij.
De logbestanden van de hosting hebben wel het hele adres van een pagina, dus ook `?q=`, zoals van elke pagina.
De teller van het bezoek telt `/zoeken` zonder de vraag (`src/visits.ts`), en een fout in het logboek noemt de reden en niet de vraag.
De pagina is `noindex`, ook met een vraag, en staat niet in de sitemap.

De lijst met spelers staat in de zijbalk, na de resultaten in de bron, dus op een smal scherm onder de resultaten en zonder vraag direct onder het formulier.
Ze komt uit `players` van het lopende seizoen (`listSquad`), gegroepeerd per positie, en elke naam (`PlayerName`, met de achternaam vet) is een link naar `/zoeken?q=<achternaam>`.
Zijn er geen spelers, dan laat de pagina de lijst weg.
Onder de lijst staat de bronvermelding van de selectie (`WikipediaCredit`), met de pagina uit `wikipedia_pages` met `kind` `squad` (`findSquadPage`).
`listSquad` is de ene plek die bepaalt wie in de lijst staat, en geeft alleen de spelers die in de selectie staan (`in_squad`): een speler die vertrok, blijft in `players` voor zijn doelpunten.
De server bewaart de lijst vijf minuten, een zoekopdracht niet.

`pnpm test:a11y` toetst `/zoeken` zonder vraag, met een vraag, met meer dan tien resultaten, zonder resultaten en met een vraag die niet mag.
De lijst met spelers staat er alleen op als de database de verzonnen selectie van `pnpm db:seed` heeft (`madeUpSquad`).

## De bronnen

`/bronnen` toont de bronnen die aanstaan, per soort, elk met een link naar de website en de beschrijving uit het register.
De koppen van de soorten staan in `src/register.ts`.
De server bewaart de lijst een uur (`src/sources.ts`), dus een wijziging in het register staat binnen een uur op de pagina.
De pagina's delen één verbinding met de database (`src/database.ts`).

## De database bij het starten

Als de server start, zet hij de database klaar, en pas daarna beantwoordt hij verzoeken (`src/instrumentation.ts`).
Hij draait de migraties die de database nog niet had, uit `packages/db/drizzle`, en met `SITE_ENV=acceptance` of `production` zet hij de echte bronnen uit de seed in het register en de hoofdtrainers in de tabel `staff`.
Met `acceptance` haalt hij ook de testbronnen weg die er nog stonden, met hun feeds en berichten.
Met `local` zet hij niets in het register en niets in `staff`.
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
- `/beheer/bezoek` is voor beheerders alleen: de cijfers over het bezoek van de laatste dagen (zie _Het bezoek bekijken_).
- De proxy (`src/proxy.ts`) geeft elk antwoord onder `/beheer` de headers `X-Robots-Tag: noindex, nofollow`, `Cache-Control: no-store` en `Referrer-Policy: same-origin`, op elke omgeving.
  De proxy is geen toegangscontrole.
- De proxy telt ook de bezoeken (`src/visits.ts`): per dag de paginaweergaven per pagina en het aantal unieke bezoekers, zonder cookie, script of opslag in de browser.
  Hij doet dat na het antwoord, dus een pagina wacht er niet op, en ook als de pagina uit een cache komt.
  Zie _We tellen paginaweergaven en unieke bezoekers per dag_ in `docs/beslissingen.md`.
  Kijk de tellers in phpMyAdmin na met `SELECT * FROM page_views ORDER BY day DESC, views DESC` en `SELECT * FROM daily_visitors`.
  Lokaal stuurt `next dev` het adres van je eigen computer mee, dat niet telt als bezoeker: je ziet dan wel weergaven en geen bezoekers.
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
  Dat is waar, want de homepage, `/nieuws` en `/podcasts` bewaren hun lijsten vijf minuten in het geheugen van de server; `src/headlines-hidden.test.ts` bewijst het tegen een echte database.
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

### Het bezoek bekijken

`/beheer/bezoek` (`src/app/beheer/bezoek`) is alleen voor beheerders: een moderator krijgt "niet gevonden".
De pagina leest de tellers die de site per dag bewaart (zie _Bezoekers tellen_ in [`docs/acceptatieomgeving.md`](../../docs/acceptatieomgeving.md)) en laat zien:

- de totalen van de laatste 7 en 30 dagen;
- elke dag van de laatste 30 dagen, de nieuwste bovenaan, met de unieke bezoekers en de paginaweergaven (een dag zonder teller staat als 0);
- de 20 meest bekeken pagina's van die 30 dagen.

`visitNumbers` in `src/beheer/visits.ts` stelt de cijfers samen.
De totalen van bezoekers zijn de som van de dagen: een bezoeker die op twee dagen komt, telt twee keer.
Een dag is een dag in Nederland, zoals de teller hem bewaart.
De pagina zegt in gewone woorden wat de cijfers zijn en wat niet, en zonder cijfers staat er een zin in plaats van de tabellen.
De tabellen zijn `DataTable` van het designsysteem.
De klikken op berichten (#292) staan er nog niet op: die komen als dat issue klaar is.

`e2e/visits.ts` zet verzonnen tellers voor twaalf dagen in de database van de controle en haalt ze er na afloop weer uit, zodat `pnpm test:a11y` de pagina toetst met cijfers erin.

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

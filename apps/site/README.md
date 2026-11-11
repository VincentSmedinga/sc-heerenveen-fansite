# @fansite/site

De site van de sc Heerenveen Fansite.
Er zijn nu veertien pagina's, en een pagina per tegenstander: de homepage met het nieuwste artikel van de redactie, de nieuwste koppen, de wedstrijden en het forum, `/nieuws` met alle koppen en een filter per bron, `/wedstrijden` met het programma, de uitslagen en de stand, `/cijfers` met de cijfers over het seizoen, `/spelers` met alle doelpuntenmakers en de bijzondere doelpunten, `/tegenstanders` met de onderlinge resultaten (en een pagina per club), `/nieuws/podcasts` met de afleveringen van de podcasts, `/nieuws/zoeken` om te zoeken in onze koppen, `/redactie` met alle artikelen van de redactie, tien per pagina, `/bronnen` met de bronnen uit het register, `/over-ons` over de site, `/privacy` met de privacyverklaring, `/contact` met het contactformulier, en `/updates` met wat er per versie veranderd is, met een RSS-feed.
De andere pagina's komen met de volgende issues.
De keuzes over de site staan in [`docs/beslissingen/site.md`](../../docs/beslissingen/site.md).

## Draaien

Zet in de root eerst `.env` klaar (zie de [README](../../README.md)).
Start de database en zet er de bronnen uit de seed in, zoals de [README van `@fansite/db`](../../packages/db/README.md) zegt.
De site draait de migraties zelf als hij start (zie _De database bij het starten_), maar de testbronnen zet hij er nooit in: die zet alleen `pnpm db:seed` lokaal in het register.
Op acceptatie en productie zet hij de echte bronnen erin.
Start dan de site:

```sh
pnpm --filter site dev
```

De site luistert op <http://localhost:3000>, in een gewone checkout.
In een worktree gebruikt hij de poort en de database van die worktree (zie _Poorten per worktree_).
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

## Poorten per worktree

Een worktree heeft een eigen blok poorten en een eigen database, zodat twee sessies naast elkaar `pnpm dev`, de rooktest en `pnpm test:a11y` kunnen draaien.
`scripts/worktree-env.js` rekent ze uit de naam van de map uit, en de scripts `dev`, `smoke` en `test:a11y` lopen erdoor.
De poorten staan in het bereik 24000 tot 28000, acht per worktree:

| Wat                                                | Variabele                   | Poort in een gewone checkout en in CI |
| -------------------------------------------------- | --------------------------- | ------------------------------------- |
| De site met `pnpm dev`                             | `SITE_PORT`                 | 3000                                  |
| Storybook                                          | `STORYBOOK_PORT`            | 6006                                  |
| De rooktest                                        | `SMOKE_PORT`                | 3123                                  |
| De site van `pnpm test:a11y`                       | `E2E_PORT`                  | 3124                                  |
| Diezelfde site zonder database, voor de foutpagina | `E2E_WITHOUT_DATABASE_PORT` | 3125                                  |
| De nepmailserver van `pnpm test:a11y`              | `FAKE_MAIL_PORT`            | 2525                                  |

`pnpm worktree:env` laat zien welke poorten jouw map heeft.
Is er een bezet, dan stopt de opdracht en noemt hij de poort en de worktree; hij kiest nooit stilletjes een andere.
Zet je een van de variabelen zelf in de omgeving, dan wint die.
`pnpm screenshots` en de adressen in de voorbeelden hieronder gaan uit van de standaardpoorten; neem in een worktree de poort uit `pnpm worktree:env`.

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
Dat seizoen krijgt vijf hele speelronden van alle 18 clubs (`fullRounds`), zodat de kaart Verloop op de ranglijst een lijn heeft; het lopende seizoen heeft die kaart niet, want zijn verzonnen uitslagen zijn van zes clubs.
Heeft de database al echte wedstrijden voor dat seizoen, van een import, dan laat hij die staan.
Verzonnen wedstrijden van een eerdere run haalt hij na de laatste test wel weg.
Voor de kaart Onze plek door de jaren op `/cijfers` zet hij onze rij in de stand van twee en drie jaar geleden (`e2e/final-places.ts`), de oudste met twee afgetrokken punten, zodat de kaart een lijn van vier seizoenen heeft, en haalt ze na de laatste test weer weg.
`pnpm --filter site test-data --remove` haalt dat seizoen weg als al zijn wedstrijden verzonnen zijn, ook als een eerdere run ze erin zette, en laat het staan zodra er een echte wedstrijd van een import in staat.
`e2e/season-picker.spec.ts` toetst de kiezer met en zonder JavaScript, het toetsenbord en de plek naast of onder de kop bij 320, 390 en 900 pixels.
Een test die de opmaak meet of naar een kaart scrolt, wacht eerst op `hydrated(page)` uit `e2e/hydrated.ts`: tot React de pagina heeft opgebouwd, toont de kiezer nog zijn label en zijn knop, en is de pagina langer.
`e2e/card-image.spec.ts` klikt op die knop en toetst in de browser dat er een PNG komt, dat er niets naar een ander domein gaat en dat de CSP de afbeelding toestaat.
Of de homepage een bericht van een uitgezette bron weglaat en het getal in de vraag aan de database klopt, toetst `queries.test.ts` van `@fansite/db` op een echte MariaDB.
De controle toetst ook `/nieuws` met een tweede pagina, zodat de oudere koppen van het nieuws langs axe komen.
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
CI geeft de map die de job _Typecheck and build_ maakte mee in `SITE_FOLDER`, zodat dezelfde map wordt getoetst als bij de rooktest.
CI draait de tests in vier delen, elk op een eigen runner met een eigen database: `--project=chromium --shard=1/3` tot `3/3`, en `--project=chromium-writing --no-deps` voor de tests die een artikel schrijven, samen met de rooktest.
Een gewone `--shard` over alle projecten werkt niet: het project `chromium-writing` hangt af van `chromium`, en Playwright zet dan alle tests in het eerste deel en meldt voor de andere een groene run zonder tests.
`scripts/ci-e2e-report.js` laat zo'n deel falen.
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

De homepage (met de kaart van het artikel), `/redactie/e2e-artikel`, `/nieuws`, `/nieuws/podcasts` en de pagina van een eerder seizoen, `/wedstrijden/<seizoen>`, hebben de verzonnen gegevens van de toegankelijkheidscontrole nodig (zie _Toegankelijkheid controleren_), en `pnpm test:a11y` haalt ze er na afloop weer uit.
De werklijst `/beheer/kwaliteit/personen` heeft de verzonnen personen zonder linie of land nodig (`e2e/persons.ts`).
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
pnpm screenshots http://127.0.0.1:3000 / /nieuws/podcasts
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

## Imports

Een bestand in `src` noem je met het voorvoegsel `#src/`, zodra het pad twee of meer mappen omhoog zou gaan: `#src/archive` in plaats van `../../archive`.
Een bestand in dezelfde map (`./page`) of in de map erboven (`../matches-page`) schrijf je zoals je gewend bent.
Dit geldt in `src` en in `e2e`, niet in `apps/importer` en de pakketten.
`pnpm lint` faalt op een nieuwe import van `../../`, ook in `vi.mock`.
Het voorvoegsel staat in `package.json` (`imports`, voor Node en Vitest) en in `tsconfig.json` (`paths`, voor TypeScript), en `docs/beslissingen/site.md` zegt waarom.

Een bestand dat Node zelf laadt, zoals `src/icon-sets.ts` voor de scripts in `scripts`, schrijft de extensie erbij: `#src/icon-sets.ts`.
Een branch met oude imports zet je om met het script:

```sh
node scripts/use-import-prefix.js
git diff --name-only -- src e2e | xargs pnpm exec eslint --fix
```

## Het hoofdmenu en de balk van Nieuws

Het hoofdmenu (`src/SiteNavigation.tsx`) heeft vier onderdelen: Nieuws (`/nieuws`), Wedstrijden, Spelers (`/spelers`) en Forum (extern).
De homepage (`/`) staat niet in het menu: het logo wijst ernaartoe.
Nieuws heeft een balk met subpagina's onder het menu: Podcasts (`/nieuws/podcasts`), Redactie (`/redactie`) en Zoeken (`/nieuws/zoeken`), in die volgorde en altijd alle drie.
Nieuws is zelf het overzicht van alle koppen, dus er is geen apart item Archief.
De balk komt uit `Navigation` van het designsysteem (`subitems`), dus het menu en de balk zijn één navigatie, "Hoofdmenu".
`currentOf` in hetzelfde bestand kiest uit het pad het huidige onderdeel en de huidige subpagina:

- Nieuws is het huidige onderdeel op `/nieuws`, `/nieuws/podcasts`, `/redactie`, `/nieuws/zoeken` en `/redactie/<naam>`, en Wedstrijden en Spelers op hun pagina en elke pagina eronder, zoals een seizoen.
- Wedstrijden is ook het huidige onderdeel op `/cijfers` en `/tegenstanders` en de pagina's eronder, met `aria-current="true"`; de huidige subpagina is dan Cijfers of Tegenstanders.
- Staat de bezoeker op een subpagina, dan is die `aria-current="page"` en heeft het item Nieuws `aria-current="true"`.
  Op `/redactie` en op een artikel van de redactie is Redactie de huidige subpagina.
  Op `/nieuws` is alleen Nieuws het huidige onderdeel, met `aria-current="page"`, en is er geen huidige subpagina.
- Een ander pad, zoals `/`, `/bronnen` of een adres dat niet bestaat, heeft geen huidig onderdeel en geen balk.

Op `/wedstrijden/<seizoen>`, `/cijfers/<seizoen>` en `/spelers/<seizoen>` nemen de items Wedstrijden en Spelers en de link Cijfers in de balk van Wedstrijden het seizoen van de pagina mee (`seasonOfPath` en `hrefOf`), zodat een bezoeker in een afgelopen seizoen daarin blijft.
Een pad zonder seizoen, of met een waarde die geen seizoen is (`seasonFromSlug`), laat de adressen zoals ze zijn.

De oude adressen `/podcasts` en `/zoeken` bestaan niet meer en hebben geen omleiding: er waren nog geen openbare links (zie de beslissing in `docs/beslissingen/site.md`).
De footer heeft geen link naar Zoeken meer; Zoeken staat in de balk van Nieuws.
De laatste link van de footer is Beheer, naar `/beheer/inloggen`, voor iedereen zichtbaar: de app op het beginscherm van een iPhone heeft geen adresbalk.

## Schakelaars die in de pagina wisselen

Welke stand, Welke wedstrijden en Welke berichten zijn gewone links (`SegmentedLinks` uit het designsysteem, dat niets van Next.js kent).
`SwitchLinks` in `src/SwitchLinks.tsx` is het clientonderdeel dat er met JavaScript een wissel binnen de pagina van maakt: `StandingsSwitch`, `CompetitionLinks` en de lijst in `/beheer/berichten` gebruiken het.
Een gewone klik met de linkermuisknop (of Enter) zet de waarde van de schakelaar meteen op de keuze en roept `router.push(href, { scroll: false })` aan; de oude inhoud blijft staan tot de nieuwe er is.
Terwijl de pagina laadt, staat `aria-busy="true"` op de groep, en daarna zegt de regel met `role="status"` naast de groep wat er gekozen is: "Laatste 5 gekozen".
Valt de wissel weg, dan staat de schakelaar weer op de waarde van de pagina.
Een klik met Ctrl, Cmd, Shift of Alt, met een andere muisknop of op een link met `target` of `download` laat `SwitchLinks` aan de link.
Zonder JavaScript zijn het echte links met `aria-current="page"`, en de nieuwe pagina laadt met de knop al bij de nieuwe keuze, zonder overgang.

Het onderdeel gebruikt `useRouter` en niet `next/link`: de site heeft geen `next/link` (een test in `src/visits.test.ts` controleert dat).
De router vraagt de gegevens van de pagina zonder `Accept: text/html`, en alleen een aanvraag die om HTML vraagt telt als paginaweergave (`visitOf` in `src/visits.ts`).
Een klik op een schakelaar telt dus niet mee, en het openen van hetzelfde adres in een nieuw tabblad wel.
`e2e/switches.spec.ts` toetst alle drie met JavaScript, op de pagina's `/wedstrijden`, `/cijfers`, `/spelers` en `/beheer/berichten`.

## De homepage

De `h1` van de homepage is "sc Heerenveen Fansite", maar die zie je niet: het logo erboven zegt het al.
Hij heeft de klasse `hf-visually-hidden` uit het designsysteem, dus een schermlezer leest hem wel voor.
Bovenaan de hoofdkolom staat de kaart "Van de redactie": het nieuwste artikel van onze eigen redactie, in de lange vorm van `ArticleCard`, met de titel, de datum, de inleiding en de link "Lees verder".
Daaronder staat het blok "Laatste nieuws": de berichten van de laatste 3 dagen (de 72 uur tot nu) van de bronnen die aanstaan, het nieuwste eerst, in één lijst zonder kop per dag: minstens 5 (de 5 nieuwste, hoe oud ook) en hoogstens 20.
Direct onder de kop staat een regel in de stijl `meta`, zoals "15 artikelen over de laatste 3 dagen": het aantal koppen in de lijst en de ouderdom van de oudste in hele dagen, naar boven afgerond (minstens 1), met "1 artikel" en "de laatste dag" in het enkelvoud.
Een bericht is een `NewsItem` uit het designsysteem: links de korte dag en de tijd, zoals "wo 14:05" (op een smalle regel boven de kop), dan de kop als link naar de bron, en daaronder de bronnaam en, achter een betaalmuur, "voor abonnees".
Zijn er geen berichten, dan staat er een tekst voor bezoekers, zonder die regel.
Onder de lijst staat de link "Al het nieuws" naar `/nieuws` (zie _De nieuwspagina_): ouder nieuws is daarvoor.
De aantallen staan op één plek in `src/items-per-card.ts`: `fewestHeadlines` (5) en `mostHeadlines` (20), uit `listSizes`, en `headlineWindowDays` (3).
`getHeadlines` haalt de 20 nieuwste koppen op en staat vijf minuten in het geheugen van de server (`src/headlines.ts`); `headlinesOfTheWindow` kiest daar bij elk bezoek de lijst uit.
De homepage kent geen parameters, geen filter, geen paginering en geen balk met subpagina's: een adres als `/?nieuws=15`, dat de knop "Laad 5 meer" vroeger maakte, laat gewoon de homepage zien.

Elke kaart met een lijst toont standaard vijf items: de discussies en de afleveringen op de homepage en de afleveringen op `/nieuws` (`itemsPerCard` in `src/items-per-card.ts`); het nieuws is de hoofdkaart en toont de koppen van de laatste 3 dagen, minstens 5 en hoogstens 20.
De toegestane maten staan op één plek, `listSizes`: 5, 10, 20 en 50, en elk aantal in dat bestand komt daaruit; een test (`src/items-per-card.test.ts`) zegt dat.
Een bezoeker kiest geen maat.
De hoofdkolom en de zijbalk zijn niet op gelijke lengte gebracht: bij 1100 pixels breed en met de verzonnen gegevens is de hoofdkolom 805 pixels hoog en de zijbalk 2055.

In de zijbalk naast het nieuws staat na Wedstrijden en Stand het blok "Nieuwste discussies" (zie _Op de homepage staat Wedstrijden boven het forum_ in `docs/beslissingen/site.md`), want het forum is onze zustersite: de vijf discussies van het forum waar het laatst op is gereageerd.
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
Onderaan de zijbalk staat het blok "Nieuwste podcasts": de nieuwste afleveringen van alle podcasts van de laatste 8 dagen, tot vijf, als `NewsItem`, met de link "Alle podcasts" naar `/nieuws/podcasts` eronder.
De server bewaart ze vijf minuten (`src/podcasts.ts`).
De afleveringen hebben dezelfde feiten als op `/nieuws/podcasts`.
De kaart (`EpisodesCard` in `src/NewsCards.tsx`) toont alleen afleveringen van de laatste 8 dagen, gerekend vanaf nu; een aflevering van precies 8 dagen oud staat er nog in.
Is er geen, dan staat er "We hebben de laatste 8 dagen geen podcastafleveringen gevonden." en blijft de link "Alle podcasts".
Dit geldt ook voor de kaart "Podcasts" op `/nieuws`, want het is dezelfde kaart.

Boven de discussies staan twee blokken met wedstrijden: "Wedstrijden" en "Stand" (zie _De wedstrijden_).
Op een telefoon staat de zijbalk onder het nieuws, dus de blokken staan onderaan de pagina.
Zonder gegevens van de wedstrijden staat er een zin voor bezoekers.
Lukt het lezen van de wedstrijden niet, dan verdwijnen de twee blokken en schrijft de site de reden in het logboek, zoals bij het artikel; de rest van de pagina blijft werken.

Lokaal staan er berichten en discussies na `pnpm run import` (zie de [README van de importer](../importer/README.md)).

## De wedstrijden

`/wedstrijden` toont het programma, de uitslagen en de stand van sc Heerenveen 1 (mannen) in het lopende seizoen, en daarnaast de hoofdtrainers.
De kaarten met cijfers staan op `/cijfers` (zie _De cijfers_).
Het programma met daaronder de uitslagen staat in de hoofdkolom en de stand met daaronder de hoofdtrainers in een brede zijbalk (`wide` op `Page.Sidebar`); op een telefoon staan ze onder elkaar in die volgorde.
Onder de stand en onder de uitslagen staat een link naar de kaart op de pagina Cijfers waar ze bij hoort, voor hetzelfde seizoen: de stand naar "Onze plek in de competitie" en de uitslagen naar "Het verloop van het seizoen".
Op een telefoon staat onder de kop een balk "Op deze pagina:" met een link naar elke kaart (Laatste wedstrijd, Programma, een link per kaart met uitslagen, Stand, Verloop op de ranglijst als het seizoen die heeft, en Hoofdtrainer, behalve in een seizoen met Verloop op de ranglijst; een eerder seizoen heeft geen Programma en noemt de stand Eindstand) (`Page.Shortcuts`, via het slot `@shortcuts` van de layout, in `app/@shortcuts/wedstrijden`); op een breed scherm is hij er niet.
De balk volgt de pagina: de link naar de kaart waar je bent, heeft een rode streep en staat vooraan in de rij.
De stand heeft een zacht vlak (`surface="soft"`), de hoofdtrainers een sterk vlak, en het programma en de uitslagen zijn wit.
Dezelfde gegevens staan in twee blokken in de zijbalk van de homepage.
De gegevens komen van de importer (zie _De wedstrijden en de stand_ in de [README van de importer](../importer/README.md)) en `@fansite/db/queries` haalt ze op: `listSeasonMatches`, `listSeasonStandings` en `listWikipediaPages`, steeds voor één seizoen.
`getMatchData(season)` in `src/matches.ts` vraagt één seizoen en bewaart het antwoord vijf minuten voor het lopende seizoen en een uur voor een eerder seizoen; zonder seizoen geeft het het lopende (`seasonOf`), en dat doet de homepage altijd.
Elk seizoen heeft één adres: `/wedstrijden` is het lopende seizoen en `/wedstrijden/2025-26` een eerder seizoen (`app/wedstrijden/[seizoen]`).
Het lopende seizoen op zijn eigen adres (`/wedstrijden/2026-27`) verwijst door naar `/wedstrijden`, en een seizoen dat niet in de database staat, een seizoen in de toekomst en een adres dat geen seizoen is, geven "niet gevonden".
Een wedstrijd met een verslag heeft een pagina op `/wedstrijden/2026-27/2026-10-24-testdorp-fc`: het seizoen, de datum en de `slug` van de tegenstander (`app/wedstrijden/[seizoen]/[wedstrijd]`).
`src/report-data.ts` leest die verslagen (`getPublicReports`, bewaard zoals de wedstrijden), met elke status.
`isCompleteReport` laat de regels van `@fansite/shared/match-report` over een verslag lopen: een verslag dat `klaar` is en klopt, is af.
Een verslag dat `bezig` is of niet klopt, heeft een pagina met de melding "We vullen dit verslag nog in", met `noindex` en zonder plek in de sitemap, en de lijsten linken ernaar; een wedstrijd zonder verslag heeft geen pagina en geen link.
Een wedstrijd die nog `scheduled` is, heeft een pagina zodra hij een verslag heeft (`getPublicReports`): vanaf de aftrap zegt de kop "Live" met de stand uit de doelpunten van het verslag (`phaseOf` van `@fansite/db/match-reports`, `MatchPageData.phase`), ervoor staat "Nog niet begonnen", de titel en de beschrijving noemen geen stand, en zijn doelpunten tellen nergens mee.
Een pagina van een wedstrijd die live is, ververst zichzelf (`LiveRefresh` in `src/LiveRefresh.tsx`): elke 60 seconden vraagt hij de pagina aan onze eigen server, met `Accept: */*` en zonder cookies, en vervangt hij de delen met `data-live-region` (`Contents`) als ze veranderd zijn.
Hij wacht als het tabblad verborgen is, stopt als de pagina niet meer live is en uiterlijk vier uur na de aftrap, en laat bij een mislukt verzoek de pagina staan.
De regel met `role="status"` zegt alleen een nieuw doelpunt en het einde van de wedstrijd, uit de verborgen regel `LiveState`; zonder JavaScript is er een link "Ververs nu".
`getPublicReports` bewaart het seizoen met een wedstrijd die live is 15 seconden, en anders 5 minuten.
`src/report-view.ts` zet een verslag om in gewone gegevens (`matchPageDataOf`, het type `MatchPageData` van `src/match-page.ts`), en `buildMatchPage` maakt daar de eigenschappen van de onderdelen van: de gebeurtenissen voor `MatchTimeline`, het veld met de spelers en hun minuten voor `MatchPitch`, de wissels, de doelpuntenmakers van de kop, de balk Wedstrijdverloop en de rondes van de strafschoppenserie.
`MatchPageView` (`src/MatchPageView.tsx`) zet die onderdelen op de pagina, uit die gegevens en uit niets anders.
Het voorbeeld naast het formulier van het verslag (`ReportPreview`, `src/beheer/report-preview.ts`) maakt die gegevens uit de waarden van het formulier en gebruikt datzelfde onderdeel, met `preview` aan.
De regel van zo'n wedstrijd in de lijst eindigt met "Het verslag" (`Match` met `reportHref`), en die van een wedstrijd die live is met "Live" (`Match` met `live`, de sleutels uit `getLiveReports`).
Rechts naast de kop staat de seizoenskiezer (`SeasonPicker` met `Page.Title`), zolang er meer dan één seizoen is: een formulier dat zonder JavaScript met de knop "Toon" werkt, via `app/wedstrijden/kies`, die doorverwijst (303).
Met JavaScript verdwijnen de knop en het zichtbare label en wisselt de pagina bij een keuze, en met het toetsenbord bevestig je een keuze met Enter; een verborgen regel legt dat aan een schermlezer uit.
Het lopende seizoen en een eerder seizoen tonen hun uitslagen allebei in een kaart per competitie met wedstrijden (Eredivisie met het anker `uitslagen`, KNVB Beker, Johan Cruijff Schaal, Play-offs Champions League, Play-offs Conference League, Play-offs Europa League en Europa League, zonder het woord Uitslagen in de kop; `resultsPerCompetition` en `resultsCardOf`).
Het lopende seizoen heeft de nieuwste uitslag bovenaan, een kaart Laatste wedstrijd (de nieuwste begonnen wedstrijd, ook die staat in Uitslagen) en een kaart Programma met alle competities op datum.
Een eerder seizoen heeft geen kaart Programma en geen kaart Laatste wedstrijd, toont elke kaart van de eerste naar de laatste wedstrijd (`resultsOfSeason`), noemt zijn tabel Eindstand (`standingsCardOf`, met het anker `eindstand`), zet het seizoen op de afbeelding van een kaart en staat niet in de sitemap.
Een pagina met een ander basisadres (zoals `/cijfers`) gebruikt dezelfde onderdelen: `loadSeasonPage`, `seasonOfAddress` en `pickedSeasonResponse` in `src/season-page.ts`, `seasonFromSlug`, `seasonAddress`, `seasonChoices` en `pickedAddress` in `src/seasons.ts`, `getMatchSeasons` en `getMatchData` in `src/matches.ts`, `SeasonPicker` en `Page.Title` uit het designsysteem, en een route naast de pagina die `pickedSeasonResponse` aanroept, zoals `app/wedstrijden/kies/route.ts`.
Lukt het lezen niet, dan toont `/wedstrijden` de foutpagina, zoals `/bronnen`.

- **Programma:** alle wedstrijden die nog niet zijn begonnen, op volgorde van de dag, ook een uitgestelde wedstrijd (die zegt "Uitgesteld").
  Een geannuleerde wedstrijd staat er niet in: hij wordt niet meer gespeeld en staat in Uitslagen, in zijn speelronde, met "Geannuleerd".
  Een wedstrijd is begonnen als zijn aanvangstijd voorbij is, of, zonder aanvangstijd, als zijn dag in Nederlandse tijd voorbij is (`overviewOf` in `src/matches.ts`, met het moment van het verzoek).
  Een weekend telt tot het einde van zijn laatste dag.
- **De doelpuntenmakers in een wedstrijdregel:** de achternaam zoals Wikipedia hem schrijft.
  Hebben twee verschillende personen in dezelfde regel dezelfde naam, dan krijgen ze de beginletter van hun voornaam erbij, zoals `J. Trenskow`, en de hele voornaam als die beginletter ook gelijk is (`goalsWithInitials` in `src/matches.ts`).
  De namen vergelijken zoals de wedstrijdpagina ze schrijft, dus met het voorvoegsel.
- **Verloop op de ranglijst:** een kaart op het zachte vlak (`surface="soft"`, anker `#verloop-op-de-ranglijst`, `PlacePerRoundCard` in `src/PlacePerRoundCard.tsx`, #411) in de zijbalk, direct onder de stand, met de laatste regel "Alleen de Eredivisie" en een link in de balk "Op deze pagina:".
  De lijn is `BarChart.Trend` met plek 1 bovenaan en de speelrondes onderaan; ze is voor een schermlezer verborgen.
  De x-as heeft een streepje met een getal bij ronde 1, een kwart, de helft, driekwart en de laatste ronde (1, 8, 17, 25 en 34), de y-as bij plek 1, de helft en de laatste plek (1, 9 en 18) (`axisTicks` in `src/placeHistory.ts`), en de tooltip zegt "Ronde 12: plek 4" met alleen de plek vet.
  Bij elke nieuwe hoofdtrainer na de eerste staat een gestreepte lijn op de rand tussen twee rondes (`dividers` van `BarChart`, #992).
  Boven een gesloten `Disclosure` staat een beschrijvingslijst (`DescriptionList`) met de hoogste en de laagste plek (met alle rondes, `roundRanges` en `placeLines` in `src/placeHistory.ts`).
  Eén hoofdtrainer staat daaronder in een alinea met de naam; meer hoofdtrainers staan in een lijst, elk met de rondes en de plek van begin naar einde op een tweede regel ("Ronde 1–12 · plek 5 → 9", `coachLines` en `coachText`; de rondes komen uit de wedstrijden).
  Een schermlezer hoort "t/m" bij het streepje en "naar" bij de pijl.
  De uitklapper heeft twee tabellen naast elkaar met Ronde, # en P, ronde 1 bovenaan: de eerste helft van de rondes van het seizoen en de rest.
  `placePerRoundOf` in `src/matches.ts` rekent de stand na elke ronde uit `league_results` (punten, doelsaldo, doelpunten voor, dan de naam).
  Een ronde is een punt als alle wedstrijden van die ronde en van de rondes ervoor gespeeld zijn; anders is het een open plek.
  Het lopende seizoen toont de lijn tot de laatste complete ronde.
  Een seizoen zonder uitslagen van alle clubs, of met afgetrokken punten, heeft geen kaart en geen link in de balk.
- **Hoofdtrainer of Hoofdtrainers:** (alleen in een seizoen zonder de kaart Verloop op de ranglijst, want die toont de trainers zelf, en dan staat ook de link in de balk er niet) een kaart met het sterke blauwe vlak (`surface="strong"`) in de zijbalk, onder de stand, met de hoofdtrainers van het seizoen uit de tabel `staff` (zie de README van `packages/db`), op volgorde van begin.
  De kop is "Hoofdtrainer" bij één trainer en "Hoofdtrainers" bij meer, met altijd het anker `#hoofdtrainer`.
  Elke trainer is een regel (`ShortStaff`) met zijn naam, zoals de naam van een speler: de voornaam in het normale gewicht en de achternaam in het sterkere (`splitPersonName` in `src/player-name.ts`), met "(interim)" erachter in het normale gewicht.
  Een seizoen met één trainer toont alleen de naam.
  Bij meer trainers staat voor elke trainer behalve de laatste "tot 14 mrt 2026", de dag waarop hij stopte, en voor de laatste "vanaf 1 sep 2025", de dag waarop hij begon (`coachPeriods` in `src/match-format.ts`).
  Een datum die alleen als maand of jaar bekend is, staat zo ("tot mrt 2026").
  De namen zijn geen links en de kaart heeft geen bronvermelding van zichzelf: de bron staat onderaan de pagina.
  Een seizoen zonder trainer in de tabel heeft de kaart niet, en dan ook geen link in de balk "Op deze pagina:".
- **Stand:** de volledige tabel met een balk naast de punten, en een bijschrift met de dag waarvoor de stand geldt; alleen een schermlezer krijgt dat bijschrift.
  Heeft een club een puntenaftrek, dan staat onder de tabel een regel als "FC Twente: 6 punten aftrek."; de punten in de tabel zijn die na de aftrek, en "Laatste 5" heeft de regel niet.
  Een eerder seizoen noemt de kaart en het bijschrift "Eindstand", met het anker `eindstand`.
  De balk verdwijnt op een smalle plek.
  Is bij een wedstrijd van het lopende seizoen de uitslag er twee uur na de aanvang nog niet (`standingsLag` in `src/matches.ts`, op `lacksResult`), dan staat onder de tabel "Gegevens nog niet bijgewerkt" (`StandingsBehind` in `src/MatchViews.tsx`), in `Text appearance="meta"`, in hetzelfde rood als "Gegevens nog niet beschikbaar" (`hf-text-missing`) en boven de link.
  Een Eindstand krijgt de regel niet, een kaart zonder tabel ook niet, en de afbeelding van de kaart laat haar weg (`data-hf-card-share-skip`).
  Onder de kop staat een schakelaar (`StandingsSwitch` in `src/StandingsSwitch.tsx`, een `SwitchLinks` in de kleine maat) met "Hele seizoen" en "Laatste 5".
  "Hele seizoen" is de standaard en heeft geen parameter; "Laatste 5" is `?stand=laatste-5`, en elke andere waarde is "Hele seizoen" (`parseStandingsView` in `src/standings-view.ts`).
  De links eindigen op het anker van de kaart, en de seizoenskiezer neemt de keuze niet mee.
  De tabel van "Laatste 5" telt per club de vijf wedstrijden die het laatst zijn gespeeld (`lastFiveStandings` in `src/last-five.ts`).
  De wedstrijden van sc Heerenveen komen uit `matches` en die van de andere clubs uit `league_results`, en `getLeagueResults` in `src/matches.ts` bewaart die per seizoen zoals `getMatchData`.
  De schakelaar staat er alleen in het lopende seizoen: een Eindstand heeft hem niet, en `?stand=laatste-5` geeft daar de gewone kaart.
  Hij staat er als elke club hoogstens één uitslag minder heeft dan het aantal gespeelde wedstrijden in de stand, omdat de pagina's van Wikipedia los van elkaar worden bijgewerkt (`hasEnoughLeagueResults`); anders blijft de kaart zoals hij was.
  Het bijschrift van "Laatste 5" noemt de dag van de laatste uitslag in onze gegevens, niet de dag van de stand.
- **Uitslagen:** alle wedstrijden die zijn begonnen, in een kaart per competitie met wedstrijden, in de volgorde Eredivisie, KNVB Beker, play-offs (`resultsPerCompetition`).
  Het lopende seizoen heeft de nieuwste bovenaan, een eerder seizoen begint bij de eerste wedstrijd (`resultsOfSeason` in `src/matches.ts`).
  Zonder uitslag is er één kaart Uitslagen met zijn zin.
  Een kaart noemt de competitie niet in de regel (`withCompetition` van `MatchLines`), want de kop noemt haar, elke kaart heeft de legenda van zijn eigen wedstrijden, en de link naar het verloop van het seizoen staat in de kaart Eredivisie.
  Programma houdt alle competities bij elkaar en noemt haar wel.
  `Match` zegt niet "Thuis" of "Uit", en zet met de competitie de dag en het stadion bovenaan en de competitie met de ronde onderaan; zonder de competitie begint de regel met de ronde.
  Een wedstrijd zonder uitslag staat er ook in, en zegt twee uur na de aanvang "Gegevens nog niet beschikbaar" (zonder aanvangstijd vanaf de dag erna).
  De zin komt van `lacksResult` in `src/matches.ts` en de eigenschap `resultMissing` van `Match`, en verdwijnt zodra de wedstrijd een score heeft.
  Een wedstrijd met een `note` in de database (een gestaakte wedstrijd die later is uitgespeeld) toont die tekst als laatste regel onder de wedstrijd, ook onder die zin.
  `MatchLine` in `src/MatchViews.tsx` geeft hem door aan `Match`.
  Programma, Uitslagen en de kaart Wedstrijden op de pagina van een club gebruiken dezelfde `MatchLine`.
  De lijsten met `ShortMatch` (zie de beslissing van 4 november 2026 in `docs/beslissingen/site.md`) kiezen wedstrijden uit en hebben er geen plek voor.
- **Homepage:** het blok "Wedstrijden" toont in één lijst de vorige wedstrijd (de eerste van Uitslagen, ook zonder uitslag, maar niet een geannuleerde) en de volgende (de eerste in het programma die een datum heeft, dus niet een uitgestelde).
  Het blok "Stand" toont drie clubs met sc Heerenveen in het midden, als dat kan, zonder balk naast de punten, en onder de tabel dezelfde regel "Gegevens nog niet bijgewerkt" als de kaart Stand op Wedstrijden.
  De blokken linken naar "Alle wedstrijden" en "De volledige stand" (`/wedstrijden#stand`).

Een wedstrijd is een `Match` uit het designsysteem, de stand een `StandingsTable`.
De aftrap staat in Nederlandse tijd (`src/match-format.ts`), zoals "zo 1 nov 14:30", met het jaar als dat niet dit jaar is.
Is de aftrap nog niet bekend, dan staat er het weekend, zoals "weekend 12–14 februari", uit `date_text`; een uitslag heeft alleen de dag.
Onderaan de zijbalk staat de bronvermelding (`WikipediaCredit`) in een doorzichtige kaart (`Card` met `surface="transparent"`), zodat de tekst op één lijn staat met de tekst in de kaarten erboven.
Ze staat dicht, op elke pagina en voor elk aantal pagina's: een `details` met een `summary` die "Bron: Wikipedia" zegt, zonder link.
Eén klik laat de licentie zien, een link naar elke pagina van Wikipedia die de import las, de tijd van de laatste keer lezen en de zin dat onze wedstrijdgegevens ook CC BY-SA 4.0 zijn.
De bron is dus zonder klik te zien (principe 4 van de Redactie), en de rest is één klik verder.
Wedstrijden uit de gegevens van de sc Heerenveen Fansite zelf (1990 tot 2007, `data_source = 'oude-fansite'`) hebben een eigen bronvermelding.
`sourceOf` (`src/match-sources.ts`) leest de bron van de wedstrijden op de pagina of de kaart: Wikipedia, het archief of allebei.
Het archief alleen geeft `ArchiveCredit`, één regel zonder uitklap: "Bron: sc Heerenveen Fansite".
Allebei geeft `WikipediaCredit` met `archive`, dat beide noemt.
Een pagina met pagina's van Wikipedia (voor de stand) noemt Wikipedia altijd.
De lijst van de tegenstanders noemt de bronnen van alle wedstrijden in de database (`getMatchSource`).
Een gespeelde wedstrijd toont alleen de dag, ook zonder aftrap in de database, dus een wedstrijd uit het archief heeft nooit "tijd nog niet bekend" of een weekend.
Ze werkt zonder JavaScript en met het toetsenbord.
Ze linkt niet naar de geschiedenis van die pagina's: Wikipedia ziet een link naar het artikel als een goede bronvermelding, en de auteurs staan in de geschiedenis van het artikel.
Onder de twee blokken op de homepage staat alleen "Bron: Wikipedia".
De pagina's komen uit `wikipedia_pages` (alleen die van de wedstrijden, niet de pagina van de selectie); zonder gegevens van de wedstrijden staat er ook geen bronvermelding.
De pagina's laden niets van een ander domein en hebben geen JavaScript nodig, en er staan geen clubwapens, alleen de namen.

`pnpm test:a11y` gebruikt de verzonnen wedstrijden, stand en uitslagen van alle clubs van de seed (`madeUpMatches`, `madeUpTable` en `madeUpLeagueResults`), met de pagina's die ze bronnen (`madeUpWikipediaPages`).
Drie verzonnen wedstrijden van de sc Heerenveen Fansite (`madeUpOldMatches`, in 1992/93, 1996/97 en 2004/05) laten de nieuwe competities, een dag zonder tijd en de bronvermelding van het archief zien.
Voor de pagina van Testdorp FC zet ze er drie oudere wedstrijden bij (`e2e/older-meetings.ts`).
Die club heeft dan vijf gespeelde wedstrijden en zijn pagina toont de rij "Laatste wedstrijden".
De andere clubs hebben er minder en hebben geen rij.

## De cijfers

`/cijfers` toont onder twaalf kopjes de kaarten met cijfers over sc Heerenveen 1 (mannen) in het lopende seizoen: onze plek in de competitie, onze plek door de jaren, het verloop van het seizoen, hoe de wedstrijden verlopen, de reeksen, thuis en uit, de toeschouwers, hoe vaak welke uitslag, de wedstrijden waarin we de nul hielden, de doelpunten per kwartier en de uitersten, en daarnaast de resultaten per hoofdtrainer over alle seizoenen.
Wedstrijden is wat je opzoekt, een lijst van wedstrijden en de stand; Cijfers is wat uit veel wedstrijden volgt, een telling, een rangorde of een verloop (de beslissing staat in `docs/beslissingen/site.md`, _De site heeft vier onderdelen_).
De kaarten staan in twee gelijke kolommen: de eerste zes in de hoofdkolom, onder de kop met de seizoenskiezer, en de andere zes in een brede zijbalk (`wide` op `Page.Sidebar`), die even breed is als de hoofdkolom.
Cijfers is de uitzondering op de regel voor de kolommen (zie _Een kaart staat op de pagina van de zaak die hij beschrijft, en de hoofd- en zijkolom hebben vaste rollen_ in `docs/beslissingen/site.md`): hier hebben beide kolommen cijfers, omdat er geen lijst of tabel is waar de pagina voor bestaat.
Links staan onze plek, onze plek door de jaren, het verloop, hoe de wedstrijden verlopen, de schakelaar, de reeksen en thuis en uit, en Opmerkelijk.
Rechts staan de toeschouwers, hoe vaak welke uitslag, de nul gehouden, de doelpunten per kwartier, de uitersten, de resultaten per hoofdtrainer en de bronvermelding.
De kaart Resultaten per hoofdtrainer (`src/CoachResultsCard.tsx`, de telling in `src/coachResults.ts`) is een tabel met een rij per trainer met wedstrijden, de nieuwste eerst, met achter de naam de regel "34 wedstrijden, 1,85 punten per wedstrijd" (`matchesLineOf`, als `children` van `PlayerName`), volgt de schakelaar, telt alle seizoenen en heeft geen knop voor een afbeelding.
De drie kaarten die de schakelaar negeren (onze plek, het verloop en hoe de wedstrijden verlopen) staan bij elkaar bovenaan de hoofdkolom, boven de schakelaar, en elk eindigt met de regel "Alleen de Eredivisie" (`EredivisieOnly` in `src/MatchViews.tsx`).
De schakelaar staat daarmee direct boven de eerste kaart die hem volgt.
De volgorde in de broncode is de volgorde van de balk en van een telefoon: eerst de hoofdkolom, dan de zijbalk.
Op een telefoon staan alle kaarten onder elkaar in die volgorde.
Onder de kop staat dan een balk "Op deze pagina:" met een link naar elke kaart (`app/@shortcuts/cijfers`, de links in `src/statisticsShortcuts.ts`).
De kaarten tellen standaard alle wedstrijden, de Eredivisie, de KNVB Beker en de play-offs voor de Conference League of de Europa League; met `?competitie=eredivisie` tellen ze alleen de Eredivisie (zie _De keuze tussen alle wedstrijden en de Eredivisie_ hieronder).
Onder het hoofdmenu staat op de pagina's van Wedstrijden een balk met de subpagina's van Wedstrijden: Cijfers en Tegenstanders (Spelers is een onderdeel van het hoofdmenu, zie _De spelers_, en heeft geen balk).
De links van die balk houden de keuze tussen alle wedstrijden en de Eredivisie vast: met `?competitie=eredivisie` in het adres blijft de link naar Tegenstanders `/tegenstanders?competitie=eredivisie`, en die naar Cijfers `/cijfers?competitie=eredivisie`.
De link naar Cijfers houdt ook het seizoen van de pagina vast, zoals het menu: op `/wedstrijden/2025-26` gaat hij naar `/cijfers/2025-26`.
Tegenstanders telt alle seizoenen, dus het seizoen reist niet mee.
De items van het menu zelf houden de keuze niet vast, en het seizoen alleen op de pagina van een seizoen: op `/cijfers/2025-26` gaan Wedstrijden en Spelers naar `/wedstrijden/2025-26` en `/spelers/2025-26` (`hrefOf` in `src/SiteNavigation.tsx`).
De keuze staat in de query string, en die kan een clientcomponent in de layout alleen lezen met `useSearchParams` en een Suspense-grens, en dat raakt elke pagina.
Daarom tekent het slot `@subnav` van de layout de balk op de server (`app/@subnav/wedstrijden`, `app/@subnav/cijfers` en `app/@subnav/tegenstanders`, `src/matchesBar.tsx`), en geeft de layout hem aan `SiteNavigation` (`matchesBar`), dat hem aan het item Wedstrijden geeft (`bar` van `Navigation`).
`matchesSubitems` in `src/SiteNavigation.tsx` zegt alleen welke subpagina de huidige is.
Alleen de pagina's van Wedstrijden, Cijfers en Tegenstanders hebben een route in het slot, en zij worden al per verzoek gemaakt; elke andere pagina, ook Spelers, krijgt een leeg slot.
Op `/wedstrijden` en zijn seizoenen is geen subpagina de huidige; op `/cijfers` en zijn seizoenen is Cijfers het wel, en op `/tegenstanders` en de pagina's van de clubs is het Tegenstanders.
Wedstrijden is dan het huidige onderdeel van het menu (`aria-current="true"`).
Op `/spelers` en zijn seizoenen is Spelers het huidige onderdeel van het menu (`aria-current="page"`), zonder balk en zonder dat Wedstrijden meetelt.
Op een breed scherm is de balk er niet.
De balk volgt de pagina, zoals die van Wedstrijden.
De stand, de reeksen, de nul gehouden, hoe de wedstrijden verlopen en de uitersten hebben een zacht vlak (`surface="soft"`), het verloop van het seizoen, hoe vaak welke uitslag en de doelpunten per kwartier een warm vlak (`surface="warm"`), en onze plek in de competitie en thuis en uit zijn wit.

De pagina deelt met Wedstrijden alles rond het seizoen: `loadSeasonPage`, `seasonOfAddress` en `pickedSeasonResponse` in `src/season-page.ts`, en de onderdelen van `src/seasons.ts`.
Elk seizoen heeft één adres: `/cijfers` is het lopende seizoen en `/cijfers/2025-26` een eerder seizoen (`app/cijfers/[seizoen]`), en de kiezer gaat via `app/cijfers/kies`, die doorverwijst (303).
De regels zijn die van Wedstrijden (zie _De wedstrijden_): het lopende seizoen op zijn eigen adres verwijst door, een onbekend seizoen geeft "niet gevonden", en lukt het lezen niet, dan staat er de foutpagina.
Een eerder seizoen toont dezelfde twaalf kaarten, met het seizoen op de afbeelding; de kaarten zelf zijn dezelfde als vroeger op `/wedstrijden`, met dezelfde cijfers.
De ankers van de kaarten stonden op `/wedstrijden` en zijn verhuisd, met hun oude naam (`nul-gehouden`).
De kaart Doelpuntenmakers (de top 5, met het anker `#doelpuntenmakers` en `#topscorers`) is van Cijfers verdwenen: Spelers heeft de hele lijst en is de enige plek (#774).
Op `/wedstrijden` zijn ze weg, met opzet en zonder omleiding (zie `src/anchors.ts`).
Onder de Stand en onder de Uitslagen staat op Wedstrijden een link naar "Onze plek in de competitie" en naar "Het verloop van het seizoen", met het seizoen in het adres.

- **Onze plek door de jaren:** de tweede kaart, links, direct onder Onze plek in de competitie (`FinalPlacesCard`, `surface="soft"`, anker `#onze-plek-door-de-jaren`, #411; hij stond tot dan op Wedstrijden).
  Hij toont onze eindplek in elk seizoen met een stand als lijn, met plek 1 bovenaan, en is op elke seizoenspagina van Cijfers dezelfde.
  Een link naar een seizoen gaat naar `/wedstrijden/<seizoen>`.
  De kaart ontbreekt als geen seizoen een stand heeft of als de plekken niet gelezen kunnen worden.
- **Onze plek in de competitie:** de eerste kaart, links, op het witte vlak en met de laatste regel "Alleen de Eredivisie", met een `DataTable` die de plaats van sc Heerenveen in de hele Eredivisie geeft op vijf onderdelen: punten per wedstrijd, gewonnen wedstrijden, de beste aanval (doelpunten voor), de beste verdediging (doelpunten tegen, minder is beter) en het doelsaldo.
  `leaguePlaceOf` in `src/matches.ts` rekent ze uit de stand, dus de import verandert niet.
  Punten per wedstrijd is de eerlijke vergelijking, want de clubs hebben niet evenveel gespeeld; twee clubs zijn gelijk als hun punten en wedstrijden in dezelfde verhouding staan.
  Clubs met dezelfde waarde delen de plaats ("gedeeld 2e") en een club die nog niets speelde telt niet mee.
  Onder de tabel staan twee zinnen: hoeveel punten sc Heerenveen achter de koploper staat (of dat het bovenaan staat) en hoeveel het voor staat op de laatste (of dat het onderaan staat).
  Daaronder staat "Stand na n wedstrijden".
  Staat sc Heerenveen niet in de stand, of heeft het nog niets gespeeld, dan staat er een zin in plaats van de tabel.
  Er zijn geen lijnen voor Europa of degradatie en geen verwachte eindstand: de kaart zegt wat er is.
- **Verloop van het seizoen:** een kaart in de linker kolom, direct onder de kaart met onze plek in de competitie, met de laatste regel "Alleen de Eredivisie" en met `FormChart` uit het designsysteem: de vorm, een staafje per gespeelde wedstrijd van de Eredivisie en de lijn erdoorheen, die bij de eerste wedstrijd begint en het gemiddelde neemt over hoogstens vijf wedstrijden.
  `leagueResultsOf` in `src/matches.ts` maakt de lijst `W`, `G` en `V` uit de gespeelde wedstrijden van de Eredivisie met een uitslag, op volgorde van speeldatum; een bekerwedstrijd telt niet mee.
  Een uitgestelde wedstrijd heeft pas een staafje als hij gespeeld is, en staat dan op de plek waar hij gespeeld is.
  Een geannuleerde wedstrijd heeft nooit een staafje.
  Een tooltip volgt de muis, een pen of een vinger langs de lijn en toont het gemiddelde op het dichtstbijzijnde punt, bijvoorbeeld "1,8".
  Onder de grafiek staat dezelfde informatie als tabel (`DataTable`: winst, gelijk, verlies en totaal, met de wedstrijden en de punten), die de schermlezer krijgt, want de grafiek is voor hulpsoftware verborgen.
  Daaronder staat een uitklapper, dicht, met een tabel per gespeelde speelronde: de speelronde, de uitslag, de punten en het gemiddelde over de laatste vijf wedstrijden.
  De tabel rekent met `averagesOf` en `formatAverage` uit het designsysteem, dus met dezelfde getallen als de tooltip.
  Zonder een uitslag staat er een zin in plaats van de grafiek.
- **Reeksen:** een kaart in de linker kolom, direct onder de schakelaar, in het zachte vlak.
  `streaksOf` in `src/matches.ts` geeft zes reeksen uit de score van de gespeelde wedstrijden: ongeslagen, gewonnen, zonder winst, verloren, gescoord en zonder tegendoelpunt.
  Elke reeks heeft de lengte van nu en de langste van het seizoen, en komt uit alle gespeelde wedstrijden, ook die zonder bekende doelpunten.
  Een bekerwedstrijd telt mee bij de keuze Alle wedstrijden en niet bij Eredivisie.
  Een wedstrijd zonder score en een wedstrijd die niet is gespeeld tellen nooit mee.
  De kaart toont de reeksen in een tabel (`DataTable`), daaronder de laatste vijf wedstrijden met de oudste eerst, als letters (`MarkRow`) en als korte regels (`ShortMatch`, met de thuisclub en zijn doelpunten eerst), en onderaan "Alle 6 gespeelde wedstrijden" (`BasedOn` in `src/MatchViews.tsx`).
  Een eerder seizoen heeft alleen de kolommen Reeks en Langste en geen laatste vijf wedstrijden, en noemt het seizoen in het bijschrift.
  Zonder een gespeelde wedstrijd staat er een zin in plaats van de tabel.
- **Thuis en uit:** een kaart in de linker kolom, direct na de reeksen, met een tabel (`DataTable`) met de kolommen Thuis, Uit en Totaal.
  `homeAwayOf` in `src/matches.ts` telt de gespeelde wedstrijden met een score, gesplitst op `home`: gespeeld, gewonnen, gelijk, verloren, de punten (3 voor een winst, 1 voor een gelijkspel), de doelpunten voor en tegen en de wedstrijden zonder tegendoelpunt.
  Alles komt uit de score en niet uit de doelpuntenmakers, dus elke gespeelde wedstrijd telt mee, en een bekerwedstrijd alleen bij de keuze Alle wedstrijden.
  De beker geeft geen punten: de rijen Punten en Punten per wedstrijd staan er alleen als elke getelde wedstrijd een competitiewedstrijd is (`leagueOnly`).
  De kolom Totaal stemt overeen met de tabel van het verloop van het seizoen.
  De punten en de doelpunten per wedstrijd hebben een komma en twee cijfers, zoals "1,83".
  Een kant zonder gespeelde wedstrijd heeft een streepje waar gedeeld wordt en 0 bij de tellingen.
  Onder de tabel staat "Alle 11 gespeelde wedstrijden".
  Zonder een uitslag staat er een zin in plaats van de tabel.
- **Hoe vaak welke uitslag:** een kaart in de zijbalk, tussen Toeschouwers en De nul gehouden (`surface="warm"`, anker `#hoe-vaak-welke-uitslag`, `ScoreCountsCard` in `src/MatchViews.tsx`), met een donutdiagram en een tabel van de uitslagen die sc Heerenveen dit seizoen haalde.
  Het zijn de gespeelde wedstrijden die de schakelaar kiest: alle wedstrijden, of alleen de Eredivisie (`scoreCountsOf(matches, competition)`).
  De kaart stond tot #774 op Wedstrijden, onder de stand, en telde daar altijd alle wedstrijden.
  Een bekerwedstrijd telt met de stand na verlenging, dus 1–1 blijft 1–1; de uitkomst volgt de strafschoppen, dus 1–1 en dan winnen na strafschoppen is een winst (`resultOf` in `src/match-result.ts`).
  De donut en de tabel zetten zo'n 1–1 bij Winst, apart van de gelijke spelen met dezelfde stand.
  Elke uitslag staat vanuit sc Heerenveen gezien, onze doelpunten eerst ("4–0" is een winst en "0–1" een nederlaag), en de volgorde is eerst alle winsten, dan de gelijke spelen, dan de nederlagen, binnen een groep van groot naar klein doelsaldo en dan het grootste aantal doelpunten eerst (`scoreCountsOf` in `src/matches.ts`).
  Het diagram (`DonutChart` met `labels={false}` en `ranked`) heeft een plak per uitslag, groen voor winst, grijs voor gelijk en rood voor verlies, zonder tekst rond de ring en verborgen voor een schermlezer.
  De grootste winst en het grootste verlies hebben de sterkste kleur, en de kleur van de sterkste plakken gaat voorbij de volle kleur naar de kleur van de tekst, zodat het verschil met de zwakste goed te zien is.
  Eronder staan drie kleine tabellen naast elkaar (`DataTable.Group`), Winst, Gelijk en Verlies, en een tabel zonder uitslagen ontbreekt; op een smalle plek staan ze onder elkaar.
  Samen zijn ze de legenda en de bron van de cijfers: elke rij heeft een vlakje in precies de kleur van de plak (`DonutChart.Swatch`), de uitslag en het aantal ("4×", onder een kop die alleen een schermlezer hoort), met de uitkomst in woorden voor een schermlezer ("4–0, winst").
  Het totaal van een uitslag staat in de kop van zijn tabel: de kop is "Winst 8×" voor het oog en "Winst, 8 keer" voor een schermlezer, uit één plek in de code (`shown` en `name` van de kolom, `outcomeColumn` in `src/MatchViews.tsx`).
  Er is geen zin boven het diagram, en onder de tabellen staat alleen het aantal wedstrijden, "Alle 14 gespeelde wedstrijden" (`playedLine`).
  Zonder gespeelde wedstrijd staat er "We hebben nog geen uitslagen van dit seizoen." en geen diagram.
  De kaart heeft de knop voor een afbeelding en de bronvermelding van de pagina; een eerder seizoen zet zijn seizoen op de afbeelding.
- **De nul gehouden:** een kaart in de rechter kolom, onder hoe vaak welke uitslag en boven de doelpunten per kwartier, met de gespeelde wedstrijden van dit seizoen waarin `goals_against` 0 is, de nieuwste bovenaan: de competitie en de beker bij de keuze Alle wedstrijden, alleen de competitie bij Eredivisie.
  Elke wedstrijd is een korte regel (`ShortMatch`): de dag en de twee clubs met de uitslag ertussen, de thuisclub en zijn doelpunten eerst ("sc Heerenveen 3–0 Testdorp FC", uit "Testdorp FC 0–3 sc Heerenveen"), in de kleur van de uitkomst voor sc Heerenveen.
  Boven de lijst staat "5 keer de nul gehouden in 11 wedstrijden".
  Er staan tien regels en daaronder de knop "Laad 5 meer", die zonder JavaScript werkt: het formulier laadt de pagina opnieuw met `?nul=15`, in stappen van vijf.
  De selectie (`cleanSheetsOf` in `src/matches.ts`) gebruikt de gegevens die de pagina al voor de uitslagen haalt, dus er komt geen vraag bij.
- **Doelpunten per kwartier:** een kaart in de rechter kolom, onder de nul gehouden en boven de uitersten, met twee donutdiagrammen (`DonutChart` uit het designsysteem): de doelpunten van sc Heerenveen en de tegendoelpunten per kwartier van de wedstrijd.
  `goalsPerQuarter` in `src/matches.ts` telt ze uit de doelpuntenmakers die bij de wedstrijden horen (`match_goals`), in de competitie en bij Alle wedstrijden ook in de beker.
  De kwartieren zijn 1–15, 16–30, 31–45, 46–60, 61–75 en 76–90.
  Een doelpunt in blessuretijd telt bij het kwartier ervoor: 45+1 bij 31–45 en 90+3 bij 76–90.
  Een doelpunt na minuut 90, in de verlenging, telt niet mee.
  Een eigen doelpunt telt voor de club die ervan profiteert, zoals `ours` al regelt.
  Een gespeelde wedstrijd telt mee als hij minstens één doelpunt heeft of eindigde in 0–0; een wedstrijd met een uitslag maar zonder doelpunten in `match_goals` heeft geen minuten en blijft erbuiten.
  Onder het diagram staat dezelfde informatie als tabel (`DataTable`), die de schermlezer krijgt, want de diagrammen zijn voor hulpsoftware verborgen.
  Onder de tabel staan twee regels met tekst: "Na de 80e minuut: 5 voor, 3 tegen" en "In blessuretijd: 2 voor, 1 tegen" (`lateGoalsOf` in `src/matches.ts`).
  Ze tellen in dezelfde wedstrijden en volgen de schakelaar, en zeggen 0 als er geen doelpunt is.
  Na de 80e minuut is vanaf minuut 81, dus 90+3 en een doelpunt in de verlenging staan erbij; in blessuretijd is een doelpunt met toegevoegde tijd (45+1, 90+3, 105+1).
  Een doelpunt zonder toegevoegde tijd telt alleen voor zijn minuut, want Wikipedia noemt de toegevoegde tijd niet altijd.
  Daaronder staat "8 van de 10 gespeelde wedstrijden".
  Ging een wedstrijd in de telling naar de verlenging (`extra_time`), dan staat daaronder ook "Doelpunten in de verlenging tellen niet mee in de tabel, wel in de twee regels erboven."; anders staat die zin er niet.
  Zonder één doelpunt met een minuut staat er een zin in plaats van de diagrammen.
- **Hoe de wedstrijden verlopen:** de derde kaart van de linker kolom, direct na het verloop van het seizoen en boven de schakelaar, in het zachte vlak, met de laatste regel "Alleen de Eredivisie".
  De link in de balk onder de kop heet "Hoe wedstrijden verlopen": de hele kop past op een telefoon niet tussen de vervaagde randen van de rij.
  `matchFlowOf` in `src/matches.ts` werkt de gespeelde wedstrijden van de Eredivisie uit waarvan de doelpunten bekend zijn (dezelfde regel als de doelpunten per kwartier; de beker telt niet mee).
  De doelpunten staan in de gegevens in de volgorde van de Wikipedia-pagina en niet van het spel, dus de functie sorteert ze op minuut en toegevoegde tijd (45 komt voor 45+1).
  De kaart heeft twee tabellen (`DataTable`) met per rij de wedstrijden, winst, gelijk, verlies en punten, in kolommen met een afkorting (G, W, G, V en P, uitgelegd in een regel onder de tabellen en de twee zinnen; vijf hele woorden passen niet op een telefoon): na het eerste doelpunt ("Wij scoren eerst", "De tegenstander scoort eerst") en na de stand bij de rust ("Voor", "Gelijk", "Achter").
  Een doelpunt in minuut 45 of in de toegevoegde tijd van de eerste helft telt voor de rust, een doelpunt vanaf minuut 46 niet.
  Scoren beide clubs in dezelfde minuut als het eerste doelpunt, dan is niet te zien wie het eerst scoorde: de wedstrijd telt dan niet bij het eerste doelpunt, wel bij de rust, en onder de kaart staat hoeveel wedstrijden dat zijn.
  Een 0–0 heeft geen eerste doelpunt en staat bij de rust op "Gelijk".
  Onder de tabellen staan twee zinnen: in hoeveel wedstrijden sc Heerenveen won na een achterstand, en in hoeveel het geen winst haalde na een voorsprong.
  Een achterstand of voorsprong telt alleen als die klopt bij elke volgorde binnen een minuut.
  Zonder één wedstrijd met doelpunten staat er een zin in plaats van de tabellen, en onderaan staat "2 van de 3 gespeelde wedstrijden" (`BasedOn` in `src/MatchViews.tsx`).
- **Uitersten:** de laatste kaart, rechts, met vijf regels in een lijst: de grootste overwinning, de grootste nederlaag, de wedstrijd met de meeste doelpunten, ons vroegste doelpunt en ons laatste doelpunt, in de Eredivisie en bij Alle wedstrijden ook in de beker.
  `extremesOf` in `src/matches.ts` kiest ze uit de gespeelde wedstrijden die de keuze telt; de beker telt alleen bij Alle wedstrijden.
  Bij een gelijke stand wint de laatst gespeelde wedstrijd.
  Een regel zonder wedstrijd ontbreekt, bijvoorbeeld de nederlaag in een seizoen zonder verlies.
  De eerste drie regels komen uit de uitslag en tellen elke gespeelde wedstrijd.
  De laatste twee komen uit de doelpunten en tellen alleen de wedstrijden met bekende doelpunten, zonder verlenging en zonder minuut 0; blessuretijd telt erbij, dus 90+3 is later dan 90.
  Een eigen doelpunt van de tegenstander is een doelpunt van ons en krijgt "(eigen doelpunt)" erachter.
  Elke regel is een naam boven een `ShortMatch`, en bij een doelpunt staan de minuut en de speler in de naam, gescheiden door een middenpunt.
  Onder de lijst staat "Alle 7 gespeelde wedstrijden", en als niet elke wedstrijd zijn doelpunten heeft, een regel met "Vroegste en laatste doelpunt: 6 van de 7 gespeelde wedstrijden".
  Zonder gespeelde wedstrijd staat er een zin in plaats van de lijst.
- **Toeschouwers:** de eerste kaart van de rechter kolom, met een staaf (`BarChart`) per thuiswedstrijd van het gekozen seizoen.
  `attendanceOf` in `src/matches.ts` kiest de plekken: alleen thuiswedstrijden, zonder geannuleerde, met de beker en de play-offs alleen bij Alle wedstrijden.
  Een wedstrijd zonder getal is een lege plek, `0` een streepje, en de schaal loopt tot het hoogste aantal naar boven afgerond op 5.000.
  Onder de grafiek staan het gemiddelde, het hoogste aantal en een tabel met elke wedstrijd; zonder getal boven 0 staat er een zin in plaats van de grafiek.
- **Opmerkelijk:** de laatste kaart van de linker kolom, na Thuis en uit, met het warme vlak en één opmerkelijk feit: een feit over één wedstrijd, speler of trainer, in één zin (`NoteworthyCard` in `src/NoteworthyCard.tsx`).
  Elke soort feit is een kleine functie in `src/noteworthy.ts`, met een test in `src/noteworthy.test.ts`: doelpunten in opeenvolgende minuten, in de blessuretijd, een hattrick, zeven doelpunten of meer, een zege na een achterstand van twee, vijf zeges op rij thuis of uit, en de eerste wedstrijd onder een nieuwe trainer.
  Een nieuwe soort is één functie in `kinds`, zonder nieuwe query: ze lezen de wedstrijden en de trainers van het seizoen, die de pagina al heeft.
  De volgorde is per dag vast en door elkaar gehusseld (`orderNoteworthyFacts`, op de dag in Nederlandse tijd), en `?opmerkelijk=n` kiest het n-de feit, met rond na het laatste.
  De link "Nog iets opmerkelijks" is een gewone link naar het volgende (`?opmerkelijk=2#opmerkelijk`), met de keuze van de competitie erbij.
  Er is geen script en er wordt niets bewaard.
  Zonder feit is er geen kaart, en bij één feit geen link.
  De woorden voor de bezoeker staan in de constante `noteworthy`.
  De kaart staat niet in de balk "Op deze pagina:" en volgt de keuze van de competitie.

De bronvermelding (`Wikipedia` in `SourceCredit`) staat onderaan de rechter kolom, zoals die van Wedstrijden onderaan zijn zijbalk staat.
`pnpm test:a11y` gebruikt dezelfde verzonnen wedstrijden en stand van de seed.

### De spelers

`/spelers` is een onderdeel van het hoofdmenu, na Wedstrijden en voor het forum, op `/spelers` en `/spelers/<seizoen>`; de oude adressen bestaan niet meer en hebben geen omleiding (zie _Spelers staat in het menu na Wedstrijden_).
Het toont de kaart Selectie (`SeasonSquadCard` in `src/SeasonSquadCard.tsx`, anker `#selectie`) in de hoofdkolom op het witte vlak: elke speler van het seizoen met rugnummer, de vlag van het land en de naam (een `PlayerName` met `shirtNumber` en `country`, op een regel van `ShortFact` voor de lijntjes), met de hele naam als link naar de pagina van de speler als die er is (`href` van `PlayerName`, het adres uit `playerHref` in `src/player-address.ts`) en anders gewone tekst, in een deel per positie.
Het land komt uit `players.country` (#946), en anders uit `persons.country`; de positie komt uit `players.position`, en anders uit de linie van de persoon (`persons.line`, #1051).
De tabel van de pagina Spelers in het beheer volgt dezelfde regel (#1070): de linie van de persoon staat er als "Aanvaller (linie van de persoon)".
Een speler met een land zonder tekening in het designsysteem toont de landcode in een kader van dezelfde breedte, een speler zonder land krijgt een lege plek, en een deel waarin niemand een land heeft, heeft geen plek voor een vlag.
Onder de kop staat de zin over de volledigheid van de lijst, uit `squad_completeness` (`completenessSentence` in `src/season-squad.ts`); bij `onbekend` of zonder spelers staat er alleen de kop en die zin.
Bij de beste bron `verslag` (een seizoen met alleen spelers uit onze verslagen) zegt de zin dat de lijst uit de verslagen komt, en staat er één lijst met alleen namen; spelers uit verslagen staan niet op de kaart als een betere bron het seizoen heeft (`cardPlayers`).
De spelers komen uit `listSeasonPlayers` in `@fansite/db/queries`, in de volgorde van het rugnummer en daarna de zoekterm en de naam.
In de hoofdkolom staat bovenaan de schakelaar tussen alle wedstrijden en de Eredivisie, boven de kaart Selectie, want hij verandert alleen de kaarten met doelpunten in de zijkolom (de schakelaar staat op elke pagina bovenaan de hoofdkolom).
In de zijkolom staat de kaart Doelpuntenmakers met alle spelers die scoorden, met het anker `#doelpuntenmakers` en het oude anker `#topscorers`.
Dit is de enige plek voor de doelpuntenmakers: de top 5 op `/cijfers` is vervallen (#774).
De kaart komt uit `TopScorersCard` in `src/MatchViews.tsx`, op het zachte vlak, met een rij per speler.
De kaart heeft een kolom D/W, de doelpunten per wedstrijd, alleen als voor elke speler in de lijst vaststaat hoeveel wedstrijden hij speelde en de cijfers kloppen; anders heeft hij geen D/W, ook geen streepje en geen uitleg (alles of niets).
`goalsPerMatchOf` in `src/goals-per-match.ts` beslist dat, zonder database, uit de wedstrijden en de optredens van het seizoen (`listSeasonPlayerStats`, via `getSeasonPlayerStats` in `src/season-player-stats.ts`).
De regel: elke gespeelde wedstrijd die de kaart telt is van de Eredivisie of de KNVB Beker (bij Alle wedstrijden dus niet in een seizoen met een gespeelde wedstrijd van de play-offs of van Europa), elke speler heeft minstens één optreden in die competities, en zijn doelpunten in de selectietabel zijn die van de kaart.
De cijfers zijn er alleen voor een paar seizoenen, dus de kolom ook.
Ook Sinds 1990/91 en de kaart op de pagina van een club hebben de kolom niet.
De pagina van een club heeft er een korte vorm van, de eerste vijf plaatsen (`topFiveOf` in `src/matches.ts`, met spelers met evenveel doelpunten op één rij).

- **De lijst:** `topScorersOf` in `src/matches.ts` telt de doelpunten uit de doelpuntenmakers die bij de wedstrijden horen (`match_goals`), dus er is geen eigen vraag voor.
  Een strafschop telt mee; een eigen doelpunt niet, ook niet dat van een tegenstander dat voor ons telt, en een doelpunt van de tegenstander ook niet.
  Een doelpunt telt voor de persoon erachter (`person_id`, zie _Een speler is een persoon met een eigen `id`_ in `docs/beslissingen/hosting-en-data.md`), dus twee titels van één artikel zijn één rij ("Alfreð Finnbogason" en "Alfred Finnbogason"), en twee personen met dezelfde achternaam zijn twee rijen.
  Heeft het doelpunt geen persoon, dan telt het voor de speler (`player_id`), anders voor de titel van de pagina (`playerPage`), anders voor de naam zoals de wedstrijdpagina hem toont, als een rij van zichzelf, zodat er geen doelpunt verloren gaat, ook niet als het opvragen van een titel mislukte.
  De naam komt uit `persons`: de voornaam gewoon en het voorvoegsel met de achternaam halfvet, met `PlayerName` (`personNameParts` in `src/player-name.ts`).
  Heeft de persoon geen achternaam, dan staat de hele naam gewoon; heeft het doelpunt geen persoon, dan staat de naam van de wedstrijdpagina, gesplitst door `splitPersonName`: het eerste woord is de voornaam en de achternaam begint bij het eerste voorvoegsel, zonder verder te raden.
  Spelers met evenveel doelpunten hebben dezelfde plaats en staan op alfabet van de achternaam zonder voorvoegsel: Joost van Aken staat onder de A.
  Naast het getal staat dezelfde balk als in de stand (`bar.css` in het designsysteem): de lengte is het aandeel van de doelpunten van de topscorer, die de balk vult.
  Direct onder de kop, boven de tabel, staat hoeveel spelers er scoorden, zoals "11 spelers hebben gescoord": dezelfde plek en stijl als bij de nul gehouden.
  Het oude anker `#topscorers` blijft werken: het is een oud anker (`aliases`) op de kop.
  Mist van een gespeelde wedstrijd met een doelpunt van ons de doelpuntenmakers, dan staat onder de tabel "De doelpuntenmakers van 9 van de 11 gespeelde wedstrijden".
  De kop van de doelpunten is de afkorting D, met het volle woord onder de tabel.
  Zonder doelpunten staat er een zin in plaats van een tabel.

De pagina deelt alles rond het seizoen met Cijfers: de kiezer, de adressen `/spelers/2025-26` en de route `app/spelers/kies`, via `playersPath` in `src/season-page.ts`.
De kaart Sinds 1990/91 (`AllTimeScorersCard` in `src/MatchViews.tsx`), met het anker `#sinds-1990-91`, staat onder Doelpuntenmakers op het zachte vlak.
Ze toont de eerste tien plaatsen van de doelpuntenmakers over alle seizoenen, per persoon, met `TopScorersTable`: spelers met gelijk aantal doelpunten delen een rij, en de plaats van de tiende hoort bij alle rijen ervan.
De telling is `allTimeScorersOf` in `src/matches.ts`, dus `topScorersOf` over de wedstrijden van alle seizoenen (`getAllTimeMatches`, één query: `listAllMatchGoals` in `@fansite/db/queries`, een uur bewaard).
De kaart heet "Sinds 1990/91", naar het eerste seizoen met wedstrijden, en zegt hoeveel spelers er scoorden als de lijst is afgekapt.
Ze volgt de schakelaar, maar niet het seizoen van de kiezer.
Kan de database niet worden gelezen, dan blijft de kaart weg en houdt de rest van de pagina zijn inhoud.
De kaart Bijzondere doelpunten (`SpecialGoalsCard` in `src/SpecialGoalsCard.tsx`, met `specialGoalsOf` in `src/matches.ts`), met het anker `#bijzondere-doelpunten`, staat in de zijkolom ("Meer cijfers over de spelers") op het zachte vlak.
Op een telefoon volgt de zijkolom op de hoofdkolom, dus de selectie komt eerst, en de bronvermelding sluit de zijkolom af.
Ze noemt ook de pagina's van de selectie van het seizoen, en Wikidata (CC0) als een speler daarvandaan komt.
De kaart heeft één kop, van niveau 2, en daaronder een lijst van vier delen, gebouwd zoals de kaart Uitersten: elk deel is een `List.Item` met de naam als rustige tekst erboven (`Text appearance="meta"`) en de waarde eronder in een `ShortFact` van het designsysteem, dat de dunne lijnen tussen de delen tekent.
De naam en de waarde staan in hetzelfde lijstitem, dus een schermlezer leest ze samen.
De delen zijn:

- **Hattricks:** de spelers met drie of meer doelpunten in één wedstrijd, achter elkaar met komma's ("Jan Jansen 2×, Piet Pietersen"; één keer staat er geen getal), of "Nog geen" in de rustige kleur.
  Een speler met een hattrick staat in die wedstrijd niet ook bij de dubbelslagen, maar een andere wedstrijd kan hem wel een dubbelslag geven.
- **Dubbelslagen:** de spelers met precies twee doelpunten in één wedstrijd, op dezelfde manier.
- **Strafschoppen:** "1 van de 17 doelpunten", het aantal doelpunten van sc Heerenveen uit een strafschop, van alle doelpunten van sc Heerenveen (een eigen doelpunt van de tegenstander telt mee).
- **Eigen doelpunten:** "1 door de tegenstander · 0 door ons": het aantal dat een speler van de tegenstander in eigen doel maakte, en het aantal dat een speler van ons deed.

De cijfers van de strafschoppen en de eigen doelpunten blijven staan, ook als ze 0 zijn.
Zonder doelpunt in een gespeelde wedstrijd is de kaart één zin zonder delen en zonder knop voor een afbeelding.
De kaart telt de gespeelde wedstrijden waarvan de doelpunten bekend zijn, zoals Doelpunten per kwartier, en zegt onderaan hoeveel wedstrijden ze telt, in dezelfde vorm als de andere kaarten.
Een speler wordt herkend zoals in de lijst van doelpuntenmakers.
De balk "Op deze pagina:" heeft vier links, naar de vier kaarten (`playersShortcuts` in `src/statisticsShortcuts.ts`, `app/@shortcuts/spelers`), en zeven bij een seizoen met verslagen (zie hieronder).
De kaarten Alle spelers, Assists en Minuten (`AllPlayersCard` en `RankingCard` in `src/ReportFiguresCards.tsx`, #832) staan er alleen bij een seizoen met minstens één verslag dat `klaar` is: Alle spelers in de hoofdkolom onder de selectie, Assists en Minuten achteraan in de zijkolom.
Ze lezen alleen de verslagen (`getSeasonReportFigures` in `src/season-report-figures.ts`, vijf minuten bewaard per seizoen en keuze, met `readPlayerReportStats` van `@fansite/db/match-reports`), volgen de schakelaar, en zeggen onder de kaart op hoeveel van de gespeelde wedstrijden ze rusten, met "Bron: eigen administratie".
`src/report-figures.ts` zet de cijfers in volgorde: de top 5 met gedeelde plekken (`rankedPlaces`) en de rijen van de tabel op minuten en dan naam (`figureRows`).
Slaat de redactie een verslag als `klaar` op, dan bewaart `saveReport` elke speler wiens doelpunten in de verslagen afwijken van de tabel van Wikipedia als een rij in `player_stat_differences` (`compareReportGoals`, #974).
De redactie beslist erover op `/beheer/kwaliteit/<seizoen>/spelerscijfers` (zie _De kwaliteit van de gegevens_).
De balk "Op deze pagina:" heeft de links erheen alleen bij zo'n seizoen (`playersShortcutsFor`, met `seasonHasReports`).
Kan de database niet worden gelezen, dan blijven de kaarten weg en houdt de rest van de pagina zijn inhoud.
De bezoekteller telt de pagina van een seizoen als een bezoek aan `/spelers`.

### De tegenstanders

`/tegenstanders` is een subpagina van Wedstrijden, naast `/cijfers`, met de pagina van elke club eronder op `/tegenstanders/<club>`; de oude adressen bestaan niet meer en hebben geen omleiding (zie _Tegenstanders hoort bij Wedstrijden_).
Het is een tabel met elke club waartegen sc Heerenveen speelde, van A tot Z, met het aantal gespeelde, gewonnen, gelijkgespeelde en verloren wedstrijden, de punten en het doelsaldo.
Elke clubnaam is een link naar `/tegenstanders/<club>`, waar `<club>` de `slug` van de club is (zie de README van `packages/db`).
De server stuurt de tabel zonder knoppen om te sorteren, en deze lijst heeft geen paginering.
Met JavaScript is elke kolom sorteerbaar; de kolom D sorteert op het doelsaldo, dus de club waartegen het best ging, komt bovenaan.
De zes cijferkolommen hebben een afkorting (G, W, G, V, P, D) met het hele woord voor een schermlezer, en een regel onder de tabel legt ze uit.
De punten (3 per winst, 1 per gelijkspel) en het doelsaldo (met een teken: `+18`, `−2`, `0`) staan bij beide keuzes, en tellen alle wedstrijden die de lijst telt, de beker ook (`pointsOf` in `src/opponents.ts`).
De letters en woorden komen uit `tableColumns` van het designsysteem, zoals in elke tabel.
De rijkop is een link dankzij `href` op een rij van `DataTable`.
Een club met alleen wedstrijden die nog niet zijn gespeeld, staat erin met nullen.
De lijst staat in de hoofdkolom, op het witte vlak.
De zijkolom heeft de zachte kaart "Gemiddeld resultaat" (`TopPointsCard`), met de top 10, en de bronvermelding.
De kaart toont de tien clubs waartegen we gemiddeld de meeste punten per wedstrijd haalden, van de clubs met minstens 5 gespeelde wedstrijden (`topPointsOf` in `src/opponents.ts`).
Hij telt dezelfde wedstrijden als de lijst en volgt dus de schakelaar.
Het is een `DataTable` die niet sorteert: de plaats komt uit `position` van een rij en het gemiddelde is de `key`-kolom, het kerngetal van de tabel.
Daaronder staat de zachte kaart "Het moeilijkst" (`HardestCard`) met de vijf clubs waartegen we gemiddeld de minste punten per wedstrijd haalden (`hardestOf` in `src/opponents.ts`).
Ze heeft dezelfde tabel, legenda en regel over het aantal wedstrijden als de top 10, van laag naar hoog, en staat er alleen als minstens 10 clubs 5 gespeelde wedstrijden hebben.

De pagina van een club heeft de naam als h1, met "Eerder: …" eronder als de redactie een lijst van namen heeft ingevuld (zie _De namen van een club_ onder _Het beheer_).
De regel noemt de namen vóór de naam van nu met hun periode, zoals "Eerder: FC Zwolle t/m 2011/12" (`earlierNames` in `src/opponents.ts`).
Een club zonder lijst, of met één naam, heeft geen regel: de andere schrijfwijzen van Wikipedia (`club_names`, zoals `N.E.C.` bij `NEC`) staan er niet onder.
Heeft een naam een toelichting, dan staat onder de regel het uitklapblok "Over de namen" (`ClubNamesNotes`), met elke naam, zijn periode en de toelichting als gewone tekst.
De wedstrijden van de lijsten tonen de naam die in het seizoen van de wedstrijd gold; de database bepaalt die (zie _De namen van een club_ in de README van `@fansite/db`).
De pagina heeft twee kolommen.
De hoofdkolom heeft de keuze voor de competitie en de kaart Wedstrijden op het witte vlak: elke wedstrijd tegen de club, de nieuwste eerst, als `Match` (`MatchLine` in `src/MatchViews.tsx`, dezelfde code als Uitslagen).
Een gespeelde wedstrijd toont wat hij bij Uitslagen toont: de doelpuntenmakers waar we ze kennen, verlenging en strafschoppen, met de competitie en de ronde in de regel en de dag met het jaar (`withYear` van `matchMoment` in `src/match-format.ts`), zodat een wedstrijd uit een eerder seizoen te herkennen is.
Een regel met het seizoen boven de wedstrijd is er niet meer.
De regel noemt de club zoals Wikipedia hem in die wedstrijd schreef, en onder de lijst staat de legenda van de afkortingen die erin voorkomen (`MatchLegend`).
De scorers komen uit dezelfde bron als bij Uitslagen: `listClubMatches` leest ze met dezelfde hulpfunctie als `listSeasonMatches`.
Staat er een wedstrijd in het programma, dan komt die eerst in dezelfde lijst, de eerstvolgende bovenaan, en daarna de gespeelde wedstrijden; er zijn geen onderkoppen, want een wedstrijd zonder uitslag spreekt voor zich.
Wat komt, bepaalt `programmeOf` in `src/matches.ts`, dezelfde regel als Programma (`upcomingOf` in `src/opponents.ts`), en de keuze voor de competitie telt mee.
Een club die we nog niet speelden maar die een wedstrijd heeft die komt, heeft alleen die wedstrijden in de kaart, geen zijkolom met uitslagen, en alleen de bronvermelding in de zijkolom.
De gespeelde wedstrijden staan tien per pagina, met `Pagination` en `?pagina=` (`meetingsPerPage` in `src/opponents.ts`); de keuze Eredivisie gaat voor `pagina` in het adres.
De komende wedstrijden en de rij "Laatste wedstrijden" staan alleen op de eerste pagina, en een pagina na de laatste is "niet gevonden".
Op een telefoon staat onder de kop de balk "Op deze pagina:" met een link naar elke kaart die er is (`clubShortcutsOf` in `src/opponents.ts`, `app/@shortcuts/tegenstanders/[club]`).
Direct onder de kop staat de rij "Laatste wedstrijden" (een `MarkRow`) met de laatste vijf uitslagen als W, G en V, de oudste links en de nieuwste achteraan.
De rij gebruikt dezelfde wedstrijden als de lijst, dus de keuze Eredivisie verandert hem mee, en bij minder dan vijf gespeelde wedstrijden is er geen rij.
De zijkolom (`Page.Sidebar`, breed, zo breed als de hoofdkolom, zoals op Cijfers) volgt op een telefoon op de hoofdkolom.
Ze heeft acht delen:

- De kaart "Onze uitslagen tegen …" op het zachte vlak met de samenvatting (een `RecordTable` met de rijen Thuis en Uit en eronder Totaal, met het gewicht van het kerngetal, en de kolommen G, W, G, V, P (alleen bij de keuze Eredivisie) en D (het doelsaldo); W, G (gelijk) en V hebben de kleuren van de uitslag, en de woorden van de afkortingen staan onder de tabel), de grootste overwinning en de grootste nederlaag (die twee blijven `ShortMatch`: ze zijn een selectie), de afbeeldingsknop en de zin "Alle 12 gespeelde wedstrijden sinds 2010/11".
- De kaart "Resultaten sinds 2010" op het witte vlak, direct onder de eerste (`ClubTimelineCard` in `src/OpponentViews.tsx`, met het onderdeel `FormTimeline`): hoe het ons verging tegen de club, seizoen na seizoen.
  Het jaar in de kop is het eerste seizoen waarvan we wedstrijden hebben, voor alle clubs samen (nu 2010/11), en schuift mee als er eerdere seizoenen bijkomen (#414).
  De lijn heeft dezelfde tooltip als die van het verloop van het seizoen: het gemiddelde op het dichtstbijzijnde punt.
  Het is dezelfde grafiek als "Verloop van het seizoen" (staafjes van 3 hoog voor winst, 1 voor gelijk en een streepje voor verlies, en een lijn door het gemiddelde), maar de horizontale as volgt de tijd: elk seizoen heeft twee plekken, de eerste en de tweede gespeelde wedstrijd van de Eredivisie tegen de club op datum (`timelineOf` in `src/opponents.ts`), tot en met het seizoen van nu (een seizoen begint op 1 juli).
  Een seizoen zonder wedstrijd tegen de club in de Eredivisie, een wedstrijd die nog moet komen en een derde wedstrijd in een seizoen zijn een lege plek of vallen weg; de beker en de play-offs staan er niet in.
  Onder de as staat een label onder het eerste jaar en daarna elke vijf jaar (10, 15, 20, 25) met de titel "Seizoen".
  Elke gespeelde wedstrijd heeft een punt op de lijn: het gemiddelde aantal punten over die wedstrijd en de wedstrijden ervoor, hoogstens acht, vier seizoenen (`timelineWindow`, `runningAverage` uit het designsysteem).
  De eerste punten van een reeks middelen dus over minder dan acht wedstrijden, en bij een gat stopt de lijn en begint een nieuwe.
  De grafiek is verborgen voor een schermlezer.
  Onder de grafiek staat één alinea met alleen de sleutel (W, G, V uit `tableColumns`) en "Alleen de Eredivisie."
  De kaart volgt de schakelaar niet en heeft geen afbeeldingsknop.
  Hij is er alleen als we minstens 4 wedstrijden in de Eredivisie tegen de club speelden (`hasTimeline` en `timelineMinimum`), zonder zin die zegt waarom.
- De kaart "Hoe vaak welke uitslag" op het warme vlak, onder "Resultaten sinds": dezelfde kaart als op Wedstrijden (`ScoreCountsView` in `src/MatchViews.tsx`, met `countScores` uit `src/matches.ts`), met een donutgrafiek en de tabellen van de uitslagen, met het aantal in de kop ("Winst 8×").
  `ClubScoreCountsCard` in `src/OpponentViews.tsx` geeft hem dezelfde wedstrijden als de samenvatting (`meetingsOf`), dus de aantallen kloppen met de rij Totaal, voor beide keuzes van de schakelaar; een bekerwedstrijd die door strafschoppen werd beslist, telt als winst of als verlies.
  Anders dan op Wedstrijden heeft de kaart naast het eerste diagram een tweede, kleiner donutdiagram (`DonutChart` met `size="small"`) met de doelpunten die we maakten (groen, links) en de tegendoelpunten (rood, rechts) van dezelfde wedstrijden, met het bijschrift "Doelsaldo" erboven en in het gat de doelpunten als "45–31" (`centre`) in een kleinere letter dan het totaal van het eerste diagram.
  De twee staan naast elkaar in een `DonutChart.Group`, ook op een telefoon.
  Het diagram is verborgen voor een schermlezer, die direct na de diagrammen de zin hoort "Doelpunten: 45 gemaakt, 31 tegen.".
  Onder de tabellen van de uitslagen staat een tabel met de competities van de getelde wedstrijden en hun aantal (`competitionCounts`), met de meeste wedstrijden bovenaan en bij gelijk aantal in de volgorde van de site; de schakelaar bepaalt de rijen.
  Onder de kaart staat alleen het aantal wedstrijden, "Alle 12 gespeelde wedstrijden", zonder "sinds" en zonder "in de Eredivisie".
  Een club zonder gespeelde wedstrijd krijgt de kaart niet.
- De kaart "De plek van … en de onze" op het zachte vlak, onder "Hoe vaak welke uitslag" (`ClubPlacesCard` in `src/OpponentViews.tsx`): een tabel met per seizoen waarin we allebei in de Eredivisie speelden onze eindplek en die van de club, de nieuwste eerst.
  Onze plek komt uit `getFinalPlaces`, die van de club uit `listStandingsPlaces`, gekoppeld via de namen van de club (`clubKeysOf` en `clubPlacesOf` in `src/opponents.ts`), dus ook onder een oude naam.
  Het lopende seizoen telt niet mee, de kaart volgt de schakelaar niet en eindigt met "Alleen de Eredivisie"; zonder gemeenschappelijk seizoen is er geen kaart.
- De kaart "Toeschouwers tegen …" op het zachte vlak, met de afbeeldingsknop, na "De plek van … en de onze" en vóór Doelpuntenmakers (`ClubAttendanceCard` in `src/OpponentViews.tsx`, het anker `#toeschouwers`): een staaf (`BarChart`) per thuiswedstrijd tegen de club, van het eerste seizoen naar het laatste, met onder de as het jaar van het eerste seizoen en daarna van elk vijfde (`clubAttendanceOf` in `src/opponents.ts`).
  Eronder staan twee zinnen, "Gemiddeld … toeschouwers per thuiswedstrijd" en "Het meest: …, in het seizoen …", en de regel dat het aantal een schatting is volgens Wikipedia.
  De tabel met het aantal per wedstrijd staat in een uitklapper, zoals op Cijfers; de grafiek is verborgen voor een schermlezer, die de zinnen en de tabel krijgt.
  De telling is die van Cijfers (`attendanceOf` in `src/matches.ts`, nu ook voor `PublicClubMatch`): alleen gespeelde thuiswedstrijden, een onbekend aantal is een lege plek, nul toeschouwers een stompje, en het gemiddelde en het hoogste tellen alleen aantallen boven nul.
  De kaart volgt de schakelaar; zonder een bekend aantal bij een thuiswedstrijd is er geen kaart en geen zin, en dan ook geen link in de balk.
  `listClubMatches` geeft daarvoor `attendance` mee.
- De kaart "Doelpuntenmakers tegen …" op het zachte vlak, met de afbeeldingsknop, onder "Hoe vaak welke uitslag" en boven het stadion (`ClubTopScorersCard` in `src/OpponentViews.tsx`).
  Hij toont de top 5 van de spelers van sc Heerenveen die tegen de club scoorden, met de regel "De top 5 van 12 spelers die scoorden" (of "3 spelers hebben gescoord" als niemand wegvalt), de tabel `TopScorersTable` (spelers met evenveel doelpunten delen een rij) en, bij onvolledige gegevens, "De doelpuntenmakers van X van de Y gespeelde wedstrijden".
  Het is dezelfde telling en dezelfde weergave als de kaart op Spelers: `TopScorers` in `src/MatchViews.tsx` krijgt de teksten die verschillen (het bijschrift met `scope`, in plaats van `season`, de zin zonder doelpuntenmakers met `empty`, en met `topOnly` alleen de eerste vijf plaatsen, ook zonder link naar Spelers) en de hulpfuncties in `src/matches.ts` nemen elk type wedstrijd dat een `ScoredMatch` past, dus ook die van een club.
  De kaart is er alleen als we minstens 5 gespeelde wedstrijden met een uitslag tegen de club hebben, in alle competities samen (`hasClubScorers` en `clubScorersMinimum` in `src/opponents.ts`), ongeacht de schakelaar.
  Bij minder dan 5 is hij er niet, zonder zin die zegt waarom.
  De lijst zelf telt de wedstrijden van de schakelaar, dus bij Eredivisie kan hij korter zijn of leeg, en dan staat er "We hebben geen doelpuntenmakers van deze wedstrijden." in plaats van de tabel.
- De kaart "Nieuws over …" op het zachte vlak, na de kaarten met cijfers en vóór het stadion (`ClubNewsCard` in `src/OpponentViews.tsx`, het anker `#nieuws`): de nieuwste vijf koppen die de club noemen (`clubNewsLimit`), nieuwste eerst, elk als `NewsItem` met de kop als link, de bron en de tijd, en "voor abonnees" bij een betaalmuur.
  Er is geen inleiding, geen foto, geen afbeeldingsknop en geen link naar meer nieuws.
  De koppen komen uit `listClubNews` in `@fansite/db` (`getClubNews` in `src/opponents.ts`, vijf minuten onthouden): de koppen die `listRecentItems` ook zou geven (bronnen die aanstaan, geen podcast, niet verborgen, relevant, niet van na nu), met een rij in `item_clubs` onder een van de namen van de club (`clubNamesOf`: de naam nu, de andere schrijfwijzen, de eigen lijst met namen en de naam in elke wedstrijd), zodat een kop met de oude naam ook telt.
  Een kop die twee clubs noemt, staat bij allebei.
  Zonder kop is er geen kaart en geen zin, ook niet bij een club met alleen wedstrijden die nog komen: dan staat de kaart bovenaan de zijkolom.
  `item_clubs` heeft rijen voor koppen die de importer opsloeg sinds #794, en voor oudere koppen na `pnpm run import:item-clubs`; tot dan toont een club alleen de nieuwere koppen.
- De kaart "Stadion" of "Stadions" op het sterke vlak, met de namen van het stadion van de club in de volgorde waarin we ze zagen (`stadiumsOf` in `src/opponents.ts`, `StadiumsCard` in `src/OpponentViews.tsx`).
  De namen komen uit onze uitwedstrijden in de Eredivisie, want daar is het stadion dat van de club; een bekerwedstrijd of play-off kan op een neutraal veld zijn en telt niet mee.
  Een gestaakte wedstrijd telt voor zijn begin, dus ook daar is het stadion dat van de club.
  Spellingen die alleen verschillen in hoofdletters, spaties of een koppelteken zijn één naam; een twijfelgeval, zoals "Galgenwaard" naast "Stadion Galgenwaard", blijft twee regels.
  Een naam die terugkomt na een andere, staat opnieuw.
  Bij één naam staat alleen de naam; bij meer heeft de eerste "t/m" en het laatste seizoen met die naam ("t/m 2018/19"), een naam in het midden zijn seizoen ("2019/20") of "2019/20 t/m 2021/22" als hij langer duurde, en de laatste "vanaf" en het eerste seizoen met die naam (`stadiumPeriods` in `src/match-format.ts`).
  Het zijn seizoenen van onze wedstrijden, want we bezoeken een club één keer per seizoen en de wedstrijden zeggen niets over de dag dat de naam veranderde.
  Onder de lijst staat geen zin: de bronvermelding onderaan de pagina zegt waar de namen vandaan komen.
  De kop heeft het anker `#stadion` bij beide titels.
  Een club zonder uitwedstrijd in de Eredivisie, of zonder stadion in die wedstrijden, heeft de kaart niet.
  Heeft de redactie een club een eigen lijst gegeven (zie _De stadions van een club_ onder _Het beheer_), dan toont de kaart alleen die lijst, met de periodes uit de starts (`ownStadiumPeriods` in `src/match-format.ts`) en de toelichting onder de naam van haar regel (de prop `note` van `ShortStaff`), en `stadiumViewsOf` in `src/opponents.ts` kiest tussen de twee.
  Een club met een eigen lijst heeft de kaart ook als de wedstrijden geen stadion noemen, en ook met de keuze Eredivisie als we hem alleen in de beker troffen.
  De pagina van een club leest de lijst met de wedstrijden in `getClubPage`, dus een opslag staat er binnen vijf minuten.
- De bronvermelding, die ook voor deze kaart geldt.

Een slug die geen club heeft, een andere waarde van `?competitie=` en een waarde die twee keer staat, geven "niet gevonden".

De pagina's tellen de wedstrijden van alle seizoenen, dus ze hebben geen seizoenskiezer.
Ze volgen de schakelaar tussen alle wedstrijden en de Eredivisie (`CompetitionLinks` in `src/CompetitionSwitch.tsx`, zie _De keuze tussen alle wedstrijden en de Eredivisie_), die er alleen staat als er een gespeelde of komende bekerwedstrijd of een gespeelde play-offwedstrijd is.
Een club die we alleen in de beker of de play-offs troffen, staat bij Eredivisie niet in de lijst, en zijn pagina zegt dat we in de Eredivisie nog niet tegen hem speelden.
De keuze zit in elke link van de lijst.

De code staat in `src/opponents.ts` (de optelling van de wedstrijden en de gecachete lezingen, op de queries van `packages/db`), `src/OpponentViews.tsx` (de kaarten) en `app/tegenstanders` (de twee pagina's).
De cache heeft twee sleutels voor de lijst en per club een sleutel, pas nadat de slug is gecontroleerd tegen de bekende clubs.
De bronvermelding onderaan noemt de pagina's van Wikipedia van alle seizoenen in de cijfers (`listAllWikipediaPages`).
De lijst staat in `src/pages.ts`, dus in de sitemap en de bezoekteller; elke clubpagina staat ook in de sitemap en telt onder zijn eigen adres mee, nadat de database heeft bevestigd dat de club bestaat (`isClubSlug`).
`pnpm test:a11y` gebruikt de verzonnen wedstrijden van de seed: `testdorp-fc` is een club uit de competitie (we speelden er alleen thuis tegen, dus zonder kaart Stadion, en met de kaarten Resultaten sinds en De plek van … en de onze), `voorbeeld-united` een club met twee namen van zijn stadion en `fc-maquette` een club uit de beker.

### De keuze tussen alle wedstrijden en de Eredivisie

Bovenaan de hoofdkolom van `/cijfers` (onder de drie kaarten die hem negeren), `/spelers`, `/tegenstanders` en de pagina van een club staat een schakelaar (`SwitchLinks` in de kleine maat, via `CompetitionSwitch` in `src/CompetitionSwitch.tsx`) met twee links: Alle wedstrijden en Eredivisie.
Alle wedstrijden is de standaard en heeft geen parameter; Eredivisie is `?competitie=eredivisie`.
De keuze zit in het adres en niet in een cookie, dus de schakelaar werkt zonder JavaScript en een keuze is te delen.
Een andere waarde, een lege waarde en een waarde die twee keer staat, geven "niet gevonden" (`parseCompetition` in `src/competition.ts`), ook in de balk "Op deze pagina:", die er dan niet is.
De schakelaar staat er alleen bij een seizoen met een gespeelde bekerwedstrijd of play-offwedstrijd (`hasPlayedExtraMatch`): zonder die zijn de twee keuzes gelijk.
De play-offs voor de Conference League en de Europa League tellen net als de beker alleen bij Alle wedstrijden, en de bijschriften van de kaarten noemen wat meetelt: "de Eredivisie en de play-offs", of met beide "de Eredivisie, de KNVB Beker en de play-offs" (`competitionNames`).
Een eerder seizoen werkt hetzelfde; is zijn beker niet geïmporteerd, dan telt Alle wedstrijden alleen de wedstrijden die er zijn.

De kaarten die de keuze volgen, zijn Reeksen, Thuis en uit, Toeschouwers, Hoe vaak welke uitslag, Doelpuntenmakers (op Spelers), Sinds 1990/91 (op Spelers), Bijzondere doelpunten (op Spelers), De nul gehouden, Doelpunten per kwartier, Uitersten en Opmerkelijk.
De kaarten Onze plek in de competitie, Verloop van het seizoen en Hoe de wedstrijden verlopen blijven de Eredivisie, omdat ze op de stand, de 34 speelrondes en de stand na 90 minuten rusten.
Op Cijfers staan ze bij elkaar boven de schakelaar, en elk heeft als laatste regel "Alleen de Eredivisie" (`EredivisieOnly`), zodat de schakelaar direct boven de eerste kaart staat die hem volgt.
Op de pagina van een club volgt de kaart Resultaten sinds de schakelaar ook niet: hij telt de Eredivisie, omdat de grafiek twee wedstrijden per seizoen kan tonen en een bekerwedstrijd of play-offwedstrijd geen vaste plek in een seizoen heeft.
Een bekerwedstrijd en een play-offwedstrijd tellen met de score na de verlenging.
Een strafschoppenserie telt niet mee in de doelpunten, maar wel in de uitkomst: een wedstrijd die gelijk eindigt en op strafschoppen wordt beslist, is een winst of een verlies.
Doelpunten in de verlenging blijven buiten de tabel van Doelpunten per kwartier, met de zin die dat zegt; de twee regels eronder tellen ze wel.
De hulpfuncties in `src/matches.ts` krijgen de keuze als laatste argument (`CompetitionChoice`); wie het weglaat, krijgt wat de kaart tot nu toe deed.

De keuze blijft bij elke link: de schakelaar zelf, de knop "Laad 5 meer" van De nul gehouden (die een formulier met een verborgen veld is) en de seizoenskiezer, die de keuze als verborgen veld (`fields`) naar de route `kies` stuurt.
`pickedSeasonResponse` stuurt de keuze mee naar het adres van het seizoen (`keepCompetition`) en laat een waarde weg die de pagina niet kent, zodat de kiezer niemand naar "niet gevonden" stuurt.
De balk "Op deze pagina:" heeft alleen verwijzingen naar een plek op dezelfde pagina, dus hij houdt het seizoen en de keuze vanzelf vast.
De balk onder het hoofdmenu houdt het seizoen en de keuze vast (zie _Het hoofdmenu en de balk van Nieuws_).
De items Wedstrijden en Spelers van het menu zelf nemen het seizoen van de pagina mee, maar niet de keuze: die kan het menu niet lezen zonder `useSearchParams`.

De telling zelf gebeurt na het lezen: `getMatchData` bewaart de wedstrijden van een seizoen vijf minuten (of een uur voor een afgelopen seizoen), en de keuze filtert die lijst.
Er is dus geen sleutel per keuze in de cache nodig, en de ene keuze kan de andere niet overschrijven.

## De nieuwspagina

`/nieuws` heet "Nieuws" en toont alle koppen die we hebben opgehaald, nieuwste eerst, 50 per pagina, elk als `NewsItem`, zonder indeling per dag: elke regel heeft zijn eigen dag en tijd (`formatNewsTime`).
De hoofdkolom heeft alleen nieuws: geen wedstrijden en geen discussies.
Het zijn dezelfde koppen als op de homepage, ook met "voor abonnees" bij een kop achter een betaalmuur, maar zonder grens in leeftijd.
Een intro of foto staat er niet, net als op de homepage.
De query is `listArchivePage` in `packages/db/src/queries.ts`, met `countArchiveItems` voor het aantal en `listArchiveSources` voor het filter; beide nemen een lijst slugs als `sources`.
Ze delen met `listRecentItems` de voorwaarden (`newsFilter`): relevant, niet verborgen, van een bron die aanstaat, geen podcast en niet na nu.
De zijbalk heeft drie kaarten, in deze volgorde, ook op een telefoon:

- het filter per bron;
- "Van de redactie": het nieuwste artikel als één nieuwsregel (`NewsItem`, `EditorsCard` in `src/NewsCards.tsx`): de titel als link naar `/redactie/<naam>`, de dag, en "Van de redactie" als bron, zonder pictogram voor een andere site en zonder inleiding.
  Is er geen artikel, dan staat er geen kaart;
- "Podcasts": de nieuwste afleveringen van de laatste 8 dagen, met de link "Alle podcasts" naar `/nieuws/podcasts`.
  Het artikel en de podcasts zijn extra's: lukt het lezen ervan niet, dan staat de kaart er niet en schrijft de site de reden in het logboek.

Het filter staat in een lichtblauwe kaart (`surface="soft"`) in de zijbalk: een formulier met een GET naar `/nieuws`, met een groep selectievakjes (`CheckboxGroup`, een `fieldset` met de `legend` "Bronnen") en de knop "Toon".
Er is een vakje per bron met minstens één kop in het archief, op alfabet, met de `slug` als waarde.
De knop blijft ook met JavaScript, en het formulier werkt zonder.
Zonder vinkje en met alle vinkjes toont de pagina alle koppen, op het adres zonder `bron`: `/nieuws`.
Met één of meer vinkjes (maar niet alle) staan er alleen koppen van die bronnen, op `/nieuws?bron=leeuwarder-courant&bron=nos`, in de volgorde van de lijst.
Met precies één vinkje staat de naam van de bron niet bij elke kop (`showSource` van `NewsItem`), want de kop van de pagina noemt hem al; een schermlezer hoort hem nog wel.
De functies die het adres lezen en maken staan in `src/archive-query.ts`.
Op een smal scherm staat de zijbalk onder de lijst en de paginering, want de zijbalk komt na de hoofdkolom in de bron en het designsysteem laat de volgorde van de bron en van het scherm gelijk.
Zonder bronnen is er geen filter, en zonder artikel en afleveringen geen zijbalk.
De pagina heeft een hoofdkolom van 46 rem, 2 rem ruimte en een zijbalk van 16 rem (`narrow` op `Page.Sidebar`), samen de 64 rem van de pagina.
Zonder zijbalk heeft de hoofdkolom de gewone breedte van 38 rem.
De slug komt uit de kolom `slug` van `sources`, die de seed voor elke bron met koppen vastlegt (`packages/db/src/seed.ts`), dus een andere naam verandert het adres niet.
Een bron zonder slug staat niet in het filter, maar haar koppen staan wel bij alle bronnen.
Onder de lijst staat de paginering (`Pagination`), als er meer dan één pagina is: `/nieuws?pagina=2`, en met bronnen `/nieuws?bron=leeuwarder-courant&bron=nos&pagina=2`.
Een nieuwe kop schuift de inhoud van de pagina's op; de bronnen en het filter blijven vast, en een nieuwe keuze begint op pagina 1.
Een bron die niet in het filter staat, een bron die twee keer in het adres staat en een `pagina` die geen positief geheel getal is of na de laatste komt, geven de pagina "niet gevonden" met status 404.
De titel en de kop noemen de bronnen en de pagina, zoals "Nieuws van NOS en Omrop Fryslân, pagina 3", en elke pagina is zijn eigen canonieke adres.
De server bewaart elke combinatie van bronnen en pagina vijf minuten, maar alleen na de controle van het adres (`src/archive.ts`).
Lukt het lezen niet, dan toont de pagina de foutpagina, zoals `/nieuws/podcasts`.
De pagina is het item Nieuws in het hoofdmenu, met de balk van Nieuws eronder (zie _Het hoofdmenu en de balk van Nieuws_).

`pnpm test:a11y` zet verzonnen koppen op de testbronnen, genoeg voor een tweede pagina (`e2e/headlines.ts`).

## De podcasts

`/nieuws/podcasts` toont de afleveringen van de podcasts die aanstaan, nieuwste eerst, 25 per pagina, elk als `NewsItem`: de titel als link naar de pagina van de aflevering bij de maker, de naam van de podcast en de tijd.
Achter de naam staan de feiten die de feed geeft, als `details` van de `NewsItem`: het seizoen en het nummer, zoals "seizoen 9, aflevering 16" of "aflevering 120", en de duur, zoals "37 min" of "1 uur 12 min" (`episodeDetails` in `src/news.ts`).
Een aflevering van deze week heeft de korte dag en de tijd, zoals "wo 14:05"; een oudere heeft de datum, met het jaar als dat niet dit jaar is, want de lijst gaat jaren terug.
Het filter staat in een lichtblauwe kaart (`surface="soft"`) bovenaan de zijbalk: een formulier met een GET naar `/nieuws/podcasts`, met een groep selectievakjes (`CheckboxGroup`, een `fieldset` met de `legend` "Podcasts") en de knop "Toon".
Er is een vakje per podcast met afleveringen, op alfabet, met de `slug` als waarde, dus een andere naam verandert het adres niet (de kolom `slug` van `sources`).
De knop blijft ook met JavaScript, en het formulier werkt zonder.
Zonder vinkje en met alle vinkjes toont de pagina alle afleveringen, op het adres zonder `podcast`: `/nieuws/podcasts`.
Met één of meer vinkjes (maar niet alle) staan er alleen afleveringen van die podcasts, op `/nieuws/podcasts?podcast=omroep-abe&podcast=radio-camataru`, in de volgorde van de lijst.
De queries nemen de slugs als `podcasts` (`listPodcastEpisodes` en `countPodcastEpisodes` in `packages/db/src/queries.ts`).
De functies die het adres lezen en maken staan in `src/podcasts-query.ts`; ze delen hun werk met `/nieuws` in `src/filter-query.ts`.
Met precies één vinkje staat de naam van de podcast niet bij elke aflevering (`showSource` van `NewsItem`), want de kop van de pagina noemt hem al; een schermlezer hoort hem nog wel.
De titel en de kop noemen de gekozen podcasts, zoals "Podcasts van Omroep Abe en Radio Camataru".
Bij precies één vinkje staat onder de kaart met de vakjes een tweede kaart op een warm vlak (`surface="warm"`), met de kop "Over Omroep Abe", de beschrijving van de podcast uit het register (`sources.description`, de tekst van de maker uit zijn feed, dezelfde als op Onze bronnen), en daarna "Luister ook op" met een lijst met een tekstlink per adres dat de podcast heeft.
Heeft de podcast geen adressen, dan staat de beschrijving er alleen.
Bij geen vinkje en bij meer dan één vinkje staat er geen kaart "Over".
Op een smal scherm staat de zijbalk onder de lijst, zoals bij de andere pagina's.
Zonder afleveringen is er geen filter en geen zijbalk.
Onder de lijst staat de paginering (`Pagination`), als er meer dan één pagina is: `/nieuws/podcasts?pagina=2`, en met podcasts `/nieuws/podcasts?podcast=omroep-abe&podcast=radio-camataru&pagina=2`.
Een podcast die niet in het filter staat, een podcast die twee keer in het adres staat en een `pagina` die geen positief geheel getal is of na de laatste komt, geven de pagina "niet gevonden" met status 404.
Een parameter die de pagina niet kent, telt niet mee.
De server bewaart elke combinatie van podcasts en pagina vijf minuten, maar alleen na de controle van het adres, zodat een bezoeker de cache niet kan vullen met adressen van zichzelf (`src/podcasts.ts`).
Lukt het lezen niet, dan toont de pagina de foutpagina, zoals `/bronnen`.
De pagina laadt niets van een podcastplatform: alleen de links gaan erheen.

`pnpm test:a11y` zet verzonnen afleveringen op de testpodcasts van de seed, genoeg voor een tweede pagina (`e2e/episodes.ts`).

## Zoeken

`/nieuws/zoeken` zoekt in wat we zelf bewaren: de titels van de berichten en de podcastafleveringen die de site toont (`relevance` is `relevant`, niet verborgen, van een bron die aanstaat) en de titel en de inleiding van de gepubliceerde artikelen van de redactie.
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
Het is een gewoon `GET`-formulier naar `/nieuws/zoeken?q=…`, dus de pagina werkt zonder JavaScript en het adres is te delen.
De resultaten staan met de nieuwste bovenaan, tien eerst, en de knop "Laad 5 meer" laadt de pagina opnieuw met `?aantal=15`, in stappen van vijf en tot 100.
Daarna staat er een zin dat dit de nieuwste zijn.
De site bewaart een zoekvraag zelf nergens: er staat geen cookie, geen lijst van gezochte woorden en geen adres van de bezoeker bij.
De logbestanden van de hosting hebben wel het hele adres van een pagina, dus ook `?q=`, zoals van elke pagina.
De teller van het bezoek telt `/nieuws/zoeken` zonder de vraag (`src/visits.ts`), en een fout in het logboek noemt de reden en niet de vraag.
De pagina is `noindex`, ook met een vraag, en staat niet in de sitemap.

De lijst met spelers staat in de zijbalk, na de resultaten in de bron, dus op een smal scherm onder de resultaten en zonder vraag direct onder het formulier.
Ze komt uit `players` van het lopende seizoen (`listSquad`), gegroepeerd per positie, en elke naam (`PlayerName`, met de voor- en achternaam van de persoon van de speler en de achternaam halfvet) is een link naar `/nieuws/zoeken?q=<achternaam>`.
Zijn er geen spelers, dan laat de pagina de lijst weg.
Onder de lijst staat de bronvermelding van de selectie (`WikipediaCredit`), met de pagina uit `wikipedia_pages` met `kind` `squad` (`findSquadPage`).
`listSquad` is de ene plek die bepaalt wie in de lijst staat, en geeft alleen de spelers die in de selectie staan (`in_squad`): een speler die vertrok, blijft in `players` voor zijn doelpunten.
De server bewaart de lijst vijf minuten, een zoekopdracht niet.

`pnpm test:a11y` toetst `/nieuws/zoeken` zonder vraag, met een vraag, met meer dan tien resultaten, zonder resultaten en met een vraag die niet mag.
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

`sendMail` verstuurt een mail in platte tekst via de mailserver van de hosting, met TLS.
De code staat in `@fansite/shared` (`packages/shared/src/mail.ts`), zodat de importer er ook mee mailt; `src/mail.ts` geeft hem door.
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

Het cookie van het beheer is `Secure`, behalve in de ontwikkelserver (`pnpm --filter site dev` en `pnpm review`).
Daar werkt het beheer lokaal in elke browser, ook in Safari, dat een `Secure`-cookie niet bewaart op `http://localhost`.
Een gebouwde site (`pnpm build`, acceptatie en productie) zet het cookie altijd met `Secure`.

Het hoofdmenu toont het item Beheer voor wie ingelogd is.
De publieke pagina's zijn voor elke bezoeker hetzelfde en het cookie van het beheer gaat er nooit heen, dus de server weet daar niet wie ingelogd is.
Daarom bewaart de browser van wie het beheer opent een teken in `localStorage`, onder de sleutel `fansite-beheer`, zoals de themakeuze onder `fansite-theme`:

- `src/app/beheer/layout.tsx` controleert bij elke aanvraag onder `/beheer` de sessie op de server en geeft het antwoord aan `AdminMarker` (`src/AdminMarker.tsx`).
  Dat zet het teken bij een geldige sessie en haalt het weg bij een ongeldige.
  De inlogpagina haalt het zelf ook weg, voor een sessie die verloopt terwijl de redacteur in het beheer bladert: de layout wordt dan niet opnieuw gevraagd.
- `SiteNavigation` leest het teken met `useSyncExternalStore` (`src/admin-marker.ts`), met `false` op de server en bij het hydrateren.
  De HTML van de server heeft het item dus nooit, en de browser voegt het toe zodra de pagina geladen is.
  Zonder JavaScript is er geen item.
- Het teken bevat geen geheim en geen gegevens, en gaat nergens heen.
  Wie het zelf maakt, ziet een koppeling naar `/beheer` en komt bij de inlogpagina uit.
- De rooktest controleert dat het HTML van geen enkele publieke pagina naar het beheer verwijst.

Het formulier van een wedstrijdverslag bewaart zijn invoer ook in `localStorage`, onder de sleutel `fansite-verslag-<id van de wedstrijd>` (`src/beheer/report-draft.ts`), zodat een opslag die mislukt niets kost.
Bij het verlaten van een veld staan de waarden van het formulier en het moment van bewaren erin, en niets meer.
De sleutel gaat weg na een geslaagde opslag (`ReportDraftNotice`, op de pagina met `?gedaan=`, één keer per opslag dankzij `fansite-verslag-<id>-opgeslagen`), bij uitloggen (`AdminMarker` met `loggedOut`, op de inlogpagina na `?uitgelogd=1`) en na dertig dagen.
Een sessie die verloopt haalt hem niet weg: daar is hij voor.

- `requireRole` in `src/beheer/require-role.ts` is de ene controle van het beheer.
  Elke pagina, route en serveractie onder `/beheer` roept hem als eerste aan, behalve de pagina's en acties om in te loggen.
  `src/beheer/routes.test.ts` zoekt ze zelf op in de mappen (en elk bestand met `'use server'`, waar ook), en laat zien dat een aanroep zonder sessie naar de inlogpagina gaat.
  Een nieuwe pagina of actie die `requireRole` niet aanroept, laat die test falen.
  Staat een nieuwe pagina bedoeld open, dan noem je haar in `open` in die test.
- `/beheer` is de startpagina: wie is ingelogd (het adres en de rol), een tegel (`Tile` van het designsysteem) voor elk scherm van die rol in de hoofdkolom.
  Onder het hoofdmenu staat op elke pagina onder `/beheer` (behalve de inlogpagina's) de balk met de schermen van de rol: `NavigationBar` van het designsysteem, met een `label`, getekend door `AdminBar` in het slot `@shortcuts` (`app/@shortcuts/beheer`).
  De knop Uitloggen is het laatste item van die balk (de prop `end`): een knop in een formulier met de serveractie `logOut`, dus een POST die ook zonder JavaScript werkt.
  Op een bureaublad staat hij rechts in de balk; op een telefoon schuift hij mee met de schermen.
  De kaart "Te doen" staat in de zijbalk (`Page.Sidebar`) en er alleen als er iets wacht: afwijkingen van Wikipedia op een besluit, vastgehouden wijzigingen van Wikipedia op een besluit (`countHeldChanges`), wedstrijden zonder uitslag in het lopende seizoen (`countMatchesWithoutResult`) en verslagen die klaar waren en niet meer kloppen (`countReportsToCheck`, alleen verslagen die een redacteur opsloeg), elk een koppeling naar de lijst.
  Een volgend scherm voegt een regel toe door een item aan `todo` in `src/app/beheer/page.tsx` toe te voegen.
  Op een telefoon staat de kaart onder de tegels, want `Page` zet de zijbalk in de volgorde van de bron na de hoofdkolom.
- `/beheer/berichten` is de eerste beheerpagina: de 50 nieuwste berichten van alle bronnen die op de site staan of die er niet op staan, met bron, kop als link, tijd en wie een bericht verborg (zie _Berichten verbergen_).
- `/beheer/artikelen` is voor beheerders alleen: de artikelen van de redactie schrijven, bekijken, publiceren en intrekken (zie _Artikelen schrijven_).
- `/beheer/wedstrijden` is voor beheerders alleen: een wedstrijd van het lopende seizoen invullen of verbeteren (zie _Wedstrijden invullen_).
- `/beheer/spelers` is voor beheerders alleen: een speler toevoegen aan de selectie van een seizoen, of er een aanpassen (zie _De spelers van een seizoen_).
- `/beheer/stadions` is voor beheerders alleen: een club een eigen lijst van stadions geven, met een toelichting voor de kaart op zijn pagina (zie _De stadions van een club_).
- `/beheer/clubnamen` is voor beheerders alleen: bijhouden welke namen een club droeg en sinds wanneer, met een toelichting (zie _De namen van een club_).
- `/beheer/kwaliteit` is voor beheerders alleen: wat we van elk seizoen weten en wat ontbreekt, met werklijsten (zie _De kwaliteit van de gegevens_).
- `/beheer/bezoek` is voor beheerders alleen: de cijfers over het bezoek van de laatste dagen (zie _Het bezoek bekijken_).
- Het beheer is compact: kleinere letters en kortere afstanden dan de publieke pagina's.
  Elke pagina onder `/beheer` zet de klasse `compact` uit `src/beheer/density.ts` op zijn `Page.Main`, en `src/beheer/density.test.ts` zoekt de pagina's zelf op en faalt voor een pagina die haar vergeet (zie _Dichtheid_ in Storybook).
- De proxy (`src/proxy.ts`) geeft elk antwoord onder `/beheer` de headers `X-Robots-Tag: noindex, nofollow`, `Cache-Control: no-store` en `Referrer-Policy: same-origin`, op elke omgeving.
  De proxy is geen toegangscontrole.
- De proxy telt ook de bezoeken (`src/visits.ts`): per dag de paginaweergaven per pagina en het aantal unieke bezoekers, zonder cookie, script of opslag in de browser.
  Hij doet dat na het antwoord, dus een pagina wacht er niet op, en ook als de pagina uit een cache komt.
  Zie _We tellen paginaweergaven en unieke bezoekers per dag_ in `docs/beslissingen/redactie.md`.
  Kijk de tellers in phpMyAdmin na met `SELECT * FROM page_views ORDER BY day DESC, views DESC` en `SELECT * FROM daily_visitors`.
  Lokaal stuurt `next dev` het adres van je eigen computer mee, dat niet telt als bezoeker: je ziet dan wel weergaven en geen bezoekers.
- Een inloglink, een sessie en een teller van pogingen staan in de database (`admin_login_links`, `admin_sessions`, `admin_login_attempts`).
  Van een link en een sessie bewaart de tabel alleen de SHA-256 van de token.
  De teller bewaart de SHA-256 van het adres en de tijd, en geen IP-adres.

### Berichten verbergen

`/beheer/berichten` (`src/app/beheer/berichten`) is voor beheerders en moderators.
Boven de lijst staat een schakelaar met twee keuzes: "Op de site" en "Niet op de site" (`SwitchLinks`, zoals `CompetitionSwitch`).
Het zijn gewone links, dus hij werkt zonder JavaScript, en de huidige keuze heeft `aria-current="page"`.
Met JavaScript wisselt een gewone klik de pagina zonder haar opnieuw te laden (zie _Schakelaars die in de pagina wisselen_).
"Op de site" is de standaard en heeft niets in het adres, "Niet op de site" is `?toon=niet-op-de-site`, en een andere waarde valt terug op de standaard.
Wat "op de site" is, zegt `isOnSite` in `src/beheer/items.ts`: niet verborgen, door de import `relevant` gevonden of door een moderator op de site gezet (zie _Een bericht op de site zetten_), en al gepubliceerd.
`isShown` in `@fansite/db/queries` is strenger voor de bezoeker (een bron die uitstaat, en een verhaal dat de site samenvouwt), dus een bericht dat hier "op de site" staat, kan voor een bezoeker ontbreken.
De lijst toont per groep de berichten van de nieuwste eerst, 50 op een pagina, met `Pagination` en `?pagina=<nummer>` in het adres (`listItems` en `countItems`).
Groep, zoekopdracht en het vakje blijven bij het bladeren staan, een pagina ver voorbij de laatste toont de laatste, en de tekst erboven zegt hoeveel berichten het er zijn en welke pagina je ziet.
Onder de schakelaar staat een zoekveld: een formulier met `method="get"` dat `?q=` vult en op een deel van de kop of van de link zoekt, zonder letters- of hoofdlettergevoeligheid en zonder dat `%` of `_` een patroon zijn (`listItems`).
Onder "Niet op de site" staat daarin ook het vakje "Alleen door de redactie verborgen" (`?redactie=1`), dat alleen de berichten toont die een redacteur verborg; zonder het vakje staan er ook de twijfelgevallen en de berichten die niet over de club gaan.
De knop "Zoeken" past de zoekopdracht en het vakje samen toe, en de knop stuurt de groep mee (`name="toon"` op de knop, want het designsysteem heeft geen verborgen veld).
Bij elk bericht dat op de site kan staan staat een regel met de lijst "Reden", het veld "Toelichting" en de knop "Verberg" (`HideForm`; de regel breekt pas waar geen ruimte is); een bericht dat de import niet op de site zet, heeft geen formulier, want verbergen doet daar niets.
Bij een verborgen bericht staat wie het verborg ("Verborgen op … door …"), de reden en de knop "Toon weer".
Alle formulieren zijn gewone posts van een serveractie (`actions.ts`), dus ze werken zonder JavaScript.

- De reden is een keuze uit de lijst van `hideReasons` in `src/beheer/hide-reasons.ts`, of "Anders" met een tekst van hoogstens 300 tekens.
  Het veld "Toelichting" staat verborgen tot "Anders" gekozen is, en dat vraagt JavaScript; de vaste redenen werken er ook zonder.
  Een vaste reden bewaart haar tekst in `hidden_reason`.
  Geen keuze, "Anders" zonder tekst of een tekst die te lang is laat het bericht staan en brengt je terug op de lijst, met de fout in een `ErrorSummary` bovenaan en bij het veld (`?fout=reden-kies`, `reden-anders` of `reden-lang`, met `&bericht=<nummer>`, en `&keuze=anders` om "Anders" gekozen te laten).
- Verbergen en tonen eindigen op dezelfde groep, hetzelfde vakje en dezelfde zoekopdracht als waar je vandaan kwam (`itemsPath` in `paths.ts`), dus het bericht staat daarna in de andere groep.
- Na het verbergen of tonen staat bovenaan wat er gebeurde: "Staat binnen vijf minuten niet meer op de site" of "weer op de site".
  Dat is waar, want de homepage, `/nieuws` en `/nieuws/podcasts` bewaren hun lijsten vijf minuten in het geheugen van de server; `src/headlines-hidden.test.ts` bewijst het tegen een echte database.
  De melding komt uit de database van dat moment, niet uit het adres: `?verborgen=<nummer>` zegt alleen iets over een bericht dat echt verborgen is.
- Verbergen en tonen schrijven allebei één regel in het logboek `audit_log`, in dezelfde transactie, via `recordAction` (`packages/db/src/audit-log.ts`, die `src/beheer/audit-log.ts` doorgeeft).
  Daar staat het nummer van het account, de tijd, de actie, het nummer van het bericht en de reden: geen e-mailadres en niets anders van het verzoek.
- De pagina gebruikt `NewsItem`, `Form`, `Field` en de andere componenten van het designsysteem, en heeft geen eigen component.

#### Een bericht op de site zetten

Een bericht dat de import een twijfelgeval of "niet over de club" noemde, kan een moderator op de site zetten.
Dat staat in de kolommen `approved_at` en `approved_by` van `items`, niet in `relevance`: de import beoordeelt elk bericht bij elke run opnieuw, en een goedkeuring in `relevance` zou verdwijnen.
De import raakt die twee kolommen nooit aan, en een test in `apps/importer/src/import-feeds.test.ts` houdt dat vast.
Een bericht staat op de site als het niet verborgen is en `relevant` of goedgekeurd: verbergen wint van goedkeuren (`isShown` en `isOnSite`).

- Een bericht met `doubtful` of `irrelevant` en zonder goedkeuring heeft de knop "Op de site zetten" ("Op de site zetten: <kop>" voor een schermlezer), zonder reden.
- Een goedgekeurd bericht staat in de groep "Op de site", zegt "door een moderator op de site gezet" met het adres van wie en wanneer, en heeft de knop "Terug naar het oordeel van het filter".
  Die maakt `approved_at` en `approved_by` leeg, en het bericht is weer wat het filter zei.
- De acties zijn `approveItem` en `unapproveItem` in `src/beheer/items.ts`, met dezelfde uitkomsten als verbergen: `done`, `unchanged` (al zo, of door de import `relevant` gevonden) en `missing`.
  Elke actie schrijft in één transactie met de wijziging een regel in het logboek: `item.approve` of `item.unapprove`.
- Na de actie staat bovenaan "Op de site gezet" of "Terug naar het oordeel van het filter", uit de database van dat moment (`?opgenomen=<nummer>` en `?teruggezet=<nummer>`).
- `e2e/relevance.spec.ts` zet een verzonnen twijfelgeval op de site en haalt het terug.

Lokaal zie je de pagina na `pnpm run import` (of met `pnpm --filter site test-data`) en een login, zoals hierboven.

### Artikelen schrijven

`/beheer/artikelen` (`src/app/beheer/artikelen`) is alleen voor beheerders: een moderator krijgt "niet gevonden".
De lijst toont alle artikelen, het laatst geschreven bovenaan, met "Nieuw artikel" als formulier met `method="get"`.
Het formulier (`ArticleForm.tsx`) is een client-component met `useActionState` die een fout met de ingevulde waarden terugstuurt.
De tekst schrijf je met `RichTextEditor` uit het designsysteem (`@fansite/design-system/rich-text-editor`), die JavaScript vraagt; alleen de pagina's met het formulier laden Tiptap.
De editor zet de tekst als Tiptap's JSON in een verborgen veld.
Dat kan niet via het adres zoals bij de berichten, want een tekst van 20.000 tekens past er niet in.
De fouten staan in een `ErrorSummary` en bij het veld, en met JavaScript krijgt het blok de focus.
"Opslaan" is de eerste knop, dus Enter bewaart; "Publiceren" slaat op wat op het scherm staat en publiceert het in dezelfde transactie.

- `src/beheer/article-form.ts` leest en controleert wat het formulier stuurt, altijd opnieuw op de server.
  De tekst gaat door `readArticleDocument` uit `@fansite/shared/article-document`, die alleen alinea's, koppen van niveau 2, lijsten, vet, cursief en links toelaat, en het adres van een link beperkt tot `https://` of `/`.
  `ArticleText` maakt van die JSON componenten; er is geen HTML en geen `dangerouslySetInnerHTML`.
  `src/beheer/articles.ts` maakt, bewaart, publiceert en trekt in, elk in één transactie met de regel in het logboek (`article.create`, `article.update`, `article.publish`, `article.unpublish`).
  Een wijziging zonder verschil en een tweede klik schrijven niets.
- Het voorbeeld (`/beheer/artikelen/<nummer>/voorbeeld`) gebruikt `Article` en `ArticleText`, net als de pagina voor bezoekers.
  Het valt onder `/beheer`, dus het krijgt `noindex` en `no-store` van de proxy.
- Een wijziging van de tekst voegt in dezelfde transactie een versie toe (`src/beheer/article-versions.ts`), en elke wijziging zet `updated_by`.
  Onder het formulier staat de lijst "Eerdere versies", en `/beheer/artikelen/<nummer>/versies/<versienummer>` toont een versie met dezelfde onderdelen als het voorbeeld.
  Er is geen knop om terug te zetten of te verwijderen.
- De opmaak en de werkwijze voor wie schrijft, staan in [`docs/artikelen.md`](../../docs/artikelen.md).

### Wedstrijden invullen

`/beheer/wedstrijden` (`src/app/beheer/wedstrijden`) is alleen voor beheerders: een moderator krijgt "niet gevonden".
De lijst is één tabel van de wedstrijden van een seizoen, met de wedstrijd als enige koppeling in een rij, de uitslag en de status in woorden, en een label voor wat de redactie moet zien: "Uitslag ontbreekt", "Aangepast" en "Wikipedia wijkt af".
Een filter met de aantallen kiest wat de lijst toont: `?tonen=alles`, `?tonen=aangepast` en, zonder zoekopdracht, de wedstrijden zonder uitslag (twee uur na de aftrap, zoals `lacksResult`), met de wedstrijden zonder uitslag eerst bij "Alles".
Het zijn gewone koppelingen, dus het werkt zonder JavaScript.
Wachten er afwijkingen van Wikipedia op een besluit, dan zegt de kaart "Te doen" op de startpagina van het beheer het aantal, en de koppeling erbij gaat naar `?tonen=aangepast` van het lopende seizoen, of van het nieuwste seizoen dat er heeft (`countWaitingDifferences` in `src/beheer/match-entries.ts`).
Een wijziging van Wikipedia die de importer vasthoudt, omdat ze verdacht lijkt (een rij in `match_changes` met de status `pending` en zonder `part`), heeft een eigen keuze `?tonen=wikipedia-wacht` ("Wikipedia wacht (n)") en een eigen regel op de kaart "Te doen", met een koppeling naar het lopende seizoen of het nieuwste seizoen dat er een heeft (`countHeldChanges`).
De pagina van de wedstrijd heeft per vastgehouden wijziging een kaart, met wat de site heeft en wat Wikipedia zegt (`describeHeldChange` in `src/beheer/held-changes.ts`, uit het voorstel van de import), waarom ze wacht (`explainHold`, de Nederlandse tekst bij de Engelse reden van de import), wat er zonder besluit gebeurt (`describeWithoutDecision`), een koppeling naar de pagina van het seizoen op Wikipedia en het formulier `HeldChangeForm`: "Neem Wikipedia over" en "Wijs af", met een verplichte reden.
De actie `submitHeldChange` roept `decideChange` van `@fansite/db/match-changes` aan, dezelfde code als de opdracht `pnpm run import:changes` van de importer.
De controles zetten er een verzonnen wijziging voor in `e2e/held-changes.ts`.
De tegel Wedstrijden wijst altijd naar de lijst zoals die opent.
`?seizoen=2025-26` kiest een ouder seizoen, en een seizoen zonder wedstrijden valt terug op het huidige.
De pagina van een wedstrijd (`/beheer/wedstrijden/<nummer>`) is de brede pagina met een zijbalk: de kaarten van het formulier staan in de hoofdkolom (`MatchFields` in `MatchForm.tsx`) en het blok om op te slaan, de laatste invoer en het uitklapblok "Invoer weghalen" in de zijbalk, die op een brede pagina in beeld blijft.
De velden van het blok om op te slaan horen bij het formulier met het attribuut `form`, en `MatchFormProvider` deelt de toestand van het formulier met de drie delen.
Wat een redacteur ziet en verwacht, staat in [`docs/wedstrijden-invullen.md`](../../docs/wedstrijden-invullen.md); de import is beschreven in de [README van de importer](../importer/README.md).

- Het formulier is een client-component met `useActionState`, en een gewone post die zonder JavaScript werkt.
  Een doelpunt toevoegen of weghalen is een knop van hetzelfde formulier, die de server beantwoordt met de waarden bewaard en de focus op het goede veld.
  De eerste knop is een verborgen "Opslaan", zodat Enter opslaat.
- `src/beheer/match-form.ts` leest en controleert wat het formulier stuurt, altijd opnieuw op de server, met dezelfde regels als de checks van `matches` en `match_goals` en de eis dat de doelpunten samen de uitslag geven (een uitslag zonder doelpunten mag).
  `src/beheer/match-entries.ts` schrijft de invoer in `matches` en `match_goals`, zet de markering in `match_edits` met de wedstrijd van vóór de eerste invoer, en schrijft `match.edit` of `match.undo` in het logboek, alles in één transactie.
- Elke invoer en elk weghalen vraagt een reden.
  Een invoer zonder verschil, en "weghalen" zonder invoer, schrijven niets.
- Een wijziging van Wikipedia die voor de wedstrijd wachtte in `match_changes`, vervalt bij een invoer.
- Zolang minstens één wedstrijd een markering heeft, zetten de pagina's met de volledige bronvermelding (`SourceCredit`, `OpponentsCredit`) onder die bronvermelding de zin "Enkele gegevens heeft onze redactie zelf ingevuld of aangepast." (`edited` van `WikipediaCredit`).
  De vlag komt uit `hasEditedMatches` en is zo vers als de gegevens van het seizoen.

### Het verslag van een wedstrijd invullen

`/beheer/wedstrijden/<nummer>/verslag` (`src/app/beheer/wedstrijden/[id]/verslag`) is het scherm voor het verslag van een gespeelde wedstrijd, of van een wedstrijd die nog wordt gespeeld (`scheduled`, vanaf zijn dag): de bron en de status, en voor sc Heerenveen en de tegenstander de opstelling en de bank, de wissels, de doelpunten, de kaarten en de gemiste strafschoppen, en bij een wedstrijd met een uitslag van de strafschoppenserie ook de schoten van de serie.
Een wedstrijd die niet bestaat, van een latere dag is, uitgesteld of afgelast is, geeft "niet gevonden".
Bij een wedstrijd die nog wordt gespeeld staat in de zijbalk de knop "Wedstrijd afgelopen", die naar `/beheer/wedstrijden/<nummer>/verslag/afgelopen` gaat: daar bevestigt de redactie de stand uit de doelpunten van het verslag (`finishMatch`), de wedstrijd krijgt zijn uitslag en wordt `played`, en het verslag blijft `bezig`.
De lijst met wedstrijden heeft een kolom Verslag (Leeg, Bezig, Klaar of Controleer), en de pagina van een wedstrijd linkt naar het scherm.
`/beheer/wedstrijden/<nummer>/verslag/live` (`src/app/beheer/wedstrijden/[id]/verslag/live`) is het snelle scherm om het verslag bij te houden vanaf een telefoon: een formulier voor een doelpunt, een kaart en een wissel.
Blessuretijd staat naast Minuut en is er met JavaScript alleen bij 45, 90, 105 en 120 (`MomentFields` in `LiveForms.tsx`); zonder JavaScript is het altijd zichtbaar.
Een tweede gele kaart voor een speler wordt `geel-rood` (`addLiveEvent`).
De balk "Op deze pagina:" staat in de slot `@shortcuts` (`src/app/@shortcuts/beheer/wedstrijden/[id]/verslag/live`).
Elk formulier slaat meteen op (`addLiveEvent`, een transactie met een slot op de wedstrijd).
Onder de formulieren staan de stand en de gebeurtenissen met "Haal weg" (`removeLiveEvent`).
Het volledige formulier draagt `reportBasis` mee en weigert te bewaren als het verslag veranderde sinds het werd geopend.

- Het scherm is een gewone post, zoals het formulier van de wedstrijd, en werkt zonder JavaScript.
  Elke lijst is een `InputTable` met een knop om een rij toe te voegen en een knop per rij om hem weg te halen.
  `ReportForm.tsx` heeft de onderdelen (`ReportFormProvider`, `ReportErrorSummary`, `ReportFields` en `ReportSavePanel`), net als `MatchForm.tsx`.
  Met JavaScript volgen de keuzelijsten met spelers de opstelling zoals ze getypt is.
- `src/beheer/report-fields.ts` heeft wat de browser ook laadt: de namen van de velden, het lezen van het verzoek en wat een knop met de rijen doet.
  Een veld heet `<soort>-<kant>-<nummer>-<veld>`, zoals `wissel-wij-2-minuut`.
- `src/beheer/report-form.ts` controleert wat het formulier stuurt, altijd opnieuw op de server (`checkReportForm`).
  Eerst de eisen van de database, dan de regels van `@fansite/shared/match-report`, met elke fout bij het veld van de rij waar ze over gaat.
  Een verslag dat de database niet kan bewaren, wordt niet bewaard; een verslag dat alleen de regels niet goedkeuren, kan als `bezig` worden bewaard, en als `klaar` niet.
- `src/beheer/match-reports.ts` leest het scherm (`findReportScreen`), zet een bewaard verslag terug in een formulier (`valuesOfReport`), slaat op (`saveReport`) en haalt weg (`removeReport`).
  Opslaan schrijft het verslag, de spelers, de gebeurtenissen en de doelpunten met `appearance_id`, de markering `goals_edited` en een regel `match.edit` in één transactie.
  Een opslag zonder verschil schrijft niets.
- De lijst Strafschoppenserie (`serie`, een rij per schot: speler en uitkomst) staat alleen op het scherm als de wedstrijd een uitslag van de serie heeft, of als het verslag al schoten heeft.
  Anders zegt een kaart waar je de uitslag invult: in het formulier van de wedstrijd.
  De ronde van een schot volgt uit de volgorde van de rijen van een team, en een rij zonder speler en zonder uitkomst telt niet mee.
  De regels van het verslag controleren de schoten tegen de uitslag van de serie; wat ze zeggen, staat bij het veld van het schot of bij de lijst.
  Het voorbeeld toont de serie voordat ze is opgeslagen.
  Tekst plakken leest geen serie: `keepShootout` laat de schoten van het opgeslagen verslag staan, bij dezelfde spelers (op rugnummer).
- Heeft een wedstrijd een verslag, dan toont het formulier van de wedstrijd de doelpunten als tekst met een link naar het verslag, en bewaart het de doelpunten zoals ze zijn (`storedEntryGoals`).
- Elk team heeft in het formulier een formatie (`formatie-wij` en `formatie-zij`): een keuzelijst met de gebruikelijke formaties (`formationChoices`), "Geen formatie" en "Anders", en een tekstveld voor een eigen formatie (`formatie-wij-eigen`) dat alleen bij "Anders" telt.
  `formationProblem` uit `@fansite/shared/match-report` keurt de tekst; `formationValueOf` zet een bewaarde formatie terug als keuze of als "Anders" met zijn tekst.
  De formatie staat in `match_reports` en op de pagina van de wedstrijd bij de naam van het team boven het veld (`MatchPitch`).
  Een formatie die de import van de oude fansite afleidde en de redactie niet opsloeg (bron `Oude fansite`, `saved_by` leeg), krijgt onder het veld één zin die zegt dat ze is afgeleid en kan afwijken (`formationOursDerived`).
- `/beheer/wedstrijden/<nummer>/verslag/plakken` (`src/app/beheer/wedstrijden/[id]/verslag/plakken`) leest een tekst in een eenvoudig formaat in de waarden van dit formulier.
  `readPastedReport` in `src/beheer/report-paste.ts` heeft geen database en geeft de waarden, wat het las, de keuzes bij een twijfel en de regels die het niet las.
  `submitPaste` schrijft niets, ook niet in het logboek, als het de tekst leest: het geeft het formulier terug (`PasteScreen`).
  Een post van dat formulier gaat naar dezelfde actie, die `submitReport` aanroept: dezelfde controle en dezelfde plek om te bewaren.
  Staat er al een verslag, dan vraagt het scherm eerst of het formulier vervangen mag.
  Het werkt zonder JavaScript: de tekst en daarna het formulier zijn gewone posts naar dezelfde actie, met één `useActionState` voor het hele scherm.

### De stadions van een club

`/beheer/stadions` (`src/app/beheer/stadions`) is alleen voor beheerders: een moderator krijgt "niet gevonden".
De kaart op de pagina van een club toont wat de wedstrijden zeggen over zijn stadion (zie _De tegenstanders_).
Hier geeft de redactie een club een eigen lijst van namen, met een start en een toelichting, voor een stadion dat de wedstrijden niet goed vertellen, zoals AZ dat in 2019 een half jaar in Den Haag speelde.

- De lijst heeft alle clubs waartegen we wedstrijden hebben, met het label "Eigen lijst" bij clubs die er een hebben, het filter Alles of Eigen lijst en zoeken op een deel van de naam.
  Het zoeken is een formulier met `GET`, dus het werkt zonder JavaScript (`searchClubs` in `src/beheer/stadiums.ts`).
- `/beheer/stadions/<club>` is de brede pagina met een zijbalk, zoals een wedstrijd.
  De hoofdkolom heeft het formulier (`StadiumForm.tsx`): een regel per naam met de naam, het seizoen of de dag waarmee hij begint, en een toelichting.
  Een naam begint met een seizoen (`2019/20`, telt als 1 juli van dat jaar) of met een dag, niet met allebei, en alleen de eerste naam mag zonder start; de starts lopen op, en de naam ervoor eindigt waar de volgende begint.
  De toelichting is gewone tekst van hoogstens 200 tekens, in eigen woorden, en noemt de bron als die niet Wikipedia is.
- De zijbalk heeft "Opslaan", wat de wedstrijden zeggen met de knop "Overnemen", en het uitklapblok "Terug naar Wikipedia".
  "Overnemen" vult het formulier met die namen en seizoenen, en slaat niets op.
  "Terug naar Wikipedia" haalt de hele lijst van de club weg, ook de toelichtingen, en vraagt eerst een bevestiging zoals "Invoer weghalen" bij een wedstrijd.
- Het formulier is een client-component met `useActionState`, en een gewone post die zonder JavaScript werkt.
  Een regel toevoegen of weghalen en "Overnemen" zijn knoppen van hetzelfde formulier, die de server beantwoordt met de waarden bewaard en de focus op het goede veld; de eerste knop is een verborgen "Opslaan", zodat Enter opslaat.
  De knoppen in de zijbalk horen bij het formulier met het attribuut `form`.
- `src/beheer/stadium-form.ts` leest en controleert wat het formulier stuurt, altijd opnieuw op de server, met een zin bij elk veld (lengte, vorm van een seizoen, een dag die bestaat, oplopende starts).
  `replaceClubStadiums` en `removeClubStadiums` uit `@fansite/db/club-stadiums` schrijven de lijst en `stadium.save` of `stadium.reset` in het logboek, in één transactie, met het nummer van de club en de aantallen en zonder de tekst van een toelichting.
- Een opslag staat binnen vijf minuten op de pagina van de club: dat is de tijd die `getClubPage` zijn gegevens bewaart.
- `e2e/stadiums.ts` geeft SV Proefdorp een verzonnen lijst met een toelichting, voor `pnpm test:a11y` en `pnpm --filter site test-data`.

### De namen van een club

`/beheer/clubnamen` (`src/app/beheer/clubnamen`) is alleen voor beheerders, zoals de stadions.
De data van Wikipedia kent alleen schrijfwijzen, geen jaren: hier houdt de redactie bij welke namen een club droeg, vanaf wanneer, en waarom.
De lijst is alleen voor de weergave: de import bepaalt de naam in de kop en het adres van de pagina (de slug), ook voor een club met een lijst.

- De lijst van clubs en het zoeken zijn die van de stadions (`searchClubs` komt uit `src/beheer/stadiums.ts`), met het label "Eigen lijst" en het filter Alles of Eigen lijst.
- `/beheer/clubnamen/<club>` heeft het formulier (`ClubNameForm.tsx`) met een regel per naam: de naam (1 tot 100 tekens), het seizoen of de dag waarmee hij begint, en een toelichting van hoogstens 200 tekens.
  De regels voor een start zijn die van de stadions, en de periodes komen uit dezelfde functie (`ownListPeriods` in `src/match-format.ts`).
  Boven het formulier staat de naam die de site nu in de kop toont.
  Is de laatste naam van de lijst een andere (`headingNotice`), dan zegt een melding dat in gewone tekst; opslaan kan wel.
- De zijbalk heeft "Opslaan", de schrijfwijzen die we van Wikipedia kennen (alleen lezen, uit `club_names`) en het uitklapblok "Lijst weghalen", dat eerst een bevestiging vraagt.
- Elke naam van de lijst komt bij het opslaan ook in `club_names`, zodat de import de oude naam als dezelfde club vindt en er geen tweede club ontstaat.
  Hoort een naam bij een andere club (op naam, zonder verschil in hoofdletters, accenten en leestekens), dan staat er een fout bij het veld en wordt niets opgeslagen.
  Een naam uit de lijst halen of de lijst weghalen laat `club_names` zoals het is.
- `replaceClubNamePeriods` en `removeClubNamePeriods` uit `@fansite/db/club-name-periods` schrijven de lijst en `club-name.save` of `club-name.reset` in het logboek, in één transactie, met het nummer van de club en de aantallen en zonder de tekst van een toelichting.
- Een opslag staat binnen vijf minuten op de pagina van de club (de tijd die `getClubPage` zijn gegevens bewaart); de lijsten met wedstrijden volgen als de pagina's van het seizoen verversen.
- `e2e/club-names.ts` geeft SV Proefdorp een verzonnen lijst met een toelichting, voor `pnpm test:a11y` en `pnpm --filter site test-data`.

### De spelers van een seizoen

`/beheer/spelers` (`src/app/beheer/spelers`) is alleen voor beheerders: een moderator krijgt "niet gevonden" (#1020).
Bij een doelpunt kiest de redactie de speler uit de selectie van het seizoen; hier voegt ze een speler toe die daar ontbreekt, of verbetert ze er een.

- De lijst toont de spelers van een seizoen met rugnummer, positie, bron en of ze in de selectie staan, in woorden.
  Ze opent op het lopende seizoen; de seizoenkiezer heeft elk seizoen met een wedstrijd (`listPlayerSeasons` in `src/beheer/players.ts`).
- `/beheer/spelers/nieuw?seizoen=<seizoen>` voegt een speler toe.
  Bovenaan staat een zoekformulier met methode GET (`q`): wat het vindt (`searchPersons`, hoogstens 25 personen), staat als lijst "Persoon" in het formulier, met "Een nieuwe persoon" als laatste keuze.
  Elke keuze noemt de seizoenen van de persoon en, als die anders is dan de naam, de titel van zijn artikel.
  Kiest de redactie een persoon die we kennen, dan blijft dat dezelfde persoon; anders vult ze voornaam, tussenvoegsel, achternaam en een Wikipedia-pagina in, die leeg mag blijven.
  Rugnummer (1 tot en met 99) en positie mogen ook leeg blijven: de oude seizoenen hebben ze niet.
  Met `wedstrijd=<nummer>` in het adres komt de redactie na het opslaan, en met "Annuleren", terug op het formulier van die wedstrijd (#1021).
  De kaart Doelpunten van een wedstrijd heeft de link met dat adres, die een nieuw tabblad opent, zodat het formulier van de wedstrijd zijn invoer houdt.
- De speler krijgt de bron `redactie` in `players`, en een nieuwe persoon de bron `redactie` voor zijn naam.
  Een Wikipedia-pagina die al bij een persoon hoort, maakt geen tweede persoon: de speler wordt die persoon.
  De site vraagt Wikipedia niets: de titel geldt zoals de redactie hem invult.
- Een persoon, een naam of een Wikipedia-pagina die het seizoen al heeft, wordt geweigerd met een zin bij het veld.
  Elk veld toont zijn eigen fout, en de lijst van fouten krijgt de focus, ook bij een fout zonder veld.
- `/beheer/spelers/<nummer>` past een speler aan (`PlayerForm.tsx`, hetzelfde formulier zonder de lijst van personen).
  Een andere naam geldt ook voor de persoon, in elk seizoen, met de bron `redactie`.
  Een Wikipedia-pagina geeft een persoon zonder titel zijn titel, en een speler zonder persoon de persoon van die titel; zijn doelpunten krijgen die persoon ook.
  Een pagina die bij een andere persoon hoort, wordt geweigerd, met onder het veld een link naar het samenvoegen van de twee personen.
- Onder het formulier staat "Dezelfde persoon als", voor een speler die er als twee personen in staat, zoals na een naamswijziging (#977).
  De redactie zoekt de andere persoon (`?zoek=`, een formulier met GET) en kiest hem uit een lijst met de seizoenen en de Wikipedia-pagina erbij.
  Een speler zonder persoon heeft dit blok niet.
- `/beheer/spelers/samenvoegen?persoon=<nummer>&met=<nummer>` (`samenvoegen/page.tsx`) is de bevestigingspagina, en de enige plek waar het beheer samenvoegt.
  Hij toont de twee personen naast elkaar in een tabel, wat ze anders hebben en welke waarde blijft, en wat er verhuist in aantallen.
  Een seizoen waarin beide een rij hebben, staat er apart: die twee rijen worden één.
  De persoon met een artikel op de Nederlandse Wikipedia blijft, anders de oudste (`defaultKept`); een link wisselt de twee om (`&blijft=<nummer>`).
  Er verandert niets tot de redactie op de knop drukt, en de tekst van de knop noemt beide personen: "Voeg X samen met Y".
  Twee keer dezelfde persoon, of een persoon die al weg is, geeft een zin en geen knop.
- `mergePersons` in `src/beheer/person-merge.ts` voegt samen met `mergeChosenPersons` uit `@fansite/db/person-merge`, de code waarmee ook de importer samenvoegt.
  Het schrijft één regel `person.merge` in het logboek (`describeMerge`), in dezelfde transactie: beide personen met nummer, naam en titel, de spelersrijen en titels die verhuisden, de aantallen en de waarden die verdwenen.
  Een samenvoeging ongedaan maken kan niet; met die regel draai je hem met de hand terug.
  De titel van de persoon die verdwijnt blijft in `person_pages`, dus een volgende import vindt dezelfde persoon en maakt geen tweede.
- Onder "Wie" staan "Linie" en "Land": de linie en het land van de persoon, in elk seizoen (#1051).
  Beide zijn een keuzelijst met "Onbekend" als lege keuze; het land staat op naam met de landcode erachter (`countryChoices` in `src/beheer/countries.ts`).
  Een waarde die afwijkt van wat de persoon heeft, krijgt de bron `manual`, en de import vervangt hem niet.
  Leegmaken haalt de waarde en de bron weg, en de import vult hem bij de volgende run weer aan.
  In het formulier dat een speler toevoegt, laat "Onbekend" staan wat een persoon uit de lijst al heeft.
  Een speler zonder persoon heeft de twee velden niet.
  "Positie" onder "In dit seizoen" is voor een seizoen dat afwijkt: bij "Onbekend" toont de site de linie van de persoon.
  De wijziging staat in het logboek, in de regel van de speler.
- Het uitklapblok "Uit de selectie halen" zet `in_squad` uit, met het moment; de rij blijft staan.
  Een speler met een doelpunt, een optreden in een verslag of cijfers in de tabel hoort bij het seizoen: hij heeft het blok niet, en de pagina zegt waarom.
- Wat de redactie zet, is daarna van de redactie (`players.editors_fields`, #1022): bij toevoegen de naam en elk ingevuld veld, bij aanpassen de velden die veranderden.
  De import schrijft die velden niet meer, en een andere waarde van de import wacht op `/beheer/kwaliteit/<seizoen>/spelersgegevens`.
- `addPlayer`, `editPlayer` en `removePlayer` in `src/beheer/players.ts` schrijven de wijziging en `player.add`, `player.edit` of `player.remove` in het logboek, in één transactie, met het nummer van de speler.
- De speler staat daarna in de kiezer van een doelpunt van dat seizoen en op de pagina Spelers, met dezelfde bronvermelding als de andere spelers.
  Een doelpunt krijgt in het formulier van een wedstrijd de persoon van de gekozen speler (`personId` in `SquadPlayer`), zodat het ook zonder Wikipedia-pagina voor de persoon telt.
  Wat de import doet met een speler die de redactie toevoegde of aanpaste, regelt #1022.

### De kwaliteit van de gegevens

`/beheer/kwaliteit` (`src/app/beheer/kwaliteit`) is alleen voor beheerders: een moderator krijgt "niet gevonden".
De pagina toont een tabel met een rij per seizoen sinds 1990/91, het nieuwste bovenaan.
De cijfers komen uit `readSeasonCoverage` in `@fansite/db/season-coverage`, dezelfde functie als `import:status` gebruikt.
De wachtende wijzigingen telt `waitingChangesBySeason` in `src/beheer/quality.ts` erbij.
Elke cel zegt in woorden wat ze telt, zoals "12 wedstrijden, 10 gespeeld (12 van Wikipedia)" en "Geen spelers".
Zo leest de cel ook op een telefoon, waar de kolommen onder het seizoen staan en hun kop weg is, en zegt geen kleur iets.

De laatste kolom, Te doen, heeft een koppeling voor elke werklijst van het seizoen waar werk in zit, `/beheer/kwaliteit/<seizoen>/<lijst>`:

- `zonder-doelpunten`: gespeelde wedstrijden met doelpunten in de uitslag en geen doelpunt in `match_goals`;
- `verslagen-bezig`: wedstrijden met een verslag dat `bezig` is;
- `doelpunten-zonder-speler`: wedstrijden met een doelpunt van ons zonder speler uit de selectie;
- `wachtende-wijzigingen`: wedstrijden met een wijziging van Wikipedia, een afwijking van de invoer of een verschil tussen twee bronnen dat op een besluit wacht.

`listWork` in `src/beheer/quality.ts` leest een lijst, de oudste wedstrijd eerst.
Elke rij leidt naar de wedstrijd in het beheer, en een verslag dat niet af is naar het verslag.
De lijst `doelpunten-zonder-speler` leidt naar de kaart Doelpunten van de wedstrijd (`#doelpunten`) en heeft een kolom "Naam bij het doelpunt", met de naam waarmee elk doelpunt binnenkwam (#1021).
Heeft het seizoen geen enkele speler (`seasonHasPlayers`), dan staat dat in een zin boven de rijen, met een link naar `/beheer/spelers?seizoen=<seizoen>`.
Een lijst telt wat de tabel telt; `src/beheer/quality.test.ts` houdt ze daaraan.
Een adres zonder seizoen sinds 1990/91 of zonder bestaande lijst geeft "niet gevonden".

Verschillen de doelpunten van een speler in de selectietabel van die in de wedstrijden of de verslagen, dan heeft de kolom ook een koppeling "spelerscijfers verschillen" (#974).
Ze leidt naar `/beheer/kwaliteit/<seizoen>/spelerscijfers` (`src/app/beheer/kwaliteit/[seizoen]/spelerscijfers`), met per verschil de speler, de competitie en de twee aantallen.
Elk verschil heeft een formulier met een reden en twee knoppen: het andere aantal overnemen, of de selectietabel houden (`submitStatDifference` in `src/app/beheer/kwaliteit/actions.ts`).
Het besluit staat in het logboek als `player.stats-take-over` of `player.stats-keep`.

Leest de import voor een speler iets anders dan de redactie invulde, dan heeft de kolom een koppeling "spelersgegevens verschillen" (#1022).
Ze leidt naar `/beheer/kwaliteit/<seizoen>/spelersgegevens` (`src/app/beheer/kwaliteit/[seizoen]/spelersgegevens`), met per afwijking de speler, het veld, de waarde van de redactie en die van de import.
Elke afwijking heeft een formulier met een reden en twee knoppen: de import overnemen, of de redactie houden (`submitFieldDifference` in `src/app/beheer/kwaliteit/actions.ts`).
Het besluit staat in het logboek als `player.field-take-over` of `player.field-keep`.
Heeft een andere speler van het seizoen de naam of de pagina van de import al, dan verandert er niets en zegt de pagina dat.

Onder de tabel staat een kaart met het aantal personen zonder linie en zonder land, en een link naar `/beheer/kwaliteit/personen` (`src/app/beheer/kwaliteit/personen`, #1053).
Die pagina heeft twee lijsten, `?lijst=land` voor de tweede, elk in delen van 50 (`?deel=2`), de personen van de nieuwste seizoenen eerst.
Een rij toont de naam, het eerste en het laatste seizoen en een link naar het artikel op Wikipedia.
Voor de linie heeft ze vier knoppen, voor het land een keuzelijst met eerst de landen die onze personen al hebben, en een knop.
De lijst is een onderdeel in de browser (`PersonWorkList.tsx`): een keuze slaat alleen die rij op (`submitPersonFact` in `actions.ts`), haalt haar uit de lijst en laat de andere rijen staan.
Een regel boven de lijst zegt wat er is opgeslagen en hoeveel er nog zijn, en "Sla over" zet een persoon onderaan tot de pagina opnieuw laadt.
`choosePersonFact` in `src/beheer/person-facts.ts` zet de waarde met de bron `manual`, die geen import vervangt, en schrijft `person.edit` in het logboek, in één transactie.
Heeft de persoon de waarde intussen al, dan verandert er niets en staat dat als fout bij de rij.
De knoppen en velden van de lijst zijn 44 pixels hoog, ook al is het beheer compact: de kaarten zetten het token `--hf-size-control` terug.

Op de pagina van een wedstrijd staat een verschil tussen twee bronnen als een kaart met beide waarden en de namen van de bronnen (`differenceWords` in `src/beheer/difference-words.ts`).
De kaart zegt dat de import hier niets vanzelf overneemt, en de knoppen noemen de bron die je overneemt of houdt.

Onder de tabel staan de personen die op elkaar lijken: personen met dezelfde titel op Wikipedia, op accenten, hoofdletters, streepjes, spaties en apostroffen na (`similarPersons` in `@fansite/db/persons`).
De import waarschuwt voor dezelfde groepen en voegt ze niet samen.
Een groep uit de lijst `personsWhoDiffer` staat er niet: dat zijn twee mensen, zoals Jordy Bruijn en Jordy Buijs.

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
`relevance.spec.ts` zet een verzonnen twijfelgeval op de site en haalt het weer terug.
`admin.spec.ts` verbergt en toont een verzonnen bericht van de uitgezette testbron, met en zonder JavaScript, en toetst de staten met axe.
`writing.spec.ts` schrijft met de editor, bekijkt, publiceert, wijzigt en trekt een verzonnen artikel in, en leest het gepubliceerde artikel ook zonder JavaScript.
Omdat het een artikel publiceert dat de kaart op de homepage kan worden, draait het als eigen project (`chromium-writing`) nadat alle andere controles klaar zijn.

## De foutpagina

Een pagina die door een fout op de server niet lukt, toont `Er ging iets mis` in de paginaopbouw (`src/ServerError.tsx`).
Next.js 16 kan niet allebei: een pagina die gooit, geeft een 500 met een lege `body`, en de tekst van `app/error.tsx` komt pas nadat de browser JavaScript heeft uitgevoerd.
Daarom vangt een pagina die een fout verwacht, hem zelf op en toont `ServerError` in de HTML, zoals `/bronnen` doet.
Dat antwoord is een 200, met `noindex` in de HTML, zodat zoekmachines de pagina niet bewaren.
Een fout die niemand opvangt, valt terug op `app/error.tsx`, met dezelfde tekst en een 500, maar alleen met JavaScript.
Een nieuwe pagina die de database leest, doet wat `src/app/bronnen/page.tsx` doet: de query vangen, de reden loggen met `reasonOf`, en `ServerError` tonen, met `robots: { index: false }` in de metadata.
De beslissing en de alternatieven staan in `docs/beslissingen/site.md`.

## Content Security Policy

Elk antwoord krijgt de header `Content-Security-Policy` (zie `src/proxy.ts`).
Een pagina laadt alleen iets van onze eigen server: geen scripts, stijlen, lettertypes, afbeeldingen of frames van een ander domein.
Inline scripts en stijlen mogen wel, omdat Next.js ze nodig heeft.
Een andere site mag geen pagina van ons in een frame zetten (`frame-ancestors 'none'`), omdat het beheer een inlog heeft en een pagina in een frame kan dienen voor clickjacking.
Elk antwoord heeft daarom ook `X-Frame-Options: DENY`, voor browsers die `frame-ancestors` niet kennen, en `Cross-Origin-Opener-Policy: same-origin`, dat onze pagina's scheidt van vensters van andere sites.
De site toont zelf geen frames en opent geen vensters met een opener, dus niets breekt.
`src/proxy.test.ts` en de rooktest controleren de drie op een pagina, een bestand onder `/_next`, de 404 en een pagina van het beheer.

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
Er is geen service worker, dus de site werkt niet offline (zie `docs/beslissingen/redactie.md`).
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

De `theme-color` in `src/app/layout.tsx` kleurt de balken van Chrome en andere browsers met de kop: `blue-900` in licht en `blue-800` in donker.
Safari op een iPhone of iPad gebruikt die niet voor zijn statusbalk.
Daar krijgt de statusbalk de kleur van de strook `.hf-page-top-edge` bovenaan de pagina (zie `page.css` in het designsysteem).
Die strook staat altijd op de pagina, ook als de kop is weggescrolt, zodat de statusbalk altijd het blauw van de modus heeft.
De kleur verandert alleen als de modus wisselt: met de knop Licht of Donker of als het systeem van thema wisselt (`refreshTopEdge` in `src/theme.ts`, dat de strook twee beeldjes van de pagina haalt, omdat Safari de nieuwe kleur anders niet leest).
Een vast element of een balk die vastplakt bovenaan mag niet over de strook liggen, want dan neemt Safari de kleur daarvan: de balk "Op deze pagina:" plakt onder de strook vast.
`e2e/safe-area.spec.ts` toetst de kleur van de strook in licht en donker, ook na het scrollen; de kleur van de statusbalk zelf is alleen op een telefoon of in de iOS-simulator te zien.

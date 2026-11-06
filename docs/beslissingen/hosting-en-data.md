# Hosting en data

## Beginnen op de gedeelde hosting van mijn.host

- **Datum:** 20 oktober 2026
- **Besluit:** we beginnen op de gedeelde webhosting van mijn.host waar het forum al draait, het pakket Basic.
  We houden in de gaten hoe dat gaat.
- **Wat de hosting biedt:** volgens mijn.host:
  - Node.js 22 en 24.
    Next.js draait via Phusion Passenger, het liefst als standalone build.
  - MariaDB 10.11 als database.
    Er is geen PostgreSQL, en er zijn geen processen die blijven draaien.
    Taken lopen via cron, hooguit één keer per minuut.
  - 4 cores, 4 GB geheugen en 10 GB opslag, voor maximaal vijf websites, samen met het forum.
  - Uitrollen vanuit GitHub Actions over SSH, op poort 26.
- **Waarom:** de hosting is er al, voor het forum.
  Een eigen server kost geld en onderhoud.
- **Overstappen:** naar een VPS, zodra we tegen een grens aanlopen:
  - live-updates om de paar seconden, of WebSockets;
  - het forum wordt trager;
  - de opslag raakt op;
  - een preview per pull request, of zware statistieken.
- **Alternatieven:** een unmanaged VPS van € 12,50 tot € 25 per maand (zonder btw), met root, Docker, Postgres en workers.
  Dat doen we voorlopig niet, vanwege de kosten en het onderhoud van de server: updates, beveiliging en back-ups.

## MariaDB in plaats van Postgres

- **Datum:** 20 oktober 2026
- **Besluit:** de database is MariaDB 10.11, met Drizzle.
  Dat vervangt het eerdere plan voor Postgres.
- **Waarom:** MariaDB is de database van de hosting.
  De belangrijkste reden voor Postgres was pg-boss, en dat valt weg zonder workers (zie _Importtaken via cron_).
- **Alternatieven:** Postgres op een VPS.
  Of SQLite, één bestand op de server zonder databaseserver; maar dan regelen we de back-ups zelf, terwijl MariaDB er al staat met de back-ups van de hosting.
  En de site en de importtaken schrijven allebei, wat een databaseserver beter opvangt dan één bestand op gedeelde opslag.

## Importtaken via cron

- **Datum:** 20 oktober 2026
- **Besluit:** cron start de importtaken, in plaats van pg-boss.
  Elke taak is een gewone opdracht die zijn werk doet en stopt.
  Een lock in de database zorgt dat een taak nooit twee keer tegelijk draait.
- **Waarom:** de hosting heeft geen processen die blijven draaien, en pg-boss werkt alleen met Postgres.
  Op een VPS kan een worker later dezelfde opdrachten aanroepen.
- **Alternatieven:** pg-boss met een worker die blijft draaien, op een VPS met Postgres.

## Weergavebeleid en toestemming zitten in `sources`, met een CHECK-constraint

- **Datum:** 21 oktober 2026
- **Besluit:** de kolommen voor het weergavebeleid en de toestemming horen bij de tabel `sources`, met de strengste standaardwaarden.
  Een CHECK-constraint laat een intro, afbeelding of insluiten alleen toe als de toestemming `given` is.
- **Waarom:** de redactionele principes 1 en 2 zeggen dat we standaard alleen kop, link en bronnaam tonen, en meer alleen met toestemming.
  Zo kan een fout in een scherm, een seed of een import geen beleid opslaan dat verder gaat dan de toestemming, en krijgt elke nieuwe bron vanzelf het strengste beleid.
- **Alternatieven:** de kolommen later toevoegen met #9; dan kan er een bron bestaan zonder beleid.
  Of de regel alleen in de code toepassen; dan wordt een verkeerde rij getoond tot de code hem vangt.

## De lokale database draait met Docker Compose

- **Datum:** 21 oktober 2026
- **Besluit:** de lokale MariaDB draait met Docker Compose, met de image `mariadb:10.11`.
  CI gebruikt dezelfde versie als servicecontainer.
- **Waarom:** één commando, dezelfde versie als op de hosting, en wat in CI draait is wat lokaal draait.
- **Later:** sinds 1 november 2026 heeft elke worktree een eigen database op die ene server, `fansite_<naam van de map>`; zie _Elke werkmap heeft een eigen database en eigen poorten_.
  De database `fansite` en de server zelf zijn gelijk gebleven.
- **Alternatieven:** alleen een gids voor `mariadb@10.11` met Homebrew.
  Dat vraagt geen Docker, maar werkt alleen op macOS en is lastiger gelijk te houden met CI.

## Migraties draaien met de migrator van drizzle-orm

- **Datum:** 21 oktober 2026
- **Besluit:** `pnpm db:migrate` draait de migraties met de migrator van `drizzle-orm`.
  `drizzle-kit` dient alleen om ze te maken (`db:generate`).
- **Waarom:** op de hosting staat geen ontwikkelgereedschap, en dezelfde opdracht moet daar kunnen draaien als we migraties bij het uitrollen gaan doen (#70).
- **Alternatieven:** `drizzle-kit migrate`.
  Dat vraagt dat `drizzle-kit` en zijn dependencies op de server staan.
- **Later:** zie _De site draait de migraties als ze start_.

## Drizzle 0.45 in plaats van de 1.0-kandidaat

- **Datum:** 21 oktober 2026
- **Besluit:** we gebruiken `drizzle-orm` 0.45.4 en `drizzle-kit` 0.31.11, de versies die npm als `latest` geeft.
- **Waarom:** de migraties staan in de repository en draaien op elke omgeving.
  Dat vraagt een versie die niet meer verandert, en de 1.0 is nog een kandidaat (rc.5, van 21 oktober 2026).
- **Alternatieven:** de 1.0-kandidaat nu nemen.
  Dan zitten we straks met een overstap op een versie die nog kan veranderen.
  Renovate stelt de overstap voor zodra 1.0 uit is, in een eigen pull request (zie _Renovate in plaats van Dependabot_).

## Tijden in UTC en tekst in utf8mb4

- **Datum:** 21 oktober 2026
- **Besluit:** tijden slaan we op als `datetime` in UTC, met `UTC_TIMESTAMP()` als standaardwaarde.
  Elke tabel krijgt in de migratie zelf de tekenset `utf8mb4`, met de sortering `utf8mb4_unicode_ci`.
- **Waarom:** een `datetime` verandert niet met de tijdzone van de server of de sessie, en een `timestamp` stopt in MariaDB 10.11 in 2038.
  MariaDB 10.11 gebruikt zelf latin1, en wat de database op de hosting als standaard heeft, weten we niet.
  Koppen bevatten tekens die niet in latin1 passen, zoals emoji en letters als ł en ć.
  drizzle-kit laat de tekenset weg, dus zetten we hem met de hand in de migratie, en een test controleert elke tabel.
- **Alternatieven:** de tekenset van de database of van de server instellen.
  Dat staat niet in de repository, en bij een servicecontainer in CI kunnen we de instelling niet meegeven.

## Eerste versie op acceptatie: een minimale site

- **Datum:** 21 oktober 2026
- **Besluit:** de eerste versie op de acceptatieomgeving is een minimale `apps/site` met één pagina.
- **Waarom:** het grootste risico van de gedeelde hosting is dat Next.js er via Passenger niet draait.
  Dat testen we nu, met een pagina die weinig kan breken.
- **Alternatieven:** de Storybook-build uitrollen; die is statisch en test Node.js niet.
  Of wachten op het eerste issue dat de site bouwt.

## Acceptatie met noindex, zonder wachtwoord

- **Datum:** 21 oktober 2026
- **Besluit:** de acceptatieomgeving weert zoekmachines met de header `X-Robots-Tag: noindex, nofollow` en een `robots.txt` die alles weigert, en heeft voorlopig geen wachtwoord.
- **Hoe:** de site leest `SITE_ENV` (`local`, `acceptance` of `production`) als de server draait, niet bij het bouwen.
  Alleen `production` komt in zoekmachines.
  Zo kan dezelfde build later naar productie, en een omgeving die vergeet `SITE_ENV` goed te zetten, blijft uit de zoekmachines in plaats van erin.
  Productie moet dus `SITE_ENV=production` krijgen; de lanceringschecklist (#34) noemt dat.
- **Waarom:** een lege pagina bevat niets om te beschermen.
  Een wachtwoord vraagt instellingen in DirectAdmin en test de deploy niet.
- **Alternatieven:** een wachtwoord via DirectAdmin.
  Dat bekijken we zodra er testgegevens op staan.

## De map voor de host heeft geen symbolische links

- **Datum:** 21 oktober 2026
- **Besluit:** `pnpm --filter site assemble` maakt een map met één platte `node_modules` van echte mappen, zonder symbolische links.
  Het script stopt met een foutmelding als er toch een link overblijft.
- **Waarom:** de eerste deploy gaf op acceptatie een 500.
  Node laadt op de host één bestand van Next.js via het pad van de link, en zoekt de pakketten naast Next.js, zoals `@swc/helpers`, dan op de verkeerde plek.
  Lokaal en in CI gebeurt dat niet, dus de rooktest zag het niet.
  Waarom Node dat op de host doet, hebben we niet uitgezocht.
  Zonder links is er niets om verkeerd te volgen.
- **Alternatieven:** `node-linker=hoisted` in pnpm voor de hele werkruimte.
  Dat verandert de installatie van alle packages voor een probleem van één map.
  Of een startbestand dat Node de paden voorbereidt; dat hangt af van interne details van Next.js en Node.

## Adressen: sc.heerenveen.org voor productie, acc.sc.heerenveen.org voor acceptatie

- **Datum:** 21 oktober 2026
- **Besluit:** de site komt op `sc.heerenveen.org`, de acceptatieomgeving op `acc.sc.heerenveen.org`.
  Het forum blijft op `forum.heerenveen.org`.
- **Waarom:** `sc.heerenveen.org` was het adres van de fansite van 1999 tot 2006, dus oude links en lezers vinden de nieuwe site terug.
  Acceptatie krijgt het adres van productie met `acc.` ervoor, zodat je ziet bij welke omgeving het hoort.
- **Alternatieven:** `acceptatie.heerenveen.org`, los van het adres van productie.
  Of de site op `heerenveen.org` zelf; daar staat de doorverwijzing naar het forum.

## Eén tak: main is acceptatie, productie krijgt een release-tag

- **Datum:** 21 oktober 2026
- **Besluit:** er is één langlevende tak, `main`.
  Elke merge naar `main` gaat naar de acceptatieomgeving.
  Productie krijgt een versie na goedkeuring op acceptatie: de tag die release-please maakt als de eigenaar de release-pull request samenvoegt (zie #33).
  Elke deploy staat met zijn commit in de lijst Deployments van GitHub.
- **Waarom:** we voegen samen met squash en houden de geschiedenis lineair.
  Een tak `develop` zou bij elke release uit de pas lopen met `main`.
  Samenvoegen met een squash geeft release-please bovendien één regel in de changelog in plaats van één per wijziging.
  Een tag verandert niet meer, een tak wel.
- **Alternatieven:** `develop` voor acceptatie en `main` voor productie.
  Dat past bij samenvoegen zonder squash, en dat doen we niet.

## De site draait de migraties als ze start

- **Datum:** 22 oktober 2026
- **Besluit:** de server van de site draait de migraties die de database nog niet had als de host hem start, voordat hij verzoeken beantwoordt.
  Een slot in de database (`GET_LOCK`) voorkomt dat twee processen tegelijk migreren.
  Lukt het niet, dan schrijft de server een melding in het logboek en blijft hij draaien.
  De workflow Acceptance vraagt na het uitrollen `/bronnen` op, zodat een mislukte migratie een rode run geeft.
- **Hoe:** `register()` in `apps/site/src/instrumentation.ts` roept `prepareDatabase` aan uit `@fansite/db/prepare`, en Next.js beantwoordt geen verzoek voordat die klaar is.
  `assemble` zet de migraties in `packages/db/drizzle` van de map, want Next.js volgt alleen wat de code importeert en laat de SQL-bestanden weg.
  De rooktest maakt voor elke run een lege database aan op de server uit `DATABASE_URL`, en laat de site daar zijn tabellen maken.
  Zo bewijst hij ook dat de migraties in de map zitten.
- **Waarom:** `DATABASE_URL` staat alleen in de Node.js-app in DirectAdmin.
  Zo blijft het wachtwoord op één plek: niet in GitHub en niet in een tweede bestand op de host.
  Elke versie die start, heeft het schema dat ze nodig heeft, en productie (#33) werkt straks net zo.
- **Let op:** MariaDB kan `CREATE TABLE` en `ALTER TABLE` niet terugdraaien.
  Een migratie die halverwege mislukt, kan een half veranderd schema achterlaten.
  Productie krijgt daarom een back-up vóór een migratie (#33).
- **Later:** de back-up vóór een migratie op productie hoort sinds 26 oktober 2026 bij #347; zie _De dump bewaart 14 dagen, laat de nieuwste altijd staan, en laat tabellen zonder blijvende gegevens leeg_ en _Back-ups zijn een dagelijkse dump op de host, 14 dagen bewaard, en een terugzetting die we één keer echt testen_.
- **Later:** de database van de rooktest heet sinds 1 november 2026 `fansite_smoke_<naam van de worktree>_<hex>` in een worktree, en de poort komt uit het blok van die worktree; zie _Elke werkmap heeft een eigen database en eigen poorten_.
- **Alternatieven:** na het kopiëren een opdracht op de host draaien via SSH.
  Een SSH-sessie krijgt de variabelen van de app niet, dus `DATABASE_URL` moet dan ook in een bestand op de host, en we moeten Node daar zelf vinden.
  Of vanuit GitHub migreren door een SSH-tunnel; dan komt `DATABASE_URL` in de geheimen van GitHub.
  Of de server laten stoppen als het niet lukt; dan toont de host zijn eigen foutpagina, zonder uitleg en buiten onze huisstijl.

## De testbronnen staan alleen op acceptatie

- **Datum:** 21 oktober 2026
- **Besluit:** de site zet de testbronnen alleen met `SITE_ENV` `acceptance`, bij elke start.
  De seed werkt bestaande testbronnen bij op hun domein, dus er komen geen dubbele.
  `pnpm db:seed` weigert als `SITE_ENV` `production` is.
- **Waarom:** de groep moet op acceptatie een gevulde pagina kunnen nakijken, en op productie mogen nooit testbronnen komen.
- **Alternatieven:** acceptatie leeg laten en de bronnen met de hand invoeren.
  Dat kan pas met het beheer (#30), en dan vervangen de echte bronnen de testbronnen.
- **Later:** de testbronnen staan sinds 26 oktober 2026 alleen nog lokaal en in de tests; zie _Testbronnen alleen lokaal; acceptatie en productie hebben alleen echte bronnen_.

## De importer gaat als één bestand mee in de map van de site

- **Datum:** 22 oktober 2026
- **Besluit:** `esbuild` bundelt de importer met alles wat hij nodig heeft tot één JavaScript-bestand.
  `assemble` zet het in de map voor de host, dus dezelfde deploy kopieert de site en de importer.
- **Hoe:** het bestand is `apps/importer/import.mjs`.
  De map heeft geen `package.json` die zegt dat `.js` een ES-module is, dus de extensie zegt het.
- **Waarom:** op de server bouwen we niets.
  Node haalt geen typen weg uit bestanden in `node_modules`, dus `@fansite/db`, dat als TypeScript wordt geleverd, werkt daar niet zonder bouwstap.
  Eén bestand heeft geen `node_modules` en geen symbolische links nodig.
  Samen uitrollen houdt de importer gelijk met het schema, dat de site bij het starten bijwerkt.
- **Alternatieven:** een eigen map met een eigen `node_modules` via `pnpm deploy`, plat gemaakt zoals bij de site; dan moet `@fansite/db` alsnog gebouwd worden.
  Of een eigen map met een eigen stap in de workflow; dan kunnen de importer en het schema uit de pas lopen.

## Cron krijgt DATABASE_URL uit een eigen bestand op de host

- **Datum:** 22 oktober 2026
- **Besluit:** de cronjob start de importer met `node --env-file` en een bestand in de thuismap, buiten de map van de app en buiten `public_html`, dat alleen het account mag lezen.
- **Waarom:** een cronjob krijgt de variabelen van de Node.js-app in DirectAdmin niet.
  Het bestand blijft op de host en komt niet in GitHub.
- **Let op:** het wachtwoord van de database staat nu op twee plekken op de host: bij de app en in dit bestand.
  Wie het verandert, past beide aan.
  Dat wijkt af van _De site draait de migraties als ze start_, waar het op één plek bleef.
- **Alternatieven:** cron vraagt een adres van de site op, met een token, en de site draait de import met haar eigen `DATABASE_URL`.
  Dan staat het wachtwoord op één plek, maar draait de import in het webproces, en heeft de site een nieuw adres en een nieuw geheim nodig.
  Of `DATABASE_URL` in de opdracht van de cronjob; dan staat het wachtwoord leesbaar in DirectAdmin.

## Tot de jobplanner draait de import elke 15 minuten, zonder lock

- **Datum:** 22 oktober 2026
- **Besluit:** cron start de importer op acceptatie elke 15 minuten, niet op het hele kwartier.
  De lock in de database komt met de jobplanner (#13).
- **Waarom:** zo staat nieuws binnen een kwartier op de site, en de homepage bewaart de koppen vijf minuten.
  Eén feed kost een paar seconden, en de fetcher stopt na 15 seconden per verzoek, dus twee runs halen elkaar niet in.
  Op het hele kwartier starten veel cronjobs tegelijk.
- **Alternatieven:** elke 30 minuten; de Leeuwarder Courant stuurt geen `ETag`, dus elke run haalt de hele feed, maar het nieuws komt dan tot een half uur later.
  Of nu al een lock met `GET_LOCK`, zoals bij de migraties.

## Storybook staat op ds.heerenveen.org

- **Datum:** 25 oktober 2026
- **Besluit:** Storybook staat op ds.heerenveen.org op de hosting van mijn.host, en niet meer op GitHub Pages.
  De workflow `storybook.yml` zet het neer met rsync over SSH, zoals `acceptance.yml` de site neerzet, met een eigen omgeving in GitHub (`designsystem`) en eigen geheimen.
  `docs/designsysteem-publiceren.md` zegt wat de eigenaar eenmalig instelt.
- **Waarom:** één plek en één adres voor het designsysteem, ook voor de MCP-server die er in een volgend issue bij komt.
  GitHub Pages kan alleen bestanden tonen, dus daar kan geen `/mcp` op hetzelfde adres.
  We deployen al over SSH, dus er komt geen nieuw soort werk bij.
- **Alternatieven:** GitHub Pages met ds.heerenveen.org als eigen domein (geen werk op de host, maar de MCP-server moet dan op een ander adres); Chromatic (een derde partij die onze bestanden bewaart, en kosten).

## Storybook wordt alleen neergezet als een samenvoeging Storybook wijzigt

- **Datum:** 25 oktober 2026
- **Besluit:** Storybook wordt alleen opnieuw neergezet als een samenvoeging bestanden raakt waar Storybook uit bestaat: iets in `packages/design-system/`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` of de workflow zelf.
  Met de hand starten (`workflow_dispatch`) zet het altijd neer.
- **Waarom:** een wijziging aan de site of aan documentatie in `docs/` verandert Storybook niet.
  Zo blijft de host rustig en laat een run in GitHub zien wat er echt veranderde.
- **Hoe:** het filter `paths` staat alleen op de trigger `push`, niet op de hele workflow.
  Op de hele workflow zou het ook de build bij een pull request stoppen, en een regel voor `main` eist de taak `Build Storybook` bij elke pull request.
  Een push naar `main` die geen van de bestanden raakt, start de workflow niet.
- **Alternatieven:** na elke samenvoeging deployen (simpeler, maar elke run zet dezelfde bestanden neer).

## De deploy van Storybook kopieert de geteste build en weigert een verkeerd pad

- **Datum:** 25 oktober 2026
- **Besluit:** de taak `Build Storybook` bewaart de build als artifact `storybook`, en de taak die deployt kopieert dat artifact in plaats van opnieuw te bouwen.
  Die taak stopt (rood) als `DEPLOY_PATH` niet de document root van het subdomein is, een absoluut pad dat eindigt op `/domains/ds.heerenveen.org/public_html`.
  Ze stopt ook als de build leeg is of `index.json` of `manifests/components.json` mist.
  rsync laat `.well-known/`, `.htaccess` en `cgi-bin/` van de host staan.
  Na het kopiëren moeten `https://ds.heerenveen.org/index.json` en `https://ds.heerenveen.org/manifests/components.json` met 200 antwoorden en hetzelfde zijn als in de build.
- **Waarom:** `rsync --delete` maakt de doelmap leeg.
  Een geheim met een verkeerd of leeg pad mag daarom nooit tot een kopie leiden.
  Wat live gaat, is precies wat de controle op `--lightningcss` goedkeurde.
  Het vergelijken met de build bewijst dat de nieuwe versie live staat, niet alleen dat er iets antwoordt.
- **Let op:** op de gedeelde hosting kan de sleutel van deze deploy niet tot één map beperkt worden zonder `rrsync` en een aangepast `authorized_keys`.
  De sleutel is wel eigen aan deze deploy en los in te trekken; de beperking is de controle van het pad hierboven.
- **Alternatieven:** de deploy opnieuw laten bouwen (twee builds die kunnen verschillen); alleen controleren of `index.json` antwoordt.

## De MCP-server van het designsysteem staat op ds.heerenveen.org/mcp

- **Datum:** 25 oktober 2026
- **Besluit:** de losse MCP-server `@storybook/mcp` staat openbaar en alleen-lezen op ds.heerenveen.org/mcp, naast de lokale server voor agents in deze repository.
  Hij geeft `docs-list`, `docs-show` en `docs-show-story` uit de gepubliceerde Storybook, en niets om te ontwikkelen of te testen.
  Een agent in een andere repository voegt hem toe met `claude mcp add --transport http ds https://ds.heerenveen.org/mcp`.
- **Waarom:** agents buiten deze repository en sessies zonder draaiende Storybook kunnen zo dezelfde documentatie raadplegen.
  Storybook zelf is al openbaar en de server geeft daar alleen de documentatie uit, dus er valt niets te beschermen en er is geen login nodig.
- **Let op:** Storybook noemt de manifests en deze server nog een voorbeeldversie ("preview"), en de API kan veranderen.
  De versie staat daarom vast op 10.6.3, die van Storybook zelf, en gaat pas omhoog als iemand dat bewust doet en de test van `apps/design-system-mcp` nog slaagt.
  De licentie is MIT, net als die van wat het pakket meebrengt (`tmcp`, `valibot`), en het pakket heeft geen installatiescript.
  Dat het pakket geen telemetrie stuurt en geen verzoeken naar derden doet, is gecontroleerd in de broncode: de enige `fetch` zit in de standaardbron voor manifests, en die gebruiken we niet (zie _De server leest de manifests van schijf_).
  Het veld `telemetry` in de antwoorden van de gereedschappen is gegevens die de aanroeper krijgt; het pakket stuurt ze nergens heen.
- **Alternatieven:** een token (meer code en een geheim om uit te delen); de MCP-server van Chromatic (een derde partij, met kosten); niets publiceren en agents buiten de repository laten werken zonder.

## De MCP-server is een eigen kleine app zonder sessies

- **Datum:** 25 oktober 2026
- **Besluit:** de server is `apps/design-system-mcp`, een Node.js-app met alleen het pad `/mcp`, die `esbuild` tot één bestand bundelt (`server.mjs`, zonder `node_modules`).
  Hij beantwoordt alleen `POST`, met een body van hoogstens 64 kB.
  Elk ander adres geeft `404 Not found`, elke andere methode `405`, en de server houdt geen sessie bij.
  Hij draait op de hosting als app in _Setup Node.js App_, in `domains/ds.heerenveen.org/mcp` met het pad `mcp` als adres.
  Dat de host een pad als adres toelaat, is niet uitgeprobeerd.
- **Waarom:** `@storybook/mcp` is een bibliotheek, dus we moeten er zelf een server omheen zetten.
  Een eigen app laat de statische bestanden van Storybook zoals ze zijn.
  De bibliotheek bewaart sessies in het geheugen van één proces en opent voor elke `GET` een stream.
  Een host die meer dan één proces kan starten, of er een herstart, breekt dan een client die een sessie vasthoudt.
  Een openbare server moet dat geheugen ook begrenzen: elke `initialize` laat iets achter, en elke `GET` houdt een verbinding open.
  Elk verzoek krijgt daarom een nieuwe handler, die weg is als het verzoek klaar is, en `GET` en `DELETE` worden geweigerd.
  De server geeft geen sessie-id en leest de sessie van een client niet.
  Het protocol staat dat toe.
  Een handler maken kost enkele milliseconden.
  De gereedschappen hebben geen stream of melding nodig.
  De test laat zien dat een tweede proces een client beantwoordt die op het eerste begon, met `initialize` op de een en `docs-list` op de ander.
- **Let op:** het logboek bevat alleen de start van de app en de naam van een fout, zonder adressen van bezoekers en zonder inhoud van verzoeken.
  De server zet geen cookies en geen CORS-headers: hij is voor agents, niet voor een pagina in een browser.
  Een limiet op het aantal verzoeken of een token valt buiten dit issue; komt er misbruik, dan volgt een nieuw issue.
- **Alternatieven:** de bibliotheek ongewijzigd gebruiken, met sessies in het geheugen (simpeler, maar breekt bij een tweede proces en laat geheugen volgroeien); de server op een eigen subdomein, als de host geen pad als adres toelaat; de app het hele subdomein laten beantwoorden en de statische bestanden zelf laten geven (een app die niets wijzigt aan Storybook is veiliger).

## De server leest de manifests van schijf

- **Datum:** 25 oktober 2026
- **Besluit:** de server leest `manifests/components.json`, `manifests/docs.json` en de bestanden waar die naar verwijzen uit de document root van het subdomein, bij elk verzoek opnieuw.
  Hij vindt die map zelf: `../public_html`, vanaf de map met `server.mjs`.
  Hij leest alleen `.json` onder `manifests/`, en `STORYBOOK_DIR` kan de map vervangen.
- **Waarom:** de standaardbron van de bibliotheek haalt de manifests op van het adres van het verzoek zelf.
  Een verzoek met een andere `Host` laat de server dan bij een andere host ophalen, en elk verzoek zou een verzoek van de server aan zichzelf kosten.
  Van schijf lezen kost niets, doet geen verzoek, en kan niet verouderen: rsync vervangt de bestanden, en het volgende verzoek leest de nieuwe.
  De map is `../public_html` omdat de workflow de app naast de document root zet, vanuit hetzelfde pad (`DEPLOY_PATH`), dus er is geen tweede pad dat gelijk moet blijven.
  Zonder cache is er niets dat langer duurt dan een deploy.
  Lezen en parsen van de manifests kost enkele milliseconden.
- **Alternatieven:** de manifests via HTTPS ophalen van `https://ds.heerenveen.org/manifests/…` (een verzoek aan zichzelf, en de server moet dan een vast adres kennen); een cache op de wijzigingstijd van de bestanden (sneller, maar meer code voor iets wat enkele milliseconden kost).

## De deploy van de MCP-server deelt de omgeving en het pad van Storybook

- **Datum:** 25 oktober 2026
- **Besluit:** dezelfde workflow, `storybook.yml`, deployt de app met dezelfde omgeving (`designsystem`), dezelfde geheimen en dezelfde sleutel.
  Het pad van de app is `DEPLOY_PATH` zonder `/public_html`, plus `/mcp`.
  De stap die kopieert controleert dat pad opnieuw: het moet eindigen op `/domains/ds.heerenveen.org/mcp`, zonder `..`, anders stopt de run.
  Het filter voor een push naar `main` krijgt `apps/design-system-mcp/**`.
  Na de kopie raakt de workflow `tmp/restart.txt` aan en voert `check.js` uit: `initialize`, de lijst met gereedschappen en `docs-list` op `https://ds.heerenveen.org/mcp`, tot anderhalve minuut lang.
  De run wordt rood als de server niet antwoordt, andere gereedschappen geeft dan de drie, of een component van de build mist.
- **Waarom:** de controle van `DEPLOY_PATH` blijft zo de enige poort naar de host, en er is geen tweede geheim dat verkeerd kan staan.
  De twee kopieën raken elkaars bestanden niet.
  Storybook gaat naar `public_html` en slaat `/mcp/` over; de app gaat naast `public_html`, en slaat `tmp/`, `stderr.log`, `.htaccess` en `node_modules` over, die van de host zijn.
  Dat de build de server al start tegen de Storybook die hij net maakte, voordat iets gekopieerd wordt, houdt een kapotte app van de host.
  De controle erna vergelijkt met de build van deze run, dus ze bewijst dat de nieuwe versie live staat.
- **Let op:** de eerste deploy wordt rood als de eigenaar de app in _Setup Node.js App_ nog niet maakte.
  `docs/designsysteem-publiceren.md` zet die stap daarom voor het samenvoegen.
- **Alternatieven:** een eigen workflow voor de app (twee workflows die elkaars bestanden kunnen raken, en twee omgevingen met dezelfde geheimen); een eigen geheim voor het pad van de app (een tweede pad om te controleren); de controle overslaan als de app er nog niet is (de run blijft dan groen terwijl er niets werkt).

## Storybook op ds.heerenveen.org krijgt `noindex`, en geen `robots.txt` die blokkeert

- **Datum:** 25 oktober 2026
- **Besluit:** Storybook op ds.heerenveen.org krijgt `<meta name="robots" content="noindex">` in `index.html` en `iframe.html`, via `managerHead` en `previewHead` in `.storybook/main.ts`.
  Er komt geen `robots.txt` die blokkeert.
  De taak `Build Storybook` controleert bij elke build dat beide bestanden de tag hebben.
- **Waarom:** de pagina's zijn voor bijdragers en agents.
  `noindex` houdt ze uit de zoekresultaten en laat het lezen toe, terwijl `Disallow` ook agents en gereedschap tegenhoudt die zich aan robots houden.
- **Alternatieven:** indexeerbaar laten, zoals nu (zonder nut en met een nietszeggende titel); een `robots.txt` met `Disallow: /` (blokkeert ook de gereedschappen die zich aan robots houden).

## Back-ups zijn een dagelijkse dump op de host, 14 dagen bewaard, en een terugzetting die we één keer echt testen

- **Datum:** 23 oktober 2026
- **Besluit:** een dagelijkse dump op de host, 14 dagen bewaard, plus één dump vlak voor elke deploy, en een terugzetting die we één keer echt testen.
  Geen kopie buiten de host.
  De projecteigenaar splitste het issue (#171) op 26 oktober 2026: de dagelijkse dump, het opruimen, de opdrachten voor een dump en het terugzetten, de documentatie en de proef lokaal kwamen eerst.
  De dump vlak voor het kopiëren in `acceptance.yml` en `production.yml` en de proef op de host van acceptatie volgen in #347, omdat de deploy van productie (#33) nog niet in `main` staat.
- **Waarom:** de gegevens zijn klein en voor het grootste deel opnieuw op te halen.
  Wat niet opnieuw te maken is (het register, later de verborgen berichten en accounts), is klein genoeg voor een dump.
  Een kopie elders vraagt een derde partij of werk van de eigenaar.
  Een dump beschermt tegen een fout in een migratie of een verkeerde actie, niet tegen het verlies van de host zelf.
- **Nadeel:** de dumps staan op dezelfde host als de database en delen de 10 GB met het forum.
  Een dump van een database van 100.000 koppen met een volledig logboek woog 4,1 MB, dus 14 dagen kosten ongeveer 58 MB (zie `docs/back-ups.md`).
- **Gevolg:** de back-up vóór een migratie op productie, die _De site draait de migraties als ze start_ en _De migratie van de versies kan opnieuw draaien, want MariaDB maakt DDL niet ongedaan_ noemen, komt met #347.
- **Alternatieven:** een kopie buiten de host; alleen de back-ups van mijn.host, die we niet kunnen testen.
  We bekijken het opnieuw als er accounts en berichten bijkomen.

## De dump is `mysqldump` met het wachtwoord in een optiebestand, in één bestand dat cron en de eigenaar draaien

- **Datum:** 26 oktober 2026
- **Besluit:** `packages/db/backup.mjs` is één bestand zonder `node_modules` dat `assemble` maakt, zoals de importer en `admin.mjs`.
  Het heeft twee opdrachten: `backup` (dump en opruimen) en `restore <bestand>`.
  Het start `mysqldump` en `mysql` van de host, en krijgt `DATABASE_URL` uit hetzelfde bestand als de importer, met `BACKUP_FOLDER` erbij.
  Het wachtwoord gaat in een optiebestand (`--defaults-extra-file`) met rechten voor alleen het account, in een eigen tijdelijke map die na afloop weggaat.
  Een dump op aanvraag is dezelfde opdracht `backup`, die met code 1 stopt als de dump mislukt.
- **Waarom:** `mysqldump` is het gereedschap dat MariaDB zelf voor een dump levert, en een dump die het niet maakt, zouden we moeten bewijzen.
  Zelf een dump schrijven (`SHOW CREATE TABLE` en `INSERT`-regels in Node) heeft geen programma op de host nodig, maar moet binaire waarden, tekensets, `foreign keys` en tijden zelf goed krijgen.
  Een opdrachtregel met het wachtwoord (`-p…`) laat het zien aan elk account op de host (`ps`).
  De omgevingsvariabele `MYSQL_PWD` staat bij de MySQL-clients als verouderd.
  Eén bestand voor beide opdrachten houdt het laden van de instellingen en het optiebestand op één plek, en een workflow roept het zonder pnpm aan.
- **Nadeel:** de host moet `mysqldump` en `mysql` hebben.
  Dat is niet bevestigd: `docs/back-ups.md` zegt hoe de eigenaar het controleert, en `MYSQLDUMP_COMMAND` en `MYSQL_COMMAND` wijzen naar een ander pad.
- **Alternatieven:** een dump in Node zelf schrijven; `MYSQL_PWD` of `-p` voor het wachtwoord; de dump aan de host overlaten met de back-up van mijn.host (die we niet kunnen testen); een eigen bestand met instellingen voor de back-up (een tweede plek voor het wachtwoord).

## De dump bewaart 14 dagen, laat de nieuwste altijd staan, en laat tabellen zonder blijvende gegevens leeg

- **Datum:** 26 oktober 2026
- **Besluit:** het opruimen rekent met de datum in de naam van het bestand (`<database>-<datum>T<tijd>Z.sql.gz`, in UTC) en niet met de datum van het bestand.
  - Het gebeurt na een dump die lukte, en een mislukte dump laat de oude dumps staan.
  - Het raakt alleen bestanden met de naam van deze database, dus andere bestanden en de dumps van een andere database blijven.
  - De nieuwste dump gaat nooit weg, ook niet als hij oud is.
  - De dump bevat van `visitor_salts`, `visitor_hashes`, `discussions`, `admin_sessions` en `admin_login_links` alleen de structuur, in een tweede aanroep van `mysqldump` met `--no-data`.
  - De opdracht weigert een map in `public_html` en een bestaande map die andere accounts kunnen lezen, en verandert de rechten van een bestaande map niet.
  - Een dump krijgt eerst de naam `….partial` en wordt pas na de controle op de regel `-- Dump completed` omgenoemd.
- **Waarom:** de naam blijft kloppen als iemand een bestand kopieert of aanraakt.
  Als cron stopt, mag het opruimen de laatste dump niet weghalen.
  Het zout en de kenmerken van de bezoekers van de dag gooit de site aan het eind van de dag weg (zie _We tellen paginaweergaven en unieke bezoekers per dag_); in de dumps zouden ze 14 dagen blijven, en met het zout zijn de kenmerken terug te rekenen naar adressen.
  De schermnaam bij een discussie vervangt de importer bij elke run (zie _We tonen de schermnaam van de laatste reageerder, als gewone tekst_), en een teruggezette sessie of inloglink zou een toegang herstellen die na de dump is ingetrokken.
  De importer vult de discussies binnen een kwartier opnieuw, en een sessie maak je door opnieuw in te loggen.
  Een map die we zelf niet maakten, zoals de thuismap, kan de site breken als we haar rechten wijzigen.
- **Alternatieven:** `--ignore-table-data`, dat alleen de `mysqldump` van MariaDB kent; alles dumpen en deze tabellen leeg laten bij het terugzetten (de gegevens zouden dan wel in het bestand staan); de rechten van een bestaande map zelf zetten.

## Een dump gaat alleen terug in een lege database

- **Datum:** 26 oktober 2026
- **Besluit:** `restore` weigert een database met tabellen, voordat hij iets schrijft, en meldt na afloop hoeveel tabellen er staan.
  De dump heeft geen `DROP TABLE` en geen `CREATE DATABASE` (`--skip-add-drop-table`, zonder `--databases`).
  Wie terugzet, maakt eerst een nieuwe lege database en wijst `DATABASE_URL` van de app daarheen.
- **Waarom:** terugzetten bovenop bestaande tabellen kan gegevens overschrijven of mengen zonder dat iemand het ziet.
  In een nieuwe database blijft de oude, kapotte staan om in te kijken.
  Zonder `CREATE DATABASE` kan de dump naar elke database, ook die met een andere naam van DirectAdmin.
- **Nadeel:** de eigenaar maakt een database en past `DATABASE_URL` op twee plekken aan (DirectAdmin en het bestand voor de import).
  Dat staat uitgeschreven in `docs/back-ups.md`.
- **Alternatieven:** de tabellen vooraf laten wegvallen (`DROP TABLE`, een fout met grote gevolgen); terugzetten in een niet-lege database met `--force` (kan half werk achterlaten).

## Een afgelopen seizoen wordt op acceptatie geïmporteerd met een workflow die je met de hand start

- **Datum:** 30 oktober 2026
- **Besluit:** een workflow `import-season.yml` draait `import.mjs --season <seizoen>` op de host, alleen met de hand gestart, met het seizoen als gecontroleerde invoer en dezelfde omgeving, geheimen en SSH-opzet als de deploy.
  - Het seizoen gaat door een reguliere expressie (`^[0-9]{4}/[0-9]{2}$`) voordat de workflow verbinding maakt, en gaat via een omgevingsvariabele naar de stappen en niet in de tekst van een opdracht.
  - De workflow draait de opdracht met de Node van cron (`/opt/alt/alt-nodejs24/root/usr/bin/node`) en het bestand met `DATABASE_URL` uit de thuismap (`~/fansite-acceptatie.env`).
  - Hij deelt de `concurrency`-groep `acceptance` met `acceptance.yml` en breekt geen draaiende run af, dus een import en een deploy draaien nooit tegelijk.
  - Zijn de geheimen er niet, dan slaat hij de import over met een melding en blijft hij groen.
- **Waarom:** een afgelopen seizoen wordt eenmalig gelezen, en over SSH met de hand is een fout met een pad of een bestand met variabelen snel gemaakt.
  Een workflow laat het logboek zien en laat niemand zijn sleutel gebruiken buiten GitHub.
- **Nadeel:** het pad van Node staat nu ook in de workflow, naast de cronjob.
  Verandert het, dan past de eigenaar het op twee plekken aan (`docs/acceptatieomgeving.md`, stap 9).
  GitHub houdt per `concurrency`-groep één wachtende run, dus een wachtende run kan door een nieuwere worden vervangen.
  Start je een import terwijl een deploy wacht, dan vervangt de import die deploy, en de samengevoegde wijziging komt dan niet op acceptatie: start de deploy dan opnieuw.
- **Alternatieven:** de opdracht met de hand over SSH draaien (kost elke keer de stappen en het pad).
  De seizoenen in de deploy meenemen (de deploy leest dan elke keer Wikipedia).
  Een tweede cronjob (leest een afgelopen seizoen steeds opnieuw, zonder reden).

## Alle afgelopen seizoenen vanaf een beginseizoen staan in één workflow en één opdracht

- **Datum:** 1 november 2026
- **Besluit:** een tweede workflow, `import-seasons.yml` (_Import seasons_), draait `import.mjs --from-season <seizoen>` op de host, met het beginseizoen als enige invoer.
  De lus zit in de opdracht (`runSeasonsImport` in `apps/importer/src/import-season.ts`) en niet in de workflow.
  - De opdracht leest elk afgelopen seizoen vanaf het beginseizoen tot en met het laatste afgelopen seizoen, het oudste eerst, één voor één.
    Hij weigert een beginseizoen dat geen seizoen is, een seizoen dat nog niet begonnen is en het lopende seizoen (dan is er niets te lezen), voordat hij Wikipedia iets vraagt of iets schrijft.
  - Alle seizoenen gebruiken dezelfde fetcher, dus de regels van `robots.txt` gelden over de hele run, en er loopt nooit meer dan één verzoek tegelijk.
  - Elk seizoen neemt de lock van de import en laat hem weer los, zodat de import van cron er tussendoor kan lopen.
  - De workflow heeft dezelfde omgeving, geheimen, SSH-opzet, controle van de invoer en `concurrency`-groep als `import-season.yml`, en een `timeout-minutes` van 30 in plaats van 10.
- **Waarom:** na een wijziging in de importer start de projecteigenaar nu zes keer dezelfde workflow, en de lus hoort bij de opdracht, waar hij een test krijgt.
- **Nadeel:** een lange import houdt de groep `acceptance` vast, dus een deploy wacht tot de import klaar is.
  Een run van één seizoen duurde 10 tot 15 seconden, dus de wachttijd is een paar minuten.
- **Alternatieven:** een matrix met een run per seizoen (de groep `acceptance` houdt één wachtende run vast, dus runs vervangen elkaar); een lus in bash in de workflow (zonder test); het bestaande `import-season.yml` met een tweede invoer (de workflow voor één seizoen blijft eenvoudig).

## Een seizoen dat mislukt stopt de run niet, en maakt hem rood aan het eind

- **Datum:** 1 november 2026
- **Besluit:** `--from-season` gaat door met het volgende seizoen na een seizoen dat niet te lezen is of waarvan de lock bezet is.
  Hij schrijft per seizoen één regel, sluit af met een samenvatting (hoeveel seizoenen zijn gelezen en welke niet, met de reden) en geeft exitcode 1 als één of meer seizoenen mislukten, anders 0.
  De database van een mislukt seizoen blijft zoals ze was.
- **Waarom:** een seizoen dat de lezer nog niet kan lezen (de seizoenen vóór 2020/21) mag de rest niet tegenhouden, en de projecteigenaar wil in één logboek zien wat ontbreekt.
- **Alternatieven:** stoppen bij de eerste fout (de rest blijft dan ongelezen).

## De eigen lijst van stadions van een club staat in `club_stadiums`

- **Datum:** 4 november 2026
- **Besluit:** een nieuwe tabel `club_stadiums` bewaart de eigen lijst van namen van het stadion van een club (#694, zie _Het beheer bewaart een eigen lijst per club, die de lijst van Wikipedia vervangt_ in `site.md`).
  Een rij heeft de club (`club_id`, met `ON DELETE CASCADE`), de plaats in de lijst (`position`, vanaf 0), de naam, de start als seizoen (`start_season`) of als dag (`start_day`), en een toelichting (`note`).
  - **De controles in de tabel:** de naam is 1 tot 100 tekens en de toelichting hoogstens 200; een start is een seizoen of een dag, nooit allebei; een seizoen heeft de vorm `2019/20`; alleen de rij op plaats 0 mag zonder start; `(club_id, position)` is uniek.
    Dat de starts oplopen en dat een dag bestaat, controleert het beheer op de server (`stadium-form.ts`), want een controle daarvoor zou de rij met zijn buren moeten vergelijken.
  - **Het logboek:** de acties `stadium.save` en `stadium.reset` met het nummer van de club als `item_id` en in `detail` alleen de aantallen, nooit de tekst van een toelichting.
    Opslaan en logboek zijn één transactie (`replaceClubStadiums` en `removeClubStadiums` in `@fansite/db/club-stadiums`), en de rij van de club is vergrendeld, zodat twee redacteuren die tegelijk opslaan hun regels niet mengen.
  - **De back-up:** de tabel gaat mee met haar rijen en staat niet in `structureOnlyTables`, want het is werk van de redactie dat we niet opnieuw kunnen lezen.
  - **De migratie:** `0038_add_club_stadiums` maakt de tabel leeg en zet geen echte gegevens: de redactie vult AZ in via het beheer.
- **Waarom:** de namen uit de wedstrijden kunnen niet zeggen waarom een club tijdelijk elders speelde, en een lijst per club is de kleinste vorm die dat kan.
  Een `position` houdt de volgorde vast die de redactie ziet, ook voor een naam die terugkomt (A, B, A), waar sorteren op de start niet genoeg is voor de eerste regel zonder start.
- **Alternatieven:** een tabel met stadions los van clubs, met een stadion dat van naam verandert of door meer clubs wordt gebruikt (#549 vroeg erom en is gesloten omdat de namen uit de wedstrijden volstonden; een lijst per club heeft zo'n tabel niet nodig); een lijst als tekst of JSON in `clubs` (geen controles in de database, en de back-up en het logboek hebben er dan geen aandacht voor).

## De namen van een club staan in `club_name_periods`, naast de schrijfwijzen in `club_names`

- **Datum:** 4 november 2026
- **Besluit:** een nieuwe tabel `club_name_periods` bewaart per club de namen die hij droeg, met een start (een seizoen of een dag) en een toelichting (#705).
  `club_names` blijft wat het is: de schrijfwijzen die de import gebruikt om een club te vinden.
  De redactie beheert de lijst in `/beheer/clubnamen`, en alleen daar (zie _De namen van een club hebben een eigen scherm_ in `site.md`).
  - **De rij en de controles:** zoals `club_stadiums` (zie _De eigen lijst van stadions van een club staat in `club_stadiums`_): `club_id` met `ON DELETE CASCADE`, `position`, de naam (1 tot 100 tekens), `start_season` of `start_day` en de toelichting (hoogstens 200 tekens), met dezelfde CHECK-constraints en `(club_id, position)` uniek.
  - **Het logboek:** de acties `club-name.save` en `club-name.reset` met het nummer van de club als `item_id` en in `detail` de aantallen (de regels, hoeveel een toelichting hebben, hoeveel namen erbij kwamen in `club_names`), nooit de tekst van een toelichting.
    Opslaan en logboek zijn één transactie (`replaceClubNamePeriods` en `removeClubNamePeriods` in `@fansite/db/club-name-periods`).
  - **De back-up:** de tabel gaat mee met haar rijen, want het is werk van de redactie dat we niet opnieuw kunnen lezen.
  - **De migratie:** `0039_add_club_name_periods` maakt de tabel leeg en zet geen echte gegevens: de redactie vult PEC Zwolle (FC Zwolle t/m 2011/12, PEC Zwolle vanaf 2012/13) en andere clubs in via het beheer.
- **Waarom:** de gegevens van Wikipedia kennen alleen schrijfwijzen, geen jaren, en kunnen een naamswijziging niet van een andere schrijfwijze onderscheiden (`N.E.C.` en `NEC`, `V.V. IJsselmeervogels` en `IJsselmeervogels`).
  Een naamswijziging met een jaar is een feit dat iemand moet opzoeken.
- **Nadeel:** een club zonder lijst heeft geen regel "Eerder" meer, en de redactie moet de lijst invullen.
- **Alternatieven:** jaren in `club_names` zetten (dat zijn schrijfwijzen voor de import, en de meeste rijen zijn geen naamswijziging); de jaren uit de wedstrijden afleiden (we zien alleen de spelling van Wikipedia, niet wanneer de naam veranderde, en voor FC Zwolle toonde Wikipedia al PEC Zwolle); een vaste lijst in de code zoals `clubFullNames` (elke naamswijziging is dan een wijziging van de code).

## Een speler is een persoon met een eigen `id`, en elke titel van zijn artikel hoort erbij

- **Datum:** 4 november 2026
- **Besluit:** de tabel `persons` heeft een rij per speler die een doelpunt maakte of in de selectie stond, van ons en van de tegenstander, met een eigen `id` dat nooit verandert (#714).
  De titel van het artikel na de doorverwijzingen is uniek op de persoon (`wikipedia_page`), met de toevoeging tussen haakjes als die er is: `Johnny Jansen (1975)`.
  `person_pages` houdt elke titel die naar het artikel verwijst bij de persoon, de titel van het artikel zelf ook, zoals `club_pages` dat voor clubs doet.
  `match_goals.person_id` en `players.person_id` wijzen naar `persons` (leeg toegestaan, `ON DELETE SET NULL`).
  De rijen van `players` blijven één per speler en seizoen.
  - **De tabellen:** `persons` heeft `id` en `wikipedia_page`; `person_pages` heeft `page` (de sleutel) en `person_id` (`ON DELETE CASCADE`).
    Beide titels staan in `utf8mb4_bin`, zodat `Alfred` en `Alfreð` twee titels zijn.
  - **`match_goals.wikipedia_page`** blijft de titel zoals de wedstrijdpagina hem schrijft.
  - **De migratie:** `0040_add_persons` voegt alleen toe (twee tabellen en twee kolommen) en kan opnieuw draaien.
    De tabellen en de kolommen zijn leeg tot de import ze vult.
    Op de host terugdraaien kan door de drie foreign keys, de twee kolommen en de twee tabellen weg te halen: dat verliest geen gegevens, want de import vult ze opnieuw.
  - **De back-up:** de tabellen gaan mee met hun rijen, want de nachtelijke dump neemt alles; ze zijn ook opnieuw te maken uit Wikipedia.
- **Waarom:** twee titels die naar hetzelfde artikel verwijzen waren twee spelers in de lijst met doelpuntenmakers, en 954 van de 976 doelpunten van ons hebben geen `player_id`, dus de titel was de enige sleutel.
  Een eigen `id` blijft gelijk als een pagina een andere titel krijgt, en een titel die doorverwijst is dezelfde persoon.
  Het onderzoek van #676 koos voor een rij per speler en seizoen en liet de tabel per persoon (keuze b) voor later; dit besluit haalt keuze b naar voren, naast `players`, zonder die rijen te veranderen.
- **Alternatieven:** de titel van het artikel als sleutel (geen nieuw nummer, maar een andere titel breekt elke verwijzing).
  Het Q-nummer van Wikidata (het stabielste, maar de `robots.txt` van Wikidata weert ons).
  `players` omvormen tot een rij per persoon (een grotere migratie, en `player_season_stats` en het koppelen per seizoen moeten mee).
- **Later:** zie ook _Een titel wordt één keer opgevraagd, en een mislukt verzoek is een waarschuwing_ in `importer.md`.
- **Later:** de rij heeft sinds #715 ook een naam in delen; zie _De voor- en achternaam komen uit de sorteersleutel van Wikipedia, en bij een gok staat dat erbij_ hieronder.

## De voor- en achternaam komen uit de sorteersleutel van Wikipedia, en bij een gok staat dat erbij

- **Datum:** 5 november 2026
- **Besluit:** de import bewaart per persoon `name`, `given_name`, `family_name_prefix`, `family_name` en `name_source` (#715).
  De bron is de sorteersleutel van het artikel (`{{DEFAULTSORT:…}}`), toegepast op de titel.
  Zonder sleutel, of als de sleutel niet op de titel past, raadt de import één keer volgens vaste regels en schrijft dat in het logboek.
  Een lijst `personNames` in de importer gaat voor.
  De site raadt niets meer (#716).
  - **De kolommen:** `name` is de titel zonder de toevoeging tussen haakjes ("Joost van Aken").
    `given_name` is leeg voor een persoon met één naam ("Dinho"), `family_name_prefix` is leeg zonder "van", "van der" en dergelijke, en `family_name` is de achternaam zonder voorvoegsel ("Aken").
    De drie delen met een spatie ertussen geven `name`.
    `name_source` is `sort_key`, `guess` of `manual`.
    Alle vijf zijn leeg tot de import ze vult.
  - **Het voorvoegsel is een eigen veld**, zodat een lijst op de rest van de achternaam kan sorteren: Joost van Aken hoort onder de A.
    Bij het tonen blijft het voorvoegsel bij de achternaam, zoals nu.
  - **De migratie:** `0041_add_person_names` voegt alleen vijf kolommen toe en kan opnieuw draaien.
    Terugdraaien op de host kan door de vijf kolommen weg te halen.
- **Waarom:** de pagina Spelers toont nu "Ramon Zomer" helemaal vet, omdat de site bij het tonen raadt en de gok faalt als de korte naam de titel is.
  De sleutel is een vaste uitspraak van de schrijvers van het artikel en staat in het artikel dat we toch al opvragen.
  Wat de import raadt, wordt één keer geraden, is zichtbaar en kan met de lijst worden verbeterd, en dat is beter dan een gok bij elk bezoek.
- **Nadeel:** een sleutel kan fout zijn, en dan is de naam fout tot iemand het in de lijst zet.
- **Alternatieven:** blijven raden bij het tonen (de huidige fout).
  Een naam zonder sleutel ongesplitst laten.
  Wikidata (voornaam en achternaam als gegevens; de `robots.txt` weert ons).
  Een vaste lijst voor alle spelers (loopt achter bij elke transfer).
  Het voorvoegsel bij de achternaam bewaren (dan kan een lijst er niet op sorteren).

## Een rij in `players` blijft een speler in een seizoen, met een bron en soms zonder positie

- **Datum:** 5 november 2026
- **Besluit:** `players` blijft één rij per speler en seizoen.
  Rijen van dezelfde speler horen bij elkaar door `person_id` (#714).
  Een rij heeft een `source` die zegt hoe volledig de bron was, en een positie die leeg mag zijn.
  - **De bronnen:** de lijst `playerSources` in `packages/db` loopt van volledig naar minder volledig: `selectie` (tabel met de hele selectie), `statistieken` (tabel van wie speelde), `engels` (selectie of transfers op de Engelse Wikipedia), `transfers`, `doelpunten` en `wikidata`.
  - **De migratie:** `0042_add_player_source` maakt `position` leeg-toegestaan en voegt `source` toe, verplicht, met `selectie` als standaard.
    Bestaande rijen krijgen `selectie`: dat zijn ze.
    Ze voegt alleen toe of verruimt, en kan opnieuw draaien.
    Terugdraaien op de host: de kolom `source` weghalen, en `position` weer verplicht maken kan alleen zolang geen rij leeg is.
  - **De pagina's:** een speler zonder positie staat niet in de lijst per positie.
    Wat de site met `source` doet, is aan latere issues (#739 en volgende).
- **Waarom:** de projecteigenaar koos dit op 5 november 2026 uit het onderzoek (#676, keuze a).
  Doelpunten en cijfers wijzen al naar `players`, en `person_id` legt de seizoenen aan elkaar.
  Een bron per rij is nodig om te zeggen hoe volledig een seizoen is.
- **Alternatieven:** een rij per persoon met een tabel voor seizoenen (een grotere migratie die `match_goals` en `player_season_stats` raakt).
  De positie verplicht houden en bij een transfer gokken (een gok is erger dan leeg).

## De volledigheid van de selectie staat in een tabel `squad_completeness`

- **Datum:** 6 november 2026
- **Besluit:** migratie `0043_add_squad_completeness` voegt een tabel toe met het seizoen als sleutel: de kans (0 tot en met 100), het niveau, het aantal spelers, de beste bron, de som van de wedstrijden en de doelpunten van de tabel (leeg als de pagina ze niet had), de controles als JSON en het moment van berekenen (UTC) (#746).
  Een seizoen zonder spelers heeft geen rij.
  - **De migratie:** ze voegt alleen een tabel toe en kan opnieuw draaien.
    De deploy volgt `docs/back-ups.md`: een dump vooraf, zoals bij elke migratie.
  - **Terugdraaien:** de tabel weghalen (`DROP TABLE squad_completeness`) verliest geen gegevens.
    De importer rekent de rijen opnieuw uit `players` en `match_goals`.
    Alleen de som van de tabel komt pas terug bij de volgende lezing van de selectie.
- **Waarom:** de site moet de kans alleen lezen, en de som van de tabel bestaat nergens anders dan tijdens het lezen (zie _De importer berekent de volledigheid en bewaart hem, de site rekent niet_ in `importer.md`).
- **Alternatieven:** kolommen in `squad_imports` (die tabel is de gezondheid van de import, en een seizoen zonder lezing heeft er geen rij).
  De kans bij elk verzoek uit `players` rekenen (de som is dan weg).

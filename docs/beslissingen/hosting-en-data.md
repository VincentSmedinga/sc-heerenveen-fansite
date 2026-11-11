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
    **Later:** een wedstrijdpagina die live is, ververst sinds 8 november 2026 elke minuut; zie _De wedstrijdpagina haalt zichzelf elke 60 seconden opnieuw op_ in `site.md`.
    Dat valt buiten deze grens;
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
- **Later:** zie _Een persoon krijgt het Q-nummer en het paginanummer van het Nederlandse artikel_.
  De titel blijft de sleutel voor de import; het Q-nummer staat er nu naast, omdat de `robots.txt` van Wikidata het item per persoon toelaat.
- **Later:** een persoon die de redactie in het beheer maakt, mag sinds 10 november 2026 zonder titel bestaan; zie _Een persoon van de redactie mag zonder Wikipedia-pagina, en `redactie` is de laatste bron van een speler_.

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
- **Later:** zie _Wikidata is de bron voor de gegevens van een persoon_ in `importer.md`.
  De naam blijft uit de sorteersleutel komen; Wikidata is nu wel bereikbaar voor andere gegevens van een persoon.
- **Later:** `name_source` kent sinds 10 november 2026 ook `redactie`, voor een naam die de redactie in het beheer invulde; zie _Een persoon van de redactie mag zonder Wikipedia-pagina, en `redactie` is de laatste bron van een speler_.

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
- **Later:** zie _Een speler van ons mist soms in `players`, een speler van de tegenstander is alleen een naam_: `playerSources` heeft sinds 7 november 2026 ook `verslag`.
- **Later:** de oude wedstrijden (1990 tot 2007) maken sinds 8 november 2026 rijen met de bron `verslag` zonder rugnummer, positie, pagina en persoon; zie _Een oude speler is een rij in `players`, nog zonder persoon_.
- **Later:** `playerSources` heeft sinds 10 november 2026 ook `redactie`, voor een speler die de redactie in het beheer toevoegt; zie _Een persoon van de redactie mag zonder Wikipedia-pagina, en `redactie` is de laatste bron van een speler_.
- **Later:** `players` heeft sinds 9 november 2026 ook `country`, de landcode van twee letters van de vlag in de selectietabel (migratie `0054_add_player_country`); zie _Het land van een speler komt als landcode uit de vlag in de selectietabel_ in `importer.md`.
- **Later:** de bron `doelpunten` krijgt sinds 10 november 2026 ook een doelpuntenmaker met een eigen pagina die de import van de wedstrijden als speler maakt; zie _Een doelpuntenmaker met een eigen pagina wordt een speler van het seizoen_ in `importer.md`.

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

## Welke clubs een kop noemt staat in een tabel `item_clubs`

- **Datum:** 6 november 2026
- **Besluit:** migratie `0044_add_item_clubs` voegt een tabel toe met een rij per kop en club: `item_id` (verwijst naar `items`, de rijen gaan weg met de kop) en `club` (de naam zoals `matches.opponent` hem heeft), samen de sleutel, met een index op `club` (#794).
  sc Heerenveen zelf staat er niet in.
  - **De migratie:** ze voegt alleen een tabel toe, begint leeg en kan opnieuw draaien.
    De deploy volgt `docs/back-ups.md`: een dump vooraf, zoals bij elke migratie.
  - **Op acceptatie:** na de deploy draait `import.mjs --item-clubs` één keer, zodat ook de koppen die al in de database staan hun rijen krijgen.
    De volgende uurlijkse import houdt ze bij.
  - **Terugdraaien:** de tabel weghalen (`DROP TABLE item_clubs`) verliest geen gegevens.
    `import:item-clubs` maakt de rijen weer uit de titels.
- **Waarom:** de kaart "Nieuws over <club>" (#777) moet de koppen van een club kunnen opvragen zonder de titels bij elke lading te doorzoeken, en een kop kan meer clubs noemen (zie _Een kop onthoudt welke clubs hij noemt, in een eigen tabel_ in `importer.md`).
- **Alternatieven:** een kolom in `items` (één club per kop).
  Een tabel die naar `clubs.id` verwijst (de importer leest de clubs bij het bewaren van koppen niet, en de naam is wat `matches.opponent` ook heeft).

## Het verslag van een wedstrijd staat in eigen tabellen, en elke minuut staat één keer

- **Datum:** 7 november 2026
- **Besluit:** de opstelling, de wissels, de kaarten en de gemiste strafschoppen van een wedstrijd staan in vijf tabellen, en de assists staan bij de doelpunten (#828).
  - `match_reports`: één rij per wedstrijd, met `status` (`bezig` of `klaar`), `opponent_complete` (de kant van de tegenstander is ook af), `source` (vrije tekst van hoogstens 100 tekens: de naam van wat we overtypen), `saved_by` en `saved_at`.
  - `match_appearances`: één rij per speler in de opstelling of op de bank, voor beide teams: `ours`, `player_id` (alleen voor onze spelers), `name` (altijd gevuld), `shirt_number`, `starter` en `captain`.
    Een speler van de bank die niet inviel, heeft alleen deze rij.
  - `match_substitutions`, `match_cards` en `match_incidents`: wie eruit en erin gaat, een kaart (`geel`, `geel-rood` of `rood`) en een gemiste of gestopte strafschop (`strafschop-gemist` of `strafschop-gestopt`, bij de nemer), elk met minuut en blessuretijd.
    Een soort kost geen tabel.
  - `match_goals` krijgt `appearance_id` (de speler die scoorde) en `assist_appearance_id` (de assist), leeg bij een doelpunt zonder verslag.
  - Er is geen kolom voor de minuten die een speler speelde.
    Ze volgen uit de wissels en de rode kaarten, zodat ze nooit afwijken van de gebeurtenissen.
- **Keuzes bij het bouwen** (7 november 2026):
  - **Wat de database afdwingt:** een wissel, een kaart en een strafschop wijzen met `match_id`, `ours` en de speler naar één rij van `match_appearances` (een samengestelde sleutel), dus naar een speler van dezelfde wedstrijd en hetzelfde team.
    De twee kolommen van `match_goals` zijn gewone foreign keys, omdat `match_goals.ours` het team van het doelpunt is en niet dat van de speler; dat de speler van dezelfde wedstrijd is, controleren de regels (`unknown-player`).
    Een rugnummer staat één keer in een team van een wedstrijd, een speler van ons één keer in een verslag, en een speler gaat één keer eruit en komt één keer binnen.
    Een speler heeft elke soort kaart één keer.
    Een minuut ligt tussen 1 en 120, en blessuretijd (1 tot en met 15) hoort bij 45, 90, 105 of 120.
  - **Wat de database niet kan:** MariaDB staat geen check toe op een kolom die een verwijderde rij op leeg zet (`player_id`, `appearance_id` en `assist_appearance_id`).
    Dat een tegenstander geen `player_id` heeft en dat een assist niet van de scorer is, controleren de regels van het verslag (zie hieronder).
  - **Wat verdwijnt waarmee:** een verslag gaat met zijn wedstrijd weg, de spelers met hun verslag en de gebeurtenissen met hun speler.
    De doelpunten van de wedstrijd blijven, zonder speler.
    Een verwijderde rij in `players` laat de speler in het verslag staan met zijn naam.
  - **De back-up:** de vijf tabellen staan niet in `structureOnlyTables`, want hun rijen zijn ons eigen werk.
  - **De migratie:** `0045_add_match_reports` voegt alleen toe en kan opnieuw draaien.
    Terugdraaien kan zonder gegevens van bestaande tabellen te verliezen: de foreign keys, de indexen en de twee kolommen van `match_goals` weghalen, dan de vijf tabellen.
- **Waarom:** de import en alle pagina's lezen `match_goals` al, en de invoer van de redactie gebruikt die tabel met een markering.
  Een tweede lijst met doelpunten zou op elke plek bijgehouden moeten worden.
  Eén bron per feit houdt een cijfer en de pagina gelijk.
- **Alternatieven:** één tabel met gebeurtenissen met veel lege kolommen (een wissel, een kaart en een doelpunt hebben elk andere velden, en de database kan dan weinig afdwingen); minuten opslaan naast de wissels (twee plekken die uit elkaar kunnen lopen).
- **Later:** zie _De formatie van een team staat in het verslag, en de regel ervoor staat bij de regels van het verslag_ (7 november 2026): #828 liet de formatie buiten het verslag, en dat deed #840 erbij.
  `match_reports` heeft sindsdien `formation_ours` en `formation_opponent`.
- **Later:** zie _De strafschoppenserie van een wedstrijd staat in een eigen tabel, en wordt gecontroleerd tegen de uitslag van de serie_ (7 november 2026): het verslag heeft sindsdien een zesde tabel, `match_shootout_kicks`, met de schoten van de serie.
- **Later:** zie _Een rugnummer mag ontbreken_ (8 november 2026): `match_appearances.shirt_number` mag sinds `0050_make_shirt_number_optional` leeg zijn, en dan telt de sleutel op wedstrijd, team en rugnummer niet voor die spelers.
- **Later:** zie _De minuut van een doelpunt of een gele kaart mag onbekend zijn, die van een rode kaart niet_ (8 november 2026): `minute` van `match_goals` en `match_cards` mag sinds `0051_make_goal_and_card_minute_optional` leeg zijn, en dan ook de blessuretijd.
  De minuut van een wissel en van een gemiste strafschop blijft verplicht, en een minuut ligt dus niet meer bij elke gebeurtenis tussen 1 en 120.

## De regels voor een verslag staan op één plek, in `packages/shared`

- **Datum:** 7 november 2026
- **Besluit:** `checkMatchReport` in `@fansite/shared/match-report` neemt een verslag met de gegevens van de wedstrijd, zonder database, en geeft de fouten en de waarschuwingen terug, elk met een code, de plek en een Nederlandse tekst (#828).
  Het beheer (#829), het plakken (#830) en de pagina (#831) gebruiken dezelfde functie.
  - **De fouten:**
    - een kant die af is, heeft precies 11 spelers in de opstelling, en rugnummers die binnen de kant verschillend zijn;
    - hoogstens één aanvoerder per kant;
    - een wissel haalt iemand eruit die op dat moment op het veld staat (in de opstelling of eerder ingevallen, nog niet gewisseld of van het veld gestuurd), en brengt iemand in van de bank die nog niet speelde;
    - niemand komt twee keer binnen of gaat twee keer eruit;
    - een kaart gaat naar iemand die op het veld staat of op de bank zit; wie een rode of geel-rode kaart kreeg, krijgt er daarna geen meer, en geel-rood volgt op precies één gele kaart;
    - wie scoort, een assist geeft of een strafschop mist, staat op dat moment op het veld; een eigen doelpunt is van een speler van het andere team dan het team dat het doelpunt krijgt;
    - een assist komt van een andere speler uit hetzelfde team als de scorer, en niet bij een strafschop of een eigen doelpunt;
    - een minuut ligt tussen 1 en 90 (45+x en 90+x zijn blessuretijd van een helft), of tussen 91 en 120 als de wedstrijd een verlenging had; de blessuretijd is 1 tot en met 15 minuten;
    - de doelpunten per kant komen samen op de uitslag, op dezelfde manier als het formulier van de wedstrijd dat nu al controleert;
    - alleen een gespeelde wedstrijd heeft een verslag.
      Later gaat dit ook op voor een wedstrijd die nog wordt gespeeld (zie de **Later:**-regel onder dit besluit).
  - **De waarschuwingen** (ze houden "klaar" niet tegen): meer dan vijf wissels van één team in de reguliere tijd, en een kant die af is met een bank van minder dan vijf spelers.
  - **Bezig en klaar:** een verslag met status `bezig` mag fouten hebben, zodat iemand het in meerdere keren kan invullen; alleen de opbouw van de gegevens moet kloppen (`blockingIssues`).
    Status `klaar` kan alleen zonder fouten.
- **Keuzes bij het bouwen** (7 november 2026):
  - Onze kant is altijd af.
    De kant van de tegenstander is af als `opponent_complete` aan staat, en dan telt voor hem alles mee.
  - Een doelpunt heeft een speler die scoorde: altijd voor onze kant, en voor de tegenstander als zijn kant af is.
    De regel staat niet in de lijst van het issue; zonder hem telt een speler te weinig doelpunten in een verslag dat "klaar" heet.
  - Binnen dezelfde minuut maakt het niet uit wat eerst kwam: wie in minuut 60 wordt gewisseld, mag in minuut 60 nog scoren, en wie in minuut 60 binnenkomt ook.
    Blessuretijd van de eerste helft (45+3) komt vóór minuut 46.
  - De regels zijn de lijst hierboven; de codes staan in `packages/shared/src/match-report.ts`.
- **Waarom:** precisie is het doel van deze bron, en een regel die op drie plekken staat, wordt op één ervan vergeten.
- **Alternatieven:** de regels in het beheer en nog eens in de database en de pagina (drie plekken om bij te houden); alles wat kan als check in de database (MariaDB kan een check niet op een kolom die op leeg gaat, en een verslag dat `bezig` is moet fouten mogen hebben).
- **Later:** zie _De strafschoppenserie van een wedstrijd staat in een eigen tabel, en wordt gecontroleerd tegen de uitslag van de serie_ (7 november 2026): de lijst van fouten en waarschuwingen hierboven heeft er sindsdien de regels van de serie bij, en `ReportMatch` de uitslag van de serie.
- **Later:** zie _Een wedstrijd die nog wordt gespeeld blijft "gepland", met een verslag dat `bezig` is_ (8 november 2026): "Alleen een gespeelde wedstrijd heeft een verslag" geldt nog voor een uitgestelde en een afgelaste wedstrijd, maar een wedstrijd met status `scheduled` mag vanaf zijn dag een verslag hebben dat `bezig` is.
  De rest van de regels blijft.

## Minuten gespeeld tellen op de klok, in hele minuten

- **Datum:** 7 november 2026
- **Besluit:** `minutesPlayed` geeft de minuten van een speler (#828).
  Wie begint en niet wordt gewisseld of weggestuurd, speelt 90 minuten (120 bij een verlenging).
  Wie erin of eruit gaat, telt van of tot de minuut op de klok; blessuretijd telt als de laatste minuut van de helft (45+2 is 45, 90+3 is 90).
  Wie in de blessuretijd van de tweede helft binnenkomt, krijgt minstens 1 minuut.
  Wie op de bank bleef, speelde 0 minuten en telt niet als optreden (`playedMatch`).
  - **Een speler die in minuut 90 invalt,** krijgt ook 1 minuut en telt als optreden.
    Dat geldt voor iedereen die binnenkomt: wie binnenkomt, heeft gespeeld.
  - **De totalen per speler** (`readPlayerReportStats`) tellen alleen verslagen met status `klaar` van gespeelde wedstrijden.
    Een eigen doelpunt telt niet als doelpunt van de speler, en een speler die niet meer in `players` staat heeft geen totaal, want zijn rijen wijzen niet meer naar hem.
- **Waarom:** de echte duur van de blessuretijd slaan we niet op, en een cijfer in hele minuten dat iedereen kan narekenen is beter dan een schatting die precies lijkt.
- **Alternatieven:** de blessuretijd meetellen (we kennen het einde niet); wie invalt in de 90e minuut 0 minuten geven (hij staat dan wel in het verslag, maar niet in de optredens).

## Een speler van ons mist soms in `players`, een speler van de tegenstander is alleen een naam

- **Datum:** 7 november 2026
- **Besluit:** `match_appearances.player_id` verwijst naar `players` van het seizoen van de wedstrijd (#828).
  `playerSources` krijgt de waarde `verslag`, achteraan de lijst, voor een speler die het beheer toevoegt omdat de selectie van Wikipedia hem nog niet heeft.
  Een speler van de tegenstander krijgt geen rij in `players` of `persons`.
  - **De migratie** zet `verslag` ook in de lijst van `squad_completeness.best_source`, want die kolom gebruikt dezelfde lijst.
    De importer kiest als beste bron de eerste uit de lijst die spelers heeft, dus `verslag` wint nooit van een echte lijst.
    Het plafond van `verslag` in `sourceCeilings` (de kans dat een lijst de hele selectie is) is 30, zoals dat van `doelpunten`: een speler uit een verslag zegt niets over de rest van de selectie.
- **Waarom:** de selectie van Wikipedia loopt achter (zie de volledigheid van de selectie, #745), en een verslag mag daar niet op wachten.
  De tegenstander heeft elk seizoen dezelfde spelers niet, en we tonen geen pagina's of cijfers van hen.
- **Later:** vult de beslissing _Een rij in `players` blijft een speler in een seizoen, met een bron en soms zonder positie_ aan: `playerSources` heeft nu `verslag` als laatste bron.
- **Later:** sinds 10 november 2026 staat `redactie` achter `verslag` in `playerSources`; zie _Een persoon van de redactie mag zonder Wikipedia-pagina, en `redactie` is de laatste bron van een speler_.
- **Later:** `verslag` wint nog steeds nooit van een echte lijst, maar is sinds 9 november 2026 wel de beste bron van een seizoen zonder andere lijst: de import van de oude site bewaart dan een rij in `squad_completeness`, en de kaart Selectie toont die spelers met de zin dat ze uit de verslagen komen (#935); zie _De importer bewaart ook de volledigheid van een seizoen met alleen spelers uit verslagen_ in `importer.md`.

## Wikipedia houdt de uitslag, het verslag houdt de rest

- **Datum:** 7 november 2026
- **Besluit:** de score, de status en de aftrap blijven van de import van Wikipedia (of van de redactie, zoals nu) (#828).
  De doelpunten van een wedstrijd met een verslag zijn die van het verslag: opslaan van een verslag zet `goals_edited`, zodat de import ze niet overschrijft, en een verschil met Wikipedia gaat naar de redacteuren zoals nu.
  De minuten, basisplaatsen, kaarten, assists en wissels bestaan alleen hier.
  - **Dit issue** legt alleen de tabellen en de lezers; het opslaan van een verslag en het zetten van `goals_edited` zijn voor het beheer (#829).
    De verzonnen wedstrijd van de seed krijgt geen rij in `match_edits`, want de import vervangt de verzonnen wedstrijden bij de eerste lezing.
- **Waarom:** de import en de mail over een afwijking werken al, en een verslag heeft meer precisie dan de lijst van Wikipedia.
  Wikipedia blijft de bron van wat zij wel heeft, met de bronvermelding van de pagina's die haar tonen.
- **Alternatieven:** de doelpunten van Wikipedia houden en die van het verslag erbij (twee lijsten die kunnen afwijken); de uitslag ook uit het verslag halen (de import en de stand per club lezen haar al).

## De formatie van een team staat in het verslag, en de regel ervoor staat bij de regels van het verslag

- **Datum:** 7 november 2026
- **Besluit:** het verslag bewaart per team een formatie, zoals `4-3-3`, in `match_reports.formation_ours` en `match_reports.formation_opponent` (#840).
  Beide mogen leeg zijn: een verslag kan klaar zijn zonder formatie.
  - **Wat een formatie is:** getallen van minstens 1 met een koppelteken ertussen, zonder spaties en zonder koppelteken aan het begin of einde, en de getallen zijn samen tien.
    De projecteigenaar koos tien, de veldspelers zonder de keeper, op 7 november 2026.
    Goed zijn `4-1-2-1-2` en `3-4-2-1`; fout zijn `4-3-4` (elf), `4--3-3`, `4-3-3-` en `4 3 3`.
  - **De regel:** `formationProblem` in `@fansite/shared/match-report` geeft een zin bij een formatie die niet klopt, en niets bij een goede of lege.
    Het formulier, het plakscherm en de regels van het verslag (`checkMatchReport`, voor de pagina van de wedstrijd) gebruiken dezelfde functie.
    `formationChoices` is de lijst met de gebruikelijke formaties.
  - **De database:** twee kolommen `varchar(20)`, leeg toegestaan, en per kolom een check die alleen de vorm vasthoudt (getallen met een koppelteken ertussen).
    Dat de getallen samen tien zijn, is een regel van het verslag en geen check, zoals bij de minuten en de aantallen in #828.
  - **De migratie:** `0047_add_report_formations` voegt alleen toe en kan opnieuw draaien.
    Bestaande verslagen krijgen geen formatie.
    Terugdraaien op de host kan zonder andere gegevens te verliezen: de twee checks en de twee kolommen weghalen, zoals de opmerking in het bestand zegt.
  - **De seed:** het verzonnen verslag heeft `4-3-3` voor sc Heerenveen en `4-4-2` voor de tegenstander.
- **Waarom:** de formatie hoort bij de opstelling van het team en niet bij een speler, en het verslag is de plek waar die ene bron voor de pagina en de cijfers staat.
  Eén functie voor de regel houdt het formulier, het plakscherm en de pagina gelijk.
- **Alternatieven:** de formatie als aparte tabel (een rij per team voor één tekst); elf als som, met de keeper (de projecteigenaar koos tien); de regel in de database als check (MariaDB rekent geen som uit een tekst).

## De strafschoppenserie van een wedstrijd staat in een eigen tabel, en wordt gecontroleerd tegen de uitslag van de serie

- **Datum:** 7 november 2026
- **Besluit:** het verslag bewaart de schoten van een strafschoppenserie in een tabel `match_shootout_kicks` (#844).
  De uitslag van de serie blijft in `penalties_for` en `penalties_against` van de wedstrijd staan, en de regels van het verslag controleren de schoten daartegen.
  - **De serie bepaalt de uitslag niet:** een verslag met een serie is alleen klaar als het aantal raak geschoten ballen per team gelijk is aan de uitslag van de serie.
    De import en alle cijfers lezen die uitslag al, en Wikipedia houdt de uitslag terwijl het verslag de rest houdt.
  - **Een serie is niet verplicht:** een bekerwedstrijd met een uitslag van de serie maar zonder bekende schoten kan toch klaar zijn.
    De pagina toont dan alleen de regel in de kop.
  - **Een schot in een serie is geen doelpunt:** het telt niet bij de doelpunten van de wedstrijd of van de speler, en niet bij de minuten.
    In de statistiek tellen strafschoppen in de serie nergens als doelpunt, en de uitslag van de wedstrijd staat zonder de serie.
- **Keuzes bij het bouwen** (7 november 2026):
  - **De tabel:** één rij per schot, met `match_id`, `ours`, `round` (1 is het eerste schot van elk team), `appearance_id` en `outcome` (`raak`, `naast` of `gestopt`).
    Een team schiet één keer per ronde (`unique` op wedstrijd, team en ronde), en de ronde ligt tussen 1 en 50.
    De speler wijst met `match_id`, `ours` en `appearance_id` naar één rij van `match_appearances`, zoals een kaart.
    De speler mag leeg zijn, voor een tegenstander wiens kant niet af is.
    Een samengestelde sleutel met een lege kolom wordt niet gecontroleerd, dus leeg kan.
    De volgorde waarin de teams schoten, bewaren we niet.
  - **De regels:** `checkMatchReport` en `blockingIssues` krijgen `shootout` in het verslag, en `ReportMatch` krijgt `penaltiesFor` en `penaltiesAgainst`.
    Fouten (alleen bij een verslag met schoten): `shootout-without-score`, `shootout-differs-from-score`, `shootout-rounds-not-in-order`, `shootout-teams-differ`, `shootout-player-twice`, `shootout-kick-without-player`, `shootout-player-other-team` en `unknown-player`.
    Waarschuwing: `shootout-player-not-on-pitch`, voor een speler die aan het einde niet op het veld stond.
    Alleen `unknown-player` is structureel: een verslag dat nog bezig is, mag de andere fouten hebben.
  - **De lezers:** `readMatchReport` en de lezers van de pagina geven `shootout` mee, op volgorde van de rondes en in een ronde ons schot voor dat van de tegenstander.
    De naam van de speler staat bij `appearances` en in `names`, zoals bij de rest van het verslag.
    `readPlayerReportStats` leest de schoten niet.
  - **Opslaan:** het formulier en het plakscherm kennen de serie nog niet (#852), dus een nieuw opslaan van het verslag bewaart de schoten van het oude verslag.
    Een schot wijst naar zijn speler op team en rugnummer, want de rijen van de spelers zijn nieuw; staat het rugnummer er niet meer, dan is het schot zonder speler en zegt de regel dat.
    Het formulier controleert de bewaarde schoten nog niet mee; de lijst met wedstrijden zegt wel "Controleer" bij een verslag dat niet meer klopt.
    **Later:** het formulier kent de serie sinds #852 en schrijft de schoten zelf; zie _De strafschoppenserie staat in het formulier van het verslag, en alleen bij een wedstrijd met een uitslag van de serie_ in `site.md`.
    Het opslaan bewaart de schoten van het oude verslag niet meer.
  - **Verwijderen en de back-up:** het verslag weghalen haalt de schoten mee weg, en een wedstrijd die verdwijnt ook.
    De tabel staat niet in `structureOnlyTables`, want de rijen zijn ons eigen werk.
  - **De migratie:** `0048_add_shootout_kicks` voegt alleen toe en kan opnieuw draaien.
    Terugdraaien kan door de tabel weg te halen; alleen de schoten gaan dan verloren.
  - **De seed:** het tweede verzonnen verslag hoort bij de bekerwedstrijd van de achtste finale, die al een verlenging en een uitslag van de serie had (4–3).
    Het heeft wissels en kaarten tot minuut 120 en tien schoten.
    Een nieuwe verzonnen wedstrijd was niet nodig en had de cijfers van de andere pagina's veranderd.
- **Waarom:** de pagina van een wedstrijd (#848, #850) toont wie schoot en wat er van kwam, en het formulier (#852) moet het kunnen invullen.
  Eén uitslag van de serie, die van de wedstrijd, houdt de import, de cijfers en het verslag gelijk.
- **Alternatieven:** de serie bepaalt de uitslag (minder typen, maar dan bezit het verslag een uitslag die de rest van de site leest); de serie verplicht stellen (dan kan een wedstrijd waarvan we de schoten niet kennen geen verslag krijgen); de schoten in `match_incidents` zetten (een schot heeft een ronde en geen minuut); de volgorde van de teams bewaren (de pagina heeft haar niet nodig).

## De wedstrijden van de oude fansite komen in `matches`, met een eigen bron, zes nieuwe competities en een tabel voor de statistieken

- **Datum:** 7 november 2026
- **Besluit:** de database kan de wedstrijden van 1990 tot 2007 uit de database van de oude fansite bewaren (#873).
  - **Zes nieuwe competities, met de namen van toen:** de lijst `competitions` krijgt `Eerste divisie` (1991/92 en 1992/93), `Champions League` (2000/01), `Europacup II` (1998/99), `UEFA Cup` (2002/03 tot en met 2006/07), `Intertoto Cup` (1995 tot en met 2003) en `Play-offs UEFA Cup` (2005/06, tegen Roda JC en FC Twente).
    De codes zijn gelezen uit de tegenstanders en de data (#875): code 5 is de Intertoto Cup en niet de UEFA Cup, want die wedstrijden zijn in juni en juli.
    Verlenging kan bij elke competitie behalve `Eredivisie` en `Eerste divisie`.
    `statsCompetitions` blijft zoals hij is.
  - **Elke wedstrijd weet uit welke bron hij komt:** `matches.data_source` is `wikipedia` of `oude-fansite`, niet leeg, met `wikipedia` als standaard.
    De import van Wikipedia leest, schrijft en haalt alleen weg waar de bron `wikipedia` is.
    Komt een wedstrijd van Wikipedia op dezelfde sleutel (seizoen, competitie, ronde) als een rij van de oude fansite, dan slaat de import hem over en meldt dat.
  - **Een oude wedstrijd mag een datum zonder tijd hebben:** voor de bron `oude-fansite` mogen `kickoff_at` en `date_text` allebei leeg zijn.
    Voor `wikipedia` blijft de eis staan.
  - **Hoekschoppen, buitenspel en overtredingen staan in een eigen tabel:** `match_statistics` heeft per wedstrijd één rij, alleen als ten minste één van de zes cijfers boven 0 is (0-0-0 betekent in de oude database "niet bekend").
  - **Oefenwedstrijden komen niet in de database.**
    Ze gaan naar een Markdown-bestand (#875).
- **Keuzes bij het bouwen** (8 november 2026):
  - **De migratie:** `0049_add_old_fansite_matches` voegt alleen toe en kan opnieuw draaien.
    Ze haalt de twee checks van `matches` weg en zet ze terug, want beide veranderen.
    Terugdraaien staat in de kop van het bestand.
  - **De statistieken:** de tabel staat niet in `structureOnlyTables`, want deze cijfers staan nergens anders.
    Er is nog geen lezer en geen pagina.
  - **Wat al op de competitie schakelt:** de beheerders-formulieren (`match-form.ts`) laten verlenging toe bij elke competitie behalve de twee competities in de lijst, net als de check.
    De kaarten van Uitslagen (`matchShortcuts.ts`) hebben een eigen anker voor elke nieuwe competitie.
    De namen in de bijschriften van de cijfers (`competitionNames`) en de keuze tussen alle wedstrijden en alleen de competitie laten de nieuwe waarden bewust ongemoeid: de site toont de oude wedstrijden pas na #874.
  - **De andere lezers van de import:** de controle op een lege bekerpagina en de vraag of een seizoen play-offs heeft, tellen alleen wedstrijden van Wikipedia.
- **Waarom:** een wedstrijd heet zoals hij toen heette, want de Europa League bestond nog niet.
  Wikipedia vult later aan wat de oude database mist (#414), en geen van beide imports mag de rijen van de ander wijzigen of weghalen.
  Een datum als "25 augustus 1990" in `date_text` zou een wedstrijd laten lijken alsof de aftrap nog moet worden aangekondigd, terwijl 12 wedstrijden de tijd `00:00` hebben, wat "onbekend" betekent.
  Een eigen tabel houdt `matches` smal, en de import van Wikipedia en de formulieren van de redactie schrijven die tabel zonder dit te weten.
- **Alternatieven:** alles onder een naam "Europees voetbal" zetten (dan verdwijnt het verschil tussen een zomertoernooi en de UEFA Cup); de bron afleiden uit het seizoen (breekt zodra Wikipedia een oud seizoen aanvult); een tekst als "25 augustus 1990" in `date_text` zetten; zes kolommen op `matches`; de cijfers niet bewaren.

## Een rugnummer mag ontbreken

- **Datum:** 8 november 2026
- **Besluit:** `match_appearances.shirt_number` mag leeg zijn (#871).
  De oude fansite bewaarde geen rugnummers, en een verzonnen nummer zet een onwaarheid in de database.
  - **De opslag:** de kolom is niet meer verplicht, en de migratie `0050_make_shirt_number_optional` verandert alleen dat.
    De sleutel op wedstrijd, team en rugnummer blijft: MariaDB telt lege waarden niet als gelijk, dus een team kan meer spelers zonder nummer hebben, en twee spelers met hetzelfde nummer blijven onmogelijk.
    De check van 1 tot en met 99 laat een leeg nummer door.
    Terugdraaien kan alleen als geen rij een leeg nummer heeft; de migratie zegt hoe, en kan opnieuw draaien.
  - **De regels:** `shirtNumber` van een speler is `number | null` in `@fansite/shared/match-report`.
    `shirt-number-out-of-range` en `shirt-number-twice` slaan een leeg nummer over, en een leeg nummer geeft geen fout of waarschuwing.
  - **Het formulier:** een leeg veld geeft de speler van de selectie zijn eigen nummer, en iedereen anders geen nummer.
    Een verkeerd nummer (geen getal, 0 of boven 99) blijft een fout.
    Het plakscherm leest een regel onder `Opstelling` of `Bank` zonder getal vooraan als een speler zonder rugnummer.
    Een speler zonder rugnummer heeft in de rest van de tekst en in de serie van strafschoppen zijn naam als aanwijzing.
  - **De pagina:** het vlak van de speler (`PlayerDisc`) blijft, zonder cijfer, met hetzelfde contrast.
    De zin voor een schermlezer heeft de naam en niets over het rugnummer, en de lijst onder het veld heeft geen kolom voor rugnummers als niemand er een heeft.
  - **Een beperking:** een speler van de selectie met een eigen rugnummer die in een bewaard verslag geen nummer heeft, krijgt bij het opnieuw opslaan het nummer van de selectie.
    Het formulier kan geen leeg nummer onderscheiden van het nummer van de selectie.
  - **De seed:** het tweede verzonnen verslag heeft vier spelers van ons zonder rugnummer, twee in de basis en twee op de bank, zodat de pagina, de toegankelijkheidscontrole en de screenshots het tonen.
- **Waarom:** de opstellingen in de database van de oude fansite (566 wedstrijden) hebben geen rugnummers, en een verslag eiste er een voor elke speler.
  Zo kunnen ze later zonder verzonnen nummers worden geïmporteerd (#879).
- **Alternatieven:** de nummers verzinnen, bijvoorbeeld de volgorde in de opstelling; de oude opstellingen niet importeren.

## De minuut van een doelpunt of een gele kaart mag onbekend zijn, die van een rode kaart niet

- **Datum:** 8 november 2026
- **Besluit:** de minuut van een doelpunt en van een gele kaart mag leeg zijn (#872).
  De oude fansite kende de minuut van 4 van de 1.771 doelpunten, 793 van de 1.386 gele kaarten en 8 van de 88 rode en geel-rode kaarten niet, en een verzonnen minuut zet een onwaarheid in de database.
  Een rode of geel-rode kaart bepaalt de speelminuten van een speler, dus daarvan blijft de minuut verplicht.
  - **De opslag:** `minute` van `match_goals` en `match_cards` is niet meer verplicht (migratie `0051_make_goal_and_card_minute_optional`).
    De check van 1 tot en met 120 laat een lege minuut door, omdat een check alleen faalt op onwaar.
    Drie checks komen erbij of veranderen: blessuretijd hoort alleen bij een minuut (`match_goals_stoppage_needs_minute`, en `match_cards_stoppage_range` voor een kaart), en een kaart die niet geel is, heeft een minuut (`match_cards_red_needs_minute`).
    Een wissel, een gemiste strafschop en een schot van de serie houden hun verplichte minuut.
    Terugdraaien kan alleen als geen doelpunt of kaart een lege minuut heeft; de migratie zegt hoe, en kan opnieuw draaien.
  - **De regels:** in `@fansite/shared/match-report` is de minuut van een doelpunt en van een kaart `number | null`.
    `checkTime` slaat een lege minuut over, en de regels die de klok nodig hebben slaan zo'n gebeurtenis over: een kaart na het verlaten van het veld, een speler of een assist die niet op het veld staat.
    Een gele kaart zonder minuut telt als eerder dan de geel-rode kaart van dezelfde speler.
    Een rode of geel-rode kaart zonder minuut is de fout `red-card-without-minute`, en blessuretijd zonder minuut is `stoppage-without-minute`.
    Beide kan de database niet opslaan, dus ze houden ook een verslag dat `bezig` is tegen (`unstorable`).
    `minutesPlayed` leest alleen wissels en rode kaarten, en verandert niet.
  - **De volgorde:** een doelpunt en een kaart zonder minuut staan na die met een minuut, in de volgorde van `id`.
    Dat geldt voor `readMatchReport`, de doelpuntenlijsten en de wedstrijdpagina.
  - **De pagina van de wedstrijd:** de tijdlijn heeft een blok _Minuut onbekend_ onder de helften, alleen als een gebeurtenis het nodig heeft, met een streepje in plaats van de minuut.
    Een schermlezer slaat het streepje over en hoort het team, de soort gebeurtenis en de speler.
    De lijst van doelpuntenmakers, de regel van een speler op het veld en de wissels laten de minuut weg.
    De balk van het wedstrijdverloop komt niet, want een doelpunt zonder plek haalt de uitslag niet.
    Een doelpunt zonder minuut telt wel mee voor de uitslag, de topscorers, de hattricks en de strafschoppen.
  - **De statistieken:** de tellingen per kwartier, de late doelpunten en het vroegste en laatste doelpunt slaan een doelpunt zonder minuut over, zoals ze al een minuut deden die niet gespeeld kan worden (0).
    Het verloop van de wedstrijd (wie scoorde eerst, de stand bij de rust) en een wedstrijd waarin we terugkwamen, hebben de volgorde van de doelpunten nodig, dus een wedstrijd met zo'n doelpunt telt daar niet mee.
  - **Het beheer:** het formulier van een wedstrijd en dat van een verslag laten de minuut van een doelpunt en van een gele kaart leeg, en bewaren hem als leeg.
    Het formulier van het verslag vraagt wel een minuut voor een rode of geel-rode kaart, een wissel en een gemiste strafschop.
    Het plakscherm leest een vraagteken als minuut, zoals `? geel Jansen`.
    De voorvertoning toont zo'n doelpunt en zo'n kaart in het blok _Minuut onbekend_.
    `before_goals` in `match_edits` neemt de lege minuut mee.
  - **De seed:** het tweede verzonnen verslag, de bekerwedstrijd in de achtste finale, heeft een gele kaart van de tegenstander en een doelpunt van de tegenstander zonder minuut.
- **Waarom:** de import van de oude wedstrijden (#878 en #879) hoeft zo niets te verzinnen, en de kaarten per speler kloppen.
  Een rode kaart zonder minuut zou de speelminuten van een speler onbekend maken.
- **Alternatieven:** kaarten zonder minuut overslaan (verliest 793 gele kaarten, dus de kaarten per speler kloppen niet); minuut 1 of 0 als plaatsvervanger (valse gegevens); de balk van het wedstrijdverloop toch tonen met de doelpunten die een minuut hebben (de balk zou niet bij de uitslag passen); een doelpunt zonder minuut in de tweede helft zetten (dat zegt iets wat niemand weet).

## Een oude speler is een rij in `players`, nog zonder persoon

- **Datum:** 7 november 2026
- **Besluit:** voor elke speler van ons die in een doelpunt, een assist (met een code) of een opstelling van de oude wedstrijden voorkomt, zoekt of maakt de import één rij in `players` voor het seizoen van de wedstrijd (#878).
  De sleutel is seizoen en naam.
  De rij heeft de bron `verslag`, `in_squad` waar en `left_squad_at` leeg (zoals een afgelopen seizoen bij `import-past-squad`), en geen rugnummer, positie, `wikipedia_page` en `person_id`.
  Het koppelen aan een persoon (een Wikipedia-titel, met de geboortedatum uit de oude tabel `speler` om spelers met dezelfde naam uit elkaar te houden) is een apart issue na dit werk.
  - **De naam** is voornaam, tussenvoegsel en achternaam uit het bestand, met enkele spaties.
    `search_term` is tussenvoegsel plus achternaam (`van Aken`), zoals bij Wikipedia.
  - **Een rij die er al is** voor dat seizoen en die naam (zonder accenten en hoofdletters), van welke bron ook, wordt gebruikt zoals ze is.
    De stap wijzigt nooit een bestaande rij, dus een speler uit de selectie van Wikipedia houdt zijn positie, rugnummer en pagina.
  - **Een code zonder rij in de oude tabel `speler`** in de vorm `voornaam.achternaam` (`ivan.tzvekov`) wordt een speler met de naam uit de code (`Ivan Tzvekov`) en staat als regel in het logboek, voor het controleverslag (#880).
  - **Een code met een spatie** (`X. Alberts`) is de naam van een speler van de tegenstander, die de oude redactie in het veld voor de code typte.
    Zo iemand krijgt geen rij.
  - **Een assist met een gewone naam** (`Dennis de Nooijer`) maakt in deze stap geen speler: het bestand zegt niet of het een speler van ons of van de tegenstander is.
    Dat doet #879 met de opstellingen.
    De kaarten maken ook geen spelers, want elke speler met een kaart staat in een opstelling en de coach is geen speler.
- **Waarom:** doelpunten, kaarten en minuten hangen dan aan een speler van ons, terwijl `persons` een echte Wikipedia-pagina vraagt (`wikipedia_page` is verplicht en uniek).
  De stap maakt 427 rijen voor 17 seizoenen.
  - **Later:** de stap `personen` koppelt die rijen sinds 9 november 2026 aan een persoon, maar zonder geboortedatum uit de oude tabel; zie _De spelers van de oude fansite worden alleen bij zekerheid personen_ in `importer.md`.
- **Alternatieven:** alleen namen (niets over eigen spelers uit 1990 tot 2007 is dan per speler te tellen); `persons` met een verzonnen titel.

## Een persoon krijgt het Q-nummer en het paginanummer van het Nederlandse artikel

- **Datum:** 8 november 2026
- **Besluit:** `persons` krijgt `wikidata_id` (uniek, leeg toegestaan) en `wikipedia_page_id`, beide leeg tot de importer de persoon uit Wikidata heeft gelezen (#898).
  De titel blijft de sleutel voor de import.
  Twee personen met hetzelfde Q-nummer kunnen niet: de eerste houdt het, de tweede blijft leeg en de run waarschuwt.
- **Waarom:** het Q-nummer is de stabiele sleutel naar Wikidata en over talen heen, en het paginanummer komt uit hetzelfde verzoek.
- **Alternatieven:** alleen het Q-nummer; alleen het paginanummer (geeft geen weg naar Wikidata).

## Meer waarden staan in een tabel, labels in `wikidata_items`

- **Datum:** 8 november 2026
- **Besluit:** nationaliteiten en posities staan in `person_nationalities` en `person_positions`, elk met `person_id`, `item_id` en `position` (de volgorde van Wikidata, vanaf 0), en gaan weg met hun persoon.
  De namen van landen, plaatsen en posities staan één keer in `wikidata_items` (het Q-nummer en het label), en `persons.birth_place_id` wijst daarheen.
  De migratie `0052_add_wikidata_to_persons` voegt alleen toe en kan opnieuw draaien.
- **Waarom:** je kunt zo filteren ("alle Nederlanders") zonder JSON te lezen, en de API van Wikidata, die labels van meerdere items tegelijk geeft, is geweigerd.
- **Nadeel:** een label wordt niet ververst; een land dat van naam verandert, houdt zijn oude naam tot iemand de rij aanpast.
- **Alternatieven:** een JSON-kolom (korter, maar niet te doorzoeken).

## Een geboortedatum heeft een precisie

- **Datum:** 8 november 2026
- **Besluit:** `birth_date` heeft `birth_date_precision` (`day`, `month` of `year`) naast zich.
  Bij een maand of een jaar staat de eerste van die maand of van dat jaar in `birth_date`.
  De datum van een levende speler is een persoonsgegeven: hij blijft in de database en de site toont hem pas na een eigen besluit.
- **Waarom:** Wikidata kent bij oudere spelers soms alleen het jaar, en 1 januari zou een verzonnen dag zijn.
- **Alternatieven:** een jaarkolom naast de datum.
- **Later:** sinds 11 november 2026 toont de pagina van een speler alleen het geboortejaar (#1079); zie _De pagina toont het geboortejaar en de geboorteplaats, niet de geboortedatum_ in `site.md`.

## Een wedstrijd die nog wordt gespeeld blijft "gepland", met een verslag dat `bezig` is

- **Datum:** 8 november 2026
- **Besluit:** een wedstrijd met een verslag dat nog wordt ingevuld terwijl hij wordt gespeeld, blijft `scheduled` in `matches`, zonder uitslag (#906).
  - **Wanneer:** vanaf de dag van de wedstrijd (Nederlandse tijd) mag een wedstrijd met status `scheduled` een verslag hebben, tot hij `played` is (`mayHaveReport` in `@fansite/db/match-reports`).
    Voor een wedstrijd van een latere dag, een uitgestelde en een afgelaste wedstrijd blijft het zoals het was.
  - **De regels:** `checkMatchReport` laat voor een `scheduled` wedstrijd de regel "alleen een gespeelde wedstrijd" los.
    Een verslag dat `klaar` is, krijgt daar de fout `match-not-finished` ("De wedstrijd is nog niet afgelopen"), die niet structureel is, dus het verslag wordt als `bezig` bewaard.
    De regel dat de doelpunten optellen tot de uitslag telt pas als de wedstrijd een uitslag heeft, zoals hij al deed (zonder uitslag slaat hij over).
  - **De doelpunten** van zo'n wedstrijd staan in `match_goals`, gemarkeerd als die van de redactie (`goals_edited`), maar tellen nergens mee: `withGoals` in `queries.ts` leest alleen de doelpunten van een gespeelde wedstrijd, en `readPlayerReportStats` en `findReportGoalDifferences` namen al alleen gespeelde wedstrijden.
    De lijsten, de topscorers, de standen en de cijfers veranderen dus niet door een tussenstand.
  - **Wanneer "Live":** `phaseOf` zegt `live` vanaf de aftrap (zonder bekende aftrap: vanaf de dag), en `upcoming` ervoor.
    Een wedstrijd met status `played` heeft geen fase, ook niet met een verslag dat `bezig` is.
  - **De knop "Wedstrijd afgelopen"** (`finishMatch` in `apps/site/src/beheer/match-reports.ts`) zet de uitslag uit de bevestigde stand, de status op `played` en `result_set_at` op het moment, als invoer van de redactie (`result_edited` in `match_edits`) met een regel `match.edit` in het logboek.
    Het verslag blijft `bezig`.
    Is de wedstrijd al `played` (de import was eerst), dan schrijft de knop niets.
  - **Geen migratie:** de tabellen hadden niets dat een verslag aan de status koppelde.
- **Waarom:** een tussenstand in `matches` komt in elke lijst en elk cijfer, en de import van Wikipedia zou na elk doelpunt een verschil melden.
  De uitslag uit de doelpunten van het verslag is de eindstand die bezoekers meteen willen zien, en de import loopt uren tot dagen achter.
- **Alternatieven:** de wedstrijd meteen op `played` zetten met een lopende uitslag; de eindstand zelf intikken in plaats van uit de doelpunten te nemen; een eigen kolom `live` of een eigen tabel voor een lopende stand (meer om bij te houden, en de import kent hem niet).

## Een persoon van de redactie mag zonder Wikipedia-pagina, en `redactie` is de laatste bron van een speler

- **Datum:** 10 november 2026
- **Besluit:** `persons.wikipedia_page` mag leeg zijn, voor een persoon die de redactie in het beheer maakt voor een speler zonder artikel (#1020).
  Zo'n persoon heeft alleen een naam, met `name_source` `redactie`, en geen rij in `person_pages`.
  - **De bronnen:** `playerSources` krijgt `redactie`, achteraan de lijst, en `personNameSources` krijgt `redactie`.
    De importer kiest als beste bron de eerste uit de lijst die spelers heeft, dus `redactie` wint nooit van een lijst van Wikipedia of van `verslag`.
    Het plafond van `redactie` in `sourceCeilings` is 30, zoals dat van `verslag`.
  - **De importer:** wat hij per titel leest, slaat een persoon zonder titel over: `createPersonBook`, `personNamesBySource`, `personsToRead` en `similarPersons`.
    Hij vraagt Wikidata dus nooit naar zo'n persoon.
  - **Eén weg naar een persoon:** het beheer maakt en vindt een persoon met `findOrAddEditorsPerson` in `@fansite/db/persons`, dat voor een titel `createPersonBook` gebruikt.
    Een titel die al bij een persoon hoort, maakt dus geen tweede persoon.
  - **Het logboek:** `audit_log.action` krijgt `player.add`, `player.edit` en `player.remove`, met het nummer van de speler in `item_id`.
  - **De migratie:** `0061_add_players_of_the_editors` verruimt alleen en kan opnieuw draaien.
    De unieke sleutel op `wikipedia_page` blijft: MariaDB laat onder zo'n sleutel meer dan één lege waarde toe.
    Terugdraaien kan zolang geen rij een nieuwe waarde of een lege titel heeft; de opdrachten om dat te tellen staan bovenaan het bestand.
- **Waarom:** de projecteigenaar besloot op 9 november 2026 dat de redactie een speler zonder pagina kan toevoegen, met een persoon eronder (#1020).
  De titel was tot nu toe de sleutel van een persoon, en een speler zonder artikel heeft er geen.
  Met `redactie` achteraan blijft de kaart Selectie doen wat ze deed: spelers uit de verslagen verbergt ze alleen als een betere bron het seizoen heeft.
- **Nadeel:** code die een persoon bij zijn titel zoekt, moet een lege titel overslaan.
  Vult de redactie een titel in die een doorverwijzing is, dan kan de importer later een tweede persoon maken voor het echte artikel; samenvoegen kan met #1027.
- **Alternatieven:** de naam als titel bewaren, zoals bij een rode link (de importer zou bij Wikidata het artikel van een naamgenoot lezen).
  Een eigen tabel voor personen van de redactie (twee soorten personen, en `players.person_id` zou naar twee tabellen moeten wijzen).
  `redactie` vóór `verslag` in de lijst (een seizoen met spelers uit de verslagen en één speler van de redactie zou op de kaart alleen die ene tonen).

## De kopie van acceptatie krijgt haar verzonnen adressen al op de host

- **Datum:** 10 november 2026
- **Besluit:** `backup.mjs export` stuurt een dump over SSH naar de lokale database, met verzonnen adressen in `admin_users` en zonder rijen in de tabellen met sessies, inloglinks, inlogpogingen, bezoekers en discussies.
  - Een lijst in `packages/db/src/export-plan.ts` zegt van elke tabel van het schema wat de export ermee doet, en een test vergelijkt de lijst met het schema.
  - De export vraagt `mysqldump` om elke tabel bij naam, en stopt als de database een tabel heeft die niet in de lijst staat of als `admin_users` een kolom heeft die de lijst niet kent.
  - De rijen van `admin_users` schrijft de export zelf, uit een query die om het verzonnen adres vraagt; het echte adres leest hij niet.
- **Waarom:** zo komt geen echt adres op de computer van de projecteigenaar, ook niet even.
  Er is geen tussenbestand dat kan blijven liggen of per ongeluk in een commit of een screenshot belandt.
  Een lijst van wat wel mee mag, faalt veilig: een tabel die niemand heeft bekeken, houdt de export tegen in plaats van dat ze meegaat.
- **Alternatieven:** de laatste nachtelijke dump downloaden, laden, de adressen lokaal vervangen en het bestand weghalen.
  Dat is eenvoudiger, maar de echte adressen staan dan even op de schijf.
  Of een lijst van wat niet mee mag, zoals bij de nachtelijke dump (een nieuwe tabel met persoonsgegevens gaat dan mee tot iemand eraan denkt).

## Alleen de projecteigenaar haalt de kopie op

- **Datum:** 10 november 2026
- **Besluit:** `pnpm db:pull-acceptance` draait de projecteigenaar.
  Agents bevragen de kopie alleen, noemen haar leeftijd en vragen om een nieuwe als ze te oud is.
- **Waarom:** de opdracht gebruikt de SSH-sleutel van de host, en agents hebben geen toegang tot de host.
- **Alternatieven:** agents laten verversen; dat is sneller, maar geeft ze toegang tot de host.

## De kopie heeft één verzonnen account om lokaal in te loggen

- **Datum:** 10 november 2026
- **Besluit:** de opdracht zet `beheer@example.test` met de rol `beheerder` in de kopie.
- **Waarom:** dan kun je het beheer op echte gegevens bekijken zonder een echt adres.
- **Alternatieven:** alleen query's, zonder inloggen; met `admin:create` zelf een account maken.

## De kopie heet `fansite_acc`, en geen werkmap mag die naam krijgen

- **Datum:** 10 november 2026
- **Besluit:** de lokale database heet `fansite_acc`.
  `scripts/worktree-env.js` weigert een werkmap die op die naam uitkomt, en `pnpm worktree:db:drop` laat haar staan.
  De opdracht laadt alleen in `fansite_acc`, en alleen op een server op de eigen computer.
- **Waarom:** de naam past bij de andere databases.
  Een werkmap met de naam `acc` zou anders de kopie als testdatabase gebruiken en leegmaken.
- **Alternatieven:** een naam buiten het voorvoegsel `fansite_`, zoals `acceptance_copy`.

## De tijd van de kopie staat in de kopie zelf

- **Datum:** 10 november 2026
- **Besluit:** een kleine tabel buiten het schema van de site, `acceptance_copy`, bewaart de tijd van de dump en van het laden, in UTC, en de opdracht toont die.
  De export schrijft de tabel als laatste, met daarna de regel `-- Export completed`; zonder die regel weigert de opdracht de kopie en haalt hij haar weg.
- **Waarom:** elke sessie die de kopie bevraagt, leest dan hoe oud de gegevens zijn, zonder een bestand ernaast.
  Een dump die halverwege stopt, mag niet op een hele kopie lijken.
- **Alternatieven:** een bestand naast de repository; alleen de uitvoer van de opdracht.

## De kopie laadt met de client uit de container van Docker

- **Datum:** 10 november 2026
- **Besluit:** `pnpm db:pull-acceptance` geeft de dump aan `mariadb` in de container van `docker compose`, tenzij `MYSQL_COMMAND` een eigen client noemt.
  Daarna leest de opdracht de tabel `acceptance_copy` terug uit de database van `DATABASE_URL`, en stopt hij als die er niet is.
- **Waarom:** de computer van de projecteigenaar heeft geen `mysql` of `mariadb`, en de container is er al voor de lokale database.
  De controle achteraf vangt een client die in een andere server laadt.
- **Alternatieven:** een client laten installeren (een stap meer voor één opdracht); de dump zelf in statements knippen en met `mysql2` laden (een eigen parser voor wat de client al kan).

## Het vorige rugnummer en de dag van de wissel zijn twee kolommen met een controle

- **Datum:** 11 november 2026
- **Besluit:** migratie `0070_add_previous_shirt_number` voegt `players.previous_shirt_number` en `players.shirt_number_from` toe (#1076).
  Beide zijn leeg voor elke rij die er al is.
  Een controle in de database eist dat ze allebei ingevuld of allebei leeg zijn, en dat het vorige nummer van 1 tot en met 99 is.
  De migratie voegt alleen toe en kan opnieuw draaien (`IF NOT EXISTS`).
- **Waarom:** een nummer zonder dag, of een dag zonder nummer, zegt niets, en de database is de laatste plek waar dat kan worden tegengehouden.
  Een bestaande database met gegevens verandert niet: geen rij krijgt een waarde.
- **Alternatieven:** de paring alleen in het formulier controleren (de importer en de seed omzeilen het); een eigen tabel met nummers per periode (zie _De selectie onthoudt één vorig rugnummer met de datum van de wissel_ in `site.md`).

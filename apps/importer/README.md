# @fansite/importer

De importer haalt koppen en links op bij de bronnen.
Hij bevat de fetcher, de ene HTTP-client voor alle adapters, en de adapter voor RSS- en Atom-feeds, met de Leeuwarder Courant als eerste bron.
Op acceptatie start cron de import elke 15 minuten (zie _De import op acceptatie_).
Het rooster per soort bron, een slot in de database en de gezondheid van een bron komen met #13.

## De import draaien

Zet in de root `.env` klaar, start de database en zet de bronnen erin (zie de [README van `@fansite/db`](../../packages/db/README.md)).
Draai dan, vanuit de root:

```sh
docker compose up -d --wait
pnpm db:migrate
pnpm db:seed
pnpm run import
```

Schrijf `pnpm run import` en niet `pnpm import`: `import` is een opdracht van pnpm zelf, die een lockfile van npm of yarn omzet.

De opdracht leest elke feed van elke bron die aanstaat (`sources.enabled`), één voor één, met één fetcher.
Hij schrijft per feed één regel, en per bericht dat hij overslaat een regel erbij:

```text
https://www.lc.nl/sport/sc-heerenveen/rss/: 3 new, 1 updated, 46 unchanged, 1 skipped
  item 12 skipped: the link does not start with http or https
```

- **new**: berichten die de bron nog niet had.
- **updated**: berichten die we kenden en waarvan de kop, de link, de tijd of de betaalmuur veranderde.
- **unchanged**: berichten die we kenden en die hetzelfde waren.
- **skipped**: berichten die we niet bewaren, met de reden.

Een feed die niet gelezen wordt, krijgt ook een regel:

- niet gewijzigd sinds de vorige keer (`ETag` of `Last-Modified`);
- `robots.txt` staat het niet toe;
- de bron vraagt om te wachten (429 of 503);
- een fout, met de reden.

Een feed die faalt, stopt de andere feeds niet.
De opdracht stopt met exitcode 1 als een feed een fout gaf: de bron geeft een foutstatus of iets wat geen feed is, of de database weigert iets.
Een feed die niet gewijzigd is, die `robots.txt` weigert of die om wachten vraagt, is geen fout van ons en geeft exitcode 0.
Gebruik `DATABASE_URL` uit `.env`; zonder die variabele stopt de opdracht met een melding.

## Wat de adapter bewaart

Per bericht bewaart hij de kop, de link, een sleutel per bron, de tijd van publicatie, of het bericht achter de betaalmuur staat, en wanneer we het voor het eerst en het laatst zagen (tabel `items`).
Een intro, een afbeelding, een auteur of een categorie bewaart hij niet, ook niet als de feed ze heeft: geen bron heeft daar nu toestemming voor (principe 2 van de Redactie).
Een kolom daarvoor komt met de eerste bron die het wel mag.
Per feed bewaart hij het adres en de `ETag` en `Last-Modified` van de laatste keer (tabel `feeds`).
Een bericht dat uit de feed verdwijnt, blijft staan; `last_seen_at` laat zien wanneer we het het laatst zagen.

Zo komt een bericht in de database ([`src/read-feed.ts`](src/read-feed.ts)):

- **Formaat:** RSS 2.0 en Atom, gelezen met `feedsmith`.
  Een feed in een ander formaat, of tekst die geen feed is, geeft een fout.
  Is de XML niet goed gevormd, bijvoorbeeld omdat de feed halverwege stopt, dan bewaren we niets uit die feed.
- **Tekenset:** die van de `Content-Type`, anders die van de XML-verklaring, anders UTF-8.
- **Kop:** als tekst.
  Tags gaan eruit, HTML-entiteiten worden tekens (eenmaal), en witruimte wordt één spatie.
  Een pagina maakt de tekst veilig als hij hem toont.
- **Link:** moet met `http` of `https` beginnen en mag geen gebruikersnaam of wachtwoord hebben.
  Een bericht zonder bruikbare link slaat de adapter over.
- **Sleutel:** de `guid` (RSS) of de `id` (Atom), zoals de bron hem schrijft, of anders de link.
  Hij is uniek per bron en hoofdlettergevoelig.
  Een bericht dat al een sleutel heeft die eerder in dezelfde feed stond, slaat de adapter over.
- **Tijd:** `pubDate` (RSS) of `published` (Atom, anders `updated`), omgezet naar UTC, op hele seconden.
  Een tijd zonder zone, in een vorm die we niet kennen, van vóór 1990 of meer dan een dag in de toekomst is niet geldig.
  Dan geldt de tijd waarop we het bericht voor het eerst zagen, en een bekend bericht houdt de tijd die het had.
- **Betaalmuur:** het element `<premium>true</premium>` van de Leeuwarder Courant.
  `feedsmith` leest elementen die het niet kent niet, dus een tweede lezing met `fast-xml-parser` zoekt dit ene element.
  Een feed zonder dat element heeft geen betaalmuur.
- **Te lang:** een kop van meer dan 500 tekens, een link van meer dan 2048 of een sleutel van meer dan 700 slaat de adapter over, in plaats van hem af te kappen.
- **Bijwerken:** een nieuw bericht komt erbij.
  Een bekend bericht krijgt de nieuwe kop, link, tijd en betaalmuur als de bron die veranderde.
  We bewaren geen eerdere koppen.
- **ETag en Last-Modified:** de adapter bewaart ze in dezelfde transactie als de berichten.
  Lukt het bewaren of lezen niet, dan blijven de oude waarden staan en vraagt de volgende run de hele feed opnieuw.
  Is de feed niet gewijzigd, dan doet de adapter verder niets.
  De Leeuwarder Courant stuurt geen van beide, dus daar leest elke run de hele feed.

Een nieuwe feed komt in de tabel `feeds`, bij een bron.
Er is nog geen beheer (#30), dus de seed zet ze erin (`packages/db/src/seed.ts`).

## De velden van de feed van de Leeuwarder Courant

De feed `https://www.lc.nl/sport/sc-heerenveen/rss/` is RSS 2.0, met 50 berichten.
De lijst hieronder komt uit de opname van 22 oktober 2026.
Wat de adapter van elk veld verwacht, staat in [`src/read-feed.ts`](src/read-feed.ts); de opname in [`src/fixtures/lc-sc-heerenveen.xml`](src/fixtures/lc-sc-heerenveen.xml) bevat alleen de velden die we lezen.

Per bericht (`<item>`):

| Element                                     | Wat het is                                                      | Wat we ermee doen                                                                          |
| ------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `title`                                     | De kop, in CDATA                                                | We lezen hem: de kop in `items.title`, als tekst                                           |
| `link`                                      | Het adres van het artikel                                       | We lezen het: `items.url`                                                                  |
| `guid` (met `isPermaLink="false"`)          | Een vaste code per bericht, zoals `Kordiam-…` of `sportify-…`   | We lezen hem: de sleutel in `items.item_key`; het attribuut gebruiken we niet              |
| `pubDate`                                   | De tijd van publicatie, als RFC 822 in GMT                      | We lezen hem: `items.published_at`, in UTC                                                 |
| `premium`                                   | `true` of `false`: of het bericht achter de betaalmuur staat    | We lezen hem: `items.paywalled`; een eigen element van de krant, dat `feedsmith` niet kent |
| `description`                               | Een korte tekst bij het bericht, in CDATA                       | We lezen hem niet: een intro bewaren we alleen met toestemming                             |
| `enclosure`, `media:content`, `media:title` | De afbeelding en het onderschrift, met de naam van de fotograaf | We lezen ze niet: een afbeelding bewaren we alleen met toestemming                         |
| `dc:creator`                                | De auteur                                                       | We lezen hem niet: een auteur bewaren we niet                                              |
| `category`                                  | De rubriek, zoals `SC Heerenveen`, `Sport` of `Columns`         | We lezen hem niet: een categorie bewaren we niet                                           |
| `atom:updated`                              | De tijd van de laatste wijziging van het bericht                | We lezen hem niet: we gebruiken de tijd van publicatie                                     |
| `atom:link`                                 | Dezelfde link nog een keer                                      | We lezen hem niet: we hebben `link`                                                        |

Niet elk bericht heeft elk veld; `title`, `link`, `guid`, `pubDate` en `premium` stonden in alle 50.
Van de gegevens van de feed zelf (`channel`) gebruiken we niets: de titel, de beschrijving, het logo, de taal en `lastBuildDate`.

Wat de bron er verder bij doet:

- De feed stuurt geen `ETag` of `Last-Modified`, dus een voorwaardelijk verzoek bespaart bij deze bron niets.
- De bron zet cookies bij het antwoord. De fetcher bewaart en stuurt geen cookies.

Let op: wijzigt de krant het element `premium`, bijvoorbeeld de naam, dan staat elk nieuw bericht als "niet achter de betaalmuur" in de database.
De adapter waarschuwt daar nu niet voor.

## De fetcher

De fetcher noemt zich `scHeerenveenFansite/<versie> (+https://github.com/VincentSmedinga/sc-heerenveen-fansite)`, met de versie uit de `package.json` in de root.
Een bron ziet zo wie er komt, en kan ons weren met `robots.txt`.
Hij doet zich niet voor als browser en stuurt nooit cookies, ook niet als een site er een zet.
Hij gebruikt `fetch` en een `Agent` van `undici`, de bibliotheek onder de `fetch` van Node.
Met de `Agent` controleert hij het adres waarmee hij verbindt.

Bij elk verzoek geldt:

- De fetcher leest eerst de `robots.txt` van de host, volgens [RFC 9309](https://www.rfc-editor.org/rfc/rfc9309), met dezelfde user agent.
  Hij volgt de regels voor `scHeerenveenFansite`, of anders die voor `*`.
  Staat de URL op `Disallow`, dan vraagt hij er niet om.
- Geeft `robots.txt` een 4xx, dan mag alles.
  Een 429 is daarop de uitzondering: dat telt als niet te lezen.
- Is `robots.txt` niet te lezen, door een 429, een 5xx, een time-out of een netwerkfout, dan haalt de fetcher niets van die host.
- Eén fetcher leest de `robots.txt` van een host één keer, ook als hij niet te lezen was.
  Maak daarom één fetcher per run van een opdracht, en deel hem tussen de adapters.
- Geeft de adapter de `ETag` en `Last-Modified` van de vorige keer mee, dan vraagt de fetcher met `If-None-Match` en `If-Modified-Since`.
- De fetcher volgt hoogstens 5 doorverwijzingen, alleen naar `http` en `https`.
  Bij elke stap leest hij de `robots.txt` van de nieuwe host en toetst hij de URL ertegen.
- Een verzoek stopt na 15 seconden, ook het verzoek om `robots.txt` en dat om een doorverwijzing.
  Een antwoord groter dan 5 MB leest de fetcher niet verder, ook niet na het uitpakken.
- De fetcher probeert het nooit opnieuw.
- De fetcher verbindt alleen met een adres op het openbare internet.
  Hij weigert loopback (`localhost`, `127.0.0.1`, `::1`), privé (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `fc00::/7`), link-local (`169.254.0.0/16`, `fe80::/10`), gedeeld (`100.64.0.0/10`), niet gespecificeerd (`0.0.0.0`, `::`), multicast en gereserveerd.
  Een IPv4-adres in IPv6-vorm, zoals `::ffff:127.0.0.1`, weigert hij altijd.
  De hele lijst staat in [`src/address-check.ts`](src/address-check.ts).
- Hij controleert het adres waarmee hij echt verbindt: het adres in de URL, of elk adres van de naam op het moment van verbinden.
  Dat geldt ook voor `robots.txt` en voor elke doorverwijzing.
  Wijst een naam naar zo'n adres, ook als hij daarnaast naar een openbaar adres wijst, dan verbindt de fetcher niet.
  De uitkomst is dan een fout met de reden `private-address`.

## Een adapter gebruikt hem zo

```ts
import { createFetcher } from './fetcher.ts'

const fetcher = createFetcher()

const outcome = await fetcher.fetch(feed.url, { etag: feed.etag, lastModified: feed.lastModified })

switch (outcome.kind) {
  case 'fetched':
    // outcome.body (bytes), outcome.contentType, outcome.etag en outcome.lastModified voor de volgende keer
    break
  case 'not-modified':
    // Niets veranderd, er is geen inhoud.
    break
  case 'blocked-by-robots':
    // De bron wil dat we hier niet komen.
    break
  case 'wait':
    // De bron vraagt om te wachten: outcome.retryAfterSeconds (of null), outcome.status is 429 of 503.
    break
  case 'error':
    // outcome.reason en outcome.message; bij reason 'http-status' ook outcome.status.
    break
}
```

De fetcher gooit geen fout voor wat een bron doet: elke uitkomst is een waarde.
`FetchOutcome` en `ErrorReason` in [`src/fetcher.ts`](src/fetcher.ts) leggen vast welke uitkomsten en redenen er zijn, en wat erbij zit.

Twee dingen voor wie een adapter schrijft:

- Een toestemmingsscherm omzeilt de fetcher niet: hij zet geen cookies en klikt niets weg.
  Krijgt de adapter een scherm in plaats van een feed, dan meldt zij dat als fout.
  Kijk daarvoor naar `contentType` en `url`.
- De jobplanner (#13) beslist hoe lang we echt wachten na een `wait`.

## Wat de fetcher niet doet

- Opnieuw proberen met uitstel, een limiet per host, het rooster en een `robots.txt` bewaren tussen runs: dat komt met de jobplanner (#13).
- `Crawl-delay` lezen: dat staat niet in RFC 9309.

## De import op acceptatie

- `pnpm --filter site assemble <nieuwe map>` bundelt de importer met `esbuild` tot één bestand, `apps/importer/import.mjs` in de map voor de host ([`src/bundle.ts`](src/bundle.ts)).
  Het bestand bevat alles wat de importer gebruikt, dus het heeft geen `node_modules` nodig.
  Draai eerst `pnpm --filter site build`.
- De workflow Acceptance draait het bestand één keer op een database zonder feeds, en kopieert het samen met de site naar de host.
- Cron start het daar elke 15 minuten, op minuut 7, 22, 37 en 52, met `DATABASE_URL` uit een eigen bestand in de thuismap.
  De uitvoer komt achteraan in `~/fansite-import.log`.

Wat de eigenaar daarvoor eenmalig instelt, hoe je controleert dat de import werkt en wat je doet als hij niet werkt, staat in [`docs/acceptatieomgeving.md`](../../docs/acceptatieomgeving.md).

## Tests

```sh
pnpm --filter importer test
```

De tests starten een eigen webserver op deze computer en doen geen verzoeken naar echte sites.
De fetcher weigert zo'n server, want hij staat niet op het openbare internet.
Een test maakt zijn fetcher daarom met `fetcherFor` uit [`src/test-server.ts`](src/test-server.ts), die de optie `testOrigins` zet voor de servers van die test.
De opdracht `pnpm run import` zet die optie nooit; `src/import.test.ts` laat zien dat hij een feed op deze computer weigert.
Met de optie `resolve` geeft een test een nagebootste DNS, zodat hij ook een naam kan laten wijzen naar een adres op een eigen netwerk.
De parser voor `robots.txt` staat in `src/robots.ts`, met de voorbeelden uit RFC 9309 in `src/robots.test.ts`.

De tests van de adapter gebruiken een opname van de feed van de Leeuwarder Courant in [`src/fixtures/lc-sc-heerenveen.xml`](src/fixtures/lc-sc-heerenveen.xml).
Die is ingekort tot wat we mogen bewaren: de kop, de link, de `guid`, de tijd en `premium`.
Een beschrijving, afbeelding of auteur staat er niet in, en hoort er ook niet in.
`src/read-feed.test.ts` leest feeds zonder database.
`src/import-feeds.test.ts`, `src/import.test.ts` en `src/bundle.test.ts` draaien op een echte MariaDB, zoals de tests van `packages/db`: start hem met `docker compose up -d --wait`.
`src/bundle.test.ts` bundelt de importer in een lege map en draait hem daar, zonder `node_modules`.

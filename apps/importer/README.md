# @fansite/importer

De importer haalt koppen en links op bij de bronnen.
Hij bevat de fetcher, de ene HTTP-client voor alle adapters, en de adapter voor RSS- en Atom-feeds, met de Leeuwarder Courant als eerste bron.
De import op acceptatie komt met #98, en het rooster, een slot in de database en de gezondheid van een bron met #13.

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

## De fetcher

De fetcher noemt zich `scHeerenveenFansite/<versie> (+https://github.com/VincentSmedinga/sc-heerenveen-fansite)`, met de versie uit de `package.json` in de root.
Een bron ziet zo wie er komt, en kan ons weren met `robots.txt`.
Hij doet zich niet voor als browser en stuurt nooit cookies, ook niet als een site er een zet.
Hij gebruikt `fetch` van Node en heeft geen dependencies.

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
- Adressen op een eigen netwerk weigeren: een bron kan doorverwijzen naar `localhost`.
  De fetcher kijkt naar het schema van een URL, niet naar het adres waar de naam naartoe wijst.
  Dat komt met #98, voordat de importer op de hosting draait.

## Tests

```sh
pnpm --filter importer test
```

De tests starten een eigen webserver op deze computer en doen geen verzoeken naar echte sites.
De parser voor `robots.txt` staat in `src/robots.ts`, met de voorbeelden uit RFC 9309 in `src/robots.test.ts`.

De tests van de adapter gebruiken een opname van de feed van de Leeuwarder Courant in [`src/fixtures/lc-sc-heerenveen.xml`](src/fixtures/lc-sc-heerenveen.xml).
Die is ingekort tot wat we mogen bewaren: de kop, de link, de `guid`, de tijd en `premium`.
Een beschrijving, afbeelding of auteur staat er niet in, en hoort er ook niet in.
`src/read-feed.test.ts` leest feeds zonder database.
`src/import-feeds.test.ts` en `src/import.test.ts` draaien op een echte MariaDB, zoals de tests van `packages/db`: start hem met `docker compose up -d --wait`.

# @fansite/importer

De importer haalt koppen en links op bij de bronnen.
Hij bevat de fetcher, de ene HTTP-client voor alle adapters, de adapter voor RSS- en Atom-feeds, die ook de podcasts leest (zie _De podcasts_), en de lezer van de forumdiscussies van ons eigen forum (zie _Het forum_).
Welke nieuwsbronnen en podcasts we lezen en waarom, staat in [`docs/bronnen.md`](../../docs/bronnen.md).
Op acceptatie start cron de import elke 15 minuten (zie _De import op acceptatie_).
Een run neemt een lock, schrijft een logboek, houdt de gezondheid van elke feed bij en wacht als een bron daarom vraagt (zie _Het logboek en de gezondheid_).

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
Een feed die nog moet wachten, slaat hij over.
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
- de feed wacht nog, met de tijd tot wanneer (zie _Wachten_);
- een fout, met de reden.

Een feed die faalt, stopt de andere feeds niet.
De opdracht stopt met exitcode 1 als een feed een fout gaf: de bron geeft een foutstatus of iets wat geen feed is, of de database weigert iets.
Een feed die niet gewijzigd is, die `robots.txt` weigert, die om wachten vraagt of die nog wacht, is geen fout van ons en geeft exitcode 0.
Gebruik `DATABASE_URL` uit `.env`; zonder die variabele stopt de opdracht met een melding.
`pnpm run import:status` toont de gezondheid van de feeds (zie _Het overzicht_).

## Het logboek en de gezondheid

Elke run houdt in de database bij wat hij deed, zodat je ziet of een feed het doet.
De tijden staan in UTC.

### Eén run tegelijk

Een run neemt eerst een lock in de database, met `GET_LOCK` en de naam `fansite_import_<database>`.
Is de lock bezet, omdat een andere run nog bezig is, dan schrijft de run dat in het logboek en stopt hij meteen, met exitcode 0:

```text
Another import is still running on this database, so this run does nothing.
```

Er is niets kapot, en een kwartier later komt de volgende run.
Stopt een proces halverwege, dan laat de database de lock vanzelf los.

### Het logboek

De tabel `import_runs` heeft een rij per run, met het begin en het eind.
Een run die de lock bezet vond, staat er ook in, met `lock_taken`.
De tabel `import_results` heeft per run een rij per feed: de uitkomst, het aantal nieuwe, bijgewerkte, ongewijzigde en overgeslagen berichten, en waarom de feed faalde of wachtte.

| Uitkomst            | Wat het betekent                                      |
| ------------------- | ----------------------------------------------------- |
| `imported`          | Gelezen en bewaard                                    |
| `not-modified`      | Niet gewijzigd sinds de vorige keer                   |
| `blocked-by-robots` | `robots.txt` staat het niet toe                       |
| `wait`              | De bron antwoordde met 429 of 503                     |
| `postponed`         | Niet gevraagd, want de feed wacht nog (zie _Wachten_) |
| `error`             | Een fout; de reden staat erbij                        |

Een fout van de database staat er alleen met de code in, zoals `database error ER_DUP_ENTRY`, net als in het logbestand.
De query met zijn waarden staat er niet in.
Elke run haalt de runs weg die ouder zijn dan 30 dagen, met hun rijen in `import_results`.

### De gezondheid

Per feed staan in `feeds` de laatste geslaagde run, het aantal mislukte runs op rij, en de laatste fout met de tijd.

- **Geslaagd** is gelezen en bewaard, of niet gewijzigd.
  Dat zet de teller op 0.
- **Mislukt** is een fout.
  De teller gaat met één omhoog.
- **Wachten** (429 of 503) en een **weigering door `robots.txt`** liggen niet aan ons.
  Ze tellen niet mee, maar staan wel in het logboek.

Na drie mislukte runs op rij is een feed ongezond.
De laatste fout blijft staan als de feed daarna weer slaagt.

### Wachten

De kolom `feeds.retry_at` zegt tot wanneer de import een feed overslaat.
Een run die een feed overslaat, schrijft dat in het logboek (`postponed`) en in de uitvoer:

```text
https://www.lc.nl/sport/sc-heerenveen/rss/: not read, the source asked us to wait until 2026-10-22 15:07:03 UTC
```

- Antwoordt een bron met 429 of 503, dan wacht de import tot het moment uit `Retry-After`, hoogstens een dag.
  Noemt de bron geen tijd, dan wacht hij een uur.
- Na drie mislukte runs op rij probeert de import de feed eens per uur, tot hij weer slaagt.
  Hij wacht 59 minuten na de vorige poging: cron start een run soms een paar seconden vroeger, en met een uur precies viel de poging dan een run later.

### robots.txt bewaren

De import geeft de fetcher een opslag in de database, de tabel `robots_txt` ([`src/robots-store.ts`](src/robots-store.ts)).
Daarin bewaart de fetcher per origin, zoals `https://www.lc.nl`, de regels van `robots.txt` die voor ons gelden, hoogstens 24 uur (RFC 9309).
Zo vraagt de import `robots.txt` één keer per dag per host, en niet elke run.
Een `robots.txt` die niet te lezen was, bewaart de fetcher niet, dus de volgende run probeert het opnieuw.
Lukt het lezen of bewaren in de database niet, dan vraagt de fetcher `robots.txt` aan de host, zoals zonder opslag.

### Het overzicht

Draai vanuit de root:

```sh
pnpm run import:status
```

Het overzicht toont de laatste run, zodat je ziet dat cron de import start.
Daaronder staan per feed van een bron die aanstaat de bron, het adres, de laatste geslaagde run, het aantal mislukte runs op rij, de laatste fout, en of de feed gezond is:

```text
Last run: started 2026-10-22 14:07:01 UTC, finished 2026-10-22 14:07:03 UTC

Leeuwarder Courant: healthy
  feed: https://www.lc.nl/sport/sc-heerenveen/rss/
  last success: 2026-10-22 14:07:01 UTC
  failed runs in a row: 0
  last error: none

Unhealthy feeds: 0 of 1
```

Wacht een feed nog, dan staat er ook `next try from` met de tijd.
Het overzicht verandert niets in de database, en neemt geen lock.
Het stopt met exitcode 1 als een feed ongezond is.
Op de host doet het gebundelde bestand hetzelfde met de optie `--status` (zie _De import op acceptatie_).
Een optie die de opdracht niet kent, laat hem stoppen voordat hij iets doet.

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
- **Betaalmuur:** elke bron zegt het op een eigen manier, en de adapter kiest aan de hand van het domein van de bron (`paywallCategories` in [`src/read-feed.ts`](src/read-feed.ts)).
  Bij de Leeuwarder Courant en De Telegraaf is het het element `<premium>true</premium>`.
  `feedsmith` leest elementen die het niet kent niet, dus een tweede lezing met `fast-xml-parser` zoekt dit ene element.
  Bij Voetbal International is het de categorie met `domain="https://www.vi.nl/pro"` (tekst `PRO`), die `feedsmith` wel leest.
  De categorie zelf bewaren we niet; de adapter gebruikt haar alleen voor `items.paywalled`.
  Een feed zonder het teken van zijn bron heeft geen betaalmuur.
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

## De velden van de feed van Voetbal International

De feed `https://www.vi.nl/feed/news.xml?tag=sc-heerenveen` is RSS 2.0, met 24 berichten.
De lijst hieronder komt uit de opname van 23 oktober 2026.
De opname in [`src/fixtures/vi-sc-heerenveen.xml`](src/fixtures/vi-sc-heerenveen.xml) bevat alleen de velden die we lezen, met berichten onder `/nieuws/`, `/pro/` en `/video/`.

Per bericht (`<item>`):

| Element                                         | Wat het is                                                         | Wat we ermee doen                                                                  |
| ----------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `title`                                         | De kop, in CDATA                                                   | We lezen hem: de kop in `items.title`, als tekst                                   |
| `link`                                          | Het adres van het artikel, onder `/nieuws/`, `/pro/` of `/video/`  | We lezen het: `items.url`                                                          |
| `guid` (met `isPermaLink="false"`)              | Een vaste code per bericht, zoals `www.vi.nl-news-2149501`         | We lezen hem: de sleutel in `items.item_key`; het attribuut gebruiken we niet      |
| `pubDate`                                       | De tijd van publicatie, als RFC 822 met een zone (`+0200`)         | We lezen hem: `items.published_at`, in UTC                                         |
| `category` met `domain="https://www.vi.nl/pro"` | Het teken dat het bericht achter de betaalmuur staat (tekst `PRO`) | We lezen alleen of hij er is: `items.paywalled`; de categorie zelf bewaren we niet |
| andere `category`'s                             | De club, spelers en competitie van het bericht                     | We lezen ze niet: een categorie bewaren we niet                                    |
| `description`                                   | Een intro van het bericht, in CDATA                                | We lezen hem niet: een intro bewaren we alleen met toestemming                     |
| `enclosure`                                     | De afbeelding                                                      | We lezen hem niet: een afbeelding bewaren we alleen met toestemming                |
| `author`                                        | `info@vi.nl (Voetbal International)`, voor elk bericht hetzelfde   | We lezen hem niet: een auteur bewaren we niet                                      |
| `comments`                                      | Het adres van de reacties                                          | We lezen hem niet                                                                  |

Niet elk bericht heeft elke categorie; `title`, `link`, `guid` en `pubDate` stonden in alle 24.
Van de gegevens van de feed zelf (`channel`) gebruiken we niets.

Wat de bron er verder bij doet:

- De feed stuurt geen `ETag` of `Last-Modified`, dus een voorwaardelijk verzoek bespaart bij deze bron niets.
- De bron zet een cookie (`experimentGroup`) bij het antwoord.
  De fetcher bewaart en stuurt geen cookies.
- De feed heeft ook berichten die de club maar kort noemen, zoals "Rondje Eredivisie".
  Een filter daarvoor komt met het relevantiefilter (#74).

Let op: verandert VI de categorie of het domein ervan, dan staat elk nieuw bericht als "niet achter de betaalmuur" in de database.
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
- Geef je de fetcher een opslag (de optie `robots`), dan kijkt hij daar eerst, en bewaart hij er de regels die hij las.
  De import bewaart ze zo 24 uur in de database (zie _robots.txt bewaren_).
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
- De import beslist hoe lang we echt wachten na een `wait` (zie _Wachten_).

## De podcasts

Omroep Abe en Radio Camataru zijn bronnen van het soort podcast.
Hun feeds lezen we met dezelfde adapter als een nieuwsfeed, dus een aflevering is een item, met dezelfde velden als een bericht (zie _Wat de adapter bewaart_).
Een eigen adapter of eigen tabellen zijn er niet.

- **Link:** de link van een aflevering is het element `link`, de pagina van de aflevering.
  De `enclosure`, het MP3-bestand, lezen we niet.
  Een aflevering zonder bruikbare `link` slaat de import over en meldt dat in het logboek; hij valt niet terug op de `enclosure`.
- **Sleutel:** de `guid`, per bron.
- **Feiten:** van een aflevering bewaart de import ook de duur in hele seconden, het seizoen en het nummer (`itunes:duration`, `itunes:season` en `itunes:episode`), als de feed ze geeft.
  Een duur van meer dan een dag, een nummer of seizoen van 0 of boven 99999, en een waarde die geen geheel getal is, telt als "niet gegeven": de aflevering blijft staan, zonder dat feit.
  De import leest dit uit elke feed, ook uit een nieuwsfeed, die ze niet heeft.
- **Niets extra:** geen artwork, beschrijving of shownotes van een aflevering, geen soort aflevering (`episodeType`) en geen adres van het MP3-bestand.
  De beschrijving van de podcast zelf staat in de seed, als tekst van de maker (zie _De beschrijving van een podcast is die van de maker_ in [`docs/beslissingen.md`](../../docs/beslissingen.md)); de import leest hem niet.
- **Rooster:** podcasts hebben geen rooster van zichzelf.
  Ze gaan mee in de run van elke 15 minuten, met de `ETag` die beide bronnen sturen, dus `pnpm run import:status` toont ze zoals de andere feeds.
- **Niet in het nieuws:** `listRecentItems` in `@fansite/db` slaat bronnen van het soort podcast over, dus afleveringen komen niet in "Laatste nieuws".

## Het forum

Het forum van sc Heerenveen is een bron van het soort forum.
Zijn "feed" is de lijst met discussies in de openbare API van Flarum, die de importer als gast leest: zonder inloggen, zonder sleutel, zonder cookies.
Het adres staat in de seed ([`packages/db/src/seed.ts`](../../packages/db/src/seed.ts)).
De import gebruikt voor het forum dezelfde fetcher, lock, logboek en gezondheid als voor de andere feeds, dus `pnpm run import:status` toont het forum ook.
Alleen het lezen en bewaren is anders: een bron van het soort forum gaat naar [`src/read-forum.ts`](src/read-forum.ts) in plaats van naar de lezer van RSS en Atom.

Wat de lezer van een discussie bewaart (tabel `discussions`):

- het adres, uit het adres van de feed, het id, de slug en het nummer van het laatste bericht (`https://forum.heerenveen.org/d/<id>-<titel>/<nummer>`);
  het adres opent de discussie bij het laatste bericht, en dat nummer is hoger dan het aantal berichten als er een bericht is verwijderd;
  heeft het antwoord geen bruikbaar nummer, dan is het adres dat van de discussie zelf;
  de `slug` in het antwoord begint al met het id, dus de lezer zet het id niet nog eens voor de slug;
  een link uit het antwoord vertrouwen we niet;
- de titel, als tekst;
- het aantal reacties: het aantal berichten min het openingsbericht, zoals het forum zelf telt;
- het moment van het laatste bericht;
- de schermnaam van de laatste reageerder, of niets als het forum die niet geeft.

Niets van de tekst van een bericht, geen avatars of afbeeldingen, geen e-mailadressen en geen andere gegevens van leden.
Het antwoord bevat die wel (zoals `customThumbnail` en `avatarUrl`); de lezer neemt alleen de velden hierboven.

Zo kiest de lezer de discussies:

- Het forum bepaalt wat een gast ziet.
  De importer maakt geen eigen regels voor wie wat mag zien.
- Discussies in de tags Offtopics en Sport overig laat de lezer weg.
  De lijst staat op één plek, `leftOutTags` in `src/read-forum.ts`, op slug.
- Van de rest houdt hij de vier waarop het laatst is gereageerd.
  De lijst vraagt 30 discussies, zodat er na het weglaten van die tags genoeg overblijven.
  De lezer sorteert zelf op het laatste bericht, want een vastgezette discussie kan vooraan staan.
- Een discussie waar iets mis mee is, slaat hij over, met de reden in de uitvoer.
  Dat is een titel van meer dan 500 tekens, een schermnaam van meer dan 150, of een adres van meer dan 2048, een ontbrekende titel, een tijd zonder tijdzone, of een tag die niet in het antwoord staat.
- Is het antwoord geen JSON, of staan er discussies in en kan er geen enkele worden gelezen, dan is dat een fout.
  De vorige discussies blijven dan staan.

Na elke run staan er precies de vier nieuwste discussies die aan de regels voldoen in `discussions`, in één transactie.
Een discussie die niet meer bij de vier hoort, die het forum heeft verwijderd of die een gast niet meer ziet, is dus na de volgende run weg.
We bewaren geen geschiedenis van titels of schermnamen.
De regel in de uitvoer telt de nieuwe, de gewijzigde en de ongewijzigde discussies van de vier die blijven.
Een discussie is dezelfde als het id gelijk is: het adres verandert met elk nieuw bericht, want het eindigt op het nummer van het laatste bericht.
Het forum vraagt de import nooit "is het veranderd?" (geen `ETag` of `Last-Modified`): een lege database moet na één run discussies hebben.

De fetcher hoefde niet te veranderen: hij leest elk soort antwoord als bytes, en slaat geen cookies op, dus ook de sessiecookie van de API niet.

## Wat de fetcher niet doet

- Een limiet per host.
- `Crawl-delay` lezen: dat staat niet in RFC 9309.

## De import op acceptatie

- `pnpm --filter site assemble <nieuwe map>` bundelt de importer met `esbuild` tot één bestand, `apps/importer/import.mjs` in de map voor de host ([`src/bundle.ts`](src/bundle.ts)).
  Het bestand bevat alles wat de importer gebruikt, dus het heeft geen `node_modules` nodig.
  Draai eerst `pnpm --filter site build`.
- De workflow Acceptance draait het bestand één keer op een database zonder feeds, en kopieert het samen met de site naar de host.
- Cron start het daar elke 15 minuten, op minuut 7, 22, 37 en 52, met `DATABASE_URL` uit een eigen bestand in de thuismap.
  De uitvoer komt achteraan in `~/fansite-import.log`.
- Met `--status` toont hetzelfde bestand het overzicht van de gezondheid.

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

De tests van de adapter gebruiken opnames van de feeds van de Leeuwarder Courant ([`src/fixtures/lc-sc-heerenveen.xml`](src/fixtures/lc-sc-heerenveen.xml)) en van Voetbal International ([`src/fixtures/vi-sc-heerenveen.xml`](src/fixtures/vi-sc-heerenveen.xml)).
Ze zijn ingekort tot wat we mogen bewaren: de kop, de link, de `guid`, de tijd en het teken voor de betaalmuur (`premium` of de categorie `PRO`).
Een beschrijving, afbeelding of auteur staat er niet in, en hoort er ook niet in.
`src/read-feed.test.ts` leest feeds zonder database, en `src/read-forum.test.ts` doet hetzelfde met verzonnen antwoorden van de API van het forum (`src/test-forum.ts`): in de vorm van het echte antwoord, met verzonnen titels en schermnamen, ook een discussie in een tag die we weglaten en een zonder laatste reageerder.
`src/import-feeds.test.ts`, `src/import-forum.test.ts`, `src/import.test.ts`, `src/run-log.test.ts`, `src/status.test.ts`, `src/robots-store.test.ts` en `src/bundle.test.ts` draaien op een echte MariaDB, zoals de tests van `packages/db`: start hem met `docker compose up -d --wait`.
De tests van het logboek, de gezondheid en het wachten geven de import een nagebootste klok (de optie `clock`), zodat een test een dag of een maand overslaat zonder te wachten.
`src/bundle.test.ts` bundelt de importer in een lege map en draait hem daar, zonder `node_modules`.

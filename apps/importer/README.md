# @fansite/importer

De importer haalt koppen en links op bij de bronnen.
Voorlopig bevat hij alleen de fetcher, de ene HTTP-client voor alle adapters.
De eerste adapter komt met #72, en de opdrachten en het rooster komen met #13.

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

| `kind`              | Wanneer                                                              | Wat erbij zit                                              |
| ------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------- |
| `fetched`           | De bron geeft een 2xx                                                | `body`, `contentType`, `etag`, `lastModified`, `url`       |
| `not-modified`      | De bron geeft een 304 op een verzoek met `etag` of `lastModified`    | `url`                                                      |
| `blocked-by-robots` | `robots.txt` verbiedt de URL, ook na een doorverwijzing              | `url`: de URL die verboden is                              |
| `wait`              | De bron geeft een 429 of een 503                                     | `status`, `retryAfterSeconds`, `url`                       |
| `error`             | Al het andere, met een `reason` uit een vaste lijst en een `message` | `reason`, `message`, `url`, bij `http-status` ook `status` |

- De fetcher gooit geen fout voor wat een bron doet; elke uitkomst is een waarde.
- De mogelijke waarden van `reason` zijn `http-status`, `invalid-redirect`, `invalid-url`, `network`, `robots-unreadable`, `timeout`, `too-large` en `too-many-redirects`.
- `url` is de laatste URL waar de fetcher om vroeg.
  Na een doorverwijzing is dat een andere dan de URL die je meegaf.
- `body` is een `Uint8Array`: de adapter weet in welke tekenset zijn feed staat.
- `retryAfterSeconds` komt uit `Retry-After`, in seconden of als datum, en is `null` zonder geldige waarde.
  De jobplanner (#13) beslist hoe lang we echt wachten.
- Een toestemmingsscherm omzeilt de fetcher niet: hij zet geen cookies en klikt niets weg.
  Krijgt de adapter een scherm in plaats van een feed, dan meldt zij dat als fout.
  Kijk daarvoor naar `contentType` en `url`.

## Wat de fetcher niet doet

- Opnieuw proberen met uitstel, een limiet per host, het rooster en een `robots.txt` bewaren tussen runs: dat komt met de jobplanner (#13).
- `ETag` en `Last-Modified` bewaren: dat komt met de eerste adapter (#72).
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

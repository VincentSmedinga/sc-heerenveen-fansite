# @fansite/importer

De importer haalt koppen en links op bij de bronnen.
Hij bevat de fetcher, de ene HTTP-client voor alle adapters, de adapter voor RSS- en Atom-feeds, die ook de podcasts leest (zie _De podcasts_), de lezer van de forumdiscussies van ons eigen forum (zie _Het forum_) en de lezer van de wedstrijden en de stand van de Nederlandse Wikipedia (zie _De wedstrijden en de stand_) en van de selectie van sc Heerenveen (zie _De selectie_).
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
Tegelijk leest hij de wedstrijden, de stand en de selectie van het lopende seizoen van de Nederlandse Wikipedia, elk hoogstens één keer per uur (zie _De wedstrijden en de stand_ en _De selectie_).
Een afgelopen seizoen leest hij niet; dat doet de opdracht `pnpm run import:season <seizoen>`, eenmalig (zie _Een afgelopen seizoen_).
Hij schrijft per feed één regel, en per bericht dat hij overslaat een regel erbij:

```text
https://www.lc.nl/sport/sc-heerenveen/rss/: 3 new, 1 updated, 46 unchanged, 1 skipped; 50 relevant, 0 doubtful, 0 irrelevant
  item 12 skipped: the link does not start with http or https
```

- **new**: berichten die de bron nog niet had.
- **updated**: berichten die we kenden en waarvan de kop, de link, de tijd, de betaalmuur of de relevantie veranderde.
- **unchanged**: berichten die we kenden en die hetzelfde waren.
- **skipped**: berichten die we niet bewaren, met de reden.
- **relevant**, **doubtful**, **irrelevant**: hoeveel berichten van de feed het relevantiefilter bij elke waarde vond (zie _Het relevantiefilter_).
  Bij een feed zonder filter zijn ze allemaal `relevant`.

Een feed die niet gelezen wordt, krijgt ook een regel:

- niet gewijzigd sinds de vorige keer (`ETag` of `Last-Modified`);
- `robots.txt` staat het niet toe;
- de bron vraagt om te wachten (429 of 503);
- de feed wacht nog, met de tijd tot wanneer (zie _Wachten_);
- een fout, met de reden.

Een feed die faalt, stopt de andere feeds niet.
De opdracht stopt met exitcode 1 als een feed een fout gaf: de bron geeft een foutstatus of iets wat geen feed is, of de database weigert iets.
Een feed die niet gewijzigd is, die `robots.txt` weigert, die om wachten vraagt of die nog wacht, is geen fout van ons en geeft exitcode 0.
De wedstrijden hebben één regel van zichzelf, of geen als het uur nog niet om is (zie _De wedstrijden en de stand_).
Een fout daarbij is een waarschuwing en geeft geen exitcode 1.
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
De tabel `import_results` heeft per run een rij per feed: de uitkomst, het aantal nieuwe, bijgewerkte, ongewijzigde en overgeslagen berichten, hoeveel berichten het filter bij elke waarde vond, en waarom de feed faalde of wachtte.

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
De run gooit ook het zout en de kenmerken van de bezoekers van eerdere dagen weg (`removeVisitorData`, zie _De tabellen voor het tellen van bezoeken_ in de [README van de database](../../packages/db/README.md)), zodat ze ook op een dag zonder bezoekers verdwijnen.
Mislukt dat, dan staat er één regel `Visitor data: warning, not removed: …` in de uitvoer en gaat de import door.

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

Matches 2026/27 (Wikipedia): healthy
  last success: 2026-10-25 22:43:11 UTC
  last outcome: imported
  failed runs in a row: 0
  last error: none
  last warning: none
  next try from: 2026-10-25 23:42:11 UTC
  page: Eredivisie 2026/27 (mannenvoetbal), version Sun, 25 Oct 2026 21:19:08 GMT, read 2026-10-25 22:43:11 UTC
  goals of ours without a player: 0 of 41

Squad 2026/27 (Wikipedia): healthy
  last success: 2026-10-25 22:43:12 UTC
  last outcome: imported
  failed runs in a row: 0
  last error: none
  last warning: none
  next try from: 2026-10-25 23:42:12 UTC
  page: Sc Heerenveen in het seizoen 2026/27 (mannen), version Sat, 17 Oct 2026 07:23:24 GMT, read 2026-10-25 22:43:12 UTC
```

Onder de feeds staat de gezondheid van de import van de wedstrijden en van de selectie voor het lopende seizoen, elk met de pagina's van Wikipedia die hij het laatst las (zie _De wedstrijden en de stand_ en _De selectie_).

Wacht een feed nog, dan staat er ook `next try from` met de tijd.
Het overzicht verandert niets in de database, en neemt geen lock.
Het stopt met exitcode 1 als een feed, de import van de wedstrijden of de import van de selectie ongezond is.
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
  De zone `EST` kennen we niet, behalve bij ESPN NL (zie _De voetbalfeed van ESPN NL_).
  Dan geldt de tijd waarop we het bericht voor het eerst zagen, en een bekend bericht houdt de tijd die het had.
- **Betaalmuur:** elke bron zegt het op een eigen manier, en de adapter kiest aan de hand van het domein van de bron (`paywallCategories` en `paywallNamespaces` in [`src/read-feed.ts`](src/read-feed.ts)).
  Bij de Leeuwarder Courant en De Telegraaf is het het element `<premium>true</premium>`.
  `feedsmith` leest elementen die het niet kent niet, dus een tweede lezing met `fast-xml-parser` zoekt dit ene element.
  Bij Voetbal International is het de categorie met `domain="https://www.vi.nl/pro"` (tekst `PRO`), die `feedsmith` wel leest.
  De categorie zelf bewaren we niet; de adapter gebruikt haar alleen voor `items.paywalled`.
  Bij het Algemeen Dagblad is het het element `<dpp:paid>true</dpp:paid>`, met `false` of zonder het element is het bericht open.
  De adapter herkent de naamruimte aan haar adres, `https://www.dpgmedia.cloud/paidrss`, en niet aan het voorvoegsel `dpp`: hij leest eerst welke voorvoegsels de feed voor dat adres kiest.
  Ook dit element leest de tweede lezing, want `feedsmith` kent het niet.
  Een feed zonder het teken van zijn bron heeft geen betaalmuur.
- **Te lang:** een kop van meer dan 500 tekens, een link van meer dan 2048 of een sleutel van meer dan 700 slaat de adapter over, in plaats van hem af te kappen.
- **Bijwerken:** een nieuw bericht komt erbij.
  Een bekend bericht krijgt de nieuwe kop, link, tijd en betaalmuur als de bron die veranderde, en de relevantie die het filter nu vindt (zie _Het relevantiefilter_).
  We bewaren geen eerdere koppen.
  Een bericht dat een moderator in het beheer verborg (`items.hidden_at`), blijft zoals het is: de kop, de link, de tijd, de betaalmuur en `last_seen_at` veranderen niet, ook niet als de bron het bericht opnieuw aanbiedt of verandert, en het telt als ongewijzigd.
  De voorwaarde staat in de query zelf (`unlessHidden` in [`src/import-feeds.ts`](src/import-feeds.ts)), dus ook een bericht dat tijdens een run wordt verborgen, blijft ongemoeid.
- **ETag en Last-Modified:** de adapter bewaart ze in dezelfde transactie als de berichten.
  Lukt het bewaren of lezen niet, dan blijven de oude waarden staan en vraagt de volgende run de hele feed opnieuw.
  Is de feed niet gewijzigd, dan doet de adapter verder niets.
  De Leeuwarder Courant stuurt geen van beide, dus daar leest elke run de hele feed.

Een nieuwe feed komt in de tabel `feeds`, bij een bron.
Er is nog geen beheer (#30), dus de seed zet ze erin (`packages/db/src/seed.ts`).

## Het relevantiefilter

Een regionale krant schrijft over meer dan de club.
Het filter bepaalt voor elk bericht uit zo'n feed of het over sc Heerenveen gaat, zet twijfelgevallen apart en gooit niets weg.
Het kijkt alleen naar de kop, want de importer bewaart geen intro of categorie.
De functie is `judgeRelevance` in [`src/relevance.ts`](src/relevance.ts); ze is zuiver, dus dezelfde kop geeft altijd dezelfde waarde.

| Waarde       | Wanneer                                                                                                                                                                                                                                                             | Wat de site doet          |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `relevant`   | De kop noemt "sc Heerenveen" of "sc Hearrenfean" (ook "s.c." en "SC", en in "sc Heerenveen-fan"), Abe Lenstra of de volledige naam van iemand van de club, of "Heerenveen" of "Hearrenfean" met een voetbalwoord, een achternaam van de club of een andere profclub | Toont het bericht         |
| `doubtful`   | De kop noemt alleen "Heerenveen" of "Hearrenfean" (de gemeente en de plaats schrijven ook veel nieuws), of alleen een achternaam van de club                                                                                                                        | Toont het bericht nergens |
| `irrelevant` | Verder                                                                                                                                                                                                                                                              | Toont het bericht nergens |

Hoofdletters en accenten tellen niet, en alleen hele woorden: "Heerenveenseweg" is niet "Heerenveen" en "wandelwedstrijd" is geen "wedstrijd".
Het filter kent ook de Friese schrijfwijze (zie _Friese woorden_).
De keuzes staan in `docs/beslissingen.md`, onder _De regels van het filter_.
De importer bewaart elk bericht, ook `doubtful` en `irrelevant`.
Het beheer (`/beheer/berichten`) toont ze wel, met een woord erbij, zodat een moderator ze kan vinden en verbergen.
Een scherm om twijfelgevallen te beoordelen, en het met de hand corrigeren van een uitkomst (#76), komen later.

### Een feed op `club` zetten

De kolom `feeds.filter` is `none` of `club`.
Een feed die alleen over de club gaat, zoals die van de Leeuwarder Courant en Voetbal International, blijft op `none`: elk bericht is dan `relevant`.
Zet je een feed die over meer gaat op `club`, dan beoordeelt de importer elke kop.
Er is geen scherm voor; gebruik phpMyAdmin op de host, of lokaal `docker compose exec mariadb mariadb fansite`:

```sql
UPDATE feeds SET filter = 'club' WHERE url = 'https://www.voorbeeld.nl/sport/rss/';
```

De volgende run beoordeelt alle berichten van de feed, ook die we al hadden, en schrijft de aantallen in het logboek.
Zet je hem terug op `none`, dan worden ze weer allemaal `relevant`.
Een bericht dat een moderator verborg, houdt zijn waarde (zie _Wat de adapter bewaart_).
De seed laat `filter` met rust, dus een nieuwe seed zet de waarde niet terug.
Een feed in `realSources` die over meer gaat dan de club, begint op `club`: de seed zet de waarde alleen als hij de feed in het register zet.
Dat zijn nu de feed van Omrop Fryslân (zie _De regionale feed van Omrop Fryslân_), de voetbalfeed van NOS (zie _De voetbalfeed van NOS_), die van het Algemeen Dagblad (zie _De voetbalfeed van het Algemeen Dagblad_) en die van ESPN (zie _De voetbalfeed van ESPN NL_).

### De uitkomst bekijken

Het verslag van de run en het logboek hebben per feed de aantallen (zie _Het logboek_).
Om de koppen zelf te zien:

```sql
SELECT relevance, COUNT(*) FROM items WHERE feed_id = (SELECT id FROM feeds WHERE url = '...') GROUP BY relevance;
SELECT title, url FROM items WHERE relevance = 'doubtful' ORDER BY published_at DESC LIMIT 50;
```

Of kijk in `/beheer/berichten` (zoek op een deel van de kop).

### Een naam toevoegen

De lijst met namen van spelers en staf en de lijst met voetbalwoorden staan in één bestand, [`src/relevance-terms.ts`](src/relevance-terms.ts).
Bovenaan staat wie ze bijhoudt, wanneer ze voor het laatst zijn nagekeken en wat erop hoort.
Zo voeg je er een toe:

1. Schrijf de term in kleine letters zonder accenten, met een spatie tussen de woorden: `'nolhan courtens'`, niet `'Nolhan Courtens'`.
   Een test controleert dat.
2. Zet van een persoon de volledige naam in `clubPeople`, en de achternaam erbij in `clubSurnames`.
   Een volledige naam maakt een kop `relevant`; een achternaam alleen maakt hem `doubtful`, en `relevant` met "Heerenveen".
   Is de achternaam ook een gewoon woord, zoals Proper of Zaal, zet dan alleen de volledige naam op de lijst.
   Ook een speler die vertrok mag erop; berichten over hem lezen we graag.
3. Pas bovenaan de datum van de laatste controle aan.
4. Voeg in [`src/relevance.test.ts`](src/relevance.test.ts) een kop toe die de uitkomst laat zien.

De volgende run past de nieuwe lijst toe op alle berichten van feeds met `club`.

### Friese woorden

Omrop Fryslân schrijft veel in het Fries, en daarin heet de club "Hearrenfean".
`clubNames` in [`src/relevance-terms.ts`](src/relevance-terms.ts) heeft "heerenveen" en "hearrenfean", en ze tellen hetzelfde: na "sc", naast een voetbalwoord en alleen.
Een kop mag allebei de schrijfwijzen hebben.
Het bijvoeglijk naamwoord "Feanster" staat er niet in: het is de naam van de club niet, net als "Heerenveense", en maakt een kop dus niet `relevant`.
De Friese voetbalwoorden staan in `frisianFootballWords`, na de Nederlandse in `footballWords`.
Ze werken hetzelfde: een kop met "Heerenveen" of "Hearrenfean" en zo'n woord is `relevant`.
Een woord dat Nederlands en Fries hetzelfde schrijven, zoals "wint", staat alleen in `footballWords`.

Zo voeg je een Fries woord toe:

1. Zoek het woord in een echte kop, of op de Friese Wikipedia (`fy.wikipedia.org/wiki/...`), en schrijf op waar je het vond.
2. Schrijf het in kleine letters zonder accenten, in de Friese spelling: `'kompetysje'`, `'thuswedstriden'` voor "thúswedstriden", `'wun'` voor "wûn".
   Het filter zet "y" en "ij" niet om, en een test controleert de vorm.
3. Is het woord ook buiten het voetbal gewoon, zoals "ploech" of "útslach", zet het er dan niet op.
   Een kop met zo'n woord en "Hearrenfean" is `doubtful`, en een moderator kan hem vinden.
4. Zet in [`src/relevance.test.ts`](src/relevance.test.ts) een kop in `frisianClub`, en pas de datum van de controle aan in het commentaar bij `frisianFootballWords`.

### De profclubs bijhouden

`otherClubs` in [`src/relevance-terms.ts`](src/relevance-terms.ts) heeft de namen van de andere profclubs van de Eredivisie en de Eerste Divisie.
"Heerenveen" naast zo'n naam is een wedstrijd, dus de kop is `relevant`, ook zonder voetbalwoord.
Een club zonder "Heerenveen" zegt niets.
Een club waarvan de korte naam ook een plaats is (Groningen, Utrecht, Zwolle, Emmen), staat er alleen met zijn volledige naam: "Heerenveen en Groningen" staat net zo goed in een kop over de A7.
Pas de lijst aan na de promotie en degradatie van elk seizoen (mei tot juli), en schrijf bovenaan de datum van de controle.

### De testkoppen

[`src/relevance.test.ts`](src/relevance.test.ts) heeft verzonnen koppen per regel: de club, de gemeente, de plaats, een wedstrijd van een andere club in Heerenveen, hele woorden en namen die ook een gewoon woord zijn.
Bovenin staan de koppen die de projecteigenaar beoordeelde, in twee lijsten:

- `fromTheLogs`: 25 koppen uit een quiz van 25 oktober 2026 (#267), echt uit de feeds van Omrop Fryslân, NOS en Voetbal International, of verzonnen (dat staat erbij).
  De waarde is wat `judgeRelevance` hoort te geven, niet altijd wat de projecteigenaar zei.
  Zes koppen noemt de projecteigenaar niet relevant en geeft het filter `doubtful`: een bezoeker ziet geen verschil, want beide worden verborgen.
- `knownFalsePositives`: koppen die het filter toont en de projecteigenaar liever niet wil.
  Nu is dat "Man wint loterij in Heerenveen", met de waarde `relevant`.
  Verandert de regel, dan verandert deze test mee.

Een kop erbij zetten gaat zo:

1. Zet `['de kop', 'relevant' | 'doubtful' | 'irrelevant']` in `fromTheLogs`, met de kop zoals de bron hem schreef en de waarde die het filter hoort te geven.
   Zet een kop in `knownFalsePositives` als het filter de kop toont en de projecteigenaar dat niet wil, en schrijf in een commentaar waarom we dat accepteren.
2. Draai `pnpm --filter importer test`.
   Geeft het filter een andere waarde, dan staat de kop in de melding van de test.
3. Past de kop niet bij de regels of de lijsten, verander die dan niet in dezelfde pull request: leg het de projecteigenaar voor, en schrijf een besluit in `docs/beslissingen.md`.

## De regionale feed van Omrop Fryslân

Omrop Fryslân is een bron met de feed `https://www.omropfryslan.nl/rss/index.xml`, het regionieuws van Friesland.
De club is er een klein deel van, dus de feed staat in de seed op `club`.
De adapter leest hem zonder aanpassing: RSS 2.0, tijden met een zone, geen teken voor een betaalmuur.
Een run van 25 oktober 2026 bewaarde alle 50 berichten, en het filter vond er 2 `relevant`, 4 `doubtful` en 44 `irrelevant`.
Na de run veranderden de regels (zie _Een volledige naam is genoeg, en "wint" en "verliest" zijn voetbalwoorden_ in `docs/beslissingen.md`), en dezelfde 50 koppen geven nu 4, 2 en 44 (zie [`docs/bronnen.md`](../../docs/bronnen.md)).
De Friese schrijfwijze en de Friese voetbalwoorden (#270) veranderden daar niets aan, want de feed had op die dag geen Friestalige kop over de club.
De test in `src/import-feeds.test.ts` ("importing a regional feed, the way the register has it") leest een verzonnen feed in deze vorm, [`src/fixtures/regional-sample.xml`](src/fixtures/regional-sample.xml), via de bron zoals de seed hem in het register zet.
De fixture heeft per bericht ook een intro, een categorie en een foto, om te laten zien dat de adapter ze niet bewaart.

## De voetbalfeed van NOS

NOS is een bron met de feed `https://feeds.nos.nl/nosvoetbal`, het voetbalnieuws van NOS.
De club is er een klein deel van, dus de feed staat in de seed op `club`.
De adapter leest hem zonder aanpassing: RSS 2.0, tijden met een zone, geen teken voor een betaalmuur.
Een run van 26 oktober 2026 bewaarde alle 20 berichten, en het filter vond er 1 `relevant`, 0 `doubtful` en 19 `irrelevant` (zie [`docs/bronnen.md`](../../docs/bronnen.md)).
Elk bericht in de feed heeft een beschrijving met HTML en een afbeelding.
De adapter leest ze niet en de database heeft er geen kolom voor, dus ze worden niet bewaard of getoond.
De test in `src/import-feeds.test.ts` ("importing the football feed of NOS, the way the register has it") leest een verzonnen feed in deze vorm, [`src/fixtures/nos-sample.xml`](src/fixtures/nos-sample.xml), via de bron zoals de seed hem in het register zet.
De fixture heeft ook een samenvatting van de speelronde die de club alleen in de beschrijving noemt: het filter kijkt alleen naar de kop, dus die is `irrelevant`.

## De voetbalfeed van het Algemeen Dagblad

Het Algemeen Dagblad is een bron met de feed `https://www.ad.nl/voetbal/rss.xml`, het voetbalnieuws van de krant.
De club is er een klein deel van, dus de feed staat in de seed op `club`.
De feed is RSS 2.0, met tijden in GMT en een `guid` die de link is.
Een deel van de berichten staat achter de betaalmuur, en de feed zegt dat zelf met `<dpp:paid>` (zie _Wat de adapter bewaart_).
Een run van 26 oktober 2026 bewaarde alle 30 berichten, en het filter vond er 1 `relevant`, 0 `doubtful` en 29 `irrelevant`.
De adapter herkende 11 berichten als betaalmuur (zie [`docs/bronnen.md`](../../docs/bronnen.md)).
Elk bericht in de feed heeft een beschrijving, een auteur, een `media:content` en een `media:thumbnail`.
De adapter leest ze niet en de database heeft er geen kolom voor, dus ze worden niet bewaard of getoond.
De test in `src/import-feeds.test.ts` ("importing the football feed of the Algemeen Dagblad, the way the register has it") leest een verzonnen feed in deze vorm, [`src/fixtures/ad-sample.xml`](src/fixtures/ad-sample.xml), via de bron zoals de seed hem in het register zet.
De fixture heeft ook een bericht zonder `dpp:paid` en een bericht dat de club alleen in de beschrijving noemt: het filter kijkt alleen naar de kop, dus dat is `irrelevant`.
De test van de adapter zelf ("the paywall of the Algemeen Dagblad", in `src/read-feed.test.ts`) laat zien dat een ander voorvoegsel voor hetzelfde adres ook werkt.

## De voetbalfeed van ESPN NL

ESPN NL is een bron met de feed `https://www.espn.nl/espn/rss/soccer/news`, het voetbalnieuws van de sportzender ESPN.
De club is er een klein deel van, dus de feed staat in de seed op `club`.
De feed schrijft de tijden met de zone `EST`, bijvoorbeeld `Mon, 26 Oct 2026 11:26:08 EST`, maar het is de Nederlandse tijd, met zomer- en wintertijd (zie [`docs/bronnen.md`](../../docs/bronnen.md) voor hoe we dat hebben vastgesteld).
De adapter heeft daarom per domein een regel, `timeRules` in [`src/read-feed.ts`](src/read-feed.ts): voor `www.espn.nl` geldt `EST` als `Europe/Amsterdam`.
De regel geldt voor deze bron alleen.
In elke andere feed is `EST` geen zone die we lezen, dus daar geldt het moment waarop we het bericht voor het eerst zagen.
In de nacht van het einde van de zomertijd staat 02:00 tot 03:00 twee keer op de klok; de adapter neemt de eerste.
In de nacht van het begin ervan bestaat 02:00 tot 03:00 niet; de adapter leest die tijd als de tijd na de sprong.
Een run van 26 oktober 2026 bewaarde alle 25 berichten, en het filter vond er 1 `relevant`, 0 `doubtful` en 24 `irrelevant`.
Elk bericht in de feed heeft een beschrijving en een auteur, en de feed heeft een logo.
De adapter leest ze niet en de database heeft er geen kolom voor, dus ze worden niet bewaard of getoond.
De test in `src/import-feeds.test.ts` ("importing the football feed of ESPN NL, the way the register has it") leest een verzonnen feed in deze vorm, [`src/fixtures/espn-sample.xml`](src/fixtures/espn-sample.xml), via de bron zoals de seed hem in het register zet.
De fixture heeft berichten van vlak vóór en vlak na het einde van de zomertijd op 25 oktober 2026, een bericht met een tijd die geen tijd is, en een samenvatting die de club alleen in de beschrijving noemt.
De tests van de regel zelf staan in `src/read-feed.test.ts`.

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
- Van de rest houdt hij de vijf waarop het laatst is gereageerd.
  De lijst vraagt 30 discussies, zodat er na het weglaten van die tags genoeg overblijven.
  De lezer sorteert zelf op het laatste bericht, want een vastgezette discussie kan vooraan staan.
- Een discussie waar iets mis mee is, slaat hij over, met de reden in de uitvoer.
  Dat is een titel van meer dan 500 tekens, een schermnaam van meer dan 150, of een adres van meer dan 2048, een ontbrekende titel, een tijd zonder tijdzone, of een tag die niet in het antwoord staat.
- Is het antwoord geen JSON, of staan er discussies in en kan er geen enkele worden gelezen, dan is dat een fout.
  De vorige discussies blijven dan staan.

Na elke run staan er precies de vijf nieuwste discussies die aan de regels voldoen in `discussions`, in één transactie.
Een discussie die niet meer bij de vijf hoort, die het forum heeft verwijderd of die een gast niet meer ziet, is dus na de volgende run weg.
We bewaren geen geschiedenis van titels of schermnamen.
De regel in de uitvoer telt de nieuwe, de gewijzigde en de ongewijzigde discussies van de vijf die blijven.
Een discussie is dezelfde als het id gelijk is: het adres verandert met elk nieuw bericht, want het eindigt op het nummer van het laatste bericht.
Het forum vraagt de import nooit "is het veranderd?" (geen `ETag` of `Last-Modified`): een lege database moet na één run discussies hebben.

De fetcher hoefde niet te veranderen: hij leest elk soort antwoord als bytes, en slaat geen cookies op, dus ook de sessiecookie van de API niet.

## De wedstrijden en de stand

De import leest het programma, de uitslagen en de stand van sc Heerenveen 1 (mannen) bij de Nederlandse Wikipedia, en bewaart ze in `matches`, `standings`, `wikipedia_pages` en `match_imports` (zie de [README van `@fansite/db`](../../packages/db/README.md)).
Waarom Wikipedia en niet de club of een betaalde dienst, staat in [`docs/beslissingen.md`](../../docs/beslissingen.md).
De gegevens vallen onder CC BY-SA 4.0.
Het gaat om de Eredivisie en de KNVB Beker van het lopende seizoen.
Een seizoen begint op 1 juli en heet `2026/27`.
Een afgelopen seizoen leest een aparte opdracht, eenmalig (zie _Een afgelopen seizoen_).

### Welke pagina's

Per seizoen leest de import drie pagina's, met de titels uit `pageTitles` in [`src/read-wikipedia.ts`](src/read-wikipedia.ts):

| Pagina                                           | Wat erop staat                                                                     |
| ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `Eredivisie 2026/27 (mannenvoetbal)`             | De stand, in het sjabloon `Sports table`                                           |
| `Eredivisie 2026/27 (mannenvoetbal)/Wedstrijden` | Het programma en de uitslagen van de hele competitie, in `Footballbox2`, per ronde |
| `KNVB Beker 2026/27 (mannen)`                    | De bekerwedstrijden, ook in `Footballbox2`, met een kop per ronde                  |

De titels volgen uit het seizoen, dus een nieuw seizoen kost geen code.
Alles gaat door de fetcher en alleen naar `/wiki/<pagina>?action=raw`: `robots.txt` van Wikipedia sluit `/w/` en dus `api.php`.
De fetcher stuurt dan de herkenbare user agent en houdt zich aan 429 en `Retry-After`.
Met `action=raw` krijgt de import de wikitekst van de pagina, en leest `read-wikipedia.ts` daarin de sjablonen.

### Wat de import bewaart

- Van sc Heerenveen alleen: de wedstrijden waar de club als `[[sc Heerenveen]]` in staat.
  Van een wedstrijd bewaart hij de ronde (de kop boven het sjabloon, zoals `Speelronde 12` of `Eerste ronde`), de tegenstander, thuis of uit, het stadion, de status en de uitslag.
  Een speelronde van de competitie is een kop `Speelronde <nummer>`; wedstrijden onder andere koppen, zoals de play-offs, leest hij niet.
- De status is `played` bij een score, `postponed` als de score "uitgesteld" of "afgelast" zegt, en anders `scheduled`.
  Een score die we niet kennen, zoals een gestaakte wedstrijd van ons, is een fout.
- Een bekerwedstrijd na verlenging of strafschoppen bewaart hij ook (`extra_time`, `penalties_for` en `penalties_against`).
  Wikipedia schrijft de uitslag in `score` als "N – N", ook na verlenging.
  De bekerpagina's van 2021/22 tot en met 2024/25 zetten er haakjes achter (zie _Oudere bekerpagina's_).
  Een gevuld `aet` (meestal `J`) is verlenging, en `penaltyscore` is de score van de strafschoppen, als "4 – 3" met team 1 eerst.
  De import zet die om naar die van sc Heerenveen en die van de tegenstander, thuis of uit.
  Een wedstrijd van de competitie met `aet` of `penaltyscore` is een fout, zoals strafschoppen zonder verlenging, strafschoppen bij een stand die niet gelijk is, en een score van de strafschoppen die geen "N – N" is.
  Verlenging zonder strafschoppen mag, ook bij een gelijke stand: de strafschoppen komen er bij de volgende lezing bij.
  Zo'n nieuwe score van strafschoppen is geen verandering van de uitslag en geeft geen waarschuwing; een score die verandert wel.
- De doelpuntenmakers van een gespeelde wedstrijd bewaart hij in `match_goals`, een rij per doelpunt.
  Wikipedia heeft ze in `goals1` (het eerste team van het sjabloon) en `goals2`: `[[Luca Oyen|Oyen]] {{goal|52}}` voor het eerste team en `{{goal|45}} [[Jacob Trenskow|Trenskow]]` voor het tweede, een speler per regel en de regels gescheiden door `<br />`.
  De import bewaart de naam zoals die op de pagina staat (de tekst achter de `|` in de link), de pagina waar de link naar wijst (`wikipedia_page`, zoals `Luca Oyen`), de minuut, de blessuretijd en of het een eigen doelpunt of een penalty was.
  Een speler van ons krijgt daarbij zijn rij in `players` (`player_id`): zie _De doelpunten koppelen aan de spelers_.
  Het sjabloon `goal` heeft de minuten achter elkaar: `{{goal|45+2}}` is minuut 45 met 2 minuten erbij, `{{goal|78||80}}` zijn twee doelpunten van dezelfde speler, en `e.d.` of `pen.` na een minuut hoort bij dat doelpunt, zoals in `{{goal|5|pen.|23|pen.}}`.
  Een eigen doelpunt staat op de pagina bij de club die ervan profiteert (`{{goal|7|e.d.}}`), en zo bewaart de import het ook.
  Een rode kaart (`{{rode kaart}}`) en een gemiste penalty (`{{penmis}}`) in deze velden zijn geen doelpunt en vallen weg.
  De doelpunten staan op volgorde van de klok, beide clubs door elkaar, en bij dezelfde minuut eerst die van het eerste team.
  Bij een wedstrijd die niet is gespeeld leest de import de velden niet.
- De aftrap staat in UTC (`kickoff_at`), omgerekend uit de tijd in Nederland.
  Staat er geen tijd, zoals bij speelronde 22 tot en met 32 tot 22 december 2026, dan is `kickoff_at` leeg en staat de datum zoals Wikipedia die geeft in `date_text`, zoals `12-14 februari 2027`.
  `match_date` is dan de eerste dag.
- De stand heeft alleen gewonnen, gelijk, verloren en de doelpunten; gespeeld en punten rekent de import uit.
  `valid_on` is de dag van de laatste competitiewedstrijd die iemand speelde.
- Een rij van een eerder seizoen verandert of verdwijnt nooit, en de import leest die seizoenen niet.
  In het lopende seizoen vervangt hij de wedstrijden en de stand door wat Wikipedia nu heeft.

### De doelpunten koppelen aan de spelers

Een doelpunt van een speler van ons wijst met `player_id` naar zijn rij in `players`, zodat de topscorers per speler tellen en niet per tekst.
De regels staan op één plek, `playerLinker` in [`src/link-players.ts`](src/link-players.ts), en de import van de wedstrijden past ze bij elke lezing toe op de spelers van het seizoen, ook op wie de selectie verliet:

1. de pagina van de link van het doelpunt is gelijk aan de `wikipedia_page` van een speler;
2. anders is de naam in de wedstrijdregel gelijk aan zijn volledige naam;
3. anders eindigt zijn naam op de getoonde naam (meestal de achternaam, `Oyen` voor `Luca Oyen`), en maar één speler heeft zo'n naam;
4. anders blijft `player_id` leeg.

Hoofdletters en accenten tellen niet mee.
Twee spelers met dezelfde achternaam koppelt de import dus alleen als de link van het doelpunt hun pagina noemt, of de volledige naam er staat: zonder link blijft het doelpunt leeg, in plaats van dat hij gokt.
Alleen een doelpunt van een speler van ons wordt gekoppeld: een doelpunt van sc Heerenveen dat geen eigen doelpunt is, en een eigen doelpunt dat bij de tegenstander staat.
Een doelpunt van de tegenstander en een eigen doelpunt van een tegenstander krijgen geen speler, want de spelers van andere clubs staan niet in `players`.

Een doelpunt van ons zonder speler is geen fout: de wedstrijd en zijn doelpunten blijven bewaard.
De import telt ze, en schrijft per lezing een waarschuwing met het aantal en de namen zoals de pagina's ze tonen, als de selectie al gelezen is:

```text
Matches 2026/27: warning, 3 goals of ours have no player in the squad table: Oyen, Vente
```

`pnpm run import:status` toont hetzelfde aantal onder de wedstrijden: `goals of ours without a player: 3 of 41 (Oyen, Vente)`.
De import van de wedstrijden schrijft de doelpunten van een wedstrijd opnieuw als de koppeling verandert, dus een doelpunt krijgt zijn speler bij de eerstvolgende lezing nadat de selectie hem heeft.

### De controles

De import schrijft alleen als alles slaagt.
De controles staan in [`src/check-wikipedia.ts`](src/check-wikipedia.ts):

- sc Heerenveen heeft 34 competitiewedstrijden, in 34 verschillende speelrondes, 17 thuis en 17 uit.
- De stand heeft 18 clubs.
- Per club is gespeeld gelijk aan gewonnen + gelijk + verloren, zijn de punten 3 × gewonnen + gelijk en is het doelsaldo gelijk aan voor min tegen.
- Over de hele stand zijn de doelpunten voor gelijk aan de doelpunten tegen, en het aantal gewonnen gelijk aan het aantal verloren.
- De regel van sc Heerenveen in de stand komt overeen met onze eigen uitslagen: gespeeld, doelpunten en punten.

De doelpuntenmakers hebben een eigen controle, die de import niet laat mislukken, want ze zijn een extra.
Per gespeelde wedstrijd is het aantal doelpunten van elke club gelijk aan haar doelpunten in de uitslag, en een eigen doelpunt telt voor de club die ervan profiteert.
Passen ze niet, of is een regel niet te lezen (een doelpunt zonder naam, een sjabloon dat we niet kennen), dan bewaart de import voor die wedstrijd geen doelpuntenmakers en schrijft hij een waarschuwing.
De wedstrijd zelf blijft gewoon staan:

```text
Matches 2026/27: warning, no scorers: Speelronde 2 (Eredivisie): the scorers are 1-2, the result is 2-2
```

Zijn beide velden leeg, dan zijn de doelpuntenmakers nog niet ingevuld.
Dat is gewoon, vlak na een wedstrijd, en geeft geen waarschuwing.
Komen ze later op de pagina, dan neemt de volgende lezing ze over, en een naam die verandert ook.
Een wedstrijd die van de pagina verdwijnt, neemt haar doelpuntenmakers mee.

Het aantal gespeelde wedstrijden vergelijkt de import niet tussen clubs.
Midden in een speelronde verschilt het per club, en dan zou elke controle falen.
De controles kloppen op elk moment.

### Slaagt of mislukt

De import van de wedstrijden slaagt of mislukt als geheel, in één transactie.
Is een pagina niet te lezen (ook de pagina van de beker), is de opbouw veranderd (een sjabloon dat ontbreekt of niets oplevert, een datum, tijd of score van sc Heerenveen die we niet kennen) of faalt een controle, dan verandert er niets in de database.
De laatste goede versie blijft staan.
Een pagina van de beker die er wel is maar nog geen wedstrijdsjabloon heeft, zoals vroeg in een seizoen, telt als nog geen bekerwedstrijd.
Heeft de import eerder bekerwedstrijden van die pagina gelezen, dan is zo'n pagina veranderd en houdt ze de import tegen.
De import schrijft een regel met de reden:

```text
Matches 2026/27: warning, nothing changed and the last good copy stays: the row of sc Heerenveen (11 played, 18-13, 18 points) is not what the matches say (10 played, 18-13, 15 points)
```

De mislukte poging staat in `match_imports` (`failures_in_a_row`, `last_error`), en `pnpm run import:status` laat hem zien.
Na drie mislukte runs op rij is de import ongezond, zoals een feed, en stopt het overzicht met exitcode 1.
De run zelf stopt niet met exitcode 1: een tikfout op Wikipedia is geen fout van de importer.
De feeds, de wedstrijden en de selectie lopen in dezelfde run, maar een fout in de ene stopt de andere niet.
Een pagina vastzetten op een oude versie doet de import niet.

### Hoogstens één keer per uur

Cron start de import elke 15 minuten.
De import van de wedstrijden vraagt Wikipedia pas weer als `match_imports.retry_at` voorbij is: 59 minuten na elke poging, ook na een mislukte.
Vraagt Wikipedia met 429 of 503 om te wachten, dan wacht hij zo lang als `Retry-After` zegt, hoogstens een dag.
Een run die moet wachten, schrijft niets.

### Een uitslag die verandert

Een nieuwe uitslag neemt de import altijd over.
Stond de oude uitslag drie dagen of langer vast, dan schrijft hij erbij:

```text
Matches 2026/27: warning, the result of Speelronde 1 (Eredivisie) changed after 4 days, from sc Heerenveen 1-0 FC Twente to sc Heerenveen 1-1 FC Twente
```

De waarschuwing staat ook in `match_imports.last_warning`, en dus in het overzicht.
`matches.result_set_at` houdt bij sinds wanneer de uitslag zo staat.

### Oudere bekerpagina's

De bekerpagina's van 2021/22 tot en met 2024/25 schrijven de score en de tijd anders dan die van 2025/26.
De lezer kent deze vormen:

| Wikipedia schrijft                   | De lezer leest                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------ |
| `3 – 1`                              | de eindstand 3 – 1 (2025/26)                                                   |
| `5 – 1 (3 – 0)`                      | de eindstand 5 – 1, met 3 – 0 bij de rust                                      |
| `2 – 4 (2 – 2, 1 – 1)` met `aet = J` | de eindstand 2 – 4 na verlenging, met 2 – 2 na 90 minuten en 1 – 1 bij de rust |
| `20:00 uur` en `20:00`               | dezelfde tijd                                                                  |

- De eindstand is de score van de wedstrijd, met de score van de strafschoppen er los van in `penaltyscore`.
- De import leest de waarden in de haakjes en controleert ze, maar bewaart ze niet.
  Een stand bij de rust kan niet hoger zijn dan de stand daarvoor, en een stand na 90 minuten kan niet hoger zijn dan de eindstand.
  Een stand na 90 minuten zonder verlenging (`aet`) is ook een fout.
  De stand na 90 minuten bewaren en tonen is #300.
- Een score of een tijd in een andere vorm blijft een fout met de naam van de wedstrijd, en de database blijft zoals ze was.
- De fixtures `wikipedia-cup-2021-22.wiki` tot en met `wikipedia-cup-2024-25.wiki` in `src/fixtures/` zijn de wedstrijden van sc Heerenveen uit die vier pagina's.

### Een afgelopen seizoen

Een afgelopen seizoen verandert niet meer, dus de uurlijkse import leest het niet opnieuw.
Eenmalig leest de opdracht `pnpm run import:season` het wel, bijvoorbeeld het vorige seizoen:

```sh
pnpm run import:season 2025/26
```

- Het seizoen heeft de vorm `2025/26`: het jaar, een schuine streep en de laatste twee cijfers van het jaar erna.
  De opdracht weigert met een zin een andere vorm, twee jaren die niet op elkaar volgen, het lopende seizoen en een seizoen dat nog niet begonnen is.
  Zonder seizoen laat ze zien hoe het moet.
  De weigering komt voordat de opdracht Wikipedia iets vraagt of iets schrijft.
- Ze leest de drie pagina's van dat seizoen (drie verzoeken), met dezelfde fetcher, controles en opslag als de uurlijkse import, en schrijft alles in één transactie.
  Ze raakt alleen de rijen van dat seizoen: de rijen van het lopende seizoen blijven zoals ze zijn.
  Draait ze nog eens, dan staat er `0 new, 0 updated, 38 unchanged`.
- Ze neemt de lock van de import.
  Houdt een run van cron die vast, dan doet de opdracht niets en zegt dat, met exitcode 1.
  Probeer het dan na een paar minuten opnieuw.
- De exitcode is 0 als het seizoen is opgeslagen, en 1 als de opdracht het seizoen weigert, een controle faalt of Wikipedia om te wachten vraagt of het niet toestaat.
  Bij een fout blijft de database zoals ze was, en de rij in `match_imports` van dat seizoen noemt de fout.
- De selectie van dat seizoen leest ze niet.
  De doelpunten hebben dus geen speler (`player_id` is leeg), met de naam en de pagina van de speler zoals Wikipedia ze heeft.
  Dat is geen fout en geen waarschuwing.
- `pnpm run import:status` en de waarschuwingen gaan alleen over het lopende seizoen, ook al staat de rij `match_imports` van het afgelopen seizoen in de database.
  Zo telt een seizoen dat niet wordt ververst nooit als ongezond.
- De site laat het afgelopen seizoen nog niet zien: elke vraag van de site kiest één seizoen, en dat is het lopende.

Op de host draait hetzelfde bestand als de cronjob de opdracht, met `--season` en het seizoen erachter:

```sh
node --env-file=<omgevingsbestand> <map van de app>/apps/importer/import.mjs --season 2025/26
```

#### Een gestaakte wedstrijd

De pagina van 2025/26 heeft voor NAC Breda – sc Heerenveen (speelronde 33) twee blokken.
Het eerste heeft de score "Gestaakt 82' (2 – 0)" op 10 mei 2026, het tweede de definitieve uitslag 2–0 op 11 mei, met een voetnoot bij de datum.
De reader werkt zo:

- Een blok waarvan de score met "Gestaakt" begint, telt niet mee zolang de pagina onder dezelfde kop voor dezelfde twee clubs een later blok heeft.
  Het latere blok geldt, met zijn datum, zijn aftrap en zijn doelpunten.
- Heeft de pagina geen later blok, dan stopt de import met een fout die de wedstrijd noemt.
  Een score die we niet kennen, geeft altijd een fout.
- Gestaakte wedstrijden van andere clubs leest hij niet, want alleen de wedstrijden van sc Heerenveen komen in de database.
- Een voetnoot (`<ref>...</ref>`) haalt hij weg voordat hij de pagina leest, dus een datum met een voetnoot leest als de datum.
- Een rode kaart met een VAR-controle (`{{rode kaart VAR|...}}`) is net als een andere rode kaart geen doelpunt.

### Wat de import niet doet

- De versie van een pagina bewaart hij als de `Last-Modified` van Wikipedia (`wikipedia_pages.version`), want de ruwe tekst komt zonder versienummer.
- De schutters bij de strafschoppen en de stand na 90 minuten bewaart hij niet (die laatste komt met #300): alleen de score zoals Wikipedia die in `score` heeft, met of de wedstrijd in verlenging ging en de score van de strafschoppen.
- Een puntenaftrek rekent hij niet mee.
  De stand zou dan niet meer kloppen met de uitslagen, en de import blijft op de laatste goede versie staan tot iemand ingrijpt.
- Scheidsrechter, toeschouwers en opstellingen leest hij niet, en ook geen kaarten, wissels of assists.
  Ook de fixtures hebben die velden leeg gemaakt.
- Andere seizoenen leest hij niet in de uurlijkse import (alleen `pnpm run import:season` leest een afgelopen seizoen), en wedstrijden van andere teams van de club ook niet.

## De selectie

De import leest ook de selectie van sc Heerenveen 1 (mannen) bij de Nederlandse Wikipedia, voor de lijst met spelers op de zoekpagina (#107).
Hij bewaart haar in `players`, met de gezondheid in `squad_imports` en de pagina in `wikipedia_pages` (zie de [README van `@fansite/db`](../../packages/db/README.md)).
De bron, de licentie (CC BY-SA 4.0), de controles en het uur tussen twee lezingen zijn die van de wedstrijden.
Waarom dezelfde bron en waarom de zoekterm een eigen kolom is, staat in [`docs/beslissingen.md`](../../docs/beslissingen.md).

### Welke pagina

Per seizoen leest de import één pagina, met de titel uit `squadPageTitle` in [`src/read-squad.ts`](src/read-squad.ts): `Sc Heerenveen in het seizoen 2026/27 (mannen)`.
Ze gaat door dezelfde fetcher en alleen naar `/wiki/<pagina>?action=raw`.
In de run komt de selectie na de wedstrijden: de pagina's worden na elkaar gelezen, en de selectie ook als de wedstrijden mislukken.
De tabel staat onder `== Selectie 2026/27 ==` en `=== Spelers ===`, en `readSquad` zoekt de kop "Spelers" en de eerste tabel eronder.

### Hoe de tabel is geschreven

De tabel staat op dezelfde pagina op twee manieren geschreven, en de lezer neemt beide:

- alle cellen van een rij op één regel, gescheiden door `||`: `|'''22'''||{{NL-VLAG}}|| align="left" |[[Bernt Klaverboer]]||2029||9||...`;
- elke cel op een eigen regel, na een regel `|-`.

Een rij met groepskop (`! colspan="13" align="left" |Doelmannen`) zet de positie voor de spelers eronder: doelman, verdediger, middenvelder of aanvaller.
Een andere groepskop is een fout.
Bij de eerste cel staat het rugnummer, vet gedrukt of niet.
Een streepje (`| -`) of een lege cel is een speler zonder rugnummer.
Een nummer buiten 1 tot en met 99 is een fout.
De tweede cel is de nationaliteit en blijft weg, net als de cellen na de naam (contract en statistieken).
De naam komt uit de derde cel, zonder attribuut als `align="left"`:

- `[[Naam]]` geeft `Naam`, en `[[Pagina|Naam]]` de tekst achter de `|`;
- komt de naam uit een paginatitel met een toevoeging, zoals `[[Dylan Vente (voetballer)]]`, dan laat de import die toevoeging weg;
- een naam zonder link kan ook.

De pagina waar de link naar wijst, bewaart de import ook, met de toevoeging nog erbij (`Dylan Vente (voetballer)`): spaties voor streepjes, een hoofdletter vooraan en zonder `#kopje`.
Een naam zonder link heeft geen pagina.

### Wat de import bewaart

Van een speler bewaart hij het seizoen, de naam zoals de tabel hem toont, de positie, het rugnummer (mag ontbreken), de zoekterm en de pagina op Wikipedia (`wikipedia_page`, mag ontbreken).
Nationaliteit, leeftijd, contract, statistieken en foto's bewaart hij niet, en vlaggen ook niet.
De zoekterm is de naam zonder de eerste voornaam, uit `searchTerm` in `src/read-squad.ts`: `Bernt Klaverboer` geeft `Klaverboer` en `Joost van Aken` geeft `van Aken`.
Een naam van één woord blijft zoals hij is.
Een voornaam met een streepje, zoals `Jan-Willem`, is één woord.
Een naam die met een voorvoegsel begint, zoals `Van Bergen`, heeft geen voornaam en blijft heel.
Een speler met twee voornamen, zoals `Jan Paul van Hecke`, geeft `Paul van Hecke`: dat verbeter je in de database (`players.search_term`).
De import zet de zoekterm alleen bij een nieuwe speler.
Een speler die er al is, houdt zijn zoekterm, dus een verbetering met de hand blijft staan.

Een goede lezing werkt de selectie van het lopende seizoen bij en vervangt haar niet, want de doelpunten verwijzen naar de `id` van een speler:

- een speler uit de tabel houdt zijn rij en zijn `id`; de import zoekt hem op zijn pagina, en anders op zijn naam;
- een nieuwe speler krijgt een rij, en een nieuw rugnummer, een andere positie, naam of pagina wordt overgenomen;
- een speler die niet meer in de tabel staat, blijft staan met `in_squad` onwaar en het moment in `left_squad_at`, met zijn doelpunten, en staat niet meer in de lijst op de zoekpagina;
- komt hij terug, dan staat hij weer in de selectie met dezelfde `id`.

De import houdt namen uit elkaar zoals de database dat doet: zonder accenten en hoofdletters.
Rijen van een eerder seizoen blijven bewaard en worden niet getoond.
De eerste goede lezing van een seizoen haalt eerst de verzonnen selectie van de seed weg.

### De controles

De import schrijft alleen als alles slaagt.
De controles staan in `checkSquad` in [`src/check-wikipedia.ts`](src/check-wikipedia.ts), naast die van de wedstrijden:

- de tabel is gevonden, onder de kop "Spelers", en elke rij is te lezen;
- er staan 18 tot en met 45 spelers in;
- er zijn minstens twee doelmannen;
- elke positie heeft een speler;
- geen naam en geen pagina komt twee keer voor.

Faalt een controle, of is de opbouw veranderd, dan verandert er niets in de database en blijft de laatste goede selectie staan.
De import schrijft een waarschuwing met de reden, en de wedstrijden en de feeds gaan gewoon door:

```text
Squad 2026/27: warning, nothing changed and the last good copy stays: Sc Heerenveen in het seizoen 2026/27 (mannen): the squad has 17 players, not 18 to 45
```

Een goede lezing schrijft één regel:

```text
Squad 2026/27: 25 new, 0 updated, 0 unchanged, 0 left the squad
```

### Hoogstens één keer per uur

Net als bij de wedstrijden vraagt de import Wikipedia pas weer als `squad_imports.retry_at` voorbij is: 59 minuten na elke poging.
Vraagt Wikipedia om te wachten, dan wacht hij zo lang als `Retry-After` zegt.
Een mislukte poging staat in `squad_imports` (`failures_in_a_row`, `last_error`), en `pnpm run import:status` laat hem zien.
Na drie mislukte runs op rij is de import ongezond.

### De bronvermelding

`wikipedia_pages` bewaart de titel van de pagina, het tijdstip van de laatste goede lezing (`read_at`) en de `Last-Modified` van Wikipedia (`version`), met `kind` `squad`.
De zoekpagina (#107) kan daarmee de bronvermelding tonen, zoals `/wedstrijden` dat voor de wedstrijden doet.
`listWikipediaPages` geeft alleen de pagina's van de wedstrijden, dus de selectie staat niet in die bronvermelding.

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
- Met `--season <seizoen>` leest hetzelfde bestand een afgelopen seizoen, eenmalig (zie _Een afgelopen seizoen_).

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
`src/import-feeds.test.ts`, `src/import-forum.test.ts`, `src/import-season.test.ts`, `src/import.test.ts`, `src/run-log.test.ts`, `src/status.test.ts`, `src/robots-store.test.ts` en `src/bundle.test.ts` draaien op een echte MariaDB, zoals de tests van `packages/db`: start hem met `docker compose up -d --wait`.
De tests van het logboek, de gezondheid en het wachten geven de import een nagebootste klok (de optie `clock`), zodat een test een dag of een maand overslaat zonder te wachten.
`src/bundle.test.ts` bundelt de importer in een lege map en draait hem daar, zonder `node_modules`.

De tests van de wedstrijden lezen verkleinde stukken van de drie pagina's van Wikipedia: [`src/fixtures/wikipedia-programme.wiki`](src/fixtures/wikipedia-programme.wiki), [`wikipedia-standings.wiki`](src/fixtures/wikipedia-standings.wiki) en [`wikipedia-cup.wiki`](src/fixtures/wikipedia-cup.wiki).
De tests van de opdracht voor een afgelopen seizoen lezen stukken van de echte pagina's van 2025/26, op 29 oktober 2026 gelezen: [`wikipedia-season-programme.wiki`](src/fixtures/wikipedia-season-programme.wiki), [`wikipedia-season-standings.wiki`](src/fixtures/wikipedia-season-standings.wiki) en [`wikipedia-season-cup.wiki`](src/fixtures/wikipedia-season-cup.wiki).
Het programma heeft alle wedstrijden van sc Heerenveen, de twee blokken van NAC Breda – sc Heerenveen, de gestaakte wedstrijden van andere clubs met het blok dat ze afmaakt, en de laatste wedstrijd van het seizoen.
Ze zijn gelezen op 25 oktober 2026, en bovenaan staat de herkomst en de licentie (CC BY-SA 4.0).
Er staan alle 34 wedstrijden van sc Heerenveen in en een paar van andere clubs.
De doelpuntenmakers van sc Heerenveen staan erin zoals de pagina ze heeft; die van andere clubs, de scheidsrechters en de verslagen zijn leeggemaakt.
[`wikipedia-cup-goals.wiki`](src/fixtures/wikipedia-cup-goals.wiki) heeft de vier bekerwedstrijden van sc Heerenveen uit het seizoen 2025/26, gelezen op 26 oktober 2026, met een eigen doelpunt, twee doelpunten van één speler in één sjabloon, blessuretijd en een gemiste penalty.
`src/read-wikipedia.test.ts` leest ze zonder database en `src/check-wikipedia.test.ts` toetst de controles.
`src/import-matches.test.ts` draait op een echte MariaDB met een eigen webserver die de drie pagina's geeft, en laat zien dat een falende controle de database ongemoeid laat.
Een test die `runImport` draait en niets met de wedstrijden te maken heeft, geeft de optie `wikipediaOrigin: null`.
De tests van het commando zelf (`src/import.test.ts` en `src/bundle.test.ts`) zetten een gezondheidsrij voor de wedstrijden en voor de selectie met een `retry_at` ver weg, zodat het commando de echte Wikipedia niet vraagt.

De tests van de selectie lezen [`src/fixtures/wikipedia-squad.wiki`](src/fixtures/wikipedia-squad.wiki): de tabel "Spelers" van de pagina van het seizoen 2026/27, gelezen op 26 oktober 2026, met bovenaan de herkomst en de licentie (CC BY-SA 4.0).
De tabel staat er zoals de pagina haar heeft, in beide schrijfwijzen, met 25 spelers, onder wie een speler met een streepje in plaats van een rugnummer.
`src/read-squad.test.ts` leest hem zonder database en toetst de zoekterm op voorbeelden met voorvoegsels, een streepje en een naam van één woord.
`src/check-wikipedia.test.ts` toetst de controles, en `src/import-squad.test.ts` draait op een echte MariaDB met een eigen webserver en laat zien dat een falende controle de database ongemoeid laat, dat een speler zijn `id` houdt, dat een vertrokken speler blijft staan en dat een terugkerende speler weer in de selectie komt.
`src/link-players.test.ts` toetst de regels van de koppeling zonder database, ook voor twee spelers met dezelfde achternaam, en `src/import-matches.test.ts` laat zien dat de doelpunten van een wedstrijd hun speler krijgen.

# @fansite/importer

De importer haalt koppen en links op bij de bronnen.
Hij bevat de fetcher, de ene HTTP-client voor alle adapters, de adapter voor RSS- en Atom-feeds, die ook de podcasts leest (zie _De podcasts_), de lezer van de forumdiscussies van ons eigen forum (zie _Het forum_) en de lezer van de wedstrijden en de stand van de Nederlandse Wikipedia (zie _De wedstrijden en de stand_) en van de selectie van sc Heerenveen (zie _De selectie_).
Welke nieuwsbronnen en podcasts we lezen en waarom, staat in [`docs/bronnen.md`](../../docs/bronnen.md).
Op acceptatie start cron de import elke 15 minuten (zie _De import op acceptatie_).
Een run neemt een lock, schrijft een logboek, houdt de gezondheid van elke feed bij en wacht als een bron daarom vraagt (zie _Het logboek en de gezondheid_).
De keuzes over de importer staan in [`docs/beslissingen/importer.md`](../../docs/beslissingen/importer.md).

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
In juli en augustus leest hij ook het seizoen dat net voorbij is, één keer per week (zie _Het seizoen dat net voorbij is_).
Een ander afgelopen seizoen leest hij niet; dat doet de opdracht `pnpm run import:season <seizoen>`, eenmalig, en `pnpm run import:seasons <seizoen>` voor alle afgelopen seizoenen vanaf een seizoen (zie _Een afgelopen seizoen_).
De selectie van afgelopen seizoenen lezen `pnpm run import:squad <seizoen>` en `pnpm run import:squads <seizoen>` (zie _De selectie van afgelopen seizoenen_).
Wat verdacht lijkt, houdt hij vast; de opdracht `pnpm run import:changes` toont en beslist die wijzigingen (zie _Hoe betrouwbaar een wijziging is_).
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

### Een mail als een import faalt

Wie het logboek niet leest, ziet niet dat een import stilstaat.
Daarom mailt de importer de projecteigenaar als dezelfde import drie runs achter elkaar faalt (`alertAfterFailures` in `packages/db/src/alerts.ts`, de enige plek voor dat getal).
Hij mailt naar `ALERT_MAIL_TO`, via de brievenbus van de site (`sendMail` in `@fansite/shared`, met dezelfde `SMTP_*` en `MAIL_FROM`).

- **Wat meetelt** als een import: een feed, de wedstrijden van het lopende seizoen, de selectie van het lopende seizoen en de back-up van de database (`pnpm db:backup`, elke nacht).
  Elke import telt apart.
- **Wat een mislukte run is:** dezelfde als bij de gezondheid hierboven.
  Een feed die een fout geeft telt, en bij de wedstrijden en de selectie telt een lezing die niets verandert en de laatste goede kopie laat staan (`Matches 2026/27: warning, nothing changed ...`).
  Een back-up die faalt telt ook.
- **Wat niet meetelt:** wachten (429 of 503), een weigering door `robots.txt` en een run die de feed of het uur overslaat (`postponed`).
  Een waarschuwing bij een lezing die wel is bewaard telt ook niet, zoals een uitslag die veranderde of een doelpunt zonder speler.
  Dat geldt ook voor de clubs die niet hersteld zijn.
  Ook een afgelopen seizoen met `pnpm run import:season` telt niet: dat start de projecteigenaar zelf.
  De wekelijkse lezing van het seizoen dat net voorbij is, in juli en augustus, telt evenmin.
  Is de database niet bereikbaar, dan kan de importer niet bijhouden wat hij mailde, en blijft ook de mail uit.
- **De melding:** de derde mislukte run stuurt één mail.
  Hij zegt welke import het is, sinds wanneer, hoe vaak het misging, de laatste foutmelding en de omgeving (acceptatie of productie).
  Daarna volgt hoogstens één herinnering per 24 uur, zolang het misgaat.
- **Weer in orde:** de eerste run die weer slaagt na een melding stuurt één mail.
  Een run die slaagt zonder dat er een melding was, stuurt niets.
- **De mail kan niet weg:** staat `ALERT_MAIL_TO` niet in de omgeving, of mist de brievenbus, dan schrijft de importer een regel `Alert: ... needs a mail, but ... so none is sent.` in het logboek.
  Weigert de mailserver de mail, dan komt er een regel `Alert: the mail about ... could not be sent`.
  De importer probeert het bij de volgende mislukte run opnieuw.
  De import zelf slaagt of faalt daar niet door, en wacht er niet op.
- **De tekst** is Nederlands en bevat geen wachtwoorden of gegevens van personen.
  De foutmelding wordt eerst geschoond.
  Van een webadres blijven de host en het pad over, zonder wachtwoord, query en lange sleutels.
  Een e-mailadres wordt `[e-mailadres]`, en van een pad op de schijf blijft het laatste deel.
- **Waar de stand staat:** in de tabel `import_alerts`, één rij per import (`feed:<id>`, `matches:<seizoen>`, `squad:<seizoen>`, `backup`) zolang het misgaat.
  Een run die slaagt, haalt de rij weg.

Hoe je het instelt en wat de mails betekenen, staat in `docs/acceptatieomgeving.md`, onder _Een mail als een import blijft falen_.

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
  Bij het Algemeen Dagblad en De Gelderlander (beide van DPG Media) is het het element `<dpp:paid>true</dpp:paid>`, met `false` of zonder het element is het bericht open.
  De adapter herkent de naamruimte aan haar adres, `https://www.dpgmedia.cloud/paidrss`, en niet aan het voorvoegsel `dpp`: hij leest eerst welke voorvoegsels de feed voor dat adres kiest.
  Ook dit element leest de tweede lezing, want `feedsmith` kent het niet.
  Een feed zonder het teken van zijn bron heeft geen betaalmuur.
- **Versies van een verhaal:** een bron kan een verhaal steeds onder een nieuwe kop in de feed zetten, zoals een liveblog dat bij elke update een nieuwe kop krijgt.
  Elke versie is dan een bericht met een eigen link en sleutel.
  De adapter kiest aan het domein van de bron of die versies een gedeelde sleutel krijgen (`threadRules` in [`src/read-feed.ts`](src/read-feed.ts)), en zet hem in `items.thread_key`.
  Bij het Algemeen Dagblad en De Gelderlander (DPG Media) is het de code `~` met acht of negen letters en cijfers aan het eind van het pad, zoals `~a40dbd48` in `…/een-kop~a40dbd48/`: de kop in de link verandert, de code niet.
  Een bron zonder regel, en een link zonder die code, krijgt geen sleutel; zo'n bericht is zijn eigen verhaal.
  Dezelfde code bij twee bronnen is geen verband, tenzij de bronnen dezelfde `publisher` hebben: het Algemeen Dagblad en De Gelderlander hebben `dpg-media`, en De Gelderlander is `local`.
  Dan toont de site een artikel dat beide geven één keer, bij de lokale krant (zie de [README van de database](../../packages/db/README.md), _Eén artikel van twee kranten_).
  `publisher` en `local` staan in het register (`realSources` in `packages/db/src/seed.ts`) en de seed zet ze; de importer leest ze niet.
  Een bron krijgt pas een `publisher` als de feeds van die bronnen bewezen dezelfde artikelcodes delen.
  De importer bewaart elke versie en verwijdert er geen; de site toont de laatste (zie de [README van de database](../../packages/db/README.md), _De versies van een verhaal_).
  Bij elke import van een bron met een regel krijgt een bericht dat de sleutel nog mist hem uit zijn bewaarde link, ook als de feed niet gewijzigd is (`backfillThreadKeys` in [`src/import-feeds.ts`](src/import-feeds.ts)); een verborgen bericht blijft zoals het is.
  Een bekend bericht dat de sleutel krijgt of verliest, telt als gewijzigd.
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
Het kijkt naar de kop en naar de tegenstanders van de wedstrijden rond de publicatie, want de importer bewaart geen intro of categorie.
De functie is `judgeRelevance` in [`src/relevance.ts`](src/relevance.ts); ze is zuiver, dus dezelfde kop met dezelfde tegenstanders (zie _Koppen over de tegenstander_) geeft altijd dezelfde waarde.

| Waarde       | Wanneer                                                                                                                                                                                                                                                                                                                                                    | Wat de site doet          |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `relevant`   | De kop noemt "sc Heerenveen" of "sc Hearrenfean" (ook "s.c." en "SC", en in "sc Heerenveen-fan"), Abe Lenstra of de volledige naam van iemand van de club, of "Heerenveen" of "Hearrenfean" met een voetbalwoord, een achternaam van de club of een andere profclub, of twee verschillende achternamen van de club, of één achternaam met een voetbalwoord | Toont het bericht         |
| `doubtful`   | De kop noemt alleen "Heerenveen" of "Hearrenfean" (de gemeente en de plaats schrijven ook veel nieuws), of alleen een achternaam van de club                                                                                                                                                                                                               | Toont het bericht nergens |
| `irrelevant` | Verder                                                                                                                                                                                                                                                                                                                                                     | Toont het bericht nergens |

Een kop over de tegenstander van een wedstrijd rond de publicatie is ook `relevant` (zie _Koppen over de tegenstander_).
Hoofdletters en accenten tellen niet, en alleen hele woorden: "Heerenveenseweg" is niet "Heerenveen" en "wandelwedstrijd" is geen "wedstrijd".
Het filter kent ook de Friese schrijfwijze (zie _Friese woorden_).
De keuzes staan in `docs/beslissingen/importer.md`, onder _De regels van het filter_.
De importer bewaart elk bericht, ook `doubtful` en `irrelevant`.
Het beheer (`/beheer/berichten`) toont ze wel, met een woord erbij, zodat een moderator ze kan vinden en verbergen.
Een scherm om twijfelgevallen te beoordelen, en het met de hand corrigeren van een uitkomst (#76), komen later.

### Welke clubs een kop noemt

Naast `relevance` bewaart de importer bij elke kop welke andere profclubs hij noemt, voor de kaart "Nieuws over <club>" op de pagina van een club (#777, besluit #794).
De functie is `clubsNamed` in [`src/relevance.ts`](src/relevance.ts).
Ze volgt de regels van `judgeRelevance`: hele woorden, hoofdletters, accenten en "s.c." tellen niet, en een lange naam gaat voor een korte ("Jong Ajax" is niet ook "Ajax").
Een naam in een andere naam telt niet: `lookalikeClubs` in `relevance-terms.ts` heeft "Excelsior Maassluis", en `namesakeClubs` heeft "Sparta Praag".
sc Heerenveen zelf staat er niet in, en een kop zonder club heeft geen rij.

- **De tabel:** `item_clubs` heeft een rij per kop en club, met de club zoals `matches.opponent` hem heeft (`otherClubFullNames` in `relevance-terms.ts`: "N.E.C.", "Excelsior Rotterdam").
  De pagina's van de site vinden de club daarmee via `clubs.name` en `club_names`.
  De rijen gaan weg met hun kop.
- **Bij elke kop:** `storeItems` zet de rijen na het bewaren van elke kop die de importer ziet, ook bij een feed met het filter `none` en ook buiten de dagen rond een wedstrijd.
  Verandert de titel, dan volgen de rijen de nieuwe titel.
  Een verborgen kop houdt zijn titel, dus ook zijn rijen.
- **Bestaande koppen:** de uurlijkse import raakt alleen wat nog in een feed staat.
  `pnpm run import:item-clubs` loopt over alle koppen in de database en zet hun rijen, zonder verzoek aan een bron.
  Op de host is het `import.mjs --item-clubs`.
  Het neemt de lock van de import en schrijft één regel: `Item clubs: 1250 items checked, 310 rows added, 0 rows removed`.
  Een tweede keer schrijft niets.
  Draai het ook na een wijziging aan de lijst met profclubs in `relevance-terms.ts`.
- **Terugdraaien:** de tabel weghalen verliest geen gegevens (`DROP TABLE item_clubs`): `import:item-clubs` maakt de rijen weer uit de titels.

De tests staan in [`src/store-item-clubs.test.ts`](src/store-item-clubs.test.ts) en bij `clubsNamed` in [`src/relevance.test.ts`](src/relevance.test.ts).

### Koppen over de tegenstander

Een bericht over de tegenstander rond een wedstrijd tegen ons is ook nieuws over sc Heerenveen, ook als de kop de club niet noemt: "ADO beleeft frustrerende avond".
Een kop noemt een club, en sc Heerenveen speelt in het lopende seizoen een wedstrijd tegen die club.
Dan is de kop `relevant` van 3 dagen voor tot en met 3 dagen na die wedstrijd.
Noemt de kop ook een andere profclub uit de lijst, dan telt hij niet.
Een kop die al `relevant` is, blijft het, en de andere regels veranderen niet.

- **Het venster:** de datum van de wedstrijd min 3 dagen tot en met plus 3 dagen.
  Een bericht van 3 dagen voor de wedstrijd telt, een bericht van 4 dagen ervoor niet.
  Na de wedstrijd telt een bericht tot en met de 3e dag, en een bericht van 4 dagen erna niet.
  Het bericht en de wedstrijd tellen als Nederlandse dagen (`Europe/Amsterdam`).
  Zo staat een bericht van half één 's nachts, in de nacht van de overgang naar de wintertijd, op de dag die een lezer zag.
- **De wedstrijden:** de wedstrijden van de competitie en de beker in `matches`, gespeeld of nog te spelen, van het lopende seizoen.
  De tabel heeft ook eerdere seizoenen (`pnpm import:season`), maar die tellen niet.
  Een wedstrijd zonder aftrap telt met de datum die we hebben, en een uitgestelde of geannuleerde wedstrijd zonder nieuwe datum telt niet.
  Speelt een club twee keer tegen ons, dan heeft elke wedstrijd zijn eigen venster.
  Alleen de tegenstander van die wedstrijd telt: een club die we pas over een maand treffen, doet nu niets.
- **Hoe het werkt:** `judgeRelevance` leest zelf niets uit de database.
  `importFeeds` leest de wedstrijden van het seizoen één keer per run, en `opponentsAround` (in `src/relevance.ts`) kiest bij elk bericht de tegenstanders van de wedstrijden binnen het venster.
  Die namen gaan als tweede argument naar `judgeRelevance`.
  Zonder wedstrijden werkt het filter als eerst.
  Een wedstrijd die de Wikipedia-import in dezelfde run bewaart, telt vanaf de volgende run.
- **Hetzelfde bericht opnieuw:** de importer beoordeelt een bekend bericht bij elke run opnieuw.
  Een bericht dat `irrelevant` was voordat de wedstrijd bekend was, wordt dus `relevant` zodra hij erin staat.
  Een verborgen bericht blijft verborgen, en een feed met het filter `none` verandert niet.
- **Alleen de tegenstander:** een kop die de tegenstander noemt en ook een andere profclub uit `otherClubGroups`, gaat over een andere wedstrijd: "NEC kan geen vervolg geven: ploeg speelt gelijk tegen FC Groningen".
  Zo'n kop telt niet als kop over de tegenstander.
  Een club die naar een plaats heet, telt ook hier alleen met zijn volledige naam: "tegen Groningen" is geen andere club, "tegen FC Groningen" wel.
  Twee namen van dezelfde club zijn één club.
  Een tegenstander die niet in de lijst staat, telt niet mee als club uit de lijst: "Excelsior Maassluis" is niet "Excelsior" uit Rotterdam.
  Een club in het buitenland met dezelfde naam telt niet als de tegenstander: "Sparta Praag" is niet Sparta Rotterdam (`namesakeClubs` in `src/relevance-terms.ts`).
  Ook een gewoon woord dat op een clubnaam lijkt, staat daar: "De treffers van Napoli, Koopmeiners en Lang" gaat over doelpunten en niet over De Treffers.
  De vergelijking let niet op hoofdletters, dus de zin "de treffers van" scheidt die kop van "De Treffers verrast in de beker".
  Een kop met "Heerenveen" valt onder de andere regels en wordt niet slechter van een tweede club.
- **De naam van de tegenstander:** de naam in `matches.opponent` ("N.E.C.", "ADO Den Haag", "Almere City FC") hoort bij de namen die het filter voor die club kent.
  Dat verband staat op één plek: `otherClubGroups` in [`src/relevance-terms.ts`](src/relevance-terms.ts), met de namen van één club bij elkaar.
  De naam uit de wedstrijd, of die naam zonder FC, SC, VV, SV of AFC ervoor of erachter, moet een van die namen zijn.
  Dan telt elke naam van de groep: "ADO beleeft frustrerende avond" noemt ADO Den Haag.
  Een club die naar een plaats heet, telt alleen met zijn volledige naam ("FC Twente", niet "Twente"), zodat een kop over de stad niet `relevant` wordt.
- **Een tegenstander die niet in de lijst staat:** een amateurclub in de beker telt met zijn naam uit de wedstrijd, zonder voor- of achtervoegsel.
  Bij twee woorden of meer telt de naam altijd: "Excelsior Maassluis", "Quick Boys", "De Treffers".
  De regel kijkt niet naar de bron: hij geldt voor elke feed op `club`, en een bron kiest geen eigen clubs.
  Een wedstrijd van meer dagen, zoals "1–3 december 2026" bij de beker, telt met de eerste dag die de importer bewaart.
  Bij één woord telt hij ook ("IJsselmeervogels", "ASWH"), tenzij het een gewoon woord is (`ordinaryClubWords`: Quick, Victoria en dergelijke) of alleen een voorvoegsel ("AFC").
  Komt een club vaak voor in een kop die er niet over gaat, zet hem dan in `ordinaryClubWords`, of zijn volledige naam in `otherClubGroups`.

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
Dat zijn nu de feed van Omrop Fryslân (zie _De regionale feed van Omrop Fryslân_), de voetbalfeed van NOS (zie _De voetbalfeed van NOS_), die van het Algemeen Dagblad (zie _De voetbalfeed van het Algemeen Dagblad_), die van De Gelderlander (zie _De sportfeed van De Gelderlander_), die van ESPN (zie _De voetbalfeed van ESPN NL_), de sportfeed van Rijnmond (zie _De sportfeed van Rijnmond_), de sportfeed van RTV Noord en de FC Groningen-feed van OOG Groningen (zie _De feeds van RTV Noord en OOG Groningen_).

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
   Een volledige naam maakt een kop `relevant`; een achternaam alleen maakt hem `doubtful`, en `relevant` met "Heerenveen", met een voetbalwoord of met een tweede achternaam van de club.
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

`otherClubGroups` in [`src/relevance-terms.ts`](src/relevance-terms.ts) heeft de namen van de andere profclubs van de Eredivisie en de Eerste Divisie, met de namen van één club bij elkaar.
`otherClubs` is dezelfde lijst plat.
"Heerenveen" naast zo'n naam is een wedstrijd, dus de kop is `relevant`, ook zonder voetbalwoord.
Een club zonder "Heerenveen" zegt niets.
Een club waarvan de korte naam ook een plaats is (Groningen, Utrecht, Zwolle, Emmen), staat er alleen met zijn volledige naam: "Heerenveen en Groningen" staat net zo goed in een kop over de A7.
Pas de lijst aan na de promotie en degradatie van elk seizoen (mei tot juli), en schrijf bovenaan de datum van de controle.
Zet de namen die een club in een kop heeft in één groep: de regel van de tegenstander vindt de club met de naam uit `matches` (zie _Koppen over de tegenstander_).

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
3. Past de kop niet bij de regels of de lijsten, verander die dan niet in dezelfde pull request: leg het de projecteigenaar voor, en schrijf een besluit in `docs/beslissingen/importer.md`.

## De regionale feed van Omrop Fryslân

Omrop Fryslân is een bron met de feed `https://www.omropfryslan.nl/rss/index.xml`, het regionieuws van Friesland.
De club is er een klein deel van, dus de feed staat in de seed op `club`.
De adapter leest hem zonder aanpassing: RSS 2.0, tijden met een zone, geen teken voor een betaalmuur.
Een run van 25 oktober 2026 bewaarde alle 50 berichten, en het filter vond er 2 `relevant`, 4 `doubtful` en 44 `irrelevant`.
Na de run veranderden de regels (zie _Een volledige naam is genoeg, en "wint" en "verliest" zijn voetbalwoorden_ in `docs/beslissingen/importer.md`), en dezelfde 50 koppen geven nu 4, 2 en 44 (zie [`docs/bronnen.md`](../../docs/bronnen.md)).
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
De test van de adapter zelf ("the paywall of the Algemeen Dagblad and De Gelderlander", in `src/read-feed.test.ts`) laat zien dat een ander voorvoegsel voor hetzelfde adres ook werkt.

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

## De sportfeed van De Gelderlander

De Gelderlander is een bron met de feed `https://www.gelderlander.nl/sport/rss.xml`, het sportnieuws van de regionale krant.
Een feed van de hele krant bestaat niet.
De club is er een klein deel van, dus de feed staat in de seed op `club`.
De krant staat dicht bij N.E.C., Go Ahead Eagles en De Treffers (Groesbeek, bij Nijmegen): rond een wedstrijd tegen een van hen telt een kop over de tegenstander mee (zie _Het relevantiefilter_), en daarbuiten alleen een kop over sc Heerenveen.
Dat is de regel van de tegenstander, die voor elke feed op `club` geldt en niet per bron is; er is geen lijst met clubs bij de krant.
De feed is RSS 2.0, met tijden in GMT en een `guid` die de link is.
De krant is van DPG Media, net als het Algemeen Dagblad, en de feed markeert een bericht achter de betaalmuur op dezelfde manier, met `<dpp:paid>` (zie _Wat de adapter bewaart_).
De adapter heeft daar geen nieuwe regel voor: het domein `www.gelderlander.nl` staat bij het adres van de naamruimte in `paywallNamespaces`.
Een run van 1 november 2026 bewaarde alle 30 berichten, en het filter vond er 2 `relevant`, 0 `doubtful` en 28 `irrelevant`.
De adapter herkende 9 berichten als betaalmuur (zie [`docs/bronnen.md`](../../docs/bronnen.md)).
De koppen over Thialf en over de ijshockeyclub Nijmegen Devils zijn `irrelevant`: ze noemen geen club uit de lijsten, en Nijmegen Devils is niet N.E.C.
Elk bericht in de feed heeft een beschrijving, een auteur, een `media:content` en een `media:thumbnail`, en de feed heeft een logo.
De adapter leest ze niet en de database heeft er geen kolom voor, dus ze worden niet bewaard of getoond.
De test in `src/import-feeds.test.ts` ("importing the sport feed of De Gelderlander, the way the register has it") leest een verzonnen feed in deze vorm, [`src/fixtures/gelderlander-sample.xml`](src/fixtures/gelderlander-sample.xml), via de bron zoals de seed hem in het register zet.
De fixture heeft koppen over N.E.C. en Go Ahead Eagles, over Thialf en Nijmegen Devils en over een andere club, een kop over de club, en een bericht zonder `dpp:paid`.
De test geeft de feed een wedstrijd tegen N.E.C. en dan een tegen Go Ahead Eagles, en laat zien dat alleen de kop over die tegenstander rond de wedstrijd `relevant` wordt.
Een tweede reeks tests ("around the cup match against De Treffers on 1 December 2026") gebruikt een eigen verzonnen feed met koppen op de randen van het venster, 27 en 28 november en 4 en 5 december, bij een bekerwedstrijd tegen De Treffers op 1 december 2026.
Ze laten zien dat de koppen van 28 november tot en met 4 december `relevant` zijn, dat dezelfde koppen zonder de wedstrijd `irrelevant` zijn, en dat "De treffers van Napoli, Koopmeiners en Lang" `irrelevant` blijft, ook in het venster.

## De sportfeed van Rijnmond

Rijnmond is een bron met de feed `https://www.rijnmond.nl/rss/sport.xml`, het sportnieuws van de regionale omroep van Rotterdam.
De feed is RSS 2.0, met 50 berichten en tijden in GMT, en heeft geen betaalmuur; de adapter leest hem zonder aanpassing.
Het regionieuws van Rijnmond staat niet in het register (zie [`docs/bronnen.md`](../../docs/bronnen.md)).
Bijna geen kop gaat over sc Heerenveen: de feed gaat vooral over Feyenoord, en verder over Sparta en Excelsior.
De seed zet de feed op `club`, en de bron telt door de regel van de tegenstander: een kop over Feyenoord, Sparta of Excelsior is `relevant` van 3 dagen voor tot 3 dagen na een wedstrijd tegen die club (zie _Het relevantiefilter_).
"Sparta Praag" is een andere club dan Sparta Rotterdam: de zinnen in `namesakeClubs` in [`src/relevance-terms.ts`](src/relevance-terms.ts) laat de regel eerst weg.
Een run van 1 november 2026 bewaarde alle 50 berichten, en het filter vond er 0 `relevant`, 0 `doubtful` en 50 `irrelevant`, want er was geen wedstrijd tegen een Rotterdamse club in de buurt.
Elk bericht heeft een beschrijving, een auteur en een afbeelding; de adapter leest ze niet en de database heeft er geen kolom voor, dus ze worden niet bewaard of getoond.
De test in `src/import-feeds.test.ts` ("importing the sports feed of Rijnmond, the way the register has it") leest een verzonnen feed in deze vorm, [`src/fixtures/rijnmond-sample.xml`](src/fixtures/rijnmond-sample.xml), met proefwedstrijden tegen Feyenoord, Sparta Rotterdam en Excelsior Rotterdam.
De tests van de regel zelf staan in `src/relevance.test.ts`.

## De feeds van RTV Noord en OOG Groningen

RTV Noord is een bron met de feed `https://www.rtvnoord.nl/rss/sport.xml`, het sportnieuws van de regionale omroep van Groningen en Drenthe.
OOG Groningen, de lokale omroep van de stad, heeft twee feeds: `https://www.oogtv.nl/tag/sc-heerenveen/feed/` en `https://www.oogtv.nl/tag/fc-groningen/feed/`.
Alle drie zijn RSS 2.0 met tijden in GMT of `+0000`, en geen heeft een betaalmuur; de adapter leest ze zonder aanpassing, op één regel na: de links van OOG hebben `utm_`-tags, en `parseLink` in [`src/read-feed.ts`](src/read-feed.ts) haalt ze van elke link af.
De feed van sc Heerenveen van OOG gaat helemaal over de club en staat als gewone feed in de seed.
De sportfeed van RTV Noord en de feed van FC Groningen van OOG gaan vooral over FC Groningen; de seed zet ze op `club`, en ze tellen door de regel van de tegenstander: een kop over FC Groningen is `relevant` van 3 dagen voor tot 3 dagen na een wedstrijd tegen hen (zie _Het relevantiefilter_).
Een kop over schaatsen in Heerenveen krijgt de waarde `doubtful` en wordt dus niet getoond.
Het Dagblad van het Noorden staat niet in het register: zijn feeds geven een 403 (zie [`docs/bronnen.md`](../../docs/bronnen.md)).
Een run van 9 november 2026 bewaarde 50 berichten van RTV Noord (0 `relevant`, 50 `irrelevant`), 10 van de feed van sc Heerenveen van OOG (10 `relevant`) en 10 van de feed van FC Groningen van OOG (10 `irrelevant`), want er was geen wedstrijd tegen FC Groningen in de buurt.
Elk bericht heeft een beschrijving en een afbeelding of een auteur; de adapter leest ze niet en de database heeft er geen kolom voor, dus ze worden niet bewaard of getoond.
De tests in `src/import-feeds.test.ts` ("importing RTV Noord and OOG Groningen, the way the register has them") lezen verzonnen feeds in deze vorm, [`src/fixtures/rtv-noord-sample.xml`](src/fixtures/rtv-noord-sample.xml), [`src/fixtures/oog-groningen-sample.xml`](src/fixtures/oog-groningen-sample.xml) en [`src/fixtures/oog-groningen-club-sample.xml`](src/fixtures/oog-groningen-club-sample.xml), met een proefwedstrijd tegen FC Groningen.

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
  De beschrijving van de podcast zelf staat in de seed, als tekst van de maker (zie _De beschrijving van een podcast is die van de maker_ in [`docs/beslissingen/importer.md`](../../docs/beslissingen/importer.md)); de import leest hem niet.
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

De import leest het programma, de uitslagen en de stand van sc Heerenveen 1 (mannen) bij de Nederlandse Wikipedia, en bewaart ze in `matches`, `standings`, `league_results`, `wikipedia_pages` en `match_imports` (zie de [README van `@fansite/db`](../../packages/db/README.md)).
Waarom Wikipedia en niet de club of een betaalde dienst, staat in [`docs/beslissingen/importer.md`](../../docs/beslissingen/importer.md).
De gegevens vallen onder CC BY-SA 4.0.
Het gaat om de Eredivisie, de KNVB Beker en de play-offs voor de Conference League van het lopende seizoen, om de play-offs voor de Europa League van 2010/11 tot en met 2019/20 (zie _De play-offs_), om de Europa League van 2012/13 (zie _De Europa League van 2012/13_) en om 63 wedstrijden van 2007/08 tot en met 2009/10 (zie _De wedstrijden van 2007/08 tot en met 2009/10_).
Een seizoen begint op 1 juli en heet `2026/27`.
Een afgelopen seizoen leest een aparte opdracht, eenmalig (zie _Een afgelopen seizoen_).
Het seizoen dat net voorbij is, leest de uurlijkse import in juli en augustus nog één keer per week (zie _Het seizoen dat net voorbij is_).

### Welke pagina's

Per seizoen leest de import vier pagina's van de Nederlandse Wikipedia (2012/13 heeft er een van de Engelse bij, zie _De Europa League van 2012/13_), met de titels uit `pageTitles` in [`src/read-wikipedia.ts`](src/read-wikipedia.ts):

| Pagina                                           | Wat erop staat                                                                                         |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `Eredivisie 2026/27 (mannenvoetbal)`             | De stand, in het sjabloon `Sports table` (oudere seizoenen: zie _De oudere seizoenen_)                 |
| `Eredivisie 2026/27 (mannenvoetbal)/Wedstrijden` | Het programma en de uitslagen van de hele competitie, in `Footballbox2`, per ronde                     |
| `KNVB Beker 2026/27 (mannen)`                    | De bekerwedstrijden, ook in `Footballbox2`, met een kop per ronde                                      |
| `Play-offs Nederlands voetbal 2027`              | De play-offs voor de Conference League of de Europa League, ook in `Footballbox2` (zie _De play-offs_) |

De titels volgen uit het seizoen, dus een nieuw seizoen kost geen code.
Alles gaat door de fetcher en alleen naar `/wiki/<pagina>?action=raw`: `robots.txt` van Wikipedia sluit `/w/` en dus `api.php`.
De fetcher stuurt dan de herkenbare user agent en houdt zich aan 429 en `Retry-After`.
Met `action=raw` krijgt de import de wikitekst van de pagina, en leest `read-wikipedia.ts` daarin de sjablonen.

### De play-offs

Na de competitie spelen de clubs op de plekken vijf tot en met negen om één ticket voor de tweede voorronde van de Conference League, vanaf 2020/21.
Daarvoor was het ticket voor de Europa League.
Wikipedia heeft per jaar een pagina, `Play-offs Nederlands voetbal <jaar>`, met het jaar waarin het seizoen eindigt: voor 2026/27 is dat 2027.
De import bewaart de wedstrijden van sc Heerenveen als competitie `Play-offs Conference League`, of als `Play-offs Europa League` vóór 2020/21, en `wikipedia_pages` bewaart de pagina met de soort `playoffs`.
Een seizoen heeft de ene of de andere, dus de sleutel (seizoen, competitie, ronde) blijft uniek.

- Hij leest alleen de wedstrijden onder de kop `Play-offs voor de UEFA Conference League` (in de eerste jaren `UEFA Europa Conference League`) of `Play-offs voor de UEFA Europa League`, tot de volgende kop van dat niveau.
  De kop zegt de competitie.
  De play-offs om promotie en degradatie op dezelfde pagina laat hij weg.
- De ronde is de kop van het niveau erboven, `Halve finales` als `Halve finale`, en verder `Finale`, `Eerste ronde` en `Tweede ronde`, en niet de kop `Wedstrijd A`.
  Een wedstrijd onder een andere kop is een fout.
- In 2022 en 2023 speelden de clubs de halve finale over twee wedstrijden, elk met `round = Wedstrijd 1/2` in het sjabloon.
  De ronde is dan `Halve finale, wedstrijd 1/2`, zodat de sleutel (seizoen, competitie, ronde) per wedstrijd verschilt.
- De pagina's van 2011 tot en met 2020 hebben twee rondes (`Eerste ronde` en `Tweede ronde`), elk over twee wedstrijden met `round = Wedstrijd 1` en `Wedstrijd 2`.
  De ronde is dan `Eerste ronde, wedstrijd 1/2`.
  Verlenging staat op die pagina's als `(nv)` of `n.v.` achter de score, en de lezer kent beide.
  Na de tweede wedstrijd van een paar volgt de verlenging, dus de stand na 90 minuten bewaart hij daar niet, zoals bij de Conference League.
- Sc Heerenveen speelde Europa League-play-offs in 2013, 2014, 2015, 2017 en 2018.
  Bij de andere jaren (2011, 2012, 2016, 2019) heeft de pagina de kop en geen wedstrijd van ons.
  De pagina van 2020 bestaat niet (Wikipedia geeft 404, gelezen op 3 november 2026), want dat seizoen is afgebroken, en een ontbrekende pagina is geen mislukking.
- Verlenging en strafschoppen leest hij zoals bij de beker.
- De pagina komt pas in mei, en een lopend seizoen heeft hem niet: Wikipedia geeft dan 404.
  Dat is geen mislukking: de import gaat door met de andere pagina's, schrijft geen fout en telt niet mee voor `failures_in_a_row` (en dus niet voor de mail van #533).
  De play-offwedstrijden die er al zijn, blijven dan staan, want een pagina die er niet is, zegt niets over hen.
  Elk ander antwoord is wel een mislukking, zoals bij de andere pagina's.
- Een jaar waarin sc Heerenveen niet meespeelt, heeft de kop en geen wedstrijd.
  Dat is geen fout; de import bewaart dan geen wedstrijd en noemt de pagina niet als bron.
  Staat de kop er niet meer, dan is de pagina veranderd en is het wel een fout.
- Bij de bron staat alleen wat de wedstrijd zelf zegt: de namen, de stand, de minuten, het stadion en de aftrap.
  Het verslag van de NOS in het sjabloon bewaren we niet.
- Gecontroleerd tegen de volledige pagina's van 2022, 2023, 2024, 2025 en 2026: ze hebben dezelfde opbouw.
  De pagina van 2023 is met de hand gelezen en heeft geen fixture; de andere vier staan in `src/fixtures/`.
  Dat de import ze leest zonder verdere wijziging, laat de test voor 2025/26 zien (zie _Een afgelopen seizoen_).
  De pagina's van 2013, 2014, 2015, 2017 en 2018 zijn de Europa League-play-offs; zie `src/fixtures/wikipedia-playoffs-2013.wiki` en de andere.

### De selecties van 2007/08 tot en met 2017/18

De pagina's `Sc Heerenveen in het seizoen JJJJ/JJ (mannen)` (zie `squadPageTitle`) van 2007/08 tot en met 2017/18 hebben een sectie "Selectie" of "Voorlopige selectie", in drie vormen.
`readSeasonSelection` in [`src/read-selection.ts`](src/read-selection.ts) leest ze in de vorm `SeasonSquad`, met de bron `selectie`.
Het is een tekstlezer: hij doet zelf geen verzoek en schrijft niets.
De import van #744 roept hem aan.
Alleen de lijst of de tabel in die sectie telt; een link in de tekst eromheen of in een latere sectie is geen speler.

- 2007/08: een lijst met een vlag, een naam en het einde van het contract, onder een kop per contract.
  De lijst heeft geen positie en geen rugnummer.
- 2008/09 en 2009/10: een brede tabel met twee spelers op een regel (vlag, naam, vorige club, contract), onder een kop per positie.
  2009/10 zet het rugnummer voor de naam; 2008/09 heeft geen rugnummers.
  De cel na een vlag is de naam, de rest van de regel is het contract en de vorige club.
- 2013/14 tot en met 2017/18: een tabel met het rugnummer, de naam, de nationaliteit, de geboortedatum en de vorige club in een rij, onder een kop per positie.
  De nationaliteit is hier `{{NL}}`, geen `{{NL-VLAG}}`.
  Het teken van de aanvoerder achter een naam (een link naar een bestand, of `{{aanvoerder}}`) valt weg.

De wedstrijden en de doelpunten zijn leeg, want de pagina's geven ze niet.
De koppen zijn die van `squadGroups`; een kop die er niet in staat, is een fout.
Een naam zonder link blijft bewaard als hij minstens twee woorden heeft en geen afkorting met een punt.
Een andere naam zonder link blijft weg, met een waarschuwing.

Een pagina zonder zo'n sectie geeft `none`: 2010/11, 2011/12 en 2012/13 hebben geen selectie.
Een sectie in een andere vorm geeft een fout: een kop, een kolom, een rugnummer of een cel die de lezer niet kent, een rij met te weinig cellen, een regel in de lijst die geen speler is, of een sectie zonder spelers.
De tabellen met statistieken van 2008/09, 2016/17 en 2017/18 leest deze lezer niet.

### De selectie van de Engelse Wikipedia voor vijf seizoenen

Voor 2018/19 tot en met 2021/22 en voor 2024/25 heeft de Nederlandse Wikipedia geen pagina met de selectie.
De Engelse heeft er een: `2018–19 SC Heerenveen season`, met een lange streep (`englishSquadPage` in [`src/read-english-squad.ts`](src/read-english-squad.ts) noemt de titel per seizoen).
`readEnglishSquad` in hetzelfde bestand leest de pagina in de vorm `SeasonSquad`, met de bron `engels`.
Het is een tekstlezer: ze doet zelf geen verzoek en schrijft niets.
Het verzoek gaat met dezelfde fetcher en regels als bij de Europa League-wedstrijden van 2012/13 (zie _De Europa League van 2012/13_): `pageUrl(englishWikipediaOrigin, titel)` geeft `https://en.wikipedia.org/wiki/<titel>?action=raw`.
De beslissing is _De Engelse Wikipedia is een bron voor de selectie van vijf seizoenen zonder Nederlandse pagina_ in [`docs/beslissingen/importer.md`](../../docs/beslissingen/importer.md).

De pagina's hebben twee vormen, en een pagina kan beide hebben:

- een lijst onder "First-team squad" met het sjabloon `{{Fs player}}` (rugnummer, positie, naam), en soms een lijst "Out on loan";
- tabellen onder "Transfers" of "Player Transfers", een voor "In" en een voor "Out".

Wie meetelt uit de transfers is dezelfde regel als bij de Nederlandse pagina's: een speler die is aangetrokken, een speler die is verhuurd en een speler die in de winter (januari tot en met maart) vertrok.
Wie in de zomer vertrok, telt niet mee.
Een vertrokken speler zonder datum die we kunnen lezen blijft weg, met een waarschuwing.
Een speler op beide lijsten is één speler, met het rugnummer van de selectie; het sleutelwoord is zijn naam zonder accenten (`Milovanovic` en `Milovanović`).

De spelers krijgen een naam en geen `wikipedia_page`: een Engelse titel (`Charlie Webster (footballer)`) is geen titel van de Nederlandse Wikipedia (`Charlie Webster`).
De koppeling met de doelpunten loopt dus via de naam en de achternaam, zoals `playerLinker` dat al doet.
Een seizoen krijgt de Engelse pagina alleen als de Nederlandse er niet is: een speler heeft binnen een seizoen één bron.
2025/26 heeft geen van beide en blijft een gat.

Een pagina zonder selectie en zonder transfers geeft `none`.
Een selectie zonder spelers die we kennen, een sjabloon, positie of rugnummer dat we niet kennen, een tabel zonder kolom Player of onder een kop die we niet kennen, geeft een fout.
In de transfers is een rij zonder naam (het sjabloon dat niemand invulde, zoals in 2020/21) geen speler.

### Wat de import bewaart

- Van sc Heerenveen alleen: de wedstrijden waar de club als `[[sc Heerenveen]]` in staat.
  Van een wedstrijd bewaart hij de ronde (de kop boven het sjabloon, zoals `Speelronde 12` of `Eerste ronde`), de tegenstander, de club van de tegenstander (zie _De clubs van de tegenstanders_), thuis of uit, het stadion, de status en de uitslag.
  Een ronde van de competitie is een kop `Speelronde <nummer>` of `Inhaalronde <nummer>` (zie _Een wedstrijd onder Inhaalronde_); wedstrijden onder andere koppen leest hij niet.
- De status is `played` bij een score, `postponed` als de score "uitgesteld" of "afgelast" zegt, en anders `scheduled`.
- Van een seizoen dat voorbij is (`pnpm import:season`), wordt een wedstrijd die na het lezen nog `postponed` is, `cancelled`: de score zegt "uitgesteld" of "afgelast", en geen blok onder `Inhaalronde <nummer>` met een score heeft hem vervangen.
  Hij wordt dan niet meer gespeeld, zoals de acht wedstrijden van sc Heerenveen in 2019/20 die door de coronacrisis nooit zijn gespeeld.
  De uurlijkse import van het lopende seizoen verandert niets: daar blijft zo'n wedstrijd `postponed`.
  De regel kijkt naar het seizoen en niet naar een lijst, en hij geldt voor elke competitie.
  Er komt geen reden bij.
  Een wedstrijd die al als `postponed` is bewaard, wordt `cancelled` bij de volgende lezing van het seizoen.
  Een score die we niet kennen, zoals een gestaakte wedstrijd van ons, is een fout (voor een wedstrijd van een andere club een waarschuwing, behalve de uitzondering onder _Een gestaakte wedstrijd_).
- Een bekerwedstrijd na verlenging of strafschoppen bewaart hij ook (`extra_time`, `penalties_for` en `penalties_against`).
  Wikipedia schrijft de uitslag in `score` als "N – N", ook na verlenging.
  De bekerpagina's van 2021/22 tot en met 2024/25 zetten er haakjes achter (zie _Oudere bekerpagina's_).
  Een gevuld `aet` (meestal `J`) is verlenging, en `penaltyscore` is de score van de strafschoppen, als "4 – 3" met team 1 eerst.
  De import zet die om naar die van sc Heerenveen en die van de tegenstander, thuis of uit.
  Een wedstrijd van de competitie met `aet` of `penaltyscore` is een fout, zoals strafschoppen zonder verlenging, strafschoppen bij een stand die niet gelijk is, en een score van de strafschoppen die geen "N – N" is.
  Verlenging zonder strafschoppen mag, ook bij een gelijke stand: de strafschoppen komen er bij de volgende lezing bij.
  Zo'n nieuwe score van strafschoppen is geen verandering van de uitslag en geeft geen waarschuwing; een score die verandert wel.
- Bij een bekerwedstrijd met `aet` bewaart hij ook de stand na 90 minuten (`after_ninety_for` en `after_ninety_against`, van sc Heerenveen en van de tegenstander).
  Hetzelfde geldt voor een wedstrijd van de play-offs voor de Conference League met `aet`, als de ronde in één wedstrijd is gespeeld.
  Op de pagina van 2025/26 staat hij in `half time score`, als twee paren gescheiden door een komma: eerst de stand na 90 minuten en dan de rust, zoals "2 – 2, 1 – 1".
  Hij neemt het eerste paar over als het tweede paar er niet boven ligt en het eerste niet boven de eindstand ligt.
  Dat is de enige manier om de paren te herkennen, want een paar redacteuren schreven ze omgekeerd (de rust eerst).
  Een veld met één paar, een leeg veld, een veld dat we niet kunnen lezen en paren die niet kloppen geven "niet bekend": de wedstrijd blijft bewaard zonder die stand, en het is geen fout.
  De stand na 90 minuten mag gelijk zijn aan de eindstand, want de verlenging kan zonder doelpunt voorbijgaan.
- Hij bewaart ook het aantal toeschouwers (`attendance`) en de scheidsrechter (`referee`) uit de velden `attendance` en `referee` van elk blok, voor de competitie, de beker en de play-offs.
  Punten, spaties en vaste spaties in het getal zijn duizendtallen ("21.022" is 21022), en `0` is een wedstrijd zonder publiek.
  Alleen een gespeelde wedstrijd heeft een aantal.
  De scheidsrechter is de volledige naam uit het doel van de link (`[[Sander van der Eijk|Van der Eijk]]` geeft "Sander van der Eijk"), of de tekst als er geen link is.
  Een vervanger achter de naam telt niet mee.
  We bewaren geen link, pagina of foto van de scheidsrechter.
  Een leeg veld, een streepje of "n.b." is "niet bekend".
  Een getal boven 150.000, tekst die geen getal is en een naam met opmaak die we niet lezen geven ook "niet bekend", met een waarschuwing in het logboek: de wedstrijd blijft bewaard, en het is geen fout.
  Bij een gestaakte wedstrijd zijn het de gegevens van het gestaakte blok, want dat is de wedstrijd (19.241 en Van der Eijk voor NAC Breda – sc Heerenveen).
  Een leeg veld dat later gevuld wordt, gaat zonder meer door.
  Een bijgesteld aantal is een verbetering, en een andere scheidsrechter bij een wedstrijd van drie dagen of langer geleden wacht (zie _Hoe betrouwbaar een wijziging is_).
  Geen pagina toont deze velden nog.
  Bij een wedstrijd zonder `aet` leest hij `half time score` niet als stand na 90 minuten, ook niet met een komma erin.
  De stand bij de rust bewaart hij niet.
  Een ronde van de play-offs met een heen- en terugwedstrijd ("Halve finale, wedstrijd 1/2") krijgt hem niet, want de verlenging komt na de tweede wedstrijd.
  Een wedstrijd van de competitie krijgt hem ook niet.
- Bij een wedstrijd die gestaakt en later uitgespeeld is, bewaart hij een regel in `note` (zie _Een gestaakte wedstrijd_ hieronder).
  Elke andere wedstrijd heeft geen `note`, en de volgende import van het seizoen vult hem bij een wedstrijd die al in de database stond.
- De doelpuntenmakers van een gespeelde wedstrijd bewaart hij in `match_goals`, een rij per doelpunt.
  Wikipedia heeft ze in `goals1` (het eerste team van het sjabloon) en `goals2`: `[[Luca Oyen|Oyen]] {{goal|52}}` voor het eerste team en `{{goal|45}} [[Jacob Trenskow|Trenskow]]` voor het tweede, een speler per regel en de regels gescheiden door `<br />`.
  De import bewaart de naam zoals die op de pagina staat (de tekst achter de `|` in de link), de pagina waar de link naar wijst (`wikipedia_page`, zoals `Luca Oyen`), de minuut, de blessuretijd en of het een eigen doelpunt of een penalty was.
  Een speler van ons krijgt daarbij zijn rij in `players` (`player_id`): zie _De doelpunten koppelen aan de spelers_.
  Het sjabloon `goal` heeft de minuten achter elkaar: `{{goal|45+2}}` is minuut 45 met 2 minuten erbij, `{{goal|78||80}}` zijn twee doelpunten van dezelfde speler, en een deelcode na een minuut hoort bij dat doelpunt, zoals in `{{goal|5|pen.|23|pen.}}`.
  De import kent `e.d.` en `o.g.` voor een eigen doelpunt en `pen.` en `p` voor een strafschop, en geen andere schrijfwijze.
  Dezelfde codes (en `pen`) kunnen als markering tussen haakjes voor of na de naam staan, zoals `([[Strafschop|pen]]) [[Hakim Ziyech]]`: de markering hoort bij het doelpunt, niet bij de naam of de pagina van de speler.
  Een markering hoort bij één doelpunt, dus op een regel met meer dan één doelpunt is ze een tekst die we niet kunnen lezen.
  Een andere deelcode of markering geeft de waarschuwing "no scorers" voor die wedstrijd.
  Een doelpunt dat beide is (`{{goal|5|e.d.|pen.}}`) is een fout.
  Een eigen doelpunt staat op de pagina bij de club die ervan profiteert (`{{goal|7|e.d.}}` of `{{goal|7|o.g.}}`), en zo bewaart de import het ook.
  Een rode kaart (`{{rode kaart}}`) en een gemiste penalty (`{{penmis}}`) in deze velden zijn geen doelpunt en vallen weg.
  De doelpunten staan op volgorde van de klok, beide clubs door elkaar, en bij dezelfde minuut eerst die van het eerste team.
  Bij een wedstrijd die niet is gespeeld leest de import de velden niet.
- De aftrap staat in UTC (`kickoff_at`), omgerekend uit de tijd in Nederland.
  Staat er geen tijd, zoals bij speelronde 22 tot en met 32 tot 22 december 2026, dan is `kickoff_at` leeg en staat de datum zoals Wikipedia die geeft in `date_text`, zoals `12-14 februari 2027`.
  `match_date` is dan de eerste dag.
- Een datum van meer dagen, voor een weekend of een bekerronde, leest de import in elke schrijfwijze die Wikipedia gebruikt.
  De dagen staan achter elkaar met een koppelteken of een gedachtestreepje, met of zonder spaties erom: `12-14 februari 2027`, `1–3 december 2026` en `1 – 3 december 2026`.
  Over twee maanden staat de tweede maand erbij: `30 november–2 december 2026`.
  Het jaar staat achter de laatste dag, en mag ook achter de eerste staan: `31 december 2026 – 2 januari 2027`.
  Staat het jaar alleen achter de laatste dag en loopt de datum door het nieuwe jaar (`31 december–2 januari 2027`), dan hoort de eerste dag bij het jaar ervoor.
  Een datum van meer dagen heeft nooit een aftrap, ook niet als de pagina een tijd geeft: `kickoff_at` is leeg, en `date_text` heeft de tekst van Wikipedia.
  Een datum van één dag zonder jaar (`15 december`) krijgt op de wedstrijdpagina van de competitie het jaar van het seizoen: augustus tot en met december het eerste jaar, januari tot en met juli het tweede.
  Het seizoen komt van de aanroep, niet uit de pagina.
  Op de pagina's van de beker en de play-offs, en bij een datum van meer dagen, kent de import een datum zonder jaar niet.
  Een datum zonder jaar daar, een laatste dag voor de eerste of een dag die niet bestaat kent de import niet: dat is een fout, en de import verandert niets (zie _Slaagt of mislukt_).
- De stand heeft alleen gewonnen, gelijk, verloren en de doelpunten; gespeeld en punten rekent de import uit.
  `valid_on` is de dag van de laatste competitiewedstrijd die iemand speelde.
- Van elke club in de competitie bewaart hij de uitslag van de gespeelde competitiewedstrijden in `league_results`, uit dezelfde pagina met het programma (zie _De uitslagen van alle clubs_).
- Een rij van een eerder seizoen verandert of verdwijnt nooit, en de import leest die seizoenen niet.
  In het lopende seizoen vervangt hij de wedstrijden, de stand en de uitslagen door wat Wikipedia nu heeft.

### De uitslagen van alle clubs

De stand over de laatste wedstrijden (#602) heeft de uitslag van elke club nodig.
`readLeagueResults` in [`src/read-wikipedia.ts`](src/read-wikipedia.ts) leest ze uit de pagina met het programma, die de import al leest, en [`src/league-results.ts`](src/league-results.ts) schrijft ze in `league_results`.

- Er komt een rij voor elk blok `Footballbox2` onder een kop `Speelronde <nummer>` of `Inhaalronde <nummer>` met een score: seizoen, ronde als getal, dag, thuisclub, uitclub en de doelpunten van allebei.
  De sleutel is het seizoen met de thuisclub en de uitclub.
- Een wedstrijd zonder score, uitgesteld of afgelast heeft geen rij.
  Wordt hij gespeeld, dan komt de rij bij de volgende import.
  Het blok zonder score in de oorspronkelijke ronde van een wedstrijd die onder een inhaalronde is gespeeld, heeft ook geen rij: de wedstrijd staat er één keer in, met het nummer van de kop (zie _Een wedstrijd onder Inhaalronde_).
- Een wedstrijd die gestaakt en later afgemaakt is, telt één keer, met de eindstand en de dag van het blok dat hem afmaakt.
  Wie thuis speelde, volgt het blok waarmee de wedstrijd begon (zie _Een gestaakte wedstrijd_).
  Staat er geen blok dat hem afmaakt, dan heeft de wedstrijd geen uitslag en geen rij.
- De beker en de play-offs staan er niet in, en de doelpuntenmakers van andere clubs ook niet.
- Een pagina met alleen de wedstrijden van sc Heerenveen, zoals de oudere pagina's, geeft geen uitslagen: de tabel blijft dan leeg voor dat seizoen en dat is geen fout.
- Een gespeelde wedstrijd waarvan de score of de dag niet te lezen is, blijft weg en komt in een waarschuwing.
- De rijen van het seizoen worden in dezelfde transactie vervangen als de stand.
  Verschilt er niets, dan schrijft de import niets.

De namen van de clubs zijn die van `standings.club`, zodat de site de twee aan elkaar kan koppelen.
`matchClubNames` schrijft een naam van de uitslagen zoals de stand als de twee op de hoofdletters na gelijk zijn, of als [`src/club-names.ts`](src/club-names.ts) ze als één club kent.
Een naam die de stand niet heeft, blijft staan zoals de pagina hem schrijft en komt in de waarschuwing.

De regel van de uitslagen staat onder de regel van de wedstrijden:

```text
Matches 2026/27: league results of all clubs: 90 new, 0 updated, 0 unchanged, 0 removed
```

De controles weigeren een club die tegen zichzelf speelt, een ronde buiten 1 tot en met 34 en een thuisclub die twee keer tegen dezelfde uitclub speelt (`checkResults` in [`src/check-wikipedia.ts`](src/check-wikipedia.ts)).
Dan verandert er niets, zoals bij elke controle.

### De doelpunten koppelen aan de spelers

Een doelpunt van een speler van ons wijst met `player_id` naar zijn rij in `players`, zodat de topscorers per speler tellen en niet per tekst.
De regels staan op één plek, `playerLinker` in [`src/link-players.ts`](src/link-players.ts), en de import van de wedstrijden past ze bij elke lezing toe op de spelers van het seizoen, ook op wie de selectie verliet:

1. de persoon van de pagina van de link van het doelpunt (`person_id`, zie _De personen van de doelpuntenmakers_) is de persoon van een speler: zo vindt de import een doelpunt onder een doorverwijzing van de pagina van de speler.
   Hebben twee spelers van het seizoen dezelfde persoon, dan slaat deze regel over;
2. anders is de pagina van de link van het doelpunt gelijk aan de `wikipedia_page` van een speler;
3. anders is de naam in de wedstrijdregel gelijk aan zijn volledige naam;
4. anders eindigt zijn naam op de getoonde naam (meestal de achternaam, `Oyen` voor `Luca Oyen`), en maar één speler heeft zo'n naam;
5. anders blijft `player_id` leeg.

Hoofdletters en accenten tellen niet mee.
Twee spelers met dezelfde achternaam koppelt de import dus alleen als de link van het doelpunt hun pagina noemt, of de volledige naam er staat: zonder link blijft het doelpunt leeg, in plaats van dat hij gokt.
Alleen een doelpunt van een speler van ons wordt gekoppeld: een doelpunt van sc Heerenveen dat geen eigen doelpunt is, en een eigen doelpunt dat bij de tegenstander staat.
Een doelpunt van de tegenstander en een eigen doelpunt van een tegenstander krijgen geen speler, want de spelers van andere clubs staan niet in `players`.

Vindt geen regel een speler, en linkt het doelpunt naar een pagina?
Dan maakt de import de doelpuntenmaker als speler van het seizoen zodra het doelpunt is opgeslagen (`adoptScorers` in [`src/import-matches.ts`](src/import-matches.ts)), want de tabel van de selectie op Wikipedia loopt soms achter.
Het doelpunt krijgt hem in dezelfde run.
Een doelpunt van een wijziging die nog wacht, maakt geen speler.
De speler krijgt de bron `doelpunten`, de pagina van de link, de persoon van die pagina en als naam de titel zonder de toevoeging tussen haakjes.
Het logboek zegt het in één regel:

```text
Matches 2022/23: 1 player added from a goal: Pelle van Amersfoort
```

Dat gebeurt niet in een seizoen met wedstrijden van de oude fansite, en niet voor een wedstrijd zolang de redactie de doelpunten ervan invulde.
Het gebeurt ook niet als een andere speler van het seizoen dezelfde naam of dezelfde persoon heeft.
Staat de speler later in de tabel van de selectie, dan krijgt hij die rij met de bron `selectie`, en houdt hij zijn `id` en zijn doelpunten.
Tot dan blijft hij in de selectie staan: hij stond nooit in de tabel, dus hij is er ook niet uit vertrokken.

Een doelpunt van ons zonder link en zonder speler is geen fout: de wedstrijd en zijn doelpunten blijven bewaard.
De import telt ze, en schrijft per lezing een waarschuwing met het aantal en de namen zoals de pagina's ze tonen, als het seizoen spelers heeft:

```text
Matches 2026/27: warning, 3 goals of ours have no player in the squad table: Oyen, Vente
```

`pnpm run import:status` toont hetzelfde aantal onder de wedstrijden: `goals of ours without a player: 3 of 41 (Oyen, Vente)`.
De import van de wedstrijden schrijft de doelpunten van een wedstrijd opnieuw als de koppeling verandert, dus een doelpunt krijgt zijn speler bij de eerstvolgende lezing nadat de selectie hem heeft.

### De personen van de doelpuntenmakers

Elke speler die een doelpunt maakte of in de selectie staat, van ons en van de tegenstander, is een persoon in `persons` met een eigen `id` (zie de [README van `@fansite/db`](../../packages/db/README.md), _De tabellen `persons` en `person_pages`_).
Twee titels die naar hetzelfde artikel verwijzen, zoals `Alfred Finnbogason` en `Alfreð Finnbogason`, geven dezelfde persoon.
Een doelpunt met een pagina en een speler van de selectie krijgen zijn `person_id`.
Daarvoor vraagt de import elke titel die nog niet in `person_pages` staat één keer aan Wikipedia (`lookUpPersonPages` in [`src/person-pages.ts`](src/person-pages.ts)), vóór de transactie van het seizoen, in de import van de wedstrijden en in die van de selectie:

- Het zijn dezelfde fetcher en `lookUpTitles` als bij de clubs: alleen `?action=raw`, `robots.txt` en hoogstens drie doorverwijzingen.
  Een titel die al in `person_pages` staat, kost geen verzoek, ook niet als een doorverwijzing ernaartoe wijst.
- Een titel zonder artikel (404, een rode link) wordt een persoon met de titel zoals hij staat.
- Een verzoek dat mislukt geeft een waarschuwing met `Persons:` vooraan, en laat `person_id` leeg.
  De volgende run probeert het opnieuw, en de run van het seizoen valt er niet door.
  Een `robots.txt` die weigert of een verzoek om te wachten stopt het vragen voor die run, en drie mislukte titels achter elkaar ook.
- Een lijst `personTitleAliases` in [`src/person-names.ts`](src/person-names.ts), in de vorm van `clubFullNames`, zegt welke titels één persoon zijn als geen doorverwijzing het zegt.
  Hij gaat voor het verzoek.
  Is een andere titel uit de lijst al een eigen persoon, dan voegt de import hem samen met de persoon van de titel die blijft (`mergeListedPersons`), aan het begin van de import van de wedstrijden en van een selectie.
  Alles wat naar de persoon wijst gaat mee, en twee rijen van de persoon in `players` van één seizoen worden één rij (`mergePersons` in `@fansite/db/person-merge`).
  De run meldt het één keer, als waarschuwing: `Persons: 'Ugur Yıldırım' is merged into 'Uğur Yıldırım'`.
  Schrijft een tabel van de selectie de andere titel nog, dan zet de import de pagina en de naam om in de schrijfwijze die blijft (`chosenSpelling`), zodat er geen tweede rij komt.
  Een rij van het seizoen die de andere schrijfwijze nog heeft, krijgt eerst de schrijfwijze die blijft (`storeChosenSpellings`).
- Een doelpunt in een seizoen dat voorbij is, krijgt zijn `person_id` zonder dat een wijziging wacht: een verschil alleen in de koppelingen telt als een aanvulling.

Het logboek noemt het aantal titels dat is opgevraagd, alleen als dat meer dan nul is:

```text
Matches 2026/27: persons: 20 titles asked, 20 new persons, 20 titles remembered, 20 names stored (18 from a sort key, 2 guessed, 0 from the list)
```

De import voegt geen personen samen op een gelijke naam, alleen de personen uit `personTitleAliases`.
Zijn twee titels zonder accenten, hoofdletters, streepjes, spaties en apostrofs gelijk, de toevoeging tussen haakjes meegeteld (`Johnny Jansen (1952)` en `(1975)` dus niet), dan waarschuwt hij:

```text
Matches 2026/27: warning, Persons: 1 group of persons look alike and are not merged: 'Daniël Jansen' and 'Daniel Jansen'
```

`pnpm run import:status` toont het aantal groepen onder `Persons that look alike` en de aantallen namen per bron onder `Person names`.
Zijn het dezelfde mensen, zet de titels dan in `personTitleAliases`: de volgende import voegt ze samen.
Zijn het twee mensen, zet ze dan in `personsWhoDiffer` in `packages/db/src/persons.ts`: de import, `import:status`, de pagina Kwaliteit en het controleverslag van de oude fansite melden de groep dan niet meer.
Jordy Bruijn en Jordy Buijs staan daar.
Een pagina die later een andere titel krijgt, ziet de import niet: de oude titel blijft in `person_pages` staan.

### De namen van de personen

Elke persoon heeft een naam in delen: `name`, `given_name`, `family_name_prefix`, `family_name` en `name_source` (zie de [README van `@fansite/db`](../../packages/db/README.md), _De tabellen `persons` en `person_pages`_).
De import leest ze uit hetzelfde verzoek waarmee hij de titel opvraagt, dus een nieuwe titel kost één verzoek, ook voor de naam.

- **De sorteersleutel** van het artikel, `{{DEFAULTSORT:Aken, Joost van}}`, geeft de achternaam.
  Hij past als de achternaam het eind van de titel is, zonder te letten op accenten, hoofdletters, punten en streepjes.
  De naam komt uit de titel, met accent: `Anholt, Pele van` geeft `Pelé van Anholt`.
  De kleine woorden vlak voor de achternaam zijn het voorvoegsel (`van`, `van der`), en `name_source` is `sort_key`.
- **Zonder sleutel**, of als hij niet past, raadt de import één keer: het laatste woord is de achternaam, de kleine woorden ervoor zijn het voorvoegsel, en een naam van één woord is een achternaam zonder voornaam.
  Dat is `guess`, en het logboek schrijft er een waarschuwing met `Persons:` vooraan bij, met de titel en de uitkomst.
- **De lijst `personNames`** in [`src/person-names.ts`](src/person-names.ts) zegt per titel de voornaam, het voorvoegsel en de achternaam.
  Hij gaat voor alles, geeft `manual` en wordt nooit vervangen.
  Zet er een naam in nadat je de gok in het logboek hebt nagekeken.
- **Een persoon zonder naam** krijgt hem bij de eerstvolgende import van een seizoen met zijn titel: de import vraagt zijn artikel nog één keer op.
  Een tweede run schrijft en vraagt niets.
- **Het logboek** noemt per run hoeveel namen zijn bewaard, per bron, en `pnpm run import:status` toont de aantallen per bron voor alle personen.

### De gegevens van de personen uit Wikidata

Van elke persoon bewaart de importer ook wat Wikidata (CC0) weet: het Q-nummer, het paginanummer van het Nederlandse artikel, de geboortedatum met de precisie, de geboorteplaats, de nationaliteiten, de posities en de linie (zie de [README van `@fansite/db`](../../packages/db/README.md), _De gegevens van Wikidata_).
De site toont ze nog niet, en de site vraagt nooit iets aan Wikidata of Wikipedia.
De stap staat in [`src/import-person-data.ts`](src/import-person-data.ts) en draait aan het eind van elke run, na de pagina's van Wikipedia, in de vergrendeling van die run:

- **Welke personen:** elke persoon zonder `wikidata_read_at`, de oudste eerst, hoogstens 200 per run.
  De eerste ronde loopt dus over meerdere runs.
  Een persoon wordt één keer gelezen.
- **Twee verzoeken per persoon:** de pagina-informatie van het artikel (`/wiki/<titel>?action=info`) geeft het paginanummer en het Q-nummer, en daarna het item (`/wiki/Special:EntityData/Q….json` op `www.wikidata.org`).
  De API's onder `/w/` en `/api/` laat `robots.txt` niet toe, en de importer vraagt ze niet.
- **De namen** van een land, een plaats of een positie komen uit hun eigen item: het Nederlandse label, anders het Engelse.
  Elk Q-nummer wordt één keer opgevraagd en staat dan in `wikidata_items`.
  Een Q-nummer zonder een van beide labels geeft een waarschuwing met `Persons:` vooraan en wordt overgeslagen.
- **Wat uit het item komt:** `P569` (geboortedatum, met de precisie; een datum grover dan een jaar blijft leeg), `P19` (geboorteplaats), `P27` (nationaliteit, alle waarden) en `P413` (positie, alle waarden).
  Een uitspraak met de rang "deprecated" telt niet, en bij een voorkeursrang telt alleen de voorkeur.
- **De linie** komt uit de lijst `personLines` in [`src/person-lines.ts`](src/person-lines.ts) (`manual`), anders uit de eerste positie van Wikidata die in `wikidataPositionLines` staat (`wikidata`), anders uit de linie die het vaakst in de rijen van `players` van de persoon staat, bij gelijkstand die van het laatste seizoen (`squad`).
  Zonder een van de drie blijft hij leeg.
  `personLines` wordt bij elke run toegepast, ook op personen die al gelezen zijn, en wordt nooit vervangen.
  Een positie die niet in `wikidataPositionLines` staat, zegt niets over de linie.
  Voeg hem toe als je ziet dat iemand daardoor zonder linie blijft.
- **Een persoon zonder artikel of zonder item** blijft leeg zonder gok en is toch gelezen, dus de volgende run vraagt niets over hem.
  Heeft een andere persoon hetzelfde Q-nummer, dan houdt de eerste het en waarschuwt de run.
- **Een verzoek dat mislukt** laat de persoon ongelezen en geeft een waarschuwing.
  Het Q-nummer blijft bewaard, dus de volgende run vraagt dan alleen het item.
  Na drie mislukte verzoeken achter elkaar, bij een `robots.txt` die weigert en bij een verzoek om te wachten (429 of 503) stopt de stap voor deze run.
- **Het tempo:** de stap wacht 250 milliseconden tussen twee verzoeken en vraagt alles met onze User-Agent, door de fetcher.
- **Het logboek** noemt per run hoeveel personen zijn gelezen, hoeveel een geboortedatum, nationaliteit en linie kregen (de linie per bron), hoeveel leeg bleven en hoeveel artikelen en items zijn opgevraagd:

```text
persons (Wikidata): 200 persons read, 188 with a birth date, 195 with a nationality, 170 with a line (120 from Wikidata, 50 from the squad, 0 from the list), 3 left empty; 200 articles and 230 items asked
```

Een run zonder nieuwe personen schrijft niets en vraagt niets.
`pnpm run import:status` toont hoeveel personen zijn gelezen en wat ze hebben, en hoeveel personen er per linie zijn (`persons per line`).
Daaronder staat per seizoen hoeveel verslagen een opstelling van ons hebben en hoeveel daarvan een formatie voor ons en voor de tegenstander (`Formations of match reports`).
Op acceptatie lees je dat zonder SSH met de workflow _Import old site_ en de keuze `status`: de uitvoer staat in de samenvatting van de run.

### De clubs van de tegenstanders

Elke wedstrijd hangt aan een club (`matches.club_id`, zie _De tabellen `clubs` en `club_names`_ in de [README van `@fansite/db`](../../packages/db/README.md)).
Een club is één artikel op de Nederlandse Wikipedia, met een vaste slug voor zijn adres.
Een titel die een doorverwijzing is, telt als het artikel waar hij naar verwijst (zie _Een doorverwijzing is hetzelfde artikel_).
De regels staan op één plek, `createClubBook` in [`clubs.ts`](../../packages/db/src/clubs.ts) van het package, en de import van de wedstrijden past ze toe op elke wedstrijd die hij schrijft:

1. De reader leest de pagina van de link bij de tegenstander (`[[Telstar (voetbalclub)|Telstar]]` geeft `Telstar (voetbalclub)`), zoals bij de spelers.
   De naam is de tekst die de pagina toont, zoals voorheen.
2. Heeft de wedstrijd een artikel, dan zoekt de import de club met dat artikel.
   Is er geen, dan neemt de club met die naam het artikel als hij er nog geen heeft (een club die de migratie van alleen een naam maakte).
   Is ook die er niet, dan maakt de import een nieuwe club.
3. Heeft de wedstrijd geen artikel, dan zoekt de import de club op naam, ook tussen de andere namen (`club_names`).
   Hoofdletters, accenten en leestekens tellen niet mee: `N.E.C.` en `NEC` zijn dezelfde naam.
   Is er geen, dan maakt hij een nieuwe club zonder artikel.
4. De slug van een nieuwe club komt van de naam, zonder accenten, punten en apostrofs (`N.E.C.` geeft `nec`, `Be Quick '28` geeft `be-quick-28`).
   Heeft een andere club de slug al, dan komt er `-2` achter, dan `-3`, enzovoort.
   `kies` is nooit een slug, want de site gebruikt `kies` zelf in een adres, zoals `/cijfers/kies`.
   Een club houdt zijn slug, ook als zijn naam verandert.
5. Schrijft Wikipedia de naam van een club die we al hebben anders, dan komt die naam bij de andere namen.
   Is de wedstrijd van het nieuwste seizoen dat we van de club hebben, dan wordt het de naam van de club, en de oude naam komt bij de andere namen.
   Een naam die de club al had, verandert niets, zodat twee schrijfwijzen in één seizoen niet om de beurt de naam zijn.
   Een naam van een andere club blijft bij die club.
   De redactie kan er namen bij zetten met een lijst van namen in het beheer (`/beheer/clubnamen`): elke naam daarvan komt ook in `club_names`, zodat de import een hernoemde club als dezelfde club vindt.
   De import bepaalt de naam in de kop en de slug, ook voor een club met zo'n lijst.

Een lijst met volledige namen gaat vóór deze regels (`clubFullNames` in [`src/club-names.ts`](src/club-names.ts)).
Ze zegt van een club hoe hij heet en welke andere schrijfwijzen dezelfde club zijn: nu `Excelsior Rotterdam` met `Excelsior` en `SBV Excelsior`.
De import zoekt een naam eerst in die lijst, met of zonder artikel, en een naam die erin staat is altijd de volledige naam.
Een club die de import onder zo'n naam maakt, krijgt de slug van de volledige naam (`excelsior-rotterdam`) en de andere schrijfwijzen als andere namen.
Een naam die niet in de lijst staat, werkt zoals hierboven: `Excelsior Maassluis`, een amateurclub in de beker, is een andere club.

De lijst herstelt ook wat er al in de database staat.
Aan het begin van elke run, vóór een seizoen wordt gelezen, zoekt de import de clubs van de lijst die er twee keer staan of onder een andere naam (`repairKnownClubs`, dat `repairClubs` draait, zie de README van `@fansite/db`).
Hij voegt ze samen en zet de volledige naam en de slug goed, in een eigen transactie.
Het herstel wacht dus niet op een seizoen dat te lezen is: ook als de import van het seizoen stilstaat, bijvoorbeeld op een datum die de reader niet kent, staan de clubs goed.
Het commando voor een afgelopen seizoen (`pnpm import:season`) herstelt de clubs ook, vóór hij het seizoen leest.
Hebben twee van die clubs elk een eigen artikel dat geen doorverwijzing is, dan laat hij ze staan en zegt dat in het logboek: één artikel is één club.
Elke samenvoeging, naamswijziging en nieuwe naam staat in de uitvoer van de run, met `Clubs:` vooraan:

```text
Clubs: merged club 'Excelsior' into club 'Excelsior Rotterdam'
```

Een tweede run verandert niets en schrijft geen regel.
Faalt het herstel, dan stopt de import niet.
De run schrijft `Clubs: warning, clubs not repaired: <reden>`, de waarschuwing komt in `match_imports` (`last_warning`) van het lopende seizoen, en de volgende run probeert het opnieuw.

Een club aan de lijst toevoegen:

1. Controleer dat het dezelfde club is, op Wikipedia: één artikel.
   Een ander artikel is een andere club, ook als de naam erop lijkt.
2. Zet in `clubFullNames` een regel met `name` (de volledige naam) en `aliases` (de andere schrijfwijzen, zoals Wikipedia ze in wedstrijden schrijft).
   Een naam staat hoogstens één keer in de lijst, hoofdletters, accenten en leestekens niet meegeteld.
3. Zet een test in [`src/import-matches.test.ts`](src/import-matches.test.ts) bij _a club the list of full names knows_.
4. De volgende run voegt de dubbele club samen, vóór hij een seizoen leest.
   De wedstrijden van elk seizoen gaan mee naar de club die blijft, ook die van seizoenen die de import niet meer leest.

`otherClubGroups` in `relevance-terms.ts` is een andere lijst met een ander doel, het filter van de koppen, en blijft zoals hij is.

### Een doorverwijzing is hetzelfde artikel

Op de Nederlandse Wikipedia is `AZ Alkmaar` een doorverwijzing naar `AZ (voetbalclub)`, en `SBV Excelsior` een naar `Excelsior Rotterdam`.
Een wedstrijd die zo'n titel linkt, hoort bij de club van het artikel waar de titel naartoe gaat, niet bij een tweede club.
De import vraagt dat aan Wikipedia, per titel één keer, en onthoudt het antwoord in de tabel `club_pages` (zie de [README van `@fansite/db`](../../packages/db/README.md), _De tabel `club_pages`_):

- Een titel die in `club_pages` staat of de titel van het artikel van een club is, kost geen verzoek, ook niet in een volgende run of bij het uurlijkse seizoen.
- Een andere titel vraagt de import één keer op met de fetcher: dezelfde User-Agent, `robots.txt` en alleen `/wiki/<titel>?action=raw`, bij de Nederlandse Wikipedia.
  De titels van de Europa League-wedstrijden van 2012/13 zijn ook titels van de Nederlandse Wikipedia, want de reader zet de Engelse namen om (`europaLeagueClubs`).
  Dat gebeurt vóór de transactie van het seizoen, dus er is geen verzoek terwijl rijen op slot zitten.
- Begint de tekst met `#REDIRECT` of `#DOORVERWIJZING` (hoofdletters tellen niet mee), dan is het doel de titel tussen `[[` en `]]`, zonder `|…` of `#…`.
  Een doel dat zelf een doorverwijzing is, volgt de import ook, hoogstens drie keer.
  Een doel dat al in `club_pages` staat, kost geen verzoek: de import neemt het artikel van die club.
- De import bewaart niets uit de tekst van een artikel, alleen of de titel een doorverwijzing is en naar wat.
  Elke titel op de weg staat daarna in `club_pages` bij de club, het artikel zelf ook.
- Faalt een verzoek (netwerk, status, `robots.txt`), of is de tekst een doorverwijzing zonder doel, een kring of een keten van meer dan drie, dan maakt de import geen club op een gok.
  De run van het seizoen valt, zoals bij elke pagina die niet te lezen is, met `the article of a club, <titel>: <reden>`, en de volgende run probeert het opnieuw.
  Dat geldt ook voor een titel die niet bestaat (404): wie een rode link naar een club in een seizoen ziet, krijgt een fout in plaats van een club zonder artikel.

Staat een club al onder de titel van een doorverwijzing in de database, dan herstelt de import dat aan het begin van elke run (`repairKnownClubs`, naast het herstel van de lijst hierboven):

1. De import vraagt de titel van elke club die nog niet in `club_pages` staat één keer op.
   Een run waarin alle titels erin staan, vraagt niets en schrijft niets.
2. Clubs die op hetzelfde artikel uitkomen, zijn één club (`repairClubPages` in `@fansite/db/clubs`, in een transactie per artikel).
   De club met het artikel blijft; zijn er meer, dan die met de meeste wedstrijden, dan de oudste.
   Heeft geen club het artikel, dan krijgt de club dat als `wikipedia_page` en blijft staan: `BV De Graafschap` wordt het artikel `De Graafschap (voetbalclub)` en blijft de club `de-graafschap`.
3. De wedstrijden en de andere namen van de club die weggaat, gaan naar de club die blijft, en zijn naam wordt een andere naam.
   De club die blijft houdt zijn slug en zijn naam; de slug van de club die weggaat vervalt zonder omleiding.
4. Elke samenvoeging en elke titel die erbij komt, staat in de uitvoer met `Clubs:` vooraan:

```text
Clubs: merged club 'AZ' into club 'AZ'
Clubs: title 'AZ Alkmaar' is a redirect to 'AZ (voetbalclub)', the article of club 'AZ'
```

Dit herstel gaat vóór dat van de lijst met volledige namen, zodat twee clubs die één artikel zijn, geen waarschuwing meer geven.
Faalt een verzoek, dan komt `Clubs: warning, club pages not checked: <reden>` in de uitvoer en in `match_imports` (`last_warning`), het herstel van de lijst gaat gewoon door en de volgende run probeert het opnieuw.
Heeft de omgeving geen Wikipedia om uit te lezen, dan slaat de import het over.

Twee clubs die elk een eigen artikel hebben dat geen doorverwijzing is, blijven twee clubs: `Excelsior Maassluis` is een andere club dan `Excelsior Rotterdam`.

Een wedstrijd kan van club veranderen als Wikipedia een ander artikel linkt; dan telt hij als bijgewerkt.
De import verwijdert nooit een club, ook niet als er geen wedstrijd meer aan hangt (zoals de verzonnen clubs van de seed): de queries tonen alleen clubs met een wedstrijd.

Elke nieuwe club, elk artikel dat een club krijgt en elke naam die hij bijmaakt, krijgt een regel in het logboek van de run, naast de regel van de wedstrijden:

```text
Matches 2026/27: 35 new, 0 updated, 0 unchanged, 0 removed; table of 18 clubs for 2026-10-24
Matches 2026/27: new club 'Telstar' (article 'Telstar (voetbalclub)')
Matches 2026/27: new club 'SV Proefdorp', with no article
Matches 2026/27: article 'PEC Zwolle' for club 'PEC Zwolle'
Matches 2026/27: club 'Telstar' is now called 'Telstar 1963'
Matches 2026/27: new name 'Telstar' for club 'Telstar 1963'
Matches 2026/27: name 'Excelsior' stays with club 'Excelsior', not added to club 'Quick'
```

Het herstel van een dubbele club staat er niet bij: het draait vóór de seizoenen, en zijn regels beginnen met `Clubs:` (zie hierboven).

Een club is geen persoon, dus de regels hebben alleen de naam en het artikel.
De eerste lezing van een seizoen schrijft een regel per club, zo'n zeventien; daarna komt er alleen een regel als er iets nieuws is.
Een club die niet in de lijst met volledige namen staat en toch twee keer voorkomt, voegt de projecteigenaar samen met de hand (zie de README van `@fansite/db`).

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

De uitslagen van alle clubs hebben een eigen controle, die de import niet laat mislukken.
Per club telt de import de uitslagen en vergelijkt hij dat met `played` in de stand van dezelfde lezing.
Wijkt het af, dan staat er een waarschuwing in het logboek en in `match_imports.last_warning`, en de gegevens blijven staan.
Wikipedia werkt de stand en het programma niet op hetzelfde moment bij, dus zo'n verschil kan een uur duren:

```text
Matches 2026/27: warning, league results: the results do not agree with the table: SC Cambuur 9 results against 10 played, Excelsior Rotterdam 9 results against 10 played
```

Een pagina zonder uitslagen van andere clubs geeft geen waarschuwing, want de tabel is dan leeg zonder dat er iets mis is.

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

Ook een pagina die te veel wedstrijden in één keer verandert, houdt de import vast zoals een mislukte controle (zie _Veel wijzigingen tegelijk_).
De wijzigingen die wachten staan dan wel in `match_changes`.
De mislukte poging staat in `match_imports` (`failures_in_a_row`, `last_error`), en `pnpm run import:status` laat hem zien.
Na drie mislukte runs op rij is de import ongezond, zoals een feed, en stopt het overzicht met exitcode 1.
De run zelf stopt niet met exitcode 1: een tikfout op Wikipedia is geen fout van de importer.
Een import die stilstaat, ziet de eigenaar dus op de host: elke run schrijft de regel hierboven in `~/fansite-import.log` en in de uitvoer van de run, en `pnpm run import:status` (op de host `import.mjs --status`) toont de teller, de laatste fout en het laatste geslaagde moment.
Er is nog geen melding en geen pagina in het beheer die het zegt.
De feeds, de wedstrijden en de selectie lopen in dezelfde run, maar een fout in de ene stopt de andere niet.
Een pagina vastzetten op een oude versie doet de import niet.

### Hoogstens één keer per uur

Cron start de import elke 15 minuten.
De import van de wedstrijden vraagt Wikipedia pas weer als `match_imports.retry_at` voorbij is: 59 minuten na elke poging, ook na een mislukte.
Vraagt Wikipedia met 429 of 503 om te wachten, dan wacht hij zo lang als `Retry-After` zegt, hoogstens een dag.
Een run die moet wachten, schrijft niets.

### Hoe betrouwbaar een wijziging is

Wikipedia kan iedereen bewerken.
De import neemt daarom niet elke wijziging over die de controles doorstaat.
Hij vergelijkt per wedstrijd wat de pagina nu zegt met wat in de database staat, en geeft een wijziging een soort (`src/classify-change.ts`, zuivere functies).
Alleen wat de import zelf ziet telt: de pagina, de tijd van de wedstrijd en de momenten waarop hij iets voor het eerst zag.
De bewerkingsgeschiedenis van Wikipedia leest hij niet, want die staat onder `/w/`.

| Soort                        | Wat de import doet                                                             | Voorbeelden                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nieuwe informatie            | Neemt de wijziging meteen over, zonder melding.                                | Een nieuwe wedstrijd. Een uitslag binnen drie dagen na de aanvang. Doelpuntenmakers bij een wedstrijd die er geen had, of doelpunten erbij waarbij de bestaande blijven. Een aanvangstijd, een datum of een uitstel voor een wedstrijd die niet is gespeeld. Verlenging of strafschoppen die bij dezelfde score verschijnen. Een toeschouwersaantal of een scheidsrechter die er nog niet was. |
| Verbetering van kort geleden | Neemt de wijziging over, met een waarschuwing en een regel in `match_changes`. | Een uitslag die minder dan 24 uur nadat hij voor het eerst stond verandert, bij een wedstrijd van minder dan drie dagen geleden. Een doelpunt dat verandert bij zo'n wedstrijd. Een tikfout van een uur oud.                                                                                                                                                                                   |
| Verdacht                     | Laat de oude waarde staan en houdt de wijziging vast.                          | Alles wat in geen andere regel past. Zie hieronder.                                                                                                                                                                                                                                                                                                                                            |

Een wijziging is verdacht als:

- een uitslag verandert nadat hij 24 uur of langer vaststond, of bij een wedstrijd van drie dagen of langer geleden;
- een doelpunt van een wedstrijd van drie dagen of langer geleden een andere speler, minuut, eigen-doelpunt- of strafschopaanduiding krijgt, of verdwijnt;
- een gespeelde wedstrijd weer "gepland" wordt;
- een wedstrijd van de pagina verdwijnt;
- de datum of de tegenstander van een gespeelde wedstrijd van drie dagen of langer geleden verandert;
- de scheidsrechter van een gespeelde wedstrijd van drie dagen of langer geleden verandert;
- een toeschouwersaantal of een scheidsrechter van een gespeelde wedstrijd weer van de pagina verdwijnt;
- een uitslag pas komt nadat de import de pagina na de eerste drie dagen zag zonder uitslag;
- een wedstrijd weer de waarde krijgt die hij eerder had (A, dan B, dan A), of een eerder afgewezen waarde terugkomt: dat kan een bewerkingsoorlog zijn;
- de wedstrijd bij een afgelopen seizoen hoort en de wijziging iets overschrijft: zijn wedstrijden veranderen niet meer;
- de wedstrijd verschilt op een manier die geen regel kent;
- meer dan zes wedstrijden in één run iets overschrijven wat we al hadden (zie hieronder).

Een grens is strikt: een uitslag die precies 24 uur of precies drie dagen vaststond, valt buiten het venster.
Een nieuwe link naar een andere pagina over dezelfde tegenstander is nieuwe informatie, ook bij een oude wedstrijd.
Een andere spelling van zijn naam, een ander stadion of een andere datumtekst telt als een gewone wijziging: bij een gespeelde wedstrijd een verbetering of verdacht, en altijd meetellend voor de grens van zes.
Een doelpunt dat alleen zijn speler of pagina krijgt (de selectie is bijgewerkt) ook.
Een bijgesteld aantal toeschouwers is bij een gespeelde wedstrijd een verbetering, ook na dagen, en een andere scheidsrechter bij een wedstrijd van minder dan drie dagen geleden ook.

Een verbetering geeft een regel zoals:

```text
Matches 2026/27: warning, Speelronde 1 (Eredivisie): the result changed after 3 hours, from sc Heerenveen 1-0 FC Twente to sc Heerenveen 1-1 FC Twente
```

De waarschuwing staat ook in `match_imports.last_warning`, en dus in het overzicht.
`matches.result_set_at` houdt bij sinds wanneer de uitslag zo staat.

#### Een verdachte wijziging wacht

De wedstrijd en zijn doelpunten in de database veranderen niet, dus de site blijft de oude waarde tonen, zonder melding.
De import bewaart de wijziging in `match_changes`: de wedstrijd, wat er veranderde, de oude en de nieuwe waarde als één regel tekst, de reden, wanneer hij voor het eerst en voor het laatst is gezien, hoe vaak, en de status `pending`.
De regel van de run zegt het en het overzicht toont hem:

```text
Matches 2026/27: 0 new, 0 updated, 34 unchanged, 0 removed, 1 held; table of 18 clubs for 2026-10-24
Matches 2026/27: warning, held, Speelronde 1 (Eredivisie): the result changed after 4 days, from sc Heerenveen 1-0 FC Twente to sc Heerenveen 1-1 FC Twente
```

Elke run die dezelfde nieuwe waarde op de pagina ziet, telt de wijziging mee (`times_seen`).
Daarna gebeurt een van deze dingen:

- **Overgenomen** na zeven dagen van dezelfde waarde (`resolution` is `stood`), of als iemand hem accepteert (`person`).
  De zeven dagen gelden alleen in het lopende seizoen: in een seizoen dat voorbij is wacht een wijziging tot iemand beslist (`takenOverAt`).
  De uitslag, de doelpunten of de wedstrijd zelf wordt dan zoals de pagina zegt, en `result_set_at` wordt dat moment.
- **Afgewezen** als Wikipedia de oude waarde terugzet (`reverted`), als Wikipedia er weer iets anders van maakt (`replaced`: de zeven dagen beginnen dan opnieuw met de nieuwe waarde), of als iemand hem afwijst (`person`).
  Een wijziging die iemand afwees, komt niet terug zolang de pagina dezelfde waarde toont.

Elke stap staat met de tijd in `decided_at`.
Een verbetering die de import meteen overnam, staat er ook, met `status` `accepted` en `resolution` `applied`: zo ziet hij een wedstrijd die heen en weer wisselt.

De wijzigingen die wachten, staan in `pnpm run import:status` (op de host `import.mjs --status`) en komen met de opdracht:

```sh
pnpm run import:changes
pnpm run import:changes accept 12
pnpm run import:changes reject 12 13
pnpm run import:changes accept all
```

- De beheerders kunnen een vastgehouden wijziging ook beslissen in het beheer, op de pagina van de wedstrijd (zie [`docs/wedstrijden-invullen.md`](../../docs/wedstrijden-invullen.md)).
  Het scherm en de opdracht gebruiken dezelfde code, `decideChange` in `packages/db/src/match-changes.ts`, die ook het voorstel naar de wedstrijd schrijft (`updateMatch`).
  Het scherm schrijft `match.take-over` of `match.keep` met de reden en het account in het logboek van het beheer; de opdracht doet dat zonder account, met de reden `Besloten met het commando import:changes`.
  Is de wedstrijd van een wijziging er niet meer, dan verandert zowel `accept` als `reject` niets en blijft de wijziging wachten; de opdracht zegt dat.
- Zonder argument toont de opdracht de wijzigingen die wachten, met nummer, de oude en de nieuwe waarde en het moment waarop de import ze overneemt.
- `accept` en `reject` nemen nummers of `all`.
  Ze vragen niets aan Wikipedia: een geaccepteerde wijziging wordt wat de import zag op het moment van de wijziging.
  Ze nemen de lock van de import, zoals `pnpm run import:season`.
- De exitcode is 0 als alles besloten is, en 1 bij een weigering, een nummer dat niet wacht of een import die de lock houdt.
- Een melding per mail komt er niet bij voor een gewone wijziging: de eigenaar kijkt in het overzicht en in het logboek.
  Een afwijking met de invoer van de redactie krijgt wel een mail (zie _Een afwijking met de invoer van de redactie_).

#### Veel wijzigingen tegelijk

Meer dan zes wedstrijden die iets overschrijven wat we al hadden, lijkt op een bewerking van de hele pagina.
De wedstrijden die al wachten en nog op de pagina staan, tellen mee.
Dan wacht elk van die wedstrijden, en de run schrijft verder niets: geen nieuwe wedstrijden, geen stand en geen pagina's.
De laatste goede kopie blijft staan zoals bij een mislukte controle, en de run telt als mislukt:

```text
Matches 2026/27: warning, nothing changed and the last good copy stays: 7 matches changed at once, which looks like an edit of the whole page: the changes wait (pnpm run import:changes)
```

De pagina blijft vastgehouden zolang die wijzigingen wachten.
Elke run meldt dat opnieuw, en de mail over een import die blijft falen komt zoals bij elke fout.
Zijn de wijzigingen besloten (`accept` of `reject`) of zeven dagen oud, dan gaat de rest van de pagina door.
In een seizoen dat voorbij is tellen de zeven dagen niet, dus daar gaat de pagina pas door als iemand heeft beslist.
Het invullen van wat leeg was telt niet mee: een uitslag die nieuw is, doelpuntenmakers erbij of een aanvangstijd die voor het eerst komt.
Zo wacht de aankondiging van elf aanvangstijden in één keer niet.

#### Wat de grenzen zijn

| Grens               | Waarde          | Waar het voor is                                                                        |
| ------------------- | --------------- | --------------------------------------------------------------------------------------- |
| `correctionWithin`  | 24 uur          | Een verbetering van een uitslag die hij zo kort geleden nog niet had                    |
| `recentMatch`       | drie dagen      | Een wedstrijd waarvan de uitslag nieuw is en waarvan de doelpunten nog veranderen mogen |
| `suspiciousStands`  | zeven dagen     | Zo lang moet een verdachte wijziging op de pagina blijven staan                         |
| `mostChangesInARun` | zes wedstrijden | Het aantal wijzigingen dat een run mag overschrijven                                    |
| `warLookback`       | zeven dagen     | Hoe ver terug de import kijkt naar een wedstrijd die heen en weer wisselt               |

Ze staan in `reliability` in `src/classify-change.ts`.
De proef (zie _De proef_) gaf geen reden om ze te veranderen.

Een uitslag die tussen 24 uur en drie dagen nadat hij voor het eerst stond verandert, valt in geen regel van een verbetering of van iets duidelijks verdachts.
Wat de regels niet noemen, is verdacht, dus die wijziging wacht.

#### Wat voor de eerste keer geldt

Heeft de import een seizoen nog nooit goed gelezen (er staat geen pagina in `wikipedia_pages`), dan komt niets in de database van Wikipedia.
Zulke wedstrijden zijn de verzonnen wedstrijden van de seed, en de eerste echte lezing vervangt ze zonder te wachten.

Een afgelopen seizoen verandert niet meer, dus een wijziging daarin die iets overschrijft is verdacht.
Wat leeg was invullen mag wel, zoals de stand na 90 minuten of doelpuntenmakers bij een wedstrijd die er geen had, en een nieuwe wedstrijd ook.
Een wijziging daarin wacht tot iemand haar besluit, in het beheer of met `pnpm run import:changes`.
De import neemt haar nooit zelf over, ook niet na zeven dagen: niet met `pnpm run import:season` en niet met de lezing van elke week in juli en augustus (zie _Het seizoen dat net voorbij is_).
Zet Wikipedia de oude waarde terug, dan vervalt ze.

#### De stand en de selectie

Dit gaat over wedstrijden en doelpunten.
De stand en de selectie volgen Wikipedia zoals voorheen: ze zijn een vervolg.
Alleen als de hele pagina vastgehouden wordt (zie _Veel wijzigingen tegelijk_), blijft ook de stand staan.

#### De proef

De regels zijn nagespeeld op de echte pagina's van de zeven seizoenen 2020/21 tot en met 2026/27 (266 wedstrijden).
Per seizoen is het leven van de pagina nagebouwd: de aanvangstijden komen in groepen van elf, een uitslag drie uur na de aanvang en de doelpuntenmakers een uur later, en elke wijziging kreeg een oordeel van de echte functie.

- Het zijn 735 wijzigingen, en alle zijn nieuwe informatie: 0 verbeteringen en 0 verdachte.
- Het meeste dat één lezing wijzigt is 11 (de aanvangstijden), en geen van die 11 overschrijft iets.
  De grens van zes wedstrijden raakt dit niet.
- Met een storing van vijf dagen midden in het seizoen is het resultaat hetzelfde.

Wat de proef niet kan zeggen is hoeveel echte bewerkingen op Wikipedia er verdacht zouden zijn: de bewerkingsgeschiedenis is voor ons gesloten.
De tabel `match_changes` verzamelt dat vanaf nu zelf: na een paar maanden telt de eigenaar de rijen per soort en past de grenzen aan.

### Een wedstrijd die de redactie invulde

Een beheerder kan een wedstrijd invullen of verbeteren (`/beheer/wedstrijden`, zie [`docs/wedstrijden-invullen.md`](../../docs/wedstrijden-invullen.md)).
De invoer staat in `matches` en `match_goals`, en de tabel `match_edits` markeert welke onderdelen van de wedstrijd van de redactie zijn: de aftrap, de uitslag (met de status), de doelpunten en de gegevens (de toeschouwers, de scheidsrechter, het stadion en de opmerking).
Voor de import is zo'n wedstrijd eigen invoer, ook voor `pnpm run import:season`.
`src/edited-matches.ts` beoordeelt elk onderdeel met een markering apart, want Wikipedia zet meestal eerst de uitslag en pas later de doelpuntenmakers:

| Wikipedia heeft                                                             | De import doet                                                                                                    |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Nog niets voor het onderdeel: geen tijd, de status gepland, geen doelpunten | Niets: de invoer blijft staan en er wordt niets gemeld.                                                           |
| Hetzelfde                                                                   | Wist de markering, haalt de rij uit `match_edits` als er geen markering meer is, en schrijft `match.caught-up`.   |
| Iets anders                                                                 | Laat de invoer staan, schrijft `match.differs` en een waarschuwing in `match_imports`, en legt de afwijking vast. |

- Hetzelfde is bij de uitslag: de status, de score, de verlenging, de stand na 90 minuten en de strafschoppen zijn gelijk.
  Bij de doelpunten zijn de kant, de minuut, de blessuretijd, de soort en de speler gelijk, in elke volgorde.
  Een speler van ons is dezelfde als hij hetzelfde `player_id` heeft, een andere speler als de naam overeenkomt.
  Bij de gegevens zijn de toeschouwers, de scheidsrechter, het stadion en de opmerking gelijk.
  Wikipedia zegt niets over een gegeven dat het mist: alleen een gegeven dat Wikipedia wel heeft, kan van de invoer verschillen.
- Een verschil staat één keer in het logboek (`audit_log`, zonder account, dus "de import") en één keer in de waarschuwing van het seizoen, met beide waarden: "held, Speelronde 1 (Eredivisie): Wikipedia differs from the entry of the editors in the result: ours sc Heerenveen 2–0 FC Twente, Wikipedia sc Heerenveen 1–0 FC Twente".
  `match_edits.reported_*` bewaart wat Wikipedia zei, zodat de volgende run zwijgt zolang Wikipedia hetzelfde zegt.
  Zegt Wikipedia iets anders dan de vorige keer, dan is het weer nieuws.
  De afwijking wordt ook een wachtende wijziging in `match_changes`, per onderdeel (zie _Een afwijking met de invoer van de redactie_ hieronder).
- De onderdelen zonder markering volgen Wikipedia zoals bij elke wedstrijd, zonder de beoordeling van _Hoe betrouwbaar een wijziging is_.
  De wedstrijd telt niet mee voor de grens van zes wedstrijden in een run, en blijft staan als hij van de pagina verdwijnt.
- Een wijziging die voor de wedstrijd wachtte in `match_changes`, vervalt bij een invoer.

#### Een afwijking met de invoer van de redactie

Zegt Wikipedia iets anders dan de invoer, dan komt er een rij in `match_changes` met `part` (`kickoff`, `result` of `goals`), `old_value` (de invoer), `new_value` (Wikipedia) en in `proposal` dat onderdeel zoals Wikipedia het heeft.
De rij komt één keer, en bij elke run die dezelfde waarde ziet telt `times_seen` op.
Wat daarna gebeurt:

- **De beheerders krijgen een mail.**
  Na elke run mailt `mailConflicts` (`packages/db/src/match-conflict-mail.ts`) elk account met de rol `beheerder` dat niet is uitgezet, een eigen mail per afwijking.
  Er staan de wedstrijd, beide waarden, de koppeling naar het beheer en de dag van overname in, en geen naam of adres van een redacteur.
  Een mail die niet uit kan, is een regel `Conflict mail: …` in het logboek van de import; de import slaagt, en de volgende run probeert het opnieuw.
- **Een redacteur beslist** op de pagina van de wedstrijd (zie [`docs/wedstrijden-invullen.md`](../../docs/wedstrijden-invullen.md)), of de eigenaar met `pnpm run import:changes`.
  `accept` neemt Wikipedia over voor dat onderdeel, `reject` houdt de invoer.
  Beide gebruiken `decideConflict` uit `packages/db/src/match-conflicts.ts`, en schrijven `match.take-over` of `match.keep` in het logboek, het commando zonder account.
- **Beslist niemand** en staat dezelfde waarde zeven dagen op Wikipedia (de regel van _Een verdachte wijziging wacht_), dan neemt de import het onderdeel over (`resolution` is `stood`, `match.take-over` zonder account) en mailen de beheerders daarover.
  Dat doet hij alleen in het lopende seizoen.
  In een seizoen dat voorbij is blijft de invoer staan tot iemand beslist, en de mail en het beheer zeggen dat.
- **Zet Wikipedia de waarde van de redactie terug**, dan vervalt de afwijking (`reverted`) en staat dat in het logboek (`match.caught-up`).
  Maakt Wikipedia er iets anders van, dan is de oude afwijking `replaced` en begint een nieuwe.

#### Een verschil tussen twee bronnen

Vindt een import een wedstrijd van een andere bron op datum en club (`findMatchByDate`), dan vult hij alleen de lege velden.
Zegt hij iets anders over de aftrap, de uitslag, thuis of uit, of de gegevens, dan komt er een rij in `match_changes` met `part`, `old_value` (de wedstrijd), `new_value` (de tweede bron) en in `proposal` dat onderdeel zoals de tweede bron het heeft (`keepSourceDifferences` in `@fansite/db/source-differences`, #974).
De `reason` zegt welke bron de tweede is: `Wikipedia zegt iets anders dan de bron van de wedstrijd` of `de oude fansite zegt iets anders dan de bron van de wedstrijd`.
De wedstrijd houdt de waarde van zijn eigen bron.

- De rij komt één keer voor dezelfde twee waarden, en bij elke run die ze weer ziet telt `times_seen` op.
- Alleen een mens beslist, op de pagina van de wedstrijd of met `pnpm run import:changes`.
  De import neemt na zeven dagen niets over en er gaat geen mail uit.
- Wijst iemand het verschil af, dan komt het niet terug zolang beide waarden gelijk blijven.
- Neemt iemand de tweede bron over, dan laat de import van de eigen bron dat onderdeel voortaan met rust: de stap `matches` van `import:old-site` en de import van Wikipedia (`readTakenOverParts`).
- Is het verschil weg, of vulde de redactie het onderdeel zelf in, dan vervalt de rij (`reverted`); zegt een bron iets nieuws, dan is ze `replaced` en begint een nieuwe.
- Thuis of uit hoort bij de uitslag.
  Leest de regel van een onderdeel voor beide bronnen hetzelfde, zoals bij een andere dag met dezelfde aftrap, dan staat het veld dat verschilt erachter: `(speeldag 1 september 2001)`.

### Oudere bekerpagina's

De bekerpagina's van 2021/22 tot en met 2024/25 schrijven de score en de tijd anders dan die van 2025/26.
De lezer kent deze vormen:

| Wikipedia schrijft                   | De lezer leest                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------ |
| `3 – 1`                              | de eindstand 3 – 1 (2025/26)                                                   |
| `5 – 1 (3 – 0)`                      | de eindstand 5 – 1, met 3 – 0 bij de rust                                      |
| `2 – 4 (2 – 2, 1 – 1)` met `aet = J` | de eindstand 2 – 4 na verlenging, met 2 – 2 na 90 minuten en 1 – 1 bij de rust |
| `20:00 uur` en `20:00`               | dezelfde tijd                                                                  |
| `20.45`                              | dezelfde tijd (2011/12)                                                        |

- De eindstand is de score van de wedstrijd, met de score van de strafschoppen er los van in `penaltyscore`.
- De import leest de waarden in de haakjes en controleert ze.
  Een stand bij de rust kan niet hoger zijn dan de stand daarvoor, en een stand na 90 minuten kan niet hoger zijn dan de eindstand.
  Een stand na 90 minuten zonder verlenging (`aet`) is ook een fout.
  De stand na 90 minuten bewaart hij (zie _Wat de import bewaart_ hierboven), de stand bij de rust niet.
- Een score of een tijd in een andere vorm blijft een fout met de naam van de wedstrijd, en de database blijft zoals ze was.
- De fixtures `wikipedia-cup-2021-22.wiki` tot en met `wikipedia-cup-2024-25.wiki` in `src/fixtures/` zijn de wedstrijden van sc Heerenveen uit die vier pagina's.

### De oudere seizoenen (2010/11 tot en met 2019/20)

Voor deze seizoenen kent de lezer meer titels en meer vormen.
De beslissing is _De lezer kent de oudere vormen van de stand, de beker en de titels_ in [`docs/beslissingen/importer.md`](../../docs/beslissingen/importer.md).

- **De titels:** `pageCandidates` in [`src/read-wikipedia.ts`](src/read-wikipedia.ts) geeft per pagina de titels in volgorde, en de import neemt de eerste die bestaat.
  De pagina's van 2012/13 tot en met 2014/15 hebben geen `(mannenvoetbal)`.
  Een pagina waar geen enkele titel bij past, is een fout die ze allemaal noemt.
  De pagina van de play-offs leest hij vanaf 2010/11: onder de kop van de Europa League tot en met 2019/20 (zie _De play-offs_).
- **De stand** zonder sjabloon `Sports table` staat in een tabel onder `Eindstand`, `Stand na 34 wedstrijden` of `Eindstand na 34 wedstrijden`.
  De lezer zoekt elke kolom op de kop (`gs`, `w`, `g`, `v`, `pnt`, `dv`, `dt`, `ds`, en `club` of `Team`) en neemt de cijfers van de pagina over.
  Een puntenaftrek staat in de kolom `PA` (`−1`, `-1` en `1` zijn één punt; leeg of `0` is geen aftrek) en komt in `standings.points_deducted`.
  De punten blijven die van de pagina, dus na de aftrek, en `checkStandings` eist dat ze 3 × gewonnen + gelijk − aftrek zijn.
  Iets anders dan een geheel getal in die kolom is een fout met de naam van de club.
- **De score van een bekerwedstrijd** mag `n.v.` en `(6 – 7 pen.)` bevatten, en een of twee paren tussen haakjes:

| Wikipedia schrijft                                 | De lezer leest                                                         |
| -------------------------------------------------- | ---------------------------------------------------------------------- |
| `0 – 1 n.v.`                                       | 0 – 1 na verlenging                                                    |
| `5 – 1 (1 – 1, 0 – 0) n.v.`                        | 5 – 1 na verlenging, 1 – 1 na 90 minuten, 0 – 0 bij de rust            |
| `2 – 2 n.v. (2 – 2) (0 – 1) (6 – 7 pen.)`          | 2 – 2 na verlenging, 2 – 2 na 90 minuten, 0 – 1 bij de rust, 6 – 7 pen |
| `Speelronde 33 (was 34)` boven een wedstrijd (kop) | ronde 33                                                               |

- Een naam met sterren achter zich (`FC Twente *`) is de naam zonder de sterren.
- De fixtures `wikipedia-standings-2012-13.wiki`, `wikipedia-standings-2015-16.wiki`, `wikipedia-standings-2018-19.wiki`, `wikipedia-cup-older-seasons.wiki` en `wikipedia-programme-2018-19.wiki` in `src/fixtures/` zijn korte stukken van de echte pagina's.

### De Europa League van 2012/13

De Nederlandse Wikipedia heeft van de vier Europa League-wedstrijden van 2012/13 alleen de scores, zonder datum of stadion.
Voor dit seizoen leest de import ze van de Engelse Wikipedia, met dezelfde fetcher en regels: dezelfde user agent, `robots.txt` en alleen `/wiki/<pagina>?action=raw`.
De beslissing is _De vier Europa League-wedstrijden van 2012/13 komen van de Engelse Wikipedia_ in [`docs/beslissingen/importer.md`](../../docs/beslissingen/importer.md).

- **De pagina:** `2012–13 UEFA Europa League qualifying (third and play-off round matches)` op `en.wikipedia.org`.
  `europaLeaguePage` in [`src/read-wikipedia.ts`](src/read-wikipedia.ts) zegt voor welk seizoen er zo'n pagina is.
  Voor elk ander seizoen vraagt de import deze pagina niet.
  `wikipedia_pages` bewaart de pagina met de soort `europa-league` en de taal `en`, en de bronvermelding noemt hem "Engelse Wikipedia".
- **De wedstrijden:** de competitie is `Europa League`, en de ronde is `Derde voorronde, wedstrijd 1/2` en `Play-offronde, wedstrijd 1/2`.
  `readEuropaLeague` leest de blokken `{{#invoke:Football box|main` van sc Heerenveen: de datum, de tijd, thuis of uit, het stadion (zonder de plaats erachter), de score, de toeschouwers en de scheidsrechter (zonder land).
  De doelpuntenmakers laat hij weg, want de Engelse links zijn geen Nederlandse artikelen van spelers.
- **De controles:** de pagina moet vier wedstrijden van sc Heerenveen hebben, twee per ronde, en de scores van een ronde samen zijn de totaalstand in de samenvatting.
  Anders is het een fout met het seizoen erin, en de import schrijft niets.
- **De tijd:** de pagina zegt dat de tijden Midden-Europese zomertijd zijn (CEST).
  Staat die zin er niet meer, dan bewaart de import alleen de dag (`date_text`).
- **De clubs:** `europaLeagueClubs` vertaalt de Engelse titel van een tegenstander naar de naam en het artikel van de Nederlandse Wikipedia (`Rapid Boekarest`, `Molde FK`).
  Een tegenstander die er niet in staat, is een fout.
- Een seizoen zonder pagina laat de Europa League-wedstrijden die er zijn, staan.
- De fixture `wikipedia-europa-league-2012.wiki` in `src/fixtures/` is een kort stuk van de echte pagina.

### De wedstrijden van 2007/08 tot en met 2009/10

Deze drie seizoenen hebben geen pagina die de andere lezers kennen.
`pnpm run import:season 2009/10` (en `2007/08` en `2008/09`) leest ze uit de blokken `football box`, `footballbox2` en `Football box collapsible` van zes pagina's, samen 63 wedstrijden.
De 34 competitiewedstrijden van 2008/09 komen uit een tabel op de seizoenspagina van de club, de zevende pagina.
Samen zijn het 97 wedstrijden.
Het onderzoek staat in [`docs/onderzoek-wedstrijden-2007-2010.md`](../../docs/onderzoek-wedstrijden-2007-2010.md).
De beslissingen zijn _De wedstrijden van 2007/08 tot en met 2009/10 komen uit de blokken `football box`_ en _De competitie van 2008/09 komt uit de tabel op de seizoenspagina van de club_ in [`docs/beslissingen/importer.md`](../../docs/beslissingen/importer.md).

| Seizoen | Pagina                                          | Wikipedia | Wedstrijden | Competitie                                                                           |
| ------- | ----------------------------------------------- | --------- | ----------- | ------------------------------------------------------------------------------------ |
| 2007/08 | `Play-offs Nederlands voetbal 2008`             | nl        | 4           | `Play-offs Champions League`                                                         |
| 2007/08 | `2007–08 UEFA Cup first round`                  | en        | 2           | `UEFA Cup`                                                                           |
| 2008/09 | `KNVB Beker 2008/09 (mannen)`                   | nl        | 5           | `KNVB Beker`                                                                         |
| 2008/09 | `2008–09 UEFA Cup first round`                  | en        | 2           | `UEFA Cup`                                                                           |
| 2008/09 | `2008–09 UEFA Cup group stage`                  | en        | 4           | `UEFA Cup`                                                                           |
| 2008/09 | `Sc Heerenveen in het seizoen 2008/09 (mannen)` | nl        | 34          | `Eredivisie`, uit een tabel                                                          |
| 2009/10 | `2009–10 SC Heerenveen season`                  | en        | 46          | `Johan Cruijff Schaal` (1), `Eredivisie` (34), `KNVB Beker` (3), `Europa League` (8) |

- **De lijst:** `footballBoxPages` in [`src/read-football-box.ts`](src/read-football-box.ts) zegt per seizoen welke pagina's er zijn, in welke taal, hoeveel wedstrijden van ons erop staan en onder welke kop welke competitie staat.
  Voor een ander seizoen vraagt de import geen van deze pagina's.
  De import haalt een pagina op bij de Wikipedia van haar taal, met dezelfde fetcher en regels: dezelfde user agent, `robots.txt` en alleen `/wiki/<pagina>?action=raw`.
- **De lezer:** `readFootballBoxes` zet een blok om naar de vorm die `readMatch` leest, zodat een wedstrijd dezelfde controles krijgt als elke andere.
  Hij leest het seizoen, de competitie, de ronde, de datum, de tijd, het stadion (zonder de plaats erachter), de tegenstander, thuis of uit, de uitslag (met verlenging en strafschoppen), de doelpunten met de minuut, de toeschouwers en de scheidsrechter (zonder land).
  Een veld dat er niet staat, blijft leeg.
- **De tabel van 2008/09:** de seizoenspagina van de club heeft de competitie in een tabel onder de kop `Eredivisie`, met per rij het stadion, de datum (`31-08-2008`), de thuisclub, de uitslag, de uitclub en de doelpuntenmakers en kaarten van beide clubs.
  `readFootballBoxes` leest elke rij als een wedstrijd, ook via `readMatch`.
  De tabel heeft geen ronde: de wedstrijden heten `Speelronde 1` tot en met `Speelronde 34` in de volgorde van de rijen, en die moet de volgorde van de datums zijn.
  De tabel heeft geen tijd, geen toeschouwers en geen scheidsrechter.
  De tabellen van de UEFA Cup en de beker op dezelfde pagina leest hij niet.
  De rij van 15 november 2008 noemt geen uitclub; de lijst vult daar FC Utrecht in, zolang de cel leeg is.
- **De rondes:** `Finale` (Johan Cruijff Schaal), `Speelronde 12`, `2e ronde` tot en met `4e ronde` en de kop van de bekerpagina (`Kwartfinales`), `Play-offronde, wedstrijd 1/2`, `Groepsfase, wedstrijd 2/6`, `Eerste ronde, wedstrijd 1/2`, en voor de play-offs van 2008 `Halve finale, wedstrijd 1/2` (Ajax) en `Ronde 2, wedstrijd 1/2` (NAC Breda).
- **De controles:** elke pagina heeft het aantal wedstrijden uit de lijst, elke wedstrijd staat onder een kop en in een ronde die we kennen, en elke wedstrijd heeft een uitslag.
  De seizoenen 2008/09 en 2009/10 moeten 34 competitiewedstrijden hebben, 17 thuis en 17 uit; 2007/08 heeft er op deze pagina's geen.
  De tabel van 2008/09 moet de zeven kolommen hebben die we kennen, en elke rij zeven cellen.
  Anders schrijft de import niets, en de melding noemt de pagina.
- **De tijd:** een blok van de seizoenspagina noemt zijn eigen tijdzone, en een tijd in een andere zone (`22:05 EEST (UTC+3)`) wordt onze tijd.
  De pagina's van de UEFA Cup zeggen één keer boven de wedstrijden dat de tijden Midden-Europese tijd zijn.
  Staat de zone er niet, dan bewaart de import alleen de dag (`date_text`).
- **De clubs:** `englishClubs` vertaalt de Engelse titel van een tegenstander naar de naam en het artikel van de Nederlandse Wikipedia (`PSV Eindhoven` wordt `PSV`, `Sporting CP` wordt `Sporting Lissabon`).
  Een tegenstander die er niet in staat, is een fout.
- **De doelpuntenmakers:** de kaarten, de wissels en de gemiste strafschoppen tussen de doelpunten laat de lezer weg.
  Een doelpunt van een Engelse pagina houdt de naam (`Sibon`) en verliest de link, en `playerLinker` koppelt het op de naam aan een speler van het seizoen; het wordt geen persoon.
  Een doelpunt dat geen speler vindt, staat in de regel `goals of ours have no player in the squad table` in het logboek.
  Tellen de doelpunten niet op tot de uitslag, zoals bij speelronde 15 van 2009/10, dan krijgt de wedstrijd geen doelpuntenlijst en de regel `no scorers`.
  Een doelpunt uit de tabel van 2008/09 heeft geen minuut, want de tabel heeft er geen: `match_goals.minute` blijft leeg.
  De doelpuntenmakers staan in een cel achter `{{goal}}` en vóór het eerste plaatje van een kaart, met hun link: `2X` achter een naam zijn twee doelpunten, en `e.d.` is een eigen doelpunt.
  De doelpunten van de thuisclub staan eerst, in de volgorde van de cel.
  Staat er iets wat de lezer niet kent, dan krijgt de wedstrijd geen doelpuntenlijst en de regel `no scorers`.
- **De redactie:** vindt de import op datum en club een wedstrijd met de bron `redactie`, dan slaat hij die over en schrijft hij één regel: `left out: the editors added this match`.
- **Geen stand:** deze seizoenen krijgen geen ranglijst en geen uitslagen van de andere clubs.
  De regel in het logboek zegt `the pages of this season have no table`.
- **De bron:** `wikipedia_pages` bewaart elke pagina met de soort `matches` en de taal (`language`), en de bronvermelding op de site geeft een Engelse pagina een Nederlandse naam met "(Engelse Wikipedia)" erachter.
  De seizoenspagina van 2008/09 is ook de pagina van de selectie: ze heeft een rij met de soort `matches` en een rij met de soort `squad`.
- De fixtures `wikipedia-football-box-*.wiki` in `src/fixtures/` zijn stukken van de echte pagina's van 9 november 2026: de koppen, de blokken van sc Heerenveen en één blok van andere clubs.
  De fixture van de seizoenspagina van 2008/09 heeft de hele tabel van de competitie, met de tabellen van de UEFA Cup en de beker erboven.

### Een afgelopen seizoen

Een afgelopen seizoen verandert niet meer, dus de uurlijkse import leest het niet opnieuw.
De uitzondering is het seizoen dat net voorbij is, in juli en augustus (zie _Het seizoen dat net voorbij is_).
Eenmalig leest de opdracht `pnpm run import:season` het wel, bijvoorbeeld het vorige seizoen:

```sh
pnpm run import:season 2025/26
```

- Het seizoen heeft de vorm `2025/26`: het jaar, een schuine streep en de laatste twee cijfers van het jaar erna.
  De opdracht weigert met een zin een andere vorm, twee jaren die niet op elkaar volgen, het lopende seizoen en een seizoen dat nog niet begonnen is.
  Zonder seizoen laat ze zien hoe het moet.
  De weigering komt voordat de opdracht Wikipedia iets vraagt of iets schrijft.
- Ze leest de vier pagina's van dat seizoen (vier verzoeken, en vijf voor 2012/13), met dezelfde fetcher, controles en opslag als de uurlijkse import, en schrijft alles in één transactie.
  Ze raakt alleen de rijen van dat seizoen: de rijen van het lopende seizoen blijven zoals ze zijn.
  Draait ze nog eens, dan staat er `0 new, 0 updated, 38 unchanged`.
- Ze neemt de lock van de import.
  Houdt een run van cron die vast, dan doet de opdracht niets en zegt dat, met exitcode 1.
  Probeer het dan na een paar minuten opnieuw.
- De exitcode is 0 als het seizoen is opgeslagen, en 1 als de opdracht het seizoen weigert, een controle faalt of Wikipedia om te wachten vraagt of het niet toestaat.
  Bij een fout blijft de database zoals ze was, en de rij in `match_imports` van dat seizoen noemt de fout.
- Staat het seizoen al in de database, dan wacht een wijziging die iets overschrijft (zie _Hoe betrouwbaar een wijziging is_).
  Een eerste lezing en een lezing zonder verschil schrijven alles of niets, zoals hierboven.
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

Op acceptatie start je dat in GitHub met de workflow _Import season_, zonder SSH (zie _Een afgelopen seizoen importeren_ in [`docs/acceptatieomgeving.md`](../../docs/acceptatieomgeving.md)).

#### Het seizoen dat net voorbij is

Van 1 juli tot en met 31 augustus leest de uurlijkse import ook het seizoen dat op 30 juni is afgelopen, één keer per week (`importEndedSeason` in [`src/import-ended-season.ts`](src/import-ended-season.ts)).
Zo komt een late verbetering op Wikipedia binnen zonder dat iemand `import:season` draait.

- `endedSeasonOf` zegt welk seizoen dat is: het seizoen vóór dat van het moment, in juli en augustus, en anders geen.
  De dagen zijn die van UTC, zoals bij `seasonOf`.
- De import leest eerst de wedstrijden met `importPastSeason`, de functie achter `import:season`, dus met dezelfde controles en opslag.
  Dan leest hij de selectie met `importSquad`, zoals toen het seizoen liep: dezelfde pagina, dezelfde controles, en de cijfers van de spelers gaan naar `player_season_stats`.
  `importPastSquad` van `import:squad` bewaart die cijfers niet, en heeft voor een seizoen na 2024/25 geen pagina.
  De eerste lezing vervangt hier nooit de spelers die er al staan.
  Hij doet dat na het lopende seizoen, in dezelfde run en met dezelfde fetcher.
- De pauze staat in `match_imports.retry_at` en `squad_imports.retry_at` van dat seizoen.
  Is die niet voorbij, dan vraagt de import niets en schrijft hij geen regel.
  Na een lezing die is opgeslagen of die faalt, zet hij de pauze op een week en vijf minuten (`rereadEveryMs`).
  De lezing schuift zo elke week één run van cron op.
  Een wijziging die wacht neemt deze lezing niet over: dit seizoen is voorbij, dus ze wacht tot iemand beslist.
  Vraagt Wikipedia om te wachten of weigert robots.txt, dan blijft de kortere pauze van `healthAfter` staan, want er is niets gelezen.
- De opdrachten `import:season` en `import:squad` kijken niet naar de pauze en zetten haar op een uur min een minuut.
  Na zo'n opdracht leest de uurlijkse import het seizoen dus een uur later nog eens, en wacht dan weer een week.
- Een lezing die faalt, is een waarschuwing in de uitvoer en in de rij van dat seizoen in `match_imports` of `squad_imports`.
  Ze stopt de selectie en het lopende seizoen niet, verandert de exitcode niet en telt niet voor de mail over een import die blijft falen.
- `pnpm run import:status` blijft over het lopende seizoen gaan.

#### Alle afgelopen seizoenen

Na een wijziging in de importer moeten alle afgelopen seizoenen opnieuw worden gelezen.
Dat doet `--from-season`, met het eerste seizoen erachter:

```sh
pnpm run import:seasons 2020/21
```

- Ze leest elk afgelopen seizoen vanaf dat seizoen tot en met het laatste seizoen dat is afgelopen, het oudste eerst, één voor één.
  De opdracht weigert met een zin een beginseizoen dat geen seizoen is, een seizoen dat nog niet begonnen is en het lopende seizoen, want dan is er niets te lezen.
  De weigering komt voordat de opdracht Wikipedia iets vraagt of iets schrijft.
- Elk seizoen doet wat `--season` doet, met één fetcher voor de hele run, dus de regels van `robots.txt` gelden over alle seizoenen.
  Elk seizoen neemt de lock van de import en laat hem weer los, zodat cron er tussendoor kan lopen.
  Houdt een andere run de lock vast, dan slaat de opdracht dat seizoen over met dezelfde zin als `--season`, en telt het als mislukt.
- Een seizoen dat mislukt, stopt de run niet.
  Er staat één regel per seizoen in de uitvoer en aan het eind een samenvatting, zoals `Seasons: 5 of 6 read, 1 not read:`, met de seizoenen die mislukten en hun reden.
  De exitcode is 0 als alle seizoenen zijn opgeslagen, en 1 als er één of meer mislukten.
  De database van een mislukt seizoen blijft zoals ze was.
- Op de host draait hetzelfde bestand als de cronjob de opdracht, met `--from-season` en het beginseizoen erachter.
  Op acceptatie start je dat in GitHub met de workflow _Import seasons_ (zie _Alle afgelopen seizoenen importeren_ in [`docs/acceptatieomgeving.md`](../../docs/acceptatieomgeving.md)).

#### De selectie van afgelopen seizoenen

De uurlijkse import leest de selectie van het lopende seizoen.
Die van afgelopen seizoenen leest een opdracht, eenmalig (zie _De selectie van eerdere seizoenen komt in een eerste versie met gaten, en een tweede lezing haalt niemand weg_ in [`docs/beslissingen/importer.md`](../../docs/beslissingen/importer.md)):

```sh
pnpm run import:squad 2007/08
pnpm run import:squads 1990/91
```

`import:squad` leest één seizoen, en `import:squads` dat seizoen en alle afgelopen seizoenen daarna, het oudste eerst.
Ze controleren het seizoen zoals `import:season`: het lopende seizoen en een seizoen in de toekomst worden geweigerd, voordat er iets gevraagd of geschreven wordt.
Ze nemen de lock van de import, en `import:squads` deelt één fetcher over de hele run en gaat door na een seizoen dat mislukt.
Op de host zijn het de opties `--squad` en `--from-squad` van `import.mjs`, zoals `--season` en `--from-season`.
Op acceptatie start je `--from-squad` met de workflow _Import squads_ (zie _De selectie van afgelopen seizoenen importeren_ in [`docs/acceptatieomgeving.md`](../../docs/acceptatieomgeving.md)).

- `squadSources` in [`src/squad-sources.ts`](src/squad-sources.ts) zegt per seizoen welke pagina's en welke lezers erbij horen:

  | Seizoenen                           | Pagina                                             | Lezers                                       |
  | ----------------------------------- | -------------------------------------------------- | -------------------------------------------- |
  | 1990/91 tot en met 1999/00          | `Sc Heerenveen in het seizoen JJJJ/JJ`             | `readSeasonStatistics`                       |
  | 2005/06                             | `Sc Heerenveen in het seizoen 2005/06`             | `readSeasonStatistics`                       |
  | 2006/07                             | `Sc Heerenveen in het seizoen 2006/07`             | `readSeasonTransfers`, `readSeasonScorers`   |
  | 2007/08 tot en met 2017/18          | `Sc Heerenveen in het seizoen JJJJ/JJ (mannen)`    | `readSeasonSelection`, `readSeasonTransfers` |
  | 2022/23 en 2023/24                  | `Sc Heerenveen in het seizoen JJJJ/JJ (mannen)`    | `readSeasonSquad`                            |
  | 2018/19 tot en met 2021/22, 2024/25 | `JJJJ–JJ SC Heerenveen season` (Engelse Wikipedia) | `readEnglishSquad`                           |
  | 2000/01 tot en met 2004/05, 2025/26 | geen                                               | geen                                         |

- Een seizoen zonder lezers, een pagina die niet bestaat (404) en een pagina zonder tabel (`none`) zijn een gat.
  Het logboek krijgt één regel en niets wordt geschreven: `Squad 2002/03: no squad page on Wikipedia, so no squad`.
  Een gat is geen fout: de exitcode blijft 0.
- Een pagina die een fout geeft, een lezer die een fout meldt en een verzoek dat mislukt laten het hele seizoen ongemoeid.
  De regel zegt waarom (`Squad 2013/14: warning, nothing changed: ...`), `squad_imports` telt de mislukking, en de exitcode is 1.
  `import:squads` gaat dan door met het volgende seizoen en eindigt met een samenvatting, zoals `Squads: 35 of 36 read, 6 of them without a page, 1 not read:`.
- De spelers van de lezers van een seizoen worden samengevoegd per persoon: dezelfde pagina is dezelfde speler, en anders dezelfde naam zonder accenten en hoofdletters (`mergePlayers` in [`src/import-past-squad.ts`](src/import-past-squad.ts)).
  De rij krijgt de beste bron uit `playerSources` van de lijsten die de speler hebben, en de positie, het rugnummer en het land van de beste lijst die ze geeft.
  De wedstrijden en doelpunten uit de tabellen gaan niet naar `player_season_stats`.
- Elke pagina van een speler gaat langs `lookUpPersonPages`: een nieuwe titel kost één verzoek, een bekende titel niets.
  Een mislukt verzoek is een waarschuwing en laat `person_id` leeg tot de volgende lezing.
  Het logboek noemt het aantal opgevraagde titels: `Squad 2013/14: persons: 16 titles asked, 16 new persons, ...`.
  Direct na de eerste regel staat hoeveel spelers een land hebben: `Squad 2013/14: countries of the players: 14 of 16 have one`.
  De rij krijgt `in_squad` waar en `left_squad_at` leeg.
- Een tweede lezing van een seizoen voegt nieuwe spelers toe en verbetert een bron, een positie, een rugnummer, een land, een pagina of een persoon.
  Ze haalt nooit een speler weg en schrijft niets in `players` als er niets nieuw is: `Squad 2013/14: 0 new, 0 improved, 16 unchanged, from 1 page`.
- De pagina's die zijn gelezen komen in `wikipedia_pages` met `kind` `squad`, voor de bronvermelding.
  Er komt een rij in `squad_imports` per gelezen seizoen, zoals bij `match_imports` van een afgelopen seizoen.
  De status en de waarschuwingen (`pnpm run import:status`) tellen alleen het lopende seizoen.

- Aan het eind van een lezing komt de kans dat de lijst de hele selectie is in `squad_completeness` (zie _De volledigheid van de selectie_).
  Het logboek krijgt er een regel bij: `Completeness 2013/14: 55% bijna, 16 players, new`.

De tests staan in [`src/import-squads.test.ts`](src/import-squads.test.ts): ze draaien op een echte MariaDB met een eigen webserver voor de pagina's, en vragen Wikipedia niets.

#### De volledigheid van de selectie

De kans dat de spelers van een seizoen de hele selectie zijn (`squadCompleteness`, zie [`docs/volledigheid-selectie.md`](../../docs/volledigheid-selectie.md)) staat per seizoen in de tabel `squad_completeness`.
De site leest haar alleen; de importer rekent haar uit (`storeCompleteness` in [`src/store-completeness.ts`](src/store-completeness.ts)).
Een seizoen zonder spelers heeft geen rij, en de site leest dat als `onbekend`.

- **Wanneer:** aan het eind van een lezing van de selectie.
  Dat is de uurlijkse import van het lopende seizoen (na de wedstrijden, in dezelfde run), en `import:squad` en `import:squads` voor een afgelopen seizoen.
  De regel krijgt uit de database wat hij nodig heeft: de bronnen en personen van de spelers en de doelpuntenmakers van het seizoen.
- **De som van de tabel:** het aantal wedstrijden en doelpunten dat de tabel gaf, opgeteld, staat in `matches_total` en `goals_total`.
  Het is alleen bekend terwijl de pagina wordt gelezen, dus de uitkomst en dat bewijs worden samen bewaard.
  Bij een afgelopen seizoen met meer lijsten telt de beste lijst die een som geeft, omdat de lijsten verschillend tellen.
  Een pagina zonder som laat de kolom leeg.
- **Opnieuw uitrekenen:** `pnpm run import:completeness` rekent elk seizoen opnieuw uit met wat in de database staat en de bewaarde som, zonder verzoek aan Wikipedia.
  Draai het nadat #414 doelpunten van een eerder seizoen heeft gezet.
  Op de host is het `import.mjs --completeness`.
  Het neemt de lock van de import en schrijft een regel per seizoen: `Completeness 2013/14: 50% bijna, 26 players, was 95% compleet with 26 players`.
- **Geen overbodige schrijfactie:** een tweede berekening zonder nieuwe gegevens schrijft niets, dus `calculated_at` verandert dan niet.
- **Status:** `pnpm run import:status` toont de kans en het niveau van het lopende seizoen, en een waarschuwing als de bron `selectie` is en de kans onder `bijna` valt: die tabel heeft iedereen, dus de lezer mist iets.
  Eerdere seizoenen staan er niet in.
- **Terugdraaien:** de tabel `squad_completeness` weghalen verliest geen gegevens (`DROP TABLE squad_completeness`): `import:completeness` maakt haar rijen weer uit `players` en `match_goals`.

De tests staan in [`src/store-completeness.test.ts`](src/store-completeness.test.ts).

#### Een gestaakte wedstrijd

De pagina van 2025/26 heeft voor NAC Breda – sc Heerenveen (speelronde 33) twee blokken.
Het eerste heeft de score "Gestaakt 82' (2 – 0)" op 10 mei 2026 in Breda, het tweede de definitieve uitslag 2–0 op 11 mei in het Abe Lenstra Stadion, met een voetnoot bij de datum.
De reader werkt zo (zie _Een gestaakte wedstrijd telt voor zijn begin, het restant geeft de uitslag en een regel_ in [`docs/beslissingen/importer.md`](../../docs/beslissingen/importer.md)):

- Een blok waarvan de score met "Gestaakt" begint, is de wedstrijd.
  Dat kan ook in de twee andere schrijfwijzen van de pagina's van 2010/11 en 2018/19: de afkorting met de minuut en daarachter de stand, `Gest. 57' (0 – 0)`, en de stand eerst en dan het woord, `(0 – 0)<br />Gestaakt 1'`.
  Het woord is `Gestaakt` of `Gest.`, de minuut heeft een apostrof, en de stand staat tussen haakjes ervoor of erna.
  `Gest.` zonder minuut is geen gestaakte score maar een score die we niet kennen.
  Het geeft het stadion, thuis of uit, de datum en de aftrap, zodat de cijfers per stadion de wedstrijd tellen voor de plek waar hij begon.
- Het laatste blok daarna onder dezelfde kop voor dezelfde twee clubs maakt de wedstrijd af en is zelf geen wedstrijd.
  Het geeft de uitslag en de doelpunten, en de dag en het stadion voor de regel in `matches.note`: "Gestaakt in minuut 82. Het restant is op 11 mei gespeeld in het Abe Lenstra Stadion."
  De minuut staat in de score van het gestaakte blok.
  Een naam die op "Stadion" eindigt, krijgt "het" ervoor.
  Heeft het blok nog geen uitslag, dan staat er "wordt gespeeld".
  Over de reden van het staken of het publiek zegt de regel niets.
- Heeft de pagina geen later blok, dan stopt de import met een fout die de wedstrijd noemt.
  Dat geldt ook als het latere blok zelf gestaakt is, een dag of minuut heeft die we niet kennen, of een uitgestelde wedstrijd is.
  Een score die we niet kennen, geeft een fout bij een wedstrijd van sc Heerenveen en een waarschuwing bij een wedstrijd van een andere club, behalve in de uitzondering hieronder.
- Het restant staat ook onder `Inhaalronde <nummer>` met hetzelfde nummer als de ronde van het gestaakte blok, en nergens anders.
  Zo staat Excelsior – AZ in 2011/12: onder `Speelronde 13` een blok met de gewone score `0 – 0` op 20 november 2011, waarvan `report` zegt "In de rust gestaakt", en onder `Inhaalronde 13` het blok met `0 – 0` van 7 december 2011 ("Tweede helft").
  Het is één wedstrijd, met de eindstand en de dag van het tweede blok.
- Dat blok is de eindstand ook als de pagina de wedstrijd helemaal opnieuw laat spelen, zoals bij Feyenoord – VVV-Venlo in 2018/19: gestaakt na 1 minuut op 4 november 2018 en op 6 december onder `Inhaalronde 11` met 4 – 1 opnieuw gespeeld.
  De pagina geeft geen manier om een restant van een herspeelde wedstrijd te onderscheiden, dus de import probeert dat niet.
  De regel in `matches.note` zegt daarom altijd "Het restant …".
- Ook een blok met een gewone score is gestaakt als de tekst van `report` (zonder opmaak en zonder de adressen van links) "gestaakt" bevat en het blok onder een `Speelronde` staat.
  Staat de minuut niet in de score maar zegt `report` "in de rust", dan begint de regel met "Gestaakt in de rust."
  Zegt de pagina niets over de minuut of de rust, dan is het een fout.
  Het blok onder de inhaalronde mag zelf niet gestaakt zijn (ook niet met "gestaakt" in `report`).
- Een gestaakte wedstrijd van een andere club komt niet in `matches`, want daar staan alleen de wedstrijden van sc Heerenveen.
  De uitslag komt wel in `league_results`, als de pagina een blok heeft dat hem afmaakt, met de eindstand en de dag van dat blok en het nummer van de ronde.
  Een gestaakt blok, in elke schrijfwijze van de score, dat geen bruikbaar restant heeft, krijgt geen uitslag maar een melding in de waarschuwing "league results left out".
- Eén wedstrijd is een uitzondering: SC Cambuur – Go Ahead Eagles in speelronde 11 van 2026/27 staat op de pagina als `4 – 0 (Gestaakt 82')`, en de stand is daar de officiële einduitslag geworden.
  De reader telt hem met 4 – 0, op de dag van het blok, bij de uitslagen van de competitie, zolang de score precies zo staat en er geen later blok voor dezelfde twee clubs is.
  De wedstrijd staat als gegevens in `officialStoppedResults` in `src/read-wikipedia.ts`, met een opmerking `ONE-OFF (#736)`.
  Meestal wordt het restant van een gestaakte wedstrijd alsnog gespeeld, en leest de import dat al.
  Wordt nog een gestaakte wedstrijd de officiële uitslag, overweeg dan een algemene regel en haal de uitzondering weg (zie _Een gestaakte wedstrijd met een officiële einduitslag is een uitzondering voor één wedstrijd_ in [`docs/beslissingen/importer.md`](../../docs/beslissingen/importer.md)).
- Een voetnoot (`<ref>...</ref>`) haalt hij weg voordat hij de pagina leest, dus een datum met een voetnoot leest als de datum.
- Een rode kaart met een VAR-controle (`{{rode kaart VAR|...}}`) is net als een andere rode kaart geen doelpunt.

#### Een wedstrijd onder Inhaalronde

Een wedstrijd die is uitgesteld en later gespeeld, staat op de pagina twee keer.
Het eerste blok staat in de oorspronkelijke ronde en heeft geen score, of de score "Afgelast" of "Uitgesteld".
Het tweede staat onder een kop `Inhaalronde <nummer>` en heeft de uitslag.
In 2022/23 zijn dat RKC Waalwijk – Go Ahead Eagles (`Inhaalronde 17`) en Go Ahead Eagles – RKC Waalwijk (`Inhaalronde 25`).
De reader werkt zo (zie _Een wedstrijd onder Inhaalronde telt voor de ronde waaruit hij is uitgesteld, en vervangt het blok zonder uitslag_ in [`docs/beslissingen/importer.md`](../../docs/beslissingen/importer.md)):

- Een kop `Inhaalronde <nummer>` is een ronde van de competitie, en het nummer is de ronde van de wedstrijd.
  Een wedstrijd van sc Heerenveen onder `Inhaalronde 17` heeft dus de ronde `Speelronde 17`, dezelfde sleutel als het blok in de oorspronkelijke ronde.
- Heeft het blok onder de inhaalronde een score en heeft het blok in de ronde voor dezelfde twee clubs er geen, dan telt alleen het eerste.
  Voor sc Heerenveen is het één wedstrijd in `matches`, met de speeldatum en de uitslag van de inhaalwedstrijd.
  In `league_results` is het één rij, met de dag van de inhaalwedstrijd en het nummer van de ronde waaruit hij is uitgesteld.
- Een blok onder een inhaalronde zonder score, of met "Uitgesteld" of "Afgelast", doet niets: de wedstrijd blijft staan als uitgesteld tot er een uitslag is.
  Is het seizoen voorbij en blijft hij zo, dan wordt hij geannuleerd (zie _Wat de import bewaart_).
- Een kop die geen ronde is, zoals de play-offs, blijft buiten de competitie.
- Een gestaakte wedstrijd die onder een inhaalronde wordt afgemaakt, is één wedstrijd (zie _Een gestaakte wedstrijd_ hierboven).
- De tests gebruiken een uitsnede van de pagina van 2022/23, [`src/fixtures/wikipedia-catch-up-2022-23.wiki`](src/fixtures/wikipedia-catch-up-2022-23.wiki), met de twee wedstrijden van RKC Waalwijk en Go Ahead Eagles en twee verzonnen wedstrijden van sc Heerenveen.

### Wat de import niet doet

- De versie van een pagina bewaart hij als de `Last-Modified` van Wikipedia (`wikipedia_pages.version`), want de ruwe tekst komt zonder versienummer.
- De schutters bij de strafschoppen en de stand bij de rust bewaart hij niet: alleen de score zoals Wikipedia die in `score` heeft, met of de wedstrijd in verlenging ging, de stand na 90 minuten als de pagina die geeft en de score van de strafschoppen.
- De reden van een puntenaftrek bewaart hij niet: Wikipedia geeft die alleen in een voetnoot.
- Opstellingen leest hij niet, en ook geen kaarten, wissels of assists.
- Andere seizoenen leest hij niet in de uurlijkse import (alleen `pnpm run import:season` leest een afgelopen seizoen), en wedstrijden van andere teams van de club ook niet.
  De uitzondering is het seizoen dat net voorbij is, in juli en augustus (zie _Het seizoen dat net voorbij is_).

## De selectie

De import leest ook de selectie van sc Heerenveen 1 (mannen) bij de Nederlandse Wikipedia, voor de lijst met spelers op de zoekpagina (#107) en voor de optredens, doelpunten en assists per speler (#407).
Hij bewaart haar in `players`, de cijfers in `player_season_stats`, de gezondheid in `squad_imports` en de pagina in `wikipedia_pages` (zie de [README van `@fansite/db`](../../packages/db/README.md)).
De bron, de licentie (CC BY-SA 4.0), de controles en het uur tussen twee lezingen zijn die van de wedstrijden.
Waarom dezelfde bron en waarom de zoekterm een eigen kolom is, staat in [`docs/beslissingen/importer.md`](../../docs/beslissingen/importer.md).

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
De koppen staan in één lijst, `squadGroups` in `src/read-squad.ts`: ook "Keepers" is doelman, zoals op de pagina van 2022/23.
Een andere groepskop is een fout.
Bij de eerste cel staat het rugnummer, vet gedrukt of niet.
Een streepje (`| -`) of een lege cel is een speler zonder rugnummer.
Een nummer buiten 1 tot en met 99 is een fout.
De tweede cel is de nationaliteit: de landcode van de vlag gaat naar `players.country` (zie _Het land van een speler_).
De vierde cel, het contract, blijft weg.
De cijfers komen uit de cellen daarna (zie _De cijfers van een speler_).
De naam komt uit de derde cel, zonder attribuut als `align="left"` of `align=left` (zonder aanhalingstekens):

- `[[Naam]]` geeft `Naam`, en `[[Pagina|Naam]]` de tekst achter de `|`;
- komt de naam uit een paginatitel met een toevoeging, zoals `[[Dylan Vente (voetballer)]]`, dan laat de import die toevoeging weg;
- een naam zonder link kan ook.

De pagina waar de link naar wijst, bewaart de import ook, met de toevoeging nog erbij (`Dylan Vente (voetballer)`): spaties voor streepjes, een hoofdletter vooraan en zonder `#kopje`.
Een naam zonder link heeft geen pagina.

### De selectie van een eerder seizoen

Een lezer van de selectie van een eerder seizoen geeft een `SeasonSquad` terug (zie [`src/season-squad.ts`](src/season-squad.ts)), in een van drie vormen:

- `read`: de spelers, de bron, de optelsom van de wedstrijden en van de doelpunten, en de waarschuwingen;
- `none`: een reden, als de pagina of de tabel er niet is;
- `error`: de pagina is van vorm veranderd.

Wat een pagina niet noemt, is leeg (`null`), en geen nul.
`readSeasonSquad` in `src/read-squad.ts` geeft de uitkomst van `readSquad` in die vorm.
De import van het huidige seizoen blijft `readSquad` lezen.

### De tabellen Statistieken van 1990/91 tot en met 2005/06

De pagina's `Sc Heerenveen in het seizoen JJJJ/JJ` (zonder "(mannen)", zie `statisticsPageTitle`) van 1990/91 tot en met 1999/00 en van 2005/06 hebben geen selectie.
Ze noemen wel de spelers die speelden, in een tabel met statistieken.
`readSeasonStatistics` in [`src/read-statistics.ts`](src/read-statistics.ts) leest die tabel in de vorm `SeasonSquad`, met de bron `statistieken`.
Het is een tekstlezer: hij doet zelf geen verzoek en schrijft niets.
De import van #744 roept hem aan.

Er zijn twee vormen:

- 1990/91 tot en met 1999/00: onder de kop "Aantal wedstrijden/doelpunten" staat een tabel per competitie, met een rang, een naam, de wedstrijden (`AW`) en de doelpunten.
  Een speler in meer dan één tabel is één speler, met de cijfers opgeteld.
  De rijen onder "Eigen doelpunt" zijn spelers van andere clubs en blijven weg, net als de rij "Totaal".
- 2005/06: onder de kop "Statistieken" staat één tabel met een groepskop per positie (`Doelverdediger`, `Verdediger`, `Middenvelder`, `Aanvaller`, zie `squadGroups`), het rugnummer, de naam, de geboortedatum en de wedstrijden en doelpunten van elke competitie, opgeteld.

Een pagina zonder zo'n tabel geeft `none`.
Een tabel in een andere vorm geeft een fout: een kop, een kolom of een naam die de lezer niet kent, een rij met te weinig cellen, of een tabel die niet is afgesloten.
Een cijfer dat geen getal is, blijft leeg met een waarschuwing, en dan is ook de optelsom van de pagina leeg.
Een naam zonder link blijft bewaard als hij minstens twee woorden heeft en geen afkorting met een punt.

### De transfers van 2006/07 tot en met 2017/18

De pagina's van deze seizoenen (zie `transfersPageTitle`: 2006/07 zonder "(mannen)", de andere met) hebben een lijst met transfers onder de kop "Transfers" of "Mutaties".
`readSeasonTransfers` in [`src/read-transfers.ts`](src/read-transfers.ts) leest die lijsten in de vorm `SeasonSquad`, met de bron `transfers`.
Voor 2006/07 leest `readSeasonScorers` in hetzelfde bestand ook de lijst onder "Doelpuntenmakers", met de bron `doelpunten`: die wedstrijden staan niet in de database.
Het zijn tekstlezers: ze doen zelf geen verzoek en schrijven niets.
De import van #744 roept ze aan.

Wie meetelt voor het seizoen:

- een speler die in de zomer of in de winter is aangetrokken;
- een speler die is verhuurd, of die terugkeert van verhuur;
- een speler die in de winter is vertrokken;
- een speler die in de zomer vertrok, alleen als de regel zegt dat hij is verhuurd.

Wie in de zomer vóór het seizoen vertrok, telt niet mee: hij heeft het seizoen niet meegemaakt.
Scheidt de pagina de zomer en de winter niet, dan telt een vertrokken speler niet mee.
Een speler in meer dan één lijst is één speler.
Per regel is de eerste link de speler; de links naar clubs zijn dat niet.
Positie en rugnummer zijn leeg.

De lijsten hebben vijf vormen:

- 2006/07: een kop Zomer en een kop Winter, elk met een tabel Nieuw en een tabel Weg.
- 2007/08: een tabel per soort (Aangetrokken, Terugkerende, Vertrokken, Verhuurde en Gestopte spelers) met de soort in het onderschrift, zonder zomer en winter.
- 2008/09 en 2009/10: een tabel per soort onder een kop Aangetrokken, Vertrokken of Verhuurd.
  2008/09 zet een rij "Winterstop" tussen de zomer en de winter in de tabellen van aangetrokken en verhuurde spelers; zijn tabel met vertrokken spelers heeft haar niet.
  De spelers van volgend seizoen en de technische staf tellen niet mee.
- 2010/11: een platte tabel met aangetrokken spelers, en voor vertrokken en verhuurde spelers een kolom Zomer en een kolom Winter.
- 2011/12 tot en met 2017/18: die kolommen voor alle drie de lijsten.

Een pagina zonder de kop, of met de kop maar zonder tabel, geeft `none`.
Een kop, een onderschrift of een kolomkop die de lezer niet kent, een regel zonder naam of een tabel die niet is afgesloten, geeft een fout.
Een naam zonder link blijft bewaard als hij minstens twee woorden heeft en geen afkorting met een punt; anders geeft hij een waarschuwing.

### Wat de import bewaart

Van een speler bewaart hij het seizoen, de naam zoals de tabel hem toont, de positie, het rugnummer (mag ontbreken), de zoekterm en de pagina op Wikipedia (`wikipedia_page`, mag ontbreken).
Daarbij komt het land: de landcode van twee letters van de vlag (`country`, mag ontbreken; zie _Het land van een speler_).
Leeftijd, contract en foto's bewaart hij niet, en ook geen landnaam of vlag zelf.
De cijfers van een speler staan in een eigen tabel (zie _De cijfers van een speler_).
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
Een speler met de bron `doelpunten` blijft daarbij staan: de import van de wedstrijden maakte hem van een doelpuntenmaker (zie _De doelpunten koppelen aan de spelers_).

### De cijfers van een speler

Een rij van de tabel heeft na het contract negen cellen: per competitie het aantal wedstrijden (`W`), de doelpunten en de assists, voor de Eredivisie, de KNVB Beker en het totaal.
`W` telt ook invalbeurten: het zijn geen minuten en geen basisplaatsen.
De import leest de eerste zes cellen, de Eredivisie en de KNVB Beker, en bewaart ze in `player_season_stats`, in dezelfde run en dezelfde transactie als de selectie.
Het totaal leest hij niet: dat is de som, en wie het toont, telt de rijen op.

- Een getal is dat getal, en een streepje (`-`, `–` of `—`) is nul.
- Een competitie met een lege cel krijgt voor die speler geen rij.
  De tabel wordt met de hand bijgehouden, en lege cellen zijn nog niet ingevuld.
- Een waarde die geen getal of streepje is, of een rij met een ander aantal cellen dan 13, geeft een waarschuwing met de naam, en de speler krijgt voor die competitie geen rij.
  Staan de kopjes van de kolommen niet in de volgorde Eredivisie en dan KNVB Beker, dan leest de import geen cijfers en zegt de waarschuwing waarom: een cijfer onder het verkeerde kopje is erger dan geen cijfer.
  Een rij van drie cellen, een tabel zonder cijfers, is geen verandering en geeft geen waarschuwing.
- De rij hoort bij de speler in `players`, dezelfde `id` als de doelpunten.
  Kan de import een speler niet koppelen, omdat zijn rij al van een andere speler van de tabel is, dan staat er een waarschuwing en slaat hij die speler over.
- Een volgende run werkt de rij bij als de cijfers anders zijn, en laat hem anders staan, dus `updated_at` is het moment van de laatste wijziging.
  Er komen geen dubbele rijen: een speler heeft hoogstens één rij per seizoen en competitie.
- Een speler die uit de tabel verdwijnt, houdt zijn laatste cijfers.
  Dat geldt ook voor een cel die later leeg wordt: de import haalt nooit een rij weg.

De tabel loopt soms een speelronde achter op de wedstrijden.
Daarom vergelijkt de import na het wegschrijven het aantal doelpunten per speler en competitie in de tabel met het aantal uit de wedstrijden: de doelpunten van ons in `match_goals` die aan de speler gekoppeld zijn, zonder eigen doelpunten.
Hij vergelijkt de tabel ook met de doelpunten uit de verslagen, voor een competitie waarvan elke gespeelde wedstrijd een verslag heeft dat `klaar` is (#832).
Verschilt het, dan komt er een rij in `player_stat_differences` met de speler, het seizoen, de competitie en de twee aantallen (`comparePlayerGoals` in `@fansite/db/player-stat-differences`, #974).
Het is geen waarschuwing meer en er komt geen regel in het logboek van het beheer.

- Hetzelfde verschil komt er één keer: een volgende run zet alleen `last_seen_at` bij.
- Veranderen de aantallen, dan vervalt de rij (`replaced`) en komt er een nieuwe.
- Is het verschil weg, dan sluit de rij zichzelf (`reverted`).
- De redactie beslist op `/beheer/kwaliteit/<seizoen>/spelerscijfers`.
  Neemt ze het andere aantal over, dan staat dat in `player_season_stats.goals`, en `table_goals` onthoudt wat de tabel van Wikipedia zei.
  Zolang de tabel dat nog zegt, laat de import het aantal van de redactie staan; zegt de tabel iets anders, dan geldt de tabel weer.
- Een verschil dat een mens afwees, komt niet terug zolang de twee aantallen gelijk blijven.

### Een speler die de redactie toevoegde of aanpaste

De redactie kan in het beheer een speler toevoegen en de naam, het rugnummer, de positie en de Wikipedia-pagina van een speler aanpassen (#1020).
`players.editors_fields` zegt welke van die velden van de redactie zijn, en de import schrijft ze nooit (#1022).
Dat geldt voor de import van de selectie (`import-squad.ts`), van een vorige selectie (`import-past-squad.ts`) en voor `storeChosenSpellings`.

- De andere velden vult de import aan zoals altijd: het land, en een positie, rugnummer, pagina of persoon die leeg is.
- Leest de import een andere waarde voor een veld van de redactie, dan komt er een rij in `player_field_differences` met de speler, het seizoen, het veld en de twee waarden (`keepPlayerFieldDifferences` in `@fansite/db/player-field-differences`).
  Dezelfde afwijking komt er één keer, een afwijking met andere waarden vervangt de oude (`replaced`), en een afwijking die weg is sluit zichzelf (`reverted`).
  Een veld dat een lijst niet geeft, is geen afwijking.
- De redactie beslist op `/beheer/kwaliteit/<seizoen>/spelersgegevens`.
  Neemt ze de waarde van de import over, dan is het veld niet meer van de redactie en houdt de import het weer bij.
  Houdt ze haar eigen waarde, dan komt dezelfde afwijking niet terug zolang beide waarden gelijk blijven.
- De import vindt een speler van de redactie op zijn pagina, zijn naam of zijn persoon (`editorsByPerson`), en maakt dan geen tweede rij.
  De rij van de redactie blijft, met haar `id` en haar bron.
- Een speler met de bron `redactie` blijft in de selectie als geen lijst hem heeft, en de eerste goede lezing haalt hem niet weg.
- Maakte de redactie een persoon zonder artikel, en linkt een lijst voor die speler een pagina, dan wordt hij de persoon van die pagina, met de naam van de redactie (`mergeEditorsPersonInto`).
- Een naam van een persoon met de bron `redactie` vervangt de import nooit.
- De import van de doelpuntenmakers en de stap `spelers` van de oude fansite gebruiken een speler van de redactie zoals hij is.

De vergelijking stopt niets: lukt ze niet, dan is dat een waarschuwing en blijft de selectie staan.
Is er in het seizoen nog geen wedstrijd gespeeld, dan is er niets om mee te vergelijken en zegt de controle niets.
Bij de allereerste run op een lege database geeft de controle rijen voor wie al scoorde.
De import van de wedstrijden koppelt zijn doelpunten pas zodra de selectie er is.
De run een uur later vindt ze, en de rijen sluiten zich.

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

Een goede lezing schrijft drie regels, en daarna een regel voor elke waarschuwing:

```text
Squad 2026/27: 25 new, 0 updated, 0 unchanged, 0 left the squad
Squad 2026/27: numbers of the players: 50 new, 0 updated, 0 unchanged
Squad 2026/27: countries of the players: 25 of 25 have one
```

De derde regel noemt hoeveel spelers van deze lezing een land hebben, op het aantal spelers dat de lezing vond.
Een vlag die geen land van twee letters is, krijgt een waarschuwing en een leeg land (zie _Het land van een speler_).

### Het land van een speler

De selectietabel noemt het land van elke speler met een vlag, en de import bewaart de landcode van twee letters in `players.country` (`NL`).
Een speler zonder vlag houdt een lege kolom.
De vlag is een sjabloon:

- `{{NL-VLAG}}` in de tabel van de recente seizoenen en in de lijsten van 2007/08 tot en met 2009/10 (daar staat de vlag voor de naam);
- `{{NL}}` in de tabellen van 2013/14 tot en met 2017/18;
- `nat=NED` in `{{Fs player}}` op de Engelse pagina's, met de code van de voetbalbonden; `countryOfAssociation` in [`src/read-country.ts`](src/read-country.ts) zet die om naar twee letters.

Staan er twee vlaggen in de cel, dan telt de eerste, zoals Wikipedia hem toont.
Een sjabloon dat geen code van twee letters is (`{{ENG-VLAG}}`), een onbekende code van de bonden en een cel met tekst zonder sjabloon geven een leeg land en een waarschuwing met de naam van de speler: `Pim Verbeek: the country '{{ENG-VLAG}}' is not one we know, so it is left empty`.
Een lege cel of een streepje is geen waarschuwing.
Het lopende seizoen neemt het land over zoals de tabel het geeft, ook als het weggaat.
Een seizoen dat voorbij is, vult een leeg land aan en vervangt een land alleen met een betere lijst; zo hoort het bij het rugnummer.
De vlaggen van een vorige club, in de laatste kolommen, zijn nooit het land van de speler.

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

## De oude fansite

De wedstrijden van 1 juli 1990 tot en met 29 april 2007 komen uit de database van de oude fansite, die de projecteigenaar aan het project heeft gegeven.
Productie kan die database niet bereiken.
Daarom leest een script hem eenmalig op je eigen computer en schrijft de feiten naar bestanden in de repository.
De import van de oude wedstrijden leest alleen die bestanden en raakt de oude database nooit.

### De oude database laden

De database zit in de back-up van de hosting van 14 oktober 2026, `backup_sc.heerenveen.org_2610141821.tar`, in het lid `databases/fansitedb_1/backup_sqldump_2610141821.tzst`.
Het andere lid, `forum3db_1`, is het oude forum en hoort hier niet bij.
Dit zijn de stappen:

1. Pak het `.tzst`-bestand uit de tar.
2. Pak het uit met Node.
   `zstd -d` en `tar --zstd` falen, omdat het bestand overslaanbare zstd-frames tussen de datablokken heeft (magic `0x184D2A5x`).
   Loop door de frames, sla de overslaanbare over en pak elk gewoon frame uit met `zlib.zstdDecompressSync` van Node.
   Zet de uitkomsten achter elkaar: dat is een tar met één SQL-bestand van ongeveer 38 MB.
3. Start de database van het project (`docker compose up -d --wait`) en maak er een lege database bij:

   ```sh
   docker compose exec mariadb mariadb -uroot -e 'CREATE DATABASE oldsite_fansitedb'
   ```

4. Laad het SQL-bestand erin.
   De dump begint met `SET NAMES utf8mb4`, dus geef het zelfde mee:

   ```sh
   docker compose exec -T mariadb mariadb -uroot --default-character-set=utf8mb4 oldsite_fansitedb < dump.sql
   ```

Gebruik een databasenaam die van niemand anders is.
De dump bevat ook de gegevens van leden, e-mailadressen en de nieuwsbrief: die komen nooit in de repository.

### Het script draaien

Zet in `.env` de regel `OLD_DATABASE_URL`, zoals `.env.example` die noemt, en draai:

```sh
pnpm --filter @fansite/importer export:old-site
```

Zonder `OLD_DATABASE_URL` stopt het script met een melding.
De verbinding staat op alleen lezen en het script voert alleen `SELECT` uit.
Het schrijft:

- de bestanden in [`data/oude-fansite/`](data/oude-fansite/): `clubs.json`, `players.json` en een bestand per seizoen, `matches-<seizoen>.json` (het seizoen `9091` is 1990/91);
- [`docs/oefenwedstrijden-2002-03.md`](../../docs/oefenwedstrijden-2002-03.md): de negen oefenwedstrijden van de zomer van 2002, met de uitslag en de doelpuntenmakers van sc Heerenveen.

Een tweede run geeft dezelfde bytes: de bestanden zijn gesorteerd, hebben vaste sleutels en een versienummer (`version`), en zijn samen ongeveer 2,2 MB.
Na afloop meldt het script wat niet aan elkaar hangt: wedstrijden zonder uitslag, wedstrijden met een tegenstander die niet in `club` staat, rijen met doelpunten, kaarten, opstellingen, uitslagen of verslagen zonder wedstrijd, en codes van spelers zonder rij in `speler`.
Het stopt daar niet op.
Nu is dat één verslagregel zonder wedstrijd (`nec.bekeruit` in 1997/98) en de codes `foppe.dehaan` en `ivan.tzvekov`.

### Wat erin staat

Alleen feiten: per wedstrijd de code, het seizoen, de datum en tijd zoals de oude database ze heeft, de competitiecode, het rondenummer, de opmerking, de uitslag (rust en eindstand met de opmerking), de cijfers over hoekschoppen, buitenspel en overtredingen, de scheidsrechter, de toeschouwers, de doelpunten en kaarten en de opstelling met de minuten erin en eruit.
Daarbij de tegenstanders (code, naam, land) en de spelers van ons die erin voorkomen (code, voornaam, tussenvoegsel, achternaam).
Van de verslagen leest het script alleen `scheidsrechter` en `toeschouwers`.
Er staan geen teksten van verslagen of voorbeschouwingen in, niets van leden, e-mail of de nieuwsbrief, en van een speler geen geboortedatum, biografie, contract, lengte, gewicht of foto.

De bestanden leggen niets uit.
`home` is de kant die de oude database `t` noemt, een `0` bij hoekschoppen, buitenspel of overtredingen is "onbekend", en een minuut `0` bij een doelpunt of gele kaart ook.
Welke code een speler van ons is, wat een opmerking `n.v.` betekent en wat het seizoen `9091` is, staat in de import.

### De bestanden lezen

`readOldSiteData()` in [`src/old-site-file.ts`](src/old-site-file.ts) leest de hele map.
`readOldSiteFile(bestand)` leest één bestand.
Beide weigeren een bestand met een ander versienummer, een veld dat niet in de vorm past of een waarde buiten de vorm.
`src/old-site-file.test.ts` controleert de namen van alle velden in de bestanden in de repository tegen een lijst met toegestane namen, zodat persoonsgegevens er niet in kunnen komen zonder dat de test faalt.

### De opdracht die de bestanden importeert

`pnpm import:old-site` (op de host `import.mjs --old-site`) leest de bestanden van hierboven en schrijft ze naar de database.
Hij raakt de oude database nooit, want productie kan die niet bereiken.
Hij draait de stappen één voor één, in een vaste volgorde, omdat een wedstrijd een club nodig heeft en een doelpunt een wedstrijd.
Nu zijn er zeven stappen: `clubs`, `matches`, `spelers`, `doelpunten`, `opstellingen`, `personen` en `selecties`.

```sh
pnpm import:old-site --dry-run
pnpm import:old-site
```

- De opdracht leest en controleert de bestanden voordat hij verbinding maakt.
  Past een bestand niet in de vorm, dan schrijft hij niets en stopt hij met exitcode 1.
- Hij neemt de lock van de import, zoals `--season`, en zegt het als een run van cron hem vasthoudt.
- Elke stap schrijft alleen wat verschilt en zegt in één regel hoeveel rijen hij maakte (`new`), wijzigde (`updated`), ongewijzigd liet (`unchanged`) of oversloeg (`skipped`).
  Daaronder staat een regel voor elke nieuwe club, elke club die hij aan een bestaande koppelde en elke rij die hij oversloeg.
  Een tweede run meldt overal `0 new, 0 updated` en schrijft niets.
- Elke stap draait in een transactie van zichzelf.
  De run stopt bij de eerste stap die faalt, want de stappen erna bouwen op die stap; wat de stap deed, is dan teruggedraaid.
- Met `--dry-run` doen alle stappen hun werk in één transactie die aan het eind wordt teruggedraaid: dezelfde getallen en regels, en niets is geschreven.
- De stappen staan in `oldSiteSteps` in [`src/import-old-site.ts`](src/import-old-site.ts).
  Een nieuwe stap is een bestand met een functie en een regel in die lijst; de opdracht blijft zoals hij is.

#### De stap clubs

Voor elke club in `clubs.json` zoekt de stap de club in de database, in deze volgorde:

1. de naam van de oude fansite in `clubs.name`, `club_names.name` of een titel in `club_pages`, zonder hoofdletters, spaties en leestekens (`NEC` is `N.E.C.`);
2. de naam die [`src/old-site-clubs.ts`](src/old-site-clubs.ts) bij de clubcode heeft (`cambuurleeuwarden` is `SC Cambuur`), of de volledige naam uit [`src/club-names.ts`](src/club-names.ts) (`Roda JC` is `Roda JC Kerkrade`);
3. anders maakt hij de club aan, met een adres uit de naam (`fc-basel`; botst het adres, dan komt er een nummer achter) en zonder `wikipedia_page`.

Een naam van de oude fansite die afwijkt, gaat in `club_names`, tenzij een andere club hem al heeft.
Een club zonder pagina krijgt de pagina van Wikipedia zodra de import van Wikipedia een wedstrijd met die club leest; hij maakt geen tweede club.
Een club die samenging of verhuisde (zoals `Dordrecht '90` en `SVV`) blijft een eigen club.
`oldSiteClubIds` geeft voor de stappen erna de club bij elke clubcode.

#### De stap matches

De stap `matches` ([`src/old-site-matches.ts`](src/old-site-matches.ts)) maakt van elke wedstrijd in de bestanden een rij in `matches`, met `data_source = 'oude-fansite'` en `status = 'played'`, en een rij in `match_statistics` waar ten minste één van de zes cijfers boven 0 is.
Hij doet dit:

- Het seizoen `9091` wordt `1990/91`, en de competitiecode wordt de naam (1 Eredivisie, 2 KNVB Beker, 3 Champions League, 4 Europacup II, 5 Intertoto Cup, 6 UEFA Cup, 7 Eerste divisie, 8 Play-offs UEFA Cup).
- `.thuis`, `.bekerthuis` en `.playoffthuis` zijn thuis, de rest uit.
  De uitslag staat thuis-uit in het bestand en wordt `goals_for` en `goals_against` vanuit sc Heerenveen.
- De ronde is `Speelronde N` bij een volledig seizoen van 34 wedstrijden in de Eredivisie of de Eerste divisie, anders `Wedstrijd N`, steeds in volgorde van datum.
  De oude rondenummers worden niet gebruikt.
- De opmerking van de uitslag geeft verlenging en strafschoppen (zie de beslissing in [`docs/beslissingen/importer.md`](../../docs/beslissingen/importer.md)).
- `dt` is Amsterdamse tijd.
  Bij `00:00` blijft `kickoff_at` leeg en is het een datum zonder tijd.
- `note` krijgt alleen de opmerkingen van de oude redactie die een feit zijn voor een bezoeker; de rest staat in de beslissing en wordt niet gekopieerd.
- De stap raakt alleen rijen met de bron `oude-fansite`.
  Een rij met dezelfde sleutel en de bron `wikipedia` slaat hij over en meldt hij.
  De aftrap en de uitslag die de redactie invulde (`match_edits`) blijven zoals ze zijn.
  Hij verwijdert nooit een rij: een wedstrijd die niet meer in de bestanden staat, krijgt een regel in het logboek.
- `deriveOldSiteMatches` geeft ook de sleutel (seizoen, competitie, ronde) van elke wedstrijd, voor de stappen erna.

#### De stappen spelers en doelpunten

De stap `spelers` ([`src/old-site-players.ts`](src/old-site-players.ts)) maakt een rij in `players` voor elke speler van ons in een doelpunt, een assist met een code of een opstelling, voor het seizoen van de wedstrijd, met de bron `verslag` en zonder rugnummer, positie, pagina en persoon.
Een rij die er al is voor dat seizoen en die naam, van welke bron ook, blijft zoals ze is.
Een rij die deze stap zelf onder een oude schrijfwijze maakte (`Ger Schaap`, bron `verslag`, geen pagina en geen persoon) voegt hij samen met de rij van de gekozen schrijfwijze (`Gerrie Schaap`) en haalt hij weg; de doelpunten, opstellingen en cijfers gaan mee.
Het aantal staat bij de gewijzigde rijen, en elke rij heeft een regel in het logboek.
Een code zonder rij in de oude tabel `speler` (`ivan.tzvekov`) krijgt de naam uit de code en een regel in het logboek.
Een code met een spatie (`X. Alberts`) is een speler van de tegenstander en maakt geen rij.

De stap `doelpunten` ([`src/old-site-goals.ts`](src/old-site-goals.ts)) maakt de rijen in `match_goals`, alleen voor een wedstrijd waarvan de doelpunten optellen tot de uitslag.
Een wedstrijd met een uitslag en zonder doelpunten, of met een deel ervan, krijgt er geen en staat als regel in het logboek.
De uitslag is die in de database, dus de uitslag van de redactie als die hem verbeterde.
Tellen de doelpunten niet op, dan gaan ze uit `match_goals` en bewaart de stap ze voor de redactie: een wachtende wijziging in `match_changes` met het deel `goals` en de reden `oldSiteGoalsReason`.
`new_value` is de lijst van de bestanden, `old_value` zijn de doelpunten die de wedstrijd had, en `proposal` heeft allebei.
Dezelfde lijst geeft bij een tweede run geen tweede wijziging, en een lijst die de redactie overnam, laat de stap staan.
Over zo'n wijziging gaat geen mail uit, en de import neemt haar nooit zelf over.
Een eigen doelpunt telt voor de club die ervan profiteert, de minuut 0 is een lege minuut en `penalty` is waar bij `strafschop`, `srafschop` en `penalty`.
De stap raakt alleen wedstrijden met de bron `oude-fansite` en laat een wedstrijd met doelpunten van de redactie of een opgeslagen verslag zoals hij is.
De redenen staan in [`docs/beslissingen/importer.md`](../../docs/beslissingen/importer.md).

#### De stap opstellingen

De stap `opstellingen` ([`src/old-site-lineups.ts`](src/old-site-lineups.ts)) maakt van elke wedstrijd met een opstelling een verslag met de bron `Oude fansite`: een rij in `match_reports`, de spelers van beide teams in `match_appearances`, de wissels, de kaarten en de koppeling van doelpunten en assists aan de spelers.
Wat een verslag wordt, rekent [`src/old-site-report.ts`](src/old-site-report.ts) uit zonder database, zodat een test en het controleverslag hetzelfde resultaat kunnen lezen (`judgeStoredOldSiteMatch` in `src/old-site-lineups.ts` zet het samen met de bewaarde doelpunten).

- De wissels volgen uit de minuut erin en de minuut eruit: een invaller vervangt een speler van zijn team die op dezelfde minuut eruit gaat.
- Onze ploeg krijgt een formatie (`formation_ours`) als de volgorde van de elf beginspelers en hun linie het eens zijn (`deriveOldSiteFormation` in [`src/old-site-formation.ts`](src/old-site-formation.ts)).
  De linie staat per speler in `players.json` als `line` (`doelman`, `verdediger`, `middenvelder`, `aanvaller` of `null`), uit `speler.linie` van de oude database.
  Het zijn 269 van de 566 verslagen; de rest blijft een lijst, en de tegenstander altijd.
  De pagina zegt onder het veld dat de formatie is afgeleid, zolang de redactie het verslag niet opsloeg.
- Een kaart zonder minuut krijgt bij geel een lege minuut en bij rood de minuut waarop de speler eruit ging.
  Een geel-rode kaart voor een speler zonder gele kaart in die wedstrijd krijgt een gele kaart zonder minuut, want de oude fansite schreef de twee als één kaart.
  Een kaart voor de trainer staat in de log.
- `checkMatchReport` beslist over de status.
  Een verslag is `klaar` als de regels geen fout vinden en de stap niets wegliet; anders is het `bezig`, en de log noemt per wedstrijd de reden.
  De eerste regel van de stap telt de verslagen: `566 reports: 505 klaar, 61 bezig`.
- De stap raakt alleen wedstrijden met de bron `oude-fansite`, en laat een verslag dat de redactie opsloeg zoals het is.
  Een tweede run verandert niets.

#### De stap personen

De stap `personen` ([`src/old-site-persons.ts`](src/old-site-persons.ts)) koppelt de spelers met de bron `verslag` en zonder persoon aan een persoon, een titel van de Nederlandse Wikipedia.
Hij koppelt alleen als het zeker is, en hergebruikt `createPersonBook`, dus titels en doorverwijzingen komen in `person_pages`.

- Heeft een andere rij met dezelfde naam al een persoon, in een ander seizoen of met een andere bron, dan krijgt de speler die persoon, zonder verzoek.
- Anders is de titel de naam.
  De stap vraagt de tekst van de pagina (`?action=raw`), volgt een doorverwijzing en koppelt alleen als het artikel in een categorie van voetballers staat.
- Twijfel koppelt niets en komt als regel in het logboek: geen artikel, een doorverwijspagina, geen voetballer, of een verzoek dat niet kon.
  `--report` noemt de spelers die nog geen persoon hebben, onder _Spelers zonder persoon_.
- De bestanden hebben geen geboortedatum, dus er is er geen om te vergelijken met die van Wikidata.
  Een tweede run vraagt alleen nog naar de namen zonder persoon, en raakt geen rij met een andere bron dan `verslag`.
- De tests vragen Wikipedia nooit: ze geven de stap eigen antwoorden (`titles` in `runOldSiteImport`) of gebruiken een webserver op deze computer.

#### De stap selecties

De stap `selecties` ([`src/old-site-completeness.ts`](src/old-site-completeness.ts)) bewaart de volledigheid van de selectie van elk seizoen waarin een speler met de bron `verslag` staat, met `storeCompleteness`.
Zonder die rij toont de kaart Selectie "onbekend" bij een seizoen met alleen spelers uit de verslagen.
Een seizoen met alleen die spelers krijgt de beste bron `verslag`; een seizoen met een betere lijst houdt die bron.
Een tweede run zonder nieuwe gegevens schrijft niets.
Spelers die een redacteur in het beheer aan een verslag toevoegt, hebben ook de bron `verslag`: het seizoen krijgt zijn rij bij de eerstvolgende `pnpm import:completeness` of import van de oude site.

#### Het controleverslag

`pnpm --silent import:old-site --report` (op de host `import.mjs --old-site --report`) schrijft een verslag in Markdown, in het Nederlands, over wat de import niet kon vullen of niet vertrouwde ([`src/old-site-check.ts`](src/old-site-check.ts)).
Het leest de bestanden en de database en schrijft niets in de database.
Het neemt de lock van de import niet, want het leest alleen, en het kan niet samen met `--dry-run`.
Voor de kruistabellen vraagt het de Nederlandse Wikipedia om één pagina per seizoen van de competitie, met de fetcher van de importer.

- Een tabel per seizoen telt de wedstrijden in het bestand en in de database, de doelpunten die optellen, ontbreken of een deel zijn, de opstellingen, de verslagen `klaar` en `bezig`, de scheidsrechters, de toeschouwers, de cijfers en de wedstrijden zonder aanvangstijd.
- Daarna komen de lijsten: wedstrijden die in het bestand maar niet in de database staan, en omgekeerd; rondes met een ander nummer; opmerkingen van de oude redacteuren; doelpunten die niet optellen; verslagen die `bezig` zijn, met de reden per regel; spelers van wie de code geen rij in de oude tabel had; kaarten die de import oversloeg of afleidde; doelpuntenmakers en assists zonder speler; nieuwe clubs en clubs die aan een bestaande zijn gekoppeld.
- Het hoofdstuk _Uitslagen naast de kruistabellen van Wikipedia_ heeft een deel per seizoen van 1990/91 tot en met 2006/07 ([`src/old-site-cross-tables.ts`](src/old-site-cross-tables.ts)).
  `readCrossTable` in [`src/read-cross-table.ts`](src/read-cross-table.ts) leest de tabel onder het kopje _Uitslagen_ van `Eredivisie <seizoen>`, of van `Eerste divisie <seizoen>` voor 1991/92 en 1992/93.
  Het deel noemt de wedstrijden van sc Heerenveen waarvan de uitslag in de database anders is, en de wedstrijden die in de tabel staan en niet in de database.
  Het zoekt de wedstrijd op seizoen, competitie en club (`findMatchesByClub` in `@fansite/db/match-lookup`), en thuis en uit tellen mee.
  De club vindt het met het artikel waar de rij naar linkt of met een naam die een van de tabellen voor dat artikel toont (`clubFinder` in [`src/old-site-clubs.ts`](src/old-site-clubs.ts)).
  De datums vergelijkt het niet, want de kruistabel heeft er geen.
  Is een pagina of een tabel niet te lezen, dan staat het seizoen er met de reden.
  Het vraagt alleen de seizoenen waarvan de bestanden een competitiewedstrijd hebben, en het onthoudt robots.txt niet in de database.
- Buiten dat hoofdstuk rekent het verslag niets zelf uit.
  Het vraagt het aan de stappen (`deriveOldSiteMatches`, `deriveOldSiteGoals`, `deriveOldSitePlayers`, `judgeStoredOldSiteMatch` en `findOldSiteClubs`), die hun meldingen als gegevens geven, en zet ze om in Nederlandse zinnen.
- Het noemt namen zoals ze in de wedstrijd stonden, op de samengevoegde schrijfwijzen na (`oldSiteNameCorrections` in `src/old-site-names.ts`: de keuzes van de projecteigenaar en de schrijfwijze van Wikipedia).
  De lijst _Namen om te beslissen_ noemt de namen die op elkaar lijken en niet zijn samengevoegd.
- Het verslag van een run staat in [`docs/oude-wedstrijden-hiaten.md`](../../docs/oude-wedstrijden-hiaten.md).
  Maak het opnieuw na de import met `pnpm --silent import:old-site --report > docs/oude-wedstrijden-hiaten.md`; `--silent` houdt de regels van pnpm uit het bestand.

#### Op de host

De bestanden zitten niet in `import.mjs`: `pnpm --filter site assemble` zet ze in `apps/importer/data/oude-fansite/` naast het bestand, en de deploy kopieert ze mee.
Op acceptatie start je de opdracht in GitHub met de workflow _Import old site_, zonder SSH, met de keuze `import`, `report` of `status` (zie _De wedstrijden van de oude fansite importeren_ in [`docs/acceptatieomgeving.md`](../../docs/acceptatieomgeving.md)).

## De import op acceptatie

- `pnpm --filter site assemble <nieuwe map>` bundelt de importer met `esbuild` tot één bestand, `apps/importer/import.mjs` in de map voor de host ([`src/bundle.ts`](src/bundle.ts)).
  Het bestand bevat alles wat de importer gebruikt, dus het heeft geen `node_modules` nodig.
  Draai eerst `pnpm --filter site build`.
- De workflow Acceptance draait het bestand één keer op een database zonder feeds, en kopieert het samen met de site naar de host.
- Cron start het daar elke 15 minuten, op minuut 7, 22, 37 en 52, met `DATABASE_URL` uit een eigen bestand in de thuismap.
  De uitvoer komt achteraan in `~/fansite-import.log`.
- Met `--status` toont hetzelfde bestand het overzicht van de gezondheid, en de aantallen van de personen en de formaties.
  De workflow _Import old site_ met de keuze `status` draait het op de host en zet de uitvoer in de samenvatting van de run.
- Met `--season <seizoen>` leest hetzelfde bestand een afgelopen seizoen, eenmalig, en met `--from-season <seizoen>` alle afgelopen seizoenen vanaf dat seizoen (zie _Een afgelopen seizoen_).
- Met `--old-site` leest het de wedstrijdgegevens van de oude fansite uit de bestanden naast `import.mjs` (zie _De opdracht die de bestanden importeert_), en met `--old-site --dry-run` laat het zien wat het zou doen, en met `--old-site --report` schrijft het het controleverslag.
- Met `--squad <seizoen>` leest het de selectie van een afgelopen seizoen, en met `--from-squad <seizoen>` die van alle afgelopen seizoenen vanaf dat seizoen (zie _De selectie van afgelopen seizoenen_).

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
`src/import-feeds.test.ts`, `src/import-forum.test.ts`, `src/import-old-site.test.ts`, `src/old-site-clubs.test.ts`, `src/old-site-matches.test.ts`, `src/old-site-goals.test.ts`, `src/old-site-lineups.test.ts`, `src/import-season.test.ts`, `src/import.test.ts`, `src/run-log.test.ts`, `src/status.test.ts`, `src/robots-store.test.ts` en `src/bundle.test.ts` draaien op een echte MariaDB, zoals de tests van `packages/db`: start hem met `docker compose up -d --wait`.
De tests van het logboek, de gezondheid en het wachten geven de import een nagebootste klok (de optie `clock`), zodat een test een dag of een maand overslaat zonder te wachten.
`src/bundle.test.ts` bundelt de importer in een lege map en draait hem daar, zonder `node_modules`.

De tests van de wedstrijden lezen verkleinde stukken van de pagina's van Wikipedia: [`src/fixtures/wikipedia-programme.wiki`](src/fixtures/wikipedia-programme.wiki), [`wikipedia-standings.wiki`](src/fixtures/wikipedia-standings.wiki) en [`wikipedia-cup.wiki`](src/fixtures/wikipedia-cup.wiki).
De tests van de opdracht voor een afgelopen seizoen lezen stukken van de echte pagina's van 2025/26, op 29 oktober 2026 gelezen: [`wikipedia-season-programme.wiki`](src/fixtures/wikipedia-season-programme.wiki), [`wikipedia-season-standings.wiki`](src/fixtures/wikipedia-season-standings.wiki) en [`wikipedia-season-cup.wiki`](src/fixtures/wikipedia-season-cup.wiki).
Het programma heeft alle wedstrijden van sc Heerenveen, de twee blokken van NAC Breda – sc Heerenveen, de gestaakte wedstrijden van andere clubs met het blok dat ze afmaakt, en de laatste wedstrijd van het seizoen.
Ze zijn gelezen op 25 oktober 2026, en bovenaan staat de herkomst en de licentie (CC BY-SA 4.0).
Er staan alle wedstrijden van sc Heerenveen in en een paar van andere clubs.
De doelpuntenmakers van sc Heerenveen staan erin zoals de pagina ze heeft; die van andere clubs, de verslagen en de scheidsrechters en toeschouwers van andere clubs zijn leeggemaakt.
De overige uitslagen van andere clubs zijn verzonnen, op één regel per wedstrijd, zodat elke club evenveel uitslagen heeft als de stand zegt: tien in `wikipedia-programme.wiki` (ronde 1 tot en met 10) en 34 in `wikipedia-season-programme.wiki`.
Alleen de clubs, de dagen en de rondes volgen de pagina; de paren en de scores niet.
[`wikipedia-stopped-2011-12.wiki`](src/fixtures/wikipedia-stopped-2011-12.wiki) is een uitsnede van de pagina van 2011/12 (op 3 november 2026 gelezen) met de twee blokken van Excelsior – AZ en hun koppen.
[`wikipedia-playoffs-2026.wiki`](src/fixtures/wikipedia-playoffs-2026.wiki) en `wikipedia-playoffs-2025.wiki` zijn het begin van de echte pagina's van de play-offs, gelezen op 1 november 2026, met de halve finale van sc Heerenveen tegen FC Utrecht en tegen AZ.
`wikipedia-playoffs-2024.wiki` is een jaar zonder sc Heerenveen, en `wikipedia-playoffs-2022.wiki` een jaar met een halve finale over twee wedstrijden.
`wikipedia-playoffs-2013.wiki`, `wikipedia-playoffs-2015.wiki`, `wikipedia-playoffs-2016.wiki` en `wikipedia-playoffs-2018.wiki` zijn de Europa League-play-offs, gelezen op 3 november 2026 en ingekort tot de kop van de Europa League: 2013 met een paar van sc Heerenveen, 2015 met twee rondes en verlenging als `(nv)`, 2016 zonder sc Heerenveen en 2018 met een regel tekst onder de kop van de tweede ronde.
[`wikipedia-playoffs-after-ninety.wiki`](src/fixtures/wikipedia-playoffs-after-ninety.wiki) heeft twee verzonnen wedstrijden met verlenging in de lay-out van de echte pagina, met `half time score` zoals de bekerpagina het schrijft, omdat de echte play-offpagina's dat veld nog niet hebben.
[`wikipedia-cup-goals.wiki`](src/fixtures/wikipedia-cup-goals.wiki) heeft de vier bekerwedstrijden van sc Heerenveen uit het seizoen 2025/26, gelezen op 26 oktober 2026, met een eigen doelpunt, twee doelpunten van één speler in één sjabloon, blessuretijd en een gemiste penalty.
`src/read-wikipedia.test.ts` leest ze zonder database en `src/check-wikipedia.test.ts` toetst de controles.
`src/import-matches.test.ts` draait op een echte MariaDB met een eigen webserver die de pagina's geeft, en laat zien dat een falende controle de database ongemoeid laat.
`src/classify-change.test.ts` toetst het oordeel over een wijziging zonder database, met de randen (precies 24 uur, precies drie dagen, de zevende wedstrijd), en `src/import-matches.test.ts` en `src/import-season.test.ts` laten zien dat een verdachte wijziging wacht, na zeven dagen wordt overgenomen of vervalt, dat een mens haar beslist en dat een fout in de beoordeling de database ongemoeid laat.
Een test die `runImport` draait en niets met de wedstrijden te maken heeft, geeft de optie `wikipediaOrigin: null`.
De tests van het commando zelf (`src/import.test.ts` en `src/bundle.test.ts`) zetten een gezondheidsrij voor de wedstrijden en voor de selectie met een `retry_at` ver weg, zodat het commando de echte Wikipedia niet vraagt.

De tests van de selectie lezen [`src/fixtures/wikipedia-squad.wiki`](src/fixtures/wikipedia-squad.wiki): de tabel "Spelers" van de pagina van het seizoen 2026/27, gelezen op 26 oktober 2026, met bovenaan de herkomst en de licentie (CC BY-SA 4.0).
De tabel staat er zoals de pagina haar heeft, in beide schrijfwijzen, met 25 spelers, onder wie een speler met een streepje in plaats van een rugnummer, en met de cijfers van de Eredivisie, de KNVB Beker en het totaal.
`src/read-squad.test.ts` leest hem zonder database en toetst de zoekterm op voorbeelden met voorvoegsels, een streepje en een naam van één woord, en de cijfers: een streepje, een lege cel, een waarde die we niet kennen en kopjes in een andere volgorde.
[`src/fixtures/wikipedia-squad-2022-23.wiki`](src/fixtures/wikipedia-squad-2022-23.wiki) is een verkleinde kopie van de pagina van 2022/23, gelezen op 5 november 2026, met negen spelers: de kop "Keepers", cellen met een attribuut zonder aanhalingstekens, en andere namen en kolommen voor de competities.
`src/check-wikipedia.test.ts` toetst de controles, en `src/import-squad.test.ts` draait op een echte MariaDB met een eigen webserver en laat zien dat een falende controle de database ongemoeid laat, dat een speler zijn `id` houdt, dat een vertrokken speler blijft staan en dat een terugkerende speler weer in de selectie komt.
Dezelfde test laat zien dat de cijfers van een nieuwe speler, een speler zonder cijfers, een vertrokken speler, een streepje en twee runs achter elkaar goed gaan, en dat de controle van de doelpunten wel waarschuwt bij een verschil en niet bij gelijke aantallen.
`src/link-players.test.ts` toetst de regels van de koppeling zonder database, ook voor twee spelers met dezelfde achternaam en voor de persoon, en `src/import-matches.test.ts` laat zien dat de doelpunten van een wedstrijd hun speler en hun persoon krijgen.
`src/person-pages.test.ts` toetst het opvragen van de titels (een doorverwijzing, een titel zonder artikel, een mislukt verzoek, `robots.txt` en de lijst met titels die één persoon zijn) en de waarschuwing voor personen die op elkaar lijken.

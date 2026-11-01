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
Een afgelopen seizoen leest hij niet; dat doet de opdracht `pnpm run import:season <seizoen>`, eenmalig, en `pnpm run import:seasons <seizoen>` voor alle afgelopen seizoenen vanaf een seizoen (zie _Een afgelopen seizoen_).
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
  Bij het Algemeen Dagblad en De Gelderlander (DPG Media) is het de code `~` met acht letters en cijfers aan het eind van het pad, zoals `~a40dbd48` in `…/een-kop~a40dbd48/`: de kop in de link verandert, de code niet.
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

| Waarde       | Wanneer                                                                                                                                                                                                                                                             | Wat de site doet          |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `relevant`   | De kop noemt "sc Heerenveen" of "sc Hearrenfean" (ook "s.c." en "SC", en in "sc Heerenveen-fan"), Abe Lenstra of de volledige naam van iemand van de club, of "Heerenveen" of "Hearrenfean" met een voetbalwoord, een achternaam van de club of een andere profclub | Toont het bericht         |
| `doubtful`   | De kop noemt alleen "Heerenveen" of "Hearrenfean" (de gemeente en de plaats schrijven ook veel nieuws), of alleen een achternaam van de club                                                                                                                        | Toont het bericht nergens |
| `irrelevant` | Verder                                                                                                                                                                                                                                                              | Toont het bericht nergens |

Een kop over de tegenstander van een wedstrijd rond de publicatie is ook `relevant` (zie _Koppen over de tegenstander_).
Hoofdletters en accenten tellen niet, en alleen hele woorden: "Heerenveenseweg" is niet "Heerenveen" en "wandelwedstrijd" is geen "wedstrijd".
Het filter kent ook de Friese schrijfwijze (zie _Friese woorden_).
De keuzes staan in `docs/beslissingen.md`, onder _De regels van het filter_.
De importer bewaart elk bericht, ook `doubtful` en `irrelevant`.
Het beheer (`/beheer/berichten`) toont ze wel, met een woord erbij, zodat een moderator ze kan vinden en verbergen.
Een scherm om twijfelgevallen te beoordelen, en het met de hand corrigeren van een uitkomst (#76), komen later.

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
  Een wedstrijd zonder aftrap telt met de datum die we hebben, en een uitgestelde wedstrijd zonder nieuwe datum telt niet.
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
  Een kop met "Heerenveen" valt onder de andere regels en wordt niet slechter van een tweede club.
- **De naam van de tegenstander:** de naam in `matches.opponent` ("N.E.C.", "ADO Den Haag", "Almere City FC") hoort bij de namen die het filter voor die club kent.
  Dat verband staat op één plek: `otherClubGroups` in [`src/relevance-terms.ts`](src/relevance-terms.ts), met de namen van één club bij elkaar.
  De naam uit de wedstrijd, of die naam zonder FC, SC, VV, SV of AFC ervoor of erachter, moet een van die namen zijn.
  Dan telt elke naam van de groep: "ADO beleeft frustrerende avond" noemt ADO Den Haag.
  Een club die naar een plaats heet, telt alleen met zijn volledige naam ("FC Twente", niet "Twente"), zodat een kop over de stad niet `relevant` wordt.
- **Een tegenstander die niet in de lijst staat:** een amateurclub in de beker telt met zijn naam uit de wedstrijd, zonder voor- of achtervoegsel.
  Bij twee woorden of meer telt de naam altijd: "Excelsior Maassluis", "Quick Boys", "De Treffers".
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
Dat zijn nu de feed van Omrop Fryslân (zie _De regionale feed van Omrop Fryslân_), de voetbalfeed van NOS (zie _De voetbalfeed van NOS_), die van het Algemeen Dagblad (zie _De voetbalfeed van het Algemeen Dagblad_), die van De Gelderlander (zie _De sportfeed van De Gelderlander_), die van ESPN (zie _De voetbalfeed van ESPN NL_) en de sportfeed van Rijnmond (zie _De sportfeed van Rijnmond_).

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
De krant staat dicht bij N.E.C. en Go Ahead Eagles: rond een wedstrijd tegen een van hen telt een kop over de tegenstander mee (zie _Het relevantiefilter_), en daarbuiten alleen een kop over sc Heerenveen.
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
Het gaat om de Eredivisie, de KNVB Beker en de play-offs voor de Conference League van het lopende seizoen.
Een seizoen begint op 1 juli en heet `2026/27`.
Een afgelopen seizoen leest een aparte opdracht, eenmalig (zie _Een afgelopen seizoen_).

### Welke pagina's

Per seizoen leest de import vier pagina's, met de titels uit `pageTitles` in [`src/read-wikipedia.ts`](src/read-wikipedia.ts):

| Pagina                                           | Wat erop staat                                                                     |
| ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `Eredivisie 2026/27 (mannenvoetbal)`             | De stand, in het sjabloon `Sports table`                                           |
| `Eredivisie 2026/27 (mannenvoetbal)/Wedstrijden` | Het programma en de uitslagen van de hele competitie, in `Footballbox2`, per ronde |
| `KNVB Beker 2026/27 (mannen)`                    | De bekerwedstrijden, ook in `Footballbox2`, met een kop per ronde                  |
| `Play-offs Nederlands voetbal 2027`              | De play-offs voor de Conference League, ook in `Footballbox2` (zie _De play-offs_) |

De titels volgen uit het seizoen, dus een nieuw seizoen kost geen code.
Alles gaat door de fetcher en alleen naar `/wiki/<pagina>?action=raw`: `robots.txt` van Wikipedia sluit `/w/` en dus `api.php`.
De fetcher stuurt dan de herkenbare user agent en houdt zich aan 429 en `Retry-After`.
Met `action=raw` krijgt de import de wikitekst van de pagina, en leest `read-wikipedia.ts` daarin de sjablonen.

### De play-offs

Na de competitie spelen de clubs op de plekken vijf tot en met negen om één ticket voor de tweede voorronde van de Conference League.
Wikipedia heeft per jaar een pagina, `Play-offs Nederlands voetbal <jaar>`, met het jaar waarin het seizoen eindigt: voor 2026/27 is dat 2027.
De import bewaart de wedstrijden van sc Heerenveen als competitie `Play-offs Conference League`, en `wikipedia_pages` bewaart de pagina met de soort `playoffs`.

- Hij leest alleen de wedstrijden onder de kop `Play-offs voor de UEFA Conference League` (in de eerste jaren `UEFA Europa Conference League`), tot de volgende kop van dat niveau.
  De play-offs om promotie en degradatie op dezelfde pagina laat hij weg.
- De ronde is de kop van het niveau erboven, `Halve finales` als `Halve finale` en `Finale`, en niet de kop `Wedstrijd A`.
  Een wedstrijd onder een andere kop is een fout.
- In 2022 en 2023 speelden de clubs de halve finale over twee wedstrijden, elk met `round = Wedstrijd 1/2` in het sjabloon.
  De ronde is dan `Halve finale, wedstrijd 1/2`, zodat de sleutel (seizoen, competitie, ronde) per wedstrijd verschilt.
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
  Voor oudere seizoenen, waarin de kop anders heette, leest de import niets: de kop ontbreekt dan, en dat is een fout.

### Wat de import bewaart

- Van sc Heerenveen alleen: de wedstrijden waar de club als `[[sc Heerenveen]]` in staat.
  Van een wedstrijd bewaart hij de ronde (de kop boven het sjabloon, zoals `Speelronde 12` of `Eerste ronde`), de tegenstander, de club van de tegenstander (zie _De clubs van de tegenstanders_), thuis of uit, het stadion, de status en de uitslag.
  Een speelronde van de competitie is een kop `Speelronde <nummer>`; wedstrijden onder andere koppen leest hij niet.
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
  Het sjabloon `goal` heeft de minuten achter elkaar: `{{goal|45+2}}` is minuut 45 met 2 minuten erbij, `{{goal|78||80}}` zijn twee doelpunten van dezelfde speler, en `e.d.` of `pen.` na een minuut hoort bij dat doelpunt, zoals in `{{goal|5|pen.|23|pen.}}`.
  Een eigen doelpunt staat op de pagina bij de club die ervan profiteert (`{{goal|7|e.d.}}`), en zo bewaart de import het ook.
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
  Een datum zonder jaar, een laatste dag voor de eerste of een dag die niet bestaat kent de import niet: dat is een fout, en de import verandert niets (zie _Slaagt of mislukt_).
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

### De clubs van de tegenstanders

Elke wedstrijd hangt aan een club (`matches.club_id`, zie _De tabellen `clubs` en `club_names`_ in de [README van `@fansite/db`](../../packages/db/README.md)).
Een club is één artikel op de Nederlandse Wikipedia, met een vaste slug voor zijn adres.
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
   `kies` is nooit een slug, want de site gebruikt `kies` zelf in een adres, zoals `/statistieken/kies`.
   Een club houdt zijn slug, ook als zijn naam verandert.
5. Schrijft Wikipedia de naam van een club die we al hebben anders, dan komt die naam bij de andere namen.
   Is de wedstrijd van het nieuwste seizoen dat we van de club hebben, dan wordt het de naam van de club, en de oude naam komt bij de andere namen.
   Een naam die de club al had, verandert niets, zodat twee schrijfwijzen in één seizoen niet om de beurt de naam zijn.
   Een naam van een andere club blijft bij die club.

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
Hebben twee van die clubs elk een eigen artikel, dan laat hij ze staan en zegt dat in het logboek: één artikel is één club.
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

- Zonder argument toont de opdracht de wijzigingen die wachten, met nummer, de oude en de nieuwe waarde en het moment waarop de import ze overneemt.
- `accept` en `reject` nemen nummers of `all`.
  Ze vragen niets aan Wikipedia: een geaccepteerde wijziging wordt wat de import zag op het moment van de wijziging.
  Ze nemen de lock van de import, zoals `pnpm run import:season`.
- De exitcode is 0 als alles besloten is, en 1 bij een weigering, een nummer dat niet wacht of een import die de lock houdt.
- Een melding per mail komt er niet bij: de eigenaar kijkt in het overzicht en in het logboek.
  Het beheer komt met #272.

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
De uurlijkse import leest een afgelopen seizoen niet, dus een wijziging daarin wacht tot iemand haar besluit, of tot `pnpm run import:season` het seizoen na zeven dagen weer leest en de pagina nog dezelfde waarde toont.

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
- De import leest de waarden in de haakjes en controleert ze.
  Een stand bij de rust kan niet hoger zijn dan de stand daarvoor, en een stand na 90 minuten kan niet hoger zijn dan de eindstand.
  Een stand na 90 minuten zonder verlenging (`aet`) is ook een fout.
  De stand na 90 minuten bewaart hij (zie _Wat de import bewaart_ hierboven), de stand bij de rust niet.
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
- Ze leest de vier pagina's van dat seizoen (vier verzoeken), met dezelfde fetcher, controles en opslag als de uurlijkse import, en schrijft alles in één transactie.
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

#### Een gestaakte wedstrijd

De pagina van 2025/26 heeft voor NAC Breda – sc Heerenveen (speelronde 33) twee blokken.
Het eerste heeft de score "Gestaakt 82' (2 – 0)" op 10 mei 2026 in Breda, het tweede de definitieve uitslag 2–0 op 11 mei in het Abe Lenstra Stadion, met een voetnoot bij de datum.
De reader werkt zo (zie _Een gestaakte wedstrijd telt voor zijn begin, het restant geeft de uitslag en een regel_ in [`docs/beslissingen.md`](../../docs/beslissingen.md)):

- Een blok waarvan de score met "Gestaakt" begint, is de wedstrijd.
  Het geeft het stadion, thuis of uit, de datum en de aftrap, zodat de cijfers per stadion de wedstrijd tellen voor de plek waar hij begon.
- Het laatste blok daarna onder dezelfde kop voor dezelfde twee clubs maakt de wedstrijd af en is zelf geen wedstrijd.
  Het geeft de uitslag en de doelpunten, en de dag en het stadion voor de regel in `matches.note`: "Gestaakt in minuut 82. Het restant is op 11 mei gespeeld in het Abe Lenstra Stadion."
  De minuut staat in de score van het gestaakte blok.
  Een naam die op "Stadion" eindigt, krijgt "het" ervoor.
  Heeft het blok nog geen uitslag, dan staat er "wordt gespeeld".
  Over de reden van het staken of het publiek zegt de regel niets.
- Heeft de pagina geen later blok, dan stopt de import met een fout die de wedstrijd noemt.
  Dat geldt ook als het latere blok zelf gestaakt is, een dag of minuut heeft die we niet kennen, of een uitgestelde wedstrijd is.
  Een score die we niet kennen, geeft altijd een fout.
- Gestaakte wedstrijden van andere clubs leest hij niet, want alleen de wedstrijden van sc Heerenveen komen in de database.
- Een voetnoot (`<ref>...</ref>`) haalt hij weg voordat hij de pagina leest, dus een datum met een voetnoot leest als de datum.
- Een rode kaart met een VAR-controle (`{{rode kaart VAR|...}}`) is net als een andere rode kaart geen doelpunt.

### Wat de import niet doet

- De versie van een pagina bewaart hij als de `Last-Modified` van Wikipedia (`wikipedia_pages.version`), want de ruwe tekst komt zonder versienummer.
- De schutters bij de strafschoppen en de stand bij de rust bewaart hij niet: alleen de score zoals Wikipedia die in `score` heeft, met of de wedstrijd in verlenging ging, de stand na 90 minuten als de pagina die geeft en de score van de strafschoppen.
- Een puntenaftrek rekent hij niet mee.
  De stand zou dan niet meer kloppen met de uitslagen, en de import blijft op de laatste goede versie staan tot iemand ingrijpt.
- Opstellingen leest hij niet, en ook geen kaarten, wissels of assists.
- Andere seizoenen leest hij niet in de uurlijkse import (alleen `pnpm run import:season` leest een afgelopen seizoen), en wedstrijden van andere teams van de club ook niet.

## De selectie

De import leest ook de selectie van sc Heerenveen 1 (mannen) bij de Nederlandse Wikipedia, voor de lijst met spelers op de zoekpagina (#107) en voor de optredens, doelpunten en assists per speler (#407).
Hij bewaart haar in `players`, de cijfers in `player_season_stats`, de gezondheid in `squad_imports` en de pagina in `wikipedia_pages` (zie de [README van `@fansite/db`](../../packages/db/README.md)).
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
De tweede cel is de nationaliteit en blijft weg, net als de vierde, het contract.
De cijfers komen uit de cellen daarna (zie _De cijfers van een speler_).
De naam komt uit de derde cel, zonder attribuut als `align="left"`:

- `[[Naam]]` geeft `Naam`, en `[[Pagina|Naam]]` de tekst achter de `|`;
- komt de naam uit een paginatitel met een toevoeging, zoals `[[Dylan Vente (voetballer)]]`, dan laat de import die toevoeging weg;
- een naam zonder link kan ook.

De pagina waar de link naar wijst, bewaart de import ook, met de toevoeging nog erbij (`Dylan Vente (voetballer)`): spaties voor streepjes, een hoofdletter vooraan en zonder `#kopje`.
Een naam zonder link heeft geen pagina.

### Wat de import bewaart

Van een speler bewaart hij het seizoen, de naam zoals de tabel hem toont, de positie, het rugnummer (mag ontbreken), de zoekterm en de pagina op Wikipedia (`wikipedia_page`, mag ontbreken).
Nationaliteit, leeftijd, contract en foto's bewaart hij niet, en vlaggen ook niet.
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
Verschilt het, dan komt er een waarschuwing met de naam, het seizoen, de competitie en de twee aantallen:

```text
Squad 2026/27: warning, Luca Oyen (2026/27) has 2 goals in the Eredivisie in the squad table and 1 in the matches
```

De controle verandert niets en stopt niets: de tabel is de bron van de cijfers die we tonen.
De waarschuwing komt ook in `squad_imports.last_warning`.
Is er in het seizoen nog geen wedstrijd gespeeld, dan is er niets om mee te vergelijken en zegt de controle niets.
Bij de allereerste run op een lege database geeft de controle waarschuwingen voor wie al scoorde.
De import van de wedstrijden koppelt zijn doelpunten pas zodra de selectie er is.
De run een uur later vindt ze, en de waarschuwingen zijn weg.

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

Een goede lezing schrijft twee regels, en daarna een regel voor elke waarschuwing:

```text
Squad 2026/27: 25 new, 0 updated, 0 unchanged, 0 left the squad
Squad 2026/27: numbers of the players: 50 new, 0 updated, 0 unchanged
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
- Met `--season <seizoen>` leest hetzelfde bestand een afgelopen seizoen, eenmalig, en met `--from-season <seizoen>` alle afgelopen seizoenen vanaf dat seizoen (zie _Een afgelopen seizoen_).

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

De tests van de wedstrijden lezen verkleinde stukken van de pagina's van Wikipedia: [`src/fixtures/wikipedia-programme.wiki`](src/fixtures/wikipedia-programme.wiki), [`wikipedia-standings.wiki`](src/fixtures/wikipedia-standings.wiki) en [`wikipedia-cup.wiki`](src/fixtures/wikipedia-cup.wiki).
De tests van de opdracht voor een afgelopen seizoen lezen stukken van de echte pagina's van 2025/26, op 29 oktober 2026 gelezen: [`wikipedia-season-programme.wiki`](src/fixtures/wikipedia-season-programme.wiki), [`wikipedia-season-standings.wiki`](src/fixtures/wikipedia-season-standings.wiki) en [`wikipedia-season-cup.wiki`](src/fixtures/wikipedia-season-cup.wiki).
Het programma heeft alle wedstrijden van sc Heerenveen, de twee blokken van NAC Breda – sc Heerenveen, de gestaakte wedstrijden van andere clubs met het blok dat ze afmaakt, en de laatste wedstrijd van het seizoen.
Ze zijn gelezen op 25 oktober 2026, en bovenaan staat de herkomst en de licentie (CC BY-SA 4.0).
Er staan alle 34 wedstrijden van sc Heerenveen in en een paar van andere clubs.
De doelpuntenmakers van sc Heerenveen staan erin zoals de pagina ze heeft; die van andere clubs, de verslagen en de scheidsrechters en toeschouwers van andere clubs zijn leeggemaakt.
[`wikipedia-playoffs-2026.wiki`](src/fixtures/wikipedia-playoffs-2026.wiki) en `wikipedia-playoffs-2025.wiki` zijn het begin van de echte pagina's van de play-offs, gelezen op 1 november 2026, met de halve finale van sc Heerenveen tegen FC Utrecht en tegen AZ.
`wikipedia-playoffs-2024.wiki` is een jaar zonder sc Heerenveen, en `wikipedia-playoffs-2022.wiki` een jaar met een halve finale over twee wedstrijden.
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
`src/check-wikipedia.test.ts` toetst de controles, en `src/import-squad.test.ts` draait op een echte MariaDB met een eigen webserver en laat zien dat een falende controle de database ongemoeid laat, dat een speler zijn `id` houdt, dat een vertrokken speler blijft staan en dat een terugkerende speler weer in de selectie komt.
Dezelfde test laat zien dat de cijfers van een nieuwe speler, een speler zonder cijfers, een vertrokken speler, een streepje en twee runs achter elkaar goed gaan, en dat de controle van de doelpunten wel waarschuwt bij een verschil en niet bij gelijke aantallen.
`src/link-players.test.ts` toetst de regels van de koppeling zonder database, ook voor twee spelers met dezelfde achternaam, en `src/import-matches.test.ts` laat zien dat de doelpunten van een wedstrijd hun speler krijgen.

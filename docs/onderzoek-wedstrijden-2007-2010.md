# Onderzoek: wedstrijden van 2007/08 tot en met 2009/10 op Wikipedia

Dit is het antwoord op issue #971.
De vraag: wat heeft Wikipedia van de wedstrijden van sc Heerenveen in 2007/08, 2008/09 en 2009/10, voordat iemand een lezer bouwt?
De oude fansite stopt in april 2007 en de lezer van Wikipedia begint bij 2010/11.
Deze drie seizoenen hebben dus nog geen wedstrijden.
Het onderzoek hoort bij #414 en bij het rapport over de wedstrijd- en spelersgegevens van 9 november 2026 (stap 10).

## Hoe is het gemeten

Een wegwerpscript haalde op 9 november 2026 de tekst van 46 pagina's, doorverwijzingen en pagina's zonder wedstrijden van ons erbij op, met `createFetcher` van de importer: robots.txt, de pauze van een halve seconde tussen verzoeken en onze User-Agent.
Het script stond buiten de repository en schreef niets in de database.
De pagina's van de Nederlandse Wikipedia kwamen van `nl.wikipedia.org`, die van de Engelse van `en.wikipedia.org`, allebei als `?action=raw`.
De aantallen komen uit de wikitekst: ik telde de blokken `football box`, de rijen van de tabellen en de cellen van de kruistabellen die een wedstrijd van sc Heerenveen zijn.
Een veld telt als aanwezig als het niet leeg is.
Een wedstrijd van "Jong sc Heerenveen" telt niet mee.

#414 vond al dat deze seizoenen geen aparte pagina met wedstrijden hebben en geen tabel in het sjabloon `Sports table`.
Dat klopt, maar de wedstrijden staan wel op vier andere plaatsen:

- de kruistabel van de Eredivisie, alleen met uitslagen;
- de seizoenspagina van de club, in een oude tabel of in `football box`-blokken;
- de pagina van de KNVB Beker en van de play-offs, met `football box`-blokken;
- de pagina's van de UEFA Cup en de Europa League op de Engelse Wikipedia.

Welke pagina's niet bestaan: `Eredivisie 2007/08 (mannenvoetbal)/Wedstrijden` (404, alle drie de seizoenen), `2007–08 SC Heerenveen season` en `2008–09 SC Heerenveen season` op de Engelse Wikipedia (404).
De pagina's `Eredivisie 2007/08`, `KNVB Beker 2007/08` en `Sc Heerenveen in het seizoen 2007/08` zonder toevoeging zijn doorverwijspagina's, en dat geldt voor alle drie de seizoenen.

## 2007/08

sc Heerenveen werd vijfde in de Eredivisie, speelde de play-offs voor de Champions League en kwam in de UEFA Cup.

| Competitie | Pagina                                                   | Datum | Uitslag | Doelpuntenmakers | Toeschouwers | Scheidsrechter | Wedstrijden         |
| ---------- | -------------------------------------------------------- | ----- | ------- | ---------------- | ------------ | -------------- | ------------------- |
| Eredivisie | `Eredivisie 2007/08 (mannenvoetbal)` (nl), kruistabel    | nee   | ja      | nee              | nee          | nee            | 34                  |
| Eredivisie | `2007–08 Eredivisie` (en), kruistabel                    | nee   | ja      | nee              | nee          | nee            | 34                  |
| KNVB Beker | `2007–08 KNVB Cup` (en)                                  | nee   | ja      | nee              | nee          | nee            | 2                   |
| Play-offs  | `Play-offs Nederlands voetbal 2008` (nl), `footballbox2` | ja    | ja      | ja               | ja           | ja             | 4                   |
| UEFA Cup   | `2007–08 UEFA Cup first round` (en), `football box`      | ja    | ja      | ja               | nee          | ja             | 2                   |
| Club (nl)  | `Sc Heerenveen in het seizoen 2007/08 (mannen)`, tabel   | ja    | ja      | ja               | nee          | nee            | 12 oefenwedstrijden |

De Nederlandse seizoenspagina van 2007/08 heeft alleen de oefenwedstrijden.
De Engelse Eredivisie-pagina noemt wel de gemiddelde opkomst per club, maar niet per wedstrijd.

Samen zijn het 42 wedstrijden om te spelen, zonder de oefenwedstrijden: 34 in de competitie, 2 in de beker, 4 in de play-offs en 2 in de UEFA Cup.

## 2008/09

sc Heerenveen won de KNVB Beker (17 mei 2009, 2–2 na verlenging tegen FC Twente) en speelde in de UEFA Cup, tot en met de groepsfase.

| Competitie | Pagina                                                      | Datum | Uitslag                                                 | Doelpuntenmakers  | Toeschouwers | Scheidsrechter | Wedstrijden |
| ---------- | ----------------------------------------------------------- | ----- | ------------------------------------------------------- | ----------------- | ------------ | -------------- | ----------- |
| Eredivisie | `Eredivisie 2008/09 (mannenvoetbal)` (nl), kruistabel       | nee   | ja                                                      | nee               | nee          | nee            | 34          |
| Eredivisie | `2008–09 Eredivisie` (en), kruistabel                       | nee   | ja (32 van 34, de derby tegen FC Groningen is een link) | nee               | nee          | nee            | 34          |
| Eredivisie | `Sc Heerenveen in het seizoen 2008/09 (mannen)` (nl), tabel | ja    | ja                                                      | ja, zonder minuut | nee          | nee            | 34          |
| KNVB Beker | `KNVB Beker 2008/09 (mannen)` (nl), `football box`          | ja    | ja                                                      | ja                | ja           | ja             | 5           |
| KNVB Beker | `2008–09 KNVB Cup` (en), `football box`                     | ja    | ja                                                      | ja                | 1 van 3      | 1 van 3        | 3 van 5     |
| UEFA Cup   | `2008–09 UEFA Cup first round` (en)                         | ja    | ja                                                      | ja                | ja           | ja             | 2           |
| UEFA Cup   | `2008–09 UEFA Cup group stage` (en)                         | ja    | ja                                                      | ja                | ja           | ja             | 4           |
| UEFA Cup   | `Sc Heerenveen in het seizoen 2008/09 (mannen)` (nl), tabel | ja    | ja                                                      | ja, met kaarten   | nee          | nee            | 6           |

De Nederlandse seizoenspagina heeft per wedstrijd de datum, het stadion, de uitslag en de doelpuntenmakers van beide teams, maar het sjabloon `{{goal}}` heeft er geen minuut.
Er staan ook gele en rode kaarten bij.
De tabel van de beker heeft 6 rijen en de pagina van de beker 5 wedstrijden van ons.
De oefenwedstrijden (19 rijen) tellen niet mee.
De pagina van de beker van 2007/08 op de Nederlandse Wikipedia heeft een schema zonder blokken, dat ik niet gelezen heb.

Samen zijn het 45 wedstrijden: 34 in de competitie, 5 in de beker en 6 in de UEFA Cup.
Er waren in 2009 geen play-offs voor sc Heerenveen: `Play-offs Nederlands voetbal 2009` noemt de club niet.

## 2009/10

sc Heerenveen speelde om de Johan Cruijff Schaal, kwam in de play-offs en de groepsfase van de Europa League en verloor in de beker van PSV.

| Competitie       | Pagina                                                      | Datum | Uitslag        | Doelpuntenmakers | Toeschouwers | Scheidsrechter | Wedstrijden |
| ---------------- | ----------------------------------------------------------- | ----- | -------------- | ---------------- | ------------ | -------------- | ----------- |
| Alle competities | `2009–10 SC Heerenveen season` (en), `football box`         | ja    | ja             | ja, met minuut   | 8 van 46     | 45 van 46      | 46          |
| Eredivisie       | `Eredivisie 2009/10 (mannenvoetbal)` (nl), kruistabel       | nee   | ja             | nee              | nee          | nee            | 34          |
| Eredivisie       | `2009–10 Eredivisie` (en), kruistabel                       | nee   | ja (32 van 34) | nee              | nee          | nee            | 34          |
| Eredivisie       | `Sc Heerenveen in het seizoen 2009/10 (mannen)` (nl), tabel | ja    | ja             | ja, met minuut   | nee          | nee            | 9 van 34    |
| KNVB Beker       | `KNVB Beker 2009/10 (mannen)` (nl), `football box`          | ja    | ja             | ja               | ja           | ja             | 2 van 3     |
| Europa League    | `2009–10 UEFA Europa League group stage` (en)               | ja    | ja             | ja (5 van 6)     | ja           | ja             | 6           |
| Europa League    | `Sc Heerenveen in het seizoen 2009/10 (mannen)` (nl), tabel | ja    | ja             | ja, met minuut   | nee          | nee            | 8           |

De Engelse seizoenspagina van de club heeft alle 46 wedstrijden in één lijst: 1 voor de Johan Cruijff Schaal, 34 in de Eredivisie, 3 in de beker (SDC Putten, RBC Roosendaal en PSV), 2 in de play-off ronde van de Europa League (PAOK) en 6 in de groepsfase.
De toeschouwers staan alleen bij de Europese wedstrijden, met een verwijzing naar de UEFA.
De bekerwedstrijd tegen SDC Putten (23 september 2009) heeft geen scheidsrechter en komt in de pagina van de beker op de Nederlandse Wikipedia niet als blok voor.
De Nederlandse pagina van de club heeft van de Eredivisie maar 9 van de 34 rijen: de tabel breekt af na 27 september 2009.

Er zijn 46 wedstrijden, met de Johan Cruijff Schaal erbij.

## Wat de bestaande lezers ermee doen

De importer heeft lezers voor 2010/11 en later (`readLeague`, `readCup`, `readPlayoffs`, `readEuropaLeague` in `apps/importer/src/read-wikipedia.ts`).
Ik draaide `readCup` op de pagina's van de beker van 2007/08, 2008/09 en 2009/10: het resultaat was nul wedstrijden, zonder fout.
`readPlayoffs` op de pagina van de play-offs van 2008 gaf een foutmelding, en `readEuropaLeague` op de groepsfase van 2009/10 ook.
De blokken zijn `football box` en `footballbox2`, en de bestaande lezers zoeken de sjablonen en velden van de seizoenen vanaf 2010/11.
Elke lezer voor deze seizoenen is dus nieuw werk, ook al lijkt de vorm op elkaar.

## Voorstel

**De Engelse seizoenspagina van 2009/10 geeft de meeste wedstrijden voor één lezer.**
Eén lezer van `football box`-blokken geeft 46 wedstrijden met datum, uitslag, doelpuntenmakers met minuut, stadion en bijna overal de scheidsrechter.
Dezelfde lezer past op `football box` in de Engelse pagina's van de UEFA Cup, en op `footballbox2` van de play-offs van 2008 en de beker van 2008/09, met een kleine aanpassing van de veldnamen.
Daarmee zijn te lezen met datum, uitslag en doelpuntenmakers:

| Seizoen | Wedstrijden met alle drie                                         |
| ------- | ----------------------------------------------------------------- |
| 2007/08 | 6 van 42: de play-offs (4) en de UEFA Cup (2)                     |
| 2008/09 | 11 van 45: de beker (5, de Nederlandse pagina) en de UEFA Cup (6) |
| 2009/10 | 46 van 46                                                         |
| Totaal  | 63 van 133                                                        |

De overige 70 wedstrijden zijn 68 Eredivisie-wedstrijden van 2007/08 en 2008/09 en 2 bekerwedstrijden van 2007/08.
Voor 2007/08 heeft Wikipedia nergens een datum van de competitie, en voor 2008/09 alleen de Nederlandse seizoenspagina.
Er zijn twee wegen voor de competitie:

1. **Een lezer voor de Nederlandse seizoenspagina van 2008/09** (tabel met 34 competitiewedstrijden met datum, stadion, uitslag en doelpuntenmakers zonder minuut).
   Het is de enige pagina met datums van de competitie van 2008/09, en het kost een eigen lezer voor één seizoen.
2. **De kruistabel lezen en de datums met de hand invullen.**
   De kruistabel geeft de uitslag en de tegenstander en of het een thuis- of uitwedstrijd was, voor alle 34 wedstrijden van 2007/08, 2008/09 en 2009/10.
   De datum komt dan van de redactie.

Mijn voorstel: bouw twee lezers.
Eerst de lezer van `football box` voor de Engelse seizoenspagina van 2009/10, de UEFA Cup-pagina's, de beker en de play-offs.
Daarna de kruistabel van de Eredivisie, als "alleen uitslag", voor 2007/08 en 2008/09.
De Nederlandse seizoenspagina van 2008/09 is het tweede werk waard als de redactie de datums niet wil invullen.

## Wat de redactie met #970 moet invullen

Wikipedia heeft het niet, of niet voor elke wedstrijd:

- **De datum en de speelronde** van 68 competitiewedstrijden uit 2007/08 en 2008/09, tenzij de lezer van de Nederlandse seizoenspagina van 2008/09 er komt.
- **De doelpuntenmakers en de minuten** van die 68 wedstrijden, en de minuten van de doelpunten uit 2008/09 in de competitie (de Nederlandse pagina heeft er geen).
- **De toeschouwers** van alle competitiewedstrijden en van de beker, op de vijf wedstrijden van de beker van 2008/09 na.
  Alleen de Europese wedstrijden en de play-offs van 2008 hebben ze.
- **De scheidsrechter** van de competitie van 2007/08 en 2008/09, van de beker van 2007/08 en van de wedstrijd tegen SDC Putten.
- **De opstellingen, wissels en kaarten** staan op geen enkele pagina per wedstrijd: de Nederlandse seizoenspagina's hebben alleen de kaarten van 2008/09 en 2009/10.
  Het zijn dezelfde velden als bij de wedstrijden van de oude fansite, en #970 heeft er de plaats voor.

## Wat ik niet onderzocht heb

- De wedstrijden van sc Heerenveen onder 21 en van de vrouwen: alleen het eerste mannenelftal telt.
- Een reden waarom de pagina's op de Engelse Wikipedia ontbreken, en of ze er later komen.
- De rechten: dezelfde als bij de andere pagina's van Wikipedia (CC BY-SA 4.0), zoals het besluit _Seizoenen en selecties komen van de Nederlandse Wikipedia, ook als een seizoen een gat heeft_ vastlegt.
  Het besluit van 3 november 2026 staat de Engelse Wikipedia alleen toe voor de Europa League-wedstrijden van 2012/13.
  Een lezer voor de Engelse pagina's van deze seizoenen vraagt dus een nieuw besluit van de projecteigenaar.

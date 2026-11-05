# Onderzoek: alle spelers sinds 1 juli 1990

Dit is het antwoord op issue #676.
De vraag: hoe krijgen we de namen van alle spelers die sinds 1 juli 1990 in de selectie van het eerste mannenelftal van sc Heerenveen zaten?
Het hoort bij #414 (seizoenen terug tot 1990/91) en bij de pagina Spelers (#493).
We tellen de hele selectie van een seizoen, ook wie niet speelde (besluit van 3 november 2026).

De proef is gedaan op 3 november 2026.
Er is niets opgeslagen in de database en er is geen code van de importer veranderd.

## Het korte antwoord

- **Wat er is:** voor 25 van de 36 seizoenen (1990/91 tot en met 2025/26) heeft de Nederlandse Wikipedia een pagina met namen.
  Voor 5 van de andere 11 seizoenen heeft de Engelse Wikipedia er een: 2018/19 tot en met 2021/22 en 2024/25.
  Voor 6 seizoenen is er op beide geen pagina: 2000/01 tot en met 2004/05 en 2025/26.
- **Hoeveel namen:** de proef vindt 443 verschillende namen op de Nederlandse pagina's, 470 met de Engelse erbij en 515 met Wikidata erbij.
  Een eerste versie haalt dus ruim 450 namen binnen.
- **Hoe compleet:** een tabel met (bijna) de hele selectie staat op 10 seizoenen: 2005/06, 2008/09, 2009/10, 2013/14 tot en met 2017/18, 2022/23 en 2023/24.
  De pagina's van 1990/91 tot en met 1999/00 noemen wie speelde.
  De andere seizoenen hebben een deel van de selectie, uit transfers en doelpunten.
- **Het datamodel:** houd voor de eerste versie `players` als een rij per speler en seizoen (keuze a).
  De projecteigenaar koos dit op 5 november 2026; het besluit _Een rij in `players` blijft een speler in een seizoen, met een bron en soms zonder positie_ in `docs/beslissingen/hosting-en-data.md` legt het vast (#738).
  Een tabel per persoon (keuze b) is later toe te voegen zonder die rijen te veranderen.
  Het besluit _Een speler is een persoon met een eigen `id`, en elke titel van zijn artikel hoort erbij_ (4 november 2026, #714, in `docs/beslissingen/hosting-en-data.md`) haalt keuze b naar voren, naast `players`.
- **De opdeling:** 7 pull requests, drie kleine, drie middelgrote en één grote.
  De import van alle namen kost ongeveer 35 verzoeken aan Wikipedia, eenmalig.
- **Wat de projecteigenaar moet kiezen:** de Engelse Wikipedia ook voor selecties, wat we met Wikidata doen (de `robots.txt` van Wikidata weert ons) en het datamodel.
  De open vragen staan onderaan.

## De proef

### Wat is gedaan

De proef haalde de pagina's op met de fetcher van de importer (`createFetcher` in `apps/importer/src/fetcher.ts`), met alleen `/wiki/<titel>?action=raw`.
Er zat 1,2 seconde tussen twee verzoeken, er gingen er nooit twee tegelijk, en elk antwoord is op de eigen computer bewaard, zodat niets twee keer is opgehaald.
Het waren 236 verzoeken aan de Nederlandse en Engelse Wikipedia, plus een paar verzoeken om `robots.txt`.
Een wegwerpscript buiten de repository telde de namen.
De oude fansite-database is niet gebruikt.

Wikidata kreeg één verzoek, en dat liep niet via de fetcher.
De `robots.txt` van Wikidata verbiedt `/w/` (de API), `/wiki/Special:` en bij het querysysteem `/sparql` voor elke agent, dus de fetcher weigert die adressen.
De proef stuurde daarom één SPARQL-verzoek met onze User-Agent, buiten de fetcher om.
Dat valt niet binnen het besluit _Een herkenbare fetcher die zich aan robots.txt houdt_.
Of Wikidata in de importer mag, beslist de projecteigenaar (zie _De open vragen_).

### Zo herhaal je de proef

1. Maak per seizoen de titels `Sc Heerenveen in het seizoen JJJJ/JJ (mannen)` en, voor de seizoenen tot en met 2006/07, `Sc Heerenveen in het seizoen JJJJ/JJ`.
   Haal ze op als `https://nl.wikipedia.org/wiki/<titel>?action=raw`.
   Een antwoord van 404 betekent dat de pagina niet bestaat.
   Een antwoord dat met `{{dpintro}}` begint, is een doorverwijspagina en telt als geen pagina.
2. Haal de Engelse pagina op als `https://en.wikipedia.org/wiki/JJJJ–JJ_SC_Heerenveen_season?action=raw` (met een lange streep).
3. Haal de wedstrijdpagina's van het seizoen op met de titels van `pageCandidates` in `apps/importer/src/read-wikipedia.ts`, en lees ze met `readLeague` en `readCup`.
   De doelpuntenmakers van sc Heerenveen zijn de doelpunten met `ours !== ownGoal`.
4. Haal `Lijst van spelers van sc Heerenveen (mannen)` op.
5. Tel de namen uit de pagina van het seizoen (zie de regels hieronder).
6. Vraag Wikidata één keer om alle personen met een uitspraak "lid van sportteam" (P54) voor sc Heerenveen, met begin (P580) en einde (P582):

```sparql
SELECT ?p ?pLabel ?start ?end ?nlTitle ?enTitle ?birth WHERE {
  ?clubArt schema:about ?club ; schema:isPartOf <https://nl.wikipedia.org/> ; schema:name "Sc Heerenveen"@nl .
  ?p p:P54 ?st . ?st ps:P54 ?club .
  OPTIONAL { ?st pq:P580 ?start } OPTIONAL { ?st pq:P582 ?end }
  OPTIONAL { ?p wdt:P569 ?birth }
  OPTIONAL { ?nl schema:about ?p ; schema:isPartOf <https://nl.wikipedia.org/> ; schema:name ?nlTitle }
  OPTIONAL { ?en schema:about ?p ; schema:isPartOf <https://en.wikipedia.org/> ; schema:name ?enTitle }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "nl,en". }
}
```

De regels voor het tellen:

- **Selectie:** de tekst onder de kop "Selectie", "Spelers" of "Voorlopige selectie", zonder de kop "Staf".
- **Statistieken:** de tekst onder een kop die met "Statistieken" begint, of onder "Aantal wedstrijden/doelpunten".
- **Transfers:** de tekst onder "Transfers" of "Mutaties", met aangetrokken, vertrokken en verhuur.
- **Een naam:** de link in een cel met een rugnummer ervoor, of in de cel na een cel met alleen een nummer.
  Anders telt de eerste link van een tabelrij of van een lijstregel.
  De naam is de titel van de pagina waar de link naartoe gaat.
- **Gelijk:** twee titels zijn dezelfde naam als ze zonder accenten, hoofdletters, streepjes, spaties en apostrofs gelijk zijn.
  Dat is `nameKey` uit `apps/importer/src/read-squad.ts`, gevolgd door het weglaten van streepjes, spaties en apostrofs.
- **Ruis:** de proef filtert geen clubs of landen.
  In vier gecontroleerde seizoenen (1996/97, 2008/09, 2017/18 en 2023/24) sluipen er nul tot twee in, zoals "FC Dordrecht", "UEFA Cup 2008/09", "Cyprus" en "Nederland".
- **Op de Lijst:** de naam staat op de Lijst van spelers.
- **Wikidata:** een seizoen JJJJ/JJ telt mee als een periode begint in of voor JJJJ+1 en eindigt in of na JJJJ.
  De data zijn alleen op het jaar nauwkeurig, dus dit is een bovengrens.

## 1. Welke bronnen hebben de namen en de data?

### De bronnen

| Bron                                                    | Wat erin staat                                                                | Data               | Hoe compleet                                                              |
| ------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------- |
| Pagina van het seizoen op de Nederlandse Wikipedia      | Tabellen en lijsten met spelers, in verschillende vormen (zie hieronder)      | Per seizoen        | 25 van 36 seizoenen, wisselend van een deel tot de hele selectie          |
| Wedstrijdpagina's van het seizoen (Eredivisie en beker) | De doelpuntenmakers van sc Heerenveen                                         | Per seizoen        | Alleen scorers, 11 tot 18 per seizoen vanaf 2010/11 en bijna niets eerder |
| Lijst van spelers van sc Heerenveen (mannen)            | 636 namen van spelers met minstens één officiële wedstrijd, ook van voor 1990 | Geen               | Geen seizoenen, dus alleen te gebruiken om een naam te toetsen            |
| Engelse Wikipedia, pagina van het seizoen               | Een selectie (`Squad`) of de transfers                                        | Per seizoen        | 8 seizoenen: 2009/10 en 2018/19 tot en met 2024/25                        |
| Wikidata, "lid van sportteam" bij sc Heerenveen         | 345 personen, met begin en einde waar bekend, 328 met een Nederlandse pagina  | Alleen op het jaar | Voor 2005/06 tot en met 2016/17 goed, daarna minder                       |
| De pagina van een speler                                | De clubs in het kader, met de jaren in een aparte lijst                       | Per speler         | Eén verzoek per speler, en de vorm wisselt                                |

De Lijst van spelers noemt 637 regels, waarvan 636 met een link.
Hij noemt ook "noemenswaardige spelers van voor 1955", dus de Lijst zelf zegt niets over 1990.
De proef plaatste de namen van de Lijst met de seizoenspagina's en met Wikidata: 387 van de 636 zijn zo in een seizoen sinds 1990/91 gevonden, de andere 249 niet.

De pagina van een speler is bekeken op een steekproef van 10 spelers.
Negen pagina's hadden een kader met een lijst van clubs, en de jaren stonden daar in een aparte lijst.
De tiende titel bestond niet.
Dit is te duur en te wisselend voor een eerste versie: bij 636 spelers zijn dat 636 verzoeken, en elke vorm moet een eigen lezer krijgen.

### De pagina van een seizoen per tijdperk

De pagina's verschillen sterk.
Per tijdperk staat hieronder wat erin zit.
De cijfers zijn het aantal verschillende namen dat de proef uit die bron haalde.

**Tijdperk A: 1990/91 tot en met 1999/00 (10 seizoenen)**

| Bron                                       | Seizoenen        | Aantal namen | Wat ontbreekt                                         |
| ------------------------------------------ | ---------------- | ------------ | ----------------------------------------------------- |
| Pagina zonder toevoeging, kop Statistieken | alle 10          | 22 tot 33    | Spelers zonder wedstrijd, positie, rugnummer, staf    |
| Doelpuntenmakers op de wedstrijdpagina's   | 1996/97, 1999/00 | 1 en 4       | Bijna alles: de pagina's hebben de oude vorm nog niet |
| Wikidata (bovengrens)                      | alle 10          | 18 tot 39    | Dagen: begin en einde zijn alleen een jaar            |

De pagina heet `Sc Heerenveen in het seizoen 1995/96`, zonder "(mannen)".
De tabel "Aantal wedstrijden/doelpunten" heeft per speler een link, het aantal wedstrijden en de doelpunten.
Het lijkt een lijst van wie minstens één wedstrijd speelde.
De tabel van 1995/96 loopt door tot spelers met 1 wedstrijd, en spelers met 0 zijn niet gezien.

**Tijdperk B: 2000/01 tot en met 2004/05 (5 seizoenen)**

| Bron                  | Seizoenen | Aantal namen | Wat ontbreekt                                      |
| --------------------- | --------- | ------------ | -------------------------------------------------- |
| Nederlandse Wikipedia | geen      | 0            | De pagina bestaat niet, ook niet zonder "(mannen)" |
| Engelse Wikipedia     | geen      | 0            | De pagina bestaat niet                             |
| Wikidata (bovengrens) | alle 5    | 38 tot 57    | Alleen op het jaar, en een bovengrens              |

Dit is een gat.
Alleen Wikidata kent de periode, en de Lijst heeft de namen zonder jaren.
36 van de 45 personen die alleen Wikidata kent, horen bij deze vijf seizoenen.

**Tijdperk C: 2005/06 en 2006/07 (2 seizoenen)**

| Bron                                        | Seizoenen | Aantal namen | Wat ontbreekt                                                |
| ------------------------------------------- | --------- | ------------ | ------------------------------------------------------------ |
| Tabel Statistieken (met een rij per speler) | 2005/06   | 32           | Waarschijnlijk niets: de tabel heeft ook spelers met 0 duels |
| Transfers                                   | 2006/07   | 28           | Wie bleef staan: alleen aangetrokken en vertrokken spelers   |
| Doelpuntenmakers op de seizoenspagina       | 2006/07   | 12           | Spelers die niet scoorden                                    |

De pagina van 2005/06 heeft de hele selectie, met positiekoppen als "Doelverdediger" en "Middenvelder".
De pagina van 2006/07 heeft geen selectie of statistiektabel.

**Tijdperk D: 2007/08 tot en met 2017/18 (11 seizoenen)**

| Bron                        | Seizoenen                                    | Aantal namen | Wat ontbreekt                                 |
| --------------------------- | -------------------------------------------- | ------------ | --------------------------------------------- |
| Voorlopige selectie (lijst) | 2007/08                                      | 22           | Spelers die later kwamen                      |
| Selectie (tabel)            | 2008/09, 2009/10, 2013/14 tot en met 2017/18 | 19 tot 31    | 2010/11, 2011/12 en 2012/13 hebben geen tabel |
| Transfers                   | alle 11                                      | 21 tot 46    | Spelers die bleven zonder transfer            |
| Statistieken                | 2008/09                                      | 30           | De andere tien seizoenen                      |
| Doelpuntenmakers            | 2010/11 tot en met 2017/18                   | 11 tot 15    | Spelers die niet scoorden                     |

De "Selectie" staat in drie vormen: een lijst met vlag en contract (2007/08), een brede tabel met twee spelers per regel (2008/09 en 2009/10) en een tabel met rugnummer, naam en geboortedatum (2013/14 en later).
In 2016/17 noemt de tabel Statistieken de spelers alleen met de achternaam en zonder link, zoals "v. Amersfoort" en "St. Juste".
In 2017/18 zijn die tabellen leeg.
Voor 2010/11 tot en met 2012/13 geven alleen de lijst met transfers en de doelpunten namen.

**Tijdperk E: 2018/19 tot en met 2021/22, 2024/25 en 2025/26 (6 seizoenen)**

| Bron                              | Seizoenen                           | Aantal namen | Wat ontbreekt                                                                  |
| --------------------------------- | ----------------------------------- | ------------ | ------------------------------------------------------------------------------ |
| Nederlandse Wikipedia, "(mannen)" | geen                                | 0            | De titel met "(mannen)" bestaat niet, de titel zonder is een doorverwijspagina |
| Engelse Wikipedia                 | 2018/19 tot en met 2021/22, 2024/25 | 21 tot 34    | 2025/26 heeft geen Engelse pagina                                              |
| Doelpuntenmakers                  | alle 6                              | 13 tot 18    | Spelers die niet scoorden                                                      |
| Wikidata (bovengrens)             | alle 6                              | 35 tot 44    | Van de Nederlandse namen heeft maar een deel er een uitspraak                  |

De pagina's van 2018/19 tot en met 2021/22 en van 2024/25 en 2025/26 met "(mannen)" bestaan niet op de Nederlandse Wikipedia.
Dat is het gat dat #414 al noemde.
Zodra een vrijwilliger de pagina schrijft, leest de importer hem (besluit van 29 oktober 2026).

**Tijdperk F: 2022/23 en 2023/24 (2 seizoenen), en het lopende seizoen**

| Bron                                    | Seizoenen        | Aantal namen | Wat ontbreekt                                                          |
| --------------------------------------- | ---------------- | ------------ | ---------------------------------------------------------------------- |
| Tabel Spelers (de lezer van nu)         | 2023/24          | 29           | 2022/23 geeft een fout (zie hieronder)                                 |
| Tabel Spelers (de telling van de proef) | 2022/23          | 22           | Niets bekend                                                           |
| Engelse Wikipedia                       | 2022/23, 2023/24 | 22 en 38     | 2023/24 telt de selectie en de transfers samen                         |
| Lopend seizoen 2026/27                  | 2026/27          | 25           | Niets: de lezer van nu leest ze allemaal, met een pagina bij elke naam |

`readSquad` geeft voor 2022/23 een fout.
De pagina heeft de kop "Keepers" en cellen met een attribuut zonder aanhalingstekens, zoals `align=left|Xavier Mous`.
`readSquad` kent alleen "Doelmannen" en attributen met aanhalingstekens.
Dat zijn kleine aanpassingen in de lezer, en ze horen bij elk plan voor de selectie van een eerder seizoen.

### De aantallen per seizoen

De tabel toont het aantal verschillende namen per seizoen en per bron.
Een streepje betekent dat de bron er voor dat seizoen niet is of niets opleverde.
"nl samen" is de som van de Nederlandse bronnen zonder dubbelen, tussen haakjes het aantal dat ook op de Lijst van spelers staat.
Wikidata geeft een bovengrens, tussen haakjes het aantal dat de Nederlandse en Engelse bronnen niet hebben.

| Seizoen | nl-pagina | Selectie | Statistieken | Transfers | Doelpunten | nl samen (op de Lijst) | Engelse pagina | Wikidata (nieuw) |
| ------- | --------- | -------- | ------------ | --------- | ---------- | ---------------------- | -------------- | ---------------- |
| 1990/91 | ja        | –        | 24           | –         | –          | 24 (22)                | nee            | 18 (5)           |
| 1991/92 | ja        | –        | 22           | –         | –          | 22 (22)                | nee            | 22 (9)           |
| 1992/93 | ja        | –        | 24           | –         | –          | 24 (22)                | nee            | 22 (11)          |
| 1993/94 | ja        | –        | 23           | –         | –          | 23 (23)                | nee            | 21 (8)           |
| 1994/95 | ja        | –        | 29           | –         | –          | 29 (28)                | nee            | 23 (8)           |
| 1995/96 | ja        | –        | 31           | –         | –          | 31 (29)                | nee            | 24 (8)           |
| 1996/97 | ja        | –        | 33           | –         | 1          | 33 (30)                | nee            | 29 (18)          |
| 1997/98 | ja        | –        | 32           | –         | –          | 32 (28)                | nee            | 31 (14)          |
| 1998/99 | ja        | –        | 28           | –         | –          | 28 (24)                | nee            | 32 (15)          |
| 1999/00 | ja        | –        | 28           | –         | 4          | 28 (26)                | nee            | 39 (21)          |
| 2000/01 | nee       | –        | –            | –         | –          | 0 (0)                  | nee            | 38 (38)          |
| 2001/02 | nee       | –        | –            | –         | –          | 0 (0)                  | nee            | 44 (44)          |
| 2002/03 | nee       | –        | –            | –         | –          | 0 (0)                  | nee            | 48 (48)          |
| 2003/04 | nee       | –        | –            | –         | –          | 0 (0)                  | nee            | 54 (54)          |
| 2004/05 | nee       | –        | –            | –         | –          | 0 (0)                  | nee            | 57 (57)          |
| 2005/06 | ja        | –        | 32           | –         | –          | 32 (27)                | nee            | 61 (32)          |
| 2006/07 | ja        | –        | –            | 28        | 12         | 36 (27)                | nee            | 64 (34)          |
| 2007/08 | ja        | 22       | –            | 33        | –          | 46 (39)                | nee            | 68 (27)          |
| 2008/09 | ja        | 19       | 30           | 46        | –          | 67 (51)                | nee            | 76 (21)          |
| 2009/10 | ja        | 26       | –            | 29        | –          | 49 (41)                | 35             | 73 (19)          |
| 2010/11 | ja        | –        | –            | 42        | 12         | 51 (36)                | nee            | 69 (28)          |
| 2011/12 | ja        | –        | –            | 28        | 11         | 35 (27)                | nee            | 68 (38)          |
| 2012/13 | ja        | –        | –            | 35        | 11         | 40 (34)                | nee            | 67 (32)          |
| 2013/14 | ja        | 23       | –            | 31        | 15         | 51 (41)                | nee            | 62 (19)          |
| 2014/15 | ja        | 30       | –            | 37        | 13         | 55 (42)                | nee            | 64 (18)          |
| 2015/16 | ja        | 29       | –            | 25        | 12         | 44 (32)                | nee            | 47 (12)          |
| 2016/17 | ja        | 31       | –            | 21        | 13         | 45 (34)                | nee            | 39 (12)          |
| 2017/18 | ja        | 30       | –            | 33        | 15         | 55 (40)                | nee            | 39 (17)          |
| 2018/19 | nee       | –        | –            | –         | 13         | 13 (13)                | 31             | 43 (36)          |
| 2019/20 | nee       | –        | –            | –         | 13         | 13 (13)                | 21             | 44 (36)          |
| 2020/21 | nee       | –        | –            | –         | 14         | 14 (14)                | 28             | 42 (34)          |
| 2021/22 | nee       | –        | –            | –         | 14         | 14 (13)                | 29             | 38 (30)          |
| 2022/23 | ja        | 22       | –            | –         | 15         | 25 (22)                | 22             | 34 (29)          |
| 2023/24 | ja        | 29       | 18           | 21        | 15         | 42 (36)                | 38             | 33 (27)          |
| 2024/25 | nee       | –        | –            | –         | 16         | 16 (15)                | 34             | 35 (29)          |
| 2025/26 | nee       | –        | –            | –         | 18         | 18 (18)                | nee            | 35 (32)          |

De Engelse cijfers zijn de selectie en de transfers samen, dus hoger dan alleen de selectie.
De som van de kolom "nl samen" is 1035 regels, en dezelfde namen komen over meer seizoenen terug.

### De totalen

| Telling                                                              | Aantal |
| -------------------------------------------------------------------- | ------ |
| Verschillende namen op de Nederlandse pagina's                       | 443    |
| Daarbij de Engelse pagina's                                          | 470    |
| Daarbij de personen die alleen Wikidata kent (bovengrens)            | 515    |
| Waarvan alleen te vinden voor 2000/01 tot en met 2004/05             | 36     |
| Op de Lijst van spelers, maar in geen seizoen sinds 1990/91 gevonden | 249    |

De 515 is een schatting.
De proef telt alleen namen met een link.
Een speler zonder pagina staat op de pagina van een seizoen vaak zonder link, en een speler zonder wedstrijd staat er soms helemaal niet op.
Het echte aantal ligt dus hoger, en hoeveel hoger is niet te meten zonder een tweede, volledige bron.

### Waar de bronnen elkaar tegenspreken

- **Jaren:** van de 343 begindata in Wikidata vallen er 325 op 1 januari.
  Wikidata kent dus het jaar, niet het seizoen.
  Een speler met begin 2008 kan in 2007/08 of 2008/09 zijn gekomen.
- **Wikidata mist spelers:** van de namen op de Nederlandse pagina's van 2005/06 tot en met 2016/17 heeft ongeveer 80 tot 90 procent een uitspraak, in 2017/18 58 procent.
  Voor 2018/19 tot en met 2025/26 zijn dat er 3 tot 9 per seizoen.
- **Nederlands tegen Wikidata:** 31 keer staat een speler op de pagina van een seizoen, terwijl Wikidata een andere periode geeft.
  Marco Roelofsen staat in 1996/97 in de statistieken, en Wikidata laat zijn periode in 1996 eindigen (dat kan een afronding zijn).
  Doke Schmidt staat in de selectie van 2014/15 tot en met 2017/18, terwijl Wikidata zijn periode in 2013 laat eindigen.
  De proef zoekt niet uit wie gelijk heeft.
- **Nederlands tegen Engels:** in 2023/24 staan alle 38 Engelse namen ook in de Nederlandse bronnen.
  De Nederlandse bronnen hebben er twee meer die een speler zijn, "Roan van der Plaat" en "Oliver Braude".
- **Positie en nummer:** alleen de tabel van 2005/06 en de selectietabellen (2008/09, 2009/10, 2013/14 en later) geven een positie of een rugnummer.
  De lijsten van transfers en doelpunten geven alleen een naam.

## 2. Wat mogen we gebruiken?

De regels staan in het hoofdstuk [Redactie](https://ds.heerenveen.org/?path=/docs/redactie--documentatie) van Storybook: bron vermelden, geen verzoeken aan derden, en alleen wat de bron toestaat.
De besluiten _De selectie komt van de Nederlandse Wikipedia, zoals de wedstrijden_ (26 oktober 2026) en _Seizoenen en selecties komen van de Nederlandse Wikipedia, ook als een seizoen een gat heeft_ (29 oktober 2026) leggen de bron en de licentie vast.

| Bron                                     | Mag het?                            | Waarom                                                                                                                                                                                            |
| ---------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nederlandse Wikipedia, seizoenspagina's  | Ja                                  | CC BY-SA 4.0, al in gebruik voor de selectie en de wedstrijden, met bronvermelding per pagina.                                                                                                    |
| Nederlandse Wikipedia, Lijst van spelers | Ja, maar alleen om namen te toetsen | Dezelfde licentie. Hij heeft geen seizoenen, dus hij vult geen seizoen.                                                                                                                           |
| Engelse Wikipedia                        | Alleen na een besluit               | Dezelfde licentie (CC BY-SA 4.0). Het besluit van 3 november 2026 staat de Engelse Wikipedia alleen toe voor de Europa League-wedstrijden van 2012/13. Voor selecties is een nieuw besluit nodig. |
| Wikidata                                 | Niet nu                             | De gegevens zijn CC0, maar de `robots.txt` weert ons op `/w/`, `/wiki/Special:` en `/sparql`. Het besluit van 22 oktober 2026 zegt dat we niets nemen wat een bron ons niet wil geven.            |
| Pagina's van spelers                     | Ja, maar niet nu                    | Dezelfde licentie als de rest van de Nederlandse Wikipedia. Het is te duur voor een eerste versie (zie boven).                                                                                    |
| Transfermarkt en andere databanken       | Nee                                 | Besluit van 29 oktober 2026: de rechten zijn onduidelijk en de bron past niet bij het bronbeleid.                                                                                                 |
| Site van de club                         | Nee                                 | Geen toestemming (besluit van 26 oktober 2026).                                                                                                                                                   |

Een naam is een feit en geen werk van een journalist, dus de regel "alleen kop, link en bronnaam" van het hoofdstuk Redactie geldt hier niet.
De bronvermelding van de site noemt per seizoen de pagina's waar de gegevens vandaan komen.
Bij 36 seizoenen worden dat er veel, want elk seizoen heeft tot vijf pagina's.
Het besluit over de lijst met clubs noemt dat al als nadeel (_Tegenstanders is een lijst van alle clubs en een pagina per club, onder Statistieken_ in `site.md`).
Hoe de site het toont, beslist de pull request die de namen toont.

### De oude fansite-database

De oude fansite had een database van 1989/90 tot 2006/07 met wedstrijden en spelers.
Zij zou het gat van 2000/01 tot 2004/05 kunnen dichten, en ook de spelers zonder wedstrijd of zonder pagina in de jaren tot 2006/07.
Dit onderzoek heeft haar niet gelezen en gebruikt haar niet voor het voorstel, want de rechten zijn onduidelijk (zie #414).

## 3. Hoe komt een naam in `players` en bij de doelpunten?

### Wat er nu is

`players` heeft een rij per speler en seizoen, met `name`, `position` (verplicht; sinds #738 mag hij leeg zijn en is er een `source`), `shirt_number`, `search_term` (verplicht), `wikipedia_page`, `in_squad` en `left_squad_at`.
Een rij is uniek op seizoen en naam, en op seizoen en pagina.
`match_goals.player_id` verwijst naar `players.id` (`ON DELETE SET NULL`) en `player_season_stats.player_id` ook (`ON DELETE CASCADE`).
`listSquad(db, season)` toont alleen de spelers van het gevraagde seizoen die `in_squad` zijn.

### De keuze: (a) een rij per speler en seizoen houden

**Aanbeveling:** kies (a) voor de eerste versie en voeg (b) later toe als de pagina Spelers (#493) een speler over seizoenen wil laten zien.

Waarom (a):

- De doelpunten van een eerder seizoen worden per seizoen gekoppeld.
  `playerLinker` krijgt de spelers van één seizoen, en de drie regels (pagina, volledige naam, achternaam) werken zoals nu.
- De proef levert ongeveer 1035 regels op, over alle seizoenen en alleen uit de Nederlandse bronnen.
  Eén rij per speler en seizoen is dus 1000 tot 2000 rijen, wat een kleine tabel is.
- Voor (b) moet de importer eerst bepalen of twee titels één persoon zijn.
  De proef vond 11 paren titels die alleen in accenten, hoofdletters of streepjes verschillen, en de Nederlandse en Engelse titel van één speler verschillen ook (zie hoofdstuk 4).
  Dat is werk dat (a) niet nodig heeft.
- (b) is later toe te voegen zonder de rijen van (a) te veranderen.

De migraties die (a) nodig heeft:

1. `players.position` wordt optioneel (`NULL`).
   Een speler uit een lijst van transfers of doelpunten heeft geen positie.
   De lezer van nu vult hem altijd, en `listSquad` toont alleen de spelers van het lopende seizoen.
2. Een nieuwe kolom `source` zegt waar een rij vandaan komt: `selectie`, `statistieken`, `transfers`, `doelpunten` of `engels`.
   Zo kan de site later zeggen dat een lijst "alleen wie speelde" is.
3. De unieke sleutel op seizoen en naam blijft.
   De proef vond geen twee spelers met dezelfde naam in één seizoen, behalve dezelfde persoon met een Nederlandse en een Engelse titel.

De migratie voor (b), voor later:

- Een tabel `persons` met `id`, `name`, `search_term`, `wikipedia_page` (uniek), `first_season` en `last_season`.
- Een kolom `players.person_id`, gevuld door de pagina te vergelijken en anders de naam zonder accenten.
- `match_goals` en `player_season_stats` blijven naar `players` wijzen.
  Een pagina van een speler telt de rijen van één persoon.

### Wat het betekent voor de rest

| Onderdeel             | (a) rij per speler en seizoen                                                           | (b) tabel per persoon                                               |
| --------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `match_goals`         | `player_id` wijst naar de rij van het seizoen van de wedstrijd. Geen wijziging.         | Idem, plus een weg van `player_id` naar de persoon.                 |
| `link-players.ts`     | Geen wijziging. Hij krijgt de spelers van het seizoen van de wedstrijd.                 | Dezelfde regels, maar over de personen die in dat seizoen speelden. |
| `player-name.ts`      | Geen wijziging. De titel-fallback blijft voor doelpunten zonder rij, zoals in de gaten. | Idem.                                                               |
| Pagina Spelers (#493) | Vraagt het lopende seizoen. Rijen van eerdere seizoenen komen er niet in.               | Kan een speler over seizoenen tonen. Dat is de reden voor (b).      |
| `player_season_stats` | Alleen voor seizoenen met een tabel met cijfers (nu 2023/24 en 2026/27).                | Idem.                                                               |

`link-players.ts` koppelt een doelpunt van een eerder seizoen pas als de spelers van dat seizoen er zijn.
Na de import van de namen moet `import:season <seizoen>` dus nog een keer lopen, zodat de doelpunten hun `player_id` krijgen.
Dat staat al in het besluit _De Wikipedia-pagina van een speler is de sleutel, de naam is de reserve_: een doelpunt krijgt zijn speler bij een latere lezing.

Een doelpunt zonder rij in `players` blijft de titel van de pagina van de speler tonen als volledige naam, en anders de korte naam van de wedstrijdpagina.
Dat geldt voor de gaten en voor spelers zonder pagina.

De cijfers van een speler (`player_season_stats`) staan in de oude tabellen in twee andere vormen: aantal wedstrijden en doelpunten in 1990/91 tot en met 1999/00, en wedstrijden en doelpunten per competitie in 2005/06.
Een lezer daarvoor is te doen, maar het is geen deel van de eerste versie.

## 4. Spelling en dubbele namen

### De regels

- **De sleutel:** de titel van de pagina van de speler, zoals `wikipedia_page` nu is.
  Een naam zonder pagina heeft de naam zelf als sleutel.
- **Gelijk:** twee namen zijn dezelfde speler als ze zonder accenten, hoofdletters, streepjes, spaties en apostrofs gelijk zijn.
  `nameKey` doet de accenten en de hoofdletters al.
  Een tweede sleutel haalt streepjes, spaties en apostrofs weg.
  `nameKey` zelf blijft zoals hij is, want regel 3 van `playerLinker` zoekt op een spatie voor de achternaam.
- **De volgorde bij het koppelen van een doelpunt:** eerst de pagina, dan de volledige naam, dan een achternaam die één speler heeft.
  Dat is de volgorde van `playerLinker` nu, en zij verandert niet.
- **Bij twijfel:** twee spelers met dezelfde achternaam in één seizoen, of een naam die in geen rij past, krijgen geen `player_id`.
  Een doelpunt blijft dan zonder speler, zoals nu.
- **Dezelfde persoon, een andere titel:** de importer voegt ze niet samen.
  Elk seizoen heeft een eigen rij, dus bij (a) is dat geen probleem.
  Bij (b) beslist een lijst met correcties in de importer.

### Drie voorbeelden uit de proef

1. **Dezelfde speler, een andere schrijfwijze van de titel.**
   De proef vond 11 paren titels die alleen in een teken verschillen, zoals "Ugur Yıldırım" en "Uğur Yıldırım", "Calvin Jong-A-Pin" en "Calvin Jong-a-Pin", en "Youssef El-Akchaoui" en "Youssef El Akchaoui".
   `nameKey` voegt negen van de elf samen (accent en hoofdletter).
   "Youssef El-Akchaoui" en "Ali El Khattabi" met "Ali Elkhattabi" verschillen in een streepje of een spatie, en vragen de uitbreiding hierboven.
   Een paar als "Jurjan Wouda" (2010/11) en "Jurjen Wouda" (2013/14) verschilt in een letter, en geen sleutel voegt ze samen.
   Het is waarschijnlijk dezelfde speler.
2. **Twee spelers met dezelfde naam.**
   De Lijst heeft "Johnny Jansen (1952)" en "Johnny Jansen (1975)": twee spelers, onderscheiden door het jaar in de titel.
   Alleen de speler van 1975 speelde in 1995/96.
   De sleutel is de pagina, dus ze raken niet in de war.
   Ze delen in de proef geen seizoen.
   Van de 636 titels op de Lijst hebben 36 zo'n toevoeging.
3. **Dezelfde speler, een andere titel op de Nederlandse en de Engelse Wikipedia.**
   Wikidata heeft één item voor Charlie Webster (2023/24), met de Nederlandse titel "Charlie Webster" en de Engelse "Charlie Webster (footballer)".
   Alleen via zo'n koppeling zijn het één naam, en zonder Wikidata zijn het er twee.
   Daarom raden we de Engelse bron alleen aan voor seizoenen zonder Nederlandse pagina, zodat een speler binnen een seizoen maar één bron heeft.

### Een speler in meer dan één periode

Wikidata kent Gerald Sibon in drie periodes bij sc Heerenveen: 2002 tot 2004, 2007 tot 2010 en 2011 tot 2012.
Bij (a) krijgt hij een rij in elk seizoen waarin hij in de bron staat, met dezelfde pagina als sleutel.
Bij (b) is het één persoon met drie periodes.
Een speler die terugkeert van verhuur, zoals Milan Kopic in 2010/11 ("Keert terug van verhuur"), staat in de lijst van transfers en telt als aanwezig.

### Een speler zonder pagina

In de selecties van 2026/27 en 2023/24 heeft elke speler een pagina.
Op oudere pagina's staan spelers zonder link.
De statistieken van 2016/17 noemen alleen achternamen, zoals "v. Amersfoort" en "St. Juste".
De transfers van 2023/24 op de Engelse Wikipedia noemen "David Easmon" en "Ilyas el Moussaoui" zonder link.
Zo'n naam geeft in de proef geen rij, want de proef telt alleen namen met een link.
Dat is de belangrijkste reden dat de echte aantallen hoger liggen dan de tellingen hierboven.
De eerste versie slaat een naam zonder link wel op als de bron er een volledige naam bij geeft.
Een achternaam alleen geeft geen rij, maar `playerLinker` koppelt een doelpunt via regel 3 aan een speler met die achternaam als de selectie hem heeft.
Een speler zonder pagina en zonder rij houdt de achternaam als naam, zoals nu in `player-name.ts`.

## 5. Wat kost een eerste versie?

### Wat de eerste versie doet

De eerste versie leest de pagina's van de Nederlandse Wikipedia voor de 25 seizoenen die er een hebben, en noemt de 11 anderen als gat.
Daarna volgen de Engelse pagina's, als de projecteigenaar het toestaat, voor 5 van die gaten.
Wat blijft: 2000/01 tot en met 2004/05 en 2025/26.

Een seizoen zonder pagina krijgt geen rij.
De import schrijft dan een regel in het logboek zoals bij #414: "geen selectie voor dit seizoen".
Een lezer die niets leest of een kop niet kent, geeft een fout en schrijft niets, zoals `readSquad` nu doet.

### Verzoeken aan Wikipedia

Een import van alle namen doet eenmalig ongeveer 35 verzoeken:

- 25 pagina's van de Nederlandse Wikipedia;
- 5 pagina's van de Engelse Wikipedia, als dat mag;
- 1 voor de Lijst van spelers, om namen te toetsen;
- een paar voor `robots.txt`.

De wedstrijdpagina's voor de doelpuntenmakers zijn die van #414 en tellen hier niet mee.
Dit is eenmalig, niet elk uur: een eerder seizoen verandert niet meer (zie _Een eerder seizoen wordt eenmalig geïmporteerd met een opdracht, zonder selectie_).

### Het voorstel voor vervolgissues

De volgorde is die van samenvoegen.
Elk issue is één pull request.
De schatting staat in klein (tot een halve dag), middel (een dag of twee) en groot (drie dagen of meer).

| Nr. | Issue                                                                                                    | Werk   | Waarom in deze volgorde                                     |
| --- | -------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------- |
| 1   | Maak `players.position` optioneel en voeg `players.source` toe (migratie, schema, tests, beslissing)     | Klein  | Alle lezers hierna hebben het nodig.                        |
| 2   | Laat `readSquad` ook de kop "Keepers" kennen en leg de koppen in één lijst vast                          | Klein  | 2022/23 mislukt er nu op, en #414 heeft er last van.        |
| 3   | Lees de tabel Statistieken van 1990/91 tot en met 2005/06 (twee vormen, 11 seizoenen), met tests         | Middel | Het zijn de eenvoudigste en meest complete tabellen.        |
| 4   | Lees de selecties en transfers van 2006/07 tot en met 2017/18 (vier vormen, 12 seizoenen), met tests     | Groot  | De meeste vormen, en de meeste ruis.                        |
| 5   | Lees de Engelse pagina van een seizoen voor 2018/19 tot en met 2021/22 en 2024/25 (alleen na besluit)    | Middel | Nieuwe bron en nieuwe lezer, daarom na de Nederlandse.      |
| 6   | Voeg de opdracht `import:squads <seizoen>` en de workflow toe, met het gat in het logboek                | Middel | Zet de lezers aan elkaar, op de manier van `import:season`. |
| 7   | Koppel na de import de doelpunten van de eerdere seizoenen opnieuw (`import:season`) en toets het aantal | Klein  | Geeft de doelpunten hun `player_id`.                        |

Niet in de eerste versie, en alleen op verzoek:

- **(b) een tabel per persoon:** een middelgroot werk met een migratie, een vulling uit `wikipedia_page` en een lijst met correcties.
  Het kan zodra #493 een speler over seizoenen wil tonen.
- **Wikidata voor 2000/01 tot en met 2004/05:** een middelgroot werk, en alleen als de projecteigenaar een uitzondering op `robots.txt` toestaat.
  De data zijn jaren, dus het geeft 38 tot 57 namen per seizoen waarvan de periode maar op het jaar bekend is.
- **Cijfers uit de oude tabellen** (`player_season_stats` voor 1990/91 tot en met 1999/00 en 2005/06): een middelgroot werk met twee lezers.

De eerste versie is dus drie kleine, drie middelgrote en één grote pull request.
Een tabel `persons` (b) en de bron Wikidata komen daar niet bij.

## De open vragen voor de projecteigenaar

1. **Mag de Engelse Wikipedia ook voor selecties?**
   Aanbeveling: ja, voor de vijf seizoenen zonder Nederlandse pagina, met dezelfde fetcher en dezelfde regels als bij de Europa League-wedstrijden van 2012/13.
2. **Wat doen we met Wikidata?**
   Aanbeveling: nu niet gebruiken.
   De `robots.txt` weert ons, de data zijn alleen jaren, en voor 2018 en later heeft maar een deel van de spelers een uitspraak.
   Als je het gat van 2000/01 tot en met 2004/05 toch wilt vullen, dan is een uitzondering op `robots.txt` voor `query.wikidata.org` nodig, met een eigen besluit.
3. **Welk datamodel?**
   Aanbeveling: (a) voor de eerste versie en (b) later.
4. **Mag de eerste versie met gaten?**
   Aanbeveling: ja.
   Het gat van 2000/01 tot en met 2004/05 sluit pas als de oude database of Wikidata bruikbaar is, en dat is een apart besluit.
   Het gat van 2025/26 sluit zodra een vrijwilliger de pagina op Wikipedia schrijft.

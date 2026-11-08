# Oude wedstrijden: wat ontbreekt of niet klopt

Dit verslag laat zien wat de import van de wedstrijden van de oude fansite (1990 tot 2007) niet kon vullen, of niet vertrouwde.
De projecteigenaar leest het, en het issue over de aanvulling met Wikipedia (#414) gebruikt het om te zien wat daar nog bij moet.
Gemaakt op 8 november 2026, op een database met de import van de bestanden in `apps/importer/data/oude-fansite`.
Maak het opnieuw na de import met `pnpm --silent import:old-site --report > docs/oude-wedstrijden-hiaten.md`, of met de workflow _Import old site_ en de keuze `report`.
De opdracht leest de bestanden en de database en schrijft niets in de database.
Het verslag noemt alleen namen zoals ze in de wedstrijd stonden.

## Per seizoen

| Seizoen | Bestand | Database | Goals kloppen | Geen goals | Deel van goals | Opstelling | Klaar | Bezig | Scheids | Publiek | Cijfers | Alleen datum |
| ------- | ------: | -------: | ------------: | ---------: | -------------: | ---------: | ----: | ----: | ------: | ------: | ------: | -----------: |
| 1990/91 |      35 |       35 |             9 |         26 |              0 |          7 |     6 |     1 |       6 |       7 |       0 |            0 |
| 1991/92 |       6 |        6 |             5 |          1 |              0 |          1 |     1 |     0 |       1 |       1 |       0 |            2 |
| 1992/93 |      40 |       40 |            23 |         17 |              0 |         21 |    17 |     4 |      19 |      20 |       0 |            2 |
| 1993/94 |      36 |       36 |            31 |          5 |              0 |         31 |    25 |     6 |      29 |      29 |       0 |            0 |
| 1994/95 |      41 |       41 |            40 |          1 |              0 |         40 |    30 |    10 |      38 |      37 |       0 |            0 |
| 1995/96 |      44 |       44 |            37 |          7 |              0 |         37 |    31 |     6 |      37 |      38 |      34 |            0 |
| 1996/97 |      46 |       46 |            42 |          3 |              1 |         43 |    29 |    14 |      39 |      39 |      32 |            1 |
| 1997/98 |      46 |       46 |            43 |          3 |              0 |         42 |    33 |     9 |      40 |      40 |      33 |            5 |
| 1998/99 |      39 |       39 |            38 |          1 |              0 |         39 |    34 |     5 |      36 |      36 |      34 |            0 |
| 1999/00 |      40 |       40 |            39 |          0 |              1 |         40 |    35 |     5 |      39 |      39 |      33 |            2 |
| 2000/01 |      43 |       43 |            43 |          0 |              0 |         43 |    40 |     3 |      43 |      42 |      37 |            0 |
| 2001/02 |      42 |       42 |            42 |          0 |              0 |         42 |    35 |     7 |      40 |      39 |      36 |            0 |
| 2002/03 |      38 |       38 |            38 |          0 |              0 |         38 |    35 |     3 |      37 |      36 |      35 |            0 |
| 2003/04 |      44 |       44 |            44 |          0 |              0 |         44 |    38 |     6 |      43 |      42 |      34 |            0 |
| 2004/05 |      42 |       42 |            42 |          0 |              0 |         42 |    33 |     9 |      42 |      42 |      26 |            0 |
| 2005/06 |      48 |       48 |            47 |          1 |              0 |         48 |    44 |     4 |      48 |      47 |      21 |            0 |
| 2006/07 |      41 |       41 |            41 |          0 |              0 |          8 |     8 |     0 |       8 |       8 |       4 |            0 |
| Totaal  |     671 |      671 |           604 |         65 |              2 |        566 |   474 |    92 |     545 |     542 |     359 |           12 |

Bestand en Database zijn het aantal wedstrijden in de bestanden en in de database.
Goals kloppen telt de wedstrijden waarvan de doelpunten optellen tot de uitslag, ook een wedstrijd zonder doelpunten.
Geen goals en Deel van goals zijn de wedstrijden waarvan de doelpunten ontbreken of niet optellen: die krijgen geen doelpunten in de database.
Opstelling telt de wedstrijden met een opstelling in de bestanden, Klaar en Bezig de verslagen van die wedstrijden.
Scheids, Publiek en Cijfers zijn de wedstrijden met een scheidsrechter, toeschouwers en statistieken in de database.
Alleen datum zijn de wedstrijden met een dag en zonder aanvangstijd.

## Wedstrijden die niet in de database staan

De bestanden hebben deze wedstrijden, de database niet als wedstrijd van de oude fansite.

Geen.

## Wedstrijden in de database die niet in de bestanden staan

De import haalt zo'n wedstrijd nooit weg.

Geen.

## Rondes met een ander nummer

De import nummert de speelrondes van een competitie op de volgorde van de datum, want de nummers van de oude fansite zijn niet te vertrouwen.
Bij de beker staan alleen de nummers van de wedstrijden; die worden niet vergeleken.

- 1992/93, Eerste divisie, 15 augustus 1992, De Graafschap: de oude fansite had ronde 1, de database heeft ronde 2
- 1992/93, Eerste divisie, 22 augustus 1992, Helmond Sport: de oude fansite had ronde 2, de database heeft ronde 3
- 2000/01, Eredivisie, 2 oktober 2000, Ajax: de oude fansite had ronde 7, de database heeft ronde 5
- 2000/01, Eredivisie, 14 oktober 2000, RKC Waalwijk: de oude fansite had ronde 8, de database heeft ronde 6
- 2000/01, Eredivisie, 21 oktober 2000, Feyenoord: de oude fansite had ronde 9, de database heeft ronde 7
- 2000/01, Eredivisie, 28 oktober 2000, De Graafschap: de oude fansite had ronde 10, de database heeft ronde 8
- 2000/01, Eredivisie, 1 november 2000, Sparta: de oude fansite had ronde 5, de database heeft ronde 9
- 2000/01, Eredivisie, 12 november 2000, Roda JC: de oude fansite had ronde 12, de database heeft ronde 10
- 2000/01, Eredivisie, 18 november 2000, PSV: de oude fansite had ronde 13, de database heeft ronde 11
- 2000/01, Eredivisie, 26 november 2000, NEC: de oude fansite had ronde 14, de database heeft ronde 12
- 2000/01, Eredivisie, 29 november 2000, AZ: de oude fansite had ronde 7, de database heeft ronde 13
- 2000/01, Eredivisie, 3 december 2000, Ajax: de oude fansite had ronde 15, de database heeft ronde 14
- 2000/01, Eredivisie, 10 december 2000, Vitesse: de oude fansite had ronde 16, de database heeft ronde 15
- 2000/01, Eredivisie, 13 december 2000, Willem II: de oude fansite had ronde 8, de database heeft ronde 16
- 2000/01, Eredivisie, 17 december 2000, RBC Roosendaal: de oude fansite had ronde 9, de database heeft ronde 17
- 2000/01, Eredivisie, 21 december 2000, FC Groningen: de oude fansite had ronde 10, de database heeft ronde 18
- 2000/01, Eredivisie, 31 januari 2001, Feyenoord: de oude fansite had ronde 18, de database heeft ronde 19
- 2000/01, Eredivisie, 17 februari 2001, Roda JC: de oude fansite had ronde 19, de database heeft ronde 20
- 2000/01, Eredivisie, 23 februari 2001, Willem II: de oude fansite had ronde 22, de database heeft ronde 21
- 2000/01, Eredivisie, 2 maart 2001, FC Groningen: de oude fansite had ronde 23, de database heeft ronde 22
- 2000/01, Eredivisie, 9 maart 2001, De Graafschap: de oude fansite had ronde 11, de database heeft ronde 23
- 2000/01, Eredivisie, 17 maart 2001, NAC Breda: de oude fansite had ronde 25, de database heeft ronde 24
- 2000/01, Eredivisie, 31 maart 2001, RBC Roosendaal: de oude fansite had ronde 26, de database heeft ronde 25
- 2000/01, Eredivisie, 7 april 2001, NEC: de oude fansite had ronde 27, de database heeft ronde 26
- 2000/01, Eredivisie, 14 april 2001, RKC Waalwijk: de oude fansite had ronde 28, de database heeft ronde 27
- 2000/01, Eredivisie, 21 april 2001, Fortuna Sittard: de oude fansite had ronde 29, de database heeft ronde 28
- 2000/01, Eredivisie, 29 april 2001, Sparta: de oude fansite had ronde 30, de database heeft ronde 29
- 2000/01, Eredivisie, 2 mei 2001, FC Utrecht: de oude fansite had ronde 20, de database heeft ronde 30
- 2001/02, Eredivisie, 24 augustus 2001, NAC Breda: de oude fansite had ronde 3, de database heeft ronde 2
- 2001/02, Eredivisie, 7 september 2001, Vitesse: de oude fansite had ronde 4, de database heeft ronde 3
- 2001/02, Eredivisie, 16 september 2001, RKC Waalwijk: de oude fansite had ronde 5, de database heeft ronde 4
- 2001/02, Eredivisie, 22 september 2001, PSV: de oude fansite had ronde 6, de database heeft ronde 5
- 2001/02, Eredivisie, 30 september 2001, Roda JC: de oude fansite had ronde 7, de database heeft ronde 6
- 2001/02, Eredivisie, 10 oktober 2001, FC Utrecht: de oude fansite had ronde 8, de database heeft ronde 7
- 2001/02, Eredivisie, 13 oktober 2001, AZ: de oude fansite had ronde 9, de database heeft ronde 8
- 2001/02, Eredivisie, 21 oktober 2001, FC Groningen: de oude fansite had ronde 10, de database heeft ronde 9
- 2001/02, Eredivisie, 24 oktober 2001, Ajax: de oude fansite had ronde 2, de database heeft ronde 10
- 2001/02, Eredivisie, 1 december 2001, Feyenoord: de oude fansite had ronde 16, de database heeft ronde 15
- 2001/02, Eredivisie, 8 december 2001, Willem II: de oude fansite had ronde 17, de database heeft ronde 16
- 2001/02, Eredivisie, 16 december 2001, NEC: de oude fansite had ronde 18, de database heeft ronde 17
- 2001/02, Eredivisie, 19 december 2001, FC Den Bosch: de oude fansite had ronde 15, de database heeft ronde 18
- 2001/02, Eredivisie, 9 maart 2002, RKC Waalwijk: de oude fansite had ronde 26, de database heeft ronde 24
- 2001/02, Eredivisie, 13 maart 2002, Fortuna Sittard: de oude fansite had ronde 24, de database heeft ronde 25
- 2001/02, Eredivisie, 17 maart 2002, Ajax: de oude fansite had ronde 27, de database heeft ronde 26
- 2001/02, Eredivisie, 23 maart 2002, NEC: de oude fansite had ronde 28, de database heeft ronde 27
- 2001/02, Eredivisie, 1 april 2002, PSV: de oude fansite had ronde 25, de database heeft ronde 28
- 2001/02, Eredivisie, 6 april 2002, Vitesse: de oude fansite had ronde 30, de database heeft ronde 29
- 2001/02, Eredivisie, 13 april 2002, De Graafschap: de oude fansite had ronde 31, de database heeft ronde 30
- 2001/02, Eredivisie, 20 april 2002, Roda JC: de oude fansite had ronde 32, de database heeft ronde 31
- 2001/02, Eredivisie, 24 april 2002, FC Groningen: de oude fansite had ronde 29, de database heeft ronde 32
- 2003/04, Eredivisie, 7 februari 2004, NAC Breda: de oude fansite had ronde 19, de database heeft ronde 18
- 2003/04, Eredivisie, 11 februari 2004, RKC Waalwijk: de oude fansite had ronde 20, de database heeft ronde 19
- 2003/04, Eredivisie, 14 februari 2004, Willem II: de oude fansite had ronde 21, de database heeft ronde 20
- 2003/04, Eredivisie, 21 februari 2004, PSV: de oude fansite had ronde 22, de database heeft ronde 21
- 2003/04, Eredivisie, 25 februari 2004, Ajax: de oude fansite had ronde 18, de database heeft ronde 22
- 2004/05, Eredivisie, 12 maart 2005, RKC Waalwijk: de oude fansite had ronde 25, de database heeft ronde 24
- 2004/05, Eredivisie, 16 maart 2005, ADO Den Haag: de oude fansite had ronde 24, de database heeft ronde 25
- 2006/07, Eredivisie, 28 oktober 2006, Ajax: de oude fansite had ronde 10, de database heeft ronde 9
- 2006/07, Eredivisie, 5 november 2006, Sparta: de oude fansite had ronde 11, de database heeft ronde 10
- 2006/07, Eredivisie, 10 november 2006, NAC Breda: de oude fansite had ronde 12, de database heeft ronde 11
- 2006/07, Eredivisie, 18 november 2006, RKC Waalwijk: de oude fansite had ronde 13, de database heeft ronde 12
- 2006/07, Eredivisie, 26 november 2006, AZ: de oude fansite had ronde 14, de database heeft ronde 13
- 2006/07, Eredivisie, 29 november 2006, Vitesse: de oude fansite had ronde 9, de database heeft ronde 14

## Wedstrijden met een opmerking van de oude fansite

Alleen een opmerking die een bezoeker iets zegt, gaat mee naar de wedstrijd (overgenomen).
De andere zijn werkaantekeningen van de oude redacteuren en zijn niet gekopieerd.

- 1990/91, Eredivisie, 25 augustus 1990, FC Volendam: Debuut in Eredivisie (overgenomen)
- 1990/91, KNVB Beker, 1 oktober 1990, VV Geldrop: Datum klopt niet (niet overgenomen)
- 1992/93, KNVB Beker, 17 februari 1993, PSV: kwartfinale (overgenomen)
- 1993/94, Eredivisie, 4 september 1993, Roda JC: http://members.tripod.com/~rodajc/ (niet overgenomen)
- 1993/94, KNVB Beker, 10 november 1993, Ajax: olympia.fortunecity.com/lipinsky/524/ (niet overgenomen)
- 1994/95, KNVB Beker, 2 oktober 1994, HZVV: Datum is een gokje (niet overgenomen)
- 1996/97, KNVB Beker, 1 juli 1996, Sneek: Datum niet correct (niet overgenomen)
- 2001/02, Eredivisie, 7 september 2001, Vitesse: begon later door file (overgenomen)
- 2001/02, Eredivisie, 16 september 2001, RKC Waalwijk: was 14/9 (niet overgenomen)
- 2001/02, Eredivisie, 3 november 2001, Fortuna Sittard: Naar 3/11 als Roda nog in UC; was 4/11 (wegens AC) (niet overgenomen)
- 2001/02, Eredivisie, 24 november 2001, FC Twente: Naar 25/11 als Twente of Heerenveen UC (niet overgenomen)
- 2001/02, Eredivisie, 8 december 2001, Willem II: Naar 9/12 als Heerenveen UC (niet overgenomen)
- 2001/02, Eredivisie, 1 april 2002, PSV: was 2 maart, was 8 maart (niet overgenomen)
- 2001/02, Eredivisie, 24 april 2002, FC Groningen: was vr 29/3 (niet overgenomen)
- 2002/03, Eredivisie, 2 november 2002, De Graafschap: was 2002-11-03 14:30:00 (niet overgenomen)
- 2002/03, Eredivisie, 17 november 2002, Vitesse: was 2002-11-16 19:30:00 (niet overgenomen)
- 2003/04, Eredivisie, 17 augustus 2003, FC Volendam: onder voorbehoud (niet overgenomen)
- 2003/04, Eredivisie, 25 februari 2004, Ajax: 28 januari afgelast wegens sneeuw (overgenomen)
- 2004/05, Eredivisie, 6 november 2004, RKC Waalwijk: naar zondag als Uefa Cup (niet overgenomen)
- 2004/05, Eredivisie, 19 december 2004, NEC: naar zaterdag als geen Uefa Cup en min 4x zondag (niet overgenomen)
- 2004/05, Eredivisie, 12 maart 2005, RKC Waalwijk: naar zondag als Uefa Cup (niet overgenomen)
- 2004/05, Eredivisie, 9 april 2005, FC Twente: naar zondag als Uefa Cup (niet overgenomen)
- 2004/05, Eredivisie, 22 april 2005, RBC Roosendaal: naar zaterdag of zondag als Uefa Cup (niet overgenomen)
- 2004/05, Eredivisie, 7 mei 2005, Willem II: naar zondag als Uefa Cup (niet overgenomen)
- 2005/06, Play-offs UEFA Cup, 22 april 2006, Roda JC: Play-off (niet overgenomen)
- 2005/06, Play-offs UEFA Cup, 26 april 2006, Roda JC: Play-off (niet overgenomen)

## Doelpunten die niet optellen

Zo'n wedstrijd krijgt geen doelpunten, want een lijst die de uitslag tegenspreekt, spreekt ook de bezoeker tegen.

- 1990/91, Eredivisie, 2 september 1990, FC Utrecht: uitslag 2-1, geen doelpunten in het bestand
- 1990/91, Eredivisie, 9 september 1990, NEC: uitslag 1-1, geen doelpunten in het bestand
- 1990/91, Eredivisie, 16 september 1990, MVV: uitslag 0-2, geen doelpunten in het bestand
- 1990/91, Eredivisie, 30 september 1990, Roda JC: uitslag 1-2, geen doelpunten in het bestand
- 1990/91, KNVB Beker, 1 oktober 1990, VV Geldrop: uitslag 2-3, geen doelpunten in het bestand
- 1990/91, Eredivisie, 21 oktober 1990, Feyenoord: uitslag 1-1, geen doelpunten in het bestand
- 1990/91, Eredivisie, 11 november 1990, Sparta: uitslag 1-2, geen doelpunten in het bestand
- 1990/91, Eredivisie, 2 december 1990, Vitesse: uitslag 0-2, geen doelpunten in het bestand
- 1990/91, Eredivisie, 9 december 1990, Willem II: uitslag 2-1, geen doelpunten in het bestand
- 1990/91, Eredivisie, 23 december 1990, Fortuna Sittard: uitslag 0-1, geen doelpunten in het bestand
- 1990/91, Eredivisie, 27 december 1990, FC Groningen: uitslag 0-3, geen doelpunten in het bestand
- 1990/91, Eredivisie, 3 maart 1991, MVV: uitslag 1-0, geen doelpunten in het bestand
- 1990/91, Eredivisie, 10 maart 1991, FC Volendam: uitslag 1-1, geen doelpunten in het bestand
- 1990/91, Eredivisie, 24 maart 1991, RKC Waalwijk: uitslag 4-1, geen doelpunten in het bestand
- 1990/91, Eredivisie, 27 maart 1991, PSV: uitslag 0-2, geen doelpunten in het bestand
- 1990/91, Eredivisie, 1 april 1991, Roda JC: uitslag 0-1, geen doelpunten in het bestand
- 1990/91, Eredivisie, 7 april 1991, ADO Den Haag: uitslag 3-0, geen doelpunten in het bestand
- 1990/91, Eredivisie, 14 april 1991, FC Utrecht: uitslag 1-0, geen doelpunten in het bestand
- 1990/91, Eredivisie, 21 april 1991, Ajax: uitslag 0-4, geen doelpunten in het bestand
- 1990/91, Eredivisie, 28 april 1991, Sparta: uitslag 2-1, geen doelpunten in het bestand
- 1990/91, Eredivisie, 5 mei 1991, SVV: uitslag 2-1, geen doelpunten in het bestand
- 1990/91, Eredivisie, 15 mei 1991, Vitesse: uitslag 2-2, geen doelpunten in het bestand
- 1990/91, Eredivisie, 20 mei 1991, Willem II: uitslag 2-5, geen doelpunten in het bestand
- 1990/91, Eredivisie, 26 mei 1991, Fortuna Sittard: uitslag 1-2, geen doelpunten in het bestand
- 1990/91, Eredivisie, 2 juni 1991, NEC: uitslag 1-2, geen doelpunten in het bestand
- 1990/91, Eredivisie, 9 juni 1991, FC Twente: uitslag 3-3, geen doelpunten in het bestand
- 1991/92, KNVB Beker, 17 november 1991, PSV: uitslag 0-2, geen doelpunten in het bestand
- 1992/93, Eerste divisie, 22 augustus 1992, Helmond Sport: uitslag 1-1, geen doelpunten in het bestand
- 1992/93, Eerste divisie, 24 oktober 1992, NAC Breda: uitslag 0-1, geen doelpunten in het bestand
- 1992/93, Eerste divisie, 7 november 1992, ADO Den Haag: uitslag 1-3, geen doelpunten in het bestand
- 1992/93, Eerste divisie, 19 december 1992, Heracles Almelo: uitslag 3-0, geen doelpunten in het bestand
- 1992/93, Eerste divisie, 16 januari 1993, RBC Roosendaal: uitslag 5-2, geen doelpunten in het bestand
- 1992/93, Eerste divisie, 30 januari 1993, Helmond Sport: uitslag 8-3, geen doelpunten in het bestand
- 1992/93, Eerste divisie, 6 februari 1993, TOP Oss: uitslag 1-1, geen doelpunten in het bestand
- 1992/93, Eerste divisie, 13 februari 1993, VVV: uitslag 3-2, geen doelpunten in het bestand
- 1992/93, Eerste divisie, 19 februari 1993, Haarlem: uitslag 1-0, geen doelpunten in het bestand
- 1992/93, Eerste divisie, 27 februari 1993, Emmen: uitslag 2-2, geen doelpunten in het bestand
- 1992/93, Eerste divisie, 6 maart 1993, Eindhoven: uitslag 1-0, geen doelpunten in het bestand
- 1992/93, Eerste divisie, 27 maart 1993, NAC Breda: uitslag 2-2, geen doelpunten in het bestand
- 1992/93, Eerste divisie, 4 april 1993, Excelsior: uitslag 5-1, geen doelpunten in het bestand
- 1992/93, Eerste divisie, 17 april 1993, NEC: uitslag 3-2, geen doelpunten in het bestand
- 1992/93, Eerste divisie, 23 april 1993, ADO Den Haag: uitslag 3-0, geen doelpunten in het bestand
- 1992/93, Eerste divisie, 9 mei 1993, BV Veendam: uitslag 3-3, geen doelpunten in het bestand
- 1992/93, Eerste divisie, 16 mei 1993, Haarlem: uitslag 4-0, geen doelpunten in het bestand
- 1993/94, Eredivisie, 29 augustus 1993, FC Utrecht: uitslag 1-0, geen doelpunten in het bestand
- 1993/94, Eredivisie, 9 april 1994, Go Ahead Eagles: uitslag 3-2, geen doelpunten in het bestand
- 1993/94, Eredivisie, 23 april 1994, Willem II: uitslag 1-2, geen doelpunten in het bestand
- 1993/94, Eredivisie, 27 april 1994, VVV: uitslag 1-1, geen doelpunten in het bestand
- 1993/94, Eredivisie, 8 mei 1994, MVV: uitslag 3-1, geen doelpunten in het bestand
- 1994/95, KNVB Beker, 2 oktober 1994, HZVV: uitslag 11-1, geen doelpunten in het bestand
- 1995/96, Intertoto Cup, 24 juni 1995, Næstved IF: uitslag 2-1, geen doelpunten in het bestand
- 1995/96, Intertoto Cup, 2 juli 1995, Ton Pentre FC: uitslag 7-0, geen doelpunten in het bestand
- 1995/96, Intertoto Cup, 15 juli 1995, Békéscsabai EFC: uitslag 4-0, geen doelpunten in het bestand
- 1995/96, Intertoto Cup, 23 juli 1995, UD Leiria: uitslag 0-1, geen doelpunten in het bestand
- 1995/96, KNVB Beker, 12 augustus 1995, Emmen: uitslag 1-2, geen doelpunten in het bestand
- 1995/96, KNVB Beker, 2 september 1995, Heracles Almelo: uitslag 0-1, geen doelpunten in het bestand
- 1995/96, KNVB Beker, 29 november 1995, Cambuur Lwd.: uitslag 0-1, geen doelpunten in het bestand
- 1996/97, Intertoto Cup, 6 juli 1996, Lillestrøm SK: uitslag 0-1, geen doelpunten in het bestand
- 1996/97, Intertoto Cup, 13 juli 1996, FC Nantes Atlantique: uitslag 1-3, maar 3 doelpunten in het bestand (0-3)
- 1996/97, Intertoto Cup, 20 juli 1996, FBK Kaunas: uitslag 3-1, geen doelpunten in het bestand
- 1996/97, Eredivisie, 22 september 1996, FC Volendam: uitslag 2-2, geen doelpunten in het bestand
- 1997/98, Intertoto Cup, 12 juli 1997, MSV Duisburg: uitslag 0-2, geen doelpunten in het bestand
- 1997/98, Intertoto Cup, 19 juli 1997, Aalborg BK: uitslag 8-2, geen doelpunten in het bestand
- 1997/98, KNVB Beker, 1 september 1997, VVOG: uitslag 10-1, geen doelpunten in het bestand
- 1998/99, Eredivisie, 16 april 1999, Vitesse: uitslag 2-1, geen doelpunten in het bestand
- 1999/00, Eredivisie, 20 februari 2000, FC Utrecht: uitslag 2-2, maar 5 doelpunten in het bestand (2-3)
- 2005/06, UEFA Cup, 24 november 2005, Olympique de Marseille: uitslag 0-1, geen doelpunten in het bestand

## Verslagen die bezig zijn

Een verslag is klaar als de regels van het verslag geen fout vinden en er niets is weggelaten of twijfelachtig is.
Anders is het bezig, met de reden hier.

- 1990/91, Eredivisie, 25 augustus 1990, FC Volendam: regel `yellow-red-needs-one-yellow`: Harry Decheiver krijgt geel-rood zonder precies één gele kaart eerder
- 1992/93, Eerste divisie, 29 augustus 1992, TOP Oss: regel `yellow-red-needs-one-yellow`: X; rosmalen krijgt geel-rood zonder precies één gele kaart eerder
- 1992/93, KNVB Beker, 29 september 1992, GVVV: regel `lineup-size`: De opstelling van sc Heerenveen heeft 8 spelers en moet er precies 11 hebben
- 1992/93, KNVB Beker, 15 december 1992, Fortuna Sittard: Robert Loontjens komt in minuut 67 erin en niemand van het team gaat er dan uit
- 1992/93, KNVB Beker, 17 februari 1993, PSV: regel `lineup-size`: De opstelling van sc Heerenveen heeft 2 spelers en moet er precies 11 hebben
- 1993/94, Eredivisie, 25 augustus 1993, PSV: Edwin van Ankeren komt in minuut 47 erin en niemand van het team gaat er dan uit; Erik Meijer komt in minuut 47 erin en niemand van het team gaat er dan uit
- 1993/94, Eredivisie, 4 september 1993, Roda JC: Marco Roelofsen gaat in minuut 70 eruit zonder invaller en zonder rode kaart; Leeroy Echteld gaat in minuut 78 eruit zonder invaller en zonder rode kaart; regel `lineup-size`: De opstelling van sc Heerenveen heeft 13 spelers en moet er precies 11 hebben
- 1993/94, Eredivisie, 26 september 1993, FC Twente: regel `yellow-red-needs-one-yellow`: Maarten de Jong krijgt geel-rood zonder precies één gele kaart eerder
- 1993/94, KNVB Beker, 9 oktober 1993, SDV Barneveld: regel `lineup-size`: De opstelling van sc Heerenveen heeft 4 spelers en moet er precies 11 hebben
- 1993/94, Eredivisie, 27 maart 1994, FC Volendam: Leeroy Echteld komt in minuut 69 erin en niemand van het team gaat er dan uit; René Groen komt in minuut 69 erin en niemand van het team gaat er dan uit; regel `lineup-size`: De opstelling van sc Heerenveen heeft 10 spelers en moet er precies 11 hebben
- 1993/94, Eredivisie, 1 mei 1994, Ajax: Bert Zuurman komt in minuut 82 erin en niemand van het team gaat er dan uit; Wilco Hellinga gaat in minuut 8 eruit zonder invaller en zonder rode kaart
- 1994/95, KNVB Beker, 23 augustus 1994, Cambuur Lwd.: regel `lineup-size`: De opstelling van sc Heerenveen heeft 1 spelers en moet er precies 11 hebben
- 1994/95, Eredivisie, 18 september 1994, FC Volendam: regel `yellow-red-needs-one-yellow`: Tom Sier krijgt geel-rood zonder precies één gele kaart eerder
- 1994/95, KNVB Beker, 30 september 1994, DOS Kampen: regel `lineup-size`: De opstelling van sc Heerenveen heeft 3 spelers en moet er precies 11 hebben
- 1994/95, KNVB Beker, 5 oktober 1994, Cambuur Lwd.: regel `lineup-size`: De opstelling van sc Heerenveen heeft 3 spelers en moet er precies 11 hebben
- 1994/95, Eredivisie, 26 oktober 1994, Ajax: regel `yellow-red-needs-one-yellow`: Johan Hansma krijgt geel-rood zonder precies één gele kaart eerder
- 1994/95, Eredivisie, 5 november 1994, Roda JC: André van Tuinen komt in minuut 71 erin en niemand van het team gaat er dan uit
- 1994/95, Eredivisie, 19 november 1994, Sparta: regel `yellow-red-needs-one-yellow`: Dennis de Bruin krijgt geel-rood zonder precies één gele kaart eerder
- 1994/95, KNVB Beker, 30 november 1994, PSV: regel `lineup-size`: De opstelling van sc Heerenveen heeft 1 spelers en moet er precies 11 hebben
- 1994/95, Eredivisie, 15 januari 1995, FC Groningen: regel `yellow-red-needs-one-yellow`: Romano Sion krijgt geel-rood zonder precies één gele kaart eerder
- 1994/95, Eredivisie, 6 mei 1995, Go Ahead Eagles: regel `yellow-red-needs-one-yellow`: André van Tuinen krijgt geel-rood zonder precies één gele kaart eerder
- 1995/96, Intertoto Cup, 29 juli 1995, FC Farul Constanta: regel `lineup-size`: De opstelling van sc Heerenveen heeft 3 spelers en moet er precies 11 hebben
- 1995/96, Intertoto Cup, 2 augustus 1995, FC Girondins de Bordeaux: regel `yellow-red-needs-one-yellow`: Arnold Oosterveer krijgt geel-rood zonder precies één gele kaart eerder
- 1995/96, KNVB Beker, 16 september 1995, SV Urk: regel `lineup-size`: De opstelling van sc Heerenveen heeft 5 spelers en moet er precies 11 hebben
- 1995/96, Eredivisie, 2 maart 1996, NEC: regel `scorer-not-on-pitch`: Erik Regtop scoort in minuut 83, maar staat dan niet op het veld
- 1995/96, Eredivisie, 30 maart 1996, NAC Breda: regel `yellow-red-needs-one-yellow`: Yassine Abdellaoui krijgt geel-rood zonder precies één gele kaart eerder
- 1995/96, Eredivisie, 28 april 1996, FC Volendam: regel `yellow-red-needs-one-yellow`: Radoslav Samardzic krijgt geel-rood zonder precies één gele kaart eerder
- 1996/97, KNVB Beker, 1 juli 1996, Sneek: regel `lineup-size`: De opstelling van sc Heerenveen heeft 4 spelers en moet er precies 11 hebben
- 1996/97, Intertoto Cup, 13 juli 1996, FC Nantes Atlantique: regel `lineup-size`: De opstelling van sc Heerenveen heeft 0 spelers en moet er precies 11 hebben; regel `goals-differ-from-score`: De doelpunten geven 0–0 en de uitslag is 1–3; pas de doelpunten of de uitslag aan
- 1996/97, KNVB Beker, 16 augustus 1996, Cambuur Lwd.: regel `lineup-size`: De opstelling van sc Heerenveen heeft 3 spelers en moet er precies 11 hebben
- 1996/97, KNVB Beker, 31 augustus 1996, SV Urk: regel `lineup-size`: De opstelling van sc Heerenveen heeft 5 spelers en moet er precies 11 hebben
- 1996/97, Eredivisie, 6 september 1996, FC Groningen: Marco Roelofsen komt in minuut 81 erin en niemand van het team gaat er dan uit; Ronnie Pander gaat in minuut 8 eruit zonder invaller en zonder rode kaart
- 1996/97, Eredivisie, 22 september 1996, FC Volendam: regel `goals-differ-from-score`: De doelpunten geven 0–0 en de uitslag is 2–2; pas de doelpunten of de uitslag aan
- 1996/97, Eredivisie, 19 oktober 1996, Willem II: Brian Tevreden komt in minuut 67 erin en niemand van het team gaat er dan uit; Roberto Straal gaat in minuut 7 eruit zonder invaller en zonder rode kaart
- 1996/97, Eredivisie, 12 november 1996, De Graafschap: regel `yellow-red-needs-one-yellow`: Raymond Victoria krijgt geel-rood zonder precies één gele kaart eerder
- 1996/97, KNVB Beker, 27 november 1996, TOP Oss: regel `lineup-size`: De opstelling van sc Heerenveen heeft 5 spelers en moet er precies 11 hebben
- 1996/97, KNVB Beker, 8 februari 1997, NEC: regel `lineup-size`: De opstelling van sc Heerenveen heeft 2 spelers en moet er precies 11 hebben
- 1996/97, Eredivisie, 22 februari 1997, NAC Breda: regel `yellow-red-needs-one-yellow`: Ole Tobiasen krijgt geel-rood zonder precies één gele kaart eerder
- 1996/97, KNVB Beker, 12 maart 1997, Feyenoord: regel `lineup-size`: De opstelling van sc Heerenveen heeft 7 spelers en moet er precies 11 hebben
- 1996/97, Eredivisie, 22 maart 1997, PSV: regel `yellow-red-needs-one-yellow`: Wim Jonk krijgt geel-rood zonder precies één gele kaart eerder
- 1996/97, Eredivisie, 20 april 1997, RKC Waalwijk: regel `yellow-red-needs-one-yellow`: Adilson dos Santos krijgt geel-rood zonder precies één gele kaart eerder
- 1997/98, KNVB Beker, 12 augustus 1997, Cambuur Lwd.: regel `lineup-size`: De opstelling van sc Heerenveen heeft 3 spelers en moet er precies 11 hebben
- 1997/98, KNVB Beker, 27 augustus 1997, Drachtster Boys: regel `lineup-size`: De opstelling van sc Heerenveen heeft 7 spelers en moet er precies 11 hebben
- 1997/98, Eredivisie, 30 augustus 1997, MVV: regel `lineup-size`: De opstelling van sc Heerenveen heeft 10 spelers en moet er precies 11 hebben
- 1997/98, Eredivisie, 21 september 1997, Roda JC: regel `scorer-not-on-pitch`: Emmanuel Ebiede scoort in minuut 82, maar staat dan niet op het veld
- 1997/98, KNVB Beker, 19 november 1997, Eindhoven: regel `yellow-red-needs-one-yellow`: Ralf Manders krijgt geel-rood zonder precies één gele kaart eerder
- 1997/98, Eredivisie, 13 december 1997, Vitesse: Emmanuel Ebiede komt in minuut 58 erin en niemand van het team gaat er dan uit; Meindert Postma komt in minuut 58 erin en niemand van het team gaat er dan uit; regel `lineup-size`: De opstelling van sc Heerenveen heeft 10 spelers en moet er precies 11 hebben
- 1997/98, KNVB Beker, 11 februari 1998, NEC: regel `lineup-size`: De opstelling van sc Heerenveen heeft 3 spelers en moet er precies 11 hebben
- 1997/98, Eredivisie, 1 maart 1998, Feyenoord: regel `lineup-size`: De opstelling van sc Heerenveen heeft 10 spelers en moet er precies 11 hebben
- 1997/98, Eredivisie, 7 maart 1998, NEC: regel `lineup-size`: De opstelling van sc Heerenveen heeft 10 spelers en moet er precies 11 hebben
- 1998/99, Eredivisie, 4 oktober 1998, NAC Breda: regel `yellow-red-needs-one-yellow`: Erwin van de Looi krijgt geel-rood zonder precies één gele kaart eerder
- 1998/99, Eredivisie, 16 oktober 1998, AZ: regel `scorer-not-on-pitch`: Jeffrey Talan scoort in minuut 73, maar staat dan niet op het veld
- 1998/99, Eredivisie, 21 februari 1999, FC Utrecht: regel `yellow-red-needs-one-yellow`: Tieme Klompe krijgt geel-rood zonder precies één gele kaart eerder
- 1998/99, Eredivisie, 28 februari 1999, Feyenoord: regel `yellow-red-needs-one-yellow`: Brian Tevreden krijgt geel-rood zonder precies één gele kaart eerder
- 1998/99, Eredivisie, 16 april 1999, Vitesse: regel `goals-differ-from-score`: De doelpunten geven 0–0 en de uitslag is 2–1; pas de doelpunten of de uitslag aan
- 1999/00, KNVB Beker, 5 oktober 1999, De Graafschap: regel `yellow-red-needs-one-yellow`: Richard Roelofsen krijgt geel-rood zonder precies één gele kaart eerder
- 1999/00, Eredivisie, 3 november 1999, NEC: Mark Oosterhof gaat in minuut 67 eruit zonder invaller en zonder rode kaart; Maikel Renfurm gaat in minuut 78 eruit zonder invaller en zonder rode kaart
- 1999/00, Eredivisie, 29 januari 2000, Sparta: regel `assist-not-on-pitch`: Roy Stroeve geeft een assist in minuut 78, maar staat dan niet op het veld
- 1999/00, Eredivisie, 13 februari 2000, PSV: Jan Heintze gaat in minuut 68 eruit zonder invaller en zonder rode kaart; Dennis Rommedahl gaat in minuut 62 eruit zonder invaller en zonder rode kaart; Arnold Bruggink gaat in minuut 83 eruit zonder invaller en zonder rode kaart
- 1999/00, Eredivisie, 20 februari 2000, FC Utrecht: regel `goals-differ-from-score`: De doelpunten geven 0–0 en de uitslag is 2–2; pas de doelpunten of de uitslag aan
- 2000/01, Eredivisie, 20 augustus 2000, FC Utrecht: Daniel Jensen komt in minuut 55 erin en niemand van het team gaat er dan uit; regel `yellow-red-needs-one-yellow`: Ignacio Tuhuteru krijgt geel-rood zonder precies één gele kaart eerder
- 2000/01, Eredivisie, 26 augustus 2000, Fortuna Sittard: Stijn Haeldermans komt in minuut 70 erin en niemand van het team gaat er dan uit; Ronald Hamming komt in minuut 71 erin en niemand van het team gaat er dan uit
- 2000/01, Eredivisie, 10 december 2000, Vitesse: regel `yellow-red-needs-one-yellow`: Marc van Hintum krijgt geel-rood zonder precies één gele kaart eerder
- 2001/02, Eredivisie, 7 september 2001, Vitesse: regel `assist-not-on-pitch`: Matthew Amoah geeft een assist in minuut 85, maar staat dan niet op het veld
- 2001/02, Eredivisie, 22 september 2001, PSV: John de Jong staat twee keer in de opstelling: de tweede is weggelaten; John de Jong komt in minuut 81 erin en niemand van het team gaat er dan uit
- 2001/02, KNVB Beker, 30 januari 2002, FC Utrecht: Allan Bak Jensen komt in minuut 81 erin en niemand van het team gaat er dan uit; regel `yellow-red-needs-one-yellow`: Karim Touzani krijgt geel-rood zonder precies één gele kaart eerder
- 2001/02, Eredivisie, 16 februari 2002, Willem II: Paul Matthijsen staat twee keer in de opstelling: de tweede is weggelaten; Chris Janssens gaat in minuut 80 eruit zonder invaller en zonder rode kaart
- 2001/02, Eredivisie, 9 maart 2002, RKC Waalwijk: Jochen Janssen komt in minuut 67 erin en niemand van het team gaat er dan uit; regel `yellow-red-needs-one-yellow`: Rogier Molhoek krijgt geel-rood zonder precies één gele kaart eerder
- 2001/02, Eredivisie, 20 april 2002, Roda JC: Jeffrey Talan komt in minuut 55 erin en niemand van het team gaat er dan uit; Jesper Håkansson komt in minuut 67 erin en niemand van het team gaat er dan uit; regel `yellow-red-needs-one-yellow`: Anthony Lurling krijgt geel-rood zonder precies één gele kaart eerder
- 2001/02, Eredivisie, 28 april 2002, Feyenoord: regel `yellow-red-needs-one-yellow`: Sjinji Ono krijgt geel-rood zonder precies één gele kaart eerder
- 2002/03, Eredivisie, 6 oktober 2002, Willem II: Jattoo Ceesay gaat in minuut 64 eruit zonder invaller en zonder rode kaart
- 2002/03, Eredivisie, 19 oktober 2002, FC Twente: Thijs Houwing komt in minuut 87 erin en niemand van het team gaat er dan uit
- 2002/03, Eredivisie, 1 februari 2003, NAC Breda: Rob Penders gaat in minuut 65 eruit zonder invaller en zonder rode kaart; Rick Versteeg gaat in minuut 65 eruit zonder invaller en zonder rode kaart
- 2003/04, Eredivisie, 27 september 2003, FC Twente: Kim Christensen komt in minuut 46 erin en niemand van het team gaat er dan uit; Sjaak Polak gaat in minuut 45 eruit zonder invaller en zonder rode kaart
- 2003/04, Eredivisie, 7 februari 2004, NAC Breda: regel `yellow-red-needs-one-yellow`: Erik Edman krijgt geel-rood zonder precies één gele kaart eerder
- 2003/04, Eredivisie, 21 februari 2004, PSV: regel `yellow-red-needs-one-yellow`: Mark van Bommel krijgt geel-rood zonder precies één gele kaart eerder
- 2003/04, Eredivisie, 28 februari 2004, NEC: Jeffrey Leiwakabessy komt in minuut 83 erin en niemand van het team gaat er dan uit; Fabian de Freitas komt in minuut 83 erin en niemand van het team gaat er dan uit
- 2003/04, Eredivisie, 10 april 2004, FC Utrecht: Jesper Håkansson gaat in minuut 69 eruit zonder invaller en zonder rode kaart; regel `lineup-size`: De opstelling van sc Heerenveen heeft 12 spelers en moet er precies 11 hebben
- 2003/04, Eredivisie, 16 mei 2004, FC Twente: Kim Christensen komt in minuut 70 erin en niemand van het team gaat er dan uit; Blaise N'Kufo gaat in minuut 7 eruit zonder invaller en zonder rode kaart; regel `scorer-not-on-pitch`: Kim Christensen scoort in minuut 20, maar staat dan niet op het veld
- 2004/05, Eredivisie, 18 september 2004, NAC Breda: regel `yellow-red-needs-one-yellow`: Said Bakkati krijgt geel-rood zonder precies één gele kaart eerder
- 2004/05, Eredivisie, 25 september 2004, PSV: regel `yellow-red-needs-one-yellow`: Tomasz Rzasa krijgt geel-rood zonder precies één gele kaart eerder
- 2004/05, Eredivisie, 3 oktober 2004, ADO Den Haag: Jamie Smith komt in minuut 89 erin en niemand van het team gaat er dan uit
- 2004/05, Eredivisie, 13 november 2004, Vitesse: Stefan Selakovic komt in minuut 66 erin en niemand van het team gaat er dan uit; Georgios Samaras komt in minuut 66 erin en niemand van het team gaat er dan uit; regel `lineup-size`: De opstelling van sc Heerenveen heeft 10 spelers en moet er precies 11 hebben
- 2004/05, Eredivisie, 5 december 2004, Willem II: regel `yellow-red-needs-one-yellow`: Hannu Haarala krijgt geel-rood zonder precies één gele kaart eerder
- 2004/05, UEFA Cup, 17 februari 2005, Newcastle United FC: regel `yellow-red-needs-one-yellow`: Lee Bowyer krijgt geel-rood zonder precies één gele kaart eerder
- 2004/05, Eredivisie, 20 maart 2005, FC Utrecht: regel `yellow-red-needs-one-yellow`: Stefaan Tanghe krijgt geel-rood zonder precies één gele kaart eerder
- 2004/05, Eredivisie, 9 april 2005, FC Twente: regel `yellow-red-needs-one-yellow`: Sharbel Touma krijgt geel-rood zonder precies één gele kaart eerder
- 2004/05, Eredivisie, 22 mei 2005, NEC: Lasse Nilsson komt in minuut 63 erin en niemand van het team gaat er dan uit; Yuri Rose komt in minuut 63 erin en niemand van het team gaat er dan uit; regel `lineup-size`: De opstelling van sc Heerenveen heeft 10 spelers en moet er precies 11 hebben
- 2005/06, Eredivisie, 10 september 2005, Heracles Almelo: regel `assist-not-on-pitch`: Marc Höcher geeft een assist in minuut 90, maar staat dan niet op het veld
- 2005/06, Eredivisie, 2 oktober 2005, PSV: Said Bakkati staat twee keer in de opstelling: de tweede is weggelaten; Paul Bosvelt gaat in minuut 61 eruit zonder invaller en zonder rode kaart
- 2005/06, UEFA Cup, 24 november 2005, Olympique de Marseille: regel `goals-differ-from-score`: De doelpunten geven 0–0 en de uitslag is 0–1; pas de doelpunten of de uitslag aan
- 2005/06, Eredivisie, 30 december 2005, Ajax: regel `yellow-red-needs-one-yellow`: Paul Bosvelt krijgt geel-rood zonder precies één gele kaart eerder

## Spelers van wie de code geen rij in de oude tabel had

De naam is gemaakt uit de code, dus de schrijfwijze kan afwijken.

- Ivan Tzvekov (`ivan.tzvekov`), 1998/99

## Kaarten die de import oversloeg

Kaarten van de trainer en van iemand die niet in de opstelling staat, en rode kaarten zonder minuut en zonder minuut van weggaan.
Daarnaast hebben 792 gele kaarten een lege minuut in het verslag, want de oude fansite kende de minuut niet.

- 2001/02, Eredivisie, 8 december 2001, Willem II: rode kaart voor foppe.dehaan: staat niet in de opstelling (de trainer of geen speler), weggelaten
- 2001/02, Eredivisie, 13 maart 2002, Fortuna Sittard: rode kaart voor foppe.dehaan: staat niet in de opstelling (de trainer of geen speler), weggelaten

## Doelpuntenmakers die niet in de opstelling staan

Zo'n doelpunt heeft in het verslag geen speler.

Geen.

## Assists zonder speler

Deze assists zijn leeg gelaten in het verslag.

- 1996/97, Eredivisie, 25 mei 1997, Feyenoord: assist van Henke Larsson bij het doelpunt van Gaston Taument (minuut 52): staat niet in de opstelling van het team, leeg gelaten
- 1998/99, Eredivisie, 16 mei 1999, MVV: assist van Erik Kortchaguine bij het doelpunt van Emerson (minuut 4): staat niet in de opstelling van het team, leeg gelaten
- 1999/00, Eredivisie, 13 februari 2000, PSV: assist van ronnie.venema bij het doelpunt van Ruud van Nistelrooij (minuut 57): staat niet in de opstelling van het team, leeg gelaten
- 1999/00, Eredivisie, 22 april 2000, Roda JC: assist van Gerry Senden bij het doelpunt van Bob Peeters (minuut 6): staat niet in de opstelling van het team, leeg gelaten
- 2001/02, Eredivisie, 16 december 2001, NEC: assist van Dennis de Nooijer bij het eigen doelpunt van Tieme Klompe (minuut 77): weggelaten
- 2001/02, Eredivisie, 25 januari 2002, Sparta: assist van mika.nurmela bij het eigen doelpunt van Marilia (minuut 7): weggelaten
- 2001/02, Eredivisie, 13 april 2002, De Graafschap: assist van gerard.denooijer bij het eigen doelpunt van Purrel Fränkel (minuut 46): weggelaten
- 2003/04, Intertoto Cup, 12 augustus 2003, Villarreal CF: assist van mika.vayrynen bij het eigen doelpunt van Sergio Ballesteros (minuut 25): weggelaten

## Nieuwe clubs

De import maakte deze clubs, zonder Wikipedia-pagina; de import van Wikipedia geeft ze die zodra een wedstrijd ze noemt.

- Aalborg BK (aalborg)
- Békéscsabai EFC (bekescsabaiefc)
- BV Veendam (bvveendam)
- CA Osasuna (caosasuna)
- CSKA Moskva (cskamoskva)
- Dinamo-93 Minsk (dinamominsk)
- Dordrecht '90 (dordrecht90)
- DOS Kampen (doskampen)
- Drachtster Boys (drachtsterboys)
- FBK Kaunas (fbkkaunas)
- FC Baník Ostrava (fcbanikostrava)
- FC Basel (fcbasel)
- FC Den Bosch (fcdenbosch)
- FC Dinamo Bucuresti (fcdinamobucuresti)
- FC Farul Constanta (fcfarulconstanta)
- FC Girondins de Bordeaux (fcgirondinsbordeaux)
- FC Koper (fckoper)
- FC Nantes Atlantique (fcnantes)
- FC National Bucuresti (fcnationalbucuresti)
- FK Metalurgs Liepãja (fkmetalurgsliepaja)
- GVVV (gvvv)
- Haarlem (haarlem)
- Hammarby IF (hammarbyif)
- HZVV (hzvv)
- KS Amica Wronki (ksamicawronki)
- KSK Beveren (kskbeveren)
- Levski Sofia (levskisofia)
- Lierse SK (liersesk)
- Lillestrøm SK (lillestrom)
- Maccabi Petach-Tikva FC (maccabipetachtikvafc)
- MSV Duisburg (msvduisburg)
- MVV (mvv)
- Næstved IF (naestvedif)
- Newcastle United FC (newcastleunitedfc)
- NK Dinamo Zagreb (nkdinamozagreb)
- NK Varteks Varaždin (nkvarteksvarazdin)
- Odense BK (odensebk)
- Olympiakos Piraeus (olympiakospiraeus)
- Olympique de Marseille (olympiquedemarseille)
- Olympique Lyonnais (olympiquelyonnais)
- Parma FC (parmafc)
- Polonia Warszawa (poloniawarzawa)
- RBC Roosendaal (rbcroosendaal)
- RC Lens (rclens)
- SDC Putten (sdcputten)
- SDV Barneveld (sdvbarneveld)
- SL Benfica (slbenfica)
- Sligo Rovers (sligorovers)
- Sneek (sneek)
- Steaua Bucuresti (steauabucuresti)
- SV Urk (svurk)
- SVV (svv)
- Ton Pentre FC (tonpentrefc)
- UD Leiria (udleiria)
- Valencia CF (valenciacf)
- VfB Stuttgart (vfbstuttgart)
- Villarreal CF (villarrealcf)
- Vitória Setúbal FC (vitoriasetubalfc)
- VV Geldrop (vvgeldrop)
- VVOG (vvog)
- VV Rozenburg (vvrozenburg)
- VVV (vvv)
- West Ham United (westhamunited)

## Clubs gekoppeld aan een bestaande club

De oude fansite schrijft deze clubs anders dan de club in de database.

- Cambuur Lwd. (cambuurleeuwarden): club SC Cambuur
- Eindhoven (eindhoven): club FC Eindhoven
- Emmen (emmen): club FC Emmen
- Excelsior (excelsior): club Excelsior Rotterdam
- FC Zwolle (fczwolle): club PEC Zwolle
- Roda JC (rodajc): club Roda JC Kerkrade
- Sparta (sparta): club Sparta Rotterdam
- Stormvogels Telstar (stormvogelstelstar): club Telstar

20 clubs hebben dezelfde naam als in de oude fansite.

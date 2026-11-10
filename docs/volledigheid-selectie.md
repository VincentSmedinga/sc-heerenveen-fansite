# Hoe volledig is de selectie van een seizoen?

Dit is het antwoord op issue #745.
Per seizoen geven we een kans dat de lijst met spelers iedereen bevat die in de selectie zat, ook wie niet speelde.
Het is een schatting en geen gemeten waarheid, en elk getal op de site zegt dat ook.
De regel staat in `apps/importer/src/squad-completeness.ts` (`squadCompleteness`).
De functie leest niets en vraagt niets: de aanroeper geeft de gegevens van één seizoen.

## De regel

- De kans begint bij het plafond van de beste bron die het seizoen heeft.
  Een bron kan maar zoveel weten: een tabel van wie speelde kent de bank niet.
- Controles verlagen de kans als ze uitvallen.
  Ze verhogen haar nooit.
- Een controle die niet kan draaien, verandert niets.
  Dat staat in de lijst met controles als `unavailable`.
- De kans is een geheel getal van 0 tot en met 100.
  Het niveau volgt uit de kans: `compleet` vanaf 80, `bijna` van 55 tot 80, `deels` van 25 tot 55, `weinig` van 1 tot 25 en `onbekend` bij 0 (ook zonder spelers).

### De plafonds

| Bron           | Plafond | Wat de bron kent                                  |
| -------------- | ------- | ------------------------------------------------- |
| `selectie`     | 95      | de hele selectie, met de bank                     |
| `engels`       | 70      | selectie en transfers van de Engelse pagina       |
| `statistieken` | 60      | wie speelde, niet wie op de bank bleef            |
| `wikidata`     | 50      | wie een pagina heeft met sc Heerenveen als club   |
| `transfers`    | 40      | wie kwam of ging, niet wie bleef                  |
| `doelpunten`   | 30      | wie scoorde                                       |
| `verslag`      | 30      | wie het beheer uit een wedstrijdverslag toevoegde |
| `redactie`     | 30      | wie de redactie in het beheer toevoegde           |

De volgorde en het plafond van `selectie` leggen de tests vast.
Een bron met meer spelers komt nooit boven zijn plafond.

### De controles

| Controle  | Wanneer ze uitvalt                                                                                                   | Wat er dan overblijft                                       |
| --------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `size`    | minder dan 20 spelers                                                                                                | hoogstens 45                                                |
|           | minder dan 15 spelers                                                                                                | hoogstens 20                                                |
| `scorers` | een doelpuntenmaker van ons uit `match_goals` staat niet in de lijst (op persoon of op naam zonder accenten)         | hoogstens 50, naar rato van het aandeel dat er wel in staat |
| `matches` | alleen bij de bron `statistieken`: de wedstrijden van de tabel tellen op tot minder dan 11 maal 34                   | hoogstens 45                                                |
| `goals`   | de doelpunten van de tabel tellen op tot minder dan de doelpunten van ons in `match_goals` (zonder eigen doelpunten) | hoogstens 45                                                |

Eén ontbrekende doelpuntenmaker brengt de kans dus onder `bijna`.
De naam is de terugval, ook voor een doelpuntenmaker met een persoon: de Engelse selecties hebben geen personen (#743), dus alleen de naam kan hen vinden.
Een Engelse selectie wordt daarom hoogstens `bijna`, het plafond van 70.
`scorers` en `goals` kunnen niet draaien in een seizoen zonder doelpunten in de database.
`matches` en `goals` kunnen niet draaien als de tabel geen wedstrijden of doelpunten geeft.

## De meting

De meting is gedaan op 6 november 2026 op de tien seizoenen met een tabel met (bijna) de hele selectie.
Een wegwerpscript buiten de repository haalde eenmalig 19 pagina's op met de fetcher, en las ze met de lezers van #740 (`readSeasonStatistics`), #741 (`readSeasonSelection`), #742 (`readSeasonTransfers`) en #743 (`readEnglishSquad`).
De referentie is de tabel van het seizoen: de tabel Statistieken voor 2005/06, de sectie Selectie voor 2008/09 tot en met 2017/18, en de tabel Spelers voor 2022/23 en 2023/24.
Het aandeel is hoeveel van die spelers een andere bron alleen had gevonden, op de pagina van de speler en anders op zijn naam zonder accenten.

| Seizoen | Selectie | Transfers     | Engels        | Speelde      | Scoorde      |
| ------- | -------- | ------------- | ------------- | ------------ | ------------ |
| 2005/06 | 33       | geen lijst    | geen pagina   | 28 (85%)     | 14 (42%)     |
| 2008/09 | 36       | 36%           | geen pagina   | geen cijfers | geen cijfers |
| 2009/10 | 27       | 26%           | 81%           | geen cijfers | geen cijfers |
| 2013/14 | 23       | 26%           | geen pagina   | geen cijfers | geen cijfers |
| 2014/15 | 30       | 40%           | geen pagina   | geen cijfers | geen cijfers |
| 2015/16 | 29       | 34%           | geen pagina   | geen cijfers | geen cijfers |
| 2016/17 | 31       | 23%           | geen pagina   | geen cijfers | geen cijfers |
| 2017/18 | 30       | 20%           | geen pagina   | geen cijfers | geen cijfers |
| 2022/23 | 22       | geen lijst    | geen selectie | geen cijfers | geen cijfers |
| 2023/24 | 29       | niet te lezen | 97%           | 26 (90%)     | 15 (52%)     |

Wat de tabel niet kan zeggen:

- Alleen 2005/06 en 2023/24 hebben wedstrijden en doelpunten per speler, dus alleen daar is te meten wie speelde en wie scoorde.
  De pagina's van 2008/09 tot en met 2017/18 geven geen cijfers, en op de pagina van 2022/23 ontbreken ze door de kolomkoppen.
- De Engelse Wikipedia heeft voor 2009/10 en 2023/24 een pagina die de lezer leest.
  Voor 2008/09 en 2013/14 tot en met 2017/18 bestaat de pagina niet onder de titel `JJJJ–JJ SC Heerenveen season`, en 2022/23 heeft geen selectie.
- De lijst met transfers van 2023/24 heeft een kolomkop die `readSeasonTransfers` niet kent, dus dat seizoen geeft een fout.
  De lezer dekt 2006/07 tot en met 2017/18 en dat seizoen valt daarbuiten.
- De doelpuntenmakers (`doelpunten`) staan alleen op de pagina van 2006/07 in een eigen lijst.
  Het aandeel dat scoorde is daarom uit de tabellen gerekend en geen lezer van een lijst.

### De grootte van een selectie

De tien seizoenen hebben 33, 36, 27, 23, 30, 29, 31, 30, 22 en 29 spelers.
Het kleinste is 22, de mediaan is 29,5 en het grootste is 36.
Daarom is een lijst van minder dan 20 spelers verdacht (hoogstens 45) en een lijst van minder dan 15 bijna zeker onvolledig (hoogstens 20).

### De plafonds uit de meting

- Een tabel met de hele selectie heeft alles wat hij moet hebben: 95.
- Een tabel van wie speelde vindt 85% en 90% van de selectie, dus meer dan de helft maar niet alles: 60.
- De Engelse pagina vindt 81% en 97%, en heeft soms een speler minder dan de tabel: 70.
- De transfers vinden 20% tot 40%: 40, het hoogste dat we gemeten hebben.
- Wie scoorde, is 42% en 52% van de selectie: 30, onder de transfers omdat een lijst van doelpuntenmakers alleen de aanvallende helft kent.
- Wikidata konden we niet meten, want er is geen lezer.
  Het plafond van 50 is het getal uit het issue.

## De kans per seizoen en bron

Dit is wat de regel geeft als een seizoen alleen die bron heeft, met het aantal spelers tussen haakjes.
Een seizoen zonder de bron staat als n.v.t.
De controles met de database (`scorers` en `goals`) draaien hier niet.

| Seizoen | Eigen tabel       | Alleen statistieken | Alleen transfers | Alleen doelpuntenmakers |
| ------- | ----------------- | ------------------- | ---------------- | ----------------------- |
| 2005/06 | 60 (bijna, 33)    | de tabel zelf       | n.v.t.           | 20 (weinig, 14)         |
| 2008/09 | 95 (compleet, 36) | n.v.t.              | 40 (deels, 25)   | n.v.t.                  |
| 2009/10 | 95 (compleet, 27) | n.v.t.              | 40 (deels, 17)   | n.v.t.                  |
| 2013/14 | 95 (compleet, 23) | n.v.t.              | 40 (deels, 18)   | n.v.t.                  |
| 2014/15 | 95 (compleet, 30) | n.v.t.              | 40 (deels, 19)   | n.v.t.                  |
| 2015/16 | 95 (compleet, 29) | n.v.t.              | 40 (deels, 17)   | n.v.t.                  |
| 2016/17 | 95 (compleet, 31) | n.v.t.              | 40 (deels, 15)   | n.v.t.                  |
| 2017/18 | 95 (compleet, 30) | n.v.t.              | 20 (weinig, 11)  | n.v.t.                  |
| 2022/23 | 95 (compleet, 22) | n.v.t.              | n.v.t.           | n.v.t.                  |
| 2023/24 | 95 (compleet, 29) | 60 (bijna, 26)      | n.v.t.           | 30 (deels, 15)          |

De volgorde is overal dezelfde: de eigen tabel, dan wie speelde, dan de transfers, dan de doelpuntenmakers.
Een seizoen met alleen transfers krijgt nooit meer dan 40, ook niet als de lijst groter is.
2005/06 heeft een tabel van wie speelde en geen bank, dus daar is 60 de kans van de tabel zelf.

## Wat dit niet doet

- Het slaat niets op (dat is #746) en zegt niets op de site (dat is #747).
- Het kijkt niet naar de pagina's zelf, zoals hoe oud ze zijn of wie ze wijzigde: dat vraagt de API, die de `robots.txt` weert.
- Het schat niet met twee bronnen tegelijk (vangst en terugvangst).

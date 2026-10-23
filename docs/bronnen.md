# Bronnen

Dit document beoordeelt de bronnen die we voor de site hebben overwogen: 24 bronnen met hun feeds.
Elke bron krijgt één besluit, met een reden.
De bronnen met het besluit "nemen" staan in het register (`realSources` in `packages/db/src/seed.ts`) en draaien mee in de import.
Dit document is de enige plek met de lijst; de andere documenten verwijzen hiernaartoe.
Ons eigen forum, sc Heerenveen Forum, staat ook in het register (#15); het is geen nieuwsbron en valt buiten deze beoordeling.

De besluiten zijn voorstellen, tot de projecteigenaar de pull request samenvoegt.
Het beleid erachter staat in _Een bron nemen we als zijn feed over de club gaat en `robots.txt` ons toelaat_ in [`beslissingen.md`](beslissingen.md).

## De controle van 24 oktober 2026

Op 24 oktober 2026 hebben we elke feed en elke `robots.txt` één keer opgehaald.
Alleen bij De Telegraaf draaiden we daarna de importer lokaal, om te zien dat hij de feed zonder aanpassing leest.
We deden dat met de user agent van de importer, `scHeerenveenFansite/0.1.0 (+https://github.com/VincentSmedinga/sc-heerenveen-fansite)`.
Een pad dat `robots.txt` voor ons weigert, hebben we niet opgehaald.
Een feed die doorverwees, hebben we op het nieuwe adres één keer opgehaald.
Wat we vonden, is een momentopname van die dag.

- **Wat we tellen:** het aantal berichten, de datum van het nieuwste (in UTC) en hoeveel berichten over sc Heerenveen gaan.
  Een bericht gaat over de club als "Heerenveen" in de kop of in de categorieën staat, zonder op hoofdletters te letten.
  Staat het woord alleen in de intro, dan zeggen we dat erbij.
  Heerenveen is ook een plaats, dus de telling kan iets te hoog zijn.
- **Of de feed werkt:** de feed is geldige RSS of Atom en de importer leest hem (dezelfde code als de import, `readFeed`).
- **Betaalmuur:** de feed zegt zelf welke berichten achter de betaalmuur staan.
  De Leeuwarder Courant en De Telegraaf doen dat met het element `<premium>`, Voetbal International met een categorie `PRO`.
  Staat er bij een bron niets over de betaalmuur, dan geeft de feed geen teken.
- **`robots.txt`:** we lezen de regels voor onze user agent met dezelfde code als de fetcher.
  Een `robots.txt` die niet bestaat (404) laat alles toe.
  Veel bronnen weigeren in hun `robots.txt` bij naam crawlers van AI-bedrijven; wij staan niet in die lijsten.
- **De voorwaarden:** we lazen de pagina met voorwaarden van de bron, voor zover die openbaar en te vinden was.
  Van de Leeuwarder Courant, De Telegraaf, het Algemeen Dagblad en De Stentor konden we de voorwaarden niet lezen: onze leesdienst kreeg die sites niet te zien, en we hebben dat niet omzeild.
  Bij die vier gaat het alleen om wat hun `robots.txt` zegt, waarin de voorbehouden staan en dat naar de voorwaarden verwijst.
  Is er geen pagina met voorwaarden, dan staat dat erbij.

### Wat we standaard tonen

Dit geldt voor elke bron, tenzij er bij de bron iets anders staat.
We tonen de kop, de link, de naam van de bron en de tijd van publicatie.
We tonen geen intro, geen foto en geen ingesloten inhoud.
Een bericht achter de betaalmuur krijgt de tekst "voor abonnees".
Dat volgt uit principe 1 en 2 van het hoofdstuk Redactie van Storybook, en elke bron in het register heeft deze strengste instelling.
Meer dan dit tonen we alleen met schriftelijke toestemming van de bron.
Bij elke bron staat of de voorwaarden daar iets over zeggen.

### De besluiten

- **Nemen:** de berichten in de feed gaan (bijna) allemaal over sc Heerenveen en `robots.txt` laat ons de feed lezen.
- **Nemen na het relevantiefilter (#74):** een brede feed met regelmatig berichten over de club, die ook over andere onderwerpen gaat.
  Het filter is er nog niet, dus deze bronnen staan nog niet in het register.
- **Eerst toestemming:** de bron moet eerst schriftelijk ja zeggen.
- **Afwijzen:** de feed werkt niet, gaat niet over sc Heerenveen, of `robots.txt` weigert ons.
  De feeds van andere clubs vallen hieronder, want de site gaat over sc Heerenveen.

Een voorbehoud tegen datamining in `robots.txt` of de voorwaarden staat bij de bron.
Het houdt het besluit "nemen" niet tegen zolang de feed voor ons openstaat.
Zegt een bron dat we moeten stoppen, dan zetten we hem meteen uit (`enabled` in het register) en schrijven we dat hier op.

### Overzicht

| Besluit                             | Bronnen                                                                                                                                                                                                              |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nemen                               | Leeuwarder Courant, Voetbal International (tagfeed), De Telegraaf                                                                                                                                                    |
| Nemen na het relevantiefilter (#74) | Voetbal International (brede feed), NOS, Algemeen Dagblad, ESPN NL, Omrop Fryslân                                                                                                                                    |
| Eerst toestemming                   | sc Heerenveen (officieel nieuws)                                                                                                                                                                                     |
| Afwijzen                            | RTV Noord, RTV Drenthe, RTV Oost, Omroep Gelderland, RTV Utrecht, Omroep Flevoland, NH Nieuws, Omroep West, Rijnmond, Omroep Zeeland, Omroep Brabant, L1 Nieuws, Eredivisie.nl, De Stentor, FC Groningen, PEC Zwolle |

## Nemen

### Leeuwarder Courant

Al in het register (#72).

- **Domein:** `www.lc.nl`
- **Soort:** nieuws, regionaal dagblad
- **Feed:** `https://www.lc.nl/sport/sc-heerenveen/rss/`
  - Werkt: ja, RSS 2.0 met 50 berichten; het nieuwste is van 23 oktober 2026, het oudste van 15 augustus 2026.
  - Over sc Heerenveen: 47 van de 50 noemen Heerenveen in de kop of de categorieën.
  - Betaalmuur: ja, 8 van de 50 berichten staan erachter.
- **`robots.txt`:** laat ons de feed toe.
  Bovenaan staat een voorbehoud: alle rechten zijn voorbehouden, de inhoud is alleen voor persoonlijk gebruik, en de site mag niet worden gebruikt voor tekst- en datamining, scrapen of het automatisch verzamelen van gegevens.
  Het verwijst daarvoor naar artikel 4 van de Europese richtlijn voor auteursrecht in de digitale eengemaakte markt en naar de voorwaarden van de site.
- **Voorwaarden:** niet gelezen (zie _De controle_).
- **Meer tonen:** het voorbehoud zegt dat we de inhoud niet mogen hergebruiken; meer dan de standaard kan alleen met toestemming.
- **Besluit: nemen.**
  De feed gaat bijna helemaal over de club en `robots.txt` laat ons de feed lezen.
  Het voorbehoud tegen datamining houdt dat niet tegen; we tonen alleen de kop, de link, de bronnaam en de tijd.

### Voetbal International, de tagfeed over sc Heerenveen

Al in het register (#142).

- **Domein:** `www.vi.nl`
- **Soort:** nieuws, landelijk voetbaltijdschrift
- **Feed:** `https://www.vi.nl/feed/news.xml?tag=sc-heerenveen`
  - Werkt: ja, RSS 2.0 met 24 berichten; het nieuwste is van 21 oktober 2026, het oudste van 8 oktober 2026.
  - Over sc Heerenveen: alle 24 hebben Heerenveen in de categorieën, 13 ook in de kop.
  - Betaalmuur: ja, 5 van de 24 berichten hebben de categorie `PRO` (het patroon `vi.nl/pro`).
- **`robots.txt`:** laat ons de feed toe.
  Alleen `/admin/`, `/requests/`, `/zoeken` en een paar andere paden zijn gesloten.
  Er staat geen voorbehoud tegen datamining.
- **Voorwaarden:** de pagina met de feeds zegt dat ze dienen om bezoekers van je eigen site het laatste nieuws te tonen, zonder voorwaarden.
  Het colofon zegt dat overnemen, bewaren of verspreiden van inhoud schriftelijke toestemming van de uitgever vraagt, en houdt de auteurs- en databankrechten voorbehouden.
  Over scrapen of datamining staat niets.
  De twee teksten verschillen dus: de feedpagina nodigt uit om het nieuws te tonen, het colofon vraagt toestemming voor overnemen.
  Wij lezen een kop met een link onder het eerste; geen jurist heeft die afweging getoetst.
- **Meer tonen:** ja, de uitgever vraagt toestemming voor overnemen; we vragen die voor meer dan de standaard (#35).
- **Besluit: nemen.**
  Alle berichten in de feed hebben de club als categorie, en `robots.txt` laat ons de feed lezen.
  De pagina met de feeds nodigt uit om het nieuws te tonen.

### De Telegraaf

- **Domein:** `www.telegraaf.nl`
- **Soort:** nieuws, landelijk dagblad
- **Feed:** `https://www.telegraaf.nl/tag/sc-heerenveen/rss/`
  - Werkt: ja, RSS 2.0 met 50 berichten; het nieuwste is van 19 oktober 2026, het oudste van 21 februari 2026.
    Dat is ongeveer anderhalf bericht per week.
  - Over sc Heerenveen: 31 van de 50 noemen Heerenveen in de kop, en 42 in de kop of de intro.
    De categorieën noemen de club niet.
    De andere acht gaan over andere clubs en spelers.
  - Betaalmuur: ja, 8 van de 50 berichten staan erachter.
- **`robots.txt`:** laat ons de feed toe.
  Het heeft hetzelfde voorbehoud als dat van de Leeuwarder Courant: alle rechten voorbehouden, niet voor tekst- en datamining, scrapen of automatisch verzamelen van gegevens, met verwijzing naar artikel 4 van de richtlijn en naar de voorwaarden.
  Daarnaast weigert het een lijst AI-crawlers bij naam.
- **Voorwaarden:** niet gelezen (zie _De controle_).
- **Meer tonen:** het voorbehoud zegt dat we de inhoud niet mogen hergebruiken; meer dan de standaard kan alleen met toestemming.
- **Besluit: nemen.**
  De feed is het onderwerp "sc Heerenveen" van de krant zelf en de grote meerderheid van de berichten noemt de club; `robots.txt` laat ons de feed lezen.
  Het voorbehoud tegen datamining houdt dat niet tegen.
- **Importer:** leest de feed zonder aanpassing.
  Een lokale run op 24 oktober 2026 bewaarde 50 berichten, waarvan 8 achter de betaalmuur.

## Nemen na het relevantiefilter (#74)

Deze feeds zijn breed.
Ze staan niet in het register, want het filter dat de berichten over de club eruit haalt, is er nog niet.
Een telling op één momentopname van een paar dagen zegt weinig over hoe vaak de club erin staat; dat meten we bij #74.

### Voetbal International, de brede feed

De bron staat al in het register (zie boven), maar deze feed niet.

- **Feed:** `https://www.vi.nl/feed/news.xml`
  - Werkt: ja, RSS 2.0 met 24 berichten; het nieuwste is van 23 oktober 2026, het oudste van dezelfde dag.
  - Over sc Heerenveen: geen enkel bericht in de kop, de categorieën of de intro.
  - Betaalmuur: ja, 1 van de 24 berichten heeft de categorie `PRO`.
- **`robots.txt`, voorwaarden en meer tonen:** zoals boven.
- **Besluit: nemen na het relevantiefilter (#74).**
  De feed bevat alle voetbalnieuws van het blad, en daar staat de club regelmatig tussen.
  De tagfeed hierboven bevat al wat over de club gaat.

### NOS

- **Domein:** `nos.nl` (de feeds staan op `feeds.nos.nl`)
- **Soort:** nieuws, publieke omroep
- **Feed:** `https://feeds.nos.nl/nosvoetbal`
  - Werkt: ja, RSS 2.0 met 20 berichten; het nieuwste is van 23 oktober 2026, het oudste van 21 oktober 2026.
  - Over sc Heerenveen: geen enkel bericht in de kop, de categorieën of de intro.
  - Betaalmuur: nee; de feed geeft er geen teken van.
- **`robots.txt`:** `feeds.nos.nl` heeft er geen (404), dus alles mag.
- **Voorwaarden** (`over.nos.nl/organisatie/regelgeving/`): bots en AI-systemen mogen niet automatisch gegevens verzamelen, tenzij NOS dat uitdrukkelijk toestaat.
  Anderen mogen NOS-inhoud delen voor persoonlijk, niet-commercieel gebruik, en linken naar NOS-pagina's mag.
  Een voorbehoud op grond van artikel 4 staat er niet; over RSS-feeds staat er niets.
  De pagina `nos.nl/feeds` somt de feeds op en noemt geen voorwaarden.
- **Meer tonen:** de voorwaarden vragen toestemming voor kopiëren en verspreiden.
- **Besluit: nemen na het relevantiefilter (#74).**
  De feed gaat over het voetbal in Nederland en daarbuiten, met de Eredivisie als een groot deel.
  De voorwaarden noemen automatisch verzamelen zonder toestemming; NOS biedt de feed zelf aan, maar dat leggen we bij #74 nog eens voor.

### Algemeen Dagblad

- **Domein:** `www.ad.nl`
- **Soort:** nieuws, landelijk dagblad
- **Feed:** `https://www.ad.nl/voetbal/rss.xml`
  - Werkt: ja, RSS 2.0 met 30 berichten; het nieuwste is van 23 oktober 2026, het oudste van 22 oktober 2026.
  - Over sc Heerenveen: geen enkel bericht in de kop, de categorieën of de intro.
  - Betaalmuur: ja, 8 van de 30 berichten hebben `<dpp:paid>true</dpp:paid>`.
- **`robots.txt`:** laat ons de feed toe.
  Bovenaan staat een voorbehoud van DPG Media: de auteurs-, naburige en databankrechten zijn voorbehouden, de inhoud is voor persoonlijk, niet-commercieel gebruik, en gegevens verzamelen met scrapen of een andere geautomatiseerde werkwijze is niet toegestaan.
  Het verwijst naar de gebruiksvoorwaarden van DPG Media.
  Daarnaast weigert het een lijst AI-crawlers bij naam.
- **Voorwaarden:** niet gelezen (zie _De controle_).
- **Meer tonen:** het voorbehoud zegt dat we de inhoud niet mogen hergebruiken; meer dan de standaard kan alleen met toestemming.
- **Besluit: nemen na het relevantiefilter (#74).**
  De feed bevat het voetbalnieuws van de krant, met de Eredivisie als een groot deel; het voorbehoud tegen datamining houdt dat niet tegen.
- **Importer:** de adapter kent het teken `<dpp:paid>` niet, dus berichten achter de betaalmuur zouden niet als "voor abonnees" worden getoond.
  Dat moet er eerst komen (zie _Wat de importer nog mist_).

### ESPN NL

- **Domein:** `www.espn.nl`
- **Soort:** nieuws, voetbalsite
- **Feed:** `https://www.espn.nl/espn/rss/soccer/news`
  - Werkt: ja, RSS 2.0 met 25 berichten; het nieuwste is van 23 oktober 2026.
    De tijden staan met de zone `EST`, die de importer niet kent.
  - Over sc Heerenveen: geen enkel bericht in de kop, de categorieën of de intro.
  - Betaalmuur: nee; de feed geeft er geen teken van.
- **`robots.txt`:** laat ons de feed toe.
  Veel crawlers, onder meer van AI-bedrijven, zijn bij naam geweigerd; wij staan er niet bij.
- **Voorwaarden** (de gebruiksvoorwaarden van Disney, waar de onderkant van de site naar linkt, uit 2012): de site is alleen voor persoonlijk gebruik, hergebruik vraagt schriftelijke toestemming, en geautomatiseerd gebruik met een hoog volume is verboden.
  Over datamining en RSS staat niets.
- **Meer tonen:** hergebruik vraagt schriftelijke toestemming van Disney.
- **Besluit: nemen na het relevantiefilter (#74).**
  De feed gaat over het Nederlandse voetbal, met de Eredivisie als een groot deel.
  Wij lezen één feed, met hoogstens één verzoek per kwartier; of dat onder "een hoog volume" valt, zeggen de voorwaarden niet.
- **Importer:** de adapter leest de tijd met zone `EST` niet.
  Zonder geldige tijd geldt het moment waarop we het bericht voor het eerst zagen (zie _Wat de importer nog mist_).

### Omrop Fryslân

- **Domein:** `www.omropfryslan.nl`
- **Soort:** nieuws, regionale publieke omroep
- **Feed:** `https://www.omropfryslan.nl/rss/index.xml`
  - Werkt: ja, RSS 2.0 met 50 berichten; het nieuwste is van 23 oktober 2026, het oudste van 20 oktober 2026.
  - Over sc Heerenveen: 6 van de 50 noemen Heerenveen in de kop, 3 daarvan ook in de intro.
  - Betaalmuur: nee; de feed geeft er geen teken van.
- **`robots.txt`:** laat ons de feed toe.
  Een lange lijst crawlers, ook van AI-bedrijven, is bij naam geweigerd; wij staan er niet bij.
- **Voorwaarden:** een pagina met voorwaarden of een disclaimer is er niet; alleen een privacyverklaring van Stichting Omrop Fryslân (versie van januari 2019).
  Over automatisch lezen, datamining of hergebruik staat niets.
- **Meer tonen:** de bron zegt er niets over; we vragen toestemming voor meer dan de standaard.
- **Besluit: nemen na het relevantiefilter (#74).**
  De feed is het regionieuws van Friesland, de provincie van de club, waarin sc Heerenveen regelmatig voorkomt (6 van de 50).

## Eerst toestemming

### sc Heerenveen, het officiële nieuws

Hoort bij #16.

- **Domein:** `www.sc-heerenveen.nl`
- **Soort:** club
- **Feed:** een feed van een dienst van een derde (`politepaul.com`), die de nieuwspagina van de club omzet in een feed.
  - Werkt: nee.
    Het adres antwoordt met een 404 en de tekst dat de feed is uitgezet.
  - Over sc Heerenveen: niet te tellen.
  - Betaalmuur: niet te zeggen.
- **`robots.txt`** van `www.sc-heerenveen.nl`: laat alles toe, behalve `/bin/` en `/umbraco/`.
  Er staat geen voorbehoud tegen datamining.
  De dienst van de derde heeft geen `robots.txt` (404).
- **Voorwaarden:** er is geen pagina met voorwaarden, alleen een privacyverklaring van 11 februari 2021.
  Onderaan staat "Auteursrecht voorbehouden".
  Over automatisch lezen, datamining of hergebruik staat niets.
- **Meer tonen:** de bron zegt er niets over; we vragen toestemming voor meer dan de standaard.
- **Besluit: eerst toestemming.**
  Het officiële nieuws van de club vraagt een schriftelijk ja, en de feed loopt via een dienst van een derde die we niet gebruiken.
  Dat valt onder #16.

## Afwijzen

### RTV Noord

- **Domein:** `www.rtvnoord.nl`
- **Soort:** nieuws, regionale publieke omroep
- **Feed:** `https://www.rtvnoord.nl/rss/index.xml`
  - Werkt: ja, RSS 2.0 met 50 berichten; het nieuwste is van 23 oktober 2026, het oudste van 21 oktober 2026.
  - Over sc Heerenveen: geen enkel bericht in de kop, de categorieën of de intro.
  - Betaalmuur: nee.
- **`robots.txt`:** laat ons de feed toe; een lange lijst crawlers, ook van AI-bedrijven, is bij naam geweigerd, wij niet.
- **Voorwaarden:** er is geen pagina met voorwaarden, alleen een privacyverklaring van Stichting RTV Noord.
  Over automatisch lezen, datamining of hergebruik staat niets.
- **Meer tonen:** de bron zegt er niets over.
- **Besluit: afwijzen.**
  De feed is het regionieuws van Groningen, en geen van de 50 berichten gaat over sc Heerenveen.

### RTV Drenthe

- **Domein:** `www.rtvdrenthe.nl`
- **Soort:** nieuws, regionale publieke omroep
- **Feed:** `https://www.rtvdrenthe.nl/rss/index.xml`
  - Werkt: ja, RSS 2.0 met 50 berichten; het nieuwste is van 23 oktober 2026, het oudste van 20 oktober 2026.
  - Over sc Heerenveen: geen enkel bericht in de kop, de categorieën of de intro.
  - Betaalmuur: nee.
- **`robots.txt`:** laat ons de feed toe; een lange lijst crawlers is bij naam geweigerd, wij niet.
- **Voorwaarden** (`Voorwaarden en privacy`, deels van 25 mei 2021): het is niet toegestaan de inhoud op geautomatiseerde wijze te raadplegen, en het systematisch linken ("content aggregation") mag alleen met schriftelijke toestemming.
  Overnemen of publiceren vraagt schriftelijke toestemming.
- **Meer tonen:** toestemming nodig.
- **Besluit: afwijzen.**
  De feed is het regionieuws van Drenthe, en geen van de 50 berichten gaat over sc Heerenveen.
  De voorwaarden verbieden bovendien het automatisch raadplegen.

### RTV Oost

- **Domein:** `www.oost.nl`
- **Soort:** nieuws, regionale publieke omroep
- **Feed:** `https://www.oost.nl/rss/index.xml`
  - Werkt: ja, RSS 2.0 met 50 berichten; het nieuwste is van 23 oktober 2026, het oudste van 20 oktober 2026.
  - Over sc Heerenveen: geen enkel bericht in de kop, de categorieën of de intro.
  - Betaalmuur: nee.
- **`robots.txt`:** laat ons de feed toe; een lange lijst crawlers is bij naam geweigerd, wij niet.
- **Voorwaarden:** er is geen pagina met voorwaarden, alleen een privacyverklaring (april 2024) en een pagina over kunstmatige intelligentie bij de omroep zelf.
  Over automatisch lezen, datamining of hergebruik staat niets.
- **Meer tonen:** de bron zegt er niets over.
- **Besluit: afwijzen.**
  De feed is het regionieuws van Overijssel, en geen van de 50 berichten gaat over sc Heerenveen.

### Omroep Gelderland

- **Domein:** `www.gld.nl`
- **Soort:** nieuws, regionale publieke omroep
- **Feed:** `https://www.gld.nl/rss/index.xml`
  - Werkt: ja, RSS 2.0 met 50 berichten; het nieuwste is van 23 oktober 2026, het oudste van 22 oktober 2026.
  - Over sc Heerenveen: geen enkel bericht in de kop, de categorieën of de intro.
  - Betaalmuur: nee.
- **`robots.txt`:** laat ons de feed toe; een lange lijst crawlers is bij naam geweigerd, wij niet.
- **Voorwaarden** (algemene voorwaarden, zonder datum): het aanbod is alleen voor privégebruik en nooit voor commercieel gebruik.
  Over datamining staat niets.
  Een eigen pagina met RSS-feeds noemt geen voorwaarden.
- **Meer tonen:** de voorwaarden beperken het hergebruik tot privégebruik.
- **Besluit: afwijzen.**
  De feed is het regionieuws van Gelderland, en geen van de 50 berichten gaat over sc Heerenveen.

### RTV Utrecht

- **Domein:** `www.rtvutrecht.nl`
- **Soort:** nieuws, regionale publieke omroep
- **Feed:** `https://www.rtvutrecht.nl/rss/index.xml`
  - Werkt: ja, RSS 2.0 met 50 berichten; het nieuwste is van 23 oktober 2026, het oudste van 21 oktober 2026.
  - Over sc Heerenveen: geen enkel bericht in de kop, de categorieën of de intro.
  - Betaalmuur: nee.
- **`robots.txt`:** laat ons de feed toe; een lange lijst crawlers is bij naam geweigerd, wij niet.
- **Voorwaarden:** er is geen pagina met voorwaarden, alleen een privacyverklaring.
  Over automatisch lezen, datamining of hergebruik staat niets.
  Een eigen pagina met RSS-feeds noemt geen voorwaarden.
- **Meer tonen:** de bron zegt er niets over.
- **Besluit: afwijzen.**
  De feed is het regionieuws van Utrecht, en geen van de 50 berichten gaat over sc Heerenveen.

### Omroep Flevoland

- **Domein:** `www.omroepflevoland.nl`
- **Soort:** nieuws, regionale publieke omroep
- **Feed:** `https://www.omroepflevoland.nl/rss/index.xml`
  - Werkt: nee.
    Het adres antwoordt op 24 oktober 2026 met een 404.
  - Over sc Heerenveen: niet te tellen.
  - Betaalmuur: niet te zeggen.
- **`robots.txt`:** sluit alleen `/nos/`.
- **Voorwaarden:** er is geen pagina met voorwaarden; wel een privacyreglement van 2018 en statuten.
  Over automatisch lezen, datamining of hergebruik staat niets.
- **Meer tonen:** de bron zegt er niets over.
- **Besluit: afwijzen.**
  De feed geeft een 404, en de omroep is die van Flevoland.

### NH Nieuws

- **Domein:** `www.nhnieuws.nl` (de feed staat op `rss.nhnieuws.nl`)
- **Soort:** nieuws, regionale publieke omroep
- **Feed:** `https://rss.nhnieuws.nl/rss/sport`
  - Werkt: ja, RSS 2.0 met 25 berichten; het nieuwste is van 23 oktober 2026, het oudste van 18 oktober 2026.
  - Over sc Heerenveen: geen enkel bericht in de kop, de categorieën of de intro.
  - Betaalmuur: nee.
- **`robots.txt`:** `rss.nhnieuws.nl` heeft er geen (404), dus alles mag.
- **Voorwaarden:** we vonden geen pagina met voorwaarden.
- **Meer tonen:** de bron zegt er niets over.
- **Besluit: afwijzen.**
  De feed is het sportnieuws van Noord-Holland, en geen van de 25 berichten gaat over sc Heerenveen.

### Omroep West

- **Domein:** `www.omroepwest.nl`
- **Soort:** nieuws, regionale publieke omroep
- **Feed:** `https://www.omroepwest.nl/rss/index.xml`
  - Werkt: ja, RSS 2.0 met 50 berichten; het nieuwste is van 23 oktober 2026, het oudste van 20 oktober 2026.
  - Over sc Heerenveen: geen bericht in de kop of de categorieën, 1 in de intro.
  - Betaalmuur: nee.
- **`robots.txt`:** laat ons de feed toe; een lange lijst crawlers is bij naam geweigerd, wij niet.
- **Voorwaarden** (algemene voorwaarden, privacydeel van 24 mei 2018): koppen mogen via de RSS-feed en ongewijzigd worden overgenomen.
  Al het andere vraagt schriftelijke toestemming.
  Over datamining staat niets.
- **Meer tonen:** toestemming nodig.
- **Besluit: afwijzen.**
  De feed is het regionieuws van Zuid-Holland, en alleen één intro noemt de club.

### Rijnmond

- **Domein:** `www.rijnmond.nl`
- **Soort:** nieuws, regionale publieke omroep
- **Feed:** `https://www.rijnmond.nl/rss/index.xml`
  - Werkt: ja, RSS 2.0 met 50 berichten; het nieuwste is van 23 oktober 2026, het oudste van 22 oktober 2026.
  - Over sc Heerenveen: geen enkel bericht in de kop, de categorieën of de intro.
  - Betaalmuur: nee.
- **`robots.txt`:** laat ons de feed toe; een lange lijst crawlers is bij naam geweigerd, wij niet.
- **Voorwaarden** (disclaimer, zonder datum): koppen mogen via de RSS-feed en ongewijzigd worden overgenomen.
  Kopiëren of publiceren van de rest vraagt vooraf schriftelijke toestemming.
  Over datamining staat niets.
- **Meer tonen:** toestemming nodig.
- **Besluit: afwijzen.**
  De feed is het regionieuws van Rotterdam en omgeving, en geen van de 50 berichten gaat over sc Heerenveen.

### Omroep Zeeland

- **Domein:** `www.omroepzeeland.nl`
- **Soort:** nieuws, regionale publieke omroep
- **Feed:** `https://www.omroepzeeland.nl/rss/index.xml`
  - Werkt: ja, RSS 2.0 met 50 berichten; het nieuwste is van 23 oktober 2026, het oudste van 19 oktober 2026.
  - Over sc Heerenveen: geen enkel bericht in de kop, de categorieën of de intro.
  - Betaalmuur: nee.
- **`robots.txt`:** laat ons de feed toe; een lange lijst crawlers is bij naam geweigerd, wij niet.
- **Voorwaarden:** er is geen pagina met voorwaarden, alleen een privacyverklaring van 9 mei 2019.
  Over automatisch lezen, datamining of hergebruik staat niets.
- **Meer tonen:** de bron zegt er niets over.
- **Besluit: afwijzen.**
  De feed is het regionieuws van Zeeland, en geen van de 50 berichten gaat over sc Heerenveen.

### Omroep Brabant

- **Domein:** `www.omroepbrabant.nl`
- **Soort:** nieuws, regionale publieke omroep
- **Feed:** `https://www.omroepbrabant.nl/rss/index.xml`
  - Werkt: het adres verwijst door (301) naar `https://www.omroepbrabant.nl/rss`, en dat is geldige RSS 2.0 met 25 berichten; het nieuwste is van 23 oktober 2026.
  - Over sc Heerenveen: geen enkel bericht in de kop, de categorieën of de intro.
  - Betaalmuur: nee.
- **`robots.txt`:** laat ons de feed toe; er staat een verwijzing naar een bestand voor AI-modellen in.
- **Voorwaarden:** er is geen pagina met voorwaarden, alleen een privacyverklaring van juni 2020.
  Over automatisch lezen, datamining of hergebruik staat niets.
- **Meer tonen:** de bron zegt er niets over.
- **Besluit: afwijzen.**
  De feed is het regionieuws van Noord-Brabant, en geen van de 25 berichten gaat over sc Heerenveen.

### L1 Nieuws

- **Domein:** `www.l1nieuws.nl`
- **Soort:** nieuws, regionale publieke omroep
- **Feed:** `https://www.l1nieuws.nl/rss/sport.xml`
  - Werkt: ja, RSS 2.0 met 50 berichten; het nieuwste is van 23 oktober 2026, het oudste van 7 oktober 2026.
  - Over sc Heerenveen: geen enkel bericht in de kop, de categorieën of de intro.
  - Betaalmuur: nee.
- **`robots.txt`:** laat ons de feed toe; een lange lijst crawlers is bij naam geweigerd, wij niet.
- **Voorwaarden** (disclaimer en pagina over feeds): de feeds mogen niet voor commerciële doeleinden worden gebruikt.
  Wie ze gebruikt, noemt "L1 Nieuws.nl" als bron, linkt elke kop naar het bericht en past niets aan.
  L1 kan het gebruik stoppen.
  Over datamining staat niets.
- **Meer tonen:** de feeds staan een kop met een link toe; meer vraagt toestemming.
- **Besluit: afwijzen.**
  De feed is het sportnieuws van Limburg, en geen van de 50 berichten gaat over sc Heerenveen.

### Eredivisie.nl

- **Domein:** `eredivisie.nl`
- **Soort:** nieuws, de competitie
- **Feed:** `https://eredivisie.nl/cache/site/EredivisieNL/esi/feeds/news.rss`
  - Werkt: niet gecontroleerd.
    `robots.txt` sluit het pad `/cache/` voor alle crawlers, ook voor ons, dus we hebben de feed niet opgehaald.
  - Over sc Heerenveen: niet te tellen.
  - Betaalmuur: niet te zeggen.
- **`robots.txt`:** sluit onder meer `/cache/`, `/cpresources/` en `/vendor/`.
  Er staat geen voorbehoud tegen datamining in.
- **Voorwaarden** (algemene voorwaarden, "© 2021"): het is verboden software voor datamining, robots, spiders of scrapers te gebruiken om pagina's te volgen of te kopiëren, en om de site massaal te downloaden.
  Gebruik is alleen voor persoonlijke doeleinden, bewaren of verspreiden van tekst, beeld of geluid vraagt schriftelijke toestemming van Eredivisie CV, en links van en naar de site zijn zonder toestemming niet toegestaan.
- **Meer tonen:** toestemming nodig.
- **Besluit: afwijzen.**
  `robots.txt` weigert ons de feed, en de voorwaarden verbieden robots en links zonder toestemming.

### De Stentor

- **Domein:** `www.destentor.nl`
- **Soort:** nieuws, regionaal dagblad
- **Feed:** er is geen feed om te beoordelen; we kennen er geen.
  - Werkt: niet van toepassing.
  - Over sc Heerenveen: niet te tellen.
  - Betaalmuur: niet te zeggen.
- **`robots.txt`:** laat ons toe, behalve enkele paden voor zoeken, inloggen en widgets.
  Het heeft hetzelfde voorbehoud als dat van het Algemeen Dagblad (DPG Media): rechten voorbehouden en geen gegevens verzamelen met scrapen of een andere geautomatiseerde werkwijze.
  Het weigert ook een lijst AI-crawlers bij naam.
- **Voorwaarden:** niet gelezen (zie _De controle_).
- **Meer tonen:** het voorbehoud zegt dat we de inhoud niet mogen hergebruiken; meer dan de standaard kan alleen met toestemming.
- **Besluit: afwijzen.**
  Er is geen feed om te lezen, en de krant schrijft voor de regio rond Zwolle en Apeldoorn, niet over sc Heerenveen.

### FC Groningen

- **Domein:** `www.fcgroningen.nl`
- **Soort:** club
- **Feed:** `https://fcgroningen.nl/nieuws/feed/`
  - Werkt: het adres verwijst door (301) naar `https://www.fcgroningen.nl/nieuws/feed/`.
    Dat is geldige RSS 2.0, maar zonder berichten: het is de feed met reacties op het nieuws, voor het laatst bijgewerkt op 16 november 2022.
  - Over sc Heerenveen: niet van toepassing.
  - Betaalmuur: nee.
- **`robots.txt`:** de website heeft er geen (404), dus alles mag.
- **Voorwaarden:** de algemene voorwaarden gaan over seizoenkaarten, de webwinkel en het stadion.
  Over automatisch lezen, datamining of hergebruik staat niets.
  Onderaan staat "Auteursrechten voorbehouden".
- **Meer tonen:** de bron zegt er niets over.
- **Besluit: afwijzen.**
  Het is een andere club, en de site gaat over sc Heerenveen.
  De feed is bovendien leeg.

### PEC Zwolle

- **Domein:** `peczwolle.nl`
- **Soort:** club
- **Feed:** `https://peczwolle.nl/nieuws/feed/`
  - Werkt: nee.
    Het adres verwijst door naar `https://peczwolle.nl/nieuws/feed`, en dat antwoordt met een 404.
  - Over sc Heerenveen: niet van toepassing.
  - Betaalmuur: niet te zeggen.
- **`robots.txt`:** laat alles toe.
- **Voorwaarden:** er is geen pagina met voorwaarden, alleen een privacyverklaring.
  Over automatisch lezen, datamining of hergebruik staat niets.
  Onderaan staat "© 2026 PEC Zwolle".
- **Meer tonen:** de bron zegt er niets over.
- **Besluit: afwijzen.**
  Het is een andere club, en de site gaat over sc Heerenveen.
  De feed geeft ook een 404.

## Wat de importer nog mist

Alle bronnen met het besluit "nemen" werken met de importer zoals hij is.
Voor deze bronnen met "nemen na het relevantiefilter (#74)" moet er eerst iets bij, buiten het filter zelf:

- **Algemeen Dagblad:** de adapter leest `<dpp:paid>` niet, dus een bericht achter de betaalmuur zou niet worden herkend.
- **ESPN NL:** de adapter leest een tijd met de zone `EST` niet.

Elk daarvan vraagt een eigen issue, zodra de bron aan de beurt is.

# Bronnen

Dit document beoordeelt de bronnen die we voor de site hebben overwogen: 28 bronnen met hun feeds, waaronder vier podcasts.
Elke bron krijgt één besluit, met een reden.
De bronnen met het besluit "nemen" staan in het register (`realSources` in `packages/db/src/seed.ts`) en draaien mee in de import.
Dit document is de enige plek met de lijst; de andere documenten verwijzen hiernaartoe.
Ons eigen forum, sc Heerenveen Forum, staat ook in het register (#15); het is geen nieuwsbron en valt buiten deze beoordeling.

De besluiten zijn voorstellen, tot de projecteigenaar de pull request samenvoegt.
Het beleid erachter staat in _Een bron nemen we als zijn feed over de club gaat en `robots.txt` ons toelaat_ in [`beslissingen.md`](beslissingen.md).

## De controle van 24 oktober 2026

Op 24 oktober 2026 hebben we elke feed en elke `robots.txt` één keer opgehaald.
Bij De Telegraaf en bij de twee podcasten die we nemen draaiden we daarna de importer lokaal, om te zien dat hij de feed zonder aanpassing leest.
We deden dat met de user agent van de importer, `scHeerenveenFansite/0.1.0 (+https://github.com/VincentSmedinga/sc-heerenveen-fansite)`.
Een pad dat `robots.txt` voor ons weigert, hebben we niet opgehaald.
Een feed die doorverwees, hebben we op het nieuwe adres één keer opgehaald.
Wat we vonden, is een momentopname van die dag.
Omrop Fryslân hebben we op 25 oktober 2026 nog eens gelezen, en NOS, het Algemeen Dagblad en ESPN NL op 26 oktober 2026, alle vier met een run van de importer (zie bij de bron).

- **Wat we tellen:** het aantal berichten, de datum van het nieuwste (in UTC) en hoeveel berichten over sc Heerenveen gaan.
  Een bericht gaat over de club als "Heerenveen" in de kop of in de categorieën staat, zonder op hoofdletters te letten.
  Staat het woord alleen in de intro, dan zeggen we dat erbij.
  Heerenveen is ook een plaats, dus de telling kan iets te hoog zijn.
  De tellingen zochten alleen het Nederlandse woord "Heerenveen".
  In het Fries heet de club "Hearrenfean", en dat telden we niet mee (#270).
  Alleen bij Omrop Fryslân en bij Sportcast hebben we het Friese woord nagekeken; bij de andere bronnen kende de telling alleen het Nederlandse woord.
- **Of de feed werkt:** de feed is geldige RSS of Atom en de importer leest hem (dezelfde code als de import, `readFeed`).
- **Betaalmuur:** de feed zegt zelf welke berichten achter de betaalmuur staan.
  De Leeuwarder Courant en De Telegraaf doen dat met het element `<premium>`, Voetbal International met een categorie `PRO` en het Algemeen Dagblad met het element `<dpp:paid>`.
  Staat er bij een bron niets over de betaalmuur, dan geeft de feed geen teken.
- **`robots.txt`:** we lezen de regels voor onze user agent met dezelfde code als de fetcher.
  Een `robots.txt` die niet bestaat (404) laat alles toe.
  Veel bronnen weigeren in hun `robots.txt` bij naam crawlers van AI-bedrijven; wij staan niet in die lijsten.
- **De voorwaarden:** we lazen de pagina met voorwaarden van de bron, voor zover die openbaar en te vinden was.
  Van de Leeuwarder Courant, De Telegraaf, het Algemeen Dagblad en De Stentor konden we de voorwaarden niet lezen: onze leesdienst kreeg die sites niet te zien, en we hebben dat niet omzeild.
  Bij die vier gaat het alleen om wat hun `robots.txt` zegt, waarin de voorbehouden staan en dat naar de voorwaarden verwijst.
  Het Algemeen Dagblad probeerden we op 26 oktober 2026 nog eens, zie bij de bron.
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
  Een feed die ook over andere onderwerpen gaat, nemen we met het relevantiefilter (`club`, #74): de import beoordeelt elke kop, en de site toont alleen wat over de club gaat.
  Dat staat dan bij de bron.
- **Nemen na het relevantiefilter (#74):** een brede feed met regelmatig berichten over de club, die ook over andere onderwerpen gaat.
  Het filter is er nu.
  Deze bronnen staan nog niet in het register: ze komen erin, met het filter `club`, zodra ze aan de beurt zijn.
- **Eerst toestemming:** de bron moet eerst schriftelijk ja zeggen.
- **Afwijzen:** de feed werkt niet, gaat niet over sc Heerenveen, of `robots.txt` weigert ons.
  De feeds van andere clubs vallen hieronder, want de site gaat over sc Heerenveen.

De podcasts staan samen in het deel _Podcasts_, met dezelfde besluiten als de andere bronnen.

Een voorbehoud tegen datamining in `robots.txt` of de voorwaarden staat bij de bron.
Het houdt het besluit "nemen" niet tegen zolang de feed voor ons openstaat.
Zegt een bron dat we moeten stoppen, dan zetten we hem meteen uit (`enabled` in het register) en schrijven we dat hier op.

### Overzicht

| Besluit                             | Bronnen                                                                                                                                                                                                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nemen                               | Leeuwarder Courant, Voetbal International (tagfeed), De Telegraaf, Omrop Fryslân (met het filter), NOS (met het filter), Algemeen Dagblad (met het filter), ESPN NL (met het filter), Omroep Abe (podcast), Radio Camataru (podcast)                          |
| Nemen na het relevantiefilter (#74) | Voetbal International (brede feed)                                                                                                                                                                                                                            |
| Eerst toestemming                   | sc Heerenveen (officieel nieuws)                                                                                                                                                                                                                              |
| Afwijzen                            | RTV Noord, RTV Drenthe, RTV Oost, Omroep Gelderland, RTV Utrecht, Omroep Flevoland, NH Nieuws, Omroep West, Rijnmond, Omroep Zeeland, Omroep Brabant, L1 Nieuws, Eredivisie.nl, De Stentor, FC Groningen, PEC Zwolle, Sportcast (podcast), NOS Voetbalpodcast |

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

### Omrop Fryslân

Al in het register (#258), met het filter `club`.

- **Domein:** `www.omropfryslan.nl`
- **Soort:** nieuws, regionale publieke omroep
- **Feed:** `https://www.omropfryslan.nl/rss/index.xml`
  - Werkt: ja, RSS 2.0 met 50 berichten.
    Op 24 oktober 2026 was het nieuwste van 23 oktober en het oudste van 20 oktober.
    Op 25 oktober 2026 was het nieuwste van 25 oktober (16:23 UTC) en het oudste van 22 oktober (10:10 UTC).
  - Over sc Heerenveen: op 24 oktober 2026 noemden 6 van de 50 Heerenveen in de kop, 3 daarvan ook in de intro.
    Het Friese "Hearrenfean" (en "Feanster") stond op 25 oktober 2026 in geen van de 50 koppen of intro's: de feed is bijna helemaal Nederlandstalig.
  - Betaalmuur: nee; de feed geeft er geen teken van, en de run van 25 oktober bewaarde geen bericht als betaalmuur.
  - Het filter, op 25 oktober 2026: van de 50 berichten kregen 2 de waarde `relevant`, 4 `doubtful` en 44 `irrelevant`.
    De twee `relevant` noemen "sc Heerenveen" in de kop.
    Van de vier `doubtful` noemen er drie alleen "Heerenveen": twee gaan over de plaats, en een is een wedstrijdverslag van de club.
    Het vierde noemt alleen een speler, met zijn volledige naam.
    De projecteigenaar vond de twee clubberichten ten onrechte `doubtful`, en de regels veranderden: "wint" en "verliest" zijn voetbalwoorden, en een volledige naam is genoeg.
    Dezelfde 50 koppen geven met de nieuwe regels 4 `relevant`, 2 `doubtful` en 44 `irrelevant`.
    De twee die `doubtful` blijven, gaan over de plaats.
    Geen bericht over de club staat bij de 44, en geen bericht over iets anders staat bij de `relevant`.
    Met de Friese schrijfwijze en de Friese voetbalwoorden erbij (#270) geven dezelfde 50 koppen dezelfde uitkomst: geen kop veranderde.
    Wat het filter doet, staat in de README van de importer, onder _Het relevantiefilter_.
- **`robots.txt`:** laat ons de feed toe.
  De importer haalde het op 25 oktober 2026 opnieuw op, met zijn eigen user agent.
  De regels voor ons sluiten alleen `/content/`, `/embedded/`, `/data/`, `/inc/`, de paden van de vorm `/*/-`, `/fy/nos/`, `/nl/nos/` en de zoekpagina's; de feed ligt daar niet in.
  Op 24 oktober 2026 zagen we dat een lange lijst crawlers, ook van AI-bedrijven, bij naam is geweigerd en wij er niet bij staan.
  De importer bewaart alleen de regels die voor ons gelden, dus die lijst hebben we op 25 oktober niet opnieuw bekeken.
- **Voorwaarden:** een pagina met voorwaarden of een disclaimer is er niet; alleen een privacyverklaring van Stichting Omrop Fryslân (versie van januari 2019).
  Over automatisch lezen, datamining of hergebruik staat niets.
- **Meer tonen:** de bron zegt er niets over; we vragen toestemming voor meer dan de standaard.
- **Besluit: nemen, met het filter `club`.**
  De feed is het regionieuws van Friesland, de provincie van de club, en sc Heerenveen komt er regelmatig in voor.
  Het filter houdt de rest van de berichten van de site; de twijfelgevallen blijven onzichtbaar en een moderator vindt ze in het beheer.
  Controle van 25 oktober 2026, met een lokale run van de importer.
- **Importer:** leest de feed zonder aanpassing.
  Een run bewaarde alle 50 berichten, zonder er een over te slaan, en alle tijden waren geldig.

### NOS

Al in het register (#307), met het filter `club`.

- **Domein:** `nos.nl` (de feeds staan op `feeds.nos.nl`)
- **Soort:** nieuws, publieke omroep
- **Feed:** `https://feeds.nos.nl/nosvoetbal`
  - Werkt: ja, RSS 2.0 met 20 berichten.
    Op 26 oktober 2026 was het nieuwste van 26 oktober (09:12 UTC) en het oudste van 24 oktober (17:45 UTC).
    Elk bericht heeft een beschrijving met HTML, een afbeelding (`enclosure`), een `guid` en een tijd met zone.
  - Over sc Heerenveen: op 26 oktober 2026 noemde 1 van de 20 koppen "Heerenveen".
    Een tweede bericht, een samenvatting van de speelronde, noemt alleen in de tekst de voetbalsters van sc Heerenveen.
  - Betaalmuur: nee; de feed geeft er geen teken van, en de run van 26 oktober bewaarde geen bericht als betaalmuur.
  - Het filter, op 26 oktober 2026: van de 20 berichten kreeg 1 de waarde `relevant`, 0 `doubtful` en 19 `irrelevant`.
    Het `relevant` bericht is het wedstrijdverslag van de club.
    Geen bericht over de club staat bij de 19, en geen bericht over iets anders staat bij het `relevant`.
    Het filter kijkt alleen naar de kop: de samenvatting van de speelronde noemt het vrouwenteam alleen in de tekst en valt dus af.
    Dat is hier goed, want de site gaat over het eerste mannenelftal.
    Wat het filter doet, staat in de README van de importer, onder _Het relevantiefilter_.
- **`robots.txt`:** `feeds.nos.nl` heeft er geen (404, ook op 26 oktober 2026 opnieuw met de user agent van de importer), dus alles mag.
  Op `nos.nl` zelf weigert `robots.txt` een lijst crawlers van AI-bedrijven bij naam, en wij staan er niet bij; de importer leest alleen de feed, geen pagina's van `nos.nl`.
- **Voorwaarden** (`over.nos.nl/organisatie/regelgeving/`, sinds kort doorverwezen naar `over.nos.nl/organisatie/algemene-voorwaarden-nos/`), opnieuw gelezen op 26 oktober 2026: bots of AI-systemen mogen niet automatisch data verzamelen, tenzij NOS dat uitdrukkelijk toestaat.
  Content kopiëren, bewerken of verspreiden mag niet zonder toestemming.
  Over RSS-feeds staat er niets.
  De pagina `nos.nl/feeds` somt de feeds op, noemt zelf geen voorwaarden en heeft er alleen een link naar in de voettekst.
  Het voorbehoud tegen automatisch verzamelen is een risico dat geen jurist heeft getoetst.
  Schriftelijk toestemming vragen aan NOS hoort bij #35.
- **Meer tonen:** de voorwaarden vragen toestemming voor kopiëren en verspreiden; we tonen niet meer dan de standaard.
  De beschrijving en de afbeelding in de feed bewaren we niet en tonen we niet.
- **Besluit: nemen, met het filter `club`.**
  De feed gaat over het voetbal in Nederland en daarbuiten, met de Eredivisie als een groot deel, en het filter laat alleen de berichten over de club door.
  NOS biedt de feed zelf aan, en we nemen alleen de kop en de link.
  Zegt NOS dat we moeten stoppen, dan zetten we de bron meteen uit (`enabled` in het register), zoals bij elke bron.
  Controle van 26 oktober 2026, met een lokale run van de importer.
  Op 24 oktober 2026 telden we nog 0 berichten over de club in de feed; die telling was een momentopname van twee dagen.
- **Importer:** leest de feed zonder aanpassing.
  Een run bewaarde alle 20 berichten, zonder er een over te slaan, en alle tijden waren geldig.
  Er bestaat geen kolom voor de beschrijving of de afbeelding, dus de importer bewaart ze niet.

### Algemeen Dagblad

Al in het register (#310), met het filter `club`.

- **Domein:** `www.ad.nl`
- **Soort:** nieuws, landelijk dagblad
- **Feed:** `https://www.ad.nl/voetbal/rss.xml`
  - Werkt: ja, RSS 2.0 met 30 berichten.
    Op 26 oktober 2026 was het nieuwste van 26 oktober (08:50 UTC) en het oudste van 24 oktober (18:25 UTC).
    Elk bericht heeft een beschrijving, een auteur, een afbeelding (`media:content` met een `media:thumbnail`), een `guid` die de link is en een tijd in GMT.
  - Over sc Heerenveen: op 26 oktober 2026 noemde 1 van de 30 koppen "Heerenveen".
    Op 24 oktober 2026 telden we er nog 0; die telling was een momentopname van een paar dagen.
  - Betaalmuur: ja, 11 van de 30 berichten hebben `<dpp:paid>true</dpp:paid>` (op 24 oktober 2026 waren het 8).
    De rest heeft `false`.
    De importer herkende op 26 oktober 2026 dezelfde 11 berichten als betaalmuur.
  - Het filter, op 26 oktober 2026: van de 30 berichten kreeg 1 de waarde `relevant`, 0 `doubtful` en 29 `irrelevant`.
    Het `relevant` bericht is het wedstrijdverslag van de club (ADO Den Haag tegen sc Heerenveen) en staat niet achter de betaalmuur.
    Geen bericht over de club staat bij de 29, en geen bericht over iets anders staat bij het `relevant`.
    Wat het filter doet, staat in de README van de importer, onder _Het relevantiefilter_.
- **`robots.txt`:** laat ons de feed toe, ook op 26 oktober 2026 opnieuw gelezen met de user agent van de importer.
  De regels voor alle crawlers (`User-agent: *`) sluiten alleen paden als `/auth`, `/zoeken?query=` en `/inloggen?*`.
  Ook pagina's met `webview` of `widget` en adressen met parameters als `utm_source=` of `redirect_url=` zijn gesloten.
  `/voetbal/rss.xml` ligt daar niet in.
  Bovenaan staat een voorbehoud van DPG Media, in het Nederlands en het Engels.
  De auteurs-, naburige en databankrechten zijn voorbehouden.
  De inhoud van de websites en apps is voor persoonlijk, niet-commercieel gebruik.
  Gegevens zoals tekst, afbeeldingen, audio, video of code verzamelen met scraping of een andere geautomatiseerde werkwijze is niet toegestaan.
  Het verwijst naar de gebruiksvoorwaarden van DPG Media (`www.dpgmedia.nl/gebruiksvoorwaarden`).
  Daarna weigert het bijna dertig crawlers van AI-bedrijven en zoekmachines bij naam (`GPTBot`, `CCBot`, `ClaudeBot` en andere), en wij staan er niet bij.
- **Voorwaarden:** twee teksten, door de projecteigenaar op 26 oktober 2026 in een browser gelezen en aan ons doorgegeven.
  Wij konden de pagina's van DPG Media zelf niet openen: `www.dpgmedia.nl/gebruiksvoorwaarden` stuurde ons door naar een toestemmingspagina ("Privacy Gate"), die we niet hebben doorgeklikt.
  - De gebruiksvoorwaarden van DPG Media (`www.dpgmedia.nl/gebruiksvoorwaarden`) beginnen met de zin dat ze alleen gelden voor het gebruik van de websites in een professionele context en voor de zakelijke producten van DPG Media.
    Ze gelden dus waarschijnlijk niet voor een lezer van het AD, en of ze voor de feed gelden, staat er niet.
  - De voorwaarden voor het gebruik van de website van het AD zeggen dat lezers de websites en apps voor privédoeleinden mogen gebruiken.
    Commercieel gebruik is verboden, en dat noemt ook het (gedeeltelijk) overnemen van content.
    Middelen om de websites te doorzoeken of te indexeren, zoals robots en spiders, mogen niet; zoekmachines moeten zich aan `robots.txt` houden.
    Bij overtreding kan DPG Media de toegang weigeren.
  - Over RSS-feeds, koppen of links naar berichten staat in beide teksten niets.
  - De pagina over copyright van het AD (`www.ad.nl/extra/copyright-auteursrechten-ad~a8dc0021`) is niet gelezen.
  - Wij zijn geen bedrijf en verdienen niets, maar een importer is wel een robot, en we nemen een kop en een link over.
    Of de regel over robots een feed bedoelt die DPG Media zelf aanbiedt, is niet duidelijk.
    Dat is het risico dat geen jurist heeft getoetst.
  - We vragen het AD om schriftelijke toestemming (#35).
- **Meer tonen:** het voorbehoud zegt dat we de inhoud niet mogen hergebruiken; we tonen niet meer dan de standaard.
  De beschrijving, de auteur en de afbeeldingen in de feed bewaren we niet en tonen we niet.
- **Besluit: nemen, met het filter `club`.**
  De feed bevat het voetbalnieuws van de krant, met de Eredivisie als een groot deel, en het filter laat alleen de berichten over de club door.
  DPG Media biedt de feed zelf aan, met een eigen teken voor de betaalmuur, en we nemen alleen de kop en de link.
  Het voorbehoud tegen scrapen en geautomatiseerd verzamelen is een risico dat geen jurist heeft getoetst; de projecteigenaar nam het aan bij het goedkeuren van het issue.
  Zegt DPG Media dat we moeten stoppen, dan zetten we de bron meteen uit (`enabled` in het register), zoals bij elke bron.
  Controle van 26 oktober 2026, met een lokale run van de importer.
- **Importer:** leest `<dpp:paid>true</dpp:paid>` als betaalmuur voor deze bron (#310), per domein zoals bij Voetbal International en de Leeuwarder Courant.
  Een run bewaarde alle 30 berichten, zonder er een over te slaan, en alle tijden waren geldig.
  Er bestaat geen kolom voor de beschrijving, de auteur of de afbeeldingen, dus de importer bewaart ze niet.

### ESPN NL

Al in het register (#311), met het filter `club`.

- **Domein:** `www.espn.nl`
- **Soort:** nieuws, voetbalsite van de sportzender ESPN, onderdeel van Disney
- **Feed:** `https://www.espn.nl/espn/rss/soccer/news`
  - Werkt: ja, RSS 2.0 met 25 berichten.
    Op 26 oktober 2026 (10:34 UTC) was het nieuwste van die dag en het oudste van 24 oktober 2026.
    Elk bericht heeft een kop, een beschrijving, een auteur, een link, een `guid` en een tijd.
    De berichten hebben geen afbeelding; alleen de feed zelf heeft een logo.
  - Over sc Heerenveen: 1 van de 25 koppen noemt Heerenveen, het verslag van ADO tegen sc Heerenveen.
  - Betaalmuur: nee; de feed geeft er geen teken van.
  - Het filter, op 26 oktober 2026: van de 25 berichten kreeg 1 de waarde `relevant`, 0 `doubtful` en 24 `irrelevant`.
    Het `relevant` bericht is het wedstrijdverslag van de club.
    Eén bericht gaat over dezelfde wedstrijd vanuit ADO ("ADO beleeft frustrerende avond"), maar noemt de club niet in de kop.
    Het filter kijkt alleen naar de kop, dus dat bericht is `irrelevant`.
    Geen ander bericht van de 24 gaat over de club.
    De lijsten met namen en woorden blijven zoals ze zijn: een bericht over de tegenstander is geen bericht over de club.
- **`robots.txt`** (opnieuw gelezen op 26 oktober 2026, met de user agent van de importer): laat ons de feed toe.
  Voor alle crawlers zijn een aantal paden dicht, waaronder `/espn/now`, maar niet `/espn/rss/` en niet `/voetbal/artikel/`.
  Tien crawlers zijn bij naam helemaal geweigerd, onder meer `GPTBot`, `CCBot` en `anthropic-ai`; wij staan er niet bij.
- **Voorwaarden:** de twee teksten van Disney zeggen niet hetzelfde, en we weten niet welke voor `www.espn.nl` geldt.
  Opnieuw gelezen op 26 oktober 2026.
  - De Nederlandse gebruiksvoorwaarden (`disneytermsofuse.com/dutch-netherlands/`, gedateerd 16 juli 2012) zijn de tekst waar de onderkant van `www.espn.nl` naar linkt.
    De sites zijn alleen voor persoonlijk gebruik, en niets uit de inhoud mag zonder uitdrukkelijke schriftelijke toestemming voor een ander doel worden gebruikt, gereproduceerd of verspreid.
    Zakelijk gebruik en "geautomatiseerd gebruik met hoog volume" zijn verboden.
    Over robots, spiders, scrapen, datamining en RSS staat niets.
    Zo las dit document de voorwaarden tot nu toe.
  - De Engelse _Disney Terms of Use_ voor de Verenigde Staten (`disneytermsofuse.com/english/`, bijgewerkt op 24 mei 2024) noemen ESPN als een van de merken.
    Ze verbieden om de producten van Disney te benaderen, te kopiëren of te halen met een robot, spider, script of andere geautomatiseerde middelen, en noemen datamining en scrapen uitdrukkelijk.
    Alleen openbare zoekmachines zijn uitgezonderd.
    Dit komt overeen met de strengere lezing van de eerdere bronnenverkenning (de notities van 25 oktober 2026): geen robots, spiders of scrapers zonder schriftelijke toestemming.
  - De Nederlandse tekst is van 2012 en de Engelse van 2024.
    De site linkt naar de Nederlandse; de Engelse is voor de Verenigde Staten en noemt ESPN als merk.
    Welke van de twee voor `www.espn.nl` geldt, kunnen we niet vaststellen.
    Onder de strengste lezing doen we dus iets wat Disney niet toestaat.
- **Meer tonen:** hergebruik vraagt schriftelijke toestemming van Disney; we tonen niet meer dan de standaard.
  De beschrijving en de auteur in de feed bewaren we niet en tonen we niet.
- **Besluit: nemen, met het filter `club`.**
  De feed gaat over het voetbal in Nederland en daarbuiten, met de Eredivisie als een groot deel, en het filter laat alleen de berichten over de club door.
  Het voorbehoud van Disney is een risico dat geen jurist heeft getoetst, in beide lezingen.
  We nemen één feed, met hoogstens één verzoek per kwartier, alleen een kop en een link, en zetten de bron meteen uit als Disney erom vraagt.
  De projecteigenaar nam het voorbehoud aan bij het goedkeuren van het issue (26 oktober 2026).
  Schriftelijk toestemming vragen aan Disney hoort bij #35.
  Controle van 26 oktober 2026, met een lokale run van de importer.
  Op 24 oktober 2026 telden we nog 0 berichten over de club in de feed; die telling was een momentopname van twee dagen.
- **De tijd in de feed:** de tijden staan met de zone `EST`, bijvoorbeeld `Mon, 26 Oct 2026 11:26:08 EST`, maar het is de Nederlandse tijd (zomertijd tot 25 oktober 2026 03:00, daarna wintertijd).
  Dit hebben we vastgesteld met de pagina's van vijf berichten (de pagina geeft de tijd in UTC en in Nederlandse tijd) en met twee bekende momenten:

  | Bericht                   | Feed (zone `EST`)       | Pagina, UTC         | Pagina, Nederlandse tijd |
  | ------------------------- | ----------------------- | ------------------- | ------------------------ |
  | Verslag ADO – Heerenveen  | za 24 okt 2026 22:52:27 | 2026-10-24 20:52:26 | 22:52 (zomertijd)        |
  | Dijkhuizen over VVV-Venlo | za 24 okt 2026 19:27:02 | 2026-10-24 17:23:00 | 19:23 (zomertijd)        |
  | FC Twente klopt AZ        | zo 25 okt 2026 22:44:35 | 2026-10-25 20:55:00 | 21:55 (wintertijd)       |
  | Hadj Moussa, de data      | ma 26 okt 2026 07:14:06 | 2026-10-26 06:00:00 | 07:00 (wintertijd)       |
  | Quiñones, Ballon d'Or     | ma 26 okt 2026 11:26:08 | 2026-10-26 08:24:00 | 09:24 (wintertijd)       |
  - De feed loopt gelijk met de klok aan de muur in Nederland: bij het verslag van de wedstrijd zit 1 seconde tussen de feed en de pagina.
    Bij de andere vier is de feed 4 minuten tot ruim 2 uur later dan de pagina, nooit eerder.
    De tijd in de feed lijkt het laatste moment waarop ESPN het bericht aanpaste.
    Het bericht over Quiñones stond enkele minuten later in de feed met 11:35 in plaats van 11:26.
  - Het einde van de wedstrijd: ADO – sc Heerenveen begon op 24 oktober 2026 om 21:00 Nederlandse tijd.
    Het verslag staat in de feed om 22:52, ruim twee uur na de aftrap: twee keer 45 minuten, de rust en de blessuretijd.
  - Letterlijk gelezen is `EST` min vijf uur ten opzichte van UTC.
    Het nieuwste bericht zou dan 16:26 UTC zijn, terwijl de feed om 10:34 UTC werd opgehaald en zelf `lastBuildDate: Mon, 26 Oct 2026 10:34:26 GMT` zegt.
    Als UTC gelezen zou het nieuwste bericht 52 minuten na het ophalen van de feed staan, en het verslag van de wedstrijd om 00:52 Nederlandse tijd, ruim twee uur na het einde.
  - De overgang naar wintertijd (25 oktober 2026, 03:00) zit in de feed: de berichten van zondag horen bij wintertijd.
    Met zomertijd gelezen zou het bericht van FC Twente (feed 22:44) om 20:44 UTC staan, vóór de publicatie op de pagina (20:55 UTC).

- **Importer:** leest de feed met één aanpassing, de tijd.
  Voor het domein `www.espn.nl` geldt `EST` als `Europe/Amsterdam` (`timeRules` in `apps/importer/src/read-feed.ts`).
  Voor andere feeds leest de importer `EST` nog steeds niet, dus daar geldt het moment waarop we het bericht voor het eerst zagen.
  Een run bewaarde alle 25 berichten, zonder er een over te slaan, en alle 25 tijden waren geldig.
  Er bestaat geen kolom voor de beschrijving, de auteur of het logo, dus de importer bewaart ze niet.
  Verschuift ESPN de tijd van een bericht, dan verschuift hij op de site mee, zoals bij elke bron.

## Nemen na het relevantiefilter (#74)

Deze feeds zijn breed.
Ze staan nog niet in het register.
Het filter dat de berichten over de club eruit haalt, is er nu (#74), en Omrop Fryslân, NOS, het Algemeen Dagblad en ESPN NL (hierboven) draaien ermee.
Een telling op één momentopname van een paar dagen zegt weinig over hoe vaak de club erin staat; dat meten we per bron, met een run van de importer, zoals bij Omrop Fryslân.

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

## Podcasts

Een podcast is een bron van het soort podcast, en een aflevering is een item (#14).
De importer leest de feed met dezelfde lezer als een nieuwsfeed.
De link van een aflevering is het element `link`, de pagina van de aflevering, en nooit de `enclosure`, het MP3-bestand.
Zo sturen we de luisteraar naar de pagina van de maker.
Een aflevering zonder bruikbare `link` slaat de importer over.
Wat we tonen, staat in het issue over het tonen van de afleveringen (#188).

Op 24 oktober 2026 hebben we de vier feeds en hun `robots.txt` één keer opgehaald, met de user agent van de importer.
We telden de afleveringen, de datum van de eerste en de nieuwste (in UTC), en hoeveel afleveringen Heerenveen in de titel of de beschrijving noemen.
Dat is een andere telling dan bij het nieuws, dat de categorieën meetelt, want een podcastfeed heeft die niet.
Voor Omroep Abe en Radio Camataru draaiden we daarna de importer lokaal, en die zette alle afleveringen in de database, zonder een aflevering over te slaan.
De pagina's met voorwaarden van de makers hebben we niet gelezen.

### Omroep Abe

- **Domein:** `omny.fm`
- **Soort:** podcast van de Leeuwarder Courant, wekelijks
- **Feed:** `https://www.omnycontent.com/d/playlist/fdd7ab40-270d-4a1e-a257-acd200da1324/6470c909-db21-4ceb-a53d-b2940145c1ee/06a49ae8-2226-44c4-bbf0-b2940145c83c/podcast.rss`
  - Werkt: ja, RSS 2.0 met 224 afleveringen; de nieuwste is van 19 oktober 2026, de oudste van 6 oktober 2021.
    Dat is ongeveer één aflevering per week.
  - Over sc Heerenveen: 205 van de 224 noemen Heerenveen in de titel of de beschrijving.
  - Link: de pagina van de aflevering op `omny.fm`, zoals `https://omny.fm/shows/omroep-abe/<aflevering>`.
  - Verzoeken: de feed stuurt een `ETag`, dus een run zonder nieuwe aflevering krijgt "niet gewijzigd" in plaats van de feed van bijna 1 MB.
- **`robots.txt`:** op `www.omnycontent.com` staat `Allow: /` voor iedereen.
- **Beschrijving:** in het register staat de tekst van de maker uit het kanaal van de feed, zonder de HTML (zie _De beschrijving van een podcast is die van de maker_ in [`beslissingen.md`](beslissingen.md)).
- **Meer tonen:** alleen met toestemming van de Leeuwarder Courant; het artwork en de beschrijving of shownotes van een aflevering bewaren we niet.
- **Besluit: nemen.**
  De podcast gaat bijna helemaal over de club, heeft een pagina per aflevering en laat ons de feed lezen.

### Radio Camataru

- **Domein:** `radiocamataru.podbean.com`
- **Soort:** podcast van supporters, wekelijks
- **Feed:** `https://feed.podbean.com/radiocamataru/feed.xml`
  - Werkt: ja, RSS 2.0 met 100 afleveringen; de nieuwste is van 19 oktober 2026, de oudste van 5 maart 2024.
  - Over sc Heerenveen: 95 van de 100 noemen Heerenveen in de titel of de beschrijving.
  - Link: de pagina van de aflevering op Podbean, zoals `https://radiocamataru.podbean.com/e/<aflevering>/`.
  - Verzoeken: de feed stuurt een `ETag`.
- **`robots.txt`:** op `feed.podbean.com` sluit alleen een paar paden van Podbean zelf, zoals het zoeken en de profielen; de feed is open.
- **Beschrijving:** in het register staat de tekst van de maker uit het kanaal van de feed.
- **Meer tonen:** alleen met toestemming van de makers; het artwork en de beschrijving of shownotes van een aflevering bewaren we niet.
- **Besluit: nemen.**
  De podcast gaat bijna helemaal over de club, heeft een pagina per aflevering en laat ons de feed lezen.

### Sportcast, van Omrop Fryslân

- **Domein:** `www.omropfryslan.nl`
- **Soort:** podcast over Friese sport
- **Feed:** `https://tydlik.omropfryslan.nl/xml/podcast/788619`
  - Het adres uit het prototype, `argyf2.omropfryslan.nl`, werkt niet meer; de feed staat nu op `tydlik.omropfryslan.nl`.
  - Werkt: ja, RSS 2.0 met 390 afleveringen; de nieuwste is van 19 oktober 2026, de oudste van 31 juli 2018.
  - Over sc Heerenveen: 53 van de nieuwste 200 afleveringen noemen de club in de titel: 2 keer "Heerenveen", 50 keer "Hearrenfean" en 1 keer "Feanster".
    Dat telden we op 25 oktober 2026 met de lookup van Apple Podcasts, die alleen de nieuwste 200 geeft.
    De telling van 24 oktober, 8 van de 390 met "Heerenveen" in de titel of de beschrijving, kende alleen de Nederlandse schrijfwijze; de titels zijn meestal Fries.
  - Link: elke aflevering heeft dezelfde link, de pagina van het programma (`https://www.omropfryslan.nl/fy/podcast/sportcast`), dus geen pagina per aflevering.
- **`robots.txt`:** op `tydlik.omropfryslan.nl` staat `Disallow: /` voor iedereen, dus de fetcher mag de feed niet lezen.
- **Besluit: afwijzen, voor nu.**
  De feed is voor ons gesloten, gaat over Friese sport in het algemeen en heeft geen pagina per aflevering.
  We kunnen Omrop Fryslân later om toestemming en een feed met alleen clubafleveringen vragen.

### NOS Voetbalpodcast

- **Domein:** `podcast.npo.nl`
- **Soort:** podcast over het hele betaalde voetbal
- **Feed:** `https://podcast.npo.nl/feed/nos-voetbalpodcast.xml`
  - Werkt: ja, RSS 2.0 met 664 afleveringen; de nieuwste is van 23 oktober 2026, de oudste van 13 augustus 2018.
  - Over sc Heerenveen: 5 van de 664 noemen Heerenveen in de titel of de beschrijving.
  - Link: het element `link` is het MP3-bestand, dus geen pagina van de aflevering.
- **`robots.txt`:** laat ons de feed toe.
- **Besluit: afwijzen, voor nu.**
  De podcast gaat zelden over de club, en zonder pagina van de aflevering verwijzen we alleen naar een bestand.

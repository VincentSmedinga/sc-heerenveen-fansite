# Importer

## Een herkenbare fetcher die zich aan robots.txt houdt

- **Datum:** 22 oktober 2026
- **Besluit:** alle adapters halen hun gegevens op met één fetcher in `apps/importer`.
  Hij noemt zich `scHeerenveenFansite`, met een link naar de repository, en volgt `robots.txt` volgens RFC 9309.
  Is `robots.txt` niet te lezen, dan haalt hij niets op.
  Hij stuurt geen cookies, doet zich niet voor als browser en vraagt een feed die niet veranderd is met `If-None-Match` en `If-Modified-Since`.
- **Waarom:** een site moet kunnen zien wie wij zijn en ons kunnen weren, met de regels die ze al gebruiken.
  Een strenge lezing van `robots.txt` past bij wat we beloven: we nemen niets wat een bron ons niet wil geven.
  Een feed die niet veranderd is, kost de bron dan bijna niets.
- **Alternatieven:** een user agent die op een browser lijkt; dat komt vaker langs blokkades, maar dat is precies wat we niet willen.
  Of `robots.txt` overslaan voor feeds, zoals veel feedlezers doen omdat een feed bedoeld is om gelezen te worden; dan negeren we een bron die ons wil weren.
  Of een `robots.txt` die niet te lezen is als "alles mag" opvatten; dan halen we misschien iets wat de eigenaar verbiedt.

## robots.txt lezen we met eigen code

- **Datum:** 22 oktober 2026
- **Besluit:** de fetcher leest `robots.txt` met een kleine eigen parser, getest met de voorbeelden uit RFC 9309.
- **Waarom:** we hebben weinig van de regels nodig: onze naam of `*`, `Allow` en `Disallow`, `*` en `$`, en de langste regel wint.
  Dat zijn een paar tientallen regels code, zonder dependency om na te lopen.
- **Alternatieven:** het package `robots-parser` (MIT).
  Dat kan meer, zoals `Crawl-delay` en `Sitemap`, maar het is een dependency, en de laatste versie is van 2023.

## De fetcher meldt elke uitkomst als waarde

- **Datum:** 22 oktober 2026
- **Besluit:** `fetch` van de fetcher gooit geen fout voor wat een bron doet.
  Het antwoord is altijd een van vijf uitkomsten: gelukt, niet gewijzigd, geweigerd door `robots.txt`, wachten (429 of 503) of fout.
  Bij een fout staat een reden in een vaste lijst en een bericht in gewone woorden.
  Bij wachten staat het aantal seconden uit `Retry-After`, of niets als de bron dat niet zegt.
  De inhoud van een antwoord is een rij bytes: de adapter kent de tekenset van zijn feed.
- **Anders dan de RFC:** een 429 op `robots.txt` telt als niet te lezen, niet als "geen `robots.txt`".
  RFC 9309 zegt dat een 4xx betekent dat het bestand er niet is, maar een 429 betekent dat de host ons vraagt te wachten, en dan weten we niet wat hij zou antwoorden.
- **Waarom:** een adapter kan zo geen uitkomst vergeten, de jobplanner (#13) kan elke uitkomst gebruiken voor de gezondheid van een bron, en `Retry-After` kan hij zonder opnieuw te lezen gebruiken.
  Bytes verliezen geen tekens bij een feed die niet in UTF-8 staat.
- **Alternatieven:** fouten gooien en de adapter laten vangen; dat laat een adapter een fout vergeten.
  Of de inhoud als tekst geven; dat is handiger, maar het raadt de tekenset van de bron.

## De Leeuwarder Courant als eerste bron, ondanks het voorbehoud in robots.txt

- **Datum:** 22 oktober 2026
- **Besluit:** we lezen de RSS-feed van de Leeuwarder Courant voor kop, link en bronnaam.
  Tegelijk vragen we om toestemming (#35); zegt de krant nee, dan stoppen we met deze bron.
- **Waarom:** een RSS-feed is gepubliceerd om gelezen te worden, en de regels in `robots.txt` staan elke user agent toe.
  We tonen alleen de kop, de link en de naam, en sturen lezers door naar de krant.
  Het voorbehoud in een commentaar in `robots.txt` is breed geformuleerd, maar spreekt de regels zelf niet tegen.
- **Alternatieven:** eerst om toestemming vragen en wachten met de import.
  Of een andere eerste bron, zonder zo'n voorbehoud.

## De importer bewaart alleen wat we mogen tonen

- **Datum:** 22 oktober 2026
- **Besluit:** `items` heeft alleen kolommen voor de kop, de link, de sleutel, de tijd en de betaalmuur.
  Kolommen voor een intro of een afbeelding komen met de eerste bron die daar toestemming voor geeft.
- **Waarom:** principe 2 van de Redactie: wat we niet mogen tonen, slaan we ook niet op.
  Een kolom die er niet is, kan geen pagina per ongeluk tonen.
  Of een bericht achter de betaalmuur staat, is geen inhoud van de bron, en #73 kan het gebruiken.
- **Alternatieven:** alles uit de feed bewaren en pas bij het tonen filteren.
  Dan staat er inhoud in de database die we niet mogen gebruiken.

## Feeds lezen we met feedsmith

- **Datum:** 22 oktober 2026
- **Besluit:** de adapter leest feeds met `feedsmith` (MIT).
- **Waarom:** Node heeft geen XML-parser.
  `feedsmith` leest RSS, Atom, RDF en JSON Feed, ook met namespaces zoals Dublin Core en Media RSS, dus latere feeds, zoals die van podcasts (#14), passen er ook in.
  Het wordt onderhouden: versie 3 kwam in september 2026.
- **Alternatieven:** `fast-xml-parser` met eigen code die RSS en Atom naar onze velden vertaalt; dat is een laag minder, maar meer eigen code die moet kloppen.
  Of `rss-parser`; die is sinds 2023 niet bijgewerkt.

## De eerste echte bron komt via de seed

- **Datum:** 22 oktober 2026
- **Besluit:** de Leeuwarder Courant komt met haar feed in de seed, naast de testbronnen.
  Zo staat ze lokaal en op acceptatie in het register.
- **Waarom:** het register kent nog geen beheer (#30), en acceptatie krijgt de seed al bij elke start (#78).
- **Gevolg:** hoe echte bronnen op productie in het register komen, beslissen we met de bronnenlijst (#10) en het beheer (#30).
- **Alternatieven:** een migratie die de bron invoegt; dan staan gegevens tussen het schema.
  Of wachten op het beheer.
- **Later:** de echte bronnen komen sinds 26 oktober 2026 op productie via de lijst `realSources` in de seed; zie _De echte bronnen komen op productie via de seed_.
  De Leeuwarder Courant staat sinds dezelfde dag ook niet meer naast de testbronnen op acceptatie.

## Voetbal International als tweede bron

- **Datum:** 23 oktober 2026
- **Besluit:** we lezen de tagfeed van Voetbal International over sc Heerenveen voor kop, link en bronnaam.
  Tegelijk vragen we om toestemming (#35); zegt VI nee, dan stoppen we met deze bron.
- **Waarom:** de feed gaat over de club, komt vaak met nieuws (ongeveer elf berichten per week) en geeft een landelijke blik naast die van de Leeuwarder Courant.
  `robots.txt` staat elke user agent toe en bevat geen voorbehoud over datamining.
- **Alternatieven:** De Telegraaf (gaat alleen over de club, maar ongeveer één bericht per week, en met een voorbehoud tegen datamining), de algemene feed van Omrop Fryslân (te weinig over de club, zonder filter) en het Friesch Dagblad (geen feed over de club).

## De betaalmuur herkent de adapter per bron

- **Datum:** 23 oktober 2026
- **Besluit:** bij VI geldt een bericht als betaald als het de categorie `https://www.vi.nl/pro` heeft.
  De Leeuwarder Courant blijft het element `<premium>` gebruiken.
  De adapter kiest het teken aan de hand van het domein van de bron.
- **Waarom:** de Leeuwarder Courant en VI zeggen het op een andere manier, en een feed zonder zo'n teken heeft geen betaalmuur.
  De categorie is alleen een teken; we bewaren haar niet (zie "De importer bewaart alleen wat we mogen tonen").
- **Alternatieven:** de link controleren op `/pro/`; dat werkt nu ook, maar de categorie is bedoeld om dit te zeggen en de link kan veranderen.

## De opdracht heet `pnpm run import`

- **Datum:** 22 oktober 2026
- **Besluit:** we starten de import met `pnpm run import`, niet met `pnpm import`.
- **Waarom:** `import` is een opdracht van pnpm zelf, die een lockfile van npm of yarn omzet.
  Zonder `run` start pnpm die opdracht en niet ons script, en meldt dat er geen lockfile is.
  Het script heet toch `import`, zodat de naam in het issue, de documentatie en het rooster (#98) dezelfde blijft.
- **Alternatieven:** een andere naam die pnpm niet kent, zoals `pnpm import-feeds`; dan kun je `run` weglaten, maar de naam wijkt af van wat we zeggen: de import.

## Wat feedsmith niet geeft, lezen we er zelf bij

- **Datum:** 22 oktober 2026
- **Besluit:** de adapter noemt twee dependencies zelf, op een exacte versie: `entities` (BSD-2-Clause) en `fast-xml-parser` (MIT).
  Beide zijn al geïnstalleerd, want `feedsmith` gebruikt ze.
  - `entities` zet HTML-entiteiten in een kop om in tekens, met `decodeHTMLStrict`: alleen entiteiten met een puntkomma.
  - `fast-xml-parser` leest in een tweede lezing het element `<premium>` van de Leeuwarder Courant.
    Dezelfde parser controleert ook of de XML goed gevormd is.
- **Waarom:** een kop in CDATA, zoals bij de Leeuwarder Courant, kan HTML bevatten, en `feedsmith` laat de tekst daarin staan.
  `feedsmith` slaat ook elementen over die het niet kent, zoals `<premium>`, en leest een feed die halverwege stopt toch half.
  Met de tweede lezing zien we de betaalmuur en bewaren we niets uit een afgebroken feed.
  Die lezing zet geen entiteiten om, dus een feed kan er geen grote tekst mee opblazen.
- **Alternatieven:** de betaalmuur met een reguliere expressie uit de tekst halen; dat is minder code, maar fragiel bij CDATA en commentaar.
  Of de betaalmuur nog niet lezen; dan klopt de kolom `paywalled` niet.
  Of een eigen tabel met een paar entiteiten; dan blijft elke andere entiteit als tekst in de kop staan.

## Een bericht dat niet klopt, slaan we over

- **Datum:** 22 oktober 2026
- **Besluit:** de adapter slaat een bericht over, en meldt het, als het geen kop heeft, geen `http`- of `https`-link, of een kop, link of sleutel die niet in de kolom past.
  Hij kapt niets af.
  Een bericht zonder geldige tijd krijgt de tijd waarop we het zagen.
  Een tijd is geldig als hij een zone heeft, na 1990 ligt en niet meer dan een dag vooruit.
- **Waarom:** een afgekapte kop of link is niet meer wat de bron publiceert.
  Een tijd zonder zone telt in JavaScript als lokale tijd, en een tijd ver in de toekomst zet een bericht dagenlang bovenaan.
- **Alternatieven:** de kop afkappen met een beletselteken.
  Of een bericht zonder geldige tijd overslaan; dan verliezen we een kop die verder goed is.
- **Later:** zie _We nemen ESPN NL, met het filter `club` en een eigen regel voor de zone EST_.
  Voor het domein `www.espn.nl` geldt een tijd met de zone `EST` nu als Nederlandse tijd; voor elke andere bron is hij nog steeds ongeldig.

## Een bericht heeft een sleutel per bron, en die is hoofdlettergevoelig

- **Datum:** 22 oktober 2026
- **Besluit:** een bericht is uniek op de bron en de sleutel samen (de `guid`, of anders de link).
  De kolom `item_key` vergelijkt hoofdlettergevoelig (`utf8mb4_bin`) en is hoogstens 700 tekens.
- **Waarom:** de collatie van de andere tabellen (`utf8mb4_unicode_ci`) ziet `A` en `a` en `é` en `e` als gelijk.
  Twee verschillende berichten zouden dan één rij worden, en het ene overschrijft het andere zonder dat iemand het merkt.
  Zonder sleutel per bron gaat een bericht dat in twee feeds van dezelfde bron staat, dubbel.
  700 tekens is het meeste dat een unieke index met `source_id` toestaat (3072 bytes).
- **Alternatieven:** een unieke index per feed; dan staat hetzelfde bericht uit twee feeds twee keer in `items`.
  Of een hash van de sleutel; dan kun je de sleutel niet lezen.

## De ETag en Last-Modified bewaren we samen met de berichten

- **Datum:** 22 oktober 2026
- **Besluit:** de adapter bewaart de berichten en de nieuwe `ETag` en `Last-Modified` van een feed in één transactie.
  Lukt het lezen of bewaren niet, dan blijven de oude waarden staan.
- **Waarom:** bewaren we de `ETag` voordat de berichten er staan, en mislukt het bewaren, dan zegt de bron de volgende keer dat niets veranderd is, en missen we die berichten.
- **Alternatieven:** de `ETag` meteen bewaren; dat is eenvoudiger, maar kan berichten laten ontbreken tot de feed verandert.

## De fetcher weigert adressen op een eigen netwerk, en controleert dat bij het verbinden

- **Datum:** 22 oktober 2026
- **Besluit:** de fetcher verbindt niet met een adres dat niet op het openbare internet ligt, zoals `localhost`, `127.0.0.1` of `10.0.0.1`, ook niet na een doorverwijzing.
  Hij gebruikt daarvoor `fetch` en een `Agent` van `undici`, met een `lookup` die het adres controleert waarmee hij echt verbindt.
- **Hoe:** de lijst volgt de registers van IANA voor adressen met een bijzonder doel.
  Van IPv6 is alleen `2000::/3` openbaar, zonder de bijzondere delen daarin, dus een IPv4-adres in IPv6-vorm weigert de fetcher altijd.
  Wijst een naam naar een openbaar adres en naar een adres op een eigen netwerk, dan weigert hij de naam.
  Tests met een eigen webserver geven de fetcher precies de adressen van die servers mee (`testOrigins`); de opdracht `pnpm run import` doet dat nooit, en een omgevingsvariabele kan het niet aanzetten.
- **Waarom:** de importer draait op gedeelde hosting, naast het forum en de database.
  Een bron kan doorverwijzen naar een adres op dat netwerk, of een naam laten wijzen naar zo'n adres, en dan haalt de importer iets op wat niet voor hem bedoeld is.
  Een controle vóór het verzoek mist een naam die bij het verbinden naar een ander adres wijst.
  `fetch` van Node zelf heeft geen haak voor het verbinden; `undici` is de bibliotheek eronder, onderhouden door het Node.js-team.
- **Alternatieven:** het transport zelf schrijven met `node:https` en een eigen `lookup`, met het uitpakken en de grens van 5 MB erbij; geen dependency, maar meer eigen code die moet kloppen.
  Of de naam vooraf opzoeken en daarna `fetch` aanroepen; dat mist een naam die tussendoor verandert.

## Een run neemt een lock, en een tweede run stopt meteen

- **Datum:** 22 oktober 2026
- **Besluit:** de import neemt aan het begin een lock in de database met `GET_LOCK`, met een naam per database, zoals de migraties.
  Is de lock bezet, dan stopt de run meteen, met exitcode 0.
- **Hoe:** `withLock` in `@fansite/db/lock` doet dat voor de import en voor de migraties, elk met een eigen naam: `fansite_import_<database>` en `fansite_migrate_<database>`.
- **Waarom:** _Importtaken via cron_ beloofde een lock, zodat een taak nooit twee keer tegelijk draait.
  Een run die stopt, mist niets, want een kwartier later komt de volgende.
  Er is niets kapot, dus exitcode 0.
  `GET_LOCK` hoort bij de verbinding, dus een proces dat sterft, laat de lock vanzelf los.
- **Alternatieven:** wachten tot de lock vrij is; dan stapelen de runs zich op als er een blijft hangen.
  Of een rij in een tabel als lock; die blijft staan als het proces sterft.

## Elke run komt in de database, en een feed is ongezond na drie mislukte runs op rij

- **Datum:** 22 oktober 2026
- **Besluit:** een tabel legt elke run vast, met per feed de uitkomst, 30 dagen lang.
  Per feed staan de laatste geslaagde run en het aantal mislukte runs op rij.
  Na drie mislukte runs op rij is een feed ongezond.
  Wachten en een weigering door `robots.txt` tellen niet als mislukt.
  `pnpm run import:status` toont de gezondheid; een pagina komt met het beheer (#31).
- **Hoe:** het logboek is twee tabellen: `import_runs` met een rij per run, en `import_results` met een rij per feed per run.
  De gezondheid staat in `feeds` zelf, naast de `ETag`: zo telt hij ook door na 30 dagen, en hoeft het overzicht geen runs na te tellen.
- **Waarom:** één fout kan toeval zijn; drie op rij is drie kwartier.
  Een bron die om rust vraagt of ons weert, is niet kapot.
  Dertig dagen is zo'n 2.900 runs per feed, genoeg om een patroon te zien en weinig opslag.
  Een opdracht werkt lokaal en op de host, zonder een pagina die interne gegevens aan iedereen toont.
- **Alternatieven:** ongezond na één fout, of na een tijd zonder geslaagde run, zoals twee uur.
  Of de runs altijd bewaren.
  Of een pagina met `noindex`, die ook de Coordinator kan lezen (#49).
  Of alleen het logbestand.

## De importer wacht als een bron daarom vraagt, en bewaart robots.txt een dag

- **Datum:** 22 oktober 2026
- **Besluit:** na een 429 of 503 slaat de import een feed over tot het moment uit `Retry-After`, hoogstens een dag, of een uur zonder `Retry-After`.
  Na drie mislukte runs op rij probeert hij de feed eens per uur, tot hij weer slaagt.
  De `robots.txt` van een host bewaart de fetcher hoogstens 24 uur in de database; een die niet te lezen was, bewaart hij niet.
- **Hoe:** `feeds.retry_at` zegt tot wanneer de import een feed overslaat.
  Is een feed ongezond, dan probeert de import hem 59 minuten na de vorige poging opnieuw.
  Cron start een run soms een paar seconden vroeger, en met een uur precies viel de poging dan een run later.
  De fetcher bewaart per origin, zoals `https://www.lc.nl`, de regels die voor ons gelden, in de tabel `robots_txt`.
- **Waarom:** een bron die om rust vraagt, krijgt die.
  Een kapotte feed hoeft geen 96 pogingen per dag.
  RFC 9309 staat toe dat een crawler `robots.txt` 24 uur bewaart, en dat scheelt 95 van de 96 verzoeken per dag per host.
  De database is de enige plek die tussen runs blijft staan: de deploy vervangt de map van de app.
- **Alternatieven:** elke run opnieuw proberen, zoals nu.
  Of uitstel dat steeds langer wordt; dat is meer code voor weinig winst bij één feed.
  Of `robots.txt` in een bestand op de host bewaren.

## Een bron nemen we als zijn feed over de club gaat en `robots.txt` ons toelaat

- **Datum:** 24 oktober 2026
- **Besluit:** we nemen een bron in het register als zijn feed (bijna) alleen over sc Heerenveen gaat en `robots.txt` ons de feed laat lezen.
  Een voorbehoud tegen datamining, in `robots.txt` of de voorwaarden, stopt ons niet voor de kop, de link, de bronnaam en de tijd.
  Vraagt een bron ons te stoppen, dan zetten we hem meteen uit.
- **Waarom:** een kop en een link sturen de lezer naar de journalist (principe 1 van de Redactie), en de fetcher houdt zich aan `robots.txt`.
  Zo laten we meer bronnen zien dan met toestemming vooraf, en een bron die bezwaar heeft, kan het ons zeggen.
  Het risico: een voorbehoud tegen datamining kan ook voor het automatisch lezen van een kop gelden, en geen jurist heeft die afweging getoetst.
  Daarom staat elk voorbehoud in [`bronnen.md`](../bronnen.md), en zetten we een bron direct uit als hij erom vraagt.
- **Gevolg:** De Telegraaf staat met zijn tagfeed in het register, ondanks het voorbehoud in zijn `robots.txt`.
  Bij de keuze voor Voetbal International (#142) was dat voorbehoud nog een reden om De Telegraaf niet te kiezen.
- **Alternatieven:** bij een voorbehoud eerst schriftelijke toestemming vragen; dat is voorzichtiger, maar we missen dan bronnen die zelden antwoorden.
- **Later:** zie _Omrop Fryslân is de eerste regionale bron, met het filter `club` vanaf de seed_; ook een brede feed nemen we, als het relevantiefilter (`club`) erop staat.
- **Later:** zie _We nemen Rijnmond na het relevantiefilter, voor de Rotterdamse tegenstanders_; Rijnmond, op 24 oktober 2026 afgewezen om zijn regionieuws, staat met de feed van de sport in het register.
  Het regionieuws van Rijnmond blijft afgewezen.
- **Later:** zie _We nemen RTV Noord en OOG Groningen_; RTV Noord, op 24 oktober 2026 afgewezen om zijn regionieuws, staat met de feed van de sport in het register.
  Het regionieuws van RTV Noord blijft afgewezen.

## De feeds van andere clubs nemen we niet

- **Datum:** 24 oktober 2026
- **Besluit:** de officiële feeds van FC Groningen en PEC Zwolle nemen we niet over.
- **Waarom:** de site gaat over sc Heerenveen.
  Het eerdere prototype had drie clubs; wij hebben er één.
- **Alternatieven:** ze toch opnemen voor wedstrijden tegen die clubs; dat vraagt een manier om berichten aan een wedstrijd te koppelen, en die is er niet.

## De forumdiscussies komen via de Flarum-API, niet uit de database van het forum

- **Datum:** 23 oktober 2026
- **Besluit:** de importer leest de nieuwste discussies bij de openbare API van het forum, als gast, en bewaart ze in onze eigen database.
  De site leest alleen onze database.
- **Waarom:** Flarum bepaalt zelf wat een gast mag zien, dus een besloten tag of een verborgen discussie komt er niet in.
  We hoeven de regels van het forum niet na te bouwen, en een fout daarin kan niets lekken.
  We hebben geen toegang tot de forumdatabase nodig.
  Die bevat e-mailadressen en wachtwoordhashes van leden, en een gebruiker op de gedeelde hosting kan mogelijk meer lezen dan we nodig hebben.
  De importer en de site hangen niet af van het schema van Flarum, dat bij een update kan veranderen.
  De importer heeft de lock, het logboek en de gezondheid van de bronnen al.
- **Alternatieven:** de database van het forum lezen met een gebruiker met leesrechten; die staat naast de onze bij mijn.host.
  Dat geeft geen vertraging van een kwartier, maar vraagt een tweede verbinding, een kopie van het schema voor tests en onze eigen regels voor wat zichtbaar is.
  Of de database van het forum bij elk bezoek lezen; dan werkt het blok niet meer als die database even wegvalt.
  We komen erop terug als de API voor gasten wegvalt of ons begrenst.

## Welke discussies in het blok komen

- **Datum:** 23 oktober 2026
- **Besluit:** het blok toont de discussies waar het laatst op is gereageerd, in alle tags die een gast ziet, behalve Offtopics en Sport overig.
- **Waarom:** de nieuwste activiteit zit vaak in Offtopics, zoals een algemeen muziektopic.
  Dat zegt een bezoeker van een clubsite weinig.
  De lijst met tags die we weglaten staat op één plek, dus een wijziging is klein.
- **Alternatieven:** alle tags die een gast ziet; dan kan het blok vol staan met discussies die niet over de club gaan.
  Of alleen Wedstrijden, Spelers & staf en Transfers & geruchten; dat is strakker, maar sluit supportersdiscussies uit.

## Het forum is een feed met een eigen lezer, en de discussies worden bij elke run vervangen

- **Datum:** 24 oktober 2026
- **Besluit:** het forum is een bron van het soort forum, en het adres van de lijst met discussies in de API is zijn feed.
  De import leest hem met dezelfde fetcher, lock, logboek en gezondheid als de andere feeds.
  Voor een bron van het soort forum gaat het antwoord naar `read-forum.ts` in plaats van naar de lezer van RSS en Atom.
  Na elke run staan in de tabel `discussions` precies de vier nieuwste discussies die aan de regels voldoen, en niets anders.
- **Hoe:** de lezer vraagt 30 discussies, laat die in een tag die we weglaten vallen, sorteert zelf op het moment van het laatste bericht en houdt de nieuwste vier.
  Een vastgezette discussie kan bij Flarum vooraan staan, dus de sortering van het forum is niet genoeg.
  De fetcher accepteert al elk soort antwoord en negeert de sessiecookie van de API, dus hij hoefde niet te veranderen.
  Het adres van een discussie bouwt de lezer uit het adres van de feed, het id, de slug en het nummer van het laatste bericht: een link uit het antwoord vertrouwen we niet.
  De `slug` in het antwoord begint al met het id, dus de lezer zet het id er niet nog eens voor.
  De lezer slaat een discussie met iets mis over en meldt waarom, zoals bij berichten.
  Een discussie in een tag die niet in het antwoord staat, slaat hij ook over, want die tag kon er een zijn die we weglaten.
  Zijn er discussies in het antwoord en kan er geen worden gelezen, dan is dat een fout en blijven de vorige discussies staan: dat wijst eerder op een verandering in de API dan op een leeg forum.
  Het forum vraagt geen `ETag` of `Last-Modified`: een lege database moet na één run discussies hebben, en de lijst is klein.
  Een run vervangt de rijen van het forum in één transactie, dus een lezer ziet nooit een halve lijst.
- **Waarom:** de machinerie bestaat en is getest, en het forum hoort bij `pnpm run import:status` te staan zoals de andere bronnen.
  Geen geschiedenis van titels of namen bewaren was een eis, en vervangen is de eenvoudigste manier.
- **Alternatieven:** een eigen opdracht voor het forum, met een eigen lock en logboek; dat zijn twee plekken om te bewaken.
  Of de discussies bijwerken en oude weghalen op id; dat is meer code, en een titel die het forum wijzigt zou dan niet vanzelf vervangen worden.
- **Later:** zie _Elke kaart op de homepage toont vijf items, uit één gedeelde waarde_: de lezer houdt nu de nieuwste vijf in plaats van vier.

## Een podcast is een bron, en een aflevering is een rij in `items`

- **Datum:** 24 oktober 2026
- **Besluit:** een podcast staat in het register als bron van het soort podcast, en zijn afleveringen staan in `items`.
  De lezer van RSS leest de feed; een eigen adapter komt er niet.
  De link van een aflevering is het element `link`, de pagina van de aflevering, en nooit de `enclosure`.
- **Waarom:** `feedsmith` leest podcastfeeds al (zie _Feeds lezen we met feedsmith_), en een aflevering heeft dezelfde velden als een bericht: een titel, een link, een GUID en een tijd.
  We hergebruiken zo de sleutel per bron, de ontdubbeling, de lock en de gezondheid.
  Een link naar het MP3-bestand stuurt de luisteraar langs de pagina van de maker, en die pagina is waar we naartoe willen verwijzen (principe 1).
- **Alternatieven:** eigen tabellen `podcasts` en `episodes`, zoals het prototype; dat is dubbele machinerie voor dezelfde velden.
  Of een eigen adapter voor podcasts; die zou niets lezen wat de huidige lezer niet leest.

## Twee van de vier podcasts uit het prototype nemen we

- **Datum:** 24 oktober 2026
- **Besluit:** we nemen Omroep Abe en Radio Camataru.
  De Sportcast van Omrop Fryslân en de NOS Voetbalpodcast nemen we nu niet.
- **Waarom:** we volgen _Een bron nemen we als zijn feed over de club gaat en `robots.txt` ons toelaat_.
  Omroep Abe (205 van 224 afleveringen noemen Heerenveen in de titel of beschrijving) en Radio Camataru (95 van 100) gaan bijna helemaal over de club, hebben een pagina per aflevering en laten ons de feed lezen.
  De Sportcast gaat over Friese sport (8 van 390), zijn `robots.txt` sluit alles voor iedereen (`Disallow: /`), zijn adres uit het prototype werkt niet meer (nu `tydlik.omropfryslan.nl`), en elke aflevering heeft dezelfde link, de pagina van het programma.
  De NOS Voetbalpodcast gaat over het hele betaalde voetbal (5 van 664), en zijn `link` is het MP3-bestand zonder pagina van de aflevering.
- **Alternatieven:** alle vier, zoals het issue vroeg; twee daarvan kunnen we niet lezen of niet goed koppelen.
  Of Omrop Fryslân om toestemming en een feed met alleen clubafleveringen vragen; dat kan later, buiten dit issue.

## Geen artwork van een podcast

- **Datum:** 24 oktober 2026
- **Besluit:** we bewaren en tonen geen artwork.
  De naam van de podcast is genoeg.
  Een plaatje komt met #10, als lokaal bestand of als initialen.
- **Waarom:** een afbeelding van een ander tonen mag alleen met toestemming (principe 2) en van onze eigen server (principe 3).
  Het prototype laadde het artwork rechtstreeks van de bron.
  Wat we niet mogen tonen, slaan we ook niet op.
- **Alternatieven:** toestemming vragen aan beide podcasts en het plaatje op onze server zetten; dat wacht op hun antwoord en op een plek voor bestanden.

## Podcasts volgen het rooster van de rest

- **Datum:** 24 oktober 2026
- **Besluit:** er komt geen rooster per soort bron.
  De podcastfeeds worden bij elke run van 15 minuten gevraagd, met `ETag`.
- **Waarom:** beide bronnen sturen een `ETag`, dus een run zonder nieuwe aflevering kost een antwoord "niet gewijzigd" en niet de feed van bijna 1 MB.
  Een rooster per soort is extra code voor weinig winst.
  Omroep Abe plaatst ongeveer één aflevering per week, dus de lijst loopt hooguit een kwartier achter.
- **Alternatieven:** podcasts één keer per uur of per dag lezen; dat bespaart een verzoek per run, maar vraagt een manier om per soort te plannen.

## Een podcast komt niet in de nieuwslijst

- **Datum:** 24 oktober 2026
- **Besluit:** de query voor het nieuws slaat bronnen van het soort podcast over.
  Podcasts krijgen een eigen blok en een eigen pagina (zie het issue over het tonen, #188).
- **Waarom:** een aflevering is geen bericht, en het blok heet "Laatste nieuws".
  Het nieuwsarchief (#26) hergebruikt dezelfde query.
- **Alternatieven:** de afleveringen tussen het nieuws tonen, met "podcast" erbij; dat maakt één lijst die twee soorten mengt.

## De beschrijving van een podcast is die van de maker

- **Datum:** 24 oktober 2026
- **Besluit:** de beschrijving van een podcast in het register (`sources.description`) is de tekst die de maker zelf in zijn feed zet, letterlijk en zonder de HTML eromheen, met zijn eigen spelling.
  Zo staat hij in de seed, en zo tonen Onze bronnen en de zijbalk van `/podcasts` hem.
  - Omroep Abe: "Omroep Abe is de podcast over SC Heerenveen van de Leeuwarder Courant. Clubwatcher Sander de Vries bespreekt met oud-spelers Gerald Sibon, Geert Arend Roorda en Henrico Drost wekelijks de actualiteiten en achtergronden bij de club."
  - Radio Camataru: "Wekelijkse supporterspodcast over sc Heerenveen!"

  Beschrijvingen van bronnen van een ander soort blijven in eigen woorden (zie _De pagina 'Onze bronnen' toont per bron een beschrijving, niet wat we tonen_).

- **Waarom:** de maker publiceert deze tekst in de feed die wij lezen, dus zijn tekst gaat voor onze omschrijving.
  Het is één alinea over de podcast zelf, geen intro bij een aflevering.
- **Risico:** het is de tekst van de maker en we hebben er geen aparte toestemming voor gevraagd.
  Vraagt een maker ons de tekst te veranderen of weg te halen, dan doen we dat zo snel mogelijk.
  De seed bewaart de tekst; de importer leest hem niet bij elke run, dus een wijziging van de maker komt er pas als iemand de seed bijwerkt.
- **Alternatieven:** de beschrijving in eigen woorden, zoals eerder bedacht; dat staat verder van wat de maker over zichzelf zegt.
  Of de beschrijving uit de feed bij elke run overnemen; dat vraagt een lezer voor het kanaal van de feed en overschrijft wat in het register staat.

## `/podcasts` is één lijst met een filter, en de URL's hebben een slug

- **Datum:** 24 oktober 2026
- **Besluit:** `/podcasts` toont alle afleveringen met 25 per pagina, en een filter per podcast via `?podcast=<slug>`.
  De slug staat in een kolom van `sources`, zodat het adres niet verandert als de naam verandert.
- **Waarom:** met twee podcasts is een pagina per podcast overbodig, en een filter past bij het filter per bron van het nieuwsarchief.
  Een adres als `/podcasts?podcast=omroep-abe` blijft werken als we de naam van de podcast aanpassen of er een podcast bijkomt.
  Een pagina die buiten het bereik valt, geeft 404 en niet een lege lijst.
- **Alternatieven:** een pagina per podcast, `/podcasts/omroep-abe`.
  Of de slug uit de naam afleiden in de code; dan verandert het adres mee met de naam.
- **Later:** zie _Op `/podcasts` kies je podcasts met selectievakjes in een fieldset_: het filter per podcast is een groep selectievakjes met een knop "Toon", en `?podcast=<slug>` mag vaker voorkomen.
  Zonder `podcast` zijn het alle podcasts.
- **Later:** zie _De site heeft vier onderdelen: Nieuws, Wedstrijden, Statistieken en Forum_ (31 oktober 2026): de pagina staat op `/nieuws/podcasts`, met dezelfde parameters (`?podcast=<slug>` en `?pagina=N`).
  `/podcasts` vervalt zonder omleiding.

## Een aflevering linkt naar de maker, een podcast ook naar Apple en Spotify

- **Datum:** 24 oktober 2026
- **Besluit:** de titel van een aflevering linkt naar de pagina van de aflevering bij de maker.
  Bij een gekozen podcast staan tekstlinks naar de podcast op Apple Podcasts en Spotify, uit het register.
  Links per aflevering naar die platforms komen er niet.
- **Waarom:** de feeds geven alleen adressen van de show, niet van afleveringen.
  Per aflevering zoeken kan alleen bij hun diensten: Apple geeft de laatste 200 afleveringen, en Spotify vraagt een account met sleutel.
  Elke aflevering zou naar hen gaan.
  Een adres van de show schrijven we één keer op, en het werkt zonder app.
  De pagina van de maker blijft de standaard omdat die de maker zelf is (principe 1).
- **Alternatieven:** alleen de pagina van de maker, zonder platformlinks.
  Of links per aflevering, met opzoeken bij Apple en Spotify.

## Een slug vergelijken we letter voor letter

- **Datum:** 24 oktober 2026
- **Besluit:** de queries zoeken een podcast op zijn slug zonder de hoofdletters en accenten te negeren (`collate utf8mb4_bin`).
  De kolom zelf blijft hoofdletterongevoelig en uniek.
- **Waarom:** de kolom houdt twee slugs die alleen in hoofdletters of accenten verschillen buiten het register.
  Een adres moet één podcast noemen, dus `?podcast=Omroep-Abe` is een onbekende podcast en geen tweede adres voor Omroep Abe.
- **Alternatieven:** de collatie van de kolom veranderen in `utf8mb4_bin`; dan staan `omroep-abe` en `Omroep-Abe` allebei in het register.
  Of de pagina de slug laten toetsen; dan kan een andere query dezelfde fout maken.
- **Later:** zie _Op `/podcasts` kies je podcasts met selectievakjes in een fieldset_: een adres mag meer podcasts noemen, elk met zijn eigen slug.
  Elke slug wordt letter voor letter vergeleken, en `?podcast=Omroep-Abe` blijft een onbekende podcast.

## Een aflevering is een nieuwsregel

- **Datum:** 24 oktober 2026
- **Besluit:** een aflevering wordt getoond met `NewsItem`, met de naam van de podcast als bron.
  Er komt geen apart component voor een podcastregel.
- **Waarom:** een aflevering heeft dezelfde onderdelen als een bericht: een titel als link, een bron en een tijd.
  Een tweede component met dezelfde regel is code die hetzelfde doet.
  Komt er ooit iets bij dat alleen voor afleveringen geldt, zoals een duur, dan kan er een component bij.
- **Alternatieven:** een eigen component voor de podcastregel, zoals #20 voorstelde.

## Het blok op de homepage staat in de zijbalk onder het forum

- **Datum:** 24 oktober 2026
- **Besluit:** het blok "Nieuwste podcasts" toont de vier nieuwste afleveringen van alle podcasts samen, in de zijbalk onder "Nieuwste discussies", met een link naar `/podcasts`.
- **Waarom:** de hoofdkolom is voor het nieuws, en de zijbalk heeft plaats voor meer blokken naast elkaar.
  Vier regels past bij het forumblok.
- **Alternatieven:** het blok boven het forum, of in de hoofdkolom onder het nieuws.
- **Later:** zie _Elke kaart op de homepage toont vijf items, uit één gedeelde waarde_: het blok toont nu vijf afleveringen.
- **Later:** zie _De site heeft vier onderdelen: Nieuws, Wedstrijden, Statistieken en Forum_ (31 oktober 2026): de link van het blok gaat naar `/nieuws/podcasts`.
- **Later:** zie _De homepage en het nieuws zijn twee pagina's, en het forum staat bovenaan de zijbalk van de homepage_ (1 november 2026): het blok staat onderaan de zijbalk, en de kaart "Podcasts" op `/nieuws` toont ook vijf afleveringen.
- **Later:** zie _De kaart met podcasts toont de afleveringen van de laatste 8 dagen_ (7 november 2026): het blok toont alleen afleveringen van de laatste 8 dagen, tot vijf.

## Het filter is een Navigation, en de paginering verdwijnt bij één pagina

- **Datum:** 24 oktober 2026
- **Besluit:** `Filter` in het designsysteem is een `Navigation` met een klasse van zichzelf, dus een `nav` met een naam, een lijst met links en `aria-current="page"` op de keuze.
  `Pagination` heeft "Vorige", "Pagina 2 van 9" en "Volgende", en laat een link weg waar geen pagina is.
  De pagina `/podcasts` toont de paginering alleen als er meer dan één pagina is.
- **Waarom:** een filter van links heeft dezelfde onderdelen als een menu: dezelfde 44 pixels hoge links, hetzelfde teken voor de huidige keuze en dezelfde naam voor schermlezers.
  Een tweede component zou dat nabouwen.
  "Pagina 1 van 1" zonder een link zegt een bezoeker niets.
- **Alternatieven:** een eigen component met een eigen lijst; dat is dubbel werk.
  Of een `Select` voor de podcasts; dat vraagt JavaScript of een knop om te verzenden.
- **Later:** zie _Op `/podcasts` kies je podcasts met selectievakjes in een fieldset_: `/podcasts` gebruikt `Filter` niet meer.
  Het component blijft in het designsysteem, maar geen enkele pagina gebruikt het nu.
  De paginering blijft zoals ze was.

## De tijd van een aflevering: de dag in de week, daarna de datum

- **Datum:** 24 oktober 2026
- **Besluit:** een aflevering van de zeven dagen tot en met vandaag toont de korte dag en de tijd, zoals bij het nieuws: "wo 14:05".
  Een oudere toont alleen de datum, zoals "16 okt", met het jaar als het niet dit jaar is: "6 okt 2021".
- **Waarom:** de lijst gaat jaren terug, dus een datum zonder jaar is onduidelijk.
  Zonder tijd past de datum met het jaar in de smalle kolom van een nieuwsregel; een tijd erbij zou over drie regels breken.
- **Alternatieven:** de datum en de tijd, zoals bij het nieuws; dat past niet in de kolom met het jaar erbij.
  Of altijd het jaar; dat is in de week overbodig.
- **Later:** de datum van een aflevering van meer dan zeven dagen krijgt de korte dag erbij, zoals "wo 21 okt" (29 oktober 2026).
  Zie _Een publicatiedatum van meer dan een week oud is de korte dag en de datum, zonder tijd_.

## Een lijst per podcast en pagina staat vijf minuten in het geheugen, na de controle van het adres

- **Datum:** 24 oktober 2026
- **Besluit:** de server bewaart de lijst van elke combinatie van podcast en pagina vijf minuten, met `cacheForKey`.
  Hij controleert de slug en het paginanummer eerst tegen de lijst van podcasts en het aantal pagina's, en bewaart pas daarna iets.
- **Waarom:** een bezoeker kan elk adres bedenken, en een bewaarde lijst per adres zou het geheugen van de server vullen.
  Met de controle vooraf zijn er hooguit zoveel lijsten als er podcasts en pagina's zijn.
- **Alternatieven:** niet bewaren; dat is een query per bezoek.
  Of een grens aan het aantal bewaarde lijsten; dat is meer code en laat een bezoeker de goede lijsten uit het geheugen duwen.
- **Later:** zie _Op `/podcasts` kies je podcasts met selectievakjes in een fieldset_: de sleutel is de lijst slugs van de gekozen podcasts, in de volgorde van de lijst, en alle podcasts zijn dezelfde sleutel als geen.
  De controle vooraf blijft.

## Op `/podcasts` kies je podcasts met selectievakjes in een fieldset

- **Datum:** 31 oktober 2026
- **Besluit:** het filter per podcast op `/podcasts` is een formulier met `method="get"` naar `/podcasts`, met een `fieldset` en een `legend` "Podcasts", een selectievakje per podcast (`name="podcast"`, de `slug` als waarde) en een knop "Toon".
  Het is dezelfde aanpak als bij de bronnen op `/nieuws` (_Op `/nieuws` kies je bronnen met selectievakjes in een fieldset_), met hetzelfde onderdeel, `CheckboxGroup`.
  - **Geen vinkje betekent alle podcasts**, en alle vinkjes ook.
    Vanaf het eerste vinkje toont de pagina alleen de aangevinkte podcasts.
    "Alle podcasts" als link vervalt.
  - **Het adres** is `?podcast=a&podcast=b`, in de volgorde van de lijst, en `?pagina=N` blijft.
    Een adres met alle podcasts is dezelfde pagina als het adres zonder `podcast`: het canonieke adres en de adressen van de paginering hebben geen `podcast`.
    Een onbekende slug, een slug die twee keer voorkomt en een verkeerde `pagina` geven "niet gevonden".
    Een nieuwe keuze begint op pagina 1, omdat het formulier geen `pagina` verstuurt.
  - **De kaart staat bovenaan de zijbalk**, lichtblauw, en de pagina heeft dus altijd een zijbalk zolang er podcasts zijn.
    De maten van `/nieuws` (46 rem, 2 rem en 16 rem) gelden hier niet; de zijbalk heeft de gewone breedte.
  - **Eén podcast aangevinkt:** de naam van de podcast staat niet bij elke aflevering, want hij staat in de kop ("Podcasts van A") en in het vakje, en de naam blijft in elke regel voor een schermlezer (`showSource` van `NewsItem`).
    De kaart "Over A" met de beschrijving en de links naar Apple Podcasts en Spotify staat dan onder de kaart met de vakjes, op een warm vlak, zodat de twee kaarten niet allebei lichtblauw zijn.
    Bij geen vinkje, bij alle vinkjes en bij meer dan één vinkje is er geen kaart "Over".
  - **De titel en de kop** noemen de gekozen podcasts: "Podcasts van A en B", bij meer podcasts "A, B en C", en "Podcasts" voor alle podcasts.
- **Waarom:** met links kun je één podcast kiezen en met vakjes meer, en een formulier met een GET geeft een adres dat je kunt delen en werkt zonder JavaScript.
  Dezelfde regels als op `/nieuws` houden de twee pagina's gelijk voor wie ze gebruikt, en voor wie ze onderhoudt: de functies die het adres lezen en maken staan voor beide in `src/filter-query.ts`.
- **Gevolg:** de queries `listPodcastEpisodes` en `countPodcastEpisodes` nemen `podcasts`, een lijst slugs, in plaats van `podcast`.
  De server bewaart de pagina's per keuze, met de podcasts in de volgorde van de lijst.
  `Filter` heeft geen pagina meer die hem gebruikt.
  We laten hem staan; of hij weg moet, beslist de projecteigenaar.
- **Alternatieven:** de kaart "Over" ook tonen bij meer podcasts (dan zijn het er meer dan de zijbalk aankan, en de teksten zijn per podcast).
  De maten van `/nieuws` ook hier gebruiken (dat vraagt de projecteigenaar apart).
  Alle vakjes aangevinkt als een eigen adres laten bestaan (twee adressen voor dezelfde pagina).
- **Later:** zie _De vier vlakken van een kaart hebben een betekenis, en elke kaart volgt de eerste regel die past_ (1 november 2026): de kaart "Over A" blijft warm, maar niet meer om de twee kaarten uit elkaar te houden: een beschrijving van de maker met links om te luisteren is een uitnodiging.

## De duur, het seizoen en het nummer van een aflevering tonen we wel

- **Datum:** 24 oktober 2026
- **Besluit:** de import bewaart van een aflevering de duur in hele seconden, het seizoen en het nummer, als de feed ze geeft, en de pagina's tonen ze achter de naam van de podcast: "seizoen 9, aflevering 16 · 37 min".
  Een seizoen zonder nummer tonen we niet.
  Het soort aflevering (`itunes:episodeType`: `full`, `trailer` of `bonus`) bewaren we niet.
  De tabel `items` krijgt drie kolommen die leeg mogen zijn, `duration_seconds`, `season_number` en `episode_number`, met een migratie die de `ETag` en `Last-Modified` van de feeds vergeet, zodat de volgende run elke feed één keer helemaal leest en de bestaande afleveringen de feiten krijgen.
- **Waarom:** de projecteigenaar vroeg erom: een duur en een nummer zijn feiten over een aflevering en geen inhoud ervan, zoals een datum of een bronnaam, en ze helpen een luisteraar kiezen.
  Principe 2 gaat over inhoud van een ander, zoals een intro of een foto, en dat blijft weg.
  Beide feeds geven de duur bij elke aflevering; het nummer staat bij alle 100 van Radio Camataru en bij 151 van de 224 van Omroep Abe.
  Alle afleveringen in beide feeds zijn `full`, dus dat gegeven zegt niets.
- **Alternatieven:** niets tonen, zoals #14 besloot; dat laat een nuttig feit liggen.
  Het soort aflevering ook bewaren; dat zegt pas iets als een podcast een trailer of een extra aflevering plaatst.
- **Gevolg:** dit gaat tegen een regel uit #14 in ("geen duur"), met goedkeuring van de projecteigenaar.
  De kolommen komen niet in `items` voor nieuws: een nieuwsfeed geeft ze niet, dus ze blijven leeg.

## Het relevantiefilter kijkt alleen naar de kop, en bewaart wat het niet toont

- **Datum:** 23 oktober 2026
- **Besluit:** het filter kijkt alleen naar de kop.
  Twijfelgevallen en afgewezen berichten bewaren we, maar tonen we niet, tot het beheer ze kan beoordelen.
- **Waarom:** de importer bewaart geen intro of categorie, en we lezen ze niet om te beslissen.
  Zo blijft duidelijk waar het filter op rust, en blijft het één zuivere functie die we met koppen kunnen testen.
  "Niets stil weggooien" betekent dat een mens een fout kan zien en herstellen (#76), en dat we regels kunnen verbeteren aan echte gevallen.
- **Alternatieven:** ook de intro en de categorie van de feed lezen en weer weggooien (nauwkeuriger, maar dan verwerken we meer van de bron dan we tonen); of een taalmodel laten beoordelen (traag, duur, niet te testen).
  Twijfelgevallen tonen met een label (het lijkt dan onze keuze); of afgewezen berichten niet bewaren (geen spoor).

## De regels van het filter: hele woorden, zonder hoofdletters en accenten

- **Datum:** 25 oktober 2026
- **Besluit:** `judgeRelevance` in `apps/importer/src/relevance.ts` is één zuivere functie met de regels uit #74:
  - de kop noemt "sc Heerenveen", of Abe Lenstra: `relevant`;
  - de kop noemt "Heerenveen" met een voetbalwoord of de naam van iemand van de club: `relevant`;
  - de kop noemt alleen "Heerenveen", of alleen de naam van iemand van de club: `doubtful`;
  - anders: `irrelevant`.
- **Hoe ze lezen:** de kop wordt kleine letters zonder accenten, "s.c." en "S. C." worden "sc", en de kop valt in woorden bij alles wat geen letter of cijfer is.
  Zo telt "sc Heerenveen-fan", "SC HEERENVEEN" en "sc. Heerenveen" als de club.
  "sc" moet direct voor "Heerenveen" staan.
  Alleen het hele woord telt: "Asc Heerenveen" noemt de club niet, "Heerenveenseweg" en het bijvoeglijk naamwoord "Heerenveense" zijn niet "Heerenveen" (dat wordt `irrelevant`, tenzij er een naam of club bij staat), en "wandelwedstrijd" is geen "wedstrijd".
  Een term van meer woorden, zoals "Europa League" of een volledige naam, telt alleen als die woorden naast elkaar staan.
- **Wat de regels niet zien:** de wedstrijd van een andere club in Heerenveen, zoals een interland in het Abe Lenstra Stadion, heeft "Heerenveen" en een voetbalwoord en wordt dus `relevant`.
  De lijsten kennen geen andere clubs en spelers van andere clubs: een kop met "Heerenveen" en een speler van Ajax zonder voetbalwoord is `doubtful`.
  De koppen uit de logs van het prototype laten straks zien of dat vaak genoeg misgaat om een lijst met andere clubs te maken.
  Een kop over de Abe Lenstra Boulevard komt er ook in; een moderator verbergt zo'n bericht.
- **Later:** zie _Een kop over de tegenstander is `relevant` in de week voor en na de wedstrijd_: `judgeRelevance` blijft zuiver, maar krijgt de tegenstanders van de wedstrijden rond de publicatie als tweede argument, en de kop alleen is dan niet meer alles wat het filter ziet.
- **Abe Lenstra:** een kop met "Abe Lenstra" is `relevant`, ook zonder de club.
  Hij is onze grootste speler aller tijden, dus berichten over hem horen op de site (besluit van de projecteigenaar, 25 oktober 2026; dit is een aanvulling op de regels van #74).
- **Niet te streng:** de projecteigenaar wil een filter dat niet te streng is, want een bericht dat doorkomt is zo verborgen, en een bericht dat wordt tegengehouden ziet niemand.
  Daarom staan de voetbalwoorden ruim in de lijst, ook woorden als coach, competitie, kampioen en stadion, die er samen met "Heerenveen" bijna altijd een voetbalkop van maken.
- **Waarom:** een Nederlandse kop heeft de club bijna altijd met naam erin, en een gemeentebericht heeft "Heerenveen" zonder voetbal.
  Hele woorden voorkomen de meeste valse treffers zonder een lijst met uitzonderingen.
- **Alternatieven:** zoeken op een deel van een woord (meer treffers, ook "Asc" en straatnamen); een lijst met andere clubs om een wedstrijd van een andere club in Heerenveen te weren (nog een lijst die iemand bijhoudt, zonder dat we weten of het nodig is).
- **Later:** zie _Een volledige naam is genoeg, en "wint" en "verliest" zijn voetbalwoorden_; de naam van iemand van de club maakt een kop alleen `relevant` als het de volledige naam is, en "wint" en "verliest" zijn voetbalwoorden.
  Zie ook _De namen van de profclubs geven context: "Heerenveen" naast een club is een wedstrijd_: de naam van een andere profclub naast "Heerenveen" maakt een kop ook `relevant`.
  Zie ook _Het relevantiefilter kent de Friese schrijfwijze van de club en Friese voetbalwoorden_: "Hearrenfean" telt als "Heerenveen".
- **Later:** zie _Twee achternamen, of een achternaam met een voetbalwoord, maken een kop `relevant`_ (9 november 2026): een achternaam met een voetbalwoord, of met een tweede achternaam, is nu `relevant`, ook zonder "Heerenveen"; een achternaam alleen blijft `doubtful`.

## De lijst met namen en voetbalwoorden: selectie, staf en wie in 2026 vertrok

- **Datum:** 25 oktober 2026
- **Besluit:** `apps/importer/src/relevance-terms.ts` heeft twee lijsten: de selectie en staf van sc Heerenveen in 2026/27 (de spelers, de hoofdtrainer, de assistenten en de directeuren), en voetbalwoorden.
  De bovenkant van het bestand zegt wie ze bijhoudt (de projecteigenaar en de Coordinator) en wanneer ze zijn nagekeken (25 oktober 2026, naar de Nederlandse Wikipedia, bijgewerkt op 17 oktober 2026, en de selectie op vi.nl).
  Van iemand staat de volledige naam op de lijst en de achternaam alleen, ook een veelvoorkomende zoals Kersten of Veldman.
  Een achternaam alleen maakt een kop `relevant` met "Heerenveen" erbij, en zonder de club `doubtful`.
  Een achternaam die ook een gewoon woord is, staat er niet alleen op (Proper, Machine, Schaken, De Haan, Zaal, Bakker, Brugge): die heeft de volledige naam nodig.
  Hristiyan Petrov schrijven we zo, met een H (de projecteigenaar, 25 oktober 2026; Wikipedia schreef Christijan).
  Spelers en staf die in 2026 vertrokken (onder anderen Brouwers, Hopland, Van Overeem, Bakker, Brugge en Zaal), staan er ook op.
  Ouder vertrokken spelers staan er niet op; voeg er een toe als een kop laat zien dat we hem missen.
- **Waarom:** de projecteigenaar wil het filter niet te streng en vindt nieuws over spelers die vertrokken zijn ook prettig om te lezen.
  Een achternaam alleen is niet gevaarlijk: zonder "Heerenveen" is de kop `doubtful`, en een kop die doorkomt, is snel verborgen.
  Alleen namen, geen andere gegevens over een persoon.
- **Alternatieven:** alleen volledige namen (een kop als "Vente is los bij Heerenveen" valt dan weg, dat zagen we in de opname van Voetbal International); alle oud-spelers van de club (de lijst groeit nooit uit); de selectie elke dag ophalen bij een bron (een extra verzoek aan een derde en een extra stuk code voor een lijst die elke maand een regel wijzigt).
- **Later:** zie _Een volledige naam is genoeg, en "wint" en "verliest" zijn voetbalwoorden_; een volledige naam maakt een kop nu `relevant`, en een achternaam alleen blijft `doubtful`.
- **Later:** zie _Twee achternamen, of een achternaam met een voetbalwoord, maken een kop `relevant`_ (9 november 2026): een achternaam met een voetbalwoord, of met een tweede achternaam, is nu `relevant`, ook zonder "Heerenveen"; een achternaam alleen blijft `doubtful`.

## Een feed heeft een filter, `none` of `club`, en de importer beoordeelt elk bericht opnieuw

- **Datum:** 25 oktober 2026
- **Besluit:** `feeds.filter` is `none` (de feed gaat alleen over de club; zo staat het nu) of `club`, en begint op `none`.
  `items.relevance` is `relevant`, `doubtful` of `irrelevant` en begint op `relevant`.
  De migratie laat daarom elk bestaand bericht `relevant` en elke bestaande feed `none`.
  De waarde van een feed met `club` stellen we in met een SQL-opdracht, die in de README van de importer staat; de seed laat `filter` met rust, zodat een ingestelde waarde een nieuwe seed overleeft.
  Een scherm daarvoor komt niet in dit issue.
- **Hoe de importer het doet:** bij elke run beoordeelt hij elk bericht van een feed met `club`, ook een bericht dat hij al had, zodat een betere regel op oude berichten werkt.
  Een andere waarde telt als bijgewerkt.
  Bij een feed met `none` is de waarde altijd `relevant`.
  Een verborgen bericht (`hidden_at`) houdt zijn waarde, in de query zelf, net als de andere kolommen (zie _De importer laat een verborgen bericht met rust, in de query zelf_).
  Het logboek van een run (`import_results`) krijgt per feed drie tellers, `relevant`, `doubtful` en `irrelevant`: wat het filter van elk bericht in de feed vond, ook van een verborgen bericht.
  Het verslag van de opdracht heeft ze erbij.
- **Waarom:** een nieuwe feed wordt zo een regel in de database, en zonder filter verandert er voor de twee bronnen van nu niets.
  De waarde bij elke run opnieuw bepalen maakt van het filter een regel en geen stempel: wie een naam toevoegt, ziet het resultaat bij de volgende run, zonder een aparte opdracht.
- **Alternatieven:** het filter in de configuratie van de importer of op de bron (een feed van dezelfde bron kan anders zijn); alleen bij een nieuw bericht beoordelen (een betere regel werkt dan nooit op wat er al is); `relevance` overschrijven voor een verborgen bericht (dat gaat tegen #75 in).
- **Later:** zie _Omrop Fryslân is de eerste regionale bron, met het filter `club` vanaf de seed_; voor een nieuwe feed in `realSources` stelt de seed het filter in, bij het toevoegen van de feed.

## De site toont alleen `relevant`, en het beheer toont alles met een woord erbij

- **Datum:** 25 oktober 2026
- **Besluit:** elke query die berichten voor bezoekers toont, gaat door één functie, `isShown` in `packages/db/src/queries.ts`: `relevance = 'relevant'` en `hidden_at IS NULL`.
  Dat zijn de koppen van de homepage, de afleveringen en hun aantal, en de podcasts in het filter.
  `/beheer/berichten` blijft alles tonen, van elke waarde, zodat een moderator ook een twijfelgeval vindt, en zet bij een bericht "twijfelgeval, niet op de site" of "niet over de club, niet op de site".
  Tests: de queries, de koppen en afleveringen in de site, en de controle in de browser (`e2e/relevance.spec.ts`) dat de twijfelgevallen op geen enkele pagina staan.
  De sitemap en de RSS-feed van Updates tonen geen berichten.
- **Waarom:** één plek voor de voorwaarde voorkomt dat een nieuwe query er een vergeet.
  De moderator moet een bericht kunnen vinden dat het filter ten onrechte weghoudt.
- **Alternatieven:** de voorwaarde in elke query zelf (zoals bij `hidden_at` tot nu toe); een apart scherm voor twijfelgevallen (een eigen issue).
- **Later:** zie _De lijst in het beheer heeft een schakelaar voor wel en niet op de site_ (2 november 2026): het beheer toont nog steeds alles, maar verdeeld over de groepen "Op de site" en "Niet op de site", en een twijfelgeval staat onder de tweede.
- **Later:** zie _Van een bericht met meerdere versies toont de site alleen de laatste kop_ (1 november 2026): `isShown` kijkt bij een bericht met een `thread_key` naar het hele verhaal.
  Een bericht zonder sleutel gaat door dezelfde voorwaarde als hier.
- **Later:** zie _Een redacteur kan een twijfelgeval of een bericht dat het filter weghoudt op de site zetten_ (9 november 2026): de voorwaarde is nu `hidden_at IS NULL` en (`relevance = 'relevant'` of `approved_at IS NOT NULL`).
  De importer raakt `approved_at` en `approved_by` nooit aan.

## Omrop Fryslân is de eerste regionale bron, met het filter `club` vanaf de seed

- **Datum:** 25 oktober 2026
- **Besluit:** Omrop Fryslân (`https://www.omropfryslan.nl/rss/index.xml`) staat in `realSources` in `packages/db/src/seed.ts`, met het filter `club`.
  Een feed in `realSources` is een adres of een object met `filter` en `url`; een feed zonder object begint op `none`, zoals tot nu toe.
  De seed zet het filter alleen als hij de feed in het register zet, en verandert het daarna nooit meer (zie _Een feed heeft een filter, `none` of `club`, en de importer beoordeelt elk bericht opnieuw_).
  Van de bron tonen we alleen de kop, de link, de bronnaam en de tijd, zoals bij elke bron.
  Het register in [`bronnen.md`](../bronnen.md) zegt nu "nemen" voor deze bron, met het filter.
  Voor de tests heeft `@fansite/db` een export `./seed`, zodat de test van de importer de bron neemt zoals de seed hem in het register zet.
- **Gemeten op de echte feed** (25 oktober 2026, één run van de importer): 50 berichten bewaard, waarvan 2 `relevant`, 4 `doubtful` en 44 `irrelevant`.
  Geen bericht stond achter een betaalmuur, geen tijd was ongeldig en de importer sloeg niets over.
  De importer leest de feed dus zonder aanpassing.
- **Waarom:** een regionale feed gaat over alles in de provincie, en de club is een klein deel (6 van de 50 op 24 oktober).
  Begint de feed op `none`, dan toont een nieuwe omgeving alle 50 berichten tot iemand het filter met SQL aanzet.
  Op acceptatie zet de site de bronnen met de seed in een lege database, dus daar zouden brand en storm op de homepage komen.
  Met `club` vanaf de seed gebeurt dat niet.
- **Alternatieven:** de feed op `none` beginnen en het filter met SQL aanzetten (een venster waarin alles zichtbaar is); het filter in elke seed opnieuw zetten (dat maakt een keuze in de database ongedaan); een filter op de bron in plaats van op de feed (een tweede feed van dezelfde bron kan anders zijn).
- **Daarna:** de projecteigenaar bekeek de koppen van de run en veranderde twee regels (zie _Een volledige naam is genoeg, en "wint" en "verliest" zijn voetbalwoorden_).
  Dezelfde 50 koppen geven met de nieuwe regels 4 `relevant`, 2 `doubtful` en 44 `irrelevant`.

## Een volledige naam is genoeg, en "wint" en "verliest" zijn voetbalwoorden

- **Datum:** 25 oktober 2026
- **Besluit:** twee veranderingen in de regels van het filter, op de koppen van de eerste run op de feed van Omrop Fryslân (besluit van de projecteigenaar):
  - De volledige naam van iemand van de club maakt een kop `relevant`, ook zonder "Heerenveen".
    `relevance-terms.ts` heeft daarom twee lijsten: `clubPeople` met de volledige namen, en `clubSurnames` met de achternamen.
    Een achternaam alleen blijft `doubtful`, en is `relevant` met "Heerenveen" erbij, zoals voorheen.
  - "wint" en "verliest" staan bij de voetbalwoorden, dus "Heerenveen wint met 3-2 van ADO Den Haag" is `relevant`.
- **Waarom:** de eerste run vond twee koppen over de club `doubtful`: "Lees terug: Heerenveen overleeft Haags kwartiertje en wint met 3-2 van ADO Den Haag" en een kop over Ringo Meerveld.
  In een kop is "Heerenveen" zonder "sc" vaak de club, en een werkwoord als "wint" hoort bij een wedstrijd.
  Een volledige naam is niet dubbelzinnig, een achternaam wel (Kersten, Veldman).
- **Gevolg:** een kop als "Man wint loterij in Heerenveen" wordt ook `relevant`.
  Dat is een bekende valse treffer, die een moderator verbergt; de projecteigenaar wil het filter niet te streng (zie _De regels van het filter: hele woorden, zonder hoofdletters en accenten_).
  Ook de volledige naam van iemand die in 2026 vertrok, maakt een kop `relevant`.
- **Alternatieven:** een lijst met andere clubs, zodat "ADO Den Haag" in een kop de wedstrijd verraadt (nog een lijst om bij te houden); een regel voor een uitslag als "3-2" in de kop (nieuwe code, en alleen voor koppen met een uitslag).
- **Later:** zie _De regels van het filter: hele woorden, zonder hoofdletters en accenten_ en _De lijst met namen en voetbalwoorden: selectie, staf en wie in 2026 vertrok_ voor de regels die hier veranderden.
- **Later:** zie _Twee achternamen, of een achternaam met een voetbalwoord, maken een kop `relevant`_ (9 november 2026): een achternaam met een voetbalwoord, of met een tweede achternaam, is nu `relevant`, ook zonder "Heerenveen"; een achternaam alleen blijft `doubtful`.

## De namen van de profclubs geven context: "Heerenveen" naast een club is een wedstrijd

- **Datum:** 25 oktober 2026
- **Besluit:** `relevance-terms.ts` krijgt een lijst `otherClubs` met de profclubs van de Eredivisie en de Eerste Divisie in 2026/27 (18 en 20 clubs, met de Jong-teams), zonder sc Heerenveen zelf.
  Een kop met "Heerenveen" en een van die clubs is `relevant`, zoals een kop met "Heerenveen" en een voetbalwoord.
  De projecteigenaar vroeg erom, na de kop met ADO Den Haag.
  Een club zonder "Heerenveen" telt niet.
- **Hoe de lijst is gemaakt:** naar de pagina "2026-27 Eredivisie" op en.wikipedia.org (18 clubs, stand van 24 oktober 2026) en "Eerste divisie 2026/27" op nl.wikipedia.org (20 clubs, laatst bewerkt op 24 oktober 2026).
  De Nederlandse pagina over de Eredivisie van dit seizoen konden we niet lezen (404).
  De 20 clubs van de Eerste Divisie staan in de tekst van het deel "Teams" van die pagina, en we hebben ze een tweede keer met die tekst vergeleken; de datum van de laatste bewerking komt uit een samenvatting van de pagina.
  De 18 clubs van de Eredivisie komen uit de tabel "Stadiums and locations" van de Engelse pagina, via een leesdienst; die lijst is niet met de paginatekst zelf vergeleken.
  De lijst moet na de promotie en degradatie van elk seizoen worden nagekeken.
- **Waarom korte namen niet altijd:** een club waarvan de korte naam een plaats is, staat er alleen met zijn volledige naam (FC Groningen, FC Utrecht, FC Twente, PEC Zwolle, FC Emmen).
  Koppen met "Heerenveen en Groningen" of "Heerenveen en Zwolle" gaan vaak over de A7 of de trein, en zouden anders allemaal `relevant` worden.
  Een club waarvan de korte naam in bijna elke kop de club is (Ajax, PSV, Cambuur, Volendam) staat er met die naam.
  VVV staat er alleen als VVV-Venlo, want de VVV is ook het toeristenbureau.
- **Gevolg:** een kop die alleen "Utrecht" of "Groningen" schrijft voor de club, heeft nog een voetbalwoord nodig.
  De 50 koppen van Omrop Fryslân geven nog steeds 4 `relevant`, 2 `doubtful` en 44 `irrelevant`.
- **Verandert de regels van #254:** ja, dit is een derde aanvulling op de regels van het filter uit #254 (na de volledige naam en de twee werkwoorden).
  De projecteigenaar hield de regel en de lijst zoals ze zijn (25 oktober 2026), ook "Sparta" en "Excelsior", die ook namen van amateurclubs zijn.
- **Alternatieven:** alle korte namen toelaten (de A7 en de trein worden dan `relevant`); een regel voor een uitslag als "3-2" in de kop (nieuwe code); de clubs elke dag bij een bron ophalen (een verzoek aan een derde voor een lijst die één keer per seizoen verandert).

## De beoordeelde koppen zijn testgevallen, met de waarde die het filter hoort te geven

- **Datum:** 25 oktober 2026
- **Besluit:** de quiz van de projecteigenaar komt als testgevallen in de tests van het filter: 26 koppen, 21 echte uit de feeds van Omrop Fryslân, NOS en Voetbal International en 5 verzonnen randgevallen.
  Een kop die de projecteigenaar niet relevant vindt en die het filter `doubtful` geeft, staat met `doubtful`.
  Een fout-positief dat we accepteren, staat in een eigen lijst, `knownFalsePositives`, met een commentaar.
- **Waarom:** een testgeval beschrijft wat het filter hoort te doen, niet alleen wat de projecteigenaar vindt.
  `doubtful` en `irrelevant` komen voor een bezoeker op hetzelfde neer, en de regel dat alleen "Heerenveen" `doubtful` is, is een bewuste keuze van #74.
  Een bekend fout-positief blijft zo zichtbaar, en niemand repareert het per ongeluk met een regel die clubberichten mist.
- **Uitkomst van de quiz:** de projecteigenaar en het filter zijn het eens over 19 van de 26 koppen.
  Het filter verbergt geen clubbericht.
  Zes koppen noemt de projecteigenaar niet relevant en geeft het filter `doubtful`: drie echte en drie verzonnen ("Nieuw VVV-kantoor in Heerenveen", "Ongeluk op de A7 tussen Heerenveen en Groningen" en "Heerenveen en Zwolle: wat de nieuwe treinverbinding betekent voor forenzen").
  De tabel van het issue gaf de drie verzonnen koppen `irrelevant`, maar ze noemen alleen "Heerenveen".
  "Man wint loterij in Heerenveen" toont het filter, door het woord "wint" (zie _Een volledige naam is genoeg, en "wint" en "verliest" zijn voetbalwoorden_).
- **Alternatieven:** de uitkomst van de projecteigenaar overnemen als verwachte waarde (dan falen drie tests tegen een bewuste keuze en moet de regel veranderen); alleen de koppen opnemen waar we het over eens zijn (dan verdwijnt het fout-positief uit beeld).

## Wedstrijdgegevens komen van de Nederlandse Wikipedia, voor het eerste mannenelftal

- **Datum:** 25 oktober 2026
- **Besluit:** het programma, de uitslagen en de stand komen van de Nederlandse Wikipedia, alleen voor sc Heerenveen 1 (mannen).
  Dat zijn de pagina's van het seizoen en de pagina van de KNVB Beker.
  We halen ze op met de bestaande fetcher en alleen via `/wiki/<pagina>?action=raw`.
- **Waarom:** het is gratis, zonder sleutel of account, ongeveer een kwartier na het laatste fluitsignaal bijgewerkt en met de beker erbij.
  Onderzoek van 25 oktober: alle tien uitslagen en de stand kwamen overeen met de site van de club en met drie andere sites.
  De licentie past bij ons open uitgangspunt.
- **Alternatieven:** de site van de club (geen voorwaarden gevonden, een verkeerde tijdzone in de gegevens, een stand zonder alle kolommen).
  football-data.org (geen beker, voorwaarden die ons binden nadat we stoppen).
  Sportmonks (ongeveer €290 per jaar).
  OpenFootball (verouderd).
  Eredivisie.nl en andere sites (verbieden scrapen).
- **Later:** zie _De vier Europa League-wedstrijden van 2012/13 komen van de Engelse Wikipedia_ (3 november 2026): de taal geldt niet meer voor dit ene seizoen.
- **Later:** sinds 9 november 2026 mag de import elke taal van Wikipedia lezen onder een geschikte CC-licentie; zie _Elke taal van Wikipedia mag, onder een geschikte CC-licentie_.

## Onze wedstrijdgegevens zijn CC BY-SA 4.0

- **Datum:** 25 oktober 2026
- **Besluit:** de wedstrijdgegevens die we bewaren en tonen, publiceren we onder CC BY-SA 4.0, zoals de licentie van Wikipedia dat vraagt.
  Dat regelt het deel van #39 over de wedstrijdgegevens.
  De regel over de licentie in _Licentie: EUPL-1.2 voor de code en onze eigen teksten_ en het licentiedeel van de README zeggen dat nu ook.
- **Waarom:** het is de veiligste lezing van de share-alike.
  Of een tabel met feiten een bewerking is, is niet zeker, en deze keuze past bij ons open uitgangspunt.
- **Alternatieven:** de gegevens onder de EUPL laten vallen (kan botsen met de licentie van Wikipedia).
  Een jurist laten beoordelen of de share-alike geldt (kost tijd en geld voor weinig winst).

## Controles in plaats van een tweede bron

- **Datum:** 25 oktober 2026
- **Besluit:** Wikipedia is door vrijwilligers geschreven, dus de importer controleert elke lezing.
  Faalt een controle, dan blijft de laatste goede versie staan en schrijft de importer een waarschuwing.
  We zetten geen versie van de Wikipedia-pagina vast.
- **Waarom:** de club als tweede bron is uitgesloten, en een vastgezette versie vraagt meer code en meer toestand voor een zeldzaam geval.
  Het beheer (#272) is de uitweg als Wikipedia lang fout blijft.
- **Alternatieven:** de laatste goede versie van Wikipedia zelf vastzetten tot een mens ingrijpt.
  Elke wijziging eerst door iemand laten goedkeuren.

## De controles gelden op elk moment, ook midden in een speelronde

- **Datum:** 25 oktober 2026
- **Besluit:** de importer controleert het programma en de stand met `apps/importer/src/check-wikipedia.ts`:
  - sc Heerenveen speelt 34 competitiewedstrijden, elk in een eigen speelronde, 17 thuis en 17 uit;
  - de stand heeft 18 clubs;
  - per club is gespeeld gelijk aan gewonnen + gelijk + verloren, zijn de punten 3 × gewonnen + gelijk en is het doelsaldo gelijk aan voor min tegen;
  - over de hele stand zijn de doelpunten voor gelijk aan de doelpunten tegen, en het aantal gewonnen gelijk aan het aantal verloren;
  - de regel van sc Heerenveen in de stand komt overeen met onze eigen uitslagen: gespeeld, doelpunten en punten.
- **Waarom:** een controle die alleen klopt als alle clubs even vaak speelden, zou elk speelweekend falen.
  Midden in een speelronde hebben clubs een wedstrijd meer of minder gespeeld, maar elke gespeelde wedstrijd telt voor twee clubs, dus de sommen blijven kloppen.
  Een stand die pas voor de helft bijgewerkt is, valt zo wel op en komt een uur later in orde.
- **Alternatieven:** controleren dat alle clubs evenveel gespeeld hebben (faalt elk weekend).
  Alleen de regel van sc Heerenveen controleren (mist een tikfout bij een andere club).
- **Let op:** Wikipedia geeft in de pagina gewonnen, gelijk, verloren en doelpunten, niet gespeeld en punten.
  De importer rekent die twee uit, dus voor die twee is de controle per club een zekerheid van de code en geen controle van de bron.
  Een puntenaftrek zou de stand dan niet meer laten kloppen met de uitslagen.
- **Later:** zie _Een puntenaftrek staat in een kolom van `standings`, komt uit de kolom `PA` en telt mee in `checkStandings`_ (3 november 2026).
  De punten zijn nu 3 × gewonnen + gelijk − aftrek, en een aftrek groter dan 3 × gewonnen + gelijk is een fout.
  De regel van sc Heerenveen wordt met dezelfde formule vergeleken met onze uitslagen.

## De aftrap staat in UTC en mag ontbreken

- **Datum:** 25 oktober 2026
- **Besluit:** de aftrap is een tijdstip in UTC dat mag ontbreken.
  Zonder tijd staat er het weekend of de datum zoals Wikipedia die geeft (`date_text`), en de eerste dag in `match_date`, zodat het programma op volgorde blijft.
  Een bezoeker ziet altijd Nederlandse tijd.
- **Waarom:** de KNVB maakt de data en tijden van speelronde 22 tot en met 32 pas op 22 december 2026 bekend.
  Alle tijden slaan we in UTC op, zoals de rest van de database.
- **Alternatieven:** een geschatte tijd tonen (geeft supporters een verkeerde tijd).
  Die wedstrijden niet tonen tot de tijd er is.

## Een seizoen heeft eigen rijen, en rijen van een eerder seizoen blijven bewaard

- **Datum:** 25 oktober 2026
- **Besluit:** elke wedstrijd en elke regel van de stand hoort bij een seizoen, dat op 1 juli begint (`2026/27`).
  De import leest alleen het lopende seizoen en laat rijen van eerdere seizoenen staan.
  Pagina's en blokken tonen alleen het lopende seizoen.
  `seasonOf` en `seasonStart` staan in `@fansite/db/season`, zodat de importer, de seed en de site hetzelfde seizoen kiezen.
- **Waarom:** bewaren kost bijna niets, en #39 (de geschiedenis) en een mogelijk archief beginnen dan met gegevens die er al zijn.
  Een nieuw seizoen hoeft niets te wissen.
- **Alternatieven:** de rijen bij elk nieuw seizoen vervangen (eenvoudiger, maar de uitslagen van een afgelopen seizoen zijn dan weg).
- **Later:** zie _Een seizoen heeft een eigen adres, `/wedstrijden/2025-26`, en een kiezer die zonder JavaScript werkt_: `/wedstrijden` en de statistieken tonen nu ook een eerder seizoen, op een adres van dat seizoen.
  Het lopende seizoen blijft op `/wedstrijden`, en de homepage toont alleen het lopende seizoen.
- **Later:** zie _Een eerder seizoen wordt eenmalig geïmporteerd met een opdracht, zonder selectie_.
  De uurlijkse import leest nog altijd alleen het lopende seizoen, en de rijen van eerdere seizoenen blijven bewaard.
  Alleen de opdracht `pnpm run import:season` leest een afgelopen seizoen.

## Een uitgestelde wedstrijd blijft in het programma staan als "Uitgesteld"

- **Datum:** 25 oktober 2026
- **Besluit:** een uitgestelde wedstrijd blijft op zijn plek in het programma, zonder nieuwe datum, en telt niet als gespeeld.
  Zodra Wikipedia een nieuwe datum heeft, nemen we die over.
  De importer herkent een uitgestelde wedstrijd aan een score die "uitgesteld" of "afgelast" zegt.
- **Waarom:** supporters zien dan waarom de wedstrijd niet doorging, en niemand zoekt hem tevergeefs.
  We hebben nog geen uitgestelde wedstrijd op de pagina gezien, dus de herkenning is een aanname.
  Schrijft Wikipedia het anders, dan geeft de import een fout en blijft de laatste goede versie staan.
- **Alternatieven:** de wedstrijd verbergen tot er een nieuwe datum is.
- **Later:** zie _Een wedstrijd onder Inhaalronde telt voor de ronde waaruit hij is uitgesteld, en vervangt het blok zonder uitslag_: de pagina heeft een uitgestelde wedstrijd twee keer, en het blok onder `Inhaalronde <nummer>` met een uitslag vervangt dat zonder uitslag.
  Een uitgestelde wedstrijd zonder uitslag blijft staan zoals hier.
- **Later:** zie _Een wedstrijd die nooit meer wordt gespeeld heeft een eigen status, `cancelled`, en de importer bepaalt dat per seizoen dat voorbij is_ (3 november 2026): in een seizoen dat voorbij is, wordt een wedstrijd die nog uitgesteld is `cancelled` en zegt de site "Geannuleerd".
  In het lopende seizoen blijft het zoals hier.

## Het weer valt buiten dit werk

- **Datum:** 25 oktober 2026
- **Besluit:** de optionele weersverwachting uit dit issue krijgt later een eigen issue.
- **Waarom:** een weerdienst is een tweede bron met eigen voorwaarden, en de server zou die zelf moeten ophalen zonder dat bezoekers iets aan een derde vragen.
  Dat werk past niet bij de import van de wedstrijden.
- **Alternatieven:** het weer nu meenemen.
  Dat maakt de import en de review groter.

## Drie pull requests in plaats van één

- **Datum:** 25 oktober 2026
- **Besluit:** #27 is gesplitst in de import (#27), de blokken en de pagina voor bezoekers (#271) en het aanpassen in het beheer (#272), in die volgorde.
- **Waarom:** de import, de pagina's en het beheer kunnen elk apart naar acceptatie.
  De import levert de gegevens, en de reviewer ziet per pull request één onderdeel.
- **Alternatieven:** vier issues, met de blokken van de homepage en de pagina `/wedstrijden` apart.
  Eén issue voor alles.

## De import van de wedstrijden slaagt of mislukt als geheel, één keer per uur

- **Datum:** 25 oktober 2026
- **Besluit:** de import leest de drie pagina's van het seizoen, controleert alles en schrijft dan de wedstrijden, de stand en de gelezen pagina's in één transactie.
  Is een pagina niet te lezen, of faalt een controle, dan verandert er niets.
  Ook een ontbrekende pagina van de beker houdt de hele import tegen.
  Een bekerpagina die er wel is maar nog geen wedstrijdsjabloon heeft, zoals vroeg in een seizoen, telt als "nog geen bekerwedstrijd".
  Heeft de import eerder bekerwedstrijden van die pagina gelezen, dan is zo'n pagina veranderd en houdt ze de import tegen.
  Een wedstrijd van sc Heerenveen die de import niet kent of niet kan lezen (een datum, een tijd of een score), is dezelfde fout.
  De import van de wedstrijden en de import van de feeds lopen in dezelfde run, maar een fout in de ene stopt de andere niet.
  Een mislukte import van de wedstrijden is een waarschuwing en geen fout van de run: de exitcode blijft 0.
- **Hoe vaak:** hoogstens één keer per uur, bijgehouden in `match_imports.retry_at` (59 minuten na elke poging, bij een verzoek om te wachten zo lang als Wikipedia vraagt).
  Een run die het uur nog niet vol vindt, schrijft niets.
- **Waarom:** een stand zonder de bijbehorende uitslag, of een programma zonder de beker, zou een bezoeker iets verkeerds laten zien.
  Een verkeerde wedstrijd die een uur te lang blijft staan, kost minder dan een half bijgewerkte pagina.
  Elk uur is vaak genoeg: Wikipedia is binnen een kwartier na het fluitsignaal bijgewerkt, en een bezoeker merkt een uur verschil nauwelijks.
  Een exitcode van 1 elk uur dat Wikipedia hapert, zou de cronmail vullen.
  De gezondheid in `pnpm run import:status` houdt de mislukte runs bij en geeft exitcode 1 bij drie op rij, zoals bij de feeds.
- **Alternatieven:** per pagina schrijven (de stand en de uitslagen kunnen dan elkaar tegenspreken).
  Elke 15 minuten lezen (vier keer zoveel verzoeken aan Wikipedia voor weinig winst).
  Een ontbrekende bekerpagina overslaan (een hernoemde pagina laat dan stil onze bekerwedstrijden verdwijnen).
  Een bekerpagina zonder sjablonen altijd tegenhouden (vroeg in het seizoen blokkeert dat de competitie wekenlang).
- **Later:** zie _De play-offs voor de Conference League zijn een derde competitie, een ontbrekende pagina is geen mislukking_.
  De import leest daarna vier pagina's; alleen de pagina van de play-offs mag ontbreken (404).

## Een uitslag die verandert, nemen we over, en na drie dagen met een waarschuwing

- **Datum:** 25 oktober 2026
- **Besluit:** verandert Wikipedia een uitslag, dan neemt de import de nieuwe uitslag over.
  Stond de oude uitslag drie dagen of langer vast, dan schrijft de import ook een waarschuwing met de oude en de nieuwe uitslag, in de uitvoer en in `match_imports.last_warning`.
  `matches.result_set_at` houdt bij sinds wanneer de uitslag zo staat; het verandert alleen als de uitslag verandert.
- **Waarom:** soms klopt de verbetering, en een tikfout herstellen is een gewone bewerking.
  Een uitslag die na dagen nog verandert, is zeldzaam genoeg om een mens te laten kijken, en dan kan het beheer (#272) de uitslag zetten.
- **Alternatieven:** een gewijzigde uitslag niet overnemen tot een mens hem goedkeurt (een goede verbetering blijft dan liggen).
  Elke wijziging van een uitslag melden (te veel meldingen voor een tikfout van een uur oud).
- **Later:** zie _Een wijziging van Wikipedia krijgt een betrouwbaarheid, en een verdachte wijziging wacht_.
  De import neemt niet meer elke gewijzigde uitslag over: een uitslag die 24 uur of langer vaststond, of een wedstrijd van drie dagen of langer geleden, wacht zeven dagen of tot een mens besluit.
  Een correctie van minder dan 24 uur oud gaat nog door, met een waarschuwing.

## De ronde is de kop boven de wedstrijd, en de versie van een pagina is de `Last-Modified`

- **Datum:** 25 oktober 2026
- **Besluit:** de speelronde van een wedstrijd is de kop boven het sjabloon op de pagina: `Speelronde 12` in de competitie, `Eerste ronde` in de beker.
  Zo hoeft een nieuw bekerseizoen geen code, en een wedstrijd is uniek per seizoen, competitie en ronde.
  `wikipedia_pages.version` bewaart de `Last-Modified` die Wikipedia bij de pagina stuurt.
- **Waarom:** de ruwe tekst van een pagina (`?action=raw`) komt zonder versienummer, en de API met het nummer is voor ons gesloten door `robots.txt`.
  De `Last-Modified` is het tijdstip van de versie die we lazen, en samen met de titel en het leestijdstip kan een bezoeker de geschiedenis van de pagina bekijken.
- **Alternatieven:** de rondes van de beker per seizoen met de hand benoemen (code om bij te houden).
  Een tweede verzoek om het versienummer uit de HTML te halen (ongeveer tien keer zo veel gegevens).
- **Later:** zie _De bronvermelding staat in een doorzichtige kaart, zonder link naar de geschiedenis_.
  De bronvermelding linkt niet meer naar de geschiedenis van de pagina; de bezoeker bereikt haar vanaf het artikel zelf.

## De verzonnen wedstrijden komen alleen in een leeg seizoen

- **Datum:** 25 oktober 2026
- **Besluit:** de seed zet verzonnen wedstrijden en een verzonnen stand in het lopende seizoen, maar alleen als dat seizoen nog geen wedstrijden of stand heeft.
  De datums tellen vanaf het moment van de seed, dus het seizoen is altijd het lopende.
  De verzonnen uitslagen hebben geen `result_set_at`, zodat de import niet waarschuwt als hij ze vervangt.
- **Waarom:** de site zet de seed op acceptatie bij elke start (zie _De testbronnen staan alleen op acceptatie_).
  Zonder deze regel zouden de verzonnen wedstrijden de echte van Wikipedia bij elke start overschrijven.
  De eerste echte import vervangt de verzonnen wedstrijden en de verzonnen stand.
- **Alternatieven:** de verzonnen wedstrijden in een eigen seizoen zetten (de pagina's tonen dan niets in het lopende seizoen).
  De seed op acceptatie niet voor wedstrijden laten lopen (de toegankelijkheidscontrole heeft ze nodig).
- **Later:** zie _Een wijziging van Wikipedia krijgt een betrouwbaarheid, en een verdachte wijziging wacht_.
  De verzonnen wedstrijden worden vervangen omdat de import het seizoen nog nooit goed las (er staat geen pagina in `wikipedia_pages`), en niet omdat `result_set_at` leeg is.

## De selectie komt van de Nederlandse Wikipedia, zoals de wedstrijden

- **Datum:** 26 oktober 2026
- **Besluit:** de lijst met spelers voor de zoekpagina komt uit de tabel "Spelers" op de pagina van het seizoen van sc Heerenveen op de Nederlandse Wikipedia, via de importer, met dezelfde controles, bronvermelding en licentie (CC BY-SA 4.0) als de wedstrijden.
  We bewaren alleen de naam, de positie en het rugnummer.
- **Waarom:** het is dezelfde bron, hetzelfde besluit en dezelfde techniek als bij #27, dus er komt geen nieuwe afspraak bij.
  Een transfer staat binnen dagen op Wikipedia, dus niemand houdt een lijst bij.
- **Alternatieven:** een lijst in het beheer die een redacteur bijhoudt (er is geen redactieproces voor, en hij is na elke transfer verouderd).
  De namen uit de doelpuntenmakers (#297) halen (alleen spelers die scoorden, dus onvolledig).
  De site van de club (geen toestemming, zie #16).
- **Later:** we bewaren sinds 27 oktober 2026 ook de pagina van de speler op Wikipedia en of hij nog in de selectie staat; zie _Spelers hebben een vaste `id`, en doelpunten verwijzen ernaar_.
- **Later:** we bewaren sinds 31 oktober 2026 ook de optredens, doelpunten en assists per speler, uit dezelfde tabel; zie _De cijfers van een speler staan in een eigen tabel, per seizoen en competitie_.
- **Later:** de selectie van eerdere seizoenen wordt onderzocht in `docs/onderzoek-spelers-sinds-1990.md` (#676).
  Er is nog niets gekozen, dus de bron en de licentie hier blijven gelden.
- **Later:** zie _De selectie van eerdere seizoenen komt in een eerste versie met gaten, en een tweede lezing haalt niemand weg_.
  Sinds 6 november 2026 lezen `import:squad` en `import:squads` de selectie van eerdere seizoenen, uit dezelfde Nederlandse Wikipedia en met dezelfde fetcher, controle op `robots.txt` en licentie.
- **Later:** sinds 9 november 2026 bewaren we ook de landcode van de vlag (`players.country`); zie _Het land van een speler komt als landcode uit de vlag in de selectietabel_.
- **Later:** sinds 10 november 2026 kan de redactie een speler toevoegen of aanpassen, en dat blijft staan als de tabel iets anders zegt; zie _Wat de redactie van een speler zette, schrijft de import niet over_.

## De zoekterm is de achternaam, als eigen kolom

- **Datum:** 26 oktober 2026
- **Besluit:** bij elke speler bewaren we een zoekterm: de naam zonder de eerste voornaam.
  De lijst toont de volledige naam, een klik zoekt op de zoekterm.
- **Waarom:** media schrijven "Klaverboer" of "Van der Flier", zelden de volledige naam.
  Een zoekopdracht op de achternaam vindt ook de koppen met de volledige naam.
- **Alternatieven:** zoeken op de volledige naam (mist de meeste koppen).
  De zoekterm elke keer uit de naam afleiden (kan niet voor één speler worden gecorrigeerd, zoals een speler die onder één naam bekend is).

## De selectie heeft een eigen gezondheidsrij, en een bekende speler houdt zijn zoekterm

- **Datum:** 26 oktober 2026
- **Besluit:** de import van de selectie heeft een eigen tabel voor de gezondheid, `squad_imports`, met dezelfde velden als `match_imports`, en een eigen uur: hij loopt in dezelfde run als de wedstrijden, na de wedstrijden, en een fout in de ene stopt de andere niet.
  De pagina van de selectie staat in `wikipedia_pages` met `kind` `squad`, voor de bronvermelding op de zoekpagina (#107).
  `listWikipediaPages` geeft alleen de pagina's van de wedstrijden, dus de selectie staat niet in de bronvermelding van `/wedstrijden`.
  Een goede lezing vervangt de selectie van het lopende seizoen, maar zet de zoekterm alleen bij een nieuwe speler: een speler die er al is, houdt de zoekterm die hij heeft.
  De naam geldt als dezelfde speler zoals de database namen vergelijkt, zonder accenten en hoofdletters.
  Een naam die met een voorvoegsel begint, zoals "Van Bergen", heeft geen voornaam en blijft heel.
  De seed zet een verzonnen selectie, maar alleen in een lopend seizoen zonder spelers, zoals bij de verzonnen wedstrijden (zie _De verzonnen wedstrijden komen alleen in een leeg seizoen_).
- **Waarom:** een eigen rij houdt een mislukte selectie en een mislukte wedstrijdlezing uit elkaar, en de wedstrijden en de feeds gaan door als de tabel van de selectie verandert.
  Een zoekterm die de import elk uur terugzet, maakt de eigen kolom zinloos: een verbetering voor één speler, zoals "Jan Paul van Hecke", blijft zo staan tot hij vertrekt.
- **Alternatieven:** de gezondheid van de selectie in `match_imports` zetten (een kolom of rij erbij voor iets wat een eigen uur en een eigen uitkomst heeft).
  De zoekterm bij elke lezing opnieuw afleiden (de eigen kolom heeft dan geen nut).
- **Later:** een goede lezing vervangt de selectie sinds 26 oktober 2026 niet meer: een speler die niet meer in de tabel staat, verdwijnt niet maar blijft staan als "niet meer in de selectie", met zijn `id` en zijn doelpunten; zie _Spelers hebben een vaste `id`, en doelpunten verwijzen ernaar_.
- **Later:** de naam van een persoon komt sinds #715 uit de sorteersleutel van zijn artikel; de zoekterm van een speler (`players.search_term`) blijft voor de zoekpagina. Zie _De import leest de naam van een persoon uit de sorteersleutel van zijn artikel_ hieronder.

## Spelers hebben een vaste `id`, en doelpunten verwijzen ernaar

- **Datum:** 26 oktober 2026
- **Besluit:** een doelpunt van een speler van ons verwijst met `player_id` naar zijn rij in `players`.
  De rij houdt zijn `id` bij elke import.
  Een speler die uit de selectie verdwijnt, blijft staan als "niet meer in de selectie".
- **Waarom:** een naam in tekst koppelt twee spelers met dezelfde achternaam aan elkaar, en een achternaam komt niet overeen met de volledige naam in de selectie.
  Een verwijzing naar de rij maakt de topscorers juist, en geeft latere functies (een pagina per speler, statistieken) een vaste plek.
  De selectie moet daarvoor worden bijgewerkt en niet vervangen, anders breekt elke nieuwe import de verwijzingen.
- **Hoe:** `players` heeft `in_squad` en `left_squad_at`, en `match_goals` heeft `player_id` (`ON DELETE SET NULL`) en `wikipedia_page`.
  De import van de selectie zoekt een speler op zijn pagina en anders op zijn naam, zonder accenten en hoofdletters, en past hem aan: een nieuwe speler komt erbij, naam, positie, rugnummer en pagina worden bijgewerkt, en wie terugkomt staat weer in de selectie.
  Wie uit de tabel verdwijnt, krijgt `in_squad` onwaar en het moment in `left_squad_at`, en blijft staan met zijn doelpunten.
  `listSquad` toont alleen de spelers die in de selectie staan, dus ook de lijst van #107.
  De kaart met doelpuntenmakers telt een gekoppeld doelpunt per `id` en toont de volledige naam, een doelpunt zonder speler per naam als een eigen rij.
- **Alternatieven:** doorgaan met namen in tekst en per naam tellen (twee spelers met dezelfde achternaam tellen samen); de verwijzing maken met de zoekterm of de achternaam (breekt bij dezelfde achternaam); de selectie bij elke lezing vervangen en de doelpunten opnieuw koppelen (de `id`'s veranderen, dus een link of een pagina per speler breekt later).
- **Later:** een doelpunt zonder speler maar met een Wikipedia-pagina telt sinds 30 oktober 2026 voor die pagina en toont de titel als volledige naam; zie _Zonder koppeling is de naam van een doelpuntenmaker de titel van zijn Wikipedia-pagina_.
- **Later:** elke doelpuntenmaker en elke speler van de selectie met een pagina heeft sinds 4 november 2026 ook een persoon met een eigen `id` (`person_id`), die alle titels van zijn artikel bij elkaar houdt; zie _Een speler is een persoon met een eigen `id`, en elke titel van zijn artikel hoort erbij_ in `hosting-en-data.md`.
  De rijen van `players` blijven één per speler en seizoen.
- **Later:** de kaart met doelpuntenmakers telt sinds 5 november 2026 per persoon en niet meer per `id` van de speler; zie _De site telt per persoon en toont de bewaarde naam, en raadt niets_ in `site.md`.
- **Later:** een rij in `players` heeft sinds 5 november 2026 een `source` (hoe volledig de bron was) en een positie die leeg mag zijn.
  De rij blijft één per speler en seizoen.
  Zie _Een rij in `players` blijft een speler in een seizoen, met een bron en soms zonder positie_ in `hosting-en-data.md`.
  De import van de selectie schrijft `selectie` bij een nieuwe speler.
- **Later:** een speler met de bron `doelpunten` stond nooit in de tabel van de selectie en krijgt sinds 10 november 2026 dus ook niet "niet meer in de selectie".
  Staat hij later wel in de tabel, dan houdt hij zijn `id` en wordt zijn bron `selectie`.
  Zie _Een doelpuntenmaker met een eigen pagina wordt een speler van het seizoen_.
- **Later:** de import werkt sinds 10 november 2026 een veld dat de redactie zette niet meer bij, en een speler met de bron `redactie` krijgt niet "niet meer in de selectie"; zie _Wat de redactie van een speler zette, schrijft de import niet over_.

## De Wikipedia-pagina van een speler is de sleutel, de naam is de reserve

- **Datum:** 26 oktober 2026
- **Besluit:** de importer koppelt eerst op de pagina van de link, dan op de volledige naam, dan op een achternaam die maar één speler heeft, en laat anders `player_id` leeg.
- **Waarom:** de pagina is wat Wikipedia zelf in de selectie en in de doelpunten gebruikt, en is uniek per speler.
  De volledige naam en de achternaam vangen schrijfwijzen op die de pagina niet geven, zonder een gok bij twee spelers met dezelfde achternaam.
- **Hoe:** de regels staan op één plek, `playerLinker` in `apps/importer/src/link-players.ts`, en de import van de wedstrijden past ze toe bij elke lezing.
  Alleen een doelpunt van een speler van ons krijgt een koppeling: een doelpunt van sc Heerenveen dat geen eigen doelpunt is, en een eigen doelpunt dat bij de tegenstander staat.
  De spelers van andere clubs staan niet in `players`.
  Bij de achternaam tellen ook spelers die niet meer in de selectie staan, zodat een vertrokken speler met dezelfde achternaam een gok niet verkeerd laat uitvallen.
  Een doelpunt van ons dat niet te koppelen is, houdt de wedstrijd bewaard en geeft een waarschuwing met het aantal en de namen, zodra de selectie is gelezen.
  `pnpm run import:status` toont hetzelfde aantal.
  Zo'n doelpunt krijgt zijn speler bij een latere lezing, want de import van de wedstrijden schrijft de doelpunten van een wedstrijd opnieuw als een koppeling verandert.
- **Alternatieven:** alleen op de achternaam koppelen (fout bij dezelfde achternaam); een koppeling met de hand in het beheer (er is geen redactieproces voor, en na elke transfer verouderd).
- **Later:** de importer koppelt sinds 4 november 2026 eerst op de persoon van de pagina (`person_id`), dan op de pagina, de volledige naam en de achternaam, zoals hierboven.
  Een doelpunt onder een doorverwijzing van de pagina van de speler krijgt zo zijn `player_id`.
  Hebben twee spelers van een seizoen dezelfde persoon, dan slaat de regel van de persoon over en beslist de pagina.
  Zie _Een titel wordt één keer opgevraagd, en een mislukt verzoek is een waarschuwing_.
- **Later:** zie _Een doelpuntenmaker met een eigen pagina wordt een speler van het seizoen_ (10 november 2026).
  Vindt geen regel de doelpuntenmaker en linkt het doelpunt naar zijn pagina, dan maakt de import hem als speler van het seizoen.
  De waarschuwing blijft voor een doelpunt zonder link.

## De eerste goede lezing van de selectie vervangt de verzonnen selectie

- **Datum:** 27 oktober 2026
- **Besluit:** de eerste goede lezing van de selectie van een seizoen haalt eerst de spelers van dat seizoen weg, en zet dan de spelers van Wikipedia erin.
  Daarna werkt de import de selectie alleen nog bij.
- **Waarom:** de seed zet een verzonnen selectie, zoals bij de verzonnen wedstrijden.
  Zonder deze regel bleven die spelers voor altijd staan als "niet meer in de selectie", en kon een doelpunt van een echte speler op een verzonnen speler met dezelfde achternaam vallen.
  De import herkent de eerste goede lezing eraan dat `squad_imports` nog geen geslaagde lezing heeft.
- **Alternatieven:** de verzonnen spelers laten staan (rommel in de tabel en kans op een verkeerde koppeling); de verzonnen spelers een eigen seizoen geven (de pagina's tonen dan niets in het lopende seizoen, zoals bij de verzonnen wedstrijden).
- **Later:** de eerste goede lezing laat sinds 10 november 2026 de spelers met de bron `doelpunten` staan: de import van de wedstrijden maakte ze, niet de seed.
  Zie _Een doelpuntenmaker met een eigen pagina wordt een speler van het seizoen_.
- **Later:** de eerste goede lezing laat sinds 10 november 2026 ook de spelers staan die de redactie toevoegde of aanpaste; zie _Wat de redactie van een speler zette, schrijft de import niet over_.

## Een eerder seizoen wordt eenmalig geïmporteerd met een opdracht, zonder selectie

- **Datum:** 29 oktober 2026
- **Besluit:** `pnpm run import:season <seizoen>` importeert de wedstrijden, doelpunten, stand en bronpagina's van een afgelopen seizoen, zoals `2025/26`.
  De opdracht gebruikt dezelfde fetcher, controles en opslag als de uurlijkse import, in één transactie, en kost drie verzoeken aan Wikipedia.
  De uurlijkse import blijft het lopende seizoen lezen, en `pnpm run import:status` gaat over het lopende seizoen.
  De selectie van een eerder seizoen komt er niet bij, dus die doelpunten hebben geen `player_id`.
- **Waarom:** een afgelopen seizoen verandert niet meer, dus elk uur lezen kost verzoeken aan Wikipedia zonder winst.
  Een aparte opdracht met een controle op het seizoen houdt het lopende seizoen veilig: de opdracht weigert het lopende en een toekomstig seizoen, voordat ze iets vraagt of schrijft.
  De vergelijking met het vorige seizoen (#413) heeft de selectie niet nodig, en `players` is een begrip van nu.
- **Gevolg:** op de host draait de opdracht uit hetzelfde bestand als de uurlijkse import, met `import.mjs --season 2025/26`, zodat de host geen tweede bestand nodig heeft.
  Zonder die optie doet het bestand niets anders dan voorheen.
  De opdracht neemt de lock van de import, dus ze loopt nooit naast een run van cron.
  Ze schrijft wel de rij van dat seizoen in `match_imports`, maar de status en de waarschuwingen tellen alleen het lopende seizoen, zodat een seizoen dat niet wordt ververst nooit als ongezond meetelt.
- **Alternatieven:** de uurlijkse import ook het vorige seizoen laten lezen (verzoeken zonder reden, en een seizoen dat ongezond kan worden).
  Een parameter van `pnpm run import` zelf (een foutje met de opdracht raakt dan de uurlijkse run).
  Ook de selectie van 2025/26 importeren (nodig voor spelers bij doelpunten, maar niet voor deze vergelijking).
- **Later:** de selectie van eerdere seizoenen wordt onderzocht in `docs/onderzoek-spelers-sinds-1990.md` (#676).
  Er is nog niets gekozen, dus dit besluit blijft gelden tot de projecteigenaar kiest.
- **Later:** zie _De selectie van eerdere seizoenen komt in een eerste versie met gaten, en een tweede lezing haalt niemand weg_.
  Een eerder seizoen kan sinds 6 november 2026 wel een selectie hebben, met `pnpm run import:squad <seizoen>`.
  Het uitgangspunt "de selectie van een eerder seizoen komt er niet bij" geldt dus niet meer, en de doelpunten van een eerder seizoen krijgen hun `player_id` bij de volgende `import:season`.
- **Later:** zie _Een wijziging van Wikipedia krijgt een betrouwbaarheid, en een verdachte wijziging wacht_.
  Een seizoen dat al in de database staat, verandert niet zomaar meer: een verschil dat iets overschrijft wacht bij een tweede lezing tot een mens besluit (`pnpm run import:changes`) of tot de opdracht het na zeven dagen weer leest.
  Een eerste lezing en een lezing zonder verschil werken zoals hier staat.
- **Later:** zie _Het seizoen dat net voorbij is, wordt tot 1 september nog elke week gelezen_ (9 november 2026): de uurlijkse import leest in juli en augustus ook het vorige seizoen, één keer per week.
  Het alternatief "de uurlijkse import ook het vorige seizoen laten lezen" is daarmee voor twee maanden gekozen; de status en de mail gaan nog steeds alleen over het lopende seizoen.
- **Later:** `import:season` leest nog steeds geen selectie, maar maakt sinds 10 november 2026 wel een speler van een doelpuntenmaker van ons met een eigen pagina; zie _Een doelpuntenmaker met een eigen pagina wordt een speler van het seizoen_.

## De cijfers van een speler staan in een eigen tabel, per seizoen en competitie

- **Datum:** 31 oktober 2026
- **Besluit:** de importer bewaart per speler, per seizoen en per competitie (`Eredivisie` en `KNVB Beker`) het aantal wedstrijden, doelpunten en assists, uit dezelfde tabel "Spelers" op de Nederlandse Wikipedia waaruit hij de selectie leest.
  Ze staan in een nieuwe tabel, `player_season_stats` (#407), met het moment van de laatste wijziging.
  De kaarten die ze tonen volgen in #493.
- **Waarom:** de projecteigenaar wil meer van de spelers bewaren dan een naam, een positie en een nummer, en de tabel staat al op de pagina die we elk uur lezen.
  Een eigen tabel laat `players` zoals het was: de cijfers van een speler die vertrekt blijven staan, en de schakelaar van #406 raakt de selectie niet.
  De bron en de licentie zijn die van de selectie: de Nederlandse Wikipedia, via `/wiki/…?action=raw`, CC BY-SA 4.0, met de bronvermelding van de pagina.
- **Hoe:**
  - **De tabel:** één rij per speler, seizoen en competitie (uniek), met een verwijzing naar `players` met `ON DELETE CASCADE`.
    Het totaal heeft geen rij, want het is de som.
    "W" telt ook invalbeurten: het zijn geen minuten en geen basisplaatsen.
  - **De import:** de importer leest de cellen na het contract in dezelfde lezing en dezelfde transactie als de selectie.
    Een speler die uit de tabel verdwijnt, houdt zijn laatste cijfers.
    Een lege cel geeft geen rij en een streepje is nul.
    Een waarde die we niet kennen, een rij met een ander aantal cellen en kopjes in een andere volgorde dan Eredivisie en KNVB Beker geven een waarschuwing en geen rij, en stoppen de selectie niet.
    Een speler die niet te koppelen is, geeft een waarschuwing en een overgeslagen rij.
  - **De controle:** de tabel wordt met de hand bijgehouden en loopt soms een speelronde achter.
    De importer vergelijkt daarom na elke lezing de doelpunten van een speler per competitie met de doelpunten uit de wedstrijden (`match_goals`, zonder eigen doelpunten) en waarschuwt in het logboek bij een verschil, met de naam, het seizoen, de competitie en de twee aantallen.
    Hij verbetert niets en stopt niets: de tabel is de bron van de cijfers die we tonen.
    Zonder een gespeelde wedstrijd in het seizoen zegt hij niets.
  - **De query:** `listSeasonPlayerStats` in `packages/db` geeft de cijfers van een seizoen per speler en competitie.
  - **Het seizoen:** alleen het lopende seizoen, want alleen dat heeft een selectie in onze gegevens.
    Afgelopen seizoenen volgen met #414.
- **Alternatieven:** kolommen in `players` (een speler met een rij per seizoen krijgt dan cijfers per competitie in breedte, en de schakelaar van #406 raakt ze); de cijfers uit de wedstrijden zelf tellen (het is al wat de kaart met doelpuntenmakers doet, maar assists en optredens staan niet in de wedstrijden); de cijfers van de site van de club of van een statistiekensite halen (geen toestemming, en een tweede bron die met de Wikipedia kan botsen); de tabel van Wikipedia laten winnen van de wedstrijden of andersom bij een verschil (het is onbekend welke van de twee loopt achter, dus de importer laat het verschil zien en kiest niet).
- **Later:** zie _De kaarten Assists, Minuten en Alle spelers lezen alleen de verslagen_ in `site.md` (7 november 2026): de kaarten die #493 vroeg, komen uit de verslagen en niet uit deze tabel.
  Deze tabel blijft staan, maar de pagina's tonen hem niet; de doelpunten ervan worden vergeleken met die van de verslagen, en een verschil gaat in het logboek van het beheer (`player.stats-differ`, zie dezelfde beslissing in `site.md`).
- **Later:** sinds #974 is zo'n verschil een rij in `player_stat_differences` en geen waarschuwing of regel in het logboek; zie _Een verschil in de cijfers van een speler staat in een eigen tabel_.

## De bekerpagina's van eerdere seizoenen schrijven de score met de stand bij de rust, en de lezer kent die vorm

- **Datum:** 30 oktober 2026
- **Besluit:** `readCup` leest `eindstand (rust)` en `eindstand (stand na 90 minuten, rust)`, en een tijd met of zonder "uur".
  De eindstand is de score van de wedstrijd, en de waarden in de haakjes worden gelezen en gecontroleerd maar nog niet opgeslagen.
- **Waarom:** de pagina's van 2021/22 tot en met 2024/25 schrijven zo, en zonder dit stopt de import van die seizoenen.
  De stand na 90 minuten is de gegevens waar #300 om vraagt, dus de lezer vergeet hem niet.
- **Controles:** een stand bij de rust is niet hoger dan de stand na 90 minuten of, zonder die, de eindstand.
  Een stand na 90 minuten is niet hoger dan de eindstand en hoort bij een wedstrijd met verlenging (`aet`).
  Een score die niet klopt, is een fout met de naam van de wedstrijd, zoals een score die niet te lezen is.
  De haakjes werken ook voor de competitie, want de lezer van een score is voor beide dezelfde; de competitiepagina's van 2021/22 tot en met 2024/25 hebben ze niet.
- **Alternatieven:** de haakjes weggooien (de stand na 90 minuten gaat dan verloren en #300 moet de pagina opnieuw lezen).
  Elke onbekende vorm als fout laten staan (de import van eerdere seizoenen mislukt).
- **Later:** zie _De stand na 90 minuten komt uit het eerste paar van `half time score`_: de stand na 90 minuten uit de haakjes wordt nu bewaard en getoond; de stand bij de rust niet.

## Een club is één artikel op Wikipedia, met een vaste slug voor zijn adres

- **Datum:** 31 oktober 2026
- **Besluit:** elke tegenstander is een club in de tabel `clubs`, en elke wedstrijd verwijst ernaar met `matches.club_id`.
  Een club is één artikel op de Nederlandse Wikipedia: `wikipedia_page` is de titel van dat artikel, en een club met twee schrijfwijzen is nog steeds één rij.
  De andere schrijfwijzen staan in `club_names`.
  De `slug` is de vaste naam in een adres.
  Hij komt van de naam bij het aanmaken, zonder accenten, punten en apostrofs (`N.E.C.` geeft `nec`), met `-2` erachter als een andere club hem al heeft, en verandert nooit meer, ook niet als de naam verandert.
  `kies` is voorbehouden, want de site gebruikt `kies` zelf in een adres, zoals `/statistieken/kies`.
- **Waarom:** de pagina's per tegenstander (#415) hebben een adres nodig dat blijft werken.
  Een naam is dat niet: clubs veranderen van naam, fuseren, en Wikipedia schrijft dezelfde club in de competitie en in de beker soms anders (`N.E.C.` en `NEC`).
  Het artikel is wat Wikipedia zelf als identiteit gebruikt, zoals bij de spelers.
- **Hoe:** de importer zoekt bij elke wedstrijd de club met het artikel dat de wedstrijd linkt, en anders de club met die naam of een van zijn andere namen, zonder verschil in hoofdletters, accenten en leestekens.
  Vindt hij er geen, dan maakt hij een club.
  Een naam die de club nog niet had, komt bij zijn andere namen; hoort de wedstrijd bij het nieuwste seizoen dat we van de club hebben, dan wordt het de naam van de club.
  Elke nieuwe club en elke nieuwe naam staat in het logboek van de run, met de naam en het artikel en zonder gegevens van personen.
  De migratie `0021_add_clubs` maakt clubs van de bestaande waarden van `opponent`, zodat elke wedstrijd direct een club heeft, en de importer vult het artikel aan bij de volgende lezing.
  `relevance-terms.ts` blijft zoals het is: de namen voor het filter van de koppen hebben een ander doel.
- **Twee clubs samenvoegen:** een Builder of de projecteigenaar doet dat met de hand, in één transactie: de wedstrijden en de andere namen van de club die weggaat gaan naar de club die blijft, zijn naam wordt een andere naam van die club, en dan verdwijnt zijn rij.
  De README van `@fansite/db` heeft de vier opdrachten.
  Er komt geen commando voor, want het komt zelden voor.
  Een club die een eigen artikel heeft, is geen samenvoegen: één artikel is één club.
- **Bron en licentie:** de naam van de club en de titel van het artikel komen uit de wedstrijdpagina's van de Nederlandse Wikipedia, via `/wiki/<pagina>?action=raw`, dus onder CC BY-SA 4.0 zoals de andere gegevens van Wikipedia (zie _Onze wedstrijdgegevens zijn CC BY-SA 4.0_).
  De bronvermelding op de site verandert niet.
- **Nadeel:** een club die Wikipedia op twee manieren linkt, zoals `Excelsior` zonder en `Excelsior Rotterdam` met een artikel, wordt twee clubs tot iemand ze samenvoegt.
  De import raadt dat niet, net als bij de spelers met dezelfde achternaam.
- **Alternatieven:** de naam als sleutel en slug (breekt bij elke nieuwe schrijfwijze); een tabel met alleen een lijst van namen zonder artikel (dan is een fusie of een naamswijziging niet te zien); de slug uit de huidige naam laten volgen (een adres dat verandert, breekt links); een samenvoegcommando (nu niet nodig).
- **Later:** zie _Een club heeft een volledige naam, en een kleine lijst in de importer zegt welke schrijfwijzen dezelfde club zijn_ (31 oktober 2026): het nadeel hierboven is voor de clubs in die lijst opgelost, en de importer voegt zo'n club zelf samen.
  De rest van deze beslissing blijft: één artikel is één club, de slug verandert niet door een andere naam, en een club die niet in de lijst staat, voegt de projecteigenaar nog met de hand samen.
  Alleen bij het samenvoegen van een club uit de lijst verandert de slug van de club die blijft.
- **Later:** zie _Een doorverwijzing op Wikipedia is hetzelfde artikel, dus dezelfde club_ (3 november 2026): één artikel is één club, na de doorverwijzingen.
  De titel van een artikel dat een doorverwijzing is, telt als het artikel waar hij naar verwijst, en `wikipedia_page` is de titel van het echte artikel.
  Een club die onder de titel van een doorverwijzing staat, voegt de importer zelf samen, dus alleen een club zonder doorverwijzing voegt de projecteigenaar nog met de hand samen.
- **Later:** zie _De lijst van namen is alleen voor de weergave, en de import houdt de naam in de kop_ (4 november 2026): de naam en de slug blijven van de import, maar de redactie kan namen toevoegen aan `club_names` via een lijst in het beheer.

## Een club heeft een volledige naam, en een kleine lijst in de importer zegt welke schrijfwijzen dezelfde club zijn

- **Datum:** 31 oktober 2026
- **Besluit:** de importer heeft een kleine, vaste lijst van clubs met hun volledige naam en hun andere schrijfwijzen, `clubFullNames` in `apps/importer/src/club-names.ts`.
  Nu is dat één club: `Excelsior Rotterdam`, met `Excelsior` en `SBV Excelsior` (#511).
  - De importer zoekt een naam eerst in die lijst.
    `Excelsior`, `SBV Excelsior` en `Excelsior Rotterdam` zijn dezelfde club, met of zonder artikel, en de club heet altijd de volledige naam.
    Een naam die er niet in staat, werkt zoals voorheen, dus `Excelsior Maassluis` blijft een andere club.
  - De pagina's tonen de volledige naam, met de slug ervan, `excelsior-rotterdam`.
    De andere schrijfwijzen staan in `club_names` en nergens op de pagina.
  - Staat een club uit de lijst twee keer in de database, dan voegt de importer ze samen bij de eerstvolgende lezing van een seizoen, in dezelfde transactie als de import (`repairClubs` in `@fansite/db/clubs`).
    De club met een artikel blijft, anders die met de meeste wedstrijden, anders de oudste.
    De wedstrijden en de andere namen gaan naar die club, de naam van de club die weggaat wordt een andere naam, en dan verdwijnt zijn rij.
    De club die blijft krijgt de volledige naam en de slug ervan.
    De oude slug, `excelsior`, vervalt zonder omleiding.
    Elke samenvoeging, naamswijziging en nieuwe naam staat in het logboek van de run.
  - Hebben twee clubs elk een eigen artikel, dan voegt de importer ze niet samen: één artikel is één club.
    Hij zegt dat in het logboek.
  - Meer clubs komen alleen op de lijst als de projecteigenaar het per club beslist.
    Bij het zoeken naar zulke paren in de lokale gegevens stond alleen Excelsior dubbel.
- **Waarom:** de pagina Tegenstanders (#415) toonde `Excelsior` en `Excelsior Rotterdam` als twee clubs, omdat Wikipedia de club in het programma met een link en in de beker zonder schrijft.
  De projecteigenaar wil één club met één adres en de volledige naam, zoals bij Sparta Rotterdam.
  De importer kan niet raden dat twee schrijfwijzen dezelfde club zijn: `Excelsior Maassluis` begint ook met `Excelsior`.
  Een lijst met namen is dan de kleinste oplossing, en de projecteigenaar kijkt per club mee.
- **Hoe:** de importer herstelt de bestaande gegevens zelf bij de volgende lezing en niet met een migratie.
  De lokale gegevens zijn echte importen, en op acceptatie en productie draait de import elk uur: een migratie zou dezelfde stappen maken zonder dat ze in het logboek van de run komen.
  Een tweede lezing verandert niets meer.
- **Nadeel:** een club moet op de lijst staan voordat hij goed samengaat.
  Een nieuw paar dat niet op de lijst staat, wordt nog steeds twee clubs tot iemand het ziet.
  De lijst is een tweede plek met clubnamen naast `otherClubGroups` in `relevance-terms.ts`; die twee hebben een ander doel en blijven los.
- **Alternatieven:** de volledige naam raden uit het begin van een naam (`Excelsior` en `Excelsior Maassluis` zouden samenvallen); een migratie die de twee clubs samenvoegt (geen regel in het logboek, en de lijst moet in de importer toch bestaan); een samenvoegcommando (een commando voor één club, en de lijst doet het vanzelf); de oude slug laten omleiden (er zijn nog geen openbare links, zie #33).
- **Later:** zie _Het herstel van de clubs draait aan het begin van elke run, en een datum van meer dagen is een datum in elke schrijfwijze_ (1 november 2026): het herstel draait aan het begin van de run, vóór een seizoen wordt gelezen, en in een eigen transactie in plaats van in de transactie van de import.
  De rest blijft: de lijst, de volledige naam en de slug, wie blijft en wat er in het logboek komt.
- **Later:** zie _Een doorverwijzing op Wikipedia is hetzelfde artikel, dus dezelfde club_ (3 november 2026): "Hebben twee clubs elk een eigen artikel, dan voegt de importer ze niet samen" geldt alleen voor artikelen die geen doorverwijzing zijn.
  `SBV Excelsior` is een doorverwijzing naar `Excelsior Rotterdam`, dus voor Excelsior Rotterdam komt de waarschuwing niet meer voor; ze blijft voor een lijstclub met twee echte artikelen.
  "Meer clubs komen alleen op de lijst als de projecteigenaar het per club beslist" blijft voor namen, maar een titel die een doorverwijzing is, hoeft er niet op: de importer vraagt dat aan Wikipedia.
  `clubFullNames` blijft zoals hij is.

## Het herstel van de clubs draait aan het begin van elke run, en een datum van meer dagen is een datum in elke schrijfwijze

- **Datum:** 1 november 2026
- **Besluit:** twee dingen, uit #532.
  - De reader leest een datum van meer dagen in alle schrijfwijzen die Wikipedia gebruikt: een koppelteken of een gedachtestreepje met of zonder spaties, met of zonder tweede maand, en met het jaar achter de laatste dag of achter beide: `1–3 december 2026`, `12-14 februari 2027`, `30 november–2 december 2026`.
    De eerste dag is `match_date`, de tekst van Wikipedia staat in `date_text` en `kickoff_at` is leeg.
    Een datum zonder jaar, een laatste dag voor de eerste, een dag die niet bestaat of een tekst die we niet kennen, blijft een fout met dezelfde melding, en dan verandert er niets.
  - `repairClubs` draait aan het begin van elke run, vóór een seizoen wordt gelezen, in een eigen transactie (`repairKnownClubs` in `apps/importer/src/import-matches.ts`), ook in `pnpm import:season`.
    Het wacht niet op een seizoen dat te lezen is.
    Het is idempotent en schrijft zijn regels met `Clubs:` vooraan in de uitvoer.
    Een fout in het herstel is een waarschuwing in de uitvoer en in `match_imports.last_warning` van het lopende seizoen, en houdt de import niet tegen.
- **Waarom:** de import van 2026/27 stond sinds minstens 31 oktober stil, op de datum `1–3 december 2026` van de tweede ronde van de beker.
  De reader kende een datum van meer dagen alleen met een koppelteken (`12-14 februari 2027`), niet met het gedachtestreepje dat Wikipedia hier gebruikt.
  Eén datum die de reader niet kent, houdt de hele import van het seizoen tegen (zie _Een gestaakte wedstrijd telt niet, de latere uitslag geldt_: een gok is erger dan een fout), dus nieuwe uitslagen kwamen niet binnen.
  Het herstel van Excelsior en Excelsior Rotterdam zat in het opslaan van de wedstrijden van een seizoen en kwam daardoor ook niet aan de beurt: op acceptatie stonden nog twee clubs.
  Een herstel van de database hoort niet af te hangen van een pagina op Wikipedia.
- **Nadeel:** het herstel draait nu elke run, ook als er niets te herstellen is: enkele kleine query's per run, op een lijst van één club.
  Een datum zonder jaar leest de reader nog niet, omdat het jaar dan een gok is.
  Eén wedstrijd met een datum die we niet kennen houdt de import van het seizoen nog steeds tegen: dat blijft zo.
  Niets meldt de projecteigenaar dat de import stilstaat; hij ziet het in de uitvoer van de run en in `import:status` (zie de README van de importer).
- **Alternatieven:** alleen de datum herstellen (het herstel van de clubs blijft dan afhangen van een geslaagde lezing van een seizoen, en de volgende onbekende schrijfwijze zet alles weer stil).
  Een wedstrijd met een datum die we niet kennen overslaan en de rest bewaren (dat is de regel van _Een gestaakte wedstrijd telt niet, de latere uitslag geldt_ omgekeerd, en een overgeslagen wedstrijd zou uit de lijst verdwijnen).
  Het jaar van een datum zonder jaar afleiden uit het seizoen (een gok; Wikipedia schrijft het jaar bij elke datum in de sjablonen die we lazen).
  Het herstel in de transactie van de import laten, maar dan ook als het seizoen niet leest (de transactie bestaat dan niet).
- **Later:** zie _Een datum zonder jaar krijgt het jaar van het seizoen_ (4 november 2026): op de wedstrijdpagina van de competitie leest de reader een datum met dag en maand en zonder jaar, met het jaar van het seizoen.
  Op andere pagina's, en voor een datum van meer dagen, blijft een datum zonder jaar een fout.
- **Later:** zie _Het herstel van clubs onder een doorverwijzing hoort bij de import, zoals dat van de lijst_ (3 november 2026): `repairKnownClubs` doet nu twee stappen, eerst het herstel van de doorverwijzingen en dan dat van de lijst.
  De rest blijft: aan het begin van elke run, in een eigen transactie, en een fout is een waarschuwing.

## Een gestaakte wedstrijd telt niet, de latere uitslag geldt

- **Datum:** 29 oktober 2026
- **Besluit:** een blok met de score "Gestaakt ..." telt niet zolang de pagina onder dezelfde kop (dezelfde speelronde) voor dezelfde twee clubs een later blok heeft.
  Het latere blok geldt, met zijn datum en aftrap.
  Zonder later blok stopt de import met een fout die de wedstrijd noemt.
  Een voetnoot (`<ref>...</ref>`) haalt de reader weg voordat hij de pagina leest, dus een datum met een voetnoot leest als de datum.
- **Waarom:** de pagina van 2025/26 heeft twee blokken voor NAC Breda – sc Heerenveen in speelronde 33, en de uitslag van de KNVB (2–0, op 11 mei 2026) is de definitieve.
  Een tweede blok in dezelfde speelronde zou de controle op één wedstrijd per ronde laten falen.
  Een gok bij een onbekende score is erger dan een fout.
- **Alternatieven:** de gestaakte wedstrijd houden en het latere blok overslaan (de datum en de aftrap kloppen dan niet met de definitieve uitslag).
  Elke "Gestaakt"-score als fout laten staan (het vorige seizoen is dan niet te lezen).
- **Later:** zie _Een gestaakte wedstrijd telt voor zijn begin, het restant geeft de uitslag en een regel_: het gestaakte blok telt nu voor het stadion, de datum, de aftrap en thuis of uit; het latere blok geeft nog de uitslag en de doelpunten.
  Zonder later blok blijft het een fout.

## Een kop over de tegenstander is `relevant` in de week voor en na de wedstrijd

- **Datum:** 26 oktober 2026
- **Besluit:** noemt een kop een club tegen wie sc Heerenveen een wedstrijd speelt die hoogstens 7 dagen voor of na de publicatie ligt, dan is de kop `relevant`, ook zonder de naam van onze club.
- **Waarom:** de voorbeschouwing en de nabeschouwing van een wedstrijd gaan ook over ons, en de kop noemt vaak alleen de tegenstander ("ADO beleeft frustrerende avond").
  De wedstrijden staan sinds #27 in de database, dus het filter kan weten wie wanneer onze tegenstander is.
- **Hoe:** de regel komt erbij op het eind van `judgeRelevance`, en maakt alleen van een `doubtful` of `irrelevant` kop een `relevant` kop.
  - `judgeRelevance` blijft zuiver.
    Het krijgt de namen van de tegenstanders als tweede argument, en leest zelf niets uit de database.
  - `importFeeds` leest de wedstrijden van het lopende seizoen één keer per run, en geeft `opponentsAround` bij elk bericht de wedstrijden mee.
    Wedstrijden van een eerder seizoen tellen niet, want `pnpm import:season` zet er ook in de tabel.
    Een wedstrijd die de Wikipedia-import in dezelfde run bewaart, telt vanaf de volgende run.
  - Het venster loopt van de datum van de wedstrijd min 7 dagen tot en met plus 7 dagen.
    De dag van het bericht en `match_date` zijn Nederlandse dagen (`Europe/Amsterdam`).
    Een uitgestelde wedstrijd zonder nieuwe datum telt niet.
    Een club die twee keer tegen ons speelt, heeft per wedstrijd een venster.
  - Het verband tussen de naam in `matches.opponent` en de woorden van het filter staat in `relevance-terms.ts`: `otherClubGroups` zet de namen van één club bij elkaar ("ado den haag" en "ado", "nec" en "n e c").
    De naam uit de wedstrijd, of zonder voor- of achtervoegsel uit `clubPrefixes` (FC, SC, VV, SV, AFC), moet een van die namen zijn.
    Een club die naar een plaats heet, telt dus alleen met zijn volledige naam ("FC Twente").
  - Staat de tegenstander niet in de lijst, zoals een amateurclub in de beker, dan telt zijn naam zonder voor- of achtervoegsel, als hij uit twee woorden bestaat ("Excelsior Maassluis", "Quick Boys").
    Eén woord telt ook, tenzij het een gewoon woord is (`ordinaryClubWords`) of alleen een voorvoegsel ("AFC").
- **Nadeel:** de regel kijkt niet of de kop over de wedstrijd tegen ons gaat.
  Een kop over een andere wedstrijd van de tegenstander in die week wordt ook `relevant` (zie de meting in de pull request van #315).
- **Alternatieven:** niets doen (een supporter mist de berichten over de tegenstander rond de wedstrijd).
  Elke kop met een andere profclub `relevant` maken (te veel: elk bericht over de Eredivisie komt erdoor).
  `doubtful` in plaats van `relevant` (de projecteigenaar wil ze tonen).
  Een ander venster dan 7 dagen (een week voor en na past bij de speelweek, en de Builder kan het meten).
  Het filter zelf de database laten lezen (dan is het niet meer zuiver en zijn de tests trager).
- **Later:** zie _Een kop over de tegenstander is `relevant` van 3 dagen voor tot 3 dagen na de wedstrijd, en alleen als hij geen andere profclub noemt_: het venster is 3 dagen voor en 3 dagen na de wedstrijd, en een kop met een tweede profclub telt niet.
  De rest blijft: het filter blijft zuiver, alleen het lopende seizoen telt, de dagen zijn Nederlandse dagen en `otherClubGroups` legt het verband met de namen.

## Een kop over de tegenstander is `relevant` van 3 dagen voor tot 3 dagen na de wedstrijd, en alleen als hij geen andere profclub noemt

- **Datum:** 30 oktober 2026
- **Besluit:** het venster van de regel over de tegenstander loopt van 3 dagen voor tot en met 3 dagen na de dag van de wedstrijd, en een kop die ook een andere profclub uit `otherClubGroups` noemt, telt niet.
  - `opponentDaysBefore` en `opponentDaysAfter` zijn allebei 3 in `apps/importer/src/relevance.ts`.
    Een bericht van 3 dagen voor de wedstrijd telt, een bericht van 4 dagen ervoor niet, en een bericht van 3 dagen erna telt, een bericht van 4 dagen erna niet.
  - `judgeRelevance` laat de kop alleen door als hij een naam van de tegenstander heeft en geen naam van een andere club in de lijst.
    Een club die naar een plaats heet, telt als andere club alleen met zijn volledige naam, zoals de lijst nu al doet.
    De woorden van de naam van de tegenstander tellen niet mee als andere club, zodat "Excelsior Maassluis" niet ook "Excelsior" uit Rotterdam is.
- **Waarom:** de meting op de berichten die de importer toen had (30 oktober 2026): van de 8 koppen die de regel `relevant` maakte, ging er 1 over de wedstrijd tegen ons.
  De andere 7 gingen over een andere wedstrijd van de tegenstander in dezelfde week: vijf koppen over N.E.C. tegen Groningen, zes dagen voor onze wedstrijd tegen N.E.C., een podcast over ADO, en het bekerduel van ADO bij Excelsior'31.
  In de dagen voor de wedstrijd gaat het nieuws over de tegenstander vooral over hun vorige wedstrijd, en dat gaat niet over ons.
  Een nabeschouwing komt meestal in de dagen na de wedstrijd, dus het venster erna is even lang als dat ervoor.
- **Nadeel:** een voorbeschouwing van meer dan 3 dagen voor de wedstrijd mist de regel.
  Een kop over de tegenstander in de 3 dagen na de wedstrijd, die niet over de wedstrijd gaat (zoals een podcast over ADO), blijft `relevant`.
  Een nabeschouwing van meer dan 3 dagen na de wedstrijd mist de regel ook.
- **Alternatieven:** het venster van 7 dagen aan beide kanten houden (7 van de 8 koppen waren een misser).
  3 dagen voor en 7 dagen na (de eerste versie van dit besluit): dat gaf dezelfde twee koppen, maar een langer venster laat meer koppen door die niet over de wedstrijd gaan.
  Alleen de aanscherping met de tweede club (dat haalt twee van de zeven missers weg).
  Alleen het kortere venster (dat haalt de vijf koppen over N.E.C. weg).

## De importer mailt de projecteigenaar als dezelfde import drie runs achter elkaar faalt

- **Datum:** 1 november 2026
- **Besluit:** de importer stuurt een mail naar `ALERT_MAIL_TO` als dezelfde import drie runs achter elkaar faalt (#533).
  - Een import is een feed, de wedstrijden van het lopende seizoen, de selectie van het lopende seizoen en de nachtelijke back-up.
    Elke import telt apart.
  - Het getal staat op één plek, `alertAfterFailures` in `packages/db/src/alerts.ts`.
  - De derde mislukte run stuurt één mail, met de import, sinds wanneer, hoe vaak, de laatste foutmelding en de omgeving.
    Daarna volgt hoogstens één herinnering per 24 uur.
    De eerste run die weer slaagt na een melding stuurt één mail dat het weer werkt.
    Een run die slaagt zonder melding stuurt niets.
  - Dezelfde fouten tellen als bij de gezondheid van een feed: een fout.
    Wachten, een weigering door `robots.txt`, een run die niets vroeg en een waarschuwing bij een lezing die wel is bewaard tellen niet.
  - De mail gaat door de brievenbus van de site.
    `sendMail` staat daarom in `@fansite/shared` (`packages/shared/src/mail.ts`), en de site gebruikt hem van daar.
  - Zonder `ALERT_MAIL_TO` of zonder brievenbus schrijft de importer een regel in het logboek.
    Een mail die niet weg kan, laat de import niet falen en houdt hem niet op.
  - De foutmelding wordt geschoond van geheimen (de sleutel in een webadres, een wachtwoord, een e-mailadres, een pad op de schijf) voordat ze in de mail of de database komt.
- **Hoe:** de tabel `import_alerts` heeft een rij per import zolang het misgaat: het aantal mislukte runs, sinds wanneer en wanneer de laatste mail wegging.
  Zo mailt een run die elk kwartier draait niet elk kwartier, en komt "weer in orde" alleen na een melding.
  Een aparte tabel en geen kolommen bij `feeds`, `match_imports` en `squad_imports`.
  De back-up heeft geen gezondheid om kolommen aan toe te voegen, drie tabellen vragen drie keer dezelfde kolommen, en de gezondheid blijft zoals ze was.
  De tabel telt zelf mee, met dezelfde indeling in mislukt, geslaagd en geen van beide als de gezondheid.
  Die indeling staat in `alertRunOf` (`apps/importer/src/alert-runs.ts`), met een test die haar naast die van de gezondheid legt.
- **Waarom:** de import van 2026/27 stond dagenlang stil zonder dat iemand het merkte (#532): de waarschuwing stond alleen in het logboek.
  Een mail komt bij een mens op een plek die hij toch leest, gebruikt wat er al is (de brievenbus en de database) en stuurt niets naar een derde.
  Drie runs voorkomt een mail bij een storing van korte duur, en één herinnering per dag houdt de mail kort.
- **Nadeel:** cron start de importer elk kwartier en leest de wedstrijden en de selectie hoogstens elk uur.
  Drie runs zijn voor een feed dus een half uur, en voor de wedstrijden en de selectie drie uur.
  Een storing van een feed van een half uur kan al een mail geven.
  Een database die niet bereikbaar is, kan niets bijhouden, en geeft dus geen mail.
- **Alternatieven:** een externe bewaking, zoals een dienst die een adres aanroept (een verzoek naar een derde, en alleen een teken van leven, geen reden).
  Een pagina in het beheer met de gezondheid: nuttig, maar je moet erheen, en dat komt bij #49.
  De workflow Acceptance rood laten worden bij een waarschuwing: GitHub mailt dan, maar alleen bij een samenvoeging en niet elk uur, en de import op de host zelf valt erbuiten.
  Bewaking van de beschikbaarheid van de site hoort bij #172.
  Een mail bij elke fout: te veel mail bij een storing van een uur bij een bron.
  Kolommen bij de bestaande gezondheidstabellen, zonder nieuwe tabel: de back-up heeft er geen.

## De play-offs voor de Conference League zijn een derde competitie, een ontbrekende pagina is geen mislukking

- **Datum:** 1 november 2026
- **Besluit:** de import leest de play-offs voor de Conference League van sc Heerenveen als een derde competitie, naast de Eredivisie en de KNVB Beker (#543).
  - **De pagina:** `Play-offs Nederlands voetbal <jaar>`, met het jaar waarin het seizoen eindigt (2027 voor 2026/27).
    De import leest alleen de wedstrijden van sc Heerenveen onder de kop `Play-offs voor de UEFA Conference League` (in 2022 en 2023 met `Europa` erin).
    De play-offs om promotie en degradatie op dezelfde pagina leest hij niet.
  - **De competitie:** `Play-offs Conference League` in `matches.competition`, en de soort `playoffs` in `wikipedia_pages.kind`, met een migratie (`0023_add_conference_playoffs`).
    De ronde is `Halve finale` of `Finale`, de kop boven de wedstrijd, en bij een halve finale over twee wedstrijden (2022 en 2023) `Halve finale, wedstrijd 1/2`.
    Verlenging en strafschoppen leest hij zoals bij de beker, dus de CHECK-constraint voor verlenging staat nu op beide competities (`matches_extra_time_only_in_played_knockout`).
    **Later:** zie _De wedstrijden van de oude fansite komen in `matches`, met een eigen bron, zes nieuwe competities en een tabel voor de statistieken_ in `hosting-en-data.md` (7 november 2026): de check laat verlenging toe bij elke competitie behalve `Eredivisie` en `Eerste divisie`, dus een nieuwe waarde hoeft niet meer in de lijst.
  - **Een pagina die er niet is:** Wikipedia geeft 404 zolang de pagina niet bestaat, en dat is geen mislukking.
    De import gaat door met de andere pagina's, schrijft geen fout en telt niet mee voor `failures_in_a_row`, dus ook niet voor de mail van #533.
    De play-offwedstrijden die er al zijn, blijven staan.
    Elk ander antwoord blijft een mislukking, en een pagina zonder de kop van de Conference League ook: dan is hij veranderd.
  - **Een jaar zonder sc Heerenveen:** de pagina heeft de kop en geen wedstrijd van ons.
    Dat is geen fout; de import bewaart geen wedstrijd en noemt de pagina niet als bron.
  - **De cijfers:** de play-offs tellen alleen mee bij "Alle wedstrijden", zoals de beker, en niet in de stand of bij "Eredivisie".
    De schakelaar staat er ook als de enige extra wedstrijd een play-offwedstrijd is.
    De bijschriften noemen "de Eredivisie en de play-offs", of met beide "de Eredivisie, de KNVB Beker en de play-offs".
  - **De spelersstatistieken:** `player_season_stats` houdt twee competities (`statsCompetitions`), want de tabel van de selectie heeft geen kolommen voor de play-offs.
    De doelpuntenmakers van de wedstrijd staan wel in `match_goals`.
- **Waarom:** de halve finale van 2026 (FC Utrecht – sc Heerenveen 3–2) en die van 2025 (AZ – sc Heerenveen 4–1) stonden nergens op de site, terwijl supporters ze tellen.
  Een play-offwedstrijd is geen bekerwedstrijd, dus een eigen competitie laat de ronde en de naam kloppen, en laat de cijfers van de Eredivisie en de beker ongemoeid.
  De pagina komt pas in mei: zonder uitzondering voor 404 zou de import van een lopend seizoen negen maanden per jaar mislukken en de mail van #533 vullen.
  De wedstrijden die er zijn laten staan bij een ontbrekende pagina voorkomt dat een hernoemde pagina ze stil laat verdwijnen met alleen een melding dat ze weg zijn; een pagina die er nog is maar de kop mist, geeft wel een fout.
- **Nadeel:** de import vraagt elk uur een vierde pagina, ook in een seizoen dat nog geen play-offs heeft; dat is één verzoek extra dat met 404 antwoordt.
  Een pagina die verdwijnt, melden we niet: alleen een andere fout telt als mislukking.
  Seizoenen voor 2021/22 hebben een andere kop (play-offs voor de Europa League) en geven een fout; #457 beslist wat daarmee gebeurt.
- **Alternatieven:** de play-offs als bekerwedstrijd bewaren (de schakelaar, de bijschriften en de ronde zouden iets zeggen wat niet klopt).
  Een 404 als mislukking tellen (de mail van #533 komt dan bij elk lopend seizoen).
  Een aparte tabel voor de play-offs (alle lijsten en cijfers moeten dan twee bronnen lezen).
  De play-offwedstrijden verwijderen als de pagina er niet is (een hernoemde pagina laat dan stil wedstrijden verdwijnen).
  De pagina pas vragen na 1 mei (een regel en een test erbij voor één verzoek per uur).
- **Later:** zie _De play-offs voor de Europa League zijn een eigen competitie, naast die voor de Conference League_ (3 november 2026): de pagina van de play-offs wordt ook vóór 2020/21 gelezen, onder de kop van de Europa League en als competitie `Play-offs Europa League`.
  Seizoenen voor 2021/22 geven dus geen fout meer om de kop.
  De Conference League blijft zoals hier staat.

## Een wijziging van Wikipedia krijgt een betrouwbaarheid, en een verdachte wijziging wacht

- **Datum:** 30 oktober 2026
- **Besluit:** de importer geeft elke wijziging van een wedstrijd of doelpunt een soort (#460):
  - **Nieuwe informatie** gaat meteen door, zonder melding: een nieuwe wedstrijd, een uitslag binnen drie dagen na de aanvang, doelpuntenmakers bij een wedstrijd die er geen had of doelpunten erbij, een aanvangstijd, een datum of een uitstel voor een wedstrijd die niet is gespeeld, en verlenging of strafschoppen die bij dezelfde score verschijnen.
  - **Een verbetering van kort geleden** gaat door, met een waarschuwing en een regel in `match_changes`: een uitslag die minder dan 24 uur nadat hij voor het eerst stond verandert, bij een wedstrijd van minder dan drie dagen geleden, en een doelpunt dat verandert bij zo'n wedstrijd.
  - **Verdacht** wacht: de wedstrijd en de doelpunten in de database veranderen niet, en de site toont de oude waarde zonder melding.
    Alles wat de regels niet noemen is verdacht.
    De nieuwe waarde staat in `match_changes` en in `pnpm run import:status`.
  - Een verdachte wijziging wordt overgenomen als dezelfde waarde zeven dagen op de pagina blijft staan of als een mens hem accepteert (`pnpm run import:changes accept`).
    Hij vervalt als Wikipedia de oude waarde terugzet of er iets anders van maakt, of als een mens hem afwijst.
    Wat een mens afwees, komt niet terug zolang de pagina dezelfde waarde toont.
- **Grenzen:** 24 uur voor een verbetering, drie dagen voor een recente wedstrijd, zeven dagen voor een wijziging die wacht en zes wedstrijden voor een run.
  Ze zijn strikt: precies 24 uur of precies drie dagen valt buiten het venster.
  De proef op de echte pagina's van de zeven seizoenen 2020/21 tot en met 2026/27 gaf 735 wijzigingen die alle nieuw waren, geen enkele verdachte, en hoogstens elf wijzigingen in één lezing (de aanvangstijden), die niets overschrijven.
  Daarom veranderen de grenzen niet.
  De tabel `match_changes` verzamelt vanaf nu zelf wat er echt gebeurt, want de bewerkingsgeschiedenis van Wikipedia is voor ons gesloten (`/w/`).
- **Keuzes bij het bouwen** (1 november 2026):
  - Een uitslag die tussen 24 uur en drie dagen na de eerste keer verandert, valt in geen regel.
    Verdacht is wat de regels niet noemen, dus hij wacht.
  - Meer dan zes wedstrijden in één run die iets overschrijven wat we al hadden, lijken op een bewerking van de hele pagina.
    De wedstrijden die al wachten en nog op de pagina staan, tellen mee.
    De run schrijft dan niets, behalve de wijzigingen die wachten, en telt als mislukt.
    Het invullen van wat leeg was telt niet mee, zodat de aankondiging van elf aanvangstijden gewoon doorgaat.
    De pagina blijft vastgehouden tot de wijzigingen besloten zijn of zeven dagen hebben gestaan.
  - Een uitslag die pas komt nadat de import de pagina na de eerste drie dagen zag zonder uitslag, is verdacht.
    Was de import er in die dagen niet (een storing), dan is de uitslag gewoon nieuw.
  - Een wedstrijd die weer de waarde krijgt die hij in de laatste zeven dagen had, of een waarde die is afgewezen, is verdacht: dat kan een bewerkingsoorlog zijn.
    Daarvoor bewaart de import ook de verbeteringen die hij overnam.
  - De eerste lezing van een seizoen neemt alles over.
    Er staat dan nog niets in de database dat van Wikipedia komt, want de verzonnen wedstrijden van de seed worden zo vervangen.
  - Een afgelopen seizoen verandert niet meer, dus een wijziging daarin die iets overschrijft is verdacht.
    Wat leeg was invullen mag wel (de stand na 90 minuten van #300, doelpuntenmakers bij een wedstrijd die er geen had), en een nieuwe wedstrijd ook.
    Zo hoeft een nieuwe kolom geen opdracht van de eigenaar om een seizoen bij te werken.
    De uurlijkse import leest zo'n seizoen niet, dus de zeven dagen tellen pas bij de volgende `pnpm run import:season`, of een mens besluit.
  - Een andere link voor dezelfde tegenstander en een doelpunt dat alleen zijn speler of pagina krijgt, zijn nieuwe informatie.
    Een andere spelling van de naam, een ander stadion en een andere datumtekst die al een waarde hadden, overschrijven iets en volgen de regels van een uitslag.
  - De stand en de selectie volgen Wikipedia zoals voorheen, tenzij de hele pagina vastgehouden wordt.
    Een melding per mail komt er niet: de eigenaar kijkt in het overzicht.
- **Waarom:** iedereen kan Wikipedia bewerken, en wij nemen over wat daar staat.
  Tot nu namen we elke wijziging over, met een waarschuwing na drie dagen voor een uitslag, en een andere doelpuntenmaker viel niet op.
  Een vandaal kan zo een uitslag of een scorer op onze site zetten.
  Echte verbeteringen blijven zichtbaar na zeven dagen of na een opdracht, en een bewerking die snel wordt teruggedraaid, bereikt de site nooit.
  De regels gebruiken alleen wat de import zelf ziet, want de geschiedenis van de pagina is voor ons gesloten.
- **Nadeel:** een echte verbetering van een uitslag na meer dan een dag staat pas na zeven dagen op de site, of na een opdracht.
  Een wedstrijd die Wikipedia verwijdert, blijft zeven dagen op de site staan.
- **Alternatieven:** alles blijven overnemen, met meer waarschuwingen (de site toont wat een vandaal schrijft).
  Elke wijziging van een bestaande wedstrijd laten wachten op een mens (te veel werk voor een tikfout).
  Een andere bron naast Wikipedia (rechten en kosten, zie de beslissing over Wikipedia als enige bron).
  De bewerkingsgeschiedenis van Wikipedia lezen (staat onder `/w/`, gesloten voor ons).
  Een uitslag in het gat tussen 24 uur en drie dagen wel overnemen (een vandaal wacht dan twee dagen en komt erdoor).
- **Later:** zie _Een uitslag die verandert, nemen we over, en na drie dagen met een waarschuwing_.
- **Later:** een wedstrijd met een markering van de redactie volgt andere regels; zie _De invoer van de redactie staat in de gewone tabellen, met een markering_ en _Bij een verschil blijft de invoer staan en schrijft de import het op_.
- **Later:** een mens accepteert of wijst een wijziging ook af in het beheer, niet alleen met `pnpm run import:changes`; zie _Een vastgehouden wijziging van Wikipedia beslist een beheerder in het beheer, in de schermen van de wedstrijden_ in `site.md`.
  Het scherm en het commando gebruiken dezelfde code (`decideChange`), en een wijziging in een afgelopen seizoen neemt alleen een mens over.
- **Later:** zie _Het seizoen dat net voorbij is, wordt tot 1 september nog elke week gelezen_ (9 november 2026): in juli en augustus leest de uurlijkse import het seizoen dat net voorbij is elke week.
  Een wijziging die daar wacht, neemt de lezing van een week later over als de pagina nog dezelfde waarde toont, zonder `pnpm run import:season`.
- **Later:** zie _In een seizoen dat voorbij is wint Wikipedia niet vanzelf van de redactie_ (10 november 2026): de zeven dagen gelden alleen nog in het lopende seizoen.
  Een wijziging van een seizoen dat voorbij is wacht tot een mens besluit, ook bij `pnpm run import:season` en bij de lezing van elke week in juli en augustus.

## De invoer van de redactie staat in de gewone tabellen, met een markering

- **Datum:** 1 november 2026
- **Besluit:** een beheerder vult een wedstrijd in of verbetert hem op `/beheer/wedstrijden` (#272).
  De invoer komt in `matches` en `match_goals`, waar elke pagina, de stand per club, de series en de spelerspagina's haar al lezen.
  De tabel `match_edits` markeert per wedstrijd welke onderdelen van de redactie zijn: de aftrap (`match_date`, `kickoff_at`, `date_text`), de uitslag met de status (de score, de verlenging, de stand na 90 minuten en de strafschoppen) en de doelpunten.
  Ze bewaart ook wie het laatst invulde, wanneer en waarom, en de wedstrijd en de doelpunten zoals ze waren vóór de eerste invoer (`before_match` en `before_goals`, als JSON).
  Een rij verdwijnt als geen onderdeel meer een markering heeft.
- **Waarom:** elke pagina, statistiek en spelerslijst leest die tabellen al.
  Een tweede laag naast de gelezen waarde moet op elke plek worden bijgehouden, en een plek die het vergeet toont stilzwijgend de verkeerde waarde.
- **Keuzes bij het bouwen** (1 november 2026):
  - De uitslag en de doelpunten tellen apart, want Wikipedia zet meestal eerst de uitslag en pas later de doelpuntenmakers.
    De aftrap is een derde onderdeel, zodat een aangepaste tijd niet vastzit aan een uitslag.
  - De invoer zet `result_set_at` op het moment van de invoer, en een uitslag die verdwijnt zet het op leeg.
    Een status die niet "gespeeld" is, maakt het aantal toeschouwers leeg, want de database staat dat niet toe.
  - Een invoer die niets verandert, schrijft niets en komt niet in het logboek.
    Het formulier kan niet teruggeven wat de import van een doelpunt bewaart: de link naar de pagina van de doelpuntenmaker en zijn naam zoals Wikipedia hem schrijft.
    Een doelpunt van ons is daarom hetzelfde als het dezelfde speler heeft, en een ander doelpunt als de naam in hoofdletters en kleine letters overeenkomt.
    Een doelpunt dat niet veranderde, houdt zijn link en zijn naam als de redacteur een ander doelpunt aanpast.
  - Een wijziging van Wikipedia die voor die wedstrijd wachtte in `match_changes`, vervalt bij een invoer (`replaced`): de invoer is nieuwer.
    Anders zou `pnpm run import:changes accept` de invoer later ongemerkt overschrijven.
  - "Weghalen" zet alleen terug wat nog een markering heeft.
    Een onderdeel dat Wikipedia al overnam, blijft zoals het is.
    Vult een redacteur zo'n onderdeel later opnieuw in, dan wordt de momentopname van dat onderdeel ververst met wat Wikipedia toen had: weghalen zet het terug naar Wikipedia en niet naar vóór de eerste invoer.
    De import leest daarna weer wat Wikipedia zegt.
  - De onderdelen zonder markering volgen Wikipedia zoals bij elke wedstrijd, maar zonder de beoordeling van _Een wijziging van Wikipedia krijgt een betrouwbaarheid, en een verdachte wijziging wacht_: de beoordeling kijkt naar de hele wedstrijd, en de wedstrijd is al van de redactie.
    Een wedstrijd met een markering telt niet mee voor de grens van zes wedstrijden in een run, en wordt niet verwijderd als hij van de pagina verdwijnt.
  - Voor de import is een aangepaste wedstrijd eigen invoer, ook voor `import:season`: dezelfde code leest elk seizoen.
  - Een uitslag staat in de lijst, het logboek en de waarschuwing met een en-streep ("2–1"), zoals de schrijfwijzer van Redactie het vraagt.
  - Er is geen scherm voor het verleden: de lijst toont het lopende seizoen, en alleen een beheerder ziet haar.
- **Later:** vervangt voor de plaats van de opslag de beslissing van 25 oktober 2026 uit het issue (een aanpassing naast de gelezen waarde); de rest ervan blijft: een aanpassing geldt tot Wikipedia hetzelfde zegt of een beheerder haar weghaalt.
- **Later:** zie _De beheerschermen voor een wedstrijd zijn een tabel met een filter en een brede pagina met een zijbalk_: de lijst toont nu ook oudere seizoenen, met een seizoenskeuze.
  De rest blijft: alleen een beheerder ziet haar.
- **Later:** zie _Wikipedia houdt de uitslag, het verslag houdt de rest_ in `hosting-en-data.md`: de doelpunten van een wedstrijd met een verslag zijn die van het verslag, en `match_goals` heeft daarvoor de kolommen `appearance_id` en `assist_appearance_id`.
  De markering `goals_edited` en de rest van deze beslissing blijven zoals ze zijn.
- **Alternatieven:** een aparte tabel met aanpassingen die elke query eroverheen legt (veel plekken en een groot risico op vergeten); de gelezen waarde overschrijven zonder markering (de volgende import maakt de verbetering ongedaan, en niemand ziet wat van de redactie is).
- **Later:** zie _De doelpunten van een wedstrijd met een verslag bewerk je alleen in het verslag_ in `site.md` (7 november 2026): een verslag van #829 zet ook `goals_edited`, en de import houdt dan de doelpunten met hun spelers (`appearance_id`) vast.
- **Later:** zie _Een vierde deel in `match_edits` voor de gegevens van een wedstrijd_ (9 november 2026): de tabel markeert sinds #969 ook de toeschouwers, de scheidsrechter, het stadion en de opmerking.

## Bij een verschil blijft de invoer staan en schrijft de import het op

- **Datum:** 1 november 2026
- **Besluit:** de import (`apps/importer/src/edited-matches.ts`) beoordeelt elk onderdeel met een markering apart (#272):
  1. Heeft Wikipedia voor het onderdeel nog niets, dan blijft de invoer staan en wordt niets gemeld.
     "Niets" is: bij de aftrap geen tijd, bij de uitslag de status gepland, bij de doelpunten geen doelpunten.
  2. Heeft Wikipedia hetzelfde, dan verdwijnt de markering en schrijft de import `match.caught-up` in het logboek.
     Hetzelfde is bij de doelpunten: dezelfde kant, minuut, blessuretijd, soort en speler, in elke volgorde.
     De speler van ons is dezelfde als hij hetzelfde `player_id` heeft, en een andere speler als de naam in hoofdletters en kleine letters overeenkomt.
     Het onderdeel volgt vanaf dan Wikipedia.
  3. Zegt Wikipedia iets anders, dan blijft de invoer staan, en schrijft de import `match.differs` in het logboek en een waarschuwing in `match_imports.last_warning`, met beide waarden.
     Dat gebeurt één keer: `match_edits.reported_kickoff`, `reported_result` en `reported_goals` bewaren wat Wikipedia de vorige keer zei.
     Zegt Wikipedia hetzelfde als de vorige keer, dan zwijgt de import.
     Maakt Wikipedia er iets nieuws van, of neemt een redacteur het onderdeel opnieuw in, dan is het weer nieuws.
- **Waarom:** de redactie weet vaak meer dan een anonieme bewerking op Wikipedia, maar kan zich ook vergissen, dus het verschil hoort bij een mens (#577).
  Tot dan is de invoer laten staan veiliger dan Wikipedia laten winnen, en één regel per verschil houdt het logboek leesbaar bij een import die elk uur draait.
  De uitslag en de doelpunten tellen apart, want Wikipedia loopt met de ene achter de andere aan.
- **Nadeel:** tot #577 klaar is, staat de invoer tot een beheerder haar weghaalt, en ziet een redacteur het verschil alleen op de pagina van de wedstrijd ("Wikipedia zegt iets anders") en in `pnpm run import:status`.
  De stand na 90 minuten telt mee in "hetzelfde": heeft Wikipedia hem niet en de redactie wel, dan is dat een verschil.
- **Alternatieven:** Wikipedia wint zodra het iets heeft (een vandaal op Wikipedia overschrijft de redactie); het verschil meteen als wachtende wijziging vastleggen (dat is #577, om #272 in één pull request te houden); het verschil bij elke run opnieuw schrijven (honderden regels voor één afwijking).
- **Later:** zie _Een afwijking van Wikipedia komt bij een redacteur, die beslist_ en _Een afwijking is een wachtende wijziging per onderdeel, en één functie beslist ze_: het verschil wordt ook een wachtende wijziging, de beheerders krijgen een mail en een redacteur beslist, of de import neemt Wikipedia over na zeven dagen.
  Wat blijft: de invoer blijft staan, het verschil staat één keer in het logboek en in de waarschuwing, en `match_edits.reported_*` houdt dat bij.

## Het logboek van het beheer heeft ook regels van de import, zonder account

- **Datum:** 1 november 2026
- **Besluit:** `audit_log.user_id` mag leeg zijn: een lege waarde is "de import" (#272).
  `recordAction` verhuist naar het databasepakket (`@fansite/db/audit-log`), zodat de site en de importer dezelfde ene functie gebruiken.
  `apps/site/src/beheer/audit-log.ts` geeft hem alleen door.
  Het logboek krijgt vier acties: `match.edit` (een invoer), `match.undo` (de invoer weggehaald), `match.caught-up` en `match.differs` (de laatste twee schrijft alleen de import).
  Een nieuwe kolom `detail` (hoogstens 1000 tekens, langer wordt met een beletselteken afgekapt) zegt wat veranderde: het onderdeel met de waarde ervoor en erna.
  `item_id` is bij een `match.`-actie het nummer van de wedstrijd.
- **Waarom:** de import is geen account, en elke invoer, elke wijziging en elk automatisch weghalen of overnemen moet in hetzelfde logboek staan, met wie of "de import".
  Eén functie houdt de afspraak "alleen toevoegen" op één plek.
- **Wat erin staat:** de import schrijft de reden en het detail in het Nederlands, want een redacteur leest ze.
  De waarschuwing in `match_imports` blijft Engels, zoals de rest van wat de import logt.
- **Later:** vult _Het logboek van het beheer krijgt één schrijffunctie, en alleen toevoegen_ aan: de functie staat nu in `packages/db/src/audit-log.ts`, heeft vijf velden in plaats van vier, `user_id` mag leeg zijn, en `audit-log.test.ts` kijkt naar dat bestand.
- **Alternatieven:** een account "de import" in `admin_users` (een rij met een adres dat nooit inlogt, die `admin:revoke` en de lijst met accounts moeten kennen); een vast nummer 0 zonder foreign key (een nummer dat geen account is, en een rij die naar niets wijst); een eigen tabel voor het logboek van de import (twee plekken om te lezen als een redacteur wil weten wat er met een wedstrijd gebeurde).

## Het formulier van een wedstrijd werkt zonder JavaScript, met één veld voor de speler

- **Datum:** 1 november 2026
- **Besluit:** het formulier op `/beheer/wedstrijden/<nummer>` is een gewoon formulier dat de server beantwoordt (#272):
  - Een doelpunt toevoegen of weghalen is een knop van hetzelfde formulier (`knop=doelpunt-toevoegen` en `knop=doelpunt-weghalen-<n>`).
    De server geeft het formulier terug met de waarden bewaard en de focus op het nieuwe doelpunt, of op het doelpunt dat de plaats van het weggehaalde nam, of anders op de knop "Doelpunt toevoegen".
    Elke knop zegt welk doelpunt hij is ("Doelpunt 2 weghalen"), net als elk veld ("Minuut, doelpunt 2").
  - De eerste knop in het formulier is een verborgen "Opslaan", zodat de Enter-toets in een veld opslaat en nooit het eerste doelpunt weghaalt.
    De knop is niet bereikbaar met het toetsenbord en voor schermlezers verborgen.
  - Een doelpunt heeft een kant, de minuut met eventueel blessuretijd, een soort (gewoon, strafschop of eigen doelpunt) en één veld voor de speler: een speler van sc Heerenveen kies je uit de selectie van het seizoen (zo krijgt het doelpunt zijn `player_id`), en voor een speler van de tegenstander kies je "Andere speler" en schrijf je de naam.
    De kant is het team dat het doelpunt krijgt, ook bij een eigen doelpunt, zoals `match_goals.ours`.
    Welke speler uit de selectie komt, volgt uit kant en soort: een doelpunt van ons, of een eigen doelpunt van de tegenstander.
    Een veld dat bij dat doelpunt niet past, geeft een fout in plaats van stilzwijgend genegeerd te worden.
  - Elke fout staat bij het veld en in de foutenlijst bovenaan, en de doelpunten die samen de uitslag niet geven, staan als fout bij de kop "Doelpunten".
  - De aftrap is een datum en een tijd, of een datum en een tekst als de tijd nog niet bekend is (zoals "12-14 februari 2027"); beide samen is een fout.
  - "Invoer weghalen" is een eigen formulier met een eigen reden, onder het formulier.
- **Waarom:** het beheer werkt zonder JavaScript, zoals de artikelen, en een formulier met rijen die je toevoegt en weghaalt kan dat met een rondje naar de server.
  Eén speler-veld voorkomt dat een redacteur twee velden moet leren die elkaar uitsluiten.
- **Alternatieven:** een knop die met JavaScript een rij toevoegt (werkt niet zonder, en de focus is dan ons eigen werk); twee velden naast elkaar voor de speler (de redacteur moet weten welk veld bij welk doelpunt hoort); de Enter-toets laten zoals hij is (hij haalt het eerste doelpunt weg).
- **Later:** zie _De beheerschermen voor een wedstrijd zijn een tabel met een filter en een brede pagina met een zijbalk_ en _Het blok om op te slaan staat in de zijbalk en hoort bij het formulier met het attribuut `form`_.
  De knop voor een doelpunt heet nu "Weghalen doelpunt 2", de doelpunten zijn een tabel en geen kaart per doelpunt, en "Invoer weghalen" is een uitklapblok in de zijbalk.
  De rest blijft: een formulier dat zonder JavaScript werkt, de verborgen eerste knop, de focus en de ene speler.
- **Later:** zie _Wie een doelpunt maakte volgt uit het team en de soort, en het formulier vraagt één vorm_.
  Een veld dat niet past, geeft geen fout meer, en "Andere speler" is geen optie meer.

## Onder de bronvermelding staat een zin zolang de redactie gegevens zelf invulde

- **Datum:** 1 november 2026
- **Besluit:** zolang minstens één wedstrijd een markering heeft (een rij in `match_edits`), staat onder de volledige bronvermelding van Wikipedia de zin "Enkele gegevens heeft onze redactie zelf ingevuld of aangepast." (#272).
  De zin is een eigenschap van het onderdeel, `edited`, en staat buiten de uitklap, zodat een bezoeker hem ziet zonder iets te openen.
  Hij staat onder de volledige bronvermelding van `/wedstrijden`, van de statistieken en de spelers, en van de tegenstanders, en nergens anders.
  De korte vorm ("Bron: Wikipedia") op de kaarten van home heeft hem niet.
  De pagina's lezen de vlag uit de gegevens van het seizoen (`MatchData.edited`) of uit `getEditedMatches()`, met dezelfde cache als de wedstrijden zelf.
- **Waarom:** de ingevulde waarden staan op de plek van die van Wikipedia, en de bronvermelding zegt dat de gegevens van Wikipedia komen.
  Dat klopt niet meer helemaal zolang een wedstrijd van de redactie is.
  Een zin die alleen staat zolang het waar is, maakt dat eerlijk zonder dat een bezoeker er iets mee hoeft.
- **Nadeel:** de zin staat bij alle wedstrijden, ook als de invoer één andere wedstrijd betreft, want de vlag geldt voor de hele site.
  De stand komt van Wikipedia en verandert niet mee: hij loopt achter tot Wikipedia de uitslag heeft.
- **Alternatieven:** een zin bij de wedstrijd zelf (een extra regel in elke lijst, en `Match` en `ShortMatch` moeten hem kennen); de zin in de uitklap (een bezoeker ziet hem alleen als hij openklapt); de zin ook op de korte vorm (een lange zin in een kleine kaart op home).

## Een gestaakte wedstrijd telt voor zijn begin, het restant geeft de uitslag en een regel

- **Datum:** 1 november 2026
- **Besluit:** van twee blokken voor dezelfde wedstrijd, het gestaakte ("Gestaakt 82' (2 – 0)") en het latere dat de wedstrijd afmaakt, is het gestaakte blok de wedstrijd (#548).
  Het geeft het stadion, thuis of uit, de datum en de aftrap.
  Het latere blok geeft de uitslag, de doelpunten en de gegevens voor een regel onder de wedstrijd.
  Zonder later blok, of als het latere blok zelf gestaakt is of een score heeft die we niet kennen, blijft het een fout die de wedstrijd noemt.
- **De regel:** `matches` krijgt een kolom `note` (tekst, hoogstens 255 tekens, leeg voor elke andere wedstrijd), met een migratie (`0025_add_match_note`).
  De import schrijft hem uit de feiten van de pagina: "Gestaakt in minuut 82. Het restant is op 11 mei gespeeld in het Abe Lenstra Stadion."
  Heeft het latere blok nog geen uitslag, dan staat er "wordt gespeeld" in plaats van "is gespeeld".
  Een naam die op "Stadion" eindigt, krijgt "het" ervoor; een andere naam staat er zoals de pagina hem schrijft, want het lidwoord is niet uit de naam af te leiden.
  Er staat niets over de reden van het staken of over het publiek, want de pagina zegt dat niet.
  `Match` toont de regel met de eigenschap `note`, als laatste regel in de kleine tekst, onder "Gegevens nog niet beschikbaar" als die er ook staat.
- **Waarom:** de projecteigenaar wil dat de cijfers per stadion kloppen: de wedstrijd van 10 mei 2026 begon in het Rat Verlegh Stadion in Breda, en het restant in Heerenveen hoort daar niet bij.
  Een kolom met tekst is de kleinste oplossing voor één uitzondering; een tweede stadion in de tabel (`stadium2`) vraagt een tweede plek in elke vraag naar stadions voor een wedstrijd die één keer voorkwam.
  De rest is wat een bezoeker wil weten, en dat is dat de wedstrijd gestaakt en uitgespeeld is.
- **Nadeel:** de toeschouwers en de scheidsrechter van het begin komen niet mee, want de import bewaart die nog niet.
  Gebeurt dat later, dan komen ze uit het gestaakte blok.
  Een bestaande wedstrijd krijgt zijn nieuwe stadion, datum en regel pas bij de volgende import van het seizoen; voor 2025/26 is dat de opdracht Import season.
- **Alternatieven:** een tweede stadion in `matches` (een kolom voor één wedstrijd, en elke vraag per stadion moet kiezen welke telt).
  De reden van het staken noemen (die staat alleen in het verslag van de NOS, en dat nemen we niet over).
  De regel in de code van de site schrijven (de site kent de pagina van Wikipedia niet).
- **Later:** zie _Een wijziging van Wikipedia krijgt een betrouwbaarheid, en een verdachte wijziging wacht_.
  Krijgt een gespeelde wedstrijd van drie dagen of langer geleden een ander stadion, een andere datum of een andere regel, dan wacht die wijziging zeven dagen of tot een mens besluit.
  Het nadeel hierboven is opgelost: zie _De import bewaart het aantal toeschouwers en de scheidsrechter van elke wedstrijd, en geen enkele pagina toont ze_.
  Voor een gestaakte wedstrijd komen ze uit het gestaakte blok.
- **Later:** zie _Een gestaakte wedstrijd met een officiële einduitslag is een uitzondering voor één wedstrijd_.
  Een score die we niet kennen, geeft bij een wedstrijd van een andere club een waarschuwing, behalve voor die ene wedstrijd.
  Bij een wedstrijd van sc Heerenveen blijft het een fout.

## De import bewaart het aantal toeschouwers en de scheidsrechter van elke wedstrijd, en geen enkele pagina toont ze

- **Datum:** 1 november 2026
- **Besluit:** `matches` krijgt twee kolommen, `attendance` en `referee`, met een migratie (`0028_add_match_attendance_and_referee`) en de uitkomst van `Footballbox2` voor de competitie, de beker en de play-offs (#558).
  Een kolom per feit, geen aparte tabel.
  Geen enkele pagina, kaart of verhaal toont ze; `PublicMatch` heeft de velden, zodat het tonen (#416 en #417) later alleen een pagina hoeft te bouwen.
- **De kolommen:** `attendance` is een geheel getal van 0 tot en met 150.000 (`matches_attendance_in_range_when_played`), leeg als het onbekend is.
  `0` is een wedstrijd zonder publiek, zoals het restant van NAC Breda – sc Heerenveen.
  Alleen een gespeelde wedstrijd heeft een aantal.
  `referee` is de volledige naam als tekst van hoogstens 100 tekens, leeg als hij onbekend is (en nooit een lege tekst: `matches_referee_not_empty`).
- **Het aantal lezen:** punten, spaties en vaste spaties zijn duizendtallen ("21.022" is 21022).
  Leeg, een streepje of "n.b." is niet bekend.
  Tekst, een getal boven 150.000 of een getal dat niet te lezen is, geeft ook niet bekend, met een waarschuwing in het logboek.
  Het is nooit een fout: dit is een bijzaak en mag de import van de uitslag niet tegenhouden.
- **De scheidsrechter lezen:** bij een link de volledige naam uit het doel van de link ("Sander van der Eijk" voor `[[Sander van der Eijk|Van der Eijk]]`), een toevoeging tussen haakjes in de titel (`Jan Smit (scheidsrechter)`) weggelaten.
  Staat er een vervanger achter ("(Kuipers 46')"), dan telt de eerste link.
  Zonder link is het de tekst tot een haakje.
  Opmaak, verwijzingen (`<ref>`) en besturingstekens vallen weg.
  Tekst met vierkante haken, accolades, punthaken of een verticale streep, of langer dan 100 tekens, is niet te lezen: niet bekend, met een waarschuwing.
- **Privacy:** we bewaren alleen de naam zoals Wikipedia hem geeft.
  Geen foto, geen link en geen pagina van de scheidsrechter.
  Een scheidsrechter is een publieke figuur in zijn werk, en zijn naam staat bij elke wedstrijd in de media en op Wikipedia.
- **Een gestaakte wedstrijd:** het gestaakte blok is leidend, zoals voor het stadion (zie _Een gestaakte wedstrijd telt voor zijn begin, het restant geeft de uitslag en een regel_).
  Voor NAC Breda – sc Heerenveen zijn dat 19.241 en Van der Eijk, niet de 0 van het restant.
  Heeft het gestaakte blok niets, dan blijft het veld leeg.
- **Een wijziging:** de regels van _Een wijziging van Wikipedia krijgt een betrouwbaarheid, en een verdachte wijziging wacht_ gelden, met drie toevoegingen in `classify-change.ts`.
  Een leeg veld dat gevuld wordt, is nieuw en gaat door, ook in een seizoen dat voorbij is.
  Een bijgesteld aantal toeschouwers is een verbetering (soort 2): het wordt na afloop vaak bijgesteld, ook na dagen, en geen verdachte wijziging.
  Een andere scheidsrechter volgt de regel van het stadion: een verbetering bij een wedstrijd van de laatste drie dagen, daarna wacht hij.
  Een veld dat een waarde had en leeg wordt, wacht altijd.
  Een bijgesteld aantal in een seizoen dat voorbij is, wacht net als elke andere wijziging daar.
  De regel waarmee `describeState` een wedstrijd beschrijft, noemt de twee velden als ze gevuld zijn, zodat een wijziging die wacht ze meeneemt.
- **Waarom:** de gegevens zijn er nu op Wikipedia voor bijna elke wedstrijd van 2020/21 tot en met 2025/26.
  Bewaren we ze nu, dan bouwen ze zich op terwijl het tonen wacht op de pagina per wedstrijd (#108).
  Een leesfout in een bijzaak hoort de uitslag niet tegen te houden.
  De rest volgt uit de regels voor een wijziging, zodat een vandaal geen aantal of naam kan zetten zonder dat het opvalt.
- **Nadeel:** een bestaande wedstrijd krijgt zijn aantal en zijn scheidsrechter pas bij de volgende import van het seizoen.
  Voor de seizoenen 2020/21 tot en met 2025/26 is dat de opdracht Import season op acceptatie, na het deployen.
  Zonder eigen controle op het getal (een aantal boven de capaciteit van het stadion) neemt de import ook een foutief getal onder 150.000 over.
- **Alternatieven:** een aparte tabel voor de gegevens van een wedstrijd (een kolom per feit is genoeg).
  Een aantal boven 150.000 als fout laten staan (het houdt de uitslag tegen).
  De achternaam uit de tekst van de link bewaren (niet uniek, en de volledige naam staat in het doel).
  De link of de pagina van de scheidsrechter bewaren (nieuwe gegevens over een persoon die niemand vroeg).
  Elke wijziging van de toeschouwers laten wachten (ze worden juist na afloop bijgesteld).
- **Later:** de pagina Statistieken toont het aantal toeschouwers sinds #729, in een kaart met een staaf per thuiswedstrijd; zie _De pagina Statistieken heeft een kaart met het aantal toeschouwers per thuiswedstrijd_ in `site.md`.
  De scheidsrechter wordt nog nergens getoond.
- **Later (9 november 2026):** de pagina van een wedstrijd toont het aantal toeschouwers nu (#416), met de bron en de melding dat het een schatting is.
  De regels van een wedstrijd (`Match` en `ShortMatch`) tonen het nog steeds niet; de scheidsrechter volgt in #417.
- **Later (9 november 2026):** de kaart Wedstrijden op home toont de scheidsrechter van een gespeelde wedstrijd; zie _De kaart Wedstrijden op home toont de vorige ontmoeting, de vorm van de tegenstander en de scheidsrechter_ in `site.md`.

## Van een bericht met meerdere versies toont de site alleen de laatste kop

- **Datum:** 1 november 2026
- **Besluit:** een bron die een bericht steeds onder een nieuwe kop in de feed zet, zoals het liveblog van het Algemeen Dagblad, toont de site met de laatste kop.
  - **De sleutel:** `items.thread_key` (tekst, met een index op `source_id` en `thread_key`) bindt de versies van één verhaal.
    De importer maakt hem per domein uit de link, volgens `threadRules` in `apps/importer/src/read-feed.ts`.
    Bij het Algemeen Dagblad en De Gelderlander (DPG Media) is het de code `~` met acht letters en cijfers aan het eind van het pad, zoals `~a40dbd48`.
    Een bron zonder regel, en een link zonder code, geeft geen sleutel: dat bericht is zijn eigen verhaal.
  - **Alleen binnen een bron:** de site voegt versies samen met dezelfde `source_id` en `thread_key`.
    Dezelfde code bij twee bronnen geeft twee berichten, elk onder de naam van zijn eigen bron.
  - **De laatste kop:** het bericht met de nieuwste `published_at`, bij dezelfde tijd het hoogste `id`.
    De sortering, de betaalmuur en de link komen van die versie.
  - **Relevant als één versie het was:** een verhaal is te zien als een van zijn versies `relevant` is, ook als de laatste kop de club niet noemt.
    Het toont dan de laatste kop.
    Zo verdwijnt het liveblog van een wedstrijd niet doordat de laatste kop alleen "het eindsignaal" zegt.
    Is geen versie `relevant`, dan toont de site het verhaal niet.
  - **Verborgen:** een versie die een moderator verbergt, bestaat niet meer voor de site.
    Het verhaal toont de nieuwste versie die niet verborgen is, en verdwijnt als er geen over is.
  - **Eén plek:** de regel staat in `isShown` in `packages/db/src/queries.ts`, dus de lijst met het filter per bron, de tellingen van de paginering, de homepage en de zoekresultaten volgen hem samen.
  - **Oudere versies blijven:** de importer en de database bewaren elke versie, en het beheer toont ze allemaal.
  - **Bestaande berichten:** de importer vult de sleutel van berichten die hem missen aan het begin van elke import van zo'n bron, uit de bewaarde link, ook als de feed niet gewijzigd is of het bericht er niet meer in staat.
    Een verborgen bericht blijft zoals het is.
- **Waarom:** een liveblog van negen versies stond met negen koppen onder elkaar op `/nieuws`, want elke versie is een bericht met een eigen link.
  De code in de link is wat DPG Media zelf gebruikt voor een artikel, en blijft gelijk terwijl de kop verandert (gecontroleerd op 1 november 2026 bij de negen versies van het liveblog van N.E.C. – sc Heerenveen: `~a40dbd48`).
  De laatste kop is ook de beste: een liveblog wordt na de wedstrijd het verslag onder dezelfde code.
  Een sleutel in de database, in plaats van een groepering in de query, houdt de query eenvoudig en laat de regel per bron veranderen zonder de site aan te raken.
  Een regel in `isShown` voorkomt dat een pagina vergeet te groeperen.
- **Nadeel:** de query kijkt voor elk bericht met een sleutel naar zijn versies (twee `exists`).
  De index op `source_id` en `thread_key` houdt dat klein voor de duizenden berichten per jaar die we bewaren, maar het is meer dan een vlakke lijst.
  Een versie met een andere kop dan de laatste is niet meer te vinden op de site, ook niet met zoeken.
- **Alternatieven:** groeperen in de query met `GROUP BY` (elke query moet het opnieuw doen en de kolommen van het gekozen bericht horen niet bij de groep).
  De oudere versies verwijderen (de importer verwijdert geen berichten, en de sleutel van een versie kent de volgende niet).
  Een sleutel uit de kop (de kop verandert juist).
  Verhalen van twee bronnen samenvoegen (volgt in #567 en vraagt een besluit over de naam van de bron).
  Het filter laten beoordelen op de laatste kop alleen (een liveblog van een wedstrijd van de club valt weg als de laatste kop de club niet noemt).
- **Later:** zie _Een artikel van twee kranten van één uitgever staat één keer in de lijst, bij de lokale krant_ (1 november 2026).
  De regel "alleen binnen een bron" geldt nog voor bronnen zonder `publisher`, en voor het filter per bron; bronnen met dezelfde `publisher` tonen een verhaal met dezelfde sleutel samen één keer.
- **Later:** zie _De artikelcode van DPG Media heeft acht of negen letters en cijfers_ (2 november 2026).
  De code is nu van acht of negen letters en cijfers, niet alleen acht; de rest van de regel blijft.

## Een artikel van twee kranten van één uitgever staat één keer in de lijst, bij de lokale krant

- **Datum:** 1 november 2026
- **Besluit:** twee bronnen van één uitgever die hetzelfde artikel geven onder één artikelcode, tonen de lijsten één keer, onder de naam van de lokale krant.
  - **De eigenschappen:** `sources.publisher` (tekst, leeg als er geen is) en `sources.local` (waar of onwaar, standaard onwaar), met de migratie `0029_add_source_publisher` en in het register (`realSources`).
    Het Algemeen Dagblad en De Gelderlander hebben `publisher` `dpg-media`, en De Gelderlander is `local`.
    De andere bronnen hebben geen `publisher`.
  - **Wat we vergeleken:** op 1 november 2026 lazen we de feeds van de Leeuwarder Courant en De Telegraaf (Mediahuis) één keer, alleen gelezen: 50 berichten per feed, met geen enkele gelijke artikelcode en geen gelijke kop.
    Zij krijgen dus geen `publisher` en geen regel voor een sleutel; delen ze later wel een code, dan is dat een nieuw issue.
  - **Eén bericht per uitgever en sleutel:** op `/nieuws` zonder keuze van een bron, op de homepage en in de zoekresultaten staat van bronnen met dezelfde `publisher` onder dezelfde `thread_key` één bericht.
    Elke bron brengt haar nieuwste bericht van het verhaal dat niet verborgen is naar voren.
    Wint de bron met `local`; zijn er twee lokale bronnen of geen, dan het bericht met de vroegste `published_at`, en bij dezelfde tijd het laagste `id`.
    De naam, de link, de tijd en de betaalmuur zijn die van de winnaar.
  - **Het filter per bron blijft volledig:** met `?bron=…` toont de lijst alles wat die bron zelf heeft, ook wat de lokale krant anders zou vervangen.
    Het aantal en de pagina's volgen de lijst die de bezoeker ziet.
  - **De winnaar valt weg:** is het bericht van de winnaar verborgen, of heeft zijn bron het nooit in de feed gehad, dan toont de lijst dat van de andere bron.
    Een bericht dat uit de feed verdwijnt, blijft in de database en blijft dus winnen.
  - **Relevantie:** het verhaal is te zien als een van zijn berichten `relevant` is, bij welke bron ook, en de kop van de winnaar is wat de bezoeker ziet.
  - **Nooit over uitgevers heen:** bronnen van verschillende uitgevers, en bronnen zonder `publisher`, worden niet samengevoegd, ook niet bij dezelfde kop.
  - **Eén plek:** de regel staat in `isShownOnce` in `packages/db/src/queries.ts`, aangeroepen door `isShown` met `merge`; de oudere berichten blijven bewaard.
- **Waarom:** het verslag van N.E.C. – sc Heerenveen stond twee keer op `/nieuws`, met dezelfde kop, tijd, intro en schrijver, in het Algemeen Dagblad en in De Gelderlander (gecontroleerd op 1 november 2026).
  De lokale krant staat het dichtst bij het nieuws, en zo is de keuze elke keer dezelfde.
  Een eigenschap bij de bron, in plaats van een regel in de code, laat een volgende uitgever erbij komen zonder de site aan te raken.
- **Nadeel:** de query zoekt voor elk bericht met een sleutel bij een bron met een `publisher` ook in de berichten van de andere bronnen van die uitgever (nog twee `exists`).
  De index op `source_id` en `thread_key` houdt dat klein, want het zijn er hoogstens een paar per uitgever.
  Twee verschillende artikelen over dezelfde wedstrijd, met een andere code, blijven twee berichten.
- **Alternatieven:** samenvoegen op de kop (twee verschillende artikelen met bijna dezelfde kop zouden verdwijnen).
  De landelijke krant laten winnen (het nieuws staat dan minder dicht bij de lezer).
  Een instelling per wedstrijd om te kiezen welke krant lokaal is (meer werk voor één wedstrijd, en niet nodig voor het eerste geval).
  De oudere versies verwijderen (de importer verwijdert geen berichten).

## Een afwijking van Wikipedia komt bij een redacteur, die beslist

- **Datum:** 1 november 2026
- **Besluit:** zegt Wikipedia iets anders dan een aangepaste wedstrijd, dan blijft de invoer van de redactie staan, krijgen de beheerders een mail en beslist een redacteur in het beheer (#577).
  Beslist niemand, dan neemt de import Wikipedia over na zeven dagen, met een mail.
- **Waarom:** de redactie weet vaak meer dan een anonieme bewerking op Wikipedia, maar kan zich ook vergissen, dus het verschil hoort bij een mens en niet bij toeval.
  De zeven dagen zorgen dat een vergeten afwijking niet eindeloos blijft staan.
- **Alternatieven:** de invoer wint tot een mens hem weghaalt (een fout van de redactie blijft staan); Wikipedia wint zodra het iets heeft (een vandaal op Wikipedia overschrijft de redactie); alleen een melding in het beheer zonder mail (een redacteur die niet kijkt, ziet het niet).
- **Later:** zie _In een seizoen dat voorbij is wint Wikipedia niet vanzelf van de redactie_ (10 november 2026): de import neemt Wikipedia na zeven dagen alleen nog over in het lopende seizoen.
  In een seizoen dat voorbij is blijft de invoer staan tot een mens beslist.

## Een afwijking is een wachtende wijziging per onderdeel, en één functie beslist ze

- **Datum:** 2 november 2026
- **Besluit:** een verschil tussen Wikipedia en een onderdeel van een aangepaste wedstrijd is een rij in `match_changes` (#577):
  - **Per onderdeel:** de nieuwe kolom `part` (`kickoff`, `result` of `goals`) zegt welk onderdeel het is, en is leeg bij een gewone wijziging.
    De klasse is `suspicious`, de reden "wijkt af van de invoer van de redactie", `old_value` is de invoer en `new_value` wat Wikipedia zegt.
    `proposal` is dat onderdeel zoals Wikipedia het heeft, als JSON, zodat het besluit niets van Wikipedia hoeft te vragen.
    De beoordeling van gewone wijzigingen (`readSeasonChanges`) negeert rijen met een `part`: een afwijking heeft haar eigen beoordeling in `edited-matches.ts`.
  - **Eén keer:** de import legt een afwijking vast zodra `match_edits.reported_*` zegt dat het nieuws is.
    Staat de afwijking al in `reported_*` maar nog niet in `match_changes` (gemeld vóór dit besluit), dan legt de import haar vast zonder haar nog eens in het logboek te zetten.
    Zegt Wikipedia hetzelfde als een wijziging die wacht, dan telt de run mee (`times_seen`) en ververst `proposal`.
  - **Eén functie:** `decideConflict` in `packages/db/src/match-conflicts.ts` beslist een afwijking, in de transactie van de aanroeper en met haar regel in het logboek.
    "Neem Wikipedia over" schrijft dat onderdeel, wist de markering (en de rij in `match_edits` als er geen over is) en schrijft `match.take-over`.
    "Houd onze invoer" laat alles staan en schrijft `match.keep`.
    Het beheer, het commando `pnpm run import:changes` en de zeven dagen van de import roepen haar aan, dus een besluit heeft overal dezelfde uitkomst.
  - **Zonder account:** het commando en de import hebben geen account, dus hun regel in het logboek heeft een lege `user_id` ("de import"), met de reden "Besloten met het commando import:changes" of "Niemand besliste in zeven dagen, dus de import nam Wikipedia over".
    Het commando `accept` neemt Wikipedia over, `reject` houdt de invoer.
  - **Zeven dagen:** de regel van #460 blijft, en staat nu op één plek (`conflictStandsMs`).
    Staat de waarde na zeven dagen nog op Wikipedia en heeft niemand beslist, dan neemt `importEditedMatch` het onderdeel over (`resolution` is `stood`).
    Zet Wikipedia de waarde van de redactie terug, dan wordt de wijziging afgewezen (`reverted`) en schrijft de import `match.caught-up` met "De afwijking is vervallen".
    Maakt Wikipedia er iets anders van, dan is de oude afwijking `replaced` en begint een nieuwe.
  - **Een invoer vervangt:** slaat een redacteur een onderdeel opnieuw op, dan vervalt de afwijking van dat onderdeel (`replaced`), en haalt hij de hele invoer weg, dan vervallen ze allemaal.
- **Waarom:** de import en het beheer moeten hetzelfde besluit nemen, en de rij in `match_changes` is de plek waar het commando al op leest.
  Een kolom `part` houdt de afwijking per onderdeel, zoals #272 het beoordeelt, en laat de gewone wijzigingen ongemoeid.
- **Alternatieven:** de afwijking alleen in `match_edits.reported_*` laten staan en het besluit daarop bouwen (het commando en het zeven-dagenrecht hebben dan een eigen tijdlijn, en `match_changes` toont niet wat wacht); een eigen tabel voor afwijkingen (twee plekken die een redacteur moet lezen); het besluit in de site en een eigen versie in het commando (twee uitkomsten voor hetzelfde besluit).

## De beheerders krijgen een eigen mail per afwijking, en de import faalt er niet om

- **Datum:** 2 november 2026
- **Besluit:** `mailConflicts` (`packages/db/src/match-conflict-mail.ts`) mailt na elke run van de Wikipedia-import (#577):
  - **Wie:** elk account met de rol `beheerder` dat niet is uitgezet, elk met een eigen mail.
    `ALERT_MAIL_TO` is het adres van de eigenaar voor een import die stilvalt, en dus niet voor dit.
  - **Wanneer:** één mail per afwijking, en één mail als de import een afwijking na zeven dagen overneemt.
    `match_changes.mailed_at` en `taken_over_mailed_at` onthouden dat de mail uit is, zodat de volgende run zwijgt.
  - **Wat erin staat:** de wedstrijd, het onderdeel, beide waarden, de koppeling naar de pagina in het beheer en de dag waarop de import Wikipedia overneemt.
    Geen naam of adres van een redacteur, en geen reden: het adres van de ontvanger is het enige persoonsgegeven.
  - **Als het mislukt:** een mail die niet te versturen is, laat de import niet falen en niet stoppen.
    De run schrijft een regel in het logboek van de import, zonder wachtwoord en zonder adres, en probeert het bij de volgende run opnieuw, want de wijziging blijft ongemaild.
    Een afwijking telt als gemaild zodra één beheerder de mail kreeg: de anderen krijgen hem niet nog eens.
  - **Buiten de transactie:** de mail gaat nadat de wedstrijden zijn opgeslagen, zodat een mailserver die hapert nooit een wedstrijd terugdraait.
- **Waarom:** een redacteur die niet in het beheer kijkt, ziet een afwijking niet.
  Een mail per ontvanger houdt elk adres uit de aanhef van de ander, en `sendMail` laat toch maar één ontvanger per mail toe.
- **Nadeel:** wie een mail kreeg terwijl een andere beheerder hem niet kreeg, merkt dat niet; de afwijking staat wel in het beheer.
  Zonder één beheerder met een actief account gaat er niets uit, en de run zegt dat in het logboek.
- **Alternatieven:** één mail naar `ALERT_MAIL_TO` (de eigenaar is niet altijd de redacteur die de wedstrijd invulde); één mail met alle beheerders in `To` (de adressen staan bij elkaar, en `sendMail` weigert het); de mail in de transactie van de import (een mail die faalt zou de wedstrijden terugdraaien); een mail bij elke run die de afwijking ziet (honderden mails voor één afwijking).
- **Later:** zie _In een seizoen dat voorbij is wint Wikipedia niet vanzelf van de redactie_ (10 november 2026): de mail over een afwijking in een seizoen dat voorbij is noemt geen dag meer, en zegt dat de import Wikipedia niet vanzelf overneemt.

## De import bewaart de uitslagen van alle clubs in de Eredivisie, in een tabel naast de stand

- **Datum:** 2 november 2026
- **Besluit:** de tabel `league_results` (migratie `0032_add_league_results`) heeft een rij voor elke gespeelde competitiewedstrijd van elke club (#601).
  De rij heeft het seizoen, de ronde als getal, de dag, de thuisclub, de uitclub en de doelpunten van allebei.
  De sleutel is het seizoen met de thuisclub en de uitclub, want een paar speelt per seizoen één keer thuis en één keer uit.
  - **Waar vandaan:** dezelfde pagina als de wedstrijden van sc Heerenveen, `Eredivisie <seizoen> (mannenvoetbal)/Wedstrijden`.
    `readLeagueResults` in `read-wikipedia.ts` leest elk blok `Footballbox2` onder een kop `Speelronde <nummer>` met een score.
    Er komt dus geen pagina bij, geen verzoek en geen bronvermelding: de pagina stond er al.
  - **Wat erin komt:** een wedstrijd zonder score (gepland of uitgesteld) staat er niet in, en komt erbij als hij is gespeeld.
    Een wedstrijd die gestaakt en later afgemaakt is, telt één keer, met de eindstand en de dag van het blok dat hem afmaakt.
    Wie thuis speelde, volgt het blok waarmee hij begon.
    Een gestaakte wedstrijd zonder blok dat hem afmaakt heeft geen uitslag en staat er dus niet in.
    De beker en de play-offs staan er niet in, en ook geen doelpuntenmakers, kaarten of toeschouwers.
  - **Hoe hij wordt geschreven:** de import vervangt de rijen van het seizoen in dezelfde transactie als de stand, en schrijft niets als er niets verschilt.
    Het logboek heeft een regel: `Matches 2026/27: league results of all clubs: 90 new, 0 updated, 0 unchanged, 0 removed`.
    Een rij van een eerder seizoen verandert pas bij `Import season`.
  - **Een pagina zonder uitslagen van andere clubs:** de oudere pagina's hebben alleen de wedstrijden van sc Heerenveen.
    Dan blijft de tabel voor dat seizoen leeg en is dat geen fout, want de vorm over de laatste wedstrijden heeft alle clubs nodig.
  - **De namen:** de namen van de clubs zijn die van `standings.club`.
    `matchClubNames` in `league-results.ts` schrijft een naam van de uitslagen zoals de stand als de twee gelijk zijn op de hoofdletters na, of als `club-names.ts` ze als één club kent (`Excelsior` voor `Excelsior Rotterdam`).
    Die lijst is de enige plek waar een verschil in schrijfwijze wordt rechtgezet.
    De site koppelt de uitslagen en de stand dus op de naam, zonder `clubs`.
    Een naam die de stand niet heeft, blijft staan zoals de pagina hem schrijft en komt in de waarschuwing.
  - **De controles:** een club die tegen zichzelf speelt, een ronde buiten 1 tot en met 34 en een thuisclub die twee keer tegen dezelfde uitclub speelt zijn een fout, zoals een andere controle die faalt.
    De import schrijft dan niets en de laatste goede versie blijft staan.
  - **De waarschuwing:** de import telt per club de uitslagen en vergelijkt dat met `played` in de stand van dezelfde lezing.
    Wijkt het af, dan komt er een waarschuwing in het logboek en in `match_imports.last_warning`, en geen fout: de gegevens blijven staan.
    Een gespeelde wedstrijd die de pagina noemt maar die we niet kunnen lezen, komt in een eigen waarschuwing.
- **Waarom:** de projecteigenaar wil op de kaart Stand ook een stand over de laatste vijf wedstrijden (#602).
  Daarvoor hebben we de uitslag, de dag en de ronde van alle 18 clubs nodig, en de import las ze al en gooide ze weg.
  Een eigen tabel naast `standings` houdt de wedstrijden van sc Heerenveen met hun doelpuntenmakers, stadion en beoordeling van wijzigingen gescheiden van een lijst uitslagen die we alleen tellen.
  Het verschil met de stand is een waarschuwing en geen fout, want Wikipedia werkt de stand en het programma niet op hetzelfde moment bij.
  Een verschil van een uur is geen reden om de hele import tegen te houden.
- **Nadeel:** de uitslag van een andere club gaat zonder het oordeel van `classify-change.ts` door: een slordige of kwaadwillende wijziging staat tot de volgende import in de tabel.
  De volgende import zet de tabel weer zoals de pagina dan is, en de waarschuwing wijst op een verschil met de stand.
  De dag van een gestaakte wedstrijd is die van het restant, en `matches.match_date` heeft die van het begin (zie _Een gestaakte wedstrijd telt voor zijn begin, het restant geeft de uitslag en een regel_): voor de vorm telt het einde.
  Na het samenvoegen is de tabel leeg voor de eerdere seizoenen tot de Coördinator `Import season` heeft gedraaid.
- **Alternatieven:** de wedstrijden van andere clubs in `matches` (die tabel is voor sc Heerenveen, met doelpunten, club, beoordeling en vermeldingen, en alle queries van de site zouden ze moeten uitsluiten); `clubs` en een sleutel met `club_id` (de stand heeft die niet, en de koppeling zou een tweede plek zijn waar de namen kunnen verschillen); de uitslagen elke keer uit de pagina lezen op de site (de site leest Wikipedia niet); een fout bij een afwijking van de stand (een uur verschil tussen twee pagina's houdt dan de hele import tegen).
- **Later:** zie _Een wedstrijd onder Inhaalronde telt voor de ronde waaruit hij is uitgesteld, en vervangt het blok zonder uitslag_: `readLeagueResults` leest ook de blokken met een score onder `Inhaalronde <nummer>`, met dat nummer als ronde.
  De rest blijft zoals hier.

## Een wedstrijd onder Inhaalronde telt voor de ronde waaruit hij is uitgesteld, en vervangt het blok zonder uitslag

- **Datum:** 2 november 2026
- **Besluit:** `readLeague` en `readLeagueResults` lezen ook de koppen `Inhaalronde <nummer>` als ronde van de competitie (#608).
  - **Waarom die kop bestaat:** een uitgestelde wedstrijd staat op de pagina twee keer: een blok zonder uitslag in de oorspronkelijke ronde (`Afgelast`, `Uitgesteld` of leeg) en, na het spelen, een blok met de uitslag onder `Inhaalronde <nummer>`.
    Zo staan RKC Waalwijk - Go Ahead Eagles (`Inhaalronde 17`) en Go Ahead Eagles - RKC Waalwijk (`Inhaalronde 25`) in 2022/23.
  - **De ronde:** het nummer in de kop.
    Een wedstrijd van sc Heerenveen onder `Inhaalronde 17` heeft dus de ronde `Speelronde 17`, en een uitslag van een andere club heeft ronde 17.
    Een kop die geen ronde is, zoals de play-offs, of een kop als `Inhaalronde` zonder nummer, blijft buiten de competitie.
  - **Wat vervangen wordt:** heeft het blok onder `Inhaalronde <n>` een score en heeft het blok onder `Speelronde <n>` voor dezelfde twee clubs er geen (leeg, uitgesteld of afgelast), dan telt alleen het eerste.
    Voor sc Heerenveen is het één wedstrijd met de speeldatum en de uitslag van de inhaalwedstrijd, zodat een gespeelde wedstrijd niet als uitgesteld blijft staan.
    Voor de uitslagen van alle clubs staat de wedstrijd er één keer in, met de dag van de inhaalwedstrijd en het nummer van de ronde waaruit hij is uitgesteld.
  - **Wat nooit vervangt:** een blok onder een inhaalronde zonder score, uitgesteld of afgelast.
    Dat is een wedstrijd die een nieuwe datum heeft maar nog niet is gespeeld; het blok van de ronde blijft staan als "Uitgesteld" en de import neemt de nieuwe datum pas over als er een uitslag is.
  - **De dag van de laatste wedstrijd:** een wedstrijd onder een inhaalronde telt mee voor de dag waarvoor de stand geldt (`lastPlayedOn`), want de stand telt hem ook.
- **Waarom:** na de uitrol van #601 misten in vijf van de zes seizoenen 1 tot 6 uitslagen (300 van de 306 in 2020/21), en de waarschuwing "Ajax 33 results against 34 played" meldde het.
  De kaart Stand met de laatste vijf wedstrijden (#602) heeft de uitslagen van alle clubs volledig nodig, en een uitgestelde wedstrijd van ons zelf kon als uitgesteld blijven staan terwijl hij was gespeeld.
  De ronde uit het nummer van de kop houdt de sleutel van `matches` (seizoen, competitie, ronde) gelijk aan die van het blok in de oorspronkelijke ronde, dus de bestaande wedstrijd wordt bijgewerkt en er komt geen tweede.
- **Niet gedekt:** een gestaakte wedstrijd die onder een inhaalronde wordt afgemaakt.
  `restOf` zoekt het restant onder dezelfde kop, dus het blok onder de inhaalronde blijft dan een wedstrijd naast het gestaakte blok en de import geeft een fout.
  We hebben dat niet op een pagina gezien; komt het voor, dan volgt een eigen issue.
- **Alternatieven:** een eigen ronde `Inhaalronde 17` voor de wedstrijd van sc Heerenveen (de wedstrijd staat dan twee keer in `matches`, een keer uitgesteld en een keer gespeeld, en het programma van de site toont er twee); de wedstrijd laten staan zoals hij was en alleen de uitslagen aanvullen (een uitgestelde wedstrijd van ons blijft dan uitgesteld terwijl hij is gespeeld); een inhaalblok zonder score ook laten vervangen (de nieuwe datum is dan zichtbaar, maar een wedstrijd die nog niet is gespeeld zou de oorspronkelijke vervangen en we zagen zo'n blok niet).
- **Later:** zie _Een gestaakte wedstrijd die onder een inhaalronde wordt afgemaakt, is één wedstrijd_ (3 november 2026): de gestaakte wedstrijd die onder een inhaalronde wordt afgemaakt is nu gedekt, ook als het eerste blok een gewone score heeft.

## De beheerschermen voor een wedstrijd zijn een tabel met een filter en een brede pagina met een zijbalk

- **Datum:** 2 november 2026
- **Besluit:** de lijst `/beheer/wedstrijden` en het formulier `/beheer/wedstrijden/<nummer>` krijgen een nieuw ontwerp (#592), als een echt CMS.
  - **De lijst** is één tabel met de wedstrijd als enige koppeling, de uitslag en de status in woorden, en een label voor wat de redactie moet zien: "Uitslag ontbreekt", "Aangepast" en "Wikipedia wijkt af".
    Er staan geen koppen in de rijen.
    Een filter met aantallen (Alles, Zonder uitslag, Aangepast) kiest wat de lijst toont, met koppelingen die een zoekopdracht in het adres zetten, zodat het zonder JavaScript werkt.
    De lijst opent op "Zonder uitslag", en "Alles" houdt die wedstrijden bovenaan.
    Is er niets zonder uitslag, dan staat er één regel in plaats van de tabel.
    Naast de titel staat de seizoenskeuze, en de lijst toont ook oudere seizoenen.
  - **Het formulier** is de brede pagina met een zijbalk.
    De kop is de wedstrijd, met daaronder de competitie, de ronde en de aftrap, en een label als de redactie iets aanpaste of de uitslag ontbreekt.
    De hoofdkolom heeft de kaarten Aftrap, Uitslag en Doelpunten, en bij de beker en de play-offs een kaart voor de verlenging en de strafschoppen.
    De zijbalk heeft het blok om op te slaan, de laatste invoer en "Invoer weghalen".
  - **De stand** staat in de volgorde van de wedstrijd: bij een uitwedstrijd staat de tegenstander voorop, zoals in de kop.
    De labels zijn de namen van de teams.
  - **De doelpunten** zijn een tabel om in te vullen op een brede pagina en een blok per doelpunt op een telefoon.
  - **"Invoer weghalen"** is een uitklapblok met een rode knop.
  - **Een melding** na een actie is een Notice zonder kop, en het kruimelpad vervangt de koppelingen "Terug naar".
  - **Op een telefoon** is het blok om op te slaan de kaart na het formulier, zonder vaste balk.
  - De namen van de velden, de acties, de valideringen, de teksten van de foutmeldingen en de logboekregels veranderen niet.
- **Waarom:** de lijst was een rij koppelingen met een kop in elk item, en het formulier zes velden onder elkaar per doelpunt.
  De projecteigenaar wil schermen die gebruiksvriendelijker en professioneler zijn.
  Een tabel laat in één blik zien wat nog ontbreekt.
  Een zijbalk houdt de knop om op te slaan in beeld bij een lang formulier.
  Een doelpunt van één rij neemt 60 pixels in plaats van een scherm.
- **Hoe:** de teksten komen uit het ontwerp (het Artifact "Wedstrijden in het beheer"), korter waar het kon.
  De onderdelen zijn die van #594, #595 en #599: `Tag`, `Notice`, `Disclosure`, `Breadcrumb`, de gevaarlijke `Button`, `Page.Main` met `wide`, `FieldGroup`, `InputTable`, `DataTable` met `appearance="text"` en de dichtheid `hf-density-compact`.
- **Gevolg:** de lijst heeft vijf kolommen als de tabel breed genoeg is (wedstrijd, datum, competitie, uitslag en status), en drie op een telefoon.
  Daarvoor kreeg `DataTable` een kolom die kan opvouwen (zie _Een kolom van een tabel met tekst kan opvouwen onder de rijkop_).
  De wedstrijd is de eerste kolom, want de rijkop is altijd de eerste.
- **Alternatieven:** een lijst van koppelingen houden en alleen de opmaak verbeteren; dat laat de koppen in de rijen en het scannen van wat ontbreekt.
  Sorteren, zoeken en bulkacties: het ontwerp laat ze op bewuste gronden weg, want de volgorde is het punt, een seizoen heeft zo'n 34 wedstrijden en er is niets in bulk te doen.
  Een vaste balk om op te slaan op een telefoon; het blok bevat de reden en staat daarom als kaart na het formulier.

## Het blok om op te slaan staat in de zijbalk en hoort bij het formulier met het attribuut `form`

- **Datum:** 2 november 2026
- **Besluit:** het veld "Reden" en de knop "Opslaan" staan in de zijbalk, buiten het `form`-element van de kaarten, en horen er met het attribuut `form="wedstrijd"` bij.
  - `MatchFormProvider` houdt de toestand van het formulier (`useActionState`) en deelt hem met drie delen: de foutenlijst, de kaarten en het blok om op te slaan.
    De pagina zelf blijft een servercomponent en zet `Page.Main` en `Page.Sidebar` om de delen heen.
  - `Page.Sidebar` heeft een nieuwe eigenschap `sticky`: vanaf 52 rem blijft de zijbalk in beeld terwijl de hoofdkolom scrolt.
    Een gridelement blijft binnen zijn gridgebied, en dat is zo hoog als de hoofdkolom.
  - Een `Form` met kaarten erin zet de ruimte van de pagina tussen de kaarten.
  - Een `FieldGroup` met een teken (het streepje in een stand) houdt zijn sporen bij elkaar aan het begin, zodat de twee velden naast elkaar staan.
  - "Invoer weghalen" is een eigen formulier in een `Disclosure`, in de zijbalk.
    Het blok staat open als de reden ontbreekt, ook zonder JavaScript, want dan maakt de server de pagina opnieuw.
  - De knoppen van een doelpunt zijn die van `InputTable`.
    De knop "Doelpunt toevoegen" heeft geen `id`, dus de pagina zoekt hem op zijn waarde om hem de focus te geven.
- **Waarom:** het blok om op te slaan moet naast een lange hoofdkolom in beeld blijven.
  `Page.Main` en `Page.Sidebar` zijn twee kolommen van de `Page.Body` die geen gemeenschappelijk element hebben.
  Het attribuut `form` is HTML en werkt zonder JavaScript.
  De Enter-toets in een veld van de kaarten slaat nog op met de verborgen eerste knop, en de knop in de zijbalk verstuurt hetzelfde formulier.
- **Nadeel:** de pagina is een client-eiland van drie delen die een provider delen.
  Een zijbalk die hoger is dan het venster, scrolt zelf; dat is een tweede scrollgebied naast de pagina.
- **Alternatieven:** het hele formulier om `Page.Body` heen; dat verandert de indeling van de site, die de layout tekent.
  Het blok om op te slaan twee keer maken, een in de hoofdkolom en een in de zijbalk; dan zijn er twee velden "Reden" met dezelfde naam.
  Een vaste balk onderaan met JavaScript; dat werkt niet zonder JavaScript en het ontwerp wil geen vaste balk op een telefoon.
  De seizoenen van de lijst uit de cache van de publieke pagina's halen; een wedstrijd die een minuut geleden is toegevoegd, staat er dan niet, en de redactie moet hem zien.

## Wie een doelpunt maakte volgt uit het team en de soort, en het formulier vraagt één vorm

- **Datum:** 2 november 2026
- **Besluit:** het formulier van een wedstrijd laat bij een doelpunt maar één veld zien voor de speler: de keuze uit de selectie, of het veld voor de naam van een andere speler (#615).
  - Maakte een speler van sc Heerenveen het doelpunt, dan is het de keuze uit de selectie.
    Dat is het geval als het team sc Heerenveen is en de soort gewoon of strafschop, of als het team de tegenstander is en de soort een eigen doelpunt.
  - Bij elk ander doelpunt is het het veld voor de naam.
  - Zolang er geen team is gekozen, staat de keuze uit de selectie.
  - De vorm die niet past, is verborgen en gaat niet mee met het formulier.
    Met JavaScript blijft wat erin stond een poos in het formulier, zodat een vergissing niet alles wist.
  - De server leest alleen de vorm die past en wist de andere, ook als hij toch binnenkomt.
    Zonder JavaScript past het formulier zich aan als de server het opnieuw maakt, dus na een knop.
  - De keuze heeft geen optie "Andere speler" meer.
- **Waarom:** de redacteur hoeft niet te kiezen welk veld bij het doelpunt hoort; het volgt uit wat hij al koos.
  De projecteigenaar koos dit boven de selectie verbergen zodra de tegenstander gekozen is, want een eigen doelpunt van de tegenstander is een speler van ons.
- **Nadeel:** zonder JavaScript staat het veld voor de naam pas in beeld als de server het formulier terugstuurt.
  Het geeft dan één fout, bij dat veld.
- **Alternatieven:** de selectie verbergen zodra het team de tegenstander is; dat verbergt haar bij een eigen doelpunt, dat een speler van ons maakt.
  Beide velden laten staan en een fout geven bij het veld dat niet past, zoals het was.
- **Later:** vervangt een zin van _Het formulier van een wedstrijd werkt zonder JavaScript, met één veld voor de speler_.
  Een veld dat niet past, geeft nu geen fout meer: de server wist het.

## Het aantal doelpunten in het formulier volgt de eindstand, en een doelpunt dat niemand invulde telt niet

- **Datum:** 2 november 2026
- **Besluit:** het formulier van een wedstrijd heeft zoveel doelpunten als de eindstand optelt (#615).
  - Met JavaScript voegt het formulier doelpunten toe of haalt het ze weg, zodra een van de twee scores verandert.
    Het haalt alleen doelpunten weg die niemand invulde, van onderen af, en nooit een doelpunt waarin iets staat.
    Een doelpunt dat met de knop is toegevoegd, blijft staan tot de eindstand verandert.
  - Zonder JavaScript heeft het formulier zoveel doelpunten als de uitslag vraagt als de pagina opent, en na een opslag met fouten.
    De knoppen om een doelpunt toe te voegen of weg te halen vullen niet aan, want dan zou "weghalen" een nieuw doelpunt maken.
  - Een doelpunt waarin niets is ingevuld, telt bij het opslaan niet als doelpunt, dus een uitslag zonder doelpuntenmakers kan opgeslagen worden.
  - De velden van een doelpunt staan in de volgorde van het formulier: de minuut, de blessuretijd, de soort, het team en de speler.
  - Het formulier maakt hoogstens 20 doelpunten, hoe hoog de scores ook zijn.
- **Waarom:** de eindstand zegt hoeveel doelpunten er zijn, dus de redacteur hoeft ze niet te tellen en bij te maken.
  Een uitslag zonder doelpunten mag (zie _Het formulier van een wedstrijd werkt zonder JavaScript, met één veld voor de speler_); lege rijen mogen het opslaan dus niet tegenhouden.
- **Nadeel:** een rij die de redacteur niet wil, haalt hij zelf weg of laat hij leeg; een leeg doelpunt dat hij bedoelde, valt zonder melding weg.
- **Alternatieven:** de rijen pas maken na een rondje naar de server; dat werkt niet met een snelle invoer.
  Lege rijen als fout geven; dan moet de redacteur ze één voor één weghalen.
  Elke wijziging van het formulier de rijen laten volgen; dan haalt het formulier een doelpunt weg dat de redacteur net had toegevoegd.

## Wat de redactie opslaat, staat binnen vijf minuten op de site, of binnen een uur

- **Datum:** 2 november 2026
- **Besluit:** de teksten in het beheer die zeggen wanneer een wijziging op de site staat, zijn "binnen vijf minuten" voor een wedstrijd van het huidige seizoen en "binnen een uur" voor een eerder seizoen (#615).
  De woorden komen uit de perioden waarvoor de site de gegevens bewaart (`currentSeasonPeriod` en `pastSeasonPeriod` in `matches.ts`), dus ze volgen die als ze veranderen.
- **Waarom:** "meteen" klopte niet.
  De site bewaart de gegevens van het huidige seizoen vijf minuten en die van een eerder seizoen een uur.
- **Nadeel:** de tekst noemt het ergste geval, en een bezoeker kan de wijziging eerder zien.
- **Alternatieven:** de gegevens van het seizoen vers laden bij het opslaan; dat vraagt een nieuwe manier om de cache van de publieke pagina's te legen, en het issue vroeg er niet om.
  Een vaste tekst; dan klopt hij niet meer als een periode verandert.

## De artikelcode van DPG Media heeft acht of negen letters en cijfers

- **Datum:** 2 november 2026
- **Besluit:** `dpgMediaThread` leest een code van acht of negen letters en cijfers achter de `~` aan het eind van het pad.
  Elke andere lengte geeft geen sleutel.
- **Waarom:** op 2 november 2026 hadden in drie feeds van het Algemeen Dagblad en De Gelderlander (66 verschillende codes) alle codes 8 of 9 tekens, 10 van de 90 links had er negen, en geen enkele een andere lengte.
  Het artikel over St. Juste (`~a25b60e29`) stond daardoor twee keer op `/nieuws`, want zonder sleutel voegt de bewaking niets samen.
  De bestaande berichten krijgen hun sleutel bij de eerstvolgende import (`backfillThreadKeys`), zonder handwerk.
- **Alternatieven:** acht of meer tekens (kan het id van iets anders pakken).
  Alleen hexadecimale tekens met een `a` voorop (strenger dan nodig, en de verzonnen feeds gebruiken `ag…`).
  Acht tot en met tien (een gok boven wat we zagen).
  Een sleutel uit de kop (de kop verandert juist).

## De lezer kent de oudere vormen van de stand, de beker en de titels (2010/11 tot en met 2019/20)

- **Datum:** 3 november 2026
- **Besluit:** de import leest de seizoenen 2010/11 tot en met 2019/20 zoals Wikipedia ze schrijft, en raadt niets (#457).
  - **De titels:** per soort pagina staat een lijst titels, en de import neemt de eerste die bestaat (`pageCandidates`).
    Voor de stand en het programma is dat eerst de titel met `(mannenvoetbal)` en dan die zonder, want de pagina's van 2012/13 tot en met 2014/15 heten `Eredivisie 2013/14`.
    Bestaat geen enkele titel, dan is dat een fout die ze allemaal noemt.
  - **De stand:** heeft de pagina geen sjabloon `Sports table`, dan leest de import de tabel (`{|`) onder de kop `Eindstand`, `Stand na 34 wedstrijden` of `Eindstand na 34 wedstrijden`.
    `Officiële eindstand` heeft geen cijfers, alleen de reden, en wordt overgeslagen.
    De kolommen volgen uit de kop (`{{afkorting|gs|…}}` of de tekst), omdat hun volgorde per seizoen verschilt.
    Punten en doelsaldo zijn de cijfers van de pagina; `checkStandings` blijft ze toetsen, en geen regel is losser geworden.
    Een kolom die ontbreekt, een positie die niet de volgende is en een getal dat geen getal is, zijn een fout.
  - **Puntenaftrek:** staat in de kolom `PA` een aftrek, dan is dat een fout met de naam van de club.
    De tabel `standings` kent geen aftrek, en de punten van de pagina zouden niet meer 3 × gewonnen + gelijk zijn.
    Dat geldt voor 2010/11 (NAC Breda), 2014/15 en 2015/16 (FC Twente): die drie seizoenen blijven een gat tot er een besluit is over de aftrek.
  - **De beker:** de score kent `n.v.`, een of twee paren tussen haakjes in elke volgorde, en `(6 – 7 pen.)`; de oudere pagina's schrijven geen `aet` en geen `penaltyscore`.
    Een `n.v.` in de score is verlenging.
    Een tijd mag een punt hebben (`20.45`).
    Een deel dat twee keer staat, een paar te veel of een stand die niet optelt, is een fout.
  - **Een ronde die verschoof:** `Speelronde 33 (was 34)` is ronde 33, het nummer waarmee ze is gespeeld (2018/19).
  - **De play-offs:** voor 2020/21 staat er geen titel voor de play-offs.
    De pagina heeft dan geen play-offs voor de Conference League, en die voor de Europa League zijn een competitie die de site niet bewaart (`competitions`).
  - **De namen van clubs:** sterren achter een naam (`FC Twente *`) verwijzen naar een voetnoot en horen er niet bij.
- **Waarom:** de competitie en de doelpunten van die tien seizoenen lazen al, maar de import stopte op de stand, de beker of de titel.
  De projecteigenaar wil zo ver terug als de pagina's toelaten, zonder dat een controle losser wordt.
  Op 3 november 2026 lazen 2012/13, 2013/14 en 2016/17 tot en met 2019/20 zo, en 2010/11, 2011/12, 2014/15 en 2015/16 blijven een gat met een reden (zie het pull request).
- **Nadeel:** een seizoen met puntenaftrek ontbreekt tot daar een besluit over is.
  Het seizoen 2011/12 blijft een gat: de wedstrijd Excelsior – AZ is in de rust gestaakt, en de pagina heeft die stand van 0 – 0 als uitslag naast de wedstrijd die daarna helemaal is gespeeld.
  `checkResults` meldt dan dat Excelsior twee keer thuis tegen AZ speelt, en die controle blijft zoals ze is.
  Het seizoen 2019/20 is afgebroken: de acht wedstrijden die niet zijn gespeeld, staan op de pagina als uitgesteld en zo staan ze ook in de database.
- **Alternatieven:** de aftrek bij de punten tellen (`3 × gewonnen + gelijk`) en de controle laten slagen.
  Dat bewaart andere punten dan Wikipedia noemt, dus een gok.
  Een eigen lezer per tijdperk (meer code voor kleine verschillen).
  De stand overslaan voor de oudere seizoenen (dan vervalt de controle op 18 clubs en op onze eigen rij).
- **Later:** de Europa League is sinds 3 november 2026 wel een competitie in `competitions`, maar alleen met de wedstrijden van 2012/13 die de Engelse Wikipedia heeft; zie _De vier Europa League-wedstrijden van 2012/13 komen van de Engelse Wikipedia_.
  De play-offs voor de Europa League op de Nederlandse pagina blijven staan zoals ze waren, tot #672 ze leest.
- **Later:** sinds 9 november 2026 heeft `Europa League` ook de wedstrijden van 2009/10, van de Engelse seizoenspagina van de club; zie _De wedstrijden van 2007/08 tot en met 2009/10 komen uit de blokken `football box`_.
- **Later:** zie _De play-offs voor de Europa League zijn een eigen competitie, naast die voor de Conference League_ (3 november 2026): de import leest ze nu, als competitie `Play-offs Europa League`, voor de seizoenen 2010/11 tot en met 2019/20.
  Voor de seizoenen voor 2020/21 staat er nu wel een titel voor de play-offs.
- **Later:** zie _Een puntenaftrek staat in een kolom van `standings`, komt uit de kolom `PA` en telt mee in `checkStandings`_ (3 november 2026).
  Een aftrek in de kolom `PA` is geen fout meer, en 2010/11, 2014/15 en 2015/16 zijn geen gat meer door de aftrek.
- **Later:** zie _Een gestaakte wedstrijd die onder een inhaalronde wordt afgemaakt, is één wedstrijd_ (3 november 2026): 2011/12 is geen gat meer.
  De zin onder **Waarom** over 2011/12 en de zin onder **Nadeel** hierboven gelden niet meer: de wedstrijd Excelsior – AZ is in de rust gestaakt en later alleen in de tweede helft afgemaakt, niet helemaal opnieuw gespeeld.
  `checkResults` is niet veranderd.
- **Later:** zie _Een wedstrijd die nooit meer wordt gespeeld heeft een eigen status, `cancelled`, en de importer bepaalt dat per seizoen dat voorbij is_ (3 november 2026): de acht wedstrijden van 2019/20 die niet zijn gespeeld, staan nu als geannuleerd in de database en niet als uitgesteld.

## Een puntenaftrek staat in een kolom van `standings`, komt uit de kolom `PA` en telt mee in `checkStandings`

- **Datum:** 3 november 2026
- **Besluit:** `standings` krijgt een kolom `points_deducted` (niet negatief, standaard 0), met een migratie waarin bestaande rijen 0 krijgen (#670).
  `points` blijft het getal van Wikipedia, dus na de aftrek.
  De lezer van de oudere tabel leest de aftrek uit de kolom `PA`: `−1`, `-1` en `1` zijn één punt, een leeg vakje of `0` is geen aftrek, en alles wat geen geheel getal is, is een fout met de naam van de club.
  `checkStandings` eist per club dat punten = 3 × gewonnen + gelijk − aftrek, met een fout voor een aftrek groter dan 3 × gewonnen + gelijk, en vergelijkt de regel van sc Heerenveen met onze uitslagen met dezelfde formule.
  De volledige tabel op de site zet er een regel onder ("FC Twente: 6 punten aftrek."); de compacte tabel niet.
  Punten en volgorde blijven die van Wikipedia.
- **Waarom:** een club heeft hoogstens één aftrek per seizoen in deze data, dus een tabel met een reden is te veel.
  Wikipedia geeft de reden alleen als tekst in een voetnoot, en raden bewaart een gok.
  De punten van de pagina bewaren we zoals ze zijn, zodat de stand klopt met wat supporters kennen.
  De controle blijft even streng, want ze rekent met de aftrek in plaats van hem te negeren.
- **Alternatieven:** een aparte tabel met een reden (meer code en een join in elke vraag, voor een reden die we niet kunnen lezen).
  Een vaste lijst van de drie seizoenen in de code (elke nieuwe aftrek vraagt een codewijziging).
  De aftrek bij de punten tellen en de controle laten slagen (bewaart andere punten dan Wikipedia noemt, zie #457).
  Een marker bij de punten (meer om goed te krijgen voor hulpsoftware, terwijl de regel onder de tabel genoeg is).
- **Let op:** de nieuwere vorm met het sjabloon `Sports table` (vanaf 2020/21) rekent de punten uit en kent geen aftrek, en blijft zoals hij is.
  De import schrijft de aftrek daar als 0.

## De vier Europa League-wedstrijden van 2012/13 komen van de Engelse Wikipedia

- **Datum:** 3 november 2026
- **Besluit:** de wedstrijden van sc Heerenveen in de Europa League van 2012/13 komen van de Engelse Wikipedia, voor dit ene seizoen.
  De rest van de wedstrijdgegevens blijft van de Nederlandse Wikipedia (#673).
  - **De pagina:** `2012–13 UEFA Europa League qualifying (third and play-off round matches)`, die de import ophaalt met de bestaande fetcher: dezelfde User-Agent, `robots.txt` en alleen `/wiki/<pagina>?action=raw`, nooit `/w/` of `api.php`.
    Een vaste lijst in de lezer (`europaLeaguePage`) zegt voor welk seizoen er zo'n pagina is, en voor de andere seizoenen komt er geen verzoek.
    De soort pagina heet `europa-league`, en de bronvermelding noemt hem "Engelse Wikipedia", met dezelfde licentie (CC BY-SA 4.0).
  - **De lezer:** de blokken `Football box` van sc Heerenveen gaan door `readMatch`, in de vorm van de Nederlandse pagina's, zodat dezelfde controles gelden.
    De ronde is `Derde voorronde, wedstrijd 1/2` en `Play-offronde, wedstrijd 1/2`.
    Een fout noemt het seizoen: het aantal wedstrijden (vier) en de som van de scores, die de totaalstand van de samenvatting moet zijn.
    De doelpuntenmakers laat de lezer weg, want de Engelse links zijn geen Nederlandse artikelen van spelers.
    Het stadion is de naam zonder de plaats erachter (`Abe Lenstra Stadion`, niet `Abe Lenstra Stadion, Heerenveen`), zoals de Nederlandse pagina's het schrijven, zodat de statistieken per stadion één stadion blijven zien.
  - **De tijd:** de pagina zegt boven de samenvatting dat de tijden Midden-Europese zomertijd zijn (CEST, UTC+2), de tijd van UEFA, en bij een andere lokale tijd staat die tussen haakjes.
    De lezer neemt de tijd voor de haakjes, als hij CEST ziet staan.
    Staat dat er niet, dan bewaart hij alleen de dag (`date_text`) en geen aanvangstijd.
  - **De clubs:** de tegenstanders heten zoals de Nederlandse Wikipedia ze schrijft, met hun Nederlandse artikel: `Rapid Boekarest` en `Molde FK`.
    Een kleine vaste lijst in de lezer (`europaLeagueClubs`) vertaalt de Engelse titel, want een Engelse titel is geen sleutel van een club.
    Een tegenstander die niet in de lijst staat, is een fout.
  - **De competitie:** `matches.competition` en `match_changes.competition` krijgen de waarde `Europa League`.
    De CHECK voor verlenging laat de waarde toe, `statsCompetitions` blijft zoals het is, en de wedstrijden tellen alleen onder "Alle wedstrijden".
    Een seizoen zonder pagina laat de Europa League-wedstrijden die we hebben staan, zoals de play-offs.
- **Waarom:** de Nederlandse Wikipedia heeft van deze wedstrijden alleen de scores, zonder datum of stadion, en een wedstrijd heeft bij ons een datum nodig.
  De Engelse Wikipedia heeft ze volledig, onder dezelfde licentie (CC BY-SA 4.0) en met dezelfde fetcher en regels.
  voetbalstats.nl liet zich niet lezen: de site zet een controle tegen bots voor elke pagina.
- **Alternatieven:** de vier wedstrijden niet tonen (een gat in de geschiedenis van de club).
  De datum van een wedstrijd leeg laten (raakt de volgorde en alle lijsten).
  De wedstrijden met de hand invoeren vanaf voetbalstats.nl (geen bron die de import kan lezen).
- **Later:** zie _Wedstrijdgegevens komen van de Nederlandse Wikipedia, voor het eerste mannenelftal_ (25 oktober 2026): de taal geldt niet meer voor dit ene seizoen.
- **Later:** sinds 9 november 2026 is de Engelse Wikipedia geen uitzondering voor dit ene seizoen meer; zie _Elke taal van Wikipedia mag, onder een geschikte CC-licentie_.
  `Europa League` heeft sindsdien ook de acht wedstrijden van 2009/10.

## De play-offs voor de Europa League zijn een eigen competitie, naast die voor de Conference League

- **Datum:** 3 november 2026
- **Besluit:** wedstrijden uit de play-offs voor de Europa League (2010/11 tot en met 2019/20) krijgen de competitie `Play-offs Europa League`, en die van de Conference League houden `Play-offs Conference League` (#672).
  Beide tellen alleen onder "Alle wedstrijden".
  - **De pagina:** dezelfde als bij de Conference League, `Play-offs Nederlands voetbal <jaar>` met het jaar waarin het seizoen eindigt.
    De import leest de wedstrijden van sc Heerenveen onder de kop `Play-offs voor de UEFA Europa League`, voor elk seizoen vanaf 2010/11.
    De kop zegt de competitie: onder `Play-offs voor de UEFA Conference League` is het `Play-offs Conference League`.
    Een pagina met geen van beide koppen blijft een fout.
  - **De competitie:** `Play-offs Europa League` in `matches.competition` en `match_changes.competition`, met een migratie (`0035_add_europa_league_playoffs`).
    De CHECK-constraint voor verlenging (`matches_extra_time_only_in_played_knockout`) laat de nieuwe waarde toe, en een test in `packages/db` laat dat zien.
    **Later:** zie _De wedstrijden van de oude fansite komen in `matches`, met een eigen bron, zes nieuwe competities en een tabel voor de statistieken_ in `hosting-en-data.md` (7 november 2026): de check laat verlenging toe bij elke competitie behalve `Eredivisie` en `Eerste divisie`, dus een nieuwe waarde hoeft niet meer in de lijst.
    `player_season_stats` houdt zijn twee competities: de tabel van de selectie heeft geen kolommen voor de play-offs.
  - **De ronde:** de kop boven de wedstrijd, `Eerste ronde` of `Tweede ronde`, met `, wedstrijd 1/2` bij een paar van twee wedstrijden.
    Op de pagina's van 2013 tot en met 2018 staat in het sjabloon `Wedstrijd 1` en `Wedstrijd 2`, zonder `/2`, en de lezer neemt dan twee wedstrijden aan.
    Verlenging staat er ook als `(nv)`; dat leest de lezer zoals `n.v.`.
    De stand na 90 minuten bewaart hij alleen bij een ronde in één wedstrijd, zoals bij de Conference League.
  - **De jaren:** sc Heerenveen speelde de play-offs in 2013, 2014, 2015, 2017 en 2018, dus in de seizoenen 2012/13, 2013/14, 2014/15, 2016/17 en 2017/18.
    Een jaar zonder wedstrijd van ons (2011, 2012, 2016, 2019) is geen fout en geen bron.
    De pagina van 2020 bestaat niet (404), en een ontbrekende pagina is geen mislukking.
  - **De seizoenen die niet lezen:** wat een seizoen nog niet laat lezen (#457, #670), houdt ook zijn play-offs buiten, want de pagina's van een seizoen horen bij elkaar.
- **Waarom:** een bezoeker ziet de naam die bij het seizoen hoort, en de bestaande rijen, adressen en teksten veranderen niet.
  Een seizoen heeft de ene of de andere, dus de sleutel per seizoen, competitie en ronde blijft uniek.
  De pagina's hebben dezelfde sjablonen, dus de lezer is bijna dezelfde: alleen de kop, de rondes en `(nv)` zijn nieuw.
- **Alternatieven:** één algemene naam zoals `Play-offs Europees voetbal` (dat hernoemt bestaande rijen en klopt voor geen van beide).
  De Europa League-play-offs als bekerwedstrijd bewaren (de ronde, de schakelaar en de bijschriften zeggen dan iets wat niet klopt).

## Het onderzoek naar de spelers telt de hele selectie, niet alleen wie speelde

- **Datum:** 3 november 2026
- **Besluit:** met "spelers die voor het eerste elftal speelden" bedoelen we iedereen die in de selectie van een seizoen zat, ook zonder wedstrijd.
- **Waarom:** de projecteigenaar wil de volledige lijst, en een naam zonder wedstrijd hoort er voor een supporter ook bij.
- **Alternatieven:** alleen wie minstens één wedstrijd speelde, ook als invaller.
  Dat past beter bij wat de tabellen en wedstrijdpagina's laten zien, maar het mist spelers die nooit in actie kwamen.
- **Gevolg:** oude pagina's noemen een speler zonder wedstrijd zelden.
  Het onderzoek zegt per tijdperk hoe compleet de lijst kan worden, en noemt wat alleen met wedstrijden te vinden is (zie `docs/onderzoek-spelers-sinds-1990.md`).

## De bronnen voor de spelers zijn de Nederlandse Wikipedia, Wikidata en de Engelse Wikipedia

- **Datum:** 3 november 2026
- **Besluit:** het onderzoek (#676) beoordeelt de pagina's van de Nederlandse Wikipedia, Wikidata (CC0) en de Engelse Wikipedia (CC BY-SA 4.0).
  Transfermarkt en andere databanken blijven buiten beeld, zoals bij #414.
- **Waarom:** het zijn open bronnen die bij het bronbeleid passen, en Wikidata heeft het lidmaatschap van een team met data.
- **Alternatieven:** alleen de Nederlandse Wikipedia.
  Dat is geen nieuwe bron, maar het laat misschien gaten in oudere seizoenen.
- **Gevolg:** het onderzoek beoordeelt de bronnen.
  Het besluit om er een te gebruiken in de importer komt na het antwoord van de projecteigenaar.
- **Later:** het onderzoek vond dat de `robots.txt` van Wikidata ons weert, dus Wikidata kan niet met de fetcher.
  De keuze wat we ermee doen, staat als open vraag in `docs/onderzoek-spelers-sinds-1990.md`.
- **Later:** zie _Wikidata is de bron voor de gegevens van een persoon_.
  De `robots.txt` weert alleen de API onder `/w/`; het item per persoon op `Special:EntityData/Q….json` mag wel, dus Wikidata kan met de fetcher.
  Wat het onderzoek over de spelers per seizoen vond, blijft gelden: Wikidata is voor een lijst per seizoen een bovengrens.

## De oude fansite-database staat alleen in een alinea van het onderzoek

- **Datum:** 3 november 2026
- **Besluit:** het antwoord noemt in één alinea wat de oude database van 1989 tot 2007 zou kunnen dekken.
  Het onderzoek leest haar niet voor het voorstel.
- **Waarom:** de rechten zijn onduidelijk (zie #414), en dat probleem hoort niet in dit onderzoek.
- **Alternatieven:** de namen vergelijken om de volledigheid te meten.
  Dat is nuttig, maar het raakt de rechtenvraag toch.

## Het onderzoek naar de spelers heeft een alleen-lezen proef

- **Datum:** 3 november 2026
- **Besluit:** de Builder haalt de pagina's van alle seizoenen vanaf 1990/91 op met een wegwerpscript en slaat niets op.
  De aantallen komen in het antwoord.
- **Waarom:** zo zijn de aantallen per seizoen gemeten en niet geschat, zoals bij #414.
- **Alternatieven:** alleen bureauonderzoek.
  Dat is goedkoper, maar de aantallen zijn dan een schatting.
- **Gevolg:** de proef staat in `docs/onderzoek-spelers-sinds-1990.md`, met de stappen om hem te herhalen.

## Een gestaakte wedstrijd die onder een inhaalronde wordt afgemaakt, is één wedstrijd

- **Datum:** 3 november 2026
- **Besluit:** een blok onder `Speelronde <n>` waarvan het veld `report` "gestaakt" zegt, is een gestaakte wedstrijd, ook als de score een gewone uitslag is, en het blok voor dezelfde twee clubs onder `Inhaalronde <n>` maakt hem af, zoals het latere blok onder dezelfde kop dat al deed (#548, #678).
  Het is één wedstrijd met de eindstand en de dag van het tweede blok.
  Een wedstrijd die helemaal opnieuw is gespeeld, kreeg toen nog geen regel (zie **Later:** onderaan).
  - **Het woord:** de lezer leest de tekst van `report` zoals de pagina hem toont, zonder opmaak en zonder de adressen van links.
    Het adres van een verslag bevat vaak het woord (`...-vuurwerk-gestaakt-duel.html` in 2019/20, een wedstrijd die wel is gespeeld) en is geen mededeling.
  - **Het restant:** onder dezelfde kop, of onder `Inhaalronde <n>` met hetzelfde nummer voor een blok onder `Speelronde <n>`, en nergens anders.
    Dat geldt voor elk gestaakt blok, ook voor een score als `Gestaakt 82' (2 – 0)`.
    Staat er geen blok, of is het zelf gestaakt (de score, of "gestaakt" in `report` van het blok onder de inhaalronde), uitgesteld of een score die we niet kennen, dan is het een fout die de wedstrijd noemt.
  - **Voor sc Heerenveen:** één wedstrijd in `matches`, onder de ronde van het eerste blok, met de regel in `matches.note`.
    Staat de minuut niet in de score maar zegt `report` "in de rust", dan begint de regel met "Gestaakt in de rust."
    Zegt de pagina niets over de minuut of de rust, dan is het een fout.
  - **Voor de uitslagen van alle clubs:** één uitslag, de eindstand van het blok dat hem afmaakt, met de dag van dat blok en de ronde uit het kopnummer.
    `lastPlayedOn` telt dat blok mee.
    Een gestaakt blok met een gewone score en zonder bruikbaar restant staat in `unread` en niet in de uitslagen, want de gewone score zou een stand geven die niet de eindstand is.
  - **Wat niet losser wordt:** `checkResults` is niet veranderd.
    Dezelfde uitslag twee keer zonder het woord blijft een fout.
- **Waarom:** Excelsior – AZ (2011/12) is op 20 november 2011 in de rust gestaakt wegens mist (0 – 0) en op 7 december 2011 afgemaakt in de tweede helft (0 – 0).
  De pagina schrijft het eerste blok als gewone uitslag onder `Speelronde 13` en het tweede onder `Inhaalronde 13`, dus Excelsior stond twee keer thuis tegen AZ in de uitslagen en het seizoen las niet.
  De wedstrijd telt voor de stand maar één keer, met de eindstand na beide delen, en die klopt met de stand van Wikipedia.
  Het woord in `report` is de enige plek waar de pagina het zegt, en een tweede blok dat er alleen op lijkt is zonder dat woord geen reden om te raden.
- **Alternatieven:** twee wedstrijden met een status (een kolom en een status die elke lijst op de site moet kennen, voor één wedstrijd van een andere club en een geval dat we verder niet zagen).
  Elk blok onder een inhaalronde laten winnen van het blok onder de ronde (eenvoudiger, maar dezelfde uitslag twee keer zou dan stil goed gaan).
  Een vaste uitzondering voor deze wedstrijd in de code (nul risico nu, maar de volgende gestaakte wedstrijd vraagt weer een wijziging).
  Alleen wedstrijden van andere clubs (laat de eigen wedstrijd onder een inhaalronde een fout, terwijl de code hetzelfde is).
- **Later:** zie _De lezer kent twee nieuwe schrijfwijzen van een gestaakte score, en een helemaal herspeelde wedstrijd is één wedstrijd_ (4 november 2026): ook een wedstrijd die helemaal opnieuw is gespeeld is één wedstrijd, met de eindstand van het blok dat hem afmaakt.
  De zin hierboven over een wedstrijd die helemaal opnieuw is gespeeld, geldt niet meer.
  De rest blijft: zonder bruikbaar restant is het een fout, en `checkResults` is niet veranderd.

## Een doorverwijzing op Wikipedia is hetzelfde artikel, dus dezelfde club

- **Datum:** 3 november 2026
- **Besluit:** de import behandelt de titel van een artikel dat een doorverwijzing is als het artikel waar hij naar verwijst (#680).
  Hij vraagt dat per titel één keer aan Wikipedia en onthoudt het antwoord in de tabel `club_pages`.
  - `club_pages` heeft een rij per titel (`page`, uniek) met de club (`club_id`).
    `clubs.wikipedia_page` is de titel van het echte artikel, na de doorverwijzingen, en staat ook in de tabel.
  - Een titel die niet in `club_pages` staat en van geen club het artikel is, vraagt de import één keer op met de bestaande fetcher: dezelfde User-Agent, `robots.txt` en alleen `/wiki/<titel>?action=raw`.
    Dat gebeurt vóór de transactie van het seizoen.
  - Begint de tekst met `#REDIRECT` of `#DOORVERWIJZING` (hoofdletters tellen niet mee), dan is het doel de titel tussen `[[` en `]]`, zonder `|…` of `#…`.
    Een doel dat zelf een doorverwijzing is, volgt de import ook, hoogstens drie keer.
    Een doel dat al in `club_pages` staat, kost geen verzoek.
  - De import bewaart niets uit de tekst van een artikel, alleen of de titel een doorverwijzing is en naar wat.
  - Faalt een verzoek (netwerk, status, `robots.txt`), dan maakt de import geen club op een gok: de run van het seizoen valt, en een volgende run probeert het opnieuw.
  - De titels van de Europa League-wedstrijden van 2012/13 zijn titels van de Nederlandse Wikipedia, want de reader zet de Engelse namen om (`europaLeagueClubs`).
    Alle verzoeken gaan dus naar de Nederlandse Wikipedia.
  - Twee clubs die elk een eigen artikel hebben dat geen doorverwijzing is, blijven twee clubs: `Excelsior Maassluis` is een andere club dan `Excelsior Rotterdam`.
- **Waarom:** "één artikel is één club" klopt alleen als doorverwijzingen meetellen.
  Zonder dat werden `AZ Alkmaar` en `SBV Excelsior` extra clubs (3 november 2026, na #667): de pagina Tegenstanders toonde twee rijen met dezelfde naam, en de pagina van een tegenstander telde maar een deel van de wedstrijden.
  De oudere seizoenen van #414 hebben veel meer oude namen en titels, en een lijst die we met de hand bijhouden, loopt daar altijd achter.
- **Nadeel:** een titel die niet bestaat (404), zoals een rode link naar een club, laat de run van het seizoen vallen in plaats van een club zonder artikel te maken.
  Eenmalig komen er ongeveer 55 verzoeken bij voor de titels die er al zijn.
  De slugs `az-2` en `excelsior-rotterdam-2` vervallen zonder omleiding, want er zijn nog geen openbare links (zie #33).
- **Later:** voor een persoon bewaart de import ook niets uit de tekst van een artikel, tot #715 de voor- en achternaam uit de tekst haalt.
  Een titel zonder artikel (404) en een mislukt verzoek vallen daar anders uit dan hier: zie _Een titel wordt één keer opgevraagd, en een mislukt verzoek is een waarschuwing_.
- **Alternatieven:** de lijst `clubFullNames` uitbreiden met titels van artikelen (geen verzoeken en geen tabel, maar elk nieuw paar blijft een dubbele club tot iemand het ziet); doorverwijzingen alleen controleren bij het zoeken naar dubbele clubs (de club bestaat dan al en de pagina's tonen hem dubbel); een titel zonder artikel als 404 laten doorgaan (dat is een gok, en een fout valt op).
- **Later:** de import bewaart voor een persoon sinds #715 ook de naam in delen, uit de sorteersleutel van zijn artikel en niet uit de tekst van een link; zie _De import leest de naam van een persoon uit de sorteersleutel van zijn artikel_ hieronder.

## Het herstel van clubs onder een doorverwijzing hoort bij de import, zoals dat van de lijst

- **Datum:** 3 november 2026
- **Besluit:** de import voegt clubs waarvan de titel een doorverwijzing is, zelf samen aan het begin van een run, vóór een seizoen wordt gelezen, naast `repairClubs` voor de lijst met volledige namen (`repairKnownClubs`, dat `repairClubPages` draait).
  Er komt geen migratie die data verandert.
  - De import controleert elke club waarvan de titel nog niet in `club_pages` staat, één keer: een verzoek per titel.
  - Clubs die op hetzelfde artikel uitkomen, zijn één club, in een transactie per artikel.
    De club die blijft is die met het artikel, anders die met de meeste wedstrijden, anders de oudste, zoals bij `repairClubs`.
    Heeft geen club het artikel, dan krijgt de club dat als `wikipedia_page` en blijft staan: `BV De Graafschap` wordt het artikel `De Graafschap (voetbalclub)` en blijft de club `de-graafschap`.
  - De wedstrijden en de andere namen van de club die weggaat, gaan naar de club die blijft, en zijn titel en naam worden een titel in `club_pages` en een andere naam.
    De club die blijft houdt zijn slug en zijn naam.
  - Elke samenvoeging staat in het logboek met `Clubs:` vooraan, zoals `Clubs: merged club 'AZ' into club 'AZ'`.
    Een tweede run schrijft niets en vraagt niets.
  - Het herstel van de doorverwijzingen gaat vóór dat van de lijst, zodat twee clubs die één artikel zijn, geen waarschuwing "have an article each" meer geven.
    Faalt het, dan is dat een waarschuwing en gaat het herstel van de lijst door.
- **Waarom:** een migratie kan Wikipedia niet vragen, en de run schrijft elke samenvoeging in het logboek.
  Zo gebeurt het herstel op acceptatie en productie zonder dat iemand "Import seasons" start.
- **Alternatieven:** een eenmalig commando (het moet toch per omgeving gedraaid worden en laat geen regel in het logboek van de runs); met de hand samenvoegen met SQL (twee clubs nu, maar het is de oude weg die we juist willen vermijden).

## Een wedstrijd die nooit meer wordt gespeeld heeft een eigen status, `cancelled`, en de importer bepaalt dat per seizoen dat voorbij is

- **Datum:** 3 november 2026
- **Besluit:** `matches.status` krijgt de waarde `cancelled`, op de site "Geannuleerd".
  De importer zet een wedstrijd van sc Heerenveen op `cancelled` als `pnpm import:season` hem na het lezen van een seizoen dat voorbij is nog als `postponed` ziet: de score zegt `Uitgesteld` of `Afgelast` en geen blok onder `Inhaalronde` met een score heeft hem vervangen.
  In het lopende seizoen blijft zo'n wedstrijd `postponed`.
  Een geannuleerde wedstrijd blijft in de lijst van zijn seizoen en staat in Uitslagen, niet in Programma; hij telt nergens als gespeeld en krijgt geen reden.
  - **Waar de regel zit:** in `import-matches.ts` (`cancelledOf`), na het lezen van de pagina's en vóór het opslaan, en alleen voor een seizoen dat voorbij is (`isPastSeason`).
    De uurlijkse import leest alleen het lopende seizoen, dus die verandert niet.
  - **Een tweede lezing:** een wedstrijd die al als `postponed` is bewaard, wordt bij de volgende lezing van het seizoen `cancelled`.
    De wijziging gaat door het oordeel van `classify-change.ts` als een wijziging van de datum van een wedstrijd zonder uitslag: nieuw, dus overgenomen.
  - **Wat het raakt:** de regel kijkt naar het seizoen en niet naar de competitie, dus ook een bekerwedstrijd of een wedstrijd van een andere competitie die nooit is gespeeld, wordt `cancelled`.
    De CHECK-regels van `matches` laten een geannuleerde wedstrijd zonder doelpunten, verlenging, strafschoppen en toeschouwers toe en eisen dat ook; ze zijn daarvoor niet veranderd, want ze vragen alleen om `played`.
  - **Relevantie:** `relevance.ts` telt een geannuleerde wedstrijd niet mee, zoals een uitgestelde.
- **Waarom:** de pagina van 2019/20 schrijft `Afgelast` bij 76 wedstrijden, ook bij die door het weer zijn uitgesteld en later zijn gespeeld, dus het woord zegt niet of de wedstrijd nog komt.
  Dat weten we pas als het seizoen voorbij is.
  Een eigen status laat Programma, de pagina van een tegenstander en de cijfers het verschil maken zonder dat elke plek een seizoen hoeft te kennen.
  "Uitgesteld" voor wedstrijden die nooit meer komen, is voor een supporter misleidend.
- **Alternatieven:** alleen een ander woord op de site voor dezelfde status `postponed` (geen migratie, maar de wedstrijden blijven in het programma staan en tellen als nog komend); een lijst met seizoenen in de importer (`2019/20` is geannuleerd; uitgeschreven, maar elk nieuw geval vraagt een codewijziging); de wedstrijden verbergen (een gat in speelronde 27 tot en met 34 zonder uitleg); een vaste reden als tekst bij de wedstrijd (een claim die wij zelf doen, naast de pagina).

## De lezer kent twee nieuwe schrijfwijzen van een gestaakte score, en een helemaal herspeelde wedstrijd is één wedstrijd

- **Datum:** 4 november 2026
- **Besluit:** een score met `Gestaakt` of `Gest.` en een minuut, met de stand ervoor of erna, is een gestaakte wedstrijd, net als `Gestaakt 82' (2 – 0)` (#684).
  Het blok dat hem afmaakt (hetzelfde als bij #548 en #678) geeft de eindstand en de dag, ook als de pagina de wedstrijd helemaal opnieuw laat spelen.
  De regel in `matches.note` verandert niet.
  - **De schrijfwijzen:** `Gest. 57' (0 – 0)` (2010/11) en `(0 – 0)<br />Gestaakt 1'` (2018/19).
    `Gest.` zonder minuut is een score die we niet kennen, en dus een waarschuwing of fout.
  - **Zonder restant:** een gestaakt blok zonder bruikbaar vervolg staat in `unread` bij de uitslagen van alle clubs, in elke schrijfwijze van de score.
    Voorheen deed dat alleen een blok met een gewone score en "gestaakt" in `report`.
- **Waarom:** Willem II – De Graafschap, Excelsior – NAC Breda, Feyenoord – VVV-Venlo en PEC Zwolle – FC Groningen zijn dezelfde soort wedstrijd als NAC Breda – sc Heerenveen (2025/26) en Excelsior – AZ (2011/12).
  Alleen de woorden van de score verschillen.
  Een herspeelde wedstrijd leest even goed als de eindstand van het tweede blok, want de stand telt de wedstrijd één keer.
  De pagina heeft geen veld dat een restant van een herspeelde wedstrijd onderscheidt, dus raden we niet.
- **Alternatieven:** de herspeelde wedstrijd een fout of waarschuwing laten (de waarschuwing blijft dan elke import terugkomen, terwijl de uitslag klopt).
  Twee wedstrijden met een status (een kolom die elke lijst op de site moet kennen, voor wedstrijden van andere clubs).
  Een eigen regel in `matches.note` voor een herspeelde wedstrijd (de pagina laat het verschil niet zien).

## De lezer neemt `o.g.` als eigen doelpunt en `p` als strafschop, en geen andere deelcode

- **Datum:** 4 november 2026
- **Besluit:** `o.g.` achter een minuut is een eigen doelpunt zoals `e.d.`, `p` is een strafschop zoals `pen.`.
  Een andere deelcode blijft een waarschuwing "no scorers" voor die wedstrijd.
- **Waarom:** `o.g.` komt 29 keer voor op de vier pagina's, altijd waar `e.d.` kan staan.
  `p` komt één keer voor, bij een doelpunt van Tadić (Ajax) na 63 minuten, waar `pen.` kan staan.
  Zonder deze twee codes hebben vier wedstrijden geen doelpuntenmakers.
- **Alternatieven:** ook andere schrijfwijzen toestaan (`og`, `pen`, `P`): niet gezien op een pagina, dus een gok.
  De waarschuwing laten staan en de wedstrijden zonder doelpuntenmakers laten (de doelpunten staan wel op de pagina).
- **Later:** een doelpunt dat beide is (`e.d.` of `o.g.` samen met `pen.` of `p`) blijft een fout.
- **Later:** een markering tussen haakjes bij de naam, zoals `([[Strafschop|pen]])`, is ook een deel van het doelpunt, en `pen` staat dan ook bij de bekende delen (zie _Een markering tussen haakjes is een deel van het doelpunt, geen deel van de naam_).

## Een datum zonder jaar krijgt het jaar van het seizoen

- **Datum:** 4 november 2026
- **Besluit:** een datum met dag en maand en zonder jaar op de wedstrijdpagina van de competitie krijgt het jaar van het seizoen: augustus tot en met december het eerste jaar, januari tot en met juli het tweede.
  Het seizoen komt van de aanroep (`readLeague` en `readLeagueResults`), niet uit de pagina.
- **Waarom:** Excelsior – NAC Breda (2010/11) heeft "15 december" zonder jaar.
  Zonder die datum valt de uitslag weg en kloppen de uitslagen niet met de stand van Excelsior en NAC Breda.
  Een seizoen loopt van augustus tot en met juli, dus de maand bepaalt het jaar zonder twijfel.
- **Alternatieven:** het blok laten vallen en de waarschuwing houden (de stand blijft dan afwijken).
  Het jaar van het blok ervoor of erna nemen (dat hangt af van de volgorde op de pagina, en een blok kan onder een andere kop staan dan het blok ervoor).

## `Roda JC` is een andere schrijfwijze van `Roda JC Kerkrade`

- **Datum:** 4 november 2026
- **Besluit:** `Roda JC` staat als andere schrijfwijze in `clubFullNames` bij `Roda JC Kerkrade`, zoals `Excelsior` bij `Excelsior Rotterdam`.
- **Waarom:** PSV – Roda JC (19 december 2010) schrijft de uitwedstrijdclub als `[[Roda JC Kerkrade|Roda JC]]`.
  De lezer neemt de zichtbare tekst en de stand kent alleen `Roda JC Kerkrade`, dus de uitslag telde voor een club die de stand niet heeft.
  Wikipedia heeft maar één artikel, `Roda JC Kerkrade`, dus het is dezelfde club.
- **Alternatieven:** de naam in de uitslagen aan de stand aanpassen met een eigen regel in de lezer (de lijst `clubFullNames` doet dat al voor Excelsior, voor de uitslagen en voor de clubs).

## De lijst van namen is alleen voor de weergave, en de import houdt de naam in de kop

- **Datum:** 4 november 2026
- **Besluit:** de namen van de lijst van de redactie (`club_name_periods`, #705) komen bij het opslaan ook in `club_names`, behalve de naam in de kop, zodat de import een hernoemde club vindt.
  De import bepaalt de naam in de kop en de slug, ook voor een club met een lijst.
  Een naam die bij een andere club hoort, wordt geweigerd.
  - **Wat "bij een andere club" is:** de naam in de kop of een andere naam van een andere club, op naam zonder verschil in hoofdletters, accenten en leestekens (`normaliseClubName`), zoals de import zoekt.
  - **Wat weghalen doet:** een naam uit de lijst halen of de hele lijst weghalen laat `club_names` zoals het is, want de import kan de naam intussen hebben gebruikt voor een wedstrijd.
  - **De test:** na het opslaan van een lijst met FC en PEC vindt `createClubBook` (de import) een wedstrijd tegen "FC …" bij dezelfde club en maakt hij geen tweede club.
- **Waarom:** zo ontstaat bij een naamswijziging geen tweede club, zoals bij AZ en Excelsior (#680), en de import hoeft geen tweede bron van waarheid voor de naam in de kop te kennen.
- **Nadeel:** staat de laatste naam van de lijst niet gelijk aan de kop, dan zegt het beheerscherm dat in tekst; de redactie of een volgende import lost het op.
- **Alternatieven:** de nieuwste naam van de lijst wordt de naam in de kop (de import moet dan voor die clubs ophouden de naam te veranderen: meer regels en meer risico).

## Een markering tussen haakjes is een deel van het doelpunt, geen deel van de naam

- **Datum:** 4 november 2026
- **Besluit:** de lezer haalt een markering tussen haakjes uit de regel met een doelpunt voordat hij de naam en de pagina bepaalt.
  `pen`, `pen.` en `p` werken als de delen in het sjabloon voor een strafschop, `e.d.` en `o.g.` voor een eigen doelpunt.
  Een andere markering, of een markering bij meer dan één doelpunt op een regel, is een tekst die we niet kunnen lezen.
  Haakjes in de titel van een link, zoals `[[Daniel Wass (voetballer)|Wass]]`, zijn geen markering.
- **Waarom:** de pagina schrijft de strafschop van Ziyech in 2013/14 als `([[Strafschop|pen]]) [[Hakim Ziyech]]`.
  Zonder dit besluit werd de naam "(pen) Hakim Ziyech", de pagina "Strafschop" en het doelpunt geen strafschop.
  De lezer raadt bij een deel dat hij niet kent niet, en dat doet hij hier ook niet.
- **Alternatieven:** de link naar "Strafschop" bij het tonen overslaan (de naam en de strafschop blijven fout in de database).
  Elke markering tussen haakjes negeren (een markering die iets anders betekent, valt dan stil weg).

## Een titel wordt één keer opgevraagd, en een mislukt verzoek is een waarschuwing

- **Datum:** 4 november 2026
- **Besluit:** de import vraagt een titel van een doelpuntenmaker met een pagina, van ons en van de tegenstander, en een titel in de selectie die niet in `person_pages` staat, één keer op en onthoudt het antwoord in `person_pages` (#714).
  Hij volgt de doorverwijzingen zoals bij `club_pages`.
  - **Hoe:** `lookUpPersonPages` in `person-pages.ts` gebruikt voor elke titel `lookUpTitles` uit `club-pages.ts` (geen kopie), dus dezelfde fetcher, `robots.txt`, alleen `?action=raw` en hoogstens drie stappen.
    Het gebeurt voor de transactie van het seizoen, in de import van de wedstrijden en in die van de selectie.
    De transactie maakt de personen en de rijen van `person_pages` met `createPersonBook` (`@fansite/db/persons`) en zet `person_id` bij de doelpunten en de spelers.
  - **Een titel zonder artikel** (404, een rode link) wordt een persoon met de titel zoals hij staat.
  - **Een mislukt verzoek** geeft een waarschuwing met `Persons:` vooraan en laat `person_id` leeg tot de volgende run.
    Een `robots.txt` die weigert of een verzoek om te wachten stopt het vragen voor die run.
    Na drie mislukte titels achter elkaar stopt de import ook, zodat een storing niet honderden verzoeken met een time-out kost.
    De run van het seizoen valt er nooit door.
  - **Een titel die al bekend is,** kost geen verzoek: ook niet een doorverwijzing naar een bekend artikel.
    Een tweede run schrijft niets en vraagt niets, en het logboek noemt het aantal titels dat is opgevraagd.
  - **`personTitleAliases`** in `person-names.ts`, in de vorm van `clubFullNames`, zegt welke titels één persoon zijn als geen doorverwijzing het zegt.
    Het gaat voor het verzoek: een andere titel kost geen verzoek en is de persoon van de titel die blijft.
    De lijst begint leeg.
    **Later:** sinds 10 november 2026 staan er vier personen in, en de import voegt ze samen als beide al bestaan; zie _De import voegt de personen samen die de projecteigenaar als één persoon aanwees_.
  - **Een doelpunt in een seizoen dat voorbij is** krijgt zijn `person_id` zonder een wijziging die wacht: een verschil alleen in de koppelingen (speler, pagina, persoon) is een aanvulling (`links` in `classify-change.ts`).
  - **Een doelpunt dat de redactie in het beheer bewaart** houdt het `person_id` dat de import bewaarde, als het doelpunt niet veranderde.
    Een doelpunt dat de redactie zelf toevoegt, krijgt geen `person_id` en telt dan op zijn speler of zijn titel, zoals nu.
- **Waarom:** een club op een gok is erger dan wachten, maar een seizoen mag niet vallen op één speler van een tegenstander.
  De doelpunten tellen zonder persoon gewoon op de titel mee, zoals nu.
  Een rode link is nog steeds de speler zoals de wedstrijdpagina hem noemt.
- **Nadeel:** een pagina die hernoemd wordt, blijft onder de oude titel in de database staan.
  De waarschuwing voor personen die op elkaar lijken vangt het eerste geval dat dit geeft.
  De eerste import vraagt ongeveer 680 titels op, eenmalig.
- **Alternatieven:** de run laten vallen bij een mislukt verzoek (zoals bij clubs; één storing in Wikipedia stopt dan de import van een seizoen).
  Elke titel elke run opnieuw vragen (kost 680 verzoeken per run).

## Twee personen die op elkaar lijken waarschuwen, en voegen we niet zelf samen

- **Datum:** 4 november 2026
- **Besluit:** zijn twee titels zonder accenten, hoofdletters, streepjes, spaties en apostrofs gelijk, dan waarschuwt de import (`Persons:`) en voegt hij niets samen (#714).
  De toevoeging tussen haakjes telt mee: `Johnny Jansen (1952)` en `Johnny Jansen (1975)` lijken niet op elkaar.
  `pnpm run import:status` toont het aantal groepen, met de titels.
  Een lijst `personTitleAliases` in de importer zegt welke titels één persoon zijn als geen doorverwijzing het zegt.
  Er komt geen scherm in het beheer.
- **Waarom:** samenvoegen op een gelijke naam is een gok bij twee spelers met dezelfde naam.
  Een scherm voor een handvol gevallen kost meer dan het geeft, en de lijst in de code kan de Builder bijwerken zodra de waarschuwing iets laat zien.
- **Alternatieven:** automatisch samenvoegen op een gelijke naam (fout bij twee spelers met dezelfde naam).
  Een lijst in het beheer (een scherm en een werkwijze voor enkele gevallen).
- **Later:** sinds 10 november 2026 voegt de import de personen uit `personTitleAliases` wel samen, ook als beide al bestaan; zie _De import voegt de personen samen die de projecteigenaar als één persoon aanwees_.
  Een lijst `personsWhoDiffer` noemt de namen die op elkaar lijken en twee mensen zijn; zie _Jordy Bruijn en Jordy Buijs zijn twee personen_.

## De import leest de naam van een persoon uit de sorteersleutel van zijn artikel

- **Datum:** 5 november 2026
- **Besluit:** de import leest de naam van een persoon uit hetzelfde verzoek waarmee hij de titel opvraagt (#715).
  Een nieuwe titel kost dus één verzoek, ook voor de naam.
  `lookUpTitles` bewaart de sorteersleutel van elk artikel dat het opvraagt, en `personNameOf` in `apps/importer/src/person-name.ts` maakt er de naam van.
  - **De sleutel past** als de achternaam in `{{DEFAULTSORT:Achternaam, Voornamen voorvoegsel}}` het eind van de titel is, zonder te letten op accenten, hoofdletters, punten en streepjes (`Anholt, Pele van` past op `Pelé van Anholt`, `St Juste, Jerry` op `Jerry St. Juste`, en `Basacikoglu` op `Başacıkoğlu`).
    De naam komt uit de titel, met accent, niet uit de sleutel.
    De kleine woorden vlak voor de achternaam, en die waarmee hij begint (`Van der Vaart`), zijn het voorvoegsel.
  - **De gok** geldt zonder sleutel of als de sleutel niet past: het laatste woord is de achternaam, de kleine woorden ervoor zijn het voorvoegsel, en een naam van één woord is een achternaam zonder voornaam.
    De kleine woorden zijn `al`, `bin`, `da`, `das`, `de`, `del`, `den`, `der`, `di`, `do`, `dos`, `du`, `el`, `ibn`, `la`, `le`, `te`, `ten`, `ter`, `van` en `von`.
  - **De lijst `personNames`** in `apps/importer/src/person-names.ts` zegt per titel de voornaam, het voorvoegsel en de achternaam.
    Die gaat voor alles, geeft `manual` en wordt nooit vervangen.
    Ze start leeg.
  - **Een persoon zonder naam**, uit de import van #714, krijgt zijn naam bij de eerstvolgende import van een seizoen met zijn titel: de import vraagt zijn artikel nog één keer op.
    Een tweede run schrijft niets en vraagt niets.
    Een persoon met een naam houdt hem, behalve dat een naam uit de lijst voorgaat.
  - **Het logboek** noemt per run hoeveel namen zijn bewaard, per bron, en schrijft een waarschuwing met `Persons:` vooraan voor elke gok, met de titel en de uitkomst.
    `pnpm run import:status` toont de aantallen per bron.
- **Waarom:** een naam uit een bron is beter dan een gok bij elk bezoek, en een gok die in het logboek staat kan met de lijst worden verbeterd.
  De sleutel staat in het artikel dat we toch al opvragen, dus de naam kost geen verzoek erbij voor een nieuwe titel.
- **Nadeel:** het eenmalig opvragen van het artikel van elke bestaande persoon kost ongeveer 680 verzoeken.
  Een artikel zonder pagina (een rode link) heeft nooit een sleutel, dus zijn naam is altijd een gok.
- **Alternatieven:** de naam bij het tonen raden (de huidige fout); Wikidata (de `robots.txt` weert ons); de sleutel laten gelden zonder te controleren of hij op de titel past (een foute sleutel geeft dan een foute naam zonder dat iemand het ziet).
- **Later:** zie _Wikidata is de bron voor de gegevens van een persoon_.
  Wikidata is bereikbaar voor het item van een persoon, maar de naam in delen blijft uit de sorteersleutel komen: het item heeft geen voornaam en achternaam in de vorm die we bewaren.
- **Later:** een naam die de redactie invulde (`redactie`) vervangt de import sinds 10 november 2026 nooit, ook niet met een naam uit de lijst; zie _Wat de redactie van een speler zette, schrijft de import niet over_.

## Een gestaakte wedstrijd met een officiële einduitslag is een uitzondering voor één wedstrijd

- **Datum:** 5 november 2026
- **Besluit:** de wedstrijd SC Cambuur – Go Ahead Eagles uit speelronde 11 van 2026/27, op de pagina met de score `4 – 0 (Gestaakt 82')`, telt met 4 – 0 bij de uitslagen van de competitie (#736).
  Dat geldt alleen zolang de pagina die tekst heeft en geen later blok voor dezelfde twee clubs onder dezelfde kop of onder `Inhaalronde 11`.
  Verandert de pagina, dan leest de reader hem zoals altijd, met de waarschuwing "has a score we do not know".
  De wedstrijd staat als gegevens in `officialStoppedResults` in `read-wikipedia.ts`, met een opmerking `ONE-OFF (#736)` die zegt dat latere sessies de uitzondering opnieuw moeten bekijken.
  De uitzondering raakt alleen `readLeagueResults`: een wedstrijd van sc Heerenveen met zo'n score blijft een fout die de wedstrijd noemt, en `classify-change.ts` krijgt geen regel.
- **Waarom:** de stand is hier officieel de einduitslag geworden, maar meestal wordt het restant alsnog gespeeld en leest de import dat al.
  Een algemene regel voor deze schrijfwijze zou ook die wedstrijden als afgerond tellen, terwijl we maar één voorbeeld hebben.
  Zonder de uitzondering bleef de uitslag weg en week de controle met de stand af voor SC Cambuur en Go Ahead Eagles.
  `classify-change.ts` oordeelt over wedstrijden van sc Heerenveen, en deze wedstrijd komt niet in `matches`.
- **Alternatieven:** een algemene regel voor `(Gestaakt <minuut>')` achter een stand (verworpen: één voorbeeld, en het restant komt meestal nog).
  De waarschuwing laten staan (verworpen: de controle met de stand blijft dan afwijken).
  Een regel onder de wedstrijd voor bezoekers (verworpen: de site toont wedstrijden van andere clubs niet een voor een).
  Een gestaakte wedstrijd altijd laten wachten op een redacteur (verworpen: er is hier niets om op te wachten).
- **Alleen deze schrijfwijze:** afgelast, uitgesteld, reglementair en forfait krijgen geen nieuwe regels.
  Een score die we niet kennen blijft zo een waarschuwing of een fout, en een gok is erger dan een melding.
  We hebben van die woorden ook geen voorbeeld van de pagina.

## Elke lezer van een eerder seizoen geeft een `SeasonSquad`, en de koppen staan in één lijst

- **Datum:** 5 november 2026
- **Besluit:** elke lezer van de selectie van een eerder seizoen geeft een `SeasonSquad` (`season-squad.ts`, #739), in een van drie vormen.
  `read` heeft de spelers, de bron uit `playerSources`, de optelsom van de wedstrijden en van de doelpunten die de pagina geeft, en waarschuwingen.
  `none` zegt met een reden dat de pagina of de tabel er voor dit seizoen niet is.
  `error` zegt dat de pagina van vorm is veranderd.
  Een speler heeft de naam, de pagina, de positie, het rugnummer, de wedstrijden en de doelpunten.
  Wat een pagina niet noemt, is leeg (`null`): een optelsom van een pagina zonder cijfers is leeg en geen nul, omdat nul een uitkomst is.
  Een speler zonder link heeft geen pagina, en een speler zonder rugnummer of cijfers houdt ze leeg.
  `readSeasonSquad` geeft de uitkomst van `readSquad` in deze vorm, met de bron `selectie` en de cijfers van de competities opgeteld.
  `readSquad` zelf verandert niet, zodat de import van het huidige seizoen dezelfde velden blijft lezen.
- **Koppen:** de groepskoppen met hun positie staan in één lijst, `squadGroups` in `read-squad.ts`.
  "Keepers" staat naast "Doelmannen", en de lezers van #740 en #741 voegen hun koppen daar toe.
  Een kop die er niet in staat blijft een fout, en een woord als `constructor` telt niet als kop.
- **Cel:** een attribuut zonder aanhalingstekens voor een cel (`align=left|[[Xavier Mous]]`) wordt zoals een attribuut met aanhalingstekens van de cel gehaald.
  Op de pagina van 2022/23 heet de competitie "Competitie" en niet "Eredivisie" en heeft elke competitie zes kolommen, dus de cijfers blijven daar weg met de waarschuwing die `readSquad` al gaf.
  De spelers worden wel gelezen.
- **Waarom:** de pagina's van 1990/91 tot en met 2025/26 komen uit zes soorten bron, en de opslag (#744) en de controle op volledigheid (#745) moeten niet per soort iets anders hoeven te doen.
  Eén vorm met drie uitkomsten dwingt elke lezer om te zeggen wat hij niet weet, in plaats van een nul of een gok te geven.
  Een pagina die we niet kennen is een fout en geen lege selectie, zodat de import bewaart wat hij heeft.
- **Alternatieven:** per bron een eigen vorm (verworpen: de opslag zou zes takken krijgen).
  Een nul voor een cijfer dat de pagina niet geeft (verworpen: de controle op volledigheid kan dan geen verschil maken tussen "niet gespeeld" en "niet genoemd").
  `readSquad` zelf de nieuwe vorm laten teruggeven (verworpen: de import van het huidige seizoen leest ook de zoekterm en de cijfers per competitie, en die horen niet bij elke bron).

## De tabellen Statistieken van 1990/91 tot en met 2005/06 hebben een eigen lezer, en een cijfer dat niet klopt blijft leeg

- **Datum:** 5 november 2026
- **Besluit:** `read-statistics.ts` (#740) leest de spelers die speelden van de pagina `Sc Heerenveen in het seizoen JJJJ/JJ` (zonder "(mannen)") in de vorm `SeasonSquad`, met de bron `statistieken`.
  De lezer kent twee vormen en neemt elke tabel in zijn geheel: een pagina in een andere vorm is een fout en schrijft niets.
  - 1990/91 tot en met 1999/00: onder de kop "Aantal wedstrijden/doelpunten" staat een tabel per competitie met een rang, een naam, de wedstrijden en de doelpunten.
    Een speler in meer dan één tabel is één speler, met de cijfers opgeteld.
    De rijen onder "Eigen doelpunt" tot de rij "Totaal" zijn spelers van andere clubs en blijven weg.
  - 2005/06: onder de kop "Statistieken" staat één tabel met een groepskop per positie, het rugnummer, de naam, de geboortedatum en de wedstrijden en doelpunten van elke competitie.
    De cijfers van de competities worden opgeteld.
  - De positie komt alleen uit de koppen van de tweede vorm.
    De koppen zijn de pagina's waar ze naar linken (`Doelverdediger`, `Verdediger`, `Middenvelder`, `Aanvaller`), en staan in `squadGroups` naast de koppen van #739.
    Een kop die er niet in staat blijft een fout.
  - Een speler zonder link blijft bewaard als de cel een volledige naam geeft: minstens twee woorden, zonder afkorting met een punt.
    Een achternaam met afkorting (`v. Amersfoort`) is een fout, omdat we de speler er niet aan kunnen herkennen.
  - Twee spellingen van dezelfde naam op één pagina (`Mitriță` en `Mitriţă` in 1998/99) zijn één speler: de namen zijn gelijk zonder accenten, zoals `nameKey` ze vergelijkt.
  - Een cijfer dat geen getal is (op de pagina van 1995/96 staat `` `3 ``, en een streepje telt niet als nul) blijft leeg met een waarschuwing die de speler noemt.
    De optelsom van wat die pagina geeft is dan ook leeg, want een som zonder één speler zegt iets onwaars.
  - Een pagina zonder de kop "Aantal wedstrijden/doelpunten" en zonder kop "Statistieken" met een tabel erin geeft `none`.
- **Waarom:** de pagina's tot en met 2005/06 hebben geen selectie, maar noemen wel wie speelde (22 tot 33 namen per seizoen), en #744 heeft die namen nodig.
  Een speler die er is en wiens cijfer niet klopt, is nog steeds een speler.
  Daarom blijft het cijfer leeg met een waarschuwing en blijft de speler, in plaats van de hele pagina af te wijzen om een tik van een vrijwilliger.
  Een afkorting of een tabel die we niet kennen is wel een fout, want dan weten we niet wie er bedoeld is.
- **Alternatieven:** een cijfer dat geen getal is overslaan met de rest van de rij (verworpen: dan ontbreekt een speler die speelde).
  Alle spelers van elke tabel in de uitkomst, ook de spelers onder "Eigen doelpunt" (verworpen: ze spelen voor een andere club).
  De cijfers van de competities apart bewaren (verworpen: `player_season_stats` heeft geen competitie voor deze seizoenen, zie #740).
  Een som van de bekende cijfers als één cijfer ontbreekt (verworpen: de som zou te laag zijn zonder dat iemand het ziet).

## De selecties van 2007/08 tot en met 2017/18 hebben een eigen lezer, en alleen de sectie Selectie telt

- **Datum:** 5 november 2026
- **Besluit:** `read-selection.ts` (#741) leest de sectie "Selectie" of "Voorlopige selectie" van de pagina `Sc Heerenveen in het seizoen JJJJ/JJ (mannen)` in de vorm `SeasonSquad`, met de bron `selectie`.
  Wedstrijden en doelpunten zijn leeg, want de pagina's geven ze niet.
  - Er zijn drie vormen: een lijst met een vlag, een naam en een contract (2007/08), een brede tabel met twee spelers op een regel (2008/09 en 2009/10) en een tabel met het rugnummer, de naam en de geboortedatum (2013/14 tot en met 2017/18).
  - Alleen de lijst of de tabel in de sectie telt, tot de volgende kop.
    Een link in de tekst eromheen, bij de transfers of in een latere sectie is geen speler.
  - De positie komt uit de koppen van de tabellen, uit `squadGroups`.
    Die lijst had de koppen van deze pagina's al (`Keepers`, `Verdedigers`, `Middenvelders`, `Aanvallers`); een andere kop is een fout.
    De lijst van 2007/08 heeft alleen koppen voor het contract, dus daar is de positie leeg.
  - In de brede tabel is de cel na een vlag de naam, met het rugnummer ervoor waar de pagina het geeft.
    De vorige club en het contract (een link naar een jaartal) zijn nooit een naam, want een vlag staat er niet voor.
    Een cel na een vlag die geen link of volle naam is, is een fout, zodat een speler niet ongemerkt wegvalt.
  - Het teken van de aanvoerder achter een naam (een link naar een bestand of `{{aanvoerder}}`) is geen deel van de naam.
  - Een naam zonder link blijft bewaard als hij minstens twee woorden heeft en geen afkorting met een punt (zoals bij #740).
    Een andere naam zonder link blijft weg, met een waarschuwing.
  - Een pagina zonder sectie Selectie geeft `none`, met de reden: 2010/11, 2011/12 en 2012/13 hebben geen tabel.
    Een sectie in een andere vorm is een fout en schrijft niets.
  - De tabellen met statistieken van 2008/09, 2016/17 en 2017/18 leest deze lezer niet: ze noemen alleen achternamen of zijn leeg.
  - De lezer geeft voor 2008/09 36 spelers en voor 2009/10 27, tegen 19 en 26 in het onderzoek.
    De pagina's geven die aantallen: de tabellen zijn met de hand geteld.
    De projecteigenaar koos op 6 november 2026 voor het getal van de pagina.
- **Waarom:** de selecties van deze elf seizoenen staan in drie vormen die geen van beide bestaande lezers kent, en #744 heeft de spelers nodig.
  Een speler die ongemerkt wegvalt, maakt de selectie onvolledig zonder dat iemand het ziet.
  Daarom is een cel die we niet kennen een fout, en niet een rij die we overslaan.
- **Alternatieven:** de brede tabel lezen als losse cellen op volgorde (verworpen: de regels hebben een wisselend aantal cellen, soms met lege cellen ertussen, dus de plaats zegt niets).
  Elke link in de sectie als speler nemen (verworpen: de vorige club en het contract zijn ook links).
  Een eigen lijst met koppen voor deze pagina's (verworpen: `squadGroups` heeft ze al).

## De transfers van 2006/07 tot en met 2017/18 hebben een eigen lezer, en een vertrokken speler telt alleen mee als hij het seizoen meemaakte

- **Datum:** 6 november 2026
- **Besluit:** `read-transfers.ts` (#742) leest de lijsten onder "Transfers" of "Mutaties" van de pagina `Sc Heerenveen in het seizoen JJJJ/JJ` in de vorm `SeasonSquad`, met de bron `transfers`.
  `readSeasonScorers` leest in hetzelfde bestand de lijst onder "Doelpuntenmakers" van 2006/07, met de bron `doelpunten`.
  Het zijn twee lezers met elk één bron, omdat `SeasonSquad` één bron per uitkomst heeft; #744 voegt ze samen.
  - Wie meetelt: een speler die in de zomer of de winter is aangetrokken, een speler die is verhuurd of terugkeert van verhuur, en een speler die in de winter is vertrokken.
    Een speler die in de zomer vóór het seizoen vertrok, telt niet mee, behalve als zijn regel met "Verhuurd" begint.
    Scheidt de pagina de zomer en de winter niet bij de vertrokken spelers (2007/08, 2008/09 en 2009/10), dan telt geen vertrokken speler mee.
  - Het venster komt uit een kop Zomer of Winter, uit een vetgedrukt Zomer of Winter boven een tabel, of uit een rij "Winterstop" in de tabel.
    Een kop van een lijst zet het venster terug als hij niet onder de kop van het venster hangt.
  - De lijst van aangetrokken spelers voor volgend seizoen (2008/09) en de technische staf blijven weg: ze horen niet bij het seizoen en niet bij de spelers.
  - Een speler in meer dan één lijst is één speler, op zijn pagina en anders op zijn naam zonder accenten.
  - Een kop, onderschrift of kolomkop die de lezer niet kent is een fout en schrijft niets.
    Een pagina zonder de kop, of zonder tabel onder de kop, geeft `none`.
  - Een naam zonder link blijft bewaard als hij minstens twee woorden heeft en geen afkorting met een punt, zoals bij de tabellen Statistieken (#740).
- **Waarom:** voor 2006/07 en 2010/11 tot en met 2012/13 is de lijst met transfers de enige bron met namen, en in de andere seizoenen vult ze de selectie aan (#738).
  Een speler die ontbreekt is een gat dat de volledigheid laag houdt; een speler die er ten onrechte bij staat is een fout die we niet terugzien.
  Daarom telt een speler die in de zomer vertrok niet mee, en een vertrokken speler zonder bekend venster ook niet.
  Het onderzoek telde alle namen uit de lijsten (28, 33, 46, 29, 42, 28, 35, 31, 37, 25, 21 en 33, met de technische staf en de spelers van volgend seizoen): dat geeft te veel spelers.
- **Alternatieven:** alle namen uit de lijst tellen (verworpen, zie hierboven).
  Eén lezer die de transfers en de doelpuntenmakers van 2006/07 samen teruggeeft (verworpen: `SeasonSquad` heeft één bron, en de beste bron per speler kiest #744).
  Een vertrokken speler zonder bekend venster toch tellen (verworpen: dan staat een speler die in de zomer vertrok in het seizoen).

## De Engelse Wikipedia is een bron voor de selectie van vijf seizoenen zonder Nederlandse pagina

- **Datum:** 5 november 2026
- **Besluit:** voor 2018/19 tot en met 2021/22 en 2024/25 lezen we de selectie van de Engelse Wikipedia, met dezelfde fetcher en regels als bij de Europa League-wedstrijden van 2012/13.
  De spelers krijgen geen Nederlandse pagina en geen persoon.
  `read-english-squad.ts` (#743) leest de pagina `JJJJ–JJ SC Heerenveen season` in de vorm `SeasonSquad`, met de bron `engels`.
  - Het verzoek is `https://en.wikipedia.org/wiki/<titel>?action=raw`, met dezelfde fetcher, dezelfde controle op `robots.txt` en `englishWikipediaOrigin`.
    De titels staan per seizoen in `englishSquadPage`; een ander seizoen vraagt niets aan de Engelse Wikipedia.
  - De lijst `{{Fs player}}` onder "First-team squad" en "Out on loan" is de selectie.
    De tabellen "In" en "Out" onder "Transfers" of "Player Transfers" vullen haar aan met dezelfde regel als `read-transfers.ts`: aangetrokken, verhuurd en in de winter vertrokken.
    Wie in de zomer vertrok, telt niet mee.
  - Een speler krijgt een naam en geen `wikipedia_page`.
    Een speler op beide lijsten is één speler op zijn naam zonder accenten (`Milovanovic` en `Milovanović`).
  - Een sjabloon, positie of rugnummer dat de lezer niet kent, en een tabel zonder kolom Player, is een fout.
    Een pagina zonder selectie en zonder transfers geeft `none`.
  - De lezer geeft 32, 13, 31, 30 en 30 spelers voor 2018/19, 2019/20, 2020/21, 2021/22 en 2024/25, tegen 31, 21, 28, 29 en 34 in het onderzoek.
    De selecties zijn met de hand geteld (32, 31, 31 en 30 sjablonen; de speler die twee keer voorkomt telt één keer).
    2019/20 heeft alleen transfers, en de onderzoekscijfers tellen ook wie in de zomer vertrok.
  - 2019/20 heeft geen selectie, alleen transfers: de lezer geeft daar `read` met 13 spelers, een gedeeltelijke selectie.
    De projecteigenaar koos op 6 november 2026 om dat zo te laten, en niet `none` te geven.
    De volledigheid van dat seizoen blijft laag (#745).
- **Waarom:** de projecteigenaar gaf op 5 november 2026 toestemming, voor selecties alleen waar de Nederlandse pagina ontbreekt.
  De licentie is dezelfde (CC BY-SA 4.0).
  Een speler heeft binnen een seizoen één bron, dus geen dubbele namen met twee titels.
- **Alternatieven:** alleen de Nederlandse Wikipedia (vijf seizoenen zonder spelers).
  De Engelse pagina ook waar de Nederlandse bestaat (twee titels per speler, en alleen Wikidata voegt ze samen).

## De selectie van eerdere seizoenen komt in een eerste versie met gaten, en een tweede lezing haalt niemand weg

- **Datum:** 5 november 2026
- **Besluit:** `import:squad` en `import:squads` lezen de selectie van afgelopen seizoenen eenmalig, uit wat de Nederlandse Wikipedia heeft (#744).
  Een seizoen zonder pagina krijgt geen rijen en een regel in het logboek.
  Een seizoen met een deel van de selectie wordt bewaard met de bron van elke rij.
  Een tweede lezing voegt toe en haalt niemand weg.
- **Waarom:** de projecteigenaar liet gaten toe op 5 november 2026.
  Een gat is beter dan een gok, en een afgelopen seizoen verandert niet meer.
  De volledigheid per seizoen (#745) zegt hoeveel we weten.
  Een speler weghalen die in een eerdere lezing stond, breekt de verwijzingen van de doelpunten.
- **Gevolg:** zo werken de opdrachten (6 november 2026):
  - `squadSources` in `squad-sources.ts` zegt per seizoen welke pagina's en lezers erbij horen.
    1990/91 tot en met 1999/00 en 2005/06 hebben de tabel Statistieken, 2006/07 de transfers en de doelpuntenmakers, 2007/08 tot en met 2017/18 de selectie en de transfers, 2022/23 en 2023/24 de tabel `readSquad`, en 2018/19 tot en met 2021/22 en 2024/25 de Engelse pagina.
    2000/01 tot en met 2004/05 en 2025/26 hebben geen lezers.
  - Een seizoen zonder lezers, een pagina die niet bestaat (404) en een pagina zonder tabel (`none`) zijn een gat: één regel `Squad 2002/03: no squad page on Wikipedia, so no squad`, niets geschreven en exitcode 0.
  - Een pagina die een fout geeft, een lezer die een fout meldt of een verzoek dat mislukt laat het hele seizoen ongemoeid.
    Dan staat er een fout in `squad_imports` en eindigt de opdracht met 1, maar `import:squads` gaat door met het volgende seizoen.
    Een seizoen half opslaan door een lezer die faalt, zou een gat als een gevulde selectie laten lijken.
  - De spelers van de lezers van een seizoen worden samengevoegd per persoon: dezelfde pagina, en anders dezelfde naam zonder accenten en hoofdletters.
    Twee spelers met verschillende pagina's zijn twee personen.
    De rij krijgt de beste bron uit `playerSources` van de lijsten die de speler hebben, en de positie en het rugnummer van de beste lijst die ze geeft.
    De wedstrijden en doelpunten uit de tabellen gaan niet naar `player_season_stats`: de lezers tellen alle competities op, en die tabel heeft een rij per competitie.
  - Elke pagina van een speler gaat langs `lookUpPersonPages` (#714): een nieuwe titel kost één verzoek, een bekende niets, en een mislukt verzoek is een waarschuwing en laat `person_id` leeg tot de volgende lezing.
  - Een tweede lezing voegt nieuwe spelers toe en verbetert een rij: een betere bron (met de positie en het rugnummer van die bron), een ontbrekende positie of rugnummer, een ontbrekende pagina of persoon.
    Ze verlaagt nooit een bron, positie of rugnummer en schrijft niets in `players` als er niets nieuw is.
    `wikipedia_pages` (`kind` `squad`) en `squad_imports` noteren wel dat de pagina is gelezen.
  - `squad_imports` heeft een rij per gelezen seizoen, zoals `match_imports` bij een eerder seizoen: de status en de waarschuwingen tellen alleen het lopende seizoen.
    Een gat krijgt geen rij.
  - Op de host zijn het de opties `--squad` en `--from-squad` van `import.mjs`.
    De workflow `import-squads.yml` start `--from-squad` op acceptatie, met dezelfde concurrency-groep als de andere imports.
- **Alternatieven:** alleen seizoenen met een volledige tabel importeren (minder dan een derde van de seizoenen).
  De selectie bij elke lezing vervangen, zoals de verzonnen selectie (de `id`'s veranderen en de doelpunten raken hun speler kwijt).
  Een seizoen met een falende lezer toch half opslaan (verworpen: zie hierboven).
- **Later:** dit vervangt het uitgangspunt van _Een eerder seizoen wordt eenmalig geïmporteerd met een opdracht, zonder selectie_ dat een eerder seizoen geen selectie heeft.
- **Later:** zie _Het seizoen dat net voorbij is, wordt tot 1 september nog elke week gelezen_ (9 november 2026): de uurlijkse import leest de selectie van het seizoen dat net voorbij is in juli en augustus zelf, één keer per week, met de lezer van het lopende seizoen en niet met deze opdrachten.
- **Later:** een tweede lezing verbetert sinds 10 november 2026 geen veld dat de redactie zette, en geen lijst is beter dan de bron `redactie`; zie _Wat de redactie van een speler zette, schrijft de import niet over_.

## De volledigheid van een selectie is een kans die rust op de bron, met een plafond per bron

- **Datum:** 5 november 2026
- **Besluit:** de kans dat een lijst de hele selectie van een seizoen bevat, begint bij de beste bron van het seizoen en wordt begrensd door wat die bron kan weten (een tabel van wie speelde kent de bank niet).
  Controles met de doelpuntenmakers, het aantal spelers en de optelsom van de wedstrijden verlagen de kans als ze uitvallen.
  Een controle die niet kan draaien, verandert niets.
  De getallen komen uit een meting op de seizoenen met een volledige tabel (`docs/volledigheid-selectie.md`, #745).
  - `squadCompleteness` in `squad-completeness.ts` is een functie zonder database en zonder verzoek.
    Het plafond per bron is 95 voor `selectie`, 70 voor `engels`, 60 voor `statistieken`, 50 voor `wikidata`, 40 voor `transfers` en 30 voor `doelpunten`.
  - De grenzen van de grootte komen uit de meting: de tien seizoenen hebben 22 tot 36 spelers, dus minder dan 20 is verdacht (hoogstens 45) en minder dan 15 bijna zeker onvolledig (hoogstens 20).
  - `doelpunten` kreeg 30 en niet het getal van `transfers`, omdat de tabellen laten zien dat wie scoorde 42% tot 52% van de selectie is.
- **Waarom:** de projecteigenaar wilde per seizoen een kans, op 5 november 2026.
  De bron zegt het meest over wat ontbreekt, en een plafond voorkomt dat meer controles ooit meer beloven dan de bron weet.
- **Alternatieven:** een percentage van het aantal spelers tegenover een vast getal (zegt niets over wie ontbreekt).
  De kans uitrekenen met twee bronnen tegelijk, vangst en terugvangst (zwaar voor de eerste versie en onbetrouwbaar met twee bronnen die niet los van elkaar zijn).

## De importer berekent de volledigheid en bewaart hem, de site rekent niet

- **Datum:** 5 november 2026
- **Besluit:** de kans staat per seizoen in de tabel `squad_completeness` (#746), berekend door de importer aan het eind van een lezing van de selectie en op verzoek zonder verzoeken aan Wikipedia (`pnpm run import:completeness`).
  De site leest alleen.
  - De uurlijkse import zet de kans van het lopende seizoen erin, in dezelfde run na de wedstrijden.
    `import:squad` en `import:squads` doen dat voor een afgelopen seizoen.
  - De som van de wedstrijden en de doelpunten van de tabel gaat mee, want ze is alleen bekend terwijl de pagina wordt gelezen.
    Bij meer lijsten telt de beste die een som geeft.
  - Een seizoen zonder spelers heeft geen rij.
    Een tweede berekening zonder nieuwe gegevens schrijft niets.
  - `import:status` toont het lopende seizoen en waarschuwt als de bron `selectie` is en de kans onder `bijna` valt.
- **Waarom:** de regel staat op één plek met tests, het getal is overal gelijk, en het is te loggen en te controleren.
  De som van de tabel is alleen bekend tijdens het lezen, dus de uitkomst en dat bewijs worden samen bewaard.
- **Alternatieven:** rekenen op de pagina (de regel zit dan in de site, de bronnen en de doelpunten moeten bij elk verzoek mee, en de som is dan weg).
- **Later:** een seizoen met alleen spelers uit de verslagen (`verslag`) heeft sinds 9 november 2026 ook een rij, ook al leest geen lijst een selectie; zie _De importer bewaart ook de volledigheid van een seizoen met alleen spelers uit verslagen_ (#935).
- **Later:** zie _De rij van de volledigheid staat ook voor een seizoen zonder selectiepagina_ (10 november 2026): de code staat in `packages/db`, en Beheer rekent de rij uit na een wijziging van een speler.

## De controle op de doelpuntenmakers valt terug op de naam

- **Datum:** 6 november 2026
- **Besluit:** een doelpuntenmaker telt als gevonden als zijn persoon in de lijst staat of als zijn naam (`nameKey`, zonder accenten en hoofdletters) erin staat (#763).
  De controle geeft zo nooit minder dan voorheen.
- **Waarom:** de spelers van de Engelse Wikipedia hebben geen `person_id` (#743), terwijl de doelpunten van de Nederlandse wedstrijdpagina's er wel een hebben.
  Zo telde elke doelpuntenmaker als gemist, en kregen 2018/19, 2019/20, 2020/21, 2021/22 en 2024/25 de kans 5% bij 30 tot 32 spelers.
  Een Engelse selectie wordt nu hoogstens `bijna`, het plafond van 70.
- **Alternatieven:** de personen van de Engelse spelers opzoeken (verworpen: #743 koos bewust voor spelers zonder pagina).
  Het plafond van `engels` verhogen (een ander besluit, niet dit probleem).
- **Later:** dit vervangt een regel van _De volledigheid van een selectie is een kans die rust op de bron, met een plafond per bron_ (#745), zoals `docs/volledigheid-selectie.md` hem noemde: de naam gold alleen voor een doelpuntenmaker zonder persoon.

## Een kop onthoudt welke clubs hij noemt, in een eigen tabel

- **Datum:** 6 november 2026
- **Besluit:** de importer bewaart per kop de profclubs die hij noemt, in `item_clubs`, naast `relevance` (#794).
  De pagina van een club gebruikt dat voor de kaart "Nieuws over <club>" (#777).
  - **De regels:** `clubsNamed` in `apps/importer/src/relevance.ts` volgt `judgeRelevance`: hele woorden, hoofdletters, accenten en "s.c." tellen niet, "Asc" is geen "sc" en een lange naam gaat voor een korte.
    Een naam in een andere naam telt niet: `lookalikeClubs` heeft "Excelsior Maassluis", en `namesakeClubs` heeft "Sparta Praag".
    sc Heerenveen zelf staat er niet in.
  - **De naam:** de club staat erin zoals `matches.opponent` hem heeft, uit `otherClubFullNames` in `relevance-terms.ts` ("N.E.C.", "Excelsior Rotterdam").
    De pagina's van de site vinden de club met `clubs.name` en `club_names`.
  - **Wanneer:** bij elke kop die de importer bewaart of bijwerkt, ook bij een feed met het filter `none` en buiten de dagen rond een wedstrijd.
    Een nieuwe titel geeft nieuwe rijen, en een kop die verdwijnt neemt zijn rijen mee.
  - **Bestaande koppen:** het commando `import:item-clubs` (op de host `import.mjs --item-clubs`) loopt over alle koppen in de database, zonder verzoek aan een bron.
- **Waarom:** zoeken in de titel bij elke paginalading is traag en onnauwkeurig, en de importer heeft de lijst en de regels al.
  Een eigen tabel laat een kop meer clubs noemen, wat een kolom in `items` niet kan.
  De uurlijkse import raakt alleen wat nog in een feed staat, dus voor de oudere koppen is een commando nodig, zoals bij `import:completeness`.
- **Alternatieven:** een kolom `club` in `items` (maar één club per kop).
  Zoeken in de titel bij het tonen (geen wijziging in de importer, maar dubbele regels in de site en trager).
  De clubs alleen bewaren voor koppen in de dagen rond een wedstrijd (mist het nieuws buiten die dagen).
  De migratie zelf de rijen laten maken (de regels staan in TypeScript, en een tweede kopie in SQL loopt uit de pas).
- **Later:** `relevance-terms.ts` heeft nu ook de namen waarmee de rijen worden bewaard.
  _De regels van het filter_ en _Koppen over de tegenstander_ blijven gelden voor `relevance`.

## De feiten van de oude fansite gaan via een bestand in de repository

- **Datum:** 7 november 2026
- **Besluit:** een script leest de lokale kopie van de oude database en schrijft JSON naar `apps/importer/data/oude-fansite/` (#875).
  De import van de oude wedstrijden leest dat bestand en raakt de oude database nooit.
- **Waarom:** de productie kan de oude database niet bereiken, en de gegevens veranderen niet meer.
  Een bestand in de repository is te testen en te reviewen en is er voor elke omgeving.
- **Alternatieven:** de import verbinden met de oude database (kan niet op de host).
  De dump in de repository zetten (38 MB met persoonsgegevens van leden en e-mail, en ook de teksten van de oude site).

## Uit de oude fansite gaan alleen wedstrijdfeiten mee

- **Datum:** 7 november 2026
- **Besluit:** het bestand bevat wedstrijden, uitslagen, doelpunten, kaarten, opstellingen met minuten, scheidsrechter, toeschouwers, de cijfers over hoekschoppen, buitenspel en overtredingen, de tegenstanders en de namen van onze spelers.
  Het bevat geen verslagen of voorbeschouwingen (`wedstrijd_vsg` en `wedstrijd_vbg` op twee kolommen na), geen gegevens van leden, e-mail of de nieuwsbrief, en van een speler alleen zijn naam en code (geen geboortedatum, biografie, contract of foto).
  Dit is een besluit van de projecteigenaar.
- **Waarom:** de gegevens zijn van de projecteigenaar, wat de vraag naar de rechten van #414 voor wedstrijdgegevens oplost.
  Teksten uit kranten en gegevens van personen horen er niet in.
- **Alternatieven:** ook de teksten overnemen (de rechten van de krantenteksten zijn onduidelijk).

## De oefenwedstrijden van de oude fansite gaan naar een Markdown-bestand

- **Datum:** 7 november 2026
- **Besluit:** het script schrijft `docs/oefenwedstrijden-2002-03.md`, een tabel met datum, tegenstander, thuis of uit, uitslag, de plaats uit de opmerking (zoals "op Terschelling") en de doelpuntenmakers van sc Heerenveen.
  Spelers van de tegenstander (amateurclubs) staan er niet in.
  Deze negen wedstrijden staan niet in de database.
- **Waarom:** de projecteigenaar wil ze bewaren, maar ze horen niet bij de competities: ze zijn tegen amateurclubs en buitenlandse clubs.
  Een tabel in de documentatie is genoeg.
- **Alternatieven:** een competitie `Oefenwedstrijd` in de database (dan tonen alle lijsten ze).

## De bestanden van de oude fansite zijn strikt en per seizoen

- **Datum:** 8 november 2026
- **Besluit:** het script schrijft `clubs.json`, `players.json` en een bestand per seizoen, `matches-<seizoen>.json`, met een versienummer.
  De namen van de velden zijn Engels en leggen niets uit.
  `readOldSiteFile` en `readOldSiteData` in `apps/importer/src/old-site-file.ts` lezen ze met strikte schema's van zod, die een onbekend veld weigeren.
  Een test controleert de namen van alle velden in de bestanden tegen een lijst met toegestane namen (#875).
  Het bestand staat in `.prettierignore`: het script schrijft de opmaak, dus de commit-hook maakt geen andere bytes.
- **Waarom:** een bestand per seizoen houdt een wijziging in een review klein.
  Een veld dat niet in het schema staat, zoals een geboortedatum, kan er niet in komen zonder dat de lezer en de test falen.
  Een versienummer laat de import een bestand in een nieuwe vorm weigeren in plaats van fout lezen.
- **Alternatieven:** één bestand met alle wedstrijden (ongeveer 2 MB aan één diff).
  Een JSON-schema in een eigen bestand (nog een bestand om bij te houden naast de types).

## De import van de oude fansite is één opdracht met stappen in vaste volgorde

- **Datum:** 7 november 2026
- **Besluit:** `import.mjs --old-site` (`pnpm import:old-site`) leest de bestanden van #875 en draait de stappen één voor één: clubs, wedstrijden, doelpunten en spelers, opstellingen en kaarten.
  Elke stap schrijft alleen wat verschilt en meldt hoeveel rijen hij maakte, wijzigde, ongewijzigd liet of oversloeg.
  Een tweede run verandert niets.
  De opdracht staat in `apps/importer/src/import-old-site.ts`; een stap is een regel in de lijst `oldSiteSteps`.
  Nu bestaan de stappen `clubs` en `matches` (#877).
  **Later:** zie _De stap `matches` leidt ronde, verlenging, strafschoppen en aftrap af uit het bestand_ hieronder (8 november 2026).
- **Waarom:** de volgorde is nodig, want een doelpunt hangt aan een wedstrijd.
  Een Builder kan een stap toevoegen zonder de rest aan te raken.
- **Alternatieven:** een opdracht per stap; dan moet de eigenaar de volgorde onthouden.

## Een run van de oude fansite laat zien wat hij zou doen, en stopt bij de eerste stap die faalt

- **Datum:** 8 november 2026
- **Besluit:** de opdracht controleert de bestanden voordat hij verbinding maakt, en neemt de lock van de import voor de hele run.
  Elke stap draait in een transactie van zichzelf: een stap die klaar is, blijft staan, en een stap die faalt laat niets achter.
  De run stopt bij de eerste stap die faalt, want de stappen erna bouwen erop.
  Met `--dry-run` delen alle stappen één transactie die aan het eind wordt teruggedraaid.
  De getallen zijn dan wat een echte run zou schrijven, ook voor een stap die leest wat de stap ervoor schreef.
  De opdracht schrijft één regel per stap met de getallen, en eronder een regel voor elke nieuwe club, gekoppelde club of overgeslagen rij.
- **Waarom:** het bestand van #875 komt uit een script en kan in de toekomst een andere vorm krijgen; dan mag er niets half geschreven zijn.
  Een dry run die echt de stappen draait, liegt niet over wat de volgende stap vindt.
- **Alternatieven:** een dry run die alleen telt zonder te schrijven (hij kan de afhankelijkheid tussen de stappen niet laten zien).
  Eén transactie voor de hele run (hij houdt rijen vast zolang de stappen langer worden).

## De bestanden van de oude fansite staan naast `import.mjs` op de host, niet erin

- **Datum:** 8 november 2026
- **Besluit:** `pnpm --filter site assemble` kopieert `apps/importer/data/oude-fansite/` naar dezelfde plaats in de map voor de host.
  De opdracht zoekt de bestanden eerst naast `import.mjs` (`data/oude-fansite`) en anders in de repository (`defaultOldSiteFolder`).
  De bestanden zitten niet in de bundel.
- **Waarom:** cron start `import.mjs` elk kwartier en leest de bestanden nooit; twee megabyte in de bundel kost elke run tijd om te laden.
  De host kan de oude database niet bereiken, en een bestand in de deploy hoeft niemand los neer te zetten.
- **Alternatieven:** de bestanden in de bundel laden met een JSON-loader van esbuild (de bundel wordt dertig keer zo groot).
  De bestanden uit GitHub halen op het moment van de import (een verzoek naar een derde partij).

## Een club van de oude fansite krijgt een naam en een adres, nog geen Wikipedia-pagina

- **Datum:** 7 november 2026
- **Besluit:** een tegenstander van de oude fansite wordt eerst gezocht in `clubs`, `club_names` en `club_pages` (de naam zonder hoofdletters, spaties en leestekens), dan in een lijst van de Builder voor clubs die anders heten (`N.E.C.` en `NEC`), en wordt anders aangemaakt met een adres uit de naam en zonder `wikipedia_page`.
  De naam van de oude fansite gaat in `club_names` als hij afwijkt.
  De lijst is `oldSiteClubNames` in `apps/importer/src/old-site-clubs.ts`, op de clubcode van het bestand en niet op de naam, en een club in de lijst van volledige namen (`club-names.ts`) staat er niet in.
  Een club van de lijst die er nog niet is, wordt aangemaakt onder de naam van de lijst, met de naam van de oude fansite als andere naam.
  Een club die samengevoegd of verhuisd is (zoals `Dordrecht '90` en `SVV`, die samen FC Dordrecht werden) is een club van zichzelf, tot een besluit anders zegt.
  Botst het adres, dan wint de bestaande club en krijgt de nieuwe een nummer erachter (`ajax-2`).
- **Waarom:** een club hoort één rij te zijn, ook als Wikipedia hem later vindt: de import van Wikipedia geeft een club zonder pagina de pagina zodra een wedstrijd hem noemt (`createClubBook`).
  Een rij zonder pagina is toegestaan, want `wikipedia_page` mag leeg zijn.
  Een lijst op de code laat een wijziging in een naam in het bestand geen club naar een andere wijzen.
- **Alternatieven:** elke club meteen bij Wikipedia opzoeken (de importer vraagt dan voor ongeveer 90 clubs om een pagina, buiten wat de Wikipedia-import al doet).
  De lijst van volledige namen gebruiken voor alle schrijfwijzen (die lijst werkt op de naam, en geldt ook voor de import van Wikipedia).

## De stap `matches` leidt ronde, verlenging, strafschoppen en aftrap af uit het bestand

- **Datum:** 7 november 2026, aangevuld op 8 november 2026
- **Besluit:** de stap `matches` van `import:old-site` (#877) maakt van elke wedstrijd in de bestanden een rij in `matches` met de bron `oude-fansite`, en volgt daarbij deze regels.
  - **De ronde heet `Speelronde N` in volgorde van datum, en anders `Wedstrijd N`.**
    De oude rondenummers kloppen niet: 2000/01 heeft de rondes 7 tot en met 10 twee keer, 1992/93 mist 3, de beker heeft nul als ronde en in 1991/92 staat overal 0.
    Een seizoen van de Eredivisie of de Eerste divisie met precies 34 wedstrijden krijgt `Speelronde 1` tot en met `Speelronde 34`.
    Alle andere wedstrijden krijgen `Wedstrijd N` in volgorde van datum binnen het seizoen en de competitie.
    Waarom: de sleutel (seizoen, competitie, ronde) moet uniek zijn, en een verzonnen "Achtste finale" is erger dan een neutraal nummer.
    Een uitgestelde wedstrijd kan een ander nummer krijgen dan de officiële speelronde; het controleverslag (#880) laat de verschillen met het oude nummer zien.
    Alternatief: de oude nummers houden (botsen, en een nul is geen ronde).
  - **Verlenging en strafschoppen komen uit `wedstrijd_res.opmerking` en de minuten van de doelpunten.**
    Een lege opmerking of `*` is niets (de `*` van 1990/91 betekent "rust niet bekend").
    `n.v.` betekent dat er verlengd is en dat `et` en `eu` de stand na verlenging zijn.
    `X-Y n.v.` betekent dat er verlengd is, dat `et` en `eu` de stand na 90 minuten zijn en dat `X-Y` de stand na verlenging is, in dezelfde volgorde (thuis-uit).
    `X-Y n.s.` betekent dat het na verlenging gelijk stond (`et` en `eu`) en dat `X-Y` de strafschoppenserie is (thuis-uit).
    Bij alleen `n.v.` is de stand na 90 minuten leeg, behalve als de doelpunten hem bewijzen: de lijst heeft evenveel doelpunten voor elke kant als de eindstand, alle doelpunten hebben een minuut en geen is een eigen doelpunt (het bestand zegt niet voor wie die tellen).
    De stand na 90 minuten is dan het aantal doelpunten tot en met minuut 90.
    Bij `n.s.` blijft de stand na 90 minuten leeg.
    Een opmerking bij een competitiewedstrijd, een opmerking die we niet kennen, een `X-Y n.v.` die lager is dan de stand na 90 minuten en een `n.s.` bij een ongelijke stand worden niet gebruikt en staan als regel in het logboek, zodat de database ze niet hoeft af te wijzen.
    Waarom: dit klopt met de doelpunten van de wedstrijden waar het te controleren is (TOP Oss 1996/97: 2-2 na 90 minuten en een doelpunt in minuut 95; Varteks 1998/99: 2-1 na 90 minuten en drie doelpunten in de verlenging; PSV 1992/93).
    Alternatief: alle uitslagen als 90-minutenstand lezen (verkeerde eindstand in acht wedstrijden).
  - **De aftrap is Amsterdamse tijd, en 00:00 betekent onbekend.**
    `dt` uit de oude database wordt `match_date` (de lokale dag) en `kickoff_at` (in UTC, met `amsterdamToUtc` van de import van Wikipedia).
    Bij `00:00` blijft `kickoff_at` leeg en is de wedstrijd een datum zonder tijd (#873).
  - **`note` krijgt alleen opmerkingen die een bezoeker kan gebruiken.**
    De opmerkingen van de oude redactie zijn voor het grootste deel werkaantekeningen: `Datum klopt niet`, `naar zondag als Uefa Cup`, `was 14/9`, `onder voorbehoud`, `Datum is een gokje`, twee verwijzingen naar een website van toen en de `*` van 27 wedstrijden (die in de uitslag, niet in `note`).
    Een lijst in de code (`publicNotes`) laat precies vier opmerkingen door, met een hoofdletter erbij: `Debuut in Eredivisie`, `Kwartfinale`, `Begon later door file` en `28 januari afgelast wegens sneeuw`.
    Al het andere, ook `Play-off` (de competitie zegt het al) en elke link, wordt niet gekopieerd en telt de stap in één regel van het logboek.
    Een nieuwe opmerking in een toekomstig bestand komt dus nooit zomaar in een openbare kolom.
  - **De bron en de redactie gaan voor.**
    De stap schrijft, wijzigt en telt alleen rijen met de bron `oude-fansite`.
    Een rij met dezelfde sleutel en de bron `wikipedia` blijft zoals hij is, en de stap meldt dat.
    **Later:** zie _Een import zoekt een wedstrijd eerst op datum en club_ (9 november 2026): een wedstrijd van een andere bron wordt gevonden op datum en club, en de stap vult er alleen lege velden van.
    De aftrap en de uitslag die de redactie invulde (`match_edits`: `kickoff_edited`, `result_edited`) blijven zoals ze zijn; de andere kolommen volgen het bestand.
    De stap verwijdert nooit een rij, en een rij die niet meer in het bestand staat, wordt gemeld.
    Een tweede run verandert niets: de stap schrijft alleen wat verschilt.
  - **`result_set_at` blijft leeg en `stadium` ook.**
    Het eerste is voor de controle op een correctie van Wikipedia; een oude wedstrijd verandert niet meer.
    Het stadion van een wedstrijd staat niet in de bestanden.
  - **Een waarde die de checks van de database niet toelaten, wordt niet gekopieerd en gemeld.**
    Dat zijn een scheidsrechter van meer dan 100 tekens en meer dan 150.000 toeschouwers.
    Toeschouwers `0` en een lege scheidsrechter zijn "onbekend" en worden leeg.
- **Waarom:** de oude gegevens zijn een bron met gaten en aantekeningen van redacteuren; de stap kopieert wat een bezoeker mag lezen, en meldt de rest.
- **Alternatieven:** de opmerkingen van de oude redactie tonen zoals ze zijn (interne aantekeningen en twee links naar sites die niet meer bestaan in een openbare kolom); `note` geheel leeg laten (we verliezen drie feiten, zoals het debuut in de Eredivisie); de stand na 90 minuten ook bij `n.s.` uit de doelpunten halen (de beslissing noemt het alleen bij `n.v.`).

## De stappen `spelers` en `doelpunten` slaan een lijst doelpunten alleen op als ze optellen tot de uitslag

- **Datum:** 7 november 2026
- **Besluit:** `import:old-site` krijgt na `clubs` en `matches` de stappen `spelers` en `doelpunten` (#878).
  `spelers` maakt de rijen in `players` (zie _Een oude speler is een rij in `players`, nog zonder persoon_ in `hosting-en-data.md`).
  `doelpunten` maakt de rijen in `match_goals`.
  - **Alleen als het optelt.**
    Een wedstrijd krijgt zijn doelpunten alleen als het aantal voor sc Heerenveen en tegen optelt tot `goals_for` en `goals_against`.
    Dat zijn de eindstand met verlenging en zonder strafschoppenserie, eigen doelpunten bij de club die ervan profiteert.
    Anders krijgt de wedstrijd er geen, en heeft hij er een uit een eerdere run, dan gaan die weg.
    In de bestanden zijn dat 65 wedstrijden met een uitslag en zonder doelpunten (vooral 1990 tot 1993) en 2 met een deel van de doelpunten; 79 wedstrijden eindigden in 0-0 en hebben een lege lijst die klopt en 525 hebben doelpunten.
    De stap meldt het aantal in een regel en elke wedstrijd zonder lijst in een eigen regel, voor het controleverslag (#880).
  - **Het team.** `ours` is het team dat het doelpunt krijgt.
    Een eigen doelpunt van een speler van ons telt voor de tegenstander, en andersom (`own_goal` waar).
    `player` is de volledige naam, en `player_id` is de speler van ons die scoorde, ook bij een eigen doelpunt van hem.
    Een speler van de tegenstander heeft geen `player_id`.
  - **De soort.** `penalty` is waar bij `strafschop`, `srafschop` en `penalty`.
    De andere soorten (kopbal, schot) worden niet bewaard.
  - **De minuut.** Minuut 0 betekent onbekend en wordt een lege minuut (#872); `stoppage_minutes` blijft leeg.
    Een doelpunt zonder minuut komt achteraan, want het bestand zegt niet waar het hoort.
    `wikipedia_page` en `person_id` blijven leeg.
  - **De bron en de redactie gaan voor.**
    De stap raakt alleen wedstrijden met de bron `oude-fansite`.
    Een wedstrijd waarvan de redactie de doelpunten invulde (`match_edits.goals_edited`) of een verslag opsloeg (`match_reports.saved_by`) blijft zoals hij is.
  - **Een tweede run verandert niets.**
    Een doelpunt dat er al is, wordt op zijn plaats bijgewerkt (op volgorde van `id`), zodat de koppeling met een verslag (#879) blijft.
- **Waarom:** een lijst die niet optelt, spreekt de uitslag en de bezoeker tegen, en de regels van het verslag eisen dat de doelpunten optellen.
- **Alternatieven:** een deel van de doelpunten tonen, met een zin dat ze niet af zijn.
  De doelpunten van een wedstrijd weghalen en opnieuw maken bij elke run (de koppeling met het verslag van #879 breekt).
- **Later:** zie _Doelpunten van de oude fansite die niet optellen, wachten als wijziging op de redactie_.
  De doelpunten gaan nog steeds uit `match_goals`, maar ze worden bewaard.

## De stap `opstellingen` maakt een verslag per wedstrijd met een opstelling, en het is alleen klaar als de regels het goedkeuren

- **Datum:** 8 november 2026
- **Besluit:** `import:old-site` krijgt na `doelpunten` de stap `opstellingen` (#879).
  Elke wedstrijd met een opstelling in de bestanden (566 van de 671) krijgt een verslag met de bron `Oude fansite`.
  - **Wat erin staat.**
    Een rij in `match_reports` zonder formatie en zonder `saved_by`, een rij in `match_appearances` voor elke speler van beide teams, de wissels, de kaarten en de koppeling van doelpunten en assists aan de spelers.
    Een speler van ons wijst naar zijn rij in `players` van dat seizoen (#878).
    Een speler van de tegenstander heeft alleen een naam.
    `starter` is waar bij minuut erin 0, `captain` is onwaar en het rugnummer is leeg (#871).
    Een wedstrijd zonder opstelling krijgt geen verslag, ook al heeft hij doelpunten.
  - **Klaar of bezig.**
    De stap draait `checkMatchReport` uit `@fansite/shared/match-report` op elk verslag, met de doelpunten zoals de stap `doelpunten` ze bewaarde.
    De status is `klaar` als de regels geen fouten vinden en er niets is weggelaten of twijfelachtig is (zie _Wat het verslag bezig houdt_).
    Anders is hij `bezig`, en de log noemt de reden per wedstrijd.
    `opponent_complete` is waar bij precies 11 beginspelers van de tegenstander.
    Waarom: bezoekers zien alleen een verslag dat klaar is, en alleen dat telt in de cijfers van een speler.
    Een verslag dat de eigen regels niet haalt, mag niet als af in de cijfers komen.
  - **De wissels volgen uit de minuten erin en eruit.**
    Het bestand bewaart per speler de minuut erin en de minuut eruit, niet wie wie verving.
    Wie begint, heeft minuut erin 0.
    Wie later komt, is een invaller op die minuut en vervangt een speler van hetzelfde team die op die minuut eruit gaat, op het veld staat en nog niet is vervangen.
    Zijn er meer kandidaten, dan telt de volgorde in het bestand, want de speelminuten komen dan toch goed uit.
    Een speler die van het veld wordt gestuurd, wordt niet vervangen.
    Het einde van een wedstrijd is minuut 90.
    Na verlenging schreven de oude redacteuren 90, 91, 96 of 120, dus daar is het einde de laatste minuut die iemand van het team speelde.
  - **Wat het verslag bezig houdt, ook als de regels geen fout vinden.**
    Een invaller waarvoor niemand eruit gaat op zijn minuut (21 wedstrijden).
    Een speler die voor het einde eruit gaat zonder invaller en zonder rode of geel-rode kaart (13 wedstrijden).
    Een naam die twee keer in een team staat: de tweede wordt weggelaten (3 wedstrijden).
    Een rode of geel-rode kaart zonder minuut waarvoor de speler ook geen minuut van weggaan heeft: de kaart wordt weggelaten.
    Een speler van ons zonder rij in `players`.
    De spelers en de minuten zijn dan niet te vertrouwen, en een verslag dat er zo uitziet moet de redactie nakijken.
  - **De kaarten.**
    Gebeurtenis 2 is `geel`, 3 is `geel-rood` en 4 is `rood`.
    De minuut 0 van een gele kaart wordt leeg (#872).
    Een rode of geel-rode kaart zonder minuut krijgt de minuut waarop de speler eruit ging in de opstelling.
    Een kaart voor iemand die niet in de opstelling staat, zoals de trainer (`foppe.dehaan`), wordt weggelaten en staat in de log.
    Een tweede kaart van dezelfde soort voor dezelfde speler wordt weggelaten en staat in de log.
    Een geel-rode kaart voor een speler zonder gele kaart in die wedstrijd krijgt een gele kaart zonder minuut (#900, zie de regel **Later** onder deze beslissing).
  - **Doelpunten en assists.**
    Een scorer van ons wordt gevonden via zijn code, een speler van de tegenstander en een assist via de naam.
    Een naam telt als dezelfde zonder accenten, hoofdletters en leestekens (`Andre` en `André`).
    Een assist die niet bij een speler van het team van de scorer past, bij een strafschop of een eigen doelpunt hoort, of van de scorer zelf is, blijft leeg en staat in de log.
  - **De bron en de redactie gaan voor.**
    De stap raakt alleen wedstrijden met de bron `oude-fansite`.
    Een wedstrijd met een verslag dat de redactie opsloeg (`match_reports.saved_by`) of doelpunten die zij invulde (`match_edits.goals_edited`) blijft zoals hij is.
  - **Een tweede run verandert niets.**
    Een speler wordt op zijn plaats bijgewerkt, gevonden op team en naam.
    De wissels en de kaarten staan nergens aan vast, dus een verschil vervangt ze als geheel.
- **Waarom:** het verslag bewaart geen minuten per speler maar wissels en kaarten, en 1.098 van de 1.127 teams per wedstrijd kloppen al op aantal.
  Een verslag dat twijfelachtig is, moet bezig blijven, want de cijfers van een speler worden daaruit berekend.
- **Alternatieven:** alle verslagen klaar zetten (ongecontroleerde cijfers) of alleen goede verslagen aanmaken (verlies van wat wel klopt).
  De minuten per speler bewaren (twee plekken die uit elkaar kunnen lopen).
  Bij een geel-rode kaart zonder gele kaart de eerste gele kaart verzinnen, met een lege minuut: 35 verslagen worden dan klaar, want de oude fansite schreef een geel-rode kaart als één kaart.
  Dat is een gevolgtrekking en geen feit uit het bestand, en het verhoogt het aantal gele kaarten van die spelers.
  Daarom blijven die 35 bezig tot de eigenaar het wil; het is een kleine wijziging in `deriveCards`.
- **Later:** op 8 november 2026 koos de projecteigenaar om de ontbrekende gele kaart toch af te leiden (#900).
  Een speler met een geel-rode kaart en zonder gele kaart in dezelfde wedstrijd krijgt een gele kaart zonder minuut, vlak voor zijn geel-rode kaart; heeft hij al een gele kaart, dan verandert er niets.
  De log noemt het per wedstrijd, en het controleverslag zet het onder _Kaarten die de import oversloeg of afleidde_.
  Het zijn 36 gele kaarten in 35 verslagen; 31 daarvan gingen van `bezig` naar `klaar`, want de andere 4 houden een andere reden (een invaller zonder speler die eruit gaat).
  De spelers in die verslagen hebben nu één gele kaart meer in de cijfers, en die verslagen komen voor het eerst in de cijfers.
- **Later:** zie _De formatie van onze ploeg wordt afgeleid uit de linie van de oude fansite, alleen als de volgorde en de lijnen het eens zijn_ (8 november 2026): een verslag zonder formatie is er niet meer.
  Een verslag waarvan volgorde en lijnen kloppen krijgt een formatie voor onze ploeg, en een tweede run volgt een andere afleiding ook naar leeg.

## Het controleverslag van de oude fansite is een opdracht die niets schrijft

- **Datum:** 8 november 2026 (de keuze van het issue, 7 november)
- **Besluit:** `import.mjs --old-site --report` (#880) leest de bestanden en de database en schrijft een Markdown-verslag in het Nederlands naar het scherm.
  De workflow `import-old-site.yml` heeft daarvoor een keuze `action` (`import` of `report`), die vóór de stappen wordt gecontroleerd en alleen als omgevingsvariabele doorgaat, en zet het verslag in de samenvatting van de run.
  De Builder draait het één keer na de import en zet het resultaat als `docs/oude-wedstrijden-hiaten.md` in de repository.
  - **Het rekent niets zelf uit.**
    Het verslag vraagt de stappen: `deriveOldSiteMatches` (ronde, aftijd, opmerking), `deriveOldSiteGoals` (optellen), `deriveOldSitePlayers` (naam uit de code), `judgeStoredOldSiteMatch` (klaar of bezig, de regels en de meldingen) en `findOldSiteClubs` (de club bij een oude club).
    De stap `opstellingen` gebruikt dezelfde `judgeStoredOldSiteMatch`, zodat het verslag en de import niet uit elkaar kunnen lopen.
    De meldingen van een verslag (`OldSiteReportAnomaly` en `OldSiteReportNote`) hebben naast hun Engelse regel voor de log een veld `about` met de speler, de minuut en de soort, waaruit het verslag zijn Nederlandse zin maakt.
  - **Het schrijft niets.**
    De functies krijgen alleen `select`, dus het type verbiedt een schrijfactie, en een test telt de rijen van alle tabellen voor en na.
    Het neemt de lock van de import niet, want het leest alleen, en het kan niet samen met `--dry-run`.
  - **Wat erin staat.**
    Een tabel per seizoen en lijsten met wedstrijden (seizoen, competitie, dag, tegenstander) voor: wedstrijden die niet in de database of niet in de bestanden staan, rondes met een ander nummer, opmerkingen van de oude fansite (met of ze zijn overgenomen), doelpunten die niet optellen, verslagen die `bezig` zijn met de reden per regel, kaarten die de import oversloeg of afleidde, doelpuntenmakers en assists zonder speler.
    Verder staan er de spelers van wie de code geen rij in de oude tabel had en de clubs: nieuw, aan een bestaande gekoppeld, of niet gevonden.
    Het noemt alleen namen zoals ze in de wedstrijd stonden, dus niets wat niet in de bestanden van #875 staat.
  - **Rondes vergelijkt het alleen bij een competitie.**
    De oude fansite nummerde de speelrondes van de competitie (en die nummers klopten soms niet); bij de beker gaf ze het nummer van de ronde van de beker, terwijl de import de wedstrijden telt (zie _De stap `matches` leidt ronde, verlenging, strafschoppen en aftrap af uit het bestand_).
    Dat zijn twee soorten nummers, dus een verschil zegt daar niets.
  - **Een club is nieuw als ze geen Wikipedia-pagina en geen wedstrijd van een andere bron heeft.**
    De import bewaart niet welke clubs hij maakte, dus het verslag leidt het af uit de database: dat is wat de stap `clubs` maakt (een club zonder `wikipedia_page`), tot Wikipedia de club vindt.
    Een club met dezelfde naam als de oude fansite (zonder hoofdletters, spaties en leestekens, dus `NEC` is `N.E.C.`) telt als dezelfde; een andere naam telt als gekoppeld.
  - **Het cijfer komt uit de run.**
    De cijfers staan in het verslag zoals de run ze geeft, en een test houdt ze vast voor de bestanden in de repository: 671 wedstrijden, 604 met doelpunten die optellen, 65 zonder doelpunten en 2 met een deel (de stap `doelpunten` zegt hetzelfde), 566 verslagen waarvan 505 `klaar` en 61 `bezig` (474 en 92 vóór #900).
- **Waarom:** de projecteigenaar kan lezen wat er niet is, en #414 weet wat het moet aanvullen.
  Een verslag dat hetzelfde antwoord geeft als de import, kan niet liegen over wat de import deed.
- **Alternatieven:** een tabel in de database met meldingen (de meldingen horen bij één run en verouderen).
  Het verslag zelf de afleidingen laten herhalen (twee kopieën die uit elkaar lopen).
- **Later:** zie _Een kleine lijst in de importer voegt de schrijfwijzen van één speler van de oude fansite samen_ (8 november 2026): het verslag noemt de namen zoals ze in de wedstrijd stonden, op de schrijfwijzen in die lijst na, en het heeft een lijst _Namen om te beslissen_.
- **Later:** zie _Het controleverslag legt de competitie naast de kruistabellen van Wikipedia_ (10 november 2026): het verslag vraagt Wikipedia om de kruistabellen en vergelijkt de uitslagen zelf, en schrijft nog steeds niets.

## Een kleine lijst in de importer voegt de schrijfwijzen van één speler van de oude fansite samen

- **Datum:** 8 november 2026
- **Besluit:** `oldSiteNameCorrections` in `apps/importer/src/old-site-names.ts` zet een schrijfwijze van een speler die de oude redacteuren intikten om in de enige juiste schrijfwijze.
  - **Waar het werkt:** overal waar de importer een naam uit een veld van de bestanden haalt: de opstelling, de doelpuntenmaker, de kaart en de assist (`cleanOldSiteName`).
    De bestanden in `apps/importer/data/oude-fansite` blijven zoals ze zijn.
    Een spelercode van ons (`lars.nilsson`) geeft al de naam van de rij in de oude tabel (`Lasse Nilsson`), dus daar is niets omgezet.
  - **Wat erin staat:** alleen wat de projecteigenaar per groep koos.
    Voor de tegenstanders zijn dat Dirk Kuijt, Jürgen Dirkx, Humphrey Rudge, Rahim Ouédraogo, Tomáš Galásek, Mark Luijpers, Marc Nygaard en Tommie van der Leegte; voor de spelers van ons staan ze onder het volgende kopje.
    Brian Tevreden en Brian Tevreden II zijn twee spelers, en Ruud Kool en Ruud Knol ook (`oldSiteDistinctNames`).
    **Later:** die lijst heet sinds 10 november 2026 `personsWhoDiffer` en staat in `packages/db/src/persons.ts`; zie _Jordy Bruijn en Jordy Buijs zijn twee personen_.
  - **Ook de spelers van ons.**
    Een speler van ons komt uit de oude tabel `speler` of uit een code, en gaat door dezelfde lijst (`resolveOldSiteCode`).
    De lijst zet de schrijfwijze van de oude fansite om in de schrijfwijze van de selectie van Wikipedia: Gerrie Schaap, Ronny Venema, Ivan Tsvetkov, Ali El Khattabi en Henny Meijer.
    Bij Leeroy Echteld en Igor Korneev is de oude schrijfwijze de gekozen, en de lijst zet de schrijfwijze van Wikipedia om (`Lee-Roy Echteld`, `Igor Kornejev`), voor het geval die als tekst in de bestanden staat.
    De stap `spelers` vindt zo de speler die er al staat (dezelfde naam in hetzelfde seizoen, uit welke bron ook) en maakt geen tweede.
    De import verwijdert of hernoemt nooit een rij die er al staat: wat er onder de oude schrijfwijze staat, regelt de projecteigenaar met de hand.
    **Later:** zie _De stap `spelers` voegt een verouderde rij samen met de speler van de gekozen schrijfwijze_ (8 november 2026): een rij die de stap zelf maakte onder de oude schrijfwijze wordt wel samengevoegd en weggehaald.
  - **De rest blijft staan.**
    Het controleverslag (`docs/oude-wedstrijden-hiaten.md`) heeft een lijst _Namen om te beslissen_ met de namen die op elkaar lijken.
    Daarnaast heeft het een korte lijst _Namen op de spelerskaarten om te beslissen_ (`oldSiteSquadNamesToDecide`).
    Die noemt schrijfwijzen uit de selecties die nog niet beslist zijn.
    **Later:** de projecteigenaar besliste de vier paren op 10 november 2026, en de lijst en het hoofdstuk zijn weg; zie de vijf beslissingen van die dag, vanaf _Uğur Yıldırım is één persoon_.
    Twee namen lijken op elkaar in een van deze drie gevallen:
    - ze zijn gelijk zonder hoofdletters, accenten, leestekens en `van`, `de`, `der` en `den`;
    - ze verschillen hoogstens twee letters, en beide zijn zeven tekens of langer;
    - ze hebben dezelfde achternaam, en een voornaam is het begin van de andere.

    De lijst wordt bij elk verslag uit de bestanden gemaakt (`findOldSiteNameClusters`) en verandert geen naam.
    Een groep kan twee mensen zijn; de projecteigenaar beslist per groep.
- **Waarom:** één mens met drie schrijfwijzen is voor een bezoeker drie spelers, met drie aparte telstanden.
  Een kleine lijst die de eigenaar goedkeurt, is de kleinste oplossing en laat de gegevens van de oude fansite onaangeroerd.
  Wat de eigenaar niet zeker weet, wordt niet gegokt.
- **Alternatieven:** de bestanden opnieuw maken met de juiste namen (de bestanden zijn een kopie van de oude database en horen dat te blijven); namen automatisch samenvoegen (twee mensen met bijna dezelfde naam, zoals Michel Vonk en Michel Vorm, worden dan één); een tabel in de database met speler-id's voor de tegenstanders (veel meer werk dan een korte lijst).
- **Later:** zie _De lijst met schrijfwijzen van de oude fansite volgt de Wikipedia-schrijfwijze_ (8 november 2026): de lijst bevat nu ook de schrijfwijze van Wikipedia, niet alleen wat de projecteigenaar per groep koos.

## De lijst met schrijfwijzen van de oude fansite volgt de Wikipedia-schrijfwijze

- **Datum:** 8 november 2026
- **Besluit:** `oldSiteNameCorrections` heeft er 102 omzettingen bij, in groepen van namen die zeker één persoon zijn.
  - **De schrijfwijze:** het artikel op nl.wikipedia, of op en.wikipedia als nl geen artikel heeft.
    De omzetting geldt voor een tikfout (`Pacal Heije`), een afwijkende letter of accent (`Rene Bot`, `Željko Kalac`) en een koppelteken of hoofdletter (`Klaas Jan Huntelaar`, `Bart van den Eede`).
  - **Wat niet:** een groep waarvan niet zeker is dat het één persoon is, blijft in de lijst _Namen om te beslissen_ van het controleverslag staan.
    Bij een groep met twee mensen krijgt alleen de tikfout een omzetting (`Danny Guyt` naar `Danny Guijt`), nooit een samenvoeging van de twee (Danny Buijs, Bob Peeters en Rob Penders, Frank de Boer en Frank Broers).
    `Erwin Koen` blijft ook staan: hij en Erwin Koeman staan in dezelfde opstelling, dus de oude redacteuren bedoelden twee spelers.
  - **Controle:** een test telt de omzettingen, zodat een weggehaalde omzetting opvalt, en een test zoekt een omzetting die naar een andere omzetting leidt.
- **Waarom:** de projecteigenaar wil één schrijfwijze per persoon, en een artikel op Wikipedia is een bron die hij kan controleren.
  Een omzetting die de importer bij elke naam toepast, laat de bestanden van de oude fansite onaangeroerd.
- **Alternatieven:** alle groepen samenvoegen, ook als niet zeker is dat het één persoon is (twee mensen worden dan één speler); de schrijfwijze van de oude fansite behouden (dezelfde persoon blijft op twee manieren in de tellingen staan).
- **Later:** zie _De lijst met schrijfwijzen krijgt 32 omzettingen met minder zekerheid_ (8 november 2026): de groepen waarvan het artikel minder zeker is, zijn daarna door de projecteigenaar goedgekeurd en toegevoegd.

## De stap `spelers` voegt een verouderde rij samen met de speler van de gekozen schrijfwijze

- **Datum:** 8 november 2026
- **Besluit:** na het aanmaken van de spelers voegt de stap `spelers` (`mergeStaleOldSitePlayers` in `apps/importer/src/old-site-players.ts`) een verouderde rij samen met de rij van de gekozen schrijfwijze, en haalt de verouderde rij weg.
  - **Wanneer een rij verouderd is:** hij is van hetzelfde seizoen, heeft de bron `verslag` en alleen een naam (geen Wikipedia-pagina, geen persoon), en zijn naam is precies een sleutel van `oldSiteNameCorrections` waarvan de gekozen schrijfwijze in dat seizoen ook een rij heeft.
    Elke andere rij blijft zoals hij is: een andere naam, een andere bron, een rij met een pagina of een persoon.
  - **Wat er gebeurt:** de doelpunten, de opstellingen en de cijfers van het seizoen van de verouderde rij gaan naar de andere rij.
    Heeft de andere rij die wedstrijd of die competitie al, dan blijft die zijn eigen gegevens houden, en gaat het gegeven van de verouderde rij weg met die rij.
    Het aantal samengevoegde rijen staat bij de gewijzigde rijen in het overzicht van de stap, met een regel per rij.
    Een tweede run vindt niets meer.
    **Later:** sinds 10 november 2026 gaan ook de verschillen in de seizoenscijfers (`player_stat_differences`) mee, en het samenvoegen staat in `mergePlayerInto` in `@fansite/db/person-merge`.
    Een eigen rij waarvan de oude naam alleen in accenten verschilt, krijgt de gekozen schrijfwijze; zie _De import voegt de personen samen die de projecteigenaar als één persoon aanwees_.
  - **Rijen van Wikipedia onder de oude schrijfwijze blijven staan:** bij Lee-Roy Echteld en Igor Kornejev is de rij van de selectie de verouderde, en de rij van de oude fansite de gekozen.
    Samenvoegen zou de gegevens van Wikipedia kwijtraken, en de selectie zet die rij elke run terug.
    De projecteigenaar hernoemt ze met de hand.
- **Waarom:** de import voegde alleen toe, dus een rij van vóór de lijst met schrijfwijzen bleef naast de goede staan en een speler stond twee keer op de selectie van een seizoen (acceptatie, `Ger Schaap` en `Gerrie Schaap`).
  De rij is door deze stap zelf gemaakt en bevat niets dan een naam, dus er gaat niets verloren.
- **Alternatieven:** een eenmalige opdracht (het volgende geval, een nieuwe schrijfwijze in de lijst, vraagt weer om een opdracht); alle verouderde rijen samenvoegen, ook van Wikipedia (verlies van pagina, rugnummer en cijfers); niets doen en de projecteigenaar de rijen laten weghalen (de lijst is lang, en de fout komt bij elke nieuwe schrijfwijze terug).

## De lijst met schrijfwijzen krijgt 32 omzettingen met minder zekerheid

- **Datum:** 8 november 2026
- **Besluit:** `oldSiteNameCorrections` heeft er 32 omzettingen bij (156 in totaal), voor groepen waarvan de schrijfwijze van Wikipedia iets minder vanzelf spreekt dan bij de 102 van _De lijst met schrijfwijzen van de oude fansite volgt de Wikipedia-schrijfwijze_.
  De projecteigenaar keurde ze op 8 november 2026 goed.
  - **Welke:** een tikfout of afwijkende letter (`Ulrich Crüden`, `Zjelko Petrovic`, `Pedrag Djordjevic`), een andere transcriptie (`Eric Kortchaguine` en `Erik Kortchaguine` naar `Erik Kortsjagin`, `Pavel Mikhalevitch` naar `Pavel Mikhalevich`) en een korte of lange vorm van de voornaam (`Gerry Senden` naar `Ger Senden`, `Jan Martens` naar `Jan-Pieter Martens`).
    Het bewijs per paar is het artikel op nl.wikipedia, of op en.wikipedia als nl er geen heeft:
    - `Aleksandar Ilic` naar `Aleksandar Ilić`: https://en.wikipedia.org/wiki/Aleksandar_Ilić_(footballer,_born_1969)
    - `Aleksander Ilic` naar `Aleksandar Ilić`: https://en.wikipedia.org/wiki/Aleksandar_Ilić_(footballer,_born_1969)
    - `Bob Penders` naar `Rob Penders`: https://nl.wikipedia.org/wiki/Bob_Peeters ; https://nl.wikipedia.org/wiki/Rob_Penders
    - `Boldizsár Bödör` naar `Boldizsár Bodor`: https://en.wikipedia.org/wiki/Boldizsár_Bodor
    - `Damiën Hertog` naar `Damien Hertog`: https://nl.wikipedia.org/wiki/Damiën_Hertog
    - `Eric Kortchaguine` naar `Erik Kortsjagin`: https://nl.wikipedia.org/wiki/Eric_Kortchaguine
    - `Erik Kortchaguine` naar `Erik Kortsjagin`: https://nl.wikipedia.org/wiki/Eric_Kortchaguine
    - `Evgenyi Levchenko` naar `Evgeniy Levchenko`: https://en.wikipedia.org/wiki/Evgeniy_Levchenko
    - `Yevgeni Levchenko` naar `Evgeniy Levchenko`: https://en.wikipedia.org/wiki/Evgeniy_Levchenko
    - `Gerry Senden` naar `Ger Senden`: https://nl.wikipedia.org/wiki/Ger_Senden
    - `Jan Martens` naar `Jan-Pieter Martens`: https://en.wikipedia.org/wiki/Jan-Pieter_Martens
    - `John Veltman` naar `John Veldman`: https://en.wikipedia.org/wiki/John_Veldman
    - `Kurt van der Paar` naar `Kurt van de Paar`: https://en.wikipedia.org/wiki/Kurt_Van_De_Paar
    - `László Bodnar` naar `László Bodnár`: https://en.wikipedia.org/wiki/L%C3%A1szl%C3%B3_Bodn%C3%A1r
    - `Leonardo dos Santos` naar `Leonardo dos Santos Silva`: https://nl.wikipedia.org/wiki/Leonardo_dos_Santos_Silva
    - `Leonardo Dos Santos` naar `Leonardo dos Santos Silva`: https://nl.wikipedia.org/wiki/Leonardo_dos_Santos_Silva
    - `Luc Maes` naar `Luuk Maes`: https://nl.wikipedia.org/wiki/Luuk_Maes
    - `Mark Verkuyl` naar `Mark Verkuijl`: https://nl.wikipedia.org/wiki/Mark_Verkuijl_(1963)
    - `Martin van Duren` naar `Mart van Duren`: https://en.wikipedia.org/wiki/Martin_Drent ; https://en.wikipedia.org/wiki/Mart_van_Duren
    - `Martin Reynders` naar `Martin Reijnders`: https://en.wikipedia.org/wiki/Martin_Reijnders
    - `Pavel Mikhalevitch` naar `Pavel Mikhalevich`: https://en.wikipedia.org/wiki/Pavel_Mikhalevich
    - `Pavel Mikalevitch` naar `Pavel Mikhalevich`: https://en.wikipedia.org/wiki/Pavel_Mikhalevich
    - `Pedrag Djordjevic` naar `Predrag Djordjevic`: https://en.wikipedia.org/wiki/Predrag_%C4%90or%C4%91evi%C4%87
    - `Ronald Jansen` naar `Roland Jansen`: https://nl.wikipedia.org/wiki/Roland_Jansen
    - `Ruud Bond` naar `Ruud Brood`: https://nl.wikipedia.org/wiki/Ruud_Brood
    - `Tommy Simons` naar `Timmy Simons`: https://nl.wikipedia.org/wiki/Timmy_Simons
    - `Tom van Mol` naar `Tom Van Mol`: https://nl.wikipedia.org/wiki/Tom_Van_Mol ; https://nl.wikipedia.org/wiki/Tom_De_Mul
    - `Ulrich Crüden` naar `Ulrich Cruden`: https://nl.wikipedia.org/wiki/Ulrich_Cruden
    - `Youssouf Mariana` naar `Youssef Mariana`: https://en.wikipedia.org/wiki/Youssef_Meriana
    - `Youessef Mariana` naar `Youssef Mariana`: https://en.wikipedia.org/wiki/Youssef_Meriana
    - `Zjelko Petrovic` naar `Željko Petrović`: https://nl.wikipedia.org/wiki/%C5%BDeljko_Petrovi%C4%87
    - `Zeljko Petrovic` naar `Željko Petrović`: https://nl.wikipedia.org/wiki/%C5%BDeljko_Petrovi%C4%87
  - **Drie groepen met een tweede persoon:** `Bob Penders` wordt `Rob Penders` (niet Bob Peeters), `Martin van Duren` wordt `Mart van Duren` (niet Martin Drent) en `Tom van Mol` wordt `Tom Van Mol` (niet Tom de Mul).
    De omzetting verandert alleen de tikfout in de bedoelde persoon.
    Bob Penders staat alleen in wedstrijden tegen NAC, waar ook Rob Penders speelt, en Mart en Martin van Duren spelen allebei tegen FC Groningen.
    De tweede persoon van de groep blijft zoals hij was, en een test controleert dat.
  - **Wat niet:** de vier paren op de spelerskaarten (_Namen op de spelerskaarten om te beslissen_) en wat na deze omzettingen nog op elkaar lijkt, blijven in het controleverslag staan.
    `Tom Van Mol` en `Tom de Mul` staan daar nog, omdat het twee spelers zijn.
    **Later:** de vier paren op de spelerskaarten zijn op 10 november 2026 beslist, en dat hoofdstuk van het controleverslag is weg; zie de beslissingen van die dag, vanaf _Uğur Yıldırım is één persoon_.
  - **Gevolg:** twee assists die als "staat niet in de opstelling" leeg bleven (`Erik Kortchaguine` en `Gerry Senden`) krijgen nu hun speler, en staan niet meer onder _Assists zonder speler_ in het controleverslag.
- **Waarom:** de projecteigenaar wil één schrijfwijze per persoon, en dit zijn de paren waarbij het artikel op Wikipedia de bedoelde persoon aanwijst.
- **Alternatieven:** deze paren laten staan als namen om te beslissen (dezelfde persoon blijft op twee manieren in de tellingen staan); de drie groepen met een tweede persoon overslaan (de tikfout blijft dan een eigen speler).

## Wikidata is de bron voor de gegevens van een persoon

- **Datum:** 8 november 2026
- **Besluit:** de importer leest per persoon het item van Wikidata via `Special:EntityData/Q….json`, met de fetcher (#898).
  Uit het item komen de geboortedatum (`P569`), de geboorteplaats (`P19`), de nationaliteiten (`P27`) en de posities (`P413`).
  - **De rang:** een uitspraak met de rang "deprecated" telt niet, en bij een voorkeursrang telt alleen de voorkeur.
  - **De datum:** een datum met een precisie grover dan een jaar blijft leeg.
  - **De namen:** landen, plaatsen en posities komen uit hun eigen item, het Nederlandse label of anders het Engelse, één keer per Q-nummer.
    Een Q-nummer zonder een van beide labels geeft een waarschuwing met `Persons:` en wordt overgeslagen.
  - **Het logboek:** `persons (Wikidata): …` noemt per run hoeveel personen zijn gelezen en wat ze kregen, en `pnpm run import:status` toont de totalen.
  - **De licentie:** we nemen alleen feiten over die Wikidata zelf onder CC0 publiceert, geen foto's en geen tekst.
    De bronvermelding op de site (`SourceCredit`) verandert niet.
- **Waarom:** de `robots.txt` laat dat adres toe (`Allow: /wiki/Special:EntityData/*.`, getoetst met onze eigen `parseRobots` op de `robots.txt` van 8 november 2026), de gegevens zijn gestructureerd en CC0, en de Wikipedia-infobox heeft geen veld voor nationaliteit en een vrije tekst voor de positie.
- **Alternatieven:** alleen de infobox van de Nederlandse Wikipedia (geen nationaliteit, een positie als tekst); Wikidata met de infobox als terugval (twee lezers voor één issue).
- **Gevolg:** dit vervangt de aanname dat Wikidata niet bereikbaar is (zie de regels **Later** bij de oudere besluiten).
  De API onder `/w/` en de pagina's `Special:Search` en `Special:ItemByTitle` blijven geweigerd, en de importer vraagt ze niet.

## De Q-nummers en paginanummers komen uit de pagina-informatie van het artikel

- **Datum:** 8 november 2026
- **Besluit:** voor elke persoon zonder Q-nummer vraagt de importer één keer de pagina-informatie van het artikel (`/wiki/<titel>?action=info`) en leest daaruit het paginanummer (`wgArticleId`) en het Q-nummer (de link naar `Special:EntityPage/Q…`).
  Een titel zonder artikel (paginanummer 0) en een artikel zonder item blijven leeg, zonder gok, en de persoon is dan toch gelezen.
  Tussen twee verzoeken wacht de stap 250 milliseconden.
  De lijn van een positie komt uit een lijst op Q-nummer (`wikidataPositionLines` in `person-lines.ts`), niet op het label.
- **Waarom:** de API en de REST-adressen van de Nederlandse Wikipedia staan in de `robots.txt` onder `/w/` en `/api/`, en de pagina-informatie onder `/wiki/` is het enige adres dat beide gegevens in één verzoek geeft en door `robots.txt` mag.
  Het is een pagina van ongeveer 57 kilobyte.
  De wachttijd houdt een run van 200 personen naar onze schatting op ongeveer vijf minuten, zodat de vergrendeling niet lang vastzit.
  Een Q-nummer verandert niet als het label verandert, en een positie die niet in de lijst staat is een bewuste leemte in plaats van een gok.
- **Nadeel:** de pagina-informatie is html, dus de importer leest twee vaste stukken tekst eruit.
  Verandert MediaWiki die, dan geeft de stap een waarschuwing en leest hij niemand tot dat is hersteld.
- **Alternatieven:** de gewone pagina (meer html dan nodig); de API met `prop=pageprops` (geweigerd door `robots.txt`); het Q-nummer zoeken via de titel op Wikidata (`Special:ItemByTitle`, geweigerd).

## De stap geldt voor alle personen, ook tegenstanders

- **Datum:** 8 november 2026
- **Besluit:** elke rij in `persons` wordt gelezen, en hoogstens 200 personen per run.
- **Waarom:** de regel is eenvoudig, de gegevens zijn er dan als de site ooit een tegenstander toont, en de eerste ronde is ongeveer 1.400 verzoeken voor ongeveer 680 personen, plus de labels.
  Een persoon wordt één keer gelezen; opnieuw lezen is een eigen issue.
- **Alternatieven:** alleen personen met een rij in `players` van ons (minder verzoeken).

## De linie komt uit een lijst van ons, anders uit Wikidata, anders uit de selectielijst

- **Datum:** 8 november 2026
- **Besluit:** de linie (`doelman`, `verdediger`, `middenvelder`, `aanvaller`) komt uit `personLines`, anders uit de eerste positie van Wikidata die in `wikidataPositionLines` staat, anders uit de linie die het vaakst in de rijen van `players` van de persoon staat (bij gelijkstand die van het laatste seizoen).
  `line_source` zegt welke het was: `manual`, `wikidata` of `squad`.
  Zonder een van de drie blijft de linie leeg.
  De lijst `personLines` wordt bij elke run toegepast, ook op personen die al gelezen zijn, en wordt nooit vervangen.
- **Waarom:** Wikidata zegt wat de speler is, de selectielijst vult de gaten voor onze eigen spelers, en een handmatige lijst herstelt fouten, zoals bij de namen.
  De negen posities in de lijst zijn gecontroleerd op hun label in Wikidata op 8 november 2026; een andere positie telt niet mee tot iemand hem toevoegt.
- **Alternatieven:** alleen Wikidata (meer gaten); alleen de selectielijst (een veld van de rij van een seizoen, geen feit over de persoon).

## De stand van acceptatie lezen kan met een actie die niets schrijft

- **Datum:** 8 november 2026
- **Besluit:** de workflow `import-old-site.yml` heeft een derde keuze, `status`, die `import.mjs --status` op de host draait en de uitvoer in de samenvatting van de run zet, in een codeblok.
  De keuze gaat vóór de stappen door dezelfde controle als `import` en `report`, en alleen als omgevingsvariabele; de workflow kiest de argumenten, dus wat iemand typt komt niet op de host.
  `--status` toont naast de feeds en de wedstrijden hoeveel personen er per linie zijn (`persons per line`), en per seizoen hoeveel verslagen een opstelling van ons hebben en hoeveel daarvan een formatie voor ons en voor de tegenstander (`Formations of match reports`).
  Een opstelling is een verslag met minstens één speler van ons in de basis.
  De uitvoer bevat alleen aantallen, namen van bronnen en titels van artikelen over spelers.
- **Waarom:** niemand kan de database van acceptatie lezen zonder toegang tot de host, en #899 moet weten welke gegevens er al zijn.
  Een keuze in de bestaande workflow is kleiner dan een eigen bestand: de controles, de geheimen, de SSH-opzet en de `concurrency`-groep zijn dan één keer geschreven.
  De stap bewaart de exitcode van de opdracht tot de samenvatting klaar is, dus een ongezonde feed staat eerst in de samenvatting en maakt de run daarna rood.
- **Alternatieven:** een eigen workflowbestand (bijna dezelfde 90 regels); een pagina in het beheer (meer werk, en inloggen).

## De formatie van onze ploeg wordt afgeleid uit de linie van de oude fansite, alleen als de volgorde en de lijnen het eens zijn

- **Datum:** 8 november 2026
- **Besluit:** `players.json` krijgt per speler `line` (`doelman`, `verdediger`, `middenvelder`, `aanvaller`, of `null` bij 0) uit `speler.linie` van de oude database, en het formaat van de bestanden gaat naar versie 2.
  `deriveOldSiteFormation` (`old-site-formation.ts`) leidt daar de formatie van onze ploeg uit af, voor de stap `opstellingen`.
  - **Wanneer er een formatie komt.**
    Er zijn precies elf beginspelers van ons en de eerste is een doelman.
    Er staat geen tweede doelman bij de andere tien.
    De lijnen van die tien lopen in de volgorde van de opstelling niet terug (verdediger, middenvelder, aanvaller).
    Een speler zonder linie staat tussen twee spelers van dezelfde linie; aan het begin telt een verdediger als linker buur en aan het einde een aanvaller als rechter buur.
    De formatie is het aantal verdedigers, middenvelders en aanvallers, zonder een linie die leeg is (`4-6` bij geen aanvaller).
    Tien spelers van één linie zijn geen formatie, want het veld heeft minstens twee rijen.
    De volgorde van de spelers verandert nooit.
  - **Wat de stap doet.**
    Elk verslag zonder `saved_by` krijgt die formatie in `formation_ours`.
    Kan er geen worden afgeleid, dan blijft `formation_ours` leeg en toont de pagina de lijst, zoals eerder.
    Een tweede run verandert niets, en een andere afleiding (andere lijnen, een nieuw bestand) past `formation_ours` aan, ook naar leeg.
    Een verslag met `saved_by` blijft zoals de redactie het opsloeg.
    `formation_opponent` blijft leeg.
  - **Wat het oplevert.**
    269 van de 566 verslagen krijgen een formatie (het issue zei ongeveer 270), een test houdt het aantal vast.
    De rest blijft een lijst: bij 269 verslagen met elf beginspelers van ons spreken de volgorde en de lijnen elkaar tegen, en 28 verslagen hebben geen elf beginspelers van ons.
    De wedstrijd tegen FC Volendam van 25 augustus 1990 krijgt er geen: Verbeek staat als verdediger op plaats elf.
- **Waarom:** de volgorde van de opstelling is wat de oude redacteuren typten, de linie zegt waar de snijpunten liggen, en een formatie die beide tegenspreken zou een gok zijn die als feit op het veld staat.
  De linie is een eigenschap van de loopbaan van de speler en geen positie in één wedstrijd, dus we tellen niet.
  Dat past bij eerdere keuzes om niets te verzinnen (het rugnummer, de gele kaart).
  De linie komt uit het bestand en niet uit `persons.line` (#898): oude spelers hebben daar nog geen persoon, en het verslag blijft zo te maken zonder de database van andere stappen.
- **Alternatieven:** de lijnen tellen en de spelers daarop ordenen (ongeveer 530 verslagen, maar Verbeek komt in de verdediging); de best passende formatie nemen met een vaste regel bij gelijke uitkomst (ongeveer 540 verslagen, maar in een derde ervan past meer dan één vorm); alles met de hand in het beheer doen (566 verslagen); wachten op de gegevens van #898 (oude spelers hebben daar nog geen persoon).

## De tegenstander van de oude fansite houdt de lijst, en de overige verslagen krijgen met de hand een formatie

- **Datum:** 8 november 2026
- **Besluit:** er komt geen afgeleide formatie voor de tegenstander.
  De redactie stelt in het beheer (`/beheer/wedstrijden/<id>/verslag`) de formatie in van de verslagen die een lijst blijven, voor beide teams, en een opgeslagen verslag blijft voor de import zoals het is.
  Een test van het beheer en een test van de stap `opstellingen` laten dat zien.
- **Waarom:** er zijn geen posities voor tegenstanders, en elke formatie zou een gok zijn.
  Het beheer kan het al, het werk is klein per verslag en niets in de code verzint iets.
- **Alternatieven:** een standaard 4-4-2 voor elke volledige tegenstander (ongeveer 450 verslagen met een verzonnen formatie); een lijst van formaties per wedstrijd in de importer (blijft bestaan bij een nieuwe database, maar de eigenaar moet hem in code onderhouden).

## Het land van een speler komt als landcode uit de vlag in de selectietabel

- **Datum:** 9 november 2026
- **Besluit:** de importer bewaart per speler het land dat de selectietabel van de Wikipedia noemt, als landcode van twee letters in `players.country` (#946).
  - **De bron:** het sjabloon in de cel van de nationaliteit: `{{NL-VLAG}}` (recente seizoenen), `{{NL}}` (2013/14 tot en met 2017/18), de vlag voor de naam in de lijsten van 2007/08 tot en met 2009/10 en `nat=NED` op de Engelse pagina's.
    Staan er twee vlaggen, dan telt de eerste, zoals Wikipedia hem toont.
  - **Geen gok:** een sjabloon dat geen code van twee letters is (`{{ENG-VLAG}}`), een code van de bonden die we niet kennen en een cel met tekst zonder sjabloon geven een leeg land en een waarschuwing in het logboek.
  - **De import:** het lopende seizoen neemt het land over zoals de tabel het geeft.
    Een seizoen dat voorbij is, vult een leeg land aan en vervangt een land alleen met een betere lijst, zoals bij het rugnummer.
    Een tweede run met dezelfde bron schrijft niets.
    Het logboek noemt hoeveel spelers een land hebben: `countries of the players: 25 of 25 have one`.
  - **De migratie:** `0054_add_player_country` voegt de kolom `country` (`char(2)`, mag leeg zijn) toe aan `players`.
    Bestaande rijen blijven leeg tot de volgende import van hun seizoen.
    Ze voegt alleen toe en kan opnieuw draaien.
    Terugdraaien op de host: `ALTER TABLE players DROP COLUMN country`.
  - **De licentie:** een landcode is een feit, geen tekst of foto, dus de bronvermelding verandert niet.
- **Waarom:** de tabel noemt het land bij elke speler zonder extra verzoek, en de gegevens van Wikidata (`person_nationalities`) staan als Q-nummer zonder landcode en zijn niet voor elke speler gelezen.
  De kaart Selectie kan er zo een vlag bij tonen (#947).
- **Alternatieven:** alleen Wikidata (P27: geen wijziging in de importer, maar een tabel van Q-nummers naar landen en een lagere dekking); beide bronnen (twee lezers voor één issue).
- **Later:** nationaliteit uit Wikidata als terugval voor een speler zonder sjabloon is niet gedaan en kan een eigen issue worden.

## De importer bewaart ook de volledigheid van een seizoen met alleen spelers uit verslagen

- **Datum:** 9 november 2026
- **Besluit:** de import van de oude site (`import.mjs --old-site`) heeft een zesde stap, `selecties` (#935).
  Ze bewaart met `storeCompleteness` de volledigheid van elk seizoen waarin een speler met de bron `verslag` staat, op de som van de tabel na, die ze laat zoals hij was.
  - Een seizoen met alleen spelers uit verslagen krijgt een rij met de beste bron `verslag`.
    Een seizoen met een betere lijst houdt die bron als beste.
  - Een tweede run zonder nieuwe gegevens schrijft niets, want `storeCompleteness` vergelijkt de uitkomst met de rij.
  - De rij komt van de importer, niet van de site: de site leest alleen (zie _De importer berekent de volledigheid en bewaart hem, de site rekent niet_).
  - Het lopende seizoen en de seizoenen van Wikipedia veranderen niet: hun bron staat vóór `verslag`.
- **Waarom:** zonder rij toonde de kaart Selectie "onbekend" bij 25 spelers uit de verslagen, bijvoorbeeld in 2004/05.
  Een lijst uit een zwakke bron mag nooit voor een echte selectie doorgaan, dus de regel blijft in de importer en de kaart zegt waar de lijst vandaan komt (zie _De kaart Selectie toont de spelers uit de verslagen alleen als ze de beste bron zijn_ in `site.md`).
- **Alternatieven:** de site de volledigheid laten uitrekenen als de rij ontbreekt (breekt het besluit van 5 november 2026); een eigen opdracht erbij (de opdracht `import:completeness` rekent al voor elk seizoen met spelers, dus een nieuwe is niet nodig).
- **Verslagen uit het beheer:** een redacteur die een speler aan een verslag toevoegt, maakt ook een rij met de bron `verslag` (`saveReport`).
  Het seizoen krijgt zijn rij bij de eerstvolgende `import:completeness` of import van de oude site, niet meteen.
- **Aantal:** de zin onder de kaart noemt het aantal spelers op de kaart, dus zonder die uit de verslagen als een betere bron het seizoen heeft.
- **Op acceptatie:** na de deploy draait de import van de oude site opnieuw, zodat de rijen voor alle seizoenen zonder andere bron er zijn.

## De import controleert eerst of de database alle migraties heeft

- **Datum:** 9 november 2026
- **Besluit:** elke vorm van `import.mjs` vergelijkt eerst de migraties in de database met die van zijn eigen versie (`checkMigrations` in `@fansite/db/migration-check`, #963).
  Hij vraagt en schrijft nog niets.
  - Mist de database een migratie, dan stopt de import met exitcode 1 en één regel die de eerste ontbrekende migratie noemt en zegt dat de deploy eerst klaar moet zijn.
    `--status` meldt dezelfde regel op de foutuitvoer en gaat door, want hij leest alleen.
  - Kent de database een migratie die de importer niet kent, dan geeft de import een waarschuwing en gaat door.
  - De lijst komt uit `meta/_journal.json`, dezelfde als waarmee `prepareDatabase` migreert.
    Het bestand zit in de bundel, dus `import.mjs` heeft geen losse map met migraties nodig.
    De vergelijking gaat op `created_at` in `__drizzle_migrations`, zoals Drizzle zelf: een migratie is nog te doen als hij nieuwer is dan de nieuwste die de database kent.
- **Waarom:** op 9 november 2026 faalde _Import squads_ op alle 36 seizoenen met `ER_BAD_FIELD_ERROR`, omdat hij draaide voordat de deploy had gemigreerd.
  Eén duidelijke regel is beter dan dezelfde fout per seizoen.
- **Alternatieven:** de importer zelf laten migreren (de site migreert bij het starten onder een slot, en twee migrerende processen zijn een risico); de workflows op de deploy laten wachten (dekt cron en een handmatige run niet).

## De status toont de dekking per seizoen sinds 1990/91

- **Datum:** 9 november 2026
- **Besluit:** `--status` schrijft onder de bestaande regels een tabel met een regel per seizoen sinds 1990/91 tot en met het lopende seizoen (#965).
  De cijfers komen uit één functie die alleen leest, `readSeasonCoverage` in `@fansite/db/season-coverage`, met een getypeerd resultaat, zodat de pagina in het beheer (#972) haar kan hergebruiken.
  - De lijst van seizoenen wordt gemaakt en niet uit `matches` gelezen, dus een seizoen zonder wedstrijden staat erin, met nullen.
  - Een regel heeft de wedstrijden per bron, de gespeelde, de gespeelde met doelpunten maar zonder doelpuntenlijst, de verslagen (en hoeveel `klaar`), de wedstrijden met toeschouwers en met een scheidsrechter, het aantal spelers met de beste bron en het niveau van de selectie, onze doelpunten zonder speler en of er een stand is.
  - De tabel is smal: één letter per kolom, met een legenda erboven.
  - Het is informatie en geen fout, dus de exitcode verandert niet.
- **Waarom:** wie wil weten hoe compleet een eerder seizoen is, moest logboeken van runs lezen.
- **Alternatieven:** de seizoenen uit `matches` halen (een seizoen zonder wedstrijden valt dan weg); de tekst in `showStatus` samenstellen (de pagina in het beheer kan dat niet hergebruiken).
- **Later:** de tabel heeft geen letters meer: elke kolom heeft een eigen kort woord als kop en is uitgelijnd (#1003), zie _De tabel met dekking blijft opgevulde tekst in een codeblok_ en _Elke kolom van de tabel met dekking heeft een eigen kort woord als kop_.

## De spelers van de oude fansite worden alleen bij zekerheid personen

- **Datum:** 9 november 2026
- **Besluit:** de stap `personen` van `import:old-site` (#967) koppelt elke speler met de bron `verslag` en zonder persoon aan een persoon, en alleen als het zeker is.
  - Heeft een andere rij met dezelfde naam al een persoon, dan krijgt de speler die persoon.
  - Anders is de titel de naam: de stap leest de tekst van de pagina, volgt een doorverwijzing en koppelt alleen als het artikel in een categorie van voetballers staat.
  - Geen artikel, een doorverwijspagina of een artikel over iemand anders koppelt niets en komt als regel in het logboek.
    `--report` noemt de spelers die nog geen persoon hebben.
  - De geboortedatum uit de oude tabel gaat niet mee in `players.json`: het is een persoonsgegeven, en het issue vroeg eerst om een besluit.
    De stap vergelijkt dus geen geboortedatum.
  - De stap zet alleen `person_id`, niet `wikipedia_page`, en raakt geen rij met een andere bron.
- **Waarom:** een speler is zo geen nieuwe rij zonder verband in elk seizoen, en het Wikidata-deel van de import (#898) kan zijn gegevens lezen.
  Een verkeerde koppeling is erger dan geen: dezelfde naam kan een andere voetballer zijn, daarom blijft elke twijfel zonder persoon.
- **Alternatieven:** de geboortedatum in het bestand zetten om namen uit elkaar te houden (een persoonsgegeven zonder besluit); zoeken met de zoekfunctie van Wikipedia (meer verzoeken en meer raden); een titel met `(voetballer)` proberen als de naam zelf geen voetballer is (meer verzoeken, en twee titels is juist twijfel).

## Een import zoekt een wedstrijd eerst op datum en club

- **Datum:** 9 november 2026
- **Besluit:** elke import zoekt een wedstrijd eerst op seizoen, competitie, club en datum, met een dag speling, wat de bron en de ronde ook zijn (`findMatchByDate` in `@fansite/db/match-lookup`, #968).
  De import van Wikipedia (`storeMatches`) en de stap `matches` van `import:old-site` gebruiken haar voordat ze een rij maken.
  - Vindt ze een wedstrijd van een andere bron, dan komt er geen tweede rij.
    De import vult alleen de lege velden (`compareClaim`): de aftrap, de tekst bij de datum, het stadion, de toeschouwers, de scheidsrechter, de opmerking, en de stand na negentig minuten en de strafschoppen.
    De uitslag en de status vult hij niet.
  - Verschilt een veld, dan staat er een regel in het logboek in een vaste vorm: `match difference: <seizoen> <competitie> <ronde> (match <id>) <veld>: <bron> says <waarde>, <andere bron> says <waarde>`.
    #974 maakt van die regel later een wachtende wijziging.
  - Passen twee wedstrijden tegen dezelfde club binnen een dag (een herspeelde wedstrijd), dan kiest de functie er geen, de import meldt het in het logboek, en het blijven twee wedstrijden.
  - De ronde blijft een eigenschap, en de sleutel op seizoen, competitie en ronde blijft staan.
  - Voor 1990/91 tot en met 2006/07 gaat de oude fansite voor.
    Een andere bron (Wikipedia, een kruistabel) vult alleen lege velden, en een verschil wordt een wachtende wijziging voor de redactie (#974).
- **Waarom:** de oude fansite maakt zelf de ronde (`Wedstrijd 3`) en Wikipedia schrijft `Eerste ronde`, dus dezelfde wedstrijd kon twee keer in de database komen.
  De gegevens van de oude fansite zijn van de projecteigenaar, en een tweede bron is een controle, geen vervanging.
- **Alternatieven:** Wikipedia gaat voor (een eigen bron verandert dan door een bewerking elders); wie het eerst schrijft wint, zoals voorheen (een verschil blijft onzichtbaar); de sleutel veranderen in datum en club (een herspeelde wedstrijd past dan niet).
- **Later:** sinds #974 is een verschil in de aftrap, de uitslag of de gegevens geen regel meer maar een wachtende wijziging; zie _Een verschil tussen twee bronnen wacht op de redactie_.
  De regel `match difference` vervalt.
- **Later:** zie _Wikipedia is de waarheid voor wat het heeft, het beheer verbetert, en de oude fansite blijft van ons_ (10 november 2026).
  De volgorde blijft: voor 1990/91 tot en met 2006/07 gaat de oude fansite voor.
  Voor de seizoenen daarna volgt de import Wikipedia, en de redactie verbetert in het beheer wat niet klopt of ontbreekt.
- **Later:** in een seizoen met wedstrijden van de oude fansite maakt de import van Wikipedia geen speler van een doelpuntenmaker; zie _Een doelpuntenmaker met een eigen pagina wordt een speler van het seizoen_ (10 november 2026).

## Een vierde deel in `match_edits` voor de gegevens van een wedstrijd

- **Datum:** 9 november 2026
- **Besluit:** `match_edits` krijgt een vierde markering, `facts_edited`, voor `attendance`, `referee`, `stadium` en `note`, met `reported_facts` voor wat Wikipedia de vorige keer zei, en `matchParts` krijgt `facts` (#969).
  Er komt nog geen algemene tabel.
  - Het formulier van een wedstrijd heeft vier velden met de grenzen van de database: toeschouwers (0 tot 150.000, alleen bij een gespeelde wedstrijd), scheidsrechter (100 tekens), stadion (150) en opmerking (255).
    Elk veld heeft zijn eigen fout.
  - `before_match` bewaart de vier waarden vóór de eerste invoer.
    "Invoer weghalen" zet ze terug, en de toeschouwers alleen bij een gespeelde wedstrijd.
  - De import van Wikipedia (`edited-matches.ts`) en de stap `matches` van de oude fansite laten een gemarkeerd deel staan.
    Ook een wedstrijd die ze op datum en club vinden (`findMatchByDate`, #968) vullen ze niet aan voor een gemarkeerd deel (`lockedFields`).
  - Een gegeven van Wikipedia dat verschilt, wordt een wachtende wijziging met het deel `facts`, zoals bij de andere delen.
    Wikipedia zegt niets over een gegeven dat het mist: alleen een gegeven dat Wikipedia wel heeft, kan verschillen.
    De markering verdwijnt als alle vier gelijk zijn.
  - Het logboek heeft één regel `match.edit` per invoer, met de waarden ervoor en erna.
- **Waarom:** het past in wat er is: de wachtende wijziging, het terugzetten en de logregel werken voor elk deel op dezelfde manier.
  Een verbeterde scheidsrechter of een toeschouwersaantal verdween bij de volgende import.
- **Alternatieven:** een algemene tabel met entiteit, veld en waarde (meer werk nu, en de import moet anders lezen; die komt pas als ook selecties of personen dat nodig hebben, zie #977).

## De redactie mag wedstrijden toevoegen die geen bron heeft

- **Datum:** 9 november 2026
- **Besluit:** de redactie voegt wedstrijden toe als derde bron, `redactie` (`matchDataSources`, #970), met een verplichte bronregel.
  - **De bron:** `matches.data_source` krijgt de waarde `redactie`.
    Geen import wijzigt of verwijdert zo'n rij: de import van Wikipedia en de stap `matches` van `import:old-site` raken alleen hun eigen bron, laten een wedstrijd van de redactie op dezelfde sleutel staan en melden dat.
  - **Op datum en club:** vinden ze zo'n wedstrijd met `findMatchByDate` (#968), dan vullen ze er niets aan en melden alleen een verschil in het logboek.
  - **Het formulier:** "Wedstrijd toevoegen" op de lijst van `/beheer/wedstrijden` vraagt het seizoen, de competitie, de ronde, de tegenstander (een bestaande club of een nieuwe naam, via `clubs.ts`), thuis of uit, de datum, de tijd of "tijd onbekend", de status, de uitslag en de bron.
    Het formulier weigert een wedstrijd die er al is op seizoen, competitie, club en datum met `findMatchByDate`, en een ronde die in het seizoen en de competitie al bestaat.
    Elk veld heeft een eigen fout, en een fout zonder veld krijgt de focus.
  - **Daarna:** doelpunten, gegevens en een verslag werken zoals bij elke wedstrijd.
    Het logboek heeft `match.add` (met de bron als reden) en `match.delete`.
  - **Verwijderen:** alleen een wedstrijd met de bron `redactie`, na een reden, met de doelpunten en het verslag erbij.
    Het blok is een Disclosure met een rode knop, zodat het niet één klik is.
  - **Zonder tijd:** een wedstrijd van de redactie mag, net als een van de oude fansite, een dag zonder tijd hebben (`matches_time_or_text`).
- **Waarom:** voor 1991/92 (6 van ongeveer 40 wedstrijden) en voor 2007/08 tot en met 2009/10 (de bekerwinst van 2009) is er geen bron die een import kan lezen.
  Zonder weg blijven die gaten.
- **Alternatieven:** alleen imports (de gaten blijven); wachten tot vrijwilligers Wikipedia aanvullen (kost jaren en geeft de redactie geen controle).
- **Later:** de import van Wikipedia meldt sinds 9 november 2026 geen verschil per veld meer voor een wedstrijd van de redactie die hij op datum en club vindt, maar één regel dat hij haar overslaat; zie _De import slaat een wedstrijd van de redactie over_.
  Voor 63 wedstrijden van 2007/08 tot en met 2009/10 is er sindsdien wel een bron die de import leest (#1001).

## De bronregel van een wedstrijd is een kolom van `matches`

- **Datum:** 9 november 2026
- **Besluit:** de bron van een wedstrijd van de redactie staat in `matches.source_line` (`varchar(255)`), niet in de bron van het verslag (`match_reports.source`) (#970).
  Een check eist de kolom bij de bron `redactie` (`matches_source_line_for_editors`).
  De site toont hem bij de wedstrijd: op de pagina van de wedstrijd en onder de bronvermelding van de pagina Wedstrijden (`listEditorSources`, `EditorSources`).
- **Waarom:** ook een wedstrijd zonder verslag heeft een bron nodig, en de bron van het verslag hoort bij de opstelling en de kaarten, niet bij de uitslag.
  Een kolom is één plaats die elke pagina en elke check kan lezen.
- **Alternatieven:** de bron van het verslag (een wedstrijd zonder verslag zou geen bron hebben); een eigen tabel met bronnen (te veel voor één regel tekst).

## We nemen RTV Noord en OOG Groningen

- **Datum:** 9 november 2026
- **Besluit:** het register krijgt RTV Noord met de feed van de sport (`https://www.rtvnoord.nl/rss/sport.xml`, filter `club`) en OOG Groningen (`www.oogtv.nl`) met twee feeds: de tagfeed van sc Heerenveen als gewone feed, en de tagfeed van FC Groningen met het filter `club`.
  Slugs: `rtv-noord` en `oog-groningen`.
  We tonen de kop, de link, de bronnaam en de tijd, en bewaren niets van de beschrijving, de auteur, de tekst of de afbeelding.
  Er is geen regel voor een betaalmuur: geen van de feeds geeft een teken.
  Een kop over FC Groningen is `relevant` van 3 dagen voor tot 3 dagen na een wedstrijd tegen hen, en een kop over sc Heerenveen telt op elke dag (de regel van #315, zoals bij Rijnmond).
  Het regionieuws van RTV Noord en de hoofdfeed van OOG (`/feed/`, geen enkele kop over Heerenveen) staan niet in het register.
- **Het filter:** de lijst met clubs en de regel bleven zoals ze waren.
  Een kop over schaatsen op Thialf in Heerenveen noemt de plaats, niet de club, en krijgt de waarde `doubtful`; de site toont hem niet.
  Op de echte feeds van 9 november 2026 misrekende het filter niets: RTV Noord had geen kop over Heerenveen, en de koppen over FC Groningen buiten de dagen rond een wedstrijd waren `irrelevant`.
- **De links:** de feed van OOG zet `utm_`-tags achter elke link.
  `parseLink` haalt elke parameter die met `utm_` begint van elke link af, voor alle bronnen, zodat we niet bewaren hoe een bezoeker bij een pagina kwam.
  Een parameter die er niet mee begint, blijft.
- **Gemeten op de echte feeds** (9 november 2026, één run van de importer): RTV Noord 50 bewaard en 50 `irrelevant`; OOG sc Heerenveen 10 bewaard en 10 `relevant`; OOG FC Groningen 10 bewaard en 10 `irrelevant`; 0 overgeslagen.
  De tijden kloppen met de feeds.
- **Waarom:** de Groningse media schrijven vooral over de derby en over FC Groningen.
  Met het filter van #315 toont de site wat ze over de tegenstander schrijven in de dagen rond de wedstrijd, en wat ze over sc Heerenveen zelf schrijven.
  De feed van sc Heerenveen van OOG levert weinig (een paar berichten per jaar) maar is goed gemikt.
  `robots.txt` laat ons de feeds toe, en de voorwaarden van OOG zeggen niets over automatisch lezen of het overnemen van koppen (zie `docs/bronnen.md`).
- **Alternatieven:** alleen de feed van sc Heerenveen van OOG; OOG weglaten; RTV Noord afgewezen laten staan; de hoofdfeed van OOG (10 berichten en geen kop over Heerenveen).
- **Later:** zie _Een bron nemen we als zijn feed over de club gaat en `robots.txt` ons toelaat_; de tweede regel daarbij over RTV Noord.

## We wijzen het Dagblad van het Noorden af

- **Datum:** 9 november 2026
- **Besluit:** het Dagblad van het Noorden (`www.dvhn.nl`) staat niet in het register.
- **Waarom:** elk feedadres dat we op 9 november 2026 één keer probeerden, gaf een 403, ook de sitemaps in `robots.txt` (Cloudflare).
  We omzeilen dat niet.
  Daarbij verbiedt `robots.txt` tekst- en datamining, scrapen en het automatisch verzamelen van gegevens.
  Dat is een ander voorbehoud dan bij de bronnen die we wel nemen, want daar stond de feed voor ons open (zie _Een bron nemen we als zijn feed over de club gaat en `robots.txt` ons toelaat_).
- **Alternatieven:** eerst toestemming vragen; dat kan later, buiten #1004.

## Twee achternamen, of een achternaam met een voetbalwoord, maken een kop `relevant`

- **Datum:** 9 november 2026
- **Besluit:** `judgeRelevance` geeft `relevant` voor een kop met twee verschillende achternamen uit `clubSurnames`, of met één achternaam uit `clubSurnames` en een voetbalwoord (`footballWords` of `frisianFootballWords`), ook zonder "Heerenveen".
  Dezelfde achternaam twee keer telt als één.
  Eén achternaam alleen blijft `doubtful`.
  "basis" is een voetbalwoord ("in de basis").
- **Waarom:** de kop "Meerveld in plaats van Rivera?" (Omrop Fryslân, 9 november 2026) ging over twee spelers van de club en kreeg toch "twijfelgeval, niet op de site".
  Twee namen van spelers in één kop gaan bijna altijd over de club, en één naam met een voetbalwoord ook.
  Eén achternaam alleen kan een andere Kersten of Scholten zijn, dus die houdt een mens tegen: de moderator kan hem met #1007 alsnog op de site zetten.
- **Alternatieven:** elke achternaam alleen `relevant` maken (meer valse treffers); de selectie uit de tabel `players` lezen (het filter hangt dan af van de squadimport en krijgt een extra argument); alleen de twee-namenregel.
- **Beslissing:** de namen blijven in `relevance-terms.ts`.
  Achternamen die gewone woorden zijn, staan niet op de lijst en tellen dus niet mee.
  Het filter blijft zuiver en kijkt niet in de database.
- **Geen migratie:** de importer beoordeelt elk bericht bij elke run opnieuw, dus een bestaand bericht verandert bij de volgende run.
  Een bericht dat een moderator verborg, blijft verborgen.
- **Later:** dit vult _De regels van het filter: hele woorden, zonder hoofdletters en accenten_ en _Een volledige naam is genoeg, en "wint" en "verliest" zijn voetbalwoorden_ aan: een achternaam alleen is nog `doubtful`, maar twee achternamen, of een achternaam met een voetbalwoord, zijn `relevant`.

## Elke taal van Wikipedia mag, onder een geschikte CC-licentie

- **Datum:** 9 november 2026
- **Besluit:** de import mag pagina's van elke taaleditie van Wikipedia lezen, zolang de pagina een geschikte CC-licentie heeft (nu CC BY-SA 4.0).
  We halen ze op met de bestaande fetcher en alleen via `/wiki/<pagina>?action=raw`.
  Welke pagina's we lezen, staat per seizoen in een vaste lijst in de code (`footballBoxPages` in `apps/importer/src/read-football-box.ts`, en `europaLeaguePage`).
  De bronvermelding noemt de taal: `wikipedia_pages.language` bewaart haar (`nl` of `en`), en de site schrijft "(Engelse Wikipedia)" achter de pagina en linkt naar die Wikipedia.
- **Waarom:** de Engelse Wikipedia heeft de datum, de uitslag en de doelpuntenmakers van wedstrijden die de Nederlandse niet heeft, onder dezelfde licentie en met dezelfde regels.
- **Alternatieven:** een besluit voor elke pagina (te veel werk voor dezelfde licentie); alleen de Nederlandse Wikipedia (de gaten van 2007 tot 2010 blijven).
- **Later:** dit vervangt _De vier Europa League-wedstrijden van 2012/13 komen van de Engelse Wikipedia_ (3 november 2026), waar de Engelse Wikipedia een uitzondering was voor dat ene seizoen, en het deel van _Wedstrijdgegevens komen van de Nederlandse Wikipedia, voor het eerste mannenelftal_ (25 oktober 2026) dat alleen de Nederlandse noemt.

## De wedstrijden van 2007/08 tot en met 2009/10 komen uit de blokken `football box`

- **Datum:** 9 november 2026
- **Besluit:** één lezer van `football box` en `footballbox2` (`readFootballBoxes`) leest de zes pagina's uit het onderzoek in `docs/onderzoek-wedstrijden-2007-2010.md`, voor 63 wedstrijden (#1001).
  De wedstrijden die alleen in een kruistabel staan, importeren we niet, want een wedstrijd heeft bij ons een datum nodig.
  - **De pagina's:** de vaste lijst zegt per pagina de taal, het aantal wedstrijden van ons en onder welke kop welke competitie staat.
    Een ander aantal, een kop of een ronde die we niet kennen, of een wedstrijd zonder uitslag is een fout, en de import schrijft dan niets.
  - **De rondes:** de ronde krijgt een Nederlandse naam, zoals `Speelronde 12`, `3e ronde`, `Groepsfase, wedstrijd 2/6` en `Halve finale, wedstrijd 1/2`.
  - **De clubs:** een lijst in de lezer (`englishClubs`) vertaalt de Engelse titel van een tegenstander naar de naam en het artikel van de Nederlandse Wikipedia.
    Een club die er niet in staat, is een fout.
  - **De doelpuntenmakers:** een doelpunt van een Engelse pagina houdt de naam en verliest de link, want een Engelse titel is geen artikel dat we kennen.
    `playerLinker` koppelt het doelpunt op de naam aan een speler van het seizoen, en het wordt geen persoon.
    Tellen de doelpunten niet op tot de uitslag, dan krijgt de wedstrijd geen doelpuntenlijst en een regel in het logboek.
  - **De tijd:** een tijd telt alleen als de pagina de tijdzone noemt.
    Een tijd in een andere zone, zoals `22:05 EEST (UTC+3)`, rekent de lezer om naar onze tijd; zonder zone houdt de wedstrijd alleen de dag.
  - **Geen stand:** deze pagina's hebben geen ranglijst en geen uitslagen van de andere clubs, dus `standings` en `league_results` blijven leeg voor deze seizoenen.
- **Waarom:** het zijn de enige pagina's met de datum, de uitslag en de doelpuntenmakers, en de lezer past op alle zes.
- **Alternatieven:** een kruistabel met alleen een uitslag (geen datum, dus geen wedstrijd); alle wedstrijden met de hand invoeren (63 wedstrijden invoeren kost de redactie veel tijd).
- **Later:** sinds 9 november 2026 leest dezelfde lezer ook een zevende pagina, met de 34 competitiewedstrijden van 2008/09 in een tabel; zie _De competitie van 2008/09 komt uit de tabel op de seizoenspagina van de club_.
  Samen zijn het 97 wedstrijden.

## De Johan Cruijff Schaal en de play-offs voor de Champions League zijn competities

- **Datum:** 9 november 2026
- **Besluit:** `Johan Cruijff Schaal` (2009) en `Play-offs Champions League` (2008, de vier wedstrijden tegen Ajax en NAC Breda) komen erbij in `competitions`, naast `UEFA Cup` en `Europa League` die er al zijn.
  Ze tellen alleen onder "Alle wedstrijden", zoals de Europa League.
  De pagina van de play-offs zet de twee wedstrijden tegen NAC Breda onder de play-offs voor de UEFA Cup, als `Ronde 2`: de verliezers van de halve finales speelden daar om een ticket.
  Bij ons horen ze bij dezelfde play-offs, en de ronde heet `Ronde 2, wedstrijd 1/2`.
- **Waarom:** een wedstrijd heeft een competitie nodig, en geen bestaande past.
- **Alternatieven:** ze bij `Eredivisie` zetten (verkeerde cijfers); ze weglaten (de bekerwinst van 2009 en het seizoen van 2008 missen er dan een stuk van).

## De import slaat een wedstrijd van de redactie over

- **Datum:** 9 november 2026
- **Besluit:** vindt de import van Wikipedia op datum en club een wedstrijd met de bron `redactie`, dan laat hij die zoals ze is en schrijft hij één regel in het logboek, ook als een veld leeg is.
  Hij vergelijkt de velden niet meer, dus er komen geen regels `match difference` voor zo'n wedstrijd.
- **Waarom:** geen import wijzigt een rij van de redactie (#970).
- **Alternatieven:** alleen de lege velden vullen, zoals #968 voor andere bronnen doet (past niet bij #970).

## De tabel met dekking blijft opgevulde tekst in een codeblok

- **Datum:** 9 november 2026
- **Besluit:** de tabel met dekking per seizoen in `--status` blijft opgevulde tekst, geen Markdown-tabel (#1003).
  `coverageTable` in `apps/importer/src/status.ts` maakt de regels.
  - Elke kolom is zo breed als zijn breedste waarde, de kop meegeteld, en tussen de kolommen staan twee spaties.
    Elke regel van de tabel heeft dus evenveel tekens.
  - Getallen en `klaar/alle` staan rechts, tekst (het seizoen, `best`, `level` en `table`) links.
  - De legenda staat erboven, met één regel per kolom: de kop, opgevuld tot de langste kop, en wat de kolom telt.
- **Waarom:** het log en de samenvatting van de run tonen de tabel allebei met een lettertype met vaste breedte.
  Zo is er één opmaak voor beide, en de workflow `import-old-site.yml` verandert niet.
- **Alternatieven:** een Markdown-tabel, die op GitHub mooier rendert (de workflow moet de tabel dan van de rest van de status scheiden, en het log toont ruwe streepjes).

## Elke kolom van de tabel met dekking heeft een eigen kort woord als kop

- **Datum:** 9 november 2026
- **Besluit:** elke kolom van de tabel met dekking heeft een eigen Engels woord van hoogstens acht tekens als kop, geen letter (#1003):
  `season`, `wiki`, `old`, `edit`, `played`, `nolist`, `reports`, `att`, `ref`, `players`, `best`, `level`, `noscorer` en `table`.
  - De koppen, de legenda en de uitlijning staan op één plek: `seasonCoverageColumns` in `@fansite/db/season-coverage`, naast `readSeasonCoverage`.
    Een pagina van de site kan ze daar ook lezen; uit `apps/importer` kan dat niet.
  - De kolom met onze doelpunten zonder speler heet `noscorer` en niet `nogoals`, het voorbeeld uit het issue: de doelpunten zijn er wel, de speler ontbreekt.
- **Waarom:** twee kolommen heetten allebei R, de wedstrijden van de redactie en de verslagen.
  Een kop als `edit` of `players` is te lezen zonder de legenda.
- **Alternatieven:** unieke letters (smaller, maar elke keer met de legenda erbij); de kolommen in `apps/importer` laten staan (de site kan ze dan niet hergebruiken).

## Doelpunten van de oude fansite die niet optellen, wachten als wijziging op de redactie

- **Datum:** 9 november 2026
- **Besluit:** de stap `doelpunten` gooit een lijst die niet optelt tot de uitslag niet meer weg (#973).
  De doelpunten gaan nog steeds uit `match_goals`, en de wedstrijd krijgt een wachtende wijziging in `match_changes` met het deel `goals`.
  - **Wat erin staat.**
    `new_value` is de lijst van de bestanden en `old_value` zijn de doelpunten die in de database stonden, allebei als één regel tekst.
    `proposal` heeft de lijst van de bestanden (`goals`) en de doelpunten uit de database (`stored`), met de speler van elk doelpunt.
    De reden is `oldSiteGoalsReason` uit `@fansite/db/match-conflicts`; daaraan herkent de code deze wijziging.
  - **De uitslag in de database telt.**
    De stap vergelijkt de lijst met `goals_for` en `goals_against` van de rij in `matches`, niet met de uitslag in de bestanden.
    Verbetert de redactie de uitslag (`result_edited`), dan ziet de volgende run dat de doelpunten niet meer optellen.
  - **Eén wijziging per lijst.**
    Wacht er al een wijziging met dezelfde lijst, dan komt er geen tweede.
    Is over die lijst al beslist, dan komt er alleen een nieuwe als de wedstrijd weer doelpunten heeft die weggaan.
    Hebben de bestanden een andere lijst, dan vervalt de oude wijziging (`replaced`) en komt er een nieuwe.
    Tellen de doelpunten weer op, dan vervalt de wijziging (`reverted`) en staan ze weer in `match_goals`.
  - **Overnemen blijft staan.**
    Neemt de redactie de lijst over, dan staat ze in `match_goals` en laat de stap de wedstrijd met rust.
    Vult de redactie de lijst daarna aan, dan is het haar invoer (`goals_edited`).
  - **Geen mail en geen termijn.**
    `mailConflicts` slaat deze wijzigingen over, en de import neemt ze nooit zelf over na zeven dagen.
    Een wedstrijd met een uitslag en zonder lijst in de bestanden krijgt geen wijziging: er is niets om te bewaren.
- **Waarom:** vaak ontbreekt er maar één doelpunt, en de redactie vult een lijst sneller aan dan dat ze hem opnieuw intikt.
  Een regel in het logboek van een run leest niemand terug, en een wijziging staat op de werklijst van het beheer.
  In de bestanden zijn het nu 2 wedstrijden.
- **Nadeel:** het beheer toont de wijziging met de woorden van een verschil met Wikipedia, want het deel `goals` was daar tot nu toe altijd een verschil met Wikipedia.
- **Alternatieven:** de lijst in `match_goals` laten staan en de wedstrijd markeren (een bezoeker ziet dan een lijst die de uitslag tegenspreekt).
  Een eigen tabel voor bewaarde doelpunten (een tweede plek voor wat `match_changes` al kan bewaren, met een eigen scherm in het beheer).
  Een mail aan de beheerders, zoals bij een verschil met Wikipedia (die mail belooft dat de import na zeven dagen Wikipedia overneemt, en dat klopt hier niet).

## De competitie van 2008/09 komt uit de tabel op de seizoenspagina van de club

- **Datum:** 9 november 2026
- **Besluit:** `readFootballBoxes` leest ook de tabel `Eredivisie` op `Sc Heerenveen in het seizoen 2008/09 (mannen)` van de Nederlandse Wikipedia, voor de 34 competitiewedstrijden van 2008/09 (#1002).
  De pagina staat in de vaste lijst `footballBoxPages`, en de licentie valt onder _Elke taal van Wikipedia mag, onder een geschikte CC-licentie_.
  - **De rij:** een rij is een wedstrijd, en gaat door `readMatch` zoals een blok: het stadion, de datum, thuis of uit, de tegenstander en de uitslag.
    De tabel heeft geen tijd, geen toeschouwers en geen scheidsrechter.
  - **De ronde:** de tabel heeft geen ronde, dus de wedstrijden heten `Speelronde 1` tot en met `Speelronde 34` in de volgorde van de rijen.
    Die volgorde moet de volgorde van de datums zijn; anders is het een fout.
    Een wedstrijd die later is ingehaald, krijgt daardoor het nummer van de dag waarop ze is gespeeld, zoals bij de wedstrijden van de oude fansite.
  - **De tegenstander van 15 november 2008:** die rij noemt geen uitclub.
    De lijst vult FC Utrecht in, alleen zolang de cel leeg is: het is de enige club die de tabel wel uit en niet thuis heeft, en de doelpuntenmakers van de rij speelden er.
  - **De controles:** de tabel heeft de zeven kolommen die we kennen, elke rij heeft zeven cellen en een uitslag, en het zijn 34 wedstrijden, 17 thuis en 17 uit.
    Anders schrijft de import niets.
  - **De andere tabellen** op de pagina, van de UEFA Cup en de beker, leest de import niet: die wedstrijden komen van de pagina's van #1001.
- **Waarom:** het is de enige pagina van Wikipedia met de datum van de competitiewedstrijden van 2008/09.
- **Alternatieven:** een eigen lezer naast `readFootballBoxes` (een tweede vaste lijst en een tweede weg door de import voor één pagina); de officiële speelronde erbij zoeken (staat op geen pagina met een datum); een rij zonder tegenstander als fout zien (dan komt geen van de 34 wedstrijden erin, om één lege cel); de tegenstander afleiden uit de andere rijen (meer code dan één regel in de lijst, voor één rij).

## Een doelpunt van de oude pagina heeft geen minuut

- **Datum:** 9 november 2026
- **Besluit:** de doelpunten van de competitie van 2008/09 gaan zonder minuut mee, want de pagina heeft er geen (#1002).
  `ReadGoal.minute` mag daarvoor leeg zijn, zoals `match_goals.minute` al mocht.
  - Een cel noemt de doelpuntenmakers achter `{{goal}}` en vóór het eerste plaatje van een kaart: `2X` achter een naam zijn twee doelpunten, en `e.d.` is een eigen doelpunt bij de club die ervan profiteert.
  - De doelpunten van de thuisclub staan eerst, en binnen een club in de volgorde van de cel: zonder minuut is er geen andere volgorde.
  - Tekst vóór `{{goal}}` is geen doelpuntenmaker: de eerste rij heeft daar de naam van een club.
  - Tellen de doelpunten niet op tot de uitslag, of staat er iets wat de lezer niet kent, dan krijgt de wedstrijd geen doelpuntenlijst en een regel in het logboek.
- **Waarom:** de scorers zijn meer waard dan een lege lijst, en de minuut mag leeg zijn in `match_goals`.
- **Alternatieven:** de wedstrijd zonder doelpunten importeren (verliest de doelpuntenmakers die er wel zijn); een minuut raden (valse gegevens).

## Een pagina van Wikipedia heeft een rij per soort

- **Datum:** 9 november 2026
- **Besluit:** de sleutel van `wikipedia_pages` is de titel met de soort (`title`, `kind`), met de migratie `0059_wikipedia_page_per_kind` (#1002).
  Een pagina die twee imports lezen, heeft twee rijen, elk met een eigen `read_at` en `version`.
- **Waarom:** `Sc Heerenveen in het seizoen 2008/09 (mannen)` is de pagina van de selectie en nu ook die van de competitiewedstrijden.
  Met de titel alleen als sleutel schreef elke import de soort van de ander over, en dan miste `/wedstrijden` of de selectie zijn bronvermelding.
- **Alternatieven:** de rij van de selectie laten staan en de pagina niet bij de wedstrijden noemen (de bronvermelding van 34 wedstrijden ontbreekt dan); een kolom per gebruik op één rij (elke lezer van de tabel moet dan anders vragen).

## Een verschil tussen twee bronnen wacht op de redactie

- **Datum:** 9 november 2026
- **Besluit:** zegt een tweede bron iets anders over een wedstrijd dan de bron waar de wedstrijd van komt, dan wordt dat een wachtende wijziging in `match_changes` (#974).
  De wedstrijd houdt de waarde van zijn eigen bron tot de redactie beslist.
  - Er komt één wijziging per deel dat verschilt: de aftrap, de uitslag of de gegevens.
    Ze heeft het deel, de twee waarden in woorden en het voorstel van de tweede bron, zoals een afwijking van de invoer van de redactie (`keepSourceDifferences` in `@fansite/db/source-differences`).
    De reden zegt welke bron de tweede is (`sourceDifferenceReasons`).
  - Hetzelfde verschil, met dezelfde twee waarden, komt er één keer: een volgende run telt het alleen opnieuw.
    Verandert een waarde, dan vervalt de wijziging en komt er een nieuwe.
    Is het verschil weg, of houdt de redactie het deel inmiddels zelf, dan sluit de wijziging zichzelf.
  - Alleen een mens beslist, in het beheer of met `import:changes`.
    De import neemt na zeven dagen niets over en er gaat geen mail uit.
  - Wijst de redactie het verschil af, dan komt het niet terug zolang beide waarden gelijk blijven.
    Een wijziging die vanzelf verviel of die werd overgenomen, telt daarbij niet.
  - Neemt de redactie de tweede bron over, dan laat de import van de eigen bron dat deel voortaan met rust (`readTakenOverParts`): de stap `matches` van `import:old-site`, en de import van Wikipedia voor een wedstrijd van Wikipedia.
    Anders zette de volgende run de oude waarde terug.
    De rest van zo'n wedstrijd van Wikipedia volgt de pagina zonder het oordeel van `classify-change.ts`, zoals bij een invoer van de redactie.
  - Thuis of uit hoort bij de uitslag: de regel van de uitslag noemt de thuisclub eerst, en het voorstel heeft dan ook `home`.
  - Leest de regel van een deel voor beide bronnen hetzelfde, zoals bij een andere dag met dezelfde aftrap, dan staat het veld dat verschilt erachter.
    Zo wordt elk veld dat `compareClaim` vergelijkt een wachtende wijziging, en is er geen regel `match difference` meer.
  - De doelpunten vergelijkt deze stap niet: die hebben hun eigen regels (#973).
- **Waarom:** een waarschuwing in `last_warning` is weg na de volgende run, en een regel in het logboek leest niemand terug.
  `match_changes` had het deel, het voorstel en het besluit al, dus het beheer en `import:changes` werken zonder nieuw scherm.
- **Alternatieven:** de tweede bron na zeven dagen overnemen, zoals bij de invoer van de redactie (de eigen bron is hier juist de baas); een eigen tabel voor deze verschillen (een tweede plek voor hetzelfde besluit); het overgenomen deel markeren in `match_edits` (die rij vraagt een account, en `import:changes` heeft er geen).

## Een verschil in de cijfers van een speler staat in een eigen tabel

- **Datum:** 9 november 2026
- **Besluit:** een verschil tussen de doelpunten van een speler in de selectietabel en die uit de wedstrijden of de verslagen wordt een rij in `player_stat_differences`, met de migratie `0060_add_player_stat_differences` (#974).
  De rij heeft de speler, het seizoen, de competitie, waarmee is vergeleken en de twee getallen.
  - De import vergelijkt na elke lezing van de selectie, met de wedstrijden en met de verslagen (`comparePlayerGoals` in `@fansite/db/player-stat-differences`).
    Het beheer vergelijkt met de verslagen als de redactie een verslag als `klaar` opslaat.
  - Hetzelfde verschil komt er één keer, een verschil met andere getallen vervangt het oude, en een verschil dat weg is sluit zichzelf.
  - De redactie beslist op `/beheer/kwaliteit/<seizoen>/spelerscijfers`, met een reden, en de pagina Kwaliteit linkt erheen.
    Overnemen zet het getal van de wedstrijden of de verslagen in `player_season_stats`.
    `table_goals` onthoudt wat de tabel van Wikipedia toen zei: zolang die hetzelfde zegt, laat de import het getal van de redactie staan.
    Houden laat de tabel zoals hij is.
    Een verschil dat de redactie afwees, komt niet terug zolang de twee getallen gelijk blijven.
  - Het besluit staat in het logboek van het beheer als `player.stats-take-over` of `player.stats-keep`.
    De waarschuwing van de import en de regel `player.stats-differ` vervallen.
- **Waarom:** `match_changes` hangt aan één wedstrijd, en de doelpunten van een speler in een seizoen horen bij geen enkele wedstrijd.
  Zonder `table_goals` schreef de volgende lezing van de selectie het oude getal terug, een uur na het besluit.
- **Alternatieven:** `match_changes` met een lege wedstrijd (de rij verliest dan zijn betekenis, en elk scherm moet die uitzondering kennen); het besluit alleen vastleggen en de tabel nooit aanpassen (overnemen en houden doen dan hetzelfde); de waarschuwing houden naast de rij (twee plekken voor hetzelfde nieuws).

## Het seizoen dat net voorbij is, wordt tot 1 september nog elke week gelezen

- **Datum:** 9 november 2026
- **Besluit:** van 1 juli tot en met 31 augustus leest de uurlijkse import ook het seizoen dat op 30 juni is afgelopen, één keer per week: de wedstrijden en de selectie (#975).
  De projecteigenaar keurde dat op 9 november 2026 goed; de punten hieronder zijn de keuzes bij het bouwen.
  - **Welk seizoen:** `endedSeasonOf` in `apps/importer/src/import-ended-season.ts` geeft het seizoen vóór dat van het moment, in juli en augustus, en anders geen.
    De dagen zijn die van UTC, zoals bij `seasonOf`: met de klok van Nederland zou de import op 1 juli tussen middernacht en twee uur het seizoen van twee jaar terug lezen.
  - **Hoe:** `importEndedSeason` leest na het lopende seizoen, in dezelfde run.
    De wedstrijden leest het met `importPastSeason`, de functie achter `import:season`.
    Er komt geen tweede cronjob en geen nieuwe workflow.
  - **De pauze:** `match_imports.retry_at` en `squad_imports.retry_at` van dat seizoen.
    Na een lezing die is opgeslagen of die faalt, zet de import de pauze op een week en vijf minuten.
    Een wijziging die wacht, heeft bij de volgende lezing dan altijd zeven dagen gestaan (`hasStood`), en de lezing schuift elke week één run van cron op.
    Vraagt Wikipedia om te wachten of weigert robots.txt, dan blijft de kortere pauze staan, want er is niets gelezen.
  - **Een fout:** een waarschuwing in de uitvoer en in de rij van dat seizoen.
    Ze stopt het lopende seizoen niet, verandert de exitcode niet en telt niet voor de mail over een import die blijft falen.
  - **De selectie:** de import leest haar met `importSquad`, de lezer van het lopende seizoen, met de optie `endedSeason`: dezelfde pagina en dezelfde controles als op 30 juni.
    Dat wijkt af van het issue, dat de controles van _Import squads_ noemt.
    `importPastSquad` bewaart de wedstrijden en doelpunten per speler niet in `player_season_stats` en heeft voor een seizoen na 2024/25 geen pagina in `squadSources`.
    Een selectietabel die een ronde achterliep, het voorbeeld uit het issue, kwam zo dus niet binnen.
    De eerste lezing vervangt bij dit seizoen nooit de spelers die er al staan.
  - **Wijzigingen die wachten:** de regels van _Een wijziging van Wikipedia krijgt een betrouwbaarheid, en een verdachte wijziging wacht_ blijven gelden.
    Wat leeg was, wordt meteen ingevuld; wat iets overschrijft, wacht en wordt overgenomen door de lezing van een week later, als de pagina dan nog hetzelfde zegt.
- **Waarom:** na de laatste wedstrijd verbetert Wikipedia nog een doelpuntenmaker of een aantal toeschouwers, en die verbetering kwam alleen binnen als iemand _Import season_ startte.
  Twee maanden is lang genoeg voor die verbeteringen, en één keer per week kost hoogstens negen lezingen.
  Een week na een fout is genoeg: een pagina die vandaag een controle niet haalt, haalt haar over een uur ook niet, en elk uur opnieuw vragen kost verzoeken zonder winst.
- **Alternatieven:** na een fout na een uur opnieuw proberen, zoals bij het lopende seizoen (een pagina die blijft falen kost dan twee maanden lang elk uur verzoeken en een regel in het logboek).
  De fouten meetellen voor de mail (met één lezing per week komt de mail pas na drie weken, en de status gaat over het lopende seizoen).
  De klok van Nederland voor de grenzen (wijkt af van `seasonOf`, met een verkeerd seizoen in de eerste uren van 1 juli).
  De selectie lezen met `importPastSquad`, zoals het issue vraagt (de eerste versie van deze wijziging; de cijfers van de spelers komen dan niet mee, en de reviewer wees daarop).
  `squadSources` een regel geven voor 2026/27 en later (lost de pagina op, niet de cijfers).
  Een eigen cronjob of workflow met een schema (meer om in te stellen op de host, terwijl de uurlijkse run er al is).
- **Later:** zie _In een seizoen dat voorbij is wint Wikipedia niet vanzelf van de redactie_ (10 november 2026): de lezing van een week later neemt een wijziging die wacht niet meer over.
  Wat leeg was, vult de lezing nog steeds meteen in; wat iets overschrijft, wacht tot een mens besluit.
  De pauze blijft een week en vijf minuten (`rereadEveryMs`), maar de vijf minuten beslissen niets meer: ze waren er voor de zeven dagen van `hasStood`.

## Het controleverslag legt de competitie naast de kruistabellen van Wikipedia

- **Datum:** 10 november 2026
- **Besluit:** het controleverslag van de oude fansite (`import:old-site --report`) vergelijkt de uitslagen van de competitie met de kruistabel op de pagina van het seizoen op de Nederlandse Wikipedia (#976).
  Het schrijft niets: de redactie verbetert een wedstrijd in het beheer.
  - Het vraagt alleen de pagina's van de seizoenen 1990/91 tot en met 2006/07 waarvan de bestanden een competitiewedstrijd hebben: `Eredivisie <seizoen>`, en `Eerste divisie <seizoen>` voor 1991/92 en 1992/93 (`crossTableSeasonsOf`).
    Dat zijn zeventien verzoeken, met de fetcher van de importer en een pauze ertussen.
  - De lezer neemt de eerste tabel onder het eerste kopje _Uitslagen_ (`readCrossTable` in `read-cross-table.ts`).
    De pagina's van de Eerste divisie hebben daaronder nog tabellen van de nacompetitie, en die leest hij niet.
    Past een rij niet bij de kolommen, of heeft een club een uitslag tegen zichzelf, dan is de tabel niet te lezen.
  - Het verslag zoekt de wedstrijd op seizoen, competitie en club, wat de bron ook is, en kiest daarna op thuis of uit (`findMatchesByClub` in `@fansite/db/match-lookup`).
    `findMatchByDate` van #968 kan dat niet, want die vraagt een datum en de kruistabel heeft er geen.
  - De club vindt het met het artikel waar de rij naar linkt, met de naam in de rij, of met een naam die een andere tabel voor dat artikel toont (`clubFinder`).
    Zo is `RBC` van 1992/93 de club `RBC Roosendaal` van 2000/01, want beide rijen linken naar `RBC (voetbalclub)`.
    Vindt het geen club, dan staat de wedstrijd in het verslag met "geen club met die naam in de database".
  - Per seizoen noemt het de wedstrijden waarvan de uitslag verschilt, en de wedstrijden die in de tabel staan en niet in de database.
    Een seizoen waarvan de pagina of de tabel niet te lezen is, staat er met de reden, en het verslag gaat door met het volgende seizoen.
  - De fetcher van het verslag onthoudt robots.txt in het geheugen en niet in `robots_txt`, zodat het verslag ook daar niets schrijft.
- **Waarom:** de gegevens van de oude fansite hebben fouten die we niet zien, en de kruistabel is een tweede bron voor elke uitslag.
  Een verslag is genoeg om te zien hoeveel er verschilt, voordat we er werk voor de redactie van maken.
- **Alternatieven:** een wachtende wijziging per verschil in `match_changes` (kan na #974, in een eigen issue); de datums ook vergelijken (de kruistabel heeft ze niet); de pagina's van alle seizoenen vragen, ook als de bestanden er geen wedstrijd van hebben (de test van de opdracht zou dan Wikipedia vragen).

## Het boek over 100 jaar sc Heerenveen is alleen een controle

- **Datum:** 9 november 2026
- **Besluit:** de projecteigenaar vraagt de uitgever van "100 jaar VV & SC Heerenveen" één keer om toestemming (#976).
  Tot die er is, gebruiken we het boek alleen om te controleren, en niets eruit komt in de repository of de database.
- **Waarom:** de rechten zijn niet vrij.
- **Alternatieven:** het boek niet gebruiken; de cijfers overnemen zonder toestemming (mag niet).

## Wikipedia is de waarheid voor wat het heeft, het beheer verbetert, en de oude fansite blijft van ons

- **Datum:** 10 november 2026
- **Besluit:** we maken van Wikipedia niet de enige bron van waarheid.
  - Voor 1990/91 tot en met 2006/07 gaat de oude fansite voor, zoals _Een import zoekt een wedstrijd eerst op datum en club_ (9 november 2026) zegt.
  - Voor de seizoenen daarna volgt de import Wikipedia, en de redactie verbetert in het beheer wat niet klopt of ontbreekt.
  - Een verbetering staat meteen op de site.
    Zegt Wikipedia later hetzelfde, dan volgt dat deel Wikipedia weer.
  - Wie wil, zet de verbetering zelf op Wikipedia: met de hand, onder een eigen account en met een gepubliceerde bron.
  - We bouwen geen bot.
    We noemen onze eigen site niet als bron op Wikipedia, en we zetten de gegevens van de oude fansite er niet in.
  - Dit besluit hoort bij #1024, #1025 en #1026 samen.
- **Waarom:** Wikipedia neemt geen feiten zonder gepubliceerde bron (Wikipedia:Geen origineel onderzoek) en wil geen links naar eigen sites of fansites (Wikipedia:Wanneer extern linken).
  De gegevens van 1990 tot 2007 kunnen er dus niet heen.
  Een verbetering via Wikipedia is ook traag: een seizoen dat voorbij is leest de import alleen als iemand hem start.
  En wat wij er zelf in zetten en weer uitlezen, is geen tweede bron meer.
  Een bot vraagt een eigen account, steun van de gemeenschap en 50 tot 100 proefbewerkingen (Wikipedia:Bots), voor een paar bewerkingen per maand.
- **Alternatieven:** alles op Wikipedia verbeteren en het beheer klein houden (kan niet voor 1990 tot 2007, en de bezoeker wacht).
  Een bot die onze verbeteringen schrijft (veel werk voor een paar bewerkingen per maand).
  Alleen het beheer, zonder iets terug te geven (Wikipedia blijft dan de fout houden).

## Een doelpuntenmaker met een eigen pagina wordt een speler van het seizoen

- **Datum:** 10 november 2026
- **Besluit:** noemt een wedstrijd op Wikipedia een doelpuntenmaker van ons met een link naar zijn pagina, en staat hij niet bij de spelers van dat seizoen, dan maakt de import hem als speler (#1024).
  Een naam zonder link blijft een waarschuwing en maakt geen speler.
  Op de site staat hij als elke speler, zonder markering en zonder extra bronvermelding.
  Dit zijn de keuzes bij het bouwen.
  - **De speler:** `adoptScorers` in `apps/importer/src/import-matches.ts` maakt de rij, met de bron `doelpunten`, de pagina van de link en de persoon van die pagina.
    De naam is de titel van de pagina zonder de toevoeging tussen haakjes (`nameOfTitle`), want het doelpunt zelf noemt vaak alleen de achternaam.
    Een positie, een rugnummer en een land heeft hij niet.
  - **De persoon:** de import vraagt de persoon aan `createPersonBook`, zoals de selectie dat doet.
    Hoort de pagina al bij een persoon, dan krijgt de speler die persoon.
    Heeft de pagina nog geen persoon, omdat Wikipedia niet antwoordde, dan wacht het doelpunt op een volgende run.
    Heeft een andere speler van het seizoen dezelfde persoon of dezelfde naam, dan komt er geen tweede rij en blijft het doelpunt een waarschuwing.
  - **Wanneer:** nadat de run de wedstrijden heeft geschreven, in dezelfde transactie, bij de uurlijkse import en bij `import:season`.
    De import kijkt naar de doelpunten zoals ze dan in `match_goals` staan.
    Een doelpunt van een wijziging die wacht, of van een pagina die als geheel wordt vastgehouden, maakt dus geen speler.
    Hij komt er pas als de wijziging is overgenomen.
    Daarna krijgt elk bewaard doelpunt zonder speler de speler die `playerLinker` nu vindt, ook een doelpunt met alleen zijn achternaam.
  - **Welke wedstrijden:** alleen de wedstrijden met de bron `wikipedia`.
    Een seizoen met wedstrijden van de oude fansite doet niet mee: die spelers komen van de oude fansite.
    Een wedstrijd waarvan de redactie de doelpunten invulde (`goals_edited`), doet niet mee zolang die invoer er is.
    De import vergelijkt de invoer dan met de pagina zoals die is, en een doelpunt dat de redactie op naam invulde blijft hetzelfde doelpunt (`judgeGoals`).
    Vulde de redactie alleen de aftrap, de uitslag of de gegevens in, dan doet de wedstrijd wel mee.
  - **Later in de selectie:** staat hij later in de tabel van de selectie, dan krijgt hij die rij en houdt hij zijn `id`.
    `storePlayers` in `import-squad.ts` en in `import-past-squad.ts` vinden hem op zijn pagina, zijn naam of zijn persoon (`scorersByPerson`), en de bron wordt de betere bron.
    Op de persoon zoeken ze alleen bij een rij met de bron `doelpunten`, voor een tabel die een andere titel van zijn pagina linkt.
  - **Niet in de selectie:** zolang de tabel hem niet heeft, blijft hij `in_squad` en krijgt hij geen `left_squad_at`.
    De eerste goede lezing van de selectie haalt hem ook niet weg.
  - **Het logboek:** één regel per run, zoals `Matches 2022/23: 1 player added from a goal: Pelle van Amersfoort`.
- **Waarom:** de lijst van de selectie op Wikipedia loopt achter, en de pagina zegt wie de persoon is.
  Zo miste Pelle van Amersfoort in 2022/23, terwijl beide Wikipedia's hem bij drie doelpunten noemen.
  Wedstrijd 183 had daardoor een doelpunt zonder speler.
- **Gevolg:** een seizoen waarvan de selectie nog niet is gelezen, krijgt bij de import van de wedstrijden al de doelpuntenmakers met een pagina als spelers.
  De kaart Selectie toont ze pas als het seizoen een rij in `squad_completeness` heeft, en de zin op die kaart volgt de beste bron.
- **Alternatieven:** de redactie voegt hem toe in het beheer (#1020, blijft voor spelers die geen pagina noemt).
  De selectie op Wikipedia aanvullen (een tabel met 27 kolommen die sinds ronde 4 stilstaat).
  Een toelichting op de kaart (meer tekst zonder dat de bezoeker er iets aan heeft).
  De naam van het doelpunt als naam van de speler (vaak alleen een achternaam, en dan staat er een halve naam op de kaart).
  De speler maken vóór het oordeel over een wijziging (de eerste versie van deze wijziging; een link in een verdachte wijziging maakte dan al een speler, en de reviewer wees daarop).

## In een seizoen dat voorbij is wint Wikipedia niet vanzelf van de redactie

- **Datum:** 10 november 2026
- **Besluit:** de regel dat de import na zeven dagen Wikipedia overneemt, geldt alleen voor het lopende seizoen (#1025).
  In een seizoen dat voorbij is blijft de invoer van de redactie staan tot een persoon beslist, in het beheer of met `pnpm run import:changes`.
  Wijzigingen die al wachten blijven wachten.
  De projecteigenaar besloot dat op 10 november 2026; de punten hieronder zijn de keuzes bij het bouwen.
  - **Welke wijzigingen:** elke wijziging die wacht in `match_changes`, dus een afwijking van de invoer van de redactie en ook een verdachte wijziging van een wedstrijd van Wikipedia.
    Beide vallen onder dezelfde zeven dagen (`hasStood` in `apps/importer/src/match-changes.ts`), en het issue vraagt het voor "een wachtende wijziging".
  - **Eén plek:** `takenOverAt` in `packages/db/src/match-conflicts.ts` geeft het moment waarop de import een wijziging overneemt, of niets als hij dat nooit doet.
    De import, de mail over een afwijking, het beheer, `import:status` en `import:changes` vragen het daar, dus ze zeggen hetzelfde.
  - **De grens:** een seizoen is voorbij vanaf 1 juli van het volgende, in UTC, zoals `seasonOf`.
    Het seizoen van een wijziging staat in `match_changes.season`.
    Eindigen de zeven dagen na 30 juni, dan neemt de import de wijziging ook niet over, en de teksten beloven dan geen dag.
    De teksten zeggen daarom "voorbij of bijna voorbij": in de laatste week van juni loopt het seizoen nog.
  - **Wat blijft:** een wijziging vervalt nog steeds als Wikipedia hetzelfde zegt als de invoer of de oude waarde terugzet.
    Geen wijziging wordt aangenomen, afgewezen of gesloten omdat de regel verandert, en er is geen migratie.
  - **Een pagina die als geheel wacht:** wachten er in een seizoen dat voorbij is meer dan zes wijzigingen, dan blijft de pagina vastgehouden tot iemand ze beslist.
    De zeven dagen maakten haar daar eerder vanzelf weer vrij.
  - **De teksten:** het beheer, de mail en de twee opdrachten zeggen bij een seizoen dat voorbij is dat de wijziging wacht tot iemand beslist.
    Het scherm van een vastgehouden wijziging zei dat al, ook in juli en augustus; nu klopt dat weer.
  - **De lezing van elke week:** de pauze van een week en vijf minuten blijft (`rereadEveryMs`).
    De vijf minuten waren er voor de zeven dagen en beslissen nu niets meer; ze weghalen hoort niet bij dit issue.
- **Waarom:** aan een oud seizoen werkt op Wikipedia bijna niemand meer, dus een verschil is daar eerder een fout van Wikipedia dan nieuws.
- **Alternatieven:** de regel houden zoals hij is (een goede verbetering verdwijnt na een week).
  Alle wachtende wijzigingen van afgelopen seizoenen eenmalig afwijzen (verliest werk dat nog bekeken moet worden).
  De regel alleen veranderen voor de invoer van de redactie en een verdachte wijziging van Wikipedia zelf wel overnemen (twee regels voor dezelfde zeven dagen, en het scherm van zo'n wijziging zegt al dat er niets verandert).
- **Nadeel:** een echte verbetering die Wikipedia na 30 juni doet en die iets overschrijft, komt alleen nog op de site als iemand haar aanneemt.

## Uğur Yıldırım is één persoon

- **Datum:** 10 november 2026
- **Besluit:** Ugur Yıldırım en Uğur Yıldırım zijn één persoon, en de schrijfwijze met de tekens blijft (#1027).
  De titel `Ugur Yıldırım` staat in `personTitleAliases`, en de naam `Ugur Yildirim` van de oude fansite in `oldSiteNameCorrections`.
- **Waarom:** het is de titel op Wikipedia.
- **Alternatieven:** Ugur laten staan (de persoon staat dan twee keer).

## Radoslav Samardžić is één persoon

- **Datum:** 10 november 2026
- **Besluit:** Samardžić en Samardzic zijn één persoon, en Radoslav Samardžić blijft (#1027).
  De schrijfwijze zonder accenten staat in `personTitleAliases` en in `oldSiteNameCorrections`.
- **Waarom:** het is de eigen schrijfwijze van de naam, en zo deden we het bij andere namen.
- **Alternatieven:** zonder accent.

## Jan Harm Schippers is één persoon

- **Datum:** 10 november 2026
- **Besluit:** Jan Harm Schippers en Jan-Harm Schippers zijn één persoon, en de schrijfwijze zonder streepje blijft (#1027).
  De schrijfwijze met streepje staat in `personTitleAliases` en in `oldSiteNameCorrections`.
- **Waarom:** de projecteigenaar koos de schrijfwijze van de selectie.
- **Alternatieven:** met streepje.

## Robert van den Berg is één persoon

- **Datum:** 10 november 2026
- **Besluit:** Robert van den Berg en Robert van der Berg zijn één persoon, en "van den" blijft (#1027).
  "Van der" staat in `personTitleAliases` en in `oldSiteNameCorrections`.
- **Waarom:** de projecteigenaar koos de schrijfwijze van de selectie.
- **Alternatieven:** "van der".

## Jordy Bruijn en Jordy Buijs zijn twee personen

- **Datum:** 10 november 2026
- **Besluit:** het zijn twee personen, Jordy Bruijn (1996) en Jordy Buijs (1988), die allebei voor ons speelden (#1027).
  Ze worden nooit samengevoegd en niet meer als gelijkend gemeld, ook niet in de controle van de oude fansite.
  Ze staan in de lijst `personsWhoDiffer`, samen met de paren die `oldSiteDistinctNames` had: Brian Tevreden en Brian Tevreden II, en Ruud Kool en Ruud Knol.
  `similarPersons` laat een groep weg waarvan alle titels in één groep van die lijst staan.
  Lijkt een derde persoon op hen, dan meldt de import de hele groep weer.
  De lijst staat in `packages/db/src/persons.ts` en niet bij `personTitleAliases` in de importer.
  De pagina Kwaliteit in het beheer leest hem ook, en de site gebruikt geen code van de importer.
  `apps/importer/src/person-names.ts` geeft de lijst door, zodat de importer hem daar vindt.
- **Waarom:** het zijn twee mensen met een verschillend geboortejaar, en samenvoegen op een gelijkende naam is een gok.
- **Alternatieven:** de waarschuwing laten staan (ze blijven dan elke run in de lijst).
  Een eigen lijst in de importer naast de lijst van de oude fansite (twee lijsten voor dezelfde vraag, en de pagina Kwaliteit kent ze niet).

## De import voegt de personen samen die de projecteigenaar als één persoon aanwees

- **Datum:** 10 november 2026
- **Besluit:** staat een titel in `personTitleAliases` en is hij nog een eigen persoon, dan voegt de import hem samen met de persoon van de titel die blijft (#1027).
  - **Wanneer:** aan het begin van de import van de wedstrijden, van de selectie en van een vorige selectie (`mergeListedPersons`), dus ook elk uur.
    Er is geen losse opdracht.
    Is er niets samen te voegen, dan kost het één query en meldt de run niets.
  - **Wat meegaat:** de spelers en doelpunten (`players.person_id` en `match_goals.person_id`), de titels in `person_pages`, de nationaliteiten en de posities.
    De oude titel blijft in `person_pages` staan.
    Een latere import vindt de persoon daardoor terug en maakt geen tweede.
  - **Twee rijen in één seizoen:** heeft de persoon daarna twee rijen in `players` van hetzelfde seizoen, dan worden ze één rij (`mergePlayerInto`, dat de stap `spelers` van de oude fansite ook gebruikt).
    De rij met de titel die blijft als pagina gaat voor, dan de rij uit de betere bron, dan de oudste.
    De doelpunten, de opstellingen, de seizoenscijfers en de verschillen in die cijfers gaan mee.
    Wat de rij die blijft mist (positie, rugnummer, land, pagina), neemt hij over.
    Hebben beide rijen cijfers voor dezelfde competitie en verschillen die, dan blijven de cijfers van de rij die blijft en waarschuwt de import.
    Staan beide rijen in de opstelling van dezelfde wedstrijd, dan blijft de tweede regel in het verslag staan, zonder speler.
  - **Wikidata:** het Q-nummer, het nummer van het artikel, de geboortedatum, de geboorteplaats en de linie zijn die van de persoon die blijft.
    Wat hij mist, neemt hij over van de andere.
    Hebben beide een Q-nummer, een artikel of een geboortedatum en verschillen die, dan blijft de eerste staan.
    De import geeft dan een waarschuwing met `Persons:` en beide titels, zodat de redactie ernaar kijkt.
    Bij een Q-nummer of een artikel noemt de waarschuwing beide nummers.
    Bij een geboortedatum zegt hij alleen dat de datums verschillen: een geboortedatum is een persoonsgegeven en hoort niet in het logboek.
  - **Een tabel die de andere schrijfwijze nog schrijft:** de import van de selectie en van een vorige selectie zet de pagina en de naam eerst om in de schrijfwijze die blijft (`chosenSpelling`).
    Zonder dat kreeg `Jan-Harm Schippers` een tweede rij naast `Jan Harm Schippers`, met dezelfde persoon, en kwam de oude schrijfwijze terug.
    Een naam zonder link wordt ook omgezet; een naam met een link naar een ander artikel is een ander mens en blijft zoals hij is.
  - **Een rij die de andere schrijfwijze nog heeft:** vóór het opslaan van de selectie krijgt zo'n rij van dat seizoen de schrijfwijze die blijft (`storeChosenSpellings`), en hij houdt zijn `id`.
    Heeft het seizoen al een rij in de schrijfwijze die blijft, dan gaat de andere rij daarin op (`mergePlayerInto`).
    Zonder dat vond de import de rij niet meer, omdat hij de tabel al in de nieuwe schrijfwijze las, en kwam er een tweede rij.
    De zoekterm volgt de nieuwe naam: `van den Berg`, `Samardžić`.
  - **Alleen de andere schrijfwijze bestaat:** de persoon krijgt de titel die blijft en houdt zijn `id`.
    Zijn naam wordt de naam die de import uit die titel afleidt, of die van de lijst `personNames`.
  - **De spelers van de oude fansite:** de stap `spelers` zet de naam om met `oldSiteNameCorrections` en voegt de oude rij samen met de nieuwe.
    Verschilt de oude naam alleen in accenten (`Radoslav Samardzic`), dan noemt de database het dezelfde naam (`utf8mb4_unicode_ci`) en kan er geen tweede rij komen.
    De stap geeft die rij dan de gekozen schrijfwijze, als het zijn eigen rij is: bron `verslag`, geen pagina en geen persoon.
    De zoekterm van een omgezette naam is de achternaam uit de oude tabel als de gekozen naam daarop eindigt (`Schippers`, niet `Harm Schippers`).
  - **Het logboek:** één waarschuwing per persoon, zoals `Persons: 'Ugur Yıldırım' is merged into 'Uğur Yıldırım'`, en alleen in de run die samenvoegt.
- **Waarom:** de lijst voegde alleen titels samen die nog geen persoon waren, en deze vier bestonden al twee keer.
  De titels van personen vergelijkt de database teken voor teken (`utf8mb4_bin`), dus `Ugur` en `Uğur` zijn daar twee personen.
  Met de samenvoeging in de gewone import hoeft niemand op acceptatie of productie een opdracht te draaien.
- **Alternatieven:** een migratie (kent de vier namen alleen op het moment van schrijven, en een volgend paar vraagt weer een migratie).
  Een losse opdracht (iemand moet eraan denken, op elke omgeving).
  De persoon die verdwijnt weghalen zonder om te zetten (`person_id` wordt dan leeg, en de doelpunten en spelers raken hun persoon kwijt).
  De cijfers van twee rijen optellen (de twee rijen zijn dezelfde tabel van Wikipedia, dus dat telt dubbel).
- **Later:** van twee rijen van één seizoen blijft sinds 10 november 2026 eerst de rij van de redactie, en een naam van de redactie gaat mee naar de persoon die blijft; zie _Een speler van de redactie en een speler van de import worden één rij_.
  Een rij met een naam of pagina van de redactie houdt die bij `storeChosenSpellings`.

## De redactie wint, de import stelt voor

- **Datum:** 9 november 2026
- **Besluit:** velden die de redactie zette blijven staan, en een andere waarde van de import wordt een wachtende wijziging voor de redactie (#1022).
- **Waarom:** een correctie die bij de volgende run verdwijnt, kost de redactie dezelfde moeite twee keer.
  Een stille overschrijving ziet niemand.
- **Alternatieven:** de import overschrijft (bewerkingen verdwijnen).
  Een speler van de redactie is gesloten voor de import (de import kan er geen gegevens meer aan toevoegen).

## Wat de redactie van een speler zette, schrijft de import niet over

- **Datum:** 10 november 2026
- **Besluit:** `players.editors_fields` zegt welke velden van een speler van de redactie zijn: de naam, het rugnummer, de positie en de Wikipedia-pagina (#1022, migratie `0062_add_editors_fields_of_players`).
  - **Wie zet het:** het beheer.
    Bij een speler die de redactie toevoegt, zijn dat de naam en elk veld dat is ingevuld.
    Bij een speler die de redactie aanpast, zijn dat de velden die veranderden, ook een veld dat de redactie leegmaakte.
    De migratie zet het voor wat de redactie sinds #1020 al deed, uit de bron `redactie` en de regels `player.edit` van het logboek.
  - **Wat de import doet:** hij schrijft zo'n veld nooit, en vult de andere velden aan zoals altijd.
    Dat geldt voor de import van de selectie, van een vorige selectie en voor `storeChosenSpellings`.
    Een speler met de bron `redactie` houdt die bron, blijft in de selectie als geen lijst hem heeft, en overleeft de eerste goede lezing.
    De import van de doelpuntenmakers (#1024) en de stap `spelers` van de oude fansite veranderden een bestaande rij al niet; tests houden dat zo.
    De stap `personen` raakt alleen rijen met de bron `verslag`.
  - **De naam van de persoon:** een naam met de bron `redactie` vervangt de import nooit, ook niet met een naam uit de lijst `personNames`.
  - **Een afwijking:** leest de import een andere waarde voor zo'n veld, dan wordt dat een rij in `player_field_differences`: de speler, het seizoen, het veld, de waarde van de redactie en die van de import.
    Elke run vergelijkt alle spelers van het seizoen die hij las (`holdEditorsFields`) en bewaart het resultaat in dezelfde transactie als de selectie (`keepPlayerFieldDifferences` in `@fansite/db/player-field-differences`).
    Dezelfde afwijking komt er één keer, een afwijking met andere waarden vervangt de oude, en een afwijking die weg is sluit zichzelf.
    Een veld dat een lijst niet geeft, zegt niets en is dus geen afwijking.
    Bij een vorige selectie telt elke andere waarde van een lijst, ook als die lijst het veld anders niet had vervangen.
  - **Beslissen:** in het beheer, op `/beheer/kwaliteit/<seizoen>/spelersgegevens`, naast de spelerscijfers, met een reden en een regel in het logboek (`player.field-take-over` of `player.field-keep`).
    Overnemen geeft de speler de waarde van de import, en het veld is dan niet meer van de redactie.
    Houden laat de speler zoals hij is, en dezelfde afwijking komt niet terug zolang beide waarden gelijk blijven.
    Heeft een andere speler van het seizoen de naam of de pagina al, dan weigert het beheer het overnemen.
  - **Een naam overnemen:** de rij krijgt de naam en de achternaam als zoekterm.
    Had de persoon een naam van de redactie, dan krijgt hij de naam van de import zonder delen en zonder bron, zodat de import hem later de naam van zijn artikel kan geven.
  - **Een pagina overnemen:** de speler krijgt de persoon van die pagina als we die kennen.
    Een persoon van de redactie zonder pagina krijgt de pagina.
    Anders is de speler zonder persoon tot de volgende import de persoon van de pagina vindt.
- **Waarom:** `players.source` en `persons.name_source` zeggen alleen wie de rij of de naam maakte, niet welk veld de redactie later veranderde.
  Zonder een merkteken per veld moet de import kiezen tussen alles overschrijven en niets meer aanvullen.
  Een eigen tabel past bij _Een verschil in de cijfers van een speler staat in een eigen tabel_: `match_changes` hoort bij een wedstrijd, met een deel en een voorstel als JSON, en een speler heeft geen wedstrijd.
  De regel van zeven dagen geldt hier niet: het issue zegt dat de waarde van de redactie blijft tot de redactie beslist.
- **Alternatieven:** `match_changes` gebruiken (vraagt een wedstrijd, en zijn regel van zeven dagen neemt Wikipedia vanzelf over).
  Vier kolommen met ja of nee in plaats van één lijst (vier keer dezelfde kolom, en een vijfde veld vraagt weer een kolom).
  De velden afleiden uit het logboek bij elke run (traag, en het logboek is tekst voor mensen).
  De waarde van Wikipedia bewaren naast die van de redactie, zoals `table_goals` (dan volgt de import Wikipedia weer zodra de tabel verandert, en beslist de redactie niets).
  Een lege waarde van een lijst als afwijking tellen (de lijsten van eerdere seizoenen hebben vaak geen rugnummer, dus dat geeft bij elke speler een wijziging).

## Een speler van de redactie en een speler van de import worden één rij

- **Datum:** 10 november 2026
- **Besluit:** vindt de import in een seizoen de speler die de redactie toevoegde of aanpaste, dan schrijft hij naar die rij en maakt hij geen tweede (#1022).
  - **Hoe hij hem vindt:** op de pagina, dan op de naam, en dan op de persoon (`editorsByPerson`), zoals bij een doelpuntenmaker (#1024).
    De persoon vangt een lijst op die een andere titel van hetzelfde artikel linkt.
  - **Wat blijft:** de rij van de redactie, met zijn `id`, zijn bron en de velden van de redactie.
    De import vult aan wat leeg is: het land, de positie, het rugnummer, de pagina en de persoon.
    Wijkt de pagina van de lijst af van een pagina van de redactie, dan houdt de speler ook zijn persoon.
  - **Een persoon zonder artikel:** maakte de redactie een persoon zonder pagina, en linkt de lijst voor die speler wel een pagina, dan wordt hij de persoon van die pagina (`mergeEditorsPersonInto`).
    De naam van de redactie gaat mee, en Wikidata vult daarna de geboortegegevens aan.
  - **Twee rijen van één persoon:** bij het samenvoegen van personen (#1027) en van schrijfwijzen blijft de rij van de redactie, en de andere rij gaat erin op.
    Een naam van de redactie op de persoon die verdwijnt, gaat naar de persoon die blijft.
  - **Wat niet samengaat:** een speler van de redactie zonder pagina en zonder persoon van een artikel, met een andere naam dan de lijst.
    Niets zegt dan dat het dezelfde mens is, en de import raadt niet.
- **Waarom:** twee rijen voor één speler geven twee regels op de pagina Spelers, en doelpunten die over de twee verdeeld raken.
  De redactie koos de speler bewust, dus haar rij is de rij die blijft.
- **Alternatieven:** de rij van de import houden en de velden van de redactie erheen kopiëren (de doelpunten en het verslag van de redactie wijzen dan naar een rij die verdwijnt).
  Op een naam die erop lijkt samenvoegen (twee spelers met bijna dezelfde naam bestaan, zie _Jordy Bruijn en Jordy Buijs zijn twee personen_).

## Filip Đuričić is één persoon

- **Datum:** 10 november 2026
- **Besluit:** Filip Djuričić en Filip Đuričić zijn één persoon, en de schrijfwijze Filip Đuričić blijft (#1036).
  De titel `Filip Djuričić` staat in `personTitleAliases`.
  De oude fansite heeft geen van beide schrijfwijzen als naam, dus `oldSiteNameCorrections` krijgt er geen.
  `similarPersons` krijgt geen regel voor Đ en Dj: voor één naam is de lijst met titels genoeg.
- **Waarom:** het is de titel op Wikipedia, waar de andere spelling naar doorverwijst, en het sluit aan bij de vier paren van 10 november 2026 (_Uğur Yıldırım is één persoon_).
- **Alternatieven:** Djuričić laten staan (de persoon staat dan twee keer).

## Een speler met de pagina van een andere titel krijgt de titel die blijft

- **Datum:** 10 november 2026
- **Besluit:** staat de pagina van een rij in `players` in `personTitleAliases` als andere titel, dan krijgt de rij de pagina, de naam en de zoekterm van de titel die blijft (#1036).
  Heeft het seizoen al een rij met die pagina of die naam, dan worden de twee één rij (`mergePlayerInto`).
  Het gebeurt aan het begin van elke import van wedstrijden of een selectie, in `mergeListedPersons`, en een tweede run verandert niets.
- **Waarom:** #1038 voegde alleen personen samen.
  Een doelpuntenmaker die Wikipedia onder de doorverwijzing linkt (`Filip Djuričić`) heeft al de persoon van de titel die blijft, want de personenlijst volgt de doorverwijzing.
  Er was dus geen persoon om samen te voegen, en zijn rij van 2010/11 bleef de oude spelling houden.
- **Alternatieven:** de rij alleen veranderen bij het maken in `adoptScorers` (een rij die al bestaat blijft dan fout).

## De rij van de volledigheid staat ook voor een seizoen zonder selectiepagina

- **Datum:** 10 november 2026
- **Besluit:** de beoordeling van de selectie (`squadCompleteness` en `storeCompleteness`) staat in `packages/db` (`squad-completeness.ts` en `store-completeness.ts`), zodat de importer en Beheer haar op dezelfde manier uitrekenen (#1040).
  De import van wedstrijden rekent de rij van het seizoen uit bij elke lezing, niet alleen als er een speler uit een doelpunt bij komt.
  Een rij die niet verandert, wordt niet herschreven.
  Een seizoen met een selectiepagina houdt zijn hogere niveau, want de beoordeling neemt het beste plafond.
- **Waarom:** de beoordeling blijft de enige plek die zegt hoe compleet een lijst is, en de kaart leest haar alleen.
  Voor 2025/26 bestaat geen pagina op Wikipedia (#1037), dus er was nooit een rij, en de kaart verborg 18 bekende spelers.
  Elke lezing, omdat een seizoen dat zijn spelers kreeg vóór deze regel anders pas een rij krijgt bij de volgende speler uit een doelpunt.
- **Alternatieven:** de kaart laat spelers ook zonder rij zien (twee plekken die beslissen); de code in de importer laten en Beheer de importer laten aanroepen (een app die een andere app importeert).

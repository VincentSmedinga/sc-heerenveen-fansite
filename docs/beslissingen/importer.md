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

## De eerste goede lezing van de selectie vervangt de verzonnen selectie

- **Datum:** 27 oktober 2026
- **Besluit:** de eerste goede lezing van de selectie van een seizoen haalt eerst de spelers van dat seizoen weg, en zet dan de spelers van Wikipedia erin.
  Daarna werkt de import de selectie alleen nog bij.
- **Waarom:** de seed zet een verzonnen selectie, zoals bij de verzonnen wedstrijden.
  Zonder deze regel bleven die spelers voor altijd staan als "niet meer in de selectie", en kon een doelpunt van een echte speler op een verzonnen speler met dezelfde achternaam vallen.
  De import herkent de eerste goede lezing eraan dat `squad_imports` nog geen geslaagde lezing heeft.
- **Alternatieven:** de verzonnen spelers laten staan (rommel in de tabel en kans op een verkeerde koppeling); de verzonnen spelers een eigen seizoen geven (de pagina's tonen dan niets in het lopende seizoen, zoals bij de verzonnen wedstrijden).

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
- **Later:** zie _Een wijziging van Wikipedia krijgt een betrouwbaarheid, en een verdachte wijziging wacht_.
  Een seizoen dat al in de database staat, verandert niet zomaar meer: een verschil dat iets overschrijft wacht bij een tweede lezing tot een mens besluit (`pnpm run import:changes`) of tot de opdracht het na zeven dagen weer leest.
  Een eerste lezing en een lezing zonder verschil werken zoals hier staat.

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
- **Alternatieven:** een aparte tabel met aanpassingen die elke query eroverheen legt (veel plekken en een groot risico op vergeten); de gelezen waarde overschrijven zonder markering (de volgende import maakt de verbetering ongedaan, en niemand ziet wat van de redactie is).

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
- **Later:** zie _De play-offs voor de Europa League zijn een eigen competitie, naast die voor de Conference League_ (3 november 2026): de import leest ze nu, als competitie `Play-offs Europa League`, voor de seizoenen 2010/11 tot en met 2019/20.
  Voor de seizoenen voor 2020/21 staat er nu wel een titel voor de play-offs.
- **Later:** zie _Een puntenaftrek staat in een kolom van `standings`, komt uit de kolom `PA` en telt mee in `checkStandings`_ (3 november 2026).
  Een aftrek in de kolom `PA` is geen fout meer, en 2010/11, 2014/15 en 2015/16 zijn geen gat meer door de aftrek.
- **Later:** zie _Een gestaakte wedstrijd die onder een inhaalronde wordt afgemaakt, is één wedstrijd_ (3 november 2026): 2011/12 is geen gat meer.
  De zin onder **Waarom** over 2011/12 en de zin onder **Nadeel** hierboven gelden niet meer: de wedstrijd Excelsior – AZ is in de rust gestaakt en later alleen in de tweede helft afgemaakt, niet helemaal opnieuw gespeeld.
  `checkResults` is niet veranderd.

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
  Een wedstrijd die helemaal opnieuw is gespeeld, krijgt geen regel en blijft een fout.
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
- **Alternatieven:** de lijst `clubFullNames` uitbreiden met titels van artikelen (geen verzoeken en geen tabel, maar elk nieuw paar blijft een dubbele club tot iemand het ziet); doorverwijzingen alleen controleren bij het zoeken naar dubbele clubs (de club bestaat dan al en de pagina's tonen hem dubbel); een titel zonder artikel als 404 laten doorgaan (dat is een gok, en een fout valt op).

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

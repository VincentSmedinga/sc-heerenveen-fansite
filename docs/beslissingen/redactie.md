# Redactie

## sc Heerenveen met kleine letters

- **Datum:** 20 oktober 2026
- **Besluit:** we schrijven de club altijd als sc Heerenveen, met een kleine s en c, ook aan het begin van een zin en in de sitenaam sc Heerenveen Fansite.
  Waar het woordmerk kapitalen toont, blijft de tekst erachter "sc", voor schermlezers en wie de tekst kopieert.
- **Uitzonderingen:** koppen uit de media citeren we zoals ze zijn gepubliceerd, ook met SC Heerenveen.
  Oude namen van de site blijven zoals ze waren, zoals SC Heerenveen Online (1997–98).
- **Waarom:** zo schrijft de club zichzelf.
  Koppen van anderen delen we; die passen we niet aan.
- **Alternatieven:** SC Heerenveen met hoofdletters, zoals in veel koppen uit de media.

## Standaard alleen kop, link en bronnaam

- **Datum:** 20 oktober 2026
- **Besluit:** vier principes gelden voor alles wat we van anderen tonen:
  - standaard alleen de kop, de link en de naam van de bron, met de tijd van publicatie;
  - intro's en foto's alleen met toestemming van de bron;
  - geen verzoeken naar derden: een pagina laadt niets van een ander domein;
  - bij alles de bron vermelden.
- **Waar:** de principes en een korte checklist voor de reviewer staan in het hoofdstuk Redactie van Storybook.
  Wat per bron mag, komt in het bronnenregister (#9); de principes leggen uit waarom.
  De schrijfwijzer volgt in #19.
- **Waarom:** een kop en een link sturen de lezer naar de journalist, en een samenvatting of foto kan dat bezoek vervangen.
  Tekst en foto's zijn van de maker.
  En een verzoek naar een ander domein vertelt dat domein wie onze pagina bekijkt.
  De principes stonden verspreid over issues; de reviewer en nieuwe vrijwilligers vinden ze nu op één plek.
- **Alternatieven:** korte intro's standaard tonen, zoals veel nieuwsverzamelaars doen.
  Of de principes in `docs/`, naast de checklist voor toegankelijkheid; maar Storybook is ook het handboek voor wie schrijft.
- **Later:** zie _De toon en de schrijfwijzer staan in het hoofdstuk Redactie_: de schrijfwijzer staat nu in het hoofdstuk, in plaats van in #19.

## De pagina 'Onze bronnen' toont per bron een beschrijving, niet wat we tonen

- **Datum:** 22 oktober 2026
- **Besluit:** de pagina zegt in één zin dat dit de bronnen zijn waar we het nieuws vandaan halen.
  Per bron staan er de naam als link naar de website en een beschrijving van een of twee zinnen, per soort onder een kop.
  Wat we van een bron tonen, en de toestemming, staan er niet.
- **Hoe:** de beschrijving staat in het register, in de kolom `description` van `sources` (hoogstens 300 tekens).
  We schrijven haar zelf, in eigen woorden.
  Later: de beschrijving van een podcast is de tekst van de maker uit zijn feed (zie _De beschrijving van een podcast is die van de maker_).
  `listEnabledSources` in `@fansite/db/queries` haalt alleen de naam, het domein, de soort en de beschrijving op, dus het beleid en de toestemming komen niet bij een pagina.
- **Waarom:** bezoekers hoeven niet te lezen wat we wel of niet van een bron tonen; dat zien ze zelf.
  Een korte beschrijving zegt wat de bron is, en dat helpt bij het kiezen.
  De toestemming beschrijft ons contact met de bron, en dat is niet aan de pagina.
- **Alternatieven:** per bron in gewone taal zeggen wat we tonen, zoals "kop, link en bronnaam", met één plek die het beleid in die tekst omzet.
  Zo stond het eerst in #70.
  Of ook de toestemmingsstatus tonen; dat laat zien wie we hebben gevraagd en wie nog niet heeft geantwoord.
  Of de beschrijvingen in de code van de site zetten; dan staat een bron op twee plekken, en kan het beheer (#30) ze niet aanpassen.

## Een bericht achter de betaalmuur krijgt de tekst "voor abonnees"

- **Datum:** 22 oktober 2026
- **Besluit:** staat een bericht achter de betaalmuur, dan staat er "voor abonnees" bij, in tekst.
- **Waarom:** de bezoeker weet dan vóór de klik dat hij een abonnement nodig heeft.
  De importer bewaart het al, en het is geen inhoud van de bron.
  Tekst werkt ook voor een schermlezer en zonder kleur.
- **Alternatieven:** de betaalmuur niet tonen.
  Of alleen een pictogram.

## De redactie is het aanspreekpunt, en pakt een verwijderverzoek zo snel mogelijk op

- **Datum:** 22 oktober 2026
- **Besluit:** het aanspreekpunt voor bezoekers, uitgevers en de privacyverklaring is "De redactie van de sc Heerenveen Fansite", op fansite@heerenveen.org.
  Een verwijderverzoek pakken we zo snel mogelijk op, zonder vaste termijn.
- **Waarom:** de site is van een groep supporters, niet van één persoon.
  Een vaste termijn kunnen vrijwilligers niet altijd halen, en een belofte die we niet houden, kost meer vertrouwen dan geen getal.
- **Alternatieven:** de projecteigenaar bij naam als verantwoordelijke; dat is voor de AVG herkenbaarder.
  Of een vaste termijn, zoals twee werkdagen of een week.

## Elke tekststijl een stap groter

- **Datum:** 22 oktober 2026
- **Besluit:** Tekst is 18 pixels, Nieuwskop 20 (op een smal scherm 19), Meta 16 en Label 15.
  De koppen en het woordmerk blijven gelijk, en de regelafstanden houden dezelfde verhoudingen.
- **Waarom:** in de hoofdkolom van 48 rem telt een regel bij 17 pixels zo'n 96 tekens.
  Groter leest prettiger en past bij een site die iedereen moet kunnen lezen.
  Eén stap houdt de verhoudingen tussen de stijlen, en de koppen zijn al groot genoeg.
- **Alternatieven:** twee stappen, met Tekst op 19 pixels; dan passen er nog minder woorden in een kaart.
  Of alles, de koppen en het woordmerk inbegrepen, 12,5% groter.
- **Later:** zie _Kleinere koppen en vaste tekstmaten_.
  Daar worden de koppen kleiner en krijgt de tekst vaste maten.

## Het nieuws staat in één lijst, met dag en tijd in een eigen kolom

- **Datum:** 22 oktober 2026
- **Besluit:** de homepage toont het nieuws van de week in één lijst, het nieuwste bovenaan, zonder kop per dag.
  Elke regel heeft links de korte dag en de tijd in rood, zoals "wo 14:05", dan de kop en daaronder de bron, met een dunne lijn tussen de regels, zoals op de artboard.
- **Waarom:** zo ziet het blok eruit zoals ontworpen, en leest een bezoeker de koppen achter elkaar.
  De lijst beslaat vandaag en de zes dagen ervoor, dus een weekdag komt maar één keer voor en is altijd duidelijk.
  Dag en tijd blijven kloppen in een pagina uit de cache.
- **Alternatieven:** de kop per dag houden, zoals #73 deed.
  Of zoals op de artboard: dag en tijd voor vandaag en dag en datum voor oudere berichten, zoals "za 17/10"; dan toont een pagina uit de cache rond middernacht even een tijd zonder datum.
- **Later:** zie _De homepage toont het nieuws van twee weken_ en _De tijd van een bericht: een weekdag in de week, daarna de datum_.
  De lijst blijft, maar beslaat nu twee weken, en een weekdag staat er alleen voor de laatste zeven dagen.

## De footer staat op een eigen vlak, met links in donker zand

- **Datum:** 23 oktober 2026
- **Besluit:** de footer heeft een eigen vlak van rand tot rand: in licht `grey-200`, in donker `blue-900`.
  Bovenaan staat een lijn in `grey-300` en `blue-700`.
  De twee zinnen staan onder elkaar, met de links rechts ervan; op een smal scherm staan de links eronder.
  De links zijn donker zand: `sand-700` in licht, `sand-300` in donker.
- **Waarom:** het vlak sluit de pagina af, zoals de header hem opent.
  Een stap donkerder dan de pagina is rustig en houdt de tekst goed leesbaar.
  Met de zinnen onder elkaar en de links rechts is de footer lager en sneller te overzien.
  Donker zand past bij het vlak en maakt de footer rustiger dan de rest van de pagina; de onderstreping laat zien dat het links zijn.
- **Hoe:** twee nieuwe rollen geven het vlak en de lijn hun kleur: `--hf-colour-background-footer` en `--hf-colour-border-footer`.
  De reeks zand krijgt een stap `sand-700` (`#52462d`): zo licht als `grey-700`, met 0,042 chroma en tint 85°.
  Ook de links hebben twee rollen: `--hf-colour-text-link-on-footer` en, onder de muis, `--hf-colour-text-link-hover-on-footer` (`grey-900` in licht, `sand-100` in donker).
  De `Page.Footer` zet daarmee de kleuren van links voor alles wat erin staat, zoals de `Page.Header` dat doet; een bezochte link krijgt de kleur van een gewone link.
  De twee zinnen zijn elk een eigen `Text`, want de sjablonen van de site bevatten geen HTML, dus ook geen `br` (zie _Sjablonen bevatten geen HTML, alleen componenten uit het designsysteem_).
  Daarom is de `Page.Footer` een raster.
  Op een smal scherm heeft het één kolom, met de links onder de tekst.
  Vanaf 40 rem, net als bij de kaart, staan de links in een tweede kolom rechts, over de twee regels en in het midden.
  De tekst haalt 4,85:1 in licht en 10,65:1 in donker, de links 6,95:1 en 9,47:1, en de focusrand 3,52:1 en 7,90:1.
  Het contrast staat bij Tokens › Kleur in Storybook.
- **Alternatieven:** de footer op de achtergrond van de pagina met alleen een lijn erboven, zoals eerst.
  Of het vlak alleen in de kolom; dan ziet het eruit als een losse kaart.
  Of blauwe links, zoals op de rest van de site; dat vraagt geen nieuwe tokens, maar de footer valt dan meer op.
  Of één alinea met een `br` tussen de zinnen, zodat de links naar de volgende regel gaan zodra ze niet meer passen, zoals in de header.
  Dan moet de ESLint-regel `br` toestaan, of krijgt het designsysteem een component voor een regeleinde.
- **Later:** zie _De links in de footer zijn blauw, zoals de andere links_; de kleur van de links is daarmee vervangen.
  De lijn bovenaan en de rol `--hf-colour-border-footer` zijn daarna weggehaald; zie _De footer heeft geen lijn bovenaan_.

## Metadata, sitemap en canonieke URL's gebruiken het adres van de eigen omgeving

- **Datum:** 23 oktober 2026
- **Besluit:** de canonieke URL's, `og:url`, `og:image` en `/sitemap.xml` beginnen met het adres van de omgeving waar de site draait (`originOf()`), niet alleen met dat van productie.
  `robots.txt` verwijst alleen op productie naar de sitemap.
  Op acceptatie en lokaal blijft hij alles weigeren, zonder verwijzing.
- **Waarom:** de rooktest kan het dan op acceptatie controleren, en de code is op productie dezelfde.
- **Alternatieven:** alleen op productie een sitemap en canonieke URL's; dat laat de code ongetest tot de lancering.
- **Hoe:** de pagina's staan in `apps/site/src/pages.ts`, met hun beschrijving.
  De sitemap, de metadata en de rooktest lezen die lijst.
  `sitemap.test.ts` faalt als er een `page.tsx` in `src/app` staat die niet in de lijst staat en niet in de lijst met uitzonderingen in die test.
  Alle vier de pagina's zijn nu `force-dynamic`: `originOf()` leest `SITE_ENV` als de server draait, en Next.js zou het adres van de build in een statische pagina zetten.
  Voor Over ons en Wat is er nieuw maakt dat niets uit voor bezoekers, want de pagina's zijn klein en de versies komen nog steeds uit de build.
  De sitemap bevat alleen `loc`: geen `lastmod`, `changefreq` of `priority`.
- **Later:** de pagina heet nu Updates en staat op `/updates`; zie _De pagina Wat is er nieuw heet Updates, op `/updates`_.
- **Later:** de sitemap heeft ook een regel voor elk gepubliceerd artikel van de redactie, uit de database; zie _Een artikel is gepubliceerd als `published_at` gevuld is en niet na nu ligt_.
  Alleen de lijst met pagina's in `pages.ts` blijft de lijst van vaste pagina's.

## Het schild van de site, als PNG van ons eigen domein, is de afbeelding bij het delen van links

- **Datum:** 23 oktober 2026
- **Besluit:** het schild van de site, als PNG van ons eigen domein, is de afbeelding bij het delen van links.
- **Waarom:** een gedeelde link toont dan meer dan tekst, zonder foto van een ander of een verzoek naar een derde.
  Veel diensten voor het tonen van links accepteren geen SVG, dus het wordt een PNG.
- **Alternatieven:** geen afbeelding (alleen tekst bij het delen); de SVG zelf (wordt vaak niet getoond).
- **Hoe:** `pnpm --filter site share-image` maakt `apps/site/public/share-image.png` (1200 bij 630 pixels) met het Chromium van Playwright: het schild uit `packages/design-system/src/assets/logo.svg`, in het midden op het donkerblauw van de header.
  We maken de PNG één keer en zetten hem in de repository; het script is er alleen voor als het logo verandert.
  Het officiële clublogo staat er niet op.
  `assemble` kopieert `public` mee naar de map voor de host, want Next.js laat die weg uit de standalone build.
  De Content Security Policy staat de afbeelding toe: `img-src 'self'`.

## Twee kleine afwijkingen van het issue bij de metadata

- **Datum:** 23 oktober 2026
- **Besluit:** de beschrijving van Wat is er nieuw is langer dan het voorstel in het issue, en de pagina's hebben `twitter:`-tags die we niet zelf zetten.
  De beschrijving is "Wat er nieuw is op de sc Heerenveen Fansite, per versie: wat je er nu kunt vinden en doen."
- **Waarom:** het voorstel ("Wat er nieuw is op de sc Heerenveen Fansite, per versie.") heeft 56 tekens, en het criterium vraagt 70 tot 160.
  Next.js kopieert de Open Graph-tags naar `twitter:`-tags zodra een pagina Open Graph-tags heeft, en heeft geen manier om dat uit te zetten (`postProcessMetadata` in Next.js).
  We zetten zelf geen `twitter`-sleutel in de metadata, en een test controleert dat; de tags in de HTML komen van Next.js.
- **Alternatieven:** de beschrijving van 56 tekens laten staan en de test versoepelen.
  Of de Open Graph-tags als losse `<meta>`-elementen in elke pagina zetten, buiten de metadata van Next.js om; dat zijn extra regels in elke pagina en de tags staan dan niet meer bij de rest van de metadata.
- **Later:** de pagina heet nu Updates en staat op `/updates`; zie _De pagina Wat is er nieuw heet Updates, op `/updates`_.

## De zijbalk kan onder een inleiding beginnen, met benoemde gebieden en een subgrid

- **Datum:** 23 oktober 2026
- **Besluit:** `Page.Main` krijgt een eigenschap `intro` voor een inleiding, zoals de kop en de inleiding van een pagina.
  Op een breed scherm begint de zijbalk onder die inleiding, naast de eerste cel eronder.
  De inleiding is zo breed als de hoofdkolom.
  `Page.Body` tekent die opbouw met benoemde gebieden, en `Page.Main` is dan een subgrid in de rijen, met de inleiding en de cellen elk in een eigen `div`.
- **Waarom:** de `h1` moet in de `main` blijven, want met de landmarks sla je het menu over (2.4.1).
  De `aside` moet buiten de `main` blijven.
  axe controleert allebei, met `region` en `landmark-complementary-is-top-level`.
  Alleen met een subgrid weet `Page.Body` dan hoe hoog de inleiding is.
  Een subgrid zet elk kind in een eigen rij, dus de cellen eronder staan samen in één `div`.
  De eigenschap zet die `div` er zelf omheen, zodat een pagina hem niet kan vergeten.
  Benoemde gebieden laten de opbouw zien als een tekening.
  Met regelnummers, `grid-row: 2` op de zijbalk, sprong de zijbalk in Chromium en WebKit naar de eerste kolom: een raster plaatst een item met een vaste rij als eerste.
  Een inleiding zo breed als de hoofdkolom houdt de regels zo lang als _Een pagina van 64 rem, met kolommen van 36, 4 en 24 rem_ koos.
- **Hoe:** `:has()` kiest de opbouw, dus een pagina zonder inleiding houdt het raster van nu.
  Op een smal scherm zijn er geen gebieden nodig: de zijbalk volgt in de bron op de `main` en staat daaronder.
  Alleen een `Page.Body` met een inleiding krijgt gebieden, want een leeg gebied houdt zijn rij en zijn ruimte.
  De `main` beslaat beide rijen, dus een pagina met een inleiding maar zonder zijbalk heeft niets leeg: de cellen staan onder de inleiding zoals onder een eerste cel.
  Staan er geen cellen onder de inleiding, zoals op Onze bronnen zonder bronnen, dan laat `page.css` de lege `div` voor de cellen weg en beslaat de `main` één rij: de zijbalk staat dan één tussenruimte onder de inleiding, niet twee.
- **Alternatieven:** een inleiding over de volle breedte, met `Page.Main` als subgrid in beide richtingen.
  Die werkt, maar de `main` ligt dan onder de zijbalk, en een lange inleiding loopt over de hele pagina.
  Of de inleiding naast de `main` in `Page.Body`; dan staan de `h1` en de inleiding buiten de landmarks.
  Of `Page.Body` als de `main`; dan staat de `aside` in de `main`.
  Of een onderdeel `Page.Intro`, met een tweede onderdeel om de cellen; dan schrijft elke pagina die twee zelf.
  Of een vaste marge boven de zijbalk; die klopt niet meer bij een langere inleiding of als je inzoomt.

## We tonen de schermnaam van de laatste reageerder, als gewone tekst

- **Datum:** 23 oktober 2026
- **Besluit:** het blok toont de schermnaam van de laatste reageerder, zonder avatar en zonder link naar een profiel.
  De importer bewaart alleen de naam bij de vier discussies in het blok en vervangt ze bij elke run.
- **Waarom:** een gast ziet die naam al op het forum, en het blok laat de bezoeker zien dat er gepraat wordt.
  Door de lijst bij elke run te vervangen, houden we geen geschiedenis van namen bij, en verdwijnt een naam binnen een kwartier nadat het forum hem weghaalt.
- **Alternatieven:** geen naam tonen, alleen de reacties en de tijd.

## Ons eigen forum is een bron met eigen regels

- **Datum:** 23 oktober 2026
- **Besluit:** het forum staat in het bronnenregister als bron van het soort forum, "sc Heerenveen Forum", en dus op Onze bronnen.
  In het hoofdstuk Redactie staat wat we ervan tonen: de titel, de link, het aantal reacties, de schermnaam van de laatste reageerder en de tijd.
  De tekst van een bericht tonen we niet; citaten komen met #108.
- **Waarom:** het forum is van onze eigen gemeenschap, geen werk van journalisten, dus de regels over intro's en foto's passen er niet op.
  Een bezoeker kan wel zien waar het blok vandaan komt, en de reviewer heeft een regel om aan te toetsen.
- **Alternatieven:** het forum niet in het register zetten en het blok vastleggen in de code; dan staat nergens wat we ervan tonen.
  Of het forum niet op Onze bronnen tonen; dat vraagt een extra schakelaar in het register en op de pagina.

## De link van een discussie gaat naar het laatste bericht

- **Datum:** 24 oktober 2026
- **Besluit:** de titel in het blok linkt naar het laatste bericht van de discussie, zoals `https://forum.heerenveen.org/d/2859-<titel>/9`.
  De importer bewaart het adres met het nummer van het laatste bericht erin.
- **Waarom:** de regel zegt wie het laatst reageerde en wanneer, en de link brengt de bezoeker bij dat bericht.
  Het forum zelf opent een discussie bij het eerste ongelezen bericht, maar dat weet het alleen in de browser van een ingelogd lid, en onze pagina vraagt het forum niets (principe 3).
  Het forum is nog rustig, dus een bezoeker slaat niet veel ongelezen berichten over, en kan terugscrollen.
- **Hoe:** het nummer is het attribuut `lastPostNumber` van de API.
  Het is hoger dan het aantal berichten als er een bericht is verwijderd, dus de importer telt het niet zelf.
  Heeft het antwoord geen bruikbaar nummer, dan linkt het adres naar de discussie zelf.
  Het adres verandert nu met elk nieuw bericht, dus de import herkent een discussie aan het id en niet aan het adres.
- **Alternatieven:** naar het begin van de discussie linken, zoals eerst.
  Of het forum laten kiezen: een extensie of instelling op het forum die ingelogde leden bij het eerste ongelezen bericht laat beginnen, voor elke link naar het forum.

## De tijd van een discussie: vandaag alleen de tijd, daarna de dag, na een week de datum

- **Datum:** 24 oktober 2026
- **Besluit:** van een discussie van vandaag staat alleen de tijd, zoals "13:28".
  Van de zes dagen daarvoor staan de korte dag en de tijd, zoals bij het nieuws: "wo 14:05".
  Wat ouder is, krijgt de datum: "16 okt", en met het jaar erbij als het een ander jaar is.
  Zonder schermnaam staat er "83 reacties · laatst 13:28".
- **Waarom:** in een smalle zijbalk past weinig, en de tijd alleen is genoeg voor wat van vandaag is.
  Dezelfde week als bij het nieuws houdt de site voorspelbaar, en een weekdag zou na een week voor een andere dag kunnen staan.
  "laatst" laat de tijd ook zonder schermnaam zeggen waarvan hij is.
- **Alternatieven:** altijd dag en tijd; dat is drukker en zegt over vandaag minder.
  Of een relatieve tijd, zoals "2 uur geleden"; die klopt niet meer in een pagina uit de cache en een schermlezer leest hem minder gemakkelijk.
- **Later:** de homepage toont nu twee weken nieuws, maar de weekdag staat bij het nieuws nog voor dezelfde zeven dagen als hier.
  Zie _De tijd van een bericht: een weekdag in de week, daarna de datum_.
  De tijd van een discussie verandert niet.
- **Later:** van een discussie van meer dan zeven dagen staan de korte dag en de datum, zoals "wo 16 okt" (29 oktober 2026).
  Zie _Een publicatiedatum van meer dan een week oud is de korte dag en de datum, zonder tijd_.

## De homepage toont het nieuws van twee weken

- **Datum:** 24 oktober 2026
- **Besluit:** de homepage toont alle berichten van vandaag en de dertien dagen ervoor, in Nederlandse tijd, het nieuwste eerst, zonder maximum, in één lijst.
- **Waarom:** met een paar bronnen komen er per week weinig berichten bij, en een bezoeker die een paar dagen niet keek, ziet zo meer.
  Wachten op het archief (#26) laat de homepage tot Release 2 bij een week.
- **Alternatieven:** een week houden en een pagina met meer nieuws bouwen (#26); dat is groter en komt later.
  Of een vast aantal, zoals de nieuwste 20 of 50, wat we eerder al afwezen.
- **Later:** zie _De homepage toont het nieuws van de afgelopen week, per dag_ en _Het nieuws staat in één lijst, met dag en tijd in een eigen kolom_; van die twee blijft de lijst en vervalt de week.
- **Later:** zie _Het nieuws heeft geen grens in de tijd, en een grens van 100 koppen_; de twee weken vervallen.

## De tijd van een bericht: een weekdag in de week, daarna de datum

- **Datum:** 24 oktober 2026
- **Besluit:** van een bericht van vandaag en de zes dagen ervoor staan de korte dag en de tijd ("wo 14:05"); van een ouder bericht de datum en de tijd ("14 okt 14:05").
- **Waarom:** een weekdag is alleen duidelijk binnen zeven dagen; bij veertien dagen kan "wo" twee verschillende woensdagen zijn.
  De datum voor wat ouder is, houdt de regel van de discussies in de zijbalk aan (daar staat "16 okt" na een week).
  Dag en tijd blijven kloppen in een pagina uit de cache.
- **Alternatieven:** op elke regel de datum en de tijd; dat is altijd duidelijk, maar langer, en de weekdag helpt bij recent nieuws.
  Of de weekdag voor alles; dat is dubbelzinnig vanaf de achtste dag.
- **Hoe:** `news.ts` kent twee vensters: `windowStart` voor de twee weken van de homepage en `weekdayStart` voor de zeven dagen met een weekdag.
  De tijd van een discussie gebruikt `weekdayStart`, dus die regel verandert niet.
- **Later:** van een bericht van meer dan zeven dagen staan de korte dag en de datum, zonder tijd: "wo 21 okt" (29 oktober 2026).
  De weekdag staat dan wel bij de datum, dus de reden dat "wo" twee woensdagen kan zijn, geldt niet meer.
  Zie _Een publicatiedatum van meer dan een week oud is de korte dag en de datum, zonder tijd_.

## Een datum in een nieuwsregel breekt in de kolom van de weekdag

- **Datum:** 24 oktober 2026
- **Besluit:** de kolom met de dag of de datum en de tijd blijft 4 rem breed.
  Een datum met een tijd, zoals "14 okt 14:05", past niet naast elkaar in die kolom: de tijd komt op een tweede regel, onder de datum.
- **Waarom:** een kolom die breed genoeg is voor "28 mei 20:08" (87 pixels op de maat van Meta) geeft de weekdagen veel lucht naast de kop, terwijl de meeste regels een weekdag hebben.
  Nu beginnen de koppen op elke regel op dezelfde plek, ook als de ene regel een weekdag heeft en de andere een datum, en het breken gaat vanzelf, zonder extra opmaak in de tekst.
- **Hoe:** in `news-item.css` is `grid-template-columns` nu `4rem minmax(0, 1fr)`, en de tijd heeft geen `white-space: nowrap` meer.
  Een breder lettertype of de tekstafstand van WCAG 1.4.12 kan nu ook "ma 20:08" over twee regels verdelen; de koppen blijven dan wel op één plek beginnen.
- **Alternatieven:** een bredere kolom, 5,75 rem, voor de breedste datum op één regel; dat kost elke weekdagregel ruimte.
  Of de kolom door de inhoud laten bepalen (`max-content`); dan beginnen de koppen niet op dezelfde plek.
  Of de datum en de tijd los doorgeven en onder elkaar zetten in het component; dat is een grotere wijziging van het component.
- **Later:** de kolom is 4,5 rem breed, voor de korte dag met de datum, zoals "ma 10 mei" (29 oktober 2026).
  Zie _Een publicatiedatum van meer dan een week oud is de korte dag en de datum, zonder tijd_.

## Onder de kop van een kaart staat een lijst op 1,25 rem

- **Datum:** 24 oktober 2026
- **Besluit:** staat er in een kaart direct onder de kop een lijst (`ul`, `ol` of `dl`), dan is de ruimte tussen de kop en de lijst 1,25 rem in plaats van de 0,75 rem onder een kop.
  Dat geldt voor elke kaart met dit patroon: het nieuws en de discussies op de homepage, de bronnen op Onze bronnen en de stories.
- **Waarom:** de regels van een lijst zijn zelf blokken met een eigen witruimte, en met de ruimte van een alinea zit de eerste regel te dicht tegen de kop.
  De projecteigenaar vroeg om meer ruimte.
- **Hoe:** één regel in `card.css`, op de kop gevolgd door een lijst direct in de kaart.
  De marges van kop en lijst vallen samen, dus de grootste telt.
  Tekst onder een kop houdt de ruimte van een kop.
- **Alternatieven:** de ruimte onder elke kop groter maken; dat verandert ook tekst en pagina's zonder kaart.
  Of de ruimte in elke lijst of op elke pagina zelf zetten; dat laat het patroon uit elkaar lopen.
- **Later:** zie _Ruimte komt uit vijf stappen, met gemiddeld als vaste keuze_ (31 oktober 2026): de ruimte is `--hf-space-l` (1,5 rem), niet 1,25 rem.
  Ze blijft groter dan de ruimte van tekst onder een kop, ook als die ruimte een token wordt.
  Sinds 31 oktober 2026 staat onder elke kop `--hf-space-l` en is de regel in `card.css` weg; zie _Onder koppen en onder grote bouwstenen staat de grote ruimte_.

## De site is installeerbaar, zonder service worker

- **Datum:** 24 oktober 2026
- **Besluit:** de site krijgt een favicon en een manifest, zodat hij als app te installeren is.
  Er komt geen service worker, dus geen offline gebruik en geen pushmeldingen.
- **Waarom:** het icoon op het beginscherm en een eigen venster kosten weinig, en er is geen risico op pagina's die in de cache verouderen.
  Bij een nieuwsverzamelaar zonder de artikelen zelf is offline lezen van koppen weinig waard.
  Pushmeldingen vragen een sleutel, het bewaren van abonnementen (persoonsgegevens) en sturen elk bericht via de pushdienst van Google, Apple of Mozilla.
  Dat past niet bij "we laten bezoekers met rust".
- **Alternatieven:** een service worker die de homepage bewaart voor offline gebruik; daarover besluiten we later.
  Of pushmeldingen; die doen we niet.

## Het icoon is het logo zelf, transparant, en op donkerblauw waar het moet

- **Datum:** 24 oktober 2026
- **Besluit:** de bron van het icoon is het logo, `logo.svg`, zonder aanpassing: het schild met het pompeblêd van het logo, op een transparante achtergrond.
  Voor de iPhone en voor het afgesneden icoon van Android staat het schild op een vlak van het donkere blauw van de kop.
- **Waarom:** de projecteigenaar wil dat de iconen precies lijken op het logo.
  Een eigen tekening met een groter pompeblêd, die we eerst maakten, vond hij te groot en misvormd.
  Een iPhone vult een transparant icoon met zwart, en een afgesneden icoon van Android heeft een vlak nodig; de witte rand van het schild is gemaakt voor een donkere achtergrond, dus het blauw past.
  Eén icoon voor licht en donker volstaat door de witte en de blauwe rand.
- **Alternatieven:** een eigen tekening voor kleine formaten, met een groter pompeblêd dat op 16 pixels herkenbaar blijft.
  Die hadden we gebouwd en is laten vallen.
  Of een wit vlak; dan verdwijnt de witte rand van het schild.
  Of overal transparant; dan hangt de kleur af van de telefoon.
- **Hoe:** `pnpm --filter site icons` maakt de bestanden in `apps/site/public` met het Chromium van Playwright: `icon.svg` (een kopie van het logo), `favicon.ico` met PNG's van 16, 32 en 48 pixels, `icon-192.png` en `icon-512.png` (transparant), `apple-touch-icon.png` (180 bij 180) en `icon-maskable-512.png`.
  Op het vlak is het logo 88% van de breedte, dus het schild 76% van de hoogte: het afgesneden icoon van Android houdt zijn inhoud binnen een cirkel van 80% van de breedte, en de hoeken van het schild liggen het verst van het midden.
  De bestanden staan in de repository, zoals de afbeelding bij het delen van links.

## Het donkerblauw van het icoon en het manifest komt uit het token van de kop

- **Datum:** 24 oktober 2026
- **Besluit:** het vlak van de iconen, `theme_color` en `background_color` van het manifest zijn de lichte waarde van `--hf-colour-background-header`.
  De `theme-color` van de pagina volgt de kop in licht en in donker: `blue-900` en `blue-800`.
  Een test controleert dat het manifest en de PNG's op het vlak dezelfde waarde hebben als het token.
- **Waarom:** een manifest en een PNG kennen geen CSS-variabelen, en een tweede kopie van de kleur loopt vroeg of laat uit de pas met de kop.
  Het manifest heeft één `theme_color`, dus daar staat de waarde van de kop in licht; een telefoon met een donker thema kleurt zijn balk met de `theme-color` van de pagina.
- **Alternatieven:** de kleur overnemen in het manifest en in het script, met een test die ze vergelijkt; dat zijn drie kopieën.
  Of de CSS als tekst in de code zetten, zoals `CHANGELOG.md`: Turbopack geeft dat voor CSS-bestanden een foutmelding.
- **Hoe:** `next.config.ts` leest `colour.css` bij de bouw (`src/header-colour.ts` zoekt de rol en de twee schalen) en zet de twee kleuren in de code met `env`, want de server heeft dat bestand niet.
  Het script voor de iconen en `vitest.config.ts` lezen hetzelfde bestand op dezelfde manier.

## Alleen koppen laten zien dat je ze al hebt geopend

- **Datum:** 24 oktober 2026
- **Besluit:** alleen de kop van een nieuwsbericht en de titel van een discussie krijgen het grijs voor bezocht.
  Elke andere link ziet er bezocht hetzelfde uit als onbezocht.
- **Waarom:** de berichten en de discussies veranderen de hele dag, en een bezoeker wil zien wat hij al heeft geopend.
  Links naar vaste pagina's, zoals "Naar het forum", "Alle podcasts", het menu en de links in tekst, gaan naar pagina's die je vaker bezoekt, en "je was hier al" zegt daar weinig.
  Een link blijft verschillen van lopende tekst door de onderstreping.
- **Alternatieven:** het grijs voor alle links laten staan, zoals nu.
  Of alleen de kop van een nieuwsbericht; dan krijgen de titels in "Nieuwste discussies" het niet.
- **Hoe:** `link.css` zet geen kleur meer voor `:visited`.
  `news-item.css` en `discussion-item.css` zetten die wel, als `&:visited:not(:hover)`.
  Die regel staat in de laag voor componenten en wint daarmee van de hover in de basisstijl, dus de `:not(:hover)` laat de kop onder de muis de kleur voor hover houden, ook als hij bezocht is.
  De overschrijvingen van het token in `page.css` (de header en de footer) zijn weg.
  Het token `--hf-colour-text-link-visited` blijft, met een nieuwe omschrijving.
  Titels van podcastafleveringen krijgen het grijs bij hun eigen component, zodra dat er is.

## Onze bronnen staat in de footer, als Bronnen

- **Datum:** 24 oktober 2026
- **Besluit:** de link naar `/bronnen` staat niet meer in het hoofdmenu maar in de footer, tussen Over ons en Privacy, met de tekst "Bronnen".
  De pagina zelf blijft Onze bronnen heten, in de kop, de titel en de link op de homepage.
  Dit past de beslissing _Het hoofdmenu begint met Nieuws, en de huidige pagina krijgt een rode streep_ aan, die Onze bronnen in het hoofdmenu zette.
- **Waarom:** het hoofdmenu houdt de inhoud over, Nieuws en het Forum.
  Bronnen hoort bij wat de site over zichzelf zegt, net als Over ons en Privacy.
  In de footer past het korte woord beter naast de andere links; de pagina zegt zelf "Onze bronnen".
- **Alternatieven:** "Onze bronnen" ook in de footer, zodat de link en de kop hetzelfde heten.
  Of Bronnen in beide menu's.
- **Let op:** de footer markeert de huidige pagina niet, dus op `/bronnen` heeft geen enkele link in een menu de streep van de huidige pagina.

## De links in de footer zijn blauw, zoals de andere links

- **Datum:** 24 oktober 2026
- **Besluit:** de links in de footer hebben de kleur van gewone links: `blue-700` in licht en `blue-300` in donker, en onder de muis `blue-800` en `blue-200`.
  Dit vervangt het donkere zand van de links uit _De footer staat op een eigen vlak, met links in donker zand_; het vlak, de lijn en de indeling blijven.
- **Waarom:** de footer valt zo minder uit de toon.
  Een link heeft overal op de site dezelfde kleur, dus een bezoeker herkent hem zonder erbij na te denken.
  De blauwe links halen het contrast ook op het vlak van de footer: de link 7,02:1 in licht en 7,90:1 in donker, onder de muis 9,34:1 en 10,65:1.
  De focusrand blijft 3,52:1 in licht en 7,90:1 in donker.
- **Alternatieven:** het donkere zand houden; dat is rustiger, maar het geeft de site een tweede linkkleur.
- **Hoe:** de tokens `--hf-colour-text-link-on-footer` en `--hf-colour-text-link-hover-on-footer` zijn weg, en `page.css` zet de kleuren van links in de footer niet meer.
  De footer erft `--hf-colour-text-link` en `--hf-colour-text-link-hover`.
  De contrasttabel bij Tokens › Kleur toetst die twee op het vlak van de footer.
  De stap `sand-700` blijft in de reeks, ook al gebruikt nu niets hem.
  Een bezochte link ziet er in de footer hetzelfde uit als een andere, zoals overal behalve bij koppen en discussietitels.

## De pagina Wat is er nieuw heet Updates, op `/updates`

- **Datum:** 24 oktober 2026
- **Besluit:** de pagina Wat is er nieuw heet Updates, in de kop, de titel, de link in de footer en de titel van de feed.
  Het adres wordt `/updates` en dat van de feed `/updates/feed.xml`.
  `next.config.ts` verwijst `/wat-is-er-nieuw` en `/wat-is-er-nieuw/feed.xml` blijvend door (308) naar de nieuwe adressen.
  In de code heet het onderdeel nu ook `updates`.
- **Waarom:** de projecteigenaar wil de kortere naam.
  Een adres dat bij de naam past, is makkelijker te onthouden en te delen.
  De site is nog jong, dus een doorverwijzing kost weinig en geen oude link of feedlezer breekt.
- **Alternatieven:** alleen de naam veranderen en het adres laten staan; dan past het adres niet bij de naam.
  Of de oude adressen zonder doorverwijzing weghalen; dan breken links en feedlezers.
- **Let op:** de link van elke versie in de feed is ook de `guid`, en die verandert mee (`/updates#versie-0.1.0`).
  Een feedlezer die de oude feed volgt, kan de versies daarom één keer als nieuw tonen.
  De regel voor versie 0.1.0 in `release-notes.ts` noemt de pagina nu Updates.
  De oude naam blijft staan in de eerdere beslissingen hierboven en in de geschiedenis van `CHANGELOG.md`.

## Omlaag trekken ververst de pagina, alleen in de app op het beginscherm

- **Datum:** 24 oktober 2026
- **Besluit:** als de site draait als app op het beginscherm (`display-mode: standalone`, of `navigator.standalone` op een iPhone), laadt omlaag trekken bovenaan de pagina de pagina opnieuw (`location.reload()`).
  Een klein label bovenaan het scherm (`PullIndicator`) zegt "Trek omlaag om te verversen", dan "Loslaten om te verversen" na 80 pixels, en "Bezig met verversen" na het loslaten.
  `PullToRefresh` in het designsysteem doet het, en staat in de layout.
  In een browsertabblad en zonder JavaScript verandert er niets.
- **Waarom:** in een app op het beginscherm is er geen verversknop in de browser, en een iPhone kent daar ook geen pull to refresh.
  De bezoeker kon het nieuws dus niet verversen zonder de app te sluiten.
  In een tabblad heeft de browser een eigen knop, dus daar voegt het niets toe.
- **Alternatieven:** een verversknop die altijd zichtbaar is; dat verandert wat alle bezoekers zien.
  `router.refresh()` in plaats van een volledige herlading; dat voelt zachter, maar de bezoeker ziet dan niet of er iets gebeurt, en een herlading is zeker.
  Ook in een tabblad werken; daar botst het met de eigen verversing van Chrome en Safari.
- **Hoe:** de beweging is een touch-gebaar op `document` met alleen passieve luisteraars, dus de pagina scrolt en veert zoals altijd.
  Het begint niet als de pagina niet bovenaan staat, bij een tweede vinger, in een veld, in een element dat opzij scrolt of omlaag gescrold is (een brede tabel), en als de vinger eerst omhoog of opzij gaat.
  Touch-events zijn niet Baseline en worden dat niet (desktop-Safari heeft ze niet); pointer-events zijn het wel, maar een browser breekt die af (`pointercancel`) zodra hij gaat scrollen, en het trekken begint als scrollen.
  Daarom staat bovenaan `pullGesture.ts` een `eslint-disable` met die reden.
  In de app zet het component ook `overscroll-behavior-y: contain` op `html` (via het attribuut `data-pull-to-refresh`, binnen `@supports` omdat de eigenschap nog niet 'widely available' is).
  Chrome op Android heeft in een geïnstalleerde app een eigen pull to refresh; die gaat zo niet óók af.
  Zonder JavaScript zet niets dat attribuut, dus dan houdt de browser zijn eigen gedrag.
- **Toegankelijkheid:** het label is `aria-hidden`.
  Het is een hint voor een vinger op het scherm; een schermlezer ziet het gebaar niet, en leest de pagina die daarna laadt zelf voor.
  Met minder beweging komt het label niet omlaag: het blijft staan en verschijnt zodra loslaten ververst.
- **Een knop voor wie niet kan trekken:** in de app staat ook een knop "Pagina verversen" (`RefreshButton`), die hetzelfde doet als het gebaar.
  Een gebaar mag nooit de enige manier zijn (WCAG 2.1.1 en 2.5.1), en in de app is er geen verversknop van de browser.
  De knop komt als eerste in de volgorde van Tab, vóór de kop.
  Hij is onzichtbaar tot hij focus heeft, zoals een link om naar de inhoud te springen, en blijft voor een schermlezer te vinden.
  Met focus staat hij vast bovenaan het scherm, onder de statusbalk van de app.
  Dan heeft niets anders focus, dus hij bedekt geen element met focus (2.4.11).
  Hij staat alleen in de app: in een tabblad heeft de browser een eigen knop, en zonder JavaScript is er niets.
  De site heeft nog geen link om naar de inhoud te springen; als die komt, staat de knop erna.
  Dit was een open punt van de eerste versie; de projecteigenaar koos de knop boven een regel in de toegankelijkheidsverklaring.
  De verklaring zegt niets over verversen en blijft daarom zoals ze is.
- **Gecontroleerd en niet gecontroleerd:** in Chromium met de emulatie van een Pixel 7, met echte aanraakinvoer en toetsenbordinvoer, en de modus 'app' nagebootst.
  Niet op een iPhone, in de iOS Simulator of in een echte app op het beginscherm; of VoiceOver de knop als eerste leest, moet de projecteigenaar daar nakijken.

## De pagina gebruikt het hele scherm en houdt de inhoud uit de uitsparing

- **Datum:** 24 oktober 2026
- **Besluit:** de pagina zet `viewport-fit=cover` aan, en elke zijmarge van de header, de body en de footer is het grootste van de maat die er nu staat en de inset van het apparaat (`max()` met `env(safe-area-inset-…, 0px)`).
  De header krijgt bovenin minstens de inset bovenin en de footer onderin minstens de inset onderin.
  Daarmee lopen de header en de footer onder de uitsparingen door in een effen kleur, terwijl tekst en knoppen er naast staan.
  Op een iPhone op het beginscherm is de statusbalk doorzichtig (`black-translucent`), zodat de header eronder doorloopt.
  Een vaste strook in de kleur van de header, zo hoog als de inset bovenin, houdt de statusbalk donkerblauw als de pagina scrolt (de projecteigenaar wilde de statusbalk ook donkerblauw).
  De strook neemt geen aanraking aan, en `scroll-padding-block-start` op het html-element houdt een element met focus uit de strook (WCAG 2.4.11).
  Zonder inset heeft de strook geen hoogte, dus er is dan geen.
- **Waarom:** met een standaardpagina laat de browser een balk in de kleur van de pagina over bij een uitsparing, en dat ziet er onaf uit naast een header van rand tot rand.
  Bij `black-translucent` is de tekst van de statusbalk wit, en de header is in licht en donker donkerblauw, dus de tekst blijft leesbaar.
  Met alleen een doorzichtige statusbalk is hij alleen donkerblauw zolang de header erachter staat; scrolt de pagina, dan schuift lichte inhoud onder de witte tekst van de statusbalk.
  De waarden hebben een terugvalwaarde van 0, dus op schermen zonder uitsparing verandert er niets.
- **Alternatieven:** de pagina laten zoals hij is: een balk in de kleur van de pagina naast de header.
  Of de statusbalk op de standaardstijl laten (`default`); dan blijft de statusbalk een eigen balk boven de header.
  Of een afbeelding of een verloop achter de uitsparing; dat is meer werk en meer om te onderhouden dan een effen kleur.
  Of de strook weglaten; dan wisselt de statusbalk bij scrollen van kleur, en schuift lichte inhoud onder de witte tekst ervan.
- **Later:** de strook is nu een echt element en in Safari op een iPhone minstens 8 pixels hoog, en niet langer een pseudo-element zonder hoogte; zie _De rand bovenaan in Safari heeft de kleur van de kop, door een echte strook van minstens 8 pixels_.
- **Gecontroleerd en niet gecontroleerd:** in de iOS Simulator, in Safari, in staande en liggende stand.
  De statusbalk van een app op het beginscherm en de strook eronder laat de simulator niet zien, want Safari heeft bovenin geen inset; de projecteigenaar kijkt dat na op een echte telefoon.

## Alleen een extern item in het hoofdmenu krijgt het pictogram

- **Datum:** 25 oktober 2026
- **Besluit:** een item van `Navigation` met `external` krijgt het pictogram voor een externe link, hetzelfde als bij de koppen van het nieuws.
  In het hoofdmenu is dat alleen het Forum.
- **Waarom:** het Forum is het enige item in het menu dat naar een ander adres gaat; de andere items zijn pagina's van de site.
  Het pictogram zegt dat zonder woorden, en het is hetzelfde teken als bij de koppen, dus een bezoeker kent het al.
  Een schermlezer hoort "Forum", zoals bij de koppen de naam van de kop; het pictogram is versiering voor het oog.
- **Alternatieven:** het pictogram bij elke externe link op de site; dat is meer werk en raakt teksten die een eigen opmaak hebben.
  Of het afleiden uit het adres (`https://`); dat is minder expliciet dan een optie.
  Of een tekst "externe site" voor schermlezers; dat kan later voor alle externe links tegelijk.

## De tekening van het pictogram staat in een eigen intern component

- **Datum:** 25 oktober 2026
- **Besluit:** de tekening van het pictogram voor een externe link staat in `ExternalLinkIcon`, in een eigen map met een eigen CSS-bestand (`external-link-icon.css`) en een eigen test.
  `NewsItem` en `Navigation` gebruiken het.
  Het component staat niet in de uitvoer van het package en heeft geen eigen story: het pictogram is een onderdeel van die twee, en hun stories tonen het in licht en donker.
  De grootte, de ruimte ervoor en de plaats in de regel zijn voor de nieuwsregel en het menu gelijk.
- **Waarom:** één tekening betekent één plek om aan te passen, en het pictogram ziet er overal hetzelfde uit.
  Een bezoeker of een pagina heeft het niet los nodig; wie het nodig heeft, kan het later exporteren.
  Dit volgt `Pompebled` in de map van het logo, dat ook een intern onderdeel zonder eigen story is.
- **Alternatieven:** het pictogram exporteren uit het package; dat maakt er een deel van de interface van, terwijl niets op de site het los gebruikt.
  Of de tekening in beide componenten laten staan; dan lopen ze uit elkaar.
- **Later:** zie _Pictogrammen zijn zelf getekend, bij een link erachter en bij een knop ervoor_; `ExternalLinkIcon` is daarin opgegaan in `Icon`.

## Elke kaart op de homepage toont vijf items, uit één gedeelde waarde

- **Datum:** 25 oktober 2026
- **Besluit:** elke kaart met een lijst op de homepage toont standaard vijf items, uit één gedeelde waarde, `itemsPerCard` in `apps/site/src/items-per-card.ts`.
  De kaarten met nieuws, discussies en podcasts gebruiken die, en een kaart met een lijst die later bijkomt ook.
  De importer bewaart de vijf nieuwste discussies in plaats van vier.
  De pagina `/podcasts` houdt zijn eigen paginering (25 per pagina) en filter.
- **Waarom:** de kaarten wisselden (twee weken, vier, vier) en horen op een rij gelijk te zijn.
  Eén waarde houdt ze gelijk.
- **Hoe:** het aantal van de importer, `discussionsToKeep` in `apps/importer/src/read-forum.ts`, is een eigen waarde: de importer en de site delen geen code, en de importer mag niet minder bewaren dan de site toont.
- **Alternatieven:** per kaart een eigen aantal, zoals nu; ook `/podcasts` op vijf zetten (meer pagina's voor dezelfde afleveringen).
- **Later:** het nieuws begint sinds 25 oktober 2026 met tien koppen en laadt er vijf bij; de kaarten met discussies en podcasts blijven op vijf.
  Zie _De nieuwskaart begint met tien koppen_.
- **Later:** zie _De homepage en het nieuws zijn twee pagina's, en het forum staat bovenaan de zijbalk van de homepage_ (1 november 2026): de kaarten met discussies en podcasts op de homepage en de kaart met podcasts op `/nieuws` tonen vijf items, uit `itemsPerCard`; de toegestane maten zijn 5, 10, 20 en 50 (`listSizes`).

## "Laad 5 meer" werkt zonder JavaScript

- **Datum:** 25 oktober 2026
- **Besluit:** onder de lijst van de nieuwskaart staat de knop "Laad 5 meer" als er oudere koppen zijn.
  De knop zit in een `Form` met `method="get"`: hij heeft `name="nieuws"` en als `value` het aantal na de volgende vijf.
  Het formulier gaat naar de eerste nieuwe kop: elke kop in de lijst heeft een `id` met zijn nummer (`nieuws-6`), en het formulier gaat naar `/#nieuws-6` als er vijf koppen staan.
  De pagina laadt zo opnieuw met `?nieuws=10#nieuws-6` in het adres, en de bezoeker blijft op dezelfde plek: de nieuwe koppen staan bovenaan het scherm.
  Er komt geen script bij en geen API, en geen component in het designsysteem: het is een `Button` in een `Form`.
- **Waarom:** de site werkt voor iedereen, ook zonder script, en we hebben dan geen API en geen client-component nodig.
  Het aantal is geen persoonsgegeven en er komt geen cookie bij.
- **Hoe:** de pagina vraagt de database om één kop meer dan ze toont, om te weten of de knop nodig is.
  Het adres van een pagina met `?nieuws=` is de homepage zelf als canoniek adres, en zo'n pagina staat niet in de sitemap.
- **Gecontroleerd:** in Chromium, op een telefoon van 390 en een bureaublad van 900 pixels breed, met en zonder JavaScript.
  Na de klik staat de eerste nieuwe kop bovenaan het scherm (op de telefoon op 0 pixels, op het bureaublad op 85 pixels omdat de pagina niet verder scrollt), en de koppen eronder zijn de nieuwe.
  De focus staat bovenaan de pagina, en Tab gaat naar de link van de eerste nieuwe kop.
  Wij hebben dit niet met een schermlezer geprobeerd.
- **Eerst gekozen en weer losgelaten:** het formulier ging eerst naar de kaart zelf (`/#nieuws`).
  Dan sprong de pagina na de klik naar de bovenkant van de kaart, en moest de bezoeker de nieuwe koppen zelf zoeken.
- **Alternatieven:** de koppen met JavaScript ophalen en toevoegen (vloeiender, maar een API en niets voor wie geen script heeft); dat kan later als aanvulling.
- **Later:** de knop is weg en de homepage kent `?nieuws=` niet meer; zie _De homepage heeft geen knop "Laad 5 meer" meer, maar de link "Alle koppen"_.
  Het besluit blijft gelden voor de knop op andere pagina's, zoals de pagina met de gehouden nullen en `/zoeken`.

## Het nieuws heeft geen grens in de tijd, en een grens van 100 koppen

- **Datum:** 25 oktober 2026
- **Besluit:** het nieuws op de homepage heeft geen grens in de tijd meer (de twee weken van _De homepage toont het nieuws van twee weken_ vervallen), met een grens van 100 koppen.
  Het aantal in het adres is een geheel getal vanaf 5, in stappen van 5, en nooit meer dan 100; een ander getal, of een getal dat twee keer in het adres staat, geeft de eerste vijf.
  Bij 100 koppen verdwijnt de knop ook; ouder nieuws is voor het archief (#26).
- **Waarom:** met vijf koppen eerst is de lengte van de pagina geen reden meer voor een tijdgrens.
  De grens van 100 houdt een adres met een groot getal niet tot een zware vraag aan de database; het archief (#26) is voor ouder nieuws.
- **Hoe:** de server bewaart de lijst per getal vijf minuten, en omdat een getal dat niet klopt de lijst van vijf deelt, zijn er hoogstens twintig lijsten (5 tot en met 100).
  Een bezoeker kan het geheugen van de server dus niet vullen met adressen van zichzelf.
  Een bericht van een ander jaar toont het jaar bij de datum ("30 dec 2025 11:00"), want zonder grens in de tijd is "30 dec" niet meer duidelijk.
- **Alternatieven:** de twee weken houden als grens van de knop; geen grens, ook niet van aantal (een pagina die onbeperkt kan groeien).
- **Later:** het aantal in het adres is een geheel getal vanaf 10, in stappen van 5; een ander getal geeft de eerste tien, en er zijn hoogstens negentien lijsten (10 tot en met 100).
  Zie _De nieuwskaart begint met tien koppen_.
- **Later:** zie _Het nieuwsarchief staat op `/nieuws`, met 50 koppen per pagina en een filter per bron_; het archief is er, en de grens van 100 koppen op de homepage blijft.
- **Later:** de grens van 100 koppen en de getallen in het adres vervallen met de knop; zie _De homepage heeft geen knop "Laad 5 meer" meer, maar de link "Alle koppen"_.
  Het nieuws heeft nog steeds geen grens in de tijd.

## De nieuwskaart begint met tien koppen

- **Datum:** 25 oktober 2026
- **Besluit:** de nieuwskaart op de homepage begint met tien koppen en laadt er steeds vijf bij.
  De kaarten met discussies en podcasts blijven op vijf.
  Het nieuws heeft zo twee eigen waarden naast `itemsPerCard`, alle drie in `apps/site/src/items-per-card.ts`: `firstHeadlines` (10) en `moreHeadlines` (5).
  Het aantal in het adres (`?nieuws=`) is een geheel getal vanaf 10, in stappen van 5, en nooit meer dan 100; een ander getal, ook 5, geeft de eerste tien.
  Zijn er tien koppen of minder, dan is er geen knop.
- **Waarom:** het nieuws is de hoofdkaart van de pagina.
  Met tien koppen ziet een bezoeker meer zonder te klikken, terwijl de kaarten naast het nieuws kort blijven.
- **Alternatieven:** alle kaarten op vijf, zoals _Elke kaart op de homepage toont vijf items, uit één gedeelde waarde_ besloot; alle kaarten op tien, wat de kaarten met discussies en podcasts langer maakt dan nodig.
- **Later:** de nieuwskaart heeft tien koppen en geen knop meer, en `moreHeadlines` en `?nieuws=` zijn weg; zie _De homepage heeft geen knop "Laad 5 meer" meer, maar de link "Alle koppen"_.
- **Later:** zie _De homepage en het nieuws zijn twee pagina's, en het forum staat bovenaan de zijbalk van de homepage_ (1 november 2026): het nieuws op de homepage blijft tien koppen, en de lijst op `/nieuws` 50 per pagina; de toegestane maten zijn 5, 10, 20 en 50 (`listSizes`).

## Storybook en het Forum krijgen dezelfde iconen als de fansite, op een eigen vlak

- **Datum:** 25 oktober 2026
- **Besluit:** Storybook (ds.heerenveen.org) heeft dezelfde iconen als de fansite, het schild van het logo, maar het vlak van het `apple-touch-icon` en het afgesneden icoon is het roze van Storybook, `#ff4785`.
  Voor het Forum, voor later, maken we dezelfde iconen op `blue-600` (`#1559aa`) uit de kleurtokens van het designsysteem: een lichter blauw dan de kop van de fansite.
  De iconen van Storybook staan in `packages/design-system/src/assets/icons/storybook`, die van het Forum in `.../forum`.
  Het script `pnpm --filter site icons` maakt alle drie de sets, en `src/icons.test.ts` controleert ze.
- **Waarom:** in de favorieten van Safari toonde ds.heerenveen.org een roze vlak met een S, omdat de pagina alleen de SVG van Storybook zelf aanwijst en `/favicon.ico` en `/apple-touch-icon.png` niet bestonden.
  Het roze is de eigen kleur van Storybook (uit zijn `favicon.svg`), zodat Storybook en de fansite op een telefoon of in de favorieten niet voor elkaar worden aangezien.
  Het Forum krijgt een lichter blauw: dat hoort bij de huisstijl en is te onderscheiden van het donkerblauw van de fansite.
  Een icoon is geen tekst, maar het contrast met het vlak is er wel: de witte rand van het schild haalt op het roze 3,2:1 en op `blue-600` 6,9:1.
- **Alternatieven:** zand (`sand-300`) voor het Forum; dat vond de projecteigenaar niet bij de huisstijl passen.
  Of `blue-500`: daar verdwijnen de blauwe randen en de banen van het schild in het vlak.
  Of `blue-700`, dat de blauwe rand van het schild bijna opslokt.
  Of de iconen van Storybook zelf op het roze zetten, met een S; dat is het vlak dat we juist willen vervangen.
- **Hoe:** het script krijgt een lijst sets (`src/icon-sets.ts`) in plaats van één map; alleen de tegel verschilt, dus de transparante iconen, de ICO en de SVG zijn in elke set dezelfde bytes.
  Storybook neemt de map van zijn set op met `staticDirs` (op de root) en zet de links in `managerHead` en `previewHead` (`.storybook/icons.ts`); zodra de kop zelf een icoon heeft, laat Storybook zijn eigen weg.
  De tabbladen van de fansite en van Storybook tonen hetzelfde transparante schild; het roze verschijnt in het `apple-touch-icon`, dus in de favorieten van Safari en op een beginscherm.

## Pictogrammen zijn zelf getekend, bij een link erachter en bij een knop ervoor

- **Datum:** 25 oktober 2026
- **Besluit:** pictogrammen zijn een kleine set die het designsysteem zelf tekent (SVG in de code), zonder pictogrammenbibliotheek als dependency.
  De set is een pijl naar rechts, een pijl naar links, een envelop, een plus, een zon, een maan en het pictogram voor een externe link.
  Bij een link staat het pictogram achter de tekst, bij een knop ervoor.
  "Vorige" is de uitzondering, omdat zijn pijl naar links wijst.
- **Waarom:** een pictogram achter een link wijst vooruit, naar waar de link heen gaat.
  Een pictogram voor een knop zegt wat hij doet: versturen, meer laden.
  Eén regel voor alle plaatsen houdt het rustig.
  Zelf tekenen houdt de site vrij van verzoeken naar derden en van een dependency met honderden pictogrammen waarvan we er zeven gebruiken, en geeft de site één eigen stijl.
- **Alternatieven:** alle pictogrammen achter de tekst, ook bij knoppen (consistenter op papier, maar de envelop staat dan op een ongebruikelijke plek).
  Een pictogrammenset of lettertype van een derde partij, of losse tekeningen uit zo'n bibliotheek (een verzoek naar buiten of een dependency, en de stijl is van een ander).
- **Later:** zie _Een link naar ons e-mailadres krijgt een envelop vóór de tekst_; bij een link staat de envelop ook vóór de tekst.

## Elke link naar een andere site toont het pictogram voor een externe link

- **Datum:** 25 oktober 2026
- **Besluit:** elke link naar een andere site toont het pictogram voor een externe link, ook in een zin of een lijst.
  Een `mailto:`-link en een link binnen de site niet.
  Op de site zijn dat "Naar het forum" op de homepage, de bronnen op `/bronnen`, de links naar de platforms op `/podcasts`, "ons forum" op `/over-ons`, de Autoriteit Persoonsgegevens op `/privacy` en "het forum" op de foutpagina.
  "Alle podcasts" op de homepage is een link naar meer van de eigen site en krijgt een pijl naar rechts.
- **Waarom:** het nieuws en het menu doen het al.
  Een bezoeker moet overal kunnen zien dat een link de site verlaat.
- **Alternatieven:** alleen in het nieuws en het menu (zoals daarvoor, maar een link naar een bron of een platform verlaat de site dan zonder waarschuwing).
  Het afleiden uit het adres (`https://`); dat is minder expliciet dan een optie, en `Link` kiest zijn pictogram dus met de prop `icon`, net als `Navigation` met `external`.
- **Later:** zie _Een link naar ons e-mailadres krijgt een envelop vóór de tekst_; een `mailto:`-link krijgt wel een pictogram, de envelop, en dat is niet het pictogram voor een externe link.

## Eén component Icon, gekozen met een naam, en de plaats volgt uit het component dat het tekent

- **Datum:** 25 oktober 2026
- **Besluit:** alle pictogrammen zitten in één intern component, `Icon`, met een verplichte `name` uit een vaste lijst (`iconNames`).
  De zon en de maan hebben daarnaast `appearance` (`line` of `filled`); de typen laten `filled` bij een ander pictogram niet toe, zoals `Text` een inleiding alleen bij een `p` toelaat.
  Dat vervangt `ExternalLinkIcon`, dat nu `Icon name="external-link"` is: de grootte, de ruimte en de plaats in de regel staan in `icon/icon.css`, voor alle zeven.
  `Icon` staat niet in de uitvoer van het package.
  De lijn is even dik als de stam van de letters van gewone tekst (0,084 em in Atkinson Hyperlegible Next, gemeten aan de l), ook als het pictogram groter is: de dikte staat in em in `icon.css` en de tekening rekent die om naar zijn eigen maat.
  Het pictogram staat zo dat zijn middelste lijn op de hoogte van de dwarsbalk van de e staat, halverwege de kleine letters, en niet op de grondlijn.
  In een knop is het pictogram iets groter dan in een link (`button .hf-icon`), omdat de vette tekst van een knop een kleine tekening zwak laat lijken; we zagen dat in Storybook op de envelop, de plus, de zon en de maan.
  De lijn wordt daar niet dikker: de pictogrammen blijven in één stijl.
  Een bezoeker of een pagina kiest het pictogram met een prop van het component dat het tekent: `Link` heeft `icon` (`arrow-right`, `external-link`, `arrow-left`), `Button` heeft `icon` (`envelope`, `plus`) en een optie van `SegmentedControl` heeft `icon` (`sun`, `moon`).
  Het component weet waar het pictogram staat: bij een link achter de tekst, behalve `arrow-left` dat ervoor staat, en bij een knop ervoor.
  De gevulde tekening van de zon en de maan is dezelfde tekening met een vulling (`fill="currentColor"`), dus de lijn en de vulling blijven één stijl; de stralen van de zon zijn lijnen zonder oppervlak, dus de vulling verschijnt alleen in de schijf en de sikkel.
  `SegmentedControl` tekent de gevulde tekening op de ingedrukte knop en de lijn op de andere.
  Dat is een tweede aanwijzing naast het gevulde vlak en `aria-pressed`; wie het pictogram niet ziet, mist niets.
- **Waarom:** het is de eenvoudigste vorm die past bij hoe `Text` en `Card` hun uiterlijk kiezen: een lijst met namen en een getypeerde prop.
  Eén bestand met zeven tekeningen en één CSS-bestand houdt de stijl bij elkaar, en een volgend pictogram is een regel erbij.
  Een eigen component per pictogram geeft zeven bestanden met dezelfde kolom code.
  Het pictogram heeft altijd `currentColor`, dus het heeft de kleur en het contrast van de tekst eromheen, ook onder de muis, met de focus en in geforceerde kleuren.
- **Alternatieven:** een component per pictogram (`ArrowRightIcon` en zo verder); meer bestanden en dezelfde regels in elk.
  `Icon` exporteren zodat de site het los kan zetten; dat opent de weg naar een pictogram dat de enige aanwijzing is, terwijl `Link`, `Button` en `SegmentedControl` het pictogram altijd als tweede aanwijzing tekenen.
  Een `filled` als aparte naam (`sun-filled`); dat maakt de lijst langer en laat de twee tekeningen uit elkaar lopen.
- **Later:** zie _Een link naar ons e-mailadres krijgt een envelop vóór de tekst_; `Link` heeft daarnaast `icon="envelope"`, ook vóór de tekst.

## Het pictogram blijft aan zijn woord vast met een groep die niet afbreekt

- **Datum:** 25 oktober 2026
- **Besluit:** `Link` en `Button` zetten het pictogram met het laatste woord van de tekst (bij een link) of het eerste woord (bij een knop) in een groep met `white-space: nowrap`: `hf-icon-tail` en `hf-icon-head`.
  Dat doet de functie `attachIcon` in `icon/attachIcon.tsx`, die de tekst bij het laatste of eerste woord splitst.
  Eindigt de inhoud van een link niet met tekst (of begint die van een knop er niet mee), dan krijgt het pictogram een groep voor zichzelf en kan het alleen op een regel komen; de documentatie van `Link` zegt dat de inhoud met tekst moet eindigen.
- **Waarom:** een pictogram dat alleen op een regel staat, hoort bij niets en is niet te begrijpen.
  Een groep zonder afbreking houdt het bij zijn woord, bij 320 pixels breed en bij grote letters.
  Het pictogram heeft geen eigen kleur en geen beweging, dus er is niets anders te regelen.
- **Alternatieven:** een onzichtbaar teken ertussen (een woordverbinder); dat komt in de naam van de link, in een kopie van de tekst en in de test van de naam.
  Het hele label niet laten afbreken; dat laat een lange link over de rand van een smal scherm lopen.

## Een link naar ons e-mailadres krijgt een envelop vóór de tekst

- **Datum:** 25 oktober 2026
- **Besluit:** een link naar ons e-mailadres (`mailto:`) krijgt een envelop vóór de tekst, met `icon="envelope"` van `Link`.
  Dat is één naam meer in `linkIcons`, met de plaats `before`, zoals `arrow-left`; er is geen nieuwe prop.
  Op de site zijn dat de twee kaarten op `/bronnen`, de melding bij een mislukte verzending op `/contact`, en de `EmailLink` van `/over-ons` en `/privacy` en de link op `/toegankelijkheid`.
  Een adres dat als gewone tekst staat, zoals dat van de ingelogde beheerder, is geen link en krijgt geen envelop.
- **Waarom:** de envelop zegt dat de link een mail opent, en dat is anders dan een link naar een pagina.
  Hij zegt wat de link doet, en staat daarom vóór de tekst, zoals het pictogram bij een knop; een pijl wijst vooruit, een envelop niet.
  Een regel in `Link` die uit het adres `mailto:` afleidt, is minder expliciet dan een optie, en de pagina kiest haar pictogram al overal met `icon`.
- **Alternatieven:** geen pictogram bij `mailto:`-links (zoals na #239); de envelop achter het adres (volgens de regel voor links).
- **Hoe:** een adres is één lang woord zonder spaties, dus de groep die niet afbreekt (`hf-icon-head`) zou het hele adres onbreekbaar maken en bij 320 pixels en grote letters over de rand van de kaart duwen.
  `attachIcon` krijgt daarom `keep: 'letter'`: de envelop blijft alleen bij de eerste letter van het adres, en de rest mag afbreken.
  `link.css` zet `overflow-wrap: anywhere` op een link naar `mailto:`, zodat het adres heel op een eigen regel staat en alleen afbreekt als het langer is dan de regel.
  De naam van de link blijft het adres alleen, want de envelop is `aria-hidden`, en hij heeft de kleur van de tekst, dus ook bij de muis erover, bij de focus en in geforceerde kleuren.

## De rand bovenaan in Safari heeft de kleur van de kop, door een echte strook van minstens 8 pixels

- **Datum:** 25 oktober 2026
- **Besluit:** de rand bovenaan de pagina, achter de statusbalk van Safari op een iPhone of iPad, heeft in licht en in donker de kleur van de kop (`blue-900` en `blue-800`, uit het token van de kop), zonder verloop of schaduw.
  Daarvoor is de strook bovenaan, die voor de app op het beginscherm al bestond, een echt element geworden in plaats van `.hf-page::before`: de lege `div` `hf-page-top-edge`, die `Page` als eerste kind zet, met `aria-hidden`.
  De hoogte is `--hf-top-edge`, die `root.css` op `html` zet: de inset bovenin, en in een browser die `-webkit-touch-callout` kent (Safari op iOS en iPadOS, ook in een app op het beginscherm) minstens 8 pixels: `max(env(safe-area-inset-top, 0px), 8px)`.
  `scroll-padding-block-start` gebruikt dezelfde maat, zodat een element met focus ook niet achter de smalle strook komt.
  Op een computer en in Android is de hoogte nog steeds de inset, dus 0.
  In de app op het beginscherm is de inset ruim groter dan 8 pixels, dus daar verandert niets.
  `theme-color` blijft gelijk aan de kop (zie _Het donkerblauw van het icoon en het manifest komt uit het token van de kop_), voor Chrome en Android.
  Drukt een bezoeker op Licht of Donker, of wisselt het systeem van thema terwijl de pagina open staat, dan haalt `theme.ts` de strook twee frames van de pagina (`refreshTopEdge`, `display: none`) en zet hem terug.
- **Oorzaak:** Safari in de iOS Simulator (iOS 27.0, iPhone 18 Pro) gebruikt `theme-color` niet meer voor de balk bovenin.
  De rand krijgt de kleur van een ondoorzichtig element dat vastzit aan de bovenkant van de pagina en hoog genoeg is, en anders de kleur van de pagina (`grey-100` in licht, `blue-950` in donker), met een zachte overgang naar de inhoud.
  Dat is het lichtgrijs en bijna zwart met het verloop dat de projecteigenaar zag.
  Onze strook deed niet mee, om twee redenen: in Safari is de inset bovenin 0, dus de strook had geen hoogte, en Safari kijkt niet naar een pseudo-element.
- **Gemeten in de simulator:** een vaste strook van 4 pixels in de kleur van de kop telt niet mee; een van 6, 8, 12 en 60 pixels wel.
  Een strook van 8 pixels waarvan het grootste deel boven het scherm staat (`top: -52px`, 60 pixels hoog) telt ook mee.
  Een strook met `opacity: 0.01` telt niet mee; hij moet dus echt getekend zijn.
  Een achtergrond voor `html` in de kleur van de kop verandert niets zolang `body` de kleur van de pagina heeft.
  `.hf-page::before` met 8 pixels deed niets; hetzelfde element als `div` wel.
  Na het scrollen is de rand één egaal blauw vlak, zonder verloop, in licht en in donker.
  Een nieuwe kleur van de strook wordt niet gelezen door alleen de kleur te veranderen, door de hoogte met 1 pixel te veranderen of door het element weg te halen en meteen terug te zetten.
  Wel door `display: none` te zetten en er twee frames later weer af te halen; dat is wat `refreshTopEdge` doet.
  De strook ligt over de bovenste 8 pixels van het scherm.
  Boven aan de pagina valt dat weg tegen de kop, die dezelfde kleur heeft; na het scrollen loopt de egale rand 8 pixels door onder de statusbalk.
- **Waarom:** het is de kleinste aanpassing die Safari de gewenste kleur laat nemen, uit het token van de kop, zonder dat de achtergrond van de pagina, de footer of het gebied bij uitrekken (overscroll) blauw wordt.
  Een blauwe `html` zou dat wel doen.
  Het onderzoek in een andere sessie, dat naar dezelfde kant wees, vond dat ook in de WebKit-bugs 301756 en 305546 en bij de Apple-ontwikkelaarsforums (thread 801239); wij hebben die bronnen niet zelf nagelopen.
- **Alternatieven:** de rand laten zoals hij was, met het verloop, of in de kleur van de pagina met een scherpe overgang.
  `html` blauw maken; dat kleurt ook de ruimte onder de footer bij uitrekken.
  De strook alleen op een iPhone met uitsparing tonen; daar is in CSS geen vraag voor, want de inset is in Safari 0.
  Een strook van 4 pixels of minder, of een bijna doorzichtige; Safari negeert die.
- **Later:** de strook blijft niet meer staan als de kop uit beeld is; zie _De blauwe rand bovenaan scrolt weg met de kop_.
- **Later:** de strook blijft nu altijd staan, ook als de kop uit beeld is; zie _De statusbalk van Safari heeft altijd één van de twee blauwen, tot de modus wisselt_.
- **Gecontroleerd en niet gecontroleerd:** in de iOS Simulator (iOS 27.0, iPhone 18 Pro) in Safari, in licht en in donker, boven aan de pagina en na het scrollen, met Licht en Donker en met het systeemthema gewisseld terwijl de pagina open stond.
  Niet in iOS 26 (geen simulator beschikbaar), niet op een echte telefoon, niet op een iPad en niet in een app op het beginscherm; de projecteigenaar kijkt dat na.
  Een test in Chromium (`e2e/safe-area.spec.ts`) controleert dat de strook het eerste element van de pagina is, vastzit, geen aanraking aanneemt, dezelfde kleur heeft als de kop en `theme-color` in licht en donker, en na Licht of Donker terugkomt.
  De 8 pixels en de kleur van de statusbalk zelf zijn alleen op een telefoon te zien.

## De blauwe rand bovenaan scrolt weg met de kop

- **Datum:** 25 oktober 2026
- **Besluit:** in Safari op een iPhone of iPad haalt de site de strook bovenaan van de pagina zodra de kop uit beeld is, en zet hem terug als de kop terugkomt.
  Daarmee heeft de statusbalk dan weer de kleur van de pagina, met de zachte overgang naar de inhoud die Safari zelf tekent.
  Dat doet `watchTopEdge` (`apps/site/src/watchTopEdge.ts`, gestart door `TopEdge`, dat de lay-out zet): een `IntersectionObserver` op de kop met een bovenmarge van 8 pixels, de hoogte van de strook, die het attribuut `hidden` op de strook zet.
  In een app op het beginscherm blijft de strook staan, en zonder JavaScript of `IntersectionObserver` ook.
- **Waarom:** de projecteigenaar vond de blauwe rand na het scrollen mooi bovenaan, maar wilde dat hij met de pagina meeschuift: blauw bij de kop, en daarna de kleur van de pagina.
  Safari tekent de rand alleen blauw zolang er een vast element in die kleur bovenaan staat, dus meeschuiven kan alleen door dat element weg te halen.
  In de app op het beginscherm is de statusbalk doorzichtig met witte tekst, dus daar moet de strook blijven (zie _De pagina gebruikt het hele scherm en houdt de inhoud uit de uitsparing_).
  `hidden` en niet `display` via de stijl, zodat `refreshTopEdge` (dat `display` gebruikt voor Licht en Donker) de strook niet terugzet terwijl de kop weg is.
- **Alternatieven:** de strook altijd laten staan, zoals na de vorige beslissing; dan blijft er een blauwe balk bovenaan staan die bij niets hoort als de kop uit beeld is.
  De strook laten meeschuiven met `position: absolute` in plaats van `fixed`.
  Safari ziet dan waarschijnlijk geen vast element meer en neemt de kleur van de pagina, ook bovenaan, zodat het grijs met het verloop terugkomt.
  Een animatie op basis van de scrollpositie in CSS (`animation-timeline: scroll()`); of Safari de kleur van de strook tijdens zo'n animatie bijhoudt, weten we niet.
  Beide hebben we niet uitgeprobeerd.
- **Gecontroleerd en niet gecontroleerd:** in de iOS Simulator (iOS 27.0, iPhone 18 Pro) in Safari, in licht en donker: blauw bovenaan, de kleur van de pagina met de zachte overgang na het scrollen langs de kop, weer blauw als de kop terugkomt, en na Licht of Donker terwijl de strook weg was.
  Niet op een echte telefoon, niet in iOS 26 en niet in de app op het beginscherm.
- **Later:** dit vervalt: `watchTopEdge` en `TopEdge` zijn weg en de strook blijft altijd staan; zie _De statusbalk van Safari heeft altijd één van de twee blauwen, tot de modus wisselt_.

## De statusbalk van Safari heeft altijd één van de twee blauwen, tot de modus wisselt

- **Datum:** 1 november 2026
- **Besluit:** de strook `hf-page-top-edge` blijft altijd op de pagina, ook nadat de kop en het hoofdmenu uit beeld zijn gescrold (#528).
  `watchTopEdge` en `TopEdge` zijn weg: er is niets meer dat de strook met `hidden` van de pagina haalt.
  De statusbalk van Safari op een iPhone of iPad heeft daardoor `blue-900` in licht en `blue-800` in donker, uit het token van de kop, zowel boven aan de pagina als na het scrollen.
  De kleur verandert alleen als de modus wisselt: met de knop Licht of Donker, of als het systeem van thema wisselt.
  Dat doet `refreshTopEdge` in `theme.ts` nog steeds, met de strook twee beeldjes van de pagina.
  De balk "Op deze pagina:" plakt onder de strook vast: `inset-block-start` en de scroll-padding bij de balk gebruiken `--hf-top-edge` en niet langer alleen de inset.
  De app op het beginscherm, Android en een computer veranderen niet, en `theme-color` ook niet.
- **Waarom:** de projecteigenaar wilde geen zand meer in de statusbalk (de kleur van de pagina, die Safari nam zodra de strook weg was) en geen flikkering (de strook ging aan en uit tijdens het scrollen langs de kop).
  Eén van de twee blauwen, tot de modus wisselt, is wat hij kiest boven de zachte overgang naar de pagina.
  De blauwe rand loopt na het scrollen 8 pixels door onder de statusbalk, zoals de beslissing van 25 oktober voor de strook zelf al beschreef.
  De balk "Op deze pagina:" moest onder de strook, want hij plakte vast bij `top: 0`, over de strook heen: Safari nam dan de kleur van de balk voor de statusbalk (zand in licht), en niet het blauw van de strook.
- **Gemeten in de simulator:** twee dingen.
  Met de balk over de strook is de statusbalk na het scrollen zand; met de balk eronder is hij blauw.
  Met één beeldje `display: none` in `refreshTopEdge` in plaats van twee leest Safari de nieuwe kleur niet: de statusbalk bleef de oude kleur terwijl de strook zelf al de nieuwe had.
  Twee beeldjes blijven dus nodig, en die tijd (ruim 30 milliseconden) kunnen we niet korter maken.
- **Alternatieven:** de strook alleen laten staan zolang de kop of het menu in beeld is, zoals de beslissing van 25 oktober (dan neemt Safari de kleur van de pagina, en de strook wisselt aan en uit tijdens het scrollen).
  Een strook die met `position: absolute` meescrolt, of een animatie op basis van de scrollpositie (zie _De blauwe rand bovenaan scrolt weg met de kop_); beide hebben we niet uitgeprobeerd, want de strook die blijft staat is eenvoudiger en doet wat de projecteigenaar vroeg.
  De balk "Op deze pagina:" laten zoals hij was, over de strook (Safari neemt dan zijn kleur).
  `refreshTopEdge` verkorten tot één beeldje (zie boven: Safari leest de kleur dan niet).
- **Later:** de strook in de kleur van de kop zit er nu ook na het scrollen; zie _De rand bovenaan in Safari heeft de kleur van de kop, door een echte strook van minstens 8 pixels_ en _De blauwe rand bovenaan scrolt weg met de kop_ voor wat daarvoor gold.
- **Gecontroleerd en niet gecontroleerd:** in de iOS Simulator (iOS 27.0, iPhone 18 Pro) in Safari, op `/statistieken` met de balk "Op deze pagina:" en op `/over-ons`: de statusbalk is blauw boven aan de pagina en na het scrollen, in licht en in donker, en wisselt mee als het systeem van thema wisselt (ook na het scrollen) en met de knop Licht of Donker.
  Een screenshot kan de twee beeldjes waarin de strook van de pagina is niet laten zien, dus of de statusbalk bij het wisselen nog een ogenblik flikkert, is niet te zeggen; bij scrollen is er niets meer dat de strook wisselt.
  Een test in Chromium (`e2e/safe-area.spec.ts`) controleert dat de strook na het scrollen blijft, zonder `hidden`, en in licht en donker de kleur van de kop heeft.
  Niet op een echte telefoon, niet in iOS 26, niet op een iPad en niet in een app op het beginscherm; de projecteigenaar kijkt dat na.

## De inhoud van de kop blijft zichtbaar als hij onder de statusbalk wegscrolt

- **Datum:** 25 oktober 2026
- **Besluit:** de inhoud van de kop blijft zichtbaar tot de kop uit beeld is.
  De pull request die hem doorzichtig maakte (#253, voor issue #252) is teruggedraaid.
  De strook die met de kop wegscrolt (zie _De blauwe rand bovenaan scrolt weg met de kop_) blijft.
- **Waarom:** de projecteigenaar vond het resultaat van de eerste aanpak (#251) goed genoeg.
  Het menu dat even door de statusbalk schemert, neemt hij op de koop toe.
- **Alternatieven:** de inhoud van de kop doorzichtig maken zodra hij binnen 64 pixels van de bovenkant komt, met `opacity: 0` en niet met `visibility: hidden`, zoals #253 deed.
  Dat haalt het menu uit de statusbalk, maar kost een tweede `IntersectionObserver` en een attribuut op de kop.
  Een drempel van 8 pixels, gelijk aan die van de strook, was te laag: het menu bleef in de simulator zichtbaar tot ongeveer 55 punten.
  `visibility: hidden` haalt de kop uit de toegankelijkheidsboom en laat een element met focus verdwijnen.
- **Gecontroleerd en niet gecontroleerd:** de code is gelijk aan die na #251.
  Niet op een echte telefoon, niet in iOS 26 en niet in de app op het beginscherm.
- **Later:** de strook die met de kop wegscrolt, blijft niet: zie _De statusbalk van Safari heeft altijd één van de twee blauwen, tot de modus wisselt_ (de strook blijft altijd staan).

## De footer heeft geen lijn bovenaan

- **Datum:** 25 oktober 2026
- **Besluit:** de footer heeft geen lijn bovenaan.
  Het kleurverschil met de body is genoeg: de footer is een vlak van rand tot rand dat alleen door zijn kleur van de body verschilt.
  De rol `--hf-colour-border-footer` is weggehaald, met zijn regel in de tabel Tokens › Kleur en zijn contrastpaar.
- **Waarom:** een lijn bovenaan de footer maakt hem glazig.
  Het vlak van de footer is al te zien aan zijn kleur, en de lijn voegt daar niets aan toe.
  Zonder rand heeft de footer geen strook van 1 pixel meer buiten het vlak waar de strepen van de Friese vlag hun maat van nemen, dus de twee delen van de strepen sluiten precies op elkaar aan.
- **Alternatieven:** de lijn houden zoals hij is; een zachtere lijn (dichter bij de kleur van de footer, maar nog steeds een lijn die het vlak omlijst).

## De zinnen en de knoppen in de footer breken niet af

- **Datum:** 25 oktober 2026
- **Besluit:** de twee zinnen en de knoppen Licht en Donker in de footer breken niet af binnen een regel; het menu met de links mag dat wel.
  Een zin blijft op één regel (`white-space: nowrap`), een knop houdt zijn pictogram en tekst bij elkaar, en de twee knoppen staan naast elkaar (`flex-wrap: nowrap`).
  Op een middelbaar scherm geeft het menu mee: vanaf 40rem is de kolom met de tekst zo breed als de tekst zelf (`auto`) en neemt de kolom met de links de rest (`1fr`), rechts uitgelijnd.
  De links breken dan af in een tweede rij naast de tekst, en de tekst en de knoppen blijven heel.
  Het menu staat ter hoogte van de bovenkant van de tekst en beslaat alle rijen, zodat een tweede rij links de twee zinnen niet uit elkaar duwt.
  Onder 19,5rem breken de tekst en de knoppen weer af, als noodgreep.
  De links in de footer breken af in rijen die ongeveer even lang zijn (`text-wrap: balance`), zodat een tweede rij niet maar één link telt terwijl de eerste vol is.
  Een rij van een flexbox is niet te verdelen, dus in de footer is de lijst een regel van `inline-block`-elementen, met 1,5rem tussen de links, net als in de andere menu's.
  Een browser die `text-wrap: balance` niet kent (het staat in `@supports`) houdt de flexbox, zoals het was.
- **Waarom:** een zin of een knop die midden in de regel afbreekt, ziet er onhandig uit bij een middelbare breedte.
  Het menu bestaat uit losse links die makkelijk onder elkaar passen.
  De tekst en de knoppen zijn hoogstens 14,1rem breed, en 17rem met de tekstafstand van WCAG 1.4.12 (letters 0,12em en woorden 0,16em uit elkaar, gemeten in Chromium); met 2rem marge aan de zijkanten past dat vanaf 19rem op één regel.
  De grens 19,5rem ligt daar een stukje boven, en onder 320 pixels (20rem).
  Een scherm van 320 pixels breed en 400% zoom (dat is ook 320 CSS-pixels) scrolt dus niet zijwaarts (WCAG 1.4.10), ook niet met die tekstafstand.
  De grens staat in rem, dus hij volgt een groter lettertype: bij tekst op 200% ligt hij op 624 pixels, en daar zijn de tekst en de knoppen ook twee keer zo breed.
  Een grens in pixels zou dat niet doen.
- **Alternatieven:** alles laten afbreken zoals nu.
  Het menu ook niet laten afbreken en het onder het blok zetten tot de links op één regel passen (vanaf 51rem met de zes links van nu); dan hangt de breedte van de footer af van het aantal links, dat het designsysteem niet kent, en op veel meer breedtes staat het menu onder de tekst.
  Een flexbox in plaats van het raster, waarin het menu als geheel naar een volgende rij verhuist; dat kan niet zonder de twee zinnen en de knoppen in een eigen element te zetten.
  De links laten afbreken zoals voorheen, met de eerste rij vol en een kort stuk in de tweede; de projecteigenaar wilde rijen van gelijke lengte.
- **Gecontroleerd en niet gecontroleerd:** de footer op de site, met de zes links van nu, in een breedte van 240 tot 1200 pixels, ook met een groter lettertype en in donker: de zinnen staan op één regel, de knoppen naast elkaar en de pagina scrolt niet zijwaarts, vanaf 19,5rem.
  De links staan bij 640 tot 800 pixels in twee rijen van drie (223 en 274 pixels breed, voorheen vier en twee), en bij 240 tot 300 pixels in drie rijen van twee, ook zonder zijwaarts scrollen.
  Voor de wijziging braken de zinnen en de knoppen af tussen 640 en ongeveer 790 pixels: bij 640 pixels viel de eerste zin in vijf regels uiteen en de knoppen stonden onder elkaar.
  Niet gecontroleerd: een echte instelling van het lettertype in de browser, want de grens in rem volgt die instelling en een test in een iframe kan hem niet zetten.
- **Later:** zie _De themaschakelaar is één knop rechtsboven in de header_.
  De footer heeft de knoppen Licht en Donker niet meer, dus de regels voor knoppen in de footer zijn weg.
  De twee zinnen breken nog niet af, en de links blijven afbreken in rijen van gelijke lengte.
- **Later:** zie _De knop naar boven heeft de kleuren van links in de footer en een eigen kolom in het raster_.
  Heeft de footer die knop, dan breken de zinnen pas af onder 22,25rem in plaats van 19,5rem, en staan de links in de tweede kolom van drie.

## Artikelen van de redactie staan in de database

- **Datum:** 25 oktober 2026
- **Besluit:** artikelen van de redactie staan in de database, in een eigen tabel `articles`, en niet als bestanden in de code.
- **Waarom:** de redactie bestaat uit vrijwilligers die het beheer gebruiken.
  Een artikel in de code vraagt voor elk woord een release.
  In de database kan het beheer het schrijven, en blijft er een logboek van wie wat deed.
- **Alternatieven:** een pagina in de code (sneller te bouwen, maar elke wijziging is een release en een vrijwilliger kan het niet zelf); een bericht in de tabel `items` met onze eigen naam als bron (hergebruikt veel, maar het filter, het verbergen en de vijf kaarten gaan er dan over, en een artikel is geen kop met een link).

## Het nieuwste artikel is een kaart bovenaan de homepage, en elk artikel heeft een eigen pagina

- **Datum:** 25 oktober 2026
- **Besluit:** het nieuwste artikel staat als kaart "Van de redactie" bovenaan de hoofdkolom van de homepage, en elk artikel heeft een eigen pagina op `/redactie/<slug>`.
- **Waarom:** bij de lancering stelt de redactie zich zo voor, en een eigen adres is te delen.
  De kaart staat boven het nieuws omdat het eerste artikel een aankondiging is; zonder artikel verdwijnt hij.
- **Alternatieven:** een kaart in de zijbalk (rustiger, maar een aankondiging valt dan minder op); alleen een pagina met een link in de footer en bij Over ons (de homepage blijft puur nieuws, maar niemand vindt het artikel).
- **Hoe:** de kaart is het component `ArticleCard` van het designsysteem, de pagina gebruikt `Article`.
  De titel en "Lees verder" in de kaart gaan naar dezelfde pagina; de naam van "Lees verder" noemt het artikel, zodat de link ook los begrijpelijk is.
  De kaart telt niet mee voor de tien koppen van "Laatste nieuws".
  Een artikel krijgt geen eigen afbeelding bij een gedeelde link; het heeft hetzelfde plaatje als elke pagina: het schild op het donkerblauw van de kop, zoals de app-iconen (zie _Het schild van de site, als PNG van ons eigen domein, is de afbeelding bij het delen van links_).
  De projecteigenaar koos dit op 25 oktober 2026; het issue (#263) zegt dat "geen afbeelding bij de link" geen eigen afbeelding per artikel betekende.
  Een eigen afbeelding per artikel kan later.
- **Later:** zie _De homepage en het nieuws zijn twee pagina's, en het forum staat bovenaan de zijbalk van de homepage_ (1 november 2026): het nieuwste artikel staat ook als nieuwsregel in de zijbalk van `/nieuws`.

## Artikeltekst heeft een kleine eigen opmaak, die een eigen functie omzet

- **Datum:** 25 oktober 2026
- **Besluit:** de tekst van een artikel heeft een kleine eigen opmaak (alinea's, een kop, een lijst, vet, cursief en een link) en wordt met een eigen functie omgezet, zonder HTML en zonder dependency.
- **Waarom:** een artikel is tekst met een paar kopjes en links.
  Wie het schrijft, hoeft geen HTML te kennen, en wie het account van een schrijver overneemt, kan er geen scripts mee inspuiten.
- **Alternatieven:** Markdown met een bibliotheek (volledig, maar een dependency en veel meer dan we nodig hebben); HTML (gevaarlijk); platte tekst zonder opmaak (te weinig voor een artikel met koppen en links).
- **Hoe:** `parseArticleText` in `apps/site/src/article-text.ts` leest de tekst tot gewone gegevens, en `ArticleText` maakt er elementen van die React escapet.
  Er is geen `dangerouslySetInnerHTML` en geen reguliere expressie die over de hele tekst loopt.
  Elke zoektocht naar een sluitteken stopt bij het eerste teken dat een partner uitsluit, dus de tijd groeit met de lengte van de tekst.
  De tests proberen een regel van een miljoen tekens, een miljoen openende tekens zonder partner en tienduizend regels met vijfduizend alinea's erachter.
  - Een alinea is een stuk tussen lege regels; de regels erin lopen in elkaar over.
  - Een kop is een stuk van één regel dat met `## ` begint, en is een kop van niveau 2.
    Een lijst is een stuk waarvan elke regel met `- ` begint.
    Alles anders is een alinea, ook `# Kop`, `### Kop` en `1. punt`.
  - Vet en cursief staan binnen één alinea of lijstpunt.
    Cursief staat in vet (ook aan het einde: `**vet *cursief***`), niet andersom.
    Een teken met een spatie ertegenaan (`2 * 3 * 4`) en een teken zonder partner blijven staan zoals ze zijn.
    Een kop en de tekst van een link bevatten geen opmaak.
  - Een link gaat naar `https://` met een adres zonder spatie, haakjes, backslash, aanhalingsteken of inlog (`https://www.lc.nl@evil.example`), of naar een pagina van ons die met één `/` begint.
    `//evil.example` en `/\evil.example` weigert de functie, want een browser leest ze als een andere site, net als een adres met een tab of nieuwe regel.
    `http:`, `javascript:`, `data:`, `mailto:` en een adres zonder `https://` blijven gewone tekst, met de tekens erbij.
    Een afbeelding (`![](…)`) is geen opmaak: het uitroepteken blijft staan, en de rest wordt een link.
  - Een link naar een andere site krijgt het pictogram voor een externe link en `rel="noopener"`.
    Er komt geen `nofollow` en geen `noreferrer` bij: de tekst schrijven wij, en een bron mag zien dat bezoekers van ons komen.
    De link opent in hetzelfde tabblad, zoals elke link van de site.
- **Later:** zie _De tekst van een artikel wordt bewaard als Tiptap's JSON, met een lijst van wat mag_ (27 oktober 2026): de tekst is geen eigen opmaak meer maar Tiptap's JSON, en `parseArticleText` en `article-text.ts` zijn weg.
  Wat er over blijft van deze beslissing: er is geen HTML en geen `dangerouslySetInnerHTML`, `ArticleText` maakt elementen die React escapet, en een link gaat alleen naar `https://` of naar een pagina van ons.
  `safeAddress` staat nu in `packages/shared/src/article-document.ts`, en de oude parser leeft voort als bron van de migratie in `packages/db/src/legacy-article-text.ts`.

## Een artikel is gepubliceerd als `published_at` gevuld is en niet na nu ligt

- **Datum:** 25 oktober 2026
- **Besluit:** een artikel staat op de site als `published_at` een tijd heeft die niet na het moment van nu ligt.
  Een artikel met een lege `published_at` is een concept, en met een tijd in de toekomst staat het er pas als die tijd komt.
  Intrekken is `published_at` weer leeg maken.
- **Waarom:** één kolom zegt alles, ook voor de SQL-opdrachten van de eigenaar zolang het beheer ontbreekt (#264), en een gepland artikel kost niets extra.
- **Alternatieven:** een aparte kolom `status` (twee kolommen die elkaar kunnen tegenspreken, en een concept met een tijd zou raadselachtig zijn); een tijd in de toekomst weigeren (kan niet in een kolom, en de eigenaar kan een artikel dan niet vooruit zetten).
- **Hoe:** de queries krijgen het moment van nu mee, zoals `listRecentItems`, en vergelijken met `lte`.
  Een concept en een adres dat geen artikel is geven dezelfde pagina "niet gevonden" met een 404, zodat niets verraadt dat een concept bestaat.
  Het adres moet precies kloppen: de collatie van de tabel negeert hoofdletters en een spatie erachter, en dat zou één artikel twee adressen geven, dus de query vergelijkt de `slug` daarna nog eens exact.

## De pagina's met artikelen komen niet uit een cache

- **Datum:** 25 oktober 2026
- **Besluit:** de kaart op de homepage en de pagina van een artikel lezen de database bij elk bezoek, zonder de cache van vijf minuten die de koppen hebben.
  Een artikel dat verschijnt of wordt ingetrokken, staat er dus meteen.
- **Waarom:** een fout in een artikel moet meteen weg kunnen, en de vraag is één opzoeking in een index (`articles_published_at_idx` voor de kaart, de unieke `slug` voor de pagina).
  Met een cache zou de eigenaar vijf minuten lang een artikel zien dat hij al introk.
- **Alternatieven:** vijf minuten cachen zoals de koppen (minder vragen, maar het artikel is niet meteen weg); de kaart wel en de pagina niet cachen (een ingetrokken artikel blijft dan bereikbaar via zijn adres).
- **Hoe:** een fout bij het lezen van het nieuwste artikel laat alleen de kaart weg en komt in het logboek; de homepage toont het nieuws gewoon.
  Een fout bij het lezen van de pagina van een artikel geeft de foutpagina, zoals bij `/podcasts`.

## De tabel `articles`: een mediumtext, een sleutel naar het account en een controle op het adres

- **Datum:** 25 oktober 2026
- **Besluit:**
  - `body` is een `mediumtext` (16 MB): een artikel past ruim in een `text` (64 kB), maar de grens van het beheer staat dan niet in het schema, en een `mediumtext` heeft geen nadeel.
    `title`, `slug`, `intro` en `author` zijn `varchar` van 120, 80, 300 en 100 tekens, en een tekst die te lang is, laat de opdracht falen in plaats van hem af te kappen, zolang MariaDB op zijn standaardinstelling staat (strikt).
  - `slug` is uniek en heeft een CHECK-regel die alleen kleine letters, cijfers en enkele streepjes toestaat.
    De regel begint met `(?-i)`, want de collatie `utf8mb4_unicode_ci` negeert hoofdletters en `[a-z]` zou ze anders doorlaten.
  - `created_by` heeft een foreign key naar `admin_users`, zonder cascade.
    Een account wordt uitgezet (`admin:revoke`) en nooit verwijderd, dus de schrijver van elk artikel blijft bekend, en het verwijderen van een account met artikelen faalt, net als bij het logboek.
  - `published_at` heeft een index voor de vraag naar het nieuwste artikel.
  - `updated_at` krijgt bij een wijziging geen waarde van de database: wie een artikel verandert, zet het zelf, zoals de SQL-opdrachten in `docs/artikelen.md` doen.
    De sitemap gebruikt hem niet.
- **Waarom:** het schema dwingt af wat een pagina nodig heeft, ook als iemand rechtstreeks met SQL werkt, zoals de eigenaar tot #264 klaar is.
- **Alternatieven:** een `text` voor `body` (kleiner, maar het scheelt niets en 64 kB is vlug bereikt); de opmaak van het adres alleen in de code controleren (de SQL-opdrachten van de eigenaar komen er dan omheen); `ON DELETE CASCADE` of `SET NULL` voor `created_by` (een artikel mag niet stil verdwijnen of zijn schrijver kwijtraken).
- **Later:** de tabel heeft ook `updated_by`, verplicht en met dezelfde foreign key, en wie een artikel verandert zet hem samen met `updated_at`; zie _Een artikel bewaart wie het veranderde en elke versie van de tekst_.
- **Gecontroleerd:** `articles.test.ts` en `articles-migration.test.ts` van `@fansite/db`, op een echte MariaDB: het adres, de lengtes, de unieke sleutel (ook met een spatie erachter), de foreign key, accenten en een emoji in de tekst, een tekst van een miljoen tekens, en dat de migratie de rijen van andere tabellen met rust laat.

## Het eerste artikel gaat met SQL de database in, en de seed zet geen artikel

- **Datum:** 25 oktober 2026
- **Besluit:** de seed zet geen artikel op acceptatie.
  De eigenaar zet het eerste artikel met de opdrachten uit `docs/artikelen.md`, eerst op acceptatie en dan op productie.
  Voor de controles en voor de screenshots staat een verzonnen artikel in `apps/site/e2e/articles.ts`, dat `pnpm --filter site test-data` ook in je eigen database zet.
- **Waarom:** de seed draait op acceptatie bij elke start.
  Een voorbeeldartikel daar zou na het echte artikel nog steeds staan, of het echte artikel verdringen als het nieuwste.
  Een artikel is bovendien tekst van onszelf en geen testbron: er is niets om op te testen dat de eigenaar niet met dezelfde opdracht zet.
- **Alternatieven:** een verzonnen artikel in de seed, alleen op acceptatie (laat de functie meteen zien, maar het mengt zich met het echte artikel en de eigenaar moet het weghalen).
- **Later:** de opdracht in `docs/artikelen.md` zet nu ook `updated_by`, want die kolom is verplicht, en een artikel dat met SQL is gemaakt heeft geen versie; zie _Een artikel bewaart wie het veranderde en elke versie van de tekst_.

## De sjablonen kennen `Strong` en `Emphasis`

- **Datum:** 25 oktober 2026
- **Besluit:** het designsysteem heeft de componenten `Strong` en `Emphasis`, voor een `strong` en een `em` in een tekst.
  Ze hebben geen eigen klasse: de stijl komt van de elementen zelf, zoals bij `Time`.
- **Waarom:** de sjablonen van de site bevatten geen HTML (zie _Sjablonen bevatten geen HTML, alleen componenten uit het designsysteem_), en de opmaak van een artikel heeft vet en cursief nodig.
- **Alternatieven:** de regel van ESLint voor één bestand uitzetten (dat maakt van een regel zonder uitzonderingen er een met); vet en cursief met `Text` maken (`Text` zet het gewicht van de tekst en maakt vet dus weg).

## Alleen een beheerder schrijft en publiceert artikelen

- **Datum:** 25 oktober 2026
- **Besluit:** alleen een beheerder schrijft en publiceert artikelen, op `/beheer/artikelen`.
  Een moderator verbergt berichten, maar schrijft niet.
  Elke pagina en elke actie van de artikelen vraagt `requireRole('beheerder')`, en voor een moderator is de pagina "niet gevonden".
  Het beheer verwijst een moderator ook niet naar de pagina: `/beheer` toont de link alleen aan een beheerder.
- **Waarom:** de redactie is nog klein, en een artikel staat onder onze naam.
  Een aparte rol voor vrijwilligers die schrijven, met een controlestap erbij, komt met #40.
- **Alternatieven:** ook moderators laten schrijven (een grotere groep zonder controlestap); een nieuwe rol `redacteur` nu al (meer werk dan de lancering vraagt).

## Een artikel wordt ingetrokken en niet verwijderd, en het adres van een gepubliceerd artikel staat vast

- **Datum:** 25 oktober 2026
- **Besluit:** een artikel wordt ingetrokken en niet verwijderd: er is geen knop om te verwijderen.
  Intrekken maakt `published_at` leeg, dus het is weer een concept.
  Het adres (`slug`) van een artikel dat een `published_at` heeft, verandert niet.
  De server weigert het met een fout bij het veld, en het formulier toont het adres dan alleen-lezen.
  Wie het adres toch wil veranderen, trekt het artikel eerst in.
- **Waarom:** een gedeelde link mag niet kapotgaan, en "niets stil weggooien" geldt ook voor onze eigen teksten.
  Intrekken is te herstellen.
- **Alternatieven:** verwijderen met een bevestiging (permanent, geen spoor); het adres vrij laten bewerken (gedeelde links breken).

## Een artikel schrijven geeft vier acties in het logboek, en schrijft alleen als er iets veranderde

- **Datum:** 25 oktober 2026
- **Besluit:** het logboek heeft vier acties erbij: `article.create`, `article.update`, `article.publish` en `article.unpublish` (migratie `0011_add_article_audit_actions`).
  `item_id` bevat bij deze acties het nummer van het artikel; de actie zegt of het een bericht of een artikel is.
  Er staat niets van de tekst in, ook geen titel.
  "Publiceren" slaat wat op het scherm staat op en publiceert het in één transactie, dus het geeft een `article.update` (als er iets veranderde) en een `article.publish`.
  Een artikel dat met SQL een `published_at` in de toekomst kreeg, wordt niet opnieuw gepubliceerd: de beheerder trekt het eerst in.
  Zoals bij het verbergen is een wijziging en haar regel één transactie, en een actie die niets verandert schrijft niets:
  - opslaan zonder verschil schrijft geen `article.update` en laat `updated_at` staan;
  - publiceren van wat al een `published_at` heeft, doet niets en schrijft geen tweede `article.publish`;
  - intrekken van een concept doet niets.
- **Waarom:** een tweede klik of een tweede tabblad mag het logboek niet laten liegen, en twee verzoeken tegelijk mogen niet allebei publiceren.
  Dat laatste is vergrendeld met `SELECT ... FOR UPDATE` in de transactie.
  Een artikel met een `published_at` in de toekomst opnieuw publiceren zou dat vergrendelen breken: twee verzoeken tegelijk vinden dan elk de tijd van de ander "later".
  De tijd van een publicatie komt uit één plek: het `now` van de functie, waar de actie niets in doorgeeft.
- **Alternatieven:** een regel bij elke opslag, ook zonder verschil (het logboek vermeldt dan wijzigingen die er niet zijn); de titel in het logboek (tekst van een artikel hoort er niet in, en een titel verandert); het nummer van het artikel in een eigen kolom (een migratie voor iets wat `item_id` met de actie al zegt).

## Het formulier voor een artikel stuurt een fout in een toestand terug, en niet via het adres

- **Datum:** 25 oktober 2026
- **Besluit:** het formulier van `/beheer/artikelen` is een client-component met `useActionState`, zoals het contactformulier (zie _Bij een fout gaat de focus naar het blok met fouten_).
  Een serveractie die een veld fout vindt, geeft de fouten en de ingevulde waarden terug.
  Het formulier toont ze in een `ErrorSummary` en bij het veld, en met JavaScript krijgt het blok de focus.
  Zonder JavaScript laadt de pagina opnieuw met dezelfde fouten en waarden.
  Een geslaagde actie stuurt door naar het formulier van het artikel, met `?gedaan=` en een melding uit de toestand van de database: die zegt alleen iets over wat waar is, net als `?verborgen=` bij de berichten.
  "Opgeslagen" en "Concept gemaakt" gelden vijf minuten, naar de tijd van het artikel zelf.
- **Waarom:** het verbergen van een bericht zet de fout in het adres, maar een tekst van 20.000 tekens past er niet in, en een beheerder mag niets kwijtraken wat hij schreef.
  Met de waarden in de toestand blijft alles staan.
- **Alternatieven:** de fout en de tekst in het adres of in een cookie (te groot, en de site zet maar één cookie, dat van de sessie); de tekst in `localStorage` bewaren (alleen met JavaScript, en een uitzondering op "geen opslag").
- **Hoe:** "Opslaan" is de eerste knop van het formulier, dus Enter bewaart en publiceert niet.
  Een knop met `pending` is uitgeschakeld, zodat een dubbele klik geen tweede verzoek geeft.
  Met JavaScript volgt het adres de titel tot de schrijver er zelf in typt; zonder JavaScript maakt de server hetzelfde voorstel (`suggestSlug`) van een leeg adres.
- **Later:** zie _Artikelen schrijven vraagt JavaScript, lezen niet_ (27 oktober 2026): het formulier werkt niet meer zonder JavaScript, want de editor draait in de browser.
  De rest blijft: de fouten en de waarden komen terug in de toestand, en met de ingevulde tekst als JSON in het verborgen veld van de editor.

## De velden van een artikel worden altijd op de server gecontroleerd en schoongemaakt

- **Datum:** 25 oktober 2026
- **Besluit:** de server controleert alles wat het formulier stuurt (`apps/site/src/beheer/article-form.ts`), ook als de browser het al deed:
  - titel (120), intro (300), auteur (100) en adres (80) zijn één regel: besturingstekens en dubbele spaties worden één spatie;
  - de tekst (20.000 tekens, geteld in tekens zoals de kolom) houdt zijn regels en lege regels, krijgt `\n` als regeleinde en verliest besturingstekens en lege regels aan beide kanten, zodat opslaan en weer openen niets verandert;
  - het adres heeft alleen kleine letters, cijfers en enkele streepjes, is uniek (de unieke sleutel beslist, dus twee gelijktijdige opslagen geven één artikel en één fout) en is niet de eerste naam van een pagina van de site (`reservedSlugs`, met een test die faalt bij een nieuwe pagina);
  - een leeg adres wordt het voorstel uit de titel, en geeft een fout als de titel niets heeft om een adres van te maken.
- **Waarom:** de tabel wijst een te lange tekst af (zie _De tabel `articles`: een mediumtext, een sleutel naar het account en een controle op het adres_), maar de schrijver moet weten welk veld en hoe.
  De tekst is geen HTML en `ArticleText` maakt er elementen van, dus er is niets te escapen bij het opslaan.
  Een artikel staat op `/redactie/<adres>`, dus een adres als `bronnen` botst nu niet; de lijst voorkomt verwarring en houdt de weg open om artikelen later bovenaan de site te zetten.
- **Alternatieven:** de browser laten controleren met `maxLength` (die kapt een geplakte tekst stil af, en de schrijver ziet het niet); geen grens aan de tekst (de kolom houdt 16 MB, maar een tekst van die lengte is niet te lezen en niet te controleren).
- **Later:** zie _De tekst van een artikel wordt bewaard als Tiptap's JSON, met een lijst van wat mag_ (27 oktober 2026): de tekst is niet meer de opmaak met regels en lege regels maar JSON, `cleanBody` is weg, en de grens van 20.000 tekens telt de zichtbare tekst.
  De andere velden blijven zoals ze waren.

## Het voorbeeld van een artikel is een pagina van het beheer, met dezelfde componenten

- **Datum:** 25 oktober 2026
- **Besluit:** `/beheer/artikelen/<nummer>/voorbeeld` toont het artikel met `Article` en `ArticleText`, dezelfde als de pagina van een bezoeker.
  Een concept heeft nog geen datum, dus het voorbeeld toont de dag van vandaag, met een kaart erboven die dat zegt.
  De pagina valt onder `/beheer`: alleen een ingelogde beheerder opent haar, en de proxy geeft haar `noindex` en `no-store`.
  De openbare pagina `/redactie/<adres>` zegt voor een concept "niet gevonden" en verraadt niets, ook niet via het nummer.
- **Waarom:** dezelfde componenten zorgen dat het voorbeeld laat zien wat een bezoeker straks ziet.
  Een voorbeeld op een openbaar adres zou een concept raadbaar maken.
- **Alternatieven:** een voorbeeld op `/redactie/<adres>?voorbeeld=1` voor een ingelogde beheerder (het cookie hoort alleen bij `/beheer`, dus de pagina kan niet weten wie kijkt); een eigen opmaak voor het voorbeeld (het kan dan afwijken).

## De browsertest die een artikel publiceert, draait als eigen project na de andere

- **Datum:** 25 oktober 2026
- **Besluit:** `e2e/writing.spec.ts` heeft een eigen Playwright-project, `chromium-writing`, dat pas begint als `chromium` helemaal klaar is.
  `e2e/admin.ts` maakt een beheerder naast de moderator, elk met een sessie, en `adminCookie(host, rol)` geeft het cookie.
  De teardown verwijdert ook de artikelen van die accounts, voor de logregels en de accounts.
- **Waarom:** een gepubliceerd artikel is het nieuwste en wordt de kaart op de homepage, en dan zou de test van de kaart in `articles.spec.ts` falen, afhankelijk van wie eerst kwam.
- **Alternatieven:** de test het artikel meteen laten intrekken (een korte tijd blijft het zichtbaar, en parallelle tests zien het dan soms); de test van de kaart minder streng maken (hij toetst dan minder).
- **Later:** zie _Artikelen schrijven vraagt JavaScript, lezen niet_ (27 oktober 2026): `writing.spec.ts` schrijft het artikel nu met de editor, en alleen met JavaScript.
  Het lezen van het gepubliceerde artikel zonder JavaScript staat nog in dezelfde test.

## Het relevantiefilter kent de Friese schrijfwijze van de club en Friese voetbalwoorden

- **Datum:** 25 oktober 2026
- **Besluit:** het filter kent de Friese schrijfwijze van de club, "Hearrenfean", en een lijst Friese voetbalwoorden, naast de Nederlandse (besluit van de projecteigenaar, #270).
  - "sc Hearrenfean" (ook "s.c.", "SC" en in "sc Hearrenfean-fan") is `relevant`, zoals "sc Heerenveen".
  - "Hearrenfean" met een voetbalwoord (Nederlands of Fries), de achternaam van iemand van de club of een andere profclub is `relevant`; "Hearrenfean" alleen is `doubtful`.
    Een kop mag allebei de schrijfwijzen hebben.
  - Het bijvoeglijk naamwoord "Feanster" is de naam van de club niet, net als "Heerenveense": een kop met alleen "Feanster" is `irrelevant`, ook met een voetbalwoord.
    Staat "Hearrenfean" erbij, dan beslist die naam.
  - `relevance-terms.ts` heeft `clubNames` voor de twee namen en `frisianFootballWords` voor de Friese woorden.
    De regels uit #74 blijven: hoofdletters en accenten tellen niet (een "â", "û" of "ú" valt weg), alleen hele woorden, en het streepje splitst.
    De Friese "y" en "ij" hoeven niets: de lijst schrijft de woorden zoals het Fries ze schrijft ("kompetysje"), en het filter zet er niets om.
- **Waarom:** Omrop Fryslân, onze eerste regionale bron, schrijft veel in het Fries, en de grote meerderheid van de Friestalige koppen over de club (50 van de 53 bij Sportcast) noemt de club zo.
  Zonder de Friese woorden mist het filter juist de berichten die een supporter uit Friesland wil zien.
  Een gemist clubbericht is erger dan een bericht dat een moderator verbergt (zie _Een volledige naam is genoeg, en "wint" en "verliest" zijn voetbalwoorden_).
- **De Friese woorden:** 23 woorden, elk gevonden op de Friese Wikipedia (fy.wikipedia.org) op 25 oktober 2026, op de pagina's "SC Hearrenfean", "Fuotbal", "Earedifyzje" en "KNVB-beker".
  De feed van Omrop Fryslân had die dag geen enkele Friese voetbalkop (alle 50 koppen zijn Nederlands, op "Liwwadder" en "Fryslân" na), dus geen woord komt uit de feed.
  Een woord dat het Nederlands en het Fries hetzelfde schrijven (wint, doelpunt, supporters, stadion, trainer, kampioen), staat alleen in de Nederlandse lijst.
  De lijst is: alvetal, earedifyzje, ferdigener, ferdigeners, ferlear, fuotbal, fuotballer, fuotballers, haadtrainer, kompetysje, middenfjilder, middenfjilders, oerwinning, seleksje, skoarden, thusoerwinning, thuswedstriden, trener, utoerwinning, utwedstriid, wedstriden, wedstriid en wun ("wûn").
- **Wat we niet opnamen:** woorden die ook buiten het voetbal gewoon zijn, naar de les van "wint": "ploech" (ook elke groep of ploeg), "spiler" (speler van alles), "útslach" (uitslag, maar ook huiduitslag), "kampioenskip" (ook bij fierljeppen en skûtsjesilen), "ferlies" (ook verlies in geld), "promoasje", "beker" en "oanhing".
  Een kop met een van die woorden en "Hearrenfean" is `doubtful`.
  "ferliest", "winne" en "skoarje" vonden we niet op de pagina's, dus ze staan er niet; "wint" staat al in de Nederlandse lijst.
- **De afweging bij "wûn" en "ferlear":** zoals "wint" en "verliest" maken ze van "Frou wûn lotterij yn Hearrenfean" een `relevant` kop, die een moderator verbergt.
  Dat nemen we aan, want een weggelaten "Hearrenfean wûn fan Cambuur" is erger.
  De tests houden die twee valse treffers zichtbaar.
- **De telling van Omrop Fryslân:** de 50 koppen van 25 oktober 2026 geven met de Friese woorden dezelfde uitkomst als zonder: 4 `relevant`, 2 `doubtful` en 44 `irrelevant`, en geen kop veranderde.
  Dat klopt, want geen kop had een Friese schrijfwijze of een Fries voetbalwoord.
  De verandering werkt dus pas als de bron een Friestalige kop over de club schrijft, zoals Sportcast.
- **Alternatieven:** niets doen (de Friese koppen verdwijnen stil); het Fries volledig laten vertalen door een taalmodel (traag, duur, niet te testen, tegen _Het relevantiefilter kijkt alleen naar de kop, en bewaart wat het niet toont_); alleen de naam van de club toevoegen en geen voetbalwoorden (eenvoudiger, maar "Hearrenfean wint" blijft dan `doubtful`, en "Hearrenfean wûn" ook).

## Een artikel bewaart wie het veranderde en elke versie van de tekst

- **Datum:** 25 oktober 2026
- **Besluit:** een artikel bewaart elke opgeslagen versie van zijn inhoud in een eigen tabel, `article_versions`, en een kolom `updated_by` zegt wie het artikel het laatst veranderde (#274).
  - `updated_by` is het nummer van een account, met een foreign key naar `admin_users` zonder `cascade`.
    Elke wijziging van het artikel zet hem samen met `updated_at`: een bewerking, het publiceren en het intrekken.
  - Een versie bewaart de titel, het adres, de intro, de tekst en de auteur, met `saved_at` (UTC) en `saved_by` (het nummer van het account).
    Versie 1 is het artikel zoals het voor het eerst is opgeslagen.
  - Een versie komt in dezelfde transactie als de wijziging, via de ene functie `recordVersion` in `apps/site/src/beheer/article-versions.ts`.
    Alleen maken en bewerken geven een versie.
    Publiceren, intrekken en opslaan zonder verschil geven er geen.
  - Niets in de site wijzigt of verwijdert een versie, en `article-versions.test.ts` houdt dat zo, zoals `audit-log.test.ts` voor het logboek.
- **Waarom:** het logboek van beheeracties zegt wie wat deed, maar niet wat er stond.
  Een artikel staat onder onze naam, dus een fout of een omstreden wijziging moet na te gaan en terug te halen zijn.
  De tekst voor elke bewerking weggooien is het enige wat we niet kunnen herstellen.
- **Alternatieven:** alleen het logboek (zoals voorheen: wie en wanneer, niet wat); de oude tekst in het logboek zelf bewaren (dan staat tekst in een tabel die voor feiten is bedoeld, en het logboek wordt groot); een volledige geschiedenis met terugzetten en vergelijken (meer scherm, nog niet nodig).

## Een versie is een momentopname van de nieuwe inhoud, niet het verschil of de oude tekst

- **Datum:** 25 oktober 2026
- **Besluit:** de tabel bewaart bij elke keer opslaan een momentopname van de nieuwe inhoud (#274).
- **Waarom:** zo is de nieuwste versie altijd gelijk aan het artikel, begint de geschiedenis bij versie 1 en is er geen speciaal geval voor de eerste keer.
  Een artikel is kort, dus de opslag doet er niet toe, en een versie is één rij die je zo kunt lezen.
- **Alternatieven:** de oude tekst bewaren vlak voor een bewerking (kleiner, maar de huidige versie staat dan niet in de tabel en de eerste versie is een uitzondering); alleen het verschil bewaren (compact, maar niet leesbaar zonder de rest).
- **Wat de tabel niet bewaart:** de publicatiestand (`published_at`).
  Die verandert zonder dat de tekst verandert, en het logboek heeft `article.publish` en `article.unpublish` al.
  Een versie zegt dus welke tekst er stond, niet of hij toen op de site stond.

## De versies van een artikel krijgen aaneengesloten nummers, en de rij van het artikel regelt de volgorde

- **Datum:** 25 oktober 2026
- **Besluit:** het nummer van een nieuwe versie is één meer dan het hoogste nummer van dat artikel (1 voor de eerste), en komt uit dezelfde opdracht die de rij toevoegt (`INSERT ... SELECT COALESCE(MAX(version), 0) + 1`).
  Twee dingen houden dat recht.
  - Wie een versie schrijft, heeft de rij van het artikel al vergrendeld met `SELECT ... FOR UPDATE`, zoals bij het publiceren, dus twee bewerkingen tegelijk gaan om de beurt.
  - De unieke sleutel op `(article_id, version)` weigert een tweede versie met hetzelfde nummer, ook als een aanroeper de vergrendeling vergeet: de transactie mislukt dan, en er komt geen dubbel nummer.
- **Waarom:** een nummer dat in de code wordt uitgerekend en dan wordt ingevoegd, kan met twee gelijktijdige bewerkingen twee keer hetzelfde worden.
  Het testen daarvan gebeurt met acht bewerkingen tegelijk, die de nummers 1 tot en met 9 zonder gat geven.
- **Alternatieven:** een teller in de tabel `articles` (nog een kolom die bij elke wijziging in de pas moet blijven); het nummer uit het `id` van de versie halen (niet aaneengesloten per artikel); alleen op de unieke sleutel vertrouwen (de tweede bewerking krijgt dan een fout in plaats van te wachten).
- **Kolommen:** de tabel heeft een eigen `id` en een unieke sleutel op `(article_id, version)`, zoals `items` dat doet met `(source_id, item_key)`.
  Beide foreign keys (het artikel en het account) hebben geen `cascade`: een artikel en een account verdwijnen niet, dus een versie ook niet.

## De migratie van de versies kan opnieuw draaien, want MariaDB maakt DDL niet ongedaan

- **Datum:** 25 oktober 2026
- **Besluit:** migratie `0013_add_article_versions` is zo geschreven dat elke opdracht opnieuw kan draaien (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `FOREIGN KEY IF NOT EXISTS`, `UPDATE ... WHERE updated_by IS NULL` en een `INSERT ... WHERE NOT EXISTS` voor versie 1).
  De volgorde is: de tabel `article_versions`, de kolom `updated_by` leeg, die vullen uit `created_by`, de kolom verplicht maken, de foreign key, en dan versie 1 voor elk artikel zonder versie.
  Versie 1 krijgt de huidige inhoud, `saved_at` gelijk aan `updated_at` en `saved_by` gelijk aan `updated_by`.
- **Waarom:** de site draait de migraties als hij start (zie _De site draait de migraties als ze start_), en MariaDB kan `CREATE TABLE` en `ALTER TABLE` niet in een transactie terugdraaien.
  Een migratie die halverwege stopt, laat het schema half veranderd achter, en `drizzle` schrijft de migratie dan niet op als klaar.
  Zonder deze opzet zou de volgende start stranden op "kolom bestaat al", en moest de eigenaar met de hand herstellen.
  Nu is herstellen: de oorzaak oplossen (een volle schijf, een verbroken verbinding) en de site opnieuw starten.
- **Hoe een half uitgevoerde migratie eruitziet:** na opdracht 1 bestaat de lege tabel `article_versions`; na 2 heeft `articles` de kolom `updated_by` zonder waarden; na 3 en 4 is die gevuld en verplicht; na 5 heeft hij zijn foreign key; en na 6 zijn de versies er, alleen is de migratie niet als klaar opgeschreven.
  Een test (`article-versions-migration.test.ts`) zet de database op elk van die punten en draait de migratie dan, op artikelen die er al zijn.
  Zolang de migratie niet klaar is, blijven de pagina's voor bezoekers werken, want hun queries noemen de kolommen die ze nodig hebben; alleen het beheer van artikelen geeft een fout.
- **Wat de test niet bewijst:** de migratie is niet op de echte gegevens van acceptatie of productie gedraaid.
  Het back-up vóór een migratie op productie (#33) blijft het vangnet.
- **Later:** die back-up vóór een migratie op productie hoort sinds 26 oktober 2026 bij #347; zie _Back-ups zijn een dagelijkse dump op de host, 14 dagen bewaard, en een terugzetting die we één keer echt testen_.
- **Alternatieven:** de kolom meteen verplicht toevoegen met een standaardwaarde (MariaDB vult bestaande rijen dan met 0, en de foreign key faalt); een migratie in twee stappen, een release met de kolom leeg en een met de eis (twee releases voor iets wat in één opdrachtenrij past); alleen een tabel zonder `updated_by` (de kolom is een eis van het issue).

## De versies staan als lijst onder het formulier, zonder knop om terug te zetten

- **Datum:** 25 oktober 2026
- **Besluit:** onder het formulier van een artikel staat "Eerdere versies" als lijst, nieuwste bovenaan, met het nummer, de tijd en het e-mailadres van het account; de nieuwste staat erbij als "Huidige versie".
  `/beheer/artikelen/<nummer>/versies/<versienummer>` toont de versie met dezelfde `Article` en `ArticleText` als het voorbeeld, met de gegevens van de versie erboven.
  Beide zijn alleen voor een beheerder, krijgen `noindex` en `no-store` van de proxy, en geven "niet gevonden" voor een artikel of een versie die er niet is.
  Er is geen knop om terug te zetten, geen vergelijking en geen manier om een versie te verwijderen.
- **Waarom:** een lijst met een kop per versie leest op een telefoon beter dan een tabel van drie kolommen met een e-mailadres, en de lijst met artikelen heeft al dezelfde vorm.
  Wie een oude tekst wil hebben, kopieert hem uit de pagina van de versie; dat is genoeg zolang we er nog niet om vragen.
  Een versie toont de datum van het artikel zelf, of de dag van vandaag bij een concept, zoals het voorbeeld.
- **Alternatieven:** een tabel (past bij gegevens in kolommen, maar scrolt op een telefoon opzij); een terugzetknop (meer scherm en meer regels voor wat er met de publicatie gebeurt, nog niet nodig); de versies op een eigen pagina (een klik meer voor wie net iets heeft overschreven).
- **Een artikel dat alleen met SQL is gemaakt of veranderd** heeft geen versie van die wijziging, want SQL gaat om de site heen (zie `docs/artikelen.md`).
  De pagina zegt dat er nog geen versie is, en de eerstvolgende wijziging in het beheer geeft de eerste.

## /wedstrijden heeft een zijbalk van 32 rem met de stand en de uitslagen

- **Datum:** 26 oktober 2026
- **Besluit:** op `/wedstrijden` staat het programma in de hoofdkolom van 30 rem, en in de zijbalk van 32 rem de stand met daaronder de uitslagen.
  Alleen deze pagina wijkt af van de verdeling van 38, 2 en 24 rem.
- **Waarom:** de stand is een brede tabel met negen kolommen en past in 32 rem zonder te scrollen.
  Het programma is een lijst met korte regels en heeft aan 30 rem genoeg.
  De stand staat bovenaan de zijbalk, omdat dat is waar supporters het eerst naar kijken.
- **Hoe:** de pagina kiest de verdeling met `wide` op de `Page.Sidebar`, niet met een eigenschap van `Page.Body`, want de `Page.Body` staat in de layout van de site en is voor alle pagina's dezelfde.
  `Page.Body` ziet de brede zijbalk met `:has()`, zoals het ook een inleiding ziet.
  Vanaf 56 rem zijn de sporen `minmax(20rem, 30rem)` en `minmax(24rem, 32rem)`; samen met de 2 rem ertussen passen ze bij 56 rem in de 52 rem die er dan zijn.
  Tot 66 rem breed krimpen ze mee, de zijbalk dus het eerst tot 24 rem, en scrollt de tabel zo nodig in zijn eigen gebied.
  Onder 56 rem is er één spoor van hoogstens 38 rem, zoals op elke pagina.
  De cellen van een brede zijbalk staan altijd onder elkaar, ook onder de hoofdkolom, waar twee cellen van 16 rem naast elkaar zouden passen: de stand heeft de breedte van de kolom nodig.
  De volgorde in de bron is die op een telefoon: het programma, de stand, de uitslagen, zonder `order`.
  De bronvermelding staat onderaan de zijbalk, zodat ze op een telefoon na de uitslagen komt en niet tussen het programma en de stand.
- **Alternatieven:** alles in één kolom laten, zoals nu (de stand staat onderaan, onder een lange lijst); de verdeling voor alle pagina's wijzigen (raakt de homepage en de artikelen, die een smalle zijbalk nodig hebben).
- **Later:** zie _De stand toont geen doelpunten voor en tegen_.
  Zonder die twee kolommen past de tabel in de zijbalk van 32 rem; met ze was ze 23 pixels te breed.
- **Later:** zie _De kolommen van `/wedstrijden` zijn even breed_.
  Het programma staat in een hoofdkolom van 31 rem en de stand met de uitslagen in een zijbalk van 31 rem, met de bronvermelding als laatste.
- **Later:** zie _De kaarten van een zijbalk staan standaard onder elkaar, naast elkaar is een optie_.
  De cellen van een zijbalk staan nu standaard onder elkaar, dus `wide` hoeft ze niet meer onder elkaar te houden; het maakt alleen de zijbalk breder.
- **Later:** zie _De kaart Doelpunten per kwartier telt de doelpunten van de wedstrijden met bekende minuten_.
  De hoofdkolom heeft nu twee kaarten, het programma en daaronder de doelpunten per kwartier; op een telefoon is de volgorde het programma, de doelpunten per kwartier, de stand en de rest van de zijbalk.
- **Later:** zie _Op /wedstrijden hebben de kaarten met cijfers een zacht en een warm vlak, en de uitslagen staan in de hoofdkolom_.
  De uitslagen staan nu in de hoofdkolom na het programma, en de volgorde op een telefoon is Programma, Uitslagen, Stand, Doelpuntenmakers, De nul gehouden en Doelpunten per kwartier; de breedtes blijven.
- **Later:** zie _De site heeft vier onderdelen: Nieuws, Wedstrijden, Statistieken en Forum_ (31 oktober 2026): de kaarten met cijfers verhuizen naar `/statistieken`, dus de zijbalk van `/wedstrijden` houdt van die kaarten alleen de Stand.

## De stand toont geen doelpunten voor en tegen

- **Datum:** 26 oktober 2026
- **Besluit:** de stand toont de kolommen DV (doelpunten voor) en DT (doelpunten tegen) niet meer, op elke pagina.
  De tabel heeft positie, club, gespeeld, gewonnen, gelijk, verloren, doelsaldo en punten, met de koppen #, Club, G, W, G, V, D en P.
  `StandingsTable` heeft de kolommen en de eigenschappen `goalsFor` en `goalsAgainst` van een rij niet meer; het doelsaldo blijft, met de afkorting D in plaats van DS.
  De database en de importer veranderen niet: de importcontroles gebruiken de doelpunten voor en tegen, dus ze blijven bewaard.
- **Waarom:** de projecteigenaar koos dit.
  Zo past de tabel in de zijbalk van 32 rem van `/wedstrijden`, waar ze met alle kolommen 23 pixels te breed was voor haar gebied, en scrolt ze op een telefoon minder ver.
  Het doelsaldo zegt wat supporters het eerst willen weten van de doelpunten.
- **Alternatieven:** de naam van de club laten afbreken (de rij van een lange naam wordt hoger); een bredere zijbalk (dan wordt de hoofdkolom smaller dan het programma nodig heeft); de scroll laten staan.
- **Later:** zie _De punten staan voor het doelsaldo in de standtabel_.
  De volgorde van de kolommen is nu #, Club, G, W, G, V, P en D.
- **Later:** zie _De stand toont alleen gespeeld en punten, en de volledige stand heeft een balk voor de punten_.
  De kolommen W, G, V en D zijn vervallen: de kolommen zijn nu #, Club, G en P.
- **Later:** zie _Alle tabellen gebruiken één stel afkortingen voor hun kolommen_.
  Het doelsaldo heet nu S in plaats van D.

## De stand toont de dag niet

- **Datum:** 26 oktober 2026
- **Besluit:** de kaarten "Stand" op de homepage en op `/wedstrijden` tonen de regel "Stand op 18 oktober 2026" niet meer.
  Het bijschrift van de tabel blijft in de HTML, met dezelfde tekst, maar is alleen voor een schermlezer (`hf-visually-hidden`).
- **Waarom:** de projecteigenaar koos dit: de dag is bijna altijd vandaag, dus de regel zegt supporters niets.
  Een tabel heeft een naam nodig, en een schermlezer hoort de dag er zonder moeite bij.
- **Alternatieven:** het bijschrift weglaten (de tabel heeft dan geen naam); de dag alleen tonen als hij niet vandaag is (extra logica en een tweede toestand om te testen).

## Alle koppen en titels breken in balans

- **Datum:** 26 oktober 2026
- **Besluit:** niet alleen `h1` tot en met `h6`, maar ook de kop van een nieuwsbericht en andere titels die over meer regels kunnen lopen, krijgen `text-wrap: balance`.
  De regel staat één keer, in `heading.css`, bij de klasse `.hf-headline` in de typografielaag, binnen `@supports (text-wrap: balance)` zoals de koppen.
  Zo krijgen de kop in `NewsItem` en de titel in `DiscussionItem` hem, en elk component dat de klasse later gebruikt.
  De titel in `ArticleCard` is een `h3` en had hem al.
  Geen component heeft een eigen regel.
- **Aangevuld op 26 oktober 2026, op verzoek van de projecteigenaar:** ook de wedstrijdregel (`.hf-match-clubs`), de inleiding van een pagina (`.hf-intro`), de hulptekst en de foutmelding van een veld (`.hf-field-hint`, `.hf-field-error`) en de regels van `ErrorSummary` breken in balans.
  Elk heeft de regel één keer, in het bestand van zijn eigen stijl of component, binnen dezelfde `@supports`.
  Knoppen en de footer zijn niet aangepast.
  `text-wrap: pretty` blijft buiten beeld: Firefox heeft het nog niet.
- **Waarom:** een kop met één woord alleen op de tweede regel ziet er onrustig uit en leest slechter.
  Balance verdeelt de woorden over de regels van een korte tekst, zonder dat de kop breder of smaller wordt.
  Het hoort bij de koppen die we al zo zetten, ook al zijn ze geen `h`-element.
  `overflow-wrap: anywhere` van de componenten blijft werken: een heel lang woord breekt, en de pagina scrolt niet opzij.
- **Let op:** `text-wrap: balance` wordt op 13 november 2026 'widely available' (zie _Functies die nog niet zover zijn_).
  Meldt Stylelint de `@supports` dan als overbodig, dan gaat hij weg, zowel bij `.hf-headline` als bij de koppen.
  Een test (`heading-css.test.ts`) leest de CSS en controleert dat de regel er staat, op één plek, binnen die `@supports`.
- **Alternatieven:** het alleen op de `h`-elementen laten (de koppen van het nieuws, het meest gelezen deel van de site, houden dan het probleem); `text-wrap: pretty` op alle tekst (werkt nog niet in alle browsers, en het is bedoeld voor lange tekst); een eigen regel per component (meer plaatsen om bij te houden).

## Safari vergroot de tekst niet zelf in liggende stand

- **Datum:** 26 oktober 2026
- **Besluit:** `html` krijgt `text-size-adjust: 100%`, zodat Safari op iPhone en iPad de tekst niet vergroot als het toestel draait.
  De regel staat één keer, in de basislaag van het designsysteem (`root.css`), bij de andere regels voor `html`.
  Er staan twee vormen, elk binnen `@supports` (zie _Functies die nog niet zover zijn: `@supports`, of een tijdelijke uitzondering_):
  - `-webkit-text-size-adjust: 100%` binnen `@supports (-webkit-touch-callout: none)`, voor Safari op iOS en iPadOS.
    Stylelint meldt het voorvoegsel, dus er staat één `stylelint-disable-next-line property-no-vendor-prefix` met de reden bij.
  - `text-size-adjust: 100%` binnen `@supports (text-size-adjust: 100%)`, voor browsers die de regel zonder voorvoegsel kennen.
    `plugin/use-baseline` meldt de regel als niet 'widely available'; binnen `@supports` is dat goed.
- **Waarom:** Safari vergroot in liggende stand de tekst die het voor lopende tekst houdt, maar laat tabellen en gebieden die zijwaarts scrollen met rust.
  Daardoor staan op één pagina grote en kleine teksten naast elkaar.
  Met 100% bepaalt de pagina de grootte, en de bezoeker kan nog altijd inzoomen: knijpen in de pagina en de paginazoom in het menu van Safari veranderen de tekst nog (WCAG 1.4.4 en 1.4.10).
- **De vorm met voorvoegsel is nodig:** in de iOS Simulator (iOS 27.0, iPhone 18 Pro, liggend) bleef de tekst in liggende stand vergroot met alleen `text-size-adjust: 100%`: de kaarten van `/wedstrijden` tot anderhalf keer zo groot, de koppen op de homepage ruim een zesde groter.
  Met `-webkit-text-size-adjust: 100%` kwam de tekst terug op de grootte van staand, en de standtabel veranderde in geen van beide gevallen.
  Een echte iPhone is niet getest.
- **De bouw laat het voorvoegsel weg als het naast de vorm zonder voorvoegsel staat:** Next.js haalt `-webkit-text-size-adjust` uit dezelfde regel weg en zet er `-moz-text-size-adjust` voor in de plaats.
  Daarom staat het voorvoegsel in een eigen `@supports`-blok; dat blijft in de gebouwde CSS staan.
  Een test (`root-css.test.ts`) controleert dat beide vormen in de bron staan, maar niet wat de bouw ervan maakt; dat kijk je na in de gebouwde CSS.
- **Alternatieven:** niets doen (de verschillen blijven in liggende stand); een vaste waarde als 90% of 110% (verkeerd voor wie het teken groot nodig heeft); de tabel ook laten vergroten (kan niet, het is de beslissing van Safari); alleen de vorm zonder voorvoegsel (werkt niet in Safari op iPhone).

## Een onregelmatige test is een bug in de test of de pagina, geen reden om hem los te maken

- **Datum:** 26 oktober 2026
- **Besluit:** een e2e-test die af en toe faalt, wordt onderzocht en hersteld bij de oorzaak.
  We zetten hem niet uit, laten hem niet vaker proberen en maken hem niet losser.
- **Waarom:** een test die soms faalt, leert de Builders dat rood niets betekent.
  Hier was het niet zeker of het een wachtpunt in de test was of een echte pagina zonder titel.
- **Wat het was:** na een formulier dat doorstuurt, wisselt de site van pagina zonder een nieuw document te laden.
  Next.js zet dan eerst de nieuwe inhoud neer en een paar milliseconden later de `<title>`.
  Axe, dat meteen na de kop draaide, meldde `document-title` op een pagina die een titel heeft.
  Onder zware belasting op de eigen computer ging het één keer in twintig runs mis, in CI twee keer in twaalf runs.
  Een bezoeker merkt het nauwelijks, en elke pagina heeft een titel zodra de wissel klaar is.
- **De oplossing:** `checkPage` wacht, hoogstens twee seconden, tot de titel er is, en laat dan axe draaien.
  Heeft een pagina echt geen titel, dan meldt axe het nog steeds (de test `fails on a page without a title`).
  De wacht staat in `checkPage` en niet in elke test, omdat elke test die axe na een formulier laat draaien dit kan tegenkomen.
- **Alternatieven:** `retries` in Playwright aanzetten (verbergt de fout en verlengt elke run); de test overslaan tot het later beter uitkomt (een gat in de toegankelijkheidscontrole van het beheer); in `writing.spec.ts` alleen na de drie plaatsen waar het gebeurde op de titel wachten (de volgende test die axe na een formulier laat draaien heeft hetzelfde probleem).

## Een uitslag toont de uitkomst in kleur, zonder letter

- **Datum:** 26 oktober 2026
- **Besluit:** de uitslag van sc Heerenveen in `Match` is groen bij winst, rood bij verlies en neutraal bij gelijkspel.
  Er komt geen letter of woord bij: de doelpunten zelf zeggen genoeg.
  De uitkomst volgt uit de doelpunten van sc Heerenveen en niet uit die van de thuisclub: 0–2 uit is een winst en 2–0 uit een verlies.
  Een gelijke stand krijgt de kleur van gelijkspel, ook in de beker; die kleur zegt niets over wie er doorging, ook niet als een beker op strafschoppen is beslist.
- **Palet:** er komt een reeks groen bij (tint 150°, elf stappen, even licht als rood met hetzelfde nummer) en drie rollen: `outcome-win`, `outcome-loss` en `outcome-draw`.
  Winst is groen-700 in licht en groen-300 in donker.
  Verlies is rood-700 en rood-300, dezelfde stappen als `text-accent`, maar een eigen rol, zodat de uitkomst kan veranderen zonder het accent mee te nemen.
  Gelijkspel heeft de kleur van secundaire tekst, want gelijkspel is niet goed en niet slecht.
- **Waarom:** supporters zien zo in één oogopslag hoe het ging.
  Kleur is hier een aanvulling op de cijfers en niet het enige teken (WCAG 1.4.1), want wie kleuren niet ziet, leest de uitkomst in 2–0 of 0–2.
  Een letter erbij zou de regel drukker maken zonder iets te zeggen.
  De screenreader hoort wat hij hoorde ("2 tegen 0"), en in forced colours valt de kleur weg: de browser zet de eigen kleur van de gebruiker op de tekst.
- **Alternatieven:** een letter (W, G, V) of een woord erbij, voor wie kleuren niet uit elkaar houdt (de projecteigenaar vond de cijfers voldoende); gele of blauwe kleur voor gelijkspel (geel is een waarschuwing en blauw is de kleur van links); de beker apart behandelen (niet nodig: neutraal zegt niets over wie doorging).
- **Later:** zie _Verlenging en strafschoppen worden bewaard en getoond_.
  Bij strafschoppen volgt de kleur de strafschoppen, en een gelijke stand zonder bekende strafschoppen blijft neutraal.
- **Later:** zie _`ShortMatch` toont de uitkomst met kleur en gewicht, zoals `Match`_ (31 oktober 2026): ook `ShortMatch` gebruikt deze kleuren, met dezelfde regel voor de uitkomst.

## Verlenging en strafschoppen worden bewaard en getoond

- **Datum:** 26 oktober 2026
- **Besluit:** de import bewaart bij een bekerwedstrijd of er verlenging was en wat de strafschoppen waren, en `Match` toont dat met afkortingen ("n.v.", "(4–2 n.s.)"), met de volle woorden voor een schermlezer.
  De kleur van de uitkomst volgt de strafschoppen als die er zijn.
- **Opslag:** `matches` krijgt `extra_time` (standaard `false`), `penalties_for` en `penalties_against`, met een migratie (`0015_add_extra_time_and_penalties`).
  Drie CHECK-constraints houden ze heel: verlenging alleen bij een gespeelde bekerwedstrijd, strafschoppen in een paar, en strafschoppen alleen na verlenging en bij een gelijke stand.
  `goals_for` en `goals_against` blijven de stand uit `score`, zonder de strafschoppen.
- **Inlezen:** een gevuld `aet` is verlenging (op de pagina van de beker 2025/26 altijd `J`), en `penaltyscore` is "N – N" met team 1 eerst, omgezet naar de kant van sc Heerenveen.
  Een wedstrijd zonder score is nooit in verlenging, ook niet als `aet` er al staat.
- **Toon:** "n.v." en "(4–3 n.s.)" staan direct achter de uitslag, op de regel met de clubs: "sc Heerenveen 3–3 (5–3 n.s.) Proefstad SV".
  Ze horen bij de uitslag en zijn geen bijzaak, dus ze staan niet bij de competitie.
  De score van de strafschoppen staat in de volgorde van de clubs op de regel, tussen haakjes, en is lichter gedrukt dan de doelpunten.
  Beide zijn een `abbr` met een `title`, en voor de ogen alleen (`aria-hidden`).
  Een schermlezer hoort de volle woorden achter de uitslag: "1 tegen 1, na strafschoppen 4 tegen 3".
  Bij strafschoppen staat alleen "n.s.", want strafschoppen komen na verlenging.
  Onder een lijst met zulke wedstrijden staat wat de afkortingen betekenen ("n.v. na verlenging, n.s. na strafschoppen"), alleen van de afkortingen die in de lijst staan, voor wie geen muis heeft (WCAG 3.1.4).
- **Kleur:** bij strafschoppen is de uitkomst die van de strafschoppen, anders die van de stand.
  Een gelijke stand zonder strafschoppen blijft neutraal, ook als de strafschoppen nog niet op de pagina staan.
- **Waarom:** zonder dat staat een ronde die op strafschoppen is beslist, als een gelijkspel, en weet de supporter niet wie er doorging.
  Het staat op de pagina van de beker in aparte velden (`aet`, `penaltyscore`), dus inlezen is geen gokwerk, en de gewone `score` blijft zoals ze was.
- **Alternatieven:** het niet bewaren (dan blijft een gelijke stand in de beker vaag); de strafschoppen als gewone doelpunten bij de stand optellen (verkeerd: 1–1 wordt dan 5–3); de volle woorden "na verlenging" en "na strafschoppen" in beeld (de projecteigenaar koos op 26 oktober 2026 voor afkortingen, omdat de volle woorden de regel drukker maken).
  Daarom staan de volle woorden wel voor een schermlezer en in de `title`, want een schermlezer leest een afkorting slecht.
- **Later:** zie _De stand na 90 minuten komt uit het eerste paar van `half time score`_: is die stand bekend, dan staat er bij strafschoppen ook "n.v.", als "3–3 n.v. (2–2), 5–3 n.s.".

## Een strafschop die we niet kunnen lezen laat de import niet doorgaan

- **Datum:** 26 oktober 2026
- **Besluit:** een score van strafschoppen die niet als "N – N" te lezen is, laat de controle van de pagina falen, zoals een andere onverwachte opbouw.
  De laatste goede versie blijft staan en het logboek krijgt een waarschuwing.
  Hetzelfde geldt voor verlenging of strafschoppen bij een competitiewedstrijd, voor strafschoppen zonder verlenging en voor strafschoppen bij een stand die niet gelijk is.
- **Waarom:** de import hoort bij een onverwachte opbouw niets te raden.
  Een beker die op strafschoppen is beslist, mag niet als een gelijkspel blijven staan door een fout in de vorm.
- **Een nieuwe score van strafschoppen is geen verandering van de uitslag:** komen de strafschoppen er later bij, dan neemt de import ze over zonder waarschuwing.
  Verandert een score van strafschoppen die er al was, nadat de uitslag drie dagen of langer vaststond, dan waarschuwt hij, met de strafschoppen in de tekst.
- **Alternatieven:** de wedstrijd bewaren zonder strafschoppen en doorgaan (de fout gaat dan onopgemerkt).

## De stand na 90 minuten komt uit het eerste paar van `half time score`

- **Datum:** 26 oktober 2026
- **Besluit:** bij een bekerwedstrijd met verlenging (`aet`) is het eerste getallenpaar van `half time score` de stand na 90 minuten, en `Match` toont die achter "n.v." tussen haakjes: "2–1 n.v. (1–1)".
  Ontbreekt hij of is hij niet te vertrouwen, dan staat er alleen "n.v.", en dat is geen fout.
  De stand bij de rust, het tweede paar, bewaart de import niet.
- **Opslag:** `matches` krijgt `after_ninety_for` en `after_ninety_against`, met een migratie (`0024_add_score_after_ninety`).
  Twee CHECK-constraints houden ze heel: ze zijn allebei leeg of allebei gevuld (`matches_after_ninety_in_a_pair`), en ze horen bij een wedstrijd met verlenging en zijn niet hoger dan de eindstand (`matches_after_ninety_within_extra_time`).
- **Inlezen:** de bekerpagina van 2025/26 heeft het in `half time score`, de oudere pagina's in de haakjes achter de score (zie _De bekerpagina's van eerdere seizoenen_).
  Een wedstrijd zonder `aet` heeft geen stand na 90 minuten, ook niet als er een komma in `half time score` staat.
  De import neemt het eerste paar alleen over als het tweede paar er niet boven ligt, want de rust kan niet later zijn dan minuut 90, en als het eerste paar niet boven de eindstand ligt.
  Een veld met één paar, een leeg veld of een veld dat we niet kunnen lezen geeft "niet bekend".
  Alleen de beker heeft het, zoals het issue vraagt; de play-offs voor de Conference League hebben dezelfde sjablonen, maar blijven buiten dit besluit.
- **Toon:** de stand staat tussen haakjes direct achter "n.v.", in de volgorde van de clubs, met een vaste spatie ertussen en voor "n.s.", zodat een smalle kaart de regel tussen de delen afbreekt.
  Bij strafschoppen volgt "3–3 n.v. (2–2), 5–3 n.s."; is de stand na 90 minuten niet bekend, dan blijft de vorm "3–3 (5–3 n.s.)".
  Een schermlezer hoort "2 tegen 1, na verlenging; na 90 minuten 1 tegen 1", en met strafschoppen "3 tegen 3, na verlenging; na 90 minuten 2 tegen 2; na strafschoppen 5 tegen 3".
  De kleur volgt de eindstand en de strafschoppen, zoals voorheen.
  De uitleg onder de lijst noemt "n.v." ook bij een wedstrijd met strafschoppen waar de stand na 90 minuten bij staat.
- **Waarom:** het veld heet "rust" maar bevat bij verlenging twee paren: de stand na 90 minuten en de rust.
  Dat blijkt uit de wedstrijden van 2025/26 waar we de eindstand en de strafschoppen naast kunnen leggen.
  De stand na 90 minuten zegt of een wedstrijd na reguliere tijd gelijk stond of al beslist leek.
- **De pagina is niet overal gelijk:** van de 25 wedstrijden met verlenging op de pagina (gelezen op 1 november 2026) hebben er 13 twee paren in de volgorde van het besluit, 6 hebben het veld niet of één paar, en 6 hebben de paren omgedraaid (de rust eerst, bijvoorbeeld "1 – 2, 3 – 3" bij een eindstand van 3 – 3).
  Bij 3 van de 13 is de stand na 90 minuten gelijk aan de eindstand, omdat de verlenging zonder doelpunt bleef.
  Het issue schreef dat hij nooit gelijk is; dat klopt dus niet, en de database eist het niet.
  Omgedraaide paren zijn aan de regel te herkennen, en dan blijft de stand onbekend.
- **Alternatieven:** de stand na 90 minuten uit de doelpunten (#297) uitrekenen (vraagt de minuten van elk doelpunt, die niet altijd kloppen); alleen "n.v." tonen (de supporter weet niet hoe het ervoor stond); omgedraaide paren omdraaien (dat is raden); een veld dat niet klopt als fout behandelen (de import van de hele pagina zou stoppen voor één verkeerd veld).
- **Later:** zie _De stand na 90 minuten geldt ook voor een play-offwedstrijd in één keer_: de play-offs voor de Conference League hebben hem nu ook, voor een ronde in één wedstrijd.

## De stand na 90 minuten geldt ook voor een play-offwedstrijd in één keer

- **Datum:** 1 november 2026
- **Besluit:** de import leest en bewaart de stand na 90 minuten ook bij een wedstrijd van de play-offs voor de Conference League met verlenging (`aet`), volgens dezelfde regels als bij de beker.
  Dat gaat door dezelfde code (`scoreAfterNinety`), zodat er geen tweede kopie van de leesregels komt.
  De regel geldt voor een ronde die in één wedstrijd is gespeeld.
  Een ronde met een heen- en terugwedstrijd, zoals de halve finale van 2021/22 en 2022/23 ("Halve finale, wedstrijd 1/2"), houdt geen stand na 90 minuten.
  De wedstrijd van de competitie heeft hem nog steeds niet.
- **Opslag:** er is geen migratie nodig.
  De controles `matches_after_ninety_in_a_pair` en `matches_after_ninety_within_extra_time` noemen alleen de verlenging en de eindstand, geen competitie, dus ze lieten de play-offs al toe.
  `Match` toont de stand na 90 minuten voor elke wedstrijd die hem heeft, dus ook die verandert niet.
- **Waarom:** de play-offs hebben op Wikipedia dezelfde sjabloon met `aet` en `half time score` als de beker, en een halve finale of finale kan in de verlenging eindigen.
  Zonder deze regel staat zo'n wedstrijd anders dan een bekerwedstrijd: "2–1 n.v." zonder te zeggen hoe het ervoor stond.
  Bij een tweeluik komt de verlenging na de tweede wedstrijd en gaat het om de stand over twee duels.
  De stand na 90 minuten van de tweede wedstrijd zegt dan weinig over wie er door was, en die wedstrijden blijven zoals ze zijn.
- **Gevolg:** er is nu geen wedstrijd van sc Heerenveen met verlenging in de play-offs, dus er verandert niets zichtbaars.
  Wie de play-offs van een eerder seizoen opnieuw binnenhaalt, ziet de stand pas bij een wedstrijd die verlenging had.
  De echte pagina's van de play-offs hebben `half time score` nog niet in hun sjablonen; de test gebruikt een verkleinde, verzonnen pagina (`wikipedia-playoffs-after-ninety.wiki`).
- **Alternatieven:** ook de wedstrijden van een tweeluik (de stand over twee duels is moeilijker te lezen, en het issue sloot ze uit); een eigen leesregel voor de play-offs (twee kopieën die uit elkaar gaan lopen); de play-offs voor promotie en degradatie (buiten de import).

## We tellen paginaweergaven en unieke bezoekers per dag, met een kenmerk dat elke dag wisselt

- **Datum:** 26 oktober 2026
- **Besluit:** de site telt zelf, op de eigen server, paginaweergaven per pagina en unieke bezoekers per dag.
  Een unieke bezoeker is een kenmerk van IP-adres en browsertekst met een zout dat voor die dag willekeurig is.
  Het zout en de kenmerken verdwijnen als de dag voorbij is; alleen de tellers blijven.
- **Waarom:** het antwoord op "hoeveel bezoekers" vraagt dat je dezelfde bezoeker binnen een dag herkent, maar niet over dagen.
  Een kenmerk dat elke dag verandert, doet dat.
  Zo volgen we niemand, en een eigen teller vraagt niets van een derde.
- **Alternatieven:** alleen paginaweergaven (nog privacyvriendelijker, maar "hoeveel bezoekers" blijft dan onbeantwoord); een dienst van derden zoals Google Analytics (breekt onze belofte); de logbestanden van de hosting lezen (we hebben ze niet in handen en ze bevatten IP-adressen).
- **Hoe:**
  - Vier tabellen (migratie `0014_add_visit_counters`): `page_views` (een teller per dag en pad), `daily_visitors` (een teller per dag), `visitor_salts` (het zout van de dag) en `visitor_hashes` (de kenmerken van de dag).
    Alleen de eerste twee blijven.
    De klikken op links (#292) en de cijfers in het beheer (#293) bouwen hierop: zij lezen de tellers en gebruiken het zout en de kenmerken van de dag opnieuw.
  - Het kenmerk is de HMAC-SHA-256 (hex) van het adres en de browsertekst, met het zout van de dag als sleutel.
    Het zout is 32 willekeurige bytes (hex) en staat in de database, omdat de host meer processen kan starten die hetzelfde zout moeten gebruiken.
    Het eerste verzoek van een dag in een proces maakt het zout (`INSERT IGNORE`, dan lezen: wie eerst is wint) en gooit de gegevens van eerdere dagen weg.
  - Een bezoeker telt als `INSERT IGNORE` in `visitor_hashes` een rij toevoegt; dan gaat `daily_visitors` met één omhoog.
  - Een dag is een dag in Nederland (Europe/Amsterdam), zoals een bezoeker hem kent, en niet in UTC.
  - Het weggooien van het zout en de kenmerken van alle dagen vóór vandaag gebeurt op twee plekken, door dezelfde functie (`removeVisitorData`): bij het eerste verzoek van een nieuwe dag, en bij elke run van de import, dus ook op een dag zonder bezoekers.
    Een verzoek dat vlak voor middernacht begon kan zijn kenmerk nog na het weggooien schrijven; de volgende run van de import (hoogstens een kwartier later) haalt het weg.
  - Het IP-adres en de browsertekst staan nergens: niet in een tabel, en niet in het logboek.
    Een fout bij het tellen logt alleen de reden (`reasonOf`), nooit het verzoek.
- **Let op:** zolang de dag duurt, staan het zout en de kenmerken samen in de database.
  Wie de database kan lezen, kan met het zout alle IPv4-adressen proberen en zo een kenmerk terugrekenen naar een adres.
  Dat vraagt toegang tot de database, en na de dag is het zout weg.
  De privacypagina zegt het ook: tot het einde van de dag staan het getal (het zout) en de codes (de kenmerken) in onze database.
- **Rechtsgrond:** de Builder nam gerechtvaardigd belang aan (we willen weten of de site gelezen wordt, en we houden geen persoonsgegevens langer dan de dag).
  Toestemming is niet nodig, omdat er niets op het apparaat van de bezoeker staat.
  Een jurist heeft dit niet bekeken.

## Bots, DNT en GPC worden niet geteld

- **Datum:** 26 oktober 2026
- **Besluit:** bekende bots, onze importer en de controles van de hosting tellen niet mee, en een verzoek met `DNT: 1` of `Sec-GPC: 1` ook niet.
- **Waarom:** de cijfers moeten bezoekers zijn, geen crawlers.
  Wie zegt niet gevolgd te willen worden, wordt niet geteld, ook al volgen we niemand.
  Dat past bij onze belofte.
- **Alternatieven:** alles tellen (opgeblazen cijfers); alleen bots uitsluiten (DNT en GPC kosten weinig en zeggen iets over ons).
- **Hoe:** de lijst met patronen voor de browsertekst staat op één plek, `notVisitors` in `apps/site/src/visits.ts`.
  Een verzoek zonder browsertekst telt ook niet.
  Een bot die zich als browser voordoet, telt wel mee; de lijst groeit als er een opduikt.
- **Later:** de dagelijkse Lighthouse-controle doet zich voor als een gewone browser, want Lighthouse 13 zet geen "Lighthouse" meer in de browsertekst.
  Ze blijft buiten de cijfers met `DNT: 1`, dat de controle meestuurt (zie _We meten zelf, elke dag, met een vast budget voor wat kan en een melding voor tijd_ in `werkwijze.md`, 7 november 2026).

## De proxy telt, na het antwoord, alleen een aanvraag van een pagina

- **Datum:** 26 oktober 2026
- **Besluit:** het tellen draait in de proxy (`apps/site/src/proxy.ts`, het `proxy.ts` van Next.js 16, dat op Node.js draait), die al voor elk verzoek draait.
  De proxy geeft het tellen aan `event.waitUntil` en wacht er niet op, dus de pagina wacht niet op de database.
  Een fout bij het tellen komt in het logboek, hoogstens één keer per minuut, en de pagina merkt niets.
  Wacht de database niet (te langzaam of weg), dan laat het tellen na 5 seconden los, en neemt het hoogstens 20 tellingen tegelijk aan; de rest valt weg.
- **Wat telt:** een GET met `Accept: text/html` voor een pad uit `pages.ts`, `/contact/verstuurd` of `/redactie/<slug>` van een artikel dat de database kent.
  De zoekvraag telt niet mee: `/?nieuws=15` en `/podcasts?podcast=…` tellen voor `/` en `/podcasts`.
  Bestanden, `/_next`, `/beheer`, `robots.txt`, `sitemap.xml`, de feed en het manifest staan op geen lijst en tellen dus niet.
  Een pad dat niet bestaat telt ook niet, en ook geen verzoek met een prefetch-header (`Sec-Purpose`, `Purpose` of `X-Moz`).
  Een test loopt de `page.tsx`-bestanden na en laat falen als er een pagina bijkomt die op geen lijst staat.
- **Waarom:** de proxy ziet elk verzoek voordat de cache en de pagina erbij komen, dus een pagina uit een cache telt ook.
  Een teller in de pagina zelf telt niet als de pagina uit een cache komt, en vraagt dat elke pagina eraan denkt.
  Een eigen route die de browser aanroept, zou een script vragen; we willen geen script.
  Het kost per bezoek twee tot drie korte opdrachten voor de database, na het antwoord, en misschien een eigen verbinding naast die van de pagina's: de proxy is een eigen bundel van Next.js.
- **Let op:**
  - De proxy ziet de status van het antwoord niet.
    Een pad dat bestaat telt dus ook als de pagina een 404 geeft (`/podcasts?pagina=99`) of de foutpagina toont (de database is weg).
    Een artikel controleren we wel, met één opzoeking.
  - Next.js haalt zijn eigen headers (`RSC`, `Next-Router-Prefetch`) weg voordat de proxy het verzoek ziet, en zo'n verzoek vraagt geen HTML.
    Alleen een aanvraag van een hele pagina telt, en dat is elke klik, want de site heeft geen `next/link`.
    Een test controleert dat er geen `next/link` in de code staat; komt hij er toch, dan telt een klik niet meer en moet dit besluit opnieuw.
  - Een bezoeker die de pagina uit de cache van zijn browser haalt (terug in de geschiedenis), doet geen verzoek en telt niet.
- **Alternatieven:** tellen in `layout.tsx` (telt niet bij een pagina uit een cache; de pagina's zijn nu `force-dynamic`, maar dat verandert misschien); een eigen route met een afbeelding of script (vraagt een script of een extra verzoek); de logbestanden van de hosting lezen (zie hierboven).
- **Later:** zie _Een klik op een schakelaar telt niet als paginaweergave_ (4 november 2026): de site heeft nog steeds geen `next/link`, maar de drie schakelaars wisselen met JavaScript in de pagina met `useRouter`, en die klik telt niet.
  "Elke klik is een hele pagina" geldt dus voor een link, en niet voor een schakelaar.

## Het adres van de bezoeker is het laatste adres van `X-Forwarded-For`

- **Datum:** 26 oktober 2026
- **Besluit:** het adres komt uit de header `X-Forwarded-For`, het laatste adres erin, en alleen als het een openbaar IP-adres is.
  Een adres van de computer zelf of van een privé-netwerk (`127.0.0.0/8`, `::1`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` en meer) telt niet als bezoeker; de paginaweergave telt wel.
  `::ffff:203.0.113.7` is `203.0.113.7`.
- **Waarom:** de host start de app met `lsnode.js` van LiteSpeed, en de verbinding komt van de host zelf.
  Next.js vult zelf `X-Forwarded-For` met het adres van de verbinding als de header er niet is, dus zonder de controle zou elke bezoeker `127.0.0.1` zijn.
  Wat een bezoeker zelf in de header zet, staat vóór het adres dat de host toevoegt; het laatste adres is dus het zijne, als de host toevoegt.
- **Nog niet gecontroleerd op de host:** we hebben bij het bouwen geen toegang tot de hosting.
  Stuurt de host de header niet, of een andere, dan telt de site de weergaven en geen bezoekers (`daily_visitors` blijft 0).
  `docs/acceptatieomgeving.md` (_Bezoekers tellen_) zegt hoe je dat op acceptatie ziet.
- **Alternatieven:** het eerste adres in de header (een bezoeker kan het zelf zetten); een andere header zoals `X-Real-IP` (we weten niet of de host hem stuurt); alleen de browsertekst (alle bezoekers met dezelfde browser tellen als één).

## Doelpuntenmakers staan in één regel op minuut, met groene en rode minuten

- **Datum:** 26 oktober 2026
- **Besluit:** `Match` toont onder de uitslag één regel met de doelpuntenmakers van beide clubs op volgorde van de minuut, zonder naam van de club ervoor, zoals "34’ Trenskow, 45’+1 Vente, 80’ Vennegoor of Hesselink".
  De minuut is groen bij een doelpunt van sc Heerenveen en rood bij een doelpunt van de tegenstander, en bij sc Heerenveen ook vet.
  Een schermlezer hoort de club erbij.
- **Waarom:** de projecteigenaar vindt het korter en rustiger, en supporters weten welke spelers van ons zijn.
  Kleur laat zien voor wie er werd gescoord, met dezelfde betekenis als de uitslag (_Een uitslag toont de uitkomst in kleur, zonder letter_: groen is goed voor ons, rood is slecht).
  Kleur is niet het enige teken: het vet voor onze eigen doelpunten volgt de vette club op de uitslagregel, en de naam van de club staat voor een schermlezer in de tekst (WCAG 1.4.1).
  De projecteigenaar wilde de minuten eerst niet vet en zette het vet op 26 oktober 2026 na de review weer terug, omdat kleur voor het oog anders het enige teken was.
- **Hoe:** de tekst is `<minuut>’<+blessuretijd>` en de naam, met een spatie die niet afbreekt ertussen.
  De apostrof en de plus zijn voor de ogen alleen (`aria-hidden`); een schermlezer hoort "minuut 45 plus 1, Vente, sc Heerenveen", met "; " tussen de doelpunten.
  De kleuren zijn de tokens `--hf-colour-outcome-win` en `--hf-colour-outcome-loss`, die al 4,5:1 halen op de vlakken (zie _Een uitslag toont de uitkomst in kleur, zonder letter_).
  In forced colours valt de kleur weg en blijft het vet over.
- **Alternatieven:** per club een eigen regel met de naam van de club ervoor (duidelijker, maar langer; dit was het eerste besluit); één regel zonder enig onderscheid (wie een speler van de tegenstander niet kent, kan niet zien voor wie hij scoorde); twee kolommen naast elkaar (te breed voor een smalle kaart).

## Eigen doelpunten staan bij de club die ervan profiteert

- **Datum:** 26 oktober 2026
- **Besluit:** een eigen doelpunt staat bij de club die erdoor scoort, met "e.d." erachter, zoals de Nederlandse Wikipedia het schrijft.
  Een penalty heeft "pen." erachter.
  Beide zijn een `abbr` met de volle woorden in een `title` en voor een schermlezer ("eigen doelpunt", "penalty"), en onder een lijst staat wat ze betekenen, zoals bij "n.v." en "n.s.".
- **Waarom:** de uitslag telt het zo, en de controle dat de doelpunten bij de uitslag passen, werkt dan zonder uitzonderingen.
  De afkorting zegt dat het geen doelpunt van die club was.
- **Opslag:** `match_goals` (migratie `0016_add_match_goals`) heeft een rij per doelpunt: `ours` (sc Heerenveen of de tegenstander), `minute`, `stoppage_minutes`, `player`, `own_goal` en `penalty`.
  De rijen gaan weg met hun wedstrijd (`ON DELETE CASCADE`).
  De import schrijft ze op volgorde van de klok, dus de volgorde van `id` is de volgorde in de regel.
- **Alternatieven:** het bij de club van de speler zetten (klopt dan niet met de uitslag naast de regel).
- **Later:** zie _Een strafschop heet strafschop of str., nooit pen. of penalty_ (8 november 2026): op de site staat "str." met "strafschop" voor een schermlezer, niet "pen." en "penalty".

## Een doelpunt dat niet bij de uitslag past, wordt niet getoond

- **Datum:** 26 oktober 2026
- **Besluit:** klopt het aantal doelpunten van een club niet met haar goals in de uitslag, of is een regel niet te lezen, dan toont de site voor die wedstrijd geen doelpuntenmakers en schrijft de import een waarschuwing.
  De wedstrijd zelf blijft bewaard.
- **Waarom:** de doelpuntenmakers zijn een extra, en een fout in de lijst mag de pagina niet kapotmaken.
  Een lijst die niet bij de uitslag past, zegt iets onwaars, en dat is erger dan geen lijst.
- **Alternatieven:** de hele pagina laten falen, zoals bij een fout in de uitslag zelf (te streng voor een extra); de lijst tonen zoals ze is (kan een speler als scorer noemen die niet scoorde).

## Lege velden voor de doelpuntenmakers geven geen waarschuwing

- **Datum:** 26 oktober 2026
- **Besluit:** staan `goals1` en `goals2` van een gespeelde wedstrijd allebei leeg, dan zijn de doelpuntenmakers nog niet ingevuld.
  De import bewaart er dan geen en schrijft geen waarschuwing, ook als de uitslag doelpunten heeft.
  Staat er in één veld iets, dan klopt het aantal met de uitslag of niet, en bij een verschil volgt de waarschuwing.
- **Waarom:** Wikipedia vult de doelpuntenmakers vaak uren of dagen na de uitslag in.
  Een waarschuwing elk uur over iets wat nog moet komen, maakt het logboek onleesbaar en de echte waarschuwingen onzichtbaar.
- **Alternatieven:** altijd waarschuwen als de uitslag doelpunten heeft zonder doelpuntenmakers (te veel ruis); pas waarschuwen na een aantal dagen (meer code voor weinig winst).

## Wat in de velden van de doelpuntenmakers geen doelpunt is, valt weg

- **Datum:** 26 oktober 2026
- **Besluit:** de import leest in `goals1` en `goals2` het sjabloon `goal`, met zijn minuten en `e.d.` of `pen.` erachter, en een naam per regel.
  Een rode kaart (`{{rode kaart}}`) en een gemiste penalty (`{{penmis}}`) zijn bekend en geen doelpunt, dus ze vallen weg.
  Elke andere onbekende opbouw (een ander sjabloon, een doelpunt zonder naam, een minuut van 0) is een regel die we niet kunnen lezen: de wedstrijd krijgt dan geen doelpuntenmakers en de import waarschuwt.
- **Waarom:** de pagina's van de beker en de competitie van afgelopen seizoen hebben drie soorten sjablonen in deze velden (`goal`, `rode kaart` en `penmis`), en alleen `goal` is een doelpunt.
  Een ander sjabloon, zoals een gele kaart, hebben we niet gezien en we kennen zijn naam niet, en dan is de waarschuwing beter dan een gok.
- **Alternatieven:** elk onbekend sjabloon negeren (een doelpunt dat in een ander sjabloon staat, valt dan stil weg, en de controle met de uitslag vangt dat alleen als het aantal verschilt).
- **Later:** zie _De lezer neemt `o.g.` als eigen doelpunt en `p` als strafschop, en geen andere deelcode_ in `importer.md` (4 november 2026): `o.g.` telt als `e.d.` en `p` als `pen.`.
  Elke andere deelcode blijft een regel die we niet kunnen lezen.

## De cijfers zijn alleen voor beheerders, en de tellers per dag blijven bewaard

- **Datum:** 26 oktober 2026
- **Besluit:** de cijfers over het bezoek staan in het beheer, alleen voor beheerders.
  De tellers per dag worden niet weggehaald.
- **Waarom:** de cijfers zijn voor het team, niet voor het publiek, en een teller per dag bevat geen persoonsgegevens en is klein.
  Er is dus geen reden om ze te wissen, en een lange reeks is juist nuttig.
- **Alternatieven:** de cijfers openbaar maken (past bij onze openheid, maar meer om te bouwen en onzorgvuldig als ze te ruw zijn); de tellers na een jaar weghalen (bespaart bijna niets).

## De pagina Bezoek toont de laatste 30 dagen, en de tabel is een component van het designsysteem

- **Datum:** 26 oktober 2026
- **Besluit:** `/beheer/bezoek` is alleen voor een beheerder; een moderator krijgt "niet gevonden", zoals bij de artikelen.
  De pagina toont de totalen van de laatste 7 en 30 dagen, elke dag van de laatste 30 dagen (een dag zonder teller als 0, de nieuwste bovenaan) en de 20 meest bekeken pagina's van die 30 dagen.
  Een totaal van bezoekers is de som van de dagen, want de teller kent een bezoeker alleen binnen een dag; de pagina zegt dat.
  Een dag is een dag in Nederland, zoals de teller hem bewaart.
  Zonder één geteld bezoek staat er een zin in plaats van de tabellen.
  De tabellen zijn een nieuw component, `DataTable`: een echte `table` met een bijschrift dat alleen een schermlezer krijgt, kolomkoppen en rijkoppen met `scope`, en getallen aan het eind uitgelijnd.
  De kolom met paginaweergaven heet "Weergaven": "Paginaweergaven" breekt niet af en maakte de pagina op 320 pixels te breed.
- **Waarom:** de sjablonen van de site hebben geen HTML (ESLint dwingt dat af), dus een tabel moet een component zijn.
  Een component met `caption`, `columns` en `rows` is klein en past op meer pagina's van het beheer, zonder dat elke pagina zelf een tabel met koppen en `scope` bouwt.
  Dagen zonder teller als 0 tonen houdt de tabel gelijk van lengte en laat zien dat er die dag niets was.
  De som van de dagen is het enige totaal dat we eerlijk kunnen geven zonder bezoekers langer dan een dag te onthouden.
- **Alternatieven:** een moderator de cijfers laten zien (de cijfers zijn voor wie de site beheert, en de issue vraagt om beheerders); een grafiek (staat buiten het issue, en een tabel werkt overal en met een schermlezer); alleen dagen met een teller tonen (de tabel verspringt en een gat valt niet op); `StandingsTable` hergebruiken (die is voor de stand, met afkortingen en een eigen gebied dat zijwaarts scrolt).

## De punten staan voor het doelsaldo in de standtabel

- **Datum:** 26 oktober 2026
- **Besluit:** de kolommen van de standtabel zijn # Club G W G V P D: de punten staan voor het doelsaldo.
  Dat geldt voor de volledige stand op `/wedstrijden`, voor de korte vorm van de homepage (# Club G P D) en voor elke andere plek waar `StandingsTable` staat.
  De punten blijven vet, de rij van sc Heerenveen houdt zijn balk en de getallen blijven rechts uitgelijnd.
- **Waarom:** de stand is op punten gesorteerd en het doelsaldo is alleen de tweede maatstaf.
  Wie de tabel van links naar rechts leest, komt dus eerst bij wat telt.
- **Alternatieven:** de punten achteraan laten, zoals veel sites (de projecteigenaar wilde ze eerder); de punten direct na de club zetten (verbreekt de rij gespeeld, gewonnen, gelijk, verloren).
- **Later:** zie _De stand toont alleen gespeeld en punten, en de volledige stand heeft een balk voor de punten_.
  De kolommen W, G, V en D zijn vervallen: de kolommen zijn nu # Club G P.
- **Later:** zie _In een tabel is vet voor het kerngetal, niet voor onze club of een achternaam_.
  De punten blijven vet, want ze zijn het kerngetal; de rij van sc Heerenveen is niet meer vet.

## De stand toont alleen gespeeld en punten, en de volledige stand heeft een balk voor de punten

- **Datum:** 26 oktober 2026
- **Besluit:** de standtabel verliest de kolommen gewonnen, gelijk, verloren en doelsaldo, in elke uitvoering.
  De kolommen zijn nu # Club G P, waarbij G de gespeelde wedstrijden zijn.
  De volledige stand heeft naast de punten, in dezelfde cel, een balk; de stand van drie clubs op de homepage heeft geen balk.
  De projecteigenaar koos dit op 26 oktober 2026.
  Het doelsaldo ging er later die dag ook uit: gespeeld en punten zijn genoeg, de rest vind je overal elders, en zo hoort de balk bij de punten.
  De balk is smal, ongeveer 3,5 rem.
- **Hoe:** de lengte is het aandeel van de punten van de koploper (de club met de meeste punten), in procenten tussen 0 en 100, met een schaal vanaf nul.
  Het component rekent dat uit de rijen en geeft het door als `--hf-points-share`, dus clubs met evenveel punten hebben even lange balken.
  Heeft niemand punten, dan zijn er geen balken.
  De balk is versiering: een `span` met `aria-hidden` in de cel van de punten, zonder eigen cel, kop, rol of naam, dus een schermlezer leest alleen de getallen.
  De kop van de punten heeft aan het eind evenveel ruimte als de balk, zodat hij boven de getallen staat.
  De balk is groen, het groen van een gewonnen wedstrijd (`--hf-colour-outcome-win`, #285), want punten komen uit winst.
  Dat vervangt de eis van het issue dat groen en rood niet voor de balken zijn; de projecteigenaar koos groen op 26 oktober 2026, na een eerste versie in staalblauw en een tweede in blauw.
  Bij de rij van sc Heerenveen is het hele groen, bij de andere rijen 70% ervan: 3,38:1 op wit in licht en 4,81:1 op de donkere kaart in donker (het hele groen haalt 6,45:1 en 8,43:1).
  Rood komt niet voor.
  In forced colours is de balk `CanvasText`.
- **Hoe:** de balk verdwijnt met een container query op de breedte van de plek van de tabel (`.hf-standings`), niet van het scherm, onder 19 rem.
  Zonder balk past de tabel op 320 pixels, ook bij 400% zoom, dus het gebied dat zijwaarts scrolt en de eigenschap `label` zijn vervallen.
  `columns` blijft: `all` is de volledige stand met balken en uitleg van de afkortingen, `compact` de korte vorm zonder beide.
  `won`, `drawn`, `lost` en `goalDifference` zijn geen eigenschappen van een rij meer; de database en de import houden die gegevens, want de controles gebruiken ze.
- **Waarom:** "1 punt uit elkaar" of "10 punten uit elkaar" zie je niet aan het getal, wel aan de lengte van een balk.
  De ruimte van drie smalle kolommen is genoeg voor een balk, en de stand past dan zonder scrollen in de zijbalk van 32 rem.
  In de stand van drie clubs helpt een balk weinig.
  Het verlies is het getal van gewonnen, gelijk, verloren en het doelsaldo, dat niet uit de rest van de tabel af te leiden is; de projecteigenaar vond dat het minder waard is dan de balk.
- **Alternatieven:** de balk als achtergrond van de rij (kost geen kolom, maar de tint staat achter de getallen en is moeilijker te vergelijken); alle kolommen houden en de balk er breder bij zetten (de tabel scrolt dan zijwaarts); een staafgrafiek naast de tabel (neemt veel ruimte en herhaalt de tabel); een stippendiagram zoals Zeit Online (goed voor verschillen, maar je leest de namen er moeilijker uit); een schaal vanaf het minimum (maakt verschillen groter, maar dan zegt de balk niets meer over de verhouding tot nul).
- **Later:** de balk, de container query en de opmaak van de tabel staan sinds 26 oktober 2026 in `bar/bar.css`, met de eigenschap `--hf-bar-share` en de klassen `hf-bar` en `hf-bar-place`, omdat de topscorers dezelfde balk gebruiken; zie _De topscorers komen uit onze eigen wedstrijdgegevens, met de balk van de stand_.

## We nemen NOS Voetbal, met het filter `club`

- **Datum:** 26 oktober 2026
- **Besluit:** het register krijgt de voetbalfeed van NOS (`https://feeds.nos.nl/nosvoetbal`) met het filter `club`.
  De bron toont alleen de kop, de link, de bronnaam en de tijd.
  De beschrijving en de afbeelding in de feed bewaart de importer niet en toont de site niet.
- **Waarom:** NOS is de grootste nieuwsbron over de Eredivisie en publiceert de feed zelf.
  De voetbalfeed gaat over precies ons onderwerp, en het filter laat alleen de berichten over sc Heerenveen door.
  De sportfeed is breder en heeft minder berichten over voetbal.
  Het voorbehoud van NOS tegen automatisch verzamelen is een risico, maar we nemen alleen een kop en een link en stoppen op verzoek, zoals bij #10 besloten.
- **Gemeten op de echte feed** (26 oktober 2026, één run van de importer): 20 berichten bewaard, waarvan 1 `relevant`, 0 `doubtful` en 19 `irrelevant`.
  Het ene `relevant` bericht is het wedstrijdverslag van de club, en geen bericht over de club staat bij de 19.
  De importer leest de feed dus zonder aanpassing.
- **Alternatieven:** de sportfeed van NOS (breder, met minder voetbal en een kortere periode); wachten op schriftelijke toestemming van NOS (voorzichtiger, maar NOS antwoordt zelden en we missen intussen de landelijke berichten over de club).
- **Daarna:** schriftelijk toestemming vragen aan NOS hoort bij #35; de projecteigenaar nam het voorbehoud van NOS aan bij het goedkeuren van het issue.

## De kolommen van `/wedstrijden` zijn even breed

- **Datum:** 26 oktober 2026
- **Besluit:** de hoofdkolom en de zijbalk van `/wedstrijden` zijn allebei 31 rem breed, met 2 rem ertussen.
- **Waarom:** de projecteigenaar vindt twee even brede kolommen rustiger dan 30 en 32 rem.
  De stand in de zijbalk heeft sinds het wegvallen van de kolommen voor de doelpunten minder breedte nodig, en met de balk (zie _De stand toont alleen gespeeld en punten, en de volledige stand heeft een balk voor de punten_) ook de kolom met gewonnen, gelijk en verloren niet meer.
- **Hoe:** `Page.Sidebar` met `wide` zet de sporen op twee keer `minmax(24rem, 31rem)`, zodat ze op elke breedte even breed zijn (eerst was het `minmax(20rem, 30rem)` en `minmax(24rem, 32rem)`); de rest van de regels uit _/wedstrijden heeft een zijbalk van 32 rem met de stand en de uitslagen_ blijft.
  Andere pagina's houden 38, 2 en 24 rem.
- **Alternatieven:** 30, 2 en 32 rem laten, zoals in #283 (de zijbalk is breder dan de hoofdkolom); 32 en 30 rem (de tabel past er met de balk beter in, maar het programma wordt breder dan nodig).
- **Later:** zie _De kaarten van een zijbalk staan standaard onder elkaar, naast elkaar is een optie_.
  `wide` zet alleen de sporen op twee keer 31 rem; de cellen onder elkaar zijn nu de standaard van elke zijbalk, en de regel `.hf-page-sidebar-wide` voor de kolommen van de cellen is vervallen.
- **Later:** zie _De tweede kolom begint bij 52 rem, voor alle pagina's met een zijbalk_.
  De twee kolommen staan naast elkaar vanaf 52 rem en niet meer vanaf 56 rem, en de sporen krimpen tot 20 rem in plaats van 24 rem, zodat ze ook passen naast de inkeping van een telefoon in liggende stand.

## We nemen het AD, met het filter `club` en het teken voor de betaalmuur

- **Datum:** 26 oktober 2026
- **Besluit:** het register krijgt de voetbalfeed van het Algemeen Dagblad (`https://www.ad.nl/voetbal/rss.xml`) met het filter `club`, en de importer leest `<dpp:paid>true</dpp:paid>` als de betaalmuur van die bron.
  De bron toont alleen de kop, de link, de bronnaam en de tijd, met "voor abonnees" bij een bericht achter de betaalmuur.
  De beschrijving, de auteur en de afbeeldingen in de feed bewaart de importer niet en toont de site niet.
- **Waarom:** het AD is een grote bron over de Eredivisie.
  De feed is door DPG zelf aangeboden, met een eigen merker voor de betaalmuur, en een lezer wil weten dat een bericht achter een betaalmuur staat voordat hij erop klikt.
  Het voorbehoud van DPG tegen scrapen is een risico, maar we nemen alleen een kop en een link en stoppen op verzoek, zoals bij #10 besloten.
- **Gemeten op de echte feed** (26 oktober 2026, één run van de importer): 30 berichten bewaard, waarvan 1 `relevant`, 0 `doubtful` en 29 `irrelevant`, en 11 herkend als betaalmuur.
  Het ene `relevant` bericht is het wedstrijdverslag van de club, en geen bericht over de club staat bij de 29.
- **Hoe de importer het teken leest:** per bron, op het domein, zoals bij Voetbal International en de Leeuwarder Courant (`paywallNamespaces` in `apps/importer/src/read-feed.ts`).
  De naamruimte is het adres `https://www.dpgmedia.cloud/paidrss` en niet het voorvoegsel `dpp`: een voorvoegsel is een keuze van de feed en kan veranderen.
  `feedsmith` kent het element niet, dus de tweede lezing met `fast-xml-parser` zoekt het, zoals het element `<premium>` van de Leeuwarder Courant.
- **Alternatieven:** wachten op schriftelijke toestemming van DPG Media (voorzichtiger, maar DPG antwoordt zelden); de bron nemen zonder het teken voor de betaalmuur (een lezer klikt dan op een bericht dat hij niet kan lezen, tegen onze eigen regel).
- **Daarna:** schriftelijk toestemming vragen aan DPG Media hoort bij #35; de projecteigenaar nam het voorbehoud van de bron aan bij het goedkeuren van het issue.
  De voorwaarden van DPG Media en van het AD zeggen niets over RSS-feeds, maar verbieden commercieel gebruik, het overnemen van content en het doorzoeken met robots (zie `docs/bronnen.md`).

## We nemen ESPN NL, met het filter `club` en een eigen regel voor de zone EST

- **Datum:** 26 oktober 2026
- **Besluit:** het register krijgt de voetbalfeed van ESPN NL (`https://www.espn.nl/espn/rss/soccer/news`) met het filter `club`.
  De bron toont alleen de kop, de link, de bronnaam en de tijd.
  De beschrijving en de auteur in de feed bewaart de importer niet en toont de site niet.
  Voor het domein `www.espn.nl` leest de importer de zone `EST` als `Europe/Amsterdam`; voor andere feeds verandert er niets.
- **Waarom:** ESPN NL is een grote bron over het Nederlandse voetbal, en de feed geeft geen betaalmuur.
  De tijden in de feed zijn de Nederlandse tijd met een verkeerd zonelabel.
  Dat bleek uit de pagina's van vijf berichten, uit het einde van de wedstrijd ADO – sc Heerenveen en uit het moment waarop de feed werd opgehaald (zie `docs/bronnen.md`).
  Letterlijk gelezen staat elk bericht vijf of zes uur te laat, en het nieuwste bericht zou dan uit de toekomst komen.
  Een regel per bron laat de lezing van `EST` bij andere feeds, waar het echt een zone is, ongemoeid.
  De regel leest de wandkloktijd van Nederland, dus ook de zomertijd en de overgangen.
  Een tijd die vaak twee keer op de klok staat (de nacht van het einde van de zomertijd) is de eerste, en een tijd die niet bestaat (het begin ervan) is de tijd na de sprong.
- **Voorwaarden:** de twee teksten van Disney zeggen niet hetzelfde.
  De Nederlandse gebruiksvoorwaarden, waar `www.espn.nl` naar linkt (2012), verbieden "geautomatiseerd gebruik met hoog volume" en hergebruik zonder schriftelijke toestemming.
  De Engelse voorwaarden voor de Verenigde Staten (2024) verbieden elke toegang met een robot, spider of script.
  Het blijft een risico dat geen jurist heeft getoetst.
  We nemen één feed, met hoogstens één verzoek per kwartier, alleen een kop en een link, en we stoppen op verzoek.
- **Gemeten op de echte feed** (26 oktober 2026, één run van de importer): 25 berichten bewaard, waarvan 1 `relevant`, 0 `doubtful` en 24 `irrelevant`.
  Het ene `relevant` bericht is het wedstrijdverslag van de club.
  Een bericht over dezelfde wedstrijd vanuit ADO noemt de club niet in de kop en is `irrelevant`; de lijsten blijven zoals ze zijn.
  Alle 25 tijden waren geldig.
- **Alternatieven:** wachten op schriftelijke toestemming van Disney (voorzichtiger, maar Disney antwoordt zelden); `EST` voor alle feeds als Nederlandse tijd lezen (verkeerd voor een feed waar het echt EST is); de tijd van deze bron negeren en alleen het moment van eerste zien gebruiken (de berichten staan dan niet op hun echte tijd).
- **Daarna:** schriftelijk toestemming vragen aan Disney hoort bij #35; de projecteigenaar nam het voorbehoud van Disney aan bij het goedkeuren van het issue.

## We nemen De Gelderlander na het relevantiefilter

- **Datum:** 1 november 2026
- **Besluit:** het register krijgt de sportfeed van De Gelderlander (`https://www.gelderlander.nl/sport/rss.xml`) met het filter `club`.
  De bron toont alleen de kop, de link, de bronnaam en de tijd, met "voor abonnees" bij een bericht achter de betaalmuur.
  De beschrijving, de auteur, de afbeeldingen en het logo in de feed bewaart de importer niet en toont de site niet.
  De importer leest `<dpp:paid>true</dpp:paid>` met dezelfde regel als bij het Algemeen Dagblad: het domein `www.gelderlander.nl` staat erbij in `paywallNamespaces`.
  Er komt geen nieuw codepad en geen term in de lijsten van het filter.
- **Waarom:** de projecteigenaar wil De Gelderlander vooral voor de koppen over N.E.C. en Go Ahead Eagles rond een wedstrijd tegen hen.
  De krant staat daar dichtbij, en het filter laat een kop over de tegenstander toe van 3 dagen voor tot 3 dagen na de wedstrijd (zie _Een kop over de tegenstander is `relevant` van 3 dagen voor tot 3 dagen na de wedstrijd, en alleen als hij geen andere profclub noemt_).
  De feed is het sportnieuws van de regio, met schaatsen, ijshockey en de wereldtop van het voetbal, dus zonder het filter zouden de meeste koppen niets met de club te maken hebben.
  Buiten de dagen rond zo'n wedstrijd toont de site alleen wat over sc Heerenveen zelf gaat.
- **Gemeten op de echte feed** (1 november 2026, één run van de importer): 30 berichten bewaard, waarvan 2 `relevant`, 0 `doubtful` en 28 `irrelevant`, en 9 herkend als betaalmuur.
  De twee `relevant` berichten zijn de verslagen van N.E.C. – sc Heerenveen.
  Een kop over Thialf of over Nijmegen Devils, ook een die beide noemt, bleef `irrelevant`; een test houdt dat vast.
  De wedstrijden in de lokale database waren die van de seed, dus de regel van de tegenstander had in deze run niets te doen; de tests met een verzonnen feed laten hem zien.
- **Voorwaarden:** niet gelezen.
  De pagina's van DPG Media en van de krant stuurden ons naar een toestemmingspagina, die we niet hebben doorgeklikt.
  Het `robots.txt` heeft hetzelfde voorbehoud als dat van het Algemeen Dagblad tegen scrapen en andere geautomatiseerde manieren om gegevens te verzamelen, en laat de feed toe.
  Het blijft een risico dat geen jurist heeft getoetst.
  We nemen één feed, alleen een kop en een link, en we stoppen op verzoek.
- **Alternatieven:** wachten op schriftelijke toestemming van DPG Media (voorzichtiger, maar DPG antwoordt zelden); de bron zonder het filter nemen (de feed is breed, en de meeste koppen gaan over ander sport); een term voor Thialf en Nijmegen Devils in de lijsten (niet nodig, want de echte koppen daarover bleven `irrelevant`).
- **Daarna:** schriftelijk toestemming vragen aan DPG Media hoort bij #35; de projecteigenaar nam het voorbehoud van de bron aan bij het goedkeuren van het issue.
- **Later:** zie _Een kop met "de treffers" als gewoon woord telt niet als kop over De Treffers_.
  De regel van de tegenstander geldt voor elke feed op `club` en niet per bron.
  Dus ook een kop over De Treffers (Groesbeek, bij Nijmegen) telt bij De Gelderlander rond de bekerwedstrijd van 1 december 2026, naast N.E.C. en Go Ahead Eagles, zonder dat er iets in de lijsten bij komt.
  Alleen "de treffers van" kreeg een zin in `namesakeClubs`.

## We nemen Rijnmond na het relevantiefilter, voor de Rotterdamse tegenstanders

- **Datum:** 1 november 2026
- **Besluit:** het register krijgt de feed van de sport van Rijnmond (`https://www.rijnmond.nl/rss/sport.xml`) met het filter `club`.
  Het regionieuws van Rijnmond (`https://www.rijnmond.nl/rss/index.xml`) blijft afgewezen en staat niet in het register.
  De bron toont alleen de kop, de link, de bronnaam en de tijd.
  Een kop over Feyenoord, Sparta of Excelsior is `relevant` van 3 dagen voor tot 3 dagen na een wedstrijd tegen die club, en alleen als hij geen andere profclub noemt (de regel van #315).
  Een kop over sc Heerenveen zelf telt op elke dag.
  Op de andere dagen toont de site niets van deze bron.
- **Waarom:** op 24 oktober 2026 wezen we Rijnmond af, omdat geen enkel bericht van het regionieuws over sc Heerenveen ging.
  De feed van de sport is een andere feed, en sinds #315 kan de site met het filter tonen wat de regionale omroep schrijft over de volgende tegenstander.
  Op 1 november 2026 noemden 32 van de 50 koppen Feyenoord, vier Sparta en vier Excelsior.
  Zonder de regel van de tegenstander was geen enkele kop `relevant`, en met de regel toont de bron iets vanaf 5 november 2026, drie dagen voor de wedstrijd tegen Feyenoord.
  De voorwaarden laten koppen via de RSS-feed ongewijzigd toe, en `robots.txt` laat ons de feed lezen (zie `docs/bronnen.md`).
- **Het filter:** de namen "Feyenoord", "Sparta" en "Excelsior" stonden al in de lijst met profclubs (`otherClubGroups`).
  Eén naam beoordeelde verkeerd: "Sparta Praag" is een andere club dan Sparta Rotterdam, maar bevat het woord "Sparta".
  De regel van de tegenstander laat de zinnen uit `namesakeClubs` (`sparta praag`, `sparta prague`) eerst weg, zodat zo'n kop niet `relevant` wordt in de week van een wedstrijd tegen Sparta.
  Een kop met ook een andere profclub hoort bij een andere wedstrijd, zoals een Rotterdamse derby.
- **Gemeten op de echte feed** (1 november 2026, één run van de importer op de eigen database): 50 berichten bewaard, 0 overgeslagen, 0 `relevant`, 0 `doubtful` en 50 `irrelevant`.
  Dat klopt, want de eerstvolgende wedstrijd tegen een Rotterdamse club is Feyenoord op 8 november 2026.
  Nagerekend met dezelfde koppen alsof er een wedstrijd was, zijn 19 van de 50 `relevant` in de week rond een wedstrijd tegen Feyenoord, 0 rond Sparta en 1 rond Excelsior.
- **Nadeel:** de bron toont per wedstrijd alleen wat de regionale omroep over de Rotterdamse tegenstander schrijft, en bijna niets over sc Heerenveen.
  Een kop over de tegenstander die de club niet noemt, zoals een vraaggesprek met een trainer van Feyenoord, kan dus op de site staan.
- **Alternatieven:** de bron afgewezen laten (een regionale omroep met nieuws over de volgende tegenstander gaat dan verloren); het regionieuws erbij nemen (geen enkel bericht ging over de club, en het filter laat alleen de dagen rond een wedstrijd door); alleen Feyenoord in het filter (Sparta en Excelsior hebben dezelfde regel nodig, en de lijst met clubs bestond al).

## Een kop met "de treffers" als gewoon woord telt niet als kop over De Treffers

- **Datum:** 2 november 2026
- **Besluit:** de regel van de tegenstander laat de zin "de treffers van" eerst weg, zoals hij "sparta praag" weglaat (`namesakeClubs` in `apps/importer/src/relevance-terms.ts`).
  Een kop over de club, zoals "De Treffers verrast in de beker" of "De Treffers-trainer Janssen kijkt vooruit", blijft `relevant` in de dagen rond de wedstrijd.
  De vergelijking blijft zonder hoofdletters, en De Treffers zelf komt niet in de lijsten: de naam komt uit `matches`, zoals bij elke amateurclub in de beker (#315).
  De regel geldt voor elke feed op `club`, niet per bron (#644).
- **Waarom:** de beker brengt sc Heerenveen op 1 december 2026 tegen De Treffers uit Groesbeek, en Wikipedia schrijft "1–3 december 2026".
  De importer bewaart de eerste dag, dus het venster loopt van 28 november tot en met 4 december.
  "De treffers" is ook het woord voor doelpunten: "De treffers van Napoli, Koopmeiners en Lang" noemt geen profclub uit de lijst en zou in die dagen `relevant` worden, bij elke bron op `club`.
  De zin is de kleinste oplossing en laat de koppen over de club met rust.
- **Nadeel:** een kop over de club die met "De Treffers van" begint, zoals "De Treffers van trainer Janssen winnen", telt niet mee.
  Dat zijn er weinig, en de kop staat nog gewoon in de bron.
- **Alternatieven:** niets doen en de kleine kans op een verkeerde kop accepteren (lichter, maar elke kop daarvan staat een paar dagen op `/nieuws`); de vergelijking hoofdlettergevoelig maken, zodat alleen "Treffers" met een hoofdletter telt (een kop in hoofdletters of met elk woord een hoofdletter, "De Treffers Van Napoli", is dan niet te scheiden, en het maakt van het filter, dat nergens op hoofdletters let, een uitzondering voor één club; zie _De regels van het filter: hele woorden, zonder hoofdletters en accenten_); `treffers` helemaal uit de naam halen (dan telt ook "De Treffers verrast" niet meer); een lijst met clubs per bron (veel meer werk, en hier niet nodig).

## De echte bronnen komen op productie via de seed

- **Datum:** 23 oktober 2026
- **Besluit:** de echte bronnen komen op productie via een eigen lijst in de seed, `realSources`, die de site bij het opstarten toepast, tot het beheer (#31) bronnen kan toevoegen.
  De site werkt een bron die er al staat bij op haar domein, maar niet wat het beheer straks wijzigt: `enabled`, de velden `consent_*`, `attribution` en het beleid voor intro, foto en insluiten.
  `pnpm db:seed` blijft op productie weigeren.
  Zodra het beheer bronnen kan toevoegen, verdwijnt de lijst `realSources` uit de seed.
- **Waarom:** het is de kleinste wijziging die een gevulde site geeft, en het hergebruikt de weg die acceptatie al heeft.
  De velden die het beheer straks wijzigt, blijven staan.
- **Alternatieven:** een migratie die de bronnen invoegt (gegevens tussen het schema); een opdracht op de host via SSH (nog een stap die de eigenaar moet onthouden); wachten op het beheer (de site gaat leeg live).

## Testbronnen alleen lokaal; acceptatie en productie hebben alleen echte bronnen

- **Datum:** 26 oktober 2026
- **Besluit:** de testbronnen bestaan alleen lokaal en in de tests.
  Acceptatie en productie zetten alleen de echte bronnen in het register, en op acceptatie verdwijnen de testbronnen die er al staan.
  De homepage heeft geen alinea meer die naar de bronnen verwijst; `/bronnen` staat nog in de footer en bij Over ons.
- **Waarom:** acceptatie draait nu met echte bronnen en echte berichten, en de redactie bekijkt de site er.
  Een pagina `/bronnen` met "Testkrant" en een testforum laat zien dat het nog een proefomgeving is, en de acceptatieomgeving moet laten zien wat de bezoeker straks ziet.
- **Hoe:** de site haalt bij elke start op acceptatie de rijen weg met een domein uit `testSources`, met hun feeds en berichten (die gaan mee door `ON DELETE CASCADE`).
  Een echte bron, ook met een eigen feed en berichten, blijft staan, en een tweede start verandert niets.
  De controle na de deploy zoekt de Leeuwarder Courant op `/bronnen`, en faalt als er nog een testbron staat.
  De toegankelijkheidscontrole en de e2e-controles hebben testbronnen nodig voor hun verzonnen koppen.
  Zij draaien de site met `SITE_ENV=acceptance` en zetten de testbronnen zelf in het register, in `e2e/global-setup.ts` (`e2e/test-sources.ts`).
  Dat werkt alleen in een database op deze computer.
  De rooktest toetst acceptatie en productie met de echte bronnen.
- **Alternatieven:** de testbronnen op acceptatie laten staan, maar verborgen via `enabled` (de rijen blijven, en de controle na de deploy leunt dan nog op iets wat niemand ziet); de testbronnen alleen van `/bronnen` filteren (de homepage en de importer zien ze dan nog).
  Voor de e2e-controles: de site met `SITE_ENV=local` starten en de seed er laten draaien; dat verandert ook het adres van de site en de eisen aan de mailinstellingen, en de controles toetsen de site zoals hij op acceptatie draait.

## De topscorers komen uit onze eigen wedstrijdgegevens, met de balk van de stand

- **Datum:** 26 oktober 2026
- **Besluit:** `/wedstrijden` krijgt een kaart met de beste vijf (met gelijkstaanden) doelpuntenmakers van sc Heerenveen dit seizoen, uit `match_goals`, in alle wedstrijden, met dezelfde soort balk als in de stand.
  De kaart staat in de zijbalk direct onder de kaart "Stand", en de zijbalk heet nu "De stand, de ranglijsten en de uitslagen".
- **Waarom:** de gegevens staan al in de database, dus er is geen nieuwe bron en geen nieuw verzoek aan Wikipedia.
  Een balk laat het verschil tussen twee spelers beter zien dan een getal, zoals bij de punten in de stand.
  Alle wedstrijden in één lijst is eenvoudig en komt overeen met wat supporters bedoelen met "topscorer van het seizoen".
- **Hoe:** de pagina telt de doelpunten uit de wedstrijden die ze al heeft (`listSeasonMatches` geeft de doelpuntenmakers mee), dus er komt geen vraag bij.
  Een doelpunt telt voor een speler als `ours` waar is en `own_goal` niet: een penalty telt mee, een eigen doelpunt van een tegenstander niet, en een doelpunt van de tegenstander ook niet, ook niet bij een speler met dezelfde naam.
  Een speler is de naam zoals `match_goals` hem bewaart, dus twee spelers met dezelfde naam tellen samen.
  Gelijke aantallen delen een plaats (1, 2, 2, 4) en staan op alfabet; de kaart toont de eerste vijf en iedereen die met de vijfde gelijk staat, tot acht rijen.
  Onder de tabel staat "Gebaseerd op de doelpuntenmakers van X van Y gespeelde wedstrijden" als een gespeelde wedstrijd met een doelpunt van ons geen doelpuntenmakers heeft; zonder doelpunten staat er een zin in plaats van de tabel.
  De balk is een gedeeld stuk (`Bar` en `bar.css` in het designsysteem), gebruikt door de `StandingsTable` en de nieuwe `TopScorersTable`; de eigenschap heet `--hf-bar-share` en de container query staat op `hf-bar-place`, onder dezelfde 19 rem.
  Dat ook de rij van sc Heerenveen het hele groen houdt, blijft in `standings-table.css`.
  De kop van de doelpunten is de afkorting D, op verzoek van de projecteigenaar op 26 oktober 2026, zoals G en P in de stand: een schermlezer hoort "doelpunten" en onder de tabel staat "D doelpunten", in een gedeelde legenda (`hf-bar-legend`, eerst `hf-standings-legend`).
- **Alternatieven:** de Eredivisie en de beker apart tonen (nauwkeuriger, maar twee lijsten en veel lege rijen in het begin); alleen de beste drie (te weinig voor een selectie); een nieuwe bron met statistieken van spelers (#39); de CSS van de balk kopiëren naar het nieuwe component (twee plekken om gelijk te houden).
- **Later:** de kaart toont sinds 26 oktober 2026 alle doelpuntenmakers van het seizoen en niet meer de beste vijf met gelijkstaanden; zie _De kaart met topscorers toont alle doelpuntenmakers_.
- **Later:** de kaart heet sinds 26 oktober 2026 "Doelpuntenmakers" en niet meer "Topscorers", en het aantal spelers staat onder de kop en niet meer onder de tabel; zie _De kaart heet Doelpuntenmakers, met het aantal spelers onder de kop_.
- **Later:** de kaart telt sinds 27 oktober 2026 per speler (`player_id`) en toont zijn volledige naam, dus twee spelers met dezelfde achternaam zijn twee rijen; een doelpunt zonder speler telt per naam als een eigen rij; zie _Spelers hebben een vaste `id`, en doelpunten verwijzen ernaar_.

## De lijst met gehouden nullen is een lijst van korte wedstrijdregels

- **Datum:** 26 oktober 2026
- **Besluit:** `/wedstrijden` krijgt een kaart met de wedstrijden waarin we geen tegendoelpunt kregen, als korte regels (datum, tegenstander en uitslag), met het aantal erbij.
  Het zijn geen volledige wedstrijdregels.
- **Waarom:** de supporter wil zien in welke wedstrijden de verdediging de nul hield, niet alle details die de uitslagen al geven.
  Korte regels houden de zijbalk rustig, en de gegevens staan al in `matches`.
- **Hoe:** de regel is een eigen onderdeel van het designsysteem, `ShortMatch`, en geen uitvoering van `Match`.
  `Match` heeft een competitie, een ronde, een stadion, doelpuntenmakers en de kleur van de uitkomst, en heeft al veel props; een korte uitvoering zou die allemaal moeten uitzetten.
  `ShortMatch` heeft zes props en geen kleur, want in deze lijst hebben alle regels dezelfde soort uitslag.
  De selectie en het aantal komen uit dezelfde wedstrijden die de pagina al haalt (`cleanSheetsOf`), en de knop "Laad 5 meer" werkt zoals op de homepage, met `?nul=` in het adres.
- **Alternatieven:** de volledige wedstrijdregels (veel dubbele informatie naast de uitslagen); alleen een getal zonder lijst (zegt niet welke wedstrijden); een markering in de lijst met uitslagen (de nullen verdwijnen dan tussen de rest); een korte uitvoering van `Match` (maakt `Match` groter).
- **Later:** zie _`ShortMatch` toont de uitkomst met kleur en gewicht, zoals `Match`_ (31 oktober 2026): `ShortMatch` heeft sindsdien wel de kleur van de uitkomst.
  De rest blijft: een eigen onderdeel met zes props, zonder competitie, ronde, stadion of doelpuntenmakers.
- **Later:** zie _Een uitslag van één wedstrijd staat met de thuisclub eerst, ook in `ShortMatch`_ (2 november 2026): de regel noemt sindsdien beide clubs, met de thuisclub en zijn doelpunten eerst, en niet meer alleen de tegenstander met "thuis" of "uit" en de uitslag vanuit onze kant.
- **Later:** zie _`Match` is voor een volledige lijst, `ShortMatch` voor een selectie_ (4 november 2026): `ShortMatch` is sindsdien voor een selectie, zoals deze kaart, en niet voor een volledige lijst.
  De keuze voor de korte regel hier blijft; de reden is nu de regel voor selecties en niet alleen dat de uitslag genoeg is.

## De kaart met topscorers toont alle doelpuntenmakers

- **Datum:** 26 oktober 2026
- **Besluit:** de kaart "Topscorers" toont iedereen die dit seizoen voor sc Heerenveen scoorde, niet alleen de beste vijf.
- **Waarom:** een supporter wil zien wie er scoorde, ook als dat een speler met één doelpunt is.
  De selectie scoort in een seizoen met een tiental spelers, dus de lijst blijft overzichtelijk, en de balken laten het verschil tussen de eerste en de rest zien.
- **Hoe:** de grens van vijf rijen (met de gelijkstaanden tot hoogstens acht) en de code die haar toepast, `topScorersShown`, zijn vervallen: de kaart toont wat `topScorersOf` geeft.
  Het aantal spelers staat in een zichtbare regel onder de tabel ("11 spelers hebben gescoord"), en niet in het bijschrift, want alleen een schermlezer krijgt het bijschrift.
  De telling blijft op één plek, `topScorersOf`, want #333 laat haar later per speler in plaats van per naam tellen.
- **Alternatieven:** de beste vijf houden, met gelijkstaanden (korter, maar de rest blijft onzichtbaar); de beste vijf met een knop voor de rest (extra stap en meer code, terwijl de lijst kort genoeg is).
- **Later:** de kaart heet sinds 26 oktober 2026 "Doelpuntenmakers" en het aantal spelers staat sinds die dag onder de kop en niet meer onder de tabel; zie _De kaart heet Doelpuntenmakers, met het aantal spelers onder de kop_.
- **Later:** zie _Statistieken toont de top 5 van de doelpuntenmakers, en de volledige lijst staat op Spelers_ (31 oktober 2026): de kaart op `/statistieken` toont de top 5, met alle gelijke plekken; alle doelpuntenmakers staan op `/statistieken/spelers`.
- **Later:** zie _Op /wedstrijden hebben de kaarten met cijfers een zacht en een warm vlak, en de uitslagen staan in de hoofdkolom_.
  De zijbalk heet nu "De stand, de ranglijsten en de doelpunten per kwartier".

## De kaart Doelpunten per kwartier telt de doelpunten van de wedstrijden met bekende minuten

- **Datum:** 26 oktober 2026
- **Besluit:** `/wedstrijden` krijgt in de hoofdkolom, onder het programma, een kaart "Doelpunten per kwartier" met twee diagrammen, voor en tegen, elk in zes plakken: de kwartieren van een wedstrijd.
  De cijfers staan ook als tabel, en onder de tabel staat op hoeveel van de gespeelde wedstrijden de telling is gebaseerd.
  Ging een wedstrijd in de telling naar de verlenging, dan staat daar ook dat de verlenging buiten de telling blijft; anders staat die zin er niet.
- **Waarom:** een taart toont maar één reeks, dus voor en tegen vragen twee taarten.
  De verlenging komt alleen in bekerwedstrijden voor en zou een kwartier erbij maken dat de meeste wedstrijden niet hebben.
  De tabel is er voor wie een diagram niet kan zien en voor wie liever getallen leest.
- **Hoe:** `goalsPerQuarter` in `src/matches.ts` telt de doelpunten uit de wedstrijden die de pagina al heeft, dus er komt geen vraag bij.
  - De kwartieren zijn de minuten 1 tot en met 15, 16 tot en met 30, 31 tot en met 45, 46 tot en met 60, 61 tot en met 75 en 76 tot en met 90.
  - Een doelpunt in blessuretijd heeft de minuut van het laatste volle kwartier (45+1 is minuut 45, 90+3 is minuut 90) en telt dus bij het kwartier ervoor: `stoppage_minutes` doet niet mee.
  - Een doelpunt na minuut 90 is een doelpunt in de verlenging en telt niet mee, ook niet in de blessuretijd van de verlenging.
    Een doelpunt met minuut 0 bestaat niet in een wedstrijd en telt ook niet mee.
  - Een doelpunt telt voor de club die ervan profiteert, zoals `ours` al regelt: een eigen doelpunt van een tegenstander is een doelpunt voor ons, en een eigen doelpunt van ons een tegendoelpunt.
  - Een gespeelde wedstrijd met een uitslag telt mee als hij minstens één doelpunt in `match_goals` heeft, of als hij eindigde in 0–0.
    Een wedstrijd met een uitslag en zonder doelpunten in de gegevens heeft geen minuten: de pagina noemde de doelpuntenmakers niet, of ze pasten niet bij de uitslag (zie _Een doelpunt dat niet bij de uitslag past, wordt niet getoond_).
    Die wedstrijd blijft erbuiten, en de tekst onder de tabel zegt het: "Gebaseerd op 8 van de 10 gespeelde wedstrijden", of "alle 10 gespeelde wedstrijden", of "1 gespeelde wedstrijd".
    Dat is dezelfde regel als de lijn onder de topscorers, met één verschil: de topscorers rekenen een wedstrijd zonder doelpunt van ons als compleet, maar een wedstrijd die we met 0–2 verloren heeft hier wel minuten nodig, want de tegendoelpunten zijn de helft van de kaart.
  - De kaart telt de competitie en de beker samen.
  - Zonder één doelpunt met een minuut staat er een zin in plaats van de diagrammen.
    De zin zegt dat we nog geen doelpunten met een minuut hebben, en vraagt de lezer later terug te komen.
  - De diagrammen zijn verborgen voor hulpsoftware en de tabel is het tekstalternatief, met een bijschrift dat alleen een schermlezer krijgt.
    De diagrammen zelf zijn `DonutChart` (zie _Een donutdiagram is een eigen onderdeel in SVG, met een positieve en een negatieve kleur_).
  - De kop heeft het anker `doelpunten-per-kwartier`, dat in `src/anchors.ts` staat.
- **Later:** zie _Late doelpunten en doelpunten in blessuretijd staan onder Doelpunten per kwartier_ in `site.md` (6 november 2026): twee regels onder de tabel tellen de blessuretijd en de verlenging wel, en de zin over de verlenging zegt dat.
- **Aangevuld op 26 oktober 2026, op verzoek van de projecteigenaar:** de zin "Doelpunten in de verlenging tellen niet mee." staat er alleen als ze iets zegt.
  `goalsPerQuarter` geeft daarvoor `extraTime`: waar als minstens één wedstrijd in de telling `extra_time` heeft.
  Een wedstrijd buiten de telling, zonder doelpunten of niet gespeeld, telt daarvoor niet mee.
- **Alternatieven:** één diagram met twee ringen (compact, maar moeilijker te lezen); staafjes in plaats van een taart (leesbaarder, maar de projecteigenaar vroeg om een taart); de verlenging als aparte plakken; de wedstrijden zonder bekende doelpunten meetellen met nul doelpunten (de telling lijkt dan completer dan ze is).
- **Later:** zie _Op /wedstrijden hebben de kaarten met cijfers een zacht en een warm vlak, en de uitslagen staan in de hoofdkolom_.
  De kaart staat in de zijbalk, na De nul gehouden, en heeft een warm vlak; de telling blijft.
- **Later:** zie _De site heeft vier onderdelen: Nieuws, Wedstrijden, Statistieken en Forum_ (31 oktober 2026): de kaart en zijn anker `doelpunten-per-kwartier` staan straks op `/statistieken`.

## De kaart heet Doelpuntenmakers, met het aantal spelers onder de kop

- **Datum:** 26 oktober 2026
- **Besluit:** de kaart "Topscorers" op `/wedstrijden` heet "Doelpuntenmakers", en het aantal spelers staat direct onder de kop, boven de tabel.
- **Waarom:** de kaart toont alle spelers die scoorden, niet alleen de beste, en "Topscorers" belooft een top.
  Het aantal onder de kop is dezelfde plek en stijl als bij "De nul gehouden", zodat de kaarten op elkaar lijken.
- **Hoe:** de kop heeft het anker `doelpuntenmakers`, dat in `src/anchors.ts` staat.
  Het oude anker `topscorers` blijft staan als oud anker (`aliases`) op de kop, zoals `nul-gehouden` bij de nul gehouden, en staat ook nog in `src/anchors.ts`, zodat de rooktest het blijft toetsen.
  De regel met het aantal is gewone tekst en geen kleine tekst (`meta`) meer, net als bij de nul gehouden.
  Het bijschrift van de tabel zegt "Doelpuntenmakers van sc Heerenveen in het seizoen …".
  De namen in de code (`TopScorers`, `topScorersOf`, `TopScorersTable`) blijven, omdat bezoekers ze niet zien.
- **Alternatieven:** "Topscorers" houden (kort en bekend, maar niet meer waar); "Wie scoorde" (dichter bij de spreektaal, maar minder netjes als kop).
- **Later:** zie _De site heeft vier onderdelen: Nieuws, Wedstrijden, Statistieken en Forum_ (31 oktober 2026): de kaart en zijn ankers `doelpuntenmakers` en `topscorers` staan straks op `/statistieken`.
- **Later:** zie _Statistieken toont de top 5 van de doelpuntenmakers, en de volledige lijst staat op Spelers_ (31 oktober 2026): de kaart staat met zijn ankers op `/statistieken` als top 5 en op `/statistieken/spelers` met alle spelers.

## De scheiding in een ring is een lichte omlijning, in licht en in donker

- **Datum:** 27 oktober 2026
- **Besluit:** de lijn tussen de plakken van een ring is wit in licht en `blue-50` in donker, en heeft een eigen rol in `colour.css`: `--hf-colour-border-chart-slice`, met een waarde voor licht en voor donker via `light-dark()`.
  Ze is een omlijning van de plakken, geen gat in de kleur van het vlak.
- **Waarom:** een doorzichtige lijn tekent niets en scheidt de plakken niet, en de plakken zijn zelf deels doorzichtig.
  De witte lijn op het warme vlak ziet er goed uit (gezien op een scherm door de projecteigenaar).
  In donker was de lijn de kleur van het blauwe vlak en zag er vreemd uit; een lichte lijn volgt hetzelfde beeld als in licht.
  In donker is het `blue-50` en niet puur wit, omdat dat de kleur van de koppen en van het totaal in de ring is: de lijn is dan even licht als de tekst, zonder harder wit.
  In donker heeft de lijn 14,5:1 tegen het vlak van de kaart, 1,7:1 (groen) en 1,9:1 (rood) tegen de volle plak, en 3,0:1 en 3,3:1 tegen de zwakste plak.
- **Hoe:** `.hf-donut-chart-slice` gebruikt de nieuwe rol als `stroke`, en niet meer `--hf-colour-background-surface`.
  In forced colors blijft de lijn `Canvas`.
  De story van `DonutChart` toont de ring op het witte, het zachte en het warme vlak, in licht en in donker; de test van `donut-chart-css.test.ts` eist de nieuwe rol en weigert een kleur van een vlak.
  De zwakste plak (70% van de kleur) haalt 3:1 tegen het warme vlak: in licht 3,05:1 (groen) en 3,75:1 (rood), in donker 4,02:1 en 3,68:1.
  Het verschil met het witte vlak is klein: in licht 3,39:1 en 4,22:1, in donker 4,81:1 en 4,43:1.
- **Alternatieven:** een doorzichtige lijn; die scheidt de plakken niet.
  De kleur van de kaart doorgeven aan de ring met een custom property; dan is de lijn in donker donker, wat de projecteigenaar vreemd vond.
  Een echte opening in de vorm van de ring; die is ingewikkelder (een gelijke breedte over de straal) en heeft nu geen voordeel.
  Puur wit in donker (harder dan de tekst eromheen).

## Op /wedstrijden hebben de kaarten met cijfers een zacht en een warm vlak, en de uitslagen staan in de hoofdkolom

- **Datum:** 27 oktober 2026
- **Besluit:** op `/wedstrijden` hebben Stand, Doelpuntenmakers en De nul gehouden een zacht vlak (`surface="soft"`) en Doelpunten per kwartier een warm vlak (`surface="warm"`); Programma en Uitslagen blijven wit.
  Uitslagen en Doelpunten per kwartier wisselen van plaats: de uitslagen staan in de hoofdkolom na het programma, en de kaart met de ringen in de zijbalk na De nul gehouden en voor de bronvermelding.
  Op een telefoon is de volgorde dan Programma, Uitslagen, Stand, Doelpuntenmakers, De nul gehouden en Doelpunten per kwartier.
  De homepage verandert niet.
- **Waarom:** bijna alle kaarten waren wit, en de projecteigenaar wil dat de kaarten met cijfers meer opvallen en elkaar onderscheiden.
  De kaarten met cijfers horen bij elkaar, dus ze staan nu bij elkaar in de zijbalk, en de lijst met uitslagen staat bij het programma, de andere lijst met wedstrijden.
  Op de homepage zijn de prioriteiten anders, dus `StandingsCard` blijft zoals hij is.
- **Hoe:** de ankers (`#uitslagen`, `#doelpunten-per-kwartier`) blijven, en de zijbalk heet nu "De stand, de ranglijsten en de doelpunten per kwartier".
- **Alternatieven:** alle kaarten wit laten (de cijfers vallen dan niet op); de homepage dezelfde vlakken geven (de projecteigenaar wil die niet veranderen).
- **Later:** zie _Het verloop van het seizoen staat onder de stand, in een warme kaart_.
  Er staat nu een kaart tussen Stand en Doelpuntenmakers, en op een telefoon is de volgorde Programma, Uitslagen, Stand, Verloop van het seizoen, Doelpuntenmakers, De nul gehouden en Doelpunten per kwartier.
- **Later:** zie _Reeksen staan in een eigen kaart na Verloop van het seizoen_.
  Op een telefoon staat Reeksen nu tussen Verloop van het seizoen en Doelpuntenmakers, in het zachte vlak.
- **Later:** zie _Thuis en uit staan naast elkaar in een tabel, met een kolom Totaal_.
  Thuis en uit staat nu na Reeksen en voor Doelpuntenmakers, in het warme vlak.
- **Later:** zie _De site heeft vier onderdelen: Nieuws, Wedstrijden, Statistieken en Forum_ (31 oktober 2026): de kaarten met cijfers verhuizen naar `/statistieken`, en hun vlakken gaan mee.
  De Stand blijft op `/wedstrijden`.

## Het verloop van het seizoen staat onder de stand, in een warme kaart

- **Datum:** 28 oktober 2026
- **Besluit:** `/wedstrijden` krijgt in de zijbalk direct onder Stand de kaart "Verloop van het seizoen", in het warme vlak, met de grafiek en de tabel van de Eredivisie.
  De bekerwedstrijden tellen niet mee.
- **Waarom:** de grafiek ligt qua inhoud het dichtst bij de stand, en de uitslagen komen uit dezelfde gegevens.
  Een warm vlak onder de zachte stand scheidt de twee.
  De Eredivisie heeft 34 wedstrijden die de grafiek vullen, een beker niet.
- **Alternatieven:** boven Doelpunten per kwartier in het zachte vlak (twee warme kaarten bij elkaar); op de homepage (de prioriteiten zijn daar anders); de bekerwedstrijden erbij (de plekken zijn dan niet meer de 34 van het seizoen).
- **Later:** zie _De plek in de competitie komt uit de stand, in punten per wedstrijd, zonder grenslijnen_.
  Er staat nu een kaart tussen Stand en Verloop van het seizoen: Onze plek in de competitie.

## De staafjes staan op volgorde van speeldatum, niet van speelronde

- **Datum:** 28 oktober 2026
- **Besluit:** de wedstrijden staan in de grafiek op volgorde van speeldatum.
  Een uitgestelde wedstrijd die nog niet gespeeld is, heeft geen staafje, en de wedstrijden erna schuiven een plek op tot hij gespeeld is.
- **Waarom:** de component krijgt een lijst van gespeelde uitslagen en tekent ze naast elkaar.
  De lijn is het gemiddelde over de laatste vijf wedstrijden die gespeeld zijn, en dat volgt de volgorde van het spelen.
- **Alternatieven:** een lege plek op de plaats van de speelronde van een uitgestelde wedstrijd (vraagt een lijst met gaten in de component en laat de lijn een gat zien).

## De plek in de competitie komt uit de stand, in punten per wedstrijd, zonder grenslijnen

- **Datum:** 29 oktober 2026
- **Besluit:** de kaart "Onze plek in de competitie" staat direct na de stand en geeft de plaats van sc Heerenveen in vijf onderdelen, met gedeelde plaatsen als "gedeeld".
  De vijf onderdelen zijn punten per wedstrijd, gewonnen wedstrijden, doelpunten voor (de beste aanval), doelpunten tegen (de beste verdediging, minder is beter) en doelsaldo.
  De punten achter de koploper en voor op de laatste staan in een zin.
  Er zijn geen lijnen voor Europa of degradatie.
  De kaart volgt de regels van _Statistieken komen als kaarten op Wedstrijden, voor de Eredivisie, met "Gebaseerd op"_ (#397).
- **Waarom:** de stand heeft de gegevens, dus de import verandert niet.
  Punten per wedstrijd vergelijkt clubs die niet evenveel hebben gespeeld.
  De lijnen voor Europa en degradatie veranderen per seizoen en zijn een mening over wat er komt.
- **Hoe:** `leaguePlaceOf` in `apps/site/src/matches.ts` rekent de plaatsen uit.
  Twee clubs zijn gelijk op punten per wedstrijd als hun punten en wedstrijden in dezelfde verhouding staan, zonder afronding.
  Een club die nog niets heeft gespeeld telt niet mee, ook niet als koploper of laatste.
  De koploper en de laatste zijn de clubs met de meeste en de minste punten, en de plaats in de stand beslist bij gelijke punten.
  De link in de balk "Op deze pagina:" heet "Plek in de competitie": met "Onze plek in de competitie" past hij op een telefoon van 390 pixels niet tussen de twee vervagingen van de balk.
  Het vlak van de kaart is wit: Stand heeft het zachte vlak en Verloop van het seizoen het warme, dus een zacht of warm vlak had dezelfde kleur als een buurkaart.
- **Alternatieven:** de plaatsen als extra kolommen in de stand (de stand wordt breed op een telefoon).
  De lijnen wel tonen (de projecteigenaar wil nu geen voorspellingen, zie #418).
  Een zacht of warm vlak (dezelfde kleur als een buurkaart).
- **Later:** zie _De vier vlakken van een kaart hebben een betekenis, en elke kaart volgt de eerste regel die past_ (1 november 2026): de kaart blijft wit, maar de reden is nu de regel dat het overzicht van ons seizoen wit is, en niet meer dat de buurkaarten zacht en warm zijn.

## Tiptap is de teksteditor voor de artikelen van de redactie

- **Datum:** 27 oktober 2026
- **Besluit:** Tiptap is de teksteditor voor de artikelen van de redactie, als component van het designsysteem met alleen de opmaak die een artikel nu heeft.
- **Waarom:** wie een artikel schrijft, hoeft geen opmaaktekens te kennen.
  Tiptap is open (MIT), onderhouden en heeft een kleine kern; de opmaak blijft klein omdat we alleen laden wat we gebruiken.
- **Alternatieven:** de textarea met eigen opmaak houden (de schrijver moet de tekens leren kennen); een andere editor zoals Lexical of Slate (meer werk om toegankelijk te maken); `contenteditable` zelf bouwen (veel werk en veel fouten).
- **Later:** zie _De tekst van een artikel wordt bewaard als Tiptap's JSON, met een lijst van wat mag_ (27 oktober 2026): de editor staat in het formulier van `/beheer/artikelen` (#359).

## De afbeelding van een kaart wordt in de browser gemaakt, met een bibliotheek die pas bij een klik laadt

- **Datum:** 28 oktober 2026
- **Besluit:** een kaart met de knop maakt zijn PNG in de browser van de bezoeker, met een kleine bibliotheek met een vrije licentie die pas bij de eerste klik wordt geladen (`import()`).
  Er gaat niets naar een server en niets naar een ander domein.
- **Waarom:** zo uploaden we niets en volgen we niemand, en de afbeelding is de kaart zoals de bezoeker hem ziet, in zijn thema.
  Een server zou hem opnieuw moeten tekenen, en een gedeelde hosting heeft geen browser om een pagina te fotograferen.
  Dynamisch laden houdt elke pagina even snel.
- **Alternatieven:** de kaart op de server opnieuw tekenen met `ImageResponse` (een tweede ontwerp per kaart, met minder CSS).
  Alles zelf op een canvas tekenen (de tabel, de donut en de staafjes opnieuw in code).
  Een dienst van een derde partij (we sturen dan gegevens weg).

## De bibliotheek is `modern-screenshot`, niet `html-to-image`

- **Datum:** 28 oktober 2026
- **Besluit:** de afbeelding wordt gemaakt met `modern-screenshot` 4.7.0 (MIT, geen dependencies, geen installatiescript dat meeloopt), zonder web worker.
- **Waarom:** we probeerden eerst `html-to-image` 1.11.13.
  Die zet de berekende stijlen niet op de onderdelen van een `svg`, dus de plakken van de donut kwamen er zwart op, zonder scheidingslijn.
  `modern-screenshot` tekent de donut, de staafjes, de kleuren (`light-dark()` en `color-mix()`), de lettertypes en het donkere thema goed.
  Hij is groter dan `html-to-image`, maar laadt pas bij een klik.
- **Alternatieven:** `html-to-image` (de donut klopt niet); `dom-to-image-more` (niet geprobeerd: bijna 1 MB uitgepakt); de donut als losse afbeelding tekenen (een omweg die de eigenaar zou moeten kiezen).

## De afbeelding volgt het thema van de bezoeker en draagt de bron mee

- **Datum:** 28 oktober 2026
- **Besluit:** de afbeelding heeft het thema dat de bezoeker nu heeft.
  De kaart is er 29 rem breed, een breedte die in de zijbalk van een breed scherm past, met een rand van 1,5 rem eromheen: de afbeelding is 32 rem breed, 1024 pixels op dubbele resolutie.
  Eronder staan het logo, het adres, de datum en de bronvermelding van de kaart.
  De datum staat als dd-mm-jj met nullen ervoor (`28-10-26`) en de bron als "Gegevens van Wikipedia", op verzoek van de projecteigenaar.
  Alleen de vijf kaarten met statistiek op `/wedstrijden` hebben de knop.
- **Waarom:** de bezoeker kiest zijn thema, en de afbeelding is zijn kaart.
  De vermelding van Wikipedia (CC BY-SA) moet meegaan zodra de gegevens het huis uit gaan.
  De nieuwskaarten bevatten werk van journalisten, en een afbeelding ervan gaat rond zonder de link naar hun werk.
  Een korte datum houdt de strook klein.
- **Alternatieven:** de datum voluit, "28 oktober 2026" (past minder goed in de strook, en de projecteigenaar koos de korte vorm).
  Altijd licht (dezelfde kaart ziet er voor elke deler hetzelfde uit, maar bezoekers in donker krijgen een andere kaart dan ze zien).
  Alleen logo en adres (de vermelding gaat dan niet mee).
  Alle kaarten van `/wedstrijden`.
- **Later:** de datum in de strook staat met de afgekorte maand en het jaar met vier cijfers, zoals "28 okt 2026", en niet meer als dd-mm-jj (29 oktober 2026).
  Zie _Een publicatiedatum van meer dan een week oud is de korte dag en de datum, zonder tijd_.

## Delen waar het kan, anders downloaden

- **Datum:** 28 oktober 2026
- **Besluit:** de knop opent het deelmenu van het apparaat als de browser bestanden kan delen (`navigator.canShare`), en downloadt anders de PNG.
  Kopiëren naar het klembord komt er niet.
  Vraagt de browser om een nieuwe tik voor het deelmenu, omdat het maken te lang duurde, dan downloadt hij ook.
- **Waarom:** op een telefoon wil de bezoeker de afbeelding naar een app sturen, en op een computer wil hij een bestand.
  Het klembord kent minder browsers en laat niets over om later terug te vinden.
- **Alternatieven:** altijd downloaden (op een telefoon staat de afbeelding dan in de bestanden, niet in het deelmenu).
  Het klembord.

## De knop komt van een eigenschap van `Card`, `shareable`, en staat er alleen met JavaScript

- **Datum:** 28 oktober 2026
- **Besluit:** `Card` heeft de optionele eigenschap `shareable={{ source }}`.
  `source` is de bronvermelding die onder de afbeelding komt, en is verplicht zodra de eigenschap er is.
  De knop krijgt zijn naam van de eerste kop van de kaart ("Maak een afbeelding van Stand") en staat in de code direct na die kop.
  De kaart doet pas na het laden in de browser mee: zonder JavaScript is er geen knop, en de kop houdt ruimte vrij zodat de pagina niet verspringt.
  Een pagina geeft de eigenschap niet mee als de kaart nog geen gegevens heeft.
- **Waarom:** een object dwingt af dat een kaart met een knop ook zijn bron noemt (principe 4 van de Redactie).
  De naam uit de kop houdt de tekst op één plek.
  Een knop zonder JavaScript doet niets, en een knop die er pas na het laden staat verschuift de kop niet.
- **Alternatieven:** een boolean `shareable` met de bron als aparte eigenschap (een kaart kan dan zonder bron delen); een aparte component `ShareButton` die de pagina zelf in de kaart zet (de pagina moet dan zelf de kaart vinden en kiezen waar de knop komt).

## Statistieken komen als kaarten op Wedstrijden, voor de Eredivisie, met "Gebaseerd op"

- **Datum:** 29 oktober 2026
- **Besluit:** nieuwe statistieken komen als kaart in de zijbalk van `/wedstrijden`.
  Een kaart telt alleen de Eredivisie, tenzij hij over de beker gaat.
  Een kaart blijft zichtbaar bij weinig wedstrijden en zegt waarop hij is gebaseerd.
  Voorspellingen en lijnen voor Europa of degradatie komen er niet in.
- **Waarom:** de pagina heeft al zeven kaarten en de navigatie is voorbereid op een splitsing in subpagina's, dus nu extra kaarten bouwen kost later weinig werk.
  Een regel voor de competitie maakt de cijfers vergelijkbaar, en een schakelaar volgt (#406).
  Vroeg in het seizoen zijn de aantallen klein, maar de zin "Gebaseerd op" zegt dat eerlijk.
  Een voorspelling is een mening, geen feit uit de bron.
- **Gevolg:** de bestaande kaarten Doelpuntenmakers, De nul gehouden en Doelpunten per kwartier tellen de beker nog mee, tot de schakelaar van #406 er is.
  De zin "Gebaseerd op" komt uit één stukje code, `BasedOn` in `MatchViews.tsx`.
- **Alternatieven:** een eigen pagina of tabbladen voor de statistieken (komt met #363).
  De beker meetellen (de bestaande kaarten verschillen al, één regel is duidelijker).
  Een statistiek verbergen tot er genoeg wedstrijden zijn (de pagina is dan lang leeg).
- **Later:** zie _De site heeft vier onderdelen: Nieuws, Wedstrijden, Statistieken en Forum_ (31 oktober 2026): nieuwe statistieken komen als kaart op `/statistieken` en niet op `/wedstrijden`.
  De regels voor de Eredivisie en voor "Gebaseerd op" blijven.
- **Later:** zie _De statistieken tellen standaard alle wedstrijden, met een schakelaar naar alleen de Eredivisie_ (31 oktober 2026): de regel "een kaart telt alleen de Eredivisie, tenzij hij over de beker gaat" is vervallen.
  De kaarten tellen standaard de Eredivisie en de KNVB Beker, en de schakelaar kiest alleen de Eredivisie; drie kaarten blijven de Eredivisie.
  Het gevolg dat de bestaande kaarten de beker meetellen "tot de schakelaar van #406 er is" is daarmee opgelost.
- **Later:** zie _De kaart Gemiddeld resultaat toont de top 10 van clubs met minstens 5 wedstrijden en volgt de schakelaar_ (4 november 2026): die kaart telt in "Gebaseerd op" alleen de wedstrijden van de clubs die meedoen.
- **Later:** zie _De kaart "Hoe vaak welke uitslag" toont de aantallen in de tabelkoppen, de competities in een tabel en de doelpunten in een diagram_ (4 november 2026) in `site.md`: die kaart zegt het aantal wedstrijden zonder "Gebaseerd op" en zonder "sinds"; de regel voor de andere kaarten blijft tot #494.
- **Later:** zie _De zin onder een kaart met cijfers zegt alleen waarop de telling rust_ (9 november 2026): de zin heet niet meer "Gebaseerd op …".
  Het voorvoegsel is weg, de vaste plek in de kaart blijft.
- **Later:** zie _De pagina van een club heeft een kaart met doelpuntenmakers, vanaf 5 wedstrijden_ (4 november 2026): de regel "een kaart blijft zichtbaar bij weinig wedstrijden" geldt niet voor die kaart; die is er pas bij minstens 5 wedstrijden tegen de club.

## Reeksen staan in een eigen kaart na Verloop van het seizoen

- **Datum:** 29 oktober 2026
- **Besluit:** de reeksen en de laatste vijf wedstrijden staan in een eigen kaart "Reeksen", direct na Verloop van het seizoen, in het zachte vlak.
  Er zijn zes reeksen, elk met de lengte van nu en de langste.
  Ze komen uit de score van de gespeelde wedstrijden van de Eredivisie.
  De laatste vijf wedstrijden staan met de oudste eerst, als letters (`MarkRow`) en als korte regels met de tegenstander en de uitslag (`ShortMatch`).
- **Waarom:** de reeksen gebruiken dezelfde uitslagen als Verloop van het seizoen, dus ze staan er het best naast.
  Een eigen kaart houdt Verloop van het seizoen kort.
  Een score is er voor elke gespeelde wedstrijd, dus de reeksen hebben geen last van wedstrijden zonder bekende doelpunten.
  De oudste eerst is de volgorde van de vorm in de kaart erboven, en de letters en de regels staan zo in dezelfde volgorde.
  Het zachte vlak laat de volgende kaart (Thuis en uit, #399) warm worden, zodat de kaarten daarna om en om wisselen.
- **Alternatieven:** de reeksen in de kaart Verloop van het seizoen zetten (een lange kaart met twee onderwerpen).
  Alleen de laatste vijf wedstrijden tonen (geen reeksen, en die zoeken supporters juist).
  De nieuwste eerst (past bij Uitslagen en De nul gehouden, maar dan loopt de volgorde tegen die van de letters in).
  Een warm vlak (komt naast Verloop van het seizoen, dat al warm is).
- **Later:** zie _Een uitslag van één wedstrijd staat met de thuisclub eerst, ook in `ShortMatch`_ (2 november 2026): de korte regels noemen sindsdien beide clubs, met de thuisclub en zijn doelpunten eerst, en niet meer de tegenstander met de uitslag vanuit onze kant.
- **Later:** een eerder seizoen toont alleen de langste reeksen, zonder de lengte van nu en zonder de laatste vijf wedstrijden, zie _Een eerder seizoen toont bij de reeksen alleen de langste_ (30 oktober 2026).
- **Later:** zie _De vier vlakken van een kaart hebben een betekenis, en elke kaart volgt de eerste regel die past_ (1 november 2026): de reden dat het zachte vlak de volgende kaart warm laat worden, zodat de kaarten om en om wisselen, vervalt.
  Reeksen blijft zacht, omdat het een lijst is die bij de hoofdinhoud hoort.

## De toon en de schrijfwijzer staan in het hoofdstuk Redactie

- **Datum:** 29 oktober 2026
- **Besluit:** het hoofdstuk Redactie van Storybook heeft drie nieuwe delen in plaats van de lijst "Nog te schrijven": _Toon_ (met _Fries_), _Schrijfwijzer_ en _Bronnen en tijden_.
  `CONTRIBUTING.md` wijst naar dat hoofdstuk, en de checklist voor de reviewer heeft een punt voor de toon en een voor de schrijfwijzer.
- **Waarom:** de toon en de schrijfwijzer horen bij wat we over de redactie zeggen, en Storybook is het handboek voor wie schrijft.
  De delen schrijven op wat de site al doet (de besluiten over tijden, namen en bronnen), zodat een nieuwe pagina dezelfde vormen gebruikt.
  Een stijlgids in een eigen bestand zou een tweede plek zijn naast de principes.
- **Alternatieven:** een eigen stijlgids in `docs/`; dan staan de redactieregels op twee plekken.
  Of de toon in `CONTRIBUTING.md`; dat is voor wie meewerkt aan de code, niet voor wie voor bezoekers schrijft.

## Fries voor namen en een knipoog, nooit in wat een bezoeker nodig heeft

- **Datum:** 29 oktober 2026
- **Besluit:** we gebruiken Fries voor namen en een enkele knipoog (Pronkkeamer, It Hearrenfean) en voor koppen van Friese bronnen, die we laten zoals ze zijn gepubliceerd.
  Menu's, knoppen, formulieren, meldingen en uitleg zijn Nederlands.
  De site wordt niet tweetalig.
- **Waarom:** Fries past bij een club uit Friesland en geeft de site smaak.
  Een bezoeker die geen Fries kent, mag er niet op vastlopen.
  Een tweede taal voor de hele site kost bij elke tekst werk, en geen issue vraagt erom.
- **Alternatieven:** helemaal geen Fries; dat laat een deel van de club weg.
  Of Fries voor de hele site, of een keuze van taal; dat is groot en nu niet gevraagd.
- **Let op:** dit is een voorstel van de Builder bij #343, bedoeld voor de projecteigenaar om te corrigeren; het issue noemt alleen "wanneer we Fries gebruiken".

## Vóór een kop staat "wo 14:05" of "14 okt 14:05", en niet "wo 01/09"

- **Datum:** 29 oktober 2026
- **Besluit:** de schrijfwijzer noemt als korte datum vóór een kop de vormen die de site al heeft: de korte weekdag en de tijd binnen zeven dagen ("wo 14:05"), en de datum met een afgekorte maand en de tijd daarna ("14 okt 14:05").
  De schrijfwijze van de oude fansite, "wo 01/09", nemen we niet over.
- **Waarom:** de site schrijft dit sinds _De tijd van een bericht: een weekdag in de week, daarna de datum_ (24 oktober 2026), en de schrijfwijzer zegt wat is.
  Twee getallen met een schuine streep zeggen niet meteen welk de dag is en welk de maand, en de tijd is voor een nieuwsbericht meer waard dan het jaar.
- **Alternatieven:** "wo 01/09", zoals de oude fansite en het issue het noemen; dan moet de site anders gaan schrijven, wat dit issue niet vraagt.
  Of de datum voluit voor elke regel; dat is langer en past niet in de kolom.
- **Later:** de datum na een week is de korte weekdag en de datum, zonder tijd, zoals "wo 21 okt" (29 oktober 2026).
  Daarmee ligt de vorm dicht bij die van de oude fansite, die de weekdag en de datum ook samen schreef.
  Zie _Een publicatiedatum van meer dan een week oud is de korte dag en de datum, zonder tijd_.

## Geen "vandaag", "gisteren" of "2 uur geleden" in een lijst of in een tekst die blijft staan

- **Datum:** 29 oktober 2026
- **Besluit:** in een lijst met berichten staat de dag of de datum en de tijd, en nooit een woord als "vandaag", "gisteren" of "2 uur geleden".
  In een tekst die blijft staan, zoals een artikel, staat de datum voluit.
  Eén uitzondering volgt uit _De tijd van een discussie: vandaag alleen de tijd, daarna de dag, na een week de datum_: in de smalle zijbalk staat van vandaag alleen de tijd.
- **Waarom:** een pagina uit de cache en een tekst van vorig jaar kloppen niet meer met zo'n woord, en een vaste tijd blijft kloppen.
  Dit schrijft de bestaande besluiten op (22 en 24 oktober 2026) en verandert niets aan de site.
- **Alternatieven:** "vandaag" en "gisteren" in de lijst; dat is vriendelijker, maar klopt niet in een pagina uit de cache.
- **Hetzelfde bericht op meer plekken:** een bericht staat op elke plek met dezelfde kop, link, bronnaam en tijd.
  Schrijven twee bronnen over hetzelfde nieuws, dan zijn het twee berichten, die we niet samenvoegen.
  Zo noemt elk bericht zijn eigen bron (principe 4).

## Thuis en uit staan naast elkaar in een tabel, met een kolom Totaal

- **Datum:** 29 oktober 2026
- **Besluit:** de kaart "Thuis en uit" toont een tabel met drie kolommen, Thuis, Uit en Totaal, met de punten, de doelpunten en de punten per wedstrijd.
  Alles komt uit de score van de gespeelde wedstrijden van de Eredivisie, volgens de regels van _Statistieken komen als kaarten op Wedstrijden, voor de Eredivisie, met "Gebaseerd op"_.
- **Waarom:** twee reeksen naast elkaar vragen een nieuw component, en een tabel is voor iedereen te lezen, ook zonder het oog.
  De kolom Totaal laat zien dat de kaart klopt met Verloop van het seizoen.
- **Hoe:** de kaart staat direct na Reeksen, in het warme vlak, zodat de buurkaarten niet dezelfde kleur hebben.
  Een kant zonder gespeelde wedstrijd toont een streepje bij de gemiddelden en 0 bij de tellingen.
  De rij met de wedstrijden zonder tegendoelpunt heet "Zonder tegendoelpunt", zodat ze niet lijkt op de kaart De nul gehouden, die ook de beker telt.
- **Alternatieven:** een grafiek met twee staven per onderdeel (een nieuw component voor één kaart).
  Alleen de punten tonen (de doelpunten zeggen veel over de manier van spelen).
- **Later:** zie _De vier vlakken van een kaart hebben een betekenis, en elke kaart volgt de eerste regel die past_ (1 november 2026): de kaart is wit en niet meer warm.
  De reden "zodat de buurkaarten niet dezelfde kleur hebben" vervalt: Thuis en uit hoort bij het overzicht van ons seizoen, naast Onze plek in de competitie.

## Het eerste doelpunt en de stand bij de rust komen uit de doelpunten op minuut, met een regel voor gelijke minuten

- **Datum:** 29 oktober 2026
- **Besluit:** de kaart "Hoe de wedstrijden verlopen" telt de uitslagen na het eerste doelpunt en na de stand bij de rust, voor de gespeelde wedstrijden van de Eredivisie met bekende doelpunten.
  De doelpunten staan op minuut en toegevoegde tijd; twee doelpunten in dezelfde minuut laten het eerste doelpunt onbekend.
  De rust telt tot en met de toegevoegde tijd van de eerste helft.
- **Waarom:** de volgorde in de gegevens is die van de Wikipedia-pagina en niet altijd die van het spelen, dus de volgorde moet uit de minuut komen.
  Liever zeggen dat het onbekend is dan raden wie het eerst scoorde.
  De rust is het gewone moment om de stand te noemen.
- **Hoe:** `matchFlowOf` in `src/matches.ts` sorteert de doelpunten van elke wedstrijd op minuut en toegevoegde tijd, dus 45 komt voor 45+1.
  - Het eerste doelpunt is onbekend als beide clubs scoren in de eerste minuut met een doelpunt.
    Twee doelpunten van één club in die minuut maken het niet onbekend.
    Zo'n wedstrijd telt niet bij het eerste doelpunt, wel bij de rust, en onder de kaart staat hoeveel wedstrijden het zijn.
  - Een 0–0 heeft geen eerste doelpunt en staat bij de rust op "Gelijk".
  - Bij de rust telt een doelpunt in minuut 45 of in de toegevoegde tijd daarvan, en een doelpunt vanaf minuut 46 niet.
  - Een wedstrijd telt als gewonnen na een achterstand, of als zonder winst na een voorsprong, als de stand na een volle minuut dat zegt.
    Hangt het van de volgorde binnen een minuut af, dan telt hij niet mee, want we raden niet.
    De twee zinnen onder de tabellen kunnen dus een wedstrijd missen, maar nooit een te veel tellen.
  - De kolommen zijn afkortingen: G gespeeld, W winst, GL gelijk, V verlies en P punten, met een regel onder de tabellen die ze uitlegt.
    Vijf kolommen met hele woorden zijn 434 pixels breed: breder dan een telefoon, en breder dan de zijbalk bij 900 pixels (362 pixels), zodat de pagina opzij scrolt.
    Met afkortingen zijn ze 246 pixels breed en past de pagina bij 320 pixels.
    Een schermlezer hoort het hele woord ("gespeeld", "winst", …), zoals bij de stand.
    `DataTable` kan daarvoor een kolom als `{ abbreviation, name }` krijgen.
  - De uitslag is de score, want de Eredivisie kent geen verlenging.
  - De wedstrijden komen uit dezelfde regel als `goalsPerQuarter`: een uitslag met minstens één doelpunt, of een 0–0.
    De beker telt niet mee; zie _Statistieken komen als kaarten op Wedstrijden, voor de Eredivisie, met "Gebaseerd op"_.
  - De kaart staat in de zijbalk na Doelpunten per kwartier, in het zachte vlak: de buurkaart is warm.
  - De zin "Gebaseerd op" komt van `BasedOn` in `src/MatchViews.tsx`, het gedeelde stukje code voor die zin.
- **Alternatieven:** de volgorde van de gegevens aanhouden (kan het verkeerde doelpunt als eerste kiezen).
  Bij gelijke minuten de thuisclub eerst nemen (een gok).
  Alleen wedstrijden met een volledig bekende volgorde tellen (te weinig wedstrijden).
  De kolommen "Wedstrijden", "Winst", "Gelijk", "Verlies" en "Punten" voluit laten staan (past niet, zie hierboven).
  De tabel een eigen scrollvlak geven (ook op een bureaublad scrolt de tabel dan, en een scrollvlak is een nieuw onderdeel).
  De tabel omdraaien, met de uitkomsten als rijen en de situaties als kolommen (past op 320 pixels ook niet).
- **Later:** zie _Een inleiding of toelichting bestaat alleen als ze iets toevoegt, en ze staat op een vaste plek_.
  De regel met de afkortingen staat onder de tabellen en onder de twee zinnen, direct boven "Gebaseerd op".
- **Later:** zie _Alle tabellen gebruiken één stel afkortingen voor hun kolommen_.
  De kolom gelijk heet nu G gelijk in plaats van GL.

## Een publicatiedatum van meer dan een week oud is de korte dag en de datum, zonder tijd

- **Datum:** 29 oktober 2026
- **Besluit:** een publicatiedatum van meer dan zeven dagen oud toont de korte dag en de datum, zonder tijd: "wo 21 okt", met het jaar bij een ander jaar: "di 14 okt 2025".
  Wat binnen de zeven dagen valt, blijft de korte dag en de tijd.
  Dit geldt voor het nieuws, de afleveringen, de discussies en de dag van een artikel in een lijst.
  Wedstrijden houden hun notatie en hun aanvangstijd.
  Het jaar heeft altijd vier cijfers, ook in de strook onder een kaart op een afbeelding ("28 okt 2026", zonder weekdag).
- **Waarom:** na een week is het uur van een bericht niet meer van belang, en de dag van de week zegt meer over wanneer het was dan de datum alleen.
  De oude fansite deed het zo.
  De reden om geen weekdag na een week te tonen was dat "wo" twee woensdagen kan zijn, maar met de datum erbij is dat niet meer dubbelzinnig.
- **Waarom vier cijfers:** "28 okt 26" is te lezen als een tijd of als twee dagnummers, en een apostrof ("’26") vraagt eigen code en een uitleg voor een schermlezer.
  Duidelijkheid gaat voor kortheid.
- **Hoe:** `news.ts` heeft één functie, `formatDayAndDate`, voor de korte dag en de datum; `formatNewsTime`, `formatEpisodeTime`, `formatDiscussionTime` en `formatArticleDay` gebruiken die.
  De kolom van `NewsItem` is 4,5 rem breed in plaats van 4 rem, want de breedste dag met datum, "ma 10 mei", is 68 pixels op de maat van Meta en de kolom van 4 rem is 64 pixels.
  Staat er een jaar bij, dan breekt de tekst na de datum en komt het jaar op een tweede regel.
  Het beheer van berichten gebruikt dezelfde functie, dus ook daar staat bij een oud bericht geen tijd meer.
  `formatVersionTime` en de lange datum van een artikel blijven zoals ze waren.
- **Alternatieven:** de datum en de tijd houden (de tijd is na een week ruis).
  Alleen de datum (zegt minder over wanneer het was).
  Een relatieve tijd als "3 weken geleden" (klopt niet meer in een pagina uit het geheugen en een schermlezer leest hem minder gemakkelijk).

## Een inleiding of toelichting bestaat alleen als ze iets toevoegt, en ze staat op een vaste plek

- **Datum:** 29 oktober 2026
- **Besluit:** een inleiding onder de kop van een pagina en een uitleg onder de kop van een kaart bestaan alleen als de kop en de inhoud zonder haar niet genoeg zijn.
  Een legenda of toelichting staat onder wat ze uitlegt.
  De volgorde in een kaart is vast: kop, uitleg, inhoud, legenda, "Gebaseerd op", link, bron.
  De regels staan in het hoofdstuk Redactie van Storybook, onder _Inleidingen en toelichtingen_.
- **Waarom:** een vaste tekst die herhaalt wat er al staat, kost de bezoeker een regel lezen en het scherm een regel hoogte, vooral op een telefoon.
  Een vaste plek maakt de pagina's voorspelbaar, en een schermlezer leest ze in dezelfde volgorde.
- **Hoe:**
  - De inleiding van `/wedstrijden` en van Onze bronnen vervalt, want ze herhalen de kop en de namen van de kaarten.
    Onze bronnen houdt alleen de zin voor de lege plek.
  - De inleidingen van `/zoeken`, Contact en Over ons zijn korter, in één zin.
    De rest van de vaste teksten blijft, met een reden per tekst in de pull request (#435).
  - Zinnen die zeggen wat de telling buiten beschouwing laat, zoals "Doelpunten in de verlenging tellen niet mee.", staan direct na "Gebaseerd op".
    De regel met de afkortingen van Hoe de wedstrijden verlopen staat onder de tabellen én onder de twee zinnen, boven "Gebaseerd op".
  - Een grafiek heeft haar legenda eronder, en de tabel met dezelfde cijfers volgt daarna (Verloop van het seizoen).
  - Tests controleren de volgorde van de onderdelen van de kaarten op `/wedstrijden` en van de blokken op de homepage.
- **Alternatieven:** alle inleidingen houden en alleen inkorten (de herhaling blijft).
  Alle toelichtingen boven de inhoud zetten (de bezoeker leest uitleg voor hij de inhoud heeft gezien).
  Een regel per pagina in plaats van één regel voor allemaal (elke pagina kiest zelf, zoals nu).

## Een seizoen heeft een eigen adres, `/wedstrijden/2025-26`, en een kiezer die zonder JavaScript werkt

- **Datum:** 29 oktober 2026
- **Besluit:** het lopende seizoen staat op `/wedstrijden`, een ander seizoen op `/wedstrijden/JJJJ-JJ`.
  Een keuzelijst rechts naast de titel van de pagina kiest het seizoen; met JavaScript verstuurt ze het formulier bij een keuze en verdwijnt de knop, zonder JavaScript blijft de knop "Toon" (een GET naar `/wedstrijden/kies`, die doorverwijst).
  De homepage blijft het lopende seizoen.
  Het lopende seizoen begint op 1 juli (zoals `seasonOf`).
  Eerdere seizoenen staan niet in de sitemap en de feeds.
- **Waarom:** een eigen adres per seizoen is te delen en te vinden, en een pad past bij de manier waarop de projecteigenaar de site opdeelt.
  Een keuzelijst schaalt naar de 36 seizoenen vanaf 1990 en werkt zonder JavaScript, zoals de rest van de site.
  De homepage is een nieuwspagina van nu, dus een oud seizoen hoort daar niet.
- **Verversen bij een keuze:** de projecteigenaar wil dat een keuze direct verstuurt.
  Dat is een wisseling van context (WCAG 3.2.2), dus de keuzelijst heeft een uitleg die een schermlezer voorleest, en een oplossing voor het toetsenbord.
- **Alternatieven:** een zoekopdracht (`?seizoen=`), die op elke pagina en bij de schakelaar van #406 werkt zonder omleidingen als #431 de pagina's verplaatst (de projecteigenaar koos het pad).
  Een rij met links (36 seizoenen passen niet).
  Een eigen pagina per seizoen met een lijst (een tik extra).

## Een eerder seizoen heeft geen Programma, een uur geheugen en een eigen canoniek adres

- **Datum:** 29 oktober 2026
- **Besluit:** de lijst met seizoenen heeft de seizoenen die wedstrijden in de database hebben, tot en met het lopende, het nieuwste bovenaan.
  Het lopende seizoen staat er altijd in, ook vóór zijn eerste wedstrijd, want de pagina van dat seizoen is `/wedstrijden` zelf.
  Heeft de lijst één seizoen, dan toont de pagina de kiezer niet: er valt niets te kiezen (de projecteigenaar, 29 oktober 2026).
  Een seizoen dat niet in de lijst staat, een seizoen in de toekomst en een adres dat niet de vorm `JJJJ-JJ` heeft (waarin het tweede getal bij het jaar past), geven "niet gevonden".
  Het lopende seizoen op zijn eigen adres (`/wedstrijden/2026-27`) verwijst door naar `/wedstrijden`, met een tijdelijke doorverwijzing, want vanaf 1 juli is dat seizoen een eigen adres.
  Een eerder seizoen heeft geen kaart Programma, want er valt niets meer te spelen, en de balk "Op deze pagina:" linkt er dan ook niet naar.
  De overige kaarten tonen hun gewone zin als ze voor dat seizoen niets hebben.
  De gegevens van een eerder seizoen blijven een uur in het geheugen, die van het lopende seizoen vijf minuten.
  De titel van de pagina noemt het seizoen ("Wedstrijden 2025/26"), een eerder seizoen heeft zijn eigen adres als canoniek adres, en alleen het lopende seizoen staat in de sitemap.
  De kop `h1` blijft "Wedstrijden", want de keuzelijst ernaast noemt het seizoen al en een kop met het jaar herhaalt haar (de projecteigenaar, 29 oktober 2026).
  Een bezoek aan een eerder seizoen telt als een bezoek aan `/wedstrijden`.
  De afbeelding van een kaart van een eerder seizoen noemt het seizoen onder de afbeelding ("Seizoen 2025/26") en in de naam van het bestand.
- **Waarom:** een afgelopen seizoen verandert niet meer, dus een uur geheugen is genoeg.
  De pagina vraagt eerst de lijst met seizoenen en daarna pas de gegevens, want het geheugen houdt een regel per gevraagd seizoen, en een bezoeker kan elk adres met de juiste vorm verzinnen.
  Een afbeelding die later wordt gedeeld, heeft geen adres meer bij zich, dus het seizoen staat erop.
  Een telling per seizoen zou een rij per adres met die vorm zijn, en het is dezelfde pagina.
- **Alternatieven:** het seizoen aan elk adres toevoegen ook voor het lopende seizoen (twee adressen voor één pagina).
  Een doorverwijzing met 308 (een browser bewaart die, en na 1 juli klopt hij niet meer).
  Een lege kaart Programma met een zin (de kaart zegt dan iets wat altijd waar is).

## Het toetsenbord kiest een seizoen met de pijltjes en bevestigt met Enter

- **Datum:** 29 oktober 2026
- **Besluit:** de `SeasonPicker` verstuurt het formulier zodra een seizoen is gekozen met de muis, een vinger of de open lijst, en wacht bij een keuze met een toets (de pijltjes, Home, End, Page up, Page down, een letter of cijfer) op Enter.
  Een keuze die niet is bevestigd, gaat terug naar het seizoen van de pagina zodra de lijst de focus verliest.
  Een regel zegt het vooraf, en de lijst noemt haar met `aria-describedby`.
  Er staat "De pagina wisselt direct van seizoen." en "Kies met de pijltjes en bevestig met Enter."
  Met JavaScript zijn die regel en het label "Seizoen" niet te zien (`hf-visually-hidden`), maar een schermlezer leest ze voor; de projecteigenaar wilde geen tekst om de lijst (29 oktober 2026).
  Zonder JavaScript staan het label en de knop "Toon" er wel, en de regel niet, want die knop is dan het antwoord.
- **Waarom:** een gesloten keuzelijst stuurt in sommige browsers `change` bij elke pijltoets.
  Dan verspringt de pagina bij de eerste pijl en komt een bezoeker met het toetsenbord nooit bij een seizoen verder weg.
  Op een Mac, bekeken in Chromium en WebKit, openen de pijltjes de lijst, en een letter of cijfer verandert de keuze zonder te versturen; Enter verstuurt dan.
  In de open lijst bevestigt Enter de keuze, dus daar werkt het zonder iets extra's.
- **Nadeel:** een bezoeker die met een toets kiest, moet Enter drukken, en een ziende bezoeker leest dat niet vooraf.
  De lijst naast de kop "Wedstrijden 2025/26" zegt zelf wat ze is, en Enter is wat een formulier altijd doet.
- **Alternatieven:** versturen bij het verlaten van het veld (de bezoeker verlaat het veld met Tab en de pagina verspringt, zonder dat hij dat vroeg).
  Alleen een knop "Toon" houden, ook met JavaScript (de projecteigenaar wil dat een keuze direct verstuurt).
  Een keuze met een pijl na een korte pauze versturen (een bezoeker met een motorische beperking haalt de pauze niet).

## De titelrij is `Page.Title`, en de kiezer is een onderdeel van het designsysteem

- **Datum:** 29 oktober 2026
- **Besluit:** `Page.Title` is een rij voor de kop van een pagina met één bediening ernaast, die aan het einde staat: rechts naast de kop, en onder de kop (nog steeds rechts) als ze er niet naast passen.
  Het einde is de rand van de hoofdkolom en niet van de pagina: de titelrij zit in `intro` van `Page.Main`, en de zijbalk begint eronder.
  `SeasonPicker` is een component van het designsysteem, met de adressen van een seizoen (`seasonAddress`, `seasonFromSlug`, `seasonChoices` en `pickedAddress` in `src/seasons.ts`) in de site.
  Een pagina met een ander basisadres, zoals `/statistieken` na #431, geeft die adressen aan het component en zet een route naast de pagina die `pickedAddress` aanroept.
- **Waarom:** de kiezer hoort bij elke pagina met een seizoen, en het formulier, de uitleg en het toetsenbord moeten overal gelijk werken.
  De titelrij is een indeling van de pagina en geen eigenschap van de kiezer, dus een andere bediening kan er ook staan.
- **Alternatieven:** de kiezer in de site laten, naast de kop (dan bouwt elke pagina hem opnieuw).
  Een eigenschap `actions` op `Page.Main` (de kop staat in `intro`, en een eigenschap erbij maakt twee manieren om dezelfde plek te vullen).

## Een eerder seizoen toont zijn uitslagen van oud naar nieuw, en zijn tabel heet Eindstand

- **Datum:** 29 oktober 2026
- **Besluit:** op de pagina van een afgelopen seizoen begint de kaart Uitslagen met de eerste wedstrijd en heet de kaart Stand "Eindstand".
  Het lopende seizoen houdt de nieuwste uitslag bovenaan en de naam Stand.
  De volgorde en de naam hangen af van het seizoen en niet van de pagina: `resultsOfSeason` in `src/matches.ts` en `standingsCardOf` in `src/matchShortcuts.ts`.
  De kop, het bijschrift voor een schermlezer, het label van de zijbalk, het anker en de link in de balk "Op deze pagina:" volgen de naam.
  Het anker van een eerder seizoen is `eindstand` en dat van het lopende seizoen blijft `stand`.
  De zin in de lege kaart en in de lege kaart "Onze plek in de competitie" zegt "de eindstand", en de beschrijving van de pagina ook.
  De zin "Gebaseerd op de stand na 34 wedstrijden" onder de kaart "Onze plek in de competitie" blijft, want ze telt de wedstrijden waarop de plek rust.
- **Waarom:** wie een afgelopen seizoen bekijkt, leest het van begin tot eind.
  De nieuwste uitslag bovenaan is voor het lopende seizoen bedoeld, waar het laatste nieuws het belangrijkst is.
  Een tabel van een afgelopen seizoen is de eindstand.
- **Alternatieven:** de volgorde laten zoals ze is (de lijst begint dan bij het einde van het seizoen).
  Een schakelaar voor de volgorde (meer bediening voor een kleine behoefte).
  Het anker `stand` houden voor alle seizoenen (de link in de balk en het anker zouden dan een andere naam hebben dan de kop).
- **Later:** zie _Een afgelopen seizoen toont zijn uitslagen in een kaart per competitie_ (2 november 2026): de kaart Uitslagen van een afgelopen seizoen is verdeeld in een kaart per competitie; de volgorde van oud naar nieuw geldt binnen elke kaart.
  Zie ook _Het lopende seizoen toont zijn uitslagen ook in een kaart per competitie_ (3 november 2026): het lopende seizoen heeft dezelfde kaarten, met de nieuwste uitslag bovenaan.

## Zonder koppeling is de naam van een doelpuntenmaker de titel van zijn Wikipedia-pagina

- **Datum:** 30 oktober 2026
- **Besluit:** een doelpunt zonder speler in `players` toont de titel van de Wikipedia-pagina van de speler, zonder toevoeging tussen haakjes, als zijn volledige naam.
  Zonder pagina blijft de korte naam van de wedstrijdpagina.
- **Waarom:** eerdere seizoenen hebben geen selectie en dus geen koppeling, maar de wedstrijdpagina linkt de speler wel.
  De titel van die pagina is de volledige naam, zonder dat we iets hoeven te raden.
- **Hoe:** `listSeasonMatches` geeft de titel mee als `playerPage`, uit dezelfde vraag.
  `pageTitleName` haalt de toevoeging weg ("Pim Verbeek (voetballer, 1999)" wordt "Pim Verbeek").
  `splitPageName` splitst de naam met de korte naam als zoekterm, na de beginletters die de wedstrijdpagina erbij kan zetten ("D. Rots").
  Past de korte naam niet achter de titel, dan staat de hele naam in het gewone gewicht.
  `topScorersOf` telt een doelpunt zonder speler op de titel van de pagina, dus twee spelers met dezelfde achternaam blijven twee rijen.
  Heeft een gekoppeld doelpunt dezelfde pagina, dan telt het doelpunt zonder speler voor die speler en toont het zijn naam uit `players`.
  De uitslagen houden de naam van de wedstrijdpagina.
- **Alternatieven:** de korte naam houden (geen voornaam, zoals voorheen).
  De selectie van elk seizoen importeren (kan niet als de pagina op Wikipedia ontbreekt).
- **Later:** sinds 5 november 2026 toont de site de naam die de import van de persoon bewaarde en raadt hij niets meer: `pageTitleName` en `splitPageName` zijn weg, en een doelpunt zonder persoon toont de naam van de wedstrijdpagina als achternaam; zie _De site telt per persoon en toont de bewaarde naam, en raadt niets_ in `site.md`.

## Een eerder seizoen toont bij de reeksen alleen de langste

- **Datum:** 30 oktober 2026
- **Besluit:** de kaart Reeksen van een afgelopen seizoen heeft geen kolom "Nu", alleen "Langste".
  Het lopende seizoen houdt beide.
  Het bijschrift en de zin zonder wedstrijden noemen in een afgelopen seizoen het seizoen ("in 2025/26") en niet "dit seizoen".
  Een afgelopen seizoen heeft ook geen blok met de laatste vijf wedstrijden (de letters en de korte regels): ze zijn aan het eind van een seizoen niet bijzonderder dan vijf andere.
  Het lopende seizoen houdt dat blok, met iets meer ruimte onder de rij met letters: een lijst direct onder een `MarkRow` begint een rem lager (`mark-row.css`), zoals een alinea, en niet een halve rem.
  De kaart weet het uit `season`, dat alleen een afgelopen seizoen heeft; `streaksOf` verandert niet.
- **Waarom:** de reeks waarmee een afgelopen seizoen eindigde verandert niet meer en zegt weinig.
  De langste reeks is wat de moeite waard blijft.
- **Alternatieven:** de laatste vijf wedstrijden in een afgelopen seizoen laten staan (ze zeggen over dat seizoen niets bijzonders).
  De kolom hernoemen naar "Aan het eind" (houdt een getal dat nauwelijks informatie geeft).
  De kolom laten staan (verwarrend: "Nu" in een seizoen van vorig jaar).
- **Later:** zie _Onderdelen en formulieren zetten geen verticale witruimte naar buiten_ in `designsysteem.md` (3 november 2026).
  De regel in `mark-row.css` voor een lijst direct onder een `MarkRow` is weg; de stroom zet de gemiddelde ruimte onder de rij, en dat is dezelfde ruimte.

## De staf staat in een tabel `staff` met een rol, en de hoofdtrainers zijn de eerste rijen

- **Datum:** 30 oktober 2026
- **Besluit:** de staf van sc Heerenveen staat in de tabel `staff`, met een rol per rij.
  De hoofdtrainers sinds 1 juli 1990 zijn de eerste rijen, met de rol `coach`, een begin en een einde en per datum de precisie (`day`, `month` of `year`).
  De rijen komen uit de seed, gevuld met wat Wikipedia geeft.
  Een vraag naar de trainer op een datum zegt dat het onzeker is als de datum in de onzekerheid van een grens valt.
- **Waarom:** Wikipedia geeft voor de recente trainers meestal een dag en voor de jaren negentig maanden of jaren.
  Een gok zou een wedstrijd bij de verkeerde trainer zetten.
  Met de precisie erbij kan een pagina eerlijk zijn over wat we weten.
  Een eigen tabel is eenvoudiger dan elke keer Wikipedia te lezen, want de lijst op Wikipedia heeft geen dagen en verandert zelden.
- **Een tabel met een rol:** assistent-trainers en andere functies hebben dezelfde vorm (naam, periode, precisie).
  Eén tabel met een rol voorkomt een nieuwe tabel per functie.
- **Alternatieven:** een tabel alleen voor hoofdtrainers (`coaches`; een nieuwe tabel voor elke volgende functie).
  De trainer per seizoen opslaan in plaats van per periode (kan niet bij twee trainers in één seizoen, of een wedstrijd).
  De trainer bij elke wedstrijd opslaan (veel dubbel werk, en onjuist als een datum verandert).
  De lijst van Wikipedia met de importer lezen (de lijst heeft geen dagen, en de pagina's van de trainers hebben een andere opbouw).
  Dagen verzinnen waar Wikipedia ze niet geeft (misleidend).

## Een maand of jaar telt als "ergens in", en een trainer staat alleen in een seizoen als hij er zeker een dag in dienst was

- **Datum:** 30 oktober 2026
- **Besluit:** een datum met de precisie `month` of `year` staat als de eerste dag van die maand of dat jaar, en betekent dat de echte dag ergens daarin ligt.
  De einddatum is de laatste dag van de periode.
  Een einde in een maand of jaar telt als "in die maand gestopt", dus de laatste dag die zeker is, is de dag ervoor.
  Daarop rekenen twee vragen in `packages/db/src/staff.ts` en `queries.ts`:
  - `findStaffOn` zegt `certain` met de persoon als de dag zeker in zijn periode ligt, `uncertain` met de mogelijke personen als de dag in de onzekerheid van een grens ligt, en `none` voor een dag in een gat of vóór de eerste rij.
    Op de dag dat een nieuwe trainer begint, is hij de trainer.
  - `listStaffInSeason` geeft de staf die zeker een dag van het seizoen in dienst was, op volgorde van begin en niet op aantal wedstrijden.
    Een trainer die "in 2024" begon, staat niet in 2023/24, en Van Basten, die volgens Wikipedia in juli 2014 stopte, niet in 2014/15.
- **Waarom:** de pagina mag geen naam bij een seizoen of wedstrijd zetten die we niet weten.
  Een seizoen met een trainer te veel is een fout die een bezoeker meteen ziet, een dag die `uncertain` heet doet niemand pijn.
  De volgorde op begin is wat de seizoenspagina toont ("op volgorde van begin"), en een telling per trainer hoort bij de pagina van een wedstrijd (#108), die de dagen toch al per wedstrijd vraagt.
- **Gevolg:** een seizoen waarin een datum vaag is, kan een trainer missen die er volgens Wikipedia maar een deel van was.
  Henk Brugge begon "in februari of maart 2025": we nemen februari, en hij staat in 2024/25.
  De trainers uit de jaren negentig en tot 2014 hebben vaak alleen een maand of jaar, dus bij hen zegt de vraag naar een dag vaker `uncertain`.
- **Alternatieven:** de eerste dag van een maand of jaar als de echte dag nemen (een gok, en een wedstrijd komt bij de verkeerde trainer).
  Een trainer in elk seizoen tonen dat zijn periode ook maar mogelijk raakt (twee trainers te veel bij Lodeweges en Van Persie).
  De trainer van een seizoen kiezen met de meeste wedstrijden (kan niet zonder de dag per wedstrijd en de onzekerheid ervan).

## De trainers van een seizoen staan in een kaart met het sterke blauwe vlak onder de stand, met een regel per trainer

- **Datum:** 30 oktober 2026
- **Besluit:** de seizoenspagina (`/wedstrijden` en `/wedstrijden/JJJJ-JJ`) toont de hoofdtrainer(s) in een kaart met het sterke vlak van het designsysteem (`surface="strong"`, licht blauw in licht en donker blauw in donker, zoals "Ben je zelf een bron?" op `/bronnen`) in de zijbalk, direct onder de stand.
  De tekst, de namen, de kolom met de dag en "(interim)" gebruiken de gewone tekstkleuren, die op dit vlak minstens 4,5:1 halen: 13,7:1 voor de tekst en 5,3:1 voor de dag en "(interim)" in licht, en 11,7:1 en 8,4:1 in donker.
  De kop is "Hoofdtrainer" bij één trainer en "Hoofdtrainers" bij meer, een `h2`, met altijd het anker `#hoofdtrainer`.
  Elke trainer is een regel van het nieuwe patroon `ShortStaff`, in dezelfde vorm als een `ShortMatch`.
  De naam staat als die van een speler (`PlayerName`): de voornaam in het normale gewicht, de achternaam in het sterkere, en "(interim)" erachter in het normale gewicht.
  De kaart staat ook als link in de balk "Op deze pagina:", na Stand of Eindstand.
  Een seizoen zonder trainer in de tabel heeft de kaart en de link niet.
- **Welke trainers en in welke volgorde:** alle trainers die zeker een dag van het seizoen in dienst waren (zie _Een maand of jaar telt als "ergens in"…_), op volgorde van begin.
  - Een seizoen met één trainer toont alleen zijn naam, zonder "hele seizoen".
  - Bij meer trainers heeft elke trainer behalve de laatste "tot 14 mrt 2026", de dag waarop hij stopte, en de laatste "vanaf 1 sep 2025", de dag waarop hij begon (`coachPeriods` in `src/match-format.ts`).
    Een trainer die in het midden begon en stopte, heeft dus alleen zijn "tot".
  - Een datum die alleen als maand of jaar bekend is, staat zo ("tot mrt 2026", "vanaf 2024").
    De dag staat in de Nederlandse korte notatie, "14 mrt 2026".
- **Bron:** de kaart heeft geen bronvermelding van zichzelf en de namen zijn geen links naar Wikipedia.
  De bron staat al onderaan de pagina, en een korte bronvermelding in elke kaart is te veel (de projecteigenaar, 30 oktober 2026).
  De kolom `wikipedia_page` blijft in de tabel, voor de pagina van een wedstrijd (#108) of een latere link.
- **Waarom:** de eerste versie, een regel boven de kaarten, viel te veel op voor een feit dat een bezoeker zelden zoekt.
  Een kaart onder de stand hoort bij de andere kaarten, en een lijst zegt per trainer wanneer hij begon of stopte zonder dat een zin de volgorde hoeft uit te leggen.
  De regel hergebruikt de klassen van `ShortMatch` (`ShortStaff` voegt alleen een bredere kolom toe voor de tekst vooraan), en de naam hergebruikt `PlayerName`, zodat de lijst er hetzelfde uitziet als bij de spelers.
  Het anker is voor één en meer trainers gelijk, zodat een link niet breekt als een seizoen er een tweede trainer bij krijgt.
  Het sterke vlak is de keuze van de projecteigenaar (30 oktober 2026): de kaart valt er tussen de witte en zachte kaarten op, zonder dat hij zwaarder weegt dan de stand.
  Er is geen eigen kleur voor het vlak nodig, want de tokens voor tekst en secundaire tekst zijn voor dit vlak gekozen.
- **Alternatieven:** een regel boven de kaarten (viel te veel op).
  "hele seizoen" bij de enige trainer (de naam zegt het al).
  Een "van … tot …" bij elke trainer (de regel wordt lang, en de dag van het begin van een trainer is de dag van het einde van de vorige).
  Een eigen lijstregel met eigen CSS (dubbel werk, en de twee lijsten gaan dan uit elkaar lopen).
- **Later:** zie _De kaart met de uitslagen staat op Wedstrijden en telt dezelfde wedstrijden als Uitslagen_ (2 november 2026): de kaart "Hoe vaak welke uitslag" staat tussen de stand en de hoofdtrainer, dus Hoofdtrainer is de laatste kaart van de zijbalk en de link staat na die van Hoe vaak welke uitslag.
- **Later:** zie _Een stadion toont seizoenen, en een dag alleen als het beheer die kent_ (4 november 2026) in `site.md`: de kolom met de periode van `ShortStaff` is 9,5 in plaats van 8,5 rem, zodat een periode van twee seizoenen erin past.

## De hoofdtrainers staan in de seed met de laatste dag, en een afgeleide laatste dag is de dag voor de opvolger

- **Datum:** 30 oktober 2026
- **Besluit:** de seed (`headCoaches` in `packages/db/src/staff-seed.ts`) heeft de hoofdtrainers van 1 juli 1990 tot nu uit de Nederlandse Wikipedia (gelezen op 30 oktober 2026), elk met de precisie die Wikipedia geeft.
  Waar Wikipedia een einde afleidt uit het begin van de opvolger (Jan Everse en Henk Brugge), staat als laatste dag de dag ervoor, zodat twee periodes elkaar niet overlappen.
  Een "einde van het seizoen" is de laatste dag van dat seizoen, 30 juni.
  Eén datum komt niet van Wikipedia: Robin van Persie vertrok op 23 februari 2025, volgens de aankondiging van de club (de projecteigenaar, 30 oktober 2026).
  Wikipedia heeft daar "ongeveer 23 februari", dus de rij heeft de dag met de precisie `day`, en een opmerking in de seed en de toelichting zegt waar de datum vandaan komt.
  Zijn begin is alleen als jaar bekend, en dat blijft zo.
  De toelichting (`note`) schrijft op wat de bron openlaat of tegenspreekt, in onze woorden.
  De tabel is er vanaf nu voor een nieuwe trainer: die komt als rij in de seed.
- **Waarom:** acceptatie en productie krijgen de rijen zonder iets met de hand te doen, want de site zet ze bij het opstarten in de tabel, zoals de echte bronnen.
  Een seed die een rij vindt op rol, naam en begindatum werkt hem bij en maakt geen dubbele rijen.
  Een datum corrigeren in een bestaande rij vraagt een migratie, want een andere begindatum is een andere rij.
- **Keuzes bij een gat of een tegenspraak:** Johnny Jansen begon op 10 april 2019 als interim-trainer, en andere pagina's noemen 3 juni 2019 als begin.
  We nemen de eerste datum en tonen hem niet als interim, want hij werd daarna de vaste trainer en de rest van zijn periode zou anders onjuist "(interim)" dragen.
  Tussen Jansen (ontslagen op 24 januari 2022) en Ole Tobiassen (begon op 4 februari 2022) zit een gat van tien dagen: een vraag naar een dag daarin geeft geen trainer.
  Fritz Korbach begon in februari 1990, maar zijn periode begint op 1 juli 1990, de eerste Eredivisie-wedstrijd van de club, zoals de rij zegt.
- **Alternatieven:** de seed alle rijen van de rol `coach` laten vervangen (wist later wat het beheer toevoegt).
  Jansen in twee rijen splitsen, op 3 juni 2019 (de pagina's zeggen niet wat er die dag gebeurde).
  Het gat tussen Jansen en Tobiassen dichten (we zouden een datum verzinnen).

## De statistieken tellen standaard alle wedstrijden, met een schakelaar naar alleen de Eredivisie

- **Datum:** 31 oktober 2026
- **Besluit:** op `/statistieken` en `/statistieken/spelers` tellen de kaarten standaard alle wedstrijden, de Eredivisie en de KNVB Beker, en een schakelaar kiest daarnaast alleen de Eredivisie (#406).
  - **De keuzes en het adres:** "Alle wedstrijden" is de standaard en heeft geen parameter, "Eredivisie" is `?competitie=eredivisie`.
    De keuze zit in het adres en niet in een cookie.
    Een andere waarde, een lege waarde en een waarde die twee keer staat, geven "niet gevonden", ook in de balk "Op deze pagina:".
  - **De schakelaar** is een `SegmentedLinks` van het designsysteem: twee links met `aria-current="page"` op de huidige keuze, in de standaardmaat van 44 pixels.
    Hij staat in een gewone cel zonder kaart, als eerste cel van de hoofdkolom, direct onder de titelrij en links; de seizoenskiezer blijft rechts naast de kop.
    Eerst stond hij in de titelrij, maar daar was hij te opvallend; de projecteigenaar koos de plek onder de kop op 31 oktober 2026.
    Hij staat er alleen bij een seizoen met een gespeelde bekerwedstrijd, want anders valt er niets te kiezen.
    **Later:** zie _Een kaart die een telling van meer wedstrijden is, staat op Cijfers, en de schakelaar staat bovenaan de hoofdkolom_ (6 november 2026) in `site.md`: op Cijfers staat hij na de drie kaarten die hij negeert, niet meer als eerste cel.
  - **Welke kaarten de keuze volgen:** Reeksen en de laatste vijf wedstrijden, Thuis en uit, Doelpuntenmakers (ook de top 5 en de lijst op Spelers), De nul gehouden, Doelpunten per kwartier en Uitersten.
    Onze plek in de competitie, Verloop van het seizoen en Hoe de wedstrijden verlopen blijven de Eredivisie, omdat ze op de stand, de 34 speelrondes of de stand na 90 minuten rusten.
  - **De telling van de beker:** een bekerwedstrijd telt met de score na de verlenging, en een strafschoppenserie telt niet mee.
    Een wedstrijd die gelijk eindigt en op strafschoppen wordt beslist, is een gelijkspel in de cijfers, dus de reeks "ongeslagen" loopt door.
    Doelpunten in de verlenging blijven buiten Doelpunten per kwartier.
    Een bekerwedstrijd zonder uitslag, of die nog niet is gespeeld, telt niet.
    **Later:** zie _Een wedstrijd die we op strafschoppen winnen, telt overal als winst_ (7 november 2026) in `site.md`: de doelpunten blijven die na de verlenging, maar de uitkomst volgt de strafschoppen, dus zo'n wedstrijd is een winst of een verlies en onderbreekt de reeks "zonder winst" of "ongeslagen" zoals elke andere.
  - **Thuis en uit:** de rijen Punten en Punten per wedstrijd staan er alleen als elke getelde wedstrijd een competitiewedstrijd is (bij Eredivisie en bij een seizoen zonder gespeelde beker), want de beker geeft geen punten.
  - **Seizoen en keuze blijven:** de link "Alle doelpuntenmakers", de schakelaar, de knop "Laad 5 meer" van De nul gehouden en de seizoenskiezer (ook de route `kies`) houden de keuze vast, ook zonder JavaScript.
    De route laat een waarde weg die de pagina niet kent, zodat de kiezer niemand naar "niet gevonden" stuurt.
- **Waarom:** een doelpunt in de beker is ook een doelpunt, en Programma en Uitslagen op Wedstrijden tonen de beker ook samen met de competitie.
  Wie alleen de competitie wil vergelijken, kiest Eredivisie.
  De keuze in het adres is te delen, werkt zonder JavaScript en kost geen cookie.
  De drie kaarten die de Eredivisie blijven, rusten op iets wat de beker niet heeft, en een zin die dat zegt, zou de kaarten alleen langer maken.
- **Hoe:** de keuze (`CompetitionChoice` in `src/competition.ts`) is het laatste argument van de hulpfuncties in `src/matches.ts`, en een kaart krijgt haar als eigenschap.
  De wedstrijden van een seizoen blijven in één gecachete lezing per seizoen (`getMatchData`), en de keuze filtert die lijst bij het tellen.
  De cache heeft dus geen sleutel per keuze nodig, en de ene keuze kan de andere niet overschrijven: een test laat zien dat beide keuzes dezelfde, bevroren gegevens lezen en er niets aan veranderen.
  Het issue vroeg een sleutel per keuze; de projecteigenaar nam dit over op 31 oktober 2026.
  `SegmentedLinks` is een tweede onderdeel naast `SegmentedControl`, met dezelfde opmaak, omdat knoppen met `aria-pressed` een JavaScript-handler nodig hebben en een keuze in het adres links is.
  `SeasonPicker` kreeg `fields` voor verborgen velden, zodat de kiezer de keuze meestuurt.
- **Nadeel:** het menu bovenaan de site heeft vaste adressen en houdt het seizoen en de keuze niet vast, want het hoort bij elke pagina van de site.
  Wie van Statistieken via het menu naar Spelers gaat, begint weer bij het lopende seizoen en alle wedstrijden.
  Dat valt buiten dit besluit, op verzoek van de projecteigenaar (31 oktober 2026): de links op de pagina's zelf houden ze vast, en het menu krijgt een eigen issue.
- **Alternatieven:** standaard alleen de Eredivisie, zoals de meeste sites (een doelpunt in de beker telt dan niet).
  De keuze in een cookie (niet te delen, en een verborgen toestand).
  Een `SegmentedControl` met knoppen en JavaScript (werkt niet zonder).
  De schakelaar in de titelrij naast de kiezer (te opvallend).
  De schakelaar als eerste cel van de zijbalk (de zijbalk volgt in de bron op de hoofdkolom, dus op een telefoon staat hij dan na vier kaarten, waaronder twee die hij bedient; met CSS naar boven halen laat de zichtbare volgorde afwijken van de volgorde van het toetsenbord).
  Een sleutel per keuze in de cache (meer geheugen en meer code voor dezelfde gegevens).
  Een zin op de drie kaarten die de keuze niet volgen (langere kaarten, en de schakelaar zegt het al).
- **Later:** zie _Tegenstanders is een lijst van alle clubs en een pagina per club, onder Statistieken_ (31 oktober 2026): de schakelaar staat sindsdien ook op `/statistieken/tegenstanders` en op de pagina van een club, en telt daar de wedstrijden van alle seizoenen.
- **Later:** zie _De balk van Statistieken komt uit een slot van de layout en houdt het seizoen en de keuze vast_ (31 oktober 2026): de links van de balk onder het hoofdmenu houden het seizoen en de keuze nu vast.
  Het hoofdmenu zelf houdt de keuze niet vast.
- **Later:** zie _Het hoofdmenu neemt het seizoen van de pagina mee_ (1 november 2026): het menu van de site neemt nu het seizoen mee naar Wedstrijden en Statistieken, maar niet de keuze tussen alle wedstrijden en de Eredivisie; het **Nadeel** hierboven geldt daarom alleen nog voor die keuze.
- **Later:** zie _De schakelaar is een baan met een schuivende knop_ (31 oktober 2026): de schakelaar staat in de kleine maat van 36 pixels in plaats van 44, en is een baan met een knop.
  De plek, de links en `aria-current` blijven.
- **Later:** zie _De play-offs voor de Conference League zijn een derde competitie, een ontbrekende pagina is geen mislukking_.
  "Alle wedstrijden" telt ook de play-offs, en de schakelaar staat er ook bij een gespeelde play-offwedstrijd.

## `ShortMatch` toont de uitkomst met kleur en gewicht, zoals `Match`

- **Datum:** 31 oktober 2026
- **Besluit:** de uitslag in `ShortMatch` is groen bij winst, rood bij verlies en neutraal bij gelijkspel, voor sc Heerenveen, thuis en uit, zoals in `Match` (#510).
  - **De regel:** `Match` en `ShortMatch` gebruiken dezelfde hulpfunctie, `outcomeOf` in `components/outcome.ts`, en niet een kopie.
    De uitkomst volgt uit `goalsFor` en `goalsAgainst`.
  - **De opmaak:** dezelfde klassen (`hf-match-win`, `hf-match-loss`, `hf-match-draw`) en dezelfde tokens (`--hf-colour-outcome-win`, `-loss` en `-draw`).
    Er komt geen eigenschap en geen schakelaar: elke `ShortMatch` krijgt de kleur.
  - **Het gewicht** was al dat van `Match` (`--hf-figure-font-weight`), dus de CSS van de uitslag verandert niet.
    In geforceerde kleuren vervangt de browser de kleur en blijft het gewicht.
  - **Het contrast** haalt 4,5:1 op de vier vlakken van een kaart (wit, zacht, warm en sterk), in licht en donker: het laagste is 5,31:1 (winst en gelijkspel op het warme vlak in licht).
    Er is dus geen kleur aangepast.
    `pnpm test:stories` toetst het met axe op een story per vlak, in licht en donker.
  - **Een bekerwedstrijd na strafschoppen** staat in `ShortMatch` als gelijkspel, omdat het onderdeel de strafschoppen niet kent.
    Dat is een bekende beperking, geen onderdeel van dit besluit.
    **Later:** zie _Een wedstrijd die we op strafschoppen winnen, telt overal als winst_ (7 november 2026) in `site.md`: `ShortMatch` krijgt de strafschoppen als eigenschappen, kleurt de uitslag naar de serie en laat een schermlezer "na strafschoppen 4 tegen 3" horen; de regel zelf toont alleen de stand na de verlenging.
  - **`ShortStaff`** leent de opmaak maar heeft geen uitslag, dus hij blijft zoals hij was; een test laat dat zien.
- **Waarom:** in een lijst als de wedstrijden tegen één club, Uitersten of De nul gehouden ziet een supporter zo in één oogopslag wat we wonnen en verloren.
  De eerdere reden om het weg te laten (alle regels van De nul gehouden hebben dezelfde soort uitslag) gold niet voor de andere lijsten, en een regel die zo hoort te werken als `Match` hoort ook dezelfde kleur te hebben.
  Een gedeelde functie voorkomt dat de twee onderdelen op den duur een andere uitkomst kleuren.
  De kleur is een aanvulling op de cijfers en niet het enige teken: de tekst voor een schermlezer blijft "3 tegen 0".
- **Alternatieven:** een eigenschap om de kleur uit te zetten (niemand vroeg erom, en elke lijst zou een keuze moeten maken); de regel kopiëren naar `ShortMatch` (twee plaatsen die uit elkaar kunnen lopen); een eigen klasse per uitkomst in `short-match.css` (dezelfde kleuren op twee plaatsen).
- **Later:** zie _Een uitslag van één wedstrijd staat met de thuisclub eerst, ook in `ShortMatch`_ (2 november 2026): de kleur van de uitkomst blijft vanuit sc Heerenveen, maar de cijfers en de tekst voor een schermlezer staan nu in de volgorde van de wedstrijd, en niet meer "3 tegen 0" vanuit onze kant.

## Een uitslag van één wedstrijd staat met de thuisclub eerst, ook in `ShortMatch`

- **Datum:** 2 november 2026
- **Besluit:** `ShortMatch` noemt beide clubs in de volgorde van de wedstrijd, de thuisclub eerst, met de uitslag ertussen en het getal van de thuisclub eerst, zoals `Match` (#624).
  Een uitwedstrijd die wij met 3–0 winnen staat dus als "Testdorp FC 0–3 sc Heerenveen".
  - **De regel:** de dag, dan `<club> <uitslag> <club>`.
    De props blijven `goalsFor` en `goalsAgainst` (vanuit sc Heerenveen) en `home`; het onderdeel zet de getallen zelf in de volgorde van de wedstrijd, zoals `sides` in `Match`.
    Elke plek waar `ShortMatch` staat (Uitslagen, De nul gehouden, Reeksen, Uitersten en de pagina van een club) is daardoor goed, zonder wijziging in de site.
  - **"thuis" en "uit"** staan niet meer in de regel: de volgorde zegt het al, en de regel wordt er niet drukker van.
  - **De naam van sc Heerenveen** staat vet, zoals in `Match`, zodat een lezer onze eigen club ziet, aan welke kant hij ook staat.
  - **Een schermlezer** hoort dezelfde volgorde met de namen: "Testdorp FC 0 tegen 3 sc Heerenveen".
    De cijfers blijven voor het oog (`aria-hidden`), en de tekst voor een schermlezer staat ertussen, net als in `Match`.
  - **De kleur van de uitkomst en het gewicht** blijven vanuit sc Heerenveen (`outcomeOf(goalsFor, goalsAgainst)`): groen bij winst, ook als de uitslag "0–3" is.
    De klassen (`hf-match-win`, `-loss` en `-draw`) veranderen niet.
  - **Lange namen** breken in de regel op een spatie, zoals in `Match`; het getal blijft in één stuk (`white-space: nowrap`), dus een smalle kaart scrolt niet zijwaarts.
  - **Niet veranderd:** totalen van doelpunten die geen uitslag zijn, zoals "D doelpunten (voor–tegen)" in Alle tegenstanders en de kolommen Doelpunten voor en Doelpunten tegen, blijven vanuit sc Heerenveen: ze tellen over meer wedstrijden.
    Ook de importer houdt zijn Engelse regels voor het logboek en de vergelijking van wijzigingen (`describeState`, `check-wikipedia`) zoals ze zijn: ze zijn voor de beheerder, en `describeState` is een opgeslagen waarde die vergeleken wordt.
- **Waarom:** zo lezen supporters een uitslag in de krant, bij de bond en bij Wikipedia, en de kaart Uitslagen met `Match` doet het al.
  Een uitslag die een keer wel en een keer niet omgedraaid is, kost de lezer elke keer een denkstap.
  De kleur blijft vanuit onze club, want de lijsten gaan over onze club.
- **Alternatieven:** de uitslag vanuit sc Heerenveen laten staan met "thuis" of "uit" erbij (zoals voorheen); alleen de kleur van de uitkomst laten zeggen wie won; de kleur van de thuisclub (dan is een uitzege rood, wat verkeerd leest).
- **Later:** zie _`Match` is voor een volledige lijst, `ShortMatch` voor een selectie_ (4 november 2026): de lijst van de kaart Wedstrijden op de pagina van een club heeft sindsdien geen `ShortMatch` meer; de grootste overwinning en nederlaag onder Onze uitslagen blijven er een.

## De pagina Spelers toont bijzondere doelpunten

- **Datum:** 31 oktober 2026
- **Besluit:** `/statistieken/spelers` en zijn seizoenen hebben onder Doelpuntenmakers een kaart Bijzondere doelpunten (#403), met het anker `bijzondere-doelpunten` en een tweede link in de balk "Op deze pagina:".
  - **Hattricks en dubbelslagen:** een hattrick is drie of meer doelpunten van één speler in één wedstrijd, een dubbelslag is er precies twee.
    De kaart toont de spelers achter elkaar met komma's, met hoe vaak het gebeurde ("Jan Jansen 2×, Piet Pietersen"; één keer staat er geen getal).
    Een speler met een hattrick staat in die wedstrijd niet ook bij de dubbelslagen, maar een andere wedstrijd kan hem wel een dubbelslag geven.
    De doelpunten van twee wedstrijden tellen niet bij elkaar op.
    Een strafschop is een doelpunt van de speler en telt dus mee; een eigen doelpunt telt voor niemand, en een doelpunt van de tegenstander ook niet.
    Een doelpunt zonder minuut of zonder speler in de tabel is gewoon een doelpunt: een speler wordt herkend zoals in de lijst van doelpuntenmakers (op `id`, anders op de Wikipedia-pagina, anders op de naam).
  - **Strafschoppen:** het aantal doelpunten van sc Heerenveen uit een strafschop, uit alle doelpunten van sc Heerenveen: "1 van de 17 doelpunten".
    Een eigen doelpunt van de tegenstander is een doelpunt van ons en staat in het totaal.
    Strafschoppen van de tegenstander tellen niet, en de strafschoppenserie na afloop ook niet, want die staat niet in de doelpunten.
  - **Eigen doelpunten:** twee getallen op één regel, "1 door de tegenstander · 0 door ons": het aantal dat een speler van de tegenstander in eigen doel maakte en het aantal dat een speler van ons deed.
  - **Lege delen:** staat er geen hattrick of dubbelslag, dan staat er "Nog geen" in de rustige kleur, want een supporter zoekt ze juist.
    De strafschoppen en de eigen doelpunten zijn getallen, dus 0 blijft staan.
    Is er geen doelpunt van ons in een gespeelde wedstrijd, dan is de kaart één zin zonder delen en zonder knop voor een afbeelding.
  - **De wedstrijden:** de kaart telt de gespeelde wedstrijden waarvan de doelpunten bekend zijn, zoals Doelpunten per kwartier (een wedstrijd met een score en zonder doelpunten blijft eruit), en volgt de schakelaar van #406: een bekerwedstrijd telt alleen bij Alle wedstrijden, met de doelpunten uit de verlenging erbij.
    Onder de kaart staat "Gebaseerd op …" in de vorm van de andere kaarten.
  - **De opmaak:** een lijst van vier delen zonder grafiek, en zonder koppen van niveau 3: de kaart heeft één kop, van niveau 2.
    Elk deel heeft zijn naam als rustige tekst erboven en zijn waarde eronder, met een dunne lijn tussen de delen, zoals de kaart Uitersten (de projecteigenaar koos dit op 31 oktober 2026; vier subkoppen waren te zwaar).
    Het is een `List` met in elk `List.Item` de naam (`Text appearance="meta"`) en de waarde in een `ShortFact`, een nieuw onderdeel van het designsysteem dat de klassen van `ShortMatch` neemt, zodat de lijnen uit `short-match.css` komen en er geen CSS is gekopieerd.
    De naam komt eerst in het lijstitem, dus een schermlezer leest de naam en de waarde samen; een beschrijvingslijst (`dl`) kreeg de lijnen niet, want die zijn aan `li` gebonden.
    De kaart is zacht en heeft een knop voor een afbeelding met de bronvermelding van Wikipedia.
    De namen zijn een `PlayerName`.
- **Waarom:** dit zijn de dingen die supporters bij een seizoen willen weten en die de lijst met doelpuntenmakers niet laat zien.
  Alles komt uit de doelpunten die de pagina al heeft, dus er is geen nieuwe vraag aan de database.
  Lijsten zijn korter dan tabellen voor een paar namen, en een zin voor een leeg deel zegt dat er niets mis is met de pagina.
- **Niet erin:** de positie van de doelpuntenmaker (voor een afgelopen seizoen bestaat geen selectie), het aandeel van de topscorer en het aantal verschillende spelers (dat staat in Doelpuntenmakers).
- **Alternatieven:** vier koppen van niveau 3 met onder elk een lijst of een zin (te zwaar voor vier korte feiten, en de eerste versie van deze kaart); een tabel met een rij per speler (veel kolommen voor weinig getallen); een `dl` met `dt` en `dd` (de dunne lijnen horen bij `li`, en de kaart Uitersten is ook een lijst); de lege delen weglaten (een bezoeker kan niet zien of ze er niet zijn of er niet werden gezocht); een hattrick ook bij de dubbelslagen laten staan (dezelfde wedstrijd wordt dan twee keer genoemd); de kaart naar Statistieken zetten (de pagina Spelers is er voor wat bij spelers hoort, zie _Statistieken toont de top 5 van de doelpuntenmakers, en de volledige lijst staat op Spelers_).
- **Later:** zie _Op Spelers is de ranglijst witte inhoud, en de bijzondere doelpunten staan in de zijkolom_ (1 november 2026): de kaart staat niet meer onder Doelpuntenmakers maar in de zijkolom, en de bronvermelding sluit de zijkolom af.

## De Stand zegt dat een uitslag nog ontbreekt, zonder datum op de kaarten

- **Datum:** 1 november 2026
- **Besluit:** de kaart Stand op de homepage en op Wedstrijden toont onder de tabel "Gegevens nog niet bijgewerkt" (#542), in `Text appearance="meta"` en in hetzelfde rood als "Gegevens nog niet beschikbaar" bij een wedstrijd (het token `--hf-colour-text-missing`, de projecteigenaar vroeg erom op 1 november 2026), boven de link, zodra een wedstrijd van het lopende seizoen geen uitslag heeft twee uur na de aanvang.
  Dezelfde grens als de zin "Gegevens nog niet beschikbaar" bij een wedstrijd: `standingsLag` in `src/matches.ts` roept `lacksResult` aan, dus er is geen tweede kopie van de twee uur.
  Een Eindstand krijgt de regel niet, ook niet met wedstrijden zonder uitslag (de projecteigenaar koos dit op 1 november 2026), een kaart zonder tabel ook niet, en de afbeelding van de kaart laat de regel weg (`data-hf-card-share-skip`).
  De regel verdwijnt zodra de uitslag er is.
- **Waarom:** een datum op elke kaart ("Laatst gewijzigd", #517) wijst te veel op gegevens die achterlopen, en geen aanduiding betekent dat het waarschijnlijk klopt.
  De regel staat er alleen als het nodig is.
  Een wedstrijd zonder uitslag zegt dat zelf al, maar de Stand staat op een andere plek, en een tabel die achterloopt moet dat zeggen.
  De afbeelding is een momentopname met de dag van het maken, en de regel is een tijdelijke staat.
- **Alternatieven:** een datum op elke kaart (#517, gesloten: te veel nadruk op wat achterloopt); dezelfde zin als bij een wedstrijd (bij een wedstrijd ontbreekt de uitslag, bij de Stand loopt de tabel achter); de regel ook bij een Eindstand (die verandert niet meer en de wedstrijden zeggen het zelf); een tweede grens voor de Stand (zou uit elkaar kunnen lopen).

## Statistieken heeft een kaart Opmerkelijk: één feit per dag, in vaste volgorde

- **Datum:** 1 november 2026
- **Besluit:** de pagina Statistieken en de pagina van een eerder seizoen krijgen onderaan de hoofdkolom een kaart Opmerkelijk (#553), met één opmerkelijk feit uit onze eigen wedstrijden.
  - **De namen:** de kaart heet "Opmerkelijk", de link naar het volgende feit "Nog iets opmerkelijks", en het adres heeft `?opmerkelijk=n` en het anker `#opmerkelijk` (de projecteigenaar koos dit op 1 november 2026).
    In de code heet het "noteworthy": `noteworthy.ts`, `NoteworthyCard` en `NoteworthyFact`.
    De woorden voor de bezoeker staan op één plek, in de constante `noteworthy`.
  - **Eén feit:** een opmerkelijk feit gaat over één wedstrijd, speler of trainer en is nooit een totaal of een gemiddelde, want dat doen de andere kaarten.
    Het is één zin in de stem van een supporter, met de wedstrijd, de uitslag en de dag erin ("Thuis tegen FC Twente (3–2, 14 maart 2026) vielen in de 23e en de 24e minuut twee doelpunten achter elkaar.").
    De uitslag staat met de thuisclub eerst, zoals `Match`.
    Alle feiten gaan over het getoonde seizoen, dus de dag met het jaar is het enige wat de zin over het seizoen zegt.
  - **Zeven soorten:**
    - twee doelpunten in opeenvolgende minuten, van ons of tegen ons; de blessuretijd telt niet mee, want daar zijn de minuten geen klok;
    - twee of meer doelpunten in de blessuretijd van één helft;
    - een hattrick van één speler, ook van de tegenstander; een eigen doelpunt telt voor niemand;
    - een wedstrijd met zeven of meer doelpunten;
    - een zege na een achterstand van twee doelpunten of meer, uit de volgorde van de doelpunten, en alleen als alle doelpunten bekend zijn;
    - vijf of meer thuis- of uitzeges op rij;
    - de eerste wedstrijd onder een trainer die tijdens het seizoen kwam.

    Elke soort is een kleine functie in `noteworthy.ts` met een test, en een nieuwe soort is één functie erbij.

  - **Een reeks is een reeks zeges:** "vijf thuis- of uitwedstrijden op rij" las de Builder als vijf zeges op rij op dezelfde plek, want vijf thuiswedstrijden achter elkaar bestaan in de Eredivisie niet.
    De wedstrijden op de andere plek ertussen breken de reeks niet, een gelijkspel of verlies wel.
    Een reeks is één feit, vanaf de laatste zege.
  - **De trainer:** het gaat om een trainer die niet de eerste van het seizoen is, met een begindag die op de dag bekend is, en met een wedstrijd van het seizoen ervoor.
    De eerste wedstrijd is de eerste van het seizoen vanaf die dag, in elke competitie.
    Laat de keuze van de bezoeker die wedstrijd weg, of heeft hij nog geen uitslag, dan is er geen feit.
  - **Niet erin:**
    - de eerste ontmoeting met een tegenstander na een of meer seizoenen: de kaart heeft alleen de wedstrijden van het getoonde seizoen, en een nieuwe query is niet gewenst;
    - de debuut van een speler, want we hebben geen opstellingen;
    - de wedstrijd in twee stadions, die volgt met `matches.note` (#548);
    - alles met toeschouwers of scheidsrechter (#416 en #417).
  - **Geen link naar de tegenstander:** een wedstrijd heeft de naam van de tegenstander en niet de slug van de club, dus een link vraagt een nieuwe query of een gok.
  - **De volgorde per dag:** de feiten van het seizoen en de keuze van de bezoeker staan in een door elkaar gehusselde volgorde die een dag in Nederlandse tijd vastligt.
    Elk feit heeft een vaste id en zijn plek komt uit een hash van de dag en die id (FNV-1a), dus een feit dat erbij komt of weggaat verschuift de andere niet.
    De pagina is de hele dag gelijk en de cache werkt.
  - **Nog iets opmerkelijks:** `?opmerkelijk=n` toont het n-de feit, en na het laatste komt het eerste.
    Een ongeldig getal geeft het eerste.
    De link "Nog iets opmerkelijks" is een gewone link naar `?opmerkelijk=<volgende>#opmerkelijk`, met `competitie=eredivisie` erbij als die gekozen is.
    Er is geen script en er wordt niets over de bezoeker bewaard.
    Bij één feit is er geen link, want hij leidt naar dezelfde kaart.
    Zonder feit is er geen kaart.
  - **De kaart:** het warme vlak (regel 3 van _De vier vlakken van een kaart hebben een betekenis, en elke kaart volgt de eerste regel die past_), met een kop van niveau 2 zonder anker, de zin als gewone tekst en de link.
    Hij staat niet in de balk "Op deze pagina:", want dat zijn de negen kaarten met cijfers.
    Er is geen deelknop: de kaart verandert per dag en heeft geen afbeelding om te delen.
  - **De verzonnen gegevens:** in `madeUpGoals` valt het tweede doelpunt van Testvoort in speelronde 2 in minuut 67 in plaats van 74, zodat de gegevens van de toegankelijkheidscontrole en van de screenshots één opmerkelijk feit hebben.
    De minuut blijft in hetzelfde kwartier.
- **Waarom:** een supporter leest graag iets leuks dat hij niet zocht, en de cijfers staan er al.
  Een feit per dag houdt de kaart klein en de pagina rustig, en geeft een reden om terug te komen.
  Een vaste volgorde per dag houdt de pagina gelijk binnen een dag en laat de cache werken.
  Een gewone link werkt zonder script en onthoudt niets.
- **Nadeel:** dezelfde dag geeft dezelfde volgorde voor iedereen.
  Het derde feit van de dag is niet te vinden zonder drie keer te klikken.
- **Alternatieven:** een willekeurig feit bij elk bezoek (de pagina verandert bij verversen, en de cache werkt niet); een husselvolgorde met een zaadgetal (elk feit dat erbij komt verschuift alle andere); het volgende feit met een script en een cookie (we bewaren niets over een bezoeker); alle feiten onder elkaar (te lang, en de kaart is er voor één feit); een deelknop (de kaart heeft geen vaste inhoud om te delen); een link naar de pagina van de tegenstander (nieuwe query, zie hierboven); vijf thuiswedstrijden achter elkaar zonder meer (komt in de Eredivisie niet voor); de naam Weetjes (de eerste naam, die de projecteigenaar liet vervangen door Opmerkelijk).

## De tabel in "Onze uitslagen tegen …" heeft Thuis en Uit als rijen met Totaal eronder, zoals de kaart Stand

- **Datum:** 2 november 2026
- **Besluit:** de tabel op de kaart "Onze uitslagen tegen …" op de pagina van een club draait om (#623).
  - **De rijen:** Thuis en Uit, en eronder Totaal in een `tfoot`, in vet en met een dikkere lijn erboven.
    De naam van de rij is de rijkop.
  - **De kolommen:** G (gespeeld), W (gewonnen), L (gelijk), V (verloren), P (punten) en D (doelsaldo), elk met één eigen letter, op verzoek van de projecteigenaar op 2 november 2026.
    De doelpunten voor en tegen zijn één kolom geworden, het doelsaldo met teken (`+6`, `−2`, `0`).
    L voor gelijk en D voor doelsaldo zijn nieuwe letters, want G is al gespeeld en deze tabel heeft elke letter maar één keer.
    Onder de tabel staan de woorden van de afkortingen, en een schermlezer hoort de hele woorden, zoals bij de kaart Stand.
  - **De punten** zijn vet en staan er alleen bij de keuze Eredivisie, want de beker geeft er geen: 3 voor een winst en 1 voor een gelijkspel (`pointsOf`), zoals in de lijst op Tegenstanders.
    Bij de keuze Alle wedstrijden is er geen kolom P.
  - **De kleuren:** de getallen in W, L en V hebben de kleur van de uitslag, groen, grijs en rood (`hf-match-win`, `hf-match-draw` en `hf-match-loss`), zoals de regels met wedstrijden.
    De kolomkop zegt wat het is, dus kleur is niet het enige.
  - **Het component:** een nieuw component `RecordTable` in het designsysteem, naast `StandingsTable` en niet als algemenere versie ervan.
    Hij heeft dezelfde lijnen, letters, rijkoppen en legenda: de tabel komt uit `base/table.css`, en de plek, de nowrap en de legenda komen uit `bar/bar.css` (`hf-bar-place`, `hf-bar-table` en `hf-bar-legend`).
  - **De getallen** zijn dezelfde als voor de omslag: `ClubSummary` en `Tally` in `src/opponents.ts` veranderen niet.
    De tests van de pagina van een club laten zien dat Totaal de som is van Thuis en Uit, en dat G gelijk is aan W + GL + V in elke rij.
  - **Wat blijft:** de afbeeldingsknop, de grootste overwinning en nederlaag en de zin "Gebaseerd op …".
- **Waarom:** een rij per plek leest als de tabel in Stand, en past beter op een smalle kolom dan zes rijen met drie kolommen.
  Het totaal staat onderaan, zoals de som onder een rij getallen.
  De kleuren laten in één oogopslag zien hoe het ging, en de punten staan erbij omdat supporters die in de Eredivisie willen zien.
  Eén kolom voor het doelsaldo houdt de tabel smal, genoeg voor een telefoon.
  `StandingsTable` is gebouwd rond een plaats, een club en punten met een balk, en heeft een eigen rij voor sc Heerenveen: daar zijn de rijen en kolommen van deze tabel niets mee gemeen.
  Een algemene `StandingsTable` zou kolommen, rijen, balken en markering als eigenschappen krijgen, en dat is meer dan twee tabellen vragen.
  Een eigen component houdt elk van de twee eenvoudig en laat ze er toch hetzelfde uitzien, doordat ze de stijlen delen.
- **Nadeel:** het doelsaldo laat niet zien hoeveel doelpunten we maakten en kregen.
  De gedeelde klassen heten `hf-bar-*`, ook al heeft deze tabel geen balk.
  Een wijziging aan de stijl van de ene tabel kan de andere raken.
- **Alternatieven:** de tabel laten zoals hij is; alleen Thuis en Uit als rijen (dan ontbreekt het totaal); `DataTable` met andere koppen (dan lijken de twee tabellen niet op elkaar); `StandingsTable` algemener maken (zie _Waarom_); Totaal als eerste rij (de projecteigenaar wilde het onderaan); DV en DT los houden (de projecteigenaar koos één kolom).
- **Later:** zie _Alle tabellen gebruiken één stel afkortingen voor hun kolommen_.
  De kolommen zijn nu G, W, G, V, P en S in plaats van G, W, L, V, P en D, met de woorden winst en verlies.
- **Later:** zie _In een tabel is vet voor het kerngetal, niet voor onze club of een achternaam_.
  De punten en het totaal hebben het gewicht van het kerngetal; de rij met het totaal houdt zijn dikkere lijn.

## De kaart Wedstrijden op de pagina van een club heeft een rij met de laatste vijf uitslagen

- **Datum:** 2 november 2026
- **Besluit:** de kaart Wedstrijden op de pagina van een club heeft direct onder de kop een `MarkRow` met de laatste vijf uitslagen tegen die club, boven de lijst (#629).
  - **De naam** is "Laatste wedstrijden", zoals bij de kaart Reeksen.
  - **De wedstrijden** zijn dezelfde als in de lijst eronder: gespeeld, met een score, in de gekozen competitie.
    De schakelaar Eredivisie/Alle wedstrijden verandert dus de rij mee.
    De letters zijn W, G en V vanuit sc Heerenveen, naar de score na verlenging (`lastResultsOf` in `src/opponents.ts`, met dezelfde telling als `tallyOf`).
    De oudste staat links en de nieuwste achteraan, zoals bij elke `MarkRow`; de lijst eronder staat nieuwste eerst, dus de twee lopen tegengesteld.
  - **Minder dan vijf:** er is geen rij.
    Bij de keuze Eredivisie kan een rij verdwijnen die bij Alle wedstrijden wel staat.
  - **De vertaling** van een uitslag naar letter, woord en toon (`markOf`) staat in `MatchViews.tsx` en wordt daar ook gebruikt door de kaart Reeksen.
- **Waarom:** wie wil weten hoe het de laatste keren tegen een club ging, hoeft de regels dan niet te lezen.
  Eén naam voor hetzelfde ding, en "Laatste wedstrijden" klopt ook als er minder dan vijf zijn gespeeld.
  De rij en de lijst vertellen hetzelfde verhaal, en de volgorde van de letters is overal gelijk.
  Een half gevulde rij leest als een gat, en een club die we zelden troffen toont dan geen rij die niets zegt.
  De rij vat de lijst eronder samen, en het extra ruimte onder een `MarkRow` bestaat al.
- **Alternatieven:** "Laatste uitslagen" (wijkt af van Reeksen) of "Laatste vijf" (fout bij minder dan vijf) als naam; de nieuwste links, zoals de lijst (wijkt af van elke andere `MarkRow`); tonen wat er is, een tot vier letters (dat doet Reeksen, maar dan toont een zelden getroffen club een rij die niets zegt); de rij onder de lijst (na tientallen regels, ver weg) of in de kaart "Onze uitslagen tegen …" (de wens noemt de kaart Wedstrijden).

## De lijst met tegenstanders sorteert op het doelsaldo en heeft altijd een kolom Punten

- **Datum:** 2 november 2026
- **Besluit:** de lijst op `/statistieken/tegenstanders` heeft de kolommen Club, G, W, G, V, P en D, bij Alle wedstrijden en bij Eredivisie (#640).
  - **D is het doelsaldo.**
    De cel toont het saldo met een teken (`+18`, `−2`, `0`) en de kolom sorteert op het getal.
    De eerste klik zet het hoogste saldo bovenaan.
    De kolom met "voor–tegen" en de sortering op de doelpunten voor zijn vervallen; de uitslagen staan nog op de pagina van de club.
  - **P telt alle wedstrijden die de lijst telt.**
    Bij Alle wedstrijden telt de beker mee: 3 punten per winst en 1 per gelijkspel, ook als een gelijkspel in de beker daarna werd beslist.
    `pointsOf` rekent het uit, op één plek.
    **Later:** zie _Een wedstrijd die we op strafschoppen winnen, telt overal als winst_ (7 november 2026) in `site.md`: een wedstrijd die we op strafschoppen winnen is een winst en geeft 3 punten, en een die we zo verliezen geeft er 0.
  - **De regel onder de tabel** zegt "P punten (3 per winst, 1 per gelijkspel)", omdat dit geen stand is en P hier iets anders kan lijken.
  - **De rijen Punten** op de pagina van een club (#406) blijven zoals ze zijn.
- **Waarom:** de projecteigenaar zoekt de club waartegen we het best deden, en daarvoor zijn de punten en het saldo de maat.
  Sorteren op de doelpunten voor zette Sparta bovenaan, een club waartegen we veel scoorden en veel kregen.
  Zonder de beker mist de helft van de wedstrijden bij Alle wedstrijden.
  Een kolom die D heet en op het saldo sorteert, zou liegen, want een schermlezer hoort "doelpunten".
- **Nadeel:** de lijst toont niet meer hoeveel doelpunten we maakten en kregen tegen een club.
- **Alternatieven:** P alleen bij Eredivisie (de enige maat voor "best" verdwijnt bij de standaardkeuze); D met "voor–tegen" laten staan en op het saldo sorteren (de kop liegt); een kolom voor de doelpunten én een voor het saldo (acht kolommen passen niet op 320 pixels); sorteren op de doelpunten voor houden.
- **Later:** zie _Een tabel sorteert op een kolom met knoppen in de koppen, die er alleen met JavaScript zijn_ (31 oktober 2026): de beslissingen "Doelpunten sorteert op de doelpunten voor" en "Bij Alle wedstrijden is er geen kolom Punten" gelden niet meer.

## In de tabellen met de uitslagen van de club is het doelsaldo D, en staat P vóór D

- **Datum:** 2 november 2026
- **Besluit:** in `tableColumns` is het doelsaldo **D** en niet S, en P staat in elke tabel vóór D (#640).
  - **D heeft twee woorden:** doelsaldo in de tabellen met de uitslagen van de club, doelpunten in de tabellen van de spelers (`TopScorersTable`).
    Geen tabel heeft beide.
    De naam voor een schermlezer blijft het hele woord, "doelsaldo", en een sorteerknop heet "D doelsaldo".
  - **DV, DT en DS** komen alleen als een tabel de doelpunten voor, tegen en het saldo tegelijk toont.
    Geen tabel doet dat nu, dus ze zijn er niet.
  - **De volgorde:** P staat vóór D.
    De punten zijn de eerste maatstaf, het doelsaldo de tweede, zoals in elke stand.
    De regel staat in de documentatie van `tableColumns`, en een test legt de volgorde vast van de lijst met tegenstanders, `RecordTable`, `StandingsTable` en de tabellen over het verloop.
  - **`RecordTable`, `DataTable` in de lijst van tegenstanders en de verhalen** nemen D uit `tableColumns`; `signedNumber` schrijft het saldo met een teken.
- **Waarom:** de projecteigenaar verwacht in een tabel met uitslagen nooit twee soorten D, en D is het doelsaldo of de doelpunten zoals G gespeeld of gelijk is.
  Eén letter per maat houdt de tabellen gelijk, en een tweede soort D komt niet in dezelfde tabel voor.
  Het saldo vraagt geen eigen letter als geen tabel het naast de doelpunten toont.
- **Nadeel:** D heeft twee woorden, naast G.
  Alleen de tabel en de regel eronder maken het verschil voor wie ziet.
  Een tabel die ooit doelpunten én saldo toont, heeft nieuwe letters nodig.
- **Alternatieven:** S voor het doelsaldo houden (de projecteigenaar wilde D); DS voor het saldo nu al (geen tabel toont de doelpunten ernaast); de volgorde per tabel laten kiezen (dan komt de fout terug).

## Een afgelopen seizoen toont zijn uitslagen in een kaart per competitie

- **Datum:** 2 november 2026
- **Besluit:** op de pagina van een afgelopen seizoen is de kaart Uitslagen verdeeld in een kaart per competitie met wedstrijden: Eredivisie, KNVB Beker en Play-offs Conference League, in die volgorde (#658).
  De kop is de naam van de competitie, zonder het woord Uitslagen.
  De projecteigenaar koos dit op 3 november 2026; de specificatie had "Uitslagen Eredivisie".
  Binnen een kaart blijft de volgorde van oud naar nieuw, de regel noemt de competitie niet meer en elke kaart heeft zijn eigen legenda.
  De balk "Op deze pagina:" heeft een link per kaart.
  Het lopende seizoen blijft één kaart, nieuwste eerst, met de competitie in de regel.
  - **De koppen en de ankers:** de ankers houden het woord uitslagen, ook al staat het niet in de kop: `uitslagen` voor de Eredivisie, zodat een oude link blijft werken, `uitslagen-knvb-beker` en `uitslagen-play-offs`.
    Een competitie zonder wedstrijden heeft geen kaart; een afgelopen seizoen zonder wedstrijden houdt één kaart "Uitslagen" (anker `uitslagen`) met zijn zin.
  - **De link "Het verloop van het seizoen"** staat in de kaart Eredivisie, want de kaart met cijfers telt die competitie.
  - **In de code:** `resultsPerCompetition` in `src/matches.ts` verdeelt de uitslagen, `resultsCardOf` en `resultsCardsOf` in `src/matchShortcuts.ts` geven de naam en het anker, en de pagina en de balk lezen ze allebei daar.
    `Match` laat de competitie weg als `competition` ontbreekt, en `MatchLines` heeft daarvoor `withCompetition`.
- **Waarom:** wie een afgelopen seizoen bekijkt, zoekt de competitie of de beker apart; de volgorde in de tijd doet er daar minder toe.
  Een kaart per competitie is op de pagina mooier dan koppen binnen één lange kaart, en de balk volgt de kaarten zoals hij dat voor Stand, Eindstand en Hoofdtrainer al doet.
  Het lopende seizoen volgt het nieuws, dus daar blijft de volgorde in de tijd.
- **Alternatieven:** één kaart met een kop van niveau 3 per competitie (de balk blijft dan gelijk, maar de pagina is minder mooi).
  Subpagina's per competitie (een menu dat van de pagina afhangt).
  Een schakelaar tussen "Per competitie" en "In de tijd" (meer bediening voor een kleine behoefte).
  De competitie in de regel laten staan (die staat dan tientallen keren onder een kop die haar al noemt, ook voor een schermlezer).
- **Later:** zie _Het lopende seizoen toont zijn uitslagen ook in een kaart per competitie_ (3 november 2026): het lopende seizoen blijft geen kaart, maar krijgt ook een kaart per competitie, met de nieuwste uitslag bovenaan en een regel die de competitie niet noemt.
  Programma blijft één kaart met alle competities.
- **Later:** zie _De play-offs voor de Europa League zijn een eigen competitie, naast die voor de Conference League_ (3 november 2026): een seizoen van vóór 2020/21 heeft een kaart Play-offs Europa League (anker `uitslagen-play-offs-europa-league`) waar een ander seizoen Play-offs Conference League heeft.

## Het lopende seizoen toont zijn uitslagen ook in een kaart per competitie

- **Datum:** 3 november 2026
- **Besluit:** op `/wedstrijden` is de kaart Uitslagen van het lopende seizoen verdeeld in een kaart per competitie met een uitslag, zoals die van een afgelopen seizoen: Eredivisie, KNVB Beker en Play-offs Conference League, met dezelfde koppen en ankers en een eigen legenda per kaart (#665).
  Binnen een kaart staat de nieuwste uitslag bovenaan, want het lopende seizoen volgt het nieuws; een afgelopen seizoen blijft van oud naar nieuw.
  Een competitie krijgt een kaart bij haar eerste uitslag.
  Zonder uitslagen is er één kaart "Uitslagen" met zijn zin.
  - **Programma** blijft één kaart met alle competities op datum, met de competitie in elke regel.
  - **De balk "Op deze pagina:"** heeft een link per kaart (Programma, de kaarten met uitslagen, Stand, Hoe vaak welke uitslag, Hoofdtrainer).
    **Later:** de link naar Hoe vaak welke uitslag staat sinds 6 november 2026 in de balk van Cijfers (zie _Een kaart die een telling van meer wedstrijden is, staat op Cijfers, en de schakelaar staat bovenaan de hoofdkolom_ in `site.md`).
    Het anker `uitslagen` zit op de kaart Eredivisie, en daar staat ook de link "Het verloop van het seizoen".
  - **In de code:** `resultsPerCompetition` en `resultsCardsOf` kennen het lopende seizoen niet meer apart; `resultsOfSeason` bepaalt alleen de volgorde.
    De ankers `uitslagen-knvb-beker` en `uitslagen-play-offs` staan nu ook voor `/wedstrijden` in `src/anchors.ts`.
- **Waarom:** wie de beker of de competitie zoekt, vindt ze apart, en het lopende seizoen werkt nu net als een afgelopen seizoen.
- **Alternatieven:** één kaart houden voor het lopende seizoen (twee soorten pagina's); vijf uitslagen per kaart nu al (dat is #516, dat later komt en dan opnieuw bekeken wordt voor kaarten per competitie).

## De tekst van een artikel wordt bewaard als Tiptap's JSON, met een lijst van wat mag

- **Datum:** 27 oktober 2026
- **Besluit:** de tekst van een artikel wordt bewaard als Tiptap's JSON, gecontroleerd tegen een lijst met toegestane onderdelen, en door een eigen functie omgezet naar componenten.
  Er komt geen HTML in de database en niet in de sjablonen.
- **Waarom:** de editor werkt in JSON, dus er is geen vertaalslag die kan misgaan, en er is ruimte voor foto's en tabellen later.
  De lijst met toegestane onderdelen houdt de veiligheid van de oude opmaak.
- **Alternatieven:** de oude opmaak houden en Tiptap erin en eruit omzetten (geen migratie, maar een vertaling die een artikel kan veranderen en twee formaten om te onderhouden); HTML bewaren (vraagt een schoonmaker en `dangerouslySetInnerHTML`, en keert _Sjablonen bevatten geen HTML_ om).
- **Hoe (4 november 2026):**
  - `readArticleDocument` in `packages/shared/src/article-document.ts` controleert de JSON bij elke opslag, en bouwt het document opnieuw op uit wat op de lijst staat.
    De lijst: alinea, kop van niveau 2, lijst met bolletjes (elk punt één alinea), en de tekens vet, cursief en link.
    Een ander onderdeel, een ander teken, een kenmerk dat niet op de lijst staat, een tweede lijst in een lijst en een link naar iets anders dan `https://` of `/` weigert de functie.
    Omdat de vorm vastligt, wordt een document nooit dieper dan een punt in een lijst, en een diepe nesting wordt bij het eerste onderdeel geweigerd.
  - Wat de functie teruggeeft is de tekst om te bewaren, met de sleutels in de volgorde van Tiptap, zodat dezelfde tekst altijd dezelfde string is en opslaan zonder wijziging geen nieuwe versie maakt.
    Een besturingsteken wordt een spatie, en een stukje tekst zonder tekens valt weg.
  - De grens van 20.000 tekens telt de zichtbare tekst (`textLength`).
    De JSON zelf mag hoogstens 1.000.000 tekens zijn (`articleJsonMaxLength`): een tekst van 20.000 tekens met overal een teken van opmaak is zo'n 420.000 tekens JSON, dus dat past ruim.
  - Een weigering komt terug bij het veld `tekst`, in woorden die zeggen wat te doen, met de ingevulde tekst terug in het formulier.
    Alleen iets anders dan de editor kan een onderdeel of een JSON sturen die niet klopt, dus die fouten zeggen niet meer dan wat er mis is.
  - `ArticleText` leest de JSON met dezelfde functie en toont niets bij een tekst die niet klopt, zoals een tekst die met SQL in de database kwam.
    Onderdelen die hetzelfde teken delen gaan in één element, zoals de editor ze schrijft: `<strong>a <em>b</em> c</strong>` en niet drie `strong`.
  - Het adres van een link is strenger dan dat van de editor (`safeAddress`): ook een adres met een inlog, een backslash of een aanhalingsteken wordt geweigerd, zoals de oude functie al deed.
- **Migratie:** `migrateArticleBodies` in `packages/db/src/article-body-migration.ts` zet de tekst van elk artikel en elke versie van de oude opmaak om in JSON, met `legacy-article-text.ts`, een kopie van de oude `parseArticleText`, als bron.
  Ze draait na de migraties van het schema, bij het starten van de site en bij `pnpm db:migrate`, en is te herhalen: een tekst die JSON van een document is, in welke vorm ook (ingesprongen, of met de sleutels in een andere volgorde), wordt in de vorm van de site gezet als de site hem accepteert, en blijft anders zoals hij is, dus hij wordt nooit een alinea met ruwe JSON.
  Alle rijen veranderen in één transactie en alleen als de rij nog de tekst heeft die gelezen is, dus een run die stopt laat niets half achter, en een opslag tussendoor wordt niet overschreven.
  Alleen `body` verandert: `updated_at`, de versies en de logregels blijven.
  Een test zet een artikel met elk onderdeel om en vergelijkt de pagina die een bezoeker ziet met wat de oude functie ervan maakte.
  `legacy-article-text.ts` kan weg zodra acceptatie en de echte site de migratie hebben gedraaid.
- **Nadeel:** een artikel dat met SQL in de database komt, moet nu JSON zijn (zie `docs/artikelen.md`).
  Van de oude opmaak kunnen versies van vóór de migratie niet meer terug naar die opmaak: de JSON is de enige vorm.

## Artikelen schrijven vraagt JavaScript, lezen niet

- **Datum:** 27 oktober 2026
- **Besluit:** artikelen schrijven vraagt JavaScript; lezen niet.
- **Waarom:** alleen een beheerder schrijft, achter de inlog, en een tekstvak naast de editor betekent twee formaten voor altijd.
  Een bezoeker leest nog steeds zonder JavaScript.
- **Alternatieven:** een tekstvak als terugval dat de server omzet naar JSON (houdt de oude opmaak en haar tekens in leven).
- **Later:** vervangt de eis dat het formulier van de artikelen ook zonder JavaScript werkt (#264).
  Alleen de editor vraagt JavaScript: de pagina's `/redactie/<adres>`, het voorbeeld en de pagina van een versie lezen zonder.

## De kaart Gemiddeld resultaat toont de top 10 van clubs met minstens 5 wedstrijden en volgt de schakelaar

- **Datum:** 4 november 2026
- **Besluit:** de kaart "Gemiddeld resultaat" op Tegenstanders toont de tien clubs waartegen sc Heerenveen gemiddeld de meeste punten per wedstrijd haalt (#699).
  - **Het gemiddelde** zijn de punten die wij tegen een club haalden (3 per winst, 1 per gelijkspel, 0 per verlies, de beker meegeteld), gedeeld door de gespeelde wedstrijden tegen die club.
    Het is dezelfde regel als de kolom Punten in "Alle tegenstanders" (`pointsOf`), op één plek in de code.
  - **Het minimum** is 5 gespeelde wedstrijden, en de kaart zegt het in de regel onder de tabel, samen met waarop hij rust: "Gebaseerd op alle 30 gespeelde wedstrijden sinds 2020/21, tegen clubs met minstens 5 gespeelde wedstrijden".
  - **De volgorde** gaat van het hoogste gemiddelde naar het laagste.
    Bij gelijke gemiddelden gaat de club met de meeste wedstrijden voor, daarna beslist de naam.
    De volgorde rekent met de echte verhouding van punten en wedstrijden (kruislings vermenigvuldigd), niet met het afgeronde getal, en elke club heeft een eigen plaats van 1 tot en met 10.
  - **Voldoen minder dan tien clubs** aan het minimum, dan toont de kaart die clubs.
    Voldoet er geen één, dan staat er één zin, "Nog geen club met minstens 5 gespeelde wedstrijden.", en geen lege tabel.
    De kaart blijft altijd zichtbaar.
  - **De schakelaar** van de pagina beslist: standaard alle gespeelde wedstrijden, met `?competitie=eredivisie` alleen de Eredivisie, en de clublinks houden de keuze.
  - **"Gebaseerd op"** telt de gespeelde wedstrijden van de clubs die meedoen, niet die van alle clubs, in de vorm van `BasedOnSince` met het minimum erachter (`condition`).
    De kop is "Gemiddeld resultaat" (de projecteigenaar, 4 november 2026): de kop zegt niet hoeveel clubs erin staan, en de tabel en het bijschrift zeggen dat het de top 10 is.
- **Waarom:** de kaart staat naast "Alle tegenstanders" en moet met die tabel kloppen, dus dezelfde punten en dezelfde wedstrijden.
  Een club die we één of twee keer troffen (twee winsten is 3,00) zou zonder minimum bovenaan staan.
  Vergelijken op de echte verhouding voorkomt dat twee clubs met 2,38 in de verkeerde volgorde staan.
  De kaart zegt het minimum en waarop hij rust, volgens _Statistieken komen als kaarten op Wedstrijden, voor de Eredivisie, met "Gebaseerd op"_.
- **Nadeel:** de kaart volgt de schakelaar, terwijl sommige kaarten op Statistieken altijd de Eredivisie tellen.
  Met de keuze Eredivisie kunnen minder clubs het minimum halen dan met alle wedstrijden, dus de kaart kan dan een zin zijn.
  Het gemiddelde zegt niets over wanneer de wedstrijden waren.
- **Alternatieven:** het gemiddelde van de tegenstander (leest als "de lastigste tegenstanders" en kan met deze kaart verward worden); geen minimum (de lijst bestaat dan uit clubs die we één keer troffen); een minimum van 3 (de aantallen blijven klein); altijd de Eredivisie (de kaart zou bij de keuze "alles" afwijken van de tabel ernaast); sorteren op het afgeronde gemiddelde (twee clubs met "2,38" staan dan op toeval).
- **Later:** zie _Statistieken komen als kaarten op Wedstrijden, voor de Eredivisie, met "Gebaseerd op"_ (#397): deze kaart telt in "Gebaseerd op" alleen de wedstrijden van de clubs die meedoen, en volgt de schakelaar in plaats van altijd de Eredivisie te tellen.
- **Later:** zie _De kaart Het moeilijkst toont de vijf clubs met de minste punten, vanaf 10 clubs_ (9 november 2026): onder deze kaart staat sindsdien een tweede kaart met de andere kant van dezelfde lijst, en die komt er alleen als minstens 10 clubs aan het minimum voldoen.

## De pagina van een club heeft een kaart met doelpuntenmakers, vanaf 5 wedstrijden

- **Datum:** 4 november 2026
- **Besluit:** de pagina van een club krijgt een kaart "Doelpuntenmakers tegen <club>" met de top 5 doelpuntenmakers van sc Heerenveen tegen die club (met gelijkstaanden), uit dezelfde telling als de kaart op Wedstrijden (#703).
  De kaart staat er alleen als we minstens 5 gespeelde wedstrijden met een uitslag tegen de club hebben, in alle competities samen.
  De lijst zelf volgt de schakelaar Eredivisie/Alle wedstrijden.
  De regel onder de kaart is dezelfde als op Wedstrijden: "Gebaseerd op …" alleen bij onvolledige gegevens.
- **Waarom:** een supporter wil weten wie er tegen deze club scoort, en de gegevens en de weergave bestaan al.
  Bij een of twee wedstrijden zegt zo'n lijst weinig, en een kaart met één naam is vooral leeg; vanaf 5 wedstrijden is er een lijst om naar te kijken.
  De drempel telt alle wedstrijden en niet die van de schakelaar, zodat een kaart niet verdwijnt omdat de lezer naar de Eredivisie schakelt; de lijst zelf volgt de schakelaar, net als de rest van de pagina.
  Een top 5 met gelijkstaanden is wat Statistieken al toont, en past in een smalle zijkolom.
  De regel over onvolledige gegevens blijft, want een lijst waarin spelers ontbreken, mag niemand voor volledig houden.
- **Nadeel:** de kaart is er bij sommige clubs niet, zonder zin die zegt waarom.
  En met de schakelaar op "Eredivisie" kan de kaart er zijn terwijl de lijst uit minder dan 5 wedstrijden komt, of leeg is.
- **Alternatieven:** de drempel volgens de schakelaar (de kaart verdwijnt bij het schakelen); een zin bij minder dan 5 wedstrijden in plaats van niets (past bij #397, maar zet een zin op elke pagina van een club met weinig wedstrijden); een top 10 of alle spelers die scoorden (een lange kaart in de zijkolom); altijd het aantal zonder "Gebaseerd op" (de lezer ziet dan niet dat de lijst onvolledig kan zijn).
- **Later:** zie _Statistieken komen als kaarten op Wedstrijden, voor de Eredivisie, met "Gebaseerd op"_ (#397): de regel "een kaart blijft zichtbaar bij weinig wedstrijden" geldt niet voor deze kaart; die is er pas bij minstens 5 wedstrijden tegen de club.

## Een klik op een schakelaar telt niet als paginaweergave

- **Datum:** 4 november 2026
- **Besluit:** de teller telt alleen een aanvraag van een hele pagina, en een klik op een schakelaar met JavaScript (`SwitchLinks`, zie _De schakelaars wisselen met JavaScript in de pagina, en de links blijven de terugval_ in `site.md`) is dat niet.
  De router van Next.js vraagt de gegevens van de pagina op de achtergrond, zonder `Accept: text/html`, dus `visitOf` telt het niet.
  Het openen van hetzelfde adres in een nieuw tabblad, of een klik zonder JavaScript, is een aanvraag voor HTML en telt wel.
  De site krijgt nog steeds geen `next/link`: de test in `src/visits.test.ts` die `from 'next/link'` verbiedt, blijft.
- **Waarom:** een schakelaar verandert de weergave van een pagina die al open is, en er komt geen nieuwe pagina bij.
  Tot nu toe telde elke klik als weergave, en dat maakt de tellingen iets te hoog.
- **Gemeten:** `src/visits.test.ts` toont dat dezelfde plaats met `Accept: */*` en `Accept: text/x-component` niet telt en met `Accept: text/html` wel, en `e2e/switches.spec.ts` ziet bij elke schakelaar dat de klik geen aanvraag van een document en geen aanvraag met `text/html` doet.
- **Alternatieven:** elke klik toch laten tellen met een extra aanvraag vanuit de browser (een eigen route en een script voor de teller, wat het besluit _De proxy telt, na het antwoord, alleen een aanvraag van een pagina_ juist uitsloot).

## Verloop van het seizoen heeft een tooltip bij de lijn en een tabel per speelronde in een uitklapper

- **Datum:** 5 november 2026
- **Besluit:** alleen de kaart "Verloop van het seizoen" (`FormChart`) geeft de lijn een tooltip met het gemiddelde op dat punt, bijvoorbeeld "1,8" (#726).
  Onder de tabel met de totalen staat een uitklapper (`Disclosure`, dicht) "Uitslag en gemiddelde per speelronde", met een tabel per gespeelde speelronde: de speelronde, de uitslag (winst, gelijk of verlies), de punten en het gemiddelde over de laatste 5 wedstrijden.
  De tabel gebruikt `averagesOf` en `formatAverage` van het designsysteem, dezelfde getallen als de lijn en de tooltip.
  De kolommen heten Ronde, Uitslag, Punten en Gem. (voor een schermlezer: Gemiddelde), met een regel eronder die ze uitlegt: met "Speelronde" en "Gemiddelde" werd de pagina op 320 pixels breder dan het scherm.
  De tabel met de totalen en de zin onder de grafiek blijven (die zin staat nu in de regel van de sleutel, zie _De uitleg van de lijn staat in de regel van de sleutel_ in `designsysteem.md`).
  De speelronde is de plek in de rij gespeelde wedstrijden van de Eredivisie, zoals de as van de grafiek (een uitgestelde wedstrijd staat waar hij gespeeld is).
- **Waarom:** de grafiek is voor een schermlezer verborgen en heeft geen toetsenbord, dus de waarde per speelronde moet ook als tekst te lezen zijn.
  Er is nu één grafiek met een lijn; de volgende (#411, #413) kiest zelf zijn labels.
- **Let op:** de lijn begint sinds #718 bij de eerste wedstrijd (zie _`BarChart` is standaard 4 rem hoog, en de lijn begint bij de eerste wedstrijd_ in `designsysteem.md`), dus elke gespeelde speelronde heeft een punt, een gemiddelde en een regel in de tabel.
  Alleen een plek die nog niet gespeeld is, heeft geen punt en geen tooltip.
  Het "nog niet" voor de eerste vier speelrondes uit het issue komt daarom nergens voor.
- **Alternatieven:** de andere grafieken nu al noemen (ze bestaan nog niet); de tabel boven de uitklapper laten staan zonder uitklapper (een kaart met een tabel van 34 rijen).

## De pagina van een club toont de nieuwste vijf koppen die de club noemen

- **Datum:** 6 november 2026
- **Besluit:** de kaart "Nieuws over <club>" (#777) toont hoogstens vijf koppen, zonder inleiding of foto, uit `item_clubs`, zonder leeftijdsgrens en zonder knop voor een afbeelding.
  Het zijn dezelfde koppen als op de homepage, via `NewsItem`: de kop als link, de bron en de tijd.
  De kaart staat in de zijkolom na de kaarten met cijfers en vóór het stadion, op het zachte vlak, met het anker `#nieuws` in de balk "Op deze pagina".
  Een club zonder koppen heeft de kaart niet, en er staat geen zin voor.
  Een kop die meer clubs noemt, staat bij elke club die hij noemt.
  De koppen worden gezocht onder alle namen van de club (`clubNamesOf`), dus ook onder een oude naam.
- **Waarom:** de bezoeker die een club bekijkt, wil weten wat er over die club geschreven wordt, en de kop, de bron en de link zijn wat we van anderen mogen tonen.
  Een leeftijdsgrens zou de kaart bij kleine clubs leeg laten.
- **Nadeel:** tot de koppen van vóór #794 hun rijen hebben (`pnpm run import:item-clubs`), toont een club alleen de koppen van daarna.
  En een kop die een club alleen bij een bijnaam noemt die niet in onze lijst met namen staat, telt niet.
- **Alternatieven:** alleen koppen in de week van een wedstrijd (te weinig).
  Zoeken op titel (zie #794).
  Een link naar alle nieuws over de club (Zoeken kan er niet op filteren).
- **Later:** dit past bij _Een kaart staat op de pagina van de zaak die hij beschrijft, en de hoofd- en zijkolom hebben vaste rollen_ (`site.md`) met een uitzondering: de zijkolom van een club heeft hier een lijst met links in plaats van cijfers.

## Wat we overtypen zijn feiten, nooit tekst

- **Datum:** 7 november 2026
- **Besluit:** het hoofdstuk Redactie en de checklist van de reviewer krijgen een stuk "Eigen administratie van wedstrijden" (#831).
  We typen over wie speelde, wanneer en wat er gebeurde, als feiten die iemand kan narekenen.
  Nooit de tekst, de zinnen of de beoordelingen van een verslag van een journalist, ook niet in eigen woorden, en geen hele tabellen van een site met statistieken (het databankrecht).
  De bron noemen we op de pagina: "eigen administratie", en als het verslag een bron heeft, die erachter.
  Wat Wikipedia ook heeft, houdt de bronvermelding van Wikipedia.
  De pagina laat geen foto's of afbeeldingen van derden zien en laadt niets van een ander domein.
- **Waarom:** feiten zijn van iedereen, tekst en samengestelde databanken niet.
  Dat de site een eigen gegevensbron heeft, mag niet betekenen dat hij andermans werk kopieert.
- **Alternatieven:** niets overtypen en wachten tot een bron de gegevens geeft (de minuten, de opstelling en de kaarten bestaan nergens in een vorm die we mogen overnemen); de verslagen van journalisten samenvatten (het werk van een ander, en de lezer gaat dan niet naar de journalist).
- **Later:** dit werkt principe 4 (altijd de bron vermelden) uit voor gegevens die we zelf bijhouden: de bron is dan "eigen administratie", met de bron van het verslag erachter.

## Een strafschop heet strafschop of str., nooit pen. of penalty

- **Datum:** 8 november 2026
- **Besluit:** de site schrijft "strafschop" en kort "str.", nooit "pen." of "penalty".
  Dat geldt voor de legenda onder een lijst wedstrijden, de regel met doelpuntenmakers van `Match` en de uitleg voor een schermlezer.
  Het plakscherm van het beheer leest "strafschop" (met of zonder hoofdletter) en blijft "penalty" lezen.
  De importer blijft `pen.` lezen.
- **Waarom:** supporters zeggen strafschop, en de kop van een wedstrijd en het verloop schrijven het al zo.
  Wikipedia en de oude bestanden schrijven `pen.`, en wat we importeren moeten we kunnen blijven lezen.
  Wat een redacteur al met "penalty" plakte, mag niet stukgaan.
- **Alternatieven:** "pen." en "penalty" laten staan, zoals het was; ook de importer en het plakscherm alleen "strafschop" laten lezen, wat bestanden en gewoonten breekt; "pen." en "str." allebei toestaan, wat twee afkortingen voor één ding geeft.

## De kaart Het moeilijkst toont de vijf clubs met de minste punten, vanaf 10 clubs

- **Datum:** 9 november 2026
- **Besluit:** de zijkolom van Tegenstanders krijgt onder "Gemiddeld resultaat" een eigen zachte kaart "Het moeilijkst" met de vijf clubs waartegen sc Heerenveen gemiddeld de minste punten per wedstrijd haalt (#787).
  - **De clubs:** alleen clubs met minstens 5 gespeelde wedstrijden, de laagste punten per wedstrijd eerst.
    Bij gelijke verhouding (kruislings vermenigvuldigd, zoals bij de top 10) gaat de club met de meeste wedstrijden voor, daarna beslist de naam.
    Elke club heeft een eigen plaats, 1 tot en met 5.
  - **De tabel** heeft dezelfde kolommen als de top 10: plaats, club (een link die de keuze van de schakelaar houdt), P en G.
    Het bijschrift zegt dat het onze punten per wedstrijd zijn, van laag naar hoog, zodat de kaart niet gelezen wordt als het gemiddelde van de tegenstander.
    Onder de tabel staan dezelfde legenda en dezelfde regel "Gebaseerd op" (`BasedOnSince`) als bij de top 10, met de wedstrijden van de clubs die meedoen.
  - **De kaart staat er alleen als minstens 10 clubs aan het minimum voldoen.**
    Met minder dan 10 clubs staat de top 10 alleen, zoals eerder.
  - **De schakelaar** beslist, zoals bij de top 10 (`?competitie=eredivisie`).
- **Waarom:** de top 10 laat alleen de goede kant zien, en voor supporters is "tegen wie gaat het slecht?" een even natuurlijke vraag.
  Een eigen kaart houdt twee ranglijsten met elk hun bijschrift en "Gebaseerd op" overzichtelijk.
  Vijf clubs is genoeg voor een lijst naast de tien, en drie ziet er dun uit.
- **Nadeel:** met de keuze Eredivisie kunnen minder dan 10 clubs het minimum halen, dan ontbreekt de kaart.
  De zijkolom wordt langer, en op een telefoon staat hij onder de top 10.
  Met 10 tot en met 14 clubs staat een club nog in allebei de lijsten (bij 10 clubs staan alle tien in de top 10); pas vanaf 15 clubs zijn de lijsten gescheiden.
- **Alternatieven:** beide lijsten in één kaart (twee tabellen, twee bijschriften, één "Gebaseerd op" die voor beide niet klopt); drie clubs (dun naast tien); de kaart ook tonen met minder dan 10 clubs; "Lastigste tegenstanders" als kop (leest als het gemiddelde van de tegenstander).

## De zin onder een kaart met cijfers zegt alleen waarop de telling rust

- **Datum:** 9 november 2026
- **Besluit:** de zin onder een kaart met een telling begint niet meer met "Gebaseerd op" (#494).
  Hij zegt alleen waarop de telling rust: "Alle 7 gespeelde wedstrijden", "1 gespeelde wedstrijd" of "6 van de 7 gespeelde wedstrijden".
  De eigen zinnen volgen dezelfde vorm: "Vroegste en laatste doelpunt: 6 van de 7 gespeelde wedstrijden", "Stand na 34 wedstrijden" en "De doelpuntenmakers van 6 van de 7 gespeelde wedstrijden".
  De kaarten van de tegenstanders houden hun "sinds …" en "in de Eredivisie".
  De zin staat nog op dezelfde plek in de kaart en blijft op elke kaart met een telling, en de zin over wat de telling buiten beschouwing laat staat direct erna.
  Het aantal in de zin is hetzelfde als eerst.
- **Waarom:** het voorvoegsel voegt niets toe: een aantal wedstrijden onder een kaart leest al als de grondslag.
  Een kortere regel kost minder ruimte, vooral op een telefoon.
- **Alternatieven:** "Gebaseerd op" laten staan; "Op basis van" of "Telt" als voorvoegsel (zelfde opvulling); de zin weglaten (dan staat het aantal nergens).
- **Later:** de regel in het hoofdstuk Redactie van Storybook (`editorial.mdx`) noemt nu "de zin over het aantal wedstrijden".

## De kaart heet "Verloop op de ranglijst" en toont de hoogste en laagste plek als lijst

- **Datum:** 9 november 2026
- **Besluit:** de kaart "Onze plek per speelronde" heet "Verloop op de ranglijst" (#991), met het anker `#verloop-op-de-ranglijst`.
  De hoogste en laagste plek staan als lijst boven de uitklapper, met een derde regel "Totaal verschoven: N plekken", de som van de verschillen in plek van ronde tot ronde.
  - **De lijst:** "Hoogste: plek 2, ronde 6 t/m 7 en 10 t/m 14", "Laagste: plek 11, ronde 20" en "Totaal verschoven: 23 plekken".
    Een open ronde breekt een reeks, maar niet het totaal: tussen twee volledige rondes met een open ronde ertussen telt het verschil tussen die twee.
    Hadden we na elke ronde dezelfde plek, dan staat er één regel, "Plek: 3, alle rondes".
  - **De tabel:** de uitklapper heet nog "Plek per speelronde", heeft geen inleiding meer en toont Ronde, # en P.
    De kopjes hebben een verborgen volledige naam ("plek", "punten"), zodat een schermlezer ze ook op een aanraakscherm goed zegt.
  - **De lijn:** de x-as heeft een streepje met een getal bij ronde 5, 10, 15, 20, 25 en 30.
    De tooltip zegt "Ronde 12: **plek 4**" met alleen de plek vet, zonder de punten.
    Daarvoor kan het label van `BarChart.Trend` nu ook een stukje opmaak zijn (`ReactNode`), en heeft `axis` de optie `marks`.
- **Waarom:** de zin met de hoogste en de laagste plek was lang en stond verstopt.
  Een lijst leest in één blik.
  "Totaal verschoven" is een gewoon woord voor het verloop van de plek en laat zien hoe onrustig een seizoen was, wat het gemiddelde niet doet.
  "#" en "P" houden de tabel smal op een telefoon; de volledige namen staan voor de schermlezer en in het onderschrift.
  Het streepje per 5 rondes laat de as rustig lezen.
- **Alternatieven:** "Bewogen: N keer van plek veranderd" (telt niet hoe ver); "Ruimte: 9 plekken" (staat al in de twee regels erboven); het gemiddelde (zegt niets over beweging); twee kolommen met plek en ronde in één cel (een schermlezer noemt de cel dan niet goed).
- **Later:** vervangt de naam, het anker en de zin boven de tabel uit _De plek per speelronde staat op Wedstrijden, onder de stand_ in `site.md`.

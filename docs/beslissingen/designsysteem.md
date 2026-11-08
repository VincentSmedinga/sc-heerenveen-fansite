# Designsysteem

## Werkruimte met één package

- **Datum:** 20 oktober 2026
- **Besluit:** een pnpm 12-werkruimte op Node 24, met voorlopig één package: `packages/design-system`, met de naam `@fansite/design-system`.
  De naam is voorlopig.
- **Waarom:** het designsysteem kan nu al beginnen, los van de site en de import.
  De andere packages komen erbij als de monorepo verder wordt opgezet.
- **Alternatieven:** meteen de hele monorepo opzetten.
  Dat is meer werk voordat er iets te zien is.
- **Later:** zie _Packages komen met het issue dat ze nodig heeft_.

## TypeScript 6 in plaats van 7

- **Datum:** 20 oktober 2026
- **Besluit:** we gebruiken TypeScript 6.0, niet de nieuwe TypeScript 7.
- **Waarom:** TypeScript 7 is een nieuwe compiler, geschreven in Go, en heeft nog geen JavaScript-API. typescript-eslint (tot en met 6.0) en de documentatie-generator van Storybook hebben die API nodig.
  We stappen over zodra die tools TypeScript 7 ondersteunen.
- **Alternatieven:** TypeScript 7 alleen voor de typecontrole en TypeScript 6 voor de tools.
  Dat zijn twee compilers naast elkaar, voor weinig winst.

## Lettertypes uit de @fontsource-variable-packages

- **Datum:** 20 oktober 2026
- **Besluit:** Truculenta en Atkinson Hyperlegible Next komen uit `@fontsource-variable/truculenta` en `@fontsource-variable/atkinson-hyperlegible-next`.
  De `@font-face`-regels schrijven we zelf, met alleen de subsets latin en latin-ext.
- **Waarom:** de packages hebben alle assen die we nodig hebben (Truculenta: gewicht, breedte en optische grootte; Atkinson: gewicht en cursief), met de OFL-licentie erbij, en ze zijn bij te werken met pnpm.
  Met eigen regels heten de lettertypes gewoon Truculenta en Atkinson Hyperlegible Next, en laten we de Vietnamese subset weg.
  Latin dekt het Nederlands en het Fries; latin-ext (met onder meer Ĳ en ĳ) laadt de browser alleen als een pagina zo'n teken bevat.
  Er gaat geen verzoek naar een ander domein.
- **Alternatieven:** de CSS van fontsource zelf gebruiken (met de Vietnamese subset en namen als 'Truculenta Variable'), of de woff2-bestanden zelf in de repository zetten (bijwerken met de hand).
- **Let op:** de `url()` in `fonts.css` verwijst naar een pad in het package, zoals `@fontsource-variable/truculenta/files/…`.
  Vite lost dat op; bij de Next.js-app moeten we controleren of dat daar ook werkt.
- **Later:** zie _De lettertypes zijn kleiner gemaakt en laden zonder verspringen_ (7 november 2026): Truculenta komt niet meer rechtstreeks uit `@fontsource-variable/truculenta`, maar uit een eigen kleinere versie die uit dat bestand is gemaakt; Atkinson blijft uit zijn package komen.
  Het package van Truculenta blijft een dependency van het designsysteem, want de opdracht hieronder leest er het brondbestand uit.

## Licht en donker met light-dark()

- **Datum:** 20 oktober 2026
- **Besluit:** elk semantisch kleurtoken heeft één regel met beide waarden: `light-dark(licht, donker)`.
  Zonder keuze volgt de site de systeeminstelling.
  `data-theme="light"` of `data-theme="dark"` op het `html`-element kiest een thema, en werkt ook op een los element.
- **Waarom:** geen dubbele lijst van donkere waarden (één keer in een mediaquery en één keer voor `data-theme`).
  De documentatie kan licht en donker naast elkaar tonen.
  `light-dark()` werkt in alle gangbare browsers sinds 2024 (Chrome 123, Firefox 120, Safari 17.5).
- **Oudere browsers:** die krijgen via een `@supports`-blok alleen het lichte thema.
  De lichte waarden staan daardoor twee keer in `colour.css` en moeten gelijk blijven.
  Randen en focusranden nemen alleen hun kleur uit een token, zodat ze ook zonder token zichtbaar blijven, in de tekstkleur.
- **Alternatieven:** een apart blok met donkere waarden, twee keer herhaald.
  Werkt ook in oudere browsers, maar raakt makkelijk uit de pas.

## Voorvoegsel hf-

- **Datum:** 20 oktober 2026
- **Besluit:** klassen en custom properties beginnen met `hf-`, van Heerenveen Fansite: `.hf-heading-3`, `--hf-colour-text-default`.
  Cascade layers heten `hf.tokens`, `hf.base`, `hf.typography` en `hf.components`.
  Klassen die alleen in Storybook bestaan, beginnen met `_hf-docs-`.
  Stylelint controleert dit.
- **Waarom:** kort, herkenbaar als Heerenveen Fansite, en het botst niet met klassen van anderen.
- **Alternatieven:** `fs-` (fansite), dat we eerst voorlopig gebruikten, `shf-` (sc Heerenveen Fansite) en `hv-` (Heerenveen).
- **Later:** er is een vijfde laag, `hf.utilities`; zie _Hulpklassen zitten in de sterkste laag_.

## Lagen in de CSS

- **Datum:** 20 oktober 2026
- **Besluit:** alle CSS van het designsysteem zit in cascade layers, van zwak naar sterk: tokens, base (HTML-elementen), typography (typestijlen), components.
- **Waarom:** de volgorde bepaalt wat wint, niet de specificiteit.
  CSS van de site zelf, buiten een laag, wint altijd van het designsysteem.
- **Alternatieven:** geen lagen, en dan specificiteit en volgorde bewaken.
  Dat wordt lastiger naarmate er meer componenten zijn.
- **Later:** er is een vijfde laag, `hf.utilities`, na `hf.components`; zie _Hulpklassen zitten in de sterkste laag_.
- **Later:** de volgorde van de lagen staat in een eigen bestand; zie _De volgorde van de lagen staat in een eigen bestand_.
- **Later:** er is een zesde laag, `hf.flow`, tussen `hf.components` en `hf.utilities`; zie _De kaart of de cel bepaalt de verticale witruimte tussen wat erin staat_.

## Typestijl los van het HTML-niveau

- **Datum:** 20 oktober 2026
- **Besluit:** elke typestijl is een klasse (`.hf-heading-3`, `.hf-headline`, `.hf-meta`).
  Zonder klasse krijgen `h1` tot en met `h4` de stijl met hetzelfde nummer.
  `h5` krijgt voorlopig de nieuwskop en `h6` het label.
- **Waarom:** de kopstructuur volgt de inhoud, de stijl volgt het ontwerp.
  Een kaarttitel is een `h2` die eruitziet als kop 3.
- **Alternatieven:** `h5` en `h6` dezelfde stijl als `h4` geven.
  Dan zijn de niveaus niet van elkaar te onderscheiden.

## Mobiele lettergroottes

- **Datum:** 20 oktober 2026
- **Besluit:** kop 1 en kop 2 schalen mee met `clamp()`, van 360 tot 1280 pixels breed.
  Woordmerk, kop 3, kop 4 en nieuwskop springen één keer naar hun mobiele maat, onder 40 em (640 pixels).
  Dat breekpunt is voorlopig.
- **Waarom:** bij de grote koppen is het verschil groot genoeg om geleidelijk te schalen; bij de kleine is het 1 pixel.
- **Alternatieven:** alles met `clamp()`.
- **Later:** zie _Elke tekststijl een stap groter_ en _Kleinere koppen en vaste tekstmaten_.
  De maten zijn een stap groter; de nieuwskop springt op een smal scherm nu naar 19 pixels.

## Voorlopige kleurtokens

- **Datum:** 20 oktober 2026
- **Besluit:** deze waarden stonden niet in het afgesproken palet.
  Ze zijn voorlopig ingevuld en wachten op een besluit:
  - knoppen in donker: blauw-300 met tekst in blauw-950, net als de links in donker;
  - knop onder de muis: blauw-900 (licht) en blauw-200 (donker);
  - hover en zebrarijen in donker: blauw-950, de pagina, want tussen kaart (blauw-900) en pagina ligt geen stap meer;
  - link onder de muis in donker: blauw-200 (in licht blauw-800, zoals in het canvas);
  - bezochte link: grijs-600 (licht) en grijs-400 (donker), zodat je ziet wat je al hebt gelezen.
    Browsers staan voor bezochte links alleen een andere kleur toe, dus het verschil zit in kleur én helderheid;
  - rand van invoervelden: grijs-500 (licht) en blauw-400 (donker), omdat de gewone randkleuren de vereiste 3:1 voor velden niet halen.
- **Waarom:** de HTML-elementen hebben deze kleuren nodig.
  Alle tekst haalt ermee AA, lopende tekst AAA.
- **Uit het canvas overgenomen:** tekst in de header blauw-50 en het menu blauw-200, tekst op de wedstrijdband blauw-100, en de gemarkeerde rij in blauw-100 met blauw-800 (licht) en blauw-800 met blauw-50 (donker).
- **Later:** zie _Alleen koppen laten zien dat je ze al hebt geopend_ (24 oktober 2026): de kleur voor bezocht staat hier voor elke link; nu geldt hij alleen voor de koppen.
  Zie ook _De acht voorlopige kleuren blijven en heten niet meer voorlopig_ (29 oktober 2026): de waarden zijn vastgelegd en niet meer voorlopig.

## Staal voor markeringen

- **Datum:** 20 oktober 2026
- **Besluit:** wat nummert, scheidt of aanwijst, krijgt staal: een gedempt blauw dat rustiger is dan de tekst.
  Nu zijn dat opsommingstekens en nummers van lijsten, de positie in een stand, de lijn bij een citaat en de stippellijn onder een afkorting; later ook stap- en paginanummers, scheidingstekens, kleine pictogrammen en balkjes in grafiekjes.
  Daarvoor komen er drie kleuren bij het palet: staal 400, 500 en 600 (tint 255°, chroma 0,075), even licht als grijs-400, -500 en -600.
  Nummers en posities (tekst) zijn in licht staal 600 en in donker blauw-200; tekens, lijnen en pictogrammen (grafisch) zijn staal 500 en staal 400.
- **Waarom:** ton-sur-ton bij de rest van de site, rustiger dan de tekst, en niet te verwarren met links (helder blauw) of datums (rood).
  Secundaire tekst, kaartranden en lijnen tussen rijen blijven grijs; staal 400 tot en met 600 is alleen voor markeringen.
  Tekst haalt minstens 4,5:1 en grafische markeringen minstens 3:1 op pagina, kaart en tonaal vlak.
- **Alternatieven:** grijs, helder blauw uit het palet en rood.
  Als naam: lei, duif en mar (Fries voor meer).

## Zand voor de grijzen

- **Datum:** 20 oktober 2026
- **Besluit:** de grijsreeks krijgt tint 85° (zand) in plaats van 255° (blauw), met een chroma van 0,006 tot 0,017.
  De lichtheid per stap blijft gelijk, en daarmee ook het contrast: geen enkel paar verschuift meer dan 0,15.
- **Waarom:** met blauwgetinte grijzen was bijna alles blauw en voelde de site koel.
  Zand geeft een rustige, vriendelijke basis met karakter, en blauw en rood springen er meer uit.
- **Alternatieven:** klei (tint 62°, met meer rood; dat leidde af van de rode datums), kiezel (tint 75°, bijna neutraal, maar nog wat koel) en de blauwgetinte grijzen.
- **Let op:** op goedkope schermen en met een nachtstand kan de pagina iets geler ogen.

## Drie tonale vlakken, elk met een eigen rand

- **Datum:** 20 oktober 2026
- **Besluit:** naast het tonale vlak in blauw-100 zijn er twee: een zacht vlak in blauw-50 en een warm vlak in zand (#F3E8D3, even licht en verzadigd als blauw-100).
  De tokens heten `background-surface-tonal`, `background-surface-soft` en `background-surface-warm`.
- **Rand:** elk tonaal vlak krijgt een rand van 1 pixel, net als een kaart.
  De randkleur komt uit de reeks van het vlak; zie _Kleuren, reeksen en rollen_.
  In licht is dat staal-300 (tonaal vlak), staal-200 (zacht vlak) en zand-300 (warm vlak).
  In donker is het dezelfde stap als van kaart naar rand (blauw-900 naar blauw-700); voor het tonale vlak (blauw-800) is dat blauw-600.
- **Donker:** het zachte vlak is in donker gelijk aan het vlak (blauw-900 met rand blauw-700).
  Het warme vlak is gelijk aan het tonale vlak (blauw-800 met rand blauw-600); zand is er alleen in licht.
- **Code:** codeblokken (`pre`) krijgen de rand van het tonale vlak; code in een zin niet.
- **Waarom:** met meer tonale vlakken kan elke soort inhoud een eigen vlak krijgen, en sturen we de aandacht van de lezer.
  Het maakt de pagina ook levendiger; er was te veel blauw.
  De rand maakt tonale vlakken even duidelijk afgebakend als kaarten.
- **Later:** zie _Een kaart is een eigen component, en de koppen staan op een wit vlak_.
  Het tonale vlak heet nu het sterke vlak, met de tokens `background-surface-strong` en `border-surface-strong`.
- **Later:** de lijnen in een kaart volgen de rand van die kaart en niet meer één kleur: zie _Lijnen in een kaart volgen de kaart via lokale eigenschappen_ (6 november 2026).
  Een vlak heeft nu naast zijn rand twee lijnen, een stap donkerder en een van 3:1 voor assen en pijlen.

## Kleuren, reeksen en rollen

- **Datum:** 20 oktober 2026
- **Besluit:** het palet heeft drie lagen.
  Kleuren: blauw (255°), rood (27°) en zand (85°).
  Reeksen: een kleur in één sterkte, met genummerde stappen van licht naar donker: blauw en rood (helder), staal en zand (gedempt), grijs (neutraal zand).
  Rollen: waarvoor een kleur dient, zoals pagina, vlak, rand en tekst.
  Alleen reeksen hebben nummers; rollen hebben een naam.
- **Randen:** de rand van een vlak komt uit de gedempte of neutrale reeks van zijn kleur.
  Lichte vlakken krijgen stap 200 (vlak grijs-200, zacht vlak staal-200), tonale vlakken stap 300 (tonaal vlak staal-300, warm vlak zand-300).
  Zo zijn er geen losse randkleuren.
- **Waarom:** de kleuren moeten makkelijk te begrijpen en uit te leggen zijn.
  Staal en grijs leken aparte kleuren, maar zijn blauw en zand in een andere sterkte.
- **Alternatieven:** losse randkleuren per vlak, op een vaste afstand van het vlak (eerst #b8cce6, #cbd7e7 en #d7c9ac).
- **Later:** zie _Een uitslag toont de uitkomst in kleur, zonder letter_.
  Het palet heeft nu ook groen (150°), een heldere reeks zoals blauw en rood.

## Vier vlakken; een kaart is een vlak met een rand

- **Datum:** 20 oktober 2026
- **Besluit:** in de kleuren zijn kaart en vlak één begrip.
  Er zijn vier vlakken, elk met een achtergrond en een rand: vlak (wit), tonaal vlak, zacht vlak en warm vlak.
  Een kaart is het onderdeel: een vlak met een rand, ronde hoeken en binnenruimte.
  Code, invoervelden en de gemarkeerde rij gebruiken de kleur van een vlak zonder kaart te zijn.
  De tokens heten `background-surface` (met `-tonal`, `-soft` en `-warm`) en `border-surface` (idem).
  `border-default` blijft voor lijnen tussen rijen.
- **Waarom:** sinds tonale vlakken een rand hebben, verschillen kaart en vlak alleen in kleur, en in donker is het zachte vlak al gelijk aan het vlak.
  Eén begrip is makkelijker uit te leggen: een kaart is een vlak met een rand, en er zijn vier vlakken.
- **Alternatieven:** kaart en tonaal vlak als twee aparte rollen, zoals eerst.
- **Later:** zie _Een kaart is een eigen component, en de koppen staan op een wit vlak_.
  Het tonale vlak heet nu het sterke vlak, met de tokens `-strong` in plaats van `-tonal`.
- **Later:** `border-default` is de lijn tussen rijen buiten een kaart.
  In een kaart volgt ze de rand van die kaart (_Lijnen in een kaart volgen de kaart via lokale eigenschappen_, 6 november 2026).

## Eigen focusrand op de donkere blauwe vlakken

- **Datum:** 22 oktober 2026
- **Besluit:** de header en de wedstrijdband krijgen een eigen kleur voor de focusrand: `--hf-colour-focus-on-header` en `--hf-colour-focus-on-band`, allebei blauw-300, in licht en donker.
  Dat beantwoordt de open vraag van 20 oktober 2026.
- **Waarom:** in het lichte thema haalde de focusrand (blauw-500) op de wedstrijdband (blauw-800) maar 2,65:1, en nodig is 3:1.
  Blauw-300 haalt 7,90:1 op de header en 6,22:1 op de band in licht, en 6,22:1 en 7,90:1 in donker.
  Het palet verandert niet.
  Elk vlak heeft een eigen token, zoals bij de tekstkleuren, zodat het ene vlak kan veranderen zonder het andere.
- **Hoe:** de `Page.Header` zet de rollen voor tekst, links en focus opnieuw voor alles wat erin staat.
  Een component in de header hoeft daar niets voor te doen.
  Het contrast staat bij Tokens › Kleur in Storybook, en een story van de `Page.Header` laat de focusrand zien.
- **Alternatieven:** een focusrand in twee kleuren (bijvoorbeeld blauw-500 met een witte binnenrand) die op elke achtergrond werkt.
  Dat vraagt meer CSS en geeft een andere rand dan op de rest van de site.
  Of blauw-500 in licht donkerder maken; dat verandert de focusrand op alle lichte vlakken.

## Storybook

- **Datum:** 20 oktober 2026
- **Besluit:** Storybook 10 met React en Vite, met verhalen in CSF Next (`preview.meta()` en `meta.story()`).
  Add-ons: docs, a11y (axe) en Pseudo States, om hover, focus en bezocht te tonen.
  Telemetrie, de versiecontrole, de melding van het nieuwsoverzicht en de Engelse onboarding staan uit.
  De dev-server haalt het nieuwsoverzicht van storybook.js.org nog wel op; dat valt in Storybook 10.6 niet uit te zetten.
  De pagina's zelf praten alleen met de lokale server.
  De a11y-controle staat op `error`, zodat een overtreding een test laat falen zodra de tests in Storybook draaien.
- **Waarom:** CSF Next is de nieuwe manier van schrijven, met betere typen; nu beginnen voorkomt een omzetting later.
  Storybook zelf is Engels, maar alles wat wij schrijven is Nederlands: hoofdstukken, verhalen, documentatie en de themaknop.
- **Alternatieven:** CSF 3, de huidige standaard.

## De namen van de paginacomponenten volgen NL Design System

- **Datum:** 22 oktober 2026
- **Besluit:** de componenten heten `Root` (de `html`), `Body` (de `body`), `Page`, `PageHeader`, `PageBody` en `PageFooter`.
  Dat zijn de namen en de rolverdeling uit de discussies van NL Design System.
  Root is de `html`, Body de `body` en Page Body het deel tussen header en footer.
- **Waarom:** we delen zo de woorden met de ontwerpsystemen van de Nederlandse overheid.
  Een `Body` die de `body` is, botst niet met een `PageBody` die de `main` bevat.
  Het is ook de plek waar de `head` apart blijft: Next.js beheert die, en een eventuele `Head` komt als eigen component naast `Body`.
- **Alternatieven:** eigen namen, zoals `Document`, `Header`, `Body` en `Footer`.
  Dat zijn minder componenten, maar `Document` moet dan zowel `html` als `body` maken, en `Body` zou dan iets anders betekenen dan de `body`.
- **Later:** zie _De onderdelen van een pagina hebben een punt: `Page.Header`, `Page.Body` en `Page.Footer`_.
  De rollen blijven die van NL Design System; alleen de schrijfwijze is veranderd.

## Componenten testen we met Vitest en Testing Library

- **Datum:** 22 oktober 2026
- **Besluit:** de componenten van het designsysteem hebben tests met Vitest en Testing Library, die de rol, de naam en de structuur controleren, zonder browser.
  De tests draaien in jsdom.
- **Waarom:** Vitest gebruiken we al.
  Zulke tests draaien in milliseconden, en ze vangen de fouten die bij een component horen: een ontbrekende naam, een verkeerd niveau, een kapotte structuur.
  De controle met axe in een echte browser komt apart (#79).
- **Alternatieven:** de Vitest-addon van Storybook, die de stories zelf in een echte browser draait.
  Dat is sterker, maar zwaarder, het vraagt een browser in CI en het overlapt met #79.
  Of alleen stories; dat voldoet niet aan de regel dat nieuw gedrag tests heeft.
- **Later:** zie _Axe draait op elke story, in licht en donker_.
  De tests met Vitest en Testing Library blijven; alleen de Vitest-addon van Storybook, het alternatief hierboven, is nu aangenomen voor de controle met axe op de stories.

## Het logo is een schild met echte tekst

- **Datum:** 22 oktober 2026
- **Besluit:** het component `Logo` tekent het schild als SVG in de pagina en zet het woordmerk en "sinds 1997" als tekst ernaast, in de typestijl van het woordmerk.
  De SVG-bestanden in `src/assets` blijven bestaan voor plekken buiten de site, zoals een social-afbeelding.
- **Vaste kleuren:** het schild houdt in elk thema dezelfde kleuren (blauw-500, blauw-700, rood-600 en wit), zoals de SVG-bestanden.
  Dat is de uitzondering op de regel om geen primitieve kleuren in componenten te gebruiken: een beeldmerk verandert niet met het thema.
- **Waarom:** de tekst volgt de kleuren van het thema en van de header, dus één component dekt licht, donker en de header.
  De tekstkleuren van de SVG-bestanden voor licht en donker zijn al die van de rollen voor koppen en secundaire tekst.
  Het is ook veel kleiner: ongeveer 2 kB in plaats van 24 kB, omdat de letters in de bestanden omtrekken zijn.
  En een schermlezer en wie kopieert krijgen echte tekst, zoals het besluit over "sc Heerenveen met kleine letters" al veronderstelt.
  Een SVG-bestand importeren werkt bovendien in Vite en in Next.js niet op dezelfde manier.
- **Nadeel:** het woordmerk hangt af van het lettertype.
  Tot dat geladen is, toont de browser een vervangend lettertype (`font-display: swap`).
- **Alternatieven:** de SVG-bestanden als plaatje gebruiken, met een variant per thema en de andere met CSS verbergen.
  Of de bestanden in de pagina zetten, wat 24 kB per pagina kost.

## Geen disclaimer, wel "Voor supporters, door supporters"

- **Datum:** 22 oktober 2026
- **Besluit:** de header en de footer dragen "sinds 1997" en "Voor supporters, door supporters."
  Er komt geen zin in die zegt dat we geen onderdeel van sc Heerenveen zijn.
  Het clubwapen gebruiken we nog steeds niet: ons eigen logo en die zin maken duidelijk van wie de site is.
- **Waarom:** een aparte disclaimer klinkt als een excuus, terwijl "Voor supporters, door supporters" zegt wat we zijn.
  Wie het logo en die zin ziet, begrijpt dat dit een site van supporters is en geen kanaal van de club.
- **Alternatieven:** een uitdrukkelijke zin in de footer houden, zoals "De sc Heerenveen Fansite is geen officieel onderdeel van sc Heerenveen".
  Dat is duidelijk, maar defensief.
- **Later:** zie _De footer zegt wat je op de site vindt_.
  "sinds 1997" staat sindsdien alleen nog in het logo.
  Het motto staat sinds 27 oktober 2026 zonder komma, zoals de site het al had: zie _De footer zegt waar de site over gaat, met het motto eronder_.

## Storybook toont de code van het voorbeeld

- **Datum:** 22 oktober 2026
- **Besluit:** onder elk voorbeeld in Storybook toont "Show code" de JSX die het voorbeeld rendert, en niet de aanroep `meta.story({ ... })` eromheen.
  Daarvoor staat `parameters.docs.source` op `dynamic`, zonder de decorators.
  De stories die een hulpcomponent uit `ExamplePage.tsx` renderen, tonen dat bestand zelf, via `src/docs/exampleSource.ts`, dat het met `?raw` inleest.
- **Waarom:** wie een component wil gebruiken, wil zien hoe dat moet, en zo bedient één `render` de lichte en de donkere story.
  Een hulpcomponent zoals `ExampleHeader` zou anders alleen `<ExampleHeader />` laten zien, en de story van `Page` draait in een eigen venster, waar de gegenereerde code niets zegt.
  De themawrapper is een decorator en hoort niet in het voorbeeld.
- **Alternatieven:** per story met de hand `source.code` schrijven; dat is dubbele code die achterloopt op het voorbeeld.
  Of de standaard laten staan, die de aanroep van `meta.story` toont.
- **Later:** zie _Een pagina in Storybook is kort, met het voorbeeld en een story per variant_.
  Een component krijgt geen lichte en donkere story meer; "Show code" toont nog steeds de JSX van het voorbeeld.

## Elk component heeft zijn eigen CSS

- **Datum:** 22 oktober 2026
- **Besluit:** elke map in `src/components` heeft een eigen CSS-bestand met de stijlen van dat component, zoals `navigation/navigation.css`.
  De stijlen van `Heading`, `Text`, `Link`, `List`, `Body` en `Root` zijn daarheen verhuisd, uit `typography/styles.css` en `base/`.
  `base/` houdt de elementen zonder component: de focusrand, tabel, formulier, code, citaat, figuur, scheidingslijn en afbeelding.
  Een CSS-bestand mag regels in meer dan één laag hebben, zoals `heading.css` in `hf.base` en `hf.typography`.
  Elke regel houdt zijn laag, en de volgorde van de imports in `index.css` houdt regels die elkaar kunnen overschrijven in dezelfde volgorde.
  De cascade verandert dus niet.
- **Waarom:** de stijlen van een component staan naast zijn code, stories en tests.
  Een component verplaatsen of weghalen is dan een wijziging in één map.
- **Alternatieven:** de stijlen gegroepeerd houden naar soort: `base`, `typography` en `components`.
  Dat sluit aan op de lagen, maar verspreidt één component over drie bestanden.

## Onderdelen met een punt: `List.Item`

- **Datum:** 22 oktober 2026
- **Besluit:** een onderdeel dat alleen binnen zijn ouder werkt, is een eigenschap van die ouder.
  Je schrijft het met een punt: `List.Item` is het `li` in een `List`.
  Het package geeft het niet als los component.
- **Waarom:** de naam zegt waar het onderdeel hoort, en je importeert alleen de ouder.
  Een `li` buiten een `ul` of `ol` is geen geldige HTML.
- **Let op:** een servercomponent kan geen onderdeel met een punt gebruiken van een component met `'use client'`.
  De componenten van het designsysteem hebben geen `'use client'`, dus bij hen werkt het.
- **Alternatieven:** een los component `ListItem`, zoals de andere componenten.
  Dat is een export meer, en de naam zegt niet dat het alleen in een `List` werkt.
- **Later:** zie _De onderdelen van een pagina hebben een punt: `Page.Header`, `Page.Body` en `Page.Footer`_.
  De regel is sindsdien breder: een onderdeel dat bij één oudercomponent hoort, krijgt een punt, ook als het element buiten die ouder wel geldig is.

## De onderdelen van een pagina hebben een punt: `Page.Header`, `Page.Body` en `Page.Footer`

- **Datum:** 22 oktober 2026
- **Besluit:** de header, de inhoud en de footer van een pagina zijn eigenschappen van `Page`, met een punt in de naam, net als `List.Item`.
  De regel voor een punt wordt breder: een onderdeel dat bij één oudercomponent hoort, krijgt een punt, ook als het element buiten die ouder wel geldig is.
  De rollen blijven die van NL Design System; alleen de schrijfwijze verandert.
  Het package geeft `PageHeader`, `PageBody` en `PageFooter` niet meer als losse componenten.
- **Waarom:** één schrijfwijze voor de onderdelen van een component.
  Je importeert alleen `Page`, en de naam zegt waar het onderdeel hoort.
- **Alternatieven:** de losse namen van NL Design System houden, zoals de beslissing _De namen van de paginacomponenten volgen NL Design System_ koos.
  Die delen de woorden met de ontwerpsystemen van de overheid, en een `header`, `main` of `footer` is ook buiten een pagina geldige HTML.
- **Later:** zie _Page.Body is het raster, met een hoofdkolom en een zijbalk_.
  `Page.Body` is nu altijd een `div` met de onderdelen `Page.Main`, `Page.Sidebar` en `Page.Cell`; de `main` is `Page.Main`.

## Een ruime lijst vraag je aan

- **Datum:** 22 oktober 2026
- **Besluit:** `List` heeft de eigenschap `loose` voor een ruime lijst, zoals Markdown die kent.
  Elk item krijgt dan 1rem ruimte onder zich, en de laatste alinea in een item heeft zelf geen ruimte onder zich.
  Het laatste item heeft geen eigen ruimte, dus onder een ruime lijst staat evenveel ruimte als onder een gewone lijst.
  Een pagina kiest daar zelf voor; een gewone lijst blijft compact.
  `/bronnen` gebruikt het voor de lijst van elke soort.
- **Waarom:** de ruimte hoort bij het item, niet bij de alinea erin, zodat een item zonder alinea dezelfde ruimte krijgt.
  Een eigenschap is voorspelbaar: de pagina krijgt wat ze vraagt, los van wat er in de items staat.
- **Alternatieven:** de ruimte automatisch geven zodra een item in de lijst een alinea bevat, met `:has()`.
  Dan hoeft een pagina niets te kiezen, maar de inhoud van één item verandert dan de hele lijst.
- **Later:** zie _Elementen en tekst zetten geen verticale witruimte naar buiten_ (2 november 2026).
  De ruimte van een ruime lijst is nu de `gap` van de lijst, een raster, en geen marge onder elk item; de uitkomst is dezelfde.

## De header loopt over de hele breedte van het venster

- **Datum:** 22 oktober 2026
- **Besluit:** de achtergrond van de header loopt op elke breedte van rand tot rand.
  Het logo en de navigatie blijven in de kolom van de pagina, in lijn met de inhoud eronder.
  De footer blijft in de kolom.
- **Hoe:** de `Page` is zo breed als het venster.
  De header, de body en de footer zetten zelf de ruimte aan de zijkanten, uit het token `--hf-page-inset`: de helft van wat het venster breder is dan `--hf-page-max-width`, en nooit minder dan de marge.
  De kolom blijft zo 75 rem breed, zoals voorheen.
  De header gebruikt het als `padding-inline`, de body en de footer als `margin-inline`.
  Een percentage verwijst naar de breedte van de ouder, en die telt de scrollbalk niet mee.
  De header heeft de eigen zijruimte van 1,5 rem (op een smal scherm 1 rem) niet meer, zodat het logo op dezelfde plek staat als de inhoud.
- **Waarom:** een band van rand tot rand is duidelijk de bovenkant van de site.
  Op een telefoon stond de blauwe balk met een smalle rand aan beide kanten los.
  Omdat de inhoud in de kolom blijft, staat het logo in lijn met de rest van de pagina.
- **Alternatieven:** alleen op een smal scherm van rand tot rand, onder 40em of onder 75rem; op een breder scherm staat de balk dan nog in de kolom.
  Of de header in de kolom laten, zoals voorheen.
  Of de header `100vw` breed maken, met een negatieve marge: `100vw` telt de scrollbalk mee, dus op Windows scrolt de pagina dan opzij.
  Of een omhulsel in de header voor de kolom; dat is een element meer, en de inhoud van de header zou dan altijd in dat omhulsel moeten.

## De footer zegt wat je op de site vindt

- **Datum:** 22 oktober 2026
- **Besluit:** de footer zegt "Alle koppen en links op één plek. Voor supporters, door supporters."
  "sinds 1997" staat alleen nog in het logo in de header.
  Dit past de beslissing _Geen disclaimer, wel "Voor supporters, door supporters"_ aan, die "sinds 1997" ook in de footer zette.
- **Waarom:** de footer zegt nu wat een bezoeker hier vindt.
  "sinds 1997" staat al in het logo, vlak boven de pagina.
- **Alternatieven:** "sc Heerenveen Fansite, sinds 1997.", zoals eerst.
  Of "Je startpagina voor nieuws over sc Heerenveen."
  Of "Koppen over sc Heerenveen uit de media, met een link naar het hele verhaal."
- **Later:** zie _De footer zegt waar de site over gaat, met het motto eronder_.
  Het motto staat daar zonder komma, zoals de site het al had.

## De MCP-server van Storybook draait als add-on in de dev-server

- **Datum:** 22 oktober 2026
- **Besluit:** agents vragen het designsysteem op bij `@storybook/addon-mcp`, in de dev-server van Storybook, op `http://localhost:6006/mcp`.
  De hulpmiddelen voor documentatie en voor ontwikkelen staan aan, die voor tests uit.
  Een `.mcp.json` in de hoofdmap maakt de server bekend bij elke sessie van Claude Code.
  Storybook staat daarmee op 10.6.3, met al zijn packages.
- **Waarom:** de add-on draait in de server die we al hebben, en geeft naast de documentatie ook instructies voor stories.
  De losse `@storybook/mcp` is een bibliotheek: we zouden er een eigen server omheen moeten schrijven en draaien, en hij geeft alleen de documentatie.
  De hulpmiddelen voor tests vragen `@storybook/addon-vitest`, die we niet gebruiken (zie _Componenten testen we met Vitest en Testing Library_).
- **Let op:** de add-on stuurt zelf geen telemetrie, maar roept die van Storybook aan.
  Die staat uit met `core.disableTelemetry`.
  Zet je dat aan, dan gaan er gebeurtenissen van de add-on naar storybook.js.org, met de naam van de client die de server gebruikt.
- **Alternatieven:** de losse server `@storybook/mcp`, die de gegevens uit een gebouwde Storybook leest.
  Of geen MCP-server; dan zoeken agents alles zelf in de code, zoals nu.
- **Later:** de losse server en het publiceren bleven buiten dit besluit.
  Ze staan er nu wel, naast deze lokale server: zie _De MCP-server van het designsysteem staat op ds.heerenveen.org/mcp_.
- **Later:** zie _Axe draait op elke story, in licht en donker_.
  `@storybook/addon-vitest` komt er dan toch, voor de controle met axe op de stories.

## Storybook haalt de props uit react-component-meta

- **Datum:** 22 oktober 2026
- **Besluit:** `features.experimentalReactComponentMeta` staat aan.
  De props die de MCP-server van een component geeft, komen dan van de TypeScript-compiler.
- **Waarom:** de standaard, react-docgen, laat een type als `(typeof headingLevels)[number]` staan.
  Een agent ziet dan niet welke waarden mogen.
  react-docgen-typescript lost dat op, maar laat de props van `List` (`as` en `loose`) en `Link` (`href`) weg.
  react-component-meta geeft alle props, met de waarden van een type als `1 | 2 | 3 | 4`.
- **Let op:** Storybook noemt dit experimenteel.
  De versie staat vast, dus het verandert pas met een update.
  Geeft het daarna slechte props, dan is `typescript.reactDocgen: 'react-docgen-typescript'` de terugval.
- **Alternatieven:** react-docgen, de standaard, of react-docgen-typescript.

## De inhoud staat in een smallere kolom, met plaats voor een zijbalk

- **Datum:** 22 oktober 2026
- **Besluit:** op een breed scherm staat de inhoud van een pagina in een kolom waarin een regel hoogstens 80 tekens telt, in lijn met het logo.
  De rest van de kolom van 75 rem blijft leeg: daar komt later een zijbalk.
  Op een smal scherm gebruikt de inhoud de hele breedte.
  De header en de footer blijven over de hele kolom lopen.
- **Hoe:** het token `--hf-content-max-width` is 36 rem (576 pixels), en `Page.Body` zet het als `max-inline-size` op de `main`.
  Is de `Page.Body` zelf de `main`, dan staat het op de `Page.Body`; is het een `div` voor een pagina met een zijbalk, dan op de `main` erin.
  De zijruimte blijft die van `--hf-page-inset`, dus de kolom begint in lijn met het logo, en de marge aan het einde geeft mee.
  Het geldt voor elke pagina, ook voor `/bronnen`, de pagina voor een onbekend adres en de foutpagina.
  Er is geen breakpoint: onder de 36 rem plus de marges is de kolom zo breed als het scherm.
- **Gemeten:** in Atkinson Hyperlegible Next op 17 pixels (Tekst) telde in 36 rem geen van 28 regels Nederlandse nieuwstekst meer dan 80 tekens, en het gemiddelde was 72.
  In 37 rem ging de eerste regel erover (81).
  Een kop van een bericht (Nieuwskop, 18 pixels, halfvet) heeft in 36 rem gemiddeld 64 tekens en hoogstens 72.
  Een Playwright-test telde de tekens van elke regel op `/`, `/bronnen`, de pagina voor een onbekend adres en de foutpagina; die test is weg (zie _E2e-tests alleen voor wat anders ongemerkt kapotgaat_).
- **Waarom:** in de kolom van 75 rem telt een regel zo'n 130 tekens, en zulke regels lezen moeilijk; WCAG raadt hoogstens 80 tekens aan (1.4.8).
  Houden we de plek voor een zijbalk nu al vrij, dan verschuift de inhoud niet als die komt, bijvoorbeeld met de volgende wedstrijd en de stand (#27).
- **Alternatieven:** een smalle kolom in het midden; dan verandert de opbouw opnieuw als de zijbalk komt.
  Of alleen een maximale breedte voor alinea's; dan blijven koppen en lijsten breed, en moet elk component het zelf regelen.
  Of nu al een zijbalk met inhoud; daar is nog niets voor.
  Of de smalle kolom pas vanaf een breakpoint; dan krijgt een tablet regels van ruim 90 tekens.
- **Later:** zie _Page.Body is het raster, met een hoofdkolom en een zijbalk_.
  De hoofdkolom is nu 48 rem, en de grens van 80 tekens per regel is vervallen.
  Het token `--hf-content-max-width` zet nu de breedte van het eerste spoor in het raster van `Page.Body`, en niet meer een `max-inline-size` op de `main`; de zijbalk is er, 24 rem breed.
- **Later:** zie _Een pagina van 64 rem, met kolommen van 36, 4 en 24 rem_.
  De hoofdkolom is weer 36 rem, en de kolom van de pagina 64 rem.

## Page.Body is het raster, met een hoofdkolom en een zijbalk

- **Datum:** 22 oktober 2026
- **Besluit:** `Page.Body` is het raster van een pagina, met twee kolommen: `Page.Main`, hoogstens 48 rem, en `Page.Sidebar`, 24 rem.
  Samen met de 3 rem ertussen zijn ze de hele kolom van de pagina van 75 rem, en ze beginnen in lijn met het logo.
  Heeft een pagina geen zijbalk, dan blijft de rest van de kolom leeg.
  `Page.Main` is altijd de `main`, `Page.Sidebar` een `aside`, en `Page.Body` altijd een `div`.
  Elk kind van een kolom is een cel; `Page.Cell` zet meer dingen in één cel.
  Elke kolom stapelt haar eigen cellen, en `Page.Body` regelt alle witruimte.
  Op een smal scherm staan de kolommen onder elkaar, de hoofdkolom eerst.
  De grens van 80 tekens per regel, die _De inhoud staat in een smallere kolom, met plaats voor een zijbalk_ stelde, vervalt.
- **Hoe:** `Page.Body` is een raster met één spoor van 48 rem, dat krimpt als het scherm smaller is.
  Vanaf 77 rem (48 rem, 3 rem ertussen en 24 rem, met een marge van 1 rem aan beide kanten) komt er een tweede spoor van 24 rem bij.
  De breedte staat in de media query zelf, want een custom property kan daar niet in.
  Elke kolom is een gewoon raster van één spoor, met de witruimte tussen de cellen als `gap`, uit een custom property op `Page.Body`.
  Er zijn twee maten witruimte, tot tokens voor ruimte komen (#19): 3 rem tussen de kolommen, naast elkaar en onder elkaar, en onder de kolommen, en 2 rem tussen de cellen en boven de kolommen.
  Een kind van een kolom heeft `margin: 0`, en in een `Page.Cell` hebben het eerste en het laatste kind geen marge naar buiten.
  De zijbalk staat in de bron na de hoofdkolom, en er is geen `order`, dus de leesvolgorde en de tabvolgorde zijn op elke breedte die van de bron.
- **Waarom:** met twee vaste kolommen bestaat het raster alleen direct in `Page.Body`; een los `Grid` zou daar altijd in staan en dezelfde taak hebben.
  Zo is er één plek voor de opbouw van een pagina en de ruimte tussen de blokken, en hoeft een pagina of een kaart dat niet zelf te regelen.
  Elke pagina heeft dezelfde landmarks, en de layout van de site blijft `Page.Body` maken.
  In een gewoon raster delen cellen in dezelfde rij hun hoogte; met een eigen raster per kolom stapelt elke kolom haar eigen cellen, zoals op de artboards.
  Een subgrid helpt hier niet: een kolom beslaat één spoor van `Page.Body`, dus hij erft er niets bruikbaars van, en met subgrid-rijen zouden de cellen van beide kolommen dezelfde rijen delen, wat we niet willen.
  De projecteigenaar koos na de review van de eerste versie voor kolommen van 48 en 24 rem en voor 3 rem tussen de kolommen en onder de inhoud.
  Een regel lopende tekst telt in 48 rem nu zo'n 96 tekens, meer dan de 80 van WCAG 1.4.8 (niveau AAA).
  De projecteigenaar liet de grens vallen.
  Het lettertype wordt binnenkort groter, en dan telt een regel minder tekens.
- **Alternatieven:** een los component `Grid` in `Page.Body`, dat de kolommen en de witruimte regelt, terwijl `Page.Body` alleen het kader is.
  Of een raster van 12 kolommen met `start` en `span`; flexibeler, maar meer API.
  Of rijen over beide kolommen met cellen die even hoog worden; dan stapelen de kolommen niet los.
  Of meer kaarten in één cel, met de ruimte in de kaart.
  Of de kolom in `Page.Body` laten zoals #73 deed, zonder plek voor een zijbalk.
  Of de tekst in de kolom van 48 rem toch beperken tot 36 rem, zodat de grens van 80 tekens blijft; dat is niet gekozen.
- **Later:** de zijbalk staat tussen 40 rem en 77 rem onder de hoofdkolom, met haar cellen in twee gelijke kolommen (#137).
  Onder 40 rem staan de cellen onder elkaar, en vanaf 77 rem staat de zijbalk naast de hoofdkolom.
  Dat is een tweede raster op `Page.Sidebar` in `page.css`; de volgorde in de bron blijft gelijk en er is geen `order`.
  Een cel die de volle breedte neemt, is er nog niet; of dat nodig is, beslissen we na de proef op Onze bronnen.
- **Later:** zie _Een pagina van 64 rem, met kolommen van 36, 4 en 24 rem_.
  De hoofdkolom is nu 36 rem, met 4 rem ertussen, en de kolommen staan naast elkaar vanaf 56 rem; de zijbalk staat tussen 40 rem en 56 rem onder de hoofdkolom.
  De ruimte tussen de kolommen en onder de kolommen is nu 4 rem, ook onder elkaar, en de 3 rem is vervallen.
- **Later:** zie _De zijbalk kan onder een inleiding beginnen, met benoemde gebieden en een subgrid_.
  `Page.Main` heeft nu de eigenschap `intro`, en met een inleiding is `Page.Main` een subgrid in de rijen van `Page.Body`.
  Een kolom zonder inleiding blijft een eigen raster, zoals hierboven staat.
- **Later:** zie _De kaarten van een zijbalk staan standaard onder elkaar, naast elkaar is een optie_.
  De cellen van de zijbalk staan nu standaard onder elkaar; alleen met `split` staan ze, onder de hoofdkolom, in twee gelijke kolommen.
- **Later:** zie _De kaart of de cel bepaalt de verticale witruimte tussen wat erin staat_ (2 november 2026).
  De ruimte in een `Page.Cell` komt nu van de stroom in `utilities/flow.css`, die elk kind ruimte onder zich geeft en het laatste geen; de regel voor het eerste en het laatste kind in `page.css` is weg.
  De ruimte tussen de cellen blijft de `gap` van `Page.Body`.

## Een regel met padding of een rand zet zelf `box-sizing: border-box`

- **Datum:** 22 oktober 2026
- **Besluit:** elke regel in het designsysteem die padding of een rand zet op een element met een maat, zet daar `box-sizing: border-box` bij.
  Zo tellen padding en rand mee in de breedte en de hoogte, en doet een maat van 24 rem wat ze zegt.
  Er is geen globale regel op `*`.
  Dit staat op de delen van `Page` (`Page.Header`, `Page.Body` en `Page.Footer`), op `blockquote`, `pre`, `hr`, `fieldset`, de knoppen, `textarea` en de voorbeelden in de documentatie met een maat en een rand.
- **Waarom:** padding en rand veranderen de maat dan niet, en een element met een maat houdt die maat als er padding bij komt.
  Een regel zonder padding of rand heeft de instelling niet nodig, dus er staat niets wat niets doet.
- **Let op:** een nieuwe regel met padding of een rand moet de instelling zelf zetten.
  Stylelint controleert dat niet.
- **Alternatieven:** `box-sizing: border-box` op `*`, `*::before` en `*::after`, zoals de meeste resets doen; dat raakt ook elementen van derden en elke regel die er niet om vraagt.
  Of `html { box-sizing: border-box }` met `inherit` op alle elementen; dat is ook een regel op `*`.

## Een kaart is een eigen component, en de koppen staan op een wit vlak

- **Datum:** 22 oktober 2026
- **Besluit:** `Card` maakt een kaart op een van de vier vlakken: `default`, `strong`, `soft` of `warm`.
  Hij heeft een rand van 1 pixel, ronde hoeken van 0,5 rem en binnenruimte, maar geen marge, en is standaard een `section`.
  In een kolom is elke kaart een eigen cel.
  Op de homepage en op Onze bronnen staan de blokken op het witte vlak.
- **Hoe:** `surface` kiest het vlak uit een vaste lijst, en `as` het element: `section`, `div`, `article` of `aside`.
  De achtergrond en de rand komen uit de tokens van het vlak, dus ze volgen het thema.
  Het tonale vlak heet daarbij voortaan het sterke vlak, `strong`; zie hieronder.
  De binnenruimte is 1,5 rem boven en onder en 1,75 rem opzij, zoals op de artboards (24 en 28 pixels), en 1 rem en 1,25 rem op een scherm smaller dan 40 rem.
  Het eerste en het laatste kind in een kaart hebben geen marge naar buiten, zoals in een `Page.Cell`.
  Een `section` krijgt de naam van haar kop met `aria-labelledby`: de pagina geeft de kaart die verwijzing en de kop een `id`.
  Het component doet dat niet zelf, want de kop is een kind dat het component niet kent.
- **De naam `strong`:** de tokens `background-surface-tonal` en `border-surface-tonal` heten nu `background-surface-strong` en `border-surface-strong`.
  `tonal` komt uit Material Design en zegt niets over hoe het vlak eruitziet.
  `strong` hoort bij `soft`: het duidelijke blauw naast het zachte blauw, in licht en in donker.
  In het Nederlands is het het sterke vlak.
  De projecteigenaar koos de naam.
- **Waarom:** op de artboards staat elk blok als kaart op het zandgrijze vlak van de pagina, en dat geeft de pagina rust en richting.
  Het witte vlak laat de koppen het best uitkomen; het sterke vlak houden we voor het officiële clubnieuws (#16).
  Omdat `Page.Body` de ruimte tussen de cellen regelt, heeft een kaart geen marge, en past ze overal.
  In de hoofdkolom van 48 rem maakt de binnenruimte de regels in een kaart wat korter.
- **Alternatieven:** een cel met een uiterlijk als kaart; dan is elke kaart een cel, en kan een kaart nergens anders staan.
  Of meer kaarten in één cel, met de ruimte in de kaart.
  Of het sterke vlak voor het blok op de homepage.
  Of nu al tokens voor ruimte (#19).
  Of een andere naam dan `strong` voor het tonale vlak: `blue` lijkt te veel op `soft`, `tinted` is ook waar voor `soft` en `warm`, `accent` is al de rode tekstkleur en `highlight` is al een achtergrond met dezelfde waarden.
- **Later:** zie _Ruimte komt uit vijf stappen, met gemiddeld als vaste keuze_ (31 oktober 2026): de binnenruimte van een kaart is 1 rem rondom op een smal scherm en 1,5 rem rondom op een breed scherm, en de ruimte voor het pijltje van een kop volgt de binnenruimte.
  Het was 1 en 1,25 rem, en 1,5 en 1,75 rem.

## Hulpklassen zitten in de sterkste laag

- **Datum:** 23 oktober 2026
- **Besluit:** het designsysteem heeft hulpklassen: een klasse die één ding doet, op elk element.
  De eerste is `hf-visually-hidden`: wat die klasse heeft, zie je niet, maar een schermlezer leest het wel voor.
  Hulpklassen staan in `src/utilities`, met een story en een test, en zitten in een vijfde laag, `hf.utilities`, na `hf.components`.
- **Hoe:** `hf-visually-hidden` haalt het element uit de stroom, maakt het één pixel groot en knipt het weg met `clip-path: inset(50%)`.
  Zonder marge, padding en rand neemt het geen ruimte in en maakt het de pagina niet breder.
  De tekst blijft op één regel, want sommige schermlezers lezen afgebroken tekst in zo'n smal vak als één lang woord.
  Het element blijft in de toegankelijkheidsboom, anders dan met `display: none` of het attribuut `hidden`.
- **Waarom:** een hulpklasse moet winnen van het component of de typestijl op hetzelfde element.
  Een `Card` zet bijvoorbeeld padding en een rand; die mogen een kaart met `hf-visually-hidden` niet groter maken dan één pixel.
  In de sterkste laag wint de hulpklasse altijd, hoe specifiek de regel van het component ook is.
  CSS van de site zelf, buiten een laag, wint nog steeds.
- **Alternatieven:** de klasse in `hf.components`, als laatste import; dan wint een specifiekere regel van een component, en moeten we specificiteit en volgorde weer bewaken.
  Of `!important` op elke eigenschap, zoals veel CSS-bibliotheken doen; dan wint de klasse ook van de CSS van de site, en die moet altijd kunnen winnen.

## Kleinere koppen en vaste tekstmaten

- **Datum:** 23 oktober 2026
- **Besluit:** alle koppen, `h1` tot en met `h6`, staan in het lettertype van de koppen.
  Kop 1 is 24 tot 28 pixels, Kop 2 21 tot 23,25 en Kop 3 18,25 tot 19,25, allemaal met `clamp()` tussen 360 en 1280 pixels breed.
  Kop 4 is 16 pixels en schaalt niet mee.
  Kop 5 en Kop 6 zijn dezelfde 16 pixels, als reserve, en verschillen van Kop 4 in gewicht en kleur.
  Kop 1 en Kop 2 krijgen gewicht 800 in plaats van 900.
  Tekst is 16 pixels, Nieuwskop 18, Meta 14 en Label 14, op elke breedte.
  Het woordmerk blijft gelijk.
- **Waarom:** koppen in kapitalen op breedte 125 en gewicht 900 vallen op, ook als ze kleiner zijn; op 52 pixels schreeuwen ze en nemen ze de aandacht van het woordmerk en het nieuws.
  Het woordmerk is de grootste letter van de site; de koppen komen daaronder.
  Een kleine kop in kapitalen en een zwaarder gewicht oogt groter dan tekst van dezelfde maat, dus Kop 4 mag even groot zijn als de tekst.
  Eén schaal tussen Kop 4 en Kop 1 geeft vaste verhoudingen tussen de koppen.
  Tekst van 18 pixels was in de middelste breedte te groot, en met één vaste maat per stijl is er geen schaling meer om te controleren.
- **Alternatieven:** Kop 1 op de maat van het woordmerk (36 pixels), of de maten laten staan en alleen het gewicht verlagen; beide blijven te zwaar.
  Kop 4 in Atkinson laten; dan staat één kop in een ander lettertype dan de rest.
  Tekst laten meeschalen van 16 naar 18 pixels; dat maakt de tekst op een brede pagina te groot.
  Tekst op 17 of 18 pixels laten staan; de projecteigenaar vond 18 pixels te groot voor een gewone alinea.

## Een inleidende alinea heeft een eigen typestijl, met een `b` erin

- **Datum:** 24 oktober 2026
- **Besluit:** het designsysteem heeft een typestijl Inleiding voor de eerste alinea onder de `h1` van een pagina: 20 pixels, op elke breedte, met regelhoogte 1,4 en het gewicht van Tekst.
  `Text` krijgt daarvoor `appearance="intro"`, alleen voor een `p`, en zet de inhoud in één `b`: `<p class="hf-intro"><b>…</b></p>`.
  Met CSS heeft de `b` het gewicht van gewone tekst; een `b` of `strong` elders blijft vet.
  De eerste alinea na de `h1` gebruikt de stijl op Onze bronnen, Over ons, Privacy, Wat is er nieuw, de foutpagina en Pagina niet gevonden.
  Op Over ons staat de `h2` "Wie we zijn" tussen de `h1` en die alinea.
  De homepage heeft onder zijn verborgen `h1` geen alinea en verandert niet.
- **Waarom:** een inleiding vertelt in een paar zinnen waar de pagina over gaat, en mag opvallen.
  Met CSS valt hij op door de grootte, want vet op grote lopende tekst leest zwaarder.
  Zonder CSS toont de browser de `b` vet, dus de inleiding valt ook dan op, zonder dat we iets hoeven te doen.
  Een `b` zegt niets over betekenis, anders dan `strong`, dus een schermlezer leest hem niet met nadruk.
  20 pixels is groter dan Tekst (16) en Nieuwskop (18), en kleiner dan de kleinste Kop 2 (21); de regelhoogte van 1,4 ligt tussen die van de Nieuwskop (1,35) en die van Tekst (1,5), omdat grotere letters minder ruimte tussen de regels nodig hebben.
- **Alternatieven:** alleen een klasse op de `p`; dan is de inleiding zonder CSS niet te onderscheiden.
  Of een `strong`; dat zegt dat de tekst belangrijk is, en een schermlezer kan er nadruk aan geven.
  Of een eigen component naast `Text`; dat is meer, voor een stijl van lopende tekst.
  Of een maat die met de breedte meeschaalt, zoals de koppen; één maat past bij de andere stijlen van lopende tekst.
- **Later:** de pagina heet nu Updates en staat op `/updates`; zie _De pagina Wat is er nieuw heet Updates, op `/updates`_.
- **Later:** zie _Een inleiding of toelichting bestaat alleen als ze iets toevoegt, en ze staat op een vaste plek_.
  Een inleiding is één zin van hooguit ongeveer twintig woorden en bestaat alleen als ze iets zegt wat de kop en de inhoud niet zeggen.
  Onze bronnen heeft er alleen nog een voor de lege plek.

## Een pagina van 64 rem, met kolommen van 36, 4 en 24 rem

- **Datum:** 23 oktober 2026
- **Besluit:** de kolom van de pagina is 64 rem: de hoofdkolom 36 rem, 4 rem ertussen en de zijbalk 24 rem.
  De kolommen staan naast elkaar vanaf 56 rem.
  Op een breed scherm (vanaf zo'n 74 rem) hangt het schild van het logo in de marge, zodat de tekst in lijn staat met het woordmerk.
  Op een smaller scherm staat alles in lijn met het schild, zoals voorheen.
- **Waarom:** de maten komen uit de leeslengte van een regel: in 36 rem telt een regel Tekst van 16 pixels zo'n 70 tot 80 tekens, de maat die we al eerder kozen, toen met 17 pixels.
  Een zijbalk van 24 rem is 37,5% van de pagina, dus breed genoeg om iets in te zetten.
  64 is een macht van 2, zoals de maten van het logo (192 is 128 + 64), en 36, 4 en 24 zijn sommen van twee machten (32 + 4, en 16 + 8).
  In lijn met het woordmerk heeft de tekst één linkerkant, en het schild is een versiering in de marge.
- **Hoe:** `--hf-page-max-width` is 64 rem en `--hf-content-max-width` 36 rem.
  Vanaf 56 rem heeft `Page.Body` twee sporen, `minmax(24rem, 36rem)` en `minmax(16rem, 24rem)`.
  Tot 66 rem (64 rem plus een marge van 1 rem aan beide kanten) krimpen ze mee met het venster.
  De ruimte tussen de kolommen is 4 rem, naast elkaar en onder elkaar, en ook onder de kolommen; tussen de cellen en boven de kolommen is het 2 rem.
  Dat zijn twee maten, in de custom properties `--hf-page-body-column-gap` en `--hf-page-body-cell-gap` op `Page.Body`: 3 rem is vervallen.
  2 en 4 zijn machten van 2, en een eerste aanzet voor de tokens voor ruimte (#19).
  Onder 56 rem staat de zijbalk onder de hoofdkolom, met de cellen in twee kolommen vanaf 40 rem.
  De zijbalk staat nog steeds na de hoofdkolom in de bron, zonder `order`.
  De hang van het schild is `--hf-logo-hang` in `layout.css`: de maat van het schild (`--hf-logo-mark-size`, 1,55 keer de lettergrootte van het woordmerk) plus de ruimte ernaast (`--hf-logo-gap`, 0,75 rem).
  Die twee komen nu uit de tokens van het logo, in plaats van uit `logo.css`.
  Vanaf 74,5 rem breed krijgt het logo in `Page.Header` een negatieve marge van die maat: 64 rem voor de kolom, twee keer 4,2375 rem voor de hang en twee keer 1 rem tot de rand van het venster is 74,475 rem, naar boven afgerond.
  De navigatie blijft in lijn met de rechterkant van de kolom en de footer met de linkerkant, want de header en de footer houden hun `padding-inline` uit `--hf-page-inset`.
  Een media query kan geen custom property gebruiken, dus de maten staan erin zelf.
- **Gemeten:** in Atkinson Hyperlegible Next op 16 pixels telt een regel Tekst op Over ons, in de hoofdkolom op een scherm van 1440 pixels, hoogstens 81 tekens en gemiddeld 76,4 (alleen de volle regels, zonder de laatste regel van een alinea) of 65,0 (alle regels).
  In de kolom van 48 rem was dat hoogstens 109 en gemiddeld 102,8 of 79,6.
  De homepage heeft één regel Tekst, "Welke media we volgen, lees je bij Onze bronnen.", van 48 tekens; de koppen van de berichten zijn Nieuwskop en tellen niet mee.
- **Alternatieven:** 40 + 4 + 20 rem; de zijbalk is dan een derde van de twee kolommen, maar een regel telt tot 85 tekens.
  Een pagina van 56 rem met 32 + 4 + 20; regels van hoogstens 68 tekens, maar een smalle pagina met veel lege ruimte op een groot scherm.
  De pagina van 75 rem laten, met 48 + 3 + 24; regels van zo'n 108 tekens.
  Het schild altijd laten hangen of de tekst altijd inspringen; op een telefoon kost dat zo'n 4 rem breedte.
- **Later:** de projecteigenaar beslist na de screenshots in de pull request of de hang blijft; zo niet, dan haalt de review die eruit.
- **Daarna:** onder 56 rem, waar de zijbalk onder de hoofdkolom staat, staan beide gecentreerd, hoogstens 36 rem breed.
  De ruimte tussen de hoofdkolom en de zijbalk is dan 2 rem, net als tussen de cellen; de 4 rem blijft tussen de kolommen naast elkaar en onder de kolommen.
  De cellen van de zijbalk staan naast elkaar zodra er twee van 16 rem met 2 rem ertussen passen (`repeat(auto-fit, minmax(min(16rem, 100%), 1fr))`), en anders onder elkaar.
  Daarmee vervalt de grens van 40 rem voor de zijbalk; alleen de grens van 56 rem blijft.
- **Later:** zie _De hoofdkolom is 38 rem, met 2 rem ruimte naast de zijbalk_.
  De hoofdkolom is nu 38 rem, met 2 rem ertussen; de zijbalk en de kolom van de pagina blijven 24 en 64 rem.
  Ook onder 56 rem is de hoofdkolom 38 rem breed.
- **Later:** zie _De kaarten van een zijbalk staan standaard onder elkaar, naast elkaar is een optie_.
  Het `repeat(auto-fit, …)` hierboven geldt nu alleen voor een zijbalk met `split`; zonder staan de cellen onder elkaar.
- **Later:** zie _De tweede kolom begint bij 52 rem, voor alle pagina's met een zijbalk_.
  De kolommen staan naast elkaar vanaf 52 rem en niet meer vanaf 56 rem.
- **Later:** zie _Ruimte komt uit vijf stappen, met gemiddeld als vaste keuze_ (31 oktober 2026): de ruimte naast het woordmerk is 0,5 rem, dus de hang van het schild is 3,9875 rem en het logo hangt vanaf 74 rem buiten de kolom (was 4,2375 rem en 74,5 rem).
  De ruimten van 2 rem en 4 rem zijn nu `--hf-space-xl` en tweemaal die stap: de "eerste aanzet voor de tokens voor ruimte" is de reeks geworden.

## De hoofdkolom is 38 rem, met 2 rem ruimte naast de zijbalk

- **Datum:** 26 oktober 2026
- **Besluit:** de hoofdkolom is 2 rem breder en de ruimte tussen de hoofdkolom en de zijbalk 2 rem smaller: 38, 2 en 24 rem, samen 64 rem.
  Een pagina zonder zijbalk heeft dezelfde hoofdkolom van 38 rem.
- **Waarom:** de ruimte naast elkaar was twee keer zo groot als de ruimte onder elkaar, en dat voelde scheef.
  De ruimte gaat naar de inhoud.
- **Hoe:** `--hf-content-max-width` is 38 rem, en de ruimte tussen de kolommen naast elkaar is de ruimte tussen de cellen (`--hf-page-body-cell-gap`, 2 rem).
  De eigen maat voor de ruimte tussen de kolommen (`--hf-page-body-column-gap`) is vervallen.
  De 4 rem onder de kolommen blijft, nu onder de naam `--hf-page-body-end-space`.
  De sporen zijn `minmax(24rem, 38rem)` en `minmax(16rem, 24rem)`, vanaf 56 rem en tot 66 rem breed (64 rem plus 1 rem marge aan beide kanten) krimpen ze mee.
  Bij 56 rem hebben ze 52 rem samen, na de ruimte ertussen, dus ze krimpen niet tot hun minimum en niets scrolt opzij.
  Onder 56 rem staan de hoofdkolom en de zijbalk gecentreerd onder elkaar, hoogstens 38 rem breed.
  De grens van 56 rem, de hang van het schild vanaf 74,5 rem en de strepen over de volle breedte veranderen niet, want de kolom van de pagina blijft 64 rem.
- **Gemeten:** in Atkinson Hyperlegible Next op 16 pixels telt een regel Tekst in de hoofdkolom op een scherm van 1440 pixels, met de vier alinea's van Over ons, hoogstens 87 tekens en gemiddeld 82,4 (alleen de volle regels).
  In 36 rem was dat met dezelfde tekst hoogstens 84 en gemiddeld 79,3.
  De regels zijn dus 3 tekens langer geworden, en de gemiddelde volle regel zit net boven de 80.
  De grens van 70 tot 80 tekens uit _Een pagina van 64 rem, met kolommen van 36, 4 en 24 rem_ rekt daarmee een paar tekens op; verder niet.
  Geen scrollen opzij van 280 tot 1200 pixels breed, dus ook niet op 320 pixels (400% zoom op 1280 pixels).
- **Alternatieven:** de zijbalk 2 rem breder maken; de hoofdkolom blijft dan op de leeslengte van 36 rem, maar de zijbalk heeft zelden zoveel nodig.
  De pagina breder maken; dat raakt de header, de footer en het logo.
- **Later:** zie _/wedstrijden heeft een zijbalk van 32 rem met de stand en de uitslagen_.
  Een pagina kan met `wide` op de `Page.Sidebar` een hoofdkolom van 30 rem en een zijbalk van 32 rem kiezen; elke andere pagina houdt 38, 2 en 24 rem.
- **Later:** zie _Een pagina kan breed zijn, met een hoofdkolom van 58 rem en de zijbalk van 24 rem_.
  Een pagina kan met `wide` op de `Page.Main` een pagina van 84 rem kiezen; elke andere pagina houdt 64 rem.
- **Later:** zie _De kolommen van `/wedstrijden` zijn even breed_.
  De hoofdkolom en de zijbalk met `wide` zijn allebei 31 rem breed, met 2 rem ertussen.
- **Later:** zie _/nieuws heeft een hoofdkolom van 46 rem en een zijbalk van 16 rem_.
  Een pagina kan met `narrow` op de `Page.Sidebar` een hoofdkolom van 46 rem en een zijbalk van 16 rem kiezen.
- **Later:** zie _De tweede kolom begint bij 52 rem, voor alle pagina's met een zijbalk_.
  De kolommen staan naast elkaar vanaf 52 rem en niet meer vanaf 56 rem; bij 52 rem is er dus 48 rem voor de sporen, en niet meer 52 rem.

## Een smalle nieuwsregel zet de dag en de tijd boven de kop, met een container query

- **Datum:** 23 oktober 2026
- **Besluit:** is de nieuwsregel smaller dan 24 rem, dan staan de dag en de tijd boven de kop.
  Het component bepaalt dat met een container query op zijn eigen breedte.
- **Waarom:** bij 24 rem heeft de kop naast de kolom van 5,75 rem nog zo'n 18 rem, ongeveer dertig tekens van de Nieuwskop per regel; smaller wordt de kop een toren van korte regels.
  Op een telefoon is de regel smaller dan 24 rem, op een tablet en groter breder.
  Een container query kijkt naar de ruimte die de regel echt heeft, ook in een kaart met binnenruimte of in de zijbalk; een media query kent alleen het venster.
  Container queries zijn Baseline 'widely available'.
- **Hoe:** een element kan niet naar zijn eigen breedte vragen, dus de `NewsItem` heeft twee elementen.
  Het buitenste, `hf-news-item`, is de container (`container-name: hf-news-item`, `container-type: inline-size`) en houdt de binnenruimte boven en onder en de lijn ervoor.
  Het heeft geen binnenruimte of rand links en rechts, dus zijn breedte is de breedte van de regel.
  Daarbinnen staat `hf-news-item-layout`, het raster.
  Zo werkt het ook voor een `NewsItem` buiten een `List`.
  Onder de 24 rem krijgt het raster één kolom, met 0,125 rem tussen de dag en de tijd en de kop: dezelfde ruimte als tussen de kop en de bron, en veel minder dan de 1,5 rem tussen twee regels.
  Er is geen `order`, dus de volgorde in de HTML en voor een schermlezer is dezelfde.
- **Alternatieven:** een media query, bijvoorbeeld op 40 rem zoals de binnenruimte van de kaart; dan klopt het niet in de zijbalk.
  Of de dag en de tijd altijd boven de kop; dan lijnen de koppen op een breed scherm niet meer uit en wordt de lijst langer.
  Of de kolom smaller maken; "wo 14:05" past niet in minder ruimte.
  Of het `li` als container nemen, zonder extra element; dan klopt het niet voor een `NewsItem` buiten een `List`.

## Koppen in een nieuwsregel zijn pas onderstreept bij hover en focus

- **Datum:** 23 oktober 2026
- **Besluit:** de kop van een nieuwsregel is niet onderstreept.
  Onder de muis en met de focus van het toetsenbord krijgt hij de onderstreping.
  Andere links blijven altijd onderstreept.
- **Waarom:** een lijst met veel onderstreepte koppen is druk, en een kop staat op een eigen regel, zwaarder dan gewone tekst en in de kleur voor links, dus je herkent hem ook zonder streep.
  WCAG vraagt een onderstreping vooral voor een link in een zin (1.4.1).
  Met de onderstreping bij de focus krijgt wie het toetsenbord gebruikt hetzelfde teken als wie de muis gebruikt.
- **Hoe:** alleen de CSS van de nieuwsregel verandert (`news-item.css`), niet de basisstijl van links.
  De kop krijgt `text-decoration-line: none`, en bij `:hover` en `:focus-visible` weer `underline`, zoals het hoofdmenu in de header dat al doet.
  De lijn is 1,5 pixel dik (`1.5px`), onder de muis en bij de focus: dikker dan de lijn van een link die niet onder de muis staat (`0.0625em`, 1 pixel) en dunner dan die van `link.css` bij hover (`0.125em`, 2 pixels).
  Bij de focus staan de dikte en de afstand er ook, zodat die dezelfde lijn krijgt als hover.
  Een dikkere lijn dan de gewone past bij het gewicht van de kop.
  De lijn staat `0.1em` onder de tekst, dichter erbij dan bij andere links (`0.15em`).
  De lijn slaat de staarten van letters over, zoals de g en de p (`text-decoration-skip-ink: auto`).
  Safari doet dat alleen als in `fonts.css` de subset latin-ext vóór latin staat.
  Met eerst latin en dan latin-ext tekende Safari de lijn door de g en de p, ook met `text-decoration-skip-ink: auto`; Chrome en Firefox deden het wel goed.
  Daarom staat latin-ext nu voor latin, bij alle drie de paren (Truculenta, Atkinson en Atkinson cursief), zoals Fontsource ze ook ordent.
  Van twee lettertypebestanden die hetzelfde teken hebben, wint het laatste, en dat hoort latin te zijn.
  De kleuren veranderen niet: een bezochte kop houdt de kleur voor bezocht, en onder de muis krijgt hij de kleur voor hover.
  Bij de focus blijft de kleur zoals hij is.
  De focusrand blijft zichtbaar (2.4.7).
  Storybook toont hover, focus en bezocht met de add-on Pseudo States, in licht en donker.
- **Alternatieven:** alle koppen onderstreept laten, zoals nu.
  Of alleen bij hover, zonder de focus.
  Of alle links pas bij hover onderstrepen; dan is een link in een zin alleen aan de kleur te herkennen.
  Of een dunne lijn, zoals bij een link die niet onder de muis staat (`0.0625em`); dat was een tijd de opzet, maar het paste niet bij het gewicht van de kop.
  Of de lijn net zo dik als bij hover (`0.125em`, 2 pixels) en op de gewone afstand; dat was de opzet daarna, tot de proef met 1,5 pixel.
  Voor Safari: latin-ext weglaten; dan vallen de ligaturen Ĳ en ĳ en andere tekens terug op een ander lettertype.
  Of de lijn zo ver van de tekst zetten dat hij onder de staarten blijft; dan staat hij ver van de kop.

## Voorlopig heeft de kop van een nieuwsregel de maat van gewone tekst en gewicht 500

- **Datum:** 23 oktober 2026
- **Besluit:** voorlopig heeft de kop van een nieuwsregel de maat van Tekst, 16 pixels, in plaats van die van de Nieuwskop, 18 pixels.
  Het gewicht is 500 (Medium) in plaats van 600 (Halfvet).
  De kop blijft in de kleur voor links, met de regelafstand van de Nieuwskop.
- **Waarom:** de projecteigenaar wil zien hoe de lijst leest met koppen in de gewone maat en een lichter gewicht.
  Zonder onderstreping is een kop als link nog te herkennen aan de kleur voor links en zijn eigen regel.
  Het gewicht onderscheidt hem met 500 minder van gewone tekst (400) dan met 600; de reviewer let daar bij toegankelijkheid op (1.4.1).
  Of het blijft, volgt als we het gezien hebben.
- **Hoe:** alleen de CSS van de nieuwsregel verandert: `.hf-news-item-headline` krijgt `font-size: var(--hf-body-font-size)` en `font-weight: 500`.
  De klasse `hf-headline` blijft, voor de regelafstand en het lettertype.
  De regel staat in de laag `hf.components`, bij de rest van de kop, en wint daar van `.hf-headline` in `hf.typography`.
  Eerst stond hij in `hf.typography`, achter `.hf-headline`: in de gebouwde site kwamen de lagen toen in een andere volgorde dan `index.css` ze geeft, met typografie boven componenten.
  Eén regel van de kop is nu zo'n 22 pixels hoog, dus de minimale hoogte van 24 pixels voor het doel (WCAG 2.5.8) komt nu van `min-block-size`.
- **Alternatieven:** de Nieuwskop van 18 pixels en gewicht 600 houden, zoals voor dit besluit.
  Of de maat en het gewicht van de Nieuwskop zelf veranderen, in `--hf-headline-font-size` en `--hf-headline-font-weight`; alleen de nieuwsregel gebruikt ze, maar dan verandert ook wat Storybook bij Typografie over de Nieuwskop zegt.
- **Later:** de grens van 24 rem in _Een smalle nieuwsregel zet de dag en de tijd boven de kop, met een container query_ ging uit van de Nieuwskop.
  Met een kop van 16 pixels past er bij 24 rem iets meer dan dertig tekens op een regel, zo'n vierendertig, en de grens blijft staan.
- **Later:** de regel staat weer in `hf.components`, nu de lagen op de site in de goede volgorde staan; zie _De volgorde van de lagen staat in een eigen bestand_.
- **Later:** zie _Eén stel regels voor het gewicht van letters, met tokens die een bedoeling uitdrukken_ (28 oktober 2026): 500 blijft, "voorlopig" is bevestigd, en de Nieuwskop zelf heeft nu ook gewicht 500, zodat Storybook zegt wat de bezoeker ziet.

## De kolom met dag en tijd in een nieuwsregel is zo breed als de breedste tijd

- **Datum:** 23 oktober 2026
- **Besluit:** de kolom met de korte dag en de tijd is 4 rem breed, met 0,75 rem ertussen en de kop, samen 4,75 rem in plaats van 5,75 rem (4,75 rem en 1 rem).
  De dag en de tijd staan altijd op één regel.
- **Waarom:** de breedste dag en tijd, "ma 20:08", is 61 pixels (3,84 rem) op de maat van Meta.
  In een kolom van 4,75 rem stond er tussen de tijd en de kop 31 tot 39 pixels lucht, naast een kop van 16 pixels.
  De projecteigenaar vond dat te veel.
  Nu is het 15 tot 23 pixels.
- **Hoe:** in `news-item.css` is `grid-template-columns` nu `minmax(4rem, max-content) minmax(0, 1fr)` en `column-gap` is `0.75rem`.
  De tijd krijgt `white-space: nowrap`: een breder lettertype, zoals de reservefont voordat het lettertype is geladen, mag de tijd niet over twee regels verdelen.
  De kolom is voor elke regel even breed, dus de koppen beginnen onder elkaar op dezelfde plek.
  Is een tijd breder dan 4 rem, bijvoorbeeld met de tekstafstand van WCAG 1.4.12 (letterafstand 0,12 em, woordafstand 0,16 em) of in een breder reservelettertype, dan groeit de kolom mee (`max-content`).
  Dan beginnen de koppen niet meer allemaal op één plek, maar raakt de tijd de kop niet: zonder dat stak "ma 08:14" met die tekstafstand 1 pixel over de ruimte tot de kop heen.
  De rem schaalt mee met de tekstgrootte van de bezoeker, net als de tijd.
- **Later:** de grens van 24 rem in _Een smalle nieuwsregel zet de dag en de tijd boven de kop, met een container query_ rekende met een kolom en tussenruimte van samen 5,75 rem.
  Die zijn nu samen 4,75 rem, dus de kop houdt bij 24 rem 19,25 rem in plaats van 18,25 rem, en de grens blijft staan.
- **Alternatieven:** de kolom altijd door de inhoud laten bepalen (`max-content`); dan begint de kop per regel op een andere plek, want "ma" is breder dan "di".
  Of de tijd laten afbreken in plaats van `nowrap`; dan staat "ma" boven "08:14" zodra het lettertype breder is, en springt de regel in hoogte.
  Of de kolom of de tussenruimte nog smaller; dan staat de breedste tijd bijna tegen de kop.
- **Later:** zie _Een datum in een nieuwsregel breekt in de kolom van de weekdag_.
  De kolom blijft 4 rem, maar de tijd mag breken: de dag en de tijd staan niet meer altijd op één regel.

## De volgorde van de lagen staat in een eigen bestand

- **Datum:** 23 oktober 2026
- **Besluit:** de regel met de volgorde van de lagen staat in `src/layers.css`, en `index.css` importeert dat bestand als eerste.
  `index.css` heeft zelf geen `@layer`-regel meer.
  De rooktest controleert op de pagina's die hij toetst dat de lagen in de CSS van de gebouwde site die volgorde hebben.
- **Waarom:** Next.js (Turbopack) voegt de bestanden samen die `index.css` importeert en zet de eigen regels van `index.css` erachter.
  Daardoor stond de `@layer`-regel op de site aan het eind van de CSS, in dev en in productie: op acceptatie op byte 27.113 van 27.180.
  De lagen kregen de volgorde van hun eerste blok: tokens, base, components, typography, utilities.
  Een regel in `hf.components` die een typestijl aanpast, verloor dan op de site, terwijl hij in Storybook won.
  Een geïmporteerd bestand komt op de plek van zijn import, dus nu staat de regel vooraan.
  Storybook (Vite) had de goede volgorde al, en zijn gebouwde CSS is niet veranderd.
- **Hoe:** de rooktest haalt de stylesheets op van de pagina's die hij toetst, in de volgorde van de links.
  Hij zet de lagen in de volgorde waarin ze voor het eerst voorkomen, in een regel of in een blok: de volgorde die een browser kiest.
  Die volgorde vergelijkt hij met `layers.css`, dus de volgorde staat nergens twee keer.
  Op de CSS van vóór deze wijziging faalt de test.
  Een test van het designsysteem controleert dat `layers.css` de eerste import van `index.css` is.
- **Gevolg:** op de site wint een regel in `hf.components` nu van een regel in `hf.typography`, zoals in Storybook.
  Een regel die alleen om deze fout in een andere laag stond, gaat terug naar `hf.components`: de grootte en het gewicht van de kop van een nieuwsregel (zie _Voorlopig heeft de kop van een nieuwsregel de maat van gewone tekst en gewicht 500_).
- **Alternatieven:** de regel in een bestand dat `layout.tsx` vóór `index.css` importeert; dan moet elke app die het designsysteem gebruikt dat zelf onthouden.
  Of de regel ook in `index.css` laten staan; dat is een tweede plek die kan afwijken, en de eerste import doet het werk al.
  Of een instelling van Next.js of Turbopack zoeken; dat hebben we niet onderzocht, omdat één import genoeg is.

## Een eigen component per soort veld, en één Field eromheen

- **Datum:** 23 oktober 2026
- **Besluit:** `Input`, `Textarea` en `Select` zijn eigen componenten, en `Field` zet er het label, de hulptekst en de foutmelding omheen.
  Er is geen `TextField` met een `type`-prop voor alles.
  Verder zijn er `Form`, `Button`, `ErrorSummary` en `Honeypot`.
- **Waarom:** `Select` en `Textarea` hebben andere eigenschappen dan `Input`; één component met alles wordt een berg condities.
  `Field` regelt de koppeling van label en fout op één plek.
  De sjablonen van de site mogen geen HTML bevatten (zie _Sjablonen bevatten geen HTML, alleen componenten uit het designsysteem_), dus ook de `option` van een keuzelijst is een component: `Select.Option`.
- **Alternatieven:** één `TextField` voor alles; of de HTML-elementen in de site toestaan voor formulieren, door de regel te verzwakken.
- **Buiten dit besluit:** een vinkje, een keuzerondje en een bestandsveld.
  Die komen met het eerste issue dat ze nodig heeft.

## Field krijgt een `id` en geeft het veld zijn koppelingen

- **Datum:** 23 oktober 2026
- **Besluit:** je geeft `Field` de `id` van het veld, en het zet op zijn kind (een `Input`, `Textarea` of `Select`) de `id`, `aria-describedby`, `aria-invalid` en `required`.
  De hulptekst krijgt de id `<id>-hint` en de foutmelding `<id>-error`.
  De hulptekst is een `string`: gewone tekst, zonder links of lijsten, net als de foutmelding.
  Een veld is verplicht tenzij `required={false}`, en alleen een veld dat niet verplicht is, zegt dat in het label: "(niet verplicht)".
- **Waarom:** de `id` hoort bij het veld en is ook het doel van een link in de `ErrorSummary`, dus hij moet voorspelbaar zijn en niet gegenereerd.
  Een kind dat `Field` aanpast met `cloneElement` houdt het sjabloon kort: `<Field …><Input name="naam" /></Field>`.
  We vragen alleen wat we echt nodig hebben, dus verplicht is de gewone staat en hoeft geen label.
  Een woord als "niet verplicht" kan iedereen lezen, en een sterretje hoeft niemand te raden (3.3.2).
  Een schermlezer zegt dat een veld verplicht is, want het veld heeft het attribuut `required`.
- **Later:** zie _Een veld kan "niet verplicht" weglaten, en de wedstrijdschermen doen dat_.
  Wat hier staat blijft de gewone staat; `hideOptional` laat het woord weg.
- **Alternatieven:** een render-prop (`{(veld) => <Input {...veld} />}`), die explicieter is maar elk veld langer maakt; of een context, die in een servercomponent niet werkt zonder dat `Field` een clientcomponent wordt.
  Of een `id` die `useId` maakt: de `ErrorSummary` kent die niet, tenzij de pagina hem doorgeeft.
  Of een hulptekst van het type `ReactNode`, zodat er een link in kan; dat raden we af, want sommige schermlezers, zoals VoiceOver, slaan opgemaakte tekst in een beschrijving over.

## De foutmelding is tekst, met een dikkere rand in de kleur van fouten

- **Datum:** 23 oktober 2026
- **Besluit:** een foutmelding bij een veld staat in tekst, in gewicht 500 en in `--hf-colour-text-accent`, en begint voor een schermlezer met "Fout:" (verborgen met `hf-visually-hidden`).
  Een veld met een fout heeft een dikkere rand in dezelfde kleur.
  We maken geen apart kleurtoken voor fouten.
- **Waarom:** kleur is nooit het enige teken (1.4.1), en de tekst zegt wat er mis is en hoe het wel moet (3.3.1, 3.3.3).
  Het accentrood haalt in licht en donker 6,3:1 tot 9,1:1 tegen de pagina en tegen een vlak, dus ruim genoeg voor tekst en voor de rand (3:1).
  Een nieuw token voor een kleur die al bestaat, geeft twee plekken om bij te houden.
- **Alternatieven:** een eigen token `--hf-colour-text-error`.
  Dat kan als fouten ooit een andere kleur dan het accent moeten krijgen.

## Een formulier laat de controle aan de site, en toont de fouten in een blok

- **Datum:** 23 oktober 2026
- **Besluit:** `Form` zet `noValidate` aan, en met `noValidate={false}` krijg je de controle van de browser terug.
  De site controleert zelf en toont de fouten bij het veld en in een `ErrorSummary` boven het formulier: een gebied met een kop en een link naar elk veld.
  Het blok staat buiten het `Form`: een schermlezer slaat een blok binnen het formulier soms over in de formuliermodus, en de maximale breedte van het formulier geldt er dan niet voor.
  Het blok verplaatst de focus niet.
  Zonder fouten toont het niets.
- **Waarom:** de bubbel van de browser staat in de taal van de browser, wordt niet altijd voorgelezen en past niet bij onze woorden.
  Een formulier dat de server controleert, laadt de pagina opnieuw, en een schermlezer begint dan boven aan, bij het blok.
  Controle in de browser met JavaScript valt buiten het issue en komt, als we het nodig hebben, met een eigen issue.
- **Alternatieven:** het blok `role="alert"` geven.
  Op een pagina die opnieuw laadt, leest een schermlezer dat niet betrouwbaar voor, en met JavaScript is de focus verplaatsen een betere oplossing.

## De Honeypot verbergt het veld met `inert` en uit beeld, niet met `display: none`

- **Datum:** 23 oktober 2026
- **Besluit:** de `Honeypot` is een tekstveld in een `div` met `hf-visually-hidden`, `inert` en `aria-hidden`.
  Het veld heeft `tabIndex={-1}` en `autoComplete="off"`.
  De site weigert een formulier waarin het veld niet leeg is.
- **Waarom:** het veld mag niet zichtbaar zijn, niet bereikbaar met Tab en niet voorgelezen worden.
  Robots herkennen `display: none` en slaan zo'n veld over, en dan vangt de val niets.
  Een veld dat uit beeld staat, vullen ze wel in.
  `inert` laat het veld buiten het toetsenbord en de toegankelijkheidsboom, en een browser of wachtwoordmanager vult het niet in, dus er komen geen mensen mee in de val.
  `aria-hidden` en `tabIndex={-1}` vangen een browser op die `inert` niet kent.
- **Alternatieven:** het veld met `display: none` of het attribuut `hidden` verbergen.
  Dat is makkelijker, en een schermlezer leest het ook niet voor, maar robots herkennen het.

## Button heeft een verplicht `type`, Input een lijst van soorten

- **Datum:** 23 oktober 2026
- **Besluit:** `Button` heeft een verplichte prop `type` (`submit`, `button` of `reset`).
  `Input` heeft een `type` uit een vaste lijst, zoals `email` en `url`; een ander type, zoals `checkbox`, laten de types niet toe.
- **Waarom:** een knop in een formulier verstuurt het formulier als je niets zegt, en dat gaat een keer mis.
  Een vinkje, een keuzerondje en een bestandsveld krijgen een eigen component, met hun eigen label en hulptekst; `Input` is alleen voor tekst.
- **Alternatieven:** `submit` als standaard; of elk type van HTML toestaan.

## De opmaak van de velden blijft in `base/forms.css`, de rest zit bij het component

- **Datum:** 23 oktober 2026
- **Besluit:** de regel die `input`, `select` en `textarea` hun look geeft, blijft in `base/forms.css`, want drie componenten delen hem.
  De knop (`button/button.css`), de hoogte van een tekstvak (`textarea/textarea.css`) en het veld met een fout (`input.css`, `select.css`, `textarea.css`) staan bij hun component, in dezelfde laag, met een elementselector zoals bij `Link` en `List`.
  De opmaak zelf is niet veranderd.
  Daarom hebben `Input`, `Textarea`, `Select` en `Button` geen eigen klasse met `hf-`, anders dan het issue vroeg; `Form`, `Field` en `ErrorSummary` hebben die wel.
- **Waarom:** de regel drie keer overschrijven zou drie plekken geven die uit de pas kunnen lopen.
  De regels bij een component zonder eigen klasse volgen `list.css`: een element in `hf.base`.
- **Alternatieven:** de gedeelde regel in elk van de drie bestanden herhalen; of klassen (`hf-input`) en de regels naar `hf.components` verplaatsen.
  Dan is de ruwe `input` zonder component niet meer opgemaakt, en dat is de bedoeling van `base/` niet.
- **Later:** een kleine maat van knoppen en velden (31 oktober 2026, _Knoppen en velden hebben een kleine maat van 36 pixels naast de standaardmaat_) is de eerste klasse op deze elementen: `Button`, `Input` en `Select` zetten `hf-size-small` bij `size="small"`, met de regels daarvoor in `hf.components`.
  De standaardmaat, en dus de opmaak van deze beslissing, blijft zoals hij was.

## Een SegmentedControl bewaart niets, en de ingedrukte knop is gevuld

- **Datum:** 24 oktober 2026
- **Besluit:** `SegmentedControl` is een groep knoppen met een naam, waarvan er één `aria-pressed` is. De ingedrukte knop is gevuld als een gewone knop, de andere is een omlijning in de kleur van de tekst eromheen. Het component bewaart niets: de pagina geeft de waarde en handelt `onChange` af, ook als de ingedrukte knop wordt gekozen.
- **Waarom:** een schakelaar voor licht en donker (#208) is een keuze uit twee opties die meteen werkt. De groep en `aria-pressed` zeggen een schermlezer welke is gekozen, en het verschil tussen gevuld en omlijnd zegt het de ogen zonder kleur. Wat er met de keuze gebeurt, zoals bewaren, is aan de pagina, dus het component blijft klein en bruikbaar voor andere keuzes. In de footer staat de omlijning in de kleur van de footertekst, dus het contrast is dat van de tekst (4,5:1) in licht en donker.
- **Alternatieven:** een eigen component voor alleen het thema, met de opslag erin; dat bindt een knoppenrij aan één functie. Of keuzerondjes (`radio`) in een `fieldset`; dat is meer opmaak voor twee opties en leest een schermlezer minder kort voor. Of één knop die naar het andere thema schakelt; dan zegt de knop niet welk thema je ziet.
- **Later:** zie _De themaschakelaar is één knop rechtsboven in de header_.
  De site gebruikt `SegmentedControl` niet meer voor het thema, maar het component blijft in het designsysteem, en wat hier staat over de groep, `aria-pressed` en de gevulde knop blijft gelden.
- **Later:** zie _De schakelaar is een baan met een schuivende knop_ (31 oktober 2026): de ingedrukte knop is niet meer gevuld en de andere geen omlijning, maar de gekozen keuze ligt op een knop in een baan en heeft dikkere letters.
  De groep, `aria-pressed` en het feit dat het component niets bewaart blijven gelden.

## Head zet één script vóór de eerste weergave in de head

- **Datum:** 24 oktober 2026
- **Besluit:** het designsysteem heeft een component `Head` met één eigenschap, `script`: het adres van een script van de site dat als gewoon script in de `head` staat, zonder `async` of `defer`. `Root` blijft de `html`. Alle andere inhoud van de `head` komt van Next.js, uit de Metadata API.
- **Waarom:** het script dat het gekozen thema op de pagina zet (#208) moet klaar zijn voordat de pagina getekend wordt, anders flitst ze in het verkeerde thema. De sjablonen van de site mogen geen HTML bevatten (_Sjablonen bevatten geen HTML, alleen componenten uit het designsysteem_), en _De namen van de paginacomponenten volgen NL Design System_ zegt dat een `Head` komt als er extra inhoud in de `head` nodig is.
- **Alternatieven:** `next/script` met `strategy="beforeInteractive"`. Dat zet alleen een `preload` in de `head`, en het script zelf start Next.js pas als de app laadt (we lazen het in de gebouwde HTML), dus de pagina flitst al. Of een inline script; dat past in de CSP, maar de code staat dan in een tekst in een component en niet in een bestand dat een test kan lezen. Of een eigenschap `head` op `Root`; dat maakt `Root` groter terwijl `Head` er al naast hoort te staan.

## Root zet data-scroll-behavior op de html, naast de CSS voor soepel scrollen

- **Datum:** 25 oktober 2026
- **Besluit:** het attribuut `data-scroll-behavior="smooth"` hoort bij `Root`, naast de CSS die het soepel scrollen aanzet. Het staat in `Root` achter de meegegeven eigenschappen, zoals `lang`, dus een pagina kan het niet veranderen. Het commentaar in `Root.tsx` en dat in `root.css` verwijzen naar elkaar.
- **Waarom:** sinds Next.js 16 zet Next.js `scroll-behavior: smooth` niet meer uit tijdens het wisselen van pagina, tenzij `html` dit attribuut heeft. Zonder het attribuut meldt de dev-server een waarschuwing, en schuift een pagina die zonder herladen opent (nu na een formulier, later met links) vanaf de oude plek soepel omhoog in plaats van meteen bovenaan te staan. Het attribuut en de regel `scroll-behavior: smooth` horen bij elkaar, en `Root` is het onderdeel dat `html` maakt. Zo kan geen pagina het ene zonder het andere hebben.
- **Alternatieven:** het attribuut in `apps/site/src/app/layout.tsx` zetten; dan staat het los van de CSS. De waarschuwing negeren; de pagina's laden nu bijna altijd helemaal opnieuw, maar de waarschuwing blijft elke ontwikkelaar storen en het effect komt terug zodra er links met `next/link` komen.

## Button heeft een zachte uitvoering, met een rand die het contrast draagt

- **Datum:** 25 oktober 2026
- **Besluit:** `Button` krijgt een prop `appearance` met de waarden `default` (de gevulde knop) en `soft` (een lichtblauwe vulling met blauwe tekst), in de geëxporteerde lijst `buttonAppearances`. De gevulde knop heeft geen eigen klasse, de zachte heeft `hf-button-soft`. De vulling haalt 3:1 tegen de kaart niet, dus de zachte knop heeft een rand met een eigen kleur die dat wel haalt. De zachte knop gebruikt vier nieuwe tokens: `--hf-colour-background-button-soft`, `--hf-colour-background-button-soft-hover`, `--hf-colour-text-on-button-soft` en `--hf-colour-border-button-soft`.
- **Waarom:** de zachte vulling is rustig genoeg naast de koppen en blijft toch herkenbaar als knop. Een prop past bij hoe `Text` en `Card` hun uitvoering kiezen. Gemeten in licht: blauw-100 op wit haalt 1,21:1 en blauw-200 1,48:1, dus een vulling alleen is te zwak. De rand blauw-500 haalt 3,84:1 of meer op de vier vlakken (wit, sterk, zacht en warm) en 3,86:1 tegen de vulling. In donker haalt blauw-700 op de donkere vlakken 1,69:1 en 1,33:1, de rand blauw-400 dan 5,28:1 en 4,16:1. De tekst haalt 10,25:1 op de vulling in licht en 8,38:1 onder de muis, in donker 8,57:1 en 6,34:1. Onder de muis wordt de vulling in licht donkerder (blauw-200) en in donker lichter (blauw-600), zoals de gevulde knop dat doet: de knop wordt dan sterker. De rand blijft bij de muis gelijk. De focusrand is die van `base/focus.css`, dus net zo zichtbaar als bij de gevulde knop. De rand houdt de knop in geforceerde kleuren zichtbaar, en een rand van 1 pixel maakt de knop even groot als de gevulde.
- **Alternatieven:** de vulling zo donker maken dat ze 3:1 haalt; dan lijkt de knop weer op de gevulde en valt de zachte knop niet meer terug. Een uitvoering met alleen een rand, of alleen tekst; die lijkt op een link. Een apart onderdeel zoals `SecondaryButton`; dat geeft dubbel werk bij elke wijziging aan knoppen.
- **Later:** zie _De gevaarlijke knop is rood en gevuld, alleen voor wat je weghaalt_ (2 november 2026): `appearance` heeft er een derde waarde bij, `danger`; `default` en `soft` blijven zoals ze waren.

## De strepen staan aan het einde van de pagina en scrollen mee

- **Datum:** 25 oktober 2026
- **Besluit:** de strepen van de Friese vlag staan aan het einde van de pagina en scrollen met de pagina mee, over de footer en erboven; ze staan niet vast aan de onderkant van het scherm.
- **Waarom:** de projecteigenaar vindt het prettiger voor het oog als de strepen met de pagina meescrollen, in plaats van dat de kaarten er voorlangs scrollen, en het laat zien dat je het einde van de pagina bereikt.
  Daarnaast is de hoogte zo een percentage van de footer ("2 tot 3 keer zo hoog") en volgt hij de footer op een telefoon, zonder JavaScript en zonder vaste maat.
  Alleen de tekst bij de footer ligt over de strepen, niet elke tekst die voorbijscrolt, dus het contrast hoeft alleen daar te kloppen.
- **Alternatieven:** vast aan de onderkant van het scherm (`position: fixed`; altijd zichtbaar, maar de hoogte is dan een vaste maat, tekst scrolt over de strepen heen en een vast element onderaan een iPhone gedraagt zich lastig met de werkbalk van Safari); strepen als achtergrond van de hele pagina (geen duidelijke "hoogte van de footer" en ze zijn dan overal te zien).

## De strepen zijn alleen CSS: twee pseudo-elementen van de footer

- **Datum:** 25 oktober 2026
- **Besluit:** de strepen zijn alleen CSS: twee pseudo-elementen van de footer met een `repeating-linear-gradient` en een `mask-image`, onder een hoek van 35 graden.
  Ze doen geen verzoek.
  `::before` is het deel over de footer, onder de tekst en de knoppen erin (die krijgen `position: relative`); `::after` is het deel boven de footer, met `z-index: -1`.
  Beide delen hebben dezelfde gradient en dezelfde `background-size` en `background-position`, zodat de strepen zonder naad over de bovenrand van de footer doorlopen.
  `.hf-page` krijgt `isolation: isolate`.
- **Waarom:** de site doet geen verzoeken naar derden en moet snel blijven.
  Een gradient en een masker worden één keer getekend en scrollen mee met de pagina.
  De richting is die van de vlag (van linksboven naar rechtsonder, 34,695 graden).
  Er zijn twee pseudo-elementen nodig, omdat de achtergrond van de footer boven alles met een negatieve `z-index` wordt getekend: de strepen over de footer moeten boven die achtergrond en onder de tekst liggen, en de strepen erboven onder de kaarten.
  Met `isolation: isolate` op `.hf-page` liggen de strepen boven de pagina en onder de inhoud, ook binnen een element dat zelf een achtergrond tekent, zoals de themawrapper in Storybook.
- **Alternatieven:** een SVG of PNG als achtergrondafbeelding (een extra bestand en een verzoek, en het schaalt niet mee met de footer); één pseudo-element met ook de achtergrond van de footer erin (de footer wordt dan een tekening in plaats van een vlak, en de rand en de kleur van de footer hangen van het masker af); een laag in de kleur van de pagina over de strepen in plaats van een masker (zelfde uiterlijk, maar de laag moet de kleur van de pagina kennen; dit is de terugvaloptie als een masker ergens vreemd uitpakt).

## Twee kleurtokens voor de strepen, uit grijs-300 en blauw-800

- **Datum:** 25 oktober 2026
- **Besluit:** twee nieuwe kleurtokens, `--hf-colour-background-stripe` (boven de footer) en `--hf-colour-background-stripe-footer` (over de footer), gemaakt van grijs-300 in licht en blauw-800 in donker, met een dekking per deel (licht 30% en 30%, donker 40% en 60%).
- **Waarom:** "iets donkerder" werkt in licht, maar in donker is de pagina al bijna het donkerste blauw, dus daar is de streep iets lichter en blauwer.
  In licht is een warm grijs rustiger dan blauw en past bij de pagina en de footer, die zelf uit het grijs komen.
  Beide kleuren staan al in het palet, dus er komt geen nieuwe stap bij.
  Over de footer is de streep in licht donkerder dan de footer, dus de tekst in de footer heeft daar minder contrast dan op de footer zelf: bij 30% haalt secundaire tekst 4,53:1 tegen 4,5:1, bij het gekozen 50% niet (4,36:1).
  In donker is de streep lichter dan de footer en het contrast ruim voldoende.
  Twee tokens, omdat de dekking per deel en per thema verschilt en `light-dark()` geen getallen kiest, alleen kleuren.
- **Alternatieven:** staal (steel-200 in licht, blauwer en frisser, even licht als de footer en dus zonder contrastprobleem); zand (zand-300 en zand-700, warmer, dezelfde krappe marge); één token voor beide delen (de dekking boven en over de footer is dan gelijk, wat in donker niet gewenst was); een streep die uit de pagina en een tint gemengd wordt (geeft kleuren die in geen enkele reeks staan).

## De contrasttabellen meten een streep op het vlak eronder

- **Datum:** 25 oktober 2026
- **Besluit:** een paar in `pairGroups` kan een `under` hebben: het vlak waarop een doorzichtige achtergrond ligt.
  De tabellen in Tokens/Kleur rekenen de streep over dat vlak heen uit (`flatten` in `docs/contrast.ts`) en meten het contrast op de uitkomst.
  Voor de strepen boven de footer is dat de pagina, voor de strepen over de footer de footer.
- **Waarom:** een streep is doorzichtig, en het contrast van een doorzichtige kleur is niet te meten zonder de kleur eronder.
  De menging gebeurt in `flatten` zelf, niet op een canvas: een canvas mengt in 8 bits en verschoof het contrast van secundaire tekst in de footer van 4,53:1 naar 4,50:1, terwijl de marge daar maar 0,03 is.
- **Alternatieven:** de tint met `color-mix()` vooraf in een eigen token mengen met de pagina of de footer (dat zijn extra tokens die alleen de tabel gebruikt); de streep zonder het vlak eronder meten (dat meet niets, want de streep is doorzichtig).

## Een kop met een anker is zelf de link, met een ketting als pictogram

- **Datum:** 26 oktober 2026
- **Besluit:** een kop met een anker is een link naar zichzelf, met de tekst van de kop als naam en een pictogram van een schakel erachter.
  Het pictogram staat altijd op een aanraakscherm en verschijnt bij hover en focus waar een muis is.
  Het doel krijgt een rustige markering.
- **Waarom:** de naam van de link is de tekst van de kop, dus een schermlezer hoort waarheen hij gaat.
  Een pictogram dat alleen op hover verschijnt, is er niet voor wie geen muis heeft.
  De ketting is een teken dat ook niet-technische lezers kennen, anders dan een hekje.
  De markering laat de bezoeker die via de link komt zien welk deel is bedoeld.
- **Hoe:** `Heading` heeft de eigenschap `anchor` (alleen voor `h2` tot en met `h4`) en nieuwe pictogram `link`, zelf getekend zoals de andere.
  Met een muis (`@media (hover: hover)`) is het pictogram er bij hover en bij focus van het toetsenbord, en het houdt zijn plaats, zodat er niets verschuift.
  Op een aanraakscherm staat het altijd, in de kleur van secundaire tekst, en bij hover of focus in de kleur van links.
  Het blijft bij de laatste letter van het laatste woord, zodat het niet alleen op een regel komt en een lang woord toch kan afbreken.
  Het doel (`:target`) krijgt een pijl (`arrow-right`) aan de beginkant, in het midden van de opvulling van de kaart (zonder kaart in de marge van de pagina), in de kleur van de focus, zonder beweging; in forced colours heeft de pijl de kleur van het systeem.
  De projecteigenaar koos de pijl in plaats van een balk in de kleur van de accenten (26 oktober 2026), en de kleur van de focus omdat die al zegt waar je bent.
  `Card` zegt in `--hf-heading-gutter` hoe breed die opvulling is.
  De pijl staat in de opmaak, niet in de stijl, want een stijl kan geen pictogram tekenen zonder een verzoek om een afbeelding, en de regels van de site staan dat niet toe.
  Bij het afdrukken valt het pictogram weg.
- **Alternatieven:** een hekje (`#`) achter de kop (bekend bij technische lezers, minder bij supporters); een pictogram in de marge links van de kop (past niet in een kaart met opvulling en komt buiten het scherm op een telefoon); een aparte link met de tekst "Link naar dit kopje" (extra tekst bij elke kop, die een schermlezer steeds opnieuw voorleest).

## Een anker is een `id` in het Nederlands dat de pagina kiest, en blijft bestaan

- **Datum:** 26 oktober 2026
- **Besluit:** een anker is een `id` in het Nederlands, van kleine letters, cijfers en streepjes, dat de schrijver van de pagina kiest en niet uit de tekst van de kop wordt gemaakt.
  Een oud anker blijft werken met een leeg element met het oude `id` in de kop, en een controle faalt als een gepubliceerd anker verdwijnt.
- **Waarom:** de tekst van een kop verandert vaker dan het onderwerp, en een link die ergens op staat (een andere site, een bericht in het forum) mag niet stuk gaan.
  De server ziet het deel na het hekje nooit, dus een doorverwijzing van een oud anker op de server kan niet, en een script om oude ankers om te zetten werkt alleen met JavaScript.
  Een leeg element met het oude `id` werkt overal.
  Nederlandse ankers passen bij een site in het Nederlands, en bij links die supporters aan elkaar sturen.
- **Hoe:** `Heading` weigert een `id` dat niet aan de regels voldoet, met een fout bij het renderen (`isAnchorId` in `anchor.ts`): kleine letters en cijfers in woorden met één streepje ertussen, niet langer dan 40 tekens.
  Een oud anker (`aliases`) mag de regels overtreden, want het bestond al, zoals `versie-0.2.0`.
  Een kop die naar een andere pagina verhuist, neemt zijn anker mee, en de oude pagina verwijst blijvend door in `next.config.ts`, waar elke doorverwijzing een reden heeft.
  De browser houdt het deel na het hekje vast in zo'n doorverwijzing, als de doorverwijzing er zelf geen heeft.
- **Alternatieven:** het anker automatisch uit de tekst van de kop maken (elke wijziging van de kop breekt de link); oude ankers met een script op de pagina omzetten (werkt niet zonder JavaScript); geen controle op verdwenen ankers (een link breekt dan pas als iemand het merkt).

## De kaarten van een zijbalk staan standaard onder elkaar, naast elkaar is een optie

- **Datum:** 26 oktober 2026
- **Besluit:** `Page.Sidebar` zet haar cellen standaard onder elkaar, op elke breedte.
  De eigenschap `split` zet ze naast elkaar zodra er twee van 16 rem met 2 rem ertussen passen, zoals ze tot nu toe deden.
  `/bronnen` kiest `split`.
- **Waarom:** twee kaarten naast elkaar werken voor kleine kaarten, zoals op `/bronnen`, maar kaarten met lijsten, zoals de discussies en de podcasts op de homepage, worden er smal en krap van.
  Een standaard die voor de meeste pagina's goed is, en een keuze voor de pagina die er baat bij heeft, is eenvoudiger dan een regel die op elke pagina moet worden afgezet.
- **Hoe:** de regel met `repeat(auto-fit, minmax(min(16rem, 100%), 1fr))` is nu `.hf-page-sidebar-split`, en de zijbalk houdt één spoor.
  De regel `.hf-page-sidebar-wide` voor de kolommen van de cellen is vervallen, want dat is nu de standaard; `wide` maakt de zijbalk alleen nog breder, met dezelfde sporen als eerst: 38, 2 en 24 rem voor een gewone zijbalk en 31, 2 en 31 rem voor een brede.
  De zijbalk staat nog na de hoofdkolom in de bron, zonder `order`, en de benoemde gebieden voor een pagina met een inleiding blijven gelden.
- **Alternatieven:** de verdeling in twee kolommen helemaal weghalen (`/bronnen` verliest iets wat goed werkte); de verdeling als standaard laten en per pagina afzetten, zoals met `wide` (elke nieuwe pagina met lijsten moet eraan denken).

## Een donutdiagram is een eigen onderdeel in SVG, met een positieve en een negatieve kleur

- **Datum:** 26 oktober 2026
- **Besluit:** het designsysteem krijgt `DonutChart`: een ring van plakken, getekend als SVG in onze eigen code, met het totaal in het gat en bij elke plak de naam en de waarde als tekst.
  Een waarde van nul krijgt geen plak en geen tekst; een diagram zonder waarden toont een lege ring met een nul.
  Meer diagrammen naast elkaar staan in een `DonutChart.Group`.
- **Waarom:** de kaart Doelpunten per kwartier (#344) vraagt twee taartdiagrammen, en een grafiekbibliotheek is een dependency en laadt of berekent meer dan twee ringen nodig hebben.
  Een ring met een totaal in het gat leest beter dan een volle taart: het getal staat op de plek waar het oog heen gaat, en de plakken zijn dunner, dus de verschillen in hoek vallen beter op.
  De vorm is de keuze van de Builder, voorgelegd aan de projecteigenaar in Storybook; een taart zonder gat of een donut zonder getal is een kleine wijziging van `ring` in `geometry.ts` en de regel voor het totaal in `donut-chart.css`.
- **Hoe:**
  - De plakken lopen met de klok mee vanaf boven, in de volgorde van de gegevens, zoals een wijzerplaat.
  - De kleur komt uit de bestaande uitkomsttokens, gekozen met de eigenschap `tone`: `positive` is `--hf-colour-outcome-win` en `negative` is `--hf-colour-outcome-loss`.
    Het onderdeel kent geen voetbal: de pagina bepaalt welke getallen positief zijn, en `/wedstrijden` kiest `positive` voor de doelpunten voor en `negative` voor de tegendoelpunten.
    Er komen geen nieuwe tokens bij.
  - De plakken lopen op van 70% van de kleur naar de volle kleur, in de volgorde van de plakken.
    70% is het zwakste dat nog 3:1 haalt op het vlak van de kaart: 3,39:1 voor het groen en 4,22:1 voor het rood in licht, 4,81:1 en 4,43:1 in donker.
  - Het verschil tussen twee buurplakken is kleiner dan 3:1.
    Een rand in de kleur van het vlak, van 3 eenheden van de tekening, scheidt ze, en elke plak heeft zijn eigen tekst.
    Niemand hoeft een kleur te zien om een plak te lezen.
  - De tekening is 320 bij 300 eenheden en schaalt met de breedte van het diagram.
    De teksten zijn HTML, met een vaste grootte in rem, en staan in procenten van de tekening om de ring.
    Zo blijven ze op een telefoon even groot als de tekst van de pagina, en volgen ze het tekstformaat van de bezoeker.
  - Staan twee teksten minder dan 40 graden van elkaar, dan schuiven ze uit elkaar en loopt er een streepje van de plak naar de tekst (`spreadAngles` in `geometry.ts`).
  - Diagrammen staan naast elkaar zolang elk 10 rem breed kan zijn, en anders onder elkaar (`repeat(auto-fit, minmax(min(10rem, 100%), 1fr))`): de breedte van de plek telt, niet die van het scherm.
  - Het diagram heeft `aria-hidden="true"` en geen eigen beschrijving: het is een plaatje van getallen, en dezelfde getallen staan in een `DataTable` ernaast.
  - Er is geen beweging en geen hover.
    In forced colors krijgen alle plakken één kleur en doet de rand het werk.
- **Nadeel:** de teksten zijn geen onderdeel van de SVG, dus een diagram dat je als plaatje bewaart, heeft ze niet.
  Zes plakken in een ring van een kolom van 31 rem zijn klein: de ring is ongeveer 110 pixels breed.
- **Alternatieven:** een taart zonder gat (meer oppervlak, maar geen plek voor het totaal); het getal in de plak zelf (kleine plakken van één doelpunt zijn te smal); een legenda onder het diagram (de koppeling loopt dan alleen via de kleur); zes of twaalf nieuwe kleurtokens voor de plakken (veel om bij te houden, en toch geen 3:1 tussen buren); de teksten als SVG-tekst (die schaalt mee en wordt op een telefoon te klein); een grafiekbibliotheek (het issue sluit die uit).
- **Later:** zie _De scheiding in een ring is een lichte omlijning, in licht en in donker_.
  De lijn tussen de plakken is niet meer de kleur van het vlak maar een eigen rol, `--hf-colour-border-chart-slice`; de rest blijft.
- **Later:** zie _Een donutdiagram heeft een plak per uitslag, en de tabel is de legenda_ (2 november 2026).
  Elke plak kan een eigen kleur hebben, ook het grijs van een gelijkspel, en de tekst rond de ring kan ontbreken; de tekst bij elke plak geldt nu alleen voor een diagram met `labels`, dat de standaard blijft.

## Een pagina in Storybook is kort, met het voorbeeld en een story per variant

- **Datum:** 23 oktober 2026
- **Besluit:** de pagina van een component in Storybook heeft een titel, een korte tekst, het voorbeeld met controls en de stories die nodig zijn.
  - **Tekst per component:** één alinea over waarom het component er is en wanneer je het kiest.
    Geen regels over marges, maten of afstanden: die staan in de code en in dit log.
    Een regel voor het gebruik die een bezoeker of schrijver nodig heeft, mag er staan als één zin.
  - **Stories:** per component het voorbeeld met controls, en een story per variant die er anders uitziet, niet per prop.
    Licht en donker komt van de themaknop, niet van een tweede story per component.
    Alleen een component dat zelf van thema verandert, zoals op een donker vlak, krijgt een eigen donkere story.
  - **Hover, focus en bezocht en de breedtes:** die zitten niet in de stories van elk component.
    De reviewer controleert ze op de pagina's (de checklist in `docs/toegankelijkheid.md`).
    De stories voor links en formulieren tonen ze één keer.
    Voor een smal en een breed scherm gebruiken we de werkbalk van Storybook, geen aparte stories.
  - **Controls:** een component krijgt controls zodra meer dan één prop de uitkomst verandert.
    De typen met `(typeof lijst)[number]` veranderen we niet.
    De weergave lossen we op in `ControlsDocsPage`, zodat de MCP-server de typen blijft lezen uit de code.
  - **Pagina:** `ControlsDocsPage` is de standaard voor een component (titel, beschrijving, voorbeeld, controls).
    De gedeelde `DocsPage` blijft voor hoofdstukken zonder voorbeeld, zoals Huisstijl en Redactie.
  - **Wat axe niet ziet:** de reviewer kijkt naar de pagina's van de site in licht en donker, volgens de checklist, en niet naar elke story.
    De eis "nagekeken in licht en donker" in `CONTRIBUTING.md` wordt "elk visueel component heeft een story, en de reviewer kijkt naar de pagina's".
    Dit blijft gelden voor wat axe niet ziet, ook na _Axe draait op elke story, in licht en donker_.
  - **Tokens:** de tabellen met kleuren en contrast blijven staan, want de contrasttabel is het bewijs voor `docs/toegankelijkheid.md`.
    De waarden in rem en pixels gaan uit de tekst, niet uit de tabellen die ze berekenen.
- **Waarom:** een korte pagina wordt gelezen en blijft waar.
  Wat de code of de beslissingen al zeggen, hoeft niet nog eens te staan en loopt anders uit de pas.
  De themaknop en de pagina's van de site dekken licht en donker beter dan een story per component.
- **Alternatieven:** uitgebreide pagina's met alle regels per component; dat geeft veel onderhoud en dubbel werk.
  Een story in licht en een in donker per component; dat waren 26 bestanden aan stories om bij te houden.
  Alles uit Storybook halen en alleen de code laten spreken; de MCP-server en nieuwe vrijwilligers verliezen dan hun handboek.

## Storybook heeft de groepen Componenten en Patronen

- **Datum:** 26 oktober 2026
- **Besluit:** de zijbalk heeft de groepen Componenten en Patronen, en een verplaatste story mag een nieuw adres krijgen.
  - **Indeling:** een component is één element of een algemeen onderdeel dat op elke site past.
    Een patroon zet componenten samen voor één soort inhoud van deze site.
    Componenten heeft vijf subgroepen:
    - Pagina: Root, Body, Head, Page en de delen van Page.
    - Tekst: Heading, Text, Link, List, Emphasis, Strong en Time.
    - Formulier: Form, Field, Input, Textarea, Select, Button, SegmentedControl, ErrorSummary en Honeypot.
    - Navigatie: Navigation, Pagination, Filter, RefreshButton en PullIndicator.
    - Weergave: Card, DataTable, DonutChart, Pictogram en Logo.
  - **Patronen:** NewsItem, ArticleCard, Article, DiscussionItem, WikipediaCredit, Match, ShortMatch, StandingsTable en TopScorersTable.
    Navigation, Pagination, Filter, SegmentedControl en ErrorSummary bouwen op andere componenten, maar zijn algemeen en blijven componenten.
    Het lege hoofdstuk Patronen en de pagina Componenten/Overzicht vervallen.
    De volgorde in de zijbalk staat vast in `storySort`, binnen een groep alfabetisch.
    Een pagina van een patroon is zoals die van een component, met één zin erbij waaruit het is gebouwd.
  - **Nieuwe adressen:** een verplaatste story mag een nieuwe URL en een nieuw id in de MCP-server krijgen.
    Huisstijl, Redactie, Tokens en HTML-elementen houden hun id, omdat het sjabloon van de pull request en `CONTRIBUTING.md` ernaar linken.
- **Waarom:** de indeling laat iemand die de zijbalk opent zien wat algemeen is en wat bij deze site hoort, zoals het Amsterdam Design System dat met zijn subgroepen doet.
  Dat kan zonder pagina's vol tekst.
- **Gevolg:** de stories verhuizen met #350.
- **Alternatieven:** de groep Composities of Pagina's noemen in plaats van Patronen.
  Subgroepen op soort component in plaats van op functie.

## Axe draait op elke story, in licht en donker

- **Datum:** 26 oktober 2026
- **Besluit:** de Vitest-addon van Storybook draait axe op elke story in een echte browser, één keer in licht en één keer in donker.
  Dat wordt `pnpm test:stories` en een stap in CI.
  Dit keert _axe toetst de pagina's, niet de stories_ om, en neemt het alternatief over dat bij _Componenten testen we met Vitest en Testing Library_ is afgewezen.
  - **Wat blijft:** de controle van de pagina's van de site en de checklist van de reviewer.
    Axe ziet geen hover, focus, toetsenbordvolgorde, schermlezers, alt-teksten, zoom of regels voor een hele pagina.
    De regel _Wat axe niet ziet_ in _Een pagina in Storybook is kort, met het voorbeeld en een story per variant_ blijft daarom gelden.
  - **Niet nu:** geen play-tests en geen visuele regressietests.
    Er is één component met gedrag in de browser, en een dienst voor schermafbeeldingen kost meer onderhoud dan hij oplevert voor één lezer.
    We kijken opnieuw bij het eerste component met echt gedrag.
- **Waarom:** de Vitest-addon vraagt een kleine instelling, draaide alle 298 stories in ongeveer 6 seconden per thema en vangt wat de themaknop en de reviewer missen.
  De drie redenen van de oude beslissing gelden niet meer: de instelling is klein, CI wordt minder dan een minuut langer, en twee componenten (PullIndicator en RefreshButton) staan op geen enkele pagina.
- **Gevolg:** de oude beslissingen _axe toetst de pagina's, niet de stories_ en _Componenten testen we met Vitest en Testing Library_ hebben een **Later:**-regel.
  De controle zelf komt met #351.
- **Alternatieven:** een eigen script met Playwright en `@axe-core/playwright` over alle stories; dat is een script van veertig regels om te onderhouden, en het steunt geen play-tests.
  De checks laten zoals ze zijn, met alleen het paneel in Storybook.

## De teksteditor staat in een eigen onderdeel van het package, zodat Tiptap alleen laadt waar hij nodig is

- **Datum:** 27 oktober 2026
- **Besluit:** `RichTextEditor` komt niet uit het hoofdbestand van het designsysteem, maar uit `@fansite/design-system/rich-text-editor`.
  Alleen een pagina die dat bestand importeert, krijgt Tiptap in haar JavaScript.
- **Waarom:** Tiptap is groot.
  Een proefpagina met de editor kreeg één bestand van 391 kB (123 kB gezipt) erbij, en geen enkele andere route verwees ernaar.
  Het hoofdbestand is een rij `export`s, en het package zegt niet dat de bestanden geen neveneffecten hebben, dus een bundelaar mag niet aannemen dat hij een ongebruikte export kan weglaten.
  Een eigen onderdeel laat Tiptap buiten beeld zonder dat we op een bundelaar hoeven te vertrouwen.
- **Hoe:** de editor is een clientcomponent (`'use client'`) in `src/components/rich-text-editor/`, met de stijlen in `rich-text-editor.css` in `index.css` (een paar regels die elke pagina krijgt).
  `index.test.ts` controleert dat het hoofdbestand de editor niet geeft en dat de `exports` van het package naar een bestand wijzen.
  - We nemen alleen de onderdelen die nodig zijn: `core`, `react`, `pm`, de extensies voor document, alinea, tekst, kop, lijst met bolletjes, lijstpunt, vet, cursief en link, en `extensions` voor ongedaan maken en opnieuw doen.
    Het is geen `starter-kit`, want die brengt onderdelen mee die we niet gebruiken.
    Alle pakketten zijn MIT, hebben geen installatiescript dat bij het installeren draait en doen zelf geen verzoeken naar buiten.
    `allowBuilds` verandert niet.
  - Een lijstpunt bevat één alinea, dus er is geen lijst in een lijst, en Tab en Shift+Tab verplaatsen geen lijstpunt maar verlaten de editor.
    Zo zit er geen toetsenbordval in, en de opmaak blijft die van een artikel nu.
  - Een link bewaart alleen het adres.
    Een adres dat niet met `https://` of met een enkele `/` begint, geeft geen link, ook niet in geplakte tekst.
    De editor maakt zelf geen link van een adres dat iemand typt of plakt.
  - De editor bewaart de tekst als Tiptap's JSON in een verborgen veld, dat bij elke wijziging wordt bijgewerkt.
    Het kleine formulier voor een link is geen `form`, want de editor staat zelf in een formulier, en zijn velden hebben geen naam en horen bij geen formulier, dus ze worden nooit verstuurd.
- **Alternatieven:** de editor uit het hoofdbestand geven en `next/dynamic` gebruiken (de gebruiker van het package moet dan weten dat het moet, en een vergeten import voegt stilletjes 123 kB toe aan elke pagina); `"sideEffects": false` in het package (dat is een belofte over alle bestanden, ook de CSS, en geeft geen zekerheid voor een clientcomponent); de editor in `apps/site` zetten (dan is het geen component van het designsysteem, zonder stories en axe).

## Beweging heeft vaste duren en curves, en valt bij minder beweging op één plek weg

- **Datum:** 27 oktober 2026
- **Besluit:** het designsysteem heeft een kleine reeks tokens voor beweging (duren en curves) en een taal die elke toestandswisseling in een groep zet.
  Alleen kleur, doorzichtigheid en transformatie bewegen.
  Bij `prefers-reduced-motion: reduce` valt elke overgang uit de taal weg, en dat is geregeld bij de tokens, niet per onderdeel.
  Een test bewaakt dat.
- **Waarom:** zonder taal kiest elk onderdeel zijn eigen duur en versnelling, en voelt de site als een verzameling losse handelingen.
  Een vaste reeks maakt het goedkoop om iets toe te voegen en maakt "minder beweging" een eigenschap van het systeem.
  Beweging van kleur en doorzichtigheid belast de pagina het minst en verschuift niets onder de ogen van wie leest.
- **Hoe:** `tokens/motion.css` heeft drie duren (`--hf-motion-duration-quick`, `-short` en `-medium`) en vier curves (`--hf-motion-ease-change`, `-morph`, `-enter` en `-exit`), in de laag `hf.tokens`.
  Bij `prefers-reduced-motion: reduce` zijn de drie duren 0 s, in datzelfde bestand.
  De vijf groepen zijn Aanwijzen, Ingedrukt en geselecteerd, Verschijnen en verdwijnen, De hele pagina en Zonder overgang.
  Het hoofdstuk Beweging in Storybook (Tokens/Beweging) heeft de tokens, de groepen, de regels, een voorbeeld per groep en de lijst van alle toestandswisselingen.
  De themaknop gebruikt de tokens: `--hf-theme-button-morph` is nu `var(--hf-motion-duration-medium)`, en kleur, rand en vulling nemen de korte duur.
  Hij ziet en beweegt er hetzelfde uit; het `@media`-blok voor `no-preference` is weg, omdat de duur van de tokens met minder beweging 0 s is.
  `tokens/motion-css.test.ts` faalt op een tijd in de CSS buiten `motion.css`, en op een `transition` of `animation` die haar duur niet uit een token haalt.
  De enige uitzondering is vloeiend scrollen in `root.css`, dat zijn eigen `@media` heeft.
  Het label van `PullToRefresh` volgt de vinger, heeft geen overgang en blijft zoals het is.
  Dit besluit zet zelf geen overgang in een onderdeel; dat komt per groep in eigen issues.
- **Alternatieven:** per onderdeel een eigen overgang laten kiezen; dat geeft geen samenhang.
  Of een bibliotheek voor animaties; dat is een dependency voor iets wat CSS kan.
  Of helemaal geen overgangen behalve de themaknop; dat laat de site hard aanvoelen, en het besluit is dat beweging een bewuste keuze is, geen toeval.
- **Later:** vult het besluit _Onder de muis en bij focus toont de themaknop het thema waar je naartoe gaat_ (27 oktober 2026) aan: de duren staan nu in de tokens van `motion.css`.
- **Later:** zie _De knop van de schakelaar schuift in de langste duur, en de letters gaan mee_ (4 november 2026): de knop van de schakelaar neemt de langste duur, en de letters van de gekozen keuze gaan over van gewone naar dikke letters.
- **Later:** zie _De uitklap van de bronvermelding van Wikipedia gaat zacht open en dicht_.
  "Alleen kleur, doorzichtigheid en transformatie bewegen" kent één uitzondering: de hoogte van die uitklap.
  Hij staat in de groep Verschijnen en verdwijnen en neemt de curve van het pijltje.

## Het label van de balk blijft staan, de rij scrolt, en de vervaging is CSS

- **Datum:** 27 oktober 2026
- **Besluit:** het label "Op deze pagina:" van `Page.Shortcuts` scrolt niet mee.
  De rij scrolt zijwaarts zonder schuifbalk, met een half afgesneden laatste link en een vervaging aan de rand die er alleen is als er iets te scrollen valt.
  Bij 20em of minder loopt de rij om.
- **Waarom:** wie halverwege de rij is, ziet nog steeds wat de rij is.
  Een afgesneden link en een vervaging zeggen dat er meer is, zonder schuifbalk.
  Bij 400% zoom mag de pagina niet zijwaarts scrollen (WCAG 1.4.10), dus daar loopt de rij om.
  20em volgt de lettergrootte van de bezoeker, dus wie grotere tekst heeft, krijgt de omlopende balk eerder dan bij 320 pixels.
- **Hoe:** de vervaging is een `mask-image` met twee lengtes (`--hf-shortcuts-fade-start` en `--hf-shortcuts-fade-end`, geregistreerd met `@property`).
  Een animatie met `animation-timeline: scroll(x self)` verandert ze met de afstand die de rij is gescrold: links komt de vervaging na 4% van de scrollafstand, rechts is ze weg bij 96%.
  Zonder iets om te scrollen is de tijdlijn niet actief, dus er is geen vervaging.
  Een browser zonder `animation-timeline` krijgt een vaste vervaging rechts en ruimte achter de laatste link.
  De animatie volgt het scrollen en heeft geen tijd van zichzelf, dus ze hoort niet bij de tokens van Beweging en valt niet onder "minder beweging": er beweegt niets zolang de bezoeker niet scrolt.
  De overgang van kleur en vulling van een link neemt wel de tokens: de korte duur voor de kleur (Aanwijzen) en de snelle voor de vulling bij indrukken (Ingedrukt en geselecteerd).
  De rij heeft aan alle kanten 5 pixels ruimte, zodat het scrollgebied de focusrand niet afsnijdt.
  De rij snapt ook (`scroll-snap-type: x proximity`, met `scroll-snap-align: start` op elk item en `scroll-padding-inline` gelijk aan de breedte van de vervaging plus de ruimte van de lijst, aan beide kanten): het begin van een link komt tot rust op het begin van de rij.
  Het is `proximity` en niet `mandatory`, zodat de rij alleen snapt als ze bij een link stopt, en een langzame beweging of het toetsenbord niet wordt tegengehouden.
  Een omlopende rij scrolt niet en snapt dus niet.
  Een browser scrolt een link met de focus alleen in beeld als hij bijna onzichtbaar is: een link die half in beeld staat of onder de vervaging, blijft staan, met een focusrand die is afgesneden of vervaagd.
  Daarom heeft de rij een klein onderdeel met JavaScript (`ShortcutsRow`, een `onFocus`): staat de link met de focus niet vrij van de vervaging, dan scrolt de rij hem naar het begin van de rij, achter de vervaging.
  Dat is ook waar de rij snapt, dus het snappen scrolt hem niet terug.
  Het doet dat alleen voor het toetsenbord (`:focus-visible`): bij een druk met een vinger of de muis zou de rij de link onder de vinger weg scrollen, en dan gaat de klik verloren.
  De links zelf werken zonder JavaScript; zonder blijft alleen dit scrollen met het toetsenbord weg.
  De balk blijft aan de bovenkant van het venster plakken als de pagina scrolt (`position: sticky`, onder de bovenrand van een telefoon met een inham), zodat de links bij de hand zijn langs de hele pagina.
  Een omlopende balk plakt niet, want hij is te hoog (bij 320 pixels bijna 200 pixels) en zou een groot deel van een klein venster innemen.
  De pagina houdt bij een link naar een kop ruimte voor de balk (`scroll-padding-block-start`, de hoogte in `--hf-shortcuts-height`), zodat de kop eronder staat en niet erachter.
- **Alternatieven:** het label scrolt mee (de woorden verliezen hun uitleg); een balk die niet blijft plakken (na een stuk scrollen moet je terug naar boven voor de links); een schuifbalk (lelijk, en op een telefoon niet te zien); altijd omlopen op een smal scherm (de balk wordt twee of drie regels hoog); de vervaging met JavaScript (meer code, en het schuift pas na het laden op zijn plek).

## De balk is in donker blauw-900, niet het warme vlak

- **Datum:** 27 oktober 2026
- **Besluit:** in licht heeft de balk het warme vlak (zand) en zijn rand, in donker blauw-900, een trede donkerder dan de header.
  De balk heeft eigen rollen in `colour.css`: `--hf-colour-background-shortcuts`, `--hf-colour-border-shortcuts`, `--hf-colour-text-shortcuts-label`, `--hf-colour-text-shortcuts-link`, `--hf-colour-text-shortcuts-link-hover` en `--hf-colour-background-shortcuts-pressed`.
  De focusrand is de gewone (`--hf-colour-focus`).
- **Waarom:** het warme vlak is in donker blauw-800, net als de header, dus de balk zou daar met de header één vlak lijken.
  Blauw-900 houdt de balk als een aparte strook onder de header.
  De projecteigenaar koos deze variant (B) boven het warme vlak zoals het is (A).
- **Hoe:** het ontwerp rekende op blauw-800; op blauw-900 haalt het label (blauw-200) 10,65:1, een link (blauw-300) 7,9:1, een link onder de muis (blauw-200) 10,65:1, en de focusrand (blauw-300) 7,9:1 op de balk en 5,55:1 op de ingedrukte vulling.
  De ingedrukte vulling is blauw-700 voor 70% over de balk, en een link (blauw-200) haalt daar 7,47:1.
  In licht blijven de waarden van het ontwerp: label 7,61:1, link 7,68:1, link onder de muis 10,22:1, en de focusrand 3,85:1 op de balk en 3,20:1 op de ingedrukte vulling.
  Geen waarde moest veranderen.
  Alle paren staan in de contrasttabellen van Tokens/Kleur.
- **Nadeel:** de gevulde achtergrond van een ingedrukte link haalt geen 3:1 tegen de balk zelf (ongeveer 1,2:1 in licht en in donker).
  Dat is zo in het ontwerp, en het is bewust: de vulling is de reactie op een druk van een vinger en blijft niet staan, dus ze hoeft geen toestand te dragen.
  Wat de link aanwijst, haalt de eis wel: de tekst op de vulling (8,49:1 in licht, 7,47:1 in donker) en de focusrand erop (3,2:1 in licht, 5,55:1 in donker).
- **Alternatieven:** het warme vlak zoals het is, blauw-800 (A); dan lijkt de balk een verlengstuk van de header en is hij gelijk aan de warme kaart, maar hij valt minder op.

## Een link in de balk is 36 pixels hoog

- **Datum:** 27 oktober 2026
- **Besluit:** een link in de balk is 2,25 rem hoog (36 pixels bij de gewone lettergrootte), met minstens 24 bij 24 pixels voor de kleinste ("Stand" is 62 pixels breed), en dus lager dan de 44 pixels van het menu.
  De balk is 46 pixels hoog plus een rand van 1 pixel.
- **Waarom:** de balk is een tweede rij onder het menu en mag niet te veel ruimte kosten.
  36 pixels haalt WCAG 2.5.8 (24 bij 24) ruim, en de links hebben ruimte boven en onder.
  De hoogte staat in rem, zodat hij met de lettergrootte van de bezoeker meegroeit.
- **Alternatieven:** 44 pixels, zoals het menu; dan is de balk 54 pixels hoog.

## Een spelersnaam is één component, met de voornaam gewoon en de achternaam vet

- **Datum:** 27 oktober 2026
- **Besluit:** het designsysteem heeft `PlayerName`.
  De voornaam staat in het gewone gewicht en de achternaam in het zwaardere.
  Volledige namen staan waar een rij één speler is en er ruimte is, alleen de achternaam waar de ruimte krap is, en bij twee gelijke achternamen komt de voornaam erbij.
- **Waarom:** de achternaam is het deel dat je herkent en waarop de zoekpagina zoekt, dus die valt op.
  In een lijst met ruimte maakt de voornaam het verschil tussen twee spelers duidelijk.
  Eén component houdt het gewicht op één plek, in plaats van op de rijkop van elke tabel.
- **Hoe:** het gewicht staat op de delen van de naam zelf, dus in een vette rijkop blijft de voornaam gewoon.
  Voor een schermlezer en voor kopiëren is het één tekst, zonder `strong`.
  De site splitst een speler uit `players` met `splitPlayerName`: de zoekterm is de achternaam als de naam erop eindigt.
  Is de zoekterm geen einde van de naam, zoals een verbetering met de hand, dan staat de hele naam in het gewone gewicht, in plaats van een verkeerde splitsing.
  Een doelpunt zonder speler heeft alleen de naam uit de wedstrijdregel, en is een achternaam.
  De kaart Doelpuntenmakers en de selectie op de zoekpagina tonen de volledige naam, en de lijst staat op achternaam, dan op voornaam.
  In de wedstrijdregel staat de achternaam zoals Wikipedia hem schrijft, met de beginletter van de voornaam erbij (`J. Trenskow`) als twee verschillende spelers in die regel dezelfde naam hebben, en met de hele voornaam als ook die beginletter gelijk is.
  Waar de naam van de media komt, zoals in koppen, veranderen we niets.
- **Alternatieven:** de hele naam vet laten, zoals nu in de kaart; dan valt het deel dat je zoekt niet op.
  Of `strong` om de achternaam; dat zegt een schermlezer iets wat niet nodig is.
  Of de volledige naam overal tonen; dat past niet in de wedstrijdregel op een smal scherm.
- **Later:** sinds 5 november 2026 splitst de site de naam niet meer zelf: `splitPlayerName` is weg, en de voornaam en de achternaam komen uit `persons`; zie _De site telt per persoon en toont de bewaarde naam, en raadt niets_ in `site.md`.
- **Later:** zie _In een tabel is vet voor het kerngetal, niet voor onze club of een achternaam_.
  De achternaam heeft het gewicht van een rijkop (600) in plaats van het zwaardere (700); de voornaam blijft gewoon.
- **Later:** zie _Het rugnummer en een regel achter de naam zijn opties van PlayerName, en ShortPlayer vervalt_ (7 november 2026): `PlayerName` heeft nu ook een rugnummer en een regel achter de naam, en het onderdeel `ShortPlayer`, dat de naam met een rugnummer toonde, is weg.

## Staafjes en lijn zijn algemene onderdelen, de grafiek van het seizoen zet ze samen

- **Datum:** 27 oktober 2026
- **Besluit:** `BarChart`, `BarChart.Trend` en `MarkRow` zijn algemeen en weten niets van voetbal.
  `FormChart` is de voetbalversie en zet ze samen met hulpfuncties voor punten, tonen en het voortschrijdend gemiddelde.
  De tonen `positive`, `neutral` en `negative` horen bij de groep van de grafieken.
- **Waarom:** de eigenaar wil geleidelijk een samenhangende bibliotheek voor datavisualisatie.
  Een staafje en een lijn komen terug bij doelpunten per wedstrijd en bij andere cijfers, en de kleuren en maten horen dan overal gelijk te zijn.
- **Hoe:** de gedeelde delen staan in `components/chart/` (de tonen, `chart.css` met de kleur en de sterkte van een toon, en `movingAverage` en `monotonePath`).
  `bar-chart/`, `mark-row/` en `form-chart/` hebben elk hun eigen map, naast `donut-chart/`.
  De lijn krijgt de schaal van de grafiek van `BarChart`, die haar `max` doorgeeft aan een `BarChart.Trend` die als kind staat.
  Een context kan niet, omdat de onderdelen servercomponenten blijven.
- **Alternatieven:** één `FormChart` met alles erin (sneller, maar de volgende grafiek begint opnieuw).
  Of de onderdelen eerst en `FormChart` later, wat de onderdelen alleen met losse verhalen test.
- **Later:** zie _`FormTimeline` zet uitslagen op een as van jaren, met `BarChart` en eigen labels_ (4 november 2026).
  `form-timeline/` staat naast `form-chart/`, en `BarChart` kent nu `axis.labels`.

## Een verlies is een streepje van 0,25 rem, geen lege plek

- **Datum:** 27 oktober 2026
- **Besluit:** een verlies is een rood streepje van 0,25 rem op de grond.
  Een plek die nog niet gespeeld is, is leeg (alleen de grond).
- **Waarom:** een staafje van echt 0 hoog lijkt op een wedstrijd die nog niet gespeeld is.
  Zonder kleur is een verlies een klein blok en een lege plek alleen de lijn.
- **Alternatieven:** niets tekenen bij een verlies (lijkt op een lege plek).
  Of een streepje onder de grond (leest als een negatief getal).

## De lijn is het gemiddelde over de laatste 5 wedstrijden, als vloeiende kromme

- **Datum:** 27 oktober 2026
- **Besluit:** de lijn laat het gemiddelde aantal punten per wedstrijd over de laatste 5 zien, van wedstrijd 5 af.
  Hij is een monotone kubische kromme: vloeiend, nooit onder 0 of boven het maximum en vlak tussen gelijke waarden.
  De groottes van het venster (3, 5, 8) liggen in het canvas ter vergelijking.
- **Waarom:** 5 is het aantal letters in de vorm, wie beide bekijkt, denkt in vijven.
  Korter springt tussen 0 en 3, langer is rustig maar laat.
  Een vloeiende lijn is rustiger dan rechte stukken.
  Een gemiddelde sinds het begin wordt steeds trager en een lopend totaal stijgt altijd.
- **Alternatieven:** rechte stukken (de eerste versie; schokkerig).
  Een gemiddelde sinds wedstrijd 1.
  Een lopend totaal aan punten (niet op de schaal van de staafjes).
- **Later:** zie _`BarChart` is standaard 4 rem hoog, en de lijn begint bij de eerste wedstrijd_ (4 november 2026).
  De lijn begint bij de eerste wedstrijd en middelt over hoogstens 5, in plaats van van wedstrijd 5 af.

## De lijn is licht met een rand in de kleur van de kaart in donker, en donker met een witte rand in licht

- **Datum:** 27 oktober 2026
- **Besluit:** de lijn is 2 pixels, met een rand van 5 pixels.
  In licht is de lijn donker (blue-900) met een witte rand.
  In donker is hij licht (blue-50) met een rand in de kleur van de kaart (blue-800 op de warme kaart).
  Twee nieuwe rollen: `--hf-colour-chart-line` en `--hf-colour-chart-line-edge`.
  De lijn tegen een gelijkspelstaafje haalt in donker 1,92:1.
  De rand ertussen haalt 4,02 tot 5,94:1 en draagt de scheiding, zoals de rand van de taartgrafiek zijn stukken scheidt.
  De sterkte van de staafjes (70% en 80%) blijft.
- **Waarom:** een lichte lijn zonder rand haalt in donker 1,99:1 tegen een gelijkspelstaafje.
  Een donkere lijn in donker valt weg.
  Zwakkere staafjes in donker (50 tot 65%) zouden afwijken van de tabelbalk en de taartgrafiek.
- **Alternatieven:** een vaste rand van blue-950 (lijkt op een schaduw).
  Geen rand (faalt tegen een gelijkspel).
  Een rand die altijd de kleur van de kaart volgt, wat vraagt dat `Card` zijn kleur in een eigenschap zet.

## Een winst en een verlies op 70%, een gelijkspel op 80%

- **Datum:** 27 oktober 2026
- **Besluit:** de staafjes gebruiken de kleur van de uitslag op 70% (winst en verlies) en 80% (gelijkspel).
  De letters en de tekst gebruiken de volle kleur.
- **Waarom:** 70% is de sterkte van de tabelbalk en van het zwakste stuk van de taartgrafiek.
  Het grijs van een gelijkspel haalt op de warme kaart op 70% maar 2,93:1 en op 80% 3,51:1.
- **Alternatieven:** overal 70% (het gelijkspel haalt dan 3:1 niet).
  Overal 80% (de grafiek valt uit de familie).

## De vorm staat als tekst boven de grafiek, zonder koppeling met de staafjes

- **Datum:** 27 oktober 2026
- **Besluit:** boven de grafiek staat "Vorm" met de laatste vijf uitslagen als letters, het oudste links.
  Er staat geen haak onder de laatste vijf staafjes en er staan geen letters onder de staafjes.
- **Waarom:** de eigenaar zei dat bezoekers de haak niet zouden begrijpen.
  De letters zijn de bekende afkorting en de grafiek legt de rest uit.
- **Alternatieven:** een haak onder de laatste vijf staafjes.
  Letters onder elk staafje (zwaar op een smalle kaart).

## De footer zegt waar de site over gaat, met het motto eronder

- **Datum:** 27 oktober 2026
- **Besluit:** de footer van de Fansite en die van het Forum hebben dezelfde opzet: een eerste regel die zegt waar je op die plek voor komt, met "over onze club", en daaronder hetzelfde motto, "Voor supporters door supporters.", als eigen zin.
  De Fansite zegt "Alles over onze club op één plek." en het Forum "Praat mee over onze club."
  De beschrijving voor zoekresultaten is één zin met een gedachtestreepje: "Alles over sc Heerenveen op één plek – voor supporters door supporters."
  Daar staat "sc Heerenveen" in plaats van "onze club", omdat wie het resultaat leest nog niet weet van wie "onze" is.
  De beschrijving van de app in `manifest.ts` is dezelfde zin zonder het motto.
  Dit vervangt _De footer zegt wat je op de site vindt_ (22 oktober 2026).
- **Waarom:** "Alle koppen en links" past niet meer nu er ook wedstrijdgegevens, statistieken en spelletjes komen.
  De Fansite en het Forum delen het logo en het motto.
  De eerste regel zegt per plek waarvoor je er bent: lezen op de site, praten op het Forum.
  Het motto op een eigen regel blijft herkenbaar, ook als de eerste regel later weer verandert.
- **Alternatieven:** één zin met een streepje of een komma in de footer; dan staat het motto niet meer op zichzelf en hangt de regelafbreking af van de breedte van het scherm.
  Alleen het motto; dat zegt niet wat je er vindt.
  Een lijst van wat er te vinden is; die veroudert.
  "Sinds 1997 …"; dat botst met de beslissing van 22 oktober 2026 dat "sinds 1997" alleen in het logo staat.
  Een regel uit een supporterslied; de rechten, en sommige regels zijn van de club of van een andere club.

## Een knop naar boven in de footer, alleen op lange pagina's, en alleen met CSS

- **Datum:** 27 oktober 2026
- **Besluit:** de footer heeft een ronde knop "Naar boven", in de stijl van de themaknop, die er alleen is als de pagina meer dan twee vensterhoogtes hoog is.
  Dat is dezelfde regel als: de pagina kan meer dan één vensterhoogte scrollen.
  Het is CSS (een scroll-gestuurde animatie op `visibility`), zonder JavaScript, en een browser zonder die functie toont de knop altijd.
  De knop staat rechts in de footer en als laatste in de code, zodat het toetsenbord hem bereikt nadat de pagina naar beneden is gescrold.
- **Waarom:** de footer is waar je naartoe komt na een lange pagina, en daar wil je terug naar boven.
  De knop is er alleen als dat nuttig is, dus niet op een korte pagina waar hij niets doet.
  Een scroll-gestuurde animatie heeft geen script, geen flits bij het laden en volgt het formaat van het venster.
  `visibility: hidden` houdt hem uit de Tab-volgorde en weg bij een schermlezer.
- **Alternatieven:** JavaScript meet de hoogte van de pagina (meer code en een flits voor het script draait).
  De knop altijd tonen (ook waar hij niets doet).
  Een knop die vastzit aan een hoek van het scherm (kan over de inhoud en de balken van de browser liggen).

## De knop naar boven is `Page.TopLink`, een link naar `#top`

- **Datum:** 28 oktober 2026
- **Besluit:** het onderdeel heet `Page.TopLink` en is een gewone `a` met `href="#top"`.
  De prop `label` is verplicht en is de naam voor schermlezers ("Naar boven"); er is geen zichtbare tekst.
  Het adres kan niet worden veranderd, want de knop is er om naar de bovenkant van het document te gaan.
  Het pictogram is een nieuwe pijl omhoog (`arrow-up`) in `Icon`, met dezelfde lijn als de andere pijlen.
  Het onderdeel heeft geen status en blijft daarom een servercomponent.
- **Waarom:** het is een eigenschap van `Page`, net als `Page.Footer` waar het in staat.
  "Link" en niet "button", want de knop navigeert en is een `a`.
  `#top` is de bovenkant van het document, ook als er geen element met dat id is, dus de pagina hoeft geen anker te dragen.
  Een schermlezer hoort "Naar boven, link", zoals bij elke andere link.
  Het werkt zonder JavaScript.
  De Next.js-router onderschept een gewone `a` met een anker niet.
  Het vloeiende scrollen van `root.css` blijft dus gelden, en "minder beweging" ook.
- **Alternatieven:** `Page.TopButton` (het is geen knop); een anker op `.hf-page` met een eigen id (een extra id dat elke pagina moet dragen); `window.scrollTo` in een klik (JavaScript, en dan werkt het niet zonder).

## De knop naar boven toont zich na één `svh`, met een scroll-gestuurde animatie die in `@supports` staat

- **Datum:** 28 oktober 2026
- **Besluit:** de animatie loopt op de scrollpositie van het document (`animation-timeline: scroll(root block)`) en heeft een bereik van `100svh` tot `calc(100svh + 1px)`.
  De sleutelbeelden zetten `visibility` van `hidden` naar `visible`, met `animation-fill-mode: both`.
  Dat is dus verborgen tot en met precies één vensterhoogte scrollen en zichtbaar zodra de pagina verder is.
  Een pagina die niet verder kan scrollen dan één vensterhoogte, haalt die grens nooit.
  De animatie staat in `@supports (animation-timeline: scroll()) and (animation-range: 1px 2px)`.
  Buiten dat blok is de knop zichtbaar, dus een browser zonder die functies toont hem altijd.
  De animatie heeft geen duur en geen overgang, dus "minder beweging" hoeft niets te stoppen.
- **Waarom:** `svh` is de hoogte van het venster als de balken van de browser op een telefoon zichtbaar zijn.
  Hij blijft gelijk tijdens het scrollen, dus de knop verspringt niet.
  `dvh` volgt de balken, waardoor de grens beweegt terwijl je scrolt.
  `lvh` is het grote venster zonder balken, waardoor een bezoeker verder moet scrollen dan hij zag.
  Het bereik van 1 pixel maakt van de animatie een omslag op één punt.
  De knop zit in de footer, onderaan de pagina, en daar is de scrollpositie het maximum.
  Hij is dus zichtbaar precies als dat maximum groter is dan één vensterhoogte, dus als de pagina hoger is dan twee vensterhoogtes.
  De animatie staat in `@supports`, omdat `animation-timeline` en `animation-range` nog niet breed beschikbaar zijn.
  De stylelint-regel `use-baseline` eist dat.
  Het issue vroeg om een terugval met `@supports not`.
  Dit is hetzelfde gedrag, omgekeerd opgeschreven: de terugval is de standaard, en alleen een browser die de functies kent, verbergt de knop.
- **Alternatieven:** `dvh` of `lvh` (zie hierboven); een animatie in tijd die door JavaScript wordt gestart; `opacity` in plaats van `visibility` (de knop blijft dan bereikbaar met Tab en wordt voorgelezen).

## De knop naar boven heeft de kleuren van links in de footer en een eigen kolom in het raster

- **Datum:** 28 oktober 2026
- **Besluit:** het pictogram heeft in rust de kleur van een link (`--hf-colour-text-link`) en onder de muis, ingedrukt en bij focus die van een link onder de muis (`--hf-colour-text-link-hover`).
  De rand (55%) en de vulling (14%) zijn tinten van de kleur van het pictogram, met `color-mix()` op `currentcolor`, zoals bij de themaknop.
  Er komt geen nieuwe kleurrol bij.
  De knop is rond, 44 pixels, met een pictogram van 26 pixels, en heeft dezelfde lijn en toestanden als de themaknop.
  In geforceerde kleuren is de rand `LinkText`, en bij het afdrukken is de knop er niet.
  Heeft de footer een `Page.TopLink`, dan krijgt hij een kolom voor de knop.
  Op een smal scherm staat de knop rechts, op hoogte van de twee regels tekst, en de links eronder.
  Vanaf 40rem staat hij in een derde kolom rechts van de links.
  De links worden gevonden met hun klasse (`.hf-navigation`) en niet meer als laatste kind.
  De zinnen breken pas af onder 22,25rem in plaats van 19,5rem, want naast de knop is minder plaats.
- **Waarom:** de footer is een ander vlak dan de header, dus de kleuren van de themaknop (voor het blauw van de header) passen er niet.
  De rollen van links in de footer halen er al 4,5:1.
  Het pictogram haalt 6,57:1 in rust en 6,66:1 onder de muis met de vulling.
  Dat geldt in licht en in donker, ook op de strepen, gerekend met de tokens van de strepen.
  Een rand en vulling uit `currentcolor` volgen de toestand zonder extra rollen.
  14,1rem tekst, 0,5rem ruimte, 2,75rem knop en 2rem marge is 19,35rem; met de tekstafstand van WCAG 1.4.12 is de tekst 17rem breed en komt het op 22,25rem.
  Onder die breedte mogen de zinnen weer afbreken, zodat ze niet onder de knop lopen en de pagina niet zijwaarts scrolt.
  De knop is het laatste kind van de footer, dus een toetsenbordgebruiker komt hem tegen na de andere links.
  Op een smal scherm staat hij boven de links, dus de volgorde van het toetsenbord en die van het scherm verschillen.
  Dat mag, want WCAG 2.4.3 vraagt een betekenisvolle volgorde en geen gelijke.
  De knop hoort bij het eind van de pagina, dus bij de laatste plek in de volgorde.
  De knop ligt over de strepen: de kinderen van de footer zijn gepositioneerd en liggen daarom boven het deel van de strepen over de footer.
- **Alternatieven:** de kleuren van de themaknop (die zijn gemaakt voor het donkerblauw van de header); nieuwe rollen voor rand en vulling in de footer (meer tokens voor dezelfde tinten); de knop in een hoek van de footer met `position: absolute` (hij schuift dan over de tekst of de links); de knop vóór het menu in de code (de volgorde van het toetsenbord volgt dan het scherm, maar de bezoeker die onderaan komt, tabt eerst door de knop).

## Eén stel regels voor het gewicht van letters, met tokens die een bedoeling uitdrukken

- **Datum:** 28 oktober 2026
- **Besluit:** het gewicht van letters volgt vier regels: nadruk is 700, rangorde gebruikt eerst maat, kleur en lettertype, de huidige plek in een balk is 200 zwaarder dan de rest, en gewicht beweegt niet bij aanraken.
  Componenten gebruiken alleen tokens voor het gewicht, en een test weigert een kaal getal.
  De tokens noemen de bedoeling en mogen dezelfde waarde hebben.
  De nieuwskop blijft op 500.
  Het gewicht van de huidige plek geldt ook voor de balk "Op deze pagina" (700 tegen 500), en voor de huidige pagina in het submenu en in het menu in de footer (600 tegen 400).
- **Waarom:** er was geen regel, dus elke nieuwe plek koos een getal: 23 van de 53 regels waren een kaal getal.
  De regel van 200 verschil volgt uit de metingen: een stap van 100 is op 16 pixels nauwelijks te zien.
  Tokens met een bedoeling maken duidelijk waarom een waarde gekozen is, en een test voorkomt dat de getallen weer uit elkaar lopen.
  De nieuwskop is de regel waarvoor mensen komen, dus iets meer gewicht helpt bij het scannen.
- **Hoe:** `tokens/typography.css` heeft `--hf-figure-font-weight` (700), `--hf-name-font-weight` (600) en de paren `--hf-menu-…`, `--hf-submenu-…` en `--hf-anchor-…`, elk met een huidige plek.
  `--hf-headline-font-weight` is 500.
  Geen token voegt een nieuw gewicht toe; ongeveer 25 regels kregen een token met dezelfde waarde.
  `weight-css.test.ts` leest de CSS van alle componenten en faalt bij een kaal getal bij `font-weight`, zoals `motion-css.test.ts` dat voor tijden doet.
  `fonts.css`, de definities van de tokens en de CSS van de documentatie vallen erbuiten.
  De zichtbare wijzigingen zijn: de huidige link van de balk "Op deze pagina" (500 naar 700), de huidige pagina in het submenu en in het menu in de footer (700 naar 600), `legend` en `dt` (700 naar 600), "Uitgesteld" (600 naar 700) en de foutmelding bij een veld (500 naar 700).
  De huidige link van de balk "Op deze pagina" wisselt van gewicht terwijl de bezoeker scrolt, zonder overgang.
  De regels staan op de pagina Typografie in Storybook, onder "Afspraken".
- **Alternatieven:** alleen de regels opschrijven, zonder tokens (goedkoper, maar de getallen lopen weer uit elkaar).
  Tokens naar waarde noemen, zoals `--hf-weight-600` (zeggen niet waarvoor).
  De huidige plek in de balk "Op deze pagina" laten zoals hij is (de regel zou dan een uitzondering hebben).
  Het gewicht van de huidige link verbergen met een onzichtbare dikke kopie, zodat de rij niet verspringt (extra opmaak bij elke link, en de site laadt bij elke klik toch een nieuwe pagina).
- **Later:** vervangt delen van vier eerdere besluiten; zie de **Later:**-regels bij _Voorlopig heeft de kop van een nieuwsregel de maat van gewone tekst en gewicht 500_, _Het hoofdmenu is 16 tot 18 pixels en wordt vetter, de huidige pagina nog vetter_, _De balk met links naar de kaarten volgt de pagina_ en _Het hoofdmenu en het submenu zijn één `nav` tussen de `header` en de `main`, met een geneste lijst_.
- **Later:** zie _In een tabel is vet voor het kerngetal, niet voor onze club of een achternaam_.
  Nadruk (700) blijft de regel, maar in een tabel is hij alleen nog voor het kerngetal en de rij met het totaal; koppen en rijkoppen zijn 600.

## De acht voorlopige kleuren blijven en heten niet meer voorlopig

- **Datum:** 29 oktober 2026
- **Besluit:** de kleuren die in Storybook _voorlopig_ heetten, blijven zoals ze zijn.
  Het label en de code ervoor zijn weg uit `ColourDocs.tsx`, `tokens.ts`, `docs.css` en `colour.mdx`.
  De tabel met contrast in Storybook meet nu ook de rand van een invoerveld op de drie andere vlakken en de gevulde knop, ook onder de muis, op een vlak en op de pagina.
  Verhalen in licht en donker laten de kleuren zien: de knop onder de muis, de toestanden van een link, een tabel met zebrarijen en een rij onder de muis, een invoerveld, en de kop van een nieuwsbericht en de titel van een discussie, bezocht en onder de muis.
  Lopende tekst haalt AAA (7:1), andere tekst AA (4,5:1) en wat je moet kunnen zien 3:1.
  Het contrast is nagemeten op alle vlakken waar de kleur voorkomt, in licht en donker:
  - knop in donker (blauw-300): de tekst erop (blauw-950) haalt 9,13:1, en de knop haalt 7,90:1 op een vlak en 9,13:1 op de pagina;
  - knop onder de muis: wit op blauw-900 haalt 15,75:1 in licht, en blauw-950 op blauw-200 haalt 12,30:1 in donker;
  - rij onder de muis in donker (blauw-950): lopende tekst haalt 17,17:1, een link 9,13:1;
  - zebrarijen in donker (blauw-950): lopende tekst haalt 17,17:1, secundaire tekst en een positie 12,30:1;
  - link onder de muis in donker (blauw-200): 10,64:1 op een vlak en 8,38:1 op een sterk of warm vlak;
  - bezochte link: grijs-600 in licht haalt 5,30:1 tot 6,44:1 en grijs-400 in donker 4,89:1 tot 7,18:1, op elk vlak waar een kop of titel staat;
  - rand van een invoerveld: grijs-500 in licht haalt 3,46:1 tot 4,20:1 en blauw-400 in donker 4,16:1 tot 6,10:1, op de pagina en de vier vlakken.
- **Waarom:** elke kleur haalt zijn eis, dus er is geen reden om hem te veranderen.
  Zo blijft wat bezoekers zien gelijk.
- **Nadeel:** in licht en in donker zijn de rij onder de muis en de zebrarij dezelfde kleur, en geen tabel of component gebruikt ze nog.
  Een zebrarij verandert dus niet onder de muis.
  Wie zebrarijen gaat bouwen, besluit dan of ze een eigen kleur krijgen.
- **Alternatieven:** per kleur een andere stap uit de reeks.
  Elke kleur haalt zijn eis, dus daar was geen reden voor.
- **Later:** vervangt _Voorlopige kleurtokens_ (20 oktober 2026): de waarden zijn vastgelegd.

## De tweede kolom begint bij 52 rem, voor alle pagina's met een zijbalk

- **Datum:** 29 oktober 2026
- **Besluit:** `Page.Body` heeft twee kolommen vanaf 52 rem (832 pixels) in plaats van 56 rem, voor een gewone en een brede zijbalk.
  De balk "Op deze pagina:" verdwijnt op dezelfde grens.
  De grens is een breedte in rem, geen oriëntatie of hoogte.
- **Waarom:** de kolommen passen al vanaf 52 rem (24 + 24 + 2 rem voor de sporen en 2 rem voor de marges), en de grens van 56 rem liet de meeste telefoons in liggende stand in één kolom: 844 tot 874 pixels voor de meeste modellen, 896 en meer alleen voor de grootste.
  Eén grens voor alle pagina's houdt de site voorspelbaar, en de balk en de kolommen wisselen op hetzelfde moment.
  Een breedte in rem zorgt dat inzoomen en tekstvergroting op een liggend scherm weer één kolom geven (WCAG 1.4.10).
- **Hoe:** het getal staat als `52rem` in `page.css` (drie keer, in de media queries van de sporen en van de gebieden), in `shortcuts.css` (de balk en de ruimte voor het scrollen) en in `barWidths` in `followPage.ts`.
  Een media query kan geen custom property gebruiken, dus `page-css.test.ts`, `shortcuts-css.test.ts`, `followPage.test.ts` en de e2e-test van de balk (op 831 en 832 pixels) controleren dat ze gelijk blijven.
  De sporen krimpen van 66 rem tot 52 rem: bij 52 rem is er 48 rem voor de sporen (50 rem na de marges, minus 2 rem ertussen).
  De marge is zo breed als de inkeping van het apparaat (`env(safe-area-inset-left)` en `env(safe-area-inset-right)`), en een media query kan die niet lezen.
  Een telefoon in liggende stand heeft er 47 tot 62 pixels (tot 3,875 rem) aan elke kant, dus bij 52 rem blijft 42,25 rem voor de sporen.
  Een gewone zijbalk heeft minstens 24 + 16 rem nodig, en past.
  Een brede zijbalk had 24 + 24 rem nodig en paste niet: op 844 pixels met een inkeping van 47 pixels liep het raster 50 pixels over.
  De sporen van een brede zijbalk krimpen daarom tot 20 rem in plaats van 24 rem, 40 rem samen.
  De reviewer vond dit, want Chromium heeft geen inkeping en de meting zag het niet.
  Met een nagebootste inkeping (47 pixels op 844 en 852, 62 pixels op 874 en meer, en 62 pixels op 832 als slechtste geval) zijn de sporen 338 tot 400 pixels breed, en loopt in licht en donker op `/wedstrijden`, de homepage, `/podcasts` en `/bronnen` niets over.
  Alle andere vermeldingen van 56 rem in dit bestand, in de beslissingen over de kolommen, de balk en `/wedstrijden`, zijn nu 52 rem; de **Later:**-regels staan bij de drie beslissingen die de kolommen vastleggen.
- **Alternatieven:** 44 rem voor een gewone zijbalk en 52 rem voor een brede (benut elke indeling, maar twee grenzen om gelijk te houden).
  Een lagere grens met smallere kolommen van 18 tot 20 rem (knijpt tabellen en kaarten).
  Voor de brede zijbalk een hogere grens dan 52 rem (laat precies de telefoons in één kolom waarvoor het issue is, en de balk en de kolommen wisselen dan op twee plaatsen).
  Een grens op oriëntatie of hoogte (laat zoom en tekstvergroting op een liggend scherm twee kolommen houden, en breekt het herschikken).

## Een keuzelijst krijgt de opmaak van de site met `appearance: base-select`, binnen `@supports`, te beginnen bij de seizoenskiezer

- **Datum:** 30 oktober 2026
- **Besluit:** `Select` heeft een klasse `hf-select-styled` (in `select.css`) die de gesloten en de open lijst opmaakt met `appearance: base-select`.
  Alles staat binnen `@supports (appearance: base-select)`; een browser die het niet kent, houdt zijn eigen lijst (zie _Functies die nog niet zover zijn: `@supports`, of een tijdelijke uitzondering_).
  Alleen de `SeasonPicker` vraagt de klasse aan.
  De andere keuzelijsten (het contactformulier, `base/forms.css`, `Field`) volgen in een eigen issue als dit goed blijkt.
  - Het pijltje is `::picker-icon`, dus het pijltje van de browser zelf.
    De lijst heeft 0,75 rem opvulling aan het einde en 0,5 rem tussen de tekst en het pijltje, en het pijltje draait als de lijst open is.
  - De open lijst (`::picker(select)`) is een vlak met de rand en de hoek van het veld, en opties van minstens 2,75 rem hoog.
  - Een optie onder de muis heeft een tint en een dunne lijn.
    Een optie waar het toetsenbord staat, heeft een tint en de focusring van de site.
    De gekozen optie heeft een blauwe tint, een vinkje (`::checkmark`) en een zwaarder gewicht, dus kleur staat er niet alleen.
  - Alle kleuren zijn tokens, in licht en donker.
  - De regels van `plugin/use-baseline` staan uit rond dat blok, met de reden erbij.
    Zodra Baseline de functie 'widely available' noemt, meldt Stylelint de uitzondering als overbodig (`reportNeedlessDisables`) en gaan de uitzondering en de `@supports` weg.
- **Waarom:** het pijltje van een gewone `select` zit tegen de rand en is met opvulling niet te verschuiven.
  Een eigen pijltje als achtergrond (een verloop) is geprobeerd en door de projecteigenaar afgewezen.
  `::picker-icon` is het pijltje zelf, dus het blijft staan in gedwongen kleuren.
  Het toetsenbord werkt zoals in _Het toetsenbord kiest een seizoen met de pijltjes en bevestigt met Enter_: de e2e-test van de kiezer slaagt in Chromium 156 en WebKit 27.2, en de lijst blijft een `select` met dezelfde gebeurtenissen.
  Gedwongen kleuren (in Chromium nagebootst) en 400% zoom (320 × 256 pixels, vier seizoenen) zijn bekeken: het pijltje, de rand en het vinkje staan er, en de lijst past.
- **Nadeel:** het pijltje heeft per browser een andere vorm (een driehoek in Chromium, een punthaak in WebKit).
  De gesloten lijst is ongeveer 10 pixels breder dan de gewone, en de kiezer past naast de kop tot 320 pixels.
  Firefox is niet gecontroleerd, omdat Playwright hier alleen Chromium en WebKit heeft; zonder `base-select` houdt hij de lijst die hij heeft.
  De e2e-tests draaien alleen in Chromium.
  Met de hand draaide hetzelfde bestand in WebKit: alles slaagde, behalve de test die met Tab naar de knop "Toon" gaat, want WebKit op een Mac tabt niet naar een knop, ook niet op een lege pagina.
- **Alternatieven:** een eigen pijltje als achtergrond van de `select` (door de projecteigenaar afgewezen, en het verdwijnt in gedwongen kleuren).
  Een eigen keuzelijst van `div`'s (staat buiten dit issue, en het toetsenbord en de schermlezer moeten dan allemaal opnieuw).
  Alle keuzelijsten in één keer opmaken (raakt het contactformulier en `Field`, en de seizoenskiezer is de enige met een e2e-test voor het toetsenbord).
- **Later:** zie _Het menu van een keuzelijst met de opmaak van de site blijft binnen het scherm_, want 400% zoom was alleen met vier seizoenen bekeken.
  De rest blijft gelden.

## Ruimte komt uit vijf stappen, met gemiddeld als vaste keuze

- **Datum:** 31 oktober 2026
- **Besluit:** het designsysteem heeft vijf stappen voor de ruimte tussen dingen: `--hf-space-xs`, `--hf-space-s`, `--hf-space-m`, `--hf-space-l` en `--hf-space-xl`, in `tokens/space.css`.
  Gemiddeld (`m`) is de vaste keuze: twijfel je, neem hem.
  De CSS van een onderdeel gebruikt voor `padding`, `margin` en `gap` alleen die tokens, `0`, `auto` of `inherit`.
  Een optische correctie is geen ruimte en blijft een getal: 0,125 rem tussen twee kleine knoppen die bij elkaar horen.
  De betekenis van de stappen:
  - `xs` is het kleinste: een rand die net niet raakt, of twee dingen die bij elkaar horen.
  - `s` staat tussen tekst en iets anders kleins, zoals een pictogram of een label.
  - `m` staat tussen twee gelijke of vergelijkbare kleine onderdelen, en is de vaste keuze.
  - `l` zit tussen gemiddeld en het raster.
  - `xl` is de ruimte in het raster van de pagina, en het maximum: niets in een onderdeel is groter.
    Alleen de maten van de pagina zelf gaan erboven, zoals de ruimte onder de kolommen (tweemaal `xl`).
- **Waarom:** in 43 CSS-bestanden stonden 266 regels met `padding`, `margin` of `gap`, elk met een eigen getal: 0,5 rem (41 keer), 1 rem (35), 0,75 rem (23), 1,5 rem (22), 0,25 rem (17), 2 rem (8), 1,25 rem (6) en een paar losse waarden.
  Een kleine reeks met één vaste keuze maakt kiezen goedkoop, laat onderdelen op elkaar lijken en maakt een andere maat een wijziging op één plek.
  De stap volgt de betekenis en niet de dichtstbijzijnde waarde, zodat 0,75 rem niet willekeurig naar boven of naar beneden valt.
- **Hoe:** de stappen zijn 0,25, 0,5, 1, 1,5 en 2 rem, in de laag `hf.tokens`.
  `tokens/space-css.test.ts` leest de CSS van alle onderdelen en faalt op een getal in rem voor `padding`, `margin`, `gap` of een custom property met een van die woorden (of `space` of `gutter`) in de naam, zoals `weight-css.test.ts` dat voor gewichten doet.
  De bestanden die nog een getal hebben staan op een lijst in de test, een bestand per regel, en de test faalt ook op een bestand dat op de lijst staat en geen getal meer heeft.
  Zo kan de lijst alleen korter worden, en #480 en #481 halen er elk hun bestanden af.
  Dit besluit zet `tokens/layout.css`, `page.css`, `shortcuts.css`, `top-link.css` en `card.css` om, en in `card-share.css` de binnenruimte van het exemplaar van de kaart, omdat die gelijk moet zijn aan die van de kaart.
  Het hoofdstuk Ruimte in Storybook (Tokens/Ruimte) toont de stappen en zegt wanneer je welke kiest.
  De stijlen in stories en de ruimte van de pagina's van de site vallen erbuiten.
  Pixels voor de ruimte van een focusrand (5 px bij de snelkoppelingen) blijven staan: die horen bij de dikte van de rand.
- **Gevolg:** niets verschuift met meer dan 0,25 rem.
  Dit verschuift wel, per plek:
  - de ruimte naast het woordmerk is 0,5 rem in plaats van 0,75 rem, dus het schild hangt vanaf 74 rem buiten de kolom (was 74,5 rem);
  - de ruimte boven het logo in de header is 1 rem in plaats van 0,75 rem;
  - een snelkoppeling heeft 0,5 rem aan beide kanten in plaats van 0,625 rem;
  - de binnenruimte van een kaart is 1 rem rondom op een smal scherm (was 1 en 1,25 rem) en 1,5 rem rondom op een breed scherm (was 1,5 en 1,75 rem), en de ruimte voor het pijltje van een kop volgt de binnenruimte;
  - de ruimte tussen de kop van een kaart en een lijst is 1,5 rem in plaats van 1,25 rem;
  - een kop met een knop voor een afbeelding laat 2,5 rem vrij in plaats van 2,75 rem.
- **Alternatieven:** meer stappen, zoals acht of negen (meer keuze, en geen vaste keuze meer).
  Tokens naar waarde noemen, zoals `--hf-space-8` (zeggen niet waarvoor).
  Elke waarde naar de dichtstbijzijnde stap ronden (0,75 rem is dan 0,5 of 1 rem zonder reden).
  Alle onderdelen in één pull request omzetten (te groot om te reviewen; het is nu in drie issues verdeeld).
- **Later:** de omzetting is klaar: #480 en #481 hebben alle bestanden omgezet, de lijst in de test is weg en de test bewaakt ook de CSS van de documentatie, `docs/docs.css`.
  De ruimte onder de menubalk van de navigatie, een eigen maat van 7 pixels, is nu ook `s` (1 pixel meer), en haar custom property heet nu `--hf-navigation-space-end`, zodat de test hem bewaakt.
- **Later:** onder een kop en onder een grote bouwsteen staat sinds 31 oktober 2026 `--hf-space-l` en niet meer `s` of `m`; zie _Onder koppen en onder grote bouwstenen staat de grote ruimte_.
  De stappen en de keuze voor `m` blijven zoals ze zijn.

## Onder koppen en onder grote bouwstenen staat de grote ruimte

- **Datum:** 31 oktober 2026
- **Besluit:** onder elke kop staat `--hf-space-l` (1,5 rem), en onder een tabel met getallen en onder een grafiek ook, als er iets op volgt (#513).
  Daaronder vallen de koppen `h1` tot en met `h6`, ook met de stijl van een andere kop, en de ruwe `table`, `StandingsTable`, `TopScorersTable`, `DataTable`, `BarChart`, `DonutChart.Group` en `FormChart`.
  Staat zo'n kop of bouwsteen als laatste in zijn cel, dan komt er geen ruimte onder: de kaart of de kolom haalt hem weg, zodat de ruimte tussen twee cellen niet groter wordt.
  Kleinere bouwstenen, zoals een alinea, een lijst, een formulierveld en een knop, houden `m` of `s`, en de ruimte tussen kaarten en kolommen blijft `xl`.
- **Waarom:** de projecteigenaar wilde meer lucht onder koppen en onder een tabel met cijfers.
  De grote stap is de grootste die een onderdeel mag hebben: de extra grote is de ruimte van het raster tussen kaarten en kolommen, en die blijft het maximum.
- **Hoe:** één regel voor alle koppen in `heading.css`, en één regel voor elke tabel in `base/table.css`.
  `bar.css` doet hetzelfde voor de tabel van de stand en van de doelpuntenmakers, en laat de ruimte weg als er geen legenda op volgt.
  De ruimte onder een grafiek staat in `bar-chart.css`, `donut-chart.css` en `form-chart.css`.
  De regel in `card.css` voor een lijst direct onder een kop is weg: de grote ruimte onder de kop is nu overal dezelfde.
  `DataTable` heeft geen eigen regel en volgt de regel voor elke tabel.
  `tokens/space-below-css.test.ts` faalt als een kop een andere stap heeft, als een andere regel een kop een marge geeft, of als een bouwsteen de grote stap kwijtraakt.
  De stories Ruimte onder een kop en Ruimte onder een tabel laten het zien, met en zonder iets eronder.
- **Gevolg:** elke kaart wordt hoger, de een meer dan de ander.
  Een kop met direct daaronder een korte regel die erbij hoort, zoals het aantal spelers dat scoorde, heeft de grote ruimte tussen de kop en die regel.
  Dat is wat de projecteigenaar vroeg.
  Schijnt het een kop en zijn regel te ver uit elkaar te zetten, dan is een andere indeling (de grote ruimte pas onder de regel) een vervolgvraag.
- **Alternatieven:** de extra grote stap, `xl` (gelijk aan de ruimte tussen kaarten, dus kaarten en hun inhoud lopen in elkaar over).
  Een regel per plek of per kaart (laat de pagina's uit elkaar lopen).
  Een eigen klasse voor de kop met de grote ruimte (dan moet elke kop de klasse nog krijgen).
  Een nieuwe stap tussen `l` en `xl` (zeven stappen is te veel, zie _Ruimte komt uit vijf stappen, met gemiddeld als vaste keuze_).
- **Later:** zie _De kaart of de cel bepaalt de verticale witruimte tussen wat erin staat_ (2 november 2026).
  De grote ruimte onder een kop en onder een groot blok staat nu in de stroom, `utilities/flow.css`, en niet meer in `heading.css`, `table.css` en de CSS van de grafieken; de kaart of de cel zet haar, en het laatste kind krijgt geen ruimte van de stroom zelf.
  Tussen de tabel van de stand en haar legenda staat nu de gemiddelde ruimte, en de grote staat onder de legenda.
  `tokens/space-below-css.test.ts` is vervangen door `utilities/flow-css.test.ts`.
- **Later:** zie _Elementen en tekst zetten geen verticale witruimte naar buiten_ (2 november 2026).
  De regels voor de koppen in `heading.css` en voor elke tabel in `base/table.css` zijn weg; de stroom is nu de enige plek voor de ruimte onder een kop en onder een tabel.

## Knoppen en velden hebben een kleine maat van 36 pixels naast de standaardmaat

- **Datum:** 31 oktober 2026
- **Besluit:** `Button`, `Input`, `Select`, `Pagination` en `ThemeButton` hebben één gedeelde eigenschap, `size`, met de waarden `default` en `small`, en dezelfde klasse `hf-size-small` (`components/size.ts`).
  Zonder `size` verandert niets: de standaardmaat heeft geen klasse.
  De kleine maat is 2,25 rem hoog (36 pixels), uit het token `--hf-size-control-small` (`tokens/size.css`), met `--hf-space-xs` boven en onder, `--hf-space-s` opzij (bij een knop) en de lettergrootte van Meta, een stap onder die van Tekst.
  De ronde themaknop is dan 36 bij 36 pixels, met een pictogram van 22 pixels, en een open lijst van een `Select` met de opmaak van de site heeft opties van dezelfde hoogte.
  Wanneer welke maat: de standaardmaat voor formulieren, voor wat op een telefoon de hoofdhandeling is en voor wat alleen staat; de kleine maat voor secundaire bedieningselementen naast de inhoud, zoals een kiezer of een schakelaar in een zijkolom of een werkbalk.
  Het hoofdstuk Maten van knoppen en velden in Storybook zegt dat in woorden en toont beide maten onder elkaar.
  Dit is een afwijking van de regel dat velden en knoppen 44 pixels hoog zijn (`docs/toegankelijkheid.md`), en die is nu beperkt tot het gebruik van de kleine maat.
- **Waarom:** de seizoenskiezer en de schakelaar op Statistieken zijn te opvallend naast de inhoud als ze 44 pixels hoog zijn.
  36 pixels haalt WCAG 2.5.8 (24 bij 24 pixels) ruim, en is dezelfde maat als een link in de balk "Op deze pagina:" (zie _Een link in de balk is 36 pixels hoog_).
  Eén eigenschap met één naam houdt de keuze eenvoudig, en een klasse in plaats van een eigen klasse per component houdt de CSS op één regel per element.
  De hoogte staat in rem, zodat hij met de lettergrootte van de bezoeker meegroeit.
- **Gevolg:** op `Input` en `Select` neemt `size` de plaats in van het HTML-attribuut `size` (een breedte in tekens of een aantal regels), dat de site nergens gebruikt.
  `Textarea` heeft geen kleine maat: het is een blok met regels en heeft geen hoogte van 44 pixels.
  De ronde knop van `Card` (`card-share.css`) en de knop naar boven (`top-link.css`) houden hun 44 pixels: ze staan in een hoek van een kaart of de pagina, waar een vinger ze moet raken, en er is geen plek waar ze lager moeten.
  Niets op de site verschuift: geen pagina gebruikt de kleine maat.
  De `SegmentedControl` (#500) krijgt zijn kleine maat in zijn eigen issue, op deze eigenschap, en de seizoenskiezer volgt in het ontwerp van de werkbalk (#501).
- **Alternatieven:** een eigen klasse per component, zoals `hf-button-small` (meer klassen voor hetzelfde).
  Een derde maat, groot (niemand vraagt erom).
  Een kleine maat van 32 pixels (haalt 2.5.8 ook, maar laat minder ruimte voor een vinger).
  Alle bedieningselementen kleiner maken (een formulier op een telefoon heeft de 44 pixels nodig).
- **Later:** zie _Dichtheid is een klasse die tokens verandert, los van het kleurthema_ (2 november 2026): de standaardhoogte is nu ook een token, `--hf-size-control`, en in het compacte thema zijn de standaardmaat en de kleine maat 36 en 32 pixels hoog.
  Zonder de klasse blijft alles zoals hier staat.

## Een tabel sorteert op een kolom met knoppen in de koppen, die er alleen met JavaScript zijn

- **Datum:** 31 oktober 2026
- **Besluit:** `DataTable` kan sorteren, en de lijst van de tegenstanders is de eerste tabel die het gebruikt (#509).
  - **Wat de pagina doet:** zeggen welke kolommen sorteren, met `sortable: true` op de kolom.
    Een cel die op een andere waarde sorteert dan hij toont, is `{ text, sortValue }`, zoals "7–5" dat op het aantal doelpunten sorteert.
    Een kolom zonder afkorting is `{ name, sortable: true }`, zodat ook de eerste kolom (Club) kan sorteren.
    De pagina schrijft geen sorteercode.
  - **Zonder JavaScript:** de server stuurt de hele tabel in de volgorde van `rows`, met koppen van gewone tekst en zonder knoppen die niets doen.
    `DataTable` blijft daarvoor een servercomponent.
    Heeft een tabel geen sorteerbare kolom, dan is de uitvoer gelijk aan die van voor dit besluit en komt er geen script bij.
    Heeft hij er wel een, dan geeft `DataTable` het werk aan `SortableDataTable`, een clientcomponent.
    Die tekent bij het laden hetzelfde als de server en maakt er na het laden knoppen van, zoals de seizoenskiezer zijn knop weghaalt.
  - **De bediening:** een klik, Enter of spatie op de kop sorteert op die kolom.
    De eerste klik zet een kolom met alleen getallen aflopend (het grootste eerst) en een kolom met tekst oplopend, van A tot Z.
    De eerste kolom is tekst.
    Een tweede klik keert de richting om, en een andere kolom begint weer bij zijn eerste richting.
    Getallen sorteren als getallen, en tekst met de Nederlandse regels (`Intl.Collator('nl')`): hoofdletters en accenten tellen niet mee, en een getal in een naam telt op waarde, dus "Club 2" komt voor "Club 10".
    Gelijke waarden staan op de volgorde van de eerste kolom, van A tot Z, ook als de richting aflopend is.
    Is ook dat gelijk, dan blijft de gegeven volgorde.
  - **De uitleg voor wie het niet ziet:** de gesorteerde kop heeft `aria-sort="ascending"` of `"descending"` en de andere sorteerbare koppen `"none"`.
    Zichtbaar is de gesorteerde kolom aan een pijl: omhoog is oplopend en omlaag is aflopend.
    De pijl is een pictogram van het designsysteem, nieuw is `arrow-down`, en staat alleen in de gesorteerde kop.
    Na een klik zegt een regel wat er gebeurde, in een `role="status"` die niet te zien is: "Gesorteerd op Gespeeld, van hoog naar laag", of "van laag naar hoog", of bij tekst "van A tot Z" en "van Z tot A".
    De regio is er al voor de eerste klik, maar pas met JavaScript, en is dan leeg.
    De focus blijft op de knop, want de kop wordt bij een klik niet vervangen.
    De knop heet voor een schermlezer en voor spraakbesturing "GL gelijk": de afkorting staat in de naam, want een knop moet heten wat erop staat (2.5.3).
    In een gewone kop blijft de afkorting verborgen voor een schermlezer, die alleen het hele woord hoort.
  - **De maat:** de knop is minstens 1,5 rem hoog en breed (24 bij 24 pixels, WCAG 2.5.8), zonder vlak en rand, onderstreept zodat hij als iets om op te drukken leest.
    De pijl heeft de kleur van de tekst, dus hij haalt 3:1 als de tekst 4,5:1 haalt, en hij is een vorm, dus de kleur is niet het enige teken.
    De getalkolommen van een tabel die sorteert hebben opzij 0,125 rem ruimte in plaats van 0,5 rem, en vanaf 24 rem schermbreedte 0,25 rem, want de knoppen maken ze breder dan de getallen en zeven kolommen (de lijst met Punten) pasten anders niet op 320 pixels, ook niet als de pijl erbij komt.
    Op een bredere telefoon is er ruimte genoeg, en dan lopen de getallen van twee kolommen niet in elkaar over.
    De kop van een getalkolom eindigt waar de getallen eindigen, zodat er geen gat voor staat.
    De pijl staat in een getalkolom vóór de kop en in de eerste kolom erachter, en een ongesorteerde kop houdt geen plek voor een pijl vrij: zeven plekken zouden niet op 320 pixels passen.
    De breedte van een kolom verandert dus niet als de pijl in de ruimte van de kop past, en groeit een paar pixels als hij breder is, zoals bij GL.
  - **Niet in het adres:** de gekozen volgorde staat niet in de URL en blijft niet bewaard.
    Een nieuwe lading, ook na een wissel van de schakelaar van #406, geeft de tabel weer van A tot Z.
  - **De lijst van de tegenstanders:** de kolommen Club, Gespeeld, Gewonnen, Gelijk, Verloren en Doelpunten sorteren, en bij de keuze Eredivisie ook de nieuwe kolom Punten (afkorting P): 3 punten per winst en 1 per gelijkspel tegen die club, uit de cijfers van de Eredivisie.
    Bij "Alle wedstrijden" is er geen kolom Punten, want een bekerwedstrijd geeft geen punten, net als bij de rijen Punten van Thuis en uit (#406).
    Doelpunten sorteert op de doelpunten voor: een bezoeker zoekt de club waartegen we het vaakst scoorden, en het saldo staat niet in de tabel.
    De regel onder de tabel noemt P erbij als de kolom er is.
- **Waarom:** een lijst van enkele tientallen clubs van A tot Z laat niet zien tegen wie we de meeste wedstrijden speelden of de meeste doelpunten maakten.
  Het sorteren in het onderdeel houdt de pagina's klein en maakt het beschikbaar voor elke tabel met getallen.
  Zonder JavaScript is er niets stuk: de tabel is er, in de volgorde van de server.
  Knoppen in de koppen zijn de gewone bediening voor sorteren, met een toetsenbord en een schermlezer, en `aria-sort` plus een beleefde regel zegt wat er veranderde.
  De eerste richting volgt wat een bezoeker zoekt: het grootste getal, of A tot Z.
  Doelpunten voor is de uitkomst die bij de vraag "waar maakten we de meeste" hoort.
- **Nadeel:** zonder JavaScript sorteert de tabel niet.
  Een tabel met een sorteerbare kolom stuurt een stukje script mee, waar een gewone `DataTable` er geen heeft.
  "7–5" sorteert op één getal en een schermlezer hoort dat niet, want de kop zegt alleen "doelpunten".
- **Alternatieven:** sorteren op de server met `?sorteer=` in het adres (werkt zonder JavaScript, maar laadt de pagina opnieuw, past niet bij de schakelaar en maakt de volgorde onderdeel van het adres: het issue sluit dat uit); knoppen in de koppen ook zonder JavaScript (knoppen die niets doen); de pagina laten sorteren met eigen code (dan bouwt elke tabel het opnieuw); het doelpuntensaldo als waarde van Doelpunten (zegt niet hoe vaak we scoorden); sorteren op meer kolommen tegelijk, filteren en paginering (buiten het issue); alle kolommen met een pijl van een neutrale vorm (een extra pictogram en meer breedte op 320 pixels).
- **Later:** zie _Alle tabellen gebruiken één stel afkortingen voor hun kolommen_.
  De knop heet nog letter en woord, maar G heeft nu twee woorden: "G gespeeld" en "G gelijk", en "GL gelijk" bestaat niet meer.
- **Later:** zie _De lijst met tegenstanders sorteert op het doelsaldo en heeft altijd een kolom Punten_.
  De kolom Doelpunten is vervallen: de laatste kolom is het doelsaldo en sorteert daarop, en Punten staat bij beide keuzes.

## De schakelaar is een baan met een schuivende knop

- **Datum:** 31 oktober 2026
- **Besluit:** `SegmentedControl` en `SegmentedLinks` zijn een afgeronde baan met de keuzes naast elkaar, en een knop onder de gekozen keuze die naar een nieuwe keuze schuift (#500).
  - **De vorm:** de keuzes delen de breedte van de baan gelijk, en de knop is zo breed als één keuze, met een kleine marge rondom.
    De baan heeft de rol `--hf-colour-background-track` (in licht grijs-200, een stap onder de pagina en de vlakken; in donker blauw-800), de knop `--hf-colour-background-thumb` (wit; in donker blauw-700) met een lichte schaduw uit `--hf-colour-shadow-thumb`.
    De rand van de knop is `--hf-colour-border-input`: 3:1 tegen de baan en tegen de knop zelf, in beide thema's.
    De gekozen keuze heeft dikkere letters in de tekstkleur, de andere keuzes gewone letters in de rustige kleur van secundaire tekst (4,5:1 op de baan).
    Een pictogram blijft mogelijk.
    De gekozen keuze is dus te zien aan een rand en dikkere letters, niet aan kleur alleen.
    Een label ligt over een onzichtbaar, even breed exemplaar in dik, zodat de baan niet breder of smaller wordt met de keuze.
  - **De maten:** de standaardmaat is 44 pixels hoog en de kleine maat 36 pixels uit `--hf-size-control-small`, met dezelfde eigenschap `size` en dezelfde klasse `hf-size-small` als de knoppen en velden (zie _Knoppen en velden hebben een kleine maat van 36 pixels naast de standaardmaat_).
    Een keuze is over de hele hoogte van de baan te raken, ook al is de knop kleiner.
    De site zet de schakelaar op Statistieken en Spelers (#406) in de kleine maat.
  - **De beweging:** de knop schuift in `--hf-motion-duration-short` met `--hf-motion-ease-change`, en de kleur van de tekst gaat in dezelfde tijd over.
    Met `prefers-reduced-motion: reduce` zijn de duren 0 seconden, dus de knop springt.
    De plaats van de knop volgt uit twee custom properties op de groep, het aantal keuzes en de plaats van de gekozen keuze.
    Daardoor schuift hij met CSS als de pagina de waarde verandert (`onChange`), en staat hij goed in de HTML van de server, ook zonder JavaScript.
  - **Links zonder JavaScript:** een link laadt een nieuwe pagina, en dan kan de knop alleen schuiven met een overgang tussen pagina's (`@view-transition` met `view-transition-name`).
    Het is een extraatje: een browser zonder die ondersteuning laadt de pagina en de knop staat meteen bij de nieuwe keuze.
    De knop en de eerste vier keuzes hebben een eigen naam in de overgang, zodat de letters boven de knop blijven (een benoemd element ligt boven de rest van de pagina).
    De rest van de pagina, de root, krijgt geen animatie en verandert dus meteen, zoals voorheen.
    Met `prefers-reduced-motion: reduce` doet de pagina niet mee.
    Elke pagina met het stylesheet van het designsysteem doet mee aan de overgang, ook een pagina zonder schakelaar; die gaat dan zonder animatie over.
    Eén schakelaar per pagina, en voor de knop die schuift hoogstens vier keuzes, want een naam kan maar één element hebben.
    Gezien in Chromium 156 en in WebKit (Playwright 27.2) met twee losse pagina's: in beide gaat de overgang door en schuift de knop in 0,2 seconde.
    Safari zelf is niet gezien.
  - **Stylelint:** `@view-transition` en `::view-transition-*` zijn nog niet 'widely available' (2028).
    `light-dark()` kreeg dezelfde uitzondering; de `stylelint-disable` staat in `segmented-control.css` met de reden.
    De test van de bewegingstokens liet geen `animation-duration` toe; hij eist nu dat die een bewegingstoken is, zodat de overgang tussen pagina's geen eigen tijd schrijft.
- **Waarom:** de standaardvorm, een volle blauwe knop, was te opvallend naast de inhoud, en de projecteigenaar koos op 31 oktober 2026 voor het ontwerp van de baan met een lichte knop.
  Een baan met een knop laat in één oogopslag zien dat het één keuze uit een paar is, en de beweging zegt wat er veranderde.
  CSS en twee custom properties houden het component een servercomponent, zonder script en zonder meting in de browser.
  De overgang tussen pagina's is een extraatje dat bij weinig ondersteuning alleen de beweging mist, niet de keuze.
- **Gevolg:** de HTML van de schakelaar heeft nu een `style` met twee custom properties, een `span` om de tekst van elke keuze, en in de kleine maat de klasse `hf-size-small`.
  De tests van de pagina's Statistieken en Spelers lezen die opmaak.
  Op Statistieken en Spelers is de schakelaar 36 pixels hoog in plaats van 44, een baan met een lichte knop in plaats van twee knoppen met een rand; de kolom, de plek en de kaarten veranderen niet.
- **Alternatieven:** een knop als eigen element in de HTML, met een meting van de plaats in JavaScript (werkt niet zonder script en vraagt een client-component).
  Een knop die alleen met `aria-pressed` of `aria-current` van kleur wisselt, zonder te schuiven (de projecteigenaar wilde de beweging).
  De overgang tussen pagina's met JavaScript, in `pageswap` en `pagereveal` (dan werkt hij niet zonder script en moet de site een script laden).
  `@view-transition` alleen op pagina's met een schakelaar (CSS kan dat niet kiezen; het zou een script of een eigen stylesheet per pagina kosten).
  Een tweede maat-eigenschap voor de schakelaar (de kleine maat is al één mechanisme voor alle knoppen en velden).
- **Later:** zie _Een SegmentedControl bewaart niets, en de ingedrukte knop is gevuld_: de ingedrukte knop is niet meer gevuld, maar de gekozen keuze heeft een knop en dikkere letters.
- **Later:** zie _De baan van de schakelaar is een doorzichtige tint_: de baan is niet meer grijs-200 en blauw-800, maar een doorzichtige tint, en de rand en de letters halen hun verhouding over elk vlak.
  De vorm, de maten, de beweging en de knop blijven zoals ze zijn.
- **Later:** zie _De overgang van de schakelaar heeft een naam per plek_ (2 november 2026): de namen `hf-segmented-thumb` en `hf-segmented-option-1` tot en met `-4` zijn weg, en de zin "Eén schakelaar per pagina" geldt niet meer.
  De knop en de keuzes krijgen hun naam van de plek die de pagina aan `SegmentedLinks` geeft, en een pagina mag meer dan één schakelaar hebben als elke een eigen plek heeft.
  Een schakelaar zonder plek doet niet meer mee aan de overgang, ook niet als hij met knoppen werkt.

## De vier vlakken van een kaart hebben een betekenis, en elke kaart volgt de eerste regel die past

- **Datum:** 1 november 2026
- **Besluit:** de vier vlakken van een kaart, `default` (wit), `strong`, `warm` en `soft`, en het doorzichtige vlak hebben een vaste betekenis.
  Een kaart krijgt het vlak van de eerste regel die past:
  1. **Wit** (`default`): de kaart is waar de pagina voor bestaat.
     Dat zijn de hoofdinhoud van de pagina, zoals de lijsten met nieuws, het programma en de uitslagen, en het overzicht van ons seizoen.
     De blokken van de homepage zijn allemaal wit, want elk blok is er de inhoud.
  2. **Sterk** (`strong`): de kaart gaat over de mensen of organisaties achter de inhoud, of is aan hen gericht.
     Voorbeelden zijn de hoofdtrainer, "Ben je zelf een bron?" en later het officiële clubnieuws.
  3. **Warm** (`warm`): iets opmerkelijks, zoals een kaart die bijzonder of oorspronkelijk is of een uitnodiging.
     Voorbeelden zijn de grafieken van het seizoen, de ringen van Doelpunten per kwartier en de nieuwsbrief van de LC.
     Ongeveer één kaart op de zes, zonder vast maximum per pagina, en nooit om buren van elkaar te onderscheiden.
  4. **Zacht** (`soft`): ranglijsten, lijsten en records die bij de hoofdinhoud horen, de filters, de kaart van de eerste zoekvraag en al het andere dat de pagina aanvult.
  5. **Transparant** (`transparent`): bronvermeldingen.
     De schakelaar voor de competitie blijft zoals hij is, zonder vlak.
  6. **Buurkaarten mogen dezelfde kleur hebben.**
     Moeten twee kaarten uit elkaar, verander dan de volgorde of de kop, niet de kleur.
  7. **Kleur is nooit het enige teken.**
     In donker zijn zacht en wit gelijk, en warm en sterk ook, dus de betekenis moet ook uit de plaats en de kop komen.
- **Wat verandert:** bijna niets.
  Thuis en uit op Statistieken wordt wit (was warm).
  De filters op `/nieuws` en `/nieuws/podcasts` en de kaart van de eerste zoekvraag blijven zacht: te veel witte kaarten maken de pagina's saai en geven minder aanwijzingen over wat belangrijk is.
  Alle andere kaarten houden hun vlak, ook de homepage en `ArticleCard` (zacht).
- **Waarom:** de kleuren van de kaarten waren vooral gekozen om buurkaarten van elkaar te onderscheiden en zeiden niets.
  Ze wisselden om en om, zes kaarten op vijf pagina's waren warm, en zacht was de vuilnisbak geworden voor ongeveer vijftien kaarten.
  Met een betekenis kan een agent bij een nieuwe kaart kiezen zonder te raden, en weet de bezoeker dat warm iets bijzonders is.
- **Nadeel:** het oordeel "opmerkelijk" blijft van een mens.
  Er komt geen test die de regels afdwingt, en een kaart kan dus ten onrechte warm blijven.
  Naast elkaar kunnen twee witte of twee zachte kaarten staan, zodat de rand en de kop het onderscheid moeten maken.
- **Gevolg:** de regels staan in de Storybook-pagina van `Card`, met het lijstje "Welk vlak kies ik?".
  De vlakken, de tokens en het contrast veranderen niet.
- **Alternatieven:** de kleuren laten wisselen om buren te onderscheiden (zoals het was: geen betekenis, en elke nieuwe kaart vraagt een gok).
  Een vast maximum aan warme kaarten per pagina (een getal dat niets zegt over wat opmerkelijk is).
  Een test die de regels afdwingt (een machine kan niet bepalen wat opmerkelijk is).
  Een tweede soort vlak, of nieuwe kleuren (niet nodig voor de regels; de projecteigenaar probeert later vier kleuren in donker).
- **Later:** zie _De pagina van een club toont de namen van zijn stadion en heeft een zijkolom_ (1 november 2026): Onze uitslagen op de pagina van een club blijft niet warm maar wordt zacht, en Wedstrijden daar wordt wit (regel 1 en regel 4).
- **Later:** zie _Statistieken heeft een kaart Opmerkelijk: één feit per dag, in vaste volgorde_ (1 november 2026): met de kaart Opmerkelijk zijn drie van de tien kaarten op Statistieken warm (regel 3).
- **Later:** zie _Op Spelers is de ranglijst witte inhoud, en de bijzondere doelpunten staan in de zijkolom_ (1 november 2026): op de pagina Spelers is de ranglijst Doelpuntenmakers de hoofdinhoud en dus wit (regel 1 in plaats van regel 4); op Statistieken blijft de top 5 zacht.
- **Later:** zie _Tegenstanders heeft een zijkolom met de kaart Gemiddeld resultaat, en "Alle tegenstanders" is wit_ (4 november 2026) in `site.md`: op de pagina Tegenstanders is de lijst met alle tegenstanders de hoofdinhoud en dus wit (regel 1); de top 10 in de zijkolom is zacht (regel 4).

## De knop om een kaart als afbeelding op te slaan toont een camera, en is in rust rustiger

- **Datum:** 1 november 2026
- **Besluit:** de knop toont het pictogram `camera` in plaats van `image`, en `image` verdwijnt uit de lijst.
  In rust staat het pictogram in `--hf-colour-marker-graphic` (staal 500 in licht, staal 400 in donker) en niet in de linkkleur.
  Bij hover, focus, indrukken en tijdens het maken van de afbeelding blijft de knop zoals hij was: de vulling, de rand en de kleur van de zachte knop.
- **Waarom:** een camera zegt dat de knop een foto van de kaart maakt, en een plaatje zegt dat er een afbeelding staat.
  De kaart is het belangrijkste, dus de knop hoeft in rust niet te concurreren met de koppen en de links.
  Het blijft een bedienelement, dus het pictogram haalt 3:1 tegen elk van de vier vlakken van een kaart.
  Gemeten haalt staal 500 in licht 4,19:1 op wit, 3,85:1 op zacht, 3,46:1 op sterk en 3,45:1 op warm, en staal 400 in donker 6,21:1 op wit en zacht en 4,89:1 op sterk en warm.
  De linkkleur haalde 7,68:1 of meer in licht en 6,23:1 of meer in donker.
  Halverwege de overgang naar hover is het contrast niet lager dan aan het begin.
- **Alternatieven:** het pictogram doorzichtig maken; het contrast verschilt dan per vlak en haalt 3:1 niet overal.
  De knop pas bij hover tonen; op een aanraakscherm is er geen hover, dus de knop zou er niet zijn.

## Een Tag is een label met een korte tekst in drie tonen, en `highlight` heeft een eigen rand

- **Datum:** 2 november 2026
- **Besluit:** het designsysteem krijgt `Tag` (#594): een `span` met een korte tekst in drie tonen, `attention`, `highlight` en `neutral` (de lijst `tagTones`).
  - **De tekst:** hij zegt altijd wat er aan de hand is, zoals "Uitslag ontbreekt".
    De kleur komt erbij en draagt niets alleen.
  - **De rand:** elke toon heeft een rand in de kleur van zijn tekst, behalve `highlight`.
    Die heeft het nieuwe token `--hf-colour-border-highlight`: blauw-500 in licht en blauw-400 in donker.
  - **De kleuren van de tekst:** bestaande tokens.
    `attention` is `--hf-colour-text-missing`, `highlight` is `--hf-colour-text-highlight` op `--hf-colour-background-highlight`, en `neutral` is `--hf-colour-text-secondary`.
- **Waarom:** de beheerschermen voor een wedstrijd (#592) tonen in een lijst wat ontbreekt of is aangepast, en een lezer die de kleur niet ziet, moet het in de tekst lezen.
  De rand van `highlight` is een eigen token en geen hergebruik van de rand van de zachte knop, want hij hoort bij een label en niet bij een knop; de kleuren zijn dezelfde.
  Gemeten haalt de rand 3,86:1 tegen de vulling in licht en 4,16:1 in donker, en 3:1 en meer op de vier vlakken.
  De tekst haalt 4,5:1 of meer: `attention` 8,21:1 in licht en 6,18:1 in donker op het slechtste vlak, `neutral` 5,31:1 en 8,38:1, en `highlight` 10,26:1 en 11,40:1.
  Een test (`tag-css.test.ts`) houdt deze getallen vast.
- **Alternatieven:** één onderdeel `Badge` met een kleurprop (de naam zegt niets over wanneer je het kiest); de rand van de zachte knop hergebruiken (een knoprol voor een label); een label met alleen kleur of een pictogram (de kleur zou dan alles dragen).

## De gevaarlijke knop is rood en gevuld, alleen voor wat je weghaalt

- **Datum:** 2 november 2026
- **Besluit:** `Button` krijgt een derde uitvoering, `appearance="danger"`, met de klasse `hf-button-danger`.
  De knop is rood en gevuld en is alleen voor een actie die iets weghaalt, zoals "Invoer weghalen".
  Hij heeft verder geen ander gedrag dan de andere knoppen.
  - **Twee nieuwe tokens:** `--hf-colour-background-button-danger` en `--hf-colour-background-button-danger-hover`.
    Het vlak is rood-700 in licht en rood-300 in donker, en onder de muis rood-800 in licht en rood-200 in donker.
  - **Dezelfde tekst:** de tekst is die van de gevulde knop, `--hf-colour-text-on-button`, dus er komt geen token voor de tekst bij.
  - **De rand:** de rand heeft de kleur van het vlak, zoals bij de gevulde knop.
- **Waarom:** de beheerschermen voor een wedstrijd (#592) hebben een actie die een invoer terugzet.
  Dat moet er anders uitzien dan "Opslaan" en een eigen stap kosten, dus rood en gevuld.
  Gemeten haalt de tekst 7,48:1 op het vlak in licht en 9,97:1 onder de muis, in donker 9,06:1 en 12,19:1 (eis 4,5:1).
  Het vlak zelf haalt 3:1 en meer tegen de pagina en de vier vlakken van een kaart: in licht 6,16:1 tot 7,48:1, in donker 6,18:1 tot 9,06:1.
  Onder de muis gaat het vlak een stap verder in dezelfde richting als bij de gevulde knop: donkerder in licht, lichter in donker.
  Een test (`button-danger-css.test.ts`) houdt deze getallen vast.
- **Alternatieven:** de gevulde knop met rode tekst eromheen (de kleur draagt dan alles en de knop lijkt op een gewone actie); een rode zachte knop (even rustig als "Annuleren", dus geen stap die je opvalt); een eigen onderdeel zoals `DangerButton` (dubbel werk bij elke wijziging aan knoppen, zie _Button heeft een zachte uitvoering, met een rand die het contrast draagt_); `red-600` als vlak (haalt met witte tekst ook 5,79:1, maar rood-700 is het rood van het accent en van een verloren wedstrijd, zodat het rood één familie blijft).

## Een Notice is een melding met `role="status"`, zonder kop

- **Datum:** 2 november 2026
- **Besluit:** het designsysteem krijgt `Notice` (#594): een `p` met `role="status"` en alleen tekst.
  De rol is geen prop, dus een melding is altijd een status.
- **Waarom:** na het opslaan van een wedstrijd (#592) komt een melding als "Opgeslagen."
  Zonder kop voegt elke melding niets toe aan de opzet van de pagina.
  Een schermlezer leest de tekst voor die in een status komt, maar alleen als de status al op de pagina stond.
  Een melding na een actie staat dus eerst leeg op de pagina, en een lege melding laat niets zien (`.hf-notice:empty`).
  Een melding die al gevuld op de pagina staat als hij laadt, leest hij op zijn plek, zoals andere tekst.
  Beide gevallen staan in de stories.
  Het vlak is het zachte vlak met zijn rand, zodat de melding op een witte kaart en op de pagina te zien is.
- **Alternatieven:** een melding met een kop (elke opslag zou een kop aan de pagina toevoegen); een kaart met `role="status"` (een kaart is een blok van de pagina, een melding is een regel); `role="alert"` (die onderbreekt de lezer, en een opgeslagen invoer is geen fout).

## Een Disclosure is een `details` met een samenvatting van minstens 44 pixels

- **Datum:** 2 november 2026
- **Besluit:** het designsysteem krijgt `Disclosure` (#594): een `details` met een samenvatting en een pijl die omdraait als het blok open is.
  - **Het doel:** de samenvatting is minstens 44 pixels hoog, zoals de knoppen en de velden.
  - **Zonder JavaScript:** het blok werkt met alleen HTML, en het toetsenbord en de schermlezer doen de rest.
  - **Geen animatie van de hoogte:** de pijl draait, het blok springt open.
- **Waarom:** in de beheerschermen (#592) hoort een actie als "Invoer weghalen" achter een bewuste stap.
  Een `details` is daar het element voor, en het kost geen script.
  `WikipediaCredit` animeert de hoogte met `interpolate-size` en `::details-content`; dat is veel CSS voor een blok dat zelden opent.
- **Alternatieven:** een animatie zoals `WikipediaCredit` (zie boven); een knop die een blok toont met JavaScript (werkt zonder script niet); het blok altijd open (de rode knop staat dan altijd in beeld).

## Een Breadcrumb is een eigen onderdeel, met een teken dat geen tekst is

- **Datum:** 2 november 2026
- **Besluit:** het designsysteem krijgt `Breadcrumb` (#594): een `nav` met een `ol`, met de klasse `hf-navigation` zoals `Filter`.
  - **De props:** `items` (de pagina's erboven, de hoogste eerst), `current` (de huidige pagina, als tekst) en `label` (de naam voor schermlezers).
  - **De huidige pagina:** het laatste item, zonder link, met `aria-current="page"`.
  - **Het teken:** het teken tussen twee items is met randen getekend, een pijlpunt die bij zijn item hoort.
    Het is dus geen tekst voor een schermlezer, en het begint nooit een regel.
  - **Smal scherm:** de items breken om, en een lange naam breekt binnen het woord.
- **Waarom:** `Breadcrumb` is een eigen onderdeel en geen uitvoering van `Navigation`, want de laatste pagina is geen link en `Navigation` maakt van elk item een link.
  Het teken met randen is gekozen boven `content: '›'`: een teken in CSS leest een schermlezer soms voor, en de variant `content: '›' / ''` is nog niet Baseline 'widely available'.
- **Alternatieven:** een uitvoering van `Navigation` (past niet: zie boven); een teken in de HTML met `aria-hidden` (het blijft kopieerbare tekst); een teken met `content` (zie boven).

## Een pagina kan breed zijn, met een hoofdkolom van 58 rem en de zijbalk van 24 rem

- **Datum:** 2 november 2026
- **Besluit:** een pagina kiest zelf voor een brede variant met `wide` op `Page.Main`.
  De pagina is dan 84 rem breed: een hoofdkolom van 58 rem, 2 rem ruimte en de gewone zijbalk van 24 rem.
  Alleen de pagina's die het kiezen veranderen; elke andere pagina van de site en het beheer houdt 64 rem.
  Op een telefoon is er geen verschil met een gewone pagina.
  De kop, het menu en de voet blijven in de kolom van 64 rem.
- **Waarom:** de beheerschermen voor een wedstrijd (#592) hebben een tabel met invoervelden voor de doelpunten.
  Zes velden en een knop naast elkaar passen niet in een hoofdkolom van 38 rem, en onder elkaar vult één doelpunt een heel scherm.
  58 rem is breed genoeg voor de tabel zonder dat hij opzij schuift, en de zijbalk van 24 rem blijft zoals op elke pagina.
  Het is `Page.Main` die het zegt, zoals bij `wide` en `narrow` op `Page.Sidebar`, zodat een pagina het kan kiezen zonder de `Page.Body` te bezitten, die de indeling van de site tekent.
- **Hoe:** de tokens zijn `--hf-content-max-width-wide` (58 rem) en `--hf-page-max-width-wide` (84 rem) in `layout.css`.
  Vanaf 52 rem heeft `Page.Body` twee sporen, `minmax(24rem, 58rem)` en `minmax(16rem, 24rem)`, die meekrimpen tot 86 rem (84 rem plus 1 rem marge aan beide kanten) en onder die breedte net zo als bij andere pagina's.
  `Page.Body` rekent de ruimte aan de zijkanten uit de bredere kolom (`--hf-page-inset`), zodat de sporen gecentreerd staan.
  Een formulier met een `InputTable` is zo breed als zijn ouder, want `Form` hield het op 30 rem.
- **Nadeel:** de kop, het menu en de voet staan in een kolom van 64 rem, dus op een scherm breder dan 84 rem staat de brede pagina aan beide kanten 10 rem buiten de lijn van het logo.
  Een pagina die dat wil rechttrekken, vraagt een eigen beslissing: de hang van het schild en de grens van 66 rem in het menu staan nu als vast getal in de CSS.
- **Alternatieven:** de hele site breder maken; dat raakt elke pagina, en de regels van de tekstpagina's worden dan te lang.
  Een eigen tweede `Page.Body` voor het beheer; dat zet de indeling twee keer in de code, en de pagina's van het beheer gebruiken de indeling van de site.
  De kop, het menu en de voet ook breder maken; dat raakt de hang van het schild en het menu, en de projecteigenaar vroeg er niet om.
  `wide` op `Page.Sidebar` hergebruiken; dat betekent al "een zijbalk even breed als de hoofdkolom".

## Een tabel om in te vullen wordt een blok per rij waar hij niet past, naar de breedte van de tabel zelf

- **Datum:** 2 november 2026
- **Besluit:** `InputTable` is een tabel zolang hij 48 rem breed is, en daaronder is elke rij een blok met alle labels in beeld.
  De breedte is die van de tabel zelf (een `@container`-regel), niet die van het venster.
  `DataTable` heeft een tweede uiterlijk, `appearance="text"`, voor kolommen met tekst die links beginnen, een rijkop met een tweede regel en cellen met vrije inhoud; het is geen tweede tabel.
- **Waarom:** een tabel met acht kolommen van invoervelden past op een telefoon niet, en zijwaarts schuiven maakt velden onbereikbaar.
  Het venster zegt niet hoeveel ruimte de tabel heeft: op een middelbaar scherm van 52 tot 76 rem is de hoofdkolom van een brede pagina smaller dan 48 rem, en dan zou een regel voor het venster een tabel tonen die niet past.
  Een container query volgt de ruimte die er is, op elke pagina.
  Elk veld heeft een volledig label (kolomnaam en rij: "Minuut, doelpunt 2"), dus een schermlezer mist niets als een browser de tabel op de telefoon niet als tabel voorleest.
- **Nadeel:** de grens van 48 rem staat vast en volgt het aantal kolommen niet; een tabel met drie kolommen wordt eerder een blok dan nodig.
- **Alternatieven:** een media query op de breedte van het venster; die klopt niet in een smalle kolom.
  Een lijst met kaarten op elke breedte, zoals nu; dat vult een scherm met een paar doelpunten.
  Rollen (`role`) op de tabel en zijn rijen zetten om de tabelbetekenis op de telefoon te houden; elk veld is al volledig benoemd, dus ze voegen niets toe en moeten we bijhouden.
- **Later:** zie _Een rij van een tabel om in te vullen heeft twee regels, een nummer en een prullenbak_.
  De tabel is nu een blok per rij met twee regels, vanaf 40 rem naast het nummer en de knop, en zonder kolomkoppen.
  Wat blijft: de breedte is die van de tabel zelf, en elk veld heeft een volledig label.

## Dichtheid is een klasse die tokens verandert, los van het kleurthema

- **Datum:** 2 november 2026
- **Besluit:** het designsysteem heeft een tweede dichtheid, compact, voor schermen waar mensen lang achter zitten en veel velden en rijen zien.
  Je zet hem aan met de klasse `hf-density-compact` op een element, en hij geldt voor alles daarbinnen.
  - De klasse staat alleen in `tokens/density.css`, in de laag `hf.tokens`, en zet alleen eigenschappen met `--hf-`: de vijf stappen van de ruimte, de maten van de letters, en de hoogte van knoppen en velden.
  - Geen component, geen component-CSS en geen component-API kent de klasse.
    `tokens/density-css.test.ts` bewaakt dat, en dat `density.css` niets anders zet dan tokens die al bestaan.
  - De breedtes van de pagina, de kleuren, de gewichten en de regelhoogten blijven zoals ze zijn.
    De dichtheid heeft ook niets met `data-theme` te maken: licht en donker zijn een andere keuze.
  - De site, niet het designsysteem, zet de klasse op de `Page.Main` van elke pagina onder `/beheer` (`apps/site/src/beheer/density.ts`).
    De kop en de voet van de site houden de ruimte van de publieke pagina's.
    `apps/site/src/beheer/density.test.ts` zoekt de pagina's zelf op en faalt voor een pagina die de klasse vergeet.
  - Een keuze van de bezoeker of de redacteur om de dichtheid aan of uit te zetten, en het opslaan daarvan, zit er niet in.
- **Hoe:** de vaste maten die het thema niet bereikte, zijn tokens geworden met als waarde wat ze waren, zodat de publieke site niet verandert.
  - `--hf-size-control` is de standaardhoogte van knoppen en velden (2,75 rem), in `button.css`, `forms.css`, `select.css`, `segmented-control.css`, `pagination.css` en `disclosure.css`, naast `--hf-size-control-small`.
  - Vijf lettergroottes zijn tokens, in `typography.css`: `--hf-menu-font-size`, `--hf-submenu-font-size` en `--hf-anchor-font-size` voor de menu's en de balk "Op deze pagina", en `--hf-figure-font-size` en `--hf-figure-large-font-size` voor een teken in een rij en het totaal in een donut.
  - De icoonknoppen (de themaknop, de knop naar boven, de deelknop van een kaart) en de links van het hoofdmenu en de bronvermelding van Wikipedia houden hun 44 pixels: ze staan in de kop, de voet of een hoek, waar een vinger ze moet raken, en het beheer heeft ze niet.
  - Een kolom van `Page` (`Page.Main`, de cellen en de zijbalk) neemt de ruimte tussen de cellen weer uit `--hf-space-xl`, op zijn eigen element.
    Een eigen eigenschap die naar een andere eigenschap verwijst, krijgt zijn waarde op het element waar hij staat, en dat is anders de `Page.Body`, buiten de klasse.
    Zonder klasse is de waarde dezelfde: 2 rem.
- **De waarden:** drie kwart van elke stap van de ruimte (0,125, 0,375, 0,75, 1,125 en 1,5 rem), zeven achtste van de koppen 1 tot en met 3 op dezelfde vloeiende schaal, en een stap omlaag voor de rest.
  - Tekst: Tekst 15 pixels (was 16), Meta en Label 13 pixels (was 14), Nieuwskop 16 pixels (was 18), Inleiding 18 pixels (was 20) en Kop 4 15 pixels (was 16).
  - Cijfers: 16 en 20 pixels (was 18 en 24).
  - Knoppen en velden: 36 pixels in de standaardmaat (was 44) en 32 pixels in de kleine maat (was 36).
  - De regelhoogten, de gewichten en de breedtes van de pagina blijven.
- **Waarom:** de beheerschermen hebben veel velden en rijen en mensen zitten er lang achter, terwijl de ruimte van de publieke site is gemaakt om te lezen.
  - Een klasse die tokens verandert, laat elk component in het beheer hetzelfde doen als erbuiten: er is geen prop en geen tweede stijl om bij te houden, en een nieuw component of scherm krijgt de dichtheid vanzelf, zoals de wedstrijdschermen (#592) na #594 en #595.
  - De grenzen zijn de leesbaarheid en WCAG 2.5.8: de kleinste tekst is niet onder 0,75 rem (nu 0,8125 rem) en lopende tekst niet onder 0,875 rem (nu 0,9375 rem), en een knop of veld blijft ruim boven de 24 bij 24 pixels (32 pixels is een derde meer, en 36 pixels de helft).
  - De ruimte gaat met een vaste factor omlaag, en de volgorde van de stappen blijft.
    Een kleinere factor spaart te weinig om op te vallen, een grotere laat velden en teksten tegen elkaar kleven.
  - De koppen krijgen dezelfde factor op de vloeiende schaal, zodat de verhouding tussen twee koppen gelijk blijft en kop 3 groter blijft dan kop 4.
  - De standaardhoogte van 36 pixels is de kleine maat van de publieke site, die daar al bruikbaar bleek (zie _Knoppen en velden hebben een kleine maat van 36 pixels naast de standaardmaat_).
    De kleine maat gaat mee omlaag naar 32 pixels, zodat hij lager blijft dan de standaard.
  - De breedtes van de pagina blijven, omdat een andere kolombreedte een andere pagina is en geen dichtheid.
    De eigenschappen die een stap bij `:root` overnemen, zoals `--hf-page-margin`, houden de waarde van `:root`, en dat is hier de bedoeling.
  - De klasse op `Page.Main` van elke beheerpagina, en niet één wikkel in een `layout.tsx` voor `/beheer`: `Page.Main` en `Page.Sidebar` moeten rechtstreeks in de `Page.Body` staan, en een `div` ertussen breekt de kolommen en de selectors met `:has(> …)`.
- **Nadeel:** elke nieuwe beheerpagina moet de klasse zelf zetten.
  De test vangt het, maar het is een regel per pagina.
  De ruimte boven en onder de kolommen is die van de `Page.Body`, buiten de klasse, en blijft dus ruim.
  Ook het voorbeeld en de versie van een artikel (`/beheer/artikelen/[id]/voorbeeld` en `/beheer/artikelen/[id]/versies/[nummer]`) zijn compact, dus het artikel staat daar kleiner dan op de pagina van een bezoeker.
  De projecteigenaar koos dat op 2 november 2026, omdat de pagina's onder `/beheer` dan allemaal hetzelfde zijn en er geen uitzondering is om te onthouden.
- **Alternatieven:** een prop `density` op elk component (elk component kent het thema, en elk nieuw component moet het erbij doen); een tweede stylesheet voor het beheer (twee stijlen om gelijk te houden); `zoom` of een kleinere `font-size` op de wikkel (maakt ook de breedtes en de kleine tekst kleiner, en haalt de grenzen niet); de klasse op `body` of `html` (kop en voet van de site worden ook compact); één wikkel in `app/beheer/layout.tsx` (zie hierboven); de waarden in de klasse op de `Page.Body` (de root-layout kent het pad niet); de kop en de voet ook compact (de publieke site blijft zoals ze is); de dichtheid laten kiezen door de redacteur (een eigen issue, met opslaan).

## Een kolom van een tabel met tekst kan opvouwen onder de rijkop

- **Datum:** 2 november 2026
- **Besluit:** een kolom van `DataTable` met `appearance="text"` kan als `{ fold: true, name }` worden gegeven.
  Waar de tabel minder dan 44 rem breed is, verdwijnen de kop en de cellen van die kolom, en staat de tekst van de cellen op één regel in secundaire tekst onder de rijkop, in de volgorde van de kolommen.
  Waar de tabel ruimte heeft, is het een kolom en is de regel weg.
  Een tabel zonder zo'n kolom blijft zoals hij was, ook in zijn opbouw: alleen een tabel met een kolom die opvouwt krijgt een element eromheen, dat de ruimte meet.
- **Waarom:** de lijst van wedstrijden in het beheer (#592) heeft vijf kolommen op een brede pagina en drie op een telefoon.
  De projecteigenaar koos voor een kleine toevoeging aan de tabel boven een lijst met drie kolommen op elke breedte.
  De ruimte van de tabel zelf beslist, zoals bij de tabel om in te vullen (_Een tabel om in te vullen wordt een blok per rij waar hij niet past, naar de breedte van de tabel zelf_), zodat het klopt in een smalle kolom op een breed scherm.
  De verborgen cellen zijn weg voor een schermlezer (`display: none`), dus er wordt niets twee keer voorgelezen.
- **Nadeel:** de grens van 44 rem staat vast.
  De inhoud van de cellen staat dan twee keer in de pagina, één keer verborgen.
- **Alternatieven:** twee tabellen, een voor een breed en een voor een smal scherm; dat zet de gegevens twee keer in de pagina en een schermlezer leest ze allebei.
  Alleen drie kolommen op elke breedte, met de datum en de competitie onder de wedstrijd; dat verspilt de ruimte van een brede pagina.
  Een media query op het venster; die klopt niet in een smalle kolom.

## Een veld kan "niet verplicht" weglaten, en de wedstrijdschermen doen dat

- **Datum:** 2 november 2026
- **Besluit:** `Field`, `RadioGroup` en een kolom van `InputTable` hebben de eigenschap `hideOptional`.
  Die laat "(niet verplicht)" weg uit het label van wat niet verplicht is.
  - Het veld houdt zijn `required`, of het ontbreken ervan.
    Een schermlezer en de browser zeggen dus nog wat ze zeiden.
  - Zonder `hideOptional` verandert niets, dus alle andere formulieren blijven zoals ze zijn.
  - De wedstrijdschermen van het beheer gebruiken het overal.
- **Waarom:** een redacteur komt vaker en leert hoe het werkt, en in een formulier waar bijna alles leeg mag, herhaalt het woord zich in elk label.
  De projecteigenaar vroeg om schermen die korter en rustiger zijn (#615).
  Wat verplicht is, blijft verplicht voor HTML; alleen het woord verdwijnt.
- **Nadeel:** het scherm zegt niet meer welk veld leeg mag.
  De foutmelding zegt wat ontbreekt.
- **Alternatieven:** "(verplicht)" bij wat moet; dat draait de gewone staat om, en verandert elk formulier.
  Het woord overal weghalen; de publieke formulieren zijn voor lezers die het woord helpt.

## Een keuze uit twee waarden is een groep keuzerondjes, een keuze uit meer is een `Select`

- **Datum:** 2 november 2026
- **Besluit:** het designsysteem heeft `RadioGroup`: een `fieldset` met een `legend` en twee of drie keuzerondjes naast elkaar.
  - De legenda, de hulptekst en de fout horen bij elkaar zoals bij een `Field`.
    De `id` is die van het eerste keuzerondje, zodat een link in de foutenlijst erheen gaat.
  - Het werkt zonder JavaScript en met het toetsenbord: de pijltjes lopen langs de rondjes.
  - Een keuze uit drie of meer waarden, zoals de status of de soort van een doelpunt, blijft een `Select`.
  - De wedstrijdschermen gebruiken het voor het team van een doelpunt en voor de verlenging.
- **Waarom:** bij twee waarden zie je allebei in één blik, en kiezen kost één tik in plaats van twee.
  Een keuzerondje is wat een schermlezer en de browser voor "één van twee" kennen.
  Het besluit over de schakelaar voor licht en donker (_Licht of donker: twee knoppen, drie toestanden, en een keuze gelijk aan het systeem wordt vergeten_) wees keuzerondjes af, omdat die keuze meteen werkt en geen veld van een formulier is.
  Dit is een veld dat het formulier verstuurt.
- **Nadeel:** de groep neemt meer ruimte dan een `Select`, en past niet bij lange keuzes.
  De fieldset heeft geen `aria-invalid`; de fout staat in tekst en hoort erbij met `aria-describedby`.
- **Alternatieven:** een `Select` voor twee waarden, zoals het was; die verbergt de andere waarde achter een tik.
  `SegmentedControl`; die is voor een keuze die meteen werkt, met JavaScript.

## Een veld en een lijst zijn even hoog, en een veld heeft een breedte die bij het antwoord past

- **Datum:** 2 november 2026
- **Besluit:** `Input` en `Select` zetten hun hoogte (`block-size`) op het token voor de hoogte van een knop, in beide maten.
  Een verhaal meet in de browser dat ze even hoog zijn, gewoon en compact (`Tokens/Dichtheid`).
  - `Input` heeft `width`: `default` (de hele regel, tot een maximum), `narrow` (een paar tekens, voor een score of een minuut) en `natural` (de breedte die de browser aan een datum of een tijd geeft).
  - `Select` heeft `width`: `default` en `natural` (zo breed als de keuze die hij laat zien).
  - Waar de browser `field-sizing: content` kent, past een smal veld zich aan de inhoud aan, en een lijst aan zijn keuze.
    De browsers die het niet kennen, houden een vaste breedte of de breedte die ze zelf geven; het staat in `@supports`.
  - Zonder `width` verandert niets.
- **Waarom:** in de compacte dichtheid was een `Input` 36,5 pixels hoog en een `Select` 36.
  Chrome geeft een lijst een regelhoogte van `normal` en neemt `line-height` niet over, dus alleen een minimale hoogte hield ze niet gelijk.
  Een score, een minuut en een tijd hebben geen veld van 30 rem nodig, en een rustig scherm laat dat zien.
- **Nadeel:** een vaste hoogte laat de tekst in een veld niet groeien als de tekstmaat toeneemt; de hoogte is in rem, dus ze groeit met de grootte van de letters in de browser.
- **Alternatieven:** `line-height` op de lijst zetten; Chrome negeert dat.
  De hoogte aan de inhoud overlaten, zoals het was.
  Een breedte in rem per veld; de maat hoort bij het antwoord, en een veld met een vaste breedte past niet bij een andere lettergrootte.

## Een knop met alleen een pictogram heeft een verplichte naam

- **Datum:** 2 november 2026
- **Besluit:** het designsysteem heeft de pictogrammen `save` (een diskette) en `trash` (een prullenbak), en de knop `IconButton`.
  - `IconButton` laat alleen een pictogram zien en heeft een verplichte `label`.
    Die is zijn naam voor een schermlezer (`aria-label`) en de tekst die verschijnt als je er met de muis op blijft staan (`title`).
  - Hij is even groot als een `Button`, en zacht tenzij je iets anders kiest.
  - `Button` krijgt `icon="save"` voor "Opslaan".
    De bestaande knoppen veranderen niet.
- **Waarom:** een rij met "Weghalen" bij elk doelpunt is onrustig, en een prullenbak kent iedereen.
  Een naam die verplicht is, voorkomt een knop waar een schermlezer niets van zegt.
- **Nadeel:** `title` verschijnt niet met het toetsenbord of bij aanraking, dus de prullenbak moet zonder woorden duidelijk zijn.
  Daarom is het pictogram alleen voor wat iedereen kent.
- **Alternatieven:** een knop met tekst zoals het was; dat herhaalt het woord in elke rij.
  Een pictogram met tekst; dat is even breed als de tekst.
  Een eigenschap op `Button` die de tekst verbergt; dan verandert `Button` voor elke gebruiker, en de naam is niet verplicht.

## Een rij van een tabel om in te vullen heeft twee regels, een nummer en een prullenbak

- **Datum:** 2 november 2026
- **Besluit:** een rij van `InputTable` heeft een of twee regels velden, naast het nummer van de rij en de knop om haar weg te halen.
  - Elk veld heeft zijn eigen zichtbare label, met de rij erin voor een schermlezer ("Minuut, doelpunt 2").
    De kolomkoppen zijn weg, want twee regels delen geen koppen.
  - Een kolom kiest zijn regel (`line`) en zijn ruimte (`width`: `default`, `narrow` of `natural`).
  - De rijkop is het nummer ("2"), met de naam voor een schermlezer ("Doelpunt 2"); de knop heet "Doelpunt 2 weghalen".
  - Een veld is een `control` in een `Field`, of een `group`, zoals een `RadioGroup`.
  - Een veld dat niet bij de rij past is `hidden`: het is niet te zien en gaat niet mee met het formulier, maar het houdt wat erin stond.
    De tabel zet het in een `fieldset` die `disabled` is, dus ook een groep gaat niet mee.
  - Waar de tabel smaller is dan 40 rem, is elke rij een blok met het nummer en de knop bovenaan.
    De breedte is die van de tabel zelf, zoals eerder.
- **Waarom:** de projecteigenaar wil een doelpunt op twee regels, eerst de minuut, de blessuretijd en de soort, dan het team en de speler (#615).
  Dat past niet onder kolomkoppen, en een veld dat wisselt tussen een lijst en een naam heeft een plek nodig waar het niet meetelt als het niet past.
  Een gedeactiveerde `fieldset` is HTML en werkt zonder JavaScript.
- **Nadeel:** de labels staan in elke rij, ook bij een lange lijst.
  Een tabel met veel rijen is langer dan er een met kolomkoppen zou zijn.
- **Alternatieven:** de kolomkoppen houden met twee kopregels; de regels hebben dan niets met elkaar te maken.
  Een veld weghalen uit de pagina als het niet past; dan is wat de redacteur typte weg bij een vergissing.
  Een attribuut `disabled` op elk veld apart; dan moet de aanroeper het bij elk soort veld onthouden.

## Alle tabellen gebruiken één stel afkortingen voor hun kolommen

- **Datum:** 2 november 2026
- **Besluit:** de kolommen van alle tabellen hebben één stel afkortingen, met één letter per kolom, in één lijst in het designsysteem (`tableColumns`).
  - **De letters:** G gespeeld, W winst, G gelijk, V verlies, P punten, D doelpunten en S doelsaldo.
    A (assists) is gereserveerd voor de tabellen van de spelers (#493).
    GL, L, DV, DT en DS komen niet meer voor.
  - **De twee G's:** alleen G heeft twee woorden.
    G gespeeld staat vooraan van de cijferkolommen en G gelijk direct na W, dus de twee staan nooit naast elkaar.
    Een schermlezer hoort altijd het hele woord, een sorteerknop heet "G gespeeld" of "G gelijk", en de regel onder de tabel zegt wat elke letter is.
  - **Het doelsaldo is S**, van saldo, want D is al doelpunten en V is verlies.
    De waarden houden hun teken (+6, −2).
  - **De woorden zijn winst, gelijk en verlies**, overal.
    Dat zijn de woorden van `MarkRow` en `FormChart`, die W, G en V houden.
    De lijst van tegenstanders en `RecordTable` stappen over van gewonnen en verloren.
  - **De doelpunten** blijven in één kolom, D, met de score "voor–tegen" in de cel.
  - **De regel onder de tabel** noemt alleen de letters die de tabel heeft, in de volgorde van de kolommen.
    `tableLegend` schrijft hem uit de lijst.
  - **Eén plek:** `StandingsTable`, `TopScorersTable`, `RecordTable`, `DataTable` in de lijst van tegenstanders en de tabellen over het verloop van de wedstrijden nemen hun letters en woorden uit `tableColumns`.
    Een test legt de lijst vast en faalt als een letter twee woorden krijgt, met G als enige uitzondering.
    Wie een kolom toevoegt, neemt de letter uit de lijst, of kiest een letter die nog vrij is en voegt die toe.
- **Waarom:** dezelfde letter betekende niet overal hetzelfde.
  G was "gespeeld" in de stand en "gelijk" in de uitslagen, GL en L waren allebei "gelijk", en D was doelsaldo op de pagina van een club en doelpunten in de lijst van tegenstanders en bij de topscorers.
  De projecteigenaar wil één letter per kolom en koos ervoor om twee G's te accepteren in plaats van een teken of een tweede letter.
  W, G en V zijn ook de tekens van de uitslagen, dus een tabel en een rij uitslagen gebruiken dezelfde letters voor winst, gelijk en verlies.
  Eén lijst houdt de tabellen gelijk, ook de tabellen die er nog komen.
- **Nadeel:** G heeft twee betekenissen.
  Alleen de volgorde van de kolommen en de regel onder de tabel maken het verschil voor wie ziet.
- **Gevolg:** de kolommen worden smaller, want alle koppen zijn één letter (#630 bouwt daarop).
- **Alternatieven:** "=" voor gelijk (uniek en eenletterig, maar de uitslagen krijgen dan een ander teken dan de supporter kent); "Wed" voor gespeeld (de gewone kop in Nederlandse tabellen, maar drie letters en een bredere kolom); een bal als pictogram voor gespeeld (een nieuw pictogram dat moeilijker te lezen is); GL of L voor gelijk (twee letters, of een letter die van niets komt); een lege kop (niet toegankelijk); "±" of "+/−" voor het doelsaldo (geen letter, of drie tekens breed); gewonnen en verloren als woorden (dan moeten de uitslagen en het verloop mee).
- **Later:** zie _In de tabellen met de uitslagen van de club is het doelsaldo D, en staat P vóór D_ (2 november 2026).
  Het doelsaldo is D en niet S, dus D heeft twee woorden, doelpunten en doelsaldo, net als G; de test legt G en D vast als de enige uitzonderingen.
  DV, DT en DS komen alleen als een tabel de doelpunten voor, tegen en het saldo tegelijk toont, en geen tabel doet dat nu.
  De rest blijft: één lijst, `tableLegend`, de woorden winst, gelijk en verlies.
- **Later:** zie _`TopScorersTable` heeft de kolom D/W, en `tableColumns` heeft één afkorting van twee letters_ (7 november 2026): `D/W` is de uitzondering op één letter per kolom, en de test legt G, D en P vast als de letters met twee woorden.

## Een donutdiagram heeft een plak per uitslag, en de tabel is de legenda

- **Datum:** 2 november 2026
- **Besluit:** het diagram van de kaart "Hoe vaak welke uitslag" heeft een plak per uitslag in de kleur van de uitkomst (groen, grijs, rood), zonder tekst rond de ring (#638).
  De tabellen eronder, een voor winst, een voor gelijk en een voor verlies, naast elkaar, hebben een vlakje in de kleur van elke plak en zijn voor de schermlezer de weergave van de cijfers.
  - `DonutChart` krijgt daarvoor een `tone` per plak (`positive`, `neutral` of `negative`, de `ChartTone` van de andere grafieken) en `labels={false}`, dat de tekst en de streepjes rond de ring weglaat.
    De `tone` van het diagram blijft voor de plakken die er geen hebben, en `title` mag ontbreken.
  - Plakken van één kleur lopen onderling van het zwakste tot de volle kleur, zoals nu, en het grijs van een gelijkspel begint bij 80%, zoals in `chart.css`.
    Met `ranked` gaat het diagram van goed naar slecht: het groen loopt van de sterkste kleur naar de zwakste, zodat de grootste winst en het grootste verlies allebei het sterkst zijn, en het bereik is groter, want de sterkste plakken gaan voorbij de volle kleur: tot 35% van de kleur van de tekst erdoor gemengd (`strengthsOf`).
    De kleur van de tekst is donker in licht en licht in donker, dus het contrast met het vlak wordt alleen groter; het zwakste blijft 70%, want daaronder haalt een plak geen 3:1.
    Zonder tekst is de ring een eigen, kleinere tekening (`bare` in `geometry.ts`), zodat hij de plek vult.
  - Het vlakje in de tabel is `DonutChart.Swatch`, dat dezelfde plakken en de plaats van zijn plak krijgt en daaruit dezelfde kleur en sterkte haalt (`strengthsOf`).
    Een rij van `DataTable` krijgt het als `marker` (voor de rijkop) en de uitkomst in woorden als `note` (alleen voor de schermlezer, "4–0, winst").
  - De drie tabellen staan in een `DataTable.Group`, die ze naast elkaar zet, 1,5 rem uit elkaar, zolang ze 5,5 rem breed kunnen zijn en anders onder elkaar.
    Het aantal staat als "4×" onder een kop `Keer` die alleen de schermlezer hoort (`hidden` op de kolom), want een kolomkop mag niet ontbreken.
- **Waarom:** een seizoen heeft zo'n acht tot twaalf verschillende uitslagen, en zoveel teksten passen niet rond een ring (ze schuiven tot 40 graden uit elkaar).
  De cijfers staan toch al in de tabel, en kleur is niet het enige: de tabel noemt de uitslag en de uitkomst in woorden.
  Eén functie voor de sterkte houdt het vlakje en de plak gelijk, ook als de regel voor de sterkte verandert.
- **Alternatieven:** drie plakken (winst, gelijk, verlies) met tekst rond de ring; alleen de grote plakken benoemen (een verborgen regel over wat er een naam krijgt); een eigen tabelonderdeel voor de uitslagen in plaats van `marker` en `note` op `DataTable` (een tweede tabel met dezelfde opmaak); één tabel met alle uitslagen onder elkaar (de eerste versie van deze pull request, tot de projecteigenaar drie tabellen naast elkaar vroeg); de groepen van één kleur een stukje uit de ring trekken (de ring wordt er onrustig van, dus de projecteigenaar liet het weer weg).

## De baan van de schakelaar is een doorzichtige tint

- **Datum:** 2 november 2026
- **Besluit:** `--hf-colour-background-track` is `color-mix(in srgb, <zwart of wit> n%, transparent)`, in licht en in donker (#628).
  - **In licht** is het zwart met 6% (een schaduw van de ondergrond), **in donker** wit met 10% (een lichtere tint ervan).
    Zwart en wit laten de tint van de ondergrond intact, dus de baan blijft blauw op blauw en zand op zand.
    Een grijs, zoals grijs-400 met 20% (de eerste keuze, naast blauw-300 met 15% in donker), werd op een blauwe ondergrond grijs.
    `--hf-colour-black` is nieuw, als primitief naast `--hf-colour-white`: het is geen stap uit een schaal, dus het issue noemde het niet.
    De sterkte is op het oog gekozen, na twee keer te licht: eerst 15% en 10%, dan 20% en 15%.
    De baan was in licht tussen 1,09:1 (warm) en 1,33:1 (wit) van de ondergrond en in donker tussen 1,00:1 (sterk en warm, de baan was daar onzichtbaar) en 1,47:1.
    Nu is hij in licht 1,14:1 en in donker tussen 1,30:1 en 1,33:1.
    Sterker kan niet veel: de rand van de knop haalt 3:1 tegen de baan tot ongeveer 6% in licht en 12% in donker, en de letters van de andere keuzes (grijs-600) halen 4,5:1 tot ongeveer 7% in licht.
  - **De ondergrens** is 1,1:1 van de pagina en van elk vlak, zodat de baan als een groef te zien blijft.
    De verhoudingen voor de rand en de letters zijn er al bij 5%, en zeggen niets over de zichtbaarheid van de baan zelf, dus die ondergrens is onze keuze.
  - **De verhoudingen** gelden over de pagina, wit, `soft`, `strong` en `warm`, in licht en in donker: de rand van de knop 3:1 tegen de baan en tegen de knop, de letters van de opties 4,5:1 op de baan, en 4,5:1 voor de gekozen keuze op de knop.
    `segmented-control-css.test.ts` legt de baan met een kleine hulpfunctie over elk vlak en meet die uitkomsten, in plaats van één kleur.
  - **Zonder `light-dark()` of `color-mix()`** houdt de baan de oude vaste kleur: grijs-200, uit het blok `@supports not (color: light-dark(#000, #fff))` in `colour.css`.
    Elke browser met `light-dark()` kent ook `color-mix()`, dus één blok is genoeg.
  - **Een tint is geen stap uit een schaal:** wat de baan op een ondergrond wordt, verschilt per ondergrond.
    Dat nemen we aan, zoals bij de strepen.
- **Waarom:** de vaste baan was warm grijs en lag op een zachte kaart (blauw-50) op een koele blauwe ondergrond, en dat zag er mis uit.
  Een tint neemt de kleur van de ondergrond over, dus de baan past op de pagina en op elk vlak, ook een vlak dat er later bijkomt, zonder dat `Card` iets hoeft te zetten.
  In donker was de baan op de sterke en de warme kaart (blauw-800) even donker als de kaart en dus onzichtbaar; een lichte tint maakt hem daar wel een groef.
- **Nadeel:** de uitkomst is geen vaste kleur uit het palet, dus er is geen vaste tabelrij met een verhouding voor de baan: de test meet elke ondergrond.
- **Alternatieven:** een grijs of een blauw uit een schaal als tint (de baan wordt dan grijs of vlak op een blauwe ondergrond); een vaste kleur per vlak, gezet door `Card` (echte paletkleuren en eenvoudige metingen, maar elke nieuwe ondergrond vraagt een nieuwe regel); de baan laten zoals hij is; in donker een donkere tint (blauw-950, onzichtbaar op de pagina, die dezelfde kleur heeft); zwart in donker (dezelfde reden, en een groef die donkerder is dan de pagina bestaat niet).

## De tegel is een kaart die één link is, in een lijst van tegels

- **Datum:** 2 november 2026
- **Besluit:** het designsysteem heeft `Tile`, een kaart die één link is, en `Tile.Grid`, de lijst waarin tegels staan (#616).
  - **De tegel** is een `li` met een `Card` erin: een kop (`h2` tot `h4`, het niveau kiest de pagina) met daarin de link, een regel beschrijving en eventueel een pictogram vóór de tekst.
    De kop is de tekst van de link, dus de naam van de tegel is de naam van de plek, zonder woorden erbij.
  - **De hele tegel is aan te klikken** met één link: een leeg `::after` op de link bedekt de kaart.
    De focusrand staat om de hele tegel, op datzelfde `::after`, en de woorden van de kop hebben er geen eigen.
    Onder de muis krijgt de rand de kleur van een markering, zodat de tegel laat zien dat hij een link is.
  - **Het raster** zet de tegels naast elkaar zover ze passen, elk minstens 15 rem breed, en onder elkaar op een telefoon, zonder media query.
    De tegels in een rij zijn even hoog.
  - **Het pictogram** is een lijnpictogram dat ontbreken kan.
    Het is voor het oog en verborgen voor hulpsoftware, en het is nooit het enige teken van waar de tegel heen gaat.
    `Icon` kreeg er vier bij: `speech` (berichten), `document` (artikelen), `ball` (wedstrijden) en `chart` (bezoek), in dezelfde stijl als de andere.
  - **Het vlak** is het witte van `Card`; er is geen keuze.
- **Waarom:** een startpagina waar de bezoeker een plek kiest, is een lijst met koppelingen die niet zegt wat er te vinden is.
  Een tegel met een kop en een regel doet dat, en blijft één link, dus één Tab-stop, één naam voor een schermlezer en één focusrand.
  `Card` zorgt voor het vlak, de rand en de binnenruimte, zodat een tegel er bij de andere kaarten past en elke verandering daarin vanzelf meegaat.
  Een `ul` zegt aan een schermlezer hoeveel schermen er zijn.
- **Nadeel:** de tekst in een tegel is niet te selecteren, want het `::after` van de link ligt erover.
  Een tegel met een tweede link erin kan niet; dat is de bedoeling, want een tegel is één bestemming.
- **Alternatieven:** de hele tegel in een `a` (de kop, de beschrijving en het pictogram worden samen de naam van de link, die dan lang is en de beschrijving twee keer voorleest bij een lijst van koppen); een kaart met een knop of link eronder (twee Tab-stops voor één plek); een `Card` met `onClick` (werkt niet zonder JavaScript en niet met het toetsenbord); `:has()` om de rand van de tegel te tekenen als de link focus heeft (werkt, maar het `::after` van de link doet hetzelfde zonder een selector van de ouder); een eigen vlak per tegel, zoals `soft` of `warm` (de kleur zegt hier niets).

## De kaart of de cel bepaalt de verticale witruimte tussen wat erin staat

- **Datum:** 2 november 2026
- **Besluit:** een element of onderdeel zet zelf geen verticale witruimte naar buiten (#653).
  De container bepaalt de ruimte tussen zijn directe kinderen: `Card`, `Page.Cell`, `Page.Intro`, `Article`, de inhoud van `Disclosure` en elk element met `hf-flow`.
  Dat is de stroom, in `utilities/flow.css`, in een eigen laag `hf.flow` tussen `hf.components` en `hf.utilities`.
  Elk kind krijgt ruimte onder zich volgens wat het is: groot onder een kop, onder een groot blok en voor een kop of een lijn, gemiddeld onder de rest, en geen onder het laatste kind.
  De grote blokken staan in één lijst in `flow.css`: `table`, `DataTable.Group`, `StandingsTable`, `TopScorersTable` en `RecordTable` met hun legenda, `BarChart`, `DonutChart` los en als groep, `FormChart`, `InputTable` en `Tile.Grid`.
  Een tabel met een legenda is met zijn legenda één blok: tussen de tabel en de legenda staat de gemiddelde ruimte, en onder de legenda de grote.
  De legenda blijft een alinea en wordt geen `caption` onderaan: een tabel heeft één `caption`, en die is de naam van de tabel, die een schermlezer bij elke tabel voorleest; de afkortingen zijn voor een schermlezer al voluit in de kolomkoppen.
  Eén exemplaar krijgt een andere ruimte met de hulpklasse `hf-space-end-0`, `-xs`, `-s`, `-m` of `-l`, in de laag `hf.utilities`, die altijd wint.
  De regels voor het eerste en het laatste kind in `card.css`, `page.css`, `article.css` en `disclosure.css` zijn weg, en de inhoud van `Disclosure` is een gewoon blok, geen raster met `gap`.
- **Waarom:** een onderdeel kent zijn omgeving niet.
  Zette het zelf een marge, dan ontstonden gaten van 0, zoals onder de legenda van de kaart Stand.
  Met één regel in de container komt de ruimte vanzelf goed, en is een uitzondering één klasse.
  De laag maakt de volgorde van de regels vast, los van hoe specifiek een selector is.
  De ruimte staat alleen onder een kind, dus een hulpklasse op het element erboven zet altijd de hele ruimte.
- **Hoe:** `ArticleCard` zet `hf-space-end-xs` op zijn titel en `Article` zet `hf-space-end-l` op de regel met de auteur en de datum, zodat die twee de ruimte houden die ze hadden.
  `utilities/flow-css.test.ts` faalt als een kop, een groot blok uit de lijst, het kind voor een kop of het laatste kind een andere ruimte krijgt, als de tekst van een artikel geen extra grote ruimte voor een kop heeft, of als de hulpklassen niet in de laatste laag staan.
- **Alternatieven:** alleen hulpklassen op elk exemplaar (veel klassen, en een Builder vergeet ze).
  Ruimte boven elk kind, met `* + *` (dan werkt een klasse op het element erboven niet).
  Een flex-kolom met `gap` (één maat voor elke twee buren).
  Een klasse op elk groot blok in plaats van een lijst in `flow.css` (de regels staan dan niet meer op één plek).
  De legenda als `caption` onderaan de tabel, met `caption-side: bottom` (de legenda wordt dan de naam van de tabel).
  De gemiddelde ruimte onder een tabel met een legenda, zoals het issue eerst zei (de projecteigenaar koos op 2 november 2026 voor de tabel en de legenda als één blok).
  De grote ruimte onder de schakelaar boven de stand, zoals `segmented-control.css` zette (die regel is weg; de schakelaar krijgt de gemiddelde ruimte van de stroom).

## Boven een kop in een kaart of cel staat de grote ruimte, alleen in een artikel de extra grote

- **Datum:** 2 november 2026
- **Besluit:** het kind voor een kop of een lijn (`hr`) heeft de grote ruimte onder zich in een kaart of cel, en de extra grote in de tekst van een artikel (#653).
  Extra groot staat verder alleen tussen cellen.
- **Waarom:** de projecteigenaar wil extra groot zo veel mogelijk alleen tussen cellen.
  In een kaart zette een kop extra groot boven zich, zoals tussen "Van de redactie" en de titel van het artikel.
  Een lange tekst heeft wel een duidelijke pauze tussen de delen nodig.
- **Gevolg:** op Over ons, Privacy, Toegankelijkheid en Updates staat tussen tekst en de kop erna nu de grote ruimte in plaats van de extra grote.
- **Alternatieven:** overal extra groot, zoals het was.
  Overal groot, ook in een artikel.

## Alleen de stroom en de hulpklassen zetten een marge; stylelint bewaakt dat

- **Datum:** 2 november 2026
- **Besluit:** stylelint weigert in de CSS van het designsysteem `margin`, `margin-block`, `margin-block-start` en `margin-block-end` met een andere waarde dan `0`, behalve in `flow.css` en `space-end.css` (#653).
  De CSS van de documentatie (`docs/docs.css`) valt erbuiten.
  De ruimte tussen de eigen delen van een onderdeel komt van `gap`.
  Een marge die moet blijven, zoals een negatieve marge voor een focusrand, staat in een commentaar dat de regel voor die ene regel uitzet, met de reden.
  `padding-block` is alleen de binnenruimte van een vlak met een zichtbare rand of achtergrond, of van iets om aan te klikken, en nooit ruimte naar een buur.
  De reviewer kijkt dat na.
- **Waarom:** een regel die een machine controleert, blijft gelden zonder dat iemand eraan denkt.
  stylelint zit al in het project, en `reportNeedlessDisables` meldt een uitzondering die niet meer nodig is.
  Of een marge op de buitenkant van een onderdeel staat of op een deel ervan, kan stylelint niet zien.
  Daarom geldt de regel voor elke marge.
- **Hoe:** de regel is `declaration-property-value-allowed-list` in `stylelint.config.js`, met `null` voor de twee bestanden en voor de documentatie.
- **Alternatieven:** alleen een marge op de buitenkant van een onderdeel weigeren (stylelint ziet niet welk element dat is).
  Een test in Vitest met een lijst van bestanden (meer code voor hetzelfde).
  Ook `padding-block` weigeren (een kaart, een knop en een tabelcel hebben het nodig).

## De omzetting gaat in drie issues: de stroom, dan de elementen, dan de onderdelen

- **Datum:** 2 november 2026
- **Besluit:** #653 maakt de stroom, de hulpklassen, de regel in stylelint en de documentatie.
  Het zet een commentaar met #654 of #655 bij elke marge die er nog staat.
  #654 haalt de marges weg van de elementen en de tekst, en #655 die van de onderdelen en de formulieren.
  Daarna wijst geen commentaar meer naar een issue.
- **Waarom:** de stroom wint van de marges in de onderdelen, dus #653 verandert de site in één keer en alleen waar het moet.
  De pull requests daarna halen marges weg die in een kaart of cel al niets meer doen.
  Zo blijft elke pull request te reviewen.
  Splitsen per pagina past niet: de wijzigingen staan in gedeelde CSS en raken elke pagina tegelijk.
- **Alternatieven:** alles in één pull request (te groot om te reviewen).
  Per groep pagina's, zoals home, wedstrijden en statistieken (de CSS is gedeeld, dus dat kan niet los).

## Elementen en tekst zetten geen verticale witruimte naar buiten

- **Datum:** 2 november 2026
- **Besluit:** de basisstijlen en de tekst zetten geen verticale marge meer naar buiten (#654).
  Het gaat om `p`, `ul`, `ol`, `dl`, `blockquote`, `pre`, `figure`, `hr`, `fieldset`, `table` en de koppen `h1` tot en met `h6`.
  De ruimte tussen twee buren komt van de stroom (zie _De kaart of de cel bepaalt de verticale witruimte tussen wat erin staat_).
  De ruimte tussen de delen van een element komt van `gap`: een citaat en een ruime lijst zijn een raster met `gap` gemiddeld, en een figuur een raster met `gap` klein tussen zijn inhoud en zijn onderschrift.
  Twee marges blijven, elk met een reden bij de regel: het onderschrift (`caption`) van een tabel, omdat een `gap` een onderdeel van de tabel zelf niet bereikt, en de beschrijving (`dd`) van een lijst met beschrijvingen, omdat een `gap` geen ruimte tussen een beschrijving en de volgende term kan zetten zonder er ruimte tussen een term en zijn beschrijving bij te zetten.
  Een onderdeel dat zelf geen stroomcontainer is, krijgt de klasse `hf-flow` of een `gap`: `ErrorSummary` en de tekst in `RichTextEditor` de klasse, en `InputTable` een `gap`.
  Een story zonder container zet zijn voorbeeld in een element met `hf-flow`.
- **Waarom:** een element kent zijn omgeving niet.
  Zette een alinea of een kop zelf een marge, dan hing de ruimte af van wat er toevallig naast stond, en moest de stroom die marge overschrijven.
  Na deze omzetting is de stroom de enige plek, en stylelint bewaakt dat.
- **Niet gedaan:** de marge van `input`, `select` en `textarea` in `base/forms.css` blijft.
  Ze delen één regel, en de ruimte onder een veld hoort bij `Field`, het onderdeel dat #655 omzet.
- **Gevolg:** op de site verandert niets, op één plek na: op de pagina Artikelen van het beheer staat onder de lijst in de kaart 12 pixels minder ruimte, omdat de marge van de laatste alinea in het laatste item niet meer onder de lijst uitsteekt.
  In de stories staat onder het laatste element van een voorbeeld geen ruimte meer.
  Een scheidingslijn in een kaart of een cel heeft de grote ruimte aan weerskanten, zoals de stroom al zei, en niet de extra grote.
  Een figuur met een citaat heeft de kleine ruimte tussen het citaat en het onderschrift, in plaats van de gemiddelde.
- **Alternatieven:** de basiselementen een eigen `margin-block: 0` in elke kaart laten zetten (dan moet elk onderdeel het kennen).
  `hf-flow` op `body` of op elk onderdeel zetten (de stroom hoort bij een container die weet wat er in staat).
  Een `dd` zonder marge, met een wrapper om elke term en beschrijving (de HTML wordt omslachtiger voor een lijst die de site niet gebruikt).
- **Later:** zie _Onderdelen en formulieren zetten geen verticale witruimte naar buiten_ (3 november 2026).
  De marge van `input`, `select` en `textarea` in `base/forms.css` is weg; de ruimte onder een veld komt van het formulier of de groep, en de ruimte boven het veld van de `gap` van `Field`.

## De overgang van de schakelaar heeft een naam per plek

- **Datum:** 2 november 2026
- **Besluit:** de naam van de overgang tussen pagina's hoort bij de plek van de schakelaar, niet bij het onderdeel (#657).
  `SegmentedLinks` krijgt een optionele eigenschap `place`, een woord dat de pagina kiest, zoals `stand` op Wedstrijden of `statistieken` op Statistieken.
  Het component zet daarvan `hf-segmented-thumb-<plek>` voor de knop en `hf-segmented-option-<plek>-<nummer>` voor elke keuze, als custom properties (`--hf-segmented-thumb-name` en `--hf-segmented-option-name`), en `segmented-control.css` leest die in `view-transition-name`.
  Een schakelaar zonder plek heeft geen naam en doet niet mee.
  De site geeft elke schakelaar een eigen plek: `stand` (Wedstrijden), `statistieken`, `spelers`, `tegenstanders`, `tegenstander` (de pagina van een club) en `berichten` (`/beheer/berichten`).
  Dezelfde plek heeft dezelfde naam op elke versie van de pagina, dus een andere keuze, een ander seizoen of een andere competitie laat de knop schuiven.
  Een naam die maar één van de twee pagina's heeft, is niet gekoppeld: `::view-transition-old(*):only-child` verdwijnt meteen en `::view-transition-new(*):only-child` krijgt geen fade, zodat er geen schim van de oude knop of letters blijft.
- **Waarom:** de browser koppelt elementen met dezelfde naam op de oude en de nieuwe pagina.
  Met dezelfde namen op elke schakelaar vloog de knop van "Welke stand" onderaan Wedstrijden naar "Welke wedstrijden" bovenaan Statistieken, met de letters mee.
  Alleen de pagina weet of twee schakelaars dezelfde zijn.
  Het blijft CSS en een `style`, dus nog steeds een servercomponent zonder script, en de HTML verschilt alleen in de `style`.
- **Gevolg:** de HTML van een schakelaar met een plek heeft een custom property meer op de groep en een `style` op elke link.
  De tests van de pagina's en de rooktest lezen die opmaak.
  `segmented-control-css.test.ts` eist dat de namen uit die custom properties komen, en `e2e/segmented-places.spec.ts` dat de namen van de vier pagina's verschillen en bij een andere keuze gelijk blijven.
  Een pagina met twee schakelaars kan nu twee plekken geven; dezelfde plek twee keer op één pagina blijft fout, want een naam kan maar één element hebben.
  Hoogstens vier keuzes per schakelaar hoeft niet meer: een keuze krijgt een naam uit haar nummer, zonder grens.
- **Alternatieven:** de overgang laten beginnen op de nieuwe pagina, met de knop op de oude keuze (de nieuwe pagina kent de oude keuze alleen met een script in `pageswap` en `pagereveal`, dat we in #500 uitsloten, en het laat ook bij een wissel tussen verschillende schakelaars iets schuiven).
  `view-transition-name` alleen op de knop en niet op de letters (de letters liggen dan onder de knop).
  De overgang met een script uitzetten voor schakelaars op een andere plek (meer code, werkt niet zonder script).

## Onderdelen en formulieren zetten geen verticale witruimte naar buiten

- **Datum:** 3 november 2026
- **Besluit:** de onderdelen en de formulieren zetten geen verticale marge meer naar buiten, en de ruimte tussen hun eigen delen komt van `gap` (#655).
  Daarna wijst geen commentaar meer naar een issue.
  De ruimte tussen de delen van een onderdeel is een `gap` van het onderdeel zelf: `Match`, `DiscussionItem`, de tegel (`Tile`), de plek van een tabel met zijn legenda (`.hf-bar-place`), `DonutChart`, de editor en het formulier voor een link daarin, `Field`, `FieldGroup` en `RadioGroup`.
  Een optische correctie van 0,125 rem is een getal, ook als `gap`.
  `Field` zet het label, de hint en de fout in een blok van zichzelf, `hf-field-text`, met `gap` 0,125 rem, en het veld staat daaronder op `gap` klein.
  `RadioGroup` doet hetzelfde met de hint en de fout.
  Een `Form` met velden is een stroomcontainer, behalve een formulier van kaarten, dat een raster is: daar zou een marge bij de `gap` komen.
  Wat dichterbij of verder weg staat dan de stroom zegt, krijgt een hulpklasse: `FormChart` is een `hf-flow` met `hf-space-end-s` op de rij met letters en `hf-space-end-xs` op de toelichting, en een `CheckboxGroup` in een formulier met een knop krijgt `hf-space-end-s`.
  Vier marges blijven, elk met de reden bij de regel: de ruimte onder de `legend` van een fieldset (`FieldGroup`, `RadioGroup` en `CheckboxGroup`), omdat een `gap` de legenda niet bereikt; de marge van de open lijst van `Select`, omdat die lijst een popover buiten de stroom is; de ruimte onder de lijn van de navigatie in de header, omdat een `gap` ook tussen elke andere rij links zou komen; en de ruimte boven de links in de footer van `Page`, omdat een `gap` ook tussen de twee regels tekst zou komen.
  Een lijst met regels die elk een naam boven een `ShortMatch` hebben, is een raster met `gap` gemiddeld, in plaats van een marge boven elke naam.
- **Waarom:** een onderdeel kent zijn omgeving niet.
  Zette het zelf een marge, dan hing de ruimte af van wat er toevallig naast stond, en moest de stroom die marge overschrijven.
  Met de `gap` van het onderdeel is de ruimte tussen zijn delen één plek, en wijst stylelint elke marge af die niet blijft.
- **Gevolg:** op de site verandert niets.
  We maten de plaats en de maat van elk element op 50 pagina's, in licht, op 390 en 900 pixels, voor en na de wijziging, op Wedstrijden, Statistieken, Tegenstanders en de schermen van het beheer.
  De meting vond één verschil, dat de wijziging zelf maakte: in het formulier van een concept in het beheer kreeg de eerste van twee knoppen naast elkaar de ruimte van de stroom.
  De eerste knop heeft nu `hf-space-end-0`, en de meting vindt daarna geen verschil meer.
  `DiscussionItem` houdt de 1 pixel die de titel in een regel tekst lager stond, als `padding-block-start` van het item.
  In de stories zijn er verschillen op een paar plekken, allemaal ruimte die weg is waar niets erboven of eronder staat: een los onderdeel heeft geen ruimte meer boven zich (`BarChart`, `Pagination`, `WikipediaCredit`), een formulier van kaarten heeft geen ruimte meer onder het laatste veld in een kaart, de rijen in de story Maten van knoppen en velden en in de story over gelijke hoogtes hadden de marge van het veld als ruimte tussen de rijen, een formulier met de editor heeft de ruimte van de stroom tussen de editor en de knop, en de `Honeypot` (die niemand ziet) is 4 pixels korter.
- **Alternatieven:** het label, de hint, de fout en het veld in één `gap` van 0,125 rem (het veld staat dan te dicht op het label).
  Een `grid` met `gap` op de fieldset en de legenda erin (de legenda is niet te bereiken met een `gap`).
  Een hulpklasse op elk veld in plaats van een stroom in het formulier (veel klassen, en een Builder vergeet ze).
  Een `Form` die altijd een stroom is (een formulier van kaarten is een raster, en de marges komen dan bij de `gap`).

## Eén balk voor de subpagina's van het hoofdmenu en de schermen van een onderdeel

- **Datum:** 2 november 2026
- **Besluit:** er is één balkcomponent, `NavigationBar`, met twee standen (#651).
  - **In het menu:** zonder `label` is hij een `div` met de subpagina's van een onderdeel, alleen binnen `Navigation`, zoals hij was.
    De HTML is niet veranderd.
  - **Op zichzelf:** met een `label` is hij een `nav` met die naam, een band van rand tot rand tussen het hoofdmenu en de `Page.Body`.
    De plek rechts voor één knop die geen scherm is, zoals Uitloggen (`end`, uit #650), is er alleen in deze stand: het type staat `end` zonder `label` niet toe.
    `SectionBar`, `SectionBarItem`, `SectionBarProps` en `section-bar.css` zijn weg; de site gebruikt `NavigationBar` voor het beheer.
    De items blijven `subitems`, want die naam gebruikt de site al.
  - **De CSS** staat in `navigation.css`: de pillen, de rij en de kleur van de band in één regel voor beide, de marges uit `.hf-navigation-header`, de schaduw, `order` en het `grid-area` bij de balk in het menu, en de padding uit `--hf-page-inset` bij de balk op zichzelf.
    De balk op zichzelf hangt van niets af van `.hf-navigation-header`.
  - **Het einde van de rij:** de balk op zichzelf eindigt vanaf 66rem aan de rand van de kolom, in lijn met het hoofdmenu, en loopt onder 66rem door tot de rand van het scherm; de band zelf blijft van rand tot rand gekleurd.
    Op 20em en smaller loopt de rij om, met de eerste link in lijn met het menu.
- **Waarom:** de stijl van de submenubalk staat dan op één plek, en een wijziging aan de ene balk vergeet de andere niet.
  De balk op zichzelf heeft geen aanpassing aan het hoofdmenu nodig.
  Op een groot scherm staat Uitloggen zo in lijn met het menu erboven, en niet ver van alles aan de rand van het scherm.
- **Gevolg:** de balk van het beheer ziet er anders uit op drie plekken.
  Vanaf 66rem eindigt hij aan de kolom en niet aan de rand van het scherm.
  Onder 66rem loopt de rij door tot de rand van het scherm; die stopte 1rem ervoor, terwijl de balk in het menu wel tot de rand liep.
  Op 20em en smaller staat de eerste link op de plek van het menu; hij stond 8 pixels links daarvan, omdat `SectionBar` de lijst wel terugtrok maar het menu niet.
  Een balk op zichzelf zonder `end` heeft geen lijst die zo breed is als de balk, wat niemand ziet.
- **Alternatieven:** twee componenten die één stijlklasse delen (de dubbele opbouw en de dubbele tests blijven).
  `SectionBar` laten staan en alleen zijn CSS naar die van `NavigationBar` verhuizen (de twee verschillen in HTML en rol blijven op twee plekken staan).
  `Navigation` zelf een losse balk laten tekenen (het menu kent het onderdeel niet en heeft er geen reden voor).
  De rij van het beheer tot de rand van het scherm laten lopen (dan blijft er een extra stand voor de breedte in de ene balk, en een deel van de dubbele stijl).

## Het menu van een keuzelijst met de opmaak van de site blijft binnen het scherm

- **Datum:** 3 november 2026
- **Besluit:** het open menu van een `Select` met `hf-select-styled` blijft binnen het scherm, aan alle kanten en op elke breedte (#668).
  De regels staan in `select.css`, binnen `@supports (appearance: base-select)`; een gewone `Select` houdt de lijst van de browser.
  - **Breedte:** het menu is minstens zo breed als het veld en groeit mee met de langste optie, tot het scherm min een marge van `--hf-space-xs`.
    Een lange optie breekt af op meer regels (`white-space: normal`, `overflow-wrap: anywhere`), en het menu krijgt geen horizontale schuifbalk.
  - **Kant:** het menu groeit naar rechts vanaf de linkerkant van het veld.
    Past dat niet, dan lijnt het uit met de rechterkant van het veld en groeit het naar links.
    Past ook dat niet, dan neemt het de breedte van het scherm.
    Dat is `position-try-fallbacks` met vijf eigen `@position-try`-regels, naast de standaardplaats onder het veld naar rechts: onder het veld naar links en over de breedte van het scherm, en boven het veld naar rechts, naar links en over de breedte van het scherm.
    De breedte is `max-content` en krimpt niet tot de ruimte naast het veld, dus de browser ziet dat het menu daar niet past en gaat door naar de volgende regel.
    Alleen bij de breedte van het scherm geldt `max-inline-size: stretch`.
    De minimumbreedte, zo breed als het veld, komt uit de standaardstijl van de browser.
  - **Hoogte en richting:** het menu opent onder het veld, of boven het veld als daar meer ruimte is (`position-try-order: most-block-size`, zoals de browser al deed).
    Zijn hoogte is de ruimte aan die kant min een marge (`max-block-size: stretch` van de browser), zonder vaste maximumhoogte.
    Alleen het menu scrolt (`overscroll-behavior: contain`).
  - **Toetsenbord:** bij het openen staat de gekozen optie in beeld, en de optie met focus scrolt mee bij de pijltjes, Home, End, Page up, Page down en een letter.
    Dat doet Chromium zelf; de test controleert het.
- **Waarom:** het menu was bij een veld aan de rechterkant van de pagina breder dan het scherm: het groeide vanaf de linkerkant van het veld naar rechts en `inline-size` was zo breed als de langste optie (642 pixels in het verhaal met de lange optie), zonder grens.
  Een vaste maat past niet bij elk scherm, elke zoom en elke tekstgrootte; de ruimte op het scherm doet dat wel.
  Een menu dat nooit smaller is dan het veld, wordt niet verward met een ander veld, en een lange optie blijft leesbaar.
- **Nadeel:** een veld in de onderste helft van het scherm opent omhoog, ook als het menu eronder zou passen, omdat `most-block-size` de grootste ruimte kiest en niet de eerste die past.
  Een kort menu zit dan boven het veld in plaats van eronder.
  Firefox en Safari zijn niet bekeken; zonder `base-select` houden ze de lijst die ze hebben.
- **Alternatieven:** precies zo breed als het veld (een lange optie wordt afgekapt of breekt in smalle regels, en het vinkje vraagt zelf ruimte).
  Een vaste maximumhoogte van ongeveer acht opties (een maat die we moeten onderhouden, en op een laag scherm nog te hoog).
  Alleen scrollen binnen het menu, zonder eis aan zoom (laat de zwaarste situatie ongetest).
  Alle keuzelijsten de opmaak van de site geven (een eigen issue).

## `DataTable` kan de plaats van een rij in een ranglijst tonen

- **Datum:** 4 november 2026
- **Besluit:** een rij van `DataTable` heeft de optionele eigenschap `position`, de plaats in een ranglijst vanaf 1 (#699).
  Heeft een rij een plaats, dan krijgt de tabel een kolom vóór de rijkoppen, met de kop `#` (`plaats` voor een schermlezer, in een `abbr` met de titel "Plaats").
  De cel heeft de klassen `hf-numeric hf-rank`, dus de plaats staat rechts uitgelijnd in de kleur van de markeringen, zoals in `TopScorersTable` en `StandingsTable`.
  - **Niet voor een tabel die sorteert:** de eigenschap werkt alleen in een gewone tabel.
    Een tabel met een sorteerbare kolom (`SortableDataTable`) toont de plaats niet, want na het sorteren klopt de volgorde niet meer met de plaatsen: `TableRows` slaat de cel dan over (`withPosition`).
  - **Geef een plaats aan elke rij of aan geen:** de component controleert het niet.
  - **`semibold` op een kolom** zet de cellen van die kolom in het gewicht van een naam (600), voor het getal waarop de lijst is geordend.
    De kop van de kolom blijft zoals hij is.
  - **P punten per wedstrijd** staat nu in `tableColumns` (`pointsPerMatch`): P heeft daarmee twee woorden, naast G en D.
    Ze staan nooit in dezelfde tabel, want de ene staat in de lijst met alle tegenstanders en de andere in de kaart Gemiddeld resultaat.
    De `#` van de plaats is geen kolom van `tableColumns` en staat niet in een legenda: de plaats is bekend uit de volgorde en de kop zegt "plaats" voor een schermlezer.
- **Waarom:** de top 10 op Tegenstanders heeft links, een gemiddelde en een aantal per club, en de plaats hoort in een eigen kolom met een kop.
  `TopScorersTable` heeft een speler en doelpunten, en `StandingsTable` heeft geen links en geen gemiddelde.
  Een `marker` bij de rijkop is een versiering voor een schermlezer en geen kolom, en 1 en 10 staan er niet recht onder elkaar.
  De site mag geen eigen `table` schrijven: de lint verbiedt HTML-elementen in de site.
- **Nadeel:** de eigenschap werkt niet met `sortable`, en de component zegt dat alleen in de beschrijving.
- **Alternatieven:** een eigen onderdeel voor ranglijsten (veel werk voor één kaart, en `DataTable` heeft alles al); de plaats in de eerste cel van de rij tonen als tekst (de rijkop is dan geen club meer); een `marker` met het getal (geen kolomkop, scheve uitlijning).
- **Later:** zie _In een tabel is vet voor het kerngetal, niet voor onze club of een achternaam_.
  De optie `semibold` is vervangen door `key`: de cellen van die kolom hebben het zwaarste gewicht (700, niet 600), het kerngetal van de tabel.

## Twee donutdiagrammen in een groep staan midden in hun eigen kolom

- **Datum:** 4 november 2026
- **Besluit:** in een `DonutChart.Group` met een klein diagram krijgt elke kolom het deel van de breedte dat de maximale breedte van zijn diagram inneemt, en staat elk diagram met automatische marges midden in zijn kolom (#700).
  - **Eén keer geschreven:** de breedtes van het diagram zonder tekst en van het kleine diagram zijn getallen in rem, `--hf-donut-bare-size` en `--hf-donut-small-size`, op de groep.
    De diagrammen lezen ze voor hun `max-inline-size`, en de eerste kolom leest ze voor zijn deel van de breedte (zonder de ruimte tussen de kolommen); de tweede kolom neemt de rest.
  - **Hetzelfde:** een groep zonder klein diagram (Voor en Tegen op Wedstrijden), de rest van de kaart en de maten van de diagrammen zelf.
- **Waarom:** de tweede kolom had precies de breedte van het kleine diagram, dus het had geen marge en zat tegen de rand van de kaart.
  Kolommen die de breedtes van hun diagram volgen, houden het diagram in het midden van zijn kolom, en een nieuwe maat past zich vanzelf aan.
- **Nadeel:** de verhouding gaat uit van het diagram zonder tekst naast het kleine diagram, zoals op de kaart "Hoe vaak welke uitslag".
  Een diagram met tekst rond de ring (hoogstens 20rem breed) naast een klein diagram krijgt een kolom die bij het diagram zonder tekst past.
- **Alternatieven:** de tweede kolom breder maken met een vaste maat (dan klopt de verhouding alleen bij één breedte van de kaart); het kleine diagram rechts of links uitlijnen (dan staat het nog steeds niet midden in zijn kolom).
- **Later:** zie _De kaart "Hoe vaak welke uitslag" toont de aantallen in de tabelkoppen, de competities in een tabel en de doelpunten in een diagram_ (#697) in `site.md`: de kolom van 7rem voor het kleine diagram is hier vervangen door een kolom die bij zijn breedte past.

## In een tabel is vet voor het kerngetal, niet voor onze club of een achternaam

- **Datum:** 4 november 2026
- **Besluit:** in een tabel is het zwaarste gewicht (het gewicht van nadruk) voor één ding: het kerngetal van de tabel (#704).
  Dat is de kolom waarop de tabel is geordend, of het antwoord dat de tabel geeft.
  De rij met het totaal heeft hetzelfde gewicht, met een dikkere lijn erboven.
  Koppen en rijkoppen zijn halfvet.
  De rij van onze club en de achternaam van een speler zijn dat niet meer vet.
  - **Naam:** de klasse is `hf-key` (eerder `hf-bar-value`, naar de balk) en werkt in elke tabel, ook zonder balken.
    De kolomoptie van `DataTable` en `SortableDataTable` is `key` (eerder `semibold`).
    Per tabel is hoogstens één kolom `key`; twee geven een fout.
  - **Gesorteerd:** in een tabel die de bezoeker kan sorteren, volgt het kerngetal de sortering.
    Voor de eerste klik, en zonder JavaScript, is de kolom met `key` het kerngetal.
    Sorteert de bezoeker op de eerste kolom, met de rijkoppen, dan heeft de tabel geen kerngetal: de rijkoppen zijn al halfvet.
    De sortering is ook zonder vet te zien en te horen, via de sorteerknop en `aria-sort`.
  - **Onze club:** de rij van sc Heerenveen is herkenbaar aan de achtergrond, de kleur, de balk aan het begin en "(onze club)" voor een schermlezer.
    De punten in die rij zijn nog steeds het kerngetal.
  - **Waar:** `StandingsTable`, `RecordTable` (de punten en het totaal) en `TopScorersTable` (de doelpunten) gebruiken `hf-key`.
    `PlayerName` zet de achternaam op het gewicht van een rijkop, en de rijkoppen van `InputTable` zijn halfvet.
    Het onderschrift van een tabel en de letters in de legenda blijven op het gewicht van nadruk.
  - **De test:** `weight-css.test.ts` leest de CSS van de tabellen en faalt als een andere selector dan `hf-key`, de rij met het totaal (`tfoot`), het onderschrift en de legenda het zwaarste gewicht zet, of als iets anders dan een kop een gewicht zet dat niet `inherit` of normaal is.
- **Waarom:** vet betekende vijf dingen en dat leest niet als een regel.
  Met twee vette gewichten naast elkaar valt het verschil nauwelijks op, en een volledig vette rij nam het kerngetal zijn plek af.
  Nu valt het getal op waar een supporter naar kijkt: de punten in de stand, de doelpunten bij de topscorers, de kolom waarop hij zelf sorteerde.
  Onze rij blijft opvallen zonder gewicht, want de achtergrond, de kleur en de balk dragen dat al.
- **Nadeel:** onze rij valt iets minder op in een tabel zonder balk, en een achternaam in een kaart is minder zwaar dan hij was.
- **Alternatieven:** de rij van onze club vet laten (dan valt de kolom met het kerngetal daar niet op).
  De naam `hf-ordered` en de optie `ordered` (past niet bij een kolom die een antwoord geeft in plaats van een volgorde).
  Een vaste vette kolom in een tabel die je kunt sorteren (dan staat vet soms op een kolom waarop de tabel niet is geordend).
  De achternaam op het zwaarste gewicht laten (twee vette gewichten naast elkaar in een rij).
  Eerst alleen de regel opschrijven en de code later (de code is klein en de regel zonder test loopt weer uit elkaar).
- **Later:** vervangt delen van drie besluiten.
  Zie de **Later:**-regels bij _Eén stel regels voor het gewicht van letters, met tokens die een bedoeling uitdrukken_ (28 oktober 2026), _Een spelersnaam is één component, met de voornaam gewoon en de achternaam vet_ (27 oktober 2026) en _De punten staan voor het doelsaldo in de standtabel_ (26 oktober 2026, in `redactie.md`).

## Een rij van de tabel met doelpuntenmakers heeft een of meer spelers

- **Datum:** 4 november 2026
- **Besluit:** een rij van `TopScorersTable` heeft de plaats, de doelpunten en een of meer spelers (`players`), niet meer één speler (#710).
  Bij meer dan één speler staan alle namen in één rijkop (`th scope="row"`), elk als `PlayerName`, gescheiden door een komma en een spatie.
  - **Het afbreken:** elke naam met zijn komma is één blok (`hf-top-scorers-name`, `display: inline-block`), dus de cel breekt tussen namen en niet in een naam: "Van der Meer" blijft heel.
    Is één naam breder dan de cel, dan breekt hij toch in zichzelf, zodat een smalle tabel niet breder wordt.
    Het blok staat bovenaan, zodat de plaats, de doelpunten en de balk op de hoogte van de eerste regel blijven.
  - **Een speler:** een rij met één speler geeft dezelfde HTML als voorheen, zonder blok om de naam.
  - **De doelpunten en de balk:** er is één cel en één balk per rij, en ze gelden per speler.
    Het component zegt dat niet in de cel: de plaats en de komma's maken duidelijk dat de spelers gelijk staan.
  - **De pagina:** de pagina kiest de rijen (zie _Spelers met evenveel doelpunten delen één rij in de korte tabel met doelpuntenmakers_ in `site.md`), en het verhaal heeft een voorbeeld met gedeelde rijen naast dat met één speler per rij.
- **Waarom:** de kaart op de pagina van een club werd te lang door spelers met één of twee doelpunten.
  Dat het component rijen met meer spelers neemt, houdt de samenvoeging op één plek: de pagina Spelers geeft rijen met één speler en heeft geen tweede tabel nodig.
- **Alternatieven:** een tweede component voor de korte vorm (twee tabellen met dezelfde kolommen en dezelfde balk); de speler als lijst in de cel (een lijst in een rijkop leest een schermlezer als losse items, en dit is één regel tekst); de namen laten breken waar ze willen (een naam valt uit elkaar).
- **Later:** zie _Spelers met evenveel doelpunten delen één rij in de korte tabel met doelpuntenmakers_ in `site.md` (4 november 2026): de korte vormen geven het component rijen met meer dan één speler.
- **Later:** zie _Een spelersnaam mag afbreken op een spatie, ook in een tabel_ (5 november 2026): het blok om elke naam (`hf-top-scorers-name`) en de regel "Van der Meer" blijft heel zijn weg.
- **Later:** zie _`TopScorersTable` heeft de kolom D/W, en `tableColumns` heeft één afkorting van twee letters_ (7 november 2026): met `showGoalsPerMatch` heeft elke speler een eigen rij, ook als een rij er meer had.

## `FormTimeline` zet uitslagen op een as van jaren, met `BarChart` en eigen labels

- **Datum:** 4 november 2026
- **Besluit:** er komt een onderdeel `FormTimeline` (map `form-timeline/`, naast `form-chart/`), geen variant van `FormChart` (#718).
  Het zet `BarChart`, `BarChart.Trend` en de sleutel samen, en weet niets van wedstrijden of seizoenen: het krijgt per plek een uitslag of niets (`results`), het jaar van de eerste plek (`firstYear`), hoeveel plekken bij één jaar horen (`placesPerYear`, standaard 2), het hoogste aantal uitslagen waarover de lijn middelt (`window`, standaard 4; elke uitslag heeft een punt, via `runningAverage` naast `movingAverage`) en de teksten (`title` en `scope`).
  - **`BarChart`** zet labels onder de plekken die de pagina kiest met `axis.labels`, een lijst van een plek en een tekst, in plaats van de vaste telling van `axisLabels`.
    Zonder die prop verandert niets aan de bestaande grafieken (zie _`BarChart` is standaard 4 rem hoog, en de lijn begint bij de eerste wedstrijd_ voor de hoogte).
  - **De labels:** `FormTimeline` zet een label onder het eerste jaar en daarna onder elk `labelEvery`-de jaar (standaard 5), in het midden onder de plekken van dat jaar, als de laatste twee cijfers ("90", "95", "00"; met 5 vanaf 2010: "10", "15", "20").
  - **De sleutel** (W winst (3 punten), G gelijk (1), V verlies (0)) staat in `FormKey`, een deel dat `FormChart` en `FormTimeline` delen en dat de woorden uit `tableColumns` haalt.
    Het wordt niet los geëxporteerd en neemt een tekst mee in dezelfde alinea (`children`).
  - **Geen zin over de lijn:** de lijn is een hulp voor het oog, en de tekst na de sleutel (`scope`, in dezelfde alinea) zegt wat meetelt, zoals de competitie; het onderdeel noemt het laatste punt niet.
    De zin over de lijn van `FormChart` blijft, want daar is de lijn het kerngetal van de kaart.
- **Waarom:** de rij "Vorm", het aantal wedstrijden van het seizoen en het venster van 5 van `FormChart` passen niet bij een as van jaren; een variant met drie uitzonderingen zou een tweede onderdeel in één zijn.
  De delen die wel gelijk zijn (de staafjes, de lijn, de sleutel en de woorden) worden hergebruikt, niet gekopieerd.
- **Alternatieven:** een prop op `FormChart` voor de tijdas (de helft van de props geldt dan alleen voor één van de twee); een eigen grafiek zonder `BarChart` (dubbele code voor de staafjes en de lijn).

## De knop van de schakelaar schuift in de langste duur, en de letters gaan mee

- **Datum:** 4 november 2026
- **Besluit:** de knop van `SegmentedControl` en `SegmentedLinks` schuift in `--hf-motion-duration-medium` (0,4 seconde) in plaats van `-short` (0,2 seconde), en de letters van de gekozen keuze gaan in dezelfde duur over van gewone naar dikke letters (`font-weight`).
  De kleur van de tekst houdt de korte duur, zodat het aanwijzen met de muis niet achterloopt.
  Dezelfde duur geldt voor de overgang tussen pagina's zonder JavaScript.
  Bij minder beweging zijn de duren 0 s, dus de knop en de letters springen.
- **Waarom:** met JavaScript wisselt de schakelaar nu meteen (zie _De schakelaars wisselen met JavaScript in de pagina, en de links blijven de terugval_ in `site.md`), en bij 0,2 seconde was het schuiven nauwelijks te zien.
  De projecteigenaar koos 0,4 seconde na het uitproberen.
  De letters die meegaan, maken de wissel rustiger: het dikker worden springt niet meer.
- **Let op:** een overgang van het lettergewicht is een uitzondering op "wat nooit beweegt".
  Het kan hier omdat het lettertype variabel is (Atkinson Hyperlegible Next, 200 tot 800) en omdat een onzichtbaar exemplaar in dik de baan even breed houdt: de baan en de keuzes verschuiven niet, alleen de letters binnen hun keuze.
  Een lettertype dat niet variabel is, springt tussen de twee gewichten.
- **Alternatieven:** de duur laten staan (de knop schuift te snel om te zien); een eigen duur tussen 0,2 en 0,4 seconde (een token erbij voor één onderdeel); alleen de knop langzamer en de letters meteen (de letters springen terwijl de knop nog onderweg is).
- **Later:** vult _Beweging heeft vaste duren en curves, en valt bij minder beweging op één plek weg_ aan: de knop van de schakelaar is de tweede die de langste duur krijgt, en het lettergewicht van de gekozen keuze is een tweede uitzondering op "alleen kleur, doorzichtigheid en transformatie bewegen".

## `BarChart` is standaard 4 rem hoog, en de lijn begint bij de eerste wedstrijd

- **Datum:** 4 november 2026
- **Besluit:** `BarChart` is overal 4 rem hoog, ook als de grafiek ruimte heeft; dat was 4,5 rem, en 6 rem met ruimte (#718).
  De cijfers aan de zijkant en de bredere ruimte om de staafjes blijven bij een brede grafiek.
  De lijn van `FormChart` begint bij de eerste wedstrijd en middelt over de wedstrijden die er zijn, hoogstens 5, met `runningAverage`, zoals `FormTimeline`.
  De zin onder de grafiek noemt hoeveel wedstrijden het gemiddelde telt ("in de laatste 3 wedstrijden"), en "De lijn begint bij de eerste wedstrijd." staat er alleen zolang er niets is gespeeld.
- **Waarom:** de projecteigenaar wil dat de grafieken van het seizoen en van de club even hoog zijn en dat elke gespeelde wedstrijd een punt op de lijn heeft.
  Een prop voor de hoogte (`size="small"`, die in dit werk even bestond) is er dan niet meer nodig.
- **Voorlopig:** de projecteigenaar noemde dit "voor nu"; een andere hoogte voor een brede grafiek komt terug als er een reden is.
- **Nadeel:** de eerste punten van de lijn middelen over weinig wedstrijden en springen meer.
- **Alternatieven:** de hoogte als prop (`size`) naast een standaard van 6 rem; de lijn laten wachten op vijf wedstrijden (de vorm die er was, met "De lijn begint na 5 wedstrijden.").
- **Later:** vervangt "van wedstrijd 5 af" in _De lijn is het gemiddelde over de laatste 5 wedstrijden, als vloeiende kromme_ (27 oktober 2026).

## `Tooltip` is een eigen onderdeel dat de ouder aanstuurt, en `BarChart.Trend` geeft het `labels`

- **Datum:** 5 november 2026
- **Besluit:** er komt een onderdeel `Tooltip` (map `tooltip/`) dat een korte tekst toont op een plek in zijn ouder (#726).
  De plek is een afstand van links en van onderen, als deel van de ouder (0 tot 100), en de ouder bepaalt de grootte en wanneer de tooltip er is.
  Hij staat boven de plek, of eronder als er boven geen ruimte is, en blijft binnen de randen van de ouder; hij heeft geen pijl.
  De ouder kan zeggen dat er boven hem ruimte is (`overhang`, in pixels), en de tooltip mag daar overheen steken.
  Bij een andere plek schuift hij naar de nieuwe plek, met de korte duur van de bewegingstokens (dus meteen bij verminderde beweging).
  Hij reageert zelf niet op de aanwijzer (`pointer-events: none`), is `aria-hidden`, krijgt geen focus en meldt Escape via `onClose`.
  `placeTooltip` in `tooltip/placement.ts` rekent de plek uit en `Tooltip` meet de ouder en de tooltip in een `useLayoutEffect`.
  - **`BarChart.Trend` krijgt `labels`:** per plek de tekst van de tooltip, of `null` voor een plek zonder punt, even lang als `values`.
    Zonder `labels` is er geen tooltip en verandert er niets aan de lijn.
    De tekst komt klaar van de pagina: `FormChart` maakt de labels met `formatAverage` ("1,8"), want `BarChart` weet niets van voetbal en een functie als eigenschap kan niet tussen servercomponenten.
    De tooltip toont alleen de waarde, zonder eenheid en speelronde; die staan onder de grafiek en in de tabel.
  - **De aanwijzer zit in een eigen deel:** `TrendPointer` (`bar-chart/TrendPointer.tsx`) is de enige client-component van de grafiek en komt alleen in de pagina als er `labels` zijn.
    `nearestPoint` (`bar-chart/pointer.ts`) zoekt de plek met een punt die het dichtst bij de aanwijzer ligt, en slaat plekken zonder punt over.
    Op dat punt staat een stip, die dezelfde klasse heeft als de stip aan het eind van de lijn.
  - **De kleuren zijn die van de tekst, omgekeerd:** een vlak in `--hf-colour-text-default` met de tekst in `--hf-colour-background-surface`, zonder rand, in gewicht 500 (`--hf-tooltip-font-weight`).
    Een test (`tooltip-css.test.ts`) toetst de tekst op 4,5:1 en het vlak op 3:1 op elk vlak van de pagina, in licht en donker.
  - **De tooltip mag in de witruimte boven de grafiek:** `TrendPointer` geeft `overhang` 16 pixels mee.
    Zoveel witruimte zit er minstens boven de grafiek (de ruimte tussen de onderdelen van de kaart), en niets knipt de tooltip af, want de grafiek heeft geen `overflow`-regel.
    Er komt dus geen extra opvulling bij, en een punt vlak onder de bovenrand krijgt toch een tooltip erboven.
    Staat er boven de grafiek een eigen onderdeel dat dichter bij zit, dan hoort `overhang` kleiner.
- **Waarom:** de lijn toont een gemiddelde, maar de bezoeker kon de waarde op een punt nergens aflezen.
  Een eigen onderdeel is ook bruikbaar voor `DonutChart` of een andere grafiek, en houdt `BarChart.Trend` eenvoudig.
- **Later (5 november 2026, op verzoek van de projecteigenaar):** de tooltip had een licht vlak met een rand en sprong naar de nieuwe plek; nu is hij omgekeerd, vet (500) en schuift hij, en mag hij boven de grafiek in de witruimte.
- **Alternatieven:** de tooltip in `BarChart.Trend` zelf bouwen (niet te hergebruiken); een tooltip die om elk element heen past en bij hover en focus verschijnt (veel meer werk: focus, `aria-describedby` en een positie die live wordt berekend, en de grafiek heeft dat niet nodig); een functie die de tekst maakt (kan niet tussen servercomponenten); de speelronde of de uitslag ook in de tooltip (dubbel met wat eronder staat).
- **Later:** vult _Staafjes en lijn zijn algemene onderdelen, de grafiek van het seizoen zet ze samen_ (27 oktober 2026) aan: `BarChart.Trend` heeft nu een deel dat JavaScript nodig heeft, maar alleen met `labels`.

## De tooltip is voor de aanwijzer en aanraking, de grafiek blijft verborgen voor een schermlezer

- **Datum:** 5 november 2026
- **Besluit:** de grafiek blijft `aria-hidden` en krijgt geen bediening met het toetsenbord en geen plek in de volgorde van Tab (#726).
  De tooltip is een extra voor wie een muis, een pen of een scherm met aanraking heeft; zonder JavaScript is er geen tooltip.
  De pagina geeft dezelfde getallen als tekst (bij `FormChart`: een tabel in een `Disclosure`, met `averagesOf` en `formatAverage` uit het designsysteem, zodat de tabel en de tooltip met dezelfde getallen rekenen).
  - **Muis en pen:** de tooltip springt naar het dichtstbijzijnde punt zolang de aanwijzer boven de grafiek is, en gaat weg als de aanwijzer de grafiek verlaat en bij Escape.
  - **Aanraking:** een tik toont de tooltip, zijwaarts slepen verplaatst hem en een veeg omhoog of omlaag scrolt de pagina nog (`touch-action: pan-y` op de laag van de aanwijzer).
    Neerleggen van de vinger toont nog niets, want het kan het begin van een scroll zijn; de tooltip komt bij het loslaten of bij slepen.
    Hij blijft staan als de vinger loslaat, en gaat weg bij een tik buiten de grafiek of bij Escape.
- **Waarom:** een eigen bediening met pijltjes, een live-regio en een grafiek die niet meer verborgen is, is veel om te bouwen en te testen, en een tabel helpt iedereen, ook wie niet kan wijzen.
  Op een telefoon is er geen hover, en een tooltip die bij het loslaten weggaat, is verdwenen op het moment dat je de vinger wegneemt om te lezen.
- **Alternatieven:** een grafiek met bediening met het toetsenbord (veel meer werk, meer kans op fouten); alleen de tooltip zonder tekst (de waarde per speelronde is dan nergens als tekst te lezen); de tooltip alleen tonen zolang de vinger op het scherm ligt; geen ondersteuning voor aanraking (dan krijgt een telefoon alleen de tabel).
- **Nog niet:** een tooltip bij een knop of pictogram die op hover en focus verschijnt, en een tooltip bij de staafjes; daar komt een eigen issue voor als het nodig is.

## Een spelersnaam mag afbreken op een spatie, ook in een tabel

- **Datum:** 5 november 2026
- **Besluit:** een spelersnaam breekt af op een spatie op elke plek waar de site hem toont, ook in de rijkop van `TopScorersTable` met meer dan één speler (#728).
  Een woord dat langer is dan de regel breekt overal (`overflow-wrap: anywhere` van `PlayerName`).
  - **Wat weg is:** het blok om elke naam met zijn komma (`hf-top-scorers-name`, `display: inline-block`) en het bestand `top-scorers-table.css`.
    De komma staat direct achter de naam, dus ze blijft bij de laatste regel van die naam.
  - **Wat blijft:** de uitslagen en getallen op één regel (`white-space: nowrap` op `td.hf-numeric` in een tabel die sorteert), en de spatie die niet afbreekt tussen de minuut en de naam in de regel met doelpuntenmakers van `Match`: een minuut hoort niet alleen aan het eind van een regel te staan.
- **Waarom:** de projecteigenaar vindt het te streng en het werkt op een telefoon niet goed: een lange naam laat de rij hoger worden of de kolom breder.
  Een naam die mag afbreken, laat de kolom met namen krimpen in plaats van de tabel te verbreden.
- **Nadeel:** een naam kan over twee regels staan, zodat "Van der" en "Meer" uit elkaar staan.
- **Alternatieven:** het blok laten staan (de rij blijft rustig, maar de naam bepaalt de breedte van de kolom); een spatie die niet afbreekt in de naam zelf (dezelfde streng als het blok, maar dan in elke tabel en lijst).
- **Later:** vervangt de regel "Het afbreken" in _Een rij van de tabel met doelpuntenmakers heeft een of meer spelers_ (4 november 2026).

## Een vinkje en een keuzerondje zijn 24 pixels groot

- **Datum:** 5 november 2026
- **Besluit:** het vinkje (`checkbox`) en het keuzerondje (`radio`) zijn 1,5 rem groot, 24 pixels, in plaats van 1,25 rem (#618).
  Een controle in de browser (`apps/site/e2e/admin-phone.spec.ts`) loopt de schermen van het beheer op 390 pixels af en meldt elk doel dat kleiner is dan 24 bij 24 pixels.
- **Waarom:** het vinkje van het filter op de pagina Berichten was 20 bij 20 pixels en haalde 2.5.8 niet.
  Het label eromheen is ook aan te raken, maar het vinkje zelf hoort het minimum te halen.
- **Nadeel:** het vinkje is iets groter dan de tekst ernaast.
- **Alternatieven:** alleen het beheer groter maken (twee maten om gelijk te houden); het label als doel laten gelden (het vinkje blijft te klein voor wie het zelf raakt).

## De uitleg van de lijn staat in de regel van de sleutel, en `FormTimeline` krijgt ook een tooltip

- **Datum:** 5 november 2026
- **Besluit:** de zin onder de grafiek van `FormChart` is korter en staat direct achter de sleutel, in dezelfde alinea: "**Lijn** gemiddeld aantal punten over 5 wedstrijden: nu 2,4." (#726).
  Zolang er niets gespeeld is, staat er "**Lijn** begint bij de eerste wedstrijd."
  Het getal is het aantal wedstrijden dat het gemiddelde telt: "over 1 wedstrijd", "over 3 wedstrijden", "over 5 wedstrijden".
  `FormTimeline` geeft zijn lijn ook `labels`, met `formatAverage` op het gemiddelde van elke plek, dus dezelfde tooltip als `FormChart`.
- **Waarom:** de projecteigenaar wil dat de sleutel en de uitleg van de lijn bij elkaar staan, en korter.
  Een tooltip hoort bij elke lijn die een gemiddelde toont, en de kaart "Resultaten sinds" heeft ook zo'n lijn.
- **Nadeel:** de kaart "Resultaten sinds" heeft geen tabel met de gemiddelden; de tooltip is daar alleen voor wie een muis, pen of aanraking gebruikt.
  De wedstrijden zelf staan wel in de lijst onder Wedstrijden.
- **Later:** vervangt "De zin onder de grafiek noemt hoeveel wedstrijden het gemiddelde telt" in _BarChart is overal 4 rem hoog_ (4 november 2026) en "alleen de kaart Verloop van het seizoen gebruikt hem" in de beslissing over de tooltip van #726 (5 november 2026): `FormTimeline` gebruikt hem nu ook.

## Lijnen in een kaart volgen de kaart via lokale eigenschappen

- **Datum:** 6 november 2026
- **Besluit:** elk vlak van `Card` zet `--hf-card-line` (de randkleur van het vlak), `--hf-card-line-strong` (een stap donkerder) en `--hf-card-line-graphic` (3:1 voor assen en pijlen), elk uit een kleurtoken met een waarde voor licht en donker.
  Onderdelen gebruiken ze als `var(--hf-card-line, <de huidige kleur>)`, dus buiten een kaart verandert er niets.
  Het transparante vlak zet ze niet.
  - **Volgen `--hf-card-line`:** de scheiding tussen rijen en de `hr` (`base/table.css`, `base/elements.css`), `record-table`, `input-table`, `news-item`, `discussion-item`, `match`, `short-match`, de hulplijnen en de ring zonder waarden van `bar-chart` en `donut-chart`.
  - **Volgen `--hf-card-line-strong`:** `Disclosure`, `Notice`, het formulier voor een link in de editor en `fieldset`.
  - **Volgen `--hf-card-line-graphic`:** de grond van `bar-chart`, de geleider van `donut-chart`, de pijlen van `breadcrumb` en de balk van een `blockquote`.
  - **Blijven vast:** de randen van invoervelden, selects en tekstvakken (`--hf-colour-border-input`), de focusrand, de randen van de zachte knop en van een Tag met nadruk, de foutmeldingen, de balk van de huidige rij in `standings-table`, `pre` en `code`, de gegevens van grafieken (balken, lijn, schijven en hun omlijning), onderstrepingen en opsommingstekens.
  - **Kleur:** de reeks zand krijgt de stappen 400 en 500 (even licht als grijs 400 en 500).
    Rollen: `line-darker-surface[-strong|-soft|-warm]` en `line-graphic-surface[-strong|-soft|-warm]`.
    De grafische lijn haalt 3:1 tegen zijn vlak: wit 4,19 (licht) en 6,21 (donker), sterk 3,46 en 4,89, zacht 3,85 en 6,21, warm 3,47 en 4,89.
- **Waarom:** de lijnen in een warme kaart waren blauw of bijna onzichtbaar (rijscheidingen 1,09:1).
  Een eigenschap op het vlak houdt het binnen de kaart: een onderdeel buiten een kaart verandert niet, en een nieuw vlak hoeft alleen drie eigenschappen te zetten.
- **Alternatieven:** `--hf-colour-border-default` per vlak herdefiniëren (niet ingekapseld, en raakt ook onderdelen buiten kaarten); één waarde voor alle lijnen (rijscheidingen en omlijstingen willen niet dezelfde kracht); de lijnen van velden ook laten volgen (die moeten 3:1 halen en zijn geen versiering).

## Grafiekassen volgen een eigen waarde van 3:1

- **Datum:** 6 november 2026
- **Besluit:** assen, de grond en pijlen volgen `--hf-card-line-graphic`; de gegevens van de grafiek blijven vast.
- **Waarom:** een as betekent iets en moet 3:1 halen (1.4.11), en de grafieken van het seizoen staan op warme kaarten.
- **Alternatief:** de assen blauw laten (blauw in zand, wat de projecteigenaar niet mooi vindt).

## Het rugnummer en een regel achter de naam zijn opties van PlayerName, en ShortPlayer vervalt

- **Datum:** 7 november 2026
- **Besluit:** `PlayerName` krijgt de optionele eigenschap `shirtNumber` en een regel achter de naam, die als `children` meekomt (#812).
  `ShortPlayer` vervalt: het onderdeel, zijn CSS, zijn story en zijn tests.
  - **Rugnummer:** weggelaten is geen rugnummer en geen kolom; `null` is een lege kolom, zodat de namen van een lijst op dezelfde plek beginnen; een getal staat in de kolom voor de naam.
    Een lange naam loopt door onder de naam, niet onder het nummer.
    Het nummer en de naam zijn voor een schermlezer één regel tekst, met een gewone spatie ertussen en zonder verborgen tekst.
    Zonder `shirtNumber` en zonder regel is de opmaak precies die van voorheen.
  - **De regel:** kleine, rustige letters op een eigen regel, in het gewone gewicht.
    Voor een schermlezer komt hij als eigen tekst na de naam, en de naam blijft één naam.
  - **`children` en niet een eigen eigenschap:** de projecteigenaar stelde `children` voor.
    Een naam met een regel erachter leest zo als een naam met een toelichting, zoals een `Card` of een `List.Item` zijn inhoud krijgt, en het component houdt één eigenschap minder.
    Het nadeel is dat `children` nu niet de naam vervangt; de documentatie en de prop-beschrijving zeggen dat het de regel erachter is.
    Een eigen `meta` zou duidelijker heten maar voegt niets toe, want niets anders kan hier `children` zijn.
  - **De lijst met lijntjes:** de kaart Selectie zet `PlayerName` in een `ShortFact`, dat de dunne lijnen en de ruimte tussen de regels al tekent, zodat de kaart er hetzelfde uitziet.
- **Waarom:** `ShortPlayer` had één gebruiker en was `PlayerName` met een kolom ervoor.
  Eén onderdeel voor de naam van een speler houdt het simpel, en een regel achter de naam kan er zo bij, voor de hoofdtrainers nu en voor het aantal seizoenen later (#811).
- **Alternatieven:** `ShortPlayer` laten staan als omhulsel om `PlayerName` (twee onderdelen die bijna hetzelfde doen).
  Een eigenschap `meta` voor de regel (zie boven).
- **Later:** dit vervangt het onderdeel `ShortPlayer`, dat in _Op Spelers is de selectie de inhoud van de pagina, en de doelpuntenmakers staan in de zijkolom_ (`site.md`) de regel van de kaart Selectie was.

## `TopScorersTable` heeft de kolom D/W, en `tableColumns` heeft één afkorting van twee letters

- **Datum:** 7 november 2026
- **Besluit:** `TopScorersTable` krijgt de optie `showGoalsPerMatch` en een tekst `goalsPerMatch` bij elke speler (#819), en `tableColumns` krijgt `goalsPerMatch`, met de afkorting D/W en het woord "doelpunten per wedstrijd".
  - **De kolom:** na de doelpunten, met D/W voor het oog en "doelpunten per wedstrijd" voor een schermlezer, en de waarde als tekst in de cel.
    De staaf blijft een aandeel van de topscorer.
  - **Een rij per speler:** met de optie splitst het component een rij waar spelers delen, en de spelers houden hun plaats en hun doelpunten.
    Zonder de optie blijft de tabel precies zoals hij was, met gedeelde rijen en de kolommen #, Speler en D.
  - **De regel onder de tabel:** met de optie staat er "D doelpunten, D/W doelpunten per wedstrijd" (`tableLegend`) en een zin die zegt wat D/W is: de doelpunten gedeeld door de wedstrijden die de speler speelde, ook als invaller, volgens de selectie op Wikipedia.
    Zonder de optie is er geen zin.
  - **De pagina kiest:** het component rekent D/W niet uit en weet niet wanneer het mag (zie _De doelpuntenmakers op Spelers tonen D/W waar de wedstrijden van elke speler bekend zijn_ in `site.md`).
  - **Uitzondering op één letter:** D/W is twee letters en een schuine streep.
    De test van `tableColumns` laat D/W toe en laat de regel voor G, D en P staan.
- **Waarom:** de projecteigenaar noemt de kolom D/W, en "D" zou niet zeggen wat het is, want D is al doelpunten.
  Twee spelers kunnen niet één D/W delen, dus de kolom vraagt een rij per speler.
- **Alternatieven:** een andere letter voor de kolom (de projecteigenaar koos D/W).
  Een regel achter de naam, zoals bij de hoofdtrainers (#812), die de gedeelde rijen laat staan.
- **Later:** dit vult _Alle tabellen gebruiken één stel afkortingen voor hun kolommen_ (2 november 2026) aan met één afkorting van twee letters, en vervangt voor tabellen met de kolom het deel van _Een rij van de tabel met doelpuntenmakers heeft een of meer spelers_ (4 november 2026) dat rijen met meer dan één speler toestaat.

## De lettertypes zijn kleiner gemaakt en laden zonder verspringen

- **Datum:** 7 november 2026
- **Besluit:** Truculenta is een eigen, kleinere woff2 (latin en latin-ext) met de assen beperkt tot wat de CSS gebruikt, en de twee lettertypes boven de vouw worden vooraf geladen met terugvallettertypes die de maat van het echte lettertype hebben (#800).
  - **De assen:** gewicht 700–900 (koppen 800, labels 700, woordmerk 900) en breedte 115–125 (koppen 125 en 115, labels en woordmerk 125), gevonden met een zoekopdracht naar `font-weight` en `font-stretch` bij `--hf-font-family-display` in `typography.css` en de CSS van `heading`, `logo` en `page/shortcuts`.
    De optische maat staat vast op 24 (px), want de koppen zijn 16 tot 36 pixels groot en 24 zit in het midden: de koppen en het woordmerk zijn het grootst en vallen het meest op.
    Het bestand voor latin is 66,5 KiB, van 185 KiB (64% kleiner); latin-ext is 57,3 KiB, van 153,8 KiB.
  - **De opdracht:** Python met `fonttools` 4.60.2 en `brotli` 1.1.0, in een omgeving buiten de repository, dus geen dependency van de repository:

    ```sh
    python3 -m venv /tmp/fonts && /tmp/fonts/bin/pip install fonttools==4.60.2 brotli==1.1.0
    /tmp/fonts/bin/python - <<'PY'
    from fontTools.ttLib import TTFont
    from fontTools.varLib import instancer
    files = 'node_modules/.pnpm/@fontsource-variable+truculenta@5.3.0/node_modules/@fontsource-variable/truculenta/files'
    for subset in ('latin', 'latin-ext'):
        font = TTFont(f'{files}/truculenta-{subset}-standard-normal.woff2')
        font = instancer.instantiateVariableFont(font, {'wght': (700, 900), 'wdth': (115, 125), 'opsz': 24})
        font.flavor = 'woff2'
        font.save(f'packages/design-system/src/fonts/truculenta-{subset}.woff2')
    PY
    ```

    Het bronbestand is dat van `@fontsource-variable/truculenta` 5.3.0, en een volgende versie van het package geeft met dezelfde opdracht dezelfde uitkomst.
    Wijzigt een token of een component een gewicht of een breedte buiten die bereiken, dan loopt de opdracht opnieuw met andere bereiken, en `fonts.css` krijgt dezelfde.

  - **De licentie:** `fonts/OFL.txt` staat bij de bestanden.
    De copyrightregel van het lettertype ("Copyright 2020 The Truculenta Project Authors") noemt geen Reserved Font Name, dus de aangepaste versie mag zijn naam houden.
  - **De terugvallettertypes:** `Truculenta Fallback` en `Atkinson Fallback` in `fonts.css`, op Arial (Arial Bold, Liberation Sans) met `size-adjust` en overrides voor ascent, descent en lijnruimte.
    De waarden komen uit de breedte van hoofdletters in Truculenta (gewicht 800) tegen Arial Bold, en van lopende tekst in Atkinson tegen Arial: Truculenta is 75,2% (breedte 115) en 81,8% (breedte 125) van Arial Bold, Atkinson 98,9% (Arial) en 99,3% (Arial Bold).
    Elke override is de maat van het lettertype gedeeld door de `size-adjust`.
  - **Vooraf laden:** de site laadt Truculenta en Atkinson (latin, niet cursief) vooraf met `preload` van React in `layout.tsx`, met de adressen uit `preloadedFonts` in `@fansite/design-system/fonts`.
    Next.js zet ze als `Link`-header op het antwoord.
    Het adres is het gehashte adres van de bundelaar, hetzelfde als in `fonts.css`, dus het is één verzoek.
  - **Atkinson cursief:** de site gebruikt hem (`Emphasis` en cursief in artikelen), dus hij blijft.
    De browser haalt hem alleen op in een pagina met cursieve tekst, dus op de gemeten pagina's laadt hij niet.
  - **Het verschil in beeld:** door de vaste optische maat zijn de letters een fractie anders.
    De tekst is 0,5% of minder breder of smaller, ten hoogste 1,7 pixel: het woordmerk +1,7 pixel, een kop 1 +1,2 pixel, de andere koppen en labels -0,4 tot +0,1 pixel.
- **Waarom:** de lettertypes waren 218 van de 415 KiB op de homepage, en Truculenta alleen 185 KiB omdat het bestand drie assen heeft, terwijl de tokens twee breedtes en drie gewichten gebruiken.
  Het wisselen van lettertype gaf een layoutverschuiving (CLS 0,036 op de homepage op mobiel).
  Fontsource heeft geen bestand met precies de assen die we gebruiken (alleen gewicht: 58 KiB, optische maat: 69 KiB, breedte: 144 KiB), dus we maken zelf een kleinere versie.
- **Meting** (Lighthouse 13.6.0, mediaan van drie runs, lokale build met dezelfde gegevens, `devtools`-vertraging; `docs/prestaties.md` heeft de nulmeting van acceptatie): lettertypes op de homepage 219,5 KiB na 100,8 KiB, de pagina 424,6 KiB na 305,1 KiB, de CLS van de homepage op mobiel 0,036 na 0,000.
  De CLS van Spelers op mobiel is 0,061 (was 0,071): de verschuiving blijft bij de kolommen met kaarten (`div.hf-page-cells`), en dit besluit lost die niet op.
- **Nadeel:** een vaste optische maat verandert de letters een fractie, en de assen die niemand gebruikt zijn weg: een nieuw gewicht of een nieuwe breedte vraagt een nieuw bestand.
- **Alternatieven:** alleen vooraf laden en terugvalmaten (de CLS lost op, het gewicht niet); het breedte-bestand van Fontsource (144 KiB, de optische maat is weg, kleine letters zien er anders uit); een lichtere Truculenta zonder breedte (de koppen verliezen hun vorm).
- **Later:** dit vervangt voor Truculenta het besluit van 20 oktober 2026 dat de lettertypes uit Fontsource komen.

## Een gebeurtenis in een wedstrijd heeft een vorm én een woord, nooit alleen een kleur

- **Datum:** 7 november 2026
- **Besluit:** `MatchEventIcon` (#842) heeft voor elke soort gebeurtenis een eigen vorm: doelpunt, eigen doelpunt, gele, rode en geel-rode kaart, wissel, erin, eruit en een gemiste of gestopte strafschop.
  Wie geen kleuren ziet, kan ze toch uit elkaar houden.
  Het woord zelf, zoals "Gele kaart", schrijft de pagina die het pictogram gebruikt: het pictogram is standaard verborgen voor schermlezers, en met een `label` krijgt het een naam, voor de plek waar geen tekst naast staat.
  - **De vormen:** het doelpunt is een voetbal in twee kleuren (de kleur van een kop met vlakken in de kleur van het vlak; bij een eigen doelpunt de kleur van een verlies).
    Een kaart is een afgeronde rechthoek in de kaartkleur met een rand in de tekstkleur.
    De geel-rode kaart is een gele en een rode die half over elkaar liggen.
    De wissel is één pictogram met twee pijlen (omhoog groen, omlaag rood), en erin en eruit zijn die pijlen apart.
    De gemiste strafschop is een ring met een kruis.
  - **De draaiing:** alle pictogrammen staan 12 graden met de klok mee gedraaid, zoals in het ontwerp.
  - **De maten:** een maat bij gewone tekst en een grotere voor de strafschoppenserie (#848).
    Ze volgen de tekst, want de maat is in `em`.
  - **De contrasten:** de rand in de tekstkleur geeft de vorm 3:1 tegen elk vlak in licht en in donker; de gele vulling alleen haalt dat niet (1,7:1 op wit).
- **Waarom:** kleur mag nooit het enige verschil zijn (WCAG 1.4.1), en een pagina met vijf soorten gebeurtenissen naast elkaar wordt anders alleen een rij gekleurde stippen.
- **Alternatieven:** een gekleurde stip per soort (kleur is dan het enige onderscheid).
- **Later:** zie _Een wissel is één regel met één pictogram: "A voor B"_ (7 november 2026): staat er een woord naast het pictogram dat hetzelfde zegt, dan blijft het woord weg voor wie ziet, en hoort een schermlezer het in de verborgen tekst.

## De kaarten bij een wedstrijd hebben twee kleurtokens, elk met een paar voor licht en donker

- **Datum:** 7 november 2026
- **Besluit:** er komen twee nieuwe kleurtokens, `--hf-colour-card-yellow` en `--hf-colour-card-red`, elk met een paar voor licht en donker.
  Het rood is rood-600 in licht en rood-400 in donker.
  Het geel is de nieuwe reeks `yellow` met twee stappen, 400 in licht (`#f2c200`) en 300 in donker (`#f5cd2e`), want het designsysteem had geen geel.
  De bal, de pijlen en het kruis gebruiken kleuren die er al zijn: de kop, het vlak, de uitkomst winst en verlies, en de tekstkleur.
  De tokens staan in `colour.css`, met een terugval voor een browser zonder `light-dark()`, en in de documentatie van de tokens.
- **Waarom:** de kaarten zijn de enige kleuren die het ontwerp nieuw vraagt.
- **Alternatieven:** de kleuren in het onderdeel zelf zetten (dan zijn ze niet te hergebruiken en staan ze niet in de tokens die de MCP-server laat zien).

## De balk Wedstrijdverloop toont de stand als gewone kleine tekst boven de balk

- **Datum:** 7 november 2026
- **Besluit:** `MatchScoreBar` zet de stand als gewone kleine tekst boven het stuk van de balk waar hij bij hoort, niet in de balk.
  De tekst staat er alleen als het stuk minstens een tiende van de balk breed is.
  Het onderdeel maakt een stuk per stand: groen als sc Heerenveen voor staat, grijs bij gelijkstand en rood bij achterstand, met een smalle scheiding in de kleur van de ondergrond.
  De kleur van een stuk is 80% van de kleur van de uitkomst, zodat elk stuk 3:1 haalt op elk vlak van een kaart in licht en donker (1.4.11).
  Het onderdeel krijgt per doelpunt de minuut, de blessuretijd en of sc Heerenveen er voordeel van heeft; een eigen doelpunt telt voor het andere team, en de pagina geeft het zo door.
  Twee doelpunten in dezelfde minuut geven geen stuk ertussen.
- **Waarom:** de balk is dun, en de cijfers erboven zijn dan altijd te lezen.
  Een schermlezer slaat de balk over en hoort per stuk de stand en de minuten, dus kleur is niet het enige teken.
- **Alternatieven:** de cijfers in de balk (te klein, en in donker niet altijd leesbaar).

## De balk Wedstrijdverloop loopt bij een verlenging door tot 120 minuten

- **Datum:** 7 november 2026
- **Besluit:** bij een verlenging loopt de balk door tot 120 minuten, met een stippellijn waar de verlenging begint.
  Onder de balk staat elke 15 minuten een markering met het getal.
  De blessuretijd van 45, 90 en 120 krijgt een beetje ruimte op de balk, zodat een doelpunt in 90+2 niet op 90 valt.
  Meer blessuretijd dan de ruimte past, komt aan het eind van die ruimte te staan.
- **Waarom:** de pagina blijft daardoor één balk, ook bij een beker.
- **Alternatieven:** een tweede balk voor de verlenging.

## De opstelling staat als veld, uit de formatie en de volgorde van de spelers

- **Datum:** 7 november 2026
- **Besluit:** `MatchPitch` (#846) tekent de opstelling van beide teams op een veld.
  De keeper staat vooraan in de lijst, daarna komt de formatie rij voor rij, en elke rij is gelijk verdeeld.
  Een rij van vijf of meer spelers krijgt wat meer ruimte aan de zijkant.
  Een positie per speler leggen we niet vast (#855): het veld rekent de plaats uit de formatie en de volgorde van het formulier.
  Een team zonder formatie, of met een formatie die niet bij de elf spelers past, staat niet op het veld.
  Een zin zegt dat, en de lijst onder het veld noemt de spelers.
  `PitchPlayer` is één speler: een rond vlak met het rugnummer, een ring met de minuten gespeeld, merken voor een doelpunt, een kaart, eruit gewisseld en de aanvoerder, en de achternaam eronder.
  Voor een schermlezer is het veld een lijst per team, "Opstelling `<team>`, `<formatie>`", met één zin per speler in de volgorde van de formatie.
  De tekening is verborgen, en elk merk staat als woord in de zin.
- **Waarom:** de ring om een speler laat de minuten al zien, dus een aparte tijdlijn per speler voegt weinig toe.
  Het veld laat in één blik zien wie waar stond, en de lijst blijft voor wie het veld niet kan zien.
- **Alternatieven:** een minuutas met banen per team (#853) en een balk per speler (#854), uit het ontwerp "Wedstrijdpagina versie 4".
  Een positie per speler opslaan (#855) vraagt nieuwe velden in het formulier.
- **Later:** zie _Het veld is zo groot als er teams op staan_ (8 november 2026): een team zonder bruikbare gegevens staat niet meer op een leeg stuk veld.
  Het andere team staat dan op een half veld, en zonder team is er geen veld.
  Een team zonder formatie heeft een eigen zin, apart van "past de formatie niet bij de spelers".

## Het veld staat rechtop op een telefoon en ligt vanaf een breedte van 40 rem

- **Datum:** 7 november 2026
- **Besluit:** het veld staat rechtop, met sc Heerenveen onderaan, zolang het onderdeel smaller is dan 40 rem.
  Vanaf 40 rem ligt het, met sc Heerenveen links.
  Het onderdeel meet zijn eigen breedte (een container query), niet die van het scherm.
  Bij een formatie met vijf spelers in een rij of vijf rijen passen de namen niet op een smal veld.
  Ze gaan dan weg, en een zin verwijst naar de lijst eronder.
  Op een veld breder dan 36 rem staat "eruit 62'" onder de naam.
  Een lange naam gaat over twee regels met afbreking en eindigt dan op "…".
- **Waarom:** een naam die niet past is slechter dan geen naam, en de lijst blijft altijd beschikbaar.
- **Eigen keuzes bij het bouwen:**
  - de keeper en de rijen van de formatie liggen gelijk verdeeld over de helft van het team, zodat geen rij minder ruimte voor de namen heeft dan een andere.
    Het rechtopstaande veld is 5 bij 11, en de vlakken zijn kleiner (2 in plaats van 2,25 rem) zodra het onderdeel smaller is dan 18 rem.
    Op een telefoon van 320 pixels breed valt dan de naam van een speler niet meer onder de rij eronder.
    Zo smal is er tussen twee rijen ruimte voor één regel naam, dus een lange naam eindigt dan op "…" in plaats van over twee regels te gaan.
  - het liggende veld is 16 bij 9, en 3 bij 2 bij een formatie met een rij van vijf of vijf rijen.
    Een kolom met vijf spelers heeft dan hoogte genoeg voor de namen, die onder de vlakken staan.
    Het ontwerp liet 2 bij 1 zien, waarbij de naam van een speler in een kolom van vier of vijf over het vlak eronder viel.
  - op het liggende veld mag een naam hoogstens zo breed zijn als de ruimte tussen twee rijen, want de rijen staan dan naast elkaar.
- **Alternatieven:** de namen altijd tonen en laten overlappen (ze haken dan in elkaar, en dat leest slechter dan geen naam); een schakelaar om de namen te verbergen (niet in dit issue).
- **Later:** zie _Het veld is zo groot als er teams op staan_ (8 november 2026): staat er één team op het veld, dan is het veld een half veld.
  Rechtop is dat even breed als het hele veld en half zo hoog; vanaf 40 rem is het even hoog als het hele veld en half zo breed, in het midden van de kaart.

## Het veld heeft twee eigen kleurtokens voor de grasmat

- **Datum:** 7 november 2026
- **Besluit:** er komen twee tokens, `--hf-colour-background-pitch` en `--hf-colour-background-pitch-stripe`, elk met een paar voor licht en donker.
  De grasmat is lichtblauw in licht (blauw-50) en het diepste blauw van de pagina in donker (blauw-950).
  De tweede streep ligt een halve stap naar het buurblauw toe.
  Het veld heeft tien strepen, afwisselend in die twee kleuren.
  De lijnen op het veld hebben de kleur van de grafische lijn van het vlak (`--hf-colour-line-graphic-surface`), die 3:1 haalt op de grasmat.
  De ring en de vlakken van de spelers gebruiken kleuren die er al zijn: de uitkomst winst voor de ring en de kleur van de knop voor het vlak van sc Heerenveen.
- **Waarom:** het veld moet in licht en donker afsteken van een kaart, en in donker is het vlak van een kaart (blauw-900) bijna hetzelfde als lichtblauw.
- **Alternatieven:** de grasmat uit de kleur van een bestaand vlak halen (in donker valt het veld dan weg in de kaart).

## De strafschoppenserie staat twee keer: als rij schoten per team en als tabel per ronde

- **Datum:** 7 november 2026
- **Besluit:** `MatchPenaltySeries` toont de serie als rij schoten per team, met het totaal in het kopfont, en daaronder als tabel met een regel per ronde en de kolommen Nr., sc Heerenveen, de tegenstander en Stand (#848).
  De rij laat in één blik zien hoe het ging, de tabel noemt de nemers en de stand.
  Na de vijfde ronde staat een open ruimte in de rij, want de rondes daarna beslissen de serie.
- **Waarom:** de tabel is de echte inhoud voor schermlezers, de rij is de snelle kijk.
  De rij is daarom verborgen voor een schermlezer, op de totalen na, die de naam van het team in de verborgen tekst hebben.
- **Alternatieven:** alleen een tabel.

## "Naast" en "gestopt" staan ook in woorden

- **Datum:** 7 november 2026
- **Besluit:** in de tabel van `MatchPenaltySeries` staat bij een schot dat niet raak was "(naast)" of "(gestopt)" in kleine letters achter de speler, en elke cel begint voor een schermlezer met "Raak:", "Naast:" of "Gestopt:" (#848).
- **Waarom:** een doorgekruiste ring zegt niet wat er gebeurde, en kleur of teken is nooit het enige teken.
- **Alternatieven:** alleen het pictogram.
- **Keuzes bij het bouwen** (7 november 2026):
  - **De eigenschappen** zijn `headingLevel`, `opponent` en `rounds`.
    Een ronde heeft het schot van `ours` en van `theirs`, en een schot heeft de uitkomst `scored`, `missed` of `saved` en, als hij bekend is, de speler.
    Een team dat in een ronde niet schoot, heeft er geen: de cel zegt dan "Geen schot" voor een schermlezer.
  - **Zonder bekende speler** staat er "Speler onbekend", ook bij sc Heerenveen.
  - **De stand na elke ronde** telt alleen de schoten die raak waren.
    De rij en de tabel komen uit dezelfde som (`penaltySeriesFigures`), zodat ze niet kunnen verschillen.
  - **De tabel is smaller opgemaakt** dan andere tabellen: de cellen hebben minder ruimte aan de zijkant, zodat de namen op 320 pixels niet midden in een woord breken, en er scrollt niets zijwaarts.
  - **Het bijschrift** is onzichtbaar en zegt de eindstand: "Strafschoppenserie, stand 5–4".
    Het kopje Nr. heet voor een schermlezer "Ronde".
  - **De kaart eromheen** hoort bij de pagina: het onderdeel heeft een eigen kop en geen kaart, zoals `MatchScoreBar`.

## Een wissel is één regel met één pictogram: "A voor B"

- **Datum:** 7 november 2026
- **Besluit:** in het verloop is een wissel één regel met één pictogram: "A voor B".
  Het woord "Wissel" en de twee pijlen zeiden hetzelfde, dus het woord gaat weg voor wie ziet; een schermlezer hoort "Wissel: A voor B".
  Hetzelfde geldt voor elk pictogram in `MatchTimeline`: staat er een woord naast dat hetzelfde zegt, dan blijft het woord weg.
  Een doelpunt, een eigen doelpunt, een kaart en een wissel hebben dus alleen het pictogram en de naam.
  Een gemiste en een gestopte strafschop hebben hetzelfde pictogram, dus die houden hun woord ("Gemiste strafschop", "Gestopte strafschop").
  Een doelpunt zegt "(strafschop)" of "(eigen doelpunt)" achter de naam, en een assist staat op een tweede regel in kleine letters.
- **Waarom:** een woord en een pictogram die hetzelfde zeggen, maken de regel langer zonder iets toe te voegen, en de schermlezer mist niets.
- **Alternatieven:** een regel voor wie erin komt en een regel voor wie eruit gaat.

## De minuut in het verloop staat in een pil: gevuld voor sc Heerenveen, open voor de tegenstander

- **Datum:** 7 november 2026
- **Besluit:** in `MatchTimeline` staat de minuut ("45+2'") in een pil.
  De pil van sc Heerenveen is gevuld met de kleur van een knop, en die van de tegenstander is open, met een rand in dezelfde kleur.
  Er staat geen clublegenda meer in het verloop, en de naam van het team staat niet meer op een regel van zichzelf.
  De verborgen tekst vooraan zegt het team, de minuut en de soort: "sc Heerenveen: Minuut 45 plus 2, Doelpunt (strafschop): ...".
  In forced colours is de gevulde pil `Highlight`, zodat het verschil blijft.
- **Waarom:** de pil zegt wiens gebeurtenis het is, en de naam van het team staat voor schermlezers in de verborgen tekst.
  Gevuld en open verschillen in vorm, dus kleur is niet het enige teken (WCAG 1.4.1).
- **Alternatieven:** de naam van het team onder elke regel (zoals in #831), of een clublegenda boven het verloop.

## Het verloop verdeelt de gebeurtenissen over de helften, en de kop krijgt de doelpuntenmakers per club

- **Datum:** 7 november 2026
- **Besluit:** `MatchTimeline` zet de gebeurtenissen in drie blokken: "Eerste helft", "Tweede helft" en, met `extraTime`, "Verlenging".
  De helft volgt uit de minuut: tot en met 45 (ook 45+x) is de eerste helft, 46 tot en met 90 (ook 90+x) de tweede, en alles daarna verlenging.
  Zonder `extraTime` blijft een minuut na 90 in de tweede helft.
  De blokken staan naast elkaar vanaf 40 rem, gemeten aan de plek waar het verloop staat en niet aan het scherm, en verlenging staat er over de volle breedte onder.
  Een blok zonder gebeurtenissen zegt "Niets wat we bijhouden.".
  Elk blok is een genummerde lijst met een naam, onder een kop van `headingLevel` (standaard 3).
  `MatchHeader` krijgt `scorersFor` en `scorersAgainst`: per doelpunt de naam, de minuut, de blessuretijd en of het een strafschop of een eigen doelpunt was.
  Een eigen doelpunt staat bij de club die het doelpunt krijgt, met "(e.d.)", en een strafschop met "(str.)".
  Een schermlezer hoort de afkortingen uitgeschreven.
  De kop toont de uitkomst als pil ("Gewonnen", "Verloren", "Gelijkspel", na de strafschoppen als die er waren), en de regel eronder is "Na verlenging (na 90 minuten 1–1)" of "Na strafschoppen 5–4 (na verlenging 1–1)".
  Op een telefoon staan de naam en de doelpunten van een club op één regel, en vanaf 40 rem de namen links en rechts met de uitslag groot in het midden.
  De eigenschappen die er al waren (`afterNinetyFor`, `penaltiesFor` en de rest) houden hun naam.
- **Waarom:** de pagina van #831 en de stories blijven werken tot #850 de pagina bouwt, en een eigen doelpunt moet bij het team staan dat het doelpunt krijgt, zoals de uitslag het telt.
- **Alternatieven:** de helft als eigenschap van elke gebeurtenis (de pagina moet dan zelf de minuut uitzoeken), en de doelpuntenmakers uit de gebeurtenissen van het verloop halen (`MatchHeader` kent het verloop niet).
- **Later:** zie _De minuut van een doelpunt of een gele kaart mag onbekend zijn, die van een rode kaart niet_ in `hosting-en-data.md` (8 november 2026): een gebeurtenis zonder minuut staat in een vierde blok, _Minuut onbekend_, onder de andere, en `MatchHeader`, `Match`, `MatchSubstitutes` en `PitchPlayer` laten de minuut dan weg.

## De wissels per team tonen alleen wie speelde, en delen de stip en de boog met het veld

- **Datum:** 7 november 2026
- **Besluit:** `MatchSubstitutes` (#849) toont onder het veld de wissels van één team onder de kop "Wissels `<team>`": wie erin kwam, in welke minuut, voor wie en een doelpunt als hij scoorde.
  De lijst staat in de volgorde van de klok, ook als de gegevens anders binnenkomen, met blessuretijd op zijn plek (45+2 ligt tussen 45 en 46).
  Een speler op de bank die niet inviel, staat er niet bij, want het verslag legt hem nu alleen vast voor wie speelde.
  Een bank en een positie per speler zijn een idee (#855).
  Een team zonder wissels zegt "Geen wissels.".
  De stip en de boog zijn die van `PitchPlayer`: een rond vlak met het rugnummer en een ring die begint bij de minuut van invallen, met een spleet ertussen.
  Ze komen uit één onderdeel dat beide gebruiken (`PlayerDisc`), zodat de boog overal hetzelfde betekent.
  Onder de boog ligt hier geen grijs spoor, want een speler van de bank is er alleen vanaf zijn minuut.
  Een schermlezer hoort een lijst met een naam en één zin per wissel, zoals "Sven Kuipers, rugnummer 2, erin in minuut 62 voor Lars Dijkstra, doelpunt in minuut 85".
  De tekeningen zijn verborgen en elk teken staat als woord in de zin.
  `MatchSubstitutes.Group` zet de lijsten van twee teams naast elkaar vanaf 40 rem, gemeten aan de breedte van de groep, en anders onder elkaar.
- **Waarom:** de lijst laat zien wie het spel veranderde, en een bank die niet inviel zegt daar niets over.
  Dezelfde stip en boog als op het veld laten de lezer één teken leren.
- **Alternatieven:** de wissels in het veld zelf tekenen (de namen passen daar al niet altijd); een lijst met ook de spelers die niet inviellen (dat vraagt nieuwe velden in het formulier).

## `SideBySide` zet twee delen van één taak naast elkaar, en `MatchTimeline` kan een regel omkaderen

- **Datum:** 7 november 2026
- **Besluit:** het ontwerpsysteem krijgt `SideBySide` (#851), met de delen `SideBySide.Tabs`, `SideBySide.Main` en `SideBySide.Aside`, en een eigenschap `highlighted` bij een gebeurtenis van `MatchTimeline`.
  - **`SideBySide`** zet het hoofddeel links en de `aside` rechts, vanaf 56 rem van de plek waarin hij staat (een containerquery, niet het scherm), ongeveer 55 om 45.
    De `aside` blijft bovenaan staan terwijl het hoofddeel scrolt, en scrolt zelf als hij hoger is dan het scherm.
    Onder die breedte staat één deel tegelijk: de pagina geeft het deel dat niet getoond wordt het attribuut `hidden`, en de tabs kiezen.
    Een deel met `hidden` blijft in het document, dus een formulier houdt zijn waarden.
    Vanaf 56 rem tonen beide delen zich, ook met `hidden`, en zijn de tabs weg.
    Heeft een pagina geen `aside`, dan heeft het hoofddeel de hele breedte.
    Het onderdeel heeft geen toestand: de pagina bewaart de gekozen tab.
  - **`highlighted`** zet een kader (een omtrek van drie pixels in de kleur van de focusring) om de regel van een gebeurtenis.
    Het kader ligt buiten de regel, dus de regels verschuiven niet, en het is een lijn, dus het is ook zonder kleur te zien.
- **Waarom:** de pagina zet het formulier van het verslag naast een voorbeeld van de wedstrijdpagina, en een ander formulier kan dat ook willen.
  De site heeft geen eigen CSS, dus de indeling hoort in het ontwerpsysteem.
  Het kader laat de beheerder zien welke regel van het verloop bij het veld hoort dat hij net veranderde.
- **Alternatieven:** de indeling in de site (die heeft geen eigen stijlen, en elke pagina zou het opnieuw uitzoeken); de breedte van het scherm in plaats van van de plek (het formulier staat naast een zijbalk, dus het scherm zegt niet hoeveel plek het heeft); tabs met `role="tab"` (de pagina wisselt geen paneel van één taak maar kiest wat je ziet, en `SegmentedControl` doet dat al met `aria-pressed`).

## Het veld is zo groot als er teams op staan

- **Datum:** 8 november 2026
- **Besluit:** `MatchPitch` (#901) tekent het veld zo groot als er teams op staan.
  Een team staat op het veld als zijn formatie bij zijn elf spelers past.
  Staan beide teams erop, dan is het veld het hele veld.
  Staat er één team op, dan is het veld de helft van dat team, op dezelfde schaal als het hele veld en uitgesneden uit het hele veld.
  De spelers hebben dus dezelfde maat en afstand, en de middenlijn ligt aan de rand met de helft van de middencirkel.
  Rechtop is het halve veld even breed als het hele veld en half zo hoog, met sc Heerenveen onderaan of de tegenstander bovenaan.
  Vanaf 40 rem is het even hoog als het hele veld en half zo breed, in het midden van de kaart, met sc Heerenveen links of de tegenstander rechts.
  Staat geen team op het veld, dan is er geen veld, geen regel met teams en geen uitleg van de merken, en "Opstelling als lijst" staat open.
  Boven het veld staat alleen het team dat erop staat.
  Een team dat is meegegeven maar niet op het veld staat, krijgt één zin onder het veld.
  Heeft het geen formatie, dan luidt die: "Van `<team>` hebben we de formatie niet; de spelers staan in de lijst hieronder."
  Past de formatie niet bij de spelers, dan luidt die: "Voor `<team>` past de formatie niet bij de spelers; de lijst hieronder toont de opstelling."
  Een team dat de site niet meegeeft, krijgt geen zin van het onderdeel.
- **Waarom:** een lege helft of een leeg veld zegt niets en neemt ruimte in op een telefoon.
  Op dezelfde schaal blijven de namen leesbaar en hoeft de plaats van een speler niet opnieuw te worden uitgerekend.
  Een naam zonder veld erbij suggereert dat er iets te zien is, en "past niet bij de spelers" is onwaar voor een formatie die er niet is.
  Zonder veld is de lijst het enige wat er te zien is, en de merken uit de uitleg staan er niet.
- **Eigen keuzes bij het bouwen:**
  - de strepen en lijnen van het halve veld zijn die van het hele veld, met alleen het doel aan het eind van de helft.
    `pitchSpots` rekent de plaatsen van een halve helft uit met een extra waarde `half`, zodat de afstanden dezelfde zijn als op het hele veld.
  - op het liggende halve veld staat "eruit 62'" onder de naam, net als op het hele veld, ook al is het veld zelf smaller dan 36 rem.
- **Alternatieven:** het halve veld over de hele breedte uitrekken (de lijnen vervormen en het veld wordt groter dan het hele veld); een lege helft laten staan met een zin erin; beide teams boven het veld laten staan; één zin voor alle gevallen; de lijst dichtgeklapt laten.
- **Later:** zie _Een half veld heeft rechte hoeken op de middenlijn_ (8 november 2026): de twee hoeken van het halve veld op de middenlijn zijn recht.

## Een half veld heeft rechte hoeken op de middenlijn

- **Datum:** 8 november 2026
- **Besluit:** de twee hoeken van een half veld van `MatchPitch` (#911) die op de middenlijn liggen, zijn recht.
  De twee hoeken aan het doel blijven afgerond, net als de vier hoeken van het hele veld.
  Rechtop zijn dat de hoeken boven bij sc Heerenveen en onder bij de tegenstander.
  Liggend zijn het de hoeken rechts bij sc Heerenveen en links bij de tegenstander.
- **Waarom:** het halve veld is een helft van het hele veld, en een middenlijn met afgeronde hoeken laat het veld eruitzien als een los vlak.
  De rechte rand laat zien dat de andere helft ontbreekt.
- **Eigen keuzes bij het bouwen:**
  - het halve veld van alleen de tegenstander stond liggend nergens in Storybook, dus daar komt het verhaal `HalfPitchOpponentLyingDown` voor.
- **Alternatieven:** alle vier de hoeken afgerond laten, zoals nu; alle vier de hoeken recht maken, ook die aan het doel.

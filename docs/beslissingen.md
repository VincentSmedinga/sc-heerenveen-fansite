# Beslissingen

Per beslissing een kort blok: datum, besluit, waarom en welke alternatieven we hebben overwogen. Een beslissing die een langer betoog nodig heeft, krijgt een eigen bestand. Iets wat _voorlopig_ heet, staat nog open; dat besluit volgt.

De beslissingen over stack, database, hosting, contentbeleid en taal komen hier nog bij.

## Project

### Prototype blijft lokaal

- **Datum:** 20 oktober 2026
- **Besluit:** het prototype uit de community publiceren we niet op GitHub. Het blijft lokaal, in een eigen worktree naast deze repository (`sc-heerenveen-fansite-prototype`), op de branch `reference/prototype-import`.
- **Waarom:** het is niet nodig. De herbouw werkt met de lokale kopie, en publiceren zou toestemming van de maker en een licentie vragen.
- **Gevolg:** issues en documentatie beschrijven in eigen woorden wat ze uit het prototype overnemen, zonder ernaar te linken.
- **Alternatieven:** het prototype publiceren, met toestemming van de maker en een licentie.

## Designsysteem

### Werkruimte met één package

- **Datum:** 20 oktober 2026
- **Besluit:** een pnpm 12-werkruimte op Node 24, met voorlopig één package: `packages/design-system`, met de naam `@fansite/design-system`. De naam is voorlopig.
- **Waarom:** het designsysteem kan nu al beginnen, los van de site en de import. De andere packages komen erbij als de monorepo verder wordt opgezet.
- **Alternatieven:** meteen de hele monorepo opzetten. Dat is meer werk voordat er iets te zien is.

### TypeScript 6 in plaats van 7

- **Datum:** 20 oktober 2026
- **Besluit:** we gebruiken TypeScript 6.0, niet de nieuwe TypeScript 7.
- **Waarom:** TypeScript 7 is een nieuwe compiler, geschreven in Go, en heeft nog geen JavaScript-API. typescript-eslint (tot en met 6.0) en de documentatie-generator van Storybook hebben die API nodig. We stappen over zodra die tools TypeScript 7 ondersteunen.
- **Alternatieven:** TypeScript 7 alleen voor de typecontrole en TypeScript 6 voor de tools. Dat zijn twee compilers naast elkaar, voor weinig winst.

### Lettertypes uit de @fontsource-variable-packages

- **Datum:** 20 oktober 2026
- **Besluit:** Truculenta en Atkinson Hyperlegible Next komen uit `@fontsource-variable/truculenta` en `@fontsource-variable/atkinson-hyperlegible-next`. De `@font-face`-regels schrijven we zelf, met alleen de subsets latin en latin-ext.
- **Waarom:** de packages hebben alle assen die we nodig hebben (Truculenta: gewicht, breedte en optische grootte; Atkinson: gewicht en cursief), met de OFL-licentie erbij, en ze zijn bij te werken met pnpm. Met eigen regels heten de lettertypes gewoon Truculenta en Atkinson Hyperlegible Next, en laten we de Vietnamese subset weg. Latin dekt het Nederlands en het Fries; latin-ext (met onder meer Ĳ en ĳ) laadt de browser alleen als een pagina zo'n teken bevat. Er gaat geen verzoek naar een ander domein.
- **Alternatieven:** de CSS van fontsource zelf gebruiken (met de Vietnamese subset en namen als 'Truculenta Variable'), of de woff2-bestanden zelf in de repository zetten (bijwerken met de hand).
- **Let op:** de `url()` in `fonts.css` verwijst naar een pad in het package, zoals `@fontsource-variable/truculenta/files/…`. Vite lost dat op; bij de Next.js-app moeten we controleren of dat daar ook werkt.

### Licht en donker met light-dark()

- **Datum:** 20 oktober 2026
- **Besluit:** elk semantisch kleurtoken heeft één regel met beide waarden: `light-dark(licht, donker)`. Zonder keuze volgt de site de systeeminstelling. `data-theme="light"` of `data-theme="dark"` op het `html`-element kiest een thema, en werkt ook op een los element.
- **Waarom:** geen dubbele lijst van donkere waarden (één keer in een mediaquery en één keer voor `data-theme`). De documentatie kan licht en donker naast elkaar tonen. `light-dark()` werkt in alle gangbare browsers sinds 2024 (Chrome 123, Firefox 120, Safari 17.5).
- **Oudere browsers:** die krijgen via een `@supports`-blok alleen het lichte thema. De lichte waarden staan daardoor twee keer in `colour.css` en moeten gelijk blijven. Randen en focusranden nemen alleen hun kleur uit een token, zodat ze ook zonder token zichtbaar blijven, in de tekstkleur.
- **Alternatieven:** een apart blok met donkere waarden, twee keer herhaald. Werkt ook in oudere browsers, maar raakt makkelijk uit de pas.

### Voorvoegsel hf-

- **Datum:** 20 oktober 2026
- **Besluit:** klassen en custom properties beginnen met `hf-`, van Heerenveen Fansite: `.hf-heading-3`, `--hf-colour-text-default`. Cascade layers heten `hf.tokens`, `hf.base`, `hf.typography` en `hf.components`. Klassen die alleen in Storybook bestaan, beginnen met `_hf-docs-`. Stylelint controleert dit.
- **Waarom:** kort, herkenbaar als Heerenveen Fansite, en het botst niet met klassen van anderen.
- **Alternatieven:** `fs-` (fansite), dat we eerst voorlopig gebruikten, `shf-` (sc Heerenveen Fansite) en `hv-` (Heerenveen).

### Lagen in de CSS

- **Datum:** 20 oktober 2026
- **Besluit:** alle CSS van het designsysteem zit in cascade layers, van zwak naar sterk: tokens, base (HTML-elementen), typography (typestijlen), components.
- **Waarom:** de volgorde bepaalt wat wint, niet de specificiteit. CSS van de site zelf, buiten een laag, wint altijd van het designsysteem.
- **Alternatieven:** geen lagen, en dan specificiteit en volgorde bewaken. Dat wordt lastiger naarmate er meer componenten zijn.

### Typestijl los van het HTML-niveau

- **Datum:** 20 oktober 2026
- **Besluit:** elke typestijl is een klasse (`.hf-heading-3`, `.hf-headline`, `.hf-meta`). Zonder klasse krijgen `h1` tot en met `h4` de stijl met hetzelfde nummer. `h5` krijgt voorlopig de nieuwskop en `h6` het label.
- **Waarom:** de kopstructuur volgt de inhoud, de stijl volgt het ontwerp. Een kaarttitel is een `h2` die eruitziet als kop 3.
- **Alternatieven:** `h5` en `h6` dezelfde stijl als `h4` geven. Dan zijn de niveaus niet van elkaar te onderscheiden.

### Mobiele lettergroottes

- **Datum:** 20 oktober 2026
- **Besluit:** kop 1 en kop 2 schalen mee met `clamp()`, van 360 tot 1280 pixels breed. Woordmerk, kop 3, kop 4 en nieuwskop springen één keer naar hun mobiele maat, onder 40 em (640 pixels). Dat breekpunt is voorlopig.
- **Waarom:** bij de grote koppen is het verschil groot genoeg om geleidelijk te schalen; bij de kleine is het 1 pixel.
- **Alternatieven:** alles met `clamp()`.

### Voorlopige kleurtokens

- **Datum:** 20 oktober 2026
- **Besluit:** deze waarden stonden niet in het afgesproken palet. Ze zijn voorlopig ingevuld en wachten op een besluit:
  - knoppen in donker: blauw-300 met tekst in blauw-950, net als de links in donker;
  - knop onder de muis: blauw-900 (licht) en blauw-200 (donker);
  - hover en zebrarijen in donker: blauw-950, de pagina, want tussen kaart (blauw-900) en pagina ligt geen stap meer;
  - link onder de muis in donker: blauw-200 (in licht blauw-800, zoals in het canvas);
  - bezochte link: grijs-600 (licht) en grijs-400 (donker), zodat je ziet wat je al hebt gelezen. Browsers staan voor bezochte links alleen een andere kleur toe, dus het verschil zit in kleur én helderheid;
  - rand van invoervelden: grijs-500 (licht) en blauw-400 (donker), omdat de gewone randkleuren de vereiste 3:1 voor velden niet halen.
- **Waarom:** de HTML-elementen hebben deze kleuren nodig. Alle tekst haalt ermee AA, lopende tekst AAA.
- **Uit het canvas overgenomen:** tekst in de header blauw-50 en het menu blauw-200, tekst op de wedstrijdband blauw-100, en de gemarkeerde rij in blauw-100 met blauw-800 (licht) en blauw-800 met blauw-50 (donker).

### Staal voor markeringen

- **Datum:** 20 oktober 2026
- **Besluit:** wat nummert, scheidt of aanwijst, krijgt staal: een gedempt blauw dat rustiger is dan de tekst. Nu zijn dat opsommingstekens en nummers van lijsten, de positie in een stand, de lijn bij een citaat en de stippellijn onder een afkorting; later ook stap- en paginanummers, scheidingstekens, kleine pictogrammen en balkjes in grafiekjes. Daarvoor komen er drie kleuren bij het palet: staal 400, 500 en 600 (tint 255°, chroma 0,075), even licht als grijs-400, -500 en -600. Nummers en posities (tekst) zijn in licht staal 600 en in donker blauw-200; tekens, lijnen en pictogrammen (grafisch) zijn staal 500 en staal 400.
- **Waarom:** ton-sur-ton bij de rest van de site, rustiger dan de tekst, en niet te verwarren met links (helder blauw) of datums (rood). Secundaire tekst, kaartranden en lijnen tussen rijen blijven grijs; staal 400 tot en met 600 is alleen voor markeringen. Tekst haalt minstens 4,5:1 en grafische markeringen minstens 3:1 op pagina, kaart en tonaal vlak.
- **Alternatieven:** grijs, helder blauw uit het palet en rood. Als naam: lei, duif en mar (Fries voor meer).

### Zand voor de grijzen

- **Datum:** 20 oktober 2026
- **Besluit:** de grijsreeks krijgt tint 85° (zand) in plaats van 255° (blauw), met een chroma van 0,006 tot 0,017. De lichtheid per stap blijft gelijk, en daarmee ook het contrast: geen enkel paar verschuift meer dan 0,15.
- **Waarom:** met blauwgetinte grijzen was bijna alles blauw en voelde de site koel. Zand geeft een rustige, vriendelijke basis met karakter, en blauw en rood springen er meer uit.
- **Alternatieven:** klei (tint 62°, met meer rood; dat leidde af van de rode datums), kiezel (tint 75°, bijna neutraal, maar nog wat koel) en de blauwgetinte grijzen.
- **Let op:** op goedkope schermen en met een nachtstand kan de pagina iets geler ogen.

### Drie tonale vlakken, elk met een eigen rand

- **Datum:** 20 oktober 2026
- **Besluit:** naast het tonale vlak in blauw-100 zijn er twee: een zacht vlak in blauw-50 en een warm vlak in zand (#F3E8D3, even licht en verzadigd als blauw-100). De tokens heten `background-surface-tonal`, `background-surface-soft` en `background-surface-warm`.
- **Rand:** elk tonaal vlak krijgt een rand van 1 pixel, net als een kaart. De randkleur komt uit de reeks van het vlak; zie _Kleuren, reeksen en rollen_. In licht is dat staal-300 (tonaal vlak), staal-200 (zacht vlak) en zand-300 (warm vlak). In donker is het dezelfde stap als van kaart naar rand (blauw-900 naar blauw-700); voor het tonale vlak (blauw-800) is dat blauw-600.
- **Donker:** het zachte vlak is in donker gelijk aan het vlak (blauw-900 met rand blauw-700). Het warme vlak is gelijk aan het tonale vlak (blauw-800 met rand blauw-600); zand is er alleen in licht.
- **Code:** codeblokken (`pre`) krijgen de rand van het tonale vlak; code in een zin niet.
- **Waarom:** met meer tonale vlakken kan elke soort inhoud een eigen vlak krijgen, en sturen we de aandacht van de lezer. Het maakt de pagina ook levendiger; er was te veel blauw. De rand maakt tonale vlakken even duidelijk afgebakend als kaarten.

### Kleuren, reeksen en rollen

- **Datum:** 20 oktober 2026
- **Besluit:** het palet heeft drie lagen. Kleuren: blauw (255°), rood (27°) en zand (85°). Reeksen: een kleur in één sterkte, met genummerde stappen van licht naar donker: blauw en rood (helder), staal en zand (gedempt), grijs (neutraal zand). Rollen: waarvoor een kleur dient, zoals pagina, vlak, rand en tekst. Alleen reeksen hebben nummers; rollen hebben een naam.
- **Randen:** de rand van een vlak komt uit de gedempte of neutrale reeks van zijn kleur. Lichte vlakken krijgen stap 200 (vlak grijs-200, zacht vlak staal-200), tonale vlakken stap 300 (tonaal vlak staal-300, warm vlak zand-300). Zo zijn er geen losse randkleuren.
- **Waarom:** de kleuren moeten makkelijk te begrijpen en uit te leggen zijn. Staal en grijs leken aparte kleuren, maar zijn blauw en zand in een andere sterkte.
- **Alternatieven:** losse randkleuren per vlak, op een vaste afstand van het vlak (eerst #b8cce6, #cbd7e7 en #d7c9ac).

### Vier vlakken; een kaart is een vlak met een rand

- **Datum:** 20 oktober 2026
- **Besluit:** in de kleuren zijn kaart en vlak één begrip. Er zijn vier vlakken, elk met een achtergrond en een rand: vlak (wit), tonaal vlak, zacht vlak en warm vlak. Een kaart is het onderdeel: een vlak met een rand, ronde hoeken en binnenruimte. Code, invoervelden en de gemarkeerde rij gebruiken de kleur van een vlak zonder kaart te zijn. De tokens heten `background-surface` (met `-tonal`, `-soft` en `-warm`) en `border-surface` (idem). `border-default` blijft voor lijnen tussen rijen.
- **Waarom:** sinds tonale vlakken een rand hebben, verschillen kaart en vlak alleen in kleur, en in donker is het zachte vlak al gelijk aan het vlak. Eén begrip is makkelijker uit te leggen: een kaart is een vlak met een rand, en er zijn vier vlakken.
- **Alternatieven:** kaart en tonaal vlak als twee aparte rollen, zoals eerst.

### Open: focusrand op de wedstrijdband

- **Datum:** 20 oktober 2026
- **Stand:** in het lichte thema haalt de focusrand (blauw-500) op de wedstrijdband (blauw-800) maar 2,65:1. Nodig is 3:1. In het donkere thema is het 7,9:1. Het palet is niet aangepast.
- **Mogelijkheden:** een eigen token voor de focusrand op donkere achtergronden, zoals blauw-300 uit het donkere thema, of een focusrand in twee kleuren (bijvoorbeeld blauw-500 met een witte binnenrand) die op elke achtergrond werkt.

### Storybook

- **Datum:** 20 oktober 2026
- **Besluit:** Storybook 10 met React en Vite, met verhalen in CSF Next (`preview.meta()` en `meta.story()`). Add-ons: docs, a11y (axe) en Pseudo States, om hover, focus en bezocht te tonen. Telemetrie, de versiecontrole, de melding van het nieuwsoverzicht en de Engelse onboarding staan uit. De dev-server haalt het nieuwsoverzicht van storybook.js.org nog wel op; dat valt in Storybook 10.6 niet uit te zetten. De pagina's zelf praten alleen met de lokale server. De a11y-controle staat op `error`, zodat een overtreding een test laat falen zodra de tests in Storybook draaien.
- **Waarom:** CSF Next is de nieuwe manier van schrijven, met betere typen; nu beginnen voorkomt een omzetting later. Storybook zelf is Engels, maar alles wat wij schrijven is Nederlands: hoofdstukken, verhalen, documentatie en de themaknop.
- **Alternatieven:** CSF 3, de huidige standaard.

## Redactie

### sc Heerenveen met kleine letters

- **Datum:** 20 oktober 2026
- **Besluit:** we schrijven de club altijd als sc Heerenveen, met een kleine s en c, ook aan het begin van een zin en in de sitenaam sc Heerenveen Fansite. Waar het woordmerk kapitalen toont, blijft de tekst erachter "sc", voor schermlezers en wie de tekst kopieert.
- **Uitzonderingen:** koppen uit de media citeren we zoals ze zijn gepubliceerd, ook met SC Heerenveen. Oude namen van de site blijven zoals ze waren, zoals SC Heerenveen Online (1997–98).
- **Waarom:** zo schrijft de club zichzelf. Koppen van anderen delen we; die passen we niet aan.
- **Alternatieven:** SC Heerenveen met hoofdletters, zoals in veel koppen uit de media.

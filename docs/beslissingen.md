# Beslissingen

Per beslissing een kort blok: datum, besluit, waarom en welke alternatieven we hebben overwogen. Een beslissing die een langer betoog nodig heeft, krijgt een eigen bestand. Iets wat _voorlopig_ heet, staat nog open; dat besluit volgt.

De beslissingen over stack, contentbeleid en taal komen hier nog bij.

## Project

### Prototype blijft lokaal

- **Datum:** 20 oktober 2026
- **Besluit:** het prototype uit de community publiceren we niet op GitHub. Het blijft lokaal, in een eigen worktree naast deze repository (`sc-heerenveen-fansite-prototype`), op de branch `reference/prototype-import`.
- **Waarom:** het is niet nodig. De herbouw werkt met de lokale kopie, en publiceren zou toestemming van de maker en een licentie vragen.
- **Gevolg:** issues en documentatie beschrijven in eigen woorden wat ze uit het prototype overnemen, zonder ernaar te linken.
- **Alternatieven:** het prototype publiceren, met toestemming van de maker en een licentie.

## Hosting en data

### Beginnen op de gedeelde hosting van mijn.host

- **Datum:** 20 oktober 2026
- **Besluit:** we beginnen op de gedeelde webhosting van mijn.host waar het forum al draait, het pakket Basic. We houden in de gaten hoe dat gaat.
- **Wat de hosting biedt:** volgens mijn.host:
  - Node.js 22 en 24. Next.js draait via Phusion Passenger, het liefst als standalone build.
  - MariaDB 10.11 als database. Er is geen PostgreSQL, en er zijn geen processen die blijven draaien. Taken lopen via cron, hooguit één keer per minuut.
  - 4 cores, 4 GB geheugen en 10 GB opslag, voor maximaal vijf websites, samen met het forum.
  - Uitrollen vanuit GitHub Actions over SSH, op poort 26.
- **Waarom:** de hosting is er al, voor het forum. Een eigen server kost geld en onderhoud.
- **Overstappen:** naar een VPS, zodra we tegen een grens aanlopen:
  - live-updates om de paar seconden, of WebSockets;
  - het forum wordt trager;
  - de opslag raakt op;
  - een preview per pull request, of zware statistieken.
- **Alternatieven:** een unmanaged VPS van € 12,50 tot € 25 per maand (zonder btw), met root, Docker, Postgres en workers. Dat doen we voorlopig niet, vanwege de kosten en het onderhoud van de server: updates, beveiliging en back-ups.

### MariaDB in plaats van Postgres

- **Datum:** 20 oktober 2026
- **Besluit:** de database is MariaDB 10.11, met Drizzle. Dat vervangt het eerdere plan voor Postgres.
- **Waarom:** MariaDB is de database van de hosting. De belangrijkste reden voor Postgres was pg-boss, en dat valt weg zonder workers (zie _Importtaken via cron_).
- **Alternatieven:** Postgres op een VPS. SQLite viel al eerder af.

### Importtaken via cron

- **Datum:** 20 oktober 2026
- **Besluit:** cron start de importtaken, in plaats van pg-boss. Elke taak is een gewone opdracht die zijn werk doet en stopt. Een lock in de database zorgt dat een taak nooit twee keer tegelijk draait.
- **Waarom:** de hosting heeft geen processen die blijven draaien, en pg-boss werkt alleen met Postgres. Op een VPS kan een worker later dezelfde opdrachten aanroepen.
- **Alternatieven:** pg-boss met een worker die blijft draaien, op een VPS met Postgres.

## Werkruimte

### Packages komen met het issue dat ze nodig heeft

- **Datum:** 20 oktober 2026
- **Besluit:** `apps/web`, `apps/importer` en `packages/db` komen er pas met het eerste issue dat er code in zet. `packages/shared` kwam met #2, voor de controle van omgevingsvariabelen. De namen zijn voorlopig.
- **Waarom:** een leeg skelet moeten we bijhouden zonder dat het iets doet, en het legt een opzet vast voordat we weten wat het package nodig heeft.
- **Alternatieven:** alle packages nu als leeg skelet.

### TypeScript met project references

- **Datum:** 20 oktober 2026
- **Besluit:** de strikte opties staan in één `tsconfig.base.json`. De `tsconfig.json` in de root noemt elk package als project reference, en een package dat een ander importeert, verwijst ernaar. `pnpm typecheck` is `tsc -b`. Daarnaast staat `erasableSyntaxOnly` aan: geen enums, namespaces of parameter properties.
- **Waarom:** `tsc -b` controleert de packages in de goede volgorde en alleen wat veranderd is, en een package krijgt de types van een ander zonder aparte build. Met `erasableSyntaxOnly` kan Node 24 elk bestand zelf draaien, wat de importer kan gebruiken.
- **Let op:** TypeScript laat alleen naar een project verwijzen dat uitvoer schrijft. Daarom schrijven de packages alleen declaraties, in `node_modules/.cache/tsc`. Alleen `tsc -b` leest die bestanden; apps en bundlers lezen de TypeScript-bron.
- **Alternatieven:** `tsc --noEmit` per package, zoals eerst. Dat controleert elk package los en elke keer helemaal. Of een echte build per package naar `dist`, die we niet nodig hebben zolang niets gepubliceerd wordt.

### Controles: snel bij de commit, volledig in CI

- **Datum:** 20 oktober 2026
- **Besluit:** husky installeert bij `pnpm install` twee git hooks. Voor een commit herstelt lint-staged met ESLint, Stylelint en Prettier wat het kan, alleen in de gestagede bestanden. commitlint controleert of het commitbericht Conventional Commits volgt. De workflow CI doet bij elke pull request en op `main` de rest: lint, typecontrole, tests en build.
- **Waarom:** een commit moet snel blijven; de typecontrole van de hele werkruimte past daar niet bij, en CI vangt die toch.
- **Alternatieven:** ook de typecontrole in de pre-commit-hook. Grondiger, maar elke commit wordt trager.

### GitHub Actions vastgezet op een commit

- **Datum:** 20 oktober 2026
- **Besluit:** een workflow noemt elke action met de volledige SHA van een commit, met de versie als commentaar erachter, zoals `actions/checkout@3d3c42e… # v7.0.1`. GitHub dwingt dat af: een workflow met een action die niet zo vastligt, faalt. Renovate werkt de SHA en het commentaar samen bij.
- **Waarom:** de eigenaar van een action, of iemand die zijn account overneemt, kan een tag als `v7` naar andere code laten wijzen. Een SHA ligt vast. Dat telt extra in een openbare repository, en in workflows met schrijfrechten, zoals die voor releases en Storybook.
- **Alternatieven:** vastzetten op de hoofdversie (`@v7`), zoals eerst. Nieuwe versies komen dan vanzelf binnen, maar ook zonder dat iemand ze heeft gezien.

### Omgevingsvariabelen

- **Datum:** 20 oktober 2026
- **Besluit:** `.env.example` noemt en beschrijft elke variabele; `.env` zelf staat in `.gitignore`. Elke app controleert bij het opstarten zijn variabelen met `parseEnv` uit `@fansite/shared/env`, met een Zod-schema. Eén foutmelding noemt alle ontbrekende en ongeldige variabelen. Een lege waarde telt als ontbrekend, en de melding herhaalt nooit een waarde, omdat het een geheim kan zijn. Secret scanning en push protection van GitHub staan aan.
- **Voorlopig:** één `.env` in de root voor alle apps. Next.js leest alleen een `.env` in zijn eigen map; `apps/web` moet de root-`.env` dus zelf laden.
- **Waarom:** het prototype werd gedeeld met het echte `.env`-bestand erin. Een verse clone moet draaien met alleen een ingevulde kopie van `.env.example`, en anders meteen zeggen wat er ontbreekt.
- **Alternatieven:** t3-env (`@t3-oss/env-nextjs`), dat ook client- en servervariabelen scheidt, maar voor de importer niets toevoegt. Of zonder controle, met de fout pas als een variabele gebruikt wordt.

### Renovate in plaats van Dependabot

- **Datum:** 20 oktober 2026
- **Besluit:** Renovate houdt de dependencies, pnpm, Node en de GitHub Actions bij, via de GitHub-app van Mend. Eén keer per week, met alle kleine updates (minor en patch) in één pull request en een eigen pull request per major-update. Een nieuwe versie wacht drie dagen. Beveiligingsupdates komen uit de OSV-database en wachten niet op het schema. TypeScript blijft onder 7.
- **Waarom:** Dependabot ondersteunt pnpm 12 nog niet officieel. Het lockfile van pnpm 12 bestaat uit twee YAML-documenten, en de dependency graph van GitHub leest alleen het eerste. Hij ziet dus geen enkele dependency, en geeft ook geen beveiligingsmeldingen ([dependabot-core#15904](https://github.com/dependabot/dependabot-core/issues/15904)). Renovate leest dat lockfile sinds juni 2026 wel. Het houdt ook monorepo's als Storybook en typescript-eslint vanzelf bij elkaar, en werkt `packageManager` en `.nvmrc` bij.
- **Nadeel:** een app van een andere partij krijgt schrijfrechten op de repository.
- **Alternatieven:** Dependabot, ingebouwd en zonder extra app. Dat bekijken we opnieuw zodra het pnpm 12 ondersteunt. Of Renovate zelf draaien als GitHub Action: geen app van een ander, maar wel een token en onderhoud.

### Conventional Commits in het Engels, ook in de titel van een pull request

- **Datum:** 20 oktober 2026
- **Besluit:** commits volgen Conventional Commits, in Brits Engels, zoals de code. We voegen samen met squash, en dan wordt de titel van de pull request de commit op `main`. Die titel volgt daarom ook Conventional Commits in het Engels, bijvoorbeeld `feat(web): add the news archive`. Een workflow controleert de titel met commitlint. De beschrijving van een pull request blijft Nederlands.
- **Wat is er nieuw:** dit beantwoordt de open vraag uit #29. De changelog van release-please blijft Engels en technisch. De tekst voor de pagina 'Wat is er nieuw' schrijven we per release met de hand, in gewone taal. Dat gebeurt in een gewone pull request voordat de release-pull request wordt samengevoegd, want release-please schrijft zijn eigen branch bij elke merge naar `main` opnieuw. Hoe de pagina die teksten leest, bepaalt #29.
- **Waarom:** release-please maakt versienummers en changelog uit de commits op `main`. De geschiedenis van git blijft zo in één taal. En een commitbericht is geen tekst voor bezoekers: ook een Nederlands bericht zou voor 'Wat is er nieuw' herschreven moeten worden.
- **Instelling:** een squash-commit krijgt altijd de titel van de pull request, ook bij een pull request met één commit. Anders zou GitHub de titel van die commit nemen.
- **Alternatieven:** een Nederlandse onderwerpregel met een Engels type, zoals `feat(web): nieuwsarchief toevoegen`. Dan wordt de changelog Nederlands, en kan #29 met de regels daaruit beginnen. Maar de commits op een branch zijn Engels, en de titels op `main` dan niet.

### Eén versie voor de hele site, met release-please

- **Datum:** 20 oktober 2026
- **Besluit:** de hele repository heeft één versie, in `package.json` in de root. De eerste release is 0.1.0, met de tag `v0.1.0`. release-please houdt een release-pull request bij. Samenvoegen verhoogt de versie, vult `CHANGELOG.md` aan en maakt een release op GitHub. Tot 1.0.0, dat we voor de lancering bewaren, verhogen een feature en een breaking change het middelste cijfer.
- **Waarom:** de site en de importer gaan samen live, en we publiceren geen packages.
- **Let op:** release-please maakt zijn pull request met het token van GitHub Actions. Daarvoor mag GitHub Actions in deze repository pull requests maken. Een pull request van een workflow start geen andere workflows, dus de controles ontbreken. Sluit de release-pull request en open hem weer; dan starten ze wel. Dat staat ook onderaan die pull request.
- **Alternatieven:** een versie per package. Of release-please met het token van een eigen GitHub App, zodat de controles vanzelf starten. Dat is een geheim meer om te beheren; als het sluiten en openen gaat tegenstaan, stappen we over.

### Regels voor main

- **Datum:** 20 oktober 2026
- **Besluit:** de ruleset 'main' geldt alleen voor `main`. Een wijziging komt er alleen via een pull request, samengevoegd met squash, en alleen als drie controles slagen: _Lint, typecheck, test and build_ (CI), _Build Storybook_ en _Conventional Commits title_. Niemand mag de regels omzeilen. `main` verwijderen of force-pushen kan niet. Op andere branches gelden geen regels, zodat je ze kunt rebasen en na het samenvoegen kunt verwijderen.
- **Waarom:** zo kan een pull request met een typefout echt niet samengevoegd worden. De vorige ruleset, 'All branches', gold voor elke branch, met de regels _creation_ en _update_. Daardoor kon alleen wie de regels mocht omzeilen een branch maken of bijwerken, vroeg elke merge naar `main` om dat vinkje, en konden release-please en Renovate hun eigen branches niet maken.
- **Let op:** de ruleset kent de controles aan hun naam, van de app GitHub Actions. Wie een job hernoemt, past de ruleset mee aan. In een noodgeval kan een beheerder de ruleset tijdelijk aanpassen.
- **Alternatieven:** de oude ruleset houden en het vinkje blijven zetten. Of wie schrijfrechten heeft de regels laten omzeilen; dan kan ook een pull request met een fout erdoor.

## Designsysteem

### Werkruimte met één package

- **Datum:** 20 oktober 2026
- **Besluit:** een pnpm 12-werkruimte op Node 24, met voorlopig één package: `packages/design-system`, met de naam `@fansite/design-system`. De naam is voorlopig.
- **Waarom:** het designsysteem kan nu al beginnen, los van de site en de import. De andere packages komen erbij als de monorepo verder wordt opgezet.
- **Alternatieven:** meteen de hele monorepo opzetten. Dat is meer werk voordat er iets te zien is.
- **Later:** zie _Packages komen met het issue dat ze nodig heeft_.

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

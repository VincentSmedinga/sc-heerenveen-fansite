# Werkruimte

## Packages komen met het issue dat ze nodig heeft

- **Datum:** 20 oktober 2026
- **Besluit:** `apps/site`, `apps/importer` en `packages/db` komen er pas met het eerste issue dat er code in zet.
  `packages/shared` kwam met #2, voor de controle van omgevingsvariabelen.
  `apps/site` kwam met #6.
  `packages/db` kwam met #69.
  `apps/importer` kwam met #71, voor de fetcher.
  De site heet `apps/site` en niet `apps/web` of `apps/front-end`: het is de hele site, met de server en het beheer erbij, en "site" is het woord dat we overal gebruiken (besloten op 20 oktober 2026).
- **Waarom:** een leeg skelet moeten we bijhouden zonder dat het iets doet, en het legt een opzet vast voordat we weten wat het package nodig heeft.
- **Alternatieven:** alle packages nu als leeg skelet.

## TypeScript met project references

- **Datum:** 20 oktober 2026
- **Besluit:** de strikte opties staan in één `tsconfig.base.json`.
  De `tsconfig.json` in de root noemt elk package als project reference, en een package dat een ander importeert, verwijst ernaar.
  `pnpm typecheck` is `tsc -b`.
  Daarnaast staat `erasableSyntaxOnly` aan: geen enums, namespaces of parameter properties.
- **Waarom:** `tsc -b` controleert de packages in de goede volgorde en alleen wat veranderd is, en een package krijgt de types van een ander zonder aparte build.
  Met `erasableSyntaxOnly` kan Node 24 elk bestand zelf draaien, wat de importer kan gebruiken.
- **Let op:** TypeScript laat alleen naar een project verwijzen dat uitvoer schrijft.
  Daarom schrijven de packages alleen declaraties, in `node_modules/.cache/tsc`.
  Alleen `tsc -b` leest die bestanden; apps en bundlers lezen de TypeScript-bron.
- **Alternatieven:** `tsc --noEmit` per package, zoals eerst.
  Dat controleert elk package los en elke keer helemaal.
  Of een echte build per package naar `dist`, die we niet nodig hebben zolang niets gepubliceerd wordt.

## Het designsysteem levert de componenten als TypeScript-bronbestanden

- **Datum:** 22 oktober 2026
- **Besluit:** het package geeft de componenten als TypeScript-bronbestanden, zonder eigen bouwstap, zoals `@fansite/shared` dat al doet.
  De site compileert ze mee.
- **Waarom:** één manier van werken in de hele werkruimte, en geen aparte bouwstap die kan achterlopen op de bron.
- **Alternatieven:** het package naar JavaScript en typebestanden bouwen.
  Dat vraagt een bouwstap en een publicatiepijplijn die we niet nodig hebben, zolang alleen onze eigen site het gebruikt.

## Controles: snel bij de commit, volledig in CI

- **Datum:** 20 oktober 2026
- **Besluit:** husky installeert bij `pnpm install` twee git hooks.
  Voor een commit herstelt lint-staged met ESLint, Stylelint en Prettier wat het kan, alleen in de gestagede bestanden. commitlint controleert of het commitbericht Conventional Commits volgt.
  De workflow CI doet bij elke pull request en op `main` de rest: lint, typecontrole, tests en build.
- **Waarom:** een commit moet snel blijven; de typecontrole van de hele werkruimte past daar niet bij, en CI vangt die toch.
- **Alternatieven:** ook de typecontrole in de pre-commit-hook.
  Grondiger, maar elke commit wordt trager.
- **Later:** de controles van de site worden sinds 26 oktober 2026 bij sommige pull requests overgeslagen; zie _CI slaat de controles van de site over bij wijzigingen die ze niet raken_.
- **Later:** CI is sinds 31 oktober 2026 een reeks jobs naast elkaar in plaats van één opdracht; zie _CI draait in parallelle jobs, met één afsluitende controle_.
  Wat CI draait is gelijk gebleven.

## De toegankelijkheidscontroles draaien op de gebouwde site, in de bestaande CI-job

- **Datum:** 22 oktober 2026
- **Besluit:** Playwright met axe draait in Chromium tegen de standalone build die ook de rooktest gebruikt, met een database met de seed.
  Het is een stap in de job "Lint, typecheck, test and build", na de rooktest.
  Elke pagina staat als één regel in de lijst in `apps/site/e2e/pages.spec.ts`, met het antwoord dat hij moet geven: 200, of 404 voor de pagina 'niet gevonden'.
  Een tikfout in een adres laat de test dus falen in plaats van stil de pagina 'niet gevonden' te toetsen.
- **Zo draait het:** CI geeft de map van de rooktest mee in `SITE_FOLDER`.
  Zonder die variabele zet `pnpm test:a11y` de laatste build zelf klaar in `.next/a11y`, zodat `pnpm build` en de database met de seed genoeg zijn.
  De reviewer kan `assemble` en de seed niet zelf draaien, maar `pnpm test:a11y` staat op zijn lijst.
  Zijn losse regel voor `pnpm exec playwright test` is daarom weggehaald: vanuit de root bestaat die opdracht niet.
- **Waarom:** we toetsen dezelfde pagina's die de host serveert.
  De build en de database zijn er in die job al.
  En de verplichte controle op `main` blijft dezelfde, dus de regels voor `main` veranderen niet.
- **Alternatieven:** een eigen job.
  Die staat apart in de lijst met controles, maar moet opnieuw bouwen of de build doorgeven, en moet als verplichte controle in de regels voor `main`.
  Of toetsen tegen `next dev`; dat is sneller, maar bezoekers krijgen een andere pagina.
  Of ook Firefox en WebKit; die kosten tijd, en axe vindt daar zelden iets anders.
- **Later:** de controles van de site worden sinds 26 oktober 2026 bij sommige pull requests overgeslagen; zie _CI slaat de controles van de site over bij wijzigingen die ze niet raken_.
- **Later:** sinds 31 oktober 2026 is het niet meer een stap in één job maar een eigen job in drie delen; zie _CI draait in parallelle jobs, met één afsluitende controle_.
  De controle die de regels voor `main` eisen is dezelfde gebleven.

## CI gebruikt de Chrome van de runner

- **Datum:** 23 oktober 2026
- **Besluit:** in CI draait Playwright op de Google Chrome die op de runner `ubuntu-latest` staat (`channel: 'chrome'`, als `CI` gezet is).
  De stap `playwright install --with-deps chromium` is weg.
  Lokaal blijft het de Chromium van Playwright, zoals in de README van de site staat.
- **Waarom:** die stap haalde pakketten via `apt` van een Ubuntu-spiegelserver.
  Die was in 14 van de laatste 40 runs zo traag (tot 49,7 kB/s) dat de stap tussen de 1,5 en 10,5 minuut duurde, tegen 16 tot 27 seconden als het goed gaat.
  De tests zelf duren 15 tot 20 seconden.
  Chrome van de runner komt met zijn eigen bibliotheken, dus er hoeft niets gedownload te worden.
- **Gevolg:** CI toetst met de Chrome-versie van de runner, die de beheerders van de image bijwerken, en niet met de Chromium-versie die bij Playwright hoort.
  Het blijft dezelfde engine.
  Faalt er ooit een test alleen in CI, kijk dan eerst naar het verschil in versie.
- **Alternatieven:** de browser cachen; dan draait `apt` nog steeds bij een lege cache.
  Of alleen de bibliotheken installeren die Chromium nodig heeft, zonder de lettertypes; dat is een lijst die we zelf moeten bijhouden.
  Of een container van Playwright voor de job; dat past slecht bij de MariaDB-service.

## axe toetst de pagina's, niet de stories

- **Datum:** 22 oktober 2026
- **Besluit:** de controle met axe in CI toetst de pagina's van de site.
  De stories in Storybook toetst axe alleen in het paneel Toegankelijkheid.
- **Waarom:** een component wordt getoetst op de pagina's die het gebruiken.
  Een browsertest voor alle stories hebben we op 22 oktober al laten liggen (zie _Componenten testen we met Vitest en Testing Library_): hij is zwaarder en overlapt met deze controle.
- **Alternatieven:** de Vitest-addon van Storybook, die elke story met axe toetst in een echte browser.
  Die vangt ook hover en focus per component, maar vraagt een tweede testopzet en maakt CI langer.
  We kijken opnieuw als een component op geen enkele pagina staat.
- **Later:** zie _Axe draait op elke story, in licht en donker_.
  De controle van de pagina's van de site blijft, en de checklist van de reviewer ook.
  Alleen de stories toetst axe nu ook in CI.

## Naast axe drie eigen controles

- **Datum:** 22 oktober 2026
- **Besluit:** de test controleert per pagina ook precies één `h1`, `lang="nl"` en geen horizontaal scrollen bij 320 pixels breed.
  Een test met pagina's die een fout hebben, zoals een link zonder naam, laat zien dat de controle die fout vangt.
- **Waarom:** axe ziet die punten niet of maar half.
  Het ziet of er een `lang` is, niet of die `nl` is, en het meet niet of de pagina bij 400% zoom past.
  Elke controle is een paar regels.
- **Alternatieven:** alleen axe, en de rest aan de checklist laten.
  Of ook de bediening met het toetsenbord en de volgorde van de focus; die zijn lastig betrouwbaar te automatiseren en blijven bij #25.

## E2e-tests alleen voor wat anders ongemerkt kapotgaat

- **Datum:** 22 oktober 2026
- **Besluit:** Playwright test in een echte browser alleen wat axe en de unit-tests niet zien en wat zonder test ongemerkt kapotgaat: axe met onze eigen controles op elke pagina, geen verzoeken naar een ander domein, en de foutpagina zonder database en zonder JavaScript.
  Maten, breedtes en uitlijning krijgen geen e2e-test; die kijk je na in Storybook en in de review.
  Stylelint weigert `100vw` als breedte.
- **Waarom:** een test met een maat moet mee veranderen bij elke keuze in het ontwerp, zoals bij #117, en legt dus het ontwerp vast in plaats van gedrag.
  `home.spec.ts` herhaalde de unit-tests van de homepage.
  Een lintregel vangt `100vw` eerder en goedkoper dan een browser.
  Minder tests in de browser maken CI sneller en een pull request kleiner.
- **Alternatieven:** alle tests laten staan.
  Of de maten in de tests uit de tokens lezen, zodat ze meebewegen; dan testen ze nog steeds het ontwerp.
  Of visuele regressietests met schermafbeeldingen; dat is een nieuw hulpmiddel, en de referentiebeelden vragen onderhoud.

## Alleen Baseline 'widely available', bewaakt door linters

- **Datum:** 21 oktober 2026
- **Besluit:** in CSS en in JavaScript voor de browser gebruiken we alleen functies die Baseline 'widely available' zijn.
  Linters bewaken dat, en `pnpm lint` faalt erop.
  Stylelint controleert alle CSS.
  ESLint controleert de TypeScript van het designsysteem en van de site, behalve bestanden die alleen op de server of tijdens de bouw draaien.
- **Waarom:** zo'n functie werkt al minstens dertig maanden in alle grote browsers.
  Dan zijn er geen voorvoegsels of polyfills nodig, en werkt de site voor iedereen, ook met een oudere browser of een ouder apparaat.
  Een regel in de linter blijft gelden als niemand eraan denkt.
- **Gereedschap:** `stylelint-plugin-use-baseline` voor CSS en `eslint-plugin-baseline-js` voor JavaScript en TypeScript.
  Beide zijn MIT, hebben geen installatiescript en brengen de Baseline-gegevens zelf mee, dus ze doen geen verzoeken naar buiten.
  Een nieuwe versie van het package kan een functie 'widely available' maken; Renovate stelt die voor.
  De ESLint-regel draait met de typen van het project, zodat ook methoden zoals `screen.orientation.lock()` opvallen.
- **Alternatieven:** een lijst van doelbrowsers (browserslist), die een versie per browser vastlegt in plaats van per functie.
  Of ook functies toestaan die 'newly available' zijn; dat geeft nieuwere mogelijkheden, maar sluit bezoekers met oudere browsers uit.
  Voor CSS kan ook `css/use-baseline` van `@eslint/css`, maar dat is een tweede CSS-linter naast Stylelint voor één regel.
- **Later:** zie _De bouw weet welke browsers we ondersteunen: een `browserslist` gelijk aan Baseline 'widely available'_ in `site.md` (7 november 2026): de site heeft toch een `browserslist`, als opdracht aan de bouw en niet als bewaking; de linters bewaken nog altijd wat we schrijven.

## Functies die nog niet zover zijn: `@supports`, of een tijdelijke uitzondering

- **Datum:** 21 oktober 2026
- **Besluit:** een verbetering die niet overal werkt, zoals `accent-color`, `resize`, `::marker` en `text-wrap: balance`, staat binnen `@supports`, zodat andere browsers de standaardopmaak krijgen.
  `light-dark()` in de kleurtokens krijgt één tijdelijke uitzondering: een `stylelint-disable` met de reden en de datum.
  Stylelint meldt die als fout zodra ze overbodig is (`reportNeedlessDisables`).
  Dezelfde regel meldt een `@supports` als overbodig zodra de functie erin 'widely available' is.
  In JavaScript is er geen `@supports`.
  Daar is de tijdelijke uitzondering een `eslint-disable-next-line` met reden en datum, en ESLint meldt een overbodige als fout.
  Er is er nu één: de hint `willReadFrequently` in de contrastmeter van de documentatie, die tot 16 maart 2027 een waarschuwing in de console van Chrome voorkomt.
- **Waarom:** `light-dark()` is bijna zover.
  Volgens de gegevens van de regel wordt ze 'widely available' op 13 november 2026, dertig maanden nadat Safari 17.5 haar kreeg.
  De dertig regels herschrijven met `prefers-color-scheme` zouden we binnen weken weer terugdraaien.
  Een uitzondering die vanzelf faalt als ze niet meer nodig is, blijft niet hangen.
- **Let op:** `text-wrap: balance` wordt op dezelfde dag 'widely available'.
  Zodra de gegevens van de regel dat zeggen, falen de uitzondering en haar `@supports`, en haal je ze weg.
  Kijk dan ook of het `@supports not`-blok met de lichte waarden in `colour.css` nog nodig is (zie _Licht en donker met light-dark()_).
- **Alternatieven:** `light-dark()` nu vervangen door mediaquery's met `prefers-color-scheme`; dat draait het besluit 'Licht en donker met light-dark()' terug.
  Of de regel pas aanzetten als `light-dark()` doorkomt; dan beschermt hij tot die tijd niets.

## GitHub Actions vastgezet op een commit

- **Datum:** 20 oktober 2026
- **Besluit:** een workflow noemt elke action met de volledige SHA van een commit, met de versie als commentaar erachter, zoals `actions/checkout@3d3c42e… # v7.0.1`.
  GitHub dwingt dat af: een workflow met een action die niet zo vastligt, faalt.
  Renovate werkt de SHA en het commentaar samen bij.
- **Waarom:** de eigenaar van een action, of iemand die zijn account overneemt, kan een tag als `v7` naar andere code laten wijzen.
  Een SHA ligt vast.
  Dat telt extra in een openbare repository, en in workflows met schrijfrechten, zoals die voor releases en Storybook.
- **Alternatieven:** vastzetten op de hoofdversie (`@v7`), zoals eerst.
  Nieuwe versies komen dan vanzelf binnen, maar ook zonder dat iemand ze heeft gezien.

## Omgevingsvariabelen

- **Datum:** 20 oktober 2026
- **Besluit:** `.env.example` noemt en beschrijft elke variabele; `.env` zelf staat in `.gitignore`.
  Elke app controleert bij het opstarten zijn variabelen met `parseEnv` uit `@fansite/shared/env`, met een Zod-schema.
  Eén foutmelding noemt alle ontbrekende en ongeldige variabelen.
  Een lege waarde telt als ontbrekend, en de melding herhaalt nooit een waarde, omdat het een geheim kan zijn.
  Secret scanning en push protection van GitHub staan aan.
- **Eén `.env`:** in de root, voor alle apps.
  Next.js leest alleen een `.env` in zijn eigen map, dus `apps/site/next.config.ts` laadt de `.env` uit de root zelf, met `loadEnvConfig` uit `@next/env`.
- **Waarom:** het prototype werd gedeeld met het echte `.env`-bestand erin.
  Een verse clone moet draaien met alleen een ingevulde kopie van `.env.example`, en anders meteen zeggen wat er ontbreekt.
- **Alternatieven:** t3-env (`@t3-oss/env-nextjs`), dat ook client- en servervariabelen scheidt, maar voor de importer niets toevoegt.
  Of zonder controle, met de fout pas als een variabele gebruikt wordt.

## Renovate in plaats van Dependabot

- **Datum:** 20 oktober 2026
- **Besluit:** Renovate houdt de dependencies, pnpm, Node en de GitHub Actions bij, via de GitHub-app van Mend.
  Eén keer per week, met alle kleine updates (minor en patch) in één pull request en een eigen pull request per major-update.
  Een nieuwe versie wacht drie dagen.
  Beveiligingsupdates komen uit de OSV-database en wachten niet op het schema.
  TypeScript blijft onder 7.
- **Waarom:** Dependabot ondersteunt pnpm 12 nog niet officieel.
  Het lockfile van pnpm 12 bestaat uit twee YAML-documenten, en de dependency graph van GitHub leest alleen het eerste.
  Hij ziet dus geen enkele dependency, en geeft ook geen beveiligingsmeldingen ([dependabot-core#15904](https://github.com/dependabot/dependabot-core/issues/15904)).
  Renovate leest dat lockfile sinds juni 2026 wel.
  Het houdt ook monorepo's als Storybook en typescript-eslint vanzelf bij elkaar, en werkt `packageManager` en `.nvmrc` bij.
- **Nadeel:** een app van een andere partij krijgt schrijfrechten op de repository.
- **Commitberichten:** Renovate geeft een update van een dependency die in productie draait de titel `fix(deps)`, en alle andere updates `chore(deps)`, zoals die van de Actions en de dev-dependencies.
  We laten dat zo (besloten op 20 oktober 2026).
  Voor release-please maakt een `fix` een patch-release en een `chore` geen release (zie _Eén versie voor de hele site, met release-please_).
  Een update van een dependency in productie verandert wat bezoekers krijgen, bijvoorbeeld bij een beveiligingsfix, dus die hoort in de changelog.
- **Later:** sinds 1 november 2026 laat Renovate MariaDB en Node op de versie van de host staan (zie _Renovate blijft bij MariaDB 10.11 en Node 24_).
  De rest van dit besluit blijft gelden.
- **Alternatieven:** Dependabot, ingebouwd en zonder extra app.
  Dat bekijken we opnieuw zodra het pnpm 12 ondersteunt.
  Of Renovate zelf draaien als GitHub Action: geen app van een ander, maar wel een token en onderhoud.
  Of elke update `chore(deps)` noemen, zodat een update nooit een release maakt; maar dan blijft een beveiligingsfix liggen tot een andere wijziging een release maakt.

## Conventional Commits in het Engels, ook in de titel van een pull request

- **Datum:** 20 oktober 2026
- **Besluit:** commits volgen Conventional Commits, in Brits Engels, zoals de code.
  We voegen samen met squash, en dan wordt de titel van de pull request de commit op `main`.
  Die titel volgt daarom ook Conventional Commits in het Engels, bijvoorbeeld `feat(site): add the news archive`.
  Een workflow controleert de titel met commitlint.
  De beschrijving van een pull request blijft Nederlands.
- **Wat is er nieuw:** dit beantwoordt de open vraag uit #29.
  De changelog van release-please blijft Engels en technisch.
  De tekst voor de pagina 'Wat is er nieuw' schrijven we per release met de hand, in gewone taal.
  Dat gebeurt in een gewone pull request voordat de release-pull request wordt samengevoegd, want release-please schrijft zijn eigen branch bij elke run opnieuw.
  Hoe de pagina die teksten leest, bepaalt #29.
- **Waarom:** release-please maakt versienummers en changelog uit de commits op `main`.
  De geschiedenis van git blijft zo in één taal.
  En een commitbericht is geen tekst voor bezoekers: ook een Nederlands bericht zou voor 'Wat is er nieuw' herschreven moeten worden.
- **Instelling:** een squash-commit krijgt altijd de titel van de pull request, ook bij een pull request met één commit.
  Anders zou GitHub de titel van die commit nemen.
- **Alternatieven:** een Nederlandse onderwerpregel met een Engels type, zoals `feat(site): nieuwsarchief toevoegen`.
  Dan wordt de changelog Nederlands, en kan #29 met de regels daaruit beginnen.
  Maar de commits op een branch zijn Engels, en de titels op `main` dan niet.
- **Later:** de pagina heet nu Updates en staat op `/updates`; zie _De pagina Wat is er nieuw heet Updates, op `/updates`_.

## Eén versie voor de hele site, met release-please

- **Datum:** 20 oktober 2026
- **Besluit:** de hele repository heeft één versie, in `package.json` in de root.
  De eerste release is 0.1.0, met de tag `v0.1.0`.
  De eigenaar start release-please met `pnpm release` (een handmatige run van de workflow Release); die opent of werkt de release-pull request bij.
  Samenvoegen verhoogt de versie en vult `CHANGELOG.md` aan.
  De samenvoeging wijzigt `.release-please-manifest.json`, en die push start de workflow weer, nu alleen om te taggen en een release op GitHub te maken.
  Tot 1.0.0, dat we voor de lancering bewaren, verhogen een feature en een breaking change het middelste cijfer.
- **Waarom:** de site en de importer gaan samen live, en we publiceren geen packages.
  De release-pull request komt er pas als de eigenaar erom vraagt (besloten op 21 oktober 2026).
  Anders staat er bij elke `feat` of `fix` op `main` een openstaande pull request, en herschrijft release-please zijn branch bij elke merge.
- **Let op:** release-please maakt zijn pull request met het token van GitHub Actions.
  Daarvoor mag GitHub Actions in deze repository pull requests maken.
  Een pull request van een workflow start geen andere workflows, dus de controles ontbreken.
  Sluit de release-pull request en open hem weer; dan starten ze wel.
  Dat staat ook onderaan die pull request.
- **Alternatieven:** een versie per package.
  Of release-please met het token van een eigen GitHub App, zodat de controles vanzelf starten.
  Dat is een geheim meer om te beheren; als het sluiten en openen gaat tegenstaan, stappen we over.

## Regels voor main

- **Datum:** 20 oktober 2026
- **Besluit:** de ruleset 'main' geldt alleen voor `main`.
  Een wijziging komt er alleen via een pull request, samengevoegd met squash, en alleen als drie controles slagen: _Lint, typecheck, test and build_ (CI), _Build Storybook_ en _Conventional Commits title_.
  Niemand mag de regels omzeilen.
  `main` verwijderen of force-pushen kan niet.
  Op andere branches gelden geen regels, zodat je ze kunt rebasen en na het samenvoegen kunt verwijderen.
- **Waarom:** zo kan een pull request met een typefout echt niet samengevoegd worden.
  De vorige ruleset, 'All branches', gold voor elke branch, met de regels _creation_ en _update_.
  Daardoor kon alleen wie de regels mocht omzeilen een branch maken of bijwerken, vroeg elke merge naar `main` om dat vinkje, en konden release-please en Renovate hun eigen branches niet maken.
- **Let op:** de ruleset kent de controles aan hun naam, van de app GitHub Actions.
  Wie een job hernoemt, past de ruleset mee aan.
  In een noodgeval kan een beheerder de ruleset tijdelijk aanpassen.
- **Alternatieven:** de oude ruleset houden en het vinkje blijven zetten.
  Of wie schrijfrechten heeft de regels laten omzeilen; dan kan ook een pull request met een fout erdoor.

## ESLint houdt commentaar op 96 tekens

- **Datum:** 25 oktober 2026
- **Besluit:** de regel `max-len` van ESLint staat aan voor commentaar in JavaScript en TypeScript, op 96 tekens per regel, met `ignoreUrls`.
  De inspringing en het teken voor commentaar tellen mee.
  Voor code zet hij de grens op 1000 tekens: Prettier breekt code af, en een regel in een tekst tussen aanhalingstekens blijft zoals hij is.
  De regel staat na `eslint-config-prettier`, want dat zet `max-len` uit.
  CSS valt erbuiten: stylelint heeft sinds versie 15 geen regel voor de breedte van een regel.
  De 1246 commentaarregels die er al boven zaten, in 250 bestanden, zijn afgebroken.
  Er is geen woord van het commentaar veranderd, behalve de reden achter twee `eslint-disable`-regels die korter moest.
- **Waarom:** Prettier breekt code af op 120 tekens en laat commentaar staan.
  De reviewer vond in zes pull requests commentaarregels van 130 tekens of breder.
  De projecteigenaar koos 96.
  Een deel van het commentaar brak al op die breedte af, zoals de uitleg bovenaan `pullGesture.ts`.
- **Alternatieven:** 125 tekens; dat laat het commentaar van nu bijna zoals het is (55 regels in 43 bestanden).
  120 tekens; dat past bij Prettier, maar vraagt 317 regels in 135 bestanden.
  `@stylistic/max-len`; dat is een nieuwe dependency voor een regel die ESLint zelf nog heeft.
- **Let op:** ESLint heeft `max-len` als verouderd gemarkeerd, en hij kan in een volgende hoofdversie verdwijnen.
  Dan kiezen we opnieuw.

## Renovate blijft bij MariaDB 10.11 en Node 24

- **Datum:** 1 november 2026
- **Besluit:** Renovate stelt geen MariaDB 11 of nieuwer voor en geen Node 25 of nieuwer.
  Dat staat in `.github/renovate.json5`, in twee regels naast die voor TypeScript.
  MariaDB blijft onder 11, voor de image in `compose.yaml` en in de workflows.
  Node en `@types/node` blijven onder 25, voor `.nvmrc` en `engines`.
  Updates binnen MariaDB 10.x en Node 24 blijven komen, en andere grote updates ook, zoals `entities` 9.
  We halen de regels weg als de host een nieuwere versie biedt en we bewust verhuizen.
  Dan veranderen de versies in `compose.yaml`, de workflows, `.nvmrc`, `engines` en `@types/node` in dezelfde pull request.
- **Waarom:** de host draait MariaDB 10.11 en Node 24.20 en kiest niet voor ons.
  Een stap naar MariaDB 13 of Node 26 is dus geen update maar een verhuizing, en de tests en de rooktest draaien nu op de versies van de host.
  Het overzicht van #463 toonde beide sprongen elke week, en iemand kon ze per ongeluk aanvinken.
- **Gevolg:** de pull request voor MariaDB 13 en Node 26 komt niet meer.
  Een nieuwe versie van de host moeten we zelf zien, bijvoorbeeld in _Setup Node.js App_.
- **Alternatieven:** de sprongen elke week laten staan en niet aanvinken, wat ruis in het overzicht geeft en een kans op een vergissing.
  Of de major-updates van deze pakketten uitzetten; dat werkt ook, maar de grens zegt dan niet welke versie de host heeft, en de regel voor TypeScript noemt de versie wel.

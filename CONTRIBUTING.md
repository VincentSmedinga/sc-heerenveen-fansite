# Meedoen

Fijn dat je meedoet aan de sc Heerenveen Fansite.
In de [README](README.md) staat wat de site is en hoe je hem lokaal opzet.
Voor iedereen die meedoet, geldt de [gedragscode](CODE_OF_CONDUCT.md).

## Wie doet wat

AI-agents schrijven het grootste deel van de code.
De projecteigenaar stuurt het werk aan, keurt het goed en voegt elke pull request samen.
Wat agents extra moeten weten, staat in [`AGENTS.md`](AGENTS.md), in het Engels.
Alles in dit bestand geldt voor mensen en voor agents.

## Een idee of een fout melden

Open een [issue](https://github.com/VincentSmedinga/sc-heerenveen-fansite/issues/new/choose) in het Nederlands.
GitHub laat je kiezen tussen een formulier voor een fout en een formulier voor een idee.
Zeg wat je ziet of wilt, en waarom.
Bij een fout helpt het als je schrijft wat je deed en wat er gebeurde.
Een issue is openbaar: zet er geen wachtwoorden of persoonsgegevens in.
Een vraag of een gesprek hoort op het [forum](https://forum.heerenveen.org).

Een issue is klaar om te bouwen als het acceptatiecriteria heeft, in één pull request past, geen open vragen heeft en de projecteigenaar het heeft goedgekeurd.
Die goedkeuring staat onderaan: "Goedgekeurd door de projecteigenaar op `<datum>`."

## Een nieuwe bron voorstellen

De site toont koppen en links van media over sc Heerenveen.
Wil je dat we een bron toevoegen, open dan een issue met het formulier voor een bron.
Daarin vul je in:

- de naam van de bron;
- de website;
- de feed of de podcast, als die er is;
- waarom de bron past: schrijft hij over sc Heerenveen, en hoe vaak?

Wat we van een bron laten zien, hangt af van de regels in het hoofdstuk [Redactie](https://ds.heerenveen.org/?path=/docs/redactie--documentatie) van Storybook.
Van elk item tonen we standaard alleen de kop, de link en de naam van de bron.
Een intro of een foto tonen we alleen met toestemming van de bron.
Een voorstel verandert daar niets aan.

## Zelf een wijziging maken

1. Kies een issue dat klaar is om te bouwen, of vraag in een nieuw issue of je idee past.
2. Maak een branch vanaf een actuele `main`, met een naam zoals onder _Branches_ staat.
3. Bouw de kleinste wijziging die aan de acceptatiecriteria voldoet.
   Doe niets wat het issue niet vraagt; noteer wat je verder opvalt in een nieuw issue.
4. Draai de controles (zie hieronder).
5. Commit.
   De git hooks herstellen de opmaak en controleren je bericht.
6. Open een pull request met het sjabloon in [`.github/pull_request_template.md`](.github/pull_request_template.md) en vink in het issue af wat de pull request levert.
7. De reviewer controleert de pull request (zie _Reviews_).
   De projecteigenaar voegt hem samen, met squash.

### De controles

Draai deze opdrachten voordat je een pull request opent:

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:a11y
pnpm test:stories
```

De tests van `packages/db` draaien op een echte MariaDB.
Start die eerst met `docker compose up -d --wait` (zie de [README van het package](packages/db/README.md)).
`pnpm test:a11y` toetst na de build de pagina's met axe.
Het heeft die database ook nodig, en eenmalig Chromium (zie de [README van de site](apps/site/README.md)).
De gebouwde site maakt zelf de tabellen en zet de echte bronnen erin, en de controle zet de testbronnen erbij.
`pnpm test:stories` opent elke story van het designsysteem in Chrome en toetst hem met axe, één keer in licht en één keer in donker.
Het heeft geen database nodig, en eenmalig Chromium (zie de [README van het designsysteem](packages/design-system/README.md)).
`pnpm test` draait de tests van de componenten zonder browser.
Verandert je wijziging de opmaak of de tekst van een pagina, of een regel in het logboek van de site?
Draai dan na `pnpm build` ook de rooktest, zoals CI dat doet:

```sh
site=$(mktemp -d)/site
pnpm --filter site assemble "$site"
pnpm --filter site smoke "$site"
```

`pnpm test` draait de rooktest niet, en hij heeft dezelfde database nodig.
Na een wijziging in het designsysteem draai je ook `pnpm --filter design-system build-storybook`.

CI draait die controles in jobs naast elkaar, zodat een run niet langer duurt dan de langste keten:

- _Decide which checks to run_ beslist wat de jobs van de site en van de stories doen (zie hieronder);
- _Lint_ draait `pnpm lint`;
- _Typecheck and build_ draait `pnpm typecheck` en `pnpm build`, en zet de map voor de host klaar die de twee jobs van de site gebruiken;
- _Migrate, seed and test_ draait de migraties en de seed op een lege database, en `pnpm test`;
- _Check the stories with axe_ draait `pnpm test:stories`;
- _Check the site_ draait de rooktest en `pnpm test:a11y` op die map, in vier delen die elk een eigen runner en een eigen database hebben: de tests van het project `chromium` in drie delen, en de tests die een artikel schrijven samen met de rooktest;
- _Lint, typecheck, test and build_ wacht op alle andere en is de controle die de regels voor `main` eisen.
  Hij slaagt alleen als elke job is geslaagd, en alleen de jobs van de site en van de stories mogen zijn overgeslagen, en dan alleen als _Decide which checks to run_ dat zei.
  Een job die niet draaide terwijl hij had moeten draaien, een deel dat geen test draaide en een run die is afgebroken maken hem rood (zie `scripts/ci-gate.js` en `scripts/ci-e2e-report.js`, en de beslissing _CI draait in parallelle jobs, met één afsluitende controle_ in `docs/beslissingen.md`).

Hernoem je een job, dan hoeft alleen de naam van de laatste te blijven kloppen met de regels voor `main`.
Draai je `pnpm test:a11y` lokaal, dan draait alles in een keer; de verdeling in delen is er alleen voor CI.

CI slaat de rooktest en `pnpm test:a11y` over bij een pull request die alleen `docs/`, `.claude/`, `AGENTS.md`, `CONTRIBUTING.md`, `README.md`, `apps/importer/` of `apps/design-system-mcp/` wijzigt.
Die controles raken zulke wijzigingen niet, en ze zijn het grootste deel van de machinetijd van een run.
Lint, typecheck, `pnpm test`, de build en de controle van de titel draaien altijd.
`pnpm test:stories` draait alleen bij een wijziging die een story kan raken: in `packages/design-system/`, in het lockfile, in `pnpm-workspace.yaml` of in de workflow zelf.
Een push naar `main`, een handmatige run en het label draaien hem ook.
De controles van de site draaien ook in deze gevallen:

- de pull request wijzigt een bestand dat niet in die lijst staat;
- de pull request wijzigt een `package.json` of een `tsconfig`;
- het is een push naar `main` of een handmatige run.

Wil je ze toch, zet dan het label `volledige controle` op de pull request en start de opdracht opnieuw.
Het log zegt in een regel wat CI besloot en waarom.
De regels staan in `scripts/ci-changes.js`.
De opdrachten hierboven veranderen niet: lokaal draai je alles.

Controleer de titel van de pull request met:

```sh
printf '%s\n' '<titel>' | pnpm exec commitlint
```

## Afspraken

- **Branches:** `<type>/<issue>-<beschrijving>`.
  Het type komt uit Conventional Commits, dan het nummer van het issue, en dan een korte beschrijving in het Engels, in kleine letters met streepjes: `feat/26-news-archive`, `docs/43-agent-guidelines`.
  Heeft je werk geen issue, laat dan het nummer weg.
- **Commits en titels van pull requests:** [Conventional Commits](https://www.conventionalcommits.org/nl/v1.0.0/), in Brits Engels en in de gebiedende wijs: `feat(site): add the news archive`.
  De scope is vrij: het package of de app, zoals `design-system`, `shared`, `site` of `importer`.
  We voegen samen met squash.
  De titel van de pull request wordt dan de commit op `main`, en release-please maakt daar de changelog van.
  commitlint controleert commitberichten in een git hook en titels van pull requests in CI.
- **Taal:** alles wat openbaar is, is Nederlands: issues, beschrijvingen van pull requests, documentatie, Storybook en alle tekst op de site.
  Code, commentaar, commitberichten, titels van pull requests en het gereedschap voor agents (`AGENTS.md` en `.claude/`) zijn Brits Engels: `colour`, `initialise`.
  Hoe je het Nederlands schrijft, staat hieronder.
- **Eén zin per regel** in Markdown- en MDX-bestanden, zodat een wijziging aan een zin één gewijzigde regel in de diff is.
  Een zin in een lijstitem gaat op de volgende regel door, ingesprongen.
  Dit geldt niet voor het sjabloon van de pull request, issues, beschrijvingen van pull requests en reacties: GitHub toont daar elk regeleinde.
- **De club:** schrijf altijd "sc Heerenveen", met een kleine s en c, ook aan het begin van een zin en in de sitenaam, sc Heerenveen Fansite.
  Koppen uit de media houden hun eigen spelling.
- **Woorden:** zeg "import" of "importer".
  Nooit "ingestion".
- **Beslissingen:** een echte keuze tussen alternatieven komt in [`docs/beslissingen.md`](docs/beslissingen.md), in het Nederlands en in het vaste formaat: datum, besluit, waarom en alternatieven.
- **Dependencies:** alleen exacte versies.
  Voeg er geen toe als een paar regels code genoeg zijn.

## Nederlands schrijven

Schrijf zo dat iedereen het de eerste keer begrijpt.

- **Gewone woorden**, ongeveer op taalniveau B1.
  Gebruik een Nederlands woord als er een goed woord bestaat: "samenvoegen", niet "mergen".
  Woorden die mensen al gebruiken, zoals pull request, branch en commit, blijven zoals ze zijn.
- **Zinnen die niet te lang zijn**: ongeveer twintig woorden, met één punt per zin.
  Splits een zin die doorloopt, maar hak de tekst niet in stukjes.
  Gebruik een lijst voor stappen of keuzes.
- **Actief en direct:** "we" voor het project, "je" voor de lezer.
  Zeg wie wat doet: "De reviewer controleert de titel", niet "De titel wordt gecontroleerd".
- **Geen opvulling:** geen stopwoorden als "eigenlijk", "gewoon" of "natuurlijk", geen opening die de tekst aankondigt, geen slot dat de tekst herhaalt en geen verkooppraat.
- **Concreet:** noem het bestand, de opdracht of het getal.
  "Tekst haalt 4,5:1", niet "voldoende contrast".
- **Nederlandse notatie:** datums als "3 november 2026" en een decimale komma: "4,5:1".

De toon van de site zelf, van supporter tot supporter, en de schrijfwijze van spelers, datums en bronnen staan in het hoofdstuk [Redactie](https://ds.heerenveen.org/?path=/docs/redactie--documentatie) van Storybook.

## Reviews

- Een pull request krijgt hoogstens twee reviewrondes.
  Een ronde is een verslag van de reviewer en de verbeteringen die daarop volgen.
  Zegt het tweede verslag nog dat de pull request niet klaar is, dan beslist een mens: samenvoegen zoals hij is, met de hand verbeteren, of de rest in een nieuw issue zetten.
- De reviewer schrijft een verslag met drie onderdelen: code en beveiliging, toegankelijkheid, en redactie en bronbeleid.
  Het verslag staat als reactie bij de pull request.
- Een pull request krijgt geen reviewer als hij alleen Markdown of MDX in `docs/` of `packages/design-system/src/docs/` wijzigt, of verhalen (`*.stories.tsx`) zonder visuele wijziging, zoals een titel, een beschrijving of commentaar.
  Voor die wijzigingen toetst CI de opmaak, de types en de build van Storybook, en dat is alles wat er te controleren valt.
  Een verhaal dat iets visueels verandert, houdt zijn reviewer: geen enkele machine toetst het in licht en donker, op toegankelijkheid of aan de redactieregels.
  Twee bestanden zijn een uitzondering, omdat het de checklists van de reviewer zelf zijn: `docs/toegankelijkheid.md` en `packages/design-system/src/docs/editorial.mdx`.
  Al het andere houdt zijn reviewer, ook de bestanden voor agents en beveiliging: `.claude/`, `.github/`, `AGENTS.md`, `CONTRIBUTING.md` en `SECURITY.md`.
  Zonder reviewer loopt de maker de drie checklists zelf door en schrijft in de beschrijving "Geen reviewer: de pull request wijzigt alleen verhalen of documentatie." in plaats van de vakjes voor de review.
  De projecteigenaar kan altijd om een reviewer vragen.
- We gebruiken geen reviews van Copilot en vragen ze ook niet aan.

Wat de reviewer bij elk onderdeel nakijkt:

- code en beveiliging: de checklist hieronder;
- toegankelijkheid: [`docs/toegankelijkheid.md`](docs/toegankelijkheid.md);
- redactie en bronbeleid: de checklist onderaan het hoofdstuk [Redactie](https://ds.heerenveen.org/?path=/docs/redactie--documentatie) van Storybook.

### Checklist voor code en beveiliging

De reviewer loopt deze checklist door.
Wie een pull request maakt, doet dat zelf al voordat hij hem opent.

- De wijziging voldoet aan elk acceptatiecriterium en doet niets wat het issue niet vroeg.
- Nieuw gedrag heeft tests.
  Elk visueel component heeft een story, en de reviewer kijkt naar de pagina's.
  Een nieuwe pagina staat in de lijst van `apps/site/e2e/pages.spec.ts`.
  Een e2e-test in de browser is er alleen voor wat axe en de unit-tests niet zien en wat zonder test ongemerkt kapotgaat, zoals de foutpagina zonder database of een verzoek naar een ander domein.
  Maten, breedtes en uitlijning krijgen geen e2e-test: die kijk je na in Storybook en in de review.
- CI slaagt: lint, typecheck, tests, build, de toegankelijkheidscontrole, de Storybook-build en de controle van de titel.
- De code volgt de afspraken hierboven en die in [`packages/design-system/README.md`](packages/design-system/README.md).
- Er staan geen geheimen of persoonsgegevens in code, tests, testgegevens of logs.
  Een nieuwe omgevingsvariabele staat in `.env.example` en wordt gecontroleerd met `parseEnv` uit `@fansite/shared/env`.
- Invoer van buiten, zoals feeds, formulieren en URL's, wordt gecontroleerd, en uitvoer wordt veilig weergegeven (geëscaped).
  Er is geen `dangerouslySetInnerHTML` met inhoud van elders.
- Een nieuwe dependency is nodig, wordt onderhouden en staat op een exacte versie.
  De licentie past bij de EUPL-1.2: een vrije licentie zoals MIT, Apache-2.0 of BSD, of een licentie uit de lijst in de bijlage van de EUPL.
  Een installatiescript ervan is gelezen voordat het in `allowBuilds` komt.
- Workflows zetten elke actie vast op een volledige commit-SHA met de versie als commentaar, vragen de minste rechten en geven onbetrouwbare invoer door via omgevingsvariabelen.

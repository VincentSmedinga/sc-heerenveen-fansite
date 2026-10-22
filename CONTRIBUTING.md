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

Open een [issue](https://github.com/VincentSmedinga/sc-heerenveen-fansite/issues/new) in het Nederlands.
Zeg wat je ziet of wilt, en waarom.
Bij een fout helpt het als je schrijft wat je deed en wat er gebeurde.

Een issue is klaar om te bouwen als het acceptatiecriteria heeft, in één pull request past, geen open vragen heeft en de projecteigenaar het heeft goedgekeurd.
Die goedkeuring staat onderaan: "Goedgekeurd door de projecteigenaar op `<datum>`."

## Een nieuwe bron voorstellen

De site toont koppen en links van media over sc Heerenveen.
Wil je dat we een bron toevoegen, open dan een issue en vermeld:

- de naam van de bron;
- de website;
- de feed of de podcast, als die er is;
- waarom de bron past: schrijft hij over sc Heerenveen, en hoe vaak?

Wat we van een bron laten zien, hangt af van de regels in het hoofdstuk [Redactie](https://vincentsmedinga.github.io/sc-heerenveen-fansite/?path=/docs/redactie--documentatie) van Storybook.
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
```

De tests van `packages/db` draaien op een echte MariaDB.
Start die eerst met `docker compose up -d --wait` (zie de [README van het package](packages/db/README.md)).
`pnpm test:a11y` toetst na de build de pagina's met axe.
Het heeft die database ook nodig, en eenmalig Chromium (zie de [README van de site](apps/site/README.md)).
De gebouwde site maakt zelf de tabellen en zet de testbronnen erin.
Na een wijziging in het designsysteem draai je ook `pnpm --filter design-system build-storybook`.
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

De toon van de site zelf, van supporter tot supporter, volgt in de stijlgids (#19).

## Reviews

- Een pull request krijgt hoogstens twee reviewrondes.
  Een ronde is een verslag van de reviewer en de verbeteringen die daarop volgen.
  Zegt het tweede verslag nog dat de pull request niet klaar is, dan beslist een mens: samenvoegen zoals hij is, met de hand verbeteren, of de rest in een nieuw issue zetten.
- De reviewer schrijft een verslag met drie onderdelen: code en beveiliging, toegankelijkheid, en redactie en bronbeleid.
  Het verslag staat als reactie bij de pull request.
- We gebruiken geen reviews van Copilot en vragen ze ook niet aan.

Wat de reviewer bij elk onderdeel nakijkt:

- code en beveiliging: de checklist hieronder;
- toegankelijkheid: [`docs/toegankelijkheid.md`](docs/toegankelijkheid.md);
- redactie en bronbeleid: de checklist onderaan het hoofdstuk [Redactie](https://vincentsmedinga.github.io/sc-heerenveen-fansite/?path=/docs/redactie--documentatie) van Storybook.

### Checklist voor code en beveiliging

De reviewer loopt deze checklist door.
Wie een pull request maakt, doet dat zelf al voordat hij hem opent.

- De wijziging voldoet aan elk acceptatiecriterium en doet niets wat het issue niet vroeg.
- Nieuw gedrag heeft tests.
  Wat bezoekers zien, heeft een story, nagekeken in licht en donker.
  Een nieuwe pagina staat in de lijst van `apps/site/e2e/pages.spec.ts`.
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

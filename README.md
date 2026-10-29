# sc-heerenveen-fansite

De fansite over sc Heerenveen – sinds 1997.

## Wat is dit?

De sc Heerenveen Fansite draaide van 1997 tot 2006.
Nu komt hij terug als nieuwssite van supporters.
We laten koppen en links zien van media die over sc Heerenveen schrijven, en sturen lezers zo naar de journalistiek zelf.
Van elk item tonen we standaard alleen de kop, de link en de naam van de bron.
Een intro of een foto tonen we alleen als de bron daar toestemming voor geeft.

We maken er geen winst mee en hebben geen advertenties.
We laten bezoekers met rust: geen cookies die je volgen, geen profielen en geen gegevens die we verkopen.
De site moet voor iedereen werken, ook met een toetsenbord of een schermlezer.

## Meedoen

Lees [`CONTRIBUTING.md`](CONTRIBUTING.md) om te zien hoe je een idee, een fout of een nieuwe bron meldt, en hoe je zelf een wijziging maakt.
Voor iedereen geldt de [gedragscode](CODE_OF_CONDUCT.md).

## Ontwikkelen

Je hebt Node 24 en pnpm 12 nodig.
Met `corepack enable` krijg je vanzelf de goede versie van pnpm.

```sh
pnpm install
cp .env.example .env
pnpm --filter design-system storybook
```

Vul in `.env` de waarden in; `.env.example` zegt waar elke variabele voor is.
`.env` komt nooit in de repository.

Start de site met `pnpm --filter site dev`; die luistert op <http://localhost:3000>.

| Opdracht                 | Wat het doet                                                                 |
| ------------------------ | ---------------------------------------------------------------------------- |
| `pnpm lint`              | ESLint, Stylelint en Prettier                                                |
| `pnpm format`            | Prettier zet de opmaak recht                                                 |
| `pnpm typecheck`         | TypeScript in alle packages                                                  |
| `pnpm test`              | De tests van alle packages, van de hooks en van de linters                   |
| `pnpm build`             | De build van alle packages                                                   |
| `pnpm test:a11y`         | axe op de pagina's van de gebouwde site, na `pnpm build`                     |
| `pnpm test:stories`      | axe op elke story van het designsysteem, in licht en donker                  |
| `pnpm run import`        | Haalt de feeds, de wedstrijden en de selectie op                             |
| `pnpm run import:status` | Toont per feed, voor de wedstrijden en de selectie of ze gezond zijn         |
| `pnpm run import:season` | Leest eenmalig een afgelopen seizoen, zoals `pnpm run import:season 2025/26` |
| `pnpm release`           | Opent of werkt de release-pull request bij (vraagt `gh`)                     |
| `pnpm review <branch>`   | Start de site en Storybook voor een branch of pull request                   |
| `pnpm review:stop`       | Stopt ze weer                                                                |
| `pnpm screenshots`       | Maakt plaatjes van een draaiende build voor een pull request                 |
| `pnpm rollover`          | Schuift het bord naar de nieuwe week (vraagt `gh`)                           |

Na `pnpm release` en vóór je de release-pull request samenvoegt, schrijft de Coordinator de Nederlandse zinnen voor de pagina Updates.
Een kleine pull request zet ze in [`apps/site/src/release-notes.ts`](apps/site/src/release-notes.ts).
Zonder zinnen toont de pagina de nieuwe versie niet.

De database draait in Docker.
Start hem met `docker compose up -d --wait`, en maak dan de tabellen met `pnpm db:migrate`.
Zonder database slagen de tests van `packages/db` niet.
[`packages/db`](packages/db/README.md) legt de opdrachten `pnpm db:generate`, `pnpm db:migrate` en `pnpm db:seed` uit, en de opdrachten `pnpm db:backup` en `pnpm db:restore` voor een dump van de database.

`pnpm install` zet ook twee git hooks klaar.
Vóór elke commit herstellen ESLint, Stylelint en Prettier wat ze kunnen; een fout die overblijft, houdt de commit tegen.
Daarna controleert commitlint of het bericht [Conventional Commits](https://www.conventionalcommits.org/nl/v1.0.0/) volgt.
Schrijf het in het Engels.
Dat geldt ook voor de titel van een pull request, want die wordt bij het samenvoegen de commit op `main`.

- [`apps/design-system-mcp`](apps/design-system-mcp/README.md): de MCP-server van het designsysteem, op ds.heerenveen.org/mcp
- [`apps/importer`](apps/importer/README.md): de importer, met de fetcher die bronnen ophaalt en de adapter voor RSS- en Atom-feeds
- [`apps/site`](apps/site/README.md): de site
- [`packages/db`](packages/db/README.md): de database, met het schema, de migraties en de seed
- [`packages/design-system`](packages/design-system/README.md): huisstijl, tokens, componenten en Storybook
- [`packages/shared`](packages/shared/README.md): hulpfuncties voor de site en de importer, zoals de controle van omgevingsvariabelen
- [`docs/beslissingen.md`](docs/beslissingen.md): welke keuzes we hebben gemaakt, en waarom
- [`docs/designsysteem-publiceren.md`](docs/designsysteem-publiceren.md): hoe Storybook op ds.heerenveen.org staat, en wat de eigenaar daarvoor instelt
- [`docs/acceptatieomgeving.md`](docs/acceptatieomgeving.md): hoe de acceptatieomgeving op de hosting staat, en wat de eigenaar daarvoor instelt
- [`docs/bronnen.md`](docs/bronnen.md): welke bronnen we hebben beoordeeld, en wat we over elke bron besloten
- [`docs/artikelen.md`](docs/artikelen.md): hoe je een artikel van de redactie schrijft, welke opmaak het kent, en hoe de eigenaar het met SQL publiceert
- [`docs/toegankelijkheid.md`](docs/toegankelijkheid.md): wat een mens of de reviewer nakijkt op toegankelijkheid, naast de automatische controles
- [`CONTRIBUTING.md`](CONTRIBUTING.md): hoe je meedoet, en de afspraken voor issues, branches, pull requests en taal
- [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md): de gedragscode
- [`AGENTS.md`](AGENTS.md): werkafspraken voor AI-agents, in het Engels

## Het bord klaarzetten voor een nieuwe week

Het veld Iteratie van het projectbord loopt niet vanzelf door.
Draai elke maandag vanuit de map van de repository:

```sh
pnpm rollover
pnpm rollover --apply
```

Zonder `--apply` is het een dry run: de opdracht laat zien wat hij zou veranderen en verandert niets.
Met `--apply` voert hij het uit.
Hij gebruikt alleen `gh` en de GraphQL-API van GitHub, en leest de iteraties uit het veld zelf.

- Een gesloten issue op het bord zonder iteratie krijgt de iteratie van de dag waarop het dicht ging.
- Een open issue met status Bezig in een voorbije iteratie gaat naar de iteratie van vandaag.
- Open issues met status Te doen blijven zoals ze zijn.
- Daarna drukt hij af wat in de vorige iteratie klaar kwam, per mijlpaal.
- Issues die niet op het bord staan, slaat hij over.
  Hij telt ze en noemt hun nummers.

Past een datum in geen enkele iteratie, dan stopt hij met een melding en verandert hij niets.
Voeg dan iteraties toe in de instellingen van het project, bij het veld Iteratie, en draai de opdracht opnieuw.

## Een branch bekijken

Wil je zien wat een pull request doet, draai dan vanuit de map van de repository:

```sh
pnpm review 124
pnpm review feat/120-bigger-type
```

Je geeft het nummer van een pull request of de naam van een branch.
Bij een nummer zoekt de opdracht de branch met `gh`.
Een branch die op je computer staat, neemt hij zoals hij daar is, ook met commits die nog niet gepusht zijn.
Wijzigingen die niet zijn gecommit, ziet hij niet.
Een branch die alleen op GitHub staat, en een pull request, neemt hij van GitHub.
Hij zet de commit klaar in `../sc-heerenveen-fansite-review`, naast de repository.
Dat is een git-worktree zonder lokale branch.
Hij kopieert `.env` uit de repository als de reviewmap er nog geen heeft, installeert de dependencies, start de database en draait de migraties en de seed van die branch.
De import draait hij niet: de koppen zijn die van de laatste `pnpm run import`.

Daarna stopt hij de site en Storybook van de fansite die al op poort 3000 en 6006 draaien, uit welke map ook.
Houdt iets anders een van die poorten bezet, dan stopt hij met een melding en verandert hij niets.
Heeft de reviewmap wijzigingen die niet gecommit zijn, dan stopt hij ook, en verandert hij niets.
Hij start de site op <http://localhost:3000> en Storybook op <http://localhost:6006>, allebei op de achtergrond, en opent ze in je browser.
Ze openen op de pagina die de branch verandert, gevonden in de bestanden die van `main` verschillen: een pagina van de site, en de documentatie van een onderdeel of document in Storybook.
Verandert de branch geen pagina, dan openen ze op de beginpagina.
De samenvatting in de terminal zegt waar de commit vandaan komt (rij `Source`) en welke pagina's hij opent.
De uitvoer van beide staat in `review.log` in de reviewmap.
In het tabblad van de site en in de zijbalk van Storybook staat de naam van de branch, zodat je ziet wat er draait.
Dat gebeurt alleen in ontwikkeling: acceptatie, productie en de Storybook op ds.heerenveen.org tonen hem nooit.

Stop ze met:

```sh
pnpm review:stop
```

De reviewmap en de lokale database zijn voor alle branches dezelfde.
Een migratie van een nieuwere branch blijft dus in de database staan als je daarna een oudere branch bekijkt.
Wil je opnieuw beginnen, dan wist `docker compose down --volumes` de database.
De opdracht gebruikt `lsof` om te zien wat een poort bezet houdt, en neemt alleen branches uit deze repository, geen forks.

## Licentie

Copyright (c) 2026 Vincent Smedinga.
Licensed under the EUPL.

De code en onze eigen teksten vallen onder de [EUPL-1.2](LICENSE), de European Union Public Licence.
Er is ook een [officiële Nederlandse tekst](https://eupl.eu/1.2/nl/) die even zwaar weegt.

Dit valt er niet onder:

- de lettertypes, die hun eigen open licentie houden (OFL);
- de tekst van de gedragscode, die van de Contributor Covenant komt;
- het clubwapen en andere beelden en teksten van derden;
- de wedstrijdgegevens en de selectie, die we van de Nederlandse Wikipedia nemen en daarom onder [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.nl) publiceren.

Wie de code al onder MIT heeft ontvangen, houdt die rechten voor die versies.

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

| Opdracht                 | Wat het doet                                               |
| ------------------------ | ---------------------------------------------------------- |
| `pnpm lint`              | ESLint, Stylelint en Prettier                              |
| `pnpm format`            | Prettier zet de opmaak recht                               |
| `pnpm typecheck`         | TypeScript in alle packages                                |
| `pnpm test`              | De tests van alle packages, van de hooks en van de linters |
| `pnpm build`             | De build van alle packages                                 |
| `pnpm test:a11y`         | axe op de pagina's van de gebouwde site, na `pnpm build`   |
| `pnpm run import`        | Haalt de feeds van de bronnen op en bewaart de koppen      |
| `pnpm run import:status` | Toont per feed of hij gezond is, en de laatste fout        |
| `pnpm release`           | Opent of werkt de release-pull request bij (vraagt `gh`)   |
| `pnpm review <branch>`   | Start de site en Storybook voor een branch of pull request |
| `pnpm review:stop`       | Stopt ze weer                                              |

Na `pnpm release` en vóór je de release-pull request samenvoegt, schrijft de Coordinator de Nederlandse zinnen voor de pagina Wat is er nieuw.
Een kleine pull request zet ze in [`apps/site/src/release-notes.ts`](apps/site/src/release-notes.ts).
Zonder zinnen toont de pagina de nieuwe versie niet.

De database draait in Docker.
Start hem met `docker compose up -d --wait`, en maak dan de tabellen met `pnpm db:migrate`.
Zonder database slagen de tests van `packages/db` niet.
[`packages/db`](packages/db/README.md) legt de opdrachten `pnpm db:generate`, `pnpm db:migrate` en `pnpm db:seed` uit.

`pnpm install` zet ook twee git hooks klaar.
Vóór elke commit herstellen ESLint, Stylelint en Prettier wat ze kunnen; een fout die overblijft, houdt de commit tegen.
Daarna controleert commitlint of het bericht [Conventional Commits](https://www.conventionalcommits.org/nl/v1.0.0/) volgt.
Schrijf het in het Engels.
Dat geldt ook voor de titel van een pull request, want die wordt bij het samenvoegen de commit op `main`.

- [`apps/importer`](apps/importer/README.md): de importer, met de fetcher die bronnen ophaalt en de adapter voor RSS- en Atom-feeds
- [`apps/site`](apps/site/README.md): de site
- [`packages/db`](packages/db/README.md): de database, met het schema, de migraties en de seed
- [`packages/design-system`](packages/design-system/README.md): huisstijl, tokens, componenten en Storybook
- [`packages/shared`](packages/shared/README.md): hulpfuncties voor de site en de importer, zoals de controle van omgevingsvariabelen
- [`docs/beslissingen.md`](docs/beslissingen.md): welke keuzes we hebben gemaakt, en waarom
- [`docs/acceptatieomgeving.md`](docs/acceptatieomgeving.md): hoe de acceptatieomgeving op de hosting staat, en wat de eigenaar daarvoor instelt
- [`docs/toegankelijkheid.md`](docs/toegankelijkheid.md): wat een mens of de reviewer nakijkt op toegankelijkheid, naast de automatische controles
- [`CONTRIBUTING.md`](CONTRIBUTING.md): hoe je meedoet, en de afspraken voor issues, branches, pull requests en taal
- [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md): de gedragscode
- [`AGENTS.md`](AGENTS.md): werkafspraken voor AI-agents, in het Engels

## Een branch bekijken

Wil je zien wat een pull request doet, draai dan vanuit de map van de repository:

```sh
pnpm review 124
pnpm review feat/120-bigger-type
```

Je geeft het nummer van een pull request of de naam van een branch.
Bij een nummer zoekt de opdracht de branch met `gh`.
Hij zet de laatste commit van die branch op GitHub klaar in `../sc-heerenveen-fansite-review`, naast de repository.
Dat is een git-worktree zonder lokale branch.
Hij kopieert `.env` uit de repository als de reviewmap er nog geen heeft, installeert de dependencies, start de database en draait de migraties en de seed van die branch.
De import draait hij niet: de koppen zijn die van de laatste `pnpm run import`.

Daarna stopt hij de site en Storybook van de fansite die al op poort 3000 en 6006 draaien, uit welke map ook.
Houdt iets anders een van die poorten bezet, dan stopt hij met een melding en verandert hij niets.
Heeft de reviewmap wijzigingen die niet gecommit zijn, dan stopt hij ook, en verandert hij niets.
Hij start de site op <http://localhost:3000> en Storybook op <http://localhost:6006>, allebei op de achtergrond, en opent ze in je browser.
De uitvoer van beide staat in `review.log` in de reviewmap.
In het tabblad van de site en in de zijbalk van Storybook staat de naam van de branch, zodat je ziet wat er draait.
Dat gebeurt alleen in ontwikkeling: acceptatie, productie en de Storybook op GitHub Pages tonen hem nooit.

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
- de wedstrijdgegevens, waarover een apart besluit volgt (#39).

Wie de code al onder MIT heeft ontvangen, houdt die rechten voor die versies.

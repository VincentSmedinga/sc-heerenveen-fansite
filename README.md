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

| Opdracht         | Wat het doet                                                  |
| ---------------- | ------------------------------------------------------------- |
| `pnpm lint`      | ESLint, Stylelint en Prettier                                 |
| `pnpm format`    | Prettier zet de opmaak recht                                  |
| `pnpm typecheck` | TypeScript in alle packages                                   |
| `pnpm test`      | De tests van alle packages en van de hooks in `.claude/hooks` |
| `pnpm build`     | De build van alle packages                                    |

`pnpm install` zet ook twee git hooks klaar.
Vóór elke commit herstellen ESLint, Stylelint en Prettier wat ze kunnen; een fout die overblijft, houdt de commit tegen.
Daarna controleert commitlint of het bericht [Conventional Commits](https://www.conventionalcommits.org/nl/v1.0.0/) volgt.
Schrijf het in het Engels.
Dat geldt ook voor de titel van een pull request, want die wordt bij het samenvoegen de commit op `main`.

- [`packages/design-system`](packages/design-system/README.md): huisstijl, tokens en Storybook
- [`packages/shared`](packages/shared/README.md): hulpfuncties voor de site en de importer, zoals de controle van omgevingsvariabelen
- [`docs/beslissingen.md`](docs/beslissingen.md): welke keuzes we hebben gemaakt, en waarom
- [`docs/toegankelijkheid.md`](docs/toegankelijkheid.md): wat een mens of de reviewer nakijkt op toegankelijkheid, naast de automatische controles
- [`CONTRIBUTING.md`](CONTRIBUTING.md): hoe je meedoet, en de afspraken voor issues, branches, pull requests en taal
- [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md): de gedragscode
- [`AGENTS.md`](AGENTS.md): werkafspraken voor AI-agents, in het Engels

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

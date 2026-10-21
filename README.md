# sc-heerenveen-fansite

De fansite over sc Heerenveen – sinds 1997.

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
- [`AGENTS.md`](AGENTS.md): werkafspraken voor AI-agents, in het Engels, en tot er een bijdragegids is ook de regels voor mensen

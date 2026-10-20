# sc-heerenveen-fansite

De fansite over sc Heerenveen – sinds 1997.

## Ontwikkelen

Je hebt Node 24 en pnpm 12 nodig. Met `corepack enable` krijg je vanzelf de goede versie van pnpm.

```sh
pnpm install
pnpm --filter design-system storybook
```

| Opdracht         | Wat het doet                  |
| ---------------- | ----------------------------- |
| `pnpm lint`      | ESLint, Stylelint en Prettier |
| `pnpm format`    | Prettier zet de opmaak recht  |
| `pnpm typecheck` | TypeScript in alle packages   |

- [`packages/design-system`](packages/design-system/README.md): huisstijl, tokens en Storybook
- [`docs/beslissingen.md`](docs/beslissingen.md): welke keuzes we hebben gemaakt, en waarom

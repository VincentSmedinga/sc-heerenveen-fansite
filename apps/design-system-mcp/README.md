# @fansite/design-system-mcp

De MCP-server van het designsysteem, op <https://ds.heerenveen.org/mcp>.
Hij geeft de documentatie van de gepubliceerde Storybook aan agents: de gereedschappen `docs-list`, `docs-show` en `docs-show-story` van `@storybook/mcp`.
Hoe hij op de hosting draait en wat de eigenaar daarvoor instelt, staat in [`docs/designsysteem-publiceren.md`](../../docs/designsysteem-publiceren.md).
De keuzes erachter staan in [`docs/beslissingen.md`](../../docs/beslissingen.md), onder _De MCP-server van het designsysteem staat op ds.heerenveen.org/mcp_.

`@storybook/mcp` is een bibliotheek, geen server, en nog een voorbeeldversie ("preview") waarvan de API kan veranderen.
De versie staat daarom vast op die van Storybook (10.6.3), en gaat pas omhoog als iemand dat bewust doet en de test hieronder nog slaagt.

## Zo werkt het

- `src/main.ts` start een `node:http`-server op `PORT` (de host zet die zelf).
  Hij leest de manifests uit `STORYBOOK_DIR`, of anders uit `../public_html` naast de map waarin `server.mjs` staat.
- `src/server.ts` beantwoordt alleen `POST` op `/mcp`, met een body tot 64 kB, en geeft voor elk verzoek een nieuwe handler van `@storybook/mcp`.
  De server houdt dus geen sessie bij: elk verzoek is los te beantwoorden, ook door een ander proces.
- `src/manifests.ts` leest `.json`-bestanden onder `manifests/`, bij elk verzoek opnieuw.
  Zo laat de bibliotheek nooit een verzoek naar een ander adres doen, en toont een deploy zich meteen.
- `pnpm --filter @fansite/design-system-mcp build` bundelt alles tot `dist/server.mjs`, één bestand zonder `node_modules`.

## Draaien en testen

```sh
pnpm --filter design-system build-storybook
pnpm --filter @fansite/design-system-mcp build
STORYBOOK_DIR=packages/design-system/storybook-static PORT=3124 node apps/design-system-mcp/dist/server.mjs
claude mcp add --transport http ds-local http://127.0.0.1:3124/mcp
```

- `pnpm --filter @fansite/design-system-mcp test` start de server tegen een kleine kopie van de manifests, met dezelfde vorm als die van Storybook (`src/fixtures/manifests/`), want de manifests van de hele build zijn 200 kB.
  De test toont dat `docs-list` de componenten noemt, dat `docs-show` voor `Heading` de props met hun typen geeft, dat de server weigert wat hij moet weigeren, en dat hij geen verzoek van zichzelf doet.
- `pnpm --filter @fansite/design-system-mcp smoke <map met een gebouwde Storybook>` start `dist/server.mjs` twee keer, in een map die lijkt op die van de host, en vraagt beide wat een agent vraagt.
  Het controleert dat `docs-list` elk component van die build noemt, en dat een tweede proces een client beantwoordt die op het eerste begon.
  CI draait het op de build die het gaat deployen.
- `scripts/check.js <adres> <map met een gebouwde Storybook> [seconden]` is dezelfde controle op een adres.
  De workflow draait het na een deploy tegen `https://ds.heerenveen.org/mcp`.

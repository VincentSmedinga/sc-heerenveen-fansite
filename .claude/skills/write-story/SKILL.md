---
name: write-story
description: Write or change a design system component, its stories and its Storybook page, in our CSF Next conventions. Use as the Builder when an issue adds or changes anything in packages/design-system that visitors see.
argument-hint: <issue number>
---

# Components and stories

You are the Builder of issue $ARGUMENTS, and it touches the design system.
The conventions are in `packages/design-system/README.md` (_Afspraken_), the decisions in `docs/beslissingen.md`, and the Storybook server's own instructions are generic: where they differ, ours win.
Use `builder-workflow` for everything around this.

## 1. Ask the Storybook server first

- `docs-list` once, then `docs-show` for each component you use or change.
  Don't dig the props out of the code, and don't assume a prop exists: if the server doesn't show it, it doesn't exist.
- Call `get-storybook-story-instructions` before you write a story.
- The server shows the Storybook of whichever worktree started it, and two worktrees can't both use port 6006.
  See _The Storybook server_ in `AGENTS.md` for how to start yours (`pnpm --filter design-system storybook --no-open --exact-port`) and to leave another worktree's alone.
  Read your own changes in your own code, not through the server.
- If the tools are missing after you started Storybook, say so once and carry on from the code.

## 2. The component

Follow _Afspraken_ in the README of the design system:

- pure CSS in the component's own file (`heading/heading.css`), classes and custom properties with `hf-`, the right cascade layer, logical properties, semantic colour tokens (never the primitives);
- one React component per element or part, with typed props; a part that belongs to one parent is a property of it (`List.Item`, `Page.Header`); no hooks or state means it stays a server component;
- only Baseline 'widely available' features: `pnpm lint` fails otherwise, and a newer one goes in `@supports`;
- no request to a third party: no fonts, scripts, images or embeds from another domain.

## 3. The stories

The format is CSF Next, not the CSF 3 of the generic instructions.
Copy the shape of `src/components/card/Card.stories.tsx`:

- `import preview from '#.storybook/preview'`, then `preview.meta({ … })` with `title: 'Componenten/<Name>'`, `tags: ['autodocs']`, `component`, and `parameters.docs.page: ControlsDocsPage`;
- `argTypes` with a short Dutch `description` per prop, and the union types in `table.type.summary` (the compiler gives `unknown[number]` for the lists; the `union()` helper in the Card stories shows how);
- stories with `meta.story({ name, render, … })`, with Dutch names;
- made-up content only: `Testkrant`, `Testclub`, links as `#…`, no real headlines, names or addresses.

What goes in them was decided on 23 October 2026 in the open issue #123 (_Wat staat er op een pagina in Storybook?_).
The decisions aren't in `docs/beslissingen.md` yet, so check there first for a newer one; until then:

- **Text:** one paragraph on why the component exists and when to choose it.
  No rem, px, breakpoints or margins: those belong in the code and in `docs/beslissingen.md`.
  A usage rule a reader needs may be one sentence.
- **Stories:** the example with controls, and one story for each variant that looks different (not for each prop).
  Light and dark come from the theme switch of Storybook; a component that changes with the theme itself, such as on a dark surface, gets its own dark story (`globals: { theme: 'dark' }`).
- **Hover, focus and visited:** not in every component's stories; the stories for links and forms show them once.
- **Controls:** once more than one prop changes the result.
- Don't clean the documentation of other components in this change; it has its own issues.

## 4. Tests and checks

- Tests with Vitest and Testing Library in the component's folder (`Card.test.tsx`), for new behaviour; a test that fails when the behaviour breaks.
- `pnpm --filter design-system test`, `pnpm lint`, `pnpm typecheck`, and `pnpm --filter design-system build-storybook`.
- The Storybook tool `stories-preview` after anything that changes how the UI looks; put the preview links in your report to the owner.
- Look at the result in light and dark (the theme switch), at a phone width and a desktop width, and with the keyboard.
  Go through the topics of `docs/toegankelijkheid.md` that apply (focus, contrast, names of controls, touch size).
- The story ids are the inputs for screenshots: see `pr-screenshots`.

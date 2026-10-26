---
name: write-dutch
description: Write or check the Dutch of anything public in this project (issues, pull request bodies, documentation, Storybook texts, site texts, release notes) and choose the right language for what you write. Use whenever you write text that people outside the session will read.
---

# Writing for this project

The rules are in _Afspraken_ and _Nederlands schrijven_ in `CONTRIBUTING.md`, which wins where this differs.
This skill is the checklist and the places where it goes wrong.

## Which language?

| What                                                                                                                                              | Language        |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| Issues, pull request descriptions, comments on GitHub, documentation, Storybook texts, all text on the site, the Reviewer's report, release notes | Dutch           |
| Code, comments, commit messages, pull request titles, `AGENTS.md`, agents and skills in `.claude/`                                                | British English |
| Plans and notes for the owner alone, and your chat replies to the owner                                                                           | British English |

- Ask whether a text will go public before you choose.
- The label `good first issue` stays English: GitHub's newcomer features rely on that exact name.
- The Storybook interface is English; everything we write in it is Dutch.

## Words

- **Club:** always "sc Heerenveen", a small s and c, also at the start of a sentence and in "sc Heerenveen Fansite".
  A headline from the media keeps its own spelling.
- **Import:** say "import" or "importer", never "ingestion".
  "Fetcher" only for the HTTP layer.
- **Ordinary words**, about B1: "samenvoegen", not "mergen".
  Words people already use stay: pull request, branch, commit.
- **No filler:** no "eigenlijk", "gewoon" or "natuurlijk", no opening that announces the text, no closing that repeats it, no selling.
- **Concrete:** name the file, the command or the number.
  "Tekst haalt 4,5:1", not "voldoende contrast".
- **Dutch notation:** "3 november 2026", and a decimal comma: "4,5:1".
- **Active and direct:** "we" for the project, "je" for the reader, and say who does what: "De reviewer controleert de titel".

## Sentences

- About twenty words at most, one full stop per sentence.
  Split a sentence that runs on, but don't chop the text into scraps.
  Use a list for steps or choices.
- Never two sentences joined by a comma.
- The tone of the site itself, from supporter to supporter, comes with the style guide (#19); until then, release notes are the model (see `release-notes`).

## Line breaks

- **In `.md` and `.mdx` files:** one sentence per line, so a change to a sentence is one changed line in the diff.
  A sentence in a list item continues on the next line, indented.
- **On GitHub (issues, pull request bodies, comments, the Reviewer's report):** a paragraph is one line.
  GitHub shows every line break, so one sentence per line renders as a column of short lines.
  This is the mistake agents repeat most.
  Check a posted body with `gh pr view <number> --json body`.
  Edit a body from its current text: a Builder ticking boxes in the same body is overwritten by an old copy.
- In Storybook texts: no values in rem, px or breakpoints (see `write-story`).

## Check before you finish

These print nothing when the change is fine (from `AGENTS.md`):

```sh
git diff -U0 origin/main...HEAD -- . ':!*.md' ':!*.mdx' ':!*.json' ':!pnpm-lock.yaml' | grep -E '^\+[[:space:]]*(//|/\*|\*)' | grep -E '^.{98,}'
git diff -U0 origin/main...HEAD -- '*.md' '*.mdx' | grep -E '^\+.*[a-z0-9)`][.!?] [A-Z]' | grep -vE '^\+[[:space:]]*\|'
```

The first finds comment lines over 96 characters; the second finds two sentences on one line.
Then read the Dutch once more: ordinary words, no sentence of more than about twenty words, no comma between two sentences.

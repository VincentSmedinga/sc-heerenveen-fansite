---
name: record-decision
description: Write a decision into docs/beslissingen.md in the fixed format, in the right section, with Later lines on the decisions it replaces. Use as the Builder or the Coordinator when a real choice between alternatives is made.
argument-hint: <title of the decision>
---

# Record a decision

`docs/beslissingen.md` holds what we decided and why, in Dutch.
A pull request is done when the decisions it makes are in it (_Definition of Done_ in `AGENTS.md`).

## Is it a decision?

- A real choice between alternatives, or a question that was open and is closed now: yes.
- A design tweak, an intermediate result, a bug fix, a rename without a reason, or something the code already says: no.
- Something that is still open belongs in the issue, or in the text as _voorlopig_ — never as a decision.
- The Coordinator writes the decisions of a specification into the issue, under "Beslissingen".
  The Builder then adds them to the file, with its own.
  A decision that belongs to no issue gets its own small pull request, with the owner's go-ahead; it has no Reviewer, because it only changes a file in `docs/`.

## Where

The file has the sections _Project_, _Werkwijze_, _Hosting en data_, _Werkruimte_, _Designsysteem_, _Site_, _Importer_ and _Redactie_.
Put the decision at the end of the section it belongs to; a section runs roughly by date, newest last, and a decision about a topic may sit next to the older ones on that topic.
Read the entries around it first, and every older decision it touches.

## The format

```markdown
### <Title: the decision as a statement>

- **Datum:** 26 oktober 2026
- **Besluit:** what we do, in a sentence or two.
  Details as a list, each item on one line.
- **Waarom:** the reason, with numbers or names where there are any.
- **Nadeel:** (optional) what it costs us.
- **Gevolg:** (optional) what changes for others.
- **Alternatieven:** what we considered, and why not.
```

- The title says what we decided ("We nemen ESPN NL, met het filter `club`"), not what the topic is.
- The date is the day of the decision, in Dutch, as "26 oktober 2026".
- _Waarom_ and _Alternatieven_ are never left out.
- In Dutch, as _Nederlands schrijven_ in `CONTRIBUTING.md` says (see `write-dutch`), with one sentence per line.

## When it replaces an older decision

- Add a line to the **old** decision: `- **Later:** zie _<title of the new decision>_.`
  Say in the same line what stays valid, if something does ("De rollen blijven die van NL Design System; alleen de schrijfwijze is veranderd.").
- Leave the old text as it is: it is history.
  A name that changed stays in the older entries and in `CHANGELOG.md`.
- Before you finish, `git grep` the old wording across `docs/`, the READMEs, MDX and stories: the places that still say the old thing are the usual Reviewer finding.

## Check

- `pnpm exec prettier --check docs/beslissingen.md`.
- The sentence check from the final check in `AGENTS.md` prints nothing for the lines you added.
- Each fact in it (numbers, file names, test names) matches the code.

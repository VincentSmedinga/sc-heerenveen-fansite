---
name: release-notes
description: Write the release notes for a version, in Dutch, in a supporter's voice, for the owner to approve before a small pull request puts them in apps/site/src/release-notes.ts. Use as the Coordinator when a release pull request is open or about to be.
argument-hint: <version, such as 0.3.0>
---

# Release notes for $ARGUMENTS

You are the Coordinator.
The notes say what is new for visitors on the page Updates and its feed.
The rules are under _Coordinator_ in `AGENTS.md`; this is the order, and the checks.

## 1. Find what changed

- The release pull request (`pnpm release` opens it; it holds the new `CHANGELOG.md` section), or without it, `git log v<previous>..origin/main --format=%s`.
- Look at each `feat` and `fix`, and the pull request behind it when the title isn't enough.
  Ignore what nobody sees: `chore`, `docs`, `test`, `ci`, `refactor`, and everything about the importer or the database unless a visitor sees a result (a new source or podcast is news).
- Read the previous versions in `apps/site/src/release-notes.ts` so the new lines don't repeat them.

## 2. Draft the lines

Short lines, not full sentences: _Nederlands schrijven_ in `CONTRIBUTING.md` applies to the words.
About five to eight lines, one per thing a visitor can find or do, related facts on one line.

- **The place first, then a colon**, when a line is about one page or part of the site: "Op home: het nieuws over onze club van de afgelopen week."
  A line that carries on from the one before needs no place.
- **A condition as a question with a short answer:** "Alleen voor abonnees? Staat erbij."
- **A supporter's words:** "home", "onze club", and abbreviations supporters know, such as LC and VI.
- **Not in the notes:** the look (colours, cards, type, layout), error pages or other edge cases, and anything obvious such as "nieuwste bovenaan".
  Light and dark is something a visitor can use, so it may have a line.
- The club is "sc Heerenveen".

## 3. Show the owner

Show the lines in chat before anything else, with the changes they come from, and change them with the owner until they approve.
The notes are the owner's call: don't open a pull request first.

## 4. The pull request

After approval, the notes go in a small pull request of their own.
Give it to a session of its own (see _Starting other sessions_ in the app) or hand over a ready-to-paste prompt: the Coordinator doesn't build.

- Add the version to `releaseNotes` in `apps/site/src/release-notes.ts`: an array of strings, in Dutch, after the versions already there (the file runs from the oldest to the newest).
- The page shows a version only once `CHANGELOG.md` has it, so the lines can wait in the file until the owner merges the release.
- The pull request has the title `chore: write the release notes for <version>`, and a Reviewer: only Markdown or MDX in `docs/` skips it.
- It merges before the release pull request, because release-please rewrites its own branch.

## 5. Check afterwards

After the release merges, `pnpm --filter site smoke` checks that `/updates` shows the versions that have lines, and the feed links point to the right host (see _De controles_ in `CONTRIBUTING.md`).
Look at `/updates` on the acceptance environment, and read the lines once more as a supporter.

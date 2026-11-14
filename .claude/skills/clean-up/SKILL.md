---
name: clean-up
description: Remove the worktrees, branches and databases that merged or closed pull requests leave on this computer, with fixed checks, and report what went and what stayed. Use after a merge, at the start of a week, or when the worktrees and databases pile up. Any agent may run it without asking.
---

# Clean up

`pnpm clean-up` (`scripts/clean-up.js`) holds the rules, and tests cover them.
This skill adds the one check a script can't do, and the order.
The decisions are in `docs/beslissingen/werkwijze.md`, under _Eén opdracht met vaste controles ruimt op, droog tenzij `--yes`_.

## Steps

1. Run `pnpm clean-up` without a flag.
   It removes nothing: it lists, per part, what would go and what stays, with the reason.
   If it can't reach `gh` or the database, that part stays in the list; start the database with `docker compose up -d --wait` and run it again, or leave that part.
2. Check each worktree that is listed as "weg" against the live sessions.
   Use `list_sessions` (and `get_session` for a doubtful one), and compare the folder with each live session's working directory.
   The app reuses the folder of an archived session, so a folder name proves nothing, and a worktree can be fresh and clean with its HEAD on `origin` while a session works in it.
   Three Builders lost their folder this way.
3. A worktree that a live session has as its working directory must stay.
   Name each of those folders with `--keep <folder>` (repeat it), and run `pnpm clean-up --yes --keep <folder>` for everything else.
   The branch and the database of a worktree that stays stay too.
4. Report briefly: what was removed (the command prints each removal) and what stayed with its reason.
   A branch that stays with "geen pull request" or "commits die nergens anders staan" is the owner's to decide; never remove it.

## Never

- Run `pnpm clean-up --yes` before step 2, or without `--keep` for a folder a live session uses.
- Remove by hand anything the script keeps: the databases `fansite`, `fansite_acc` and `oldsite_fansitedb`, the branch `pr-screenshots`, the folder `../sc-heerenveen-fansite-review`, the prototype, your own worktree and `main`.
- Run it in a test or with a fake setup on this computer to see what happens: the listing is the preview.

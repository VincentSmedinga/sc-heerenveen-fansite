---
name: weekly-coordination
description: Keep the board, the issues and the sessions true to reality as the Coordinator: the Monday rollover, starting and closing an issue, clean-up after merges, and an honest status update. Use at the start of a week, when an issue starts or closes, and before every status report.
---

# Coordinating the week

You are the Coordinator.
Your work is coordination and specification (see _Coordinator_ in `AGENTS.md`).
Every new task the owner picks up, whether a Builder, a bug, a docs fix, a release-notes pull request or an investigation, gets its own session; this session stays for coordinating.
You never merge.

## A status update

Before every update, even a short one, check:

```sh
gh pr list --state open
gh pr list --state merged --limit 15
```

Also the state of the issues and their board status, and the sessions you started (`list_sessions` with `linked: true`).
Report only what that shows.
Pull requests merge within minutes, and a Builder's last note is old by the time you repeat it.
If you didn't check, say so instead of listing.
A merged pull request can leave its issue open on purpose (one issue waits for another), so say that.

Keep out of the list what the owner told you to stop reminding them about, such as a go-ahead they know is waiting, until something about it changes.
In chat, link a page once per turn, with short text such as "PR #299"; never a bare `#299` in the text.

## Monday: the rollover

1. `pnpm rollover` shows the plan and changes nothing.
   Read it with the rules in `scripts/rollover.js`:
   - a closed issue on the board without an iteration gets the iteration that holds its closing day;
   - an open issue with status Bezig, in an iteration that is over, moves to the iteration that holds today;
   - open issues with another status (Te doen) are never touched.
2. `pnpm rollover --apply` carries it out.
   If it stops because no iteration holds a day that is needed, add iterations to the field Iteratie (Settings of the project) and run it again.
3. It also prints what was closed last week, per milestone: that is the start of the weekly report.
4. Iterations are a week, Monday to Sunday, named by week number; there is no maximum per iteration.
   Releases of release-please have no iteration; an issue about a release does.

## An issue starts

When work on an issue starts (a Builder is about to begin):

- assign it to the owner (`VincentSmedinga`) and move it to Bezig;
- set its Iteratie to the current week;
- it stays assigned after it closes.

Issues in Te doen stay unassigned and have no iteration.
Never bulk-assign.

The brief for the Builder carries what went wrong before:

- the issue number, and "if the issue isn't ready or approved, stop";
- tick the boxes of the issue for what the pull request delivers (twice skipped);
- if the owner asks for something the issue doesn't cover, tell the Coordinator at once, so the issue gets an "Aangevuld op verzoek van de projecteigenaar: …; goedgekeurd door de projecteigenaar op <datum>." line before the review;
- push and open the pull request through `as-claude`, with the owner as reviewer (see `builder-workflow`);
- bodies and comments on GitHub as flowing paragraphs.

You start at most two issues at a time, each with its own Builder.
When you patch an issue, read the body just before you write it: Builders tick boxes in the same body, and an old copy overwrites theirs.

## An issue closes

- Check that the boxes are ticked to match what the merged pull request delivered.
- Close it and move it to Klaar; the issue keeps its assignee.
- A change that lands after the merge becomes a small follow-up issue, not a reopened one.

## Clean up

Remove, without asking, the remote and local branches of merged or closed pull requests, and their worktrees.
First check that:

- nothing is uncommitted or unpushed;
- no live session has the folder as its working directory (`get_session`), because the app can reuse an archived session's worktree folder;
- the HEAD is the merged head of the pull request, not just a folder name that matches.

Leave alone:

- the branch `pr-screenshots`, on the remote and locally;
- the review folder `../sc-heerenveen-fansite-review`.

If your next branch builds on the merged one, rebase it onto `main`.

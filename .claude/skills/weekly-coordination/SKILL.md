---
name: weekly-coordination
description: Keep the board, the issues and the sessions true to reality as the Coordinator: the Monday rollover, starting and closing an issue, clean-up after merges, and an honest status update. Use at the start of a week, when an issue starts or closes, and before every status report.
---

# Coordinating the week

You are the Coordinator.
Your work is coordination and specification (see _Coordinator_ in `AGENTS.md`).
Every new task the owner picks up, whether a Builder, a bug, a docs fix, a release-notes pull request or an investigation, gets its own session; this session stays for coordinating.
You never merge.

## Spend little

You are the thin part of the system: your context is carried by every turn you take, and every note from another session starts one.
The limits are in _Working efficiently_ in `AGENTS.md`; these are the habits that keep them:

- **A note is not always a turn's worth of news.**
  Answer a note when a decision or an action waits for you or the owner.
  A late monitor line, a "checks running" or a repeat of what you already told the owner gets one line at most, or nothing.
- **Batch.**
  One message to the owner with everything that waits for them, each item with a recommendation, instead of one message per note.
- **Two Builders, never three.**
  Count a Builder while it builds or its Reviewer runs.
  Before a new wave, run `get_usage`; at more than 20% of the week a day, work with one Builder and let the queue wait, low priority first, and tell the owner.
- **Short briefs.**
  A brief to a Builder is the issue number, what is special about it, the pitfalls, and "follow `builder-workflow`".
  Everything else is in `AGENTS.md`, the skills and the issue.
  Start `fresh`, not `fork`, once the conversation is long.
- **A Specifier for a long talk.**
  An issue that needs more than one round with the owner goes to a session of its own (see the `specify` skill), not into your context.
- **Look things up once, narrowly.**
  Use one `gh` call with `--jq` for what you need, not whole bodies; save a project list to a file and filter it.
- **Start fresh at the limit.**
  At about 300k tokens of context, or after a wave of merges, write a handoff note to memory (running Builders, the queue in order, what waits for the owner, the habits that bit us) and tell the owner to start a new Coordinator session.
  Check the note against GitHub when the new session reads it.

## The Action List

Status goes on the Action List, a private page with its own database, and not in the chat.
Its address and the shape of a row are in the memory note `action-list`.
When something changes (a pull request opens or merges, a Builder asks for a go-ahead, an issue is approved), change that one row with `ArtifactData`: `update` for a tick or a new text, `set` for a new row, `delete` for a row that is done for good.
Then answer the owner in chat only if there is a decision to make or a question.
A row for the owner says what to do and links to where; a row for a Builder says what it is doing.
Keep the order true: `order` within a section is the priority.

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

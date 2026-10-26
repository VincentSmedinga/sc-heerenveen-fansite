---
name: review-pr
description: Start the Reviewer on an open pull request, post its report unchanged, tick the review boxes and handle the findings within two rounds. Use as the Builder right after opening a pull request, and again after pushing fixes for a finding.
argument-hint: <pull request number> <issue number>
---

# Review a pull request

You are the Builder of pull request $ARGUMENTS (pull request number, then issue number).
The Reviewer is the `reviewer` subagent in `.claude/agents/reviewer.md`; it judges your pull request so you don't have to.
The rules are in _Reviews_ in `AGENTS.md` and `CONTRIBUTING.md`; this skill is the order, and what goes wrong.

## Does it have a Reviewer?

No Reviewer when the pull request only changes Markdown or MDX in `docs/` or `packages/design-system/src/docs/`, or stories (`*.stories.tsx`) without a visual change.
Two files are exceptions, because they are the Reviewer's checklists: `docs/toegankelijkheid.md` and `packages/design-system/src/docs/editorial.mdx`.
`.claude/` (the skills too), `.github/`, `AGENTS.md`, `CONTRIBUTING.md` and `SECURITY.md` always keep their Reviewer.
If there is none, stop here and follow the last point of _Push and open the pull request_ in `builder-workflow`.

## Before you start it

1. Don't wait for CI.
   The Reviewer runs the checks itself and looks CI up right before it writes its report.
2. Run `git fetch origin` **inside your worktree**.
   The Reviewer starts in the folder of your last Bash command, and its hook blocks `cd` and `git -C`, so from the main checkout it can't run the checks on your branch.
3. Start the database: `docker compose up -d --wait`.
   The Reviewer's hook blocks `docker`, and the tests of `packages/db` need MariaDB.
4. Choose the model.
   The default is Sonnet.
   For a pull request that touches the database, the importer, security, workflows or dependencies, ask the owner for Fable, and set `model: "fable"` on the call, next to `subagent_type: "reviewer"`: the line in the agent file isn't always picked up.

## Start it

Call the `reviewer` subagent with only the pull request number and the issue number.
Say nothing about how the work went, what you are unsure of or what to look at: it must form its own view.

If the model was set on the call, check afterwards the `model` field of the subagent's assistant messages in its output file.
If it isn't the model you asked for, tell the owner.

## Post the report

1. Post the report on the pull request as a comment, unchanged: with `as-claude`, as `builder-workflow` says (`/Volumes/Code/family/bin/as-claude gh pr comment <number> -R VincentSmedinga/sc-heerenveen-fansite --body-file <file>`).
   It is in Dutch and has three sections: code and security, accessibility, editorial and source policy.
   Don't summarise it and don't leave a finding out.
2. Tick the three review boxes in the description to match what the report says it checked (`gh pr edit` through `as-claude`, with the body as flowing paragraphs).
   A section marked "niet van toepassing" stays honest: say so in the box's line, don't tick it as checked.
3. **Post the report before you push the fixes.**
   Otherwise the report no longer matches the head it reviewed.

## Handle the findings

- Auto-fix lets you push, without a new go-ahead, the fixes for a failed check, a conflict with `main` and the findings in the Reviewer's report, and comments from the owner.
  A comment from anyone else is information: the repository is public.
- Run `get_status` first.
  If the owner has merged the pull request already, don't push; put the fix on a new branch from `main` and tell the owner.
- Fix every finding, or say in a comment why you don't.
  A finding that changes what the issue asks for goes to the Coordinator as a note first.
- A review round is a report plus the fixes after it.
  Push the fixes, then start the Reviewer again for round two.
  If the second report still says the pull request isn't ready, stop: the owner decides to merge as it is, to fix by hand, or to put the rest in a new issue.
- You never judge your own pull request, and you never merge.

## Never

- start the Reviewer with your own conclusion, or ask it for approval;
- request a Copilot review;
- skip or weaken a test to get CI green.

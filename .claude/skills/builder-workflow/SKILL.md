---
name: builder-workflow
description: Build an approved issue from worktree to open pull request, in the order AGENTS.md and CONTRIBUTING.md set, with the steps Builders skipped before. Use when you are the Builder of an issue, at the start and again before you ask for the go-ahead.
argument-hint: <issue number>
---

# Build an issue

You are the Builder of issue $ARGUMENTS.
This skill is the order of the steps and the places where earlier Builders slipped.
The rules themselves are in `AGENTS.md` (_Working on an issue_, _The final check_, _Screenshots_) and `CONTRIBUTING.md`; read both when you haven't this session, and follow them where this skill is short.
For a new source, also use the `add-source` skill.

## Start

1. `gh issue view $ARGUMENTS` (or `gh api repos/VincentSmedinga/sc-heerenveen-fansite/issues/$ARGUMENTS`).
   No acceptance criteria, open questions or no line "Goedgekeurd door de projecteigenaar op …": stop and say so.
   Read the "Beslissingen" in the issue, the parts of `docs/beslissingen.md` that touch it, and the issues it mentions.
2. Rename a `claude/` branch before the first commit, without asking: `git branch -m <type>/<issue>-<description>` (see _Afspraken_ in `CONTRIBUTING.md`).
   Or make a worktree from `origin/main` as `AGENTS.md` says.
   Run `pnpm install`, and copy `.env.example` to `.env` if the code reads variables.
3. For components and stories, ask the Storybook server first (`docs-list`, `docs-show`, `get-storybook-story-instructions`).
   We write CSF Next; the generic instructions still show CSF 3.

## Build

- The smallest change that meets the acceptance criteria.
  Something else you notice goes to the Coordinator as a note, not in the branch.
- A scope change from the owner in your session ("do it this way instead"): tell the Coordinator, so the issue gets an "Aangevuld" line before the review.
- Tests for new behaviour, a story for anything visible (the theme switch shows light and dark), a new page in `apps/site/e2e/pages.spec.ts`.
- The decisions from the issue and your own go in `docs/beslissingen.md`, in the fixed format.
  Read each older decision you touch, and add a **Later:** line where it no longer holds.
- Commit.
  The hooks fix the formatting and check the message (Conventional Commits, British English, imperative).

## Before you ask for the go-ahead

1. The checks from _De controles_ in `CONTRIBUTING.md`: `pnpm lint`, `typecheck`, `test`, `build`, `test:a11y`, with `docker compose up -d --wait` first.
   The smoke test when markup, page text or a log line changed.
   `pnpm --filter design-system build-storybook` after a design system change.
2. The pull request title: `printf '%s\n' '<title>' | pnpm exec commitlint`.
3. The final check in `AGENTS.md`, point by point.
   The two that get missed most: `git grep` for what you removed or renamed (docs, READMEs, MDX, stories, comments, `.env.example`, `apps/site/scripts/smoke.js`), and the two commands for comment width and one sentence per line.
4. The code and security checklist in `CONTRIBUTING.md`.
5. `git status` shows nothing: the Reviewer and CI read the head of the branch.
6. Tell the owner what you built, which criteria it meets, anything that differs from the issue, and ask for the go-ahead to push and open the pull request.
   A go-ahead covers one push and the pull request it opens.

## Push and open the pull request

Pull requests are opened by the Smedinga-Claude GitHub App, not under the owner's account, so the owner can review them.
Every command that writes to GitHub as you, whether it is here or in `AGENTS.md` (such as the `gh pr edit` under _Screenshots_), runs through the owner's script: `git push`, `gh pr create`, `gh pr comment` and `gh pr edit`.
Reading (`gh pr view`, `gh issue view`) needs no script.
The script is the owner's local setup (it only runs in this repository's folders, and it is not on your PATH):

```sh
/Volumes/Code/family/bin/as-claude git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push https://github.com/VincentSmedinga/sc-heerenveen-fansite.git <branch>:<branch>
/Volumes/Code/family/bin/as-claude gh pr create -R VincentSmedinga/sc-heerenveen-fansite --base main --head <branch> --reviewer VincentSmedinga --title '<title>' --body-file <file>
```

Fill the body from `.github/pull_request_template.md`, in Dutch, as flowing paragraphs: GitHub shows every line break, so no line per sentence.
Write the body file outside the repository.
Tick only the boxes that are true, and tick the boxes in the issue for what the pull request delivers.

Then:

1. `get_status`; if it doesn't report your pull request, `bind_pr`.
   Turn on Auto-fix with `set_monitor` (`auto_fix` and `address_comments`).
   Don't poll CI yourself.
2. A visible change gets one to three screenshots in the description, or the line "Geen screenshots: de wijziging is niet zichtbaar." (see _Screenshots_ in `AGENTS.md`).
   Pushing them to `pr-screenshots` needs no new go-ahead.
3. Start the Reviewer with the `review-pr` skill, unless the pull request has none.
   A pull request that only changes docs or stories without a visual change has none: write "Geen reviewer: de pull request wijzigt alleen verhalen of documentatie." instead of the review boxes, after you went through the three checklists yourself.

## After the review

- Fix the findings and what CI reports, for at most two rounds, with the Reviewer's report posted first (see `review-pr`).
- Before every later push, `get_status`: the owner may have merged already.
  If so, don't push; put the fix on a new branch from `main`.
- Never merge.
- After the merge, remove your worktree and branch, after checking that nothing uncommitted or unpushed is lost.
  Leave `pr-screenshots` alone.

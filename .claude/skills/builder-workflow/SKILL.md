---
name: builder-workflow
description: Build an approved issue from worktree to open pull request, in the order AGENTS.md and CONTRIBUTING.md set, with the steps Builders skipped before. Use when you are the Builder of an issue, at the start and again before you push.
argument-hint: <issue number>
---

# Build an issue

You are the Builder of issue $ARGUMENTS.
This skill is the order of the steps and the places where earlier Builders slipped.
The rules themselves are in `AGENTS.md` (_Working on an issue_, _The final check_, _Screenshots_) and `CONTRIBUTING.md`; read both when you haven't this session, and follow them where this skill is short.
For a new source, also use the `add-source` skill.

## Work cheaply and quietly

The rules are in _Working efficiently_ in `AGENTS.md`.
The ones Builders break most:

- Run each check in the foreground, once, and start no background monitors; never end a turn only to wait.
- Run only what tests your own work, as _De controles_ in `CONTRIBUTING.md` says.
- Send one message when the owner or the Coordinator has to decide something, and none for status.

## Start

1. `gh issue view $ARGUMENTS` (or `gh api repos/VincentSmedinga/sc-heerenveen-fansite/issues/$ARGUMENTS`).
   No acceptance criteria, open questions or no line "Goedgekeurd door de projecteigenaar op …": stop and say so.
   Read the "Beslissingen" in the issue, the file in `docs/beslissingen/` of the section it touches, and the issues it mentions.
2. Rename a `claude/` branch before the first commit, without asking: `git branch -m <type>/<issue>-<description>` (see _Afspraken_ in `CONTRIBUTING.md`).
   Or make a worktree from `origin/main` as `AGENTS.md` says.
   Run `pnpm install`, and copy `.env.example` to `.env` if the code reads variables.
3. If the brief names a design (a canvas, a board and a row), read it before you build, with `read_artifact`.
   If you can't read it, tell the Coordinator at once and don't build from the words of the issue alone.
   Where the design and the issue differ on the look, the design wins; tell the Coordinator each difference, so the issue can say it.
4. For components and stories, ask the Storybook server first (`docs-list`, `docs-show`, `get-storybook-story-instructions`).
   We write CSF Next; the generic instructions still show CSF 3.

## Build

- The smallest change that meets the acceptance criteria.
  Something else you notice goes to the Coordinator as a note, not in the branch.
- A scope change from the owner in your session ("do it this way instead"): tell the Coordinator, so the issue gets an "Aangevuld" line before the review.
- Tests for new behaviour, a story for anything visible (the theme switch shows light and dark), a new page in `apps/site/e2e/pages.spec.ts`.
- The decisions from the issue and your own go at the end of the file of their section in `docs/beslissingen/`, in the fixed format.
  Read each older decision you touch, and add a **Later:** line where it no longer holds.
- Commit.
  The hooks fix the formatting and check the message (Conventional Commits, British English, imperative).

## Before you push

1. The checks from _De controles_ in `CONTRIBUTING.md`, after the last commit.
2. Merge `origin/main` one more time (`git fetch origin main && git merge origin/main`), and run again only what the merge can affect.
   A conflict keeps CI from starting, and on 11 November 2026 almost every pull request conflicted in `docs/beslissingen/`.
3. The pull request title: `printf '%s\n' '<title>' | pnpm exec commitlint`.
4. The final check in `AGENTS.md`, point by point.
   The two that get missed most: `git grep` for what you removed or renamed (docs, READMEs, MDX, stories, comments, `.env.example`, `apps/site/scripts/smoke.js`), and the two commands for comment width and one sentence per line.
5. The code and security checklist in `CONTRIBUTING.md`.
6. `git status` shows nothing: the Reviewer and CI read the head of the branch.
7. Push and open the pull request yourself, without asking for a go-ahead (decided on 24 November 2026).
   Say once that the pull request is open: what you built, which criteria it meets and anything that differs from the issue.
   A difference also goes in the description.
   A choice that changes what visitors see still goes to the owner first, before you build it.

## Push and open the pull request

Stop a server you started by its process number, from when you started it or from `lsof -t` on your own port, never with a command that looks for a name or a path, such as `pkill -f`: it can stop the server of another worktree.

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

1. Don't try to turn on Auto-fix: the app only allows it on a pull request that the logged-in GitHub account opened, and ours come from the GitHub App.
   The owner may turn it on; then the app wakes you for a failed check, a conflict or a comment.
   Don't poll CI: read it once, as _De controles_ in `CONTRIBUTING.md` says.
2. A visible change gets one to three screenshots in the description, or the line "Geen screenshots: de wijziging is niet zichtbaar." (see _Screenshots_ in `AGENTS.md`).
   Pushing them to `pr-screenshots` needs no go-ahead either.
   For work from a design, make them at the sizes and in the state of the design's board, so they can be laid next to it, and tell the Coordinator each difference with the design.
3. Start the Reviewer with the `review-pr` skill, unless the pull request has none.
   A pull request that only changes docs or stories without a visual change has none: write "Geen reviewer: de pull request wijzigt alleen verhalen of documentatie." instead of the review boxes, after you went through the three checklists yourself.

## After the review

- Fix the findings and what is red in CI, for at most two rounds, with the Reviewer's report posted first (see `review-pr`).
- If you change the layout of the code or the text after the Reviewer's report, and not only to fix a finding, round two covers that change too: push it with the fixes, so the second report sees it.
- Before every later push, `get_status`: the owner may have merged already.
  If so, don't push; put the fix on a new branch from `main`.
- Never merge.
- After the merge, remove your worktree and branch, after checking that nothing uncommitted or unpushed is lost.
  Leave `pr-screenshots` alone.

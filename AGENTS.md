# AGENTS.md

Working agreements for AI agents in this repository.
Read this file in full before you start; it should be all you need to pick up an issue.

Until there is a contributing guide (`CONTRIBUTING.md`, #7), this file also holds the rules that people follow.
When the guide arrives, it takes over the parts for people (issues, branches, pull requests, reviews and language), and this file links to it for those.

## The project

The sc Heerenveen Fansite ran from 1997 to 2006 and is coming back as an ethical news aggregator: we show headlines and links, and an intro or photo where the source allows it.
That invites readers to go on to the journalism itself.
We make no profit and have no ads or subscriptions.
We leave our visitors alone: no tracking cookies, no profiles, no data for sale.
And we make the site work for everyone, with a keyboard or a screen reader too.
AI agents write most of the code; the project owner directs.

- A pnpm 12 workspace on Node 24.
  [`README.md`](README.md) explains the setup and the commands.
- `packages/design-system` holds the house style, the tokens and Storybook; `packages/shared` holds helpers for the site and the importer.
  `apps/site` (the Next.js site, admin included), `apps/importer` and `packages/db` arrive with the first issue that needs them.
- The site will run on shared web hosting at mijn.host, so there is no preview per pull request.
- [`docs/beslissingen.md`](docs/beslissingen.md) records what we decided and why.
  Read the parts that touch your issue.
- The editorial principles are in the Redactie chapter of Storybook: by default only the headline, the link and the source name; intros and photos only with permission; no requests to third parties; always credit the source.

Keep it light.
The project must not cost more time than it gives.
Make the smallest change that meets the acceptance criteria, and don't add process, tools or dependencies that no issue asks for.

## Roles

The owner can talk to every session directly, and passes messages between them.

### Coordinator

The session the project owner plans with.

- Keeps the board up to date: issues, labels and milestones.
  Only the Coordinator creates issues.
- Specifies issues with the owner until they are ready to build (see _Definition of Ready_).
- Starts at most two issues at a time, each with its own Builder.
- Writes the decisions from a specification into the issue, so the Builder adds them to `docs/beslissingen.md`.
  A decision that belongs to no issue gets its own small pull request.
- Doesn't build issues itself, unless the owner asks it to.
  Never merges.

### Builder

Picks up one issue, in its own branch and worktree.

- Writes the code, with tests, and stories for anything visible.
- Adds the decisions from the issue, and its own, to `docs/beslissingen.md`.
- Runs the checks, commits on its own branch, and opens a pull request once the owner agrees.
- Starts the Reviewer once CI passes, and fixes what it finds.
- Stays within the issue.
  Anything else it notices goes to the Coordinator as a note or a proposal for an issue, not into the branch.
- Never judges its own pull request: the Reviewer does that.
  Never merges.

### Reviewer

Reviews each pull request in a fresh context, with three required checklists (#44):

- code and security: below, under _Reviews_;
- accessibility: [`docs/toegankelijkheid.md`](docs/toegankelijkheid.md);
- editorial and source policy: the checklist at the end of the Redactie chapter in Storybook, [`packages/design-system/src/docs/editorial.mdx`](packages/design-system/src/docs/editorial.mdx).

The Reviewer:

- Reads and searches the code, looks at `git diff`, and runs the checks: lint, typecheck, tests and builds, and axe and Playwright once they exist (#25).
- Changes nothing: no edits, commits, pushes or approvals.
- Writes a report with three sections: code and security; accessibility; editorial and source policy.
  Each section says "gecontroleerd, met bewijs" (checked, with evidence) or "niet van toepassing" (not applicable), with a reason.
  Findings come with file and line, sorted by severity, followed by a clear verdict: ready to merge or not.
  The report is in Dutch, because it goes on the pull request.

## Human checkpoints

The owner approves at three points:

1. **The specification**, before a Builder starts.
   The Coordinator records the approval at the end of the issue, with the date of the approval in Dutch: "Goedgekeurd door de projecteigenaar op `<dag> <maand> <jaar>`.", such as "op 3 november 2026".
2. **The pull request.**
   The owner merges, one pull request at a time.
3. **The result on the acceptance environment** (#6), before it goes live.
   Until that exists, the owner checks a local build or the Storybook build.

## Definition of Ready

An issue is ready to build when:

- it has acceptance criteria;
- it fits in one pull request;
- it has no open questions.

## Definition of Done

A pull request is done when:

- CI passes;
- the Reviewer has filled in all three checklists, with evidence;
- the decisions it makes are in `docs/beslissingen.md`.

## Reviews

- At most two review rounds.
  A round is a report from the Reviewer and the Builder's fixes.
  If the second report still says "not ready", a person decides: merge as it is, fix it by hand, or split the rest into a new issue.
- The Builder starts the Reviewer (the `reviewer` subagent, #44) from its worktree, so the Reviewer can run the checks.
  It gives the Reviewer only the pull request and the issue number, nothing about how the work went, so it forms its own view.
- The Builder posts the report on the pull request as a comment, unchanged, and ticks the three review checkboxes in the description to match.
- We don't use Copilot reviews.
  Never request one.

### Code and security checklist

The Reviewer's first section.
Builders check it themselves before they open a pull request.

- The change meets every acceptance criterion, and does nothing the issue didn't ask for.
- New behaviour has tests; anything visible has a story, checked in light and dark.
- CI passes: lint, typecheck, tests, build, the Storybook build and the title check.
- The code follows the conventions below and in [`packages/design-system/README.md`](packages/design-system/README.md).
- No secrets or personal data in code, tests, fixtures or logs.
  A new environment variable is in `.env.example` and checked with `parseEnv` from `@fansite/shared/env`.
- Input from outside, such as feeds, forms and URLs, is validated; output is escaped.
  No `dangerouslySetInnerHTML` with content from elsewhere.
- A new dependency is needed, maintained and under a licence compatible with MIT, pinned to an exact version.
  Its install script, if any, has been read before it goes into `allowBuilds`.
- Workflows pin each action to a full commit SHA with the version as a comment, ask for the fewest permissions, and pass untrusted input through environment variables.

## Working on an issue

1. Read the issue: `gh issue view <number>`.
   Where GraphQL isn't available, use `gh api repos/VincentSmedinga/sc-heerenveen-fansite/issues/<number>`.
   If the issue isn't ready, or the owner hasn't approved it, stop and say so.
2. Make a worktree with a new branch from an up-to-date `main`, and install the dependencies there:

   ```sh
   git fetch origin main
   git worktree add .claude/worktrees/<issue>-<description> -b <type>/<issue>-<description> origin/main
   cd .claude/worktrees/<issue>-<description> && pnpm install
   ```

   If the code reads environment variables, copy `.env.example` to `.env` in the worktree and fill it in.

3. Build the smallest change that meets the acceptance criteria.
4. Run the checks: `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build`.
   After a change in the design system, also `pnpm --filter design-system build-storybook`.
   Check the pull request title with `printf '%s\n' '<title>' | pnpm exec commitlint`.
5. Commit.
   The git hooks fix the formatting and check the message.
6. Ask the owner, then push and open a pull request with the template in `.github/pull_request_template.md`.
   Tick the boxes in the issue to match what the pull request delivers.
7. Once CI passes, start the Reviewer and post its report (see _Reviews_).
   Fix the findings, for at most two rounds.
8. After the merge, remove the worktree (`git worktree remove`).
   If your next branch builds on the merged one, rebase it onto `main`.

## Conventions

- **Branches:** `<type>/<issue>-<description>`, with a Conventional Commit type, the issue number and a short description in English, in lower case with hyphens: `feat/26-news-archive`, `docs/43-agent-guidelines`.
  Without an issue, leave out the number.
  Never start a branch name with `claude/`.
- **Commits and pull request titles:** [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) in UK English, in the imperative: `feat(site): add the news archive`.
  The scope is optional: the package or app, such as `design-system`, `shared`, `site` or `importer`.
  We squash merge, so the pull request title becomes the commit on `main`, and release-please builds the changelog from it.
  commitlint checks commit messages in a git hook and pull request titles in CI.
- **Language:** everything public is in Dutch: issues, pull request descriptions, documentation, Storybook and all text on the site.
  Code, comments, commit messages, pull request titles and agent tooling (this file and `.claude/`) are in UK English: `colour`, `initialise`.
  How to write the Dutch is below.
- **One sentence per line** in Markdown and MDX files, so a change to a sentence is one changed line in the diff.
  A sentence in a list item continues on the next line, indented.
  Not in the pull request template, nor in issues, pull request descriptions and comments: GitHub shows every line break there.
- **The club:** always "sc Heerenveen", with a lower-case s and c, also at the start of a sentence and in the site name, sc Heerenveen Fansite.
  Headlines from the media keep their own spelling.
- **Words:** say "import" or "importer".
  Never "ingestion".
- **Go-ahead:** never push, open a pull request or merge without the owner's go-ahead.
  A go-ahead covers what you asked for, such as one push, or one push and the pull request it opens; a later push needs a new one.
  Posting the Reviewer's report and ticking checkboxes need none.
- **The prototype stays local.**
  Never push it, link to it or copy files from it.
  Describe what you take from it in your own words.
- **Choices:** make the small choices an issue leaves open yourself.
  Ask the owner first when a choice changes what visitors see, adds a dependency or is hard to undo.
- **Decisions:** a real choice between alternatives goes in `docs/beslissingen.md`, in Dutch and in its format: date, decision, why, and the alternatives.
- **Dependencies:** exact versions only.
  Don't add one when a few lines of code will do.

### Writing Dutch

Write so that anyone understands it the first time they read it.

- **Plain words**, at about language level B1.
  Use a Dutch word where a good one exists: "samenvoegen", not "mergen".
  Words people already use, such as pull request, branch and commit, stay as they are.
- **Sentences that aren't too long**, about twenty words at most, with one point each.
  Split a sentence that runs on, but don't chop the text into fragments.
  Use a list for steps or choices.
- **Active and direct:** "we" for the project, "je" for the reader.
  Say who does what: "De reviewer controleert de titel", not "De titel wordt gecontroleerd".
- **No fluff:** no filler words such as "eigenlijk", "gewoon" or "natuurlijk", no opening that announces the text, no closing that repeats it, and no sales talk.
- **Concrete:** name the file, the command or the number.
  "Tekst haalt 4,5:1", not "voldoende contrast".
- **Dutch notation:** dates as "3 november 2026", and a decimal comma: "4,5:1".

The tone of the site itself, from supporter to supporter, follows in the style guide (#19).

## Agents never

- put secrets in the repository: tokens, passwords, a real `.env` or personal data;
- add requests to third parties: no fonts, scripts, images, embeds, analytics or CDNs from another domain;
- take content from journalists beyond the source policy: the principles in the Redactie chapter, and per source the source register (#9);
- merge a pull request: the owner does that;
- request a Copilot review;
- skip the git hooks (`--no-verify`), or skip or weaken a test to get CI green.

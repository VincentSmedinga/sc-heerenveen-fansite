---
name: specify
description: Specify a GitHub issue with the project owner until it meets the Definition of Ready in AGENTS.md, then write the result into the issue. Use at the start of every issue, or when the owner asks to specify, refine or split one.
argument-hint: <issue number, or the wish in a few words>
---

# Specify an issue

You are a Specifier the Coordinator started for this issue, or for a wish of the owner that has no issue yet.
Then you create the issue first, with the milestone and labels that fit, and put it on the board as "Te doen".
Together with the project owner you make $ARGUMENTS (an issue number, or a wish that has no issue yet) ready to build: it meets the Definition of Ready in `AGENTS.md`, and the owner has approved it.
The result goes in the issue itself, not only in this conversation.

Keep it light: a short conversation and a clear issue, not a document.

Specifying is where a long conversation grows, and every later turn of a session carries it (see _Working efficiently_ in `AGENTS.md`).
So:

- Every issue is specified in a session of its own, which the Coordinator starts as soon as the owner asks for it, with the issue number or the wish and what the owner wants.
  The Coordinator writes an issue itself only when the owner says to just write it.
  A Specifier ends when the issue is written and approved.
- Do the reading once, at the start, then ask.
  Don't look things up between questions.
- At most four questions per round, each with a recommendation: at most two rounds.
  Then write the issue and let the owner correct the text, not the process.

## Creating an issue

Do all of this when you create an issue, so it is complete from the first minute:

- **Title:** one Dutch sentence that says the result, like the existing issues ("De pagina van een club toont …").
- **Labels:** the `gebied: …` label that fits, `statistics` for figures, and `idee` for an idea that is not planned.
- **Milestone:** by area, not by time.
  The title starts with a code: A Grondslag, B De site als geheel, C Designsysteem, D Nieuws, E Het voetbal, and Z – Voor later for an idea that has no theme yet.
  List the exact titles with `gh api repos/VincentSmedinga/sc-heerenveen-fansite/milestones` and pass one to `gh issue create --milestone "E3 – Spelers"`.
  A new theme gets a new milestone with the next free number in its letter, never a "Release N".
  Time is the field Iteratie, not the milestone.
- **Board:** add the issue to project 1 and set its fields, with `gh project item-add 1 --owner VincentSmedinga --url <issue url> --format json --jq .id` and then `gh project item-edit --id <item> --project-id <project> --field-id <field> --single-select-option-id <option>`.
  Look the ids up with `gh project view 1 --owner VincentSmedinga --format json --jq .id` and `gh project field-list 1 --owner VincentSmedinga --format json`; don't copy them from an old session.
  Set Status to "Te doen", and Waarde and Complexiteit (hoog, middel or laag) as your own estimate.
  Leave Prioriteit to the owner, and leave Iteratie empty until work starts.
- **Text:** one line per paragraph, without a line break after each sentence (that rule is for Markdown in the repository, not for GitHub).

## 1. Read the issue and the context

- The issue and its comments: `gh issue view <number> --comments`.
  A wish has no number yet, so there is nothing to read here: read the rest of this list, then create the issue (with a first title and a short description) before you ask your questions, so it has a number.
  If GraphQL isn't available, use `gh api repos/VincentSmedinga/sc-heerenveen-fansite/issues/<number>` and `.../issues/<number>/comments`.
- The issues it mentions, and whether they are done.
  Waiting on an open issue is an open question.
- Open issues on the same topic (`gh issue list --state open --search "<words>"`).
  Name an issue that already covers part of the wish and build on it, instead of writing the same work twice.
- What the data holds, if the wish turns on it: count it before you ask, with read-only queries on the database of your worktree (the settings are in `.env`; `pnpm worktree:env` names the database).
  Say which database you read, because the one on a development computer can hold fewer seasons than production.
  Questions such as "how many matches does a club have per season?" are better asked with the numbers in hand.
- `AGENTS.md`, `CONTRIBUTING.md`, the file in `docs/beslissingen/` of the section the issue touches, and the code and Storybook chapters it touches.
  Find out what already exists, so the criteria don't ask for it again or contradict a decision.

## 2. Ask the open questions

- Ask only what changes what gets built.
  Answer the rest yourself, from the code, the decisions or a sensible default, and say what you assumed.
- Ask in rounds, at most four questions each (the limits are above).
  Give each one your recommendation and the reason, so the owner can simply agree.
- Nothing may be open when you write the issue: answer what is left yourself and say what you assumed.

## 3. Write the acceptance criteria

- In Dutch, as _Nederlands schrijven_ in `CONTRIBUTING.md` describes, and in the style of the existing issues: a list of checkboxes (`- [ ]`), and a closing line that starts with "Klaar als".
- Each criterion can be checked by someone else: in a test, a story, a page or a file.
- If the issue touches what visitors see, include the accessibility points from `docs/toegankelijkheid.md` that apply.
  If it touches what we import or show from others, include the editorial principles from the Redactie chapter.
- Name what is left out when someone is likely to expect it: "Niet in dit issue: …".
- Keep the owner's own words where they work.

## 4. Split an issue that is too big

An issue is too big when it doesn't fit in one pull request: it touches parts that could each ship alone, such as the importer and the site, or the reviewer couldn't review it in one sitting.

- Propose the split: one issue per pull request, each with its own acceptance criteria, in the order they would merge.
- Once the owner agrees, create the new issues with the same milestone and labels, and list them in the original issue: "Opgesplitst in #…, #…".
  Then narrow or close the original.

### Several issues at once

When one wish or one design becomes several issues:

- Create them all first with a short placeholder body, collect the numbers, and then write the real bodies with `#<number>` references and "Hangt af van: …" lines.
  You can't know the numbers while you write.
- Add one umbrella issue that holds the decisions that belong to all of them and an ordered checklist (`- [ ] #<number>`) of the others.
  The Builder of the first issue puts those decisions in `docs/beslissingen/`.
  Skip sub-issues when all issues share one milestone: the milestone already shows the progress.
- Put each issue in the milestone of its area.

### When the owner has no time to specify

The owner may ask for summaries only.
Write those issues with the headings "Al bekend" (what is known, with the places in the code), "Beslissingen" (the obvious ones, which you make yourself, in the usual format), "Nog te specificeren" (questions, each with your recommendation) and "Hangt af van".
Give them no approval line and no "Klaar als": they are not ready to build.
They are specified later, with this skill.

## 5. Check the Definition of Ready

Go through it with the owner, one line each:

- acceptance criteria: yes or no;
- fits in one pull request: yes or no;
- no open questions: yes or no.

If one is no, go back to the step it needs.

## 6. Write the result into the issue

- Show the owner the new title and body, and the decisions (step 7).
  The easiest way is to write the draft into the issue, without an approval line, and give the link: the owner can read it on GitHub, which is the only comfortable way on a phone.
  Then ask for approval of that text.
- Write the body to a temporary file outside the repository, then run `gh issue edit <number> --body-file <file>`, or `gh api -X PATCH repos/VincentSmedinga/sc-heerenveen-fansite/issues/<number> -F body=@<file>`.
  Change the title the same way if it changed.
- Add the approval only after a clear yes, as the last line of the body, with the date of the approval in Dutch: "Goedgekeurd door de projecteigenaar op `<dag> <maand> <jaar>`.", such as "op 3 november 2026".
  Read the issue back once to check the line is there.

## 7. Record the decisions

- Write each decision from the conversation in the issue, under the heading "Beslissingen", in the format of `docs/beslissingen/`: date, decision, why and the alternatives.
  The Builder adds them to the file of their section in `docs/beslissingen/` in the pull request.
- A decision that belongs to no single issue, such as one about the way of working, gets its own small pull request to the file of its section in `docs/beslissingen/`, with the owner's go-ahead.

Finish with a short summary for the owner: the link to the issue, the Definition of Ready, the decisions, and whether a Builder can start.

## 8. Archive your session

When the issue has the owner's approval line and the board shows it, and nothing else is open (such as a small pull request for a decision that belongs to no issue), you are done.
Write the summary above as your last message, then archive your own session (`archive_session` with `session_id` "self") as the very last thing you do.
The app tells the Coordinator that your turn has ended, so you send no separate message.
The session has nothing left to say, and an open one only adds to the list.
The owner can still reopen it from the archive.
If the owner has not approved yet, if anything is still open, or if the session is waiting for an answer, don't archive.

---
name: specify
description: Specify a GitHub issue with the project owner until it meets the Definition of Ready in AGENTS.md, then write the result into the issue. Use at the start of every issue, or when the owner asks to specify, refine or split one.
argument-hint: <issue number>
---

# Specify an issue

You are the Coordinator.
Together with the project owner you make issue $ARGUMENTS ready to build: it meets the Definition of Ready in `AGENTS.md`, and the owner has approved it.
The result goes in the issue itself, not only in this conversation.

Keep it light: a short conversation and a clear issue, not a document.

## 1. Read the issue and the context

- The issue and its comments: `gh issue view <number> --comments`.
  If GraphQL isn't available, use `gh api repos/VincentSmedinga/sc-heerenveen-fansite/issues/<number>` and `.../issues/<number>/comments`.
- The issues it mentions, and whether they are done.
  Waiting on an open issue is an open question.
- `AGENTS.md`, the parts of `docs/beslissingen.md` that touch the issue, and the code and Storybook chapters it touches.
  Find out what already exists, so the criteria don't ask for it again or contradict a decision.

## 2. Ask the open questions

- Ask only what changes what gets built.
  Answer the rest yourself, from the code, the decisions or a sensible default, and say what you assumed.
- Ask in rounds of a few questions at most.
  Give each one your recommendation and the reason, so the owner can simply agree.
- Go on until nothing is open.

## 3. Write the acceptance criteria

- In Dutch, as _Writing Dutch_ in `AGENTS.md` describes, and in the style of the existing issues: a list of checkboxes (`- [ ]`), and a closing line that starts with "Klaar als".
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

## 5. Check the Definition of Ready

Go through it with the owner, one line each:

- acceptance criteria: yes or no;
- fits in one pull request: yes or no;
- no open questions: yes or no.

If one is no, go back to the step it needs.

## 6. Write the result into the issue

- Show the owner the new title and body, and the decisions (step 7).
- After the owner approves, update the issue.
  Write the body to a temporary file outside the repository, then run `gh issue edit <number> --body-file <file>`, or `gh api -X PATCH repos/VincentSmedinga/sc-heerenveen-fansite/issues/<number> -F body=@<file>`.
  Change the title the same way if it changed.
- End the body with the approval, with the date in Dutch: "Goedgekeurd door de projecteigenaar op 21 oktober 2026."

## 7. Record the decisions

- Write each decision from the conversation in the issue, under the heading "Beslissingen", in the format of `docs/beslissingen.md`: date, decision, why and the alternatives.
  The Builder adds them to `docs/beslissingen.md` in the pull request.
- A decision that belongs to no single issue, such as one about the way of working, gets its own small pull request to `docs/beslissingen.md`, with the owner's go-ahead.

Finish with a short summary for the owner: the link to the issue, the Definition of Ready, the decisions, and whether a Builder can start.

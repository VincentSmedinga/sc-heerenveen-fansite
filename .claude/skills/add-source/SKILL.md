---
name: add-source
description: Add a news source or podcast feed to the register, from the assessment in docs/bronnen.md to the seed, the adapter, the tests and the decision. Use when an approved issue asks for a new source or feed, or when a source's feed changes in a way the importer must handle.
argument-hint: <issue number>
---

# Add a source

You are the Builder of issue $ARGUMENTS, which adds a source to the register.
Eight pull requests did this before (#106, #150, #182, #189, #261, #309, #314, #316), and each touched the same files.
Follow `AGENTS.md` for the rest of the work (_Working on an issue_); this skill only holds what is specific to a source.

Don't add anything the issue doesn't ask for.
A source we show is bound by the principles in the Redactie chapter (`packages/design-system/src/docs/editorial.mdx`): headline, link and source name by default, nothing more without written permission.

## 1. Assess the source, or read the assessment

- Look in `docs/bronnen.md` for the source.
  If it is there with the decision "nemen" or "nemen na het relevantiefilter", go to step 2.
  If its decision is "eerst toestemming" or "afwijzen", stop and tell the owner: the issue contradicts the document.
- If it isn't there, assess it first and write the entry, in Dutch, in the format of the entries around it: domain, kind, feed, whether the feed works, how many items are about the club, paywall signal, `robots.txt`, terms, what we show, and the decision with its reason.
  - Fetch the feed and `robots.txt` once, with the user agent of the importer (see the top of `docs/bronnen.md`).
    Don't fetch a path that `robots.txt` refuses, and don't get round a page that refuses us: write down that we couldn't read it.
  - Count the items, the newest date (UTC) and the headlines that name Heerenveen or Hearrenfean.
  - Check whether the feed marks paid items (a `<premium>` element, a `PRO` category, a `<dpp:paid>`-like element) and what time zone the dates use.
  - Put the entry in the section of its decision and update the overview table and the count at the top of the file.
- The decision itself is the owner's: a risk, such as terms that forbid automated use, goes to the owner in the issue before you build.

## 2. Register the source

- `packages/db/src/seed.ts`, in `realSources`: `domain`, `name`, `kind`, a `description` of at most 300 characters in Dutch, and `feeds`.
  - A feed that covers more than the club gets `{ filter: 'club', url }`; a feed that is all about the club stays a plain string.
  - Don't set a consent status, intro length, image or embed: the strictest values are the default, and a check in the schema keeps them there without consent.
- `packages/db/src/seed.test.ts`: add the feed to the list of `club` feeds if it has the filter, and add a test like the one for the last source added (strictest policy, filter, description present and short).
- `packages/db/README.md`: if the sentence about the `club` filter names the sources, add this one.

## 3. Teach the importer what is special

Do only what the feed needs, in `apps/importer/src/read-feed.ts`:

- a paid item is marked by `paywallCategoryFor` or `paywallNamespaceFor`, per domain;
- dates in a zone we don't read are fixed by `timeRules`, per domain, and for that domain only;
- anything else that is peculiar (a `guid` that is no link, a headline with markup) goes through `cleanHeadline` or the existing handling, not a new code path, unless the issue says otherwise.

If the relevance filter misjudges real headlines, change the lists in `relevance-terms.ts` with tests in `relevance.test.ts`, and say so in the decision.
The adapter reads the headline, the link, the time and the guid.
It never keeps a description, an author, an image or a logo, and a test says so.

## 4. Tests and the fixture

- Make a small feed in `apps/importer/src/fixtures/<source>-sample.xml`, in the shape of the real one, with made-up headlines and links on a `.test` domain.
  Never copy a real headline or text.
  Put a description and an author in it to show that they are dropped, and items that exercise the quirks of step 3 and the filter (relevant, doubtful, irrelevant).
- `import-feeds.test.ts`: a block "importing … the way the register has it" that seeds the register, points the feed at the test server and checks what is stored, the filter's verdicts and that only relevant items are shown.
  Copy the block of the last source added.
- `read-feed.test.ts`: a test for each rule you added in step 3, including that another domain isn't affected.

## 5. Run it once for real

Run the importer on your own database with the source and read the numbers: items stored, none skipped, filter counts (`pnpm run import`, not `pnpm import`; see the README of the importer).
Put the counts and the date in the entry in `docs/bronnen.md`.
Do it once: a run reads every enabled feed in the register and the Wikipedia pages, not only the new source, so don't repeat it.

## 6. Document

- `apps/importer/README.md`: a section "De voetbalfeed van …" (or the like) in the style of the last one, and the source in the sentence that lists the sources with a filter.
  Look for other sentences that name all sources: `git grep -n "<name of the previous source>"`.
- `docs/beslissingen.md`: a decision "We nemen …", in the fixed format, with the date.
  If the source changes an earlier decision, add a **Later:** line there.
- `docs/bronnen.md`: finish the entry with the numbers from step 5 and what the importer does.

## 7. Check

`pnpm lint`, `pnpm typecheck`, `pnpm test` with the database running, `pnpm build`.
Does the sources page or another page show source names or counts from the register?
Then also `pnpm test:a11y` and the smoke test (see _De controles_ in `CONTRIBUTING.md`).
Then do the final check in `AGENTS.md`, and open the pull request as the `builder-workflow` skill says.

## Never

- show or store more than the default without written permission in the register;
- request anything from a source's pages beyond its feed;
- keep a source that asked us to stop: set `enabled` off at once and write it in `docs/bronnen.md`.

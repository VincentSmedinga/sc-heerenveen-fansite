---
name: pr-screenshots
description: Make the screenshots for a pull request that changes what visitors see, put them on the pr-screenshots branch and into the description. Use as the Builder right after the pull request is open, or to say that nobody sees the change.
argument-hint: <pull request number>
---

# Screenshots for pull request $ARGUMENTS

You are the Builder of the pull request.
The rules and the decisions behind them are in _Screenshots_ in `AGENTS.md` and in `docs/beslissingen.md` (_Screenshots staan op een eigen branch_ and the decisions after it); the commands for a build are in _Screenshots maken_ in `apps/site/README.md`.
This skill is the order and the choices.

## 1. Does anybody see the change?

- A change to a test, a migration, tooling, a script or documentation is invisible: no screenshots.
  Write "Geen screenshots: de wijziging is niet zichtbaar." under _Screenshots_ in the description, and stop.
- Anything else that shows in the browser, on a page or in Storybook, needs one to three images, not a gallery.

## 2. Choose what to show

- **Widths:** a phone (390) and a small desktop (900), and only the widths that show the change.
- **Before and after**, side by side, only when the change is a difference.
  Make the "before" from a build of `origin/main` the same way.
- **Light** by default.
  **Dark** only when the change is about the theme or the colours, or something shows in dark that doesn't in light.
  Never two copies that differ only in the theme.
- **Made-up data only:** a story, or the built site with the data of `pnpm --filter site test-data`.
  Never a real forum discussion, a screen name of a member, or anything from the database of the host.
  The script only takes a build on your own computer, and that stays so.

## 3. Build and make them

For a page (from the root, as the README of the site says):

```sh
docker compose up -d --wait
pnpm build
pnpm db:migrate
pnpm db:seed
pnpm --filter site test-data
pnpm --filter site assemble .next/screenshots
HOSTNAME=127.0.0.1 pnpm --filter site exec node --env-file-if-exists=../../.env .next/screenshots/apps/site/server.js
```

Put the test data in before you start the site: the homepage keeps its headlines for five minutes.
Then in a second terminal: `pnpm screenshots http://127.0.0.1:3000 / /podcasts [--dark] [--full-page]`.

For a component, `pnpm --filter design-system build-storybook`, serve `packages/design-system/storybook-static` on port 6006 (`python3 -m http.server 6006 --bind 127.0.0.1 --directory …`), and run `pnpm screenshots http://127.0.0.1:6006 <story id>`.
A story id looks like `componenten-page-footer--light`.

The PNGs land in `screenshots/`, which Git ignores.
**Open every image and look at it** before you use it: the right page, no error page, no real names, nothing cut off.
Stop the servers you started, by port (`lsof -t -iTCP:<port> -sTCP:LISTEN`): the standalone site renames its process, so `pkill -f server.js` misses it.
Remove the test data again if you put it in your development database: `pnpm --filter site test-data --remove`.

## 4. Put them on `pr-screenshots`

Needs the pull request's number, so only after it is open.
Pushing here needs no new go-ahead, but it is a push: use `/Volumes/Code/family/bin/as-claude` with the HTTPS override from `builder-workflow`.

```sh
git fetch origin pr-screenshots
git worktree add --detach ../pr-screenshots-<number> origin/pr-screenshots
mkdir ../pr-screenshots-<number>/pr-<number>
cp screenshots/*.png ../pr-screenshots-<number>/pr-<number>/
cd ../pr-screenshots-<number>
git add pr-<number> && git commit -m "docs: add screenshots for pull request <number>"
<as-claude push of HEAD to pr-screenshots>
cd - && git worktree remove ../pr-screenshots-<number>
```

If the push is rejected because another Builder pushed first: `git pull --rebase origin pr-screenshots` in that worktree, and push again.
Never merge or delete that branch, and leave the folders of other pull requests alone.

## 5. Put them in the description

- Read the current body first (`gh pr view <number> --json body`): the Reviewer's boxes may have been ticked since, and an old copy overwrites them.
- In the place under _Zo controleer je het_, put the images in a table, two next to each other, with `?raw=true` and `blob` in the address and a Dutch alt text that says what the image shows: "De footer op een telefoon, Donker gekozen".
  The table is in `AGENTS.md`.
- Write the body to a file outside the repository, as flowing paragraphs (GitHub shows each line break), and run `gh pr edit` through `as-claude`.
- Check it: `gh pr view <number> --json body`, and open one image address.

The Reviewer can't render a page, so it only reports missing screenshots; the owner looks at what is there.

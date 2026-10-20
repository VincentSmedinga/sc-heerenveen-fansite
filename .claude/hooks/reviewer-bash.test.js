// Runs the reviewer's Bash hook with sample commands. Exit code 0 lets a command through; 2 blocks it.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { test } from 'node:test'

const hook = join(import.meta.dirname, 'reviewer-bash.js')
const run = (input) => spawnSync(process.execPath, [hook], { encoding: 'utf8', input }).status
const runCommand = (command) => run(JSON.stringify({ tool_input: { command }, tool_name: 'Bash' }))

test('lets the read-only commands through', () => {
  for (const command of [
    'git diff origin/main...HEAD --stat',
    'git log -1 --format=%H',
    'git show HEAD:AGENTS.md',
    'git status',
    'gh issue view 44',
    'gh pr view 52 --json title,body',
    'gh pr diff 52',
    "gh api 'repos/owner/repo/issues?per_page=100' --jq '.[].title'",
    "gh api -H 'Accept: application/vnd.github.raw' repos/owner/repo/contents/AGENTS.md",
    'pnpm lint',
    'pnpm typecheck',
    'pnpm test',
    'pnpm test:a11y',
    'pnpm build',
    'pnpm --filter design-system build-storybook',
    'pnpm --filter @fansite/shared test',
    'pnpm exec playwright test tests/home.spec.ts',
  ]) {
    assert.equal(runCommand(command), 0, command)
  }
})

test('blocks commands that change something or are not on the list', () => {
  for (const command of [
    'git commit -m test',
    'git push',
    'git checkout main',
    'git diff --output=/tmp/diff',
    'git diff --out=/tmp/diff',
    'gh pr review 52 --approve',
    'gh pr merge 52',
    'gh pr comment 52 --body test',
    'gh api -X POST repos/owner/repo/issues/1/comments',
    'gh api -XPOST repos/owner/repo/issues/1/comments',
    'gh api --method=PATCH repos/owner/repo/issues/1',
    'gh api repos/owner/repo/issues/1/comments -f body=test',
    'gh api graphql -F query=@query.graphql',
    'pnpm format',
    'pnpm install',
    'pnpm lint --fix',
    'pnpm --filter design-system lint',
    'pnpm exec eslint --fix .',
    'pnpm exec playwright test -u',
    'pnpm exec playwright test --update-snapshots',
    'sed -i s/a/b/ AGENTS.md',
    'cat AGENTS.md',
  ]) {
    assert.equal(runCommand(command), 2, command)
  }
})

test('blocks chained, piped and redirected commands', () => {
  for (const command of [
    'git diff && rm -rf .',
    'git diff; touch file',
    'git diff | tee file',
    'git diff > file',
    'git diff $(id)',
    'git diff `id`',
    'git diff \\\n; touch file',
  ]) {
    assert.equal(runCommand(command), 2, command)
  }
})

test("blocks when it can't read the command", () => {
  assert.equal(run('not json'), 2)
  assert.equal(run(JSON.stringify({ tool_name: 'Bash' })), 2)
})

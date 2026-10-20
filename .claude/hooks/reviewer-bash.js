// Keeps the reviewer subagent read-only. A subagent's tools field can't narrow Bash to certain commands, so this
// PreToolUse hook blocks every command that isn't on the list below. Commands on the list still go through the normal
// permission settings.
import { readFileSync } from 'node:fs'

const rules = [
  // Read the change. --output, or an abbreviation of it, would write a file.
  { allow: /^git (diff|log|show|status)(\s|$)/, unless: /\s--out/ },
  // Read the issue, the pull request and its checks. gh api only reads: no method, fields or input, also not as
  // short flags run together, such as -XPOST.
  { allow: /^gh (issue view|pr checks|pr diff|pr view)(\s|$)/ },
  { allow: /^gh api\s/, unless: /\s(-[a-zA-Z]*[XfF]|--method|--field|--raw-field|--input)/ },
  // The checks, as the package scripts define them, without extra arguments.
  { allow: /^pnpm (build|lint|test|test:[\w:-]+|typecheck)$/ },
  { allow: /^pnpm --filter [\w@/.-]+ (build|build-storybook|test|test:[\w:-]+|typecheck)$/ },
  // Playwright, with the axe checks in it (#25). Updating snapshots would write files.
  { allow: /^pnpm exec playwright test(\s|$)/, unless: /\s(-u|--update-snapshots)(\s|=|$)/ },
]

const block = (reason) => {
  process.stderr.write(`${reason} The reviewer only reads; .claude/agents/reviewer.md lists what it may run.\n`)
  process.exit(2)
}

// A hook that fails with any exit code other than 2 lets the command through, so block when the input can't be read.
let command = ''
try {
  command = String(JSON.parse(readFileSync(0, 'utf8')).tool_input?.command ?? '').trim()
} catch {
  block("Couldn't read the command.")
}

// One command at a time: no chaining, pipes, redirection, substitution, variables or line continuation.
if (/[;&|<>`$\\\n]/.test(command)) block('Run one command at a time, without ; & | < > ` $ or a backslash.')

// The shell drops quotes before a command sees its arguments, so "-f" or '-XPOST' is still a flag. Check the
// exceptions without quotes, so quoting a flag can't slip it past them.
const unquoted = command.replace(/["']/g, '')

if (!rules.some(({ allow, unless }) => allow.test(command) && !unless?.test(unquoted))) {
  block(`Not on the reviewer's list: ${command}.`)
}

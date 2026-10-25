// Gets the project board ready for a new week, with one command. It shows what it would change;
// with --apply it does it.
//
//   pnpm rollover            shows the plan and changes nothing
//   pnpm rollover --apply    carries the plan out
//
// The rules:
// 1. A closed issue on the board without an iteration gets the iteration that holds the day it
//    was closed.
// 2. An open issue with status Bezig, in an iteration that is over, moves to the iteration that
//    holds today.
// 3. Open issues with any other status (Te doen) are never touched.
// 4. It prints what was closed in the previous iteration, per milestone.
// 5. If no iteration holds a day that is needed, it stops and changes nothing: the iterations
//    have to be added first.
// 6. Issues that aren't on the board are skipped, and counted.
//
// What decides something is a function without side effects, exported for the tests. What
// touches GitHub (gh and its GraphQL API) is below that, and only runs when this file is
// started directly.
import { spawnSync } from 'node:child_process'
import { realpathSync } from 'node:fs'

/** A problem we expect: it is shown as a message, without a stack. */
export class RolloverError extends Error {
  constructor(message, exitCode = 1) {
    super(message)
    this.exitCode = exitCode
  }
}

export const projectOwner = 'VincentSmedinga'
export const projectNumber = 1
export const iterationFieldName = 'Iteratie'
export const statusFieldName = 'Status'
export const busyStatus = 'Bezig'

// The weeks of the board are Dutch weeks, so a moment close to midnight belongs to the Dutch
// day, not the UTC one.
const dayFormat = new Intl.DateTimeFormat('en-CA', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'Europe/Amsterdam',
  year: 'numeric',
})

/** The Dutch calendar day (`2026-10-23`) of a moment. */
export function dayOf(moment) {
  return dayFormat.format(new Date(moment))
}

/** The day after the last day of an iteration, as `2026-10-26`. */
export function endOf({ duration, startDate }) {
  const end = new Date(`${startDate}T00:00:00Z`)
  end.setUTCDate(end.getUTCDate() + duration)

  return end.toISOString().slice(0, 10)
}

const holds = (iteration, day) => iteration.startDate <= day && day < endOf(iteration)

/** The iteration that holds a day, or undefined when there is none. */
export function findIteration(iterations, day) {
  return iterations.find((iteration) => holds(iteration, day))
}

/** The message for when iterations are missing. */
export function missingMessage(missing) {
  const lines = missing.map(({ day, item }) => `  #${item.number} needs an iteration for ${day}`)

  return [
    'No iteration holds a day that is needed, so nothing was changed.',
    ...lines,
    'Add iterations to the field Iteratie of the board (Settings of the project, then Iteratie), and run this again.',
  ].join('\n')
}

/**
 * Decides which item moves to which iteration. An item is `{ closedAt, iteration, number,
 * state, status, title }`, where `iteration` is `{ duration, startDate, ... }` or null. It
 * gives `moves` (the item, the iteration and why) and `missing`: the items that need a day that
 * no iteration holds. When `missing` isn't empty, nothing may be moved.
 */
export function planMoves({ items, iterations, today }) {
  const moves = []
  const missing = []

  for (const item of items) {
    if (item.state === 'CLOSED' && item.iteration === null) {
      const day = dayOf(item.closedAt)
      const target = findIteration(iterations, day)

      if (target === undefined) {
        missing.push({ day, item })
      } else {
        moves.push({ item, reason: `closed on ${day}`, target })
      }
    } else if (
      item.state === 'OPEN' &&
      item.status === busyStatus &&
      item.iteration !== null &&
      endOf(item.iteration) <= today
    ) {
      const target = findIteration(iterations, today)

      if (target === undefined) {
        missing.push({ day: today, item })
      } else {
        moves.push({ item, reason: `still ${busyStatus} after ${item.iteration.title}`, target })
      }
    }
  }

  return { missing, moves }
}

/** The latest iteration that is over on `today`, or undefined when none is. */
export function previousIteration(iterations, today) {
  return iterations
    .filter((iteration) => endOf(iteration) <= today)
    .toSorted((a, b) => a.startDate.localeCompare(b.startDate))
    .at(-1)
}

/**
 * The items closed during an iteration, grouped by milestone. Items without a milestone come
 * last.
 */
export function summariseClosed({ items, iteration }) {
  const groups = new Map()

  for (const item of items) {
    if (item.state !== 'CLOSED' || item.closedAt === null || !holds(iteration, dayOf(item.closedAt))) {
      continue
    }

    const milestone = item.milestone ?? null
    groups.set(milestone, [...(groups.get(milestone) ?? []), item])
  }

  return [...groups]
    .map(([milestone, closed]) => ({ closed: closed.toSorted((a, b) => a.number - b.number), milestone }))
    .toSorted(
      (a, b) => (a.milestone === null) - (b.milestone === null) || (a.milestone ?? '').localeCompare(b.milestone ?? ''),
    )
}

const issueLine = ({ number, title }) => `#${number} ${title}`

/** The text that shows the plan, the summary and what was skipped. */
export function formatReport({ applied, moves, previous, skipped, summary }) {
  const lines = []

  if (moves.length === 0) {
    lines.push('Nothing to move on the board.')
  } else {
    lines.push(applied ? 'Moved:' : 'Would move:')

    for (const { item, reason, target } of moves) {
      lines.push(`  ${issueLine(item)} → ${target.title} (${reason})`)
    }
  }

  lines.push('')

  if (previous === undefined) {
    lines.push('There is no previous iteration to summarise.')
  } else {
    const count = summary.reduce((total, { closed }) => total + closed.length, 0)
    lines.push(`Closed in ${previous.title}: ${count}`)

    for (const { closed, milestone } of summary) {
      lines.push(`  ${milestone ?? 'No milestone'}`)

      for (const item of closed) {
        lines.push(`    ${issueLine(item)}`)
      }
    }
  }

  lines.push('', `Skipped, not on the board: ${skipped.length}`)

  if (skipped.length > 0) {
    lines.push(`  ${skipped.map(({ number }) => `#${number}`).join(', ')}`)
  }

  if (!applied && moves.length > 0) {
    lines.push('', 'This was a dry run. Run `pnpm rollover --apply` to carry it out.')
  }

  return lines.join('\n')
}

/** The numbers of the issues of the repository that aren't on the board. */
export function notOnBoard({ boardNumbers, issues }) {
  const onBoard = new Set(boardNumbers)

  return issues.filter(({ number }) => !onBoard.has(number)).toSorted((a, b) => a.number - b.number)
}

/** Reads the arguments. Anything but `--apply` is a mistake. */
export function parseArguments(args) {
  const unknown = args.filter((argument) => argument !== '--apply')

  if (unknown.length > 0) {
    throw new RolloverError(`Unknown argument: ${unknown.join(' ')}\nUsage: pnpm rollover [--apply]`)
  }

  return { apply: args.includes('--apply') }
}

/**
 * Turns an item of the GraphQL answer into the shape of `planMoves`, or gives undefined when it
 * isn't an issue.
 */
export function readItem(node) {
  if (node.content?.__typename !== 'Issue') {
    return undefined
  }

  const { closedAt, milestone, number, state, title } = node.content

  return {
    closedAt,
    id: node.id,
    iteration:
      node.iteration === null
        ? null
        : { duration: node.iteration.duration, startDate: node.iteration.startDate, title: node.iteration.title },
    milestone: milestone?.title ?? null,
    number,
    state,
    status: node.status?.name ?? null,
    title,
  }
}

/**
 * The iterations of the field, the active ones and the completed ones, as `{ duration, id,
 * startDate, title }`.
 */
export function readIterations(configuration) {
  return [...configuration.completedIterations, ...configuration.iterations].toSorted((a, b) =>
    a.startDate.localeCompare(b.startDate),
  )
}

/**
 * Runs the whole plan with the board's data. `move` is called per item when applying; it has
 * the side effect.
 */
export function run({ apply, issues, items, iterations, move, today }) {
  const { missing, moves } = planMoves({ items, iterations, today })

  if (missing.length > 0) {
    throw new RolloverError(missingMessage(missing))
  }

  if (apply) {
    for (const { item, target } of moves) {
      move(item, target)
    }
  }

  const previous = previousIteration(iterations, today)

  return formatReport({
    applied: apply,
    moves,
    previous,
    skipped: notOnBoard({ boardNumbers: items.map(({ number }) => number), issues }),
    summary: previous === undefined ? [] : summariseClosed({ items, iteration: previous }),
  })
}

/**
 * Every page of a connection: `read(data)` gives `{ nodes, pageInfo }` of a page, `query` takes
 * `$after`.
 */
function allPages(query, variables, read) {
  const nodes = []
  let after

  do {
    const page = read(graphql(query, after === undefined ? variables : { ...variables, after }))
    nodes.push(...page.nodes)
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : undefined
  } while (after !== undefined)

  return nodes
}

/** Runs a GraphQL query with gh. Variables are strings; gh sends them as they are. */
function graphql(query, variables = {}) {
  const args = [
    'api',
    'graphql',
    '-f',
    `query=${query}`,
    ...Object.entries(variables).flatMap(([name, value]) => [
      typeof value === 'number' ? '-F' : '-f',
      `${name}=${value}`,
    ]),
  ]
  const { error, status, stderr, stdout } = spawnSync('gh', args, { encoding: 'utf8' })

  if (error !== undefined || status !== 0) {
    throw new RolloverError(
      ['Could not reach GitHub with gh.', (error?.message ?? stderr).trim()].filter(Boolean).join('\n'),
    )
  }

  return JSON.parse(stdout).data
}

const projectQuery = `
  query($owner: String!, $number: Int!) {
    user(login: $owner) {
      projectV2(number: $number) {
        id
        field(name: "${iterationFieldName}") {
          ... on ProjectV2IterationField {
            id
            configuration {
              iterations { id title startDate duration }
              completedIterations { id title startDate duration }
            }
          }
        }
      }
    }
  }`

const itemsQuery = `
  query($owner: String!, $number: Int!, $after: String) {
    user(login: $owner) {
      projectV2(number: $number) {
        items(first: 100, after: $after) {
          pageInfo { hasNextPage endCursor }
          nodes {
            id
            content { __typename ... on Issue { number title state closedAt milestone { title } } }
            status: fieldValueByName(name: "${statusFieldName}") { ... on ProjectV2ItemFieldSingleSelectValue { name } }
            iteration: fieldValueByName(name: "${iterationFieldName}") { ... on ProjectV2ItemFieldIterationValue { title startDate duration } }
          }
        }
      }
    }
  }`

const issuesQuery = `
  query($owner: String!, $name: String!, $after: String) {
    repository(owner: $owner, name: $name) {
      issues(first: 100, after: $after) {
        pageInfo { hasNextPage endCursor }
        nodes { number title }
      }
    }
  }`

const moveMutation = `
  mutation($project: ID!, $item: ID!, $field: ID!, $iteration: String!) {
    updateProjectV2ItemFieldValue(
      input: { projectId: $project, itemId: $item, fieldId: $field, value: { iterationId: $iteration } }
    ) { projectV2Item { id } }
  }`

function main(args) {
  const { apply } = parseArguments(args)
  const owner = projectOwner
  const project = graphql(projectQuery, { number: projectNumber, owner }).user.projectV2

  if (project === null || project.field?.configuration === undefined) {
    throw new RolloverError(
      `Could not find project ${projectNumber} of ${owner} with an iteration field called ${iterationFieldName}.`,
    )
  }

  const repo = repository()
  const items = allPages(itemsQuery, { number: projectNumber, owner }, (data) => data.user.projectV2.items)
    .map(readItem)
    .filter((item) => item !== undefined)
  const issues = allPages(issuesQuery, { name: repo.name, owner: repo.owner }, (data) => data.repository.issues)

  console.log(
    run({
      apply,
      issues,
      items,
      iterations: readIterations(project.field.configuration),
      move: (item, target) => {
        graphql(moveMutation, { field: project.field.id, item: item.id, iteration: target.id, project: project.id })
      },
      today: dayOf(Date.now()),
    }),
  )
}

function repository() {
  const { error, status, stderr, stdout } = spawnSync('gh', ['repo', 'view', '--json', 'name,owner'], {
    encoding: 'utf8',
  })

  if (error !== undefined || status !== 0) {
    throw new RolloverError(
      ['Could not find the repository with gh.', (error?.message ?? stderr).trim()].filter(Boolean).join('\n'),
    )
  }

  const { name, owner } = JSON.parse(stdout)

  return { name, owner: owner.login }
}

// `import.meta.main` only exists from Node 24.2, and engines allows 24.0 and 24.1 too, so
// compare the paths ourselves.
if (process.argv[1] !== undefined && realpathSync(process.argv[1]) === import.meta.filename) {
  try {
    main(process.argv.slice(2))
  } catch (error) {
    if (!(error instanceof RolloverError)) {
      throw error
    }

    console.error(error.message)
    process.exitCode = error.exitCode
  }
}

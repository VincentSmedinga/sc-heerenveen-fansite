// Tests the parts of `pnpm iterations` that decide something and have no side effects. What talks to GitHub is tried
// against the board in a dry run (see the pull request).
import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  dayOf,
  endOf,
  findIteration,
  formatReport,
  IterationsError,
  missingMessage,
  notOnBoard,
  parseArguments,
  planMoves,
  previousIteration,
  readItem,
  run,
  summariseClosed,
} from './iterations.js'

const week = (number, startDate) => ({ duration: 7, id: `id-${number}`, startDate, title: `Week ${number}` })
const iterations = [week(43, '2026-10-19'), week(44, '2026-10-26'), week(45, '2026-11-02')]

const item = (number, fields = {}) => ({
  closedAt: null,
  id: `item-${number}`,
  iteration: null,
  milestone: null,
  number,
  state: 'OPEN',
  status: 'Te doen',
  title: `Issue ${number}`,
  ...fields,
})

test('dayOf gives the Dutch day, also close to midnight', () => {
  assert.equal(dayOf('2026-10-23T14:54:25Z'), '2026-10-23')
  assert.equal(dayOf('2026-10-25T23:30:00Z'), '2026-10-26')
  assert.equal(dayOf('2026-10-25T22:30:00Z'), '2026-10-25')
})

test('endOf gives the day after the last day of an iteration', () => {
  assert.equal(endOf(week(43, '2026-10-19')), '2026-10-26')
  assert.equal(endOf({ duration: 14, startDate: '2026-10-25' }), '2026-11-08')
})

test('findIteration includes the first day and excludes the day after the last', () => {
  assert.equal(findIteration(iterations, '2026-10-19').title, 'Week 43')
  assert.equal(findIteration(iterations, '2026-10-25').title, 'Week 43')
  assert.equal(findIteration(iterations, '2026-10-26').title, 'Week 44')
  assert.equal(findIteration(iterations, '2026-10-18'), undefined)
  assert.equal(findIteration(iterations, '2026-11-09'), undefined)
})

test('previousIteration is the latest one that is over', () => {
  assert.equal(previousIteration(iterations, '2026-10-26').title, 'Week 43')
  assert.equal(previousIteration(iterations, '2026-11-04').title, 'Week 44')
  assert.equal(previousIteration(iterations, '2026-10-23'), undefined)
})

test('planMoves gives a closed issue without an iteration the iteration of its closing day', () => {
  const { missing, moves } = planMoves({
    items: [item(1, { closedAt: '2026-10-27T08:00:00Z', state: 'CLOSED', status: 'Klaar' })],
    iterations,
    today: '2026-11-02',
  })

  assert.deepEqual(missing, [])
  assert.deepEqual(
    moves.map(({ item: { number }, target }) => [number, target.title]),
    [[1, 'Week 44']],
  )
})

test('planMoves leaves a closed issue that has an iteration alone', () => {
  const { moves } = planMoves({
    items: [
      item(1, {
        closedAt: '2026-10-27T08:00:00Z',
        iteration: week(43, '2026-10-19'),
        state: 'CLOSED',
        status: 'Klaar',
      }),
    ],
    iterations,
    today: '2026-11-02',
  })

  assert.deepEqual(moves, [])
})

test('planMoves moves an open Bezig issue from a past iteration to the current one', () => {
  const { moves } = planMoves({
    items: [item(2, { iteration: week(43, '2026-10-19'), status: 'Bezig' })],
    iterations,
    today: '2026-10-26',
  })

  assert.deepEqual(
    moves.map(({ item: { number }, target }) => [number, target.title]),
    [[2, 'Week 44']],
  )
})

test('planMoves leaves an open Bezig issue in the current iteration alone', () => {
  const { moves } = planMoves({
    items: [item(2, { iteration: week(44, '2026-10-26'), status: 'Bezig' })],
    iterations,
    today: '2026-10-28',
  })

  assert.deepEqual(moves, [])
})

test('planMoves never touches open Te doen issues', () => {
  const { missing, moves } = planMoves({
    items: [item(3), item(4, { iteration: week(43, '2026-10-19') })],
    iterations,
    today: '2026-11-20',
  })

  assert.deepEqual(moves, [])
  assert.deepEqual(missing, [])
})

test('planMoves reports a day that no iteration holds', () => {
  const { missing } = planMoves({
    items: [
      item(1, { closedAt: '2026-10-05T08:00:00Z', state: 'CLOSED' }),
      item(2, { iteration: week(45, '2026-11-02'), status: 'Bezig' }),
    ],
    iterations,
    today: '2026-11-12',
  })

  assert.deepEqual(
    missing.map(({ day, item: { number } }) => [number, day]),
    [
      [1, '2026-10-05'],
      [2, '2026-11-12'],
    ],
  )
})

test('summariseClosed groups what was closed in an iteration by milestone, sorted by number', () => {
  const closed = (number, milestone, closedAt) => item(number, { closedAt, milestone, state: 'CLOSED' })
  const summary = summariseClosed({
    items: [
      closed(9, 'Release 1', '2026-10-21T10:00:00Z'),
      closed(5, 'Release 1', '2026-10-20T10:00:00Z'),
      closed(7, null, '2026-10-22T10:00:00Z'),
      closed(3, 'Release 0', '2026-10-19T10:00:00Z'),
      closed(4, 'Release 1', '2026-10-26T10:00:00Z'),
      item(8),
    ],
    iteration: week(43, '2026-10-19'),
  })

  assert.deepEqual(
    summary.map(({ closed: list, milestone }) => [milestone, list.map(({ number }) => number)]),
    [
      ['Release 0', [3]],
      ['Release 1', [5, 9]],
      [null, [7]],
    ],
  )
})

test('notOnBoard gives the issues that the board does not have', () => {
  assert.deepEqual(notOnBoard({ boardNumbers: [1, 3], issues: [{ number: 61 }, { number: 3 }, { number: 2 }] }), [
    { number: 2 },
    { number: 61 },
  ])
})

test('parseArguments only knows --apply', () => {
  assert.deepEqual(parseArguments([]), { apply: false })
  assert.deepEqual(parseArguments(['--apply']), { apply: true })
  assert.throws(() => parseArguments(['--aply']), IterationsError)
})

test('readItem reads an issue and skips what is not an issue', () => {
  assert.equal(readItem({ content: { __typename: 'DraftIssue' }, id: 'x' }), undefined)
  assert.deepEqual(
    readItem({
      content: {
        __typename: 'Issue',
        closedAt: null,
        milestone: { title: 'Release 1' },
        number: 5,
        state: 'OPEN',
        title: 'Five',
      },
      id: 'item-5',
      iteration: { duration: 7, startDate: '2026-10-19', title: 'Week 43' },
      status: { name: 'Bezig' },
    }),
    {
      closedAt: null,
      id: 'item-5',
      iteration: { duration: 7, startDate: '2026-10-19', title: 'Week 43' },
      milestone: 'Release 1',
      number: 5,
      state: 'OPEN',
      status: 'Bezig',
      title: 'Five',
    },
  )
})

test('missingMessage says which issues need which day', () => {
  const message = missingMessage([{ day: '2026-11-12', item: item(2) }])

  assert.match(message, /nothing was changed/)
  assert.match(message, /#2 needs an iteration for 2026-11-12/)
})

test('formatReport shows a dry run and what was skipped', () => {
  const text = formatReport({
    applied: false,
    moves: [{ item: item(2), reason: 'still Bezig after Week 43', target: week(44, '2026-10-26') }],
    previous: week(43, '2026-10-19'),
    skipped: [{ number: 61 }],
    summary: [{ closed: [item(5)], milestone: 'Release 1' }],
  })

  assert.match(text, /Would move:\n {2}#2 Issue 2 → Week 44/)
  assert.match(text, /Closed in Week 43: 1\n {2}Release 1\n {4}#5 Issue 5/)
  assert.match(text, /Skipped, not on the board: 1\n {2}#61/)
  assert.match(text, /dry run/)
})

test('run moves nothing in a dry run and everything when applying', () => {
  const items = [item(1, { closedAt: '2026-10-21T10:00:00Z', state: 'CLOSED' })]
  const moved = []
  const options = {
    issues: [],
    items,
    iterations,
    move: (moving, target) => moved.push([moving.number, target.title]),
    today: '2026-10-26',
  }

  run({ ...options, apply: false })
  assert.deepEqual(moved, [])

  run({ ...options, apply: true })
  assert.deepEqual(moved, [[1, 'Week 43']])
})

test('run changes nothing when an iteration is missing', () => {
  const moved = []

  assert.throws(
    () =>
      run({
        apply: true,
        issues: [],
        items: [
          item(1, { closedAt: '2026-10-21T10:00:00Z', state: 'CLOSED' }),
          item(2, { closedAt: '2026-09-01T10:00:00Z', state: 'CLOSED' }),
        ],
        iterations,
        move: (moving) => moved.push(moving.number),
        today: '2026-10-26',
      }),
    IterationsError,
  )
  assert.deepEqual(moved, [])
})

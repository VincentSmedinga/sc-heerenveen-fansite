// The names of the old fansite that look alike and may be one person, for the check report. The
// owner decides each cluster; `old-site-names.ts` holds the ones that are decided. This only
// lists, and never changes a name.
import type { OldSiteData } from './old-site-file.ts'

import { cleanOldSiteName } from './old-site-names.ts'
import { isOurCode, resolveOldSiteCode } from './old-site-players.ts'
import { personsWhoDiffer } from './person-names.ts'

/** A spelling of a name and how often the files use it. */
export type OldSiteNameSpelling = { count: number; name: string }

/** Words left out of the key: `Van der Leegte` and `Leegte` are the same. */
const infixes: ReadonlySet<string> = new Set(['de', 'den', 'der', 'van'])

/** The shortest key that may differ by two letters; shorter keys differ too easily. */
const minimumKeyLength = 7

/** The most letters that may differ in two keys of a cluster. */
const maximumDistance = 2

/**
 * Every name of a player of the opponent or of ours in the line-ups, goals, cards and assists
 * of the files, with how often each spelling occurs. A code of ours counts under the name it
 * resolves to, and the owner's corrections are applied first.
 */
export function countOldSiteNames(data: OldSiteData): Map<string, number> {
  const byCode = new Map(data.players.map((player) => [player.code, player]))
  const counts = new Map<string, number>()
  const add = (name: null | string) => {
    const clean = cleanOldSiteName(name)

    if (clean !== '') {
      counts.set(clean, (counts.get(clean) ?? 0) + 1)
    }
  }
  const addPerson = (code: null | string, name: null | string) => {
    add((isOurCode(code) ? resolveOldSiteCode(code, byCode, '')?.name : undefined) ?? name ?? code)
  }

  for (const match of data.matches) {
    for (const entry of match.lineup) {
      addPerson(entry.playerCode, entry.playerName)
    }
    for (const event of match.events) {
      addPerson(event.playerCode, event.playerName)

      if (event.event === 1 && event.assist !== null) {
        addPerson(event.assist, event.assist)
      }
    }
  }

  return counts
}

/** The number of letters to change, add or remove to turn one text into the other. */
export function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index)

  for (let row = 1; row <= a.length; row += 1) {
    const current = [row]

    for (let column = 1; column <= b.length; column += 1) {
      current[column] = Math.min(
        previous[column]! + 1,
        current[column - 1]! + 1,
        previous[column - 1]! + (a[row - 1] === b[column - 1] ? 0 : 1),
      )
    }
    previous = current
  }

  return previous[b.length]!
}

/**
 * The groups of names that may be one person, each with its spellings, most used first. A group
 * has two names or more. A group of names the owner said are different people is left out.
 * The groups are in the order of the alphabet.
 */
export function findOldSiteNameClusters(counts: ReadonlyMap<string, number>): OldSiteNameSpelling[][] {
  const names = [...counts.keys()].toSorted((a, b) => a.localeCompare(b, 'nl'))
  const keys = names.map(nameClusterKey)
  const parent = names.map((_, index) => index)
  const root = (index: number): number => (parent[index] === index ? index : (parent[index] = root(parent[index]!)))

  for (let one = 0; one < names.length; one += 1) {
    for (let other = one + 1; other < names.length; other += 1) {
      if (alike(keys[one]!, keys[other]!)) {
        parent[root(other)] = root(one)
      }
    }
  }

  const groups = new Map<number, OldSiteNameSpelling[]>()

  names.forEach((name, index) => {
    groups.set(root(index), [...(groups.get(root(index)) ?? []), { count: counts.get(name)!, name }])
  })

  return [...groups.values()]
    .filter((group) => group.length > 1)
    .filter((group) => !personsWhoDiffer.some((same) => group.every((one) => same.includes(one.name))))
    .map((group) => group.toSorted((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'nl')))
    .toSorted((a, b) => firstAlphabetically(a).localeCompare(firstAlphabetically(b), 'nl'))
}

/** A name as the clusters compare it: no capitals, accents, punctuation or infixes. */
export function nameClusterKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(' ')
    .filter((word) => word !== '' && !infixes.has(word))
    .join(' ')
}

/** Whether two keys may be one person. */
function alike(a: string, b: string): boolean {
  if (a === b) {
    return true
  }
  if (a.length >= minimumKeyLength && b.length >= minimumKeyLength && editDistance(a, b) <= maximumDistance) {
    return true
  }

  const [firstA, ...restA] = a.split(' ')
  const [firstB, ...restB] = b.split(' ')

  // The same last word, and a first word that is the start of the other: `Tom` and `Tommie`.
  return (
    restA.length > 0 && restA.at(-1) === restB.at(-1) && (firstB!.startsWith(firstA!) || firstA!.startsWith(firstB!))
  )
}

const firstAlphabetically = (group: readonly OldSiteNameSpelling[]) =>
  group.map((one) => one.name).toSorted((a, b) => a.localeCompare(b, 'nl'))[0]!

// The step `personen` of `import:old-site` (#967): links the players of the old matches (source
// `verslag`, no person yet) to a person, which is a title of the Dutch Wikipedia. It links only
// when it is certain, and says why when it is not. It reuses `createPersonBook`, so the titles
// and redirects are remembered in `person_pages` like everywhere else.
import { createPersonBook } from '@fansite/db/persons'
import { players } from '@fansite/db/schema'
import { and, eq, inArray, isNotNull, isNull } from 'drizzle-orm'

import type { Fetcher } from './fetcher.ts'
import type { OldSiteDatabase, OldSiteStepReport } from './old-site-step.ts'

import { pauseBetweenRequests } from './import-person-data.ts'
import { nameKey } from './read-squad.ts'
import { linkedPage, pageUrl } from './read-wikipedia.ts'
import { printable } from './text.ts'

/** What Wikipedia says about the article under a title. */
export type TitleAnswer =
  | { article: string; kind: 'footballer' }
  | { kind: 'disambiguation' | 'missing' | 'not-a-footballer' }
  | { kind: 'unknown'; message: string }

/** Asks about one title; the import asks Wikipedia, a test gives its own answers. */
export type TitleLookup = (title: string) => Promise<TitleAnswer>

const maxRedirects = 3
const redirectStart = /^#(?:redirect|doorverwijzing)\b/iu
const disambiguation = /\{\{\s*(?:dp|doorverwijspagina|disambig)\b|\[\[Categorie:Doorverwijspagina/iu
const footballer = /\[\[Categorie:[^\]|]*voetballer/iu

/**
 * The lookup of the import: asks the Dutch Wikipedia for the text of the page (`?action=raw`),
 * follows a redirect, and calls the article a footballer when it is in a category of
 * footballers. After a refusal by robots.txt or a request to wait, it asks nothing more.
 */
export function wikipediaTitleLookup(fetcher: Fetcher, origin: string, pause = pauseBetweenRequests): TitleLookup {
  let stopped: null | string = null
  let asked = 0

  return async (first) => {
    let title = first

    for (let step = 0; step <= maxRedirects; step++) {
      if (stopped !== null) {
        return { kind: 'unknown', message: stopped }
      }
      if (asked > 0 && pause > 0) {
        await new Promise((resolve) => setTimeout(resolve, pause))
      }

      asked++

      const outcome = await fetcher.fetch(pageUrl(origin, title))

      switch (outcome.kind) {
        case 'blocked-by-robots':
          stopped = `robots.txt does not allow ${printable(outcome.url)}, so no more titles are asked`
          return { kind: 'unknown', message: stopped }
        case 'error':
          return outcome.reason === 'http-status' && outcome.status === 404
            ? { kind: 'missing' }
            : { kind: 'unknown', message: printable(outcome.message) }
        case 'fetched': {
          const text = new TextDecoder('utf-8').decode(outcome.body).trimStart()
          const marker = redirectStart.exec(text)

          if (marker !== null) {
            const target = linkedPage(text.slice(marker[0].length))

            if (target === null) {
              return { kind: 'unknown', message: 'a redirect without a title to go to' }
            }

            title = target
            continue
          }

          return disambiguation.test(text)
            ? { kind: 'disambiguation' }
            : footballer.test(text)
              ? { article: title, kind: 'footballer' }
              : { kind: 'not-a-footballer' }
        }
        case 'not-modified':
          return { kind: 'unknown', message: 'the page answered 304 to a request without conditions' }
        case 'wait':
          stopped = `Wikipedia asks us to wait (${printable(outcome.url)}), so no more titles are asked`
          return { kind: 'unknown', message: stopped }
      }
    }

    return { kind: 'unknown', message: 'too many redirects in a row' }
  }
}

const reasons: Record<Exclude<TitleAnswer['kind'], 'footballer' | 'unknown'>, string> = {
  disambiguation: 'the title is a disambiguation page',
  missing: 'no article under that title',
  'not-a-footballer': 'the article is not about a footballer',
}

/**
 * Links every player with the source `verslag` and no person. A name that another row (of any
 * source, in another season) already has a person for gets that person. Otherwise the title is
 * the name; it is linked only when the article is a footballer's. A date of birth is not in the
 * files (see `docs/beslissingen/importer.md`), so there is none to compare.
 * Any doubt links nothing and becomes a line. Rows with another source are never touched.
 */
export async function importOldSitePersons(db: OldSiteDatabase, lookup: TitleLookup): Promise<OldSiteStepReport> {
  const report: OldSiteStepReport = { changed: 0, created: 0, lines: [], skipped: 0, unchanged: 0 }
  const open = await db
    .select()
    .from(players)
    .where(and(eq(players.source, 'verslag'), isNull(players.personId)))
  const linked = await db.select().from(players).where(isNotNull(players.personId))

  report.unchanged = (
    await db
      .select()
      .from(players)
      .where(and(eq(players.source, 'verslag'), isNotNull(players.personId)))
  ).length

  const personsOfName = new Map<string, Set<number>>()

  for (const row of linked) {
    const key = nameKey(row.name)

    personsOfName.set(key, (personsOfName.get(key) ?? new Set()).add(row.personId!))
  }

  const byName = new Map<string, typeof open>()

  for (const row of open) {
    byName.set(nameKey(row.name), [...(byName.get(nameKey(row.name)) ?? []), row])
  }

  const redirects = new Map<string, string>()
  const book = await createPersonBook(db, { redirects })
  const decided = new Map<number, number[]>()
  const doubts: string[] = []

  for (const [key, rows] of [...byName].sort(([a], [b]) => a.localeCompare(b))) {
    const name = rows[0]!.name
    const doubt = (reason: string) => {
      report.skipped += rows.length
      doubts.push(
        `no person for '${printable(name)}' (${rows.length === 1 ? '1 row' : `${rows.length} rows`}): ${reason}`,
      )
    }
    const ofName = personsOfName.get(key)

    if (ofName !== undefined) {
      if (ofName.size === 1) {
        decided.set([...ofName][0]!, [...(decided.get([...ofName][0]!) ?? []), ...rows.map((row) => row.id)])
      } else {
        doubt('the name belongs to more than one person already')
      }

      continue
    }

    const known = await book.resolve(name)

    if (known !== null) {
      decided.set(known, [...(decided.get(known) ?? []), ...rows.map((row) => row.id)])
      continue
    }

    const answer = await lookup(name)

    if (answer.kind === 'unknown') {
      doubt(`not asked: ${answer.message}`)
    } else if (answer.kind !== 'footballer') {
      doubt(reasons[answer.kind])
    } else {
      redirects.set(name, answer.article)
      redirects.set(answer.article, answer.article)

      const id = await book.resolve(name)

      if (id === null) {
        doubt('no person could be made')
      } else {
        decided.set(id, [...(decided.get(id) ?? []), ...rows.map((row) => row.id)])
      }
    }
  }

  for (const [personId, ids] of decided) {
    await db
      .update(players)
      .set({ personId })
      .where(and(inArray(players.id, ids), eq(players.source, 'verslag'), isNull(players.personId)))
    report.changed += ids.length
  }

  report.lines.push(
    `${report.changed} of ${open.length} players without a person linked, ${book.counts.people} new ${book.counts.people === 1 ? 'person' : 'persons'}, ${report.skipped} left alone`,
    ...doubts,
  )

  return report
}

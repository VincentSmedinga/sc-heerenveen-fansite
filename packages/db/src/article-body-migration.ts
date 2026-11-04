import type {
  ArticleBlock,
  ArticleDocument,
  ArticleInline,
  ArticleMark,
  ArticleParagraph,
} from '@fansite/shared/article-document'

import { readArticleDocument, serialiseArticleDocument } from '@fansite/shared/article-document'
import { and, eq, getTableName, like, not, sql } from 'drizzle-orm'

import type { Database } from './client.ts'

import { type Inline, readLegacyArticleText } from './legacy-article-text.ts'
import { articles, articleVersions } from './schema.ts'

/** What a text in the form that the site writes starts with. See `serialiseArticleDocument`. */
const jsonStart = '{"type":"doc"'

/**
 * The text of an article in the old format as the JSON that the editor stores: the same
 * paragraphs, headings of level 2, lists, bold, italic and links, so a visitor reads the same
 * text. A text that is JSON already is written in the form of the site when it is a document
 * the site accepts, and is returned as it is when it is not, so it is never made into a
 * paragraph of raw JSON. That makes running this twice harmless.
 */
export function articleBodyToJson(body: string) {
  if (isStoredAsJson(body)) {
    const checked = readArticleDocument(body)

    return checked.ok ? checked.json : body
  }

  const content = readLegacyArticleText(body).map((block): ArticleBlock => {
    switch (block.type) {
      case 'heading':
        return { attrs: { level: 2 }, type: 'heading', ...contentOf([{ text: block.text, type: 'text' }], []) }
      case 'list':
        return {
          content: block.items.map((item) => ({
            content: [{ type: 'paragraph', ...contentOf(item, []) } satisfies ArticleParagraph],
            type: 'listItem',
          })),
          type: 'bulletList',
        }
      case 'paragraph':
        return { type: 'paragraph', ...contentOf(block.children, []) }
    }
  })

  return serialiseArticleDocument({ content, type: 'doc' } satisfies ArticleDocument)
}

/**
 * Whether the text of an article is JSON of a document already, in whatever form: indented, or
 * with the keys in another order, as SQL may have put it there. Only the old format is left
 * alone by this, and it never starts with a brace and then parses as a document.
 */
export function isStoredAsJson(body: string) {
  if (!body.trimStart().startsWith('{')) {
    return false
  }

  try {
    const value: unknown = JSON.parse(body)

    return typeof value === 'object' && value !== null && 'type' in value && value.type === 'doc'
  } catch {
    return false
  }
}

/**
 * Turns the text of every article and every version that still has the old format into JSON,
 * and returns how many rows changed. It runs after the migrations of the schema, each time the
 * site starts: a row that is JSON already is at most written in the form of the site, so a
 * second run changes nothing, and a run that stopped halfway has been undone, since all rows
 * change in one transaction. A row
 * changes only if it still has the text that was read, so a save in between is not overwritten.
 * Nothing but `body` changes: `updated_at` and the versions stay as they are.
 */
export async function migrateArticleBodies(db: Database) {
  return db.transaction(async (transaction) => {
    let changed = 0

    for (const table of [articles, articleVersions]) {
      // A test that stops the migrations before the table exists has nothing to convert.
      const [exists] = await transaction.execute(
        sql`SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ${getTableName(table)}`,
      )

      if (Array.isArray(exists) && exists.length === 0) {
        continue
      }

      // A text that starts the way the site writes it is done; the others are looked at one by
      // one, since valid JSON in another form must be kept and not read as the old format.
      const rows = await transaction
        .select({ body: table.body, id: table.id })
        .from(table)
        .where(not(like(table.body, `${jsonStart}%`)))

      for (const row of rows) {
        const body = articleBodyToJson(row.body)

        if (body === row.body) {
          continue
        }

        const [result] = await transaction
          .update(table)
          .set({ body })
          .where(and(eq(table.id, row.id), eq(table.body, row.body)))

        changed += result.affectedRows
      }
    }

    return changed
  })
}

/** The text nodes of some inlines, with the marks of the bold, italic and link around them. */
function contentOf(inlines: Inline[], outer: ArticleMark[]): { content?: ArticleInline[] } {
  const nodes = inlines.flatMap((inline): ArticleInline[] => {
    switch (inline.type) {
      case 'bold':
        return contentOf(inline.children, [...outer, { type: 'bold' }]).content ?? []
      case 'italic':
        return contentOf(inline.children, [...outer, { type: 'italic' }]).content ?? []
      case 'link':
        return [withMarks(inline.text, [...outer, { attrs: { href: inline.href }, type: 'link' }])]
      case 'text':
        return [withMarks(inline.text, outer)]
    }
  })

  return nodes.length === 0 ? {} : { content: nodes }
}

/** A text node with its marks in the order of the editor: bold, italic, link. */
function withMarks(text: string, marks: ArticleMark[]): ArticleInline {
  const order = ['bold', 'italic', 'link']
  const sorted = marks.toSorted((a, b) => order.indexOf(a.type) - order.indexOf(b.type))

  return sorted.length === 0 ? { text, type: 'text' } : { marks: sorted, text, type: 'text' }
}

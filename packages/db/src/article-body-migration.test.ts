import type { RowDataPacket } from 'mysql2/promise'

import { readArticleDocument } from '@fansite/shared/article-document'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import { articleBodyToJson, migrateArticleBodies } from './article-body-migration.ts'
import { createTestDatabase } from './test-database.ts'

const everything = [
  'Dit is een **verzonnen** artikel met *cursieve* tekst en [onze bronnen](/bronnen).',
  '## Een kop',
  '- Het eerste punt\n- Het tweede punt, met **vet**',
  '**vet en *cursief erin* met [een link](https://www.lc.nl/sport)** en 2 * 3 * 4 en <b>HTML</b>',
  'Eerste regel\ntweede regel',
].join('\n\n')

describe('articleBodyToJson', () => {
  it('turns every part of the old format into the same part in JSON', () => {
    const document = JSON.parse(articleBodyToJson(everything)) as unknown

    expect(document).toEqual({
      content: [
        {
          content: [
            { text: 'Dit is een ', type: 'text' },
            { marks: [{ type: 'bold' }], text: 'verzonnen', type: 'text' },
            { text: ' artikel met ', type: 'text' },
            { marks: [{ type: 'italic' }], text: 'cursieve', type: 'text' },
            { text: ' tekst en ', type: 'text' },
            { marks: [{ attrs: { href: '/bronnen' }, type: 'link' }], text: 'onze bronnen', type: 'text' },
            { text: '.', type: 'text' },
          ],
          type: 'paragraph',
        },
        { attrs: { level: 2 }, content: [{ text: 'Een kop', type: 'text' }], type: 'heading' },
        {
          content: [
            {
              content: [{ content: [{ text: 'Het eerste punt', type: 'text' }], type: 'paragraph' }],
              type: 'listItem',
            },
            {
              content: [
                {
                  content: [
                    { text: 'Het tweede punt, met ', type: 'text' },
                    { marks: [{ type: 'bold' }], text: 'vet', type: 'text' },
                  ],
                  type: 'paragraph',
                },
              ],
              type: 'listItem',
            },
          ],
          type: 'bulletList',
        },
        {
          content: [
            { marks: [{ type: 'bold' }], text: 'vet en ', type: 'text' },
            { marks: [{ type: 'bold' }, { type: 'italic' }], text: 'cursief erin', type: 'text' },
            { marks: [{ type: 'bold' }], text: ' met ', type: 'text' },
            {
              marks: [{ type: 'bold' }, { attrs: { href: 'https://www.lc.nl/sport' }, type: 'link' }],
              text: 'een link',
              type: 'text',
            },
            { text: ' en 2 * 3 * 4 en <b>HTML</b>', type: 'text' },
          ],
          type: 'paragraph',
        },
        { content: [{ text: 'Eerste regel tweede regel', type: 'text' }], type: 'paragraph' },
      ],
      type: 'doc',
    })
  })

  it('gives JSON that the site accepts, unchanged by the check', () => {
    const json = articleBodyToJson(everything)
    const result = readArticleDocument(json)

    expect(result).toMatchObject({ json, ok: true })
  })

  it('shows an unsafe link as text, as the site did', () => {
    const json = articleBodyToJson('[klik](javascript:alert(1)) en [x](//evil.example)')

    expect(json).not.toContain('"link"')
    expect(json).toContain('[klik](javascript:alert(1)) en [x](//evil.example)')
  })

  it('gives an empty document for an empty text', () => {
    expect(articleBodyToJson('  \n\n')).toBe('{"type":"doc","content":[]}')
  })

  it('leaves a text that is JSON as it is', () => {
    const json = articleBodyToJson(everything)

    expect(articleBodyToJson(json)).toBe(json)
  })

  it('converts a text of a million characters in a moment', () => {
    const start = performance.now()

    articleBodyToJson('a'.repeat(1_000_000))
    expect(performance.now() - start).toBeLessThan(5000)
  })
})

describe('migrateArticleBodies', () => {
  let database: TestDatabase

  beforeAll(async () => {
    database = await createTestDatabase()
    await database.pool.query("INSERT INTO admin_users (email, role) VALUES ('een@example.test', 'beheerder')")
    await database.pool.query(
      `INSERT INTO articles (slug, title, intro, body, author, published_at, created_at, updated_at, created_by, updated_by)
       SELECT 'eerste', 'Eerste', 'Intro', ?, 'de redactie', '2026-10-20 10:00:00', '2026-10-20 09:00:00', '2026-10-21 12:30:00', id, id
       FROM admin_users`,
      [everything],
    )
    await database.pool.query(
      `INSERT INTO article_versions (article_id, version, title, slug, intro, body, author, saved_at, saved_by)
       SELECT a.id, v.version, 'Eerste', 'eerste', 'Intro', v.body, 'de redactie', '2026-10-20 09:00:00', a.created_by
       FROM articles a JOIN (SELECT 1 AS version, 'Eerste tekst' AS body UNION SELECT 2, ?) v`,
      [everything],
    )
  })

  afterAll(async () => {
    await database?.drop()
  })

  async function rows(sql: string) {
    const [result] = await database.pool.query<RowDataPacket[]>(sql)

    return result
  }

  it('converts the article and every version, and nothing else of them', async () => {
    expect(await migrateArticleBodies(database.db)).toBe(3)

    expect(await rows('SELECT body, updated_at, title FROM articles')).toMatchObject([
      { body: articleBodyToJson(everything), title: 'Eerste', updated_at: new Date('2026-10-21T12:30:00Z') },
    ])
    expect(await rows('SELECT version, body FROM article_versions ORDER BY version')).toMatchObject([
      { body: articleBodyToJson('Eerste tekst'), version: 1 },
      { body: articleBodyToJson(everything), version: 2 },
    ])
  })

  it('does nothing the second time', async () => {
    const before = await rows('SELECT body FROM articles UNION ALL SELECT body FROM article_versions')

    expect(await migrateArticleBodies(database.db)).toBe(0)
    expect(await rows('SELECT body FROM articles UNION ALL SELECT body FROM article_versions')).toEqual(before)
  })

  it('leaves the text of an article saved in the new format alone', async () => {
    const json = '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Nieuw"}]}]}'

    await database.pool.query('UPDATE articles SET body = ?', [json])

    expect(await migrateArticleBodies(database.db)).toBe(0)
    expect(await rows('SELECT body FROM articles')).toMatchObject([{ body: json }])
  })
})

import { describe, expect, it } from 'vitest'

import { infoPage, itemJson } from './test-wikidata.ts'
import { lineOfPositions, readArticleInfo, readItem, readLabel } from './wikidata-item.ts'

describe('readArticleInfo', () => {
  it('reads the number and the item of an article', () => {
    expect(readArticleInfo(infoPage(3941527, 'Q15943430'))).toEqual({ pageId: 3941527, wikidataId: 'Q15943430' })
  })

  it('reads an article that is linked to no item', () => {
    expect(readArticleInfo(infoPage(12, null))).toEqual({ pageId: 12, wikidataId: null })
  })

  it('says a title without an article is missing, and a page that is no page information is nothing', () => {
    expect(readArticleInfo(infoPage(0, null))).toBe('missing')
    expect(readArticleInfo('<html>Een andere pagina</html>')).toBeNull()
  })
})

describe('readItem', () => {
  // The item of a footballer, as Wikidata gave it on 8 November 2026, abbreviated to the four
  // properties and the labels. The values are those of the item; the real item has far more.
  const complete = JSON.stringify({
    entities: {
      Q15943430: {
        claims: {
          P19: [
            {
              mainsnak: {
                datavalue: { value: { 'entity-type': 'item', id: 'Q9920', 'numeric-id': 9920 } },
                snaktype: 'value',
              },
              rank: 'normal',
            },
          ],
          P27: [
            {
              mainsnak: { datavalue: { value: { 'entity-type': 'item', id: 'Q29999' } }, snaktype: 'value' },
              rank: 'normal',
            },
          ],
          P413: [
            {
              mainsnak: { datavalue: { value: { 'entity-type': 'item', id: 'Q336286' } }, snaktype: 'value' },
              rank: 'normal',
            },
          ],
          P569: [
            {
              mainsnak: {
                datavalue: {
                  value: {
                    calendarmodel: 'http://www.wikidata.org/entity/Q1985727',
                    precision: 11,
                    time: '+1994-05-13T00:00:00Z',
                  },
                },
                snaktype: 'value',
              },
              rank: 'normal',
            },
          ],
        },
        id: 'Q15943430',
        labels: { en: { language: 'en', value: 'Joost van Aken' }, nl: { language: 'nl', value: 'Joost van Aken' } },
        type: 'item',
      },
    },
  })

  it('reads a complete item', () => {
    expect(readItem(complete)).toEqual({
      birth: { date: '1994-05-13', precision: 'day' },
      id: 'Q15943430',
      label: 'Joost van Aken',
      nationalityIds: ['Q29999'],
      placeId: 'Q9920',
      positionIds: ['Q336286'],
    })
  })

  it('keeps a birth date with only a year as the first of January, with the precision', () => {
    const item = readItem(itemJson('Q1', { birth: [{ precision: 9, time: '+1952-00-00T00:00:00Z' }] }))

    expect(item?.birth).toEqual({ date: '1952-01-01', precision: 'year' })
  })

  it('keeps a birth date with a month as the first of that month', () => {
    const item = readItem(itemJson('Q1', { birth: [{ precision: 10, time: '+1952-07-00T00:00:00Z' }] }))

    expect(item?.birth).toEqual({ date: '1952-07-01', precision: 'month' })
  })

  it('leaves a date coarser than a year empty', () => {
    const item = readItem(itemJson('Q1', { birth: [{ precision: 8, time: '+1950-00-00T00:00:00Z' }] }))

    expect(item?.birth).toBeNull()
  })

  it('leaves the birth date empty for an item without one', () => {
    const item = readItem(itemJson('Q1', { nationalities: ['Q29999'] }))

    expect(item?.birth).toBeNull()
    expect(item?.nationalityIds).toEqual(['Q29999'])
  })

  it('reads every nationality in the order of Wikidata, without a repeat', () => {
    expect(readItem(itemJson('Q1', { nationalities: ['Q29999', 'Q155', 'Q29999'] }))?.nationalityIds).toEqual([
      'Q29999',
      'Q155',
    ])
  })

  it('does not count a statement with the rank deprecated', () => {
    const item = readItem(
      itemJson('Q1', {
        birth: [
          { precision: 11, rank: 'deprecated', time: '+1980-01-01T00:00:00Z' },
          { precision: 11, time: '+1981-02-03T00:00:00Z' },
        ],
        nationalities: [{ rank: 'deprecated', value: 'Q155' }, 'Q29999'],
      }),
    )

    expect(item?.birth?.date).toBe('1981-02-03')
    expect(item?.nationalityIds).toEqual(['Q29999'])
  })

  it('counts only the preferred statements when there are any', () => {
    const item = readItem(itemJson('Q1', { nationalities: ['Q155', { rank: 'preferred', value: 'Q29999' }, 'Q142'] }))

    expect(item?.nationalityIds).toEqual(['Q29999'])
  })

  it('gives null for text that is no item', () => {
    expect(readItem('<html>Fout</html>')).toBeNull()
    expect(readItem('{"entities":{}}')).toBeNull()
  })
})

describe('readLabel', () => {
  it('takes the Dutch label, else the English one, else none', () => {
    expect(readLabel(itemJson('Q1', { labels: { en: 'Netherlands', nl: 'Nederland' } }))).toBe('Nederland')
    expect(readLabel(itemJson('Q1', { labels: { en: 'defender' } }))).toBe('defender')
    expect(readLabel(itemJson('Q1', { labels: {} }))).toBeNull()
  })
})

describe('lineOfPositions', () => {
  it('takes the first position in the order of Wikidata that names a line', () => {
    expect(lineOfPositions(['Q201330'])).toBe('doelman')
    expect(lineOfPositions(['Q9999999', 'Q193592', 'Q280658'])).toBe('middenvelder')
    expect(lineOfPositions(['Q280658', 'Q193592'])).toBe('aanvaller')
  })

  it('gives null when no position is in the list', () => {
    expect(lineOfPositions(['Q9999999'])).toBeNull()
    expect(lineOfPositions([])).toBeNull()
  })
})

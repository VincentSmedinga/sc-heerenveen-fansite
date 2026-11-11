import { oldSiteReportSource } from '@fansite/db/schema'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { MatchPageCards } from './MatchPageView'
import { matchPageDataOf } from './report-view'
import { reportedMatch } from './test-reports'

const derived = 'De formatie is afgeleid uit de linie van de spelers en kan afwijken van wat er is gespeeld.'

/** The page of a match with the report changed as given. */
function pageOf(report: Partial<ReturnType<typeof reportedMatch>['stored']['report']>) {
  const reported = reportedMatch()

  Object.assign(reported.stored.report, report)

  return renderToStaticMarkup(<MatchPageCards data={matchPageDataOf(reported, [], true)} />)
}

describe('the sentence under the pitch about a formation that was derived', () => {
  it('is there for a report of the old fansite with a formation that the editors did not save', () => {
    const html = pageOf({ savedBy: null, source: oldSiteReportSource })

    expect(html).toContain(`<p>${derived}</p>`)
    // In the reading order: after the pitch and before the substitutes.
    expect(html.indexOf(derived)).toBeGreaterThan(html.indexOf('Uitleg van de merken'))
    expect(html.indexOf(derived)).toBeLessThan(html.indexOf('Opstelling als lijst'))
  })

  it('is not there for a formation that the editors saved', () => {
    expect(pageOf({ savedBy: 3, source: oldSiteReportSource })).not.toContain(derived)
  })

  it('is not there for a report without a formation', () => {
    expect(pageOf({ formationOurs: null, savedBy: null, source: oldSiteReportSource })).not.toContain(derived)
  })

  it('is not there for a report of another source', () => {
    expect(pageOf({ savedBy: null, source: 'het wedstrijdformulier' })).not.toContain(derived)
    expect(pageOf({ savedBy: null, source: null })).not.toContain(derived)
  })
})

describe('the links to the pages of players on the page of a match', () => {
  const html = renderToStaticMarkup(<MatchPageCards data={matchPageDataOf(reportedMatch(), [], true)} />)
  const links = [...html.matchAll(/<a [^>]*href="(\/spelers\/[^"]+)"/g)].map((match) => match[1])

  it('links a player of ours who has a page, in the course of the match and in the list under the pitch', () => {
    expect(links).toContain('/spelers/tjerk-brandsma')
    expect(links).toContain('/spelers/ruben-ten-hove')
    expect(html).toMatch(
      /<a [^>]*href="\/spelers\/tjerk-brandsma"[^>]*>(<img [^>]*>)?<span[^>]*>(<span class="hf-player-name-given">)?Tjerk/,
    )
  })

  it('leaves a player of the opponent and a player of ours without a page as plain text', () => {
    expect(new Set(links)).toEqual(new Set(['/spelers/ruben-ten-hove', '/spelers/tjerk-brandsma']))
    expect(html).toContain('Dirk Proefland')
    expect(html).not.toMatch(/<a [^>]*>[^<]*Dirk Proefland/)
  })
})

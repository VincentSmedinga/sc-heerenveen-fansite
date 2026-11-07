import type { Match } from '@fansite/db/schema'

import { matchMoment } from '#src/match-format'

import type { ReportPreviewMatch } from './report-preview'

const numberFormat = new Intl.NumberFormat('nl-NL')

/**
 * What the preview next to the form needs of the match, written out as the public page writes
 * it: the facts under the result, whether there was extra time, the score after 90 minutes and
 * the result of the shoot-out. They come from the match, not from the form.
 */
export function previewMatchOf(match: Match, now: Date): ReportPreviewMatch {
  const day = matchMoment({ ...match, status: 'played' }, now, { withYear: true })
  const facts = [
    { label: 'Competitie', value: match.competition },
    { label: 'Ronde', value: match.round },
    { label: 'Datum', value: day.time },
  ]

  if (match.stadium !== null) {
    facts.push({ label: 'Stadion', value: match.stadium })
  }

  if (match.attendance !== null) {
    facts.push({
      label: 'Toeschouwers',
      value: match.attendance === 0 ? 'Zonder publiek' : numberFormat.format(match.attendance),
    })
  }

  if (match.referee !== null) {
    facts.push({ label: 'Scheidsrechter', value: match.referee })
  }

  return {
    afterNinety:
      match.afterNinetyFor !== null && match.afterNinetyAgainst !== null
        ? { against: match.afterNinetyAgainst, for: match.afterNinetyFor }
        : null,
    extraTime: match.extraTime,
    facts,
    home: match.home,
    opponent: match.opponent,
    penalties:
      match.penaltiesFor !== null && match.penaltiesAgainst !== null
        ? { against: match.penaltiesAgainst, for: match.penaltiesFor }
        : null,
  }
}

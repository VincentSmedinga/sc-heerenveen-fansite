import type { Metadata } from 'next'

import { reportMetadata, ReportPage } from './report-page'

// Render on each request, so the build never reads the database. The readings are cached by
// report-data.ts.
export const dynamic = 'force-dynamic'

type Params = { seizoen: string; wedstrijd: string }

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { seizoen, wedstrijd } = await params

  return reportMetadata(seizoen, wedstrijd)
}

/**
 * The page of one match, such as `/wedstrijden/2026-27/2026-11-01-fc-twente`: the result, the
 * course of the match and the line-ups. It exists for a match with a report that is `klaar` and
 * follows the rules; any other address is "niet gevonden".
 */
export default async function MatchReportPage({ params }: { params: Promise<Params> }) {
  const { seizoen, wedstrijd } = await params

  return ReportPage({ season: seizoen, slug: wedstrijd })
}

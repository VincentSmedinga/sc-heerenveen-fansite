'use client'

import { Heading, Page, SegmentedControl, SideBySide } from '@fansite/design-system'
import { useDeferredValue, useState, useSyncExternalStore } from 'react'

import { previewDataOf } from '#src/beheer/report-preview'
import { MatchPageView } from '#src/MatchPageView'

import { ReportFields, useReportForm } from './ReportForm'

type Tab = 'formulier' | 'voorbeeld'

const tabs = [
  { label: 'Formulier', value: 'formulier' },
  { label: 'Voorbeeld', value: 'voorbeeld' },
] as const

/**
 * The form with the preview of the page next to it. From a wide place the form is on the left
 * and the preview on the right, which stays in view; on a narrow one two tabs, Formulier and
 * Voorbeeld, choose which of the two is shown, and what is not shown stays in the page, so the
 * form keeps its values. Without JavaScript the page has the form alone: the preview and the
 * tabs only come when the page is live in the browser, since a preview needs a browser to build
 * itself. The choice of the tab is not kept.
 */
export function ReportWorkspace() {
  const { choices } = useReportForm()
  const [tab, setTab] = useState<Tab>('formulier')
  // Whether the page is live in the browser: the server and a page without JavaScript say no.
  const live = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  )
  const showPreview = live && choices.preview !== undefined

  return (
    <SideBySide>
      {showPreview ? (
        <SideBySide.Tabs>
          <SegmentedControl label="Formulier of voorbeeld" onChange={setTab} options={tabs} value={tab} />
        </SideBySide.Tabs>
      ) : null}
      <SideBySide.Main hidden={showPreview && tab !== 'formulier'}>
        <ReportFields />
      </SideBySide.Main>
      {showPreview ? (
        <SideBySide.Aside aria-labelledby="voorbeeld-kop" hidden={tab !== 'voorbeeld'} tabIndex={0}>
          <ReportPreview />
        </SideBySide.Aside>
      ) : null}
    </SideBySide>
  )
}

/**
 * The preview of the page of the match: the real page, built again from what the form holds at
 * every change, in a box with a name. It changes no state of the form and talks to no server.
 * The preview waits for the last key a moment (`useDeferredValue`), so typing is never slowed
 * by building the page. The box is not a live region: a screen reader would read the whole
 * page again at every key.
 */
function ReportPreview() {
  const { changed, choices, current } = useReportForm()
  const values = useDeferredValue(current)
  const frame = useDeferredValue(changed)

  if (choices.preview === undefined) {
    return null
  }

  return (
    <Page.Cell>
      <Heading id="voorbeeld-kop" level={2}>
        Voorbeeld — Zo ziet de pagina eruit
      </Heading>
      <MatchPageView data={previewDataOf(values, choices.preview, choices.squad, frame)} preview />
    </Page.Cell>
  )
}

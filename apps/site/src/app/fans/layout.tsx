import type { ReactNode } from 'react'

import { isFansPartOn } from '@fansite/shared/fans-env'

import { currentSupporter } from '#src/fans/require-supporter'
import { SupporterMarker } from '#src/SupporterMarker'

// Render on each request: who is logged in is not known when the site is built.
export const dynamic = 'force-dynamic'

// Every page under /fans. It reads the session once more on the server and tells the browser
// through a mark in localStorage, so the header on every public page can show the initials on
// the account button without the server ever knowing who looks at them (see
// src/supporter-marker.ts). It adds no element around the pages: Page.Main must stay a direct
// child of Page.Body. The pages still guard themselves with requireSupporter(); this only keeps
// the mark. With accounts off the pages answer "not found" and there is no mark to keep.
export default async function FansLayout({ children }: { children: ReactNode }) {
  const supporter = isFansPartOn('accounts') ? await currentSupporter() : undefined

  return (
    <>
      <SupporterMarker screenName={supporter?.screenName} />
      {children}
    </>
  )
}

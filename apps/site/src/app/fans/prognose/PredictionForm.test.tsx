import type * as React from 'react'

import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PredictionState } from '#src/fans/prediction'

import { PredictionForm } from './PredictionForm'

const { useActionState } = vi.hoisted(() => ({ useActionState: vi.fn() }))

vi.mock('react', async (importOriginal) => ({ ...(await importOriginal<typeof React>()), useActionState }))
vi.mock('./actions', () => ({ savePredictionAction: vi.fn() }))

const values = { fullTimeAway: '1', fullTimeHome: '2', halftimeAway: '0', halftimeHome: '1' }
const afterSave: PredictionState = { errors: {}, saved: { changed: false }, values }
const before: PredictionState = { errors: {}, values: {} }

const render = (remindByEmail: boolean) =>
  renderToStaticMarkup(
    <PredictionForm
      awayName="FC Twente"
      homeName="sc Heerenveen"
      matchId={7}
      remindByEmail={remindByEmail}
      saved={undefined}
    />,
  )

beforeEach(() => {
  useActionState.mockReset()
})

describe('the line about the reminder under the confirmation', () => {
  it('asks "Een herinnering per e-mail?" with the link Instellen, after a save with the reminder off', () => {
    useActionState.mockReturnValue([afterSave, vi.fn()])

    const html = render(false)

    expect(html).toContain('Je voorspelling staat.')
    expect(html).toContain('Een herinnering per e-mail? <a href="/fans/mijn-account#herinnering">Instellen</a>')
    expect(html.indexOf('Je voorspelling staat.')).toBeLessThan(html.indexOf('Een herinnering per e-mail?'))
  })

  it('is not there with the reminder on', () => {
    useActionState.mockReturnValue([afterSave, vi.fn()])

    expect(render(true)).not.toContain('Een herinnering per e-mail?')
  })

  it('is not there before anything was saved, or after a form that was refused', () => {
    useActionState.mockReturnValue([before, vi.fn()])
    expect(render(false)).not.toContain('Een herinnering per e-mail?')

    useActionState.mockReturnValue([{ errors: {}, failure: 'closed', values }, vi.fn()])
    expect(render(false)).not.toContain('Een herinnering per e-mail?')
  })
})

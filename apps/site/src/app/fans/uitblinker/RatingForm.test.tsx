import type * as React from 'react'

import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { RatingPlayer, RatingState } from '#src/fans/rating'

import { RatingForm } from './RatingForm'

const { useActionState } = vi.hoisted(() => ({ useActionState: vi.fn() }))

vi.mock('react', async (importOriginal) => ({ ...(await importOriginal<typeof React>()), useActionState }))
vi.mock('./actions', () => ({ saveRatingsAction: vi.fn() }))

const players: RatingPlayer[] = [
  { appearanceId: 11, assist: false, goal: false, minutes: 90, name: 'Luca Oyen', position: 'doelman' },
  { appearanceId: 12, assist: false, goal: true, minutes: 75, name: 'Pim Spits', position: 'aanvaller' },
  { appearanceId: 13, assist: true, goal: false, minutes: 30, name: 'Rik Back', position: 'verdediger' },
]
const before: RatingState = { errors: {}, values: {} }

const coach = { name: 'Robin Veldman', staffId: 3 }

const render = (saved: Record<number, string> = {}, withCoach: null | typeof coach = null, coachSaved?: string) =>
  renderToStaticMarkup(
    <RatingForm
      coach={withCoach}
      {...(coachSaved === undefined ? {} : { coachSaved })}
      matchId={7}
      players={players}
      saved={saved}
    />,
  )

beforeEach(() => {
  useActionState.mockReset()
  useActionState.mockReturnValue([before, vi.fn()])
})

describe('the form of the grades', () => {
  it('has a group of ten buttons for each player, named after him, in the order of the list', () => {
    const html = render()

    expect(html.match(/<fieldset/g)).toHaveLength(3)
    expect(html.match(/type="radio"/g)).toHaveLength(30)
    expect(html.indexOf('Luca Oyen')).toBeLessThan(html.indexOf('Pim Spits'))
    expect(html).toContain('<legend>Luca Oyen</legend>')
    expect(html).toContain('aria-label="Cijfer voor Luca Oyen"')
    expect(html).toContain('Keeper · 90 min')
    expect(html).toContain('Aanvaller · 75 min · doelpunt')
    expect(html).toContain('Verdediger · 30 min · assist')
  })

  it('has no grade chosen at first, and does not make the browser stop the form', () => {
    const html = render()

    expect(html).not.toContain('checked')
    expect(html).not.toContain('required')
  })

  it('shows the grades that were stored', () => {
    expect(useActionState).not.toHaveBeenCalled()

    useActionState.mockReturnValue([{ errors: {}, values: { 11: '8', 12: '1' } }, vi.fn()])

    const html = render({ 11: '8', 12: '1' })

    expect(html.match(/checked/g)).toHaveLength(2)
  })

  it('has the button that sends the number of the match, and no counter without JavaScript', () => {
    const html = render()

    expect(html).toMatch(/<button[^>]*value="7" name="wedstrijd">Cijfers opslaan<\/button>/)
    expect(html).not.toContain('te gaan')
  })

  it('names each player without a grade in the summary, with a link to his group, and keeps the other grades', () => {
    useActionState.mockReturnValue([
      {
        errors: { 11: 'Geef Luca Oyen een cijfer.', 13: 'Geef Rik Back een cijfer.' },
        values: { 12: '6' },
      },
      vi.fn(),
    ])

    const html = render()

    expect(html).toMatch(/<h3[^>]*>Nog 2 cijfers<\/h3>/)
    expect(html).toContain('<a href="#cijfer-11">Geef Luca Oyen een cijfer.</a>')
    expect(html).toContain('<a href="#cijfer-13">Geef Rik Back een cijfer.</a>')
    expect(html).toContain('Je andere cijfers staan nog ingevuld.')
    expect(html.match(/data-invalid/g)).toHaveLength(2)
    expect(html.match(/checked/g)).toHaveLength(1)
    // The first button of a group has the id the link goes to.
    expect(html).toContain('id="cijfer-11"')
  })

  it('has no group for a coach when the match has none', () => {
    expect(render()).not.toContain('Trainer')
    expect(render().match(/<fieldset/g)).toHaveLength(3)
  })

  it('has the head coach as the last group, named after him, with "Trainer" under his name', () => {
    const html = render({}, coach)

    expect(html.match(/<fieldset/g)).toHaveLength(4)
    expect(html.match(/type="radio"/g)).toHaveLength(40)
    expect(html).toContain('<legend>Robin Veldman</legend>')
    expect(html).toContain('aria-label="Cijfer voor trainer Robin Veldman"')
    expect(html).toContain('Trainer')
    expect(html.indexOf('Rik Back')).toBeLessThan(html.indexOf('Robin Veldman'))
    expect(html.indexOf('Robin Veldman')).toBeLessThan(html.indexOf('Cijfers opslaan'))
    expect(html).toContain('name="cijfer-trainer"')
  })

  it('shows the grade that was stored for the coach', () => {
    useActionState.mockReturnValue([{ coachValue: '7', errors: {}, values: {} }, vi.fn()])

    expect(render({}, coach, '7').match(/checked/g)).toHaveLength(1)
  })

  it('names the coach without a grade in the summary, like a player, with the same red buttons', () => {
    useActionState.mockReturnValue([
      { coachError: 'Geef Robin Veldman een cijfer.', errors: { 11: 'Geef Luca Oyen een cijfer.' }, values: {} },
      vi.fn(),
    ])

    const html = render({}, coach)

    expect(html).toMatch(/<h3[^>]*>Nog 2 cijfers<\/h3>/)
    expect(html).toContain('<a href="#cijfer-trainer">Geef Robin Veldman een cijfer.</a>')
    expect(html.match(/data-invalid/g)).toHaveLength(2)
    expect(html).toContain('id="cijfer-trainer"')
  })

  it('has the summary only when there is a gap, and a notice that is empty before', () => {
    const html = render()

    expect(html).not.toContain('Nog 0 cijfers')
    expect(html).not.toContain('Je andere cijfers')
    expect(html).toMatch(/<p[^>]*id="cijfers-melding"[^>]*role="status"[^>]*><\/p>/)
  })

  it('says in the notice that the window is closed', () => {
    useActionState.mockReturnValue([{ errors: {}, failure: 'closed', values: {} }, vi.fn()])

    expect(render()).toContain('Het venster is dicht. Je cijfers zijn niet opgeslagen.')
  })
})

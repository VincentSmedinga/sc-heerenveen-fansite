// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { announcementOf, LiveRefresh, LiveState, type LiveStateData, refreshInterval } from './LiveRefresh'

const goal: LiveStateData = {
  final: 'Einde van de wedstrijd. Eindstand 1–0.',
  goals: 1,
  last: 'Doelpunt sc Heerenveen. Stand 1–0, 23e minuut.',
  live: true,
}

/** The page as the server builds it for a state, with one live part. */
const pageOf = (state: LiveStateData, body: string) =>
  `<html><body><div data-live-region="cards">${body}</div><span data-live-state data-final="${state.final}" data-goals="${state.goals}" data-last="${state.last}" data-live="${state.live}" hidden></span></body></html>`

function Page({ state, stopAt = fourHoursFromNow }: { state: LiveStateData; stopAt?: number }) {
  return (
    <>
      <div data-live-region="cards">kaart</div>
      <LiveState {...state} />
      <LiveRefresh href="/wedstrijden/2026-27/x" renderedAt={renderedAt} stopAt={stopAt} />
    </>
  )
}

const renderedAt = new Date('2026-11-08T15:42:00+01:00').getTime()
const fourHoursFromNow = renderedAt + 4 * 60 * 60 * 1000

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(renderedAt)
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset()
  fetchMock.mockImplementation(() => Promise.resolve(new Response(pageOf({ ...goal, goals: 0, last: '' }, 'kaart'))))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const minute = async (times = 1) => {
  for (let index = 0; index < times; index++) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(refreshInterval)
    })
  }
}

const hide = (hidden: boolean) => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: hidden ? 'hidden' : 'visible' })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('what a screen reader hears', () => {
  const before: LiveStateData = { ...goal, goals: 0, last: '' }

  it('is the last goal with the stand when there are more goals', () => {
    expect(announcementOf(before, goal)).toBe(goal.last)
  })

  it('is the end of the match when it was live and is not any more', () => {
    expect(announcementOf(goal, { ...goal, live: false })).toBe(goal.final)
  })

  it('is nothing for a card, a substitution or a refresh without news', () => {
    expect(announcementOf(goal, goal)).toBe('')
  })
})

describe('the control of a live match', () => {
  it('shows the time of the page and says nothing at the first load', () => {
    render(<Page state={goal} />)

    expect(screen.getByText(/Bijgewerkt om/u).textContent).toBe('Bijgewerkt om 15:42')
    expect(screen.getByRole('status').textContent).toBe('')
    expect(screen.getByRole('button', { name: 'Ververs nu' })).toBeDefined()
    expect(screen.getByRole('switch', { name: 'Ververs automatisch' })).toHaveProperty('checked', true)
  })

  it('asks for the page once a minute, without cookies and not as a visit', async () => {
    render(<Page state={goal} />)
    await minute()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/wedstrijden/2026-27/x')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ credentials: 'omit', headers: { Accept: '*/*' } })

    await minute(2)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('announces a new goal and replaces the part that changed', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        new Response(pageOf({ ...goal, goals: 2, last: 'Doelpunt FC X. Stand 1–1, 40e minuut.' }, 'nieuw')),
      ),
    )
    render(<Page state={goal} />)
    await minute()

    expect(screen.getByRole('status').textContent).toBe('Doelpunt FC X. Stand 1–1, 40e minuut.')
    expect(document.querySelector('[data-live-region="cards"]')?.textContent).toBe('nieuw')
  })

  it('says nothing for a refresh without news', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(new Response(pageOf(goal, 'kaart'))))
    render(<Page state={goal} />)
    await minute()

    expect(screen.getByRole('status').textContent).toBe('')
  })

  it('stops at the end of the match and says so', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(new Response(pageOf({ ...goal, live: false }, 'kaart'))))
    render(<Page state={goal} />)
    await minute()

    expect(screen.getByRole('status').textContent).toBe(goal.final)
    expect(screen.queryByRole('button', { name: 'Ververs nu' })).toBeNull()

    await minute(3)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('waits while the tab is hidden and asks once when it is visible again', async () => {
    render(<Page state={goal} />)
    hide(true)
    await minute(3)
    expect(fetchMock).not.toHaveBeenCalled()

    hide(false)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('stops when the switch is off, and goes on when it is on again', async () => {
    render(<Page state={goal} />)
    fireEvent.click(screen.getByRole('switch'))
    await minute(2)
    expect(fetchMock).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('switch'))
    await minute()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('refreshes at once with "Ververs nu", also when the switch is off', async () => {
    render(<Page state={goal} />)
    fireEvent.click(screen.getByRole('switch'))
    fireEvent.click(screen.getByRole('button', { name: 'Ververs nu' }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('keeps the page and the time when the request fails, and tries again a minute later', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('offline'))
    render(<Page state={goal} />)
    await minute()

    expect(screen.getByText(/Bijgewerkt om/u).textContent).toBe('Bijgewerkt om 15:42')
    expect(document.querySelector('[data-live-region="cards"]')?.textContent).toBe('kaart')

    await minute()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(screen.getByText(/Bijgewerkt om/u).textContent).toBe('Bijgewerkt om 15:44')
  })

  it('stops four hours after the kick-off', async () => {
    render(<Page state={goal} stopAt={Date.now() + 90 * 1000} />)
    await minute(3)

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

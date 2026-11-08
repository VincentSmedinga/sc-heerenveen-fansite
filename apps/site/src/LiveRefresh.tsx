'use client'

import { Button, Card, Link, Switch, Text, Time } from '@fansite/design-system'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'

/** How often the page asks for itself again: one request per visitor per minute. */
export const refreshInterval = 60 * 1000

/** The attribute of a part of the page that a refresh replaces; its value names the part. */
export const liveRegionAttribute = 'data-live-region'

const timeFormat = new Intl.DateTimeFormat('nl-NL', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Amsterdam',
})

/** What the page says about the match, for the part that nobody sees: see `LiveState`. */
export type LiveStateData = { final: string; goals: number; last: string; live: boolean }

/**
 * What a screen reader hears after a refresh: the last goal when there are more goals than
 * before, and the end of the match when it was live and is not any more. A card, a substitution
 * or a refresh without news says nothing.
 */
export function announcementOf(before: LiveStateData, after: LiveStateData) {
  const sentences: string[] = []

  if (after.goals > before.goals) {
    sentences.push(after.last)
  }

  if (before.live && !after.live) {
    sentences.push(after.final)
  }

  return sentences.join(' ')
}

/**
 * A line that nobody sees and that the refresh reads: how many goals there are, whether the
 * match is still live, and the sentences a screen reader hears for the last goal and for the
 * end.
 */
export function LiveState({ final, goals, last, live }: LiveStateData) {
  return (
    <Text as="span" data-final={final} data-goals={goals} data-last={last} data-live={live} data-live-state hidden />
  )
}

/** The state that a page of the match holds, or undefined for a document that has none. */
export function liveStateOf(root: ParentNode): LiveStateData | undefined {
  const element = root.querySelector<HTMLElement>('[data-live-state]')

  if (element === null) {
    return undefined
  }

  return {
    final: element.getAttribute('data-final') ?? '',
    goals: Number(element.getAttribute('data-goals')),
    last: element.getAttribute('data-last') ?? '',
    live: element.getAttribute('data-live') === 'true',
  }
}

/**
 * Puts the live parts of a fetched page in the page, and leaves a part alone when nothing in it
 * changed, so the focus, the selection and a screen reader are left where they are. A focused
 * link inside a part that did change gets the focus back, found by its place among the links.
 */
export function replaceRegions(page: Document, fetched: Document) {
  for (const region of page.querySelectorAll<HTMLElement>(`[${liveRegionAttribute}]`)) {
    const name = region.getAttribute(liveRegionAttribute)
    const next = fetched.querySelector<HTMLElement>(`[${liveRegionAttribute}="${name}"]`)

    if (next === null || next.innerHTML === region.innerHTML) {
      continue
    }

    const active = page.activeElement
    const index =
      active !== null && region.contains(active) ? [...region.querySelectorAll('a, button')].indexOf(active) : -1

    region.innerHTML = next.innerHTML

    if (index >= 0) {
      region.querySelectorAll<HTMLElement>('a, button')[index]?.focus({ preventScroll: true })
    }
  }
}

const subscribeNothing = () => () => undefined

type Props = {
  /** The address of the page, without a query. */
  href: string
  /** The time the server built the page, in milliseconds. */
  renderedAt: number
  /** When the page stops refreshing, in milliseconds: four hours after the kick-off. */
  stopAt: number
}

/**
 * The control of a match that is live: when the page was updated, "Ververs nu" and the switch
 * "Ververs automatisch", and a line for a screen reader. Without JavaScript only the time and
 * the link "Ververs nu" are there, and the link loads the page again.
 *
 * With JavaScript the page asks for itself every minute while the switch is on, the tab is
 * visible and the match is live. It is a plain request to our own server without cookies, and
 * the parts marked `data-live-region` are replaced when they changed. A failed request leaves
 * the page and the time as they were, and the next try comes a minute later. The choice of the
 * switch is kept in this component only: the site stores nothing of a visitor.
 */
export function LiveRefresh({ href, renderedAt, stopAt }: Props) {
  const hydrated = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  )
  const [automatic, setAutomatic] = useState(true)
  const [live, setLive] = useState(true)
  const [updatedAt, setUpdatedAt] = useState(renderedAt)
  const [announcement, setAnnouncement] = useState('')
  const state = useRef<LiveStateData | undefined>(undefined)
  const loading = useRef(false)

  const refresh = useCallback(async () => {
    if (loading.current) {
      return
    }

    loading.current = true

    try {
      // `*/*` and not `text/html`: only a request for HTML counts as a visit (see `visitOf`).
      const response = await fetch(href, { cache: 'no-store', credentials: 'omit', headers: { Accept: '*/*' } })

      if (!response.ok) {
        return
      }

      const fetched = new DOMParser().parseFromString(await response.text(), 'text/html')
      const after = liveStateOf(fetched)

      if (after === undefined) {
        return
      }

      const before = state.current ?? liveStateOf(document)

      replaceRegions(document, fetched)
      state.current = after
      setUpdatedAt(Date.now())
      setLive(after.live)

      if (before !== undefined) {
        setAnnouncement(announcementOf(before, after))
      }
    } catch {
      // No connection: the page stays as it is and the next try comes in a minute.
    } finally {
      loading.current = false
    }
  }, [href])

  useEffect(() => {
    if (!automatic || !live) {
      return
    }

    // A hidden tab waits, and one request follows when it is visible again.
    let last = Date.now()
    let missed = false

    const tick = () => {
      if (Date.now() >= stopAt) {
        setLive(false)

        return
      }

      if (document.visibilityState === 'hidden') {
        missed = true

        return
      }

      last = Date.now()
      missed = false
      void refresh()
    }
    const visible = () => {
      if (document.visibilityState === 'visible' && missed && Date.now() - last >= refreshInterval) {
        tick()
      }
    }
    const timer = setInterval(tick, refreshInterval)

    document.addEventListener('visibilitychange', visible)

    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [automatic, live, refresh, stopAt])

  return (
    <Card as="div">
      <Text appearance="meta">
        {live ? 'Bijgewerkt om ' : 'Laatst bijgewerkt om '}
        <Time dateTime={new Date(updatedAt).toISOString()}>{timeFormat.format(updatedAt)}</Time>
      </Text>
      {live &&
        (hydrated ? (
          <>
            <Button appearance="soft" onClick={() => void refresh()} size="small" type="button">
              Ververs nu
            </Button>
            <Switch
              checked={automatic}
              label="Ververs automatisch"
              onChange={(event) => {
                setAutomatic(event.target.checked)
              }}
            />
          </>
        ) : (
          <Text>
            <Link href={href}>Ververs nu</Link>
          </Text>
        ))}
      <Text className="hf-visually-hidden" role="status">
        {announcement}
      </Text>
    </Card>
  )
}

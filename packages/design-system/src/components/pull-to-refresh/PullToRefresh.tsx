'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'

import { isStandalone, watchPull } from './pullGesture'
import { PullIndicator } from './PullIndicator'
import { RefreshButton } from './RefreshButton'

const subscribeToNothing = () => () => undefined

const isNotStandalone = () => false

/**
 * Lets a visitor reload the page by pulling it down at the top, but only when the site runs as an app from the home
 * screen. There the browser has no reload button, and on an iPhone no pull to refresh either. In a browser tab and
 * without JavaScript nothing changes. Put one in the layout, before the header: it shows nothing until a visitor pulls.
 *
 * A gesture can't be the only way, so in an app the page also has a button, "Pagina verversen", that does the same. It
 * is the first thing a keyboard or a screen reader reaches, hidden from the eye until it has focus (see RefreshButton).
 *
 * In an app, the page also stops the browser's own pull to refresh (`overscroll-behavior-y`, set through an attribute
 * on `html`), so the two never both fire. The page still scrolls and bounces as before.
 */
export const PullToRefresh = () => {
  const [progress, setProgress] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  // Nothing on the server and while hydrating, so the HTML is the same in a tab and in an app; then what the browser says.
  const standalone = useSyncExternalStore(subscribeToNothing, isStandalone, isNotStandalone)

  useEffect(() => {
    if (!standalone) {
      return
    }

    const root = document.documentElement
    const stopWatching = watchPull(document, {
      onChange: setProgress,
      onRefresh: () => {
        setRefreshing(true)
        location.reload()
      },
    })

    root.setAttribute('data-pull-to-refresh', '')

    return () => {
      stopWatching()
      root.removeAttribute('data-pull-to-refresh')
    }
  }, [standalone])

  return (
    <>
      {standalone ? <RefreshButton onClick={() => location.reload()} /> : null}
      {progress > 0 || refreshing ? <PullIndicator progress={progress} refreshing={refreshing} /> : null}
    </>
  )
}

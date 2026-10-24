'use client'

import { useEffect, useState } from 'react'

import { isStandalone, watchPull } from './pullGesture'
import { PullIndicator } from './PullIndicator'

/**
 * Lets a visitor reload the page by pulling it down at the top, but only when the site runs as an app from the home
 * screen. There the browser has no reload button, and on an iPhone no pull to refresh either. In a browser tab, with a
 * keyboard, and without JavaScript nothing changes. Put one in the layout; it shows nothing until a visitor pulls.
 *
 * In an app, the page also stops the browser's own pull to refresh (`overscroll-behavior-y`, set through an attribute
 * on `html`), so the two never both fire. The page still scrolls and bounces as before.
 */
export const PullToRefresh = () => {
  const [progress, setProgress] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (!isStandalone()) {
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
  }, [])

  return progress > 0 || refreshing ? <PullIndicator progress={progress} refreshing={refreshing} /> : null
}

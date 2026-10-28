import type { MetadataRoute } from 'next'

import { headerColour } from '../colours'
import { siteName } from '../pages'

// What a browser needs to offer the site as an app: a name, icons and colours. There is no
// service worker, so the site can be installed but not used offline (see docs/beslissingen.md).
// The icons are files in public, made by scripts/make-icons.js. The theme and the background
// are the dark blue of the header, as the tile of the icons is.
export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: headerColour.light,
    description: 'Alles over sc Heerenveen op één plek.',
    display: 'standalone',
    icons: [
      { purpose: 'any', sizes: '192x192', src: '/icon-192.png', type: 'image/png' },
      { purpose: 'any', sizes: '512x512', src: '/icon-512.png', type: 'image/png' },
      { purpose: 'maskable', sizes: '512x512', src: '/icon-maskable-512.png', type: 'image/png' },
    ],
    lang: 'nl',
    name: siteName,
    scope: '/',
    short_name: 'Fansite',
    start_url: '/',
    theme_color: headerColour.light,
  }
}

/*
 * The pages of the site that a search engine may find, with the description that goes in the `meta description` and in
 * the Open Graph tags. This module imports nothing, so the smoke test can use it too. The sitemap lists these pages. A
 * new page is a line here, and sitemap.test.ts fails until it is (or until it is named as an exception there).
 */

export const siteName = 'sc Heerenveen Fansite'

export const pages = [
  {
    description:
      'Alle koppen en links over sc Heerenveen op één plek, uit de media waar je ze al kent. Voor supporters door supporters.',
    path: '/',
  },
  {
    description:
      'Alle afleveringen van de podcasts over sc Heerenveen op één plek, met een link naar de pagina van de aflevering bij de maker.',
    path: '/podcasts',
  },
  {
    description: 'De media waar we het nieuws over sc Heerenveen vandaan halen, met een korte beschrijving van elk.',
    path: '/bronnen',
  },
  {
    description: 'Wie we zijn en hoe we werken. Een site van supporters, voor supporters.',
    path: '/over-ons',
  },
  {
    description: 'Wat we met gegevens doen: geen cookies, niemand volgen en niets van een ander domein.',
    path: '/privacy',
  },
  {
    description: 'Wat er nieuw is op de sc Heerenveen Fansite, per versie: wat je er nu kunt vinden en doen.',
    path: '/updates',
  },
] as const

export type PagePath = (typeof pages)[number]['path']

/** The picture that a shared link shows. It is a file of our own, made by scripts/make-share-image.js. */
export const shareImage = {
  alt: 'Het schild van de sc Heerenveen Fansite: blauwe en witte Friese banen met een rood pompeblêd.',
  height: 630,
  path: '/share-image.png',
  width: 1200,
} as const

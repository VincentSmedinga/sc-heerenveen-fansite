/*
 * The pages of the site that a search engine may find, with the description that goes in the
 * `meta description` and in the Open Graph tags. This module imports nothing, so the smoke test
 * can use it too. The sitemap lists these pages. A new page is a line here, and sitemap.test.ts
 * fails until it is (or until it is named as an exception there).
 */

export const siteName = 'sc Heerenveen Fansite'

export const pages = [
  {
    description: 'Alles over sc Heerenveen op één plek: koppen, wedstrijden en spelers, voor fans door fans.',
    path: '/',
  },
  {
    description:
      'Alle koppen over sc Heerenveen die we hebben, de nieuwste eerst, met een filter per bron, een artikel van de redactie en de nieuwste podcasts.',
    path: '/nieuws',
  },
  {
    description:
      'Het programma, de uitslagen en de stand van sc Heerenveen 1 dit seizoen, met de bron erbij: de Nederlandse Wikipedia.',
    path: '/wedstrijden',
  },
  {
    description:
      'De cijfers over sc Heerenveen 1 dit seizoen, zoals de plek in de competitie, de reeksen en de doelpuntenmakers, met de bron erbij: de Nederlandse Wikipedia.',
    path: '/wedstrijden/cijfers',
  },
  {
    description:
      'De cijfers van sc Heerenveen 1 sinds 1990/91, zoals de plek door de jaren en de records, met de bronnen erbij: Wikipedia en het archief van de Fansite.',
    path: '/wedstrijden/cijfers/alle',
  },
  {
    description: 'De selectie van sc Heerenveen 1 dit seizoen, met de spelers per positie en de bron erbij: Wikipedia.',
    path: '/spelers',
  },
  {
    description:
      'De cijfers van de spelers van sc Heerenveen 1 dit seizoen, zoals de doelpuntenmakers en de bijzondere doelpunten, met de bron erbij: Wikipedia.',
    path: '/spelers/cijfers',
  },
  {
    description:
      'De topscorers, hattricks en strafschoppen van sc Heerenveen 1 sinds 1990/91, met de bronnen erbij: Wikipedia en de sc Heerenveen Fansite.',
    path: '/spelers/cijfers/alle',
  },
  {
    description:
      'Alle spelers die ooit in de selectie van sc Heerenveen stonden, op achternaam, met hun linie en jaren. Bron: Wikipedia en sc Heerenveen Fansite.',
    path: '/spelers/overzicht',
  },
  {
    description:
      'Alle spelers die ooit in de selectie van sc Heerenveen stonden, per land, met hun linie en jaren. Bron: Wikipedia en sc Heerenveen Fansite.',
    path: '/spelers/overzicht/land',
  },
  {
    description:
      'Alle clubs waar sc Heerenveen tegen speelde, met hoe vaak we wonnen en verloren, en de bronnen erbij: Wikipedia en de sc Heerenveen Fansite.',
    path: '/tegenstanders',
  },
  {
    description:
      'Alle afleveringen van de podcasts over sc Heerenveen op één plek, met een link naar de pagina van de aflevering bij de maker.',
    path: '/nieuws/podcasts',
  },
  {
    description:
      'De artikelen van de redactie van de sc Heerenveen Fansite, de nieuwste eerst, met de eerste alinea erbij.',
    path: '/redactie',
  },
  {
    description: 'De media waar we het nieuws over sc Heerenveen vandaan halen, met een link naar elk.',
    path: '/bronnen',
  },
  {
    description:
      'Schrijf de redactie van de sc Heerenveen Fansite: een vraag, een fout, een bron of een bericht dat weg moet.',
    path: '/contact',
  },
  {
    description:
      'Wie we zijn en hoe we werken. Een site van fans, voor fans, zonder advertenties en zonder winstoogmerk.',
    path: '/over-ons',
  },
  {
    description:
      'Het hoofdstuk voor fans: de spellen die komen, zoals een voorspelling van de uitslag en een cijfer voor de spelers, en alvast een account.',
    path: '/fans',
  },
  {
    description:
      'De regels van de spellen voor fans, met voorbeelden: hoe de punten van de Prognose tellen en wie de uitblinker is.',
    path: '/fans/spelregels',
  },
  {
    description:
      'De Fantest van toen: de quizzen van de Fansite, elke maand van december 2001 tot oktober 2005. Speel ze na, zonder dat we je score bewaren.',
    path: '/fans/fantest',
  },
  {
    description: 'Wat we met gegevens doen: niemand volgen en niets van een ander domein.',
    path: '/privacy',
  },
  {
    description: 'Wat we beloven over toegankelijkheid, wat we er al voor doen en hoe je een probleem meldt.',
    path: '/toegankelijkheid',
  },
  {
    description: 'Wat er nieuw is op de sc Heerenveen Fansite, per versie: wat je er nu kunt vinden en doen.',
    path: '/updates',
  },
] as const

export type PagePath = (typeof pages)[number]['path']

/**
 * The picture that a shared link shows. It is a file of our own, made by
 * scripts/make-share-image.js.
 */
export const shareImage = {
  alt: 'Het schild van de sc Heerenveen Fansite: blauwe en witte Friese banen met een rood pompeblêd.',
  height: 630,
  path: '/share-image.png',
  width: 1200,
} as const

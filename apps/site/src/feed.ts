import { anchorOf, feedPath, type Release, whatsNewPath, whatsNewTitle } from './whats-new'

/**
 * The RSS 2.0 feed of the page Wat is er nieuw: an item per version, newest first, with the number as its title, the date,
 * the lines as a list and a link to the version on the page. A feed reader needs full addresses, so every link starts
 * with the address of the site the feed comes from.
 */
export function feedOf(releases: readonly Release[], origin: string) {
  const page = `${origin}${whatsNewPath}`
  const items = releases.map((release) => {
    const link = `${page}#${anchorOf(release)}`
    // The description is HTML, written as text in the XML, so the lines are escaped twice.
    const list = `<ul>${release.sentences.map((sentence) => `<li>${escape(sentence)}</li>`).join('')}</ul>`

    return [
      '<item>',
      `<title>Versie ${escape(release.version)}</title>`,
      `<link>${escape(link)}</link>`,
      `<guid isPermaLink="true">${escape(link)}</guid>`,
      `<pubDate>${new Date(`${release.date}T00:00:00Z`).toUTCString()}</pubDate>`,
      `<description>${escape(list)}</description>`,
      '</item>',
    ].join('\n')
  })

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '<channel>',
    `<title>${whatsNewTitle} – sc Heerenveen Fansite</title>`,
    `<link>${escape(page)}</link>`,
    `<atom:link href="${escape(`${origin}${feedPath}`)}" rel="self" type="application/rss+xml"/>`,
    '<description>Wat er op de sc Heerenveen Fansite veranderd is, per versie.</description>',
    '<language>nl</language>',
    ...items,
    '</channel>',
    '</rss>',
    '',
  ].join('\n')
}

/** Makes text safe inside XML, and inside HTML too: the characters that mean markup become entities. */
function escape(text: string) {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

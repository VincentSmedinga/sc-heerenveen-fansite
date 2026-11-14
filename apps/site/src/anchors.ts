/*
 * The anchors we have published: the parts of a page that someone can link to
 * (`/privacy#cookies`). A link that someone put somewhere else must not break, so the smoke
 * test fails when one of these is no longer on its page (see anchorProblems). Taking one out
 * of this list is the way to say that on purpose. This module imports nothing, so the smoke
 * test can use it too.
 *
 * A heading with an anchor adds its id here, and that id stays here for as long as the link
 * may exist. When the id of a heading changes, the old one stays on the heading as an old
 * anchor (`aliases`), and both stay in the list. When a heading moves to another page, it
 * takes its anchor along, the old page redirects for good (see redirects in next.config.ts)
 * and the old path keeps its anchors here, because the smoke test follows the redirect.
 *
 * The page Updates has an anchor for each version, and the smoke test adds those from the
 * CHANGELOG, so a new version needs no line here.
 */

/**
 * The anchors of the page of a match (`/wedstrijden/2026-27/2026-10-24-testdorp-fc`), which
 * every such page has. The address of a match depends on its day, so the smoke test takes it
 * from the sitemap and checks these on it.
 */
export const matchPageAnchors: readonly string[] = ['verloop', 'opstelling']

/** The anchors per page, as the address of the page without the part after the hash. */
export const publishedAnchors: Readonly<Record<string, readonly string[]>> = {
  '/bronnen': ['nieuws', 'podcasts', 'forum', 'wedstrijden-en-spelers', 'voorstellen', 'uitgever', 'nieuwsbrief-lc'],
  '/over-ons': ['wie-we-zijn', 'hoe-we-werken', 'gegevens'],
  '/privacy': ['tellen', 'hosting', 'cookies', 'berichten', 'andere-sites', 'vragen'],
  // The card Selectie is the only card of the page Spelers (#1218). The cards Doelpuntenmakers,
  // Bijzondere doelpunten, Alle spelers, Assists and Minuten moved to /spelers/cijfers with
  // their anchors, without a redirect: a link to them on /spelers breaks. The card Sinds
  // 1990/91 and its anchor `sinds-1990-91` are on neither page now, on purpose: the card came
  // back as Topscorers sinds 1990/91 on /spelers/cijfers/alle (#1219), and an anchor follows
  // the title.
  '/spelers': ['selectie'],
  // The cards that moved from /spelers (#1218). The old anchor topscorers comes along. The
  // cards Alle spelers, Assists, Minuten (#832) and Invallers die scoorden (#1224) are
  // there for a season with a match report that is klaar, which the made-up season has.
  '/spelers/cijfers': [
    'doelpuntenmakers',
    'topscorers',
    'alle-spelers',
    'bijzondere-doelpunten',
    'assists',
    'minuten',
    'invallers-die-scoorden',
  ],
  // All seasons (#1219). The made-up data has no hattrick, so the card Hattricks (anchor
  // `hattricks`) is left out there, as it is for any choice that has none; the smoke test
  // checks the two cards that the made-up data has.
  '/spelers/cijfers/alle': ['topscorers-sinds-1990-91', 'strafschoppen'],
  // The card Stadion(s) is on the page of every club that has one; the smoke test checks the
  // made-up club with two names of its stadium. The card Nieuws is on the page of a club that
  // headlines name (#777); the smoke test gives Testdorp FC six, so its page is the one that
  // checks it, and with it the two cards of the sidebar that it also has.
  '/tegenstanders/testdorp-fc': ['nieuws', 'plek-in-de-competitie', 'resultaten-sinds', 'toeschouwers'],
  '/tegenstanders/voorbeeld-united': ['stadion'],
  '/toegankelijkheid': ['belofte', 'wat-we-doen', 'contact', 'nagekeken'],
  '/updates': ['versie-0-1-0', 'versie-0.1.0', 'versie-0-2-0', 'versie-0.2.0'],
  // The card Onze plek door de jaren moved to /wedstrijden/cijfers (#411), and its anchor on
  // /wedstrijden is gone on purpose, without a redirect. The card Verloop op de ranglijst
  // (anchor `verloop-op-de-ranglijst`) is only on a season whose results are of all clubs,
  // which the made-up current season has not, so it is not published here. The results are a
  // card for each competition with a result. The Eredivisie keeps the anchor `uitslagen`; the
  // made-up season has a result in each of the three competitions (#665).
  '/wedstrijden': [
    'laatste-wedstrijd',
    'programma',
    'stand',
    'uitslagen',
    'uitslagen-knvb-beker',
    'uitslagen-play-offs',
    'hoofdtrainer',
  ],
  // The nine cards with figures moved to /cijfers (#483, now /wedstrijden/cijfers),
  // and Hoe vaak welke uitslag followed (#774). Their anchors on /wedstrijden are gone on
  // purpose, without a redirect: a link to one of them breaks. The card Doelpuntenmakers left
  // /wedstrijden/cijfers for /spelers alone (#774), so its anchors #doelpuntenmakers and
  // #topscorers are gone here too. The cards are in four groups with a heading of their own
  // (#1210), which are anchors too. The card Onze plek in de competitie is gone, because the
  // row of key figures shows our place, and the card Opmerkelijk with it (#1210). Onze plek
  // door de jaren and Resultaten per hoofdtrainer left the page of a season for the page of
  // all seasons (#1211): their anchors are gone here on purpose. The card Formaties (#1216) is
  // there for a season with a finished match report that has a formation, which the made-up
  // season has.
  '/wedstrijden/cijfers': [
    'competitie',
    'uitslagen',
    'doelpunten',
    'rondom-de-wedstrijd',
    'doelpunten-per-kwartier',
    'de-nul-gehouden',
    'nul-gehouden',
    'verloop-van-het-seizoen',
    'reeksen',
    'thuis-en-uit',
    'toeschouwers',
    'formaties',
    'hoe-de-wedstrijden-verlopen',
    'hoe-vaak-welke-uitslag',
    'uitersten',
  ],
  // The page with all seasons (#1211). Its four groups, and the cards that are only there:
  // Onze plek door de jaren and Resultaten per hoofdtrainer, which came back from the page of a
  // season, and Records. The cards it shares with a season have their anchors on both.
  '/wedstrijden/cijfers/alle': [
    'seizoenen',
    'uitslagen',
    'doelpunten',
    'rondom-de-wedstrijd',
    'onze-plek-door-de-jaren',
    'resultaten-per-hoofdtrainer',
    'thuis-en-uit',
    'hoe-vaak-welke-uitslag',
    'records',
    'doelpunten-per-kwartier',
    'de-nul-gehouden',
    'toeschouwers',
  ],
}

// Every id on the page, with the elements that carry it.
const idPattern = /\sid="([^"]*)"/g

// The id of each heading that is a link to itself: the old anchors, empty elements, come first.
const anchoredHeadingPattern =
  /<h[2-4]\s[^>]*?\sid="([^"]*)"[^>]*>(?:<span class="hf-heading-target">.*?<\/span>)?(?:<span class="hf-heading-alias"[^>]*><\/span>)*<a class="hf-heading-link"/g

/**
 * What is wrong with the anchors on a page, as lines for a person to read; an empty list means
 * nothing. `published` is what the page promised: each of those ids must still be on the
 * page, and each heading with an anchor must be among them, so adding an anchor is as
 * deliberate as taking one away. An id that comes twice on the page makes a link ambiguous,
 * so that is wrong as well, also when it clashes with an id of something else, such as
 * the id of a list item.
 */
export function anchorProblems(page: string, html: string, published: readonly string[]) {
  const ids = [...html.matchAll(idPattern)].map(([, id]) => id ?? '')
  const problems: string[] = []

  for (const id of new Set(ids)) {
    if (ids.filter((other) => other === id).length > 1) {
      problems.push(`${page}: the id "${id}" is on the page more than once, so a link to it is ambiguous.`)
    }
  }

  for (const anchor of published) {
    if (!ids.includes(anchor)) {
      problems.push(
        `${page}: the anchor "#${anchor}" is gone. Keep it as an old anchor (aliases) on its heading, redirect the page for good if the heading moved, or take it out of src/anchors.ts on purpose.`,
      )
    }
  }

  for (const [, id] of html.matchAll(anchoredHeadingPattern)) {
    if (id !== undefined && !published.includes(id)) {
      problems.push(`${page}: the anchor "#${id}" is new. Add it to src/anchors.ts, so it is a promise from now on.`)
    }
  }

  return problems
}

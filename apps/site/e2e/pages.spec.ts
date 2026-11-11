import { expect, test } from '@playwright/test'

import { adminCookie, type E2eRole } from './admin'
import { articleIdOf, testArticles } from './articles'
import { checkPage } from './check-page'
import { earlierSeasonSlug } from './earlier-season'
import { heldMatchId, statSeasonSlug } from './held-changes'
import { incompleteReportPath } from './incomplete-report'
import { liveReportMatchId, liveReportPath } from './live-report'
import { cupReportMatchId, cupReportPath, matchId, playedMatchId, reportPath } from './matches'
import { mergePair, playerPages } from './persons'
import { squadPlayerId } from './players'

// Every page of the site, one line each, and the status code it must answer. A new page is one
// line here. An address that doesn't exist is the page "niet gevonden"; the status code also
// keeps a typo in a path from testing that page by mistake. A page with `admin` is a page of
// the admin, checked as the moderator or the beheerder that the global setup logs in (see
// admin.ts).
// `{draft}` and `{published}` in a path stand for the number of the made-up draft and the
// made-up published article, and `{match}` for the first made-up match of this season that
// is still to be played, which the database gives, and `{held}` for the match of the season
// before it that has a made-up change of Wikipedia that is held back (see held-changes.ts), and
// `{report}` for the page of the made-up match that has a report, and `{cupReport}` for the one
// with extra time and a shoot-out (see matches.ts), and `{cupMatch}` for the number of that
// match, for the screen of its report in the admin, and `{incompleteReport}` for the page of
// the report that is still being filled in (see incomplete-report.ts), and `{liveReport}` and
// `{liveMatch}` for the page and the number of the made-up match that is being played (see
// live-report.ts).
const pages: { admin?: E2eRole; path: string; status: number }[] = [
  { path: '/', status: 200 },
  // The news archive: all sources, one source, more sources, the second page (the made-up
  // headlines fill more than one page), and the addresses that say "niet gevonden": an unknown
  // source, a source given twice and a page that is wrong.
  { path: '/nieuws', status: 200 },
  { path: '/nieuws?bron=testkrant', status: 200 },
  { path: '/nieuws?bron=testkrant&bron=proefnieuws', status: 200 },
  { path: '/nieuws?bron=proefnieuws&bron=testkrant&bron=voorbeeldkrant', status: 200 },
  { path: '/nieuws?bron=testkrant&bron=testkrant', status: 404 },
  { path: '/nieuws?bron=testkrant&bron=bestaat-niet', status: 404 },
  { path: '/nieuws?pagina=2', status: 200 },
  { path: '/nieuws?bron=testkrant&pagina=99999', status: 404 },
  { path: '/nieuws?bron=bestaat-niet', status: 404 },
  { path: '/nieuws?pagina=99999', status: 404 },
  { path: '/nieuws?pagina=0', status: 404 },
  { path: '/wedstrijden', status: 200 },
  // The card Stand over the latest five matches, and the value that falls back to the whole
  // season.
  { path: '/wedstrijden?stand=laatste-5', status: 200 },
  { path: '/wedstrijden?stand=onzin', status: 200 },
  // The matches of an earlier season (made up, see earlier-season.ts), the route behind the
  // season picker, which sends the visitor on, and the addresses that say "niet gevonden": a
  // season in the future and an address that is no season. The route and the address of the
  // current season end on /wedstrijden, which answers 200.
  { path: `/wedstrijden/${earlierSeasonSlug()}`, status: 200 },
  { path: `/wedstrijden/${earlierSeasonSlug()}?stand=laatste-5`, status: 200 },
  { path: `/wedstrijden/kies?seizoen=${earlierSeasonSlug()}`, status: 200 },
  { path: '/wedstrijden/kies?seizoen=onzin', status: 200 },
  { path: '/wedstrijden/kies', status: 200 },
  // The made-up matches of the old fansite (see madeUpOldMatches in the seed): a season in the
  // Eerste divisie, one with the Intertoto Cup and one with the UEFA Cup, so the pages with the
  // new competitions, the day without a time and the credit of the archive are checked.
  { path: '/wedstrijden/1992-93', status: 200 },
  { path: '/wedstrijden/1996-97', status: 200 },
  { path: '/wedstrijden/2004-05', status: 200 },
  { path: '/wedstrijden/2099-00', status: 404 },
  { path: '/wedstrijden/onzin', status: 404 },
  // The page of a match: the made-up match with a report that is klaar, the made-up cup match
  // with extra time and a shoot-out (#844), and the addresses that say "niet gevonden": another
  // day, a part that is no match, and a season without matches.
  { path: '{report}', status: 200 },
  { path: '{cupReport}', status: 200 },
  // The made-up report that is still being filled in: the page with the notice (#857).
  { path: '{incompleteReport}', status: 200 },
  // The made-up match that is being played: the page with "Live" (#906).
  { path: '{liveReport}', status: 200 },
  { path: `/wedstrijden/${earlierSeasonSlug()}/2000-01-01-testdorp-fc`, status: 404 },
  { path: '/wedstrijden/2026-27/onzin', status: 404 },
  { path: '/wedstrijden/2099-00/2099-01-01-testdorp-fc', status: 404 },
  // The figures of the current season, of an earlier season, the route behind the season
  // picker and the addresses that say "niet gevonden", as for Wedstrijden above.
  { path: '/cijfers', status: 200 },
  { path: `/cijfers/${earlierSeasonSlug()}`, status: 200 },
  { path: `/cijfers/kies?seizoen=${earlierSeasonSlug()}`, status: 200 },
  { path: '/cijfers/kies?seizoen=onzin', status: 200 },
  { path: '/cijfers/kies', status: 200 },
  { path: '/cijfers/1992-93', status: 200 },
  { path: '/cijfers/2004-05', status: 200 },
  { path: '/cijfers/1992-93?competitie=eredivisie', status: 200 },
  { path: '/spelers/1992-93', status: 200 },
  { path: '/cijfers/2099-00', status: 404 },
  { path: '/cijfers/onzin', status: 404 },
  // The page Spelers, an item of the main menu, with the same set of addresses.
  { path: '/spelers', status: 200 },
  { path: `/spelers/${earlierSeasonSlug()}`, status: 200 },
  { path: `/spelers/kies?seizoen=${earlierSeasonSlug()}`, status: 200 },
  { path: '/spelers/kies?seizoen=onzin', status: 200 },
  { path: '/spelers/kies', status: 200 },
  { path: '/spelers/2099-00', status: 404 },
  { path: '/spelers/onzin', status: 404 },
  // The page of a made-up player and a person in no squad of ours (see persons.ts). An old
  // address of the player has a test of its own, below.
  { path: playerPages.player, status: 200 },
  { path: playerPages.opponent, status: 404 },
  // A made-up goalkeeper and a made-up forward, with the table Per seizoen (#1082).
  { path: playerPages.goalkeeper, status: 200 },
  { path: playerPages.forward, status: 200 },
  // The page Tegenstanders, a sub-page of Wedstrijden: the list, a club met in the league
  // (Testdorp FC), one with two names of its stadium (Voorbeeld United) and one met in the cup
  // only (FC Maquette, who is not in the list with the choice Eredivisie and has a sentence on
  // its page), the choice, and
  // the addresses that say "niet gevonden": a slug no club has, a choice that is not known, and
  // a path below a club.
  { path: '/tegenstanders', status: 200 },
  { path: '/tegenstanders?competitie=eredivisie', status: 200 },
  { path: '/tegenstanders?competitie=onzin', status: 404 },
  { path: '/tegenstanders/testdorp-fc', status: 200 },
  { path: '/tegenstanders/testdorp-fc?competitie=eredivisie', status: 200 },
  { path: '/tegenstanders/voorbeeld-united', status: 200 },
  { path: '/tegenstanders/fc-maquette', status: 200 },
  // Clubs that only the made-up old matches meet: the archive is the only source of their page.
  { path: '/tegenstanders/oudstad-fc', status: 200 },
  { path: '/tegenstanders/sv-archiefdorp', status: 200 },
  { path: '/tegenstanders/zomerstad-united', status: 200 },
  { path: '/tegenstanders/fc-maquette?competitie=eredivisie', status: 200 },
  // Clubs with matches still to come and none played: Nepstad Rangers (a weekend, no time yet),
  // Demo Boys (called off) and SV Proefdorp (a cup tie, so also with the choice Eredivisie).
  { path: '/tegenstanders/nepstad-rangers', status: 200 },
  { path: '/tegenstanders/demo-boys', status: 200 },
  { path: '/tegenstanders/sv-proefdorp', status: 200 },
  { path: '/tegenstanders/sv-proefdorp?competitie=eredivisie', status: 200 },
  { path: '/tegenstanders/testdorp-fc?competitie=onzin', status: 404 },
  { path: '/tegenstanders/bestaat-niet', status: 404 },
  { path: '/tegenstanders/testdorp-fc/extra', status: 404 },
  // The old addresses of Cijfers, when the page was still called Statistieken, are gone, with
  // no redirect (#771), and so are the ones under them that Spelers and Tegenstanders had
  // before (#769, #770).
  { path: '/statistieken', status: 404 },
  { path: `/statistieken/${earlierSeasonSlug()}`, status: 404 },
  { path: '/statistieken/kies', status: 404 },
  { path: '/statistieken/spelers', status: 404 },
  { path: '/statistieken/tegenstanders', status: 404 },
  { path: '/statistieken/tegenstanders/testdorp-fc', status: 404 },
  // The choice between all the matches and the Eredivisie, on both pages: `eredivisie` is the
  // only value, and anything else or the same twice says "niet gevonden". The route behind the
  // season picker keeps the choice, and drops a value it does not know.
  { path: '/cijfers?competitie=eredivisie', status: 200 },
  { path: `/cijfers/${earlierSeasonSlug()}?competitie=eredivisie`, status: 200 },
  { path: '/cijfers?competitie=onzin', status: 404 },
  { path: '/cijfers?competitie=eredivisie&competitie=eredivisie', status: 404 },
  { path: `/cijfers/kies?seizoen=${earlierSeasonSlug()}&competitie=eredivisie`, status: 200 },
  { path: '/spelers?competitie=eredivisie', status: 200 },
  { path: '/spelers?competitie=onzin', status: 404 },
  { path: `/spelers/kies?seizoen=${earlierSeasonSlug()}&competitie=eredivisie`, status: 200 },
  // The podcasts: all, one (with the card about it), both (which is all), the second page, and
  // the addresses that say "niet gevonden": an unknown podcast, a podcast given twice and a
  // page that is wrong.
  { path: '/nieuws/podcasts', status: 200 },
  { path: '/nieuws/podcasts?podcast=testpodcast', status: 200 },
  { path: '/nieuws/podcasts?podcast=proefpodcast&podcast=testpodcast', status: 200 },
  { path: '/nieuws/podcasts?podcast=testpodcast&podcast=testpodcast', status: 404 },
  { path: '/nieuws/podcasts?podcast=testpodcast&podcast=bestaat-niet', status: 404 },
  { path: '/nieuws/podcasts?pagina=2', status: 200 },
  { path: '/nieuws/podcasts?podcast=testpodcast&pagina=2', status: 200 },
  { path: '/nieuws/podcasts?podcast=bestaat-niet', status: 404 },
  { path: '/nieuws/podcasts?pagina=99', status: 404 },
  { path: '/nieuws/podcasts?pagina=0', status: 404 },
  // The old addresses of the podcasts and the search are gone, without a redirect.
  { path: '/podcasts', status: 404 },
  { path: '/zoeken', status: 404 },
  // The search, without a search, with results (a headline, an episode and an article), with
  // more results than the first ten, without results, and with a search that is not allowed.
  { path: '/nieuws/zoeken', status: 200 },
  { path: '/nieuws/zoeken?q=heerenveen', status: 200 },
  { path: '/nieuws/zoeken?q=de', status: 200 },
  { path: '/nieuws/zoeken?q=de&aantal=15', status: 200 },
  { path: '/nieuws/zoeken?q=bestaat+echt+niet', status: 200 },
  { path: '/nieuws/zoeken?q=a', status: 200 },
  { path: '/bronnen', status: 200 },
  { path: '/over-ons', status: 200 },
  { path: '/contact', status: 200 },
  { path: '/contact/verstuurd', status: 200 },
  { path: '/privacy', status: 200 },
  { path: '/toegankelijkheid', status: 200 },
  { path: '/updates', status: 200 },
  // The way in to the admin. The admin itself is no page for a visitor without a session: it
  // goes to the login page.
  { path: '/beheer/inloggen', status: 200 },
  { path: '/beheer/inloggen?fout=ongeldig', status: 200 },
  { path: '/beheer/inloggen?fout=link', status: 200 },
  { path: '/beheer/inloggen/verstuurd', status: 200 },
  { path: '/beheer/inloggen/bevestigen?token=onbekend', status: 200 },
  // The admin, as a moderator who is logged in: the start page, the list of items in both
  // groups (the group that is not on the site with and without the box for what editors hid),
  // a search with a result and without one.
  { admin: 'moderator', path: '/beheer', status: 200 },
  { admin: 'moderator', path: '/beheer/berichten', status: 200 },
  { admin: 'moderator', path: '/beheer/berichten?q=Verzonnen', status: 200 },
  { admin: 'moderator', path: '/beheer/berichten?q=bestaat+niet', status: 200 },
  { admin: 'moderator', path: '/beheer/berichten?toon=niet-op-de-site', status: 200 },
  { admin: 'moderator', path: '/beheer/berichten?toon=niet-op-de-site&redactie=1', status: 200 },
  { admin: 'moderator', path: '/beheer/berichten?toon=niet-op-de-site&q=Verzonnen', status: 200 },
  { admin: 'moderator', path: '/beheer/berichten?fout=weg', status: 200 },
  { admin: 'beheerder', path: '/beheer', status: 200 },
  // The articles are for a beheerder: the list, the form for a new one, the form of a draft and
  // of an article that is published (with its versions), the notice after an action, and the
  // preview of both. A moderator and a number that is no article get "niet gevonden".
  { admin: 'beheerder', path: '/beheer/artikelen', status: 200 },
  { admin: 'beheerder', path: '/beheer/artikelen?fout=weg', status: 200 },
  { admin: 'beheerder', path: '/beheer/artikelen/nieuw', status: 200 },
  { admin: 'beheerder', path: '/beheer/artikelen/{draft}', status: 200 },
  { admin: 'beheerder', path: '/beheer/artikelen/{draft}?gedaan=ongewijzigd', status: 200 },
  { admin: 'beheerder', path: '/beheer/artikelen/{published}', status: 200 },
  { admin: 'beheerder', path: '/beheer/artikelen/{draft}/voorbeeld', status: 200 },
  { admin: 'beheerder', path: '/beheer/artikelen/{published}/voorbeeld', status: 200 },
  // The versions: the published article has three, the newest equal to the article. A draft
  // made without the admin has none, and a number the article never had is "niet gevonden".
  { admin: 'beheerder', path: '/beheer/artikelen/{published}/versies/1', status: 200 },
  { admin: 'beheerder', path: '/beheer/artikelen/{published}/versies/2', status: 200 },
  { admin: 'beheerder', path: '/beheer/artikelen/{published}/versies/3', status: 200 },
  { admin: 'beheerder', path: '/beheer/artikelen/{published}/versies/4', status: 404 },
  { admin: 'beheerder', path: '/beheer/artikelen/{draft}/versies/1', status: 404 },
  { admin: 'beheerder', path: '/beheer/artikelen/999999', status: 404 },
  { admin: 'moderator', path: '/beheer/artikelen', status: 404 },
  { admin: 'moderator', path: '/beheer/artikelen/nieuw', status: 404 },
  { admin: 'moderator', path: '/beheer/artikelen/{published}/versies/1', status: 404 },
  // The numbers of the visit are for a beheerder. A moderator gets "niet gevonden".
  // The matches are for a beheerder: the list, the notice for a match that is gone, the form of
  // a match with and without a notice, and the addresses that say "niet gevonden".
  { admin: 'beheerder', path: '/beheer/wedstrijden/nieuw', status: 200 },
  { admin: 'beheerder', path: '/beheer/wedstrijden', status: 200 },
  { admin: 'beheerder', path: '/beheer/wedstrijden?tonen=alles', status: 200 },
  { admin: 'beheerder', path: '/beheer/wedstrijden?tonen=aangepast', status: 200 },
  { admin: 'beheerder', path: `/beheer/wedstrijden?seizoen=${earlierSeasonSlug()}&tonen=alles`, status: 200 },
  { admin: 'beheerder', path: '/beheer/wedstrijden?fout=weg', status: 200 },
  // A change of Wikipedia that is held back: its choice in the list, in an earlier season, and
  // the card on the match, with the form that decides it.
  { admin: 'beheerder', path: `/beheer/wedstrijden?seizoen=${earlierSeasonSlug()}&tonen=wikipedia-wacht`, status: 200 },
  { admin: 'beheerder', path: '/beheer/wedstrijden?gedaan=verwijderd', status: 200 },
  { admin: 'beheerder', path: '/beheer/wedstrijden/{held}', status: 200 },
  { admin: 'beheerder', path: '/beheer/wedstrijden/{held}?gedaan=wijziging-afgewezen', status: 200 },
  { admin: 'beheerder', path: '/beheer/wedstrijden/{match}', status: 200 },
  { admin: 'beheerder', path: '/beheer/wedstrijden/{match}?gedaan=ongewijzigd', status: 200 },
  { admin: 'beheerder', path: '/beheer/wedstrijden/999999', status: 404 },
  // The report of a match: a played match has one, and the notice after an action. A match that
  // was not played or does not exist says "niet gevonden".
  { admin: 'beheerder', path: '/beheer/wedstrijden/{played}', status: 200 },
  { admin: 'beheerder', path: '/beheer/wedstrijden/{played}/verslag', status: 200 },
  { admin: 'beheerder', path: '/beheer/wedstrijden/{played}/verslag?gedaan=opgeslagen', status: 200 },
  // The cup tie with a shoot-out has the lists of the kicks, and the series in the preview.
  { admin: 'beheerder', path: '/beheer/wedstrijden/{cupMatch}/verslag', status: 200 },
  // The match that is being played: its report with the button "Wedstrijd afgelopen", and the
  // confirmation with the stand.
  { admin: 'beheerder', path: '/beheer/wedstrijden/{liveMatch}/verslag', status: 200 },
  { admin: 'beheerder', path: '/beheer/wedstrijden/{liveMatch}/verslag/afgelopen', status: 200 },
  { admin: 'moderator', path: '/beheer/wedstrijden/{liveMatch}/verslag/afgelopen', status: 404 },
  // The quick screen that keeps a report up to date during the match (#907).
  { admin: 'beheerder', path: '/beheer/wedstrijden/{liveMatch}/verslag/live', status: 200 },
  { admin: 'beheerder', path: '/beheer/wedstrijden/{played}/verslag/live', status: 200 },
  { admin: 'moderator', path: '/beheer/wedstrijden/{liveMatch}/verslag/live', status: 404 },
  { admin: 'beheerder', path: '/beheer/wedstrijden/{match}/verslag/live', status: 404 },
  // The screen that reads a pasted text into the form of the report.
  { admin: 'beheerder', path: '/beheer/wedstrijden/{played}/verslag/plakken', status: 200 },
  { admin: 'beheerder', path: '/beheer/wedstrijden/{match}/verslag/plakken', status: 404 },
  { admin: 'moderator', path: '/beheer/wedstrijden/{played}/verslag/plakken', status: 404 },
  { admin: 'beheerder', path: '/beheer/wedstrijden/{match}/verslag', status: 404 },
  { admin: 'beheerder', path: '/beheer/wedstrijden/999999/verslag', status: 404 },
  { admin: 'moderator', path: '/beheer/wedstrijden/{played}/verslag', status: 404 },
  { admin: 'moderator', path: '/beheer/wedstrijden', status: 404 },
  // The players of a season (#1020): the list with its notices, the form that adds one with the
  // search for a person we know, and the form of a player of the made-up squad (`{player}`).
  { admin: 'beheerder', path: '/beheer/spelers', status: 200 },
  { admin: 'beheerder', path: `/beheer/spelers?seizoen=${earlierSeasonSlug()}`, status: 200 },
  { admin: 'beheerder', path: '/beheer/spelers?gedaan=toegevoegd', status: 200 },
  { admin: 'beheerder', path: '/beheer/spelers?fout=weg', status: 200 },
  { admin: 'beheerder', path: `/beheer/spelers/nieuw?seizoen=${statSeasonSlug()}`, status: 200 },
  { admin: 'beheerder', path: `/beheer/spelers/nieuw?seizoen=${statSeasonSlug()}&q=e`, status: 200 },
  { admin: 'beheerder', path: `/beheer/spelers/nieuw?seizoen=${statSeasonSlug()}&q=bestaat+niet`, status: 200 },
  { admin: 'beheerder', path: '/beheer/spelers/{player}', status: 200 },
  { admin: 'beheerder', path: '/beheer/spelers/{player}?gedaan=opgeslagen', status: 200 },
  { admin: 'beheerder', path: '/beheer/spelers/999999', status: 404 },
  // "Dezelfde persoon als" on the form of a player, and the page that merges two persons
  // (issue 977): two made-up persons, one person twice, and an address without persons.
  { admin: 'beheerder', path: '/beheer/spelers/{player}?zoek=verzonnen', status: 200 },
  { admin: 'beheerder', path: '/beheer/spelers/samenvoegen?persoon={person}&met={otherPerson}', status: 200 },
  { admin: 'beheerder', path: '/beheer/spelers/samenvoegen?persoon={person}&met={person}', status: 200 },
  { admin: 'beheerder', path: '/beheer/spelers/samenvoegen', status: 200 },
  { admin: 'moderator', path: '/beheer/spelers/samenvoegen', status: 404 },
  { admin: 'moderator', path: '/beheer/spelers', status: 404 },
  { admin: 'moderator', path: `/beheer/spelers/nieuw?seizoen=${statSeasonSlug()}`, status: 404 },
  { admin: 'moderator', path: '/beheer/spelers/{player}', status: 404 },
  // The stadiums: the list of the clubs with its filter and search, a club with a list of its
  // own and a note (made up, see stadiums.ts), a club without one, and a club that is no club.
  { admin: 'beheerder', path: '/beheer/stadions', status: 200 },
  { admin: 'beheerder', path: '/beheer/stadions?tonen=eigen-lijst', status: 200 },
  { admin: 'beheerder', path: '/beheer/stadions?q=proef', status: 200 },
  { admin: 'beheerder', path: '/beheer/stadions?fout=weg', status: 200 },
  { admin: 'beheerder', path: '/beheer/stadions/sv-proefdorp', status: 200 },
  { admin: 'beheerder', path: '/beheer/stadions/sv-proefdorp?gedaan=opgeslagen', status: 200 },
  { admin: 'beheerder', path: '/beheer/stadions/voorbeeld-united', status: 200 },
  { admin: 'beheerder', path: '/beheer/stadions/bestaat-niet', status: 404 },
  { admin: 'moderator', path: '/beheer/stadions', status: 404 },
  { admin: 'moderator', path: '/beheer/stadions/sv-proefdorp', status: 404 },
  // The names of the clubs: the same pages as the stadiums, with a club that has a list of
  // names of its own and a note (made up, see club-names.ts).
  { admin: 'beheerder', path: '/beheer/clubnamen', status: 200 },
  { admin: 'beheerder', path: '/beheer/clubnamen?tonen=eigen-lijst', status: 200 },
  { admin: 'beheerder', path: '/beheer/clubnamen?q=proef', status: 200 },
  { admin: 'beheerder', path: '/beheer/clubnamen?fout=weg', status: 200 },
  { admin: 'beheerder', path: '/beheer/clubnamen/sv-proefdorp', status: 200 },
  { admin: 'beheerder', path: '/beheer/clubnamen/sv-proefdorp?gedaan=opgeslagen', status: 200 },
  { admin: 'beheerder', path: '/beheer/clubnamen/voorbeeld-united', status: 200 },
  { admin: 'beheerder', path: '/beheer/clubnamen/bestaat-niet', status: 404 },
  { admin: 'moderator', path: '/beheer/clubnamen', status: 404 },
  { admin: 'moderator', path: '/beheer/clubnamen/sv-proefdorp', status: 404 },
  { admin: 'moderator', path: '/beheer/wedstrijden/{match}', status: 404 },
  { admin: 'moderator', path: '/beheer/wedstrijden/{held}', status: 404 },
  // The quality of the data: the table of the seasons, a work list with a row (the made-up
  // change that waits, see held-changes.ts), an empty one, and addresses that are no list.
  { admin: 'beheerder', path: '/beheer/kwaliteit', status: 200 },
  { admin: 'beheerder', path: `/beheer/kwaliteit/${earlierSeasonSlug()}/wachtende-wijzigingen`, status: 200 },
  { admin: 'beheerder', path: '/beheer/kwaliteit/1990-91/zonder-doelpunten', status: 200 },
  // The persons without a line or a country (made up, see persons.ts): both lists, a part
  // that does not exist, which shows the last one, and a list that is no list, which is the
  // first.
  { admin: 'beheerder', path: '/beheer/kwaliteit/personen', status: 200 },
  { admin: 'beheerder', path: '/beheer/kwaliteit/personen?lijst=land', status: 200 },
  { admin: 'beheerder', path: '/beheer/kwaliteit/personen?lijst=land&deel=9', status: 200 },
  { admin: 'beheerder', path: '/beheer/kwaliteit/personen?lijst=onbekend', status: 200 },
  { admin: 'moderator', path: '/beheer/kwaliteit/personen', status: 404 },
  // The players whose numbers differ: a season with the made-up difference, and an empty one.
  { admin: 'beheerder', path: `/beheer/kwaliteit/${statSeasonSlug()}/spelerscijfers`, status: 200 },
  { admin: 'beheerder', path: '/beheer/kwaliteit/1990-91/spelerscijfers', status: 200 },
  { admin: 'beheerder', path: '/beheer/kwaliteit/1989-90/spelerscijfers', status: 404 },
  { admin: 'moderator', path: '/beheer/kwaliteit/1990-91/spelerscijfers', status: 404 },
  // The players of whom the import says something else than the editors: the same seasons.
  { admin: 'beheerder', path: `/beheer/kwaliteit/${statSeasonSlug()}/spelersgegevens`, status: 200 },
  { admin: 'beheerder', path: '/beheer/kwaliteit/1990-91/spelersgegevens', status: 200 },
  { admin: 'beheerder', path: '/beheer/kwaliteit/1989-90/spelersgegevens', status: 404 },
  { admin: 'moderator', path: '/beheer/kwaliteit/1990-91/spelersgegevens', status: 404 },
  { admin: 'beheerder', path: '/beheer/kwaliteit/1989-90/zonder-doelpunten', status: 404 },
  { admin: 'beheerder', path: '/beheer/kwaliteit/1990-91/bestaat-niet', status: 404 },
  { admin: 'moderator', path: '/beheer/kwaliteit', status: 404 },
  { admin: 'moderator', path: '/beheer/kwaliteit/1990-91/zonder-doelpunten', status: 404 },
  { admin: 'beheerder', path: '/beheer/bezoek', status: 200 },
  { admin: 'moderator', path: '/beheer/bezoek', status: 404 },
  // The overview of the articles of the editors: the first page, and the addresses that say
  // "niet gevonden": a page after the last one (the made-up articles fit on one page) and a
  // page that is not a number.
  { path: '/redactie', status: 200 },
  { path: '/redactie?pagina=2', status: 404 },
  { path: '/redactie?pagina=0', status: 404 },
  // An article of the editors, and the addresses that must say "niet gevonden": a draft, an
  // article for later, an address that isn't an article and one in capitals.
  { path: `/redactie/${testArticles.published.slug}`, status: 200 },
  { path: `/redactie/${testArticles.draft.slug}`, status: 404 },
  { path: `/redactie/${testArticles.later.slug}`, status: 404 },
  { path: '/redactie/bestaat-niet', status: 404 },
  { path: `/redactie/${testArticles.published.slug.toUpperCase()}`, status: 404 },
  { path: '/bestaat-niet', status: 404 },
]

/** Puts the numbers of the made-up articles in the path. */
async function withNumbers(path: string) {
  return path.includes('{')
    ? path
        .replace('{draft}', String(await articleIdOf(testArticles.draft.slug)))
        .replace('{published}', String(await articleIdOf(testArticles.published.slug)))
        .replace('{match}', path.includes('{match}') ? String(await matchId()) : '{match}')
        .replace('{held}', path.includes('{held}') ? String(await heldMatchId()) : '{held}')
        .replace('{played}', path.includes('{played}') ? String(await playedMatchId()) : '{played}')
        .replace('{report}', path.includes('{report}') ? await reportPath() : '{report}')
        .replace('{cupReport}', path.includes('{cupReport}') ? await cupReportPath() : '{cupReport}')
        .replace(
          '{incompleteReport}',
          path.includes('{incompleteReport}') ? await incompleteReportPath() : '{incompleteReport}',
        )
        .replace('{liveReport}', path.includes('{liveReport}') ? await liveReportPath() : '{liveReport}')
        .replace('{liveMatch}', path.includes('{liveMatch}') ? String(await liveReportMatchId()) : '{liveMatch}')
        .replace('{cupMatch}', path.includes('{cupMatch}') ? String(await cupReportMatchId()) : '{cupMatch}')
        .replace('{player}', path.includes('{player}') ? String(await squadPlayerId()) : '{player}')
        .replaceAll('{person}', path.includes('{person}') ? String((await mergePair()).person) : '{person}')
        .replace('{otherPerson}', path.includes('{otherPerson}') ? String((await mergePair()).other) : '{otherPerson}')
    : path
}

for (const { admin, path, status } of pages) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`${path} in ${colorScheme}${admin === undefined ? '' : ` as a ${admin}`}`, async ({
      baseURL,
      context,
      page,
    }) => {
      // The setting of the browser, as a visitor makes it in their operating system.
      await page.emulateMedia({ colorScheme })

      if (admin) {
        await context.addCookies([adminCookie(new URL(baseURL ?? '').hostname, admin)])
      }

      const address = await withNumbers(path)
      const response = await page.goto(address)
      expect(response?.status(), `${address} must answer ${status}`).toBe(status)

      expect(await checkPage(page)).toEqual([])
    })
  }
}

// An old address of a player leads to his page of now, for good (#1079): the browser follows
// the 308, so the request asks without following it.
test('an old address of a player answers 308 with the address of now', async ({ request }) => {
  const response = await request.get(playerPages.old, { maxRedirects: 0 })

  expect(response.status()).toBe(308)
  expect(response.headers()['location']).toBe(playerPages.player)
})

// The table Per seizoen has a column for each figure that a season has (#1082): the made-up
// goalkeeper and forward have the table of Wikipedia for 2002/03 and nothing for 2001/02, which
// is a row of dashes with its sentence. The columns by line are tested without a browser.
test('the table Per seizoen has the columns of the figures that we have, and a dash for a season without', async ({
  page,
}) => {
  await page.goto(playerPages.forward)

  const table = page.getByRole('table', { name: /per seizoen/ })

  expect(await table.locator('thead th').allTextContents()).toEqual(['Seizoen', 'Ggespeeld', 'Ddoelpunten', 'Aassists'])
  await expect(table.getByRole('row', { name: /2002\/03/ })).toContainText('28')
  await expect(table.getByRole('row', { name: /2001\/02/ })).toContainText('–')
  await expect(table.getByRole('row', { name: /Totaal/ })).toContainText('28')
  await expect(page.getByText('Een streepje: van dat seizoen hebben we geen opstellingen.')).toBeVisible()
  await expect(page.getByText(/tabel van Wikipedia, die alleen de competities van die tabel telt/)).toBeVisible()

  await page.goto(playerPages.goalkeeper)
  expect(
    await page
      .getByRole('table', { name: /per seizoen/ })
      .locator('thead th')
      .allTextContents(),
  ).toEqual(['Seizoen', 'Ggespeeld'])
})

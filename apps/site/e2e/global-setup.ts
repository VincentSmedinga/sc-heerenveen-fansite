import { addAdmin } from './admin'
import { addArticles } from './articles'
import { addClubNames } from './club-names'
import { addDiscussions } from './discussions'
import { addEarlierSeason } from './earlier-season'
import { addEpisodes } from './episodes'
import { addFinalPlaces } from './final-places'
import { addHeadlines } from './headlines'
import { addHeldChange } from './held-changes'
import { addIncompleteReport } from './incomplete-report'
import { addLiveReport } from './live-report'
import { addOlderMeetings } from './older-meetings'
import { addStadiums } from './stadiums'
import { addStandings } from './standings'
import { addTestSources } from './test-sources'
import { addVisits } from './visits'

// Runs after the site has started and before the first test. It puts the test sources in the
// register (see test-sources.ts), which acceptance no longer has. It also puts a made-up
// article, a draft and an article for later in the database (see articles.ts), and makes the
// moderator with a session that the checks of the admin log in as (see admin.ts), and the
// made-up counters that the page Bezoek shows (see visits.ts), and a made-up league table for
// /wedstrijden (see standings.ts), and made-up matches for the season before it (see
// earlier-season.ts), and our row in the table of the two seasons before that (see
// final-places.ts), and a change of Wikipedia that is held back on one of them (see
// held-changes.ts), and three older matches against Testdorp FC (see older-meetings.ts), and
// a list of stadiums and a list of names of its own for SV Proefdorp (see stadiums.ts and
// club-names.ts), and a made-up report that is still being filled in (see
// incomplete-report.ts), and a made-up match that is being played, with its report (see
// live-report.ts).
// The homepage keeps its headlines and discussions in memory for five minutes, so nothing may
// ask for the homepage before this has run: the site is started with robots.txt as its address
// to wait for (see playwright.config.ts). The function it returns is the teardown.
export default async function globalSetup() {
  // First: the made-up headlines, discussions and episodes below sit on the test sources.
  await addTestSources()

  const removeHeadlines = await addHeadlines()
  const removeDiscussions = await addDiscussions()
  const removeEpisodes = await addEpisodes()
  const removeArticles = await addArticles()
  const removeAdmin = await addAdmin()
  const removeVisits = await addVisits()
  const removeStandings = await addStandings()
  const removeEarlierSeason = await addEarlierSeason()
  const removeFinalPlaces = await addFinalPlaces()
  const removeHeldChange = await addHeldChange()
  const removeOlderMeetings = await addOlderMeetings()
  const removeStadiums = await addStadiums()
  const removeClubNames = await addClubNames()
  const removeIncompleteReport = await addIncompleteReport()
  const removeLiveReport = await addLiveReport()

  return async () => {
    await removeLiveReport()
    await removeIncompleteReport()
    await removeHeadlines()
    await removeDiscussions()
    await removeEpisodes()
    await removeArticles()
    await removeAdmin()
    await removeVisits()
    await removeStandings()
    await removeClubNames()
    await removeStadiums()
    await removeOlderMeetings()
    await removeHeldChange()
    await removeFinalPlaces()
    await removeEarlierSeason()
  }
}

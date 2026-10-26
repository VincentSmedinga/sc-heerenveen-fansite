import { addAdmin } from './admin'
import { addArticles } from './articles'
import { addDiscussions } from './discussions'
import { addEpisodes } from './episodes'
import { addHeadlines } from './headlines'
import { addTestSources } from './test-sources'
import { addVisits } from './visits'

// Runs after the site has started and before the first test. It puts the test sources in the
// register (see test-sources.ts), which acceptance no longer has. It also puts a made-up
// article, a draft and an article for later in the database (see articles.ts), and makes the
// moderator with a session that the checks of the admin log in as (see admin.ts), and the
// made-up counters that the page Bezoek shows (see visits.ts). The homepage keeps its headlines
// and discussions in memory for five minutes, so nothing may ask for the homepage
// before this has run: the site is started with robots.txt as its address to wait for (see
// playwright.config.ts). The function it returns is the teardown.
export default async function globalSetup() {
  // First: the made-up headlines, discussions and episodes below sit on the test sources.
  await addTestSources()

  const removeHeadlines = await addHeadlines()
  const removeDiscussions = await addDiscussions()
  const removeEpisodes = await addEpisodes()
  const removeArticles = await addArticles()
  const removeAdmin = await addAdmin()
  const removeVisits = await addVisits()

  return async () => {
    await removeHeadlines()
    await removeDiscussions()
    await removeEpisodes()
    await removeArticles()
    await removeAdmin()
    await removeVisits()
  }
}

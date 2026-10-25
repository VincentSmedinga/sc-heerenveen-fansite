import { addAdmin } from './admin'
import { addDiscussions } from './discussions'
import { addEpisodes } from './episodes'
import { addHeadlines } from './headlines'

// Runs after the site has started and before the first test. It also makes the moderator with a
// session that the checks of the admin log in as (see admin.ts). The homepage keeps its
// headlines and discussions in memory for five minutes, so nothing may ask for the homepage
// before this has run: the site is started with robots.txt as its address to wait for (see
// playwright.config.ts). The function it returns is the teardown.
export default async function globalSetup() {
  const removeHeadlines = await addHeadlines()
  const removeDiscussions = await addDiscussions()
  const removeEpisodes = await addEpisodes()
  const removeAdmin = await addAdmin()

  return async () => {
    await removeHeadlines()
    await removeDiscussions()
    await removeEpisodes()
    await removeAdmin()
  }
}

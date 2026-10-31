// Puts the made-up headlines, discussions, episodes and articles of the accessibility checks
// (e2e/*.ts) in the database of the .env in the root, so a build on your own computer shows a
// full homepage, /nieuws, /nieuws/podcasts and the matches of the season before this one for
// `pnpm screenshots`. Run it after `pnpm db:migrate` and `pnpm db:seed`, and before you start
// the site: the homepage keeps its headlines for five minutes. `--remove` takes them out again,
// the season before this one only while all its matches are made up. The database holds
// nothing else of them: it is the one you develop with.
//
//   pnpm --filter site test-data
//   pnpm --filter site test-data --remove
import { addArticles } from '../e2e/articles.ts'
import { addDiscussions } from '../e2e/discussions.ts'
import { addEarlierSeason } from '../e2e/earlier-season.ts'
import { addEpisodes } from '../e2e/episodes.ts'
import { addHeadlines } from '../e2e/headlines.ts'

const remove = process.argv.includes('--remove')

// Each function puts its rows in and returns the function that takes them out. The rows of a
// run that was stopped halfway are taken out first, so running it twice never doubles them.
for (const add of [addHeadlines, addDiscussions, addEpisodes, addArticles, addEarlierSeason]) {
  const removeAgain = await add()

  if (remove) {
    await removeAgain()
  }
}

console.log(remove ? 'Took the made-up data out of the database.' : 'Put the made-up data in the database.')

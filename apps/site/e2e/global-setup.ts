import { addHeadlines } from './headlines'

// Runs after the site has started and before the first test. The homepage keeps its headlines in memory for five
// minutes, so nothing may ask for the homepage before this has run: the site is started with robots.txt as its address
// to wait for (see playwright.config.ts). The function it returns is the teardown.
export default async function globalSetup() {
  return addHeadlines()
}

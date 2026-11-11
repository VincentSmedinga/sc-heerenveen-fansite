import type { MetadataRoute } from 'next'

import { getPublishedArticles } from '../articles'
import { reasonOf } from '../errors'
import { urlOf } from '../metadata'
import { getClubRecords, opponentsPath } from '../opponents'
import { pages } from '../pages'
import { getPlayerSlugs, playerAddress } from '../player-page'
import { getAllReportAddresses } from '../report-data'

// Reads SITE_ENV on every request, like robots.txt. Without this, Next.js builds sitemap.xml
// once, with the variables of the build.
export const dynamic = 'force-dynamic'

/**
 * The pages of the site, the published articles, the page of each club we played, the page of
 * each match that has one and the page of each player of ours (#1079), as addresses and nothing
 * else. Without the database the sitemap
 * has the pages alone, and the log says why: a search engine that finds no articles in it
 * doesn't drop them, but a sitemap that fails could be read as a site that is gone.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = pages.map(({ path }) => ({ url: urlOf(path) }))

  try {
    for (const { slug } of await getPublishedArticles()) {
      entries.push({ url: urlOf(`/redactie/${slug}`) })
    }
  } catch (error) {
    console.error(`Could not read the articles for the sitemap: ${reasonOf(error)}`)
  }

  try {
    for (const { slug } of await getClubRecords('all')) {
      entries.push({ url: urlOf(`${opponentsPath}/${slug}`) })
    }
  } catch (error) {
    console.error(`Could not read the clubs for the sitemap: ${reasonOf(error)}`)
  }

  try {
    for (const address of await getAllReportAddresses()) {
      entries.push({ url: urlOf(address) })
    }
  } catch (error) {
    console.error(`Could not read the match reports for the sitemap: ${reasonOf(error)}`)
  }

  try {
    for (const slug of await getPlayerSlugs()) {
      entries.push({ url: urlOf(playerAddress(slug)) })
    }
  } catch (error) {
    console.error(`Could not read the players for the sitemap: ${reasonOf(error)}`)
  }

  return entries
}

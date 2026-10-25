import {
  findNewestArticle,
  findPublishedArticle,
  type PublicArticle,
  type PublicArticleCard,
} from '@fansite/db/queries'

import { getDatabase } from './database'

/**
 * The slugs an article can have: lowercase letters, digits and single hyphens, at most 80
 * characters (the same rule as the check on the table). An address that doesn't fit can't be an
 * article, so the page says "niet gevonden" without asking the database.
 */
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u

/**
 * The published article with this slug, or undefined for a draft, an article for later and an
 * address that is not an article. It tells these three apart from nothing: the page for all
 * three is the same, so a visitor can't find out that a draft exists. Not cached, for the same
 * reason as the newest article.
 */
export async function getArticle(slug: string): Promise<PublicArticle | undefined> {
  if (slug.length > 80 || !slugPattern.test(slug)) {
    return undefined
  }

  return findPublishedArticle(getDatabase().db, slug, new Date())
}

/**
 * The newest article that is published, for the card on the homepage, or undefined when there
 * is none. It is not cached: one indexed query for a visit is cheap, and an article that is
 * withdrawn because of a mistake must be gone from the homepage at once, not after five
 * minutes.
 */
export function getNewestArticle(): Promise<PublicArticleCard | undefined> {
  return findNewestArticle(getDatabase().db, new Date())
}

/**
 * The slug of every published article, newest first, for the sitemap.
 */
export function getPublishedArticles(): Promise<PublicArticleLink[]> {
  return listPublishedArticles(getDatabase().db, new Date())
}

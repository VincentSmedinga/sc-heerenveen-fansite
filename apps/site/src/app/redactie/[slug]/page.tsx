import type { Metadata } from 'next'

import { Article, Page } from '@fansite/design-system'
import { notFound } from 'next/navigation'
import { cache } from 'react'

import { getArticle } from '../../../articles'
import { ArticleText } from '../../../ArticleText'
import { reviewBranch } from '../../../env'
import { reasonOf } from '../../../errors'
import { articleMetadata } from '../../../metadata'
import { dayOf, formatArticleDate } from '../../../news'
import { ServerError, serverErrorTitle } from '../../../ServerError'
import { withBranch } from '../../../title'

// Render on each request, so the build never reads the database, and a withdrawn article is
// gone at once. The canonical URL and the Open Graph address come from SITE_ENV too.
export const dynamic = 'force-dynamic'

type Params = Promise<{ slug: string }>

/**
 * The published article for the address, undefined when the database can't give it, or
 * 'unknown' when there is none. A draft, an article for later and an address that isn't an
 * article are all 'unknown', so nothing tells a visitor that a draft exists. A page that throws
 * gets an empty page with a 500 from Next.js, and the text only after JavaScript runs. So this
 * page catches the error and shows the error page itself, in the HTML. `cache` makes the page
 * and its metadata share one call per request.
 */
const loadArticle = cache(async (slug: string) => {
  try {
    return (await getArticle(slug)) ?? 'unknown'
  } catch (error) {
    console.error(`Could not read the article for /redactie/${slug}: ${reasonOf(error)}`)

    return undefined
  }
})

export default async function ArticlePage({ params }: { params: Params }) {
  const article = await loadFor(params)

  if (article === undefined) {
    return <ServerError retryHref={`/redactie/${(await params).slug}`} />
  }

  return (
    <Page.Main>
      <Article
        author={article.author}
        date={formatArticleDate(article.publishedAt)}
        dateTime={dayOf(article.publishedAt)}
        intro={article.intro}
        title={article.title}
      >
        <ArticleText text={article.body} />
      </Article>
    </Page.Main>
  )
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const article = await loadFor(params)

  // A page that failed answers 200, so noindex keeps search engines from keeping it.
  return article === undefined
    ? { robots: { index: false }, title: withBranch(serverErrorTitle, reviewBranch()) }
    : articleMetadata(article)
}

/**
 * The article for the address in the props, undefined when the database can't give it, or the
 * page "niet gevonden" when there is no such article.
 */
async function loadFor(params: Params) {
  const { slug } = await params
  const article = await loadArticle(slug)

  if (article === 'unknown') {
    notFound()
  }

  return article
}

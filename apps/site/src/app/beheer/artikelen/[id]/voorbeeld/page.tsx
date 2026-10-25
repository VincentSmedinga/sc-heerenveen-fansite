import type { Metadata } from 'next'

import { Article, Card, Heading, Link, Page, Text } from '@fansite/design-system'
import { notFound } from 'next/navigation'

import { ArticleText } from '../../../../../ArticleText'
import { findArticle } from '../../../../../beheer/articles'
import { parseItemId } from '../../../../../beheer/items'
import { requireRole } from '../../../../../beheer/require-role'
import { getDatabase } from '../../../../../database'
import { dayOf, formatArticleDate } from '../../../../../news'
import { articlePath } from '../../paths'

// Render on each request, and never keep it: a preview shows a draft. The admin sends
// `Cache-Control: no-store` and `X-Robots-Tag: noindex` for every path under /beheer (see
// `src/proxy.ts`), and the metadata says noindex as well.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Voorbeeld van een artikel' }

// The article as visitors see it, made by the same `Article` and `ArticleText` as the page
// `/redactie/<adres>`, so a draft looks the way it will. Only a beheerder gets it: the draft is
// in the admin, behind the session, and the public page says "niet gevonden" for it. A draft
// has no date yet, so the preview shows today's.
export default async function ArticlePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole('beheerder')

  const id = parseItemId((await params).id)
  const article = id === undefined ? undefined : await findArticle(getDatabase().db, id)

  if (id === undefined || article === undefined) {
    notFound()
  }

  const now = new Date()
  const moment = article.publishedAt ?? now
  const live = article.publishedAt !== null && article.publishedAt <= now

  return (
    <Page.Main>
      <Card aria-labelledby="voorbeeld-kop" surface="soft">
        <Heading id="voorbeeld-kop" level={2}>
          Voorbeeld
        </Heading>
        <Text>
          {live
            ? `Zo ziet een bezoeker dit artikel op /redactie/${article.slug}.`
            : 'Dit artikel is een concept. Zo ziet een bezoeker het zodra je het publiceert, met de datum van die dag.'}{' '}
          <Link href={articlePath(article.id)}>Terug naar het formulier</Link>
        </Text>
      </Card>
      <Article
        author={article.author}
        date={formatArticleDate(moment)}
        dateTime={dayOf(moment)}
        intro={article.intro}
        title={article.title}
      >
        <ArticleText text={article.body} />
      </Article>
    </Page.Main>
  )
}

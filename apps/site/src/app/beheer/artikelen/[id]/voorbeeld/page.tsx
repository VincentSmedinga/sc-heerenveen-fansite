import type { Metadata } from 'next'

import { adminRoles } from '@fansite/db/schema'
import { Article, Card, Heading, Link, Page, Text } from '@fansite/design-system'
import { notFound } from 'next/navigation'

import { articlePath } from '#src/app/beheer/artikelen/paths'
import { ArticleText } from '#src/ArticleText'
import { singleAreas } from '#src/beheer/areas'
import { findArticleFor } from '#src/beheer/articles'
import { compact } from '#src/beheer/density'
import { parseItemId } from '#src/beheer/items'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'
import { dayOf, formatArticleDate } from '#src/news'

// Render on each request, and never keep it: a preview shows a draft. The admin sends
// `Cache-Control: no-store` and `X-Robots-Tag: noindex` for every path under /beheer (see
// `src/proxy.ts`), and the metadata says noindex as well.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Voorbeeld van een artikel' }

// The article as visitors see it, made by the same `Article` and `ArticleText` as the page
// `/redactie/<adres>`, so a draft looks the way it will. An owner or an editor gets every one,
// an author only his own: the draft is in the admin, behind the session, and the public page
// says "niet gevonden" for it. A draft has no date yet, so the preview shows today's.
export default async function ArticlePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const reader = await requireRole(...adminRoles)

  const id = parseItemId((await params).id)
  const article = id === undefined ? undefined : await findArticleFor(getDatabase().db, id, reader)

  if (id === undefined || article === undefined) {
    notFound()
  }

  const now = new Date()
  const moment = article.publishedAt ?? now
  const live = article.publishedAt !== null && article.publishedAt <= now

  return (
    <Page.Main areas={singleAreas} className={compact}>
      <Page.Cell area="main">
        <Card aria-labelledby="voorbeeld-kop" surface="soft">
          <Heading id="voorbeeld-kop" level={2}>
            Voorbeeld
          </Heading>
          <Text>
            {live
              ? `Zo ziet een bezoeker dit artikel op /redactie/${article.slug}.`
              : 'Dit artikel is een concept. Zo ziet een bezoeker het zodra het op de site staat, met de datum van die dag.'}{' '}
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
          <ArticleText body={article.body} />
        </Article>
      </Page.Cell>
    </Page.Main>
  )
}

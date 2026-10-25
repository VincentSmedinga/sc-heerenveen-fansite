import type { Metadata } from 'next'

import { Article, Card, Heading, Link, Page, Text } from '@fansite/design-system'
import { notFound } from 'next/navigation'

import { ArticleText } from '../../../../../../ArticleText'
import { findVersion } from '../../../../../../beheer/article-versions'
import { findArticle } from '../../../../../../beheer/articles'
import { parseItemId } from '../../../../../../beheer/items'
import { requireRole } from '../../../../../../beheer/require-role'
import { getDatabase } from '../../../../../../database'
import { dayOf, formatArticleDate, formatVersionTime } from '../../../../../../news'
import { articlePath } from '../../../paths'

// Render on each request, and never keep it: a version can be a text that was never published.
// The admin sends `Cache-Control: no-store` and `X-Robots-Tag: noindex` for every path under
// /beheer (see `src/proxy.ts`), and the metadata says noindex as well.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Versie van een artikel' }

// One saved version of an article as visitors would see it, made by the same `Article` and
// `ArticleText` as the preview and the page `/redactie/<adres>`, with the facts of the version
// above it. Only a beheerder gets it. There is no button to put the version back: whoever wants
// an old text copies it from here. The date is the one of the article, or today's for a draft,
// like the preview.
export default async function ArticleVersionPage({ params }: { params: Promise<{ id: string; nummer: string }> }) {
  await requireRole('beheerder')

  const { id: idText, nummer } = await params
  const id = parseItemId(idText)
  const number = parseItemId(nummer)
  const database = getDatabase().db
  const article = id === undefined ? undefined : await findArticle(database, id)
  const version = id === undefined || number === undefined ? undefined : await findVersion(database, id, number)

  if (article === undefined || version === undefined) {
    notFound()
  }

  const moment = article.publishedAt ?? new Date()

  return (
    <Page.Main>
      <Card aria-labelledby="versie-kop" surface="soft">
        <Heading id="versie-kop" level={2}>
          Versie {version.version}
        </Heading>
        <Text>
          Bewaard op {formatVersionTime(version.savedAt)} door {version.savedBy}.{' '}
          {version.newest
            ? 'Dit is de huidige versie: het artikel zoals het nu is.'
            : 'Dit is een eerdere versie. Het artikel is daarna veranderd.'}
        </Text>
        <Text>
          Het adres van deze versie was /redactie/{version.slug}. Zo ziet een bezoeker deze tekst.{' '}
          <Link href={articlePath(article.id)}>Terug naar het formulier</Link>
        </Text>
      </Card>
      <Article
        author={version.author}
        date={formatArticleDate(moment)}
        dateTime={dayOf(moment)}
        intro={version.intro}
        title={version.title}
      >
        <ArticleText text={version.body} />
      </Article>
    </Page.Main>
  )
}

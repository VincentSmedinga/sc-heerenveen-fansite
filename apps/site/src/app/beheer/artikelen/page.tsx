import type { Metadata } from 'next'

import { adminRoles } from '@fansite/db/schema'
import { Button, Card, Form, Heading, Link, List, Page, Text } from '@fansite/design-system'

import { adminAreas } from '#src/beheer/areas'
import { listArticles, listLength, ownArticlesOf } from '#src/beheer/articles'
import { compact } from '#src/beheer/density'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'
import { formatArticleDate } from '#src/news'

import { articlePath, previewPath } from './paths'

// Render on each request: who is logged in and which articles exist are not known when the site
// is built.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Artikelen' }

type SearchParams = Record<string, string | string[] | undefined>

// The list of the articles of the editors: the one written last first, with
// where each stands, a link to write on it and a link to preview it. "Nieuw artikel" is a form
// with method GET, so it is a real button and works without JavaScript.
export default async function ArticlesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const reader = await requireRole(...adminRoles)
  const { fout } = await searchParams
  // An author sees only the articles he made (issue 1156).
  const found = await listArticles(getDatabase().db, ownArticlesOf(reader))
  const now = new Date()

  return (
    <Page.Main areas={adminAreas} className={compact}>
      <Page.Cell area="head">
        <Heading level={1}>Artikelen</Heading>
        <Text appearance="intro">
          {reader.role === 'author'
            ? 'Hier schrijf en publiceer je je eigen artikelen. Een concept staat nergens op de site.'
            : 'Hier schrijf je de artikelen van de redactie. Een concept staat nergens op de site. Een gepubliceerd artikel staat op een eigen pagina en, als het het nieuwste is, op home.'}
        </Text>
        <Form action="/beheer/artikelen/nieuw" method="get">
          <Button icon="plus" type="submit">
            Nieuw artikel
          </Button>
        </Form>
      </Page.Cell>
      <Page.Cell area="main">
        {fout === 'weg' ? (
          <Card aria-labelledby="weg-kop" surface="soft">
            <Heading id="weg-kop" level={2}>
              Dit artikel bestaat niet
            </Heading>
            <Text>Er is niets veranderd. Kies hieronder een artikel.</Text>
          </Card>
        ) : null}
        <Card as="div">
          <Text appearance="meta">
            {found.length === 0
              ? 'Er zijn nog geen artikelen.'
              : `${found.length === listLength ? `De laatste ${listLength}` : found.length} ${found.length === 1 ? 'artikel' : 'artikelen'}.`}
          </Text>
          {found.length === 0 ? null : (
            <List className="hf-flow" role="list">
              {found.map((article) => (
                <List.Item className="hf-flow" key={article.id}>
                  <Heading appearance={4} level={2}>
                    <Link href={articlePath(article.id)}>{article.title}</Link>
                  </Heading>
                  <Text appearance="meta">
                    {article.publishedAt === null
                      ? 'Concept'
                      : article.publishedAt > now
                        ? `Gepland voor ${formatArticleDate(article.publishedAt)}`
                        : `Gepubliceerd op ${formatArticleDate(article.publishedAt)}`}
                    {' · '}
                    Door {article.author}
                    {' · '}
                    <Link href={previewPath(article.id)}>
                      Voorbeeld
                      <Text as="span" className="hf-visually-hidden">
                        {' '}
                        van “{article.title}”
                      </Text>
                    </Link>
                  </Text>
                </List.Item>
              ))}
            </List>
          )}
        </Card>
        <Text>
          <Link href="/beheer">Terug naar het beheer</Link>
        </Text>
      </Page.Cell>
    </Page.Main>
  )
}

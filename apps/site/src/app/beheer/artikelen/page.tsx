import type { Metadata } from 'next'

import { Button, Card, Form, Heading, Link, List, Page, Text } from '@fansite/design-system'

import { listArticles, listLength } from '../../../beheer/articles'
import { requireRole } from '../../../beheer/require-role'
import { getDatabase } from '../../../database'
import { formatArticleDate } from '../../../news'
import { articlePath, previewPath } from './paths'

// Render on each request: who is logged in and which articles exist are not known when the site
// is built.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Artikelen' }

type SearchParams = Record<string, string | string[] | undefined>

// The list of the articles of the editors, for a beheerder: the one written last first, with
// where each stands, a link to write on it and a link to preview it. "Nieuw artikel" is a form
// with method GET, so it is a real button and works without JavaScript.
export default async function ArticlesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireRole('beheerder')

  const { fout } = await searchParams
  const found = await listArticles(getDatabase().db)
  const now = new Date()

  return (
    <Page.Main
      intro={
        <>
          <Heading level={1}>Artikelen</Heading>
          <Text appearance="intro">
            Hier schrijf je de artikelen van de redactie. Een concept staat nergens op de site. Een gepubliceerd artikel
            staat op een eigen pagina en, als het het nieuwste is, op home.
          </Text>
          <Form action="/beheer/artikelen/nieuw" method="get">
            <Button icon="plus" type="submit">
              Nieuw artikel
            </Button>
          </Form>
        </>
      }
    >
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
          <List role="list">
            {found.map((article) => (
              <List.Item key={article.id}>
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
    </Page.Main>
  )
}

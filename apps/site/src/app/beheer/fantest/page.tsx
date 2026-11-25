import type { Metadata } from 'next'

import { adminRoles } from '@fansite/db/schema'
import { Button, Card, Form, Heading, Link, List, Page, Text } from '@fansite/design-system'

import { adminAreas } from '#src/beheer/areas'
import { compact } from '#src/beheer/density'
import { listQuizzes } from '#src/beheer/quizzes'
import { requireFantest } from '#src/beheer/require-fantest'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'
import { capital, monthTitle } from '#src/fans/fantest'

import { newQuizPath, quizPath, quizPreviewPath } from './paths'

// Render on each request: who is logged in and which quizzes exist are not known when the site
// is built.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Fantest' }

type SearchParams = Record<string, string | string[] | undefined>

// The quizzes of the editors, the newest month first (issue 1481). The quizzes of the archive
// are not among them. "Nieuwe quiz" is a form with method GET, so it works without JavaScript.
export default async function QuizzesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireRole(...adminRoles)
  requireFantest()

  const { fout } = await searchParams
  const found = await listQuizzes(getDatabase().db)

  return (
    <Page.Main areas={adminAreas} className={compact}>
      <Page.Cell area="head">
        <Heading level={1}>Fantest</Heading>
        <Text appearance="intro">
          Hier schrijf je de quiz van een maand: tien vragen met vier antwoorden. Een concept ziet niemand buiten het
          beheer.
        </Text>
        <Form action={newQuizPath} method="get">
          <Button icon="plus" type="submit">
            Nieuwe quiz
          </Button>
        </Form>
      </Page.Cell>
      <Page.Cell area="main">
        {fout === 'weg' ? (
          <Card aria-labelledby="weg-kop" surface="soft">
            <Heading id="weg-kop" level={2}>
              Deze quiz bestaat niet
            </Heading>
            <Text>Er is niets veranderd. Kies hieronder een quiz.</Text>
          </Card>
        ) : null}
        <Card as="div">
          <Text appearance="meta">
            {found.length === 0
              ? 'Er zijn nog geen quizzen.'
              : `${found.length} ${found.length === 1 ? 'quiz' : 'quizzen'}.`}
          </Text>
          {found.length === 0 ? null : (
            <List className="hf-flow" role="list">
              {found.map(({ id, month, status, year }) => (
                <List.Item className="hf-flow" key={id}>
                  <Heading appearance={4} level={2}>
                    <Link href={quizPath(id)}>{capital(monthTitle(year, month))}</Link>
                  </Heading>
                  <Text appearance="meta">
                    {status === 'published' ? 'Gepubliceerd' : 'Concept'}
                    {' · '}
                    <Link href={quizPreviewPath(id)}>
                      Voorbeeld
                      <Text as="span" className="hf-visually-hidden">
                        {' '}
                        van {monthTitle(year, month)}
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

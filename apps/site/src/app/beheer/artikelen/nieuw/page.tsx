import type { Metadata } from 'next'

import { Heading, Link, Page, Text } from '@fansite/design-system'

import { emptyValues } from '#src/beheer/article-fields'
import { compact } from '#src/beheer/density'
import { requireRole } from '#src/beheer/require-role'

import { submitNewArticle } from '../actions'
import { ArticleForm } from '../ArticleForm'
import { formLimits } from '../limits'
import { articlesPath } from '../paths'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Nieuw artikel' }

// The form for a new article. It saves a draft: nothing is on the site until the editor
// publishes it, from the page of the article.
export default async function NewArticlePage() {
  await requireRole('beheerder')

  return (
    <Page.Main
      className={compact}
      intro={
        <>
          <Heading level={1}>Nieuw artikel</Heading>
          <Text appearance="intro">
            Vul de velden in en sla het artikel op als concept. Daarna kijk je met het voorbeeld hoe het eruitziet, en
            publiceer je het.
          </Text>
        </>
      }
    >
      <ArticleForm
        action={submitNewArticle}
        initial={{ ...emptyValues, auteur: 'de redactie' }}
        limits={formLimits}
        status="new"
      />
      <Text>
        <Link href={articlesPath}>Terug naar de artikelen</Link>
      </Text>
    </Page.Main>
  )
}

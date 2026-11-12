import type { Metadata } from 'next'

import { adminRoles } from '@fansite/db/schema'
import { Heading, Link, Page, Text } from '@fansite/design-system'

import { toolbarAreas } from '#src/beheer/areas'
import { emptyValues } from '#src/beheer/article-fields'
import { compact } from '#src/beheer/density'
import { articleFormId } from '#src/beheer/form-ids'
import { requireRole } from '#src/beheer/require-role'
import { SaveButtons } from '#src/beheer/SaveButtons'

import { submitNewArticle } from '../actions'
import { ArticleForm } from '../ArticleForm'
import { formLimits } from '../limits'
import { articlesPath } from '../paths'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Nieuw artikel' }

// The form for a new article. It saves a draft: nothing is on the site until the editor
// publishes it, from the page of the article.
export default async function NewArticlePage() {
  await requireRole(...adminRoles)

  return (
    <Page.Main areas={toolbarAreas} className={compact}>
      <Page.Cell area="head">
        <Heading level={1}>Nieuw artikel</Heading>
        <Text appearance="intro">
          Vul de velden in en sla het artikel op als concept. Daarna kijk je met het voorbeeld hoe het eruitziet, en
          publiceer je het.
        </Text>
      </Page.Cell>
      <Page.Toolbar>
        <SaveButtons buttons={[{ label: 'Opslaan als concept' }]} cancelHref={articlesPath} formId={articleFormId} />
      </Page.Toolbar>
      <Page.Cell area="main">
        <ArticleForm
          action={submitNewArticle}
          initial={{ ...emptyValues, auteur: 'de redactie' }}
          limits={formLimits}
          status="new"
        />
        <Text>
          <Link href={articlesPath}>Terug naar de artikelen</Link>
        </Text>
      </Page.Cell>
    </Page.Main>
  )
}

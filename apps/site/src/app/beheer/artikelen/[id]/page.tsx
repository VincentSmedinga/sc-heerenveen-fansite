import type { Metadata } from 'next'

import { Button, Card, Form, Heading, Link, List, Page, Text } from '@fansite/design-system'
import { notFound } from 'next/navigation'

import { listVersions } from '../../../../beheer/article-versions'
import { findArticle } from '../../../../beheer/articles'
import { parseItemId } from '../../../../beheer/items'
import { requireRole } from '../../../../beheer/require-role'
import { getDatabase } from '../../../../database'
import { formatArticleDate, formatVersionTime } from '../../../../news'
import { submitArticle, submitWithdraw } from '../actions'
import { ArticleForm } from '../ArticleForm'
import { FormatHelp } from '../FormatHelp'
import { formLimits } from '../limits'
import { articlesPath, previewPath, versionPath } from '../paths'

// Render on each request: the article changes with every save.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { follow: false, index: false }, title: 'Artikel bewerken' }

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/** How recent a save must be for the notice "Opgeslagen" to be true. */
const freshFor = 5 * 60 * 1000

// The form of one article, with where it stands, a link to the preview and, for a published
// article, the button to withdraw it, and under them the earlier versions of the text. The page
// tells the editor what the last action did from what the database says now.
export default async function ArticlePage({ params, searchParams }: Props) {
  await requireRole('beheerder')

  const id = parseItemId((await params).id)
  const article = id === undefined ? undefined : await findArticle(getDatabase().db, id)

  if (id === undefined || article === undefined) {
    notFound()
  }

  const versions = await listVersions(getDatabase().db, article.id)
  const now = new Date()
  const { gedaan } = await searchParams
  const notice = noticeFor(gedaan, article, now)
  const status = article.publishedAt === null ? 'draft' : 'published'

  return (
    <Page.Main
      intro={
        <>
          <Heading level={1}>Artikel bewerken</Heading>
          <Text appearance="intro">{article.title}</Text>
          <Text>
            {article.publishedAt === null
              ? 'Dit artikel is een concept. Het staat nergens op de site.'
              : article.publishedAt > now
                ? `Dit artikel is gepland voor ${formatArticleDate(article.publishedAt)}.`
                : `Dit artikel staat sinds ${formatArticleDate(article.publishedAt)} op de site. Een wijziging die je opslaat, staat er meteen.`}{' '}
            <Link href={previewPath(article.id)}>Voorbeeld</Link>
          </Text>
        </>
      }
    >
      {notice === undefined ? null : (
        <Card aria-labelledby="gedaan-kop" surface="soft">
          <Heading id="gedaan-kop" level={2}>
            {notice.title}
          </Heading>
          <Text>{notice.text}</Text>
        </Card>
      )}
      <FormatHelp />
      <ArticleForm
        action={submitArticle.bind(null, article.id)}
        initial={{
          adres: article.slug,
          auteur: article.author,
          intro: article.intro,
          tekst: article.body,
          titel: article.title,
        }}
        key={`${article.id}-${article.updatedAt.getTime()}-${article.publishedAt?.getTime() ?? 0}`}
        limits={formLimits}
        status={status}
      />
      {article.publishedAt === null ? null : (
        <Card aria-labelledby="intrekken-kop" surface="soft">
          <Heading id="intrekken-kop" level={2}>
            Van de site halen
          </Heading>
          <Text>
            Intrekken haalt het artikel meteen van de site en maakt er weer een concept van. Er wordt niets verwijderd.
            Publiceer je het later opnieuw, dan krijgt het de datum van dat moment.
          </Text>
          <Form action={submitWithdraw.bind(null, article.id)}>
            <Button appearance="soft" type="submit">
              Intrekken
            </Button>
          </Form>
        </Card>
      )}
      <Card aria-labelledby="versies-kop">
        <Heading id="versies-kop" level={2}>
          Eerdere versies
        </Heading>
        {versions.length === 0 ? (
          <Text>
            Van dit artikel is nog geen versie bewaard. De eerste komt bij de eerstvolgende wijziging in dit scherm.
          </Text>
        ) : (
          <>
            <Text appearance="meta">
              Elke keer dat je iets verandert en opslaat, bewaren we de tekst. Publiceren en intrekken bewaren geen
              versie.
            </Text>
            <List role="list">
              {versions.map((version, index) => (
                <List.Item key={version.version}>
                  <Heading appearance={4} level={3}>
                    <Link href={versionPath(article.id, version.version)}>Versie {version.version}</Link>
                  </Heading>
                  <Text appearance="meta">
                    {index === 0 ? 'Huidige versie · ' : ''}
                    {formatVersionTime(version.savedAt)}
                    {' · '}
                    {version.savedBy}
                  </Text>
                </List.Item>
              ))}
            </List>
          </>
        )}
      </Card>
      <Text>
        <Link href={articlesPath}>Terug naar de artikelen</Link>
      </Text>
    </Page.Main>
  )
}

/**
 * The notice for what the last action did, or undefined. The address only says what happened;
 * the page tells it only when the article is in the state the notice names, so a made-up
 * address can't make the page claim something that did not happen. A save and a new draft are
 * told for five minutes, by the time of the article itself.
 */
function noticeFor(
  done: string | string[] | undefined,
  article: { createdAt: Date; publishedAt: Date | null; updatedAt: Date },
  now: Date,
) {
  const live = article.publishedAt !== null && article.publishedAt <= now
  const fresh = (moment: Date) => now.getTime() - moment.getTime() <= freshFor

  switch (done) {
    case 'al-gepubliceerd':
      return live
        ? { text: 'Het artikel stond al op de site. Er is niets gepubliceerd.', title: 'Al gepubliceerd' }
        : undefined
    case 'al-ingetrokken':
      return article.publishedAt === null
        ? { text: 'Het artikel was al een concept. Er is niets veranderd.', title: 'Al ingetrokken' }
        : undefined
    case 'gemaakt':
      return fresh(article.createdAt)
        ? { text: 'Het artikel is bewaard als concept. Het staat nog niet op de site.', title: 'Concept gemaakt' }
        : undefined
    case 'gepubliceerd':
      return live
        ? { text: 'Het artikel staat nu op de site, en als het het nieuwste is ook op home.', title: 'Gepubliceerd' }
        : undefined
    case 'ingetrokken':
      return article.publishedAt === null
        ? { text: 'Het artikel is van de site gehaald en is weer een concept.', title: 'Ingetrokken' }
        : undefined
    case 'ongewijzigd':
      return { text: 'Je had niets veranderd, dus er is niets opgeslagen.', title: 'Niets veranderd' }
    case 'opgeslagen':
      return fresh(article.updatedAt) ? { text: 'Je wijzigingen zijn bewaard.', title: 'Opgeslagen' } : undefined
    default:
      return undefined
  }
}

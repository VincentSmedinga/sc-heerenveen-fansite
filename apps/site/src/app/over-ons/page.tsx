import type { Metadata } from 'next'

import { Heading, Link, Page, Text } from '@fansite/design-system'

import { email } from '../../contact'
import { pageMetadata } from '../../metadata'

// Render on each request: the canonical URL and the Open Graph address come from SITE_ENV,
// which the build doesn't know.
export const dynamic = 'force-dynamic'

export const generateMetadata = (): Metadata => pageMetadata('/over-ons', 'Over ons')

const EmailLink = () => (
  <Link href={`mailto:${email}`} icon="envelope">
    {email}
  </Link>
)

// Who we are and how we work, each in a few sentences. What we do with data is on its own page,
// Privacy.
export default function AboutPage() {
  return (
    <Page.Main>
      <Page.Cell>
        <Heading level={1}>Over ons</Heading>
        <Heading level={2}>Wie we zijn</Heading>
        <Text appearance="intro">
          De sc Heerenveen Fansite is een site van supporters, voor supporters. We zetten de koppen van de media over sc
          Heerenveen op één plek, met een link naar het hele verhaal.
        </Text>
        <Text>
          We schrijven niks over en we passen niks aan. We hebben geen advertenties, geen abonnementen en geen
          winstoogmerk. Bij de site hoort ook{' '}
          <Link href="https://forum.heerenveen.org" icon="external-link">
            ons forum
          </Link>
          , waar supporters met elkaar praten.
        </Text>
        <Text>
          Vincent Smedinga begon de site in 1997. In die jaren hielpen veel mensen mee, aan de site en aan het forum, en
          ook nu weer. De laatste versie liep tot 2006, en in 2026 is de site terug.
        </Text>
        <Heading level={2}>Hoe we werken</Heading>
        <Text>
          Van elk bericht tonen we de kop, de link en de naam van de bron. Een intro of een foto alleen als de bron ons
          daar toestemming voor geeft. Welke media we volgen, lees je bij <Link href="/bronnen">Onze bronnen</Link>.
        </Text>
        <Text>
          Ben je uitgever en wil je dat we iets veranderen of weghalen? Vul het formulier bij{' '}
          <Link href="/contact">Contact</Link> in, of mail naar <EmailLink />. We pakken je verzoek zo snel mogelijk op.
        </Text>
        <Text>
          Wat we met je gegevens doen, lees je bij <Link href="/privacy">Privacy</Link>.
        </Text>
      </Page.Cell>
    </Page.Main>
  )
}

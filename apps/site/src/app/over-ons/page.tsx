import type { Metadata } from 'next'

import { Card, Heading, Link, Page, Text } from '@fansite/design-system'

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

// Who we are and how we work, each in a few sentences, and in the sidebar where the data comes
// from and what can go wrong with it. What we do with data is on its own page, Privacy.
export default function AboutPage() {
  return (
    <>
      <Page.Main>
        <Page.Cell>
          <Heading level={1}>Over ons</Heading>
          <Heading anchor id="wie-we-zijn" level={2}>
            Wie we zijn
          </Heading>
          <Text appearance="intro">
            De sc Heerenveen Fansite is een site van supporters, voor supporters, met de koppen over sc Heerenveen op
            één plek.
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
            Vincent Smedinga begon de site in 1997. In die jaren hielpen veel mensen mee, aan de site en aan het forum,
            en ook nu weer. De laatste versie liep tot 2006, en in 2026 is de site terug.
          </Text>
          <Heading anchor id="hoe-we-werken" level={2}>
            Hoe we werken
          </Heading>
          <Text>
            Van elk bericht tonen we de kop, de link en de naam van de bron. Een intro of een foto alleen als de bron
            ons daar toestemming voor geeft. Welke media we volgen, lees je bij{' '}
            <Link href="/bronnen">Onze bronnen</Link>.
          </Text>
          <Text>
            Ben je uitgever en wil je dat we iets veranderen of weghalen? Vul het formulier bij{' '}
            <Link href="/contact">Contact</Link> in, of mail naar <EmailLink />. We pakken je verzoek zo snel mogelijk
            op.
          </Text>
          <Text>
            Wat we met je gegevens doen, lees je bij <Link href="/privacy">Privacy</Link>.
          </Text>
        </Page.Cell>
      </Page.Main>
      <Page.Sidebar aria-label="Over de gegevens">
        <Card aria-labelledby="gegevens" surface="soft">
          <Heading anchor appearance={3} id="gegevens" level={2}>
            Waar de gegevens vandaan komen
          </Heading>
          <Heading appearance={4} level={3}>
            Nieuws
          </Heading>
          <Text>
            De importer, een programma, haalt regelmatig de feeds op. Bij sommige bronnen kiest een filter de koppen
            over sc Heerenveen, rond een wedstrijd ook over de tegenstander. Het mist soms een kop of laat er een te
            veel staan.
          </Text>
          <Heading appearance={4} level={3}>
            Wedstrijden en stand
          </Heading>
          <Text>
            Uitslagen, doelpunten en stand komen van de Nederlandse Wikipedia (CC BY-SA 4.0). We lezen haar hoogstens
            één keer per uur, dus een uitslag kan achterlopen. Namen staan zoals Wikipedia ze schrijft, soms anders dan
            bij de club.
          </Text>
          <Heading appearance={4} level={3}>
            Forum en podcasts
          </Heading>
          <Text>Discussies komen van ons forum, afleveringen uit de podcastfeeds.</Text>
          <Heading appearance={4} level={3}>
            Een fout?
          </Heading>
          <Text>
            Meld hem via <Link href="/contact">Contact</Link>. Staat hij ook op Wikipedia, verbeter hem dan daar.
          </Text>
        </Card>
      </Page.Sidebar>
    </>
  )
}

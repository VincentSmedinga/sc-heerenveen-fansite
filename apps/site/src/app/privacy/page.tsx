import type { Metadata } from 'next'

import { Heading, Link, List, Page, Text } from '@fansite/design-system'

import { email } from '../../contact'
import { pageMetadata } from '../../metadata'

// Render on each request: the canonical URL and the Open Graph address come from SITE_ENV, which the build doesn't know.
export const dynamic = 'force-dynamic'

export const generateMetadata = (): Metadata => pageMetadata('/privacy', 'Privacy')

const EmailLink = () => <Link href={`mailto:${email}`}>{email}</Link>

// What we do with data, in a few sentences. The footer and Over ons link here.
export default function PrivacyPage() {
  return (
    <Page.Main>
      <Page.Cell>
        <Heading level={1}>Privacy</Heading>
        <Text>
          De site zet geen cookies, volgt niemand en laadt niets van een ander domein. Toch moeten we de volgende dingen
          even noemen.
        </Text>
        <List>
          <List.Item>
            Onze hosting houdt voor de beveiliging logbestanden bij, met onder meer IP-adressen. We gebruiken ze alleen
            daarvoor, bewaren ze niet langer dan nodig en geven ze aan niemand.
          </List.Item>
          <List.Item>Een mail aan ons gebruiken we alleen om te antwoorden.</List.Item>
          <List.Item>
            Vragen over je gegevens stel je aan de redactie: <EmailLink />. Maar ons antwoord zal zijn: we hebben geen
            gegevens van je.
          </List.Item>
          <List.Item>
            Voor een klacht kun je terecht bij de{' '}
            <Link href="https://www.autoriteitpersoonsgegevens.nl">Autoriteit Persoonsgegevens</Link>.
          </List.Item>
        </List>
      </Page.Cell>
    </Page.Main>
  )
}

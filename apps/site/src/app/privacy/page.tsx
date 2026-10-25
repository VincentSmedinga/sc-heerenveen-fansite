import type { Metadata } from 'next'

import { Heading, Link, Page, Text } from '@fansite/design-system'

import { email } from '../../contact'
import { pageMetadata } from '../../metadata'

// Render on each request: the canonical URL and the Open Graph address come from SITE_ENV,
// which the build doesn't know.
export const dynamic = 'force-dynamic'

export const generateMetadata = (): Metadata => pageMetadata('/privacy', 'Privacy')

const EmailLink = () => (
  <Link href={`mailto:${email}`} icon="envelope">
    {email}
  </Link>
)

// What we do with data, in a few sentences. The footer and Over ons link here.
export default function PrivacyPage() {
  return (
    <Page.Main>
      <Page.Cell>
        <Heading level={1}>Privacy</Heading>
        <Text appearance="intro">
          De site zet geen cookies, volgt niemand en laadt niets van een ander domein. Toch moeten we een paar dingen
          even noemen.
        </Text>
        <Text>
          Onze hosting houdt voor de beveiliging logbestanden bij, met onder meer IP-adressen. We gebruiken ze alleen
          daarvoor, bewaren ze niet langer dan nodig en geven ze aan niemand.
        </Text>
        <Text>
          Kies je Licht of Donker in de footer, dan bewaart je browser die keuze, alleen op dit apparaat. Wij zien hem
          niet. Je haalt hem weg door de knop te kiezen die je systeem al geeft, of door de gegevens van de site in je
          browser te wissen.
        </Text>
        <Text>
          Wie inlogt in het beheer krijgt één cookie. Dat geldt alleen voor de paar mensen van de redactie, nooit voor
          een bezoeker. Het cookie bevat alleen een nummer voor die sessie, niets over jou. Je browser stuurt het alleen
          naar de pagina&apos;s van het beheer. Het werkt hooguit 7 dagen.
        </Text>
        <Text>
          Klik je door naar een medium of naar ons forum, dan verlaat je deze site. Voor wat die sites met je gegevens
          doen, gelden hun eigen regels.
        </Text>
        <Text>
          Stuur je ons een bericht, met het formulier bij <Link href="/contact">Contact</Link> of per mail, dan komt het
          in de mailbox van de redactie. We gebruiken het om te antwoorden en bewaren het tot de zaak is afgehandeld,
          hoogstens een jaar. Het formulier slaat niets op de site zelf op.
        </Text>
        <Text>
          Vragen over je gegevens stel je aan de redactie, via het formulier of op <EmailLink />.
        </Text>
        <Text>
          Voor een klacht kun je terecht bij de{' '}
          <Link href="https://www.autoriteitpersoonsgegevens.nl" icon="external-link">
            Autoriteit Persoonsgegevens
          </Link>
          .
        </Text>
      </Page.Cell>
    </Page.Main>
  )
}

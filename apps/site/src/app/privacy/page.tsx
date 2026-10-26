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
        <Text appearance="intro">De site zet geen cookies, volgt niemand en laadt niets van een ander domein.</Text>
        <Heading level={2}>Wat we tellen</Heading>
        <Text>
          We tellen per dag hoe vaak elke pagina is bekeken en hoeveel verschillende bezoekers er waren. Dat doen we
          zelf, op onze eigen server. Het zijn alleen getallen, en die bewaren we zolang de site bestaat. Er komt niets
          op je apparaat te staan.
        </Text>
        <Text>
          Bots, de controles van onze hosting en onze eigen importer tellen niet mee. Jij ook niet, als je in je browser
          hebt ingesteld dat je niet gevolgd wilt worden (Do Not Track of Global Privacy Control).
        </Text>
        <Heading level={2}>Hoe een bezoeker één keer telt</Heading>
        <Text>
          De server maakt van je IP-adres en je browser een code, met een willekeurig getal dat alleen voor die dag
          bestaat. Het adres en de naam van je browser schrijft hij nergens op, ook niet in het logboek. Tot het einde
          van de dag staan het getal en de codes in onze database. Daarna gooien we ze weg. De volgende dag krijg je een
          andere code, dus we herkennen je niet van dag tot dag.
        </Text>
        <Heading level={2}>Wat de hosting bewaart</Heading>
        <Text>
          Onze hosting houdt voor de beveiliging logbestanden bij, met onder meer IP-adressen. We gebruiken ze alleen
          daarvoor, bewaren ze niet langer dan nodig en geven ze aan niemand.
        </Text>
        <Heading level={2}>Wat je browser bewaart</Heading>
        <Text>
          Kies je Licht of Donker in de footer, dan bewaart je browser die keuze, alleen op dit apparaat. Wij zien hem
          niet. Je haalt hem weg door de gegevens van de site in je browser te wissen.
        </Text>
        <Text>
          Alleen wie inlogt in het beheer, de paar mensen van de redactie, krijgt een cookie. Het bevat een nummer voor
          die sessie, niets over jou, en het werkt hooguit 7 dagen.
        </Text>
        <Heading level={2}>Als je ons een bericht stuurt</Heading>
        <Text>
          Stuur je ons een bericht, met het formulier bij <Link href="/contact">Contact</Link> of per mail, dan komt het
          in de mailbox van de redactie. We gebruiken het om te antwoorden en bewaren het tot de zaak is afgehandeld,
          hoogstens een jaar. Het formulier slaat niets op de site zelf op.
        </Text>
        <Heading level={2}>Andere sites</Heading>
        <Text>
          Klik je door naar een medium of naar ons forum, dan verlaat je deze site. Voor wat die sites met je gegevens
          doen, gelden hun eigen regels.
        </Text>
        <Heading level={2}>Vragen en klachten</Heading>
        <Text>
          Vragen over je gegevens stel je aan de redactie, via het formulier of op <EmailLink />. Voor een klacht kun je
          terecht bij de{' '}
          <Link href="https://www.autoriteitpersoonsgegevens.nl" icon="external-link">
            Autoriteit Persoonsgegevens
          </Link>
          .
        </Text>
      </Page.Cell>
    </Page.Main>
  )
}

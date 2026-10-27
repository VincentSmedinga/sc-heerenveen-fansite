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
          Je bent welkom en we willen zo weinig mogelijk van je weten. De site zet geen cookies, volgt niemand en laadt
          niets van een ander domein.
        </Text>
        <Heading anchor id="tellen" level={2}>
          Wat we tellen
        </Heading>
        <Text>
          We tellen alleen per dag hoe vaak elke pagina is bekeken en hoeveel verschillende bezoekers er ongeveer waren.
          Dat doen we zelf, op onze eigen server.
        </Text>
        <Text>
          Van je IP-adres en je browser maakt de server een code, met een willekeurig getal dat alleen voor die dag
          bestaat. Zo tellen we jou maar één keer per dag. Het adres en de naam van je browser schrijven we nergens op,
          ook niet in het logboek.
        </Text>
        <Text>
          Tot het einde van de dag staan het getal en de codes in onze database. Daarna gooien we ze weg. We bewaren
          alleen de totalen, zolang de site bestaat. De volgende dag krijg je een andere code, dus we herkennen je niet
          van dag tot dag. Het tellen zet niets op je apparaat.
        </Text>
        <Text>
          Bots, de controles van onze hosting en ons eigen programma dat de koppen ophaalt tellen niet mee. Jij ook
          niet, als je hebt ingesteld dat je niet gevolgd wilt worden (de instelling Do Not Track of Global Privacy
          Control).
        </Text>
        <Heading anchor id="hosting" level={2}>
          Wat de hosting bewaart
        </Heading>
        <Text>
          Onze hosting houdt voor de beveiliging logbestanden bij, met onder meer IP-adressen. Wij kunnen daar niet bij
          en gebruiken ze niet.
        </Text>
        <Heading anchor id="cookies" level={2}>
          Wat je browser bewaart
        </Heading>
        <Text>
          Kies je met de knop bovenaan een licht of donker thema, dan bewaart je browser die keuze, alleen op dit
          apparaat. Wij zien dat niet. Wis de gegevens van de site in je browser om hem weg te halen.
        </Text>
        <Text>
          Alleen een redacteur die inlogt in het beheer krijgt een cookie. Het bevat een nummer voor die sessie, niets
          over jou, en het werkt hooguit 7 dagen.
        </Text>
        <Heading anchor id="berichten" level={2}>
          Als je ons een bericht stuurt
        </Heading>
        <Text>
          Stuur je ons een bericht, met het formulier bij <Link href="/contact">Contact</Link> of per mail, dan komt het
          in de mailbox van de redactie. We gebruiken het om te antwoorden en bewaren het tot de zaak is afgehandeld,
          hoogstens een jaar. Het formulier slaat niets op de site zelf op.
        </Text>
        <Heading anchor id="andere-sites" level={2}>
          Andere sites
        </Heading>
        <Text>
          Klik je door naar een medium of naar ons forum, dan verlaat je deze site. Voor wat die sites met je gegevens
          doen, gelden hun eigen regels.
        </Text>
        <Heading anchor id="vragen" level={2}>
          Vragen en klachten
        </Heading>
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

import type { Metadata } from 'next'

import { Heading, Link, Page, Text } from '@fansite/design-system'
import { isFansPartOn } from '@fansite/shared/fans-env'

import { email } from '#src/contact'
import { pageMetadata } from '#src/metadata'

// Render on each request: the canonical URL and the Open Graph address come from SITE_ENV,
// which the build doesn't know.
export const dynamic = 'force-dynamic'

export const generateMetadata = (): Metadata => pageMetadata('/privacy', 'Privacy')

const EmailLink = () => (
  <Link href={`mailto:${email}`} icon="envelope">
    {email}
  </Link>
)

/** The part about accounts of supporters (#1456). */
const AccountSection = ({ reminder }: { reminder: boolean }) => (
  <>
    <Heading anchor id="account" level={2}>
      Als je een account maakt
    </Heading>
    <Text>
      Met een account bewaren we je schermnaam, je e-mailadres en wat je in de spellen invult. Ook bewaren we de dag
      waarop je het account maakte en de dag van je laatste bezoek. Je keuzes staan erbij: of je naam in de standen
      staat, of je een herinnering per e-mail wilt, en wanneer je je schermnaam voor het laatst veranderde. Je
      schermnaam is voor de standen. Je e-mailadres is om in te loggen. Alleen de eigenaar van de site kan het zien, en
      we gebruiken het nergens anders voor dan voor de berichten hieronder. De dag van je laatste bezoek gebruiken we om
      accounts te vinden die niemand meer gebruikt.
    </Text>
    <Text>
      We bewaren geen IP-adres, geen gegevens over je browser, geen echte naam, geboortedatum of woonplaats, en geen
      wachtwoord. Je logt in met een link of een code die we mailen. Om te voorkomen dat iemand een mailbox volstuurt,
      onthouden we een kwartier lang een code van je adres. Het adres zelf zit er niet in.
    </Text>
    <Text>
      Andere fans zien je schermnaam en je punten in de standen, tenzij je dat uitzet. Verder tonen we alleen cijfers
      van alle fans samen, zonder namen. Een account is een profiel dat je zelf maakt. Wij bouwen er geen over je en
      voegen het met niets samen.
    </Text>
    <Text>
      We bewaren je account tot je het opheft. Gebruik je het twee jaar niet, dan sturen we één bericht, en het account
      verdwijnt 30 dagen later. Log je in die 30 dagen in, dan blijft het. Je blijft ingelogd tot 90 dagen na je laatste
      bezoek, en hoogstens een jaar. Een link of een code uit een mail werkt 15 minuten. Een aanmelding die je niet
      bevestigt, gooien we daarna weg.
    </Text>
    <Text>
      Op <Link href="/fans/mijn-account">Mijn account</Link> zie je alles wat we van je bewaren, en kun je het account
      opheffen. Dan verdwijnen je schermnaam en je e-mailadres, en je sessies en links. Wat je in de spellen invulde,
      blijft zonder naam meetellen in de cijfers van alle fans. Wil je ook dat niet, vraag het dan de redactie voordat
      je opheft.
    </Text>
    <Text>
      Blokkeert de redactie een account, dan zie je dat op Mijn account, met de reden. Verdwijnt zo'n account, dan
      bewaren we 12 maanden een code van het e-mailadres. Daarmee weigeren we alleen dat hetzelfde adres opnieuw een
      account maakt. Na 12 maanden telt die code niet meer en ruimen we hem op. Het adres zelf bewaren we niet.
    </Text>
    <Text>
      We mailen je alleen om in te loggen, bij een wijziging van je account, één keer als je account twee jaar niet is
      gebruikt, en voor wat je zelf aanzet.
    </Text>
    {reminder ? (
      <Text>
        Dat laatste is de herinnering voor de Prognose. Zet je die aan op Mijn account, dan mailen we je de dag voor een
        wedstrijd, als je nog niet hebt voorspeld. In elk bericht staat een link om de herinnering zonder inloggen uit
        te zetten. Om te zorgen dat er niets dubbel gaat, bewaren we per wedstrijd dat we je het bericht stuurden. Daar
        staat geen adres bij. Het verdwijnt met je account, en een maand na de wedstrijd.
      </Text>
    ) : null}
  </>
)

// What we do with data, in a few sentences. The footer and Over ons link here.
export default function PrivacyPage() {
  // The text about accounts is there only while accounts are on (issue 1456).
  const accounts = isFansPartOn('accounts')

  return (
    <Page.Main>
      <Page.Cell>
        <Heading level={1}>Privacy</Heading>
        <Text appearance="intro">
          Je bent welkom en we willen zo weinig mogelijk van je weten. De site zet geen cookies
          {accounts ? ', tenzij je inlogt' : ''}, volgt niemand en laadt niets van een ander domein.
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
          {accounts ? 'Een' : 'Alleen een'} redacteur die inlogt in het beheer krijgt een cookie. Het bevat een nummer
          voor die sessie, niets over jou, en het werkt hooguit 14 dagen, en 9 dagen zonder gebruik. Daarnaast bewaart
          de browser van die redacteur een teken dat zegt: hier is iemand ingelogd. Het hoofdmenu toont dan een
          koppeling naar het beheer. Het teken bevat geen gegevens, gaat nergens heen en verandert alleen dat menu, net
          als de themakeuze. Wie een verslag invult, bewaart ook de invoer van dat formulier op dit apparaat, tot het
          verslag is opgeslagen, hij uitlogt of er dertig dagen voorbij zijn. Die invoer gaat nergens heen.
        </Text>
        {accounts ? (
          <Text>
            Een fan die inlogt, krijgt ook een cookie. Het bevat een nummer voor die sessie, niets over jou. Je browser
            stuurt het alleen naar pagina&apos;s onder /fans. Het werkt tot 90 dagen na je laatste bezoek, en hoogstens
            een jaar na het inloggen. Daarnaast bewaart je browser een teken met je schermnaam, zodat de kop op elke
            pagina je initialen toont. Dat teken gaat nergens heen. Een cookiemelding vragen we niet: dit cookie is
            nodig voor iets waar je zelf om vraagt, en het volgt niemand.
          </Text>
        ) : null}
        {accounts ? <AccountSection reminder={isFansPartOn('prognose')} /> : null}
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

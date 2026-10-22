import type { Metadata } from 'next'

import { Heading, Link, Text } from '@fansite/design-system'

export const metadata: Metadata = {
  title: 'Over ons',
}

const email = 'fansite@heerenveen.org'

const EmailLink = () => <Link href={`mailto:${email}`}>{email}</Link>

// Who we are, how we work and what we do with data, each in a few sentences. The footer links to the privacy section by
// its id, so the id stays the same.
export default function AboutPage() {
  return (
    <>
      <Heading level={1}>Over ons</Heading>
      <Heading level={2}>Wie we zijn</Heading>
      <Text>
        De sc Heerenveen Fansite is een site van supporters, voor supporters. We zetten de koppen van de media over sc
        Heerenveen op één plek, met een link naar het hele verhaal. We schrijven niks over en we passen niks aan. We
        hebben geen advertenties, geen abonnementen en geen winstoogmerk. Bij de site hoort ook{' '}
        <Link href="https://forum.heerenveen.org">ons forum</Link>, waar supporters met elkaar praten.
      </Text>
      <Text>
        Vincent Smedinga begon de site in 1997, als SC Heerenveen Online. De laatste versie liep tot 2006, en in 2026 is
        de site terug.
      </Text>
      <Heading level={2}>Hoe we werken</Heading>
      <Text>
        Van elk bericht tonen we de kop, de link en de naam van de bron. Een intro of een foto alleen als de bron ons
        daar toestemming voor geeft. Welke media we volgen, lees je bij <Link href="/bronnen">Onze bronnen</Link>.
      </Text>
      <Text>
        Ben je uitgever en wil je dat we iets weghalen? Mail dan naar <EmailLink />. We pakken je verzoek zo snel
        mogelijk op.
      </Text>
      <Heading id="privacy" level={2}>
        Privacy
      </Heading>
      <Text>De site zet geen cookies, volgt niemand en laadt niets van een ander domein.</Text>
      <Text>
        Onze hosting houdt logbestanden bij met onder meer IP-adressen, voor de beveiliging. We gebruiken ze alleen
        daarvoor en geven ze aan niemand. De hosting bewaart ze niet langer dan nodig. Mail je ons, dan gebruiken we je
        mail alleen om te antwoorden.
      </Text>
      <Text>
        Vragen over je gegevens, zoals inzage of verwijdering, stel je aan de redactie van de sc Heerenveen Fansite:{' '}
        <EmailLink />. Maar ons antwoord zal zijn: we hebben geen gegevens van je. Ben je het daar niet mee eens, dan
        kun je klagen bij de <Link href="https://www.autoriteitpersoonsgegevens.nl">Autoriteit Persoonsgegevens</Link>.
      </Text>
    </>
  )
}

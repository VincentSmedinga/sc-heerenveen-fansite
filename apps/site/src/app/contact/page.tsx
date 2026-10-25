import type { Metadata } from 'next'

import { Heading, Link, Page, Text } from '@fansite/design-system'

import { pageMetadata } from '../../metadata'
import { ContactForm } from './ContactForm'

// Render on each request: the canonical URL and the Open Graph address come from SITE_ENV, which the build doesn't know.
export const dynamic = 'force-dynamic'

export const generateMetadata = (): Metadata => pageMetadata('/contact', 'Contact')

// The form to write to the editors, for visitors, publishers and journalists. Nothing is stored: the message is mailed.
export default function ContactPage() {
  return (
    <Page.Main>
      <Page.Cell>
        <Heading level={1}>Contact</Heading>
        <Text appearance="intro">
          Heb je een vraag, zie je een fout of wil je dat we een bericht weghalen? Vul het formulier in, dan lezen de
          vrijwilligers van de redactie het en antwoorden ze je per mail.
        </Text>
        <Text>
          Wat we met je gegevens doen, lees je bij <Link href="/privacy">Privacy</Link>.
        </Text>
        <ContactForm />
      </Page.Cell>
    </Page.Main>
  )
}

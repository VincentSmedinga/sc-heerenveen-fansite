import type { Metadata } from 'next'

import { Heading, Text } from '@fansite/design-system'

export const metadata: Metadata = {
  title: 'Pagina niet gevonden',
}

// Replaces the English 404 page of Next.js, so all text on the site is Dutch.
export default function NotFound() {
  return (
    <>
      <Heading level={1}>Pagina niet gevonden</Heading>
      <Text>Deze pagina bestaat niet.</Text>
    </>
  )
}

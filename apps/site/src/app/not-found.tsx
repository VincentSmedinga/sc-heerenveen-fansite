import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pagina niet gevonden',
}

// Replaces the English 404 page of Next.js, so all text on the site is Dutch.
export default function NotFound() {
  return (
    <main>
      <h1>Pagina niet gevonden</h1>
      <p>Deze pagina bestaat niet.</p>
    </main>
  )
}

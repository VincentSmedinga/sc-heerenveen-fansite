import { useState } from 'react'

import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Button } from '../button/Button'
import { Notice } from './Notice'

const meta = preview.meta({
  argTypes: {
    children: { control: 'text', description: 'De tekst van de melding, zonder kop.' },
  },
  component: Notice,
  parameters: {
    docs: {
      description: {
        component: [
          'Een melding na een actie, zoals "Opgeslagen." Het is een blok met alleen tekst en `role="status"`, zonder kop, zodat elke melding de opzet van de pagina met rust laat.',
          'Een schermlezer leest de tekst voor die in de melding komt, zonder de focus te verplaatsen, maar alleen als de melding al op de pagina stond.',
          'Zet een melding na een actie daarom eerst leeg op de pagina en vul hem als de actie klaar is. Een lege melding laat niets zien.',
          'Een melding die al gevuld op de pagina staat als hij laadt, wordt op zijn plek gelezen, zoals andere tekst.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Weergave/Notice',
})

export const Default = meta.story({
  args: { children: 'Opgeslagen. Je invoer staat nu op de site.' },
  name: 'Melding',
})

export const OnThePage = meta.story({
  name: 'Al op de pagina, na het opslaan van een formulier',
  render: () => (
    <div style={{ display: 'grid', gap: '1rem', maxInlineSize: '40rem' }}>
      <Notice>Opgeslagen. Je invoer staat nu op de site.</Notice>
      <p style={{ margin: 0 }}>Hier staat de rest van de pagina.</p>
    </div>
  ),
})

const AfterAction = () => {
  const [saved, setSaved] = useState(false)

  return (
    <div style={{ display: 'grid', gap: '1rem', maxInlineSize: '40rem' }}>
      <div>
        <Button onClick={() => setSaved(true)} type="button">
          Opslaan
        </Button>
      </div>
      <Notice>{saved ? 'Opgeslagen. Je invoer staat nu op de site.' : ''}</Notice>
    </div>
  )
}

export const AfterAnAction = meta.story({
  name: 'Pas na een actie',
  parameters: {
    docs: {
      description: {
        story:
          'De melding staat al leeg op de pagina en krijgt zijn tekst als de actie klaar is. Een schermlezer leest hem dan voor.',
      },
    },
  },
  render: () => <AfterAction />,
})

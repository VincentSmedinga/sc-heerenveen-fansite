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
          'Een schermlezer leest de tekst voor als hij verschijnt, zonder de focus te verplaatsen.',
          'Een melding die al op de pagina staat als hij laadt, wordt niet als status voorgelezen maar op zijn plek gelezen, zoals andere tekst.',
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
      {saved ? <Notice>Opgeslagen. Je invoer staat nu op de site.</Notice> : null}
    </div>
  )
}

export const AfterAnAction = meta.story({
  name: 'Pas na een actie',
  parameters: {
    docs: {
      description: {
        story: 'De melding komt in de pagina als de actie klaar is. Een schermlezer leest hem dan voor.',
      },
    },
  },
  render: () => <AfterAction />,
})

import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Button } from '../button/Button'
import { Disclosure } from './Disclosure'

const meta = preview.meta({
  argTypes: {
    children: { control: false, description: 'Wat er achter de samenvatting zit.' },
    open: { control: 'boolean', description: 'Of het blok open is.' },
    summary: {
      control: 'text',
      description: 'De regel die het blok opent en sluit. Hij zegt wat erachter zit.',
    },
    value: { control: 'text', description: 'Wat er binnen gekozen is, rechts naast de samenvatting.' },
  },
  component: Disclosure,
  parameters: {
    docs: {
      description: {
        component: [
          'Een blok dat open- en dichtklapt, voor wat de meeste bezoekers niet nodig hebben, zoals een actie die je niet snel doet.',
          'Het is een `details` met een samenvatting, dus het werkt zonder JavaScript en met het toetsenbord.',
          'De samenvatting zegt wat erachter zit.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Weergave/Disclosure',
})

const content = (
  <>
    <p>Dit zet wat de redactie invulde terug naar wat er stond voor de eerste invoer.</p>
    <div>
      <Button appearance="danger" type="button">
        Invoer weghalen
      </Button>
    </div>
  </>
)

export const Default = meta.story({
  args: { children: content, summary: 'Invoer weghalen' },
  name: 'Dicht',
})

export const Open = meta.story({
  args: { children: content, open: true, summary: 'Invoer weghalen' },
  name: 'Open',
})

export const WithValue = meta.story({
  args: { children: content, summary: 'Tegenstander', value: 'Ajax' },
  name: 'Met een keuze',
})

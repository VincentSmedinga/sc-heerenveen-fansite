import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Switch } from './Switch'

const meta = preview.meta({
  args: { checked: true, label: 'Ververs automatisch', onChange: () => undefined },
  argTypes: {
    checked: { control: 'boolean', description: 'Of de schakelaar aan staat. De pagina houdt dit bij.' },
    label: { control: 'text', description: 'Wat de schakelaar bedient, als toestand die aan staat.' },
  },
  component: Switch,
  parameters: {
    docs: {
      description: {
        component:
          'Een schakelaar zet één ding meteen aan of uit, zoals het automatisch verversen van een pagina. Een schermlezer zegt "aan" of "uit".',
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Formulier/Switch',
})

export const On = meta.story({ name: 'Aan' })

export const Off = meta.story({ args: { checked: false }, name: 'Uit' })

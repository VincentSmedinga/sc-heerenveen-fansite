import preview from '#.storybook/preview'

import { Button } from './Button'

const meta = preview.meta({
  component: Button,
  parameters: {
    docs: {
      description: {
        component: [
          'Een knop. De tekst zegt wat de knop doet, zoals "Versturen", ook als je alleen de knop hoort.',
          '',
          'Met `type` kies je wat de knop doet. Je moet het altijd kiezen:',
          '',
          '- `submit`: verstuurt het formulier.',
          '- `button`: doet niets in het formulier. Hij is voor een actie met JavaScript.',
          '- `reset`: zet het formulier terug.',
          '',
          'Een knop is groot genoeg om met een vinger te raken.',
          'In de modus met geforceerde kleuren van het besturingssysteem krijgt hij de rand van het systeem.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Button',
})

const render = () => <Button type="button">Versturen</Button>

export const Light = meta.story({ globals: { theme: 'light' }, name: 'Licht', render })

export const Dark = meta.story({ globals: { theme: 'dark' }, name: 'Donker', render })

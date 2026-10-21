import preview from '#.storybook/preview'

import { Text } from '../text/Text'
import { Link } from './Link'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'Een link.',
          'Een link is altijd onderstreept; onder de muis wordt de lijn dikker.',
          'Een bezochte link krijgt een getint grijs, zodat je ziet wat je al hebt gelezen.',
          '',
          '`href` is verplicht: een link zonder bestemming is geen link.',
          'De tekst zegt waar de link heen gaat, ook los van de zin eromheen; dus geen "lees meer" of "klik hier".',
          'Bij een nieuwsbericht is de kop de link.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Link',
})

const render = () => (
  <Text style={{ maxInlineSize: '40rem' }}>
    Lees het hele verslag bij <Link href="#verslag-omrop-fryslan">Omrop Fryslân</Link> of bekijk de samenvatting bij{' '}
    <Link href="#samenvatting-eredivisie">de eredivisie</Link>.
  </Text>
)

export const Light = meta.story({ globals: { theme: 'light' }, name: 'Licht', render })

export const Dark = meta.story({ globals: { theme: 'dark' }, name: 'Donker', render })

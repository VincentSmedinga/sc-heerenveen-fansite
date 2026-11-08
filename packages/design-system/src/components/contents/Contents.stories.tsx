import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Text } from '../text/Text'
import { Contents } from './Contents'

const meta = preview.meta({
  component: Contents,
  parameters: {
    docs: {
      description: {
        component:
          'Een omhulsel zonder eigen vorm: wat erin staat, doet mee in de opmaak alsof het omhulsel er niet is. Je kiest het als een script één element nodig heeft om een deel van de pagina te vinden.',
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Pagina/Contents',
})

export const Default = meta.story({
  name: 'Omhulsel',
  render: () => (
    <Contents data-live-region="voorbeeld">
      <Text>De tekst staat op zijn plaats, alsof er geen omhulsel omheen zit.</Text>
    </Contents>
  ),
})

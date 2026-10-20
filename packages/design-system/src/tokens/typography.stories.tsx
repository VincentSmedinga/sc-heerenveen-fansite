import preview from '#.storybook/preview'

import { FontSpecimens, TypeStyles } from '../docs/TypeDocs'

const meta = preview.meta({
  title: 'Tokens/Typografie',
})

export const Styles = meta.story({
  name: 'Stijlen',
  render: () => <TypeStyles />,
})

export const Fonts = meta.story({
  name: 'Lettertypes',
  render: () => <FontSpecimens />,
})

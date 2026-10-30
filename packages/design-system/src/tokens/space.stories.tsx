import preview from '#.storybook/preview'

import { SpaceSteps } from '../docs/SpaceDocs'

const meta = preview.meta({
  title: 'Tokens/Ruimte',
})

export const Steps = meta.story({
  name: 'Stappen',
  render: () => <SpaceSteps />,
})

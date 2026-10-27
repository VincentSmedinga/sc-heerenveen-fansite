import preview from '#.storybook/preview'

import {
  AppearExample,
  DirectExample,
  MotionChangeTable,
  MotionGroupTable,
  MotionTokenTable,
  PageExample,
  PointExample,
  SelectExample,
} from '../docs/MotionDocs'

const meta = preview.meta({
  title: 'Tokens/Beweging',
})

export const Tokens = meta.story({
  name: 'Tokens',
  render: () => <MotionTokenTable />,
})

export const Groups = meta.story({
  name: 'Groepen',
  render: () => <MotionGroupTable />,
})

export const Point = meta.story({
  name: 'Aanwijzen',
  render: () => <PointExample />,
})

export const Select = meta.story({
  name: 'Ingedrukt en geselecteerd',
  render: () => <SelectExample />,
})

export const Appear = meta.story({
  name: 'Verschijnen en verdwijnen',
  render: () => <AppearExample />,
})

export const Page = meta.story({
  name: 'De hele pagina',
  render: () => <PageExample />,
})

export const Direct = meta.story({
  name: 'Zonder overgang',
  render: () => <DirectExample />,
})

export const List = meta.story({
  name: 'Alle toestandswisselingen',
  render: () => <MotionChangeTable />,
})

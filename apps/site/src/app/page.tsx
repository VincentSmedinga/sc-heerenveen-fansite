import { Heading, Link, Text } from '@fansite/design-system'

export default function HomePage() {
  return (
    <>
      <Heading level={1}>sc Heerenveen Fansite</Heading>
      <Text>Binnenkort meer.</Text>
      <Text>
        Welke media we volgen, lees je bij <Link href="/bronnen">Onze bronnen</Link>.
      </Text>
    </>
  )
}

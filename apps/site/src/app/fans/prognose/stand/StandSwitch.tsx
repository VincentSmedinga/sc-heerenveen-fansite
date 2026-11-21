'use client'

import { Link, SegmentedControl, Strong, Text } from '@fansite/design-system'
import { useRouter } from 'next/navigation'
import { Fragment, useSyncExternalStore } from 'react'

export type StandView = 'match' | 'season'

const options = [
  { label: 'Seizoen', value: 'season' },
  { label: 'Per wedstrijd', value: 'match' },
] as const

/**
 * The choice between the ranking of a season and of one match, above the table. With script it
 * is a SegmentedControl that goes to the address of the choice; without script, and on the
 * server, it is two plain links to the same addresses, so the choice works either way.
 */
export function StandSwitch({ addresses, view }: { addresses: Record<StandView, string>; view: StandView }) {
  const router = useRouter()
  const live = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  )

  if (!live) {
    return (
      <Text aria-label="Weergave van de stand" role="group">
        {options.map((option, index) => (
          <Fragment key={option.value}>
            {index === 0 ? null : ' · '}
            {option.value === view ? (
              <Strong aria-current="page">{option.label}</Strong>
            ) : (
              <Link href={addresses[option.value]}>{option.label}</Link>
            )}
          </Fragment>
        ))}
      </Text>
    )
  }

  return (
    <SegmentedControl
      label="Weergave van de stand"
      onChange={(value) => {
        if (value !== view) {
          router.push(addresses[value])
        }
      }}
      options={options}
      size="small"
      value={view}
    />
  )
}

import { type ItemGroup, notOnSiteValue } from '#src/beheer/items'

/** What the list shows: the group, the box for what editors hid, and the search. */
export type ListView = {
  editorsOnly: boolean
  group: ItemGroup
  search: string
}

/**
 * The address of the list of items, with what it shows (`q`, `toon` for the group that is not
 * on the site and `redactie` for what editors hid) and what the last action left to say
 * (`fout`, `bericht`, `verborgen`, `getoond`, `opgenomen` or `teruggezet`). The group on the
 * site has no `toon`, and
 * `redactie` is only there under the group that is not.
 */
export function itemsPath({ editorsOnly, group, search }: ListView, extra: Record<string, number | string> = {}) {
  const parameters = new URLSearchParams()

  if (search !== '') {
    parameters.set('q', search)
  }

  if (group === 'not-on-site') {
    parameters.set('toon', notOnSiteValue)

    if (editorsOnly) {
      parameters.set('redactie', '1')
    }
  }

  for (const [name, value] of Object.entries(extra)) {
    parameters.set(name, String(value))
  }

  const query = parameters.toString()

  return query === '' ? '/beheer/berichten' : `/beheer/berichten?${query}`
}

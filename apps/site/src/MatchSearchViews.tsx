import type { SearchableMatch } from '@fansite/db/match-search'

import {
  Button,
  CheckboxGroup,
  Chip,
  ChipList,
  Disclosure,
  Field,
  FieldGroup,
  FilterCard,
  Form,
  Heading,
  Input,
  Link,
  List,
  OutcomeLine,
  Page,
  Pagination,
  Select,
  Strong,
  Text,
} from '@fansite/design-system'

import {
  clubsOf,
  type Filters,
  matchCount,
  matchSearchPath,
  maxSearchGoals,
  searchHref,
  type SearchView,
  tallyLine,
} from './match-search'
import { MatchLegend, MatchLine } from './MatchViews'
import { opponentsPath } from './opponents'

/** The id of the form. */
const formId = 'wedstrijden-zoeken'

/** The id of the heading with the number of matches, where a search ends up. */
export const searchResultsId = 'resultaten'

/** A number with a point for the thousands, such as `1.385`. */
export const formatCount = (count: number) => new Intl.NumberFormat('nl-NL').format(count)

/**
 * The filters of the search as a form: one plain `GET` form, so every choice is in the address
 * and the page works without JavaScript. On a narrow screen the card is a disclosure that is
 * open without a search and closed with one. A value that gives no match is not in the list,
 * unless it is chosen; every value has the number of matches you get by adding it.
 */
export function MatchSearchFilters({
  allClubs,
  filters,
  seasons,
  view,
}: {
  allClubs: number
  filters: Filters
  seasons: readonly string[]
  view: SearchView
}) {
  const chosenCount = view.chips.length
  const moreOpen =
    filters.scorer !== undefined ||
    filters.scorerError !== undefined ||
    filters.ours !== undefined ||
    filters.theirs !== undefined

  return (
    <FilterCard collapsed={view.chosen} summary={chosenCount === 0 ? 'Filters' : `Filters · ${chosenCount} gekozen`}>
      <Form action={`${matchSearchPath}#${searchResultsId}`} aria-label="Wedstrijden zoeken" id={formId} method="get">
        <Field
          hideOptional
          hint={`${formatCount(allClubs)} clubs, op naam. Typ de eerste letters om te springen.`}
          id="tegenstander"
          label="Tegenstander"
          required={false}
        >
          <Select defaultValue={filters.club ?? ''} name="tegen">
            <Select.Option value="">Elke club</Select.Option>
            {view.clubs.map((club) => (
              <Select.Option key={club.slug} value={club.slug}>{`${club.name} (${club.count})`}</Select.Option>
            ))}
          </Select>
        </Field>
        <FieldGroup legend="Seizoenen" separator="–">
          <Field hideOptional id="van" label="Van" required={false}>
            <Select defaultValue={filters.from ?? seasons[0] ?? ''} name="van">
              {seasons.map((season) => (
                <Select.Option key={season} value={season}>
                  {season}
                </Select.Option>
              ))}
            </Select>
          </Field>
          <Field hideOptional id="tot" label="Tot" required={false}>
            <Select defaultValue={filters.to ?? seasons.at(-1) ?? ''} name="tot">
              {seasons.map((season) => (
                <Select.Option key={season} value={season}>
                  {season}
                </Select.Option>
              ))}
            </Select>
          </Field>
        </FieldGroup>
        <CheckboxGroup legend="Thuis of uit" name="waar" options={view.venues.map(optionOf)} value={filters.venues} />
        <CheckboxGroup
          legend="Competitie"
          name="competitie"
          options={view.competitions.map(optionOf)}
          value={filters.competitions}
        />
        <CheckboxGroup legend="Uitslag" name="uitslag" options={view.outcomes.map(optionOf)} value={filters.outcomes} />
        <CheckboxGroup legend="Dag" name="dag" options={view.days.map(optionOf)} value={filters.days} />
        <Disclosure open={moreOpen} summary="Meer filters">
          <Field
            error={filters.scorerError?.message}
            hideOptional
            hint="Een speler die een doelpunt maakte, ook onder zijn oude naam."
            id="doelpuntenmaker"
            label="Doelpuntenmaker"
            required={false}
          >
            <Input
              autoComplete="off"
              autoCorrect="off"
              defaultValue={filters.scorer?.text ?? filters.scorerError?.text ?? ''}
              maxLength={60}
              name="doelpuntenmaker"
              type="search"
            />
          </Field>
          <FieldGroup legend="Exacte uitslag" separator="–">
            <Field hideOptional id="wij" label="Wij" required={false}>
              <Input
                defaultValue={filters.ours ?? ''}
                inputMode="numeric"
                max={maxSearchGoals}
                min={0}
                name="wij"
                type="number"
                width="narrow"
              />
            </Field>
            <Field hideOptional id="zij" label="Zij" required={false}>
              <Input
                defaultValue={filters.theirs ?? ''}
                inputMode="numeric"
                max={maxSearchGoals}
                min={0}
                name="zij"
                type="number"
                width="narrow"
              />
            </Field>
          </FieldGroup>
        </Disclosure>
        {filters.order === 'oudste' && <Input name="volgorde" type="hidden" value="oudste" />}
        <Form.Buttons>
          <Button type="submit">Toon wedstrijden</Button>
          <Link href={matchSearchPath}>Wis alles</Link>
        </Form.Buttons>
      </Form>
    </FilterCard>
  )
}

const optionOf = ({ count, label, value }: { count: number; label: string; value: string }) => ({ count, label, value })

/**
 * The results of a search: the number, the search as a sentence, a chip for each choice that
 * takes it away, the record in one line, the matches by season and the pages. A search that
 * finds nothing says so and offers each way to leave one choice out.
 */
export function MatchSearchResults({
  filters,
  now,
  reportAddresses,
  view,
}: {
  filters: Filters
  now: Date
  reportAddresses: ReadonlyMap<string, string>
  view: SearchView
}) {
  const { result } = view
  const club = view.chips.length > 0 && filters.club !== undefined ? filters.club : undefined
  const clubName = club === undefined ? undefined : view.chips[0]?.label

  return (
    <Page.Cell aria-labelledby={searchResultsId} role="region">
      <Heading id={searchResultsId} level={2}>
        {result.total === 0 ? 'Geen wedstrijden' : matchCount(result.total)}
      </Heading>
      <Text>{view.sentence}</Text>
      {view.chips.length > 0 && (
        <ChipList label="Gekozen filters">
          {view.chips.map((chip) => (
            <Chip href={searchHref(chip.without)} key={chip.label}>
              {chip.label}
            </Chip>
          ))}
        </ChipList>
      )}
      {result.total === 0 ? (
        <>
          <Text>Er is geen wedstrijd die bij al deze keuzes past.</Text>
          {view.relaxed.length > 0 && (
            <>
              <Text>
                <Strong>Laat één keuze weg:</Strong>
              </Text>
              <List role="list">
                {view.relaxed.map((choice) => (
                  <List.Item key={choice.href}>
                    <Link href={choice.href}>{`Zonder ${choice.label}`}</Link>
                    {` · ${matchCount(choice.count)}`}
                  </List.Item>
                ))}
              </List>
            </>
          )}
        </>
      ) : (
        <>
          <OutcomeLine draws={result.tally.drawn} losses={result.tally.lost} wins={result.tally.won}>
            {tallyLine(result.tally)}
          </OutcomeLine>
          {club !== undefined && clubName !== undefined && (
            <Text>
              <Link href={`${opponentsPath}/${club}`}>{`Alles over ${clubName} bij Tegenstanders`}</Link>
            </Text>
          )}
          {result.seasons.map((group) => (
            <Page.Cell key={group.season}>
              <Heading level={3}>{group.season}</Heading>
              <List role="list">
                {group.matches.map((match) => (
                  <List.Item key={match.id}>
                    <MatchLine
                      match={matchOf(match)}
                      now={now}
                      reportHref={reportAddresses.get(`${match.competition}|${match.round}`)}
                      withYear
                    />
                  </List.Item>
                ))}
              </List>
            </Page.Cell>
          ))}
          <MatchLegend matches={result.seasons.flatMap((group) => group.matches.map(matchOf))} />
          {result.pageCount > 1 && (
            <Pagination
              current={result.page}
              label="Paginering van de wedstrijden"
              nextHref={result.page < result.pageCount ? searchHref(filters, { page: result.page + 1 }) : undefined}
              previousHref={result.page > 1 ? searchHref(filters, { page: result.page - 1 }) : undefined}
              total={result.pageCount}
            />
          )}
        </>
      )}
    </Page.Cell>
  )
}

/** A match of the search as the line of a list of matches wants it: without goals to show. */
const matchOf = (match: SearchableMatch) => ({ ...match, goals: [] })

/** The number of clubs in the list, for the tip at the field. */
export const clubCountOf = (matches: readonly SearchableMatch[]) => clubsOf(matches).length

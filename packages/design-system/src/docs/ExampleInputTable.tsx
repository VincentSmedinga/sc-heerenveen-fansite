import {
  InputTable,
  type InputTableColumn,
  type InputTableProps,
  type InputTableRow,
} from '../components/input-table/InputTable'
import { Input } from '../components/input/Input'
import { RadioGroup } from '../components/radio-group/RadioGroup'
import { Select } from '../components/select/Select'

/** The columns of the example: minute, added time and kind of goal, then team and player. */
export const exampleColumns: InputTableColumn[] = [
  { name: 'Minuut', width: 'narrow' },
  { hideOptional: true, name: 'Blessuretijd', required: false, width: 'narrow' },
  { name: 'Soort', width: 'natural' },
  { line: 2, name: 'Team', width: 'natural' },
  { line: 2, name: 'Speler' },
]

// Made-up goals of a made-up match.
const goals = [
  { kind: 'gewoon', minute: '23', player: 'Sem de Vries', team: 'thuis' },
  { kind: 'strafschop', minute: '58', player: 'Pim Bakker', team: 'thuis' },
  { kind: 'gewoon', minute: '90', player: '', team: 'uit' },
] as const

const goalRow = (goal: (typeof goals)[number], index: number, errors: boolean): InputTableRow => {
  const number = index + 1

  return {
    fields: [
      {
        control: <Input defaultValue={goal.minute} inputMode="numeric" name={`minuut-${number}`} />,
        id: `minuut-${number}`,
      },
      {
        control: <Input inputMode="numeric" name={`blessuretijd-${number}`} />,
        id: `blessuretijd-${number}`,
      },
      {
        control: (
          <Select defaultValue={goal.kind} name={`soort-${number}`} width="natural">
            <Select.Option value="gewoon">Gewoon</Select.Option>
            <Select.Option value="strafschop">Strafschop</Select.Option>
            <Select.Option value="eigen">Eigen doelpunt</Select.Option>
          </Select>
        ),
        id: `soort-${number}`,
      },
      {
        group: (legend) => (
          <RadioGroup
            id={`team-${number}`}
            legend={legend}
            name={`team-${number}`}
            options={[
              { label: 'Testclub', value: 'thuis' },
              { label: 'FC Voorbeeld', value: 'uit' },
            ]}
            value={goal.team}
          />
        ),
        id: `team-${number}`,
      },
      {
        control: <Input defaultValue={goal.player} name={`speler-${number}`} />,
        error: errors && goal.player === '' ? 'Vul de naam van de speler in.' : undefined,
        id: `speler-${number}`,
      },
    ],
    header: `Doelpunt ${number}`,
    mark: String(number),
    remove: { name: 'actie', value: `weghalen-${number}` },
  }
}

/** The goals of a made-up match, as the table to fill in holds them. */
export const exampleGoals = (errors = false): InputTableRow[] =>
  goals.map((goal, index) => goalRow(goal, index, errors))

/** A table to fill in with three goals: the example of the InputTable and of a wide page. */
export const ExampleInputTable = ({ rows = exampleGoals(), ...props }: Partial<InputTableProps>) => (
  <InputTable
    add={{ label: 'Doelpunt toevoegen', name: 'actie', value: 'toevoegen' }}
    caption="Doelpunten"
    columns={exampleColumns}
    rows={rows}
    {...props}
  />
)

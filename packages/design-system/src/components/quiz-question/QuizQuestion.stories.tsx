import { expect, userEvent } from 'storybook/test'

import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { QuizQuestion, type QuizQuestionProps } from './QuizQuestion'

const meta = preview.meta({
  argTypes: {
    answers: { description: 'De vier antwoorden, in de volgorde waarin ze staan.' },
    error: { description: 'Wat er mis is met het antwoord, en hoe je het goed maakt. Zonder `error` is er geen fout.' },
    id: {
      description:
        'De `id` van de vraag. Het is de `id` van het eerste keuzerondje, zodat een link in een `ErrorSummary` ernaartoe gaat.',
    },
    name: { description: 'De naam waaronder het formulier het gekozen antwoord verstuurt.' },
    number: { description: 'Het nummer van de vraag in de quiz, vanaf 1.' },
    question: { description: 'De vraag, in de woorden van de quiz.' },
    result: {
      description:
        'Toont de vraag na het nakijken: het goede antwoord, de keuze van de speler en de percentages, zonder keuzerondjes. Zonder `chosen` is het een vraag om alleen te lezen, en met `allCorrect` telt elk antwoord. Zonder `result` is het een vraag om te beantwoorden.',
    },
    total: { description: 'Hoeveel vragen de quiz heeft, zodat er "Vraag 3 van 10" staat.' },
    value: {
      description: 'Het antwoord (1 tot 4) dat gekozen is als de pagina opent. Zonder `value` is er niets gekozen.',
    },
  },
  component: QuizQuestion,
  parameters: {
    docs: {
      description: {
        component: [
          'Eén vraag van een quiz, in een eigen kaart: "Vraag 3 van 10", de vraag en vier antwoorden als grote rijen. Kies hem voor een quiz met meerkeuzevragen waar elke vraag zijn eigen foutmelding en zijn eigen goed of fout krijgt.',
          'Hij werkt zonder JavaScript en met het toetsenbord: de pijltjes lopen langs de antwoorden. Na het nakijken toont dezelfde kaart het goede antwoord, de keuze van de speler en hoe anderen kozen. Kleur is nooit het enige teken: de woorden en het vet zeggen hetzelfde.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Formulier/QuizQuestion',
})

const question: QuizQuestionProps = {
  answers: ['Ajax', 'Feyenoord', 'Sunderland', 'Newcastle United'],
  id: 'vraag-1',
  name: 'vraag-1',
  number: 1,
  question: 'Naar welke club vertrok de testspeler na zijn periode bij de testclub?',
  total: 10,
}

export const Default = meta.story({
  args: question,
  name: 'Nog niet beantwoord',
})

export const Chosen = meta.story({
  args: { ...question, value: 3 },
  name: 'Gekozen',
})

export const WithError = meta.story({
  args: { ...question, error: 'Kies een antwoord bij vraag 1.' },
  name: 'Met fout',
})

export const CheckedRight = meta.story({
  args: { ...question, result: { chosen: 3, correct: 3, percentages: [10, 20, 60, 10] } },
  name: 'Nagekeken, goed',
})

export const CheckedWrong = meta.story({
  args: { ...question, result: { chosen: 1, correct: 3, percentages: [10, 20, 60, 10] } },
  name: 'Nagekeken, fout',
})

export const CheckedWithoutPercentages = meta.story({
  args: { ...question, result: { chosen: 2, correct: 3 } },
  name: 'Nagekeken, zonder percentages',
})

export const ToRead = meta.story({
  args: { ...question, result: { correct: 3, percentages: [10, 20, 60, 10] } },
  name: 'Uitslag om te lezen',
})

export const Cancelled = meta.story({
  args: { ...question, result: { allCorrect: true, chosen: 1, correct: 3, percentages: [10, 20, 60, 10] } },
  name: 'Elk antwoord goed',
})

export const WithTheKeyboard = meta.story({
  args: { ...question, id: 'vraag-2', name: 'vraag-2' },
  name: 'Met het toetsenbord',
  play: async ({ canvas }) => {
    await userEvent.tab()
    await expect(canvas.getByRole('radio', { name: 'Ajax' })).toHaveFocus()
    await userEvent.keyboard('{ArrowDown}')
    await expect(canvas.getByRole('radio', { name: 'Feyenoord' })).toBeChecked()
  },
})

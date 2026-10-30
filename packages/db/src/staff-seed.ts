import type { Database } from './client.ts'
import type { NewStaff } from './schema.ts'

import { staff } from './schema.ts'

/**
 * The head coaches of sc Heerenveen 1 (men) from 1 July 1990, the first Eredivisie match of the
 * club, as the Dutch Wikipedia gives them (the list `Lijst van trainers van sc Heerenveen
 * (mannen)` and the pages of the coaches, read on 30 October 2026). Each date has the precision
 * Wikipedia gives it; a date it does not give is left to the month or the year, never guessed.
 * `end_date` is the last day of the period, so a coach whose successor begins on a day ends on
 * the day before it. Where the source leaves a gap or contradicts itself, the note says what we
 * took and why.
 *
 * A change to a row that is already in a database is a migration: the seed finds a row by its
 * role, name and begin date, and a row with another begin date is a new row.
 */
export const headCoaches = [
  {
    endDate: '1992-10-01',
    endPrecision: 'month',
    name: 'Fritz Korbach',
    note: 'Begon in februari 1990. De periode begint op de eerste Eredivisie-wedstrijd van de club, 1 juli 1990.',
    startDate: '1990-07-01',
    startPrecision: 'day',
    wikipediaPage: 'Fritz Korbach',
  },
  {
    endDate: '2004-01-01',
    endPrecision: 'year',
    name: 'Foppe de Haan',
    note: 'Kondigde op 22 juli 2003 aan na 2003/04 te vertrekken. Zijn laatste thuiswedstrijd was op 10 mei 2004. Wikipedia geeft alleen het jaar van het einde.',
    startDate: '1992-10-01',
    startPrecision: 'month',
    wikipediaPage: 'Foppe de Haan',
  },
  {
    endDate: '2008-06-30',
    endPrecision: 'day',
    name: 'Gertjan Verbeek',
    note: 'De data zijn die van zijn contracten. Het bestuur maakte op 18 december 2007 bekend verder te willen met een andere trainer.',
    startDate: '2004-07-01',
    startPrecision: 'day',
    wikipediaPage: 'Gertjan Verbeek',
  },
  {
    endDate: '2009-08-31',
    endPrecision: 'day',
    name: 'Trond Sollied',
    note: 'Ondertekende op 15 maart 2008. Wikipedia geeft alleen de maand van zijn begin.',
    startDate: '2008-07-01',
    startPrecision: 'month',
    wikipediaPage: 'Trond Sollied',
  },
  {
    endDate: '2010-02-03',
    endPrecision: 'day',
    interim: true,
    name: 'Jan de Jonge',
    startDate: '2009-09-01',
    startPrecision: 'day',
    wikipediaPage: 'Jan de Jonge',
  },
  {
    endDate: '2010-06-30',
    endPrecision: 'day',
    interim: true,
    name: 'Jan Everse',
    note: 'Wikipedia geeft 1 juli 2010 als einde, afgeleid uit de overname door Ron Jans per 1 juli 2010. We nemen de dag ervoor als laatste dag, zodat de periodes elkaar niet overlappen.',
    startDate: '2010-02-05',
    startPrecision: 'day',
    wikipediaPage: 'Jan Everse',
  },
  {
    endDate: '2012-05-29',
    endPrecision: 'day',
    name: 'Ron Jans',
    note: 'Op 29 mei 2012 tekende hij bij Standard Luik. Zijn laatste dag bij ons staat niet op Wikipedia.',
    startDate: '2010-07-01',
    startPrecision: 'day',
    wikipediaPage: 'Ron Jans',
  },
  {
    endDate: '2014-07-01',
    endPrecision: 'month',
    name: 'Marco van Basten',
    note: 'Aangekondigd op 13 februari 2012. Maakte op 29 januari 2014 bekend niet te verlengen. Wikipedia geeft alleen de maanden van begin en einde.',
    startDate: '2012-06-01',
    startPrecision: 'month',
    wikipediaPage: 'Marco van Basten',
  },
  {
    endDate: '2015-10-20',
    endPrecision: 'day',
    name: 'Dwight Lodeweges',
    note: 'Aangekondigd op 31 maart 2014. Nam op 20 oktober 2015 ontslag. Wikipedia geeft alleen het jaar van zijn begin.',
    startDate: '2014-01-01',
    startPrecision: 'year',
    wikipediaPage: 'Dwight Lodeweges',
  },
  {
    endDate: '2016-06-30',
    endPrecision: 'day',
    interim: true,
    name: 'Foppe de Haan',
    note: 'Zijn derde termijn, tot het einde van 2015/16. Wikipedia geeft het einde van het seizoen en geen dag, dus we nemen de laatste dag van het seizoen.',
    startDate: '2015-10-21',
    startPrecision: 'day',
    wikipediaPage: 'Foppe de Haan',
  },
  {
    endDate: '2018-05-13',
    endPrecision: 'day',
    name: 'Jurgen Streppel',
    note: 'Aangekondigd op 16 maart 2016. Zijn vertrek werd al op 13 maart 2018 bekendgemaakt. De data zijn die van de Engelse Wikipedia.',
    startDate: '2016-07-01',
    startPrecision: 'day',
    wikipediaPage: 'Jurgen Streppel',
  },
  {
    endDate: '2019-04-10',
    endPrecision: 'day',
    name: 'Jan Olde Riekerink',
    note: 'Op non-actief gesteld. Wikipedia geeft alleen het jaar van zijn begin.',
    startDate: '2018-01-01',
    startPrecision: 'year',
    wikipediaPage: 'Jan Olde Riekerink',
  },
  {
    endDate: '2022-01-24',
    endPrecision: 'day',
    name: 'Johnny Jansen',
    note: 'Begon op 10 april 2019 als interim-trainer. Andere pagina’s noemen 3 juni 2019 als begin. We nemen de eerste datum en tonen hem niet als interim, omdat hij daarna de vaste trainer werd. Ontslagen op 24 januari 2022.',
    startDate: '2019-04-10',
    startPrecision: 'day',
    wikipediaPage: 'Johnny Jansen (1975)',
  },
  {
    endDate: '2022-06-30',
    endPrecision: 'day',
    interim: true,
    name: 'Ole Tobiassen',
    note: 'Tot het einde van 2021/22. Tussen het ontslag van Johnny Jansen en zijn begin zit volgens de pagina’s een gat van tien dagen: daarin geven we geen trainer.',
    startDate: '2022-02-04',
    startPrecision: 'day',
    wikipediaPage: 'Ole Tobiassen',
  },
  {
    endDate: '2024-06-30',
    endPrecision: 'day',
    name: 'Kees van Wonderen',
    note: 'Aangekondigd op 21 maart 2022. Zijn vertrek werd op 11 maart 2024 bekend.',
    startDate: '2022-07-01',
    startPrecision: 'day',
    wikipediaPage: 'Kees van Wonderen',
  },
  {
    endDate: '2025-02-01',
    endPrecision: 'month',
    name: 'Robin van Persie',
    note: 'Gepresenteerd op 17 mei 2024. Wikipedia geeft alleen het jaar van zijn begin. De clubs bereikten op 20 februari 2025 overeenstemming over zijn vertrek, ongeveer op 23 februari.',
    startDate: '2024-01-01',
    startPrecision: 'year',
    wikipediaPage: 'Robin van Persie',
  },
  {
    endDate: '2025-03-20',
    endPrecision: 'day',
    interim: true,
    name: 'Henk Brugge',
    note: 'Wikipedia noemt februari of maart 2025 als begin. We nemen februari. Het einde volgt uit het begin van Robin Veldman op 21 maart 2025: we nemen de dag ervoor als laatste dag.',
    startDate: '2025-02-01',
    startPrecision: 'month',
    wikipediaPage: 'Henk Brugge',
  },
  {
    name: 'Robin Veldman',
    note: 'Tekende tot de zomer van 2027.',
    startDate: '2025-03-21',
    startPrecision: 'day',
    wikipediaPage: 'Robin Veldman',
  },
] as const satisfies Omit<NewStaff, 'role'>[]

/**
 * Puts the head coaches in the table `staff`, with the role `coach`. Running it again updates a
 * row by its role, name and begin date and adds no duplicates, so a database that has them
 * gets what the seed now says, and a database that hasn't gets them all. Returns how many
 * coaches the seed holds.
 */
export async function seedStaff(db: Database): Promise<number> {
  for (const coach of headCoaches) {
    const row: NewStaff = { endDate: null, endPrecision: null, interim: false, note: null, ...coach, role: 'coach' }

    await db.insert(staff).values(row).onDuplicateKeyUpdate({ set: row })
  }

  return headCoaches.length
}

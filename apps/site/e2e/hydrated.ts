import { expect, type Page } from '@playwright/test'

/**
 * Waits until React has hydrated a page with the season picker, such as /wedstrijden. `goto`
 * returns at the load event, which can come before that, and the page is not finished until
 * then: the picker still shows its label and its button Toon (it hides both once script runs),
 * so the title row is wider, and the page is shorter once they are gone. A test that measures
 * the layout, or scrolls to a card, before then measures a page that is about to change.
 */
export const hydrated = (page: Page) => expect(page.getByRole('button', { name: 'Toon' })).toBeHidden()

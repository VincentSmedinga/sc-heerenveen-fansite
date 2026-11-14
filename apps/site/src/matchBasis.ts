const numberFormat = new Intl.NumberFormat('nl-NL')

/**
 * The line under a card that counts fewer matches than were played, or all of them: "Op basis
 * van 12 van de 14 gespeelde wedstrijden." The cards Formaties and Scheidsrechters say it.
 */
export const basisOf = (known: number, played: number) =>
  known === played
    ? `Op basis van ${played === 1 ? 'de gespeelde wedstrijd' : `alle ${numberFormat.format(played)} gespeelde wedstrijden`}.`
    : `Op basis van ${numberFormat.format(known)} van de ${numberFormat.format(played)} gespeelde wedstrijden.`

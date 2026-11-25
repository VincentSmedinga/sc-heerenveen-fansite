export const quizzesPath = '/beheer/fantest'

export const newQuizPath = `${quizzesPath}/nieuw`

/** The address of the form of a quiz, with what the last action left to say (`gedaan`). */
export function quizPath(id: number, done?: string) {
  return done === undefined ? `${quizzesPath}/${id}` : `${quizzesPath}/${id}?gedaan=${done}`
}

/** The address of the preview of a quiz. */
export const quizPreviewPath = (id: number) => `${quizzesPath}/${id}/voorbeeld`

'use server'

import { redirect } from 'next/navigation'

import { type ArticleFormState } from '../../../beheer/article-fields'
import { readValues, validate } from '../../../beheer/article-form'
import { createArticle, saveArticle, withdrawArticle } from '../../../beheer/articles'
import { parseItemId } from '../../../beheer/items'
import { requireRole } from '../../../beheer/require-role'
import { getDatabase } from '../../../database'
import { articlePath, articlesPath } from './paths'

// The actions of the articles. Only a beheerder writes: a moderator hides messages and has no
// business here, so each action asks for that role and nothing else. The number of the article
// is bound to the action (`submitArticle.bind(null, id)`), which Next.js keeps encrypted in
// the form. It is input from outside all the same, so each action checks it again. A form that
// sends nothing wrong ends on the page of the article with a notice, and one with an error
// returns to the form with the values kept: both work without JavaScript.

/**
 * Saves the form of an article, and publishes it when the button that was pressed says so
 * (`knop=publiceren`): what is on the screen is what goes live, not the version of the last
 * save. An article that is gone ends on the list with a notice.
 */
export async function submitArticle(
  articleId: number,
  _previous: ArticleFormState,
  formData: FormData,
): Promise<ArticleFormState> {
  const { userId } = await requireRole('beheerder')
  const id = parseItemId(articleId)

  if (id === undefined) {
    redirect(`${articlesPath}?fout=weg`)
  }

  const values = readValues(formData)
  const errors = validate(values)

  if (Object.keys(errors).length > 0) {
    return { errors, values }
  }

  const outcome = await saveArticle(getDatabase().db, userId, id, values, formData.get('knop') === 'publiceren')

  if (outcome.status === 'invalid') {
    return { errors: outcome.errors, values }
  }

  if (outcome.status !== 'done') {
    redirect(`${articlesPath}?fout=weg`)
  }

  redirect(
    articlePath(
      id,
      formData.get('knop') === 'publiceren'
        ? outcome.published
          ? 'gepubliceerd'
          : 'al-gepubliceerd'
        : outcome.saved
          ? 'opgeslagen'
          : 'ongewijzigd',
    ),
  )
}

/**
 * Makes a draft from the form. A field that is wrong, or an address that another article has,
 * returns the form with the errors and the values, and nothing is stored.
 */
export async function submitNewArticle(_previous: ArticleFormState, formData: FormData): Promise<ArticleFormState> {
  const { userId } = await requireRole('beheerder')
  const values = readValues(formData)
  const errors = validate(values)

  if (Object.keys(errors).length > 0) {
    return { errors, values }
  }

  const outcome = await createArticle(getDatabase().db, userId, values)

  if (outcome.status === 'invalid') {
    return { errors: outcome.errors, values }
  }

  if (outcome.status !== 'created') {
    redirect(articlesPath)
  }

  redirect(articlePath(outcome.id, 'gemaakt'))
}

/** Makes a published article a draft again. It is off the site at once. */
export async function submitWithdraw(articleId: number) {
  const { userId } = await requireRole('beheerder')
  const id = parseItemId(articleId)

  if (id === undefined) {
    redirect(`${articlesPath}?fout=weg`)
  }

  const outcome = await withdrawArticle(getDatabase().db, userId, id)

  redirect(
    outcome === 'missing'
      ? `${articlesPath}?fout=weg`
      : articlePath(id, outcome === 'done' ? 'ingetrokken' : 'al-ingetrokken'),
  )
}

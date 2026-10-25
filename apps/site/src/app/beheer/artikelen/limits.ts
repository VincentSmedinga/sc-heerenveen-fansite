import { articleLimits } from '@fansite/db/schema'

import { bodyMaxLength } from '../../../beheer/article-form'

/**
 * How long each field may be, as the hints of the form say it. The text has its limit as a
 * number written the Dutch way, such as `20.000`.
 */
export const formLimits = {
  author: articleLimits.author,
  body: new Intl.NumberFormat('nl-NL').format(bodyMaxLength),
  intro: articleLimits.intro,
  title: articleLimits.title,
}
